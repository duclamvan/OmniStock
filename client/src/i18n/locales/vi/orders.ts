const orders = {
  // Module Name
  orders: 'Đơn hàng',
  order: 'Đơn hàng',
  orderManagement: 'Quản lý đơn hàng',
  
  // Actions
  createOrder: 'Tạo đơn hàng',
  editOrder: 'Chỉnh sửa đơn hàng',
  viewOrder: 'Xem đơn hàng',
  deleteOrder: 'Xóa đơn hàng',
  addOrder: 'Thêm đơn hàng',
  pickAndPack: 'Lấy hàng & Đóng gói',
  shipOrder: 'Giao hàng',
  
  // Order Fields
  orderNumber: 'Mã đơn hàng',
  orderDate: 'Ngày đặt hàng',
  orderStatus: 'Trạng thái đơn hàng',
  customer: 'Khách hàng',
  customerName: 'Tên khách hàng',
  shippingAddress: 'Địa chỉ giao hàng',
  billingAddress: 'Địa chỉ thanh toán',
  orderTotal: 'Tổng đơn hàng',
  orderSubtotal: 'Tạm tính',
  shippingCost: 'Phí vận chuyển',
  orderNotes: 'Ghi chú đơn hàng',
  paymentMethod: 'Phương thức thanh toán',
  paymentStatus: 'Trạng thái thanh toán',
  
  // Order Status
  toFulfill: 'Chờ xử lý',
  picking: 'Đang lấy hàng',
  packing: 'Đang đóng gói',
  readyToShip: 'Sẵn sàng giao hàng',
  shipped: 'Đã giao vận',
  delivered: 'Đã giao hàng',
  processing: 'Đang xử lý',
  onHold: 'Tạm giữ',
  
  // Payment Status
  paid: 'Đã thanh toán',
  unpaid: 'Chưa thanh toán',
  payLater: 'Thanh toán sau',
  refunded: 'Đã hoàn tiền',
  partiallyPaid: 'Thanh toán một phần',
  
  // Payment Methods
  cash: 'Tiền mặt',
  card: 'Thẻ',
  transfer: 'Chuyển khoản',
  cod: 'COD',
  bankTransfer: 'Chuyển khoản ngân hàng',
  paypal: 'PayPal',
  
  // Order Items
  orderItems: 'Sản phẩm trong đơn',
  item: 'Sản phẩm',
  items: 'Sản phẩm',
  product: 'Sản phẩm',
  sku: 'SKU',
  qty: 'SL',
  unitPrice: 'Đơn giá',
  lineTotal: 'Thành tiền',
  
  // Fulfillment
  fulfillmentStage: 'Giai đoạn xử lý',
  pickList: 'Phiếu lấy hàng',
  packingList: 'Phiếu đóng gói',
  shippingLabel: 'Nhãn vận chuyển',
  trackingNumber: 'Mã vận đơn',
  carrier: 'Đơn vị vận chuyển',
  
  // Communication
  communicationChannel: 'Kênh liên lạc',
  viber: 'Viber',
  whatsapp: 'WhatsApp',
  zalo: 'Zalo',
  
  // Messages
  orderCreated: 'Tạo đơn hàng thành công',
  orderUpdated: 'Cập nhật đơn hàng thành công',
  orderDeleted: 'Xóa đơn hàng thành công',
  orderShipped: 'Giao hàng thành công',
  
  // AllOrders Page
  allOrders: 'Tất cả đơn hàng',
  searchPlaceholder: 'Tìm kiếm đơn hàng...',
  exportToExcel: 'Xuất Excel',
  exportToPDF: 'Xuất PDF',
  bulkActions: 'Thao tác hàng loạt',
  viewMode: 'Chế độ xem',
  normalView: 'Bình thường',
  compactView: 'Thu gọn',
  expandAll: 'Mở rộng tất cả',
  collapseAll: 'Thu gọn tất cả',
  selectAll: 'Chọn tất cả',
  deselectAll: 'Bỏ chọn tất cả',
  deleteSelected: 'Xóa đã chọn',
  changeStatus: 'Thay đổi trạng thái',
  changePaymentStatus: 'Thay đổi thanh toán',
  
  // Filters
  filterByStatus: 'Lọc theo trạng thái',
  allStatuses: 'Tất cả trạng thái',
  
  // Toast Messages
  loadError: 'Không thể tải đơn hàng',
  updateSuccess: 'Cập nhật đơn hàng thành công',
  updateError: 'Cập nhật đơn hàng thất bại',
  deleteSuccess: 'Đã xóa {{count}} đơn hàng thành công',
  deleteError: 'Xóa đơn hàng thất bại',
  bulkUpdateSuccess: 'Đã cập nhật {{count}} đơn hàng thành công',
  bulkUpdateError: 'Cập nhật đơn hàng thất bại',
  paymentUpdateSuccess: 'Đã cập nhật thanh toán cho {{count}} đơn hàng',
  paymentUpdateError: 'Cập nhật thanh toán thất bại',
  noDataToExport: 'Không có đơn hàng để xuất',
  exportSuccessExcel: 'Đã xuất {{count}} đơn hàng ra XLSX',
  exportSuccessPDF: 'Đã xuất {{count}} đơn hàng ra PDF',
  exportError: 'Xuất dữ liệu thất bại',
  
  // Statistics
  totalRevenue: 'Tổng doanh thu',
  totalProfit: 'Tổng lợi nhuận',
  totalOrders: 'Tổng đơn hàng',
  newCustomers: 'Khách hàng mới',
  returningCustomers: 'Khách quay lại',
  
  // Table Headers
  customerNameHeader: 'Khách hàng',
  statusHeader: 'Trạng thái',
  totalHeader: 'Tổng cộng',
  dateHeader: 'Ngày',
  actionsHeader: 'Thao tác',
  
  // Confirmation
  deleteConfirmTitle: 'Xác nhận xóa',
  deleteConfirmMessage: 'Bạn có chắc chắn muốn xóa {{count}} đơn hàng? Hành động này không thể hoàn tác.',
  deleteCancel: 'Hủy',
  deleteConfirm: 'Xóa',
  
} as const;

export default orders;
