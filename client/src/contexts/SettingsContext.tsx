import { createContext, useContext, useMemo, ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getDefaultTaxRate, applyTax, calculateOrderTotals } from '@shared/utils/tax';

// Default expense categories (fallback if not set in app_settings)
export const DEFAULT_EXPENSE_CATEGORIES = [
  'Office Supplies',
  'Travel',
  'Marketing',
  'Salaries',
  'Rent',
  'Utilities',
  'Supplies',
  'Software',
  'Equipment',
  'Insurance',
  'Legal',
  'Consulting',
  'Inventory',
  'Shipping',
  'Operations',
  'General',
];

// Default return types (fallback if not set in app_settings)
// Only first 3 types enabled by default for cleaner UI
export const DEFAULT_RETURN_TYPES = [
  { value: 'exchange', labelKey: 'exchangeType', enabled: true },
  { value: 'refund', labelKey: 'refundType', enabled: true },
  { value: 'store_credit', labelKey: 'storeCreditType', enabled: true },
  { value: 'damaged_goods', labelKey: 'damagedGoods', enabled: false, disposesInventory: true },
  { value: 'bad_quality', labelKey: 'badQuality', enabled: false, disposesInventory: true },
  { value: 'guarantee', labelKey: 'guaranteeType', enabled: false },
];

export interface ReturnTypeConfig {
  value: string;
  labelKey: string;
  enabled: boolean;
  disposesInventory?: boolean;
}

// Types for settings by category
export interface GeneralSettings {
  companyName?: string;
  companyEmail?: string;
  companyPhone?: string;
  companyAddress?: string;
  companyCity?: string;
  companyZip?: string;
  companyCountry?: string;
  companyWebsite?: string;
  companyVatId?: string;
  companyLogoUrl?: string;
  companyInvoiceStamp?: string;
  companyFacebookUrl?: string;
  companyWhatsAppNumber?: string;
  companyZaloNumber?: string;
  companyLinkedInUrl?: string;
  companyInstagramUrl?: string;
  defaultLanguage?: 'en' | 'vi';
  defaultDateFormat?: 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD';
  defaultTimeFormat?: '12-hour' | '24-hour';
  defaultTimezone?: string;
  numberFormat?: '1,000.00' | '1.000,00';
  defaultCurrency?: 'CZK' | 'EUR' | 'USD' | 'VND' | 'CNY';
  currencyDisplay?: 'symbol' | 'code' | 'both';
  defaultPriority?: 'low' | 'medium' | 'high';
  defaultOrderWarehouseId?: number;
  lowStockAlertEmail?: boolean;
  orderStatusChangeNotifications?: boolean;
  dailySummaryReportEmail?: boolean;
  weeklyReportEmail?: boolean;
  monthlyReportEmail?: boolean;
  yearlyReportEmail?: boolean;
  enableAiAddressParsing?: boolean;
  enableAiCartonPacking?: boolean;
  auditLogRetentionDays?: number;
  sessionTimeoutMinutes?: number;
  require2faForAdmins?: boolean;
  maxLoginAttempts?: number;
  enableDataExport?: boolean;
  autoLogoutOnIdle?: boolean;
}

export interface InventorySettings {
  lowStockThreshold?: number;
  defaultProductType?: 'regular' | 'bundle' | 'service';
  enableBarcodeScanning?: boolean;
  defaultPackagingRequirement?: 'carton' | 'outer_carton' | 'nylon_wrap';
  autoGenerateSku?: boolean;
  skuPrefix?: string;
  trackSerialNumbers?: boolean;
  stockAdjustmentApprovalRequired?: boolean;
  allowNegativeStock?: boolean;
  autoReorderPoint?: number;
  safetyStockLevel?: number;
  stockCountFrequencyDays?: number;
  enableBatchLotTracking?: boolean;
  enableExpirationDateTracking?: boolean;
  defaultWarehouse?: string;
  enableMultiWarehouse?: boolean;
  autoAssignWarehouseLocation?: boolean;
  locationFormat?: 'A-01-01' | 'A01-R01-S01' | 'Zone-Rack-Bin' | 'Custom';
  enableBinManagement?: boolean;
  enableZoneManagement?: boolean;
  temperatureControlZones?: boolean;
  enableQualityControl?: boolean;
  qcSamplingRate?: number;
  damageReportRequired?: boolean;
  photoEvidenceRequired?: boolean;
  conditionTracking?: 'good' | 'damaged' | 'refurbished' | 'returned';
  defaultLengthUnit?: 'cm' | 'mm' | 'm' | 'in';
  defaultWeightUnit?: 'kg' | 'g' | 'lb' | 'oz';
  defaultVolumeUnit?: 'L' | 'mL' | 'gal' | 'oz';
  decimalPlacesWeight?: number;
  decimalPlacesDimensions?: number;
  enableProductVariants?: boolean;
  enableBundles?: boolean;
  enableServices?: boolean;
  maxImagesPerProduct?: number;
  autoCompressImages?: boolean;
  imageQuality?: number;
  returnTypes?: ReturnTypeConfig[];
}

export interface OrderSettings {
  defaultPaymentMethod?: 'Cash' | 'Card' | 'Transfer' | 'COD' | 'Pay Later' | 'Bank Transfer' | 'PayPal';
  defaultOrderStatus?: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  defaultPaymentStatus?: 'pending' | 'paid' | 'pay_later' | 'refunded';
  defaultCarrier?: 'GLS' | 'PPL' | 'DHL' | 'DPD' | 'UPS' | 'FedEx' | 'Other';
  defaultCommunicationChannel?: 'Viber' | 'WhatsApp' | 'Zalo' | 'E-mail' | 'Phone';
  defaultDiscountType?: 'flat' | 'rate';
  defaultFulfillmentStage?: 'pending' | 'picking' | 'packing' | 'ready_to_ship' | 'shipped';
  autoAssignOrdersToWarehouse?: boolean;
  autoCreatePackingLists?: boolean;
  autoCalculateShipping?: boolean;
  requireBarcodeScanForPicking?: boolean;
  enableAiCartonPacking?: boolean;
  pickPackTimeSlaHours?: number;
  requireCustomerEmail?: boolean;
  requireShippingAddress?: boolean;
  requirePhoneNumber?: boolean;
  allowNegativeStock?: boolean;
  minimumOrderValue?: number;
  blockDuplicateOrdersHours?: number;
  autoSendOrderConfirmationEmail?: boolean;
  autoSendShippingNotification?: boolean;
  autoSendDeliveryNotification?: boolean;
  autoUpdateStockOnOrder?: boolean;
  autoCreateReturnRequest?: boolean;
  enableCod?: boolean;
  defaultCodCurrency?: 'CZK' | 'EUR' | 'USD';
  codFeePercentage?: number;
  codFeeFixedAmount?: number;
  requireCodSignature?: boolean;
  defaultOrderLocation?: string;
  autoAssignWarehouseByRegion?: boolean;
  czechRepublicCarrier?: string;
  europeanUnionCarrier?: string;
  restOfWorldCarrier?: string;
  enableLocationBasedRouting?: boolean;
  preferNearestWarehouse?: boolean;
}

export interface ShippingSettings {
  quickSelectCzk?: string;
  quickSelectEur?: string;
  defaultShippingMethod?: string;
  pplDefaultSenderAddress?: string | object;
  pplEnableAutoLabel?: boolean;
  pplMaxPackageWeightKg?: number;
  pplMaxPackageDimensionsCm?: string;
  pplShippingRates?: {
    domestic?: Array<{ maxWeight: number; price: number; currency: string }>;
    eu?: Array<{ maxWeight: number; price: number; currency: string }>;
  };
  countryCarrierMapping?: Record<string, string>;
  glsDefaultSenderAddress?: string | object;
  glsEnableManualLabels?: boolean;
  glsMaxPackageWeightKg?: number;
  glsMaxGirthCm?: number;
  glsShippingRates?: string | object;
  dhlDefaultSenderAddress?: string | object;
  dhlEnableAutoLabel?: boolean;
  dhlMaxPackageWeightKg?: number;
  dhlMaxPackageDimensionsCm?: string;
  dhlShippingRates?: string | object;
  availableCarriers?: string;
  defaultCarrier?: string;
  enableCarrierRateShopping?: boolean;
  autoSelectCheapestCarrier?: boolean;
  defaultLabelSize?: 'A4' | 'A5' | '4x6' | '10x15cm';
  labelFormat?: 'PDF' | 'PNG' | 'ZPL';
  autoPrintLabels?: boolean;
  includePackingSlip?: boolean;
  includeInvoice?: boolean;
  enableTracking?: boolean;
  autoUpdateTrackingStatus?: boolean;
  trackingUpdateFrequencyHours?: number;
  sendTrackingEmailToCustomer?: boolean;
  includeEstimatedDelivery?: boolean;
  defaultShippingCostEur?: number;
  freeShippingThresholdEur?: number;
  defaultShippingCostCzk?: number;
  freeShippingThresholdCzk?: number;
  volumetricWeightDivisor?: number;
  autoGenerateLabels?: boolean;
  defaultLabelFormat?: 'A4' | 'thermal';
  trackingNotifications?: boolean;
  requireSignature?: boolean;
  insuranceByDefault?: boolean;
  defaultInsuranceValue?: number;
  pplDefaultShippingPrice?: number;
  glsDefaultShippingPrice?: number;
  dhlDefaultShippingPrice?: number;
}

export interface FinancialSettings {
  defaultTaxRateCzk?: number;
  defaultTaxRateEur?: number;
  autoApplyTax?: boolean;
  exchangeRateSource?: string;
  defaultMarkupPercentage?: number;
  minimumMarginPercentage?: number;
  priceRounding?: 'none' | '0.50' | '1.00' | '5.00' | '10.00';
  showPricesWithVat?: boolean;
  defaultVatRate?: number;
  enableVat?: boolean;
  vatRegistrationNumber?: string;
  reverseChargeMechanism?: boolean;
  ossSchemeEnabled?: boolean;
  baseCurrency?: 'CZK' | 'EUR' | 'USD';
  autoUpdateExchangeRates?: boolean;
  exchangeRateApiSource?: 'ECB' | 'Frankfurter' | 'Manual';
  exchangeRateUpdateFrequency?: 'hourly' | 'daily' | 'weekly';
  invoiceNumberPrefix?: string;
  invoiceNumberFormat?: string;
  nextInvoiceNumber?: number;
  paymentTermsDays?: number;
  latePaymentFeePercentage?: number;
  fiscalYearStart?: 'January' | 'February' | 'March' | 'April' | 'May' | 'June' | 'July' | 'August' | 'September' | 'October' | 'November' | 'December';
  costCalculationMethod?: 'FIFO' | 'LIFO' | 'Average';
  includeShippingInCogs?: boolean;
  trackExpensesByCategory?: boolean;
  defaultCurrency?: 'CZK' | 'EUR' | 'USD' | 'VND' | 'CNY';
  vatRate?: number;
  enableMultiCurrency?: boolean;
  defaultPriceMargin?: number;
  taxCalculationMethod?: 'inclusive' | 'exclusive';
  roundingMethod?: 'nearest' | 'up' | 'down';
  expenseCategories: string[]; // Always defined with DEFAULT_EXPENSE_CATEGORIES fallback
}

export interface SystemSettings {
  appName?: string;
  timezone?: string;
  dateFormat?: 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD';
  enableDarkMode?: boolean;
  sessionTimeoutMinutes?: number;
  autoSaveIntervalSeconds?: number;
  compactView?: boolean;
  autoBackupEnabled?: boolean;
  backupFrequency?: 'daily' | 'weekly' | 'monthly';
  dataRetentionPeriodDays?: number;
  archiveOldOrders?: boolean;
  archiveAfterDays?: number;
  requireStrongPasswords?: boolean;
  passwordExpiryDays?: number;
  twoFactorAuthentication?: boolean;
  sessionLogging?: boolean;
  ipWhitelistEnabled?: boolean;
  facebookIntegrationEnabled?: boolean;
  openaiIntegrationEnabled?: boolean;
  deepseekAiEnabled?: boolean;
  nominatimGeocodingEnabled?: boolean;
  frankfurterExchangeRatesEnabled?: boolean;
  enableAiAddressParsing?: boolean;
  enableAiCartonPacking?: boolean;
  enableAiWeightEstimation?: boolean;
  autoOptimizeWarehouseLocations?: boolean;
  enableDebugMode?: boolean;
  logLevel?: 'error' | 'warn' | 'info' | 'debug';
  sessionTimeout?: number;
}

export interface ServiceTypeConfig {
  id: string;
  name: string;
  costEur: number;
  costCzk: number;
  enabled: boolean;
}

export interface ServiceSettings {
  serviceTypes: ServiceTypeConfig[];
  defaultServiceCostEur?: number;
  defaultServiceCostCzk?: number;
}

interface Setting {
  id: number;
  key: string;
  value: any;
  category: string;
  createdAt: string;
  updatedAt: string;
}

interface SettingsContextType {
  settings: Setting[];
  generalSettings: GeneralSettings;
  inventorySettings: InventorySettings;
  orderSettings: OrderSettings;
  shippingSettings: ShippingSettings;
  financialSettings: FinancialSettings;
  systemSettings: SystemSettings;
  serviceSettings: ServiceSettings;
  getSetting: <T = any>(category: string, key: string, fallback?: T) => T;
  financialHelpers: {
    getDefaultTaxRate: (currency: string) => number;
    applyTax: (amount: number, taxRate: number) => {
      netAmount: number;
      taxAmount: number;
      grossAmount: number;
      displayAmount: number;
    };
    calculateOrderTotals: (
      subtotal: number, 
      currency: string,
      options?: {
        customTaxRate?: number;
        taxEnabled?: boolean;
        showPricesWithVatOverride?: boolean;
      }
    ) => {
      subtotal: number;
      taxRate: number;
      taxAmount: number;
      grandTotal: number;
      displaySubtotal: number;
      displayGrandTotal: number;
    };
  };
  isLoading: boolean;
  error: Error | null;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

// Helper to convert snake_case to camelCase
function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

// Deep parse function to recursively handle nested objects
function deepParse(value: any): any {
  // Handle null/undefined
  if (value === null || value === undefined) return value;
  
  // Handle boolean strings
  if (value === 'true') return true;
  if (value === 'false') return false;
  
  // Handle number strings - ONLY if they don't have leading zeros
  // Leading zeros indicate it's an identifier (zip, phone, ID), not a quantity
  if (typeof value === 'string' && value !== '') {
    const trimmed = value.trim();
    if (!isNaN(Number(trimmed))) {
      // If it starts with 0 and next char is a digit, keep as string (zip code, phone, ID)
      if (/^0\d/.test(trimmed)) {
        return trimmed;
      }
      return Number(trimmed);
    }
  }
  
  // Handle JSON strings
  if (typeof value === 'string' && (value.startsWith('{') || value.startsWith('['))) {
    try {
      const parsed = JSON.parse(value);
      return deepParse(parsed); // Recursive call
    } catch {
      return value;
    }
  }
  
  // Handle arrays - recursively sanitize each element
  if (Array.isArray(value)) {
    return value.map(item => deepParse(item));
  }
  
  // Handle objects - recursively sanitize each property
  if (typeof value === 'object' && value !== null) {
    const result: Record<string, any> = {};
    for (const [key, val] of Object.entries(value)) {
      result[key] = deepParse(val);
    }
    return result;
  }
  
  // Return as-is
  return value;
}

// Helper to sanitize setting values (replace empty strings and invalid values with safe defaults)
function sanitizeSettingValue(key: string, value: any, category: string): any {
  // Return null/undefined as-is
  if (value === null || value === undefined) {
    return value;
  }
  
  // Apply deep recursive parsing first
  const parsedValue = deepParse(value);
  
  // Replace empty strings with safe defaults based on the setting
  // Note: key comes from API in snake_case format
  if (parsedValue === '') {
    // Inventory settings
    if (category === 'inventory') {
      if (key === 'default_warehouse') return 'none';
      if (key === 'default_product_type') return 'regular';
      if (key === 'default_packaging_requirement') return 'carton';
      if (key === 'location_format') return 'A-01-01';
      if (key === 'condition_tracking') return 'good';
      if (key === 'default_length_unit') return 'cm';
      if (key === 'default_weight_unit') return 'kg';
      if (key === 'default_volume_unit') return 'L';
    }
    
    // Order settings
    if (category === 'orders') {
      if (key === 'default_payment_method') return 'Cash';
      if (key === 'default_order_status') return 'pending';
      if (key === 'default_payment_status') return 'pending';
      if (key === 'default_carrier') return 'GLS';
      if (key === 'default_communication_channel') return 'Viber';
      if (key === 'default_discount_type') return 'flat';
      if (key === 'default_fulfillment_stage') return 'pending';
      if (key === 'default_cod_currency') return 'CZK';
      if (key === 'default_order_location') return 'warehouse';
    }
    
    // Shipping settings
    if (category === 'shipping') {
      if (key === 'default_carrier') return 'GLS';
      if (key === 'default_shipping_method') return 'PPL';
      if (key === 'default_label_format') return 'A4';
      if (key === 'default_label_size') return 'A4';
      if (key === 'label_format') return 'PDF';
      if (key === 'shipping_cost_currency') return 'CZK';
    }
    
    // Financial settings
    if (category === 'financial') {
      if (key === 'default_currency') return 'CZK';
      if (key === 'tax_calculation_method') return 'inclusive';
      if (key === 'rounding_method') return 'nearest';
      if (key === 'price_rounding') return 'none';
      if (key === 'base_currency') return 'CZK';
      if (key === 'exchange_rate_api_source') return 'Frankfurter';
      if (key === 'exchange_rate_update_frequency') return 'daily';
      if (key === 'fiscal_year_start') return 'January';
      if (key === 'cost_calculation_method') return 'FIFO';
    }
    
    // General settings
    if (category === 'general') {
      if (key === 'default_language') return 'en';
      if (key === 'default_date_format') return 'DD/MM/YYYY';
      if (key === 'default_time_format') return '24-hour';
      if (key === 'default_timezone') return 'Europe/Prague';
      if (key === 'number_format') return '1,000.00';
      if (key === 'default_currency') return 'CZK';
      if (key === 'currency_display') return 'symbol';
      if (key === 'default_priority') return 'medium';
      if (key === 'default_order_location') return '';
      if (key === 'timezone') return 'UTC';
      if (key === 'date_format') return 'MM/DD/YYYY';
      if (key === 'time_format') return '12-hour';
      if (key === 'currency_position') return 'before';
      if (key === 'decimal_separator') return '.';
      if (key === 'thousands_separator') return ',';
      // New WMS-specific defaults
      if (key === 'pickup_cutoff_time') return '14:00';
      if (key === 'max_order_processing_days') return 2;
      if (key === 'audit_log_retention_days') return 90;
    }
    
    // System settings
    if (category === 'system') {
      if (key === 'log_level') return 'info';
      if (key === 'backup_frequency') return 'weekly';
      if (key === 'date_format') return 'DD/MM/YYYY';
    }
    
    // Default: return undefined for unknown empty strings
    return undefined;
  }
  
  return parsedValue;
}

// Helper to parse settings by category
function parseSettingsByCategory<T extends Record<string, any>>(
  settings: Setting[],
  category: string
): T {
  const categorySettings = settings.filter(s => s.category === category);
  const parsed: any = {};
  
  categorySettings.forEach(setting => {
    const camelKey = snakeToCamel(setting.key);
    const sanitizedValue = sanitizeSettingValue(setting.key, setting.value, category);
    
    // Only include the value if it's not undefined after sanitization
    if (sanitizedValue !== undefined) {
      parsed[camelKey] = sanitizedValue;
    }
  });
  
  return parsed as T;
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  // Fetch all settings
  const { data: settings = [], isLoading, error } = useQuery<Setting[]>({
    queryKey: ['/api/settings'],
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  // Memoize parsed settings by category
  const generalSettings = useMemo(
    () => parseSettingsByCategory<GeneralSettings>(settings, 'general'),
    [settings]
  );

  const inventorySettings = useMemo(() => {
    const parsed = parseSettingsByCategory<InventorySettings>(settings, 'inventory');
    // Ensure returnTypes always has a value (fallback to defaults)
    return {
      ...parsed,
      returnTypes: (parsed.returnTypes && parsed.returnTypes.length > 0) 
        ? parsed.returnTypes 
        : DEFAULT_RETURN_TYPES
    };
  }, [settings]);

  const orderSettings = useMemo(
    () => parseSettingsByCategory<OrderSettings>(settings, 'orders'),
    [settings]
  );

  const shippingSettings = useMemo(
    () => parseSettingsByCategory<ShippingSettings>(settings, 'shipping'),
    [settings]
  );

  const financialSettings = useMemo(() => {
    const parsed = parseSettingsByCategory<FinancialSettings>(settings, 'financial');
    // Ensure expenseCategories always has a value (fallback to defaults)
    // Use || to handle undefined, null, or empty array cases
    return {
      ...parsed,
      expenseCategories: (parsed.expenseCategories && parsed.expenseCategories.length > 0) 
        ? parsed.expenseCategories 
        : DEFAULT_EXPENSE_CATEGORIES
    };
  }, [settings]);

  const systemSettings = useMemo(
    () => parseSettingsByCategory<SystemSettings>(settings, 'system'),
    [settings]
  );

  const serviceSettings = useMemo(() => {
    const parsed = parseSettingsByCategory<ServiceSettings>(settings, 'services');
    return {
      ...parsed,
      serviceTypes: parsed.serviceTypes || [],
    };
  }, [settings]);

  // Generic getter with fallback
  const getSetting = useMemo(
    () => <T = any,>(category: string, key: string, fallback?: T): T => {
      const setting = settings.find(
        s => s.category === category && s.key === key
      );
      return setting ? (setting.value as T) : (fallback as T);
    },
    [settings]
  );

  // Financial helpers for tax calculations
  const financialHelpers = useMemo(
    () => ({
      getDefaultTaxRate: (currency: string) => 
        getDefaultTaxRate(currency, financialSettings),
      applyTax: (amount: number, taxRate: number) => 
        applyTax(amount, taxRate, {
          taxCalculationMethod: financialSettings.taxCalculationMethod,
          showPricesWithVat: financialSettings.showPricesWithVat,
        }),
      calculateOrderTotals: (
        subtotal: number, 
        currency: string,
        options?: {
          customTaxRate?: number;
          taxEnabled?: boolean;
          showPricesWithVatOverride?: boolean;
        }
      ) => calculateOrderTotals(subtotal, currency, financialSettings, options),
    }),
    [financialSettings]
  );

  const value: SettingsContextType = {
    settings,
    generalSettings,
    inventorySettings,
    orderSettings,
    shippingSettings,
    financialSettings,
    systemSettings,
    serviceSettings,
    getSetting,
    financialHelpers,
    isLoading,
    error: error as Error | null,
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

// Main hook to use settings
export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}

// Category-specific hooks for convenience
export function useGeneralSettings() {
  const { generalSettings, isLoading } = useSettings();
  return { settings: generalSettings, isLoading };
}

export function useInventorySettings() {
  const { inventorySettings, isLoading } = useSettings();
  return { settings: inventorySettings, isLoading };
}

export function useOrderSettings() {
  const { orderSettings, isLoading } = useSettings();
  return { settings: orderSettings, isLoading };
}

export function useShippingSettings() {
  const { shippingSettings, isLoading } = useSettings();
  return { settings: shippingSettings, isLoading };
}

export function useFinancialSettings() {
  const { financialSettings, isLoading } = useSettings();
  return { settings: financialSettings, isLoading };
}

export function useSystemSettings() {
  const { systemSettings, isLoading } = useSettings();
  return { settings: systemSettings, isLoading };
}

export function useServiceSettings() {
  const { serviceSettings, isLoading } = useSettings();
  return { settings: serviceSettings, isLoading };
}
