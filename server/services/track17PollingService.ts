import { db } from "../db";
import { shipments, shipmentTrackingMetadata } from "@shared/schema";
import { eq, isNull, and, ne, inArray } from "drizzle-orm";

const TRACK17_API_BASE = "https://api.17track.net/track/v2.2";
const POLLING_INTERVAL_HOURS = 6;
const BATCH_SIZE = 40; // 17TRACK API limit per request
const RATE_LIMIT_DELAY_MS = 200; // Delay between API calls

interface Track17TrackInfo {
  number: string;
  carrier: number;
  track_info?: {
    latest_status?: {
      status: string;
      sub_status?: string;
    };
    latest_event?: {
      time_iso?: string;
      description?: string;
      location?: string;
    };
    time_metrics?: {
      estimated_delivery_date?: {
        from?: string;
        to?: string;
      };
    };
  };
}

interface Track17Response {
  code: number;
  data: {
    accepted: Track17TrackInfo[];
    rejected: Array<{ number: string; error: { code: number; message: string } }>;
  };
}

interface TrackingMetadataUpdate {
  shipmentId: string;
  trackingNumber: string;
  carrierCode?: string;
  status?: string;
  lastEvent?: string;
  lastEventTime?: Date;
  lastEventLocation?: string;
  estimatedDeliveryFrom?: Date;
  estimatedDeliveryTo?: Date;
  estimatedDaysRemaining?: number;
  rawPayload?: any;
  syncError?: string;
}

function calculateDaysRemaining(deliveryDate: Date | undefined): number | undefined {
  if (!deliveryDate) return undefined;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const delivery = new Date(deliveryDate);
  delivery.setHours(0, 0, 0, 0);
  const diffTime = delivery.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
}

async function fetchTrackingInfoBatch(trackingNumbers: string[], apiKey: string): Promise<Track17TrackInfo[]> {
  if (!apiKey) {
    console.warn('[Track17 Polling] API key not configured');
    return [];
  }

  try {
    const requestBody = trackingNumbers.map(number => ({ number }));
    
    const response = await fetch(`${TRACK17_API_BASE}/gettrackinfo`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "17token": apiKey,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      console.error(`[Track17 Polling] API error: ${response.status}`);
      return [];
    }

    const result: Track17Response = await response.json();
    return result.data?.accepted || [];
  } catch (error) {
    console.error('[Track17 Polling] Fetch error:', error);
    return [];
  }
}

function parseTrackInfoToMetadata(
  trackInfo: Track17TrackInfo,
  shipmentId: string
): TrackingMetadataUpdate {
  const ti = trackInfo.track_info;
  const status = ti?.latest_status?.status || 'NotFound';
  const latestEvent = ti?.latest_event;
  const timeMetrics = ti?.time_metrics;
  
  let estimatedDeliveryFrom: Date | undefined;
  let estimatedDeliveryTo: Date | undefined;
  let estimatedDaysRemaining: number | undefined;

  if (timeMetrics?.estimated_delivery_date) {
    if (timeMetrics.estimated_delivery_date.from) {
      estimatedDeliveryFrom = new Date(timeMetrics.estimated_delivery_date.from);
    }
    if (timeMetrics.estimated_delivery_date.to) {
      estimatedDeliveryTo = new Date(timeMetrics.estimated_delivery_date.to);
    }
    // Use the earliest date for days remaining calculation
    const targetDate = estimatedDeliveryFrom || estimatedDeliveryTo;
    estimatedDaysRemaining = calculateDaysRemaining(targetDate);
  }

  return {
    shipmentId,
    trackingNumber: trackInfo.number,
    carrierCode: trackInfo.carrier?.toString(),
    status,
    lastEvent: latestEvent?.description,
    lastEventTime: latestEvent?.time_iso ? new Date(latestEvent.time_iso) : undefined,
    lastEventLocation: latestEvent?.location,
    estimatedDeliveryFrom,
    estimatedDeliveryTo,
    estimatedDaysRemaining,
    rawPayload: trackInfo,
  };
}

async function updateTrackingMetadata(updates: TrackingMetadataUpdate[]): Promise<void> {
  const now = new Date();

  for (const update of updates) {
    try {
      // Upsert: check if exists first
      const [existing] = await db
        .select({ id: shipmentTrackingMetadata.id })
        .from(shipmentTrackingMetadata)
        .where(
          and(
            eq(shipmentTrackingMetadata.shipmentId, update.shipmentId),
            eq(shipmentTrackingMetadata.trackingNumber, update.trackingNumber)
          )
        );

      if (existing) {
        await db
          .update(shipmentTrackingMetadata)
          .set({
            carrierCode: update.carrierCode,
            status: update.status,
            lastEvent: update.lastEvent,
            lastEventTime: update.lastEventTime,
            lastEventLocation: update.lastEventLocation,
            estimatedDeliveryFrom: update.estimatedDeliveryFrom,
            estimatedDeliveryTo: update.estimatedDeliveryTo,
            estimatedDaysRemaining: update.estimatedDaysRemaining,
            lastSyncedAt: now,
            syncError: update.syncError || null,
            rawPayload: update.rawPayload,
            updatedAt: now,
          })
          .where(eq(shipmentTrackingMetadata.id, existing.id));
      } else {
        await db.insert(shipmentTrackingMetadata).values({
          shipmentId: update.shipmentId,
          trackingNumber: update.trackingNumber,
          carrierCode: update.carrierCode,
          status: update.status,
          lastEvent: update.lastEvent,
          lastEventTime: update.lastEventTime,
          lastEventLocation: update.lastEventLocation,
          estimatedDeliveryFrom: update.estimatedDeliveryFrom,
          estimatedDeliveryTo: update.estimatedDeliveryTo,
          estimatedDaysRemaining: update.estimatedDaysRemaining,
          isRegistered: true,
          lastSyncedAt: now,
          syncError: update.syncError,
          rawPayload: update.rawPayload,
        });
      }
    } catch (error) {
      console.error(`[Track17 Polling] Failed to update metadata for ${update.trackingNumber}:`, error);
    }
  }
}

async function updateShipmentAggregatedETA(shipmentId: string): Promise<void> {
  try {
    // Get all tracking metadata for this shipment
    const metadata = await db
      .select()
      .from(shipmentTrackingMetadata)
      .where(eq(shipmentTrackingMetadata.shipmentId, shipmentId));

    if (metadata.length === 0) return;

    // Calculate aggregated values
    const trackingCount = metadata.length;
    const deliveredCount = metadata.filter(m => m.status === 'Delivered').length;
    
    // Get min and max estimated days remaining
    const daysValues = metadata
      .map(m => m.estimatedDaysRemaining)
      .filter((d): d is number => d !== null && d !== undefined);

    const estimatedDaysMin = daysValues.length > 0 ? Math.min(...daysValues) : null;
    const estimatedDaysMax = daysValues.length > 0 ? Math.max(...daysValues) : null;

    // Get earliest estimated delivery date for the shipment's estimatedDelivery field
    // Use estimatedDeliveryFrom if available, fall back to estimatedDeliveryTo
    const deliveryDates = metadata
      .map(m => m.estimatedDeliveryFrom || m.estimatedDeliveryTo)
      .filter((d): d is Date => d !== null && d !== undefined);
    const earliestDelivery = deliveryDates.length > 0 
      ? new Date(Math.min(...deliveryDates.map(d => d.getTime())))
      : null;

    await db
      .update(shipments)
      .set({
        trackingCount,
        trackingDeliveredCount: deliveredCount,
        estimatedDaysMin,
        estimatedDaysMax,
        estimatedDelivery: earliestDelivery,
        updatedAt: new Date(),
      })
      .where(eq(shipments.id, shipmentId));

    console.log(`[Track17 Polling] Updated aggregated ETA for shipment ${shipmentId}: ${estimatedDaysMin}-${estimatedDaysMax} days, ${deliveredCount}/${trackingCount} delivered`);
  } catch (error) {
    console.error(`[Track17 Polling] Failed to update aggregated ETA for ${shipmentId}:`, error);
  }
}

async function pollAllShipments(): Promise<{ processed: number; updated: number; errors: number }> {
  const apiKey = process.env.TRACK17_API_KEY;
  if (!apiKey) {
    console.warn('[Track17 Polling] TRACK17_API_KEY not configured, skipping poll');
    return { processed: 0, updated: 0, errors: 0 };
  }

  console.log('[Track17 Polling] Starting scheduled tracking poll...');
  const startTime = Date.now();

  // Get all active (non-archived, non-delivered) shipments with end tracking numbers
  const activeShipments = await db
    .select({
      id: shipments.id,
      endTrackingNumbers: shipments.endTrackingNumbers,
      endTrackingNumber: shipments.endTrackingNumber,
      track17Registered: shipments.track17Registered,
    })
    .from(shipments)
    .where(
      and(
        isNull(shipments.archivedAt),
        ne(shipments.status, 'delivered')
      )
    );

  // Build a map of tracking numbers to shipment IDs
  const trackingToShipmentMap = new Map<string, string>();
  for (const shipment of activeShipments) {
    const trackingNumbers = shipment.endTrackingNumbers || 
      (shipment.endTrackingNumber ? [shipment.endTrackingNumber] : []);
    
    for (const tn of trackingNumbers) {
      if (tn) {
        trackingToShipmentMap.set(tn, shipment.id);
      }
    }
  }

  const allTrackingNumbers = Array.from(trackingToShipmentMap.keys());
  console.log(`[Track17 Polling] Found ${allTrackingNumbers.length} tracking numbers across ${activeShipments.length} shipments`);

  if (allTrackingNumbers.length === 0) {
    console.log('[Track17 Polling] No tracking numbers to poll');
    return { processed: 0, updated: 0, errors: 0 };
  }

  let processed = 0;
  let updated = 0;
  let errors = 0;
  const updatedShipmentIds = new Set<string>();

  // Process in batches
  for (let i = 0; i < allTrackingNumbers.length; i += BATCH_SIZE) {
    const batch = allTrackingNumbers.slice(i, i + BATCH_SIZE);
    console.log(`[Track17 Polling] Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(allTrackingNumbers.length / BATCH_SIZE)} (${batch.length} numbers)`);

    const trackInfos = await fetchTrackingInfoBatch(batch, apiKey);
    processed += batch.length;

    const metadataUpdates: TrackingMetadataUpdate[] = [];

    for (const trackInfo of trackInfos) {
      const shipmentId = trackingToShipmentMap.get(trackInfo.number);
      if (!shipmentId) continue;

      const metadata = parseTrackInfoToMetadata(trackInfo, shipmentId);
      metadataUpdates.push(metadata);
      updatedShipmentIds.add(shipmentId);
      updated++;
    }

    // Track numbers that weren't in the response (rejected or not found)
    const receivedNumbers = new Set(trackInfos.map(t => t.number));
    for (const tn of batch) {
      if (!receivedNumbers.has(tn)) {
        const shipmentId = trackingToShipmentMap.get(tn);
        if (shipmentId) {
          metadataUpdates.push({
            shipmentId,
            trackingNumber: tn,
            syncError: 'Not found in 17TRACK response',
          });
          errors++;
        }
      }
    }

    // Update metadata in database
    await updateTrackingMetadata(metadataUpdates);

    // Rate limit between batches
    if (i + BATCH_SIZE < allTrackingNumbers.length) {
      await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY_MS * 5));
    }
  }

  // Update aggregated ETA for all affected shipments
  const shipmentIdsArray = Array.from(updatedShipmentIds);
  console.log(`[Track17 Polling] Updating aggregated ETA for ${shipmentIdsArray.length} shipments...`);
  for (const shipmentId of shipmentIdsArray) {
    await updateShipmentAggregatedETA(shipmentId);
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`[Track17 Polling] Completed in ${duration}s - Processed: ${processed}, Updated: ${updated}, Errors: ${errors}`);

  return { processed, updated, errors };
}

function getMillisecondsUntilNextPoll(): number {
  const now = new Date();
  // Round up to the next 6-hour mark (0, 6, 12, 18)
  const currentHour = now.getHours();
  const nextPollHour = Math.ceil((currentHour + 1) / POLLING_INTERVAL_HOURS) * POLLING_INTERVAL_HOURS;
  
  const target = new Date(now);
  if (nextPollHour >= 24) {
    target.setDate(target.getDate() + 1);
    target.setHours(0, 0, 0, 0);
  } else {
    target.setHours(nextPollHour, 0, 0, 0);
  }

  return target.getTime() - now.getTime();
}

let pollIntervalId: ReturnType<typeof setTimeout> | null = null;

export function startTrack17PollingScheduler(): void {
  const apiKey = process.env.TRACK17_API_KEY;
  if (!apiKey) {
    console.log('[Track17 Polling] TRACK17_API_KEY not configured - polling scheduler disabled');
    return;
  }

  const scheduleNextPoll = () => {
    const msUntilNextPoll = getMillisecondsUntilNextPoll();
    const nextPollDate = new Date(Date.now() + msUntilNextPoll);
    
    console.log(`[Track17 Polling] Next poll scheduled for: ${nextPollDate.toISOString()} (in ${(msUntilNextPoll / 1000 / 60).toFixed(1)} minutes)`);
    
    pollIntervalId = setTimeout(async () => {
      try {
        await pollAllShipments();
      } catch (error) {
        console.error('[Track17 Polling] Error during scheduled poll:', error);
      }
      
      // Schedule next poll after completing
      scheduleNextPoll();
    }, msUntilNextPoll);
  };

  // Run initial poll after a short delay (give server time to start)
  console.log('[Track17 Polling] Scheduler started - running initial poll in 30 seconds...');
  setTimeout(async () => {
    try {
      await pollAllShipments();
    } catch (error) {
      console.error('[Track17 Polling] Error during initial poll:', error);
    }
    // Start the regular schedule
    scheduleNextPoll();
  }, 30000);
}

export function stopTrack17PollingScheduler(): void {
  if (pollIntervalId) {
    clearTimeout(pollIntervalId);
    pollIntervalId = null;
    console.log('[Track17 Polling] Scheduler stopped');
  }
}

// Manual trigger for testing/admin use
export async function manualPollAllShipments(): Promise<{ processed: number; updated: number; errors: number }> {
  return pollAllShipments();
}

export { updateShipmentAggregatedETA };
