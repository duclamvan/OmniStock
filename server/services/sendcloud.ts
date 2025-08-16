// Using built-in fetch API (Node.js 18+)

// Sendcloud API configuration
const SENDCLOUD_BASE_URL = 'https://panel.sendcloud.sc/api/v2';
const PUBLIC_KEY = process.env.SENDCLOUD_PUBLIC_KEY;
const PRIVATE_KEY = process.env.SENDCLOUD_PRIVATE_KEY;

if (!PUBLIC_KEY || !PRIVATE_KEY) {
  console.warn('Sendcloud API keys not configured. Shipping functionality will be limited.');
}

// Types for Sendcloud API
export interface SendcloudAddress {
  name: string;
  company?: string;
  address: string;
  address_2?: string;
  city: string;
  postal_code: string;
  country: string; // ISO 2 letter code
  telephone?: string;
  email?: string;
}

export interface SendcloudParcel {
  id?: number;
  name: string;
  company?: string;
  address: string;
  address_2?: string;
  city: string;
  postal_code: string;
  country: string;
  telephone?: string;
  email?: string;
  weight?: number; // in kg
  order_number?: string;
  insured_value?: number;
  customs_invoice_nr?: string;
  customs_shipment_type?: number;
  external_reference?: string;
  shipment?: {
    id?: number;
    name?: string;
  };
  request_label?: boolean;
  apply_shipping_rules?: boolean;
  parcel_items?: Array<{
    description: string;
    quantity: number;
    weight: number;
    value: number;
    origin_country: string;
    sku?: string;
  }>;
}

export interface SendcloudShippingMethod {
  id: number;
  name: string;
  carrier: string;
  min_weight: number;
  max_weight: number;
  price: number;
  currency: string;
  countries: string[];
  service_point_input: 'none' | 'required' | 'optional';
}

export interface SendcloudLabel {
  id: number;
  normal_printer: string[];
  label_printer: string[];
  tracking_number: string;
  tracking_url: string;
}

export interface SendcloudTrackingInfo {
  id: number;
  tracking_number: string;
  carrier: string;
  status: {
    id: number;
    message: string;
  };
  tracking_url: string;
  date_created: string;
  date_shipped?: string;
  date_delivered?: string;
}

class SendcloudService {
  private async makeRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
    if (!PUBLIC_KEY || !PRIVATE_KEY) {
      throw new Error('Sendcloud API credentials not configured');
    }

    const url = `${SENDCLOUD_BASE_URL}${endpoint}`;
    const auth = Buffer.from(`${PUBLIC_KEY}:${PRIVATE_KEY}`).toString('base64');

    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Sendcloud API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    return response.json();
  }

  // Get available shipping methods
  async getShippingMethods(): Promise<SendcloudShippingMethod[]> {
    try {
      const response = await this.makeRequest('/shipping_methods');
      return response.shipping_methods || [];
    } catch (error) {
      console.error('Failed to fetch shipping methods:', error);
      return [];
    }
  }

  // Create a parcel (with or without label)
  async createParcel(parcelData: SendcloudParcel): Promise<any> {
    const response = await this.makeRequest('/parcels', {
      method: 'POST',
      body: JSON.stringify({ parcel: parcelData }),
    });
    return response.parcel;
  }

  // Create multiple parcels in batch
  async createParcels(parcelsData: SendcloudParcel[]): Promise<any[]> {
    const response = await this.makeRequest('/parcels', {
      method: 'POST',
      body: JSON.stringify({ parcels: parcelsData }),
    });
    return response.parcels || [];
  }

  // Update a parcel (e.g., to request label)
  async updateParcel(parcelId: number, updates: Partial<SendcloudParcel>): Promise<any> {
    const response = await this.makeRequest(`/parcels/${parcelId}`, {
      method: 'PUT',
      body: JSON.stringify({ parcel: updates }),
    });
    return response.parcel;
  }

  // Get parcel details
  async getParcel(parcelId: number): Promise<any> {
    const response = await this.makeRequest(`/parcels/${parcelId}`);
    return response.parcel;
  }

  // Get label for a parcel
  async getLabel(labelId: number): Promise<SendcloudLabel> {
    const response = await this.makeRequest(`/labels/${labelId}`);
    return response.label;
  }

  // Get tracking information
  async getTracking(parcelId: number): Promise<SendcloudTrackingInfo> {
    const parcel = await this.getParcel(parcelId);
    return {
      id: parcel.id,
      tracking_number: parcel.tracking_number,
      carrier: parcel.carrier?.name || '',
      status: parcel.status,
      tracking_url: parcel.tracking_url,
      date_created: parcel.date_created,
      date_shipped: parcel.date_shipped,
      date_delivered: parcel.date_delivered,
    };
  }

  // Create shipping label for order
  async createShippingLabel(orderData: {
    orderNumber: string;
    customerName: string;
    customerEmail?: string;
    customerPhone?: string;
    shippingAddress: {
      line1: string;
      line2?: string;
      city: string;
      postalCode: string;
      country: string;
    };
    items: Array<{
      name: string;
      sku?: string;
      quantity: number;
      weight?: number;
      value?: number;
    }>;
    shippingMethodId?: number;
    weight?: number;
    value?: number;
  }): Promise<{ parcel: any; label?: SendcloudLabel }> {
    
    // Calculate total weight if not provided
    const totalWeight = orderData.weight || 
      orderData.items.reduce((sum, item) => sum + (item.weight || 0.2) * item.quantity, 0);

    // Prepare parcel data
    const parcelData: SendcloudParcel = {
      name: orderData.customerName,
      address: orderData.shippingAddress.line1,
      address_2: orderData.shippingAddress.line2,
      city: orderData.shippingAddress.city,
      postal_code: orderData.shippingAddress.postalCode,
      country: orderData.shippingAddress.country,
      telephone: orderData.customerPhone,
      email: orderData.customerEmail,
      weight: totalWeight,
      order_number: orderData.orderNumber,
      insured_value: orderData.value,
      external_reference: orderData.orderNumber,
      request_label: true,
      apply_shipping_rules: true,
      parcel_items: orderData.items.map(item => ({
        description: item.name,
        quantity: item.quantity,
        weight: item.weight || 0.2,
        value: item.value || 10,
        origin_country: 'NL', // Default origin country
        sku: item.sku,
      })),
    };

    // Add shipping method if specified
    if (orderData.shippingMethodId) {
      parcelData.shipment = { id: orderData.shippingMethodId };
    }

    // Create parcel with label
    const parcel = await this.createParcel(parcelData);

    // Get label if created
    let label;
    if (parcel.label && parcel.label.id) {
      try {
        label = await this.getLabel(parcel.label.id);
      } catch (error) {
        console.warn('Failed to fetch label details:', error);
      }
    }

    return { parcel, label };
  }

  // Create test parcel (using unstamped letter method)
  async createTestParcel(address: SendcloudAddress): Promise<any> {
    const testParcel: SendcloudParcel = {
      ...address,
      weight: 0.1,
      order_number: `TEST-${Date.now()}`,
      shipment: {
        name: 'Unstamped letter' // Free test method
      },
      request_label: true,
      apply_shipping_rules: false,
    };

    return this.createParcel(testParcel);
  }

  // Get service points (pickup locations)
  async getServicePoints(country: string, postalCode: string, carrier?: string): Promise<any[]> {
    try {
      let endpoint = `/service-points?country=${country}&postal_code=${postalCode}`;
      if (carrier) {
        endpoint += `&carrier=${carrier}`;
      }
      
      const response = await this.makeRequest(endpoint);
      return response.service_points || [];
    } catch (error) {
      console.error('Failed to fetch service points:', error);
      return [];
    }
  }

  // Cancel a parcel
  async cancelParcel(parcelId: number): Promise<boolean> {
    try {
      await this.makeRequest(`/parcels/${parcelId}/cancel`, {
        method: 'POST',
      });
      return true;
    } catch (error) {
      console.error('Failed to cancel parcel:', error);
      return false;
    }
  }

  // Check API connection
  async testConnection(): Promise<{ connected: boolean; user?: any; error?: string }> {
    try {
      const response = await this.makeRequest('/user');
      return { connected: true, user: response.user };
    } catch (error) {
      return { 
        connected: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }
}

export const sendcloudService = new SendcloudService();