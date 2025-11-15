/**
 * Vietnamese WMS Terminology Glossary:
 * - Industry loanwords kept in English: API, SKU, Barcode, COD, QR Code
 * - Formal business terms: Đơn hàng (Order), Tồn kho (Inventory), Khách hàng (Customer)
 * - Action verbs: Lưu (Save), Hủy (Cancel), Xóa (Delete), Chỉnh sửa (Edit)
 */

const common = {
  // App-wide
  appName: 'Davie Supply',
  loading: 'Đang tải...',
  error: 'Lỗi',
  success: 'Thành công',
  warning: 'Cảnh báo',
  info: 'Thông tin',
  
  // Actions - Buttons
  save: 'Lưu',
  cancel: 'Hủy',
  delete: 'Xóa',
  edit: 'Chỉnh sửa',
  add: 'Thêm',
  create: 'Tạo mới',
  update: 'Cập nhật',
  remove: 'Gỡ bỏ',
  close: 'Đóng',
  confirm: 'Xác nhận',
  back: 'Quay lại',
  next: 'Tiếp theo',
  previous: 'Trước đó',
  submit: 'Gửi',
  search: 'Tìm kiếm',
  filter: 'Lọc',
  clear: 'Xóa',
  reset: 'Đặt lại',
  export: 'Xuất dữ liệu',
  import: 'Nhập dữ liệu',
  download: 'Tải xuống',
  upload: 'Tải lên',
  print: 'In',
  view: 'Xem',
  details: 'Chi tiết',
  refresh: 'Làm mới',
  apply: 'Áp dụng',
  select: 'Chọn',
  selectAll: 'Chọn tất cả',
  deselectAll: 'Bỏ chọn tất cả',
  
  // Form Labels
  name: 'Tên',
  description: 'Mô tả',
  notes: 'Ghi chú',
  status: 'Trạng thái',
  type: 'Loại',
  category: 'Danh mục',
  date: 'Ngày',
  time: 'Giờ',
  dateTime: 'Ngày & Giờ',
  startDate: 'Ngày bắt đầu',
  endDate: 'Ngày kết thúc',
  createdAt: 'Ngày tạo',
  updatedAt: 'Ngày cập nhật',
  createdBy: 'Người tạo',
  updatedBy: 'Người cập nhật',
  email: 'Email',
  phone: 'Số điện thoại',
  address: 'Địa chỉ',
  city: 'Thành phố',
  country: 'Quốc gia',
  postalCode: 'Mã bưu điện',
  website: 'Website',
  
  // Validation Messages
  required: 'Trường này là bắt buộc',
  invalidEmail: 'Vui lòng nhập địa chỉ email hợp lệ',
  invalidPhone: 'Vui lòng nhập số điện thoại hợp lệ',
  invalidNumber: 'Vui lòng nhập số hợp lệ',
  invalidDate: 'Vui lòng nhập ngày hợp lệ',
  minLength: 'Độ dài tối thiểu là {{count}} ký tự',
  maxLength: 'Độ dài tối đa là {{count}} ký tự',
  minValue: 'Giá trị tối thiểu là {{value}}',
  maxValue: 'Giá trị tối đa là {{value}}',
  mustBePositive: 'Giá trị phải lớn hơn 0',
  mustBeNonNegative: 'Giá trị không được âm',
  
  // Toast Notifications
  saveSuccess: 'Lưu thành công',
  saveFailed: 'Lưu thất bại',
  deleteSuccess: 'Xóa thành công',
  deleteFailed: 'Xóa thất bại',
  createSuccess: 'Tạo mới thành công',
  createFailed: 'Tạo mới thất bại',
  updateSuccess: 'Cập nhật thành công',
  updateFailed: 'Cập nhật thất bại',
  uploadSuccess: 'Tải lên thành công',
  uploadFailed: 'Tải lên thất bại',
  
  // Confirmation Dialogs
  deleteConfirm: 'Bạn có chắc chắn muốn xóa mục này?',
  deleteWarning: 'Hành động này không thể hoàn tác.',
  unsavedChanges: 'Bạn có thay đổi chưa lưu',
  unsavedChangesWarning: 'Nếu rời đi, các thay đổi của bạn sẽ bị mất.',
  
  // Table Headers
  actions: 'Thao tác',
  id: 'ID',
  number: 'STT',
  total: 'Tổng cộng',
  subtotal: 'Tạm tính',
  quantity: 'Số lượng',
  price: 'Đơn giá',
  amount: 'Thành tiền',
  discount: 'Giảm giá',
  tax: 'Thuế',
  
  // Pagination
  page: 'Trang',
  of: 'của',
  perPage: 'Hiển thị',
  showing: 'Hiển thị',
  to: 'đến',
  entries: 'mục',
  noData: 'Không có dữ liệu',
  noResults: 'Không tìm thấy kết quả',
  
  // Date/Time
  today: 'Hôm nay',
  yesterday: 'Hôm qua',
  tomorrow: 'Ngày mai',
  thisWeek: 'Tuần này',
  lastWeek: 'Tuần trước',
  thisMonth: 'Tháng này',
  lastMonth: 'Tháng trước',
  thisYear: 'Năm nay',
  custom: 'Tùy chỉnh',
  
  // Common Status
  active: 'Hoạt động',
  inactive: 'Không hoạt động',
  pending: 'Chờ xử lý',
  approved: 'Đã duyệt',
  rejected: 'Từ chối',
  completed: 'Hoàn thành',
  cancelled: 'Đã hủy',
  draft: 'Nháp',
  
  // Units
  pieces: 'cái',
  kilograms: 'kg',
  grams: 'g',
  pounds: 'lb',
  ounces: 'oz',
  centimeters: 'cm',
  meters: 'm',
  inches: 'in',
  
  // Common Phrases
  yes: 'Có',
  no: 'Không',
  all: 'Tất cả',
  none: 'Không có',
  other: 'Khác',
  na: 'Không áp dụng',
  optional: 'Tùy chọn',
  required_field: 'Bắt buộc',
  
  // Navigation
  menu: 'Menu',
  notifications: 'Thông báo',
  settings: 'Cài đặt',
  profile: 'Hồ sơ',
  logout: 'Đăng xuất',
  darkMode: 'Chế độ tối',
  lightMode: 'Chế độ sáng',
  language: 'Ngôn ngữ',
  
  // Dashboard
  dashboard: 'Bảng điều khiển',
  overview: 'Tổng quan',
  operationsPulse: 'Hoạt động vận hành',
  financialControl: 'Kiểm soát tài chính',
  inventoryRisk: 'Rủi ro tồn kho',
  fulfillmentEfficiency: 'Hiệu suất xử lý',
  customerSupport: 'Hỗ trợ khách hàng',
  systemAlerts: 'Cảnh báo hệ thống',
  adminCommandCenter: 'Trung tâm điều hành',
  realTimeOperationalIntelligence: 'Thông tin vận hành thời gian thực',
  criticalFulfillmentMetrics: 'Chỉ số xử lý đơn quan trọng',
  liveUpdates: 'Cập nhật trực tiếp',
  
  // Dashboard Metrics
  ordersToFulfill: 'Đơn cần xử lý',
  awaitingPickup: 'Chờ lấy hàng',
  slaBreachRisk: 'Rủi ro vi phạm SLA',
  todaysThroughput: 'Năng suất hôm nay',
  carrierExceptions: 'Sự cố vận chuyển',
  pendingAdjustments: 'Điều chỉnh chờ duyệt',
  totalRevenue: 'Tổng doanh thu',
  netProfit: 'Lợi nhuận ròng',
  profitMargin: 'Tỷ suất lợi nhuận',
  averageOrderValue: 'Giá trị đơn trung bình',
  lowStockItems: 'Hàng sắp hết',
  overAllocated: 'Phân bổ quá mức',
  agingInventory: 'Hàng tồn lâu',
  inboundBacklog: 'Hàng đang về',
  supplierDelays: 'Nhà cung cấp chậm',
  pickErrors: 'Lỗi lấy hàng',
  aiRecommendations: 'Gợi ý AI',
  aiAdoptionRate: 'Tỷ lệ dùng AI',
  carrierOnTime: 'Đúng giờ vận chuyển',
  activeSupportTickets: 'Ticket hỗ trợ',
  pendingCod: 'COD chờ thu',
  customerRetention: 'Giữ chân khách hàng',
  
  // Notification Messages
  newNotifications: '{{count}} mới',
  viewAllNotifications: 'Xem tất cả thông báo',
  markAsRead: 'Đánh dấu đã đọc',
  noNotifications: 'Không có thông báo',
  
  // Language Messages
  languageChanged: 'Đã thay đổi ngôn ngữ thành công',
  languageChangeFailed: 'Thay đổi ngôn ngữ thất bại',
  
} as const;

export default common;
