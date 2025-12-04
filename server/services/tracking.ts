import { db } from '../db';
import { shipmentTracking, orderCartons, shipmentLabels, orders } from '@shared/schema';
import { eq, and, isNull, lt, ne } from 'drizzle-orm';
import { getPPLAccessToken } from './pplService';

export type TrackingStatus = 'created' | 'in_transit' | 'out_for_delivery' | 'delivered' | 'exception' | 'unknown';

/**
 * Check if current time is within working hours (Monday-Friday, 8am-6pm)
 * Skips weekends and outside business hours to reduce unnecessary API calls
 */
export function isWithinWorkingHours(): boolean {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 = Sunday, 6 = Saturday
  const hour = now.getHours();
  
  // Skip weekends (Saturday = 6, Sunday = 0)
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return false;
  }
  
  // Only refresh during working hours (8am - 6pm)
  if (hour < 8 || hour >= 18) {
    return false;
  }
  
  return true;
}

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

interface TrackingAdapter {
  fetchTracking(trackingNumber: string): Promise<NormalizedTracking>;
  shouldRefresh(lastChecked?: Date): boolean;
}

class PPLTrackingAdapter implements TrackingAdapter {
  private trackingUpdateFrequencyHours: number;
  
  constructor(trackingUpdateFrequencyHours: number = 1) {
    this.trackingUpdateFrequencyHours = trackingUpdateFrequencyHours;
  }
  
  async fetchTracking(trackingNumber: string): Promise<NormalizedTracking> {
    try {
      const token = await getPPLAccessToken();
      
      const response = await fetch(
        `https://api.dhl.com/ecs/ppl/myapi2/shipment/${trackingNumber}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Accept-Language': 'cs-CZ'
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
        const errorText = await response.text();
        console.error(`PPL tracking API error: ${response.status} - ${errorText}`);
        throw new Error(`PPL tracking failed: ${response.statusText}`);
      }
      
      const data = await response.json();
      return this.normalizePPLResponse(data);
    } catch (error: any) {
      if (error.message.includes('PPL API credentials not configured')) {
        return {
          statusCode: 'unknown',
          statusLabel: 'PPL credentials not configured',
          checkpoints: [],
        };
      }
      throw error;
    }
  }
  
  private normalizePPLResponse(data: any): NormalizedTracking {
    const statusCode = this.mapPPLStatus(data.state || data.status);
    
    const events = data.trackAndTraceEvents || data.events || [];
    const checkpoints = events.map((event: any) => ({
      timestamp: event.eventDate || `${event.date}T${event.time || '00:00:00'}`,
      location: event.depot?.name || event.depot || event.location || 'Unknown',
      status: event.eventType || event.status || '',
      description: event.eventDescription || event.statusText || event.description || event.status || ''
    })).reverse();
    
    return {
      statusCode,
      statusLabel: data.stateText || data.statusText || data.state || 'Unknown',
      checkpoints,
      lastEventAt: checkpoints.length > 0 ? new Date(checkpoints[0].timestamp) : undefined,
      deliveredAt: statusCode === 'delivered' && checkpoints.length > 0 
        ? new Date(checkpoints[0].timestamp)
        : undefined,
    };
  }
  
  private mapPPLStatus(status: string): TrackingStatus {
    const s = (status || '').toLowerCase();
    if (s.includes('deliver') || s.includes('doručen')) return 'delivered';
    if (s.includes('transit') || s.includes('transport') || s.includes('přeprav')) return 'in_transit';
    if (s.includes('out for delivery') || s.includes('na cestě')) return 'out_for_delivery';
    if (s.includes('exception') || s.includes('problem') || s.includes('chyba')) return 'exception';
    if (s.includes('picked') || s.includes('vyzvednut') || s.includes('přijat')) return 'in_transit';
    return 'unknown';
  }
  
  shouldRefresh(lastChecked?: Date): boolean {
    if (!lastChecked) return true;
    const frequencyMs = this.trackingUpdateFrequencyHours * 60 * 60 * 1000;
    return lastChecked < new Date(Date.now() - frequencyMs);
  }
}

class GLSTrackingAdapter implements TrackingAdapter {
  private trackingUpdateFrequencyHours: number;
  
  constructor(trackingUpdateFrequencyHours: number = 1) {
    this.trackingUpdateFrequencyHours = trackingUpdateFrequencyHours;
  }
  
  async fetchTracking(trackingNumber: string): Promise<NormalizedTracking> {
    try {
      const response = await fetch(
        `https://gls-group.com/app/service/open/rest/EU/en/rstt001?match=${encodeURIComponent(trackingNumber)}&type=P`,
        {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          }
        }
      );
      
      if (!response.ok) {
        if (response.status === 404) {
          return {
            statusCode: 'created',
            statusLabel: 'Shipment not found in GLS system',
            checkpoints: [],
          };
        }
        throw new Error(`GLS tracking failed: ${response.statusText}`);
      }
      
      const data = await response.json();
      return this.normalizeGLSResponse(data, trackingNumber);
    } catch (error: any) {
      console.error('GLS tracking error:', error.message);
      return {
        statusCode: 'unknown',
        statusLabel: 'Unable to fetch GLS tracking',
        checkpoints: [],
      };
    }
  }
  
  private normalizeGLSResponse(data: any, trackingNumber: string): NormalizedTracking {
    const parcels = data.tuStatus || [];
    const parcel = parcels.find((p: any) => 
      p.tuNo === trackingNumber || 
      p.references?.some((r: any) => r.value === trackingNumber)
    ) || parcels[0];
    
    if (!parcel) {
      return {
        statusCode: 'unknown',
        statusLabel: 'Parcel not found',
        checkpoints: [],
      };
    }
    
    const history = parcel.history || [];
    const checkpoints = history.map((event: any) => ({
      timestamp: event.date && event.time 
        ? `${event.date}T${event.time}` 
        : event.timestamp || new Date().toISOString(),
      location: [event.address?.city, event.address?.countryCode].filter(Boolean).join(', ') || 
                event.location || 'Unknown',
      status: event.evtDsc || event.status || '',
      description: event.evtDsc || event.statusText || event.description || ''
    })).reverse();
    
    const latestEvent = checkpoints[0];
    const statusCode = this.mapGLSStatus(parcel.progressBar?.statusInfo || latestEvent?.status || '');
    
    return {
      statusCode,
      statusLabel: parcel.progressBar?.statusText || latestEvent?.description || 'In transit',
      checkpoints,
      estimatedDelivery: parcel.infos?.find((i: any) => i.type === 'DELIVERYDATE')?.value 
        ? new Date(parcel.infos.find((i: any) => i.type === 'DELIVERYDATE').value) 
        : undefined,
      lastEventAt: checkpoints.length > 0 ? new Date(checkpoints[0].timestamp) : undefined,
      deliveredAt: statusCode === 'delivered' && checkpoints.length > 0 
        ? new Date(checkpoints[0].timestamp)
        : undefined,
    };
  }
  
  private mapGLSStatus(status: string): TrackingStatus {
    const s = (status || '').toLowerCase();
    if (s.includes('deliver') || s.includes('zugestellt') || s.includes('doručen')) return 'delivered';
    if (s.includes('transit') || s.includes('unterwegs') || s.includes('přeprav')) return 'in_transit';
    if (s.includes('out for delivery') || s.includes('zustellung') || s.includes('doručován')) return 'out_for_delivery';
    if (s.includes('exception') || s.includes('problem') || s.includes('fehler')) return 'exception';
    return 'unknown';
  }
  
  shouldRefresh(lastChecked?: Date): boolean {
    if (!lastChecked) return true;
    const frequencyMs = this.trackingUpdateFrequencyHours * 60 * 60 * 1000;
    return lastChecked < new Date(Date.now() - frequencyMs);
  }
}

class DHLTrackingAdapter implements TrackingAdapter {
  private trackingUpdateFrequencyHours: number;
  
  constructor(trackingUpdateFrequencyHours: number = 1) {
    this.trackingUpdateFrequencyHours = trackingUpdateFrequencyHours;
  }
  
  async fetchTracking(trackingNumber: string): Promise<NormalizedTracking> {
    const apiKey = process.env.DHL_API_KEY;
    
    if (!apiKey) {
      console.warn('DHL_API_KEY not configured - tracking unavailable');
      return {
        statusCode: 'unknown',
        statusLabel: 'DHL API key not configured',
        checkpoints: [],
      };
    }
    
    try {
      const response = await fetch(
        `https://api-eu.dhl.com/track/shipments?trackingNumber=${encodeURIComponent(trackingNumber)}`,
        {
          headers: {
            'DHL-API-Key': apiKey,
            'Accept': 'application/json'
          }
        }
      );
      
      if (!response.ok) {
        if (response.status === 404) {
          return {
            statusCode: 'created',
            statusLabel: 'Shipment not found in DHL system',
            checkpoints: [],
          };
        }
        if (response.status === 401 || response.status === 403) {
          console.error('DHL API authentication failed - check DHL_API_KEY');
          return {
            statusCode: 'unknown',
            statusLabel: 'DHL API authentication failed',
            checkpoints: [],
          };
        }
        if (response.status === 429) {
          console.warn('DHL API rate limit reached');
          return {
            statusCode: 'unknown',
            statusLabel: 'Rate limit exceeded, try again later',
            checkpoints: [],
          };
        }
        const errorText = await response.text();
        console.error(`DHL tracking API error: ${response.status} - ${errorText}`);
        throw new Error(`DHL tracking failed: ${response.statusText}`);
      }
      
      const data = await response.json();
      return this.normalizeDHLResponse(data);
    } catch (error: any) {
      console.error('DHL tracking error:', error.message);
      return {
        statusCode: 'unknown',
        statusLabel: 'Unable to fetch DHL tracking',
        checkpoints: [],
      };
    }
  }
  
  private normalizeDHLResponse(data: any): NormalizedTracking {
    const shipment = data.shipments?.[0];
    if (!shipment) {
      return {
        statusCode: 'unknown',
        statusLabel: 'No shipment data found',
        checkpoints: [],
      };
    }
    
    const events = shipment.events || [];
    const statusCode = this.mapDHLStatus(shipment.status?.statusCode || shipment.status?.status || '');
    
    const checkpoints = events.map((event: any) => ({
      timestamp: event.timestamp || new Date().toISOString(),
      location: event.location?.address?.addressLocality || 
                [event.location?.address?.city, event.location?.address?.countryCode].filter(Boolean).join(', ') ||
                'Unknown',
      status: event.statusCode || event.status || '',
      description: event.description || event.status || ''
    }));
    
    const estimatedDelivery = shipment.estimatedTimeOfDelivery 
      ? new Date(shipment.estimatedTimeOfDelivery)
      : shipment.details?.expectedDeliveryTimeFrame?.from
        ? new Date(shipment.details.expectedDeliveryTimeFrame.from)
        : undefined;
    
    return {
      statusCode,
      statusLabel: shipment.status?.description || shipment.status?.status || 'In transit',
      checkpoints,
      estimatedDelivery,
      lastEventAt: events.length > 0 ? new Date(events[0].timestamp) : undefined,
      deliveredAt: statusCode === 'delivered' && events.length > 0 
        ? new Date(events[0].timestamp) 
        : undefined,
    };
  }
  
  private mapDHLStatus(status: string): TrackingStatus {
    const s = (status || '').toLowerCase();
    if (s.includes('deliver') || s === 'ok') return 'delivered';
    if (s.includes('transit') || s.includes('process')) return 'in_transit';
    if (s.includes('out') || s.includes('with delivery courier')) return 'out_for_delivery';
    if (s.includes('exception') || s.includes('failure') || s.includes('issue')) return 'exception';
    if (s.includes('pre-transit') || s.includes('shipment information received')) return 'created';
    return 'unknown';
  }
  
  shouldRefresh(lastChecked?: Date): boolean {
    if (!lastChecked) return true;
    const frequencyMs = this.trackingUpdateFrequencyHours * 60 * 60 * 1000;
    return lastChecked < new Date(Date.now() - frequencyMs);
  }
}

class GenericTrackingAdapter implements TrackingAdapter {
  private trackingUpdateFrequencyHours: number;
  private carrierName: string;
  
  constructor(carrierName: string, trackingUpdateFrequencyHours: number = 1) {
    this.carrierName = carrierName;
    this.trackingUpdateFrequencyHours = trackingUpdateFrequencyHours;
  }
  
  async fetchTracking(trackingNumber: string): Promise<NormalizedTracking> {
    return {
      statusCode: 'unknown',
      statusLabel: `Manual tracking required for ${this.carrierName}`,
      checkpoints: [],
    };
  }
  
  shouldRefresh(lastChecked?: Date): boolean {
    if (!lastChecked) return true;
    const frequencyMs = this.trackingUpdateFrequencyHours * 60 * 60 * 1000;
    return lastChecked < new Date(Date.now() - frequencyMs);
  }
}

export class TrackingService {
  private adapters: Map<string, TrackingAdapter>;
  private trackingUpdateFrequencyHours: number;
  
  constructor(trackingUpdateFrequencyHours?: number) {
    let hours = 1;
    
    if (typeof trackingUpdateFrequencyHours === 'number') {
      hours = Math.max(0.083, Math.min(24, trackingUpdateFrequencyHours));
    }
    
    if (isNaN(hours) || hours <= 0) {
      hours = 1;
    }
    
    this.trackingUpdateFrequencyHours = hours;
    
    this.adapters = new Map<string, TrackingAdapter>();
    this.adapters.set('ppl', new PPLTrackingAdapter(hours));
    this.adapters.set('gls', new GLSTrackingAdapter(hours));
    this.adapters.set('dhl', new DHLTrackingAdapter(hours));
    this.adapters.set('dhl express', new DHLTrackingAdapter(hours));
    this.adapters.set('dhl parcel', new DHLTrackingAdapter(hours));
    this.adapters.set('other', new GenericTrackingAdapter('Other', hours));
  }
  
  async refreshTracking(trackingId: string): Promise<{ tracking: typeof shipmentTracking.$inferSelect | null, orderUpdated: boolean }> {
    const tracking = await db.query.shipmentTracking.findFirst({
      where: eq(shipmentTracking.id, trackingId)
    });
    
    if (!tracking) return { tracking: null, orderUpdated: false };
    
    // For already delivered tracking, skip API call but still try to update order status
    // This ensures orders get updated regardless of entry point (bulk refresh, single refresh, etc.)
    if (tracking.statusCode === 'delivered' || tracking.deliveredAt) {
      const orderUpdated = await this.updateOrderStatusToDelivered(tracking.orderId);
      return { tracking, orderUpdated };
    }
    
    const carrierKey = tracking.carrier.toLowerCase();
    let adapter = this.adapters.get(carrierKey);
    
    if (!adapter) {
      if (carrierKey.includes('dhl')) {
        adapter = this.adapters.get('dhl');
      } else if (carrierKey.includes('gls')) {
        adapter = this.adapters.get('gls');
      } else if (carrierKey.includes('ppl')) {
        adapter = this.adapters.get('ppl');
      } else {
        adapter = new GenericTrackingAdapter(tracking.carrier, this.trackingUpdateFrequencyHours);
      }
    }
    
    if (!adapter!.shouldRefresh(tracking.lastCheckedAt || undefined)) {
      return { tracking, orderUpdated: false };
    }
    
    try {
      const normalized = await adapter!.fetchTracking(tracking.trackingNumber);
      
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
      
      // Automatically update order status to 'delivered' when tracking shows delivered
      let orderUpdated = false;
      if (normalized.statusCode === 'delivered' && tracking.orderId) {
        orderUpdated = await this.updateOrderStatusToDelivered(tracking.orderId);
      }
      
      return { tracking: updated, orderUpdated };
    } catch (error: any) {
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
  
  /**
   * Update order status to 'delivered' when all tracking for the order shows delivered
   * Only updates if order is currently 'shipped' status
   * Returns true if order was actually updated
   */
  private async updateOrderStatusToDelivered(orderId: string): Promise<boolean> {
    try {
      // Get all tracking records for this order
      const orderTrackingRecords = await db.query.shipmentTracking.findMany({
        where: eq(shipmentTracking.orderId, orderId)
      });
      
      // Check if ALL tracking records show 'delivered'
      const allDelivered = orderTrackingRecords.length > 0 && 
        orderTrackingRecords.every(t => t.statusCode === 'delivered');
      
      if (!allDelivered) {
        return false; // Some packages still in transit
      }
      
      // Get the order to check current status
      const order = await db.query.orders.findFirst({
        where: eq(orders.id, orderId)
      });
      
      // Only update if order is currently 'shipped' (not already delivered or other status)
      if (order && order.orderStatus === 'shipped') {
        await db.update(orders)
          .set({
            orderStatus: 'delivered',
            updatedAt: new Date()
          })
          .where(eq(orders.id, orderId));
        
        console.log(`Order ${order.orderId} automatically marked as delivered (tracking confirmed delivery)`);
        return true;
      }
      return false;
    } catch (error) {
      console.error(`Failed to auto-update order ${orderId} status to delivered:`, error);
      return false;
    }
  }
  
  /**
   * Reconcile all shipped orders with delivered tracking
   * Useful for catch-up processing of orders that had tracking delivered before this feature
   * Returns count of orders that were updated to delivered
   */
  async reconcileDeliveredOrders(): Promise<number> {
    try {
      // Get all tracking records that are delivered
      const deliveredTracking = await db.query.shipmentTracking.findMany({
        where: eq(shipmentTracking.statusCode, 'delivered')
      });
      
      // Group by orderId
      const orderIds = [...new Set(deliveredTracking.map(t => t.orderId))];
      
      let updatedCount = 0;
      for (const orderId of orderIds) {
        const wasUpdated = await this.updateOrderStatusToDelivered(orderId);
        if (wasUpdated) {
          updatedCount++;
        }
      }
      
      return updatedCount;
    } catch (error) {
      console.error('Failed to reconcile delivered orders:', error);
      return 0;
    }
  }
  
  async getOrderTracking(orderId: string) {
    return await db.query.shipmentTracking.findMany({
      where: eq(shipmentTracking.orderId, orderId),
      orderBy: (tracking, { asc }) => [asc(tracking.createdAt)]
    });
  }
  
  async createTrackingForOrder(orderId: string): Promise<void> {
    const cartons = await db.query.orderCartons.findMany({
      where: eq(orderCartons.orderId, orderId)
    });
    
    const labels = await db.query.shipmentLabels.findMany({
      where: eq(shipmentLabels.orderId, orderId)
    });
    
    const carrier = labels[0]?.carrier?.toLowerCase() || 'unknown';
    
    if (!carrier || carrier === 'unknown') {
      console.log(`Skipping tracking creation for order ${orderId} - unknown carrier`);
      return;
    }
    
    for (const carton of cartons) {
      if (carton.trackingNumber) {
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
