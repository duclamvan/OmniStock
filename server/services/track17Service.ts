import { db } from "../db";
import { shipments } from "@shared/schema";
import { eq } from "drizzle-orm";
import { findCarrierByName, findCarrierByCode, getCarrierList, COMMON_CARRIERS, type Track17Carrier } from "../data/track17Carriers";

const TRACK17_API_BASE = "https://api.17track.net/track/v2.2";

interface Track17Event {
  a: string; // time
  z: string; // description
  c?: string; // location
  s?: string; // status code
}

interface Track17TrackInfo {
  e: number; // error code (0 = success)
  w1?: {
    e: number;
    z: string; // tracking status name
    a: string; // last event time
    z1: string; // last event description
    z2: string; // detected carrier name
    c: number; // carrier code
    track?: Track17Event[];
    est_delivery?: string;
    last_info?: {
      a?: string;
      z?: string;
    };
  };
}

interface Track17RegisterResponse {
  code: number;
  data: {
    accepted: Array<{ number: string; carrier: number }>;
    rejected: Array<{ number: string; error: { code: number; message: string } }>;
  };
}

interface Track17TrackResponse {
  code: number;
  data: {
    accepted: Track17TrackInfo[];
    rejected: Array<{ number: string; error: { code: number; message: string } }>;
  };
}

const STATUS_MAP: Record<number, string> = {
  0: "NotFound",
  10: "InTransit",
  20: "Expired",
  30: "PickUp",
  35: "Undelivered",
  40: "Delivered",
  50: "Alert",
};

export class Track17Service {
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.TRACK17_API_KEY || "";
    if (!this.apiKey) {
      console.warn("TRACK17_API_KEY not set - 17track integration will be disabled");
    }
  }

  isConfigured(): boolean {
    return !!this.apiKey;
  }

  async registerTracking(trackingNumber: string, carrierCode?: number): Promise<{ success: boolean; error?: string }> {
    if (!this.isConfigured()) {
      return { success: false, error: "17track API key not configured" };
    }

    try {
      const requestBody = [
        {
          number: trackingNumber,
          ...(carrierCode && { carrier: carrierCode }),
        },
      ];

      const response = await fetch(`${TRACK17_API_BASE}/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "17token": this.apiKey,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("17track register error:", response.status, errorText);
        return { success: false, error: `API error: ${response.status}` };
      }

      const result: Track17RegisterResponse = await response.json();

      if (result.data?.accepted?.length > 0) {
        console.log(`17track: Registered tracking number ${trackingNumber}`);
        return { success: true };
      }

      if (result.data?.rejected?.length > 0) {
        const rejection = result.data.rejected[0];
        console.error(`17track: Rejected tracking number ${trackingNumber}:`, rejection.error);
        return { success: false, error: rejection.error?.message || "Registration rejected" };
      }

      return { success: false, error: "Unknown response from 17track" };
    } catch (error) {
      console.error("17track register exception:", error);
      return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
    }
  }

  async getTrackingInfo(trackingNumber: string): Promise<{
    success: boolean;
    status?: string;
    lastEvent?: string;
    lastEventTime?: Date;
    events?: Array<{ time: string; description: string; location?: string; status?: string }>;
    carrierCode?: string;
    error?: string;
  }> {
    if (!this.isConfigured()) {
      return { success: false, error: "17track API key not configured" };
    }

    try {
      const requestBody = [{ number: trackingNumber }];

      const response = await fetch(`${TRACK17_API_BASE}/gettrackinfo`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "17token": this.apiKey,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("17track gettrackinfo error:", response.status, errorText);
        return { success: false, error: `API error: ${response.status}` };
      }

      const result: Track17TrackResponse = await response.json();
      console.log(`17track gettrackinfo response for ${trackingNumber}:`, JSON.stringify(result, null, 2));

      if (result.data?.accepted?.length > 0) {
        const trackInfo = result.data.accepted[0];
        
        if (trackInfo.e !== 0) {
          console.log(`17track: Track error code ${trackInfo.e} for ${trackingNumber}`);
          return { success: false, error: `Track error code: ${trackInfo.e}` };
        }

        const w1 = trackInfo.w1;
        if (!w1) {
          return { success: true, status: "NotFound", events: [] };
        }

        const statusCode = w1.e || 0;
        const status = STATUS_MAP[statusCode] || "Unknown";
        
        const events = (w1.track || []).map((event) => ({
          time: event.a,
          description: event.z,
          location: event.c,
          status: event.s,
        }));

        return {
          success: true,
          status,
          lastEvent: w1.z1 || w1.last_info?.z,
          lastEventTime: w1.a ? new Date(w1.a) : undefined,
          events,
          carrierCode: w1.c?.toString(),
        };
      }

      if (result.data?.rejected?.length > 0) {
        const rejection = result.data.rejected[0];
        console.log(`17track: Query rejected for ${trackingNumber}:`, rejection.error);
        return { success: false, error: rejection.error?.message || "Query rejected" };
      }

      console.log(`17track: Unknown response format for ${trackingNumber}:`, result);
      return { success: false, error: "Unknown response from 17track" };
    } catch (error) {
      console.error("17track gettrackinfo exception:", error);
      return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
    }
  }

  async registerAndSyncShipment(shipmentId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const [shipment] = await db
        .select()
        .from(shipments)
        .where(eq(shipments.id, shipmentId));

      if (!shipment) {
        return { success: false, error: "Shipment not found" };
      }

      // Use endTrackingNumbers (from End Carrier tracking) instead of internal trackingNumber
      const trackingNumbers = shipment.endTrackingNumbers || 
        (shipment.endTrackingNumber ? [shipment.endTrackingNumber] : null);
      
      if (!trackingNumbers || trackingNumbers.length === 0) {
        return { success: false, error: "No end tracking numbers for shipment" };
      }

      // Use track17CarrierCode which is parsed from endCarrier dropdown
      const carrierCode = shipment.track17CarrierCode ? parseInt(shipment.track17CarrierCode) : undefined;

      if (!shipment.track17Registered) {
        // Register all tracking numbers
        let allRegistered = true;
        for (const trackingNumber of trackingNumbers) {
          const registerResult = await this.registerTracking(trackingNumber, carrierCode);
          if (!registerResult.success) {
            console.warn(`Failed to register tracking ${trackingNumber}: ${registerResult.error}`);
            allRegistered = false;
          }
          // Small delay between registrations to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 200));
        }

        if (allRegistered) {
          await db
            .update(shipments)
            .set({ track17Registered: true, updatedAt: new Date() })
            .where(eq(shipments.id, shipmentId));
        }
      }

      return await this.syncShipmentTracking(shipmentId);
    } catch (error) {
      console.error("Error in registerAndSyncShipment:", error);
      return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
    }
  }

  async syncShipmentTracking(shipmentId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const [shipment] = await db
        .select()
        .from(shipments)
        .where(eq(shipments.id, shipmentId));

      if (!shipment) {
        return { success: false, error: "Shipment not found" };
      }

      // Use endTrackingNumbers (from End Carrier tracking) instead of internal trackingNumber
      const trackingNumbers = shipment.endTrackingNumbers || 
        (shipment.endTrackingNumber ? [shipment.endTrackingNumber] : null);
      
      if (!trackingNumbers || trackingNumbers.length === 0) {
        return { success: false, error: "No end tracking numbers for shipment" };
      }

      // Get tracking info for all tracking numbers and aggregate results
      let latestStatus = "NotFound";
      let latestEvent: string | undefined;
      let latestEventTime: Date | undefined;
      let allEvents: Array<{ time: string; description: string; location?: string; status?: string; trackingNumber?: string }> = [];
      let detectedCarrierCode: string | undefined;
      let successCount = 0;

      for (const trackingNumber of trackingNumbers) {
        const trackResult = await this.getTrackingInfo(trackingNumber);
        
        if (trackResult.success) {
          successCount++;
          
          // Use the most advanced status across all tracking numbers
          const statusPriority: Record<string, number> = {
            "Delivered": 100,
            "InTransit": 80,
            "PickUp": 60,
            "Alert": 50,
            "Undelivered": 40,
            "Expired": 20,
            "NotFound": 0,
          };
          
          if ((statusPriority[trackResult.status || "NotFound"] || 0) > (statusPriority[latestStatus] || 0)) {
            latestStatus = trackResult.status || "NotFound";
          }
          
          // Use the most recent event time
          if (trackResult.lastEventTime && (!latestEventTime || trackResult.lastEventTime > latestEventTime)) {
            latestEventTime = trackResult.lastEventTime;
            latestEvent = trackResult.lastEvent;
          }
          
          // Aggregate all events with tracking number label
          if (trackResult.events) {
            const labeledEvents = trackResult.events.map(e => ({
              ...e,
              trackingNumber: trackingNumbers.length > 1 ? trackingNumber : undefined,
            }));
            allEvents = [...allEvents, ...labeledEvents];
          }
          
          if (trackResult.carrierCode) {
            detectedCarrierCode = trackResult.carrierCode;
          }
        }
        
        // Small delay between API calls
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      if (successCount === 0) {
        return { success: false, error: "Failed to get tracking info for any tracking numbers" };
      }

      // Sort all events by time (newest first)
      allEvents.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

      const updateData: Record<string, any> = {
        track17Status: latestStatus,
        track17LastSync: new Date(),
        updatedAt: new Date(),
      };

      if (latestEvent) {
        updateData.track17LastEvent = latestEvent;
        updateData.currentLocation = latestEvent;
      }

      if (latestEventTime) {
        updateData.track17LastEventTime = latestEventTime;
      }

      if (allEvents.length > 0) {
        updateData.track17Events = allEvents;
      }

      if (detectedCarrierCode && !shipment.track17CarrierCode) {
        updateData.track17CarrierCode = detectedCarrierCode;
      }

      // Auto-update shipment status based on tracking
      if (latestStatus === "Delivered" && shipment.status !== "delivered") {
        updateData.status = "delivered";
        updateData.deliveredAt = latestEventTime || new Date();
      } else if (latestStatus === "InTransit" && shipment.status === "pending") {
        updateData.status = "in transit";
      }

      await db.update(shipments).set(updateData).where(eq(shipments.id, shipmentId));

      console.log(`17track: Synced ${successCount}/${trackingNumbers.length} tracking numbers for shipment ${shipmentId}, status: ${latestStatus}`);
      return { success: true };
    } catch (error) {
      console.error("Error in syncShipmentTracking:", error);
      return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
    }
  }

  async syncAllActiveShipments(): Promise<{ synced: number; errors: number }> {
    try {
      const activeShipments = await db
        .select()
        .from(shipments)
        .where(eq(shipments.status, "in transit"));

      let synced = 0;
      let errors = 0;

      for (const shipment of activeShipments) {
        const result = await this.registerAndSyncShipment(shipment.id);
        if (result.success) {
          synced++;
        } else {
          errors++;
        }
        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      console.log(`17track batch sync: ${synced} synced, ${errors} errors`);
      return { synced, errors };
    } catch (error) {
      console.error("Error in syncAllActiveShipments:", error);
      return { synced: 0, errors: 0 };
    }
  }
}

export const track17Service = new Track17Service();

export { findCarrierByName, findCarrierByCode, getCarrierList, COMMON_CARRIERS, type Track17Carrier };
