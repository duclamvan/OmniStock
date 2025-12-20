import { db } from "../db";
import { shipments } from "@shared/schema";
import { eq, and, ne, isNull, or } from "drizzle-orm";
import { easypostService } from "./easypostService";

const POLLING_INTERVAL_HOURS = 6;

let pollingTimer: NodeJS.Timeout | null = null;

async function pollAllActiveShipments(): Promise<{ synced: number; errors: number }> {
  if (!easypostService.isConfigured()) {
    console.log('[EasyPost Polling] API key not configured, skipping poll');
    return { synced: 0, errors: 0 };
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
      const trackingNumbers = s.trackingNumbers || 
        (s.endTrackingNumbers?.length ? s.endTrackingNumbers : 
          (s.endTrackingNumber ? [s.endTrackingNumber] : []));
      return trackingNumbers.length > 0;
    });

    console.log(`[EasyPost Polling] Found ${shipmentsWithTracking.length} shipments with tracking numbers`);

    if (shipmentsWithTracking.length === 0) {
      console.log('[EasyPost Polling] No tracking numbers to poll');
      return { synced: 0, errors: 0 };
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
    return { synced, errors };
  } catch (error) {
    console.error('[EasyPost Polling] Poll error:', error);
    return { synced: 0, errors: 1 };
  }
}

function scheduleNextPoll() {
  const now = new Date();
  const nextPollHour = Math.ceil(now.getHours() / POLLING_INTERVAL_HOURS) * POLLING_INTERVAL_HOURS;
  const nextPoll = new Date(now);
  
  if (nextPollHour >= 24) {
    nextPoll.setDate(nextPoll.getDate() + 1);
    nextPoll.setHours(0, 0, 0, 0);
  } else if (nextPollHour === now.getHours() && now.getMinutes() > 0) {
    nextPoll.setHours(nextPollHour + POLLING_INTERVAL_HOURS, 0, 0, 0);
    if (nextPoll.getHours() >= 24) {
      nextPoll.setDate(nextPoll.getDate() + 1);
      nextPoll.setHours(0, 0, 0, 0);
    }
  } else {
    nextPoll.setHours(nextPollHour, 0, 0, 0);
  }

  const delay = nextPoll.getTime() - now.getTime();
  const delayMinutes = Math.round(delay / (1000 * 60));

  console.log(`[EasyPost Polling] Next poll scheduled for: ${nextPoll.toISOString()} (in ${delayMinutes} minutes)`);

  if (pollingTimer) {
    clearTimeout(pollingTimer);
  }

  pollingTimer = setTimeout(async () => {
    await pollAllActiveShipments();
    scheduleNextPoll();
  }, delay);
}

export function startEasyPostPollingScheduler() {
  if (!easypostService.isConfigured()) {
    console.log('[EasyPost Polling] API key not configured, scheduler not started');
    return;
  }

  console.log('[EasyPost Polling] Scheduler started - running initial poll in 30 seconds...');
  
  setTimeout(async () => {
    await pollAllActiveShipments();
    scheduleNextPoll();
  }, 30000);
}

export function stopEasyPostPollingScheduler() {
  if (pollingTimer) {
    clearTimeout(pollingTimer);
    pollingTimer = null;
    console.log('[EasyPost Polling] Scheduler stopped');
  }
}

export async function manualPollAllShipments(): Promise<{ synced: number; errors: number }> {
  return pollAllActiveShipments();
}
