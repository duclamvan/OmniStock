import { db } from '../db';
import { shipmentTracking, orderCartons, shipmentLabels } from '@shared/schema';
import { eq, and, isNull, lt } from 'drizzle-orm';
import { getPPLAccessToken } from './pplService';

// Normalized status codes
export type TrackingStatus = 'created' | 'in_transit' | 'out_for_delivery' | 'delivered' | 'exception' | 'unknown';

interface TrackingCheckpoint {
  timestamp: string;
  location: string;
  status: string;
  description: string;
}

interface NormalizedTracking {
  statusCode: TrackingStatus;
  statusLabel: string;
  checkpoints: TrackingCheckpoint[];
  estimatedDelivery?: Date;
  deliveredAt?: Date;
  lastEventAt?: Date;
}

// Base adapter interface
interface TrackingAdapter {
  fetchTracking(trackingNumber: string): Promise<NormalizedTracking>;
  shouldRefresh(lastChecked?: Date): boolean;
}

// PPL Adapter - uses existing OAuth2 token
class PPLTrackingAdapter implements TrackingAdapter {
  private trackingUpdateFrequencyHours: number;
  
  constructor(trackingUpdateFrequencyHours: number = 1) {
    this.trackingUpdateFrequencyHours = trackingUpdateFrequencyHours;
  }
  
  async fetchTracking(trackingNumber: string): Promise<NormalizedTracking> {
    // Get PPL access token (reuse from existing PPL label service)
    const token = await getPPLAccessToken();
    
    const response = await fetch(
      `https://api.dhl.com/ecs/ppl/myapi2/consignment/${trackingNumber}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    if (!response.ok) {
      if (response.status === 404) {
        return {
          statusCode: 'created',
          statusLabel: 'Label created, awaiting pickup',
          checkpoints: [],
        };
      }
      throw new Error(`PPL tracking failed: ${response.statusText}`);
    }
    
    const data = await response.json();
    return this.normalizePPLResponse(data);
  }
  
  private normalizePPLResponse(data: any): NormalizedTracking {
    // Normalize PPL response to common format
    const statusCode = this.mapPPLStatus(data.status);
    const checkpoints = (data.events || []).map((event: any) => ({
      timestamp: `${event.date}T${event.time}`,
      location: event.depot || 'Unknown',
      status: event.status,
      description: event.statusText || event.status
    })).reverse(); // Reverse to get newest-first (PPL returns oldest-first)
    
    return {
      statusCode,
      statusLabel: data.statusText || data.status,
      checkpoints,
      lastEventAt: checkpoints.length > 0 ? new Date(checkpoints[0].timestamp) : undefined,
      deliveredAt: statusCode === 'delivered' && checkpoints.length > 0 
        ? new Date(checkpoints[0].timestamp) // Now correctly uses latest event
        : undefined,
    };
  }
  
  private mapPPLStatus(status: string): TrackingStatus {
    const s = status?.toLowerCase() || '';
    if (s.includes('deliver')) return 'delivered';
    if (s.includes('transit') || s.includes('transport')) return 'in_transit';
    if (s.includes('out for delivery')) return 'out_for_delivery';
    if (s.includes('exception') || s.includes('problem')) return 'exception';
    return 'unknown';
  }
  
  shouldRefresh(lastChecked?: Date): boolean {
    if (!lastChecked) return true;
    const frequencyMs = this.trackingUpdateFrequencyHours * 60 * 60 * 1000;
    const thresholdDate = new Date(Date.now() - frequencyMs);
    return lastChecked < thresholdDate;
  }
}

// GLS Adapter - public API
class GLSTrackingAdapter implements TrackingAdapter {
  private trackingUpdateFrequencyHours: number;
  
  constructor(trackingUpdateFrequencyHours: number = 1) {
    this.trackingUpdateFrequencyHours = trackingUpdateFrequencyHours;
  }
  
  async fetchTracking(trackingNumber: string): Promise<NormalizedTracking> {
    const response = await fetch(
      `https://gls-group.com/app/service/open/rest/EU/en/rstt001`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          references: [trackingNumber]
        })
      }
    );
    
    if (!response.ok) {
      throw new Error(`GLS tracking failed: ${response.statusText}`);
    }
    
    const data = await response.json();
    return this.normalizeGLSResponse(data);
  }
  
  private normalizeGLSResponse(data: any): NormalizedTracking {
    // GLS API returns nested structure: data.tuNo[0].history
    const history = data.tuNo?.[0]?.history || [];
    const checkpoints = history.map((event: any) => ({
      timestamp: `${event.date}T${event.time || '00:00:00'}`,
      location: event.location || 'Unknown',
      status: event.status,
      description: event.statusText || event.status
    })).reverse(); // Reverse to get newest-first (GLS returns oldest-first)
    
    const statusCode = this.mapGLSStatus(checkpoints[0]?.status || '');
    
    return {
      statusCode,
      statusLabel: checkpoints[0]?.statusText || 'In transit',
      checkpoints,
      estimatedDelivery: data.deliveryDate ? new Date(data.deliveryDate) : undefined,
      lastEventAt: checkpoints.length > 0 ? new Date(checkpoints[0].timestamp) : undefined,
      deliveredAt: statusCode === 'delivered' && checkpoints.length > 0 
        ? new Date(checkpoints[0].timestamp) // Now correctly uses latest event
        : undefined,
    };
  }
  
  private mapGLSStatus(status: string): TrackingStatus {
    const s = status?.toLowerCase() || '';
    if (s.includes('deliver')) return 'delivered';
    if (s.includes('transit')) return 'in_transit';
    if (s.includes('out for delivery')) return 'out_for_delivery';
    return 'unknown';
  }
  
  shouldRefresh(lastChecked?: Date): boolean {
    if (!lastChecked) return true;
    const frequencyMs = this.trackingUpdateFrequencyHours * 60 * 60 * 1000;
    const thresholdDate = new Date(Date.now() - frequencyMs);
    return lastChecked < thresholdDate;
  }
}

// DHL Adapter - public API with API key
class DHLTrackingAdapter implements TrackingAdapter {
  private trackingUpdateFrequencyHours: number;
  
  constructor(trackingUpdateFrequencyHours: number = 1) {
    this.trackingUpdateFrequencyHours = trackingUpdateFrequencyHours;
  }
  
  async fetchTracking(trackingNumber: string): Promise<NormalizedTracking> {
    const apiKey = process.env.DHL_PUBLIC_API_KEY;
    if (!apiKey) {
      throw new Error('DHL_PUBLIC_API_KEY not configured');
    }
    
    const response = await fetch(
      `https://api-eu.dhl.com/track/shipments?trackingNumber=${trackingNumber}`,
      {
        headers: {
          'DHL-API-Key': apiKey
        }
      }
    );
    
    if (!response.ok) {
      throw new Error(`DHL tracking failed: ${response.statusText}`);
    }
    
    const data = await response.json();
    return this.normalizeDHLResponse(data);
  }
  
  private normalizeDHLResponse(data: any): NormalizedTracking {
    const shipment = data.shipments?.[0];
    if (!shipment) {
      throw new Error('No shipment data found');
    }
    
    const events = shipment.events || [];
    const statusCode = this.mapDHLStatus(shipment.status?.statusCode || '');
    const checkpoints = events.map((event: any) => ({
      timestamp: event.timestamp,
      location: event.location?.address?.addressLocality || 'Unknown',
      status: event.status,
      description: event.statusText || event.status
    }));
    
    return {
      statusCode,
      statusLabel: shipment.status?.status || 'In transit',
      checkpoints,
      lastEventAt: events.length > 0 ? new Date(events[0].timestamp) : undefined,
      deliveredAt: statusCode === 'delivered' ? new Date(events[0].timestamp) : undefined,
    };
  }
  
  private mapDHLStatus(status: string): TrackingStatus {
    const s = status?.toLowerCase() || '';
    if (s.includes('deliver')) return 'delivered';
    if (s.includes('transit')) return 'in_transit';
    if (s.includes('out for delivery')) return 'out_for_delivery';
    if (s.includes('exception')) return 'exception';
    return 'unknown';
  }
  
  shouldRefresh(lastChecked?: Date): boolean {
    if (!lastChecked) return true;
    const frequencyMs = this.trackingUpdateFrequencyHours * 60 * 60 * 1000;
    const thresholdDate = new Date(Date.now() - frequencyMs);
    return lastChecked < thresholdDate;
  }
}

// Main Tracking Service
export class TrackingService {
  private adapters: Map<string, TrackingAdapter>;
  private trackingUpdateFrequencyHours: number;
  
  constructor(trackingUpdateFrequencyHours?: number) {
    // Centralized validation with sane min/max
    let hours = 1; // Default
    
    if (typeof trackingUpdateFrequencyHours === 'number') {
      // Enforce minimum 0.083 hours (5 minutes) and maximum 24 hours
      hours = Math.max(0.083, Math.min(24, trackingUpdateFrequencyHours));
    }
    
    if (isNaN(hours) || hours <= 0) {
      hours = 1; // Fallback to 1 hour if invalid
    }
    
    this.trackingUpdateFrequencyHours = hours;
    
    this.adapters = new Map([
      ['ppl', new PPLTrackingAdapter(hours)],
      ['gls', new GLSTrackingAdapter(hours)],
      ['dhl', new DHLTrackingAdapter(hours)],
    ]);
  }
  
  async refreshTracking(trackingId: string) {
    const tracking = await db.query.shipmentTracking.findFirst({
      where: eq(shipmentTracking.id, trackingId)
    });
    
    if (!tracking) return null;
    
    const adapter = this.adapters.get(tracking.carrier.toLowerCase());
    if (!adapter) {
      throw new Error(`Unknown carrier: ${tracking.carrier}`);
    }
    
    // Check if refresh is needed (5-minute cache)
    if (!adapter.shouldRefresh(tracking.lastCheckedAt || undefined)) {
      return tracking; // Return cached data
    }
    
    try {
      const normalized = await adapter.fetchTracking(tracking.trackingNumber);
      
      // Update database
      const [updated] = await db.update(shipmentTracking)
        .set({
          statusCode: normalized.statusCode,
          statusLabel: normalized.statusLabel,
          checkpoints: normalized.checkpoints as any,
          estimatedDelivery: normalized.estimatedDelivery,
          deliveredAt: normalized.deliveredAt,
          lastEventAt: normalized.lastEventAt,
          lastCheckedAt: new Date(),
          errorState: null,
          updatedAt: new Date(),
        })
        .where(eq(shipmentTracking.id, trackingId))
        .returning();
      
      return updated;
    } catch (error: any) {
      // Store error state
      await db.update(shipmentTracking)
        .set({
          errorState: error.message,
          lastCheckedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(shipmentTracking.id, trackingId));
      
      throw error;
    }
  }
  
  async getOrderTracking(orderId: string) {
    return await db.query.shipmentTracking.findMany({
      where: eq(shipmentTracking.orderId, orderId),
      orderBy: (tracking, { asc }) => [asc(tracking.createdAt)]
    });
  }
  
  async createTrackingForOrder(orderId: string): Promise<void> {
    // Get cartons with tracking numbers for this order
    const cartons = await db.query.orderCartons.findMany({
      where: eq(orderCartons.orderId, orderId)
    });
    
    // Get carrier from shipmentLabels
    const labels = await db.query.shipmentLabels.findMany({
      where: eq(shipmentLabels.orderId, orderId)
    });
    
    const carrier = labels[0]?.carrier?.toLowerCase() || 'unknown';
    
    // Skip tracking creation if carrier is unknown (no adapter available)
    if (!carrier || carrier === 'unknown') {
      console.log(`Skipping tracking creation for order ${orderId} - unknown carrier`);
      return;
    }
    
    // Create tracking records for each carton with a tracking number
    for (const carton of cartons) {
      if (carton.trackingNumber) {
        // Check if tracking already exists
        const existing = await db.query.shipmentTracking.findFirst({
          where: eq(shipmentTracking.trackingNumber, carton.trackingNumber)
        });
        
        if (!existing) {
          await db.insert(shipmentTracking).values({
            orderId,
            cartonId: carton.id,
            carrier,
            trackingNumber: carton.trackingNumber,
            statusCode: 'created',
            statusLabel: 'Label created',
          });
        }
      }
    }
  }
}
