import { db } from "../db";
import { shipments } from "@shared/schema";
import { isNull } from "drizzle-orm";

function getISOWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

async function archiveCurrentWeekShipments(): Promise<number> {
  const now = new Date();
  const year = now.getFullYear();
  const weekNum = getISOWeekNumber(now);
  const archiveWeekLabel = `${year}-W${weekNum.toString().padStart(2, '0')}`;
  
  console.log(`[Shipment Archive] Starting weekly archive for ${archiveWeekLabel}`);
  
  const result = await db
    .update(shipments)
    .set({
      archivedAt: now,
      archiveWeek: archiveWeekLabel,
      updatedAt: now
    })
    .where(isNull(shipments.archivedAt))
    .returning({ id: shipments.id });
  
  console.log(`[Shipment Archive] Archived ${result.length} shipments for week ${archiveWeekLabel}`);
  return result.length;
}

function getMillisecondsUntilNextSunday2359(): number {
  const now = new Date();
  const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
  
  // Calculate days until next Sunday
  const daysUntilSunday = currentDay === 0 ? 0 : 7 - currentDay;
  
  // Create target date: next Sunday at 23:59:00
  const target = new Date(now);
  target.setDate(target.getDate() + daysUntilSunday);
  target.setHours(23, 59, 0, 0);
  
  // If it's Sunday but past 23:59, schedule for next week
  if (target.getTime() <= now.getTime()) {
    target.setDate(target.getDate() + 7);
  }
  
  return target.getTime() - now.getTime();
}

export function startShipmentArchiveScheduler(): void {
  const scheduleNextRun = () => {
    const msUntilNextRun = getMillisecondsUntilNextSunday2359();
    const nextRunDate = new Date(Date.now() + msUntilNextRun);
    
    console.log(`[Shipment Archive] Next archive scheduled for: ${nextRunDate.toISOString()}`);
    
    setTimeout(async () => {
      try {
        await archiveCurrentWeekShipments();
      } catch (error) {
        console.error('[Shipment Archive] Error during weekly archive:', error);
      }
      
      // Schedule next run after completing
      scheduleNextRun();
    }, msUntilNextRun);
  };
  
  // Start the scheduler
  scheduleNextRun();
}

export { archiveCurrentWeekShipments };
