const settings = {
  // Settings Pages
  settings: 'Settings',
  generalSettings: 'General Settings',
  orderSettings: 'Order Settings',
  inventorySettings: 'Inventory Settings',
  shippingSettings: 'Shipping Settings',
  financialSettings: 'Financial Settings',
  systemSettings: 'System Settings',
  
  // Tabs
  companyInfo: 'Company Info',
  localization: 'Localization',
  operations: 'Operations',
  notifications: 'Notifications',
  aiAutomation: 'AI & Automation',
  orderDefaults: 'Order Defaults',
  fulfillment: 'Fulfillment',
  validation: 'Validation',
  automation: 'Automation',
  codSettings: 'COD Settings',
  productDefaults: 'Product Defaults',
  stockManagement: 'Stock Management',
  warehouseOperations: 'Warehouse Operations',
  qualityControl: 'Quality Control',
  measurementUnits: 'Measurement Units',
  carriers: 'Carriers',
  labelsTracking: 'Labels & Tracking',
  shippingCosts: 'Shipping Costs',
  pricing: 'Pricing',
  tax: 'Tax',
  currency: 'Currency',
  invoicing: 'Invoicing',
  accounting: 'Accounting',
  preferences: 'Preferences',
  dataManagement: 'Data Management',
  security: 'Security',
  integrations: 'Integrations',
  advancedFeatures: 'Advanced Features',
  
  // General Settings - Company Info
  companyInformation: 'Company Information',
  companyName: 'Company Name',
  companyEmail: 'Company Email',
  companyPhone: 'Company Phone',
  companyAddress: 'Company Address',
  companyCity: 'City',
  companyZip: 'Postal Code',
  companyCountry: 'Country',
  companyWebsite: 'Website',
  companyVatId: 'VAT ID / Tax Number',
  companyLogoUrl: 'Company Logo URL',
  
  // General Settings - Localization
  defaultLanguage: 'Default Language',
  defaultDateFormat: 'Date Format',
  defaultTimeFormat: 'Time Format',
  defaultTimezone: 'Timezone',
  numberFormat: 'Number Format',
  defaultCurrency: 'Default Currency',
  currencyDisplay: 'Currency Display',
  
  // General Settings - Operations
  regionalSettings: 'Regional Settings',
  defaultPriority: 'Default Priority',
  workingDays: 'Working Days',
  businessHoursStart: 'Business Hours Start',
  businessHoursEnd: 'Business Hours End',
  warehouseEmergencyContact: 'Warehouse Emergency Contact',
  warehouseContactEmail: 'Warehouse Contact Email',
  pickupCutoffTime: 'Pickup Cutoff Time',
  maxOrderProcessingDays: 'Max Order Processing Days',
  returnPolicyText: 'Return Policy Text',
  
  // General Settings - Notifications
  notificationPreferences: 'Notification Preferences',
  enableEmailNotifications: 'Enable Email Notifications',
  enableSmsNotifications: 'Enable SMS Notifications',
  lowStockAlertEmail: 'Low Stock Alert Email',
  orderStatusChangeNotifications: 'Order Status Change Notifications',
  dailySummaryReportEmail: 'Daily Summary Report Email',
  weeklyReportEmail: 'Weekly Report Email',
  
  // General Settings - AI & Automation
  aiAndAutomation: 'AI & Automation',
  enableAiAddressParsing: 'Enable AI Address Parsing',
  enableAiCartonPacking: 'Enable AI Carton Packing Suggestions',
  auditLogRetentionDays: 'Audit Log Retention (days)',
  customerPortalEnabled: 'Customer Portal Enabled',
  
  // Order Settings - Order Defaults
  defaultOrderSource: 'Default Order Source',
  defaultPaymentMethod: 'Default Payment Method',
  defaultShippingMethod: 'Default Shipping Method',
  autoAssignOrderNumbers: 'Auto-assign Order Numbers',
  orderNumberPrefix: 'Order Number Prefix',
  autoConfirmOrders: 'Auto-confirm New Orders',
  
  // Order Settings - Fulfillment
  allowPartialFulfillment: 'Allow Partial Fulfillment',
  autoAllocateStock: 'Auto-allocate Stock on Order Creation',
  autoCreateShippingLabel: 'Auto-create Shipping Label',
  requirePickingConfirmation: 'Require Picking Confirmation',
  requirePackingConfirmation: 'Require Packing Confirmation',
  enableBatchPicking: 'Enable Batch Picking',
  
  // Order Settings - Validation
  requireCustomerEmail: 'Require Customer Email',
  requireCustomerPhone: 'Require Customer Phone',
  validateAddressBeforeShipping: 'Validate Address Before Shipping',
  allowDuplicateOrders: 'Allow Duplicate Orders',
  duplicateOrderTimeWindow: 'Duplicate Order Time Window (hours)',
  
  // Order Settings - Automation
  autoAssignWarehouse: 'Auto-assign Warehouse',
  autoAssignCarrier: 'Auto-assign Carrier',
  autoPrintLabels: 'Auto-print Labels',
  autoPrintPackingSlips: 'Auto-print Packing Slips',
  autoSendTrackingEmails: 'Auto-send Tracking Emails',
  
  // Order Settings - COD
  enableCodOrders: 'Enable COD Orders',
  codFeePercentage: 'COD Fee Percentage',
  codFeeFixed: 'COD Fixed Fee',
  codMaxAmount: 'COD Maximum Amount',
  
  // Inventory Settings - Product Defaults
  defaultProductType: 'Default Product Type',
  defaultStockUnit: 'Default Stock Unit',
  autoGenerateSku: 'Auto-generate SKU',
  skuPrefix: 'SKU Prefix',
  requireBarcodeForProducts: 'Require Barcode for Products',
  
  // Inventory Settings - Stock Management
  enableLowStockAlerts: 'Enable Low Stock Alerts',
  lowStockThreshold: 'Low Stock Threshold',
  enableNegativeStock: 'Allow Negative Stock',
  autoReorderEnabled: 'Auto-reorder Enabled',
  autoReorderThreshold: 'Auto-reorder Threshold',
  autoReorderQuantity: 'Auto-reorder Quantity',
  
  // Inventory Settings - Warehouse Operations
  enableMultiWarehouse: 'Enable Multi-warehouse',
  defaultWarehouse: 'Default Warehouse',
  enableBinLocations: 'Enable Bin Locations',
  enableZoneManagement: 'Enable Zone Management',
  requirePutAwayConfirmation: 'Require Put-away Confirmation',
  
  // Inventory Settings - Quality Control
  enableQualityControl: 'Enable Quality Control',
  requireInspectionOnReceiving: 'Require Inspection on Receiving',
  enableBatchTracking: 'Enable Batch Tracking',
  enableLotTracking: 'Enable Lot Tracking',
  enableSerialNumbers: 'Enable Serial Numbers',
  trackExpirationDates: 'Track Expiration Dates',
  expirationAlertDays: 'Expiration Alert Days',
  
  // Inventory Settings - Measurement Units
  defaultWeightUnit: 'Default Weight Unit',
  defaultLengthUnit: 'Default Length Unit',
  defaultVolumeUnit: 'Default Volume Unit',
  
  // Shipping Settings - Carriers
  carrierSettings: 'Carrier Settings',
  enabledCarriers: 'Enabled Carriers',
  defaultCarrier: 'Default Carrier',
  carrierPriority: 'Carrier Priority',
  carrierAccountNumber: 'Carrier Account Number',
  
  // Shipping Settings - Labels & Tracking
  labelFormat: 'Label Format',
  labelSize: 'Label Size',
  autoPrintLabelsOnPacking: 'Auto-print Labels on Packing',
  includeReturnLabel: 'Include Return Label',
  enableTrackingNotifications: 'Enable Tracking Notifications',
  trackingEmailTemplate: 'Tracking Email Template',
  
  // Shipping Settings - Shipping Costs
  shippingCalculationMethod: 'Shipping Calculation Method',
  freeShippingThreshold: 'Free Shipping Threshold',
  flatShippingRate: 'Flat Shipping Rate',
  enableRealTimeRates: 'Enable Real-time Carrier Rates',
  
  // Financial Settings - Pricing
  defaultPricingStrategy: 'Default Pricing Strategy',
  markupPercentage: 'Markup Percentage',
  minimumProfitMargin: 'Minimum Profit Margin',
  roundPrices: 'Round Prices',
  roundingMethod: 'Rounding Method',
  
  // Financial Settings - Tax
  enableTax: 'Enable Tax',
  defaultTaxRate: 'Default Tax Rate',
  taxCalculationMethod: 'Tax Calculation Method',
  pricesIncludeTax: 'Prices Include Tax',
  taxExemptCustomers: 'Tax Exempt Customers',
  
  // Financial Settings - Currency
  baseCurrency: 'Base Currency',
  enableMultiCurrency: 'Enable Multi-currency',
  autoUpdateExchangeRates: 'Auto-update Exchange Rates',
  exchangeRateSource: 'Exchange Rate Source',
  
  // Financial Settings - Invoicing
  autoGenerateInvoices: 'Auto-generate Invoices',
  invoiceNumberPrefix: 'Invoice Number Prefix',
  invoiceTemplate: 'Invoice Template',
  invoiceDueDays: 'Invoice Due Days',
  sendInvoicesByEmail: 'Send Invoices by Email',
  
  // Financial Settings - Accounting
  accountingIntegration: 'Accounting Integration',
  cogsCalculationMethod: 'COGS Calculation Method',
  trackLandedCosts: 'Track Landed Costs',
  
  // System Settings - Preferences
  systemPreferences: 'System Preferences',
  applicationName: 'Application Name',
  defaultDashboard: 'Default Dashboard',
  itemsPerPage: 'Items Per Page',
  enableDarkMode: 'Enable Dark Mode',
  
  // System Settings - Data Management
  backupFrequency: 'Backup Frequency',
  dataRetentionDays: 'Data Retention Days',
  enableDataArchiving: 'Enable Data Archiving',
  archiveAfterDays: 'Archive After Days',
  
  // System Settings - Security
  sessionTimeout: 'Session Timeout (minutes)',
  passwordExpiryDays: 'Password Expiry Days',
  requireTwoFactorAuth: 'Require Two-factor Authentication',
  allowedIpAddresses: 'Allowed IP Addresses',
  
  // System Settings - Integrations
  apiAccessEnabled: 'API Access Enabled',
  webhooksEnabled: 'Webhooks Enabled',
  facebookIntegration: 'Facebook Integration',
  enableChatIntegration: 'Enable Chat Integration',
  
  // System Settings - Advanced Features
  enableAdvancedReporting: 'Enable Advanced Reporting',
  enablePredictiveAnalytics: 'Enable Predictive Analytics',
  enableMachineLearning: 'Enable Machine Learning Features',
  
  // Common Actions
  saveSettings: 'Save Settings',
  resetToDefaults: 'Reset to Defaults',
  cancelChanges: 'Cancel Changes',
  settingsSaved: 'Settings saved successfully',
  settingsSaveFailed: 'Failed to save settings',
  confirmReset: 'Are you sure you want to reset to default settings?',
  
  // Field Placeholders
  enterCompanyName: 'Enter company name',
  enterEmail: 'Enter email address',
  enterPhone: 'Enter phone number',
  enterAddress: 'Enter address',
  selectTimezone: 'Select timezone',
  selectCurrency: 'Select currency',
  selectLanguage: 'Select language',
  selectCarrier: 'Select carrier',
  enterPrefix: 'Enter prefix',
  enterThreshold: 'Enter threshold',
  
  // Validation Messages
  requiredField: 'This field is required',
  invalidEmail: 'Invalid email address',
  invalidPhone: 'Invalid phone number',
  invalidUrl: 'Invalid URL',
  valueTooLow: 'Value is too low',
  valueTooHigh: 'Value is too high',
  
  // GeneralSettings specific
  pageTitle: 'General Settings',
  pageDescription: 'Configure core business settings, localization, and operational preferences',
  
  // Tab names
  tabCompany: 'Company',
  tabLocalization: 'Localization',
  tabOperations: 'Operations',
  tabCustomer: 'Customer',
  tabSecurity: 'Security',
  
  // Company Info descriptions
  companyInfoDescription: 'Basic company information and contact details',
  companyNamePlaceholder: 'Enter your company name',
  companyEmailPlaceholder: 'company@example.com',
  companyPhonePlaceholder: '+1 (555) 000-0000',
  companyAddressPlaceholder: '123 Business Street',
  companyCityPlaceholder: 'City',
  companyZipPlaceholder: '12345',
  companyWebsitePlaceholder: 'https://example.com',
  companyVatIdPlaceholder: 'XX123456789',
  companyLogoUrlDescription: 'Public URL to your company logo (used in invoices and emails)',
  
  // Localization descriptions
  localizationDescription: 'Set language, timezone, and regional preferences for your business',
  localizationHelp: 'All system dates and times will be displayed according to these settings',
  switchLanguage: 'Switch Language',
  languageDescription: 'Primary language for the system interface',
  timezoneDescription: 'Your local timezone (affects all date/time displays)',
  dateFormatDescription: 'How dates are displayed throughout the system',
  timeFormatDescription: 'How times are displayed throughout the system',
  
  // Regional Settings
  regionalSettingsTitle: 'Regional Settings',
  regionalSettingsDescription: 'Business operational hours and contact information',
  workingDaysDescription: 'Operating days of the week',
  workingDaysHelp: 'Select all days your warehouse operates',
  businessHoursDescription: 'Daily business hours',
  warehouseEmergencyContactDescription: '24/7 warehouse emergency line',
  warehouseEmergencyContactPlaceholder: '+420 XXX XXX XXX',
  warehouseContactEmailDescription: 'General warehouse inquiries',
  warehouseContactEmailPlaceholder: 'warehouse@daviesupply.com',
  
  // Notification Preferences
  notificationPreferencesDescription: 'Email and SMS notification settings',
  emailNotificationsLabel: 'Email Notifications',
  emailNotificationsDescription: 'Receive notifications via email',
  smsNotificationsLabel: 'SMS Notifications',
  smsNotificationsDescription: 'Receive notifications via SMS',
  lowStockAlertsLabel: 'Low Stock Alerts',
  lowStockAlertsDescription: 'Get notified when inventory is low',
  orderStatusChangesLabel: 'Order Status Changes',
  orderStatusChangesDescription: 'Get notified when order status changes',
  dailySummaryLabel: 'Daily Summary Report',
  dailySummaryDescription: 'Receive daily business summary',
  weeklyReportLabel: 'Weekly Report',
  weeklyReportDescription: 'Receive weekly business report',
  
  // Customer Portal
  customerPortalTitle: 'Customer Portal',
  customerPortalDescription: 'Self-service customer portal and policies',
  enableCustomerPortalLabel: 'Enable Customer Portal',
  enableCustomerPortalDescription: 'Allow customers to track orders and manage their account',
  returnPolicyLabel: 'Return Policy',
  returnPolicyPlaceholder: 'Enter your return policy here...',
  returnPolicyDescription: 'This text will be displayed to customers',
  
  // AI Features
  aiFeaturesTitle: 'AI Features',
  aiFeaturesDescription: 'Artificial intelligence and automation features',
  aiAddressParsingLabel: 'AI Address Parsing',
  aiAddressParsingDescription: 'Automatically parse and validate customer addresses',
  aiCartonPackingLabel: 'AI Carton Packing',
  aiCartonPackingDescription: 'Optimize package selection with AI',
  
  // Compliance & Security
  complianceSecurityTitle: 'Compliance & Security',
  complianceSecurityDescription: 'Audit logs and data retention policies',
  auditLogRetentionLabel: 'Audit Log Retention (Days)',
  auditLogRetentionDescription: 'How long to keep audit logs (7-365 days, recommended: 90 days)',
  
  // Toast messages
  savingSettings: 'Saving...',
  saveAllSettings: 'Save All Settings',
  settingsSavedSuccess: 'Settings saved successfully!',
  settingsSaveError: 'Failed to save settings',
  loadingSettings: 'Loading settings...',
  errorLoadingSettings: 'Error loading settings',
  
  // Form validation errors
  formValidationErrors: 'Form Validation Errors',
  
  // Language options
  english: 'English',
  vietnamese: 'Vietnamese',
  
  // Select placeholders
  selectCountry: 'Select a country',
  selectOption: 'Select an option',
  
  // Roles & Permissions Page
  rolesAndPermissions: 'Roles & Permissions',
  userRolesManagement: 'User Roles Management',
  assignRolesToControlAccess: 'Assign roles to control system access and permissions',
  totalUsers: 'Total Users',
  administrators: 'Administrators',
  fullSystemAccess: 'Full system access',
  warehouseOperators: 'Warehouse Operators',
  standardAccess: 'Standard access',
  administratorPermissions: 'Administrator Permissions',
  fullAccessToAllSystemFeatures: 'Full access to all system features',
  warehouseOperatorPermissions: 'Warehouse Operator Permissions',
  limitedAccessToOperationalFeatures: 'Limited access to operational features',
  currentRole: 'Current Role',
  assignRole: 'Assign Role',
  noUsersFound: 'No users found',
  userRoleUpdatedSuccessfully: 'User role updated successfully',
  failedToUpdateUserRole: 'Failed to update user role',
  administrator: 'Administrator',
  warehouseOperator: 'Warehouse Operator',
  selectRole: 'Select role',
  users: 'Users',
} as const;

export default settings;
