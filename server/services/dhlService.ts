import axios from 'axios';

interface DHLTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

interface DHLAuthCache {
  token: string;
  expiresAt: number;
}

// DHL API Configuration - Production Environment
// Post & Parcel Germany Authentication API
const DHL_AUTH_URL = 'https://api-eu.dhl.com/post/de/shipping/oauth/token';
// DHL Parcel DE Shipping v4
const DHL_SHIPPING_BASE_URL = 'https://api-eu.dhl.com/parcel/de/shipping/v4';

// Cache for access token
let tokenCache: DHLAuthCache | null = null;

/**
 * Get DHL API access token with caching using OAuth2 client_credentials
 */
export async function getDHLAccessToken(): Promise<string> {
  // Check if we have a valid cached token
  if (tokenCache && tokenCache.expiresAt > Date.now()) {
    return tokenCache.token;
  }

  const apiKey = process.env.DHL_API_KEY;
  const apiSecret = process.env.DHL_API_SECRET;

  if (!apiKey || !apiSecret) {
    throw new Error('DHL API credentials not configured. Please set DHL_API_KEY and DHL_API_SECRET environment variables.');
  }

  try {
    // OAuth2 client_credentials flow using Basic Auth
    const credentials = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64');
    
    const response = await axios.post<DHLTokenResponse>(
      DHL_AUTH_URL,
      new URLSearchParams({
        grant_type: 'client_credentials'
      }),
      {
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    const { access_token, expires_in } = response.data;

    // Cache the token with a 5-minute buffer before expiration
    tokenCache = {
      token: access_token,
      expiresAt: Date.now() + (expires_in - 300) * 1000
    };

    return access_token;
  } catch (error: any) {
    const errorDetails = {
      message: error.message,
      data: error.response?.data,
      status: error.response?.status,
      url: DHL_AUTH_URL,
      apiKey: apiKey?.substring(0, 4) + '***' // Show only first 4 chars
    };
    console.error('Failed to get DHL access token:', errorDetails);
    
    // Throw a detailed error
    const errorMessage = error.response?.data?.error_description || 
                        error.response?.data?.error || 
                        'Failed to authenticate with DHL API';
    const err = new Error(errorMessage) as any;
    err.details = errorDetails;
    throw err;
  }
}

/**
 * Test DHL API connection
 */
export async function testDHLConnection(): Promise<{ success: boolean; message: string; details?: any }> {
  try {
    const token = await getDHLAccessToken();
    
    return {
      success: true,
      message: 'Successfully connected to DHL API',
      details: {
        tokenPreview: token.substring(0, 20) + '...',
        expiresAt: tokenCache?.expiresAt ? new Date(tokenCache.expiresAt).toISOString() : null
      }
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.message || 'Failed to connect to DHL API',
      details: error.details
    };
  }
}

/**
 * Make authenticated request to DHL API
 */
async function dhlRequest<T>(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  endpoint: string,
  data?: any,
  headers?: Record<string, string>
): Promise<T> {
  const token = await getDHLAccessToken();

  const url = `${DHL_SHIPPING_BASE_URL}${endpoint}`;

  try {
    const response = await axios({
      method,
      url,
      data,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept-Language': 'de-DE',
        ...headers
      }
    });

    return response.data;
  } catch (error: any) {
    console.error(`DHL API request failed: ${method} ${endpoint}`, error.response?.data || error.message);
    throw error;
  }
}

// DHL API Types
export interface DHLAddress {
  name: string;
  name2?: string;
  name3?: string;
  address: {
    streetName: string;
    streetNumber: string;
    addressAddition?: string;
    postalCode: string;
    city: string;
    country: string; // ISO 3166-1 alpha-2
  };
  contactPerson?: {
    name?: string;
    phone?: string;
    email?: string;
  };
}

export interface DHLShipment {
  shipper: DHLAddress;
  recipient: DHLAddress;
  product: string; // e.g., "V01PAK" for domestic parcel
  accounts: {
    ekp: string; // Customer account number (10 digits)
    participationNumber: string; // Usually "01" for standard products
  };
  shipmentDetails: {
    weightInKG: number;
    lengthInCM?: number;
    widthInCM?: number;
    heightInCM?: number;
  };
  label?: {
    format?: 'A4' | 'A6' | '910-300-700' | '910-300-700-oz' | '910-300-600' | '910-300-610'; // A4, A6, or thermal formats
    returnAddress?: DHLAddress;
  };
  services?: {
    cashOnDelivery?: {
      amount: number;
      currency: string; // EUR
    };
    premium?: boolean;
    bulkyGoods?: boolean;
    identCheck?: {
      firstName: string;
      lastName: string;
      dateOfBirth: string; // YYYY-MM-DD
      minimumAge?: string; // A16, A18
    };
  };
  referenceNumber?: string;
  customerReference?: string;
}

export interface DHLCreateShipmentRequest {
  shipments: DHLShipment[];
}

export interface DHLCreateShipmentResponse {
  shipments: Array<{
    shipmentNo: string;
    returnShipmentNo?: string;
    label?: {
      b64: string; // Base64 encoded label
      fileFormat: string;
    };
  }>;
}

/**
 * Create DHL shipment and get label
 */
export async function createDHLShipment(
  shipmentData: DHLCreateShipmentRequest
): Promise<DHLCreateShipmentResponse> {
  try {
    const response = await dhlRequest<DHLCreateShipmentResponse>(
      'POST',
      '/shipments',
      shipmentData
    );

    return response;
  } catch (error: any) {
    console.error('DHL create shipment failed:', error.response?.data || error.message);
    throw new Error(error.response?.data?.detail || error.message || 'Failed to create DHL shipment');
  }
}

/**
 * Get DHL shipment label
 */
export async function getDHLLabel(shipmentNumber: string): Promise<string> {
  try {
    const response = await dhlRequest<{ label: { b64: string } }>(
      'GET',
      `/shipments/${shipmentNumber}/label`
    );

    return response.label.b64;
  } catch (error: any) {
    console.error('DHL get label failed:', error.response?.data || error.message);
    throw new Error('Failed to retrieve DHL label');
  }
}

/**
 * Cancel DHL shipment
 */
export async function cancelDHLShipment(shipmentNumber: string): Promise<void> {
  try {
    await dhlRequest<void>(
      'DELETE',
      `/shipments/${shipmentNumber}`
    );
  } catch (error: any) {
    console.error('DHL cancel shipment failed:', error.response?.data || error.message);
    throw new Error('Failed to cancel DHL shipment');
  }
}
