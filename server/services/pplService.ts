import axios from 'axios';

interface PPLTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

interface PPLAuthCache {
  token: string;
  expiresAt: number;
}

// PPL API Configuration
const PPL_BASE_URL = 'https://api.dhl.com/ecs/ppl/myapi2';
const PPL_TOKEN_URL = 'https://api.dhl.com/ecs/ppl/myapi2/login/getAccessToken';

// Cache for access token
let tokenCache: PPLAuthCache | null = null;

/**
 * Get PPL API access token with caching
 */
export async function getPPLAccessToken(): Promise<string> {
  // Check if we have a valid cached token
  if (tokenCache && tokenCache.expiresAt > Date.now()) {
    return tokenCache.token;
  }

  const clientId = process.env.PPL_CLIENT_ID;
  const clientSecret = process.env.PPL_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('PPL API credentials not configured. Please set PPL_CLIENT_ID and PPL_CLIENT_SECRET environment variables.');
  }

  try {
    const response = await axios.post<PPLTokenResponse>(
      PPL_TOKEN_URL,
      new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: clientId,
        client_secret: clientSecret,
        scope: 'myapi2'
      }),
      {
        headers: {
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
    console.error('Failed to get PPL access token:', error.response?.data || error.message);
    throw new Error('Failed to authenticate with PPL API');
  }
}

/**
 * Make authenticated request to PPL API
 */
async function pplRequest<T>(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  endpoint: string,
  data?: any,
  headers?: Record<string, string>
): Promise<T> {
  const token = await getPPLAccessToken();

  const url = `${PPL_BASE_URL}${endpoint}`;

  try {
    const response = await axios({
      method,
      url,
      data,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept-Language': 'cs-CZ',
        ...headers
      }
    });

    return response.data;
  } catch (error: any) {
    console.error(`PPL API request failed: ${method} ${endpoint}`, error.response?.data || error.message);
    throw error;
  }
}

// PPL API Types
export interface PPLAddress {
  country: string;
  zipCode: string;
  name: string;
  name2?: string;
  street: string;
  city: string;
  contact?: string;
  phone?: string;
  email?: string;
}

export interface PPLShipment {
  referenceId: string;
  productType: string;
  note?: string;
  recipient: PPLAddress;
  sender?: PPLAddress;
  externalNumbers?: Array<{
    code: string;
    externalNumber: string;
  }>;
  weighedShipmentInfo?: {
    weight: number;
  };
  cashOnDelivery?: {
    codCurrency: string;
    codPrice: number;
    codVarSymbol?: string;
  };
}

export interface PPLLabelSettings {
  format?: 'Zpl' | 'Pdf' | 'Jpeg' | 'Png' | 'Svg';
  dpi?: number;
}

export interface PPLCreateShipmentRequest {
  shipments: PPLShipment[];
  labelSettings?: PPLLabelSettings;
}

export interface PPLCreateShipmentResponse {
  batchId: string;
  status: string;
}

export interface PPLBatchStatus {
  batchId: string;
  status: 'InProgress' | 'Finished' | 'Error';
  shipmentResults?: Array<{
    referenceId: string;
    shipmentNumber?: string;
    errorMessage?: string;
  }>;
}

export interface PPLLabel {
  labelContent: string; // Base64 encoded label
  format: string;
}

/**
 * Create PPL shipment(s)
 */
export async function createPPLShipment(request: PPLCreateShipmentRequest): Promise<{ batchId: string; location: string }> {
  try {
    const token = await getPPLAccessToken();
    
    const response = await axios.post(
      `${PPL_BASE_URL}/shipment/batch`,
      request,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept-Language': 'cs-CZ'
        }
      }
    );

    // BatchId is returned in the Location header
    const location = response.headers['location'] || response.headers['Location'];
    const batchId = location ? location.split('/').pop() : null;

    if (!batchId) {
      throw new Error('No batchId returned from PPL API');
    }

    return { batchId, location };
  } catch (error: any) {
    console.error('Failed to create PPL shipment:', error.response?.data || error.message);
    throw new Error(error.response?.data?.message || 'Failed to create PPL shipment');
  }
}

/**
 * Get PPL batch status
 */
export async function getPPLBatchStatus(batchId: string): Promise<PPLBatchStatus> {
  return pplRequest<PPLBatchStatus>('GET', `/shipment/batch/${batchId}/status`);
}

/**
 * Get PPL label (PDF)
 */
export async function getPPLLabel(batchId: string, format: 'pdf' | 'zpl' = 'pdf'): Promise<PPLLabel> {
  const token = await getPPLAccessToken();
  
  try {
    const response = await axios.get(
      `${PPL_BASE_URL}/shipment/batch/${batchId}/label`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': format === 'pdf' ? 'application/pdf' : 'application/zpl'
        },
        responseType: 'arraybuffer'
      }
    );

    // Convert to base64
    const labelContent = Buffer.from(response.data).toString('base64');

    return {
      labelContent,
      format: format === 'pdf' ? 'application/pdf' : 'application/zpl'
    };
  } catch (error: any) {
    console.error('Failed to get PPL label:', error.response?.data || error.message);
    throw new Error('Failed to retrieve PPL label');
  }
}

/**
 * Cancel PPL shipment
 */
export async function cancelPPLShipment(shipmentNumber: string): Promise<void> {
  try {
    await pplRequest('POST', `/shipment/${shipmentNumber}/cancel`);
  } catch (error: any) {
    console.error('Failed to cancel PPL shipment:', error.response?.data || error.message);
    throw new Error(error.response?.data?.message || 'Failed to cancel PPL shipment');
  }
}

/**
 * Get shipment tracking info
 */
export async function getPPLShipmentTracking(shipmentNumber: string): Promise<any> {
  return pplRequest('GET', `/shipment/${shipmentNumber}`);
}
