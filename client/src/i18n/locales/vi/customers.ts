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
  
} as const;

export default customers;
