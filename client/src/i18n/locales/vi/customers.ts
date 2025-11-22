const customers = {
  // Module Name
  customers: 'Khách hàng',
  customer: 'Khách hàng',
  customerManagement: 'Quản lý khách hàng',
  
  // Actions
  addCustomer: 'Thêm khách hàng',
  editCustomer: 'Chỉnh sửa khách hàng',
  viewCustomer: 'Xem khách hàng',
  deleteCustomer: 'Xóa khách hàng',
  
  // Customer Fields
  customerName: 'Tên khách hàng',
  customerCode: 'Mã khách hàng',
  companyName: 'Tên công ty',
  contactPerson: 'Người liên hệ',
  email: 'Email',
  phone: 'Điện thoại',
  mobile: 'Di động',
  
  // Address
  address: 'Địa chỉ',
  shippingAddress: 'Địa chỉ giao hàng',
  billingAddress: 'Địa chỉ thanh toán',
  street: 'Đường',
  city: 'Thành phố',
  state: 'Tỉnh/Thành',
  postalCode: 'Mã bưu điện',
  country: 'Quốc gia',
  
  // Customer Details
  customerType: 'Loại khách hàng',
  retail: 'Bán lẻ',
  wholesale: 'Bán sỉ',
  vip: 'VIP',
  
  // Financial
  creditLimit: 'Hạn mức tín dụng',
  balance: 'Số dư',
  totalOrders: 'Tổng đơn hàng',
  totalSpent: 'Tổng chi tiêu',
  
  // Messages
  customerCreated: 'Tạo khách hàng thành công',
  customerUpdated: 'Cập nhật khách hàng thành công',
  customerDeleted: 'Xóa khách hàng thành công',
  
  // Customer Badges & Tiers
  badge: 'Huy hiệu',
  badges: 'Huy hiệu',
  customerBadge: 'Huy hiệu khách hàng',
  tier: 'Hạng',
  customerTier: 'Hạng khách hàng',
  bronze: 'Đồng',
  silver: 'Bạc',
  gold: 'Vàng',
  platinum: 'Bạch kim',
  diamond: 'Kim cương',
  newCustomer: 'Khách hàng mới',
  loyalCustomer: 'Khách hàng trung thành',
  frequentBuyer: 'Khách mua thường xuyên',
  
  // Order History
  orderHistory: 'Lịch sử đơn hàng',
  purchaseHistory: 'Lịch sử mua hàng',
  recentOrders: 'Đơn hàng gần đây',
  firstOrder: 'Đơn hàng đầu tiên',
  lastOrder: 'Đơn hàng cuối',
  firstOrderDate: 'Ngày đơn đầu tiên',
  lastOrderDate: 'Ngày đơn cuối',
  numberOfOrders: 'Số lượng đơn hàng',
  averageOrderValue: 'Giá trị đơn hàng trung bình',
  totalOrderValue: 'Tổng giá trị đơn hàng',
  
  // Payment History
  paymentHistory: 'Lịch sử thanh toán',
  paymentMethod: 'Phương thức thanh toán',
  preferredPaymentMethod: 'Phương thức thanh toán ưa thích',
  paymentTerms: 'Điều khoản thanh toán',
  paymentStatus: 'Trạng thái thanh toán',
  outstandingBalance: 'Số dư nợ',
  creditBalance: 'Số dư tín dụng',
  availableCredit: 'Tín dụng khả dụng',
  usedCredit: 'Tín dụng đã dùng',
  
  // Customer Portal
  customerPortal: 'Cổng khách hàng',
  portalAccess: 'Truy cập cổng',
  portalEnabled: 'Đã bật cổng',
  portalDisabled: 'Đã tắt cổng',
  loginCredentials: 'Thông tin đăng nhập',
  sendInvitation: 'Gửi lời mời',
  portalUrl: 'URL cổng',
  lastLogin: 'Đăng nhập cuối',
  
  // Facebook Integration
  facebookIntegration: 'Tích hợp Facebook',
  facebookId: 'Facebook ID',
  facebookName: 'Tên Facebook',
  facebookConnected: 'Đã kết nối Facebook',
  disconnectFacebook: 'Ngắt kết nối Facebook',
  connectFacebook: 'Kết nối Facebook',
  facebookProfile: 'Hồ sơ Facebook',
  
  // Communication
  communication: 'Giao tiếp',
  communicationHistory: 'Lịch sử giao tiếp',
  notes: 'Ghi chú',
  customerNotes: 'Ghi chú khách hàng',
  internalNotes: 'Ghi chú nội bộ',
  addNote: 'Thêm ghi chú',
  emailHistory: 'Lịch sử email',
  smsHistory: 'Lịch sử SMS',
  callHistory: 'Lịch sử cuộc gọi',
  lastContact: 'Liên hệ cuối',
  preferredContactMethod: 'Phương thức liên hệ ưa thích',
  
  // Customer Details Extended
  taxId: 'Mã số thuế',
  taxExempt: 'Miễn thuế',
  businessRegistration: 'Đăng ký kinh doanh',
  industry: 'Ngành nghề',
  companySize: 'Quy mô công ty',
  website: 'Website',
  socialMedia: 'Mạng xã hội',
  
  // Customer Preferences
  preferences: 'Tùy chọn',
  customerPreferences: 'Tùy chọn khách hàng',
  language: 'Ngôn ngữ',
  currency: 'Tiền tệ',
  timezone: 'Múi giờ',
  newsletter: 'Bản tin',
  subscribeNewsletter: 'Đăng ký bản tin',
  unsubscribeNewsletter: 'Hủy đăng ký bản tin',
  marketingEmails: 'Email tiếp thị',
  notifications: 'Thông báo',
  
  // Customer Segmentation
  segment: 'Phân khúc',
  customerSegment: 'Phân khúc khách hàng',
  segments: 'Phân khúc',
  highValue: 'Giá trị cao',
  lowValue: 'Giá trị thấp',
  atRisk: 'Có rủi ro',
  inactive: 'Không hoạt động',
  active: 'Hoạt động',
  dormant: 'Ngủ đông',
  
  // Customer Analytics
  analytics: 'Phân tích',
  customerAnalytics: 'Phân tích khách hàng',
  customerInsights: 'Thông tin khách hàng',
  purchaseFrequency: 'Tần suất mua',
  averageDaysBetweenOrders: 'Số ngày trung bình giữa các đơn',
  recencyScore: 'Điểm mới đây',
  frequencyScore: 'Điểm tần suất',
  monetaryScore: 'Điểm tiền tệ',
  lifetimeValue: 'Giá trị vòng đời',
  churnRisk: 'Rủi ro mất khách',
  
  // Customer Service
  customerService: 'Dịch vụ khách hàng',
  supportTickets: 'Phiếu hỗ trợ',
  openTickets: 'Phiếu đang mở',
  resolvedTickets: 'Phiếu đã giải quyết',
  complaints: 'Khiếu nại',
  feedback: 'Phản hồi',
  satisfaction: 'Hài lòng',
  satisfactionScore: 'Điểm hài lòng',
  
  // Customer Groups
  groups: 'Nhóm',
  customerGroup: 'Nhóm khách hàng',
  addToGroup: 'Thêm vào nhóm',
  removeFromGroup: 'Gỡ khỏi nhóm',
  groupDiscount: 'Giảm giá nhóm',
  groupPricing: 'Giá nhóm',
  
  // Additional Contact Info
  alternativeEmail: 'Email phụ',
  alternativePhone: 'Điện thoại phụ',
  fax: 'Fax',
  skype: 'Skype',
  whatsapp: 'WhatsApp',
  viber: 'Viber',
  zalo: 'Zalo',
  telegram: 'Telegram',
  
  // Delivery Preferences
  deliveryPreferences: 'Tùy chọn giao hàng',
  defaultShippingAddress: 'Địa chỉ giao hàng mặc định',
  multipleAddresses: 'Nhiều địa chỉ',
  deliveryInstructions: 'Hướng dẫn giao hàng',
  preferredDeliveryTime: 'Thời gian giao hàng ưa thích',
  safeDropLocation: 'Vị trí để hàng an toàn',
  
  // Import/Export
  importCustomers: 'Nhập khách hàng',
  exportCustomers: 'Xuất khách hàng',
  bulkImport: 'Nhập hàng loạt',
  bulkUpdate: 'Cập nhật hàng loạt',
  mergeCustomers: 'Gộp khách hàng',
  duplicateCustomer: 'Khách hàng trùng lặp',
  
  // Additional Messages
  failedToLoadCustomers: 'Không thể tải danh sách khách hàng',
  deletedCustomersSuccess: 'Đã xóa {{count}} khách hàng thành công',
  failedToDeleteCustomers: 'Xóa khách hàng thất bại',
  cannotDeleteCustomerHasRecords: 'Không thể xóa khách hàng có đơn hàng hoặc bản ghi',
  loadingCustomers: 'Đang tải khách hàng...',
  monitorCustomerRelationships: 'Theo dõi quan hệ và lòng trung thành của khách hàng',
  totalCustomers: 'Tổng khách hàng',
  vipCustomers: 'Khách VIP',
  regularCustomers: 'Khách thường',
  lastPurchase: 'Mua hàng cuối',
  blacklistCustomer: 'Đưa vào danh sách đen',
  blacklistCustomerDescription: 'Đã đưa {{name}} vào danh sách đen',
  updateType: 'Cập nhật loại',
  sendingEmailToCustomers: 'Đang gửi email cho {{count}} khách hàng',
  updatingTypeForCustomers: 'Đang cập nhật loại cho {{count}} khách hàng',
  exportingCustomers: 'Đang xuất {{count}} khách hàng',
  noCustomersToExport: 'Không có khách hàng để xuất',
  exportedCustomersToXLSX: 'Đã xuất {{count}} khách hàng ra XLSX',
  failedToExportCustomersToXLSX: 'Xuất khách hàng ra XLSX thất bại',
  exportedCustomersToPDF: 'Đã xuất {{count}} khách hàng ra PDF',
  failedToExportCustomersToPDF: 'Xuất khách hàng ra PDF thất bại',
  customersReport: 'Báo cáo khách hàng',
  lifetimeSpending: 'Chi tiêu tổng',
  
  // Customer Details Page
  loadingCustomerDetails: 'Đang tải chi tiết khách hàng...',
  customerFor: 'Khách hàng {{duration}}',
  avgOrder: 'TB Đơn hàng',
  unpaid: 'Chưa thanh toán',
  prices: 'Giá',
  tickets: 'Hỗ trợ',
  locationBusinessInfo: 'Vị trí & Thông tin kinh doanh',
  taxBusinessInfo: 'Thông tin thuế & doanh nghiệp',
  vatNumber: 'Mã số VAT',
  vatStatus: 'Trạng thái VAT',
  valid: 'Hợp lệ',
  invalid: 'Không hợp lệ',
  lastChecked: 'Kiểm tra lần cuối',
  noTaxInfo: 'Không có thông tin thuế',
  preferredCurrency: 'Tiền tệ ưa thích',
  companyAddress: 'Địa chỉ công ty',
  euVatInformation: 'Thông tin VAT EU',
  czechCompanyInformation: 'Thông tin công ty Czech',
  
  // Contact Information
  contactInformation: 'Thông tin liên hệ',
  noContactInformation: 'Không có thông tin liên hệ',
  
  // Shipping & Billing Addresses
  shippingAddresses: 'Địa chỉ giao hàng',
  billingAddresses: 'Địa chỉ thanh toán',
  noShippingAddresses: 'Chưa có địa chỉ giao hàng',
  shippingAddressesWillAppear: 'Địa chỉ giao hàng sẽ xuất hiện khi được thêm',
  noBillingAddresses: 'Chưa có địa chỉ thanh toán',
  billingAddressesWillAppear: 'Địa chỉ thanh toán sẽ xuất hiện khi được thêm',
  primary: 'Chính',
  
  // Order History
  of: 'của',
  collapseAll: 'Thu gọn tất cả',
  expandAll: 'Mở rộng tất cả',
  searchOrdersPlaceholder: 'Tìm đơn hàng, sản phẩm...',
  noOrders: 'Không tìm thấy đơn hàng',
  ordersWillAppear: 'Đơn hàng sẽ xuất hiện khi được tạo',
  noOrdersMatch: 'Không có đơn hàng phù hợp',
  tryDifferentSearch: 'Thử từ khóa khác',
  clearSearch: 'Xóa tìm kiếm',
  item: 'sản phẩm',
  items: 'sản phẩm',
  paid: 'Đã thanh toán',
  payLater: 'Thanh toán sau',
  
  // Order Statuses
  toFulfill: 'Cần xử lý',
  readyToShip: 'Sẵn sàng gửi',
  delivered: 'Đã giao',
  shipped: 'Đã gửi',
  cancelled: 'Đã hủy',
  pending: 'Đang chờ',
  
  // Order Details
  viewOrder: 'Xem đơn hàng',
  showItems: 'Hiện sản phẩm',
  hideItems: 'Ẩn sản phẩm',
  quantity: 'Số lượng',
  unitPrice: 'Đơn giá',
  
  // Tickets
  noTickets: 'Không có phiếu hỗ trợ',
  ticketsWillAppear: 'Phiếu hỗ trợ sẽ xuất hiện khi được tạo',
  createTicket: 'Tạo phiếu hỗ trợ',
  viewAllTickets: 'Xem tất cả phiếu',
  
  // AddCustomer Form - Validation
  nameRequired: 'Tên là bắt buộc',
  invalidEmail: 'Email không hợp lệ',
  firstNameRequired: 'Tên là bắt buộc',
  lastNameRequired: 'Họ là bắt buộc',
  streetRequired: 'Đường là bắt buộc',
  cityRequired: 'Thành phố là bắt buộc',
  zipCodeRequired: 'Mã bưu điện là bắt buộc',
  countryRequired: 'Quốc gia là bắt buộc',
  productRequired: 'Sản phẩm là bắt buộc',
  pricePositive: 'Giá phải lớn hơn 0',
  validFromRequired: 'Ngày bắt đầu là bắt buộc',
  
  // AddCustomer Form - Page Title & Actions
  createCustomer: 'Tạo khách hàng',
  updateCustomer: 'Cập nhật khách hàng',
  creating: 'Đang tạo...',
  updating: 'Đang cập nhật...',
  cancel: 'Hủy',
  save: 'Lưu',
  delete: 'Xóa',
  edit: 'Sửa',
  
  // AddCustomer Form - Sections
  customerDetails: 'Thông tin khách hàng',
  taxBusinessInformation: 'Thông tin thuế & doanh nghiệp',
  
  // AddCustomer Form - Fields
  name: 'Tên',
  label: 'Nhãn',
  firstName: 'Tên',
  lastName: 'Họ',
  company: 'Công ty',
  tel: 'Điện thoại',
  number: 'Số nhà',
  zipCode: 'Mã bưu điện',
  facebookUrl: 'URL Facebook',
  profilePictureUrl: 'URL ảnh đại diện',
  ico: 'IČO (Mã công ty)',
  dic: 'DIČ (Mã thuế)',
  
  // AddCustomer Form - Placeholders
  enterCustomerName: 'Nhập tên khách hàng',
  autoGeneratedFromAddress: 'Tự động tạo từ địa chỉ...',
  typeToSearchCountries: 'Gõ để tìm quốc gia...',
  typeToSearchProducts: 'Gõ để tìm sản phẩm...',
  selectCurrency: 'Chọn tiền tệ',
  selectVariant: 'Chọn biến thể',
  enterVatNumber: 'Nhập mã số VAT',
  
  // AddCustomer Form - Hints & Descriptions
  autoGeneratedEditable: 'Tự động tạo từ địa chỉ (có thể chỉnh sửa)',
  defaultCurrencyForOrders: 'Chọn tiền tệ mặc định cho đơn hàng của khách hàng này (CZK hoặc EUR)',
  smartPasteDescription: 'Dán thông tin địa chỉ (tên, công ty, email, điện thoại, địa chỉ) - tự động phát hiện tên tiếng Việt, chuyển sang chữ không dấu, và xác thực địa chỉ',
  enterIcoToAutofill: 'Nhập IČO để tự động điền thông tin công ty từ ARES',
  autoFilledFromAres: 'Tự động điền từ ARES',
  willBeValidatedVies: 'Sẽ được xác thực bằng hệ thống VIES của EU',
  
  // AddCustomer Form - Buttons
  addShippingAddress: 'Thêm địa chỉ giao hàng',
  addBillingAddress: 'Thêm địa chỉ thanh toán',
  setPrimary: 'Đặt làm chính',
  parseFill: 'Phân tích & Điền',
  parsing: 'Đang phân tích...',
  lookupAres: 'Tra cứu ARES',
  
  // AddCustomer Form - Smart Paste
  smartPaste: 'Dán thông minh',
  addressDetails: 'Chi tiết địa chỉ',
  addressParsed: 'Đã phân tích địa chỉ',
  successfullyParsedAddress: 'Phân tích địa chỉ thành công với độ tin cậy {{confidence}}',
  parseFailed: 'Phân tích thất bại',
  failedToParseAddress: 'Không thể phân tích địa chỉ',
  
  // AddCustomer Form - Address Management
  addShipping: 'Thêm',
  editShipping: 'Sửa',
  shippingAddressAddedSuccessfully: 'Thêm địa chỉ giao hàng thành công',
  shippingAddressUpdatedSuccessfully: 'Cập nhật địa chỉ giao hàng thành công',
  failedToSaveShippingAddress: 'Không thể lưu địa chỉ giao hàng',
  billingAddressAddedSuccessfully: 'Thêm địa chỉ thanh toán thành công',
  billingAddressUpdatedSuccessfully: 'Cập nhật địa chỉ thanh toán thành công',
  failedToSaveBillingAddress: 'Không thể lưu địa chỉ thanh toán',
  deleteBillingAddress: 'Xóa địa chỉ thanh toán',
  confirmDeleteBillingAddress: 'Bạn có chắc chắn muốn xóa địa chỉ thanh toán này? Hành động này không thể hoàn tác.',
  
  // AddCustomer Form - Toast Messages
  success: 'Thành công',
  error: 'Lỗi',
  failedToCreateCustomer: 'Không thể tạo khách hàng',
  failedToUpdateCustomer: 'Không thể cập nhật khách hàng',
  
  // AddCustomer Form - Countries & VAT
  pinnedCountries: 'Quốc gia đã ghim',
  allCountries: 'Tất cả quốc gia',
  noCountriesFound: 'Không tìm thấy quốc gia',
  vatInformation: 'Thông tin VAT',
  czechCompanyInfo: 'Thông tin công ty Czech',
  companyInformation: 'Thông tin công ty',
  
  // AddCustomer Form - Duplicate Detection
  duplicateCustomerFound: 'Tìm thấy khách hàng trùng lặp',
  customerWithFacebookIdExists: 'Đã tồn tại khách hàng với Facebook ID này',
  goToExistingCustomer: 'Đi đến khách hàng hiện tại',
  createAnyway: 'Vẫn tạo mới',
  
  // CustomerPrices - Page Title & Actions
  customPrices: 'Giá tùy chỉnh',
  addPrice: 'Thêm giá',
  addPriceOverride: 'Thêm ghi đè giá',
  editPrice: 'Sửa giá',
  removePrice: 'Xóa giá',
  saveAll: 'Lưu tất cả',
  downloadTemplate: 'Tải mẫu',
  bulkImportPrices: 'Nhập hàng loạt',
  import: 'Nhập',
  addCustomPrice: 'Thêm giá tùy chỉnh',
  bulkImportCustomerPrices: 'Nhập giá hàng loạt',
  
  // CustomerPrices - Fields
  product: 'Sản phẩm',
  variant: 'Biến thể',
  variantOptional: 'Biến thể (Tùy chọn)',
  noVariant: 'Không có biến thể',
  price: 'Giá',
  regularPrice: 'Giá thường',
  customerPrice: 'Giá khách hàng',
  validFrom: 'Có hiệu lực từ',
  validTo: 'Có hiệu lực đến',
  validToOptional: 'Có hiệu lực đến (Tùy chọn)',
  notesOptional: 'Ghi chú (Tùy chọn)',
  status: 'Trạng thái',
  noExpiry: 'Không hết hạn',
  effectiveDate: 'Ngày hiệu lực',
  discountPercent: 'Giảm giá %',
  
  // CustomerPrices - Empty State
  noCustomPricesSet: 'Chưa có giá tùy chỉnh',
  addCustomPricesToOverride: 'Thêm giá tùy chỉnh để ghi đè giá mặc định của sản phẩm',
  
  // CustomerPrices - CSV Import
  pasteCsvContent: 'Dán nội dung CSV',
  
  // CustomerPrices - Toast Messages
  customerPriceCreated: 'Tạo giá khách hàng thành công',
  customerPriceDeleted: 'Xóa giá khách hàng thành công',
  pricesImportedSuccessfully: 'Nhập giá thành công',
  failedToCreateCustomerPrice: 'Không thể tạo giá khách hàng',
  failedToDeleteCustomerPrice: 'Không thể xóa giá khách hàng',
  failedToImportPrices: 'Không thể nhập giá',
  invalidCsvFormat: 'Định dạng CSV không hợp lệ',
  
} as const;

export default customers;
