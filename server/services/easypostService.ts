import { db } from "../db";
import { shipments } from "@shared/schema";
import { eq } from "drizzle-orm";

const EASYPOST_API_BASE = "https://api.easypost.com/v2";

interface EasyPostTrackingDetail {
  datetime: string;
  message: string;
  status: string;
  status_detail: string;
  source: string;
  tracking_location?: {
    city?: string;
    state?: string;
    country?: string;
    zip?: string;
  };
}

interface EasyPostTracker {
  id: string;
  object: string;
  mode: string;
  tracking_code: string;
  status: string;
  status_detail: string;
  created_at: string;
  updated_at: string;
  signed_by?: string;
  weight?: number;
  est_delivery_date?: string;
  shipment_id?: string;
  carrier: string;
  carrier_detail?: {
    object: string;
    service: string;
    container_type?: string;
    est_delivery_date_local?: string;
    est_delivery_time_local?: string;
  };
  public_url: string;
  fees: any[];
  tracking_details: EasyPostTrackingDetail[];
}

interface EasyPostError {
  error: {
    code: string;
    message: string;
    errors: any[];
  };
}

const CARRIER_NAME_MAP: Record<string, string> = {
  'UPS': 'UPS',
  'USPS': 'USPS',
  'FedEx': 'FedEx',
  'DHL': 'DHLExpress',
  'DHL Express': 'DHLExpress',
  'DPD': 'DPD',
  'GLS': 'GLS',
  'TNT': 'TNT',
  'Canada Post': 'CanadaPost',
  'Royal Mail': 'RoyalMail',
  'Australia Post': 'AustraliaPost',
  'China Post': 'ChinaPost',
  'Japan Post': 'JapanPost',
  'Deutsche Post': 'DeutschePost',
  'La Poste': 'LaPoste',
  'PostNL': 'PostNL',
  'PPL': 'PPL',
  'Zásilkovna': 'Zasilkovna',
  'Packeta': 'Zasilkovna',
};

export class EasyPostService {
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.EASYPOST_API_KEY || "";
    if (!this.apiKey) {
      console.warn("EASYPOST_API_KEY not set - EasyPost tracking integration will be disabled");
    }
  }

  isConfigured(): boolean {
    return !!this.apiKey;
  }

  private getAuthHeader(): string {
    return `Basic ${Buffer.from(this.apiKey + ":").toString("base64")}`;
  }

  private normalizeCarrierName(carrier: string): string {
    if (!carrier) return "";
    const normalized = CARRIER_NAME_MAP[carrier];
    if (normalized) return normalized;
    return carrier.replace(/\s+/g, "").replace(/[^a-zA-Z0-9]/g, "");
  }

  async createTracker(trackingNumber: string, carrier?: string): Promise<{ success: boolean; tracker?: EasyPostTracker; error?: string }> {
    if (!this.isConfigured()) {
      return { success: false, error: "EasyPost API key not configured" };
    }

    try {
      const formData = new URLSearchParams();
      formData.append("tracker[tracking_code]", trackingNumber);
      if (carrier) {
        formData.append("tracker[carrier]", this.normalizeCarrierName(carrier));
      }

      const response = await fetch(`${EASYPOST_API_BASE}/trackers`, {
        method: "POST",
        headers: {
          Authorization: this.getAuthHeader(),
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formData.toString(),
      });

      const data = await response.json();

      if (!response.ok) {
        const error = data as EasyPostError;
        return { 
          success: false, 
          error: error.error?.message || `EasyPost API error: ${response.status}` 
        };
      }

      return { success: true, tracker: data as EasyPostTracker };
    } catch (error: any) {
      console.error("EasyPost createTracker error:", error);
      return { success: false, error: error.message || "Failed to create tracker" };
    }
  }

  async getTracker(trackerId: string): Promise<{ success: boolean; tracker?: EasyPostTracker; error?: string }> {
    if (!this.isConfigured()) {
      return { success: false, error: "EasyPost API key not configured" };
    }

    try {
      const response = await fetch(`${EASYPOST_API_BASE}/trackers/${trackerId}`, {
        method: "GET",
        headers: {
          Authorization: this.getAuthHeader(),
        },
      });

      const data = await response.json();

      if (!response.ok) {
        const error = data as EasyPostError;
        return { 
          success: false, 
          error: error.error?.message || `EasyPost API error: ${response.status}` 
        };
      }

      return { success: true, tracker: data as EasyPostTracker };
    } catch (error: any) {
      console.error("EasyPost getTracker error:", error);
      return { success: false, error: error.message || "Failed to get tracker" };
    }
  }

  async getTrackerByCode(trackingCode: string, carrier?: string): Promise<{ success: boolean; tracker?: EasyPostTracker; error?: string }> {
    if (!this.isConfigured()) {
      return { success: false, error: "EasyPost API key not configured" };
    }

    try {
      let url = `${EASYPOST_API_BASE}/trackers?tracking_code=${encodeURIComponent(trackingCode)}`;
      if (carrier) {
        url += `&carrier=${encodeURIComponent(this.normalizeCarrierName(carrier))}`;
      }

      const response = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: this.getAuthHeader(),
        },
      });

      const data = await response.json();

      if (!response.ok) {
        const error = data as EasyPostError;
        return { 
          success: false, 
          error: error.error?.message || `EasyPost API error: ${response.status}` 
        };
      }

      const trackers = data.trackers || [];
      if (trackers.length === 0) {
        return { success: false, error: "No tracker found for this tracking code" };
      }

      return { success: true, tracker: trackers[0] as EasyPostTracker };
    } catch (error: any) {
      console.error("EasyPost getTrackerByCode error:", error);
      return { success: false, error: error.message || "Failed to get tracker" };
    }
  }

  mapStatusToInternal(status: string): string {
    const statusMap: Record<string, string> = {
      'pre_transit': 'Pending',
      'in_transit': 'InTransit',
      'out_for_delivery': 'OutForDelivery',
      'delivered': 'Delivered',
      'available_for_pickup': 'AvailableForPickup',
      'return_to_sender': 'Returned',
      'failure': 'Exception',
      'cancelled': 'Cancelled',
      'error': 'Exception',
      'unknown': 'Unknown',
    };
    return statusMap[status] || status;
  }

  formatTrackingEvents(trackingDetails: EasyPostTrackingDetail[]): Array<{
    time: string;
    description: string;
    location?: string;
    status: string;
  }> {
    return trackingDetails.map(detail => {
      let location = "";
      if (detail.tracking_location) {
        const parts = [
          detail.tracking_location.city,
          detail.tracking_location.state,
          detail.tracking_location.country,
        ].filter(Boolean);
        location = parts.join(", ");
      }

      return {
        time: detail.datetime,
        description: detail.message,
        location: location || undefined,
        status: detail.status,
      };
    });
  }

  async registerAndSyncShipment(shipmentId: string): Promise<{ success: boolean; error?: string }> {
    if (!this.isConfigured()) {
      return { success: false, error: "EasyPost API key not configured" };
    }

    try {
      const [shipment] = await db
        .select()
        .from(shipments)
        .where(eq(shipments.id, shipmentId));

      if (!shipment) {
        return { success: false, error: "Shipment not found" };
      }

      const trackingNumbers = shipment.trackingNumbers || [];
      if (trackingNumbers.length === 0) {
        return { success: false, error: "No tracking numbers on shipment" };
      }

      const carrier = shipment.endCarrier || shipment.carrier || "";
      let lastTracker: EasyPostTracker | undefined;
      let trackerId: string | undefined;

      for (const trackingNumber of trackingNumbers) {
        const existingResult = await this.getTrackerByCode(trackingNumber, carrier);
        
        if (existingResult.success && existingResult.tracker) {
          lastTracker = existingResult.tracker;
          trackerId = existingResult.tracker.id;
        } else {
          const createResult = await this.createTracker(trackingNumber, carrier);
          if (createResult.success && createResult.tracker) {
            lastTracker = createResult.tracker;
            trackerId = createResult.tracker.id;
          }
        }
      }

      if (!lastTracker) {
        return { success: false, error: "Failed to create or retrieve tracker" };
      }

      const events = this.formatTrackingEvents(lastTracker.tracking_details || []);
      const latestEvent = events[0];

      await db
        .update(shipments)
        .set({
          easypostTrackerId: trackerId,
          easypostRegistered: true,
          easypostStatus: this.mapStatusToInternal(lastTracker.status),
          easypostStatusDetail: lastTracker.status_detail,
          easypostLastEvent: latestEvent?.description || null,
          easypostLastEventTime: latestEvent?.time ? new Date(latestEvent.time) : null,
          easypostEvents: events,
          easypostLastSync: new Date(),
          easypostEstDelivery: lastTracker.est_delivery_date ? new Date(lastTracker.est_delivery_date) : null,
          easypostPublicUrl: lastTracker.public_url,
          easypostCarrier: lastTracker.carrier,
          updatedAt: new Date(),
        })
        .where(eq(shipments.id, shipmentId));

      return { success: true };
    } catch (error: any) {
      console.error("EasyPost registerAndSyncShipment error:", error);
      return { success: false, error: error.message || "Failed to sync shipment" };
    }
  }

  async syncShipmentTracking(shipmentId: string): Promise<{ success: boolean; error?: string }> {
    if (!this.isConfigured()) {
      return { success: false, error: "EasyPost API key not configured" };
    }

    try {
      const [shipment] = await db
        .select()
        .from(shipments)
        .where(eq(shipments.id, shipmentId));

      if (!shipment) {
        return { success: false, error: "Shipment not found" };
      }

      const trackerId = shipment.easypostTrackerId;
      if (!trackerId) {
        return this.registerAndSyncShipment(shipmentId);
      }

      const result = await this.getTracker(trackerId);
      if (!result.success || !result.tracker) {
        return { success: false, error: result.error || "Failed to get tracker" };
      }

      const tracker = result.tracker;
      const events = this.formatTrackingEvents(tracker.tracking_details || []);
      const latestEvent = events[0];

      await db
        .update(shipments)
        .set({
          easypostStatus: this.mapStatusToInternal(tracker.status),
          easypostStatusDetail: tracker.status_detail,
          easypostLastEvent: latestEvent?.description || null,
          easypostLastEventTime: latestEvent?.time ? new Date(latestEvent.time) : null,
          easypostEvents: events,
          easypostLastSync: new Date(),
          easypostEstDelivery: tracker.est_delivery_date ? new Date(tracker.est_delivery_date) : null,
          easypostPublicUrl: tracker.public_url,
          updatedAt: new Date(),
        })
        .where(eq(shipments.id, shipmentId));

      return { success: true };
    } catch (error: any) {
      console.error("EasyPost syncShipmentTracking error:", error);
      return { success: false, error: error.message || "Failed to sync tracking" };
    }
  }

  async syncAllShipments(): Promise<{ synced: number; errors: number }> {
    if (!this.isConfigured()) {
      return { synced: 0, errors: 0 };
    }

    try {
      const activeShipments = await db
        .select()
        .from(shipments)
        .where(eq(shipments.status, "in_transit"));

      let synced = 0;
      let errors = 0;

      for (const shipment of activeShipments) {
        const trackingNumbers = shipment.trackingNumbers || [];
        if (trackingNumbers.length === 0) continue;

        const result = await this.syncShipmentTracking(shipment.id);
        if (result.success) {
          synced++;
        } else {
          errors++;
        }

        await new Promise(resolve => setTimeout(resolve, 200));
      }

      return { synced, errors };
    } catch (error: any) {
      console.error("EasyPost syncAllShipments error:", error);
      return { synced: 0, errors: 1 };
    }
  }
}

export const easypostService = new EasyPostService();
