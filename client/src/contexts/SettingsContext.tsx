import { createContext, useContext, useMemo, ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';

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
  defaultLanguage?: 'en' | 'vi';
  defaultDateFormat?: 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD';
  defaultTimeFormat?: '12-hour' | '24-hour';
  defaultTimezone?: string;
  numberFormat?: '1,000.00' | '1.000,00';
  defaultCurrency?: 'CZK' | 'EUR' | 'USD' | 'VND' | 'CNY';
  currencyDisplay?: 'symbol' | 'code' | 'both';
  defaultPriority?: 'low' | 'medium' | 'high';
  defaultOrderLocation?: string;
  workingDays?: string[];
  businessHoursStart?: string;
  businessHoursEnd?: string;
  enableEmailNotifications?: boolean;
  enableSmsNotifications?: boolean;
  lowStockAlertEmail?: boolean;
  orderStatusChangeNotifications?: boolean;
  dailySummaryReportEmail?: boolean;
  weeklyReportEmail?: boolean;
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
}

export interface ShippingSettings {
  quickSelectCzk?: string;
  quickSelectEur?: string;
  defaultShippingMethod?: string;
  pplDefaultSenderAddress?: string | object;
  dhlDefaultSenderAddress?: string | object;
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
  freeShippingThreshold?: number;
  defaultShippingCost?: number;
  shippingCostCurrency?: 'CZK' | 'EUR' | 'USD';
  volumetricWeightDivisor?: number;
  maxPackageWeightKg?: number;
  maxPackageDimensionsCm?: string;
  autoGenerateLabels?: boolean;
  defaultLabelFormat?: 'A4' | 'thermal';
  trackingNotifications?: boolean;
  requireSignature?: boolean;
  insuranceByDefault?: boolean;
  defaultInsuranceValue?: number;
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
  getSetting: <T = any>(category: string, key: string, fallback?: T) => T;
  isLoading: boolean;
  error: Error | null;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

// Helper to convert snake_case to camelCase
function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

// Helper to sanitize setting values (replace empty strings and invalid values with safe defaults)
function sanitizeSettingValue(key: string, value: any, category: string): any {
  // Return null/undefined as-is
  if (value === null || value === undefined) {
    return value;
  }
  
  // Replace empty strings with safe defaults based on the setting
  // Note: key comes from API in snake_case format
  if (value === '') {
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
  
  return value;
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

  const inventorySettings = useMemo(
    () => parseSettingsByCategory<InventorySettings>(settings, 'inventory'),
    [settings]
  );

  const orderSettings = useMemo(
    () => parseSettingsByCategory<OrderSettings>(settings, 'orders'),
    [settings]
  );

  const shippingSettings = useMemo(
    () => parseSettingsByCategory<ShippingSettings>(settings, 'shipping'),
    [settings]
  );

  const financialSettings = useMemo(
    () => parseSettingsByCategory<FinancialSettings>(settings, 'financial'),
    [settings]
  );

  const systemSettings = useMemo(
    () => parseSettingsByCategory<SystemSettings>(settings, 'system'),
    [settings]
  );

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

  const value: SettingsContextType = {
    settings,
    generalSettings,
    inventorySettings,
    orderSettings,
    shippingSettings,
    financialSettings,
    systemSettings,
    getSetting,
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
