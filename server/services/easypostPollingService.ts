import { db } from "../db";
import { shipments } from "@shared/schema";
import { eq, and, ne, isNull, or } from "drizzle-orm";
import { easypostService } from "./easypostService";

const POLLING_INTERVAL_HOURS = 6;
const MIN_POLL_DELAY_MS = 60 * 1000; // Minimum 1 minute between polls to prevent loops

let pollingTimer: NodeJS.Timeout | null = null;
let hasActiveShipments = false; // Track if we have shipments to poll

async function pollAllActiveShipments(): Promise<{ synced: number; errors: number; hasShipments: boolean }> {
  if (!easypostService.isConfigured()) {
    console.log('[EasyPost Polling] API key not configured, skipping poll');
    return { synced: 0, errors: 0, hasShipments: false };
  }

  console.log('[EasyPost Polling] Starting scheduled tracking poll...');

  try {
    const activeShipments = await db
      .select()
      .from(shipments)
      .where(
        and(
          eq(shipments.status, "in_transit"),
          isNull(shipments.archivedAt)
        )
      );

    const shipmentsWithTracking = activeShipments.filter(s => {
      return s.trackingNumber ||
        s.endTrackingNumber ||
        (s.endTrackingNumbers?.length);
    });

    console.log(`[EasyPost Polling] Found ${shipmentsWithTracking.length} shipments with tracking numbers`);

    if (shipmentsWithTracking.length === 0) {
      console.log('[EasyPost Polling] No tracking numbers to poll - scheduler will pause until new shipments are added');
      return { synced: 0, errors: 0, hasShipments: false };
    }

    let synced = 0;
    let errors = 0;

    for (const shipment of shipmentsWithTracking) {
      try {
        const result = await easypostService.syncShipmentTracking(shipment.id);
        if (result.success) {
          synced++;
        } else {
          errors++;
          console.log(`[EasyPost Polling] Error syncing ${shipment.id}: ${result.error}`);
        }
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (error) {
        errors++;
        console.error(`[EasyPost Polling] Exception syncing ${shipment.id}:`, error);
      }
    }

    console.log(`[EasyPost Polling] Completed: ${synced} synced, ${errors} errors`);
    return { synced, errors, hasShipments: true };
  } catch (error) {
    console.error('[EasyPost Polling] Poll error:', error);
    return { synced: 0, errors: 1, hasShipments: false };
  }
}

function getMillisecondsUntilNextPoll(): number {
  const now = new Date();
  const currentHour = now.getHours();
  // Use (currentHour + 1) to ensure we always get a future hour
  const nextPollHour = Math.ceil((currentHour + 1) / POLLING_INTERVAL_HOURS) * POLLING_INTERVAL_HOURS;
  
  const target = new Date(now);
  if (nextPollHour >= 24) {
    target.setDate(target.getDate() + 1);
    target.setHours(0, 0, 0, 0);
  } else {
    target.setHours(nextPollHour, 0, 0, 0);
  }

  const delay = target.getTime() - now.getTime();
  
  // Safeguard: ensure minimum delay to prevent infinite loops
  return Math.max(delay, MIN_POLL_DELAY_MS);
}

function scheduleNextPoll() {
  // Don't schedule if no active shipments - will be triggered when shipments are added
  if (!hasActiveShipments) {
    console.log('[EasyPost Polling] No active shipments - polling paused');
    return;
  }

  const msUntilNextPoll = getMillisecondsUntilNextPoll();
  const nextPollDate = new Date(Date.now() + msUntilNextPoll);
  const delayMinutes = Math.round(msUntilNextPoll / (1000 * 60));

  console.log(`[EasyPost Polling] Next poll scheduled for: ${nextPollDate.toISOString()} (in ${delayMinutes} minutes)`);

  if (pollingTimer) {
    clearTimeout(pollingTimer);
  }

  pollingTimer = setTimeout(async () => {
    const result = await pollAllActiveShipments();
    hasActiveShipments = result.hasShipments;
    scheduleNextPoll();
  }, msUntilNextPoll);
}

export function startEasyPostPollingScheduler() {
  if (!easypostService.isConfigured()) {
    console.log('[EasyPost Polling] API key not configured, scheduler not started');
    return;
  }

  console.log('[EasyPost Polling] Scheduler started - running initial poll in 30 seconds...');
  
  setTimeout(async () => {
    const result = await pollAllActiveShipments();
    hasActiveShipments = result.hasShipments;
    scheduleNextPoll();
  }, 30000);
}

// Can be called when a new shipment with tracking is added to resume polling
export function triggerEasyPostPolling() {
  if (!easypostService.isConfigured()) {
    return;
  }
  
  // If polling was paused, resume it
  if (!hasActiveShipments) {
    console.log('[EasyPost Polling] Resuming polling due to new shipment');
    hasActiveShipments = true;
    scheduleNextPoll();
  }
}

export function stopEasyPostPollingScheduler() {
  if (pollingTimer) {
    clearTimeout(pollingTimer);
    pollingTimer = null;
    console.log('[EasyPost Polling] Scheduler stopped');
  }
}

export async function manualPollAllShipments(): Promise<{ synced: number; errors: number }> {
  const result = await pollAllActiveShipments();
  hasActiveShipments = result.hasShipments;
  // Resume scheduling if we now have shipments
  if (result.hasShipments && !pollingTimer) {
    scheduleNextPoll();
  }
  return { synced: result.synced, errors: result.errors };
}
