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

// DHL API Configuration
// Authentication API (Post & Parcel Germany) - ROPC OAuth2
const DHL_AUTH_URL = 'https://api-sandbox.dhl.com/parcel/de/account/auth/ropc/v1/token';
// Parcel DE Shipping API v2
const DHL_SHIPPING_BASE_URL = 'https://api-sandbox.dhl.com/parcel/de/shipping/v2';

// Sandbox test credentials (as per DHL documentation)
const DHL_SANDBOX_USERNAME = 'user-valid';
const DHL_SANDBOX_PASSWORD = 'SandboxPasswort2023!';

// Cache for access token
let tokenCache: DHLAuthCache | null = null;

/**
 * Get DHL OAuth2 access token using ROPC grant type
 * Tokens expire after ~5 minutes (300 seconds)
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
    const response = await axios.post<DHLTokenResponse>(
      DHL_AUTH_URL,
      new URLSearchParams({
        grant_type: 'password',
        username: DHL_SANDBOX_USERNAME,
        password: DHL_SANDBOX_PASSWORD,
        client_id: apiKey,
        client_secret: apiSecret
      }),
      {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    const { access_token, expires_in } = response.data;

    // Cache the token with a 1-minute buffer before expiration
    tokenCache = {
      token: access_token,
      expiresAt: Date.now() + (expires_in - 60) * 1000
    };

    return access_token;
  } catch (error: any) {
    const errorDetails = {
      message: error.message,
      data: error.response?.data,
      status: error.response?.status,
      url: DHL_AUTH_URL
    };
    console.error('Failed to get DHL access token:', errorDetails);
    
    const errorMessage = error.response?.data?.error_description || 
                        error.response?.data?.detail || 
                        error.response?.data?.title ||
                        error.message || 
                        'Failed to authenticate with DHL API';
    const err = new Error(errorMessage) as any;
    err.details = errorDetails;
    throw err;
  }
}

/**
 * Test DHL API connection by requesting an OAuth2 token
 */
export async function testDHLConnection(): Promise<{ success: boolean; message: string; details?: any }> {
  try {
    const token = await getDHLAccessToken();
    
    return {
      success: true,
      message: 'Successfully connected to DHL API',
      details: {
        tokenPreview: token.substring(0, 20) + '...',
        expiresAt: tokenCache?.expiresAt ? new Date(tokenCache.expiresAt).toISOString() : null,
        environment: 'Sandbox (Customer Integration Testing)',
        baseUrl: DHL_SHIPPING_BASE_URL
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
 * Make authenticated request to DHL API using OAuth2 Bearer token
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
        'Accept': 'application/json',
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
