const settings = {
  // Settings Pages
  settings: 'Cài đặt',
  generalSettings: 'Cài đặt chung',
  orderSettings: 'Cài đặt đơn hàng',
  inventorySettings: 'Cài đặt tồn kho',
  shippingSettings: 'Cài đặt vận chuyển',
  financialSettings: 'Cài đặt tài chính',
  systemSettings: 'Cài đặt hệ thống',
  
  // Tabs
  companyInfo: 'Thông tin công ty',
  localization: 'Bản địa hóa',
  operations: 'Vận hành',
  notifications: 'Thông báo',
  aiAutomation: 'AI & Tự động hóa',
  orderDefaults: 'Mặc định đơn hàng',
  fulfillment: 'Xử lý đơn',
  validation: 'Xác thực',
  automation: 'Tự động hóa',
  codSettings: 'Cài đặt COD',
  productDefaults: 'Mặc định sản phẩm',
  stockManagement: 'Quản lý tồn kho',
  warehouseOperations: 'Vận hành kho',
  qualityControl: 'Kiểm soát chất lượng',
  measurementUnits: 'Đơn vị đo lường',
  carriers: 'Đơn vị vận chuyển',
  labelsTracking: 'Nhãn & Theo dõi',
  shippingCosts: 'Chi phí vận chuyển',
  pricing: 'Định giá',
  tax: 'Thuế',
  currency: 'Tiền tệ',
  invoicing: 'Hóa đơn',
  accounting: 'Kế toán',
  preferences: 'Tùy chọn',
  dataManagement: 'Quản lý dữ liệu',
  security: 'Bảo mật',
  integrations: 'Tích hợp',
  advancedFeatures: 'Tính năng nâng cao',
  
  // General Settings - Company Info
  companyInformation: 'Thông tin công ty',
  companyName: 'Tên công ty',
  companyEmail: 'Email công ty',
  companyPhone: 'Số điện thoại công ty',
  companyAddress: 'Địa chỉ công ty',
  companyCity: 'Thành phố',
  companyZip: 'Mã bưu điện',
  companyCountry: 'Quốc gia',
  companyWebsite: 'Website',
  companyVatId: 'Mã số thuế',
  companyLogoUrl: 'URL logo công ty',
  
  // General Settings - Localization
  defaultLanguage: 'Ngôn ngữ mặc định',
  defaultDateFormat: 'Định dạng ngày',
  defaultTimeFormat: 'Định dạng giờ',
  defaultTimezone: 'Múi giờ',
  numberFormat: 'Định dạng số',
  defaultCurrency: 'Đơn vị tiền tệ mặc định',
  currencyDisplay: 'Hiển thị tiền tệ',
  
  // General Settings - Operations
  regionalSettings: 'Cài đặt khu vực',
  defaultPriority: 'Độ ưu tiên mặc định',
  workingDays: 'Ngày làm việc',
  businessHoursStart: 'Giờ bắt đầu làm việc',
  businessHoursEnd: 'Giờ kết thúc làm việc',
  warehouseEmergencyContact: 'Liên hệ khẩn cấp kho',
  warehouseContactEmail: 'Email liên hệ kho',
  pickupCutoffTime: 'Giờ chốt lấy hàng',
  maxOrderProcessingDays: 'Số ngày xử lý đơn tối đa',
  returnPolicyText: 'Chính sách đổi trả',
  
  // General Settings - Notifications
  notificationPreferences: 'Tùy chọn thông báo',
  enableEmailNotifications: 'Bật thông báo email',
  enableSmsNotifications: 'Bật thông báo SMS',
  lowStockAlertEmail: 'Email cảnh báo sắp hết hàng',
  orderStatusChangeNotifications: 'Thông báo thay đổi trạng thái đơn',
  dailySummaryReportEmail: 'Email báo cáo tổng kết hàng ngày',
  weeklyReportEmail: 'Email báo cáo tuần',
  
  // General Settings - AI & Automation
  aiAndAutomation: 'AI & Tự động hóa',
  enableAiAddressParsing: 'Bật phân tích địa chỉ bằng AI',
  enableAiCartonPacking: 'Bật đề xuất đóng gói thùng bằng AI',
  auditLogRetentionDays: 'Số ngày lưu nhật ký kiểm toán',
  customerPortalEnabled: 'Bật cổng khách hàng',
  
  // Order Settings - Order Defaults
  defaultOrderSource: 'Nguồn đơn hàng mặc định',
  defaultPaymentMethod: 'Phương thức thanh toán mặc định',
  defaultShippingMethod: 'Phương thức vận chuyển mặc định',
  autoAssignOrderNumbers: 'Tự động gán số đơn hàng',
  orderNumberPrefix: 'Tiền tố số đơn hàng',
  autoConfirmOrders: 'Tự động xác nhận đơn hàng mới',
  
  // Order Settings - Fulfillment
  allowPartialFulfillment: 'Cho phép xử lý đơn từng phần',
  autoAllocateStock: 'Tự động phân bổ tồn kho khi tạo đơn',
  autoCreateShippingLabel: 'Tự động tạo nhãn vận chuyển',
  requirePickingConfirmation: 'Yêu cầu xác nhận lấy hàng',
  requirePackingConfirmation: 'Yêu cầu xác nhận đóng gói',
  enableBatchPicking: 'Bật lấy hàng theo lô',
  
  // Order Settings - Validation
  requireCustomerEmail: 'Yêu cầu email khách hàng',
  requireCustomerPhone: 'Yêu cầu số điện thoại khách hàng',
  validateAddressBeforeShipping: 'Xác thực địa chỉ trước khi giao',
  allowDuplicateOrders: 'Cho phép đơn hàng trùng lặp',
  duplicateOrderTimeWindow: 'Khoảng thời gian đơn trùng lặp (giờ)',
  
  // Order Settings - Automation
  autoAssignWarehouse: 'Tự động gán kho',
  autoAssignCarrier: 'Tự động gán đơn vị vận chuyển',
  autoPrintLabels: 'Tự động in nhãn',
  autoPrintPackingSlips: 'Tự động in phiếu đóng gói',
  autoSendTrackingEmails: 'Tự động gửi email theo dõi',
  
  // Order Settings - COD
  enableCodOrders: 'Bật đơn hàng COD',
  codFeePercentage: 'Phí COD theo phần trăm',
  codFeeFixed: 'Phí COD cố định',
  codMaxAmount: 'Số tiền COD tối đa',
  
  // Inventory Settings - Product Defaults
  defaultProductType: 'Loại sản phẩm mặc định',
  defaultStockUnit: 'Đơn vị tồn kho mặc định',
  autoGenerateSku: 'Tự động tạo SKU',
  skuPrefix: 'Tiền tố SKU',
  requireBarcodeForProducts: 'Yêu cầu Barcode cho sản phẩm',
  
  // Inventory Settings - Stock Management
  enableLowStockAlerts: 'Bật cảnh báo sắp hết hàng',
  lowStockThreshold: 'Ngưỡng hàng tồn thấp',
  enableNegativeStock: 'Cho phép tồn kho âm',
  autoReorderEnabled: 'Bật tự động đặt hàng lại',
  autoReorderThreshold: 'Ngưỡng đặt hàng lại',
  autoReorderQuantity: 'Số lượng đặt hàng lại',
  
  // Inventory Settings - Warehouse Operations
  enableMultiWarehouse: 'Bật đa kho',
  defaultWarehouse: 'Kho mặc định',
  enableBinLocations: 'Bật vị trí ngăn',
  enableZoneManagement: 'Bật quản lý khu vực',
  requirePutAwayConfirmation: 'Yêu cầu xác nhận lưu kho',
  
  // Inventory Settings - Quality Control
  enableQualityControl: 'Bật kiểm soát chất lượng',
  requireInspectionOnReceiving: 'Yêu cầu kiểm tra khi nhận hàng',
  enableBatchTracking: 'Bật theo dõi theo lô',
  enableLotTracking: 'Bật theo dõi theo đợt',
  enableSerialNumbers: 'Bật số serial',
  trackExpirationDates: 'Theo dõi ngày hết hạn',
  expirationAlertDays: 'Số ngày cảnh báo hết hạn',
  
  // Inventory Settings - Measurement Units
  defaultWeightUnit: 'Đơn vị trọng lượng mặc định',
  defaultLengthUnit: 'Đơn vị chiều dài mặc định',
  defaultVolumeUnit: 'Đơn vị thể tích mặc định',
  
  // Shipping Settings - Carriers
  carrierSettings: 'Cài đặt đơn vị vận chuyển',
  enabledCarriers: 'Đơn vị vận chuyển được bật',
  defaultCarrier: 'Đơn vị vận chuyển mặc định',
  carrierPriority: 'Độ ưu tiên đơn vị vận chuyển',
  carrierAccountNumber: 'Số tài khoản đơn vị vận chuyển',
  
  // Shipping Settings - Labels & Tracking
  labelFormat: 'Định dạng nhãn',
  labelSize: 'Kích thước nhãn',
  autoPrintLabelsOnPacking: 'Tự động in nhãn khi đóng gói',
  includeReturnLabel: 'Bao gồm nhãn trả hàng',
  enableTrackingNotifications: 'Bật thông báo theo dõi',
  trackingEmailTemplate: 'Mẫu email theo dõi',
  
  // Shipping Settings - Shipping Costs
  shippingCalculationMethod: 'Phương thức tính phí vận chuyển',
  freeShippingThreshold: 'Ngưỡng miễn phí vận chuyển',
  flatShippingRate: 'Phí vận chuyển cố định',
  enableRealTimeRates: 'Bật tính phí theo thời gian thực',
  
  // Financial Settings - Pricing
  defaultPricingStrategy: 'Chiến lược định giá mặc định',
  markupPercentage: 'Phần trăm đánh giá',
  minimumProfitMargin: 'Biên lợi nhuận tối thiểu',
  roundPrices: 'Làm tròn giá',
  roundingMethod: 'Phương thức làm tròn',
  
  // Financial Settings - Tax
  enableTax: 'Bật thuế',
  defaultTaxRate: 'Thuế suất mặc định',
  taxCalculationMethod: 'Phương thức tính thuế',
  pricesIncludeTax: 'Giá đã bao gồm thuế',
  taxExemptCustomers: 'Khách hàng miễn thuế',
  
  // Financial Settings - Currency
  baseCurrency: 'Đơn vị tiền tệ cơ sở',
  enableMultiCurrency: 'Bật đa tiền tệ',
  autoUpdateExchangeRates: 'Tự động cập nhật tỷ giá',
  exchangeRateSource: 'Nguồn tỷ giá',
  
  // Financial Settings - Invoicing
  autoGenerateInvoices: 'Tự động tạo hóa đơn',
  invoiceNumberPrefix: 'Tiền tố số hóa đơn',
  invoiceTemplate: 'Mẫu hóa đơn',
  invoiceDueDays: 'Số ngày đến hạn hóa đơn',
  sendInvoicesByEmail: 'Gửi hóa đơn qua email',
  
  // Financial Settings - Accounting
  accountingIntegration: 'Tích hợp kế toán',
  cogsCalculationMethod: 'Phương thức tính giá vốn',
  trackLandedCosts: 'Theo dõi giá vốn hàng nhập',
  
  // System Settings - Preferences
  systemPreferences: 'Tùy chọn hệ thống',
  applicationName: 'Tên ứng dụng',
  defaultDashboard: 'Bảng điều khiển mặc định',
  itemsPerPage: 'Số mục trên mỗi trang',
  enableDarkMode: 'Bật chế độ tối',
  
  // System Settings - Data Management
  backupFrequency: 'Tần suất sao lưu',
  dataRetentionDays: 'Số ngày lưu trữ dữ liệu',
  enableDataArchiving: 'Bật lưu trữ dữ liệu',
  archiveAfterDays: 'Lưu trữ sau số ngày',
  
  // System Settings - Security
  sessionTimeout: 'Thời gian hết phiên (phút)',
  passwordExpiryDays: 'Số ngày hết hạn mật khẩu',
  requireTwoFactorAuth: 'Yêu cầu xác thực hai yếu tố',
  allowedIpAddresses: 'Địa chỉ IP được phép',
  
  // System Settings - Integrations
  apiAccessEnabled: 'Bật truy cập API',
  webhooksEnabled: 'Bật Webhooks',
  facebookIntegration: 'Tích hợp Facebook',
  enableChatIntegration: 'Bật tích hợp chat',
  
  // System Settings - Advanced Features
  enableAdvancedReporting: 'Bật báo cáo nâng cao',
  enablePredictiveAnalytics: 'Bật phân tích dự đoán',
  enableMachineLearning: 'Bật tính năng học máy',
  
  // Common Actions
  saveSettings: 'Lưu cài đặt',
  resetToDefaults: 'Đặt lại mặc định',
  cancelChanges: 'Hủy thay đổi',
  settingsSaved: 'Đã lưu cài đặt thành công',
  settingsSaveFailed: 'Lưu cài đặt thất bại',
  confirmReset: 'Bạn có chắc muốn đặt lại về cài đặt mặc định?',
  
  // Field Placeholders
  enterCompanyName: 'Nhập tên công ty',
  enterEmail: 'Nhập địa chỉ email',
  enterPhone: 'Nhập số điện thoại',
  enterAddress: 'Nhập địa chỉ',
  selectTimezone: 'Chọn múi giờ',
  selectCurrency: 'Chọn đơn vị tiền tệ',
  selectLanguage: 'Chọn ngôn ngữ',
  selectCarrier: 'Chọn đơn vị vận chuyển',
  enterPrefix: 'Nhập tiền tố',
  enterThreshold: 'Nhập ngưỡng',
  
  // Validation Messages
  requiredField: 'Trường này là bắt buộc',
  invalidEmail: 'Email không hợp lệ',
  invalidPhone: 'Số điện thoại không hợp lệ',
  invalidUrl: 'URL không hợp lệ',
  valueTooLow: 'Giá trị quá thấp',
  valueTooHigh: 'Giá trị quá cao',
  
  // GeneralSettings specific
  pageTitle: 'Cài đặt chung',
  pageDescription: 'Cấu hình các cài đặt kinh doanh cốt lõi, bản địa hóa và tùy chọn vận hành',
  
  // Tab names
  tabCompany: 'Công ty',
  tabLocalization: 'Bản địa hóa',
  tabOperations: 'Vận hành',
  tabCustomer: 'Khách hàng',
  tabSecurity: 'Bảo mật',
  
  // Company Info descriptions
  companyInfoDescription: 'Thông tin công ty cơ bản và chi tiết liên hệ',
  companyNamePlaceholder: 'Nhập tên công ty của bạn',
  companyEmailPlaceholder: 'congty@vidu.com',
  companyPhonePlaceholder: '+84 XXX XXX XXX',
  companyAddressPlaceholder: '123 Đường Kinh Doanh',
  companyCityPlaceholder: 'Thành phố',
  companyZipPlaceholder: '12345',
  companyWebsitePlaceholder: 'https://vidu.com',
  companyVatIdPlaceholder: 'XX123456789',
  companyLogoUrlDescription: 'URL công khai đến logo công ty (dùng trong hóa đơn và email)',
  
  // Localization descriptions
  localizationDescription: 'Đặt ngôn ngữ, múi giờ và tùy chọn khu vực cho doanh nghiệp của bạn',
  localizationHelp: 'Tất cả ngày và giờ hệ thống sẽ được hiển thị theo cài đặt này',
  switchLanguage: 'Chuyển ngôn ngữ',
  languageDescription: 'Ngôn ngữ chính cho giao diện hệ thống',
  timezoneDescription: 'Múi giờ địa phương của bạn (ảnh hưởng đến hiển thị ngày/giờ)',
  dateFormatDescription: 'Cách hiển thị ngày trong hệ thống',
  timeFormatDescription: 'Cách hiển thị giờ trong hệ thống',
  
  // Regional Settings
  regionalSettingsTitle: 'Cài đặt khu vực',
  regionalSettingsDescription: 'Giờ hoạt động kinh doanh và thông tin liên hệ',
  workingDaysDescription: 'Ngày hoạt động trong tuần',
  workingDaysHelp: 'Chọn tất cả ngày kho của bạn hoạt động',
  businessHoursDescription: 'Giờ làm việc hàng ngày',
  warehouseEmergencyContactDescription: 'Đường dây khẩn cấp kho 24/7',
  warehouseEmergencyContactPlaceholder: '+420 XXX XXX XXX',
  warehouseContactEmailDescription: 'Yêu cầu chung về kho',
  warehouseContactEmailPlaceholder: 'kho@daviesupply.com',
  
  // Notification Preferences
  notificationPreferencesDescription: 'Cài đặt thông báo Email và SMS',
  emailNotificationsLabel: 'Thông báo Email',
  emailNotificationsDescription: 'Nhận thông báo qua email',
  smsNotificationsLabel: 'Thông báo SMS',
  smsNotificationsDescription: 'Nhận thông báo qua SMS',
  lowStockAlertsLabel: 'Cảnh báo sắp hết hàng',
  lowStockAlertsDescription: 'Nhận thông báo khi tồn kho thấp',
  orderStatusChangesLabel: 'Thay đổi trạng thái đơn hàng',
  orderStatusChangesDescription: 'Nhận thông báo khi trạng thái đơn hàng thay đổi',
  dailySummaryLabel: 'Báo cáo tổng kết hàng ngày',
  dailySummaryDescription: 'Nhận tổng kết kinh doanh hàng ngày',
  weeklyReportLabel: 'Báo cáo tuần',
  weeklyReportDescription: 'Nhận báo cáo kinh doanh hàng tuần',
  
  // Customer Portal
  customerPortalTitle: 'Cổng khách hàng',
  customerPortalDescription: 'Cổng khách hàng tự phục vụ và chính sách',
  enableCustomerPortalLabel: 'Bật cổng khách hàng',
  enableCustomerPortalDescription: 'Cho phép khách hàng theo dõi đơn hàng và quản lý tài khoản',
  returnPolicyLabel: 'Chính sách đổi trả',
  returnPolicyPlaceholder: 'Nhập chính sách đổi trả của bạn tại đây...',
  returnPolicyDescription: 'Văn bản này sẽ được hiển thị cho khách hàng',
  
  // AI Features
  aiFeaturesTitle: 'Tính năng AI',
  aiFeaturesDescription: 'Trí tuệ nhân tạo và tính năng tự động hóa',
  aiAddressParsingLabel: 'Phân tích địa chỉ bằng AI',
  aiAddressParsingDescription: 'Tự động phân tích và xác thực địa chỉ khách hàng',
  aiCartonPackingLabel: 'Đóng gói thùng bằng AI',
  aiCartonPackingDescription: 'Tối ưu hóa lựa chọn gói hàng với AI',
  
  // Compliance & Security
  complianceSecurityTitle: 'Tuân thủ & Bảo mật',
  complianceSecurityDescription: 'Nhật ký kiểm toán và chính sách lưu trữ dữ liệu',
  auditLogRetentionLabel: 'Lưu trữ nhật ký kiểm toán (Ngày)',
  auditLogRetentionDescription: 'Thời gian lưu nhật ký kiểm toán (7-365 ngày, đề xuất: 90 ngày)',
  
  // Toast messages
  savingSettings: 'Đang lưu...',
  saveAllSettings: 'Lưu tất cả cài đặt',
  settingsSavedSuccess: 'Đã lưu cài đặt thành công!',
  settingsSaveError: 'Lưu cài đặt thất bại',
  loadingSettings: 'Đang tải cài đặt...',
  errorLoadingSettings: 'Lỗi khi tải cài đặt',
  
  // Form validation errors
  formValidationErrors: 'Lỗi xác thực biểu mẫu',
  
  // Language options
  english: 'Tiếng Anh',
  vietnamese: 'Tiếng Việt',
  
  // Select placeholders
  selectCountry: 'Chọn quốc gia',
  selectOption: 'Chọn tùy chọn',
  
  // Roles & Permissions Page
  rolesAndPermissions: 'Vai trò & Quyền hạn',
  userRolesManagement: 'Quản lý vai trò người dùng',
  assignRolesToControlAccess: 'Gán vai trò để kiểm soát quyền truy cập và quyền hạn hệ thống',
  totalUsers: 'Tổng số người dùng',
  administrators: 'Quản trị viên',
  fullSystemAccess: 'Toàn quyền truy cập hệ thống',
  warehouseOperators: 'Nhân viên kho',
  standardAccess: 'Quyền truy cập tiêu chuẩn',
  administratorPermissions: 'Quyền hạn quản trị viên',
  fullAccessToAllSystemFeatures: 'Toàn quyền truy cập tất cả tính năng hệ thống',
  warehouseOperatorPermissions: 'Quyền hạn nhân viên kho',
  limitedAccessToOperationalFeatures: 'Quyền truy cập hạn chế vào các tính năng vận hành',
  currentRole: 'Vai trò hiện tại',
  assignRole: 'Gán vai trò',
  noUsersFound: 'Không tìm thấy người dùng',
  userRoleUpdatedSuccessfully: 'Cập nhật vai trò người dùng thành công',
  failedToUpdateUserRole: 'Cập nhật vai trò người dùng thất bại',
  administrator: 'Quản trị viên',
  warehouseOperator: 'Nhân viên kho',
  selectRole: 'Chọn vai trò',
  users: 'Người dùng',
} as const;

export default settings;
