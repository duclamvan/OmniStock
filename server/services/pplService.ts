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

// PPL API Configuration - Production Environment
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
    const errorDetails = {
      message: error.message,
      data: error.response?.data,
      status: error.response?.status,
      url: PPL_TOKEN_URL,
      clientId: clientId?.substring(0, 4) + '***' // Show only first 4 chars
    };
    console.error('Failed to get PPL access token:', errorDetails);
    
    // Throw a detailed error
    const errorMessage = error.response?.data?.error_description || 
                        error.response?.data?.error || 
                        'Failed to authenticate with PPL API';
    const err = new Error(errorMessage) as any;
    err.details = errorDetails;
    throw err;
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
    CodPrice: number;     // PPL API requires PascalCase
    CodCurrency: string;  // PPL API requires PascalCase
    CodVarSym?: string;   // PPL API requires PascalCase
  };
  shipmentSet?: {
    numberOfShipments: number;
    shipmentSetItems: Array<{
      shipmentNumber: string;
      weighedShipmentInfo: {
        weight: number;
      };
    }>;
  };
}

export interface PPLLabelSettings {
  format?: 'Zpl' | 'Pdf' | 'Jpeg' | 'Png' | 'Svg';
  dpi?: number;
  completeLabelSettings?: {
    isCompleteLabelRequested?: boolean;
    pageSize?: 'Default' | 'A4'; // Default = thermal label size (127x110mm domestic, 150x100mm intl), A4 = 4 labels per A4
  };
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
  items?: Array<{
    referenceId?: string;
    shipmentNumber?: string;
    insuranceCurrency?: string;
    insurancePrice?: number;
    labelUrl?: string;
    importState?: string;
    errorMessage?: string;
    errorCode?: string;
    relatedItems?: any[];
  }>;
  completeLabel?: any;
}

export interface PPLLabel {
  labelContent: string; // Base64 encoded label
  format: string;
}

// Response from GET /order endpoint
export interface PPLOrderResponse {
  orderNumber?: string;
  orderState?: string;
  orderType?: string;
  referenceId?: string;
  shipmentCount?: number;
  realShipmentCount?: number;
  email?: string;
  note?: string;
  customerReference?: string;
  productType?: string;
  sendDate?: string;
  realCollectionDate?: string;
  deliveryDateTime?: string;
  sender?: any;
  recipient?: any;
  shipmentNumbers?: string[]; // This is what we need - actual tracking numbers!
}

// Response from GET /shipment endpoint
export interface PPLShipmentResponse {
  shipmentNumber?: string;
  productType?: string;
  productTypeChanged?: boolean;
  note?: string;
  depot?: string;
  integratorId?: number;
  lastUpdateDate?: string;
  shipmentState?: string;
  shipmentSet?: {
    masterShipmentNumber?: string;
    shipmentsInSet?: number;
    shipmentInSetNumber?: number;
  };
  sender?: any;
  recipient?: any;
  specificDelivery?: any;
  externalNumbers?: Array<{
    externalNumber?: string;
    code?: string;
  }>;
  services?: any[];
  trackAndTrace?: {
    externalShipmentId?: string;
    partnerUrl?: string;
    lastEventCode?: string;
    lastEventDate?: string;
    lastEventName?: string;
    events?: any[];
  };
  shipmentWeightInfo?: {
    weight?: number;
    weighedDate?: string;
  };
  paymentInfo?: {
    paidByCard?: boolean;
    codPaidDate?: string;
  };
}

/**
 * Create PPL shipment(s)
 * Returns batchId, location, and any tracking numbers included in the response
 */
export async function createPPLShipment(request: PPLCreateShipmentRequest): Promise<{ 
  batchId: string; 
  location: string;
  trackingNumbers?: string[];
  responseData?: any;
}> {
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

    // 🔍 LOG EVERYTHING - Let's see what PPL actually returns!
    console.log('═══════════════════════════════════════════════════');
    console.log('📦 PPL BATCH CREATION RESPONSE - FULL DATA:');
    console.log('═══════════════════════════════════════════════════');
    console.log('Status:', response.status);
    console.log('Headers:', JSON.stringify(response.headers, null, 2));
    console.log('Response Body:', JSON.stringify(response.data, null, 2));
    console.log('BatchId extracted:', batchId);
    console.log('═══════════════════════════════════════════════════');

    // Try to extract tracking numbers from response if they exist
    let trackingNumbers: string[] = [];
    const responseData = response.data;
    
    // Check various possible locations for tracking numbers in the response
    if (responseData) {
      // Try shipmentResults array (similar to batch status format)
      if (Array.isArray(responseData.shipmentResults)) {
        trackingNumbers = responseData.shipmentResults
          .filter((r: any) => r.parcelNumber || r.shipmentNumber)
          .map((r: any) => r.parcelNumber || r.shipmentNumber);
      }
      // Try direct parcelNumber field
      else if (responseData.parcelNumber) {
        trackingNumbers = [responseData.parcelNumber];
      }
      // Try shipments array
      else if (Array.isArray(responseData.shipments)) {
        trackingNumbers = responseData.shipments
          .filter((s: any) => s.parcelNumber || s.shipmentNumber)
          .map((s: any) => s.parcelNumber || s.shipmentNumber);
      }
      
      if (trackingNumbers.length > 0) {
        console.log('✅ FOUND TRACKING NUMBERS in batch creation response:', trackingNumbers);
      } else {
        console.log('⚠️ No tracking numbers found in batch creation response');
        console.log('   Will need to retrieve from label or use alternative method');
      }
    }

    return { 
      batchId, 
      location,
      trackingNumbers: trackingNumbers.length > 0 ? trackingNumbers : undefined,
      responseData
    };
  } catch (error: any) {
    const errorDetails = {
      message: error.message,
      data: error.response?.data,
      status: error.response?.status,
      url: `${PPL_BASE_URL}/shipment/batch`,
      requestData: JSON.stringify(request, null, 2)
    };
    console.error('Failed to create PPL shipment:', errorDetails);
    
    // Extract error message from various possible formats
    let errorMessage = 'Failed to create PPL shipment';
    if (error.response?.data) {
      const data = error.response.data;
      if (data.title && data.errors) {
        // Validation errors format
        const validationErrors = Object.entries(data.errors)
          .map(([field, msgs]: [string, any]) => `${field}: ${Array.isArray(msgs) ? msgs.join(', ') : msgs}`)
          .join('; ');
        errorMessage = `${data.title}: ${validationErrors}`;
      } else if (data.detail) {
        errorMessage = data.detail;
      } else if (data.message) {
        errorMessage = data.message;
      }
    }
    
    const err = new Error(errorMessage) as any;
    err.details = errorDetails;
    throw err;
  }
}

/**
 * Get PPL batch status
 */
export async function getPPLBatchStatus(batchId: string): Promise<PPLBatchStatus> {
  return pplRequest<PPLBatchStatus>('GET', `/shipment/batch/${batchId}`);
}

/**
 * Get PPL shipment info by customer reference (our referenceId)
 * Uses GET /shipment with CustomerReferences query param
 * Returns shipment details including shipmentNumber (tracking number)
 */
export async function getPPLShipmentByReference(referenceId: string): Promise<PPLShipmentResponse[]> {
  const token = await getPPLAccessToken();
  
  const maxRetries = 5;
  const retryDelay = 2000;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await axios.get(
        `${PPL_BASE_URL}/shipment`,
        {
          params: {
            CustomerReferences: referenceId
          },
          paramsSerializer: (params) => {
            const searchParams = new URLSearchParams();
            for (const [key, value] of Object.entries(params)) {
              if (Array.isArray(value)) {
                value.forEach(v => searchParams.append(key, v));
              } else if (value !== undefined && value !== null) {
                searchParams.append(key, String(value));
              }
            }
            return searchParams.toString();
          },
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json',
            'Accept-Language': 'cs-CZ'
          }
        }
      );
      
      console.log(`✅ PPL Shipment query successful (attempt ${attempt}):`, JSON.stringify(response.data, null, 2));
      
      // API returns array of shipments
      if (Array.isArray(response.data)) {
        return response.data as PPLShipmentResponse[];
      }
      
      // Single shipment response
      return [response.data as PPLShipmentResponse];
    } catch (error: any) {
      console.log(`⚠️ PPL Shipment query attempt ${attempt}/${maxRetries} failed:`, error.message);
      console.log(`   Error details:`, error.response?.data);
      
      if (attempt < maxRetries) {
        console.log(`   Retrying in ${retryDelay}ms...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      } else {
        console.error('❌ All PPL Shipment query attempts failed');
        throw error;
      }
    }
  }
  
  return [];
}


/**
 * Get PPL label (PDF)
 * Includes retry logic because PPL API sometimes needs time to process the label after batch creation
 * @param batchId - The batch ID from shipment creation
 * @param format - Label format (pdf or zpl)
 * @param options - Additional options like offset and limit for pagination
 */
export async function getPPLLabel(
  batchId: string, 
  format: 'pdf' | 'zpl' = 'pdf',
  options?: { offset?: number; limit?: number }
): Promise<PPLLabel> {
  const token = await getPPLAccessToken();
  
  // Default pagination params (PPL requires these)
  const offset = options?.offset ?? 0;
  const limit = options?.limit ?? 100;
  
  // Retry logic: PPL sometimes returns 404 immediately after batch creation
  // Label might need a few seconds to become available
  const maxRetries = 5;
  const retryDelay = 2000; // 2 seconds between retries
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await axios.get(
        `${PPL_BASE_URL}/shipment/batch/${batchId}/label`,
        {
          params: {
            offset,
            limit
          },
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': format === 'pdf' ? 'application/pdf' : 'application/zpl'
          },
          responseType: 'arraybuffer'
        }
      );

      // Convert to base64
      const labelContent = Buffer.from(response.data).toString('base64');

      console.log(`✅ Successfully retrieved PPL label for batch ${batchId} (attempt ${attempt})`);
      return {
        labelContent,
        format: format === 'pdf' ? 'application/pdf' : 'application/zpl'
      };
    } catch (error: any) {
      const errorDetails = {
        message: error.message,
        data: error.response?.data ? Buffer.from(error.response.data).toString('utf-8') : null,
        status: error.response?.status,
        batchId,
        attempt
      };
      
      // If it's a 404, retry (label might not be ready yet)
      if (error.response?.status === 404 && attempt < maxRetries) {
        console.log(`⏳ Label not ready yet for batch ${batchId}, retrying in ${retryDelay}ms (attempt ${attempt}/${maxRetries})...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        continue;
      }
      
      // For other errors or last attempt, fail
      console.error('Failed to get PPL label:', errorDetails);
      
      const err = new Error('Failed to retrieve PPL label') as any;
      err.details = errorDetails;
      throw err;
    }
  }
  
  // Should never reach here, but TypeScript needs this
  throw new Error('Failed to retrieve PPL label after all retries');
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

// PPL Access Point (ParcelShop/ParcelBox) types - matching PPL API response
export interface PPLAccessPointWorkHour {
  weekDay: number;
  dayPart: number;
  openFrom: string;
  openTo: string;
}

export interface PPLAccessPoint {
  accessPointCode: string;
  accessPointType: string;
  name: string;
  name2?: string;
  street: string;
  city: string;
  country: string;
  zipCode: string;
  phone?: string;
  email?: string;
  tribalServicePoint?: boolean;
  activeCardPayment?: boolean;
  activeCashPayment?: boolean;
  pickupEnabled?: boolean;
  gps?: {
    latitude?: number;
    longitude?: number;
  };
  workHours?: PPLAccessPointWorkHour[];
}

export interface PPLAccessPointSearchParams {
  city?: string;
  zipCode?: string;
  country?: string;
  limit?: number;
  offset?: number;
  accessPointTypes?: string[];
}

/**
 * Search PPL Access Points (ParcelShops and ParcelBoxes)
 * Used for PPL SMART service to allow customers to pick up packages
 */
export async function searchPPLAccessPoints(params: PPLAccessPointSearchParams): Promise<PPLAccessPoint[]> {
  const token = await getPPLAccessToken();
  
  const queryParams = new URLSearchParams();
  if (params.city) queryParams.append('City', params.city);
  if (params.zipCode) queryParams.append('ZipCode', params.zipCode);
  queryParams.append('CountryCode', params.country || 'CZ');
  queryParams.append('Limit', (params.limit || 1000).toString());
  queryParams.append('Offset', (params.offset ?? 0).toString());
  if (params.accessPointTypes && params.accessPointTypes.length > 0) {
    params.accessPointTypes.forEach(type => queryParams.append('AccessPointTypes', type));
  }
  
  try {
    const response = await axios.get(
      `${PPL_BASE_URL}/accessPoint?${queryParams.toString()}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
          'Accept-Language': 'cs-CZ'
        }
      }
    );
    
    // Return the raw API response directly (it's already in the correct format)
    const accessPoints = Array.isArray(response.data) ? response.data : (response.data?.items || []);
    
    return accessPoints.map((ap: any) => ({
      accessPointCode: ap.accessPointCode || ap.code,
      accessPointType: ap.accessPointType || 'ParcelShop',
      name: ap.name || '',
      name2: ap.name2,
      street: ap.street || '',
      city: ap.city || '',
      country: ap.country || 'CZ',
      zipCode: ap.zipCode || '',
      phone: ap.phone,
      email: ap.email,
      tribalServicePoint: ap.tribalServicePoint,
      activeCardPayment: ap.activeCardPayment,
      activeCashPayment: ap.activeCashPayment,
      pickupEnabled: ap.pickupEnabled,
      gps: ap.gps ? {
        latitude: ap.gps.latitude,
        longitude: ap.gps.longitude
      } : undefined,
      workHours: ap.workHours
    }));
  } catch (error: any) {
    console.error('Failed to search PPL access points:', error.response?.data || error.message);
    throw new Error(error.response?.data?.message || 'Failed to search PPL access points');
  }
}
