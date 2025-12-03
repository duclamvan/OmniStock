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
  captureOrder: 'Chụp đơn hàng',
  createReturn: 'Tạo phiếu trả hàng',
  createTicket: 'Tạo Ticket',
  createCustomPrice: 'Tạo giá tùy chỉnh',
  startPickingMode: 'Bắt đầu lấy hàng',
  exitPickingMode: 'Thoát chế độ lấy hàng',
  cardView: 'Dạng thẻ',
  listView: 'Dạng danh sách',
  switchToCardView: 'Chuyển sang dạng thẻ',
  switchToListView: 'Chuyển sang dạng danh sách',
  
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
  priority: 'Độ ưu tiên',
  orderType: 'Loại đơn',
  currency: 'Tiền tệ',
  orderLocation: 'Vị trí đơn hàng',
  
  // Order Status
  pending: 'Chờ xử lý',
  awaitingStock: 'Chờ nhập hàng',
  toFulfill: 'Chờ xử lý',
  picking: 'Đang lấy hàng',
  pickShort: 'Lấy',
  packing: 'Đang đóng gói',
  packShort: 'Gói',
  readyToShip: 'Sẵn sàng giao hàng',
  shipped: 'Đã giao vận',
  delivered: 'Đã giao hàng',
  cancelled: 'Đã hủy',
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
  itemsWithCount: '{{count}} sản phẩm',
  product: 'Sản phẩm',
  sku: 'SKU',
  qty: 'SL',
  quantity: 'Số lượng',
  unitPrice: 'Đơn giá',
  lineTotal: 'Thành tiền',
  price: 'Giá',
  image: 'Hình ảnh',
  variant: 'Biến thể',
  variantName: 'Tên biến thể',
  bundle: 'Combo',
  offer: 'KHUYẾN MÃI',
  scanBarcodeOrSku: 'Quét mã vạch hoặc SKU...',
  readyToScan: 'Sẵn sàng quét...',
  
  // Fulfillment
  fulfillmentStage: 'Giai đoạn xử lý',
  pickList: 'Phiếu lấy hàng',
  packingList: 'Phiếu đóng gói',
  shippingLabel: 'Nhãn vận chuyển',
  trackingNumber: 'Mã vận đơn',
  carrier: 'Đơn vị vận chuyển',
  fulfillmentLocation: 'Vị trí xử lý',
  
  // Communication
  communicationChannel: 'Kênh liên lạc',
  viber: 'Viber',
  whatsapp: 'WhatsApp',
  zalo: 'Zalo',
  
  // Toast Messages - Status Updates
  statusUpdated: 'Đã cập nhật trạng thái',
  statusUpdatedDesc: 'Trạng thái đơn hàng đã được cập nhật thành công',
  paymentStatusUpdated: 'Đã cập nhật thanh toán',
  paymentStatusUpdatedDesc: 'Trạng thái thanh toán đã được cập nhật thành công',
  priorityUpdated: 'Đã cập nhật độ ưu tiên',
  priorityUpdatedDesc: 'Độ ưu tiên đơn hàng đã được cập nhật thành công',
  updateFailed: 'Cập nhật thất bại',
  failedToUpdateStatus: 'Không thể cập nhật trạng thái đơn hàng',
  failedToUpdatePayment: 'Không thể cập nhật trạng thái thanh toán',
  failedToUpdatePriority: 'Không thể cập nhật độ ưu tiên',
  
  // Toast Messages - Order Actions
  orderCaptured: 'Đã chụp đơn hàng',
  orderCapturedDesc: 'Đã lưu ảnh chụp đơn hàng thành công',
  downloadFailed: 'Tải xuống thất bại',
  downloadFailedDesc: 'Không thể tạo hóa đơn',
  exportOrder: 'Xuất đơn hàng',
  exportOrderDesc: 'Tính năng xuất sẽ sớm ra mắt',
  copied: 'Đã sao chép!',
  copiedToClipboard: 'Đã sao chép {{label}} vào clipboard',
  
  // Toast Messages - Return/Custom Price
  allItemsPicked: 'Đã lấy tất cả hàng',
  allItemsPickedDesc: 'Không có sản phẩm để trả - tất cả đã được lấy thành công',
  noItemsSelected: 'Chưa chọn sản phẩm',
  noItemsSelectedDesc: 'Vui lòng chọn ít nhất một sản phẩm để trả hàng',
  reasonRequired: 'Cần lý do',
  reasonRequiredDesc: 'Vui lòng cung cấp lý do trả hàng',
  missingInformation: 'Thiếu thông tin',
  missingInformationDesc: 'Vui lòng nhập giá tùy chỉnh và ngày bắt đầu',
  customPriceCreated: 'Đã tạo giá tùy chỉnh cho {{product}}',
  customPriceError: 'Không thể tạo giá tùy chỉnh',
  nameRequired: 'Cần tên',
  nameRequiredDesc: 'Vui lòng nhập tên khách hàng',
  phoneRequired: 'Cần số điện thoại',
  phoneRequiredDesc: 'Vui lòng nhập số điện thoại',
  
  // Toast Messages - PPL/Shipping Labels
  creatingCartonLabel: 'Đang tạo nhãn thùng...',
  creatingCartonLabelDesc: 'Đang tạo nhãn vận chuyển PPL mới. Có thể mất vài giây.',
  cartonLabelAdded: 'Đã thêm nhãn thùng',
  cartonLabelAddedDesc: 'Đã tạo thùng mới với mã vận đơn PPL: {{trackingNumber}}. Bạn hiện có {{count}} thùng.',
  error: 'Lỗi',
  failedToAddCartonLabel: 'Không thể thêm nhãn thùng',
  
  // Toast Messages - Clipboard/Paste
  pasteFailed: 'Dán thất bại',
  pasteFailedClipboardAccess: 'Vui lòng cho phép truy cập clipboard hoặc dán thủ công',
  pasteFailedClipboardAccessShort: 'Vui lòng cho phép truy cập clipboard',
  
  // Toast Messages - Packing Validation
  almostThere: 'Sắp xong rồi!',
  completeAllSteps: 'Vui lòng hoàn thành tất cả các bước trước khi kết thúc đóng gói.',
  
  // Toast Messages - Shipping Errors
  failedToShipOrders: 'Không thể giao vận một số đơn hàng',
  noLabelFound: 'Không tìm thấy nhãn',
  noLabelFoundDesc: 'Chưa có nhãn vận chuyển được tạo cho đơn hàng này.',
  failedToLoadLabel: 'Không thể tải nhãn vận chuyển',
  
  // Toast Messages - Address
  success: 'Thành công',
  addressSavedWithCustomer: 'Địa chỉ đã lưu (sẽ được tạo cùng khách hàng)',
  
  // Toast Messages - Weight/Packing Constraints
  weightLimitExceeded: 'Vượt giới hạn trọng lượng',
  glsWeightLimitDesc: 'Lô hàng GLS không thể vượt quá 40kg mỗi thùng. Vui lòng giảm trọng lượng hoặc chia thành nhiều thùng.',
  
  // Toast Messages - Packing/Items
  noItemsToPack: 'Không có sản phẩm để đóng gói trong đơn hàng hiện tại',
  failedToCreateAICartons: 'Không thể tạo thùng gợi ý bằng AI',
  errorCreatingCarton: 'Lỗi tạo thùng',
  failedToSave: 'Lưu thất bại',
  failedToRecalculateCartons: 'Không thể tính toán lại thùng',
  
  // Toast Messages - PPL Label Management
  pplLabelsCreated: 'Đã tạo nhãn PPL',
  pplLabelCreationFailed: 'Tạo nhãn PPL thất bại',
  pplLabelsCancelled: 'Đã hủy nhãn PPL',
  pplLabelsCancelledDesc: 'Nhãn vận chuyển đã được hủy với PPL',
  pplLabelsRemoved: 'Đã xóa nhãn PPL',
  pplLabelsRemovedDesc: 'Dữ liệu nhãn đã được xóa khỏi đơn hàng',
  pplLabelRetrieved: 'Đã lấy nhãn PPL',
  labelRetrievalFailed: 'Lấy nhãn thất bại',
  
  // Toast Messages - Packing Actions
  repackingOrder: 'Đang đóng gói lại đơn hàng',
  failedToInitiateRepacking: 'Không thể bắt đầu đóng gói lại',
  orderReset: 'Đã đặt lại đơn hàng',
  orderResetDesc: 'Tất cả số lượng đã lấy đã được xóa.',
  cannotCompletePacking: 'Không thể hoàn thành đóng gói',
  orderReturnedToPacking: 'Đơn hàng {{orderId}} đã được trả về đóng gói',
  failedToReturnToPacking: 'Không thể trả đơn hàng về đóng gói',
  orderSentBackToPick: 'Đơn hàng {{orderId}} đã được gửi về lấy hàng',
  failedToSendBackToPick: 'Không thể gửi đơn hàng về lấy hàng',
  sendBackToWait: 'Gửi về chờ',
  orderSentBackToWait: 'Đơn hàng {{orderId}} đã được gửi về chờ',
  failedToSendBackToWait: 'Không thể gửi đơn hàng về chờ',
  orderOnHold: 'Đơn hàng tạm giữ',
  orderPutOnHold: '{{orderId}} đã được tạm giữ',
  failedToPutOnHold: 'Không thể tạm giữ đơn hàng',
  
  // Toast Messages - Shipping Actions
  failedToSaveTracking: 'Không thể lưu mã vận đơn. Vui lòng thử lại.',
  failedToShipOrder: 'Không thể giao vận đơn hàng',
  ordersReturnedToReady: 'Đơn hàng đã được trả về trạng thái sẵn sàng',
  failedToUndoShipment: 'Không thể hoàn tác giao vận',
  
  // Toast Messages - Generic/Actions
  pleaseTryAgain: 'Vui lòng thử lại',
  pleaseAddCartonsFirst: 'Vui lòng thêm thùng trước khi tạo nhãn',
  failedToPrintLabels: 'Không thể in nhãn',
  cartonDataPreserved: 'Dữ liệu thùng đã được bảo toàn. Sử dụng \'Tạo tất cả nhãn\' để tạo nhãn mới.',
  ordersShipped: 'Đã giao vận đơn hàng',
  shipmentUndone: 'Đã hoàn tác giao vận',
  
  // Toast Messages - Documents/Printing
  documentsSentToPrinter: 'Đã gửi tài liệu đến máy in',
  printError: 'Lỗi in',
  labelsSentToPrinter: 'Đã gửi nhãn đến máy in',
  
  // Toast Messages - Label Generation
  noCartons: 'Không có thùng',
  generatingLabels: 'Đang tạo nhãn...',
  labelsGenerated: 'Đã tạo nhãn',
  allLabelsDeleted: 'Đã xóa tất cả nhãn',
  labelDeleted: 'Đã xóa nhãn',
  generatingPPLLabel: 'Đang tạo nhãn PPL...',
  labelGenerated: 'Đã tạo nhãn',
  
  // Order Details Sections
  invoice: 'Hóa đơn',
  customerInformation: 'Thông tin khách hàng',
  supportTickets: 'Ticket hỗ trợ',
  pickPackLogs: 'Lịch sử lấy hàng & đóng gói',
  orderProgress: 'Tiến độ đơn hàng',
  shippingMethodTracking: 'Phương thức vận chuyển & Theo dõi',
  warehouseLocation: 'Vị trí kho',
  filesSent: 'Tệp đã gửi',
  productDocuments: 'Tài liệu sản phẩm',
  uploadedFiles: 'Tệp đã tải lên',
  shippingLabels: 'Nhãn vận chuyển',
  
  // Customer Details
  customerDetails: 'Thông tin khách hàng',
  customerType: 'Loại khách hàng',
  phone: 'Điện thoại',
  email: 'Email',
  company: 'Công ty',
  location: 'Vị trí',
  badges: 'Huy hiệu',
  showBadges: 'Hiện huy hiệu',
  hideBadges: 'Ẩn huy hiệu',
  
  // Shipping Details
  method: 'Phương thức',
  tracking: 'Theo dõi',
  noTrackingNumber: 'Chưa có mã vận đơn',
  noShippingAddress: 'Chưa chọn địa chỉ giao hàng cho đơn hàng này',
  shippedAt: 'Giao vận lúc',
  cartons: 'Thùng',
  box: 'thùng',
  boxes: 'thùng',
  cartonNumber: 'Thùng #{{number}}',
  companyBox: 'Thùng công ty',
  nonCompany: 'Không công ty',
  totalWeight: 'Tổng trọng lượng',
  itemsWeight: 'Trọng lượng hàng',
  dimensions: 'Kích thước (D×R×C)',
  totalShipmentWeight: 'Tổng trọng lượng lô hàng',
  standard: 'Tiêu chuẩn',
  
  // Shipping Categories (by Carrier)
  pplCzCarrier: 'PPL CZ',
  pplCzSubtitle: 'CH Séc & SK',
  glsDeCarrier: 'GLS DE',
  glsDeSubtitle: 'Các nước EU',
  dhlDeCarrier: 'DHL DE',
  dhlDeSubtitle: 'Đức + Thụy Sĩ + Nachnahme',
  czechiaSlovakia: 'CH Séc & Slovakia',
  germanyEU: 'Đức & EU',
  personalDelivery: 'Giao tận tay',
  customerPickup: 'Khách tự lấy',
  otherDestinations: 'Điểm đến khác',
  
  // Order Items Table
  landingCost: 'Giá nhập',
  itemNotes: 'Ghi chú sản phẩm',
  addNote: 'Thêm ghi chú',
  editNote: 'Sửa ghi chú',
  saveNote: 'Lưu ghi chú',
  shippingNotes: 'Ghi chú vận chuyển',
  quickNoteTemplates: 'Mẫu ghi chú nhanh',
  templates: 'Mẫu',
  
  // Pricing & Calculations
  subtotal: 'Tạm tính',
  discount: 'Giảm giá',
  discountType: 'Loại giảm giá',
  discountValue: 'Giá trị giảm',
  flatDiscount: 'Cố định',
  rateDiscount: 'Phần trăm',
  tax: 'Thuế',
  taxRate: 'Thuế suất',
  taxAmount: 'Tiền thuế',
  shipping: 'Vận chuyển',
  adjustment: 'Điều chỉnh',
  grandTotal: 'Tổng cộng',
  itemTotal: 'Tổng sản phẩm',
  actualShippingCost: 'Phí vận chuyển thực tế',
  profitMargin: 'Biên lợi nhuận',
  clickToEditOrRoundUp: 'Nhấp để chỉnh sửa hoặc làm tròn',
  
  // Tax Invoice
  taxInvoice: 'Hóa đơn thuế',
  taxInvoiceEnabled: 'Bật hóa đơn thuế',
  ico: 'IČO',
  dic: 'DIČ',
  vatId: 'Mã số thuế',
  nameAndAddress: 'Tên & Địa chỉ',
  country: 'Quốc gia',
  
  // COD (Cash on Delivery)
  codAmount: 'Số tiền COD',
  codCurrency: 'Tiền tệ COD',
  enableCod: 'Bật COD',
  
  // Customer Selection & Creation
  searchCustomer: 'Tìm khách hàng',
  searchCustomerPlaceholder: 'Tìm theo tên, email, SĐT, hoặc dán link Facebook...',
  customersFound: 'Tìm thấy {{count}} khách hàng',
  quickCustomer: 'Khách nhanh',
  newCustomer: 'Mới',
  quickTemp: 'Nhanh',
  telephoneCustomer: 'ĐT',
  messagingCustomer: 'Tin nhắn',
  customCustomer: 'Tùy chỉnh',
  quickCustomerOneTime: 'Khách nhanh (Một lần)',
  telephoneOrder: 'Đơn điện thoại',
  socialMediaCustomer: 'Khách mạng xã hội',
  customCustomerOneTime: 'Khách tùy chỉnh (Một lần)',
  selectCustomer: 'Chọn khách hàng',
  idPhoneNumber: 'ID/Số điện thoại *',
  socialMediaApp: 'App mạng xã hội *',
  formatWithoutSpaces: 'Định dạng không có khoảng trắng (vd: +420776887045)',
  confirm: 'Xác nhận',
  
  // Product Selection
  searchProduct: 'Tìm sản phẩm',
  searchProductPlaceholder: 'Tìm sản phẩm, SKU, hoặc quét mã vạch...',
  productsFound: 'Tìm thấy {{count}} sản phẩm',
  selectProduct: 'Chọn sản phẩm',
  selectVariant: 'Chọn biến thể',
  selectBundle: 'Chọn combo',
  addItem: 'Thêm sản phẩm',
  addToOrder: 'Thêm vào đơn',
  removeItem: 'Xóa sản phẩm',
  noProductsFound: 'Không tìm thấy sản phẩm',
  barcodeScanMode: 'Chế độ quét mã vạch',
  
  // Shipping Address
  shippingAddressSelection: 'Chọn địa chỉ giao hàng',
  selectShippingAddress: 'Chọn địa chỉ giao hàng',
  selectOrAddShippingAddress: 'Chọn hoặc thêm địa chỉ giao hàng cho đơn hàng này',
  searchAddress: 'Tìm địa chỉ',
  searchAddressPlaceholder: 'Nhập để tìm địa chỉ...',
  street: 'Đường',
  streetNumber: 'Số nhà',
  city: 'Thành phố',
  state: 'Tỉnh/Bang',
  zipCode: 'Mã bưu điện',
  pickupPoint: 'Điểm lấy hàng',
  addNewAddress: 'Thêm địa chỉ mới',
  editAddress: 'Sửa địa chỉ',
  deleteAddress: 'Xóa địa chỉ',
  setAsDefault: 'Đặt làm mặc định',
  
  // Documents & Files
  productDocumentsSelection: 'Chọn tài liệu sản phẩm',
  selectDocumentsToSend: 'Chọn tài liệu để gửi',
  documentsSelected: 'Đã chọn {{count}} tài liệu',
  uploadFiles: 'Tải lên tệp',
  fileUpload: 'Tải lên tệp',
  dropFilesHere: 'Thả tệp vào đây hoặc nhấp để chọn',
  maxFileSize: 'Kích thước tối đa: 10MB',
  supportedFormats: 'Định dạng hỗ trợ: PDF, DOC, DOCX, XLS, XLSX, PNG, JPG',
  
  // Order Form Sections
  orderDetails: 'Chi tiết đơn hàng',
  itemsSection: 'Sản phẩm',
  shippingInformation: 'Thông tin vận chuyển',
  paymentInformation: 'Thông tin thanh toán',
  additionalInformation: 'Thông tin bổ sung',
  orderSummary: 'Tóm tắt đơn hàng',
  
  // Priority Levels
  low: 'Thấp',
  medium: 'Trung bình',
  high: 'Cao',
  
  // Order Types
  pos: 'POS',
  ord: 'ORD',
  web: 'Web',
  tel: 'ĐT',
  
  // Column Visibility
  showVatColumn: 'Hiện cột VAT',
  showDiscountColumn: 'Hiện cột giảm giá',
  showColumn: 'Hiện cột',
  hideColumn: 'Ẩn cột',
  
  // Buttons
  saveOrder: 'Lưu đơn hàng',
  updateOrder: 'Cập nhật đơn hàng',
  calculateShipping: 'Tính phí vận chuyển',
  applyDiscount: 'Áp dụng giảm giá',
  removeDiscount: 'Xóa giảm giá',
  addShipping: 'Thêm vận chuyển',
  backToOrders: 'Quay lại đơn hàng',
  
  // Validation Messages
  customerRequired: 'Vui lòng chọn khách hàng',
  itemsRequired: 'Vui lòng thêm ít nhất một sản phẩm vào đơn hàng',
  invalidQuantity: 'Số lượng không hợp lệ',
  invalidPrice: 'Giá không hợp lệ',
  invalidDiscount: 'Giảm giá không hợp lệ',
  
  // Create Return Dialog
  createReturnTicket: 'Tạo phiếu trả hàng',
  selectItemsToReturn: 'Chọn sản phẩm để trả từ đơn {{orderId}}',
  selectAllItems: 'Chọn tất cả sản phẩm',
  returnReason: 'Lý do trả hàng',
  returnReasonPlaceholder: 'Nhập lý do trả hàng...',
  returnQuantity: 'Số lượng trả',
  
  // Custom Price Dialog
  customPrice: 'Giá tùy chỉnh',
  validFrom: 'Có hiệu lực từ',
  validTo: 'Có hiệu lực đến',
  setCustomPrice: 'Đặt giá tùy chỉnh',
  
  // Variant/Bundle Selection
  selectVariantOrBundle: 'Chọn biến thể/Combo',
  selectProductVariants: 'Chọn biến thể sản phẩm',
  availableVariants: 'Biến thể có sẵn',
  availableBundles: 'Combo có sẵn',
  variantQuantity: 'Số lượng',
  addSelectedVariants: 'Thêm biến thể đã chọn',
  addSelectedBundles: 'Thêm combo đã chọn',
  
  // AI Carton Packing
  aiCartonPacking: 'Đóng gói AI',
  optimizePackaging: 'Tối ưu đóng gói',
  packingPlan: 'Kế hoạch đóng gói',
  cartonType: 'Loại thùng',
  recommendedCartons: 'Thùng đề xuất',
  
  // AllOrders Page
  allOrders: 'Tất cả đơn hàng',
  ordersToFulfill: 'Đơn hàng chờ xử lý',
  shippedOrders: 'Đơn hàng đã giao vận',
  payLaterOrders: 'Đơn thanh toán sau',
  preOrdersPage: 'Đơn đặt trước',
  trackAndManageOrders: 'Theo dõi và quản lý đơn hàng và vận chuyển',
  searchPlaceholder: 'Tìm kiếm đơn hàng...',
  exportToExcel: 'Xuất Excel',
  exportToPDF: 'Xuất PDF',
  exportOptions: 'Tùy chọn xuất',
  bulkActions: 'Thao tác hàng loạt',
  viewMode: 'Chế độ xem',
  normalView: 'Bình thường',
  compactView: 'Thu gọn',
  expandAll: 'Mở rộng tất cả',
  collapseAll: 'Thu gọn tất cả',
  expanded: 'Đã mở rộng',
  collapsed: 'Đã thu gọn',
  selectAll: 'Chọn tất cả',
  deselectAll: 'Bỏ chọn tất cả',
  deleteSelected: 'Xóa đã chọn',
  changeStatus: 'Thay đổi trạng thái',
  changePaymentStatus: 'Thay đổi thanh toán',
  showColumns: 'Hiển thị cột',
  loadingOrders: 'Đang tải đơn hàng...',
  filtersAndSearch: 'Bộ lọc & Tìm kiếm',
  record: 'Kỷ lục',
  walkInCustomer: 'Khách vãng lai',
  unknownCustomer: 'Khách hàng không xác định',
  itemsColon: 'Sản phẩm:',
  showLess: 'Thu gọn',
  moreItems: '+{{count}} sản phẩm khác',
  previousOrder: 'Đơn hàng trước',
  nextOrder: 'Đơn hàng tiếp theo',
  
  // Filters
  filterByStatus: 'Lọc theo trạng thái',
  allStatuses: 'Tất cả trạng thái',
  
  // Toast Messages
  loadError: 'Không thể tải đơn hàng',
  orderCreated: 'Tạo đơn hàng thành công',
  orderUpdated: 'Cập nhật đơn hàng thành công',
  orderDeleted: 'Xóa đơn hàng thành công',
  orderShipped: 'Giao hàng thành công',
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
  totalCustomers: 'Tổng khách hàng',
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
  
  // Pick & Pack Logs
  logTime: 'Thời gian',
  logUser: 'Người dùng',
  logAction: 'Hành động',
  logItem: 'Sản phẩm',
  logQuantity: 'Số lượng',
  logLocation: 'Vị trí',
  noLogsYet: 'Chưa có lịch sử lấy hàng/đóng gói',
  noTicketsYet: 'Chưa có ticket hỗ trợ cho đơn hàng này',
  createNewTicket: 'Tạo Ticket mới',
  viewTicket: 'Xem Ticket',
  
  // Pick & Pack UI
  clickToUnverifyAllItems: 'Nhấp để bỏ xác nhận tất cả',
  clickToMarkAllItemsAsVerified: 'Nhấp để đánh dấu tất cả là đã xác nhận',
  hideBarcodeScanner: 'Ẩn máy quét mã vạch',
  showBarcodeScanner: 'Hiện máy quét mã vạch',
  hideBundleItems: 'Ẩn sản phẩm trong combo',
  showBundleItems: 'Hiện sản phẩm trong combo',
  packingInstructions: 'Hướng dẫn đóng gói',
  recalculateCartonsBasedOnCurrentItems: 'Tính toán lại thùng dựa trên sản phẩm hiện tại',
  updateTrackingNumberFromLabelBarcode: 'Cập nhật mã vận đơn từ mã vạch nhãn',
  resetOrder: 'Đặt lại đơn hàng',
  viewOrderDetails: 'Xem chi tiết đơn hàng',
  
  // Support Tickets
  ticketStatus: 'Trạng thái',
  ticketPriority: 'Độ ưu tiên',
  ticketSubject: 'Tiêu đề',
  ticketCreated: 'Ngày tạo',
  
  // AddOrder Page - Headers and Titles
  createNewOrder: 'Tạo đơn hàng mới',
  addProductsConfigureDetails: 'Thêm sản phẩm và cấu hình chi tiết',
  newOrder: 'Đơn mới',
  back: 'Quay lại',
  orderSettings: 'Cài đặt đơn hàng',
  searchSelectOrCreateNew: 'Tìm kiếm và chọn hoặc tạo mới',
  addProducts: 'Thêm sản phẩm',
  searchAddProducts: 'Tìm kiếm và thêm sản phẩm vào đơn',
  searchProducts: 'Tìm sản phẩm',
  
  // AddOrder Page - Toast Messages
  shippingAddressCreatedSuccess: 'Đã tạo địa chỉ giao hàng thành công',
  shippingAddressCreatedError: 'Không thể tạo địa chỉ giao hàng',
  shippingAddressUpdatedSuccess: 'Đã cập nhật địa chỉ giao hàng thành công',
  shippingAddressUpdatedError: 'Không thể cập nhật địa chỉ giao hàng',
  addressParsed: 'Đã phân tích địa chỉ',
  addressParsedSuccess: 'Phân tích với độ chính xác {{confidence}}',
  parseFailed: 'Phân tích thất bại',
  addressParseError: 'Không thể phân tích địa chỉ',
  defaultEmailPasted: 'Đã dán email mặc định',
  pasteDefaultEmail: 'Dán email mặc định',
  barcodeScanModeOn: 'Chế độ quét mã vạch BẬT',
  barcodeScanModeOff: 'Chế độ quét mã vạch TẮT',
  rapidModeContinueScanning: 'Chế độ nhanh: Tiếp tục quét không xóa',
  normalModeClearAfterAdd: 'Chế độ thường: Xóa sản phẩm sau khi thêm',
  formValidationError: 'Lỗi xác thực biểu mẫu',
  checkRequiredFields: 'Vui lòng kiểm tra tất cả các trường bắt buộc và thử lại',
  totalAdjusted: 'Đã điều chỉnh tổng',
  adjustmentDescription: 'Giảm giá đặt thành {{amount}}',
  totalRounded: 'Đã làm tròn tổng',
  roundedUpDescription: 'Điều chỉnh: {{amount}}',
  alreadyRounded: 'Đã được làm tròn',
  alreadyRoundedDescription: 'Tổng đã là số nguyên',
  
  // AddOrder Page - Form Fields and Labels
  name: 'Tên',
  firstName: 'Tên',
  lastName: 'Họ',
  orderLocationPlaceholder: 'vd: Kho Prague, Văn phòng chính',
  selectOrderLocation: 'Chọn nguồn đơn hàng',
  locationOnline: 'Trực tuyến',
  locationInStore: 'Tại cửa hàng',
  locationPhone: 'Điện thoại',
  locationFacebook: 'Facebook',
  locationOther: 'Khác',
  enterCustomerName: 'Nhập tên khách hàng',
  phoneNumber: 'Số điện thoại',
  postalCode: 'Mã bưu điện',
  houseNumber: 'Số nhà',
  emailOptional: 'Email (tùy chọn)',
  companyOptional: 'Công ty (tùy chọn)',
  branchOrPickupLocation: 'Chi nhánh hoặc điểm lấy hàng',
  typeHere: 'Nhập vào đây',
  syncedWithCustomerName: 'Đồng bộ với Tên khách hàng',
  placeUrlOrType: 'Dán URL hoặc Nhập',
  addressSearch: 'Tìm địa chỉ',
  smartPasteAddressParser: 'Dán thông minh - Phân tích địa chỉ',
  pasteFullAddressForAutoparsing: 'vd: Nguyen anh van, Potocni 1299 vejprty, Bưu điện 43191 vejprty, Sdt 607638460',
  startTypingAddress: 'Bắt đầu nhập địa chỉ...',
  addCustomerToOrder: 'Thêm khách hàng vào đơn',
  
  // AddOrder Page - Product Selection
  clickToSeeAllProducts: 'Nhấp để xem tất cả sản phẩm (hỗ trợ tiếng Việt có dấu)...',
  productsFoundCount: 'Tìm thấy {{count}} sản phẩm',
  noProductsFoundFor: 'Không tìm thấy sản phẩm cho "{{search}}"',
  trySearchingByNameSKU: 'Thử tìm theo tên, SKU hoặc danh mục',
  best: 'Tốt nhất',
  service: 'Dịch vụ',
  scanModeOff: 'Chế độ quét: TẮT',
  scanModeOn: 'Chế độ quét: BẬT',
  stock: 'Tồn kho',
  
  // AddOrder Page - Order Items
  noItemsYet: 'Chưa có sản phẩm',
  itemsAdded: 'Đã thêm {{count}} sản phẩm',
  addOptionalNote: 'Thêm ghi chú (tùy chọn)',
  vat: 'VAT',
  disc: 'Giảm',
  
  // AddOrder Page - Shipping and Discount
  addSpecialInstructions: 'Thêm hướng dẫn đặc biệt cho đóng gói hoặc vận chuyển...',
  selectShipping: 'Chọn vận chuyển',
  selectPayment: 'Chọn thanh toán',
  shippingAndDiscount: 'Vận chuyển & Giảm giá',
  additionalOptions: 'Tùy chọn bổ sung',
  selectOrAddAddress: 'Chọn hoặc thêm địa chỉ giao hàng cho đơn hàng này',
  companyIdentificationNumber: 'Số nhận dạng công ty',
  taxIdentificationNumber: 'Số nhận dạng thuế',
  companyNameAndAddress: 'Tên và địa chỉ công ty',
  euVatIdentificationNumber: 'Số nhận dạng VAT EU',
  countryName: 'Tên quốc gia',
  
  // AddOrder Page - Order Summary
  clickToEnter: 'Nhấp để nhập',
  formValidationErrors: 'Lỗi xác thực biểu mẫu',
  formValidationErrorsCount: 'Lỗi xác thực biểu mẫu ({{count}})',
  invalidValue: 'Giá trị không hợp lệ',
  creating: 'Đang tạo...',
  saveDraft: 'Lưu nháp',
  marginAnalysis: 'Phân tích biên lợi nhuận',
  totalCost: 'Tổng chi phí',
  totalCostColon: 'Tổng chi phí:',
  totalProfitColon: 'Tổng lợi nhuận:',
  margin: 'Biên',
  chooseVariantsFor: 'Chọn biến thể và số lượng cho:',
  addShippingNotesDescription: 'Thêm ghi chú vận chuyển hoặc hướng dẫn đặc biệt cho sản phẩm này',
  
  // New Customer Form
  newCustomerDetails: 'Thông tin khách hàng mới',
  customerNameRequired: 'Tên khách hàng *',
  facebookName: 'Tên Facebook',
  facebookUrl: 'URL Facebook',
  nameCopied: 'Đã sao chép tên',
  customerNameCopiedToFacebookUrl: 'Tên khách hàng đã được sao chép vào URL Facebook',
  copyCustomerName: 'Sao chép tên khách hàng',
  smartPaste: 'Dán thông minh',
  pasteAnyAddressInfo: 'Dán bất kỳ thông tin địa chỉ nào và chúng tôi sẽ tự động tách',
  parsing: 'Đang phân tích...',
  parseFill: 'Phân tích & Điền',
  addressSearchOptional: 'Tìm kiếm địa chỉ (tùy chọn)',
  searchingAddresses: 'Đang tìm kiếm địa chỉ...',
  addressesFound: 'Tìm thấy {{count}} địa chỉ',
  noAddressesFound: 'Không tìm thấy địa chỉ',
  searchOfficialAddress: 'Tìm kiếm địa chỉ chính thức để tự động điền các trường bên dưới',
  address: 'Địa chỉ',
  
  // Product Selection - Additional Labels
  noItemsAddedYet: 'Chưa có sản phẩm nào được thêm vào đơn hàng',
  searchAndSelectProducts: 'Tìm kiếm và chọn sản phẩm ở trên để thêm',
  
  // Payment/Shipping Details
  paymentDetails: 'Chi tiết thanh toán',
  configurePricing: 'Cấu hình giá và ghi chú',
  addDiscount: 'Thêm giảm giá',
  amount: 'Số tiền',
  percentage: 'Phần trăm',
  quickSelect: 'Chọn nhanh:',
  realCostFromCarrier: 'Chi phí thực tế từ đơn vị vận chuyển',
  roundingOrOtherAdjustments: 'Làm tròn hoặc điều chỉnh khác',
  cashOnDeliveryOptional: 'Số tiền thu hộ (tùy chọn)',
  currencyForCod: 'Tiền tệ cho thu hộ',
  selectCurrency: 'Chọn tiền tệ',
  additionalOrderNotes: 'Ghi chú đơn hàng bổ sung...',
  addTaxInvoiceSection: 'Thêm phần hóa đơn thuế',
  taxInvoiceInformation: 'Thông tin hóa đơn thuế',
  taxRatePercent: 'Thuế suất (%)',
  vatIdOptional: 'Mã số thuế (tùy chọn)',
  euVatIdNumber: 'Số nhận dạng VAT EU',
  
  // Files & Documents
  filesDocuments: 'Tệp & Tài liệu',
  uploadFilesDocuments: 'Tải lên tệp và quản lý tài liệu sản phẩm',
  uploadedFilesCount: 'Tệp đã tải lên ({{count}})',
  noFilesYet: 'Chưa có tệp nào',
  uploadFilesOrAddProducts: 'Tải lên tệp hoặc thêm sản phẩm có tệp',
  
  // Order Summary Labels
  subtotalLabel: 'Tạm tính:',
  taxLabel: 'Thuế ({{rate}}%):',
  discountLabel: 'Giảm giá{{rate}}:',
  grandTotalLabel: 'Tổng cộng:',
  discountSetTo: 'Giảm giá được đặt thành {{amount}}',
  totalRoundedUp: 'Đã làm tròn lên tổng',
  adjustmentAmount: 'Điều chỉnh: {{amount}}',
  totalAlreadyWhole: 'Tổng đã là số nguyên',
  
  // Toast Messages - Additional
  orderCreatedWithPacking: 'Đơn hàng đã được tạo thành công với kế hoạch đóng gói',
  orderCreatedSuccess: 'Đơn hàng đã được tạo thành công',
  orderCreatedError: 'Không thể tạo đơn hàng. Vui lòng thử lại',
  aiPackingDisabled: 'Đã tắt đóng gói AI',
  aiPackingDisabledDesc: 'Đóng gói thùng AI đã bị tắt trong cài đặt',
  aiPackingDisabledError: 'Đóng gói thùng AI đã bị tắt. Bật nó trong Cài đặt để sử dụng tính năng này.',
  enableAiPackingInSettings: 'Vui lòng bật Đóng gói thùng AI trong Cài đặt để sử dụng tính năng này',
  pleaseAddItemsFirst: 'Vui lòng thêm sản phẩm vào đơn hàng trước',
  packingPlanOptimized: 'Kế hoạch đóng gói đã được tối ưu hóa thành công',
  failedToOptimizePacking: 'Không thể tối ưu hóa đóng gói',
  saveOrderBeforeCartons: 'Vui lòng lưu đơn hàng trước khi thêm thùng',
  addManualCartonError: 'Không thể thêm thùng thủ công',
  noVariantsSelected: 'Chưa chọn biến thể',
  noVariantsSelectedDesc: 'Vui lòng chọn ít nhất một biến thể với số lượng > 0',
  variantsAdded: 'Đã thêm {{count}} biến thể vào đơn hàng',
  variantsAddedToOrder: 'Đã thêm {{count}} biến thể vào đơn hàng',
  filesUploaded: 'Đã tải lên {{count}} tệp thành công',
  filesUploadedSuccessfully: 'Đã tải lên {{count}} tệp thành công',
  fileRemoved: 'Đã xóa tệp',
  fileRemovedDesc: 'Tệp đã được xóa khỏi danh sách tải lên',
  fileRemovedFromList: 'Tệp đã được xóa khỏi danh sách tải lên',
  pleaseAddAtLeastOneItem: 'Vui lòng thêm ít nhất một mục vào đơn hàng',
  addressCopiedToClipboard: 'Địa chỉ đã được sao chép vào clipboard',
  editShippingAddress: 'Sửa địa chỉ giao hàng',
  addShippingAddress: 'Thêm địa chỉ giao hàng',
  updateShippingAddressDetails: 'Cập nhật chi tiết địa chỉ giao hàng',
  enterNewShippingAddressDetails: 'Nhập chi tiết địa chỉ giao hàng mới',
  typeNoteOrSelectTemplate: 'Nhập ghi chú của bạn hoặc chọn mẫu có sẵn bên dưới...',
  quickTemplates: 'Mẫu nhanh:',
  uploadFilesManageDocs: 'Tải lên tệp và quản lý tài liệu sản phẩm',
  upload: 'Tải lên',
  smartPasteExample: 'vd: Nguyen anh van, Potocni 1299 vejprty, Bưu điện 43191 vejprty, Sdt 607638460',
  shippingNotesOptional: 'Ghi chú vận chuyển (Tùy chọn)',
  
  // PreOrders
  preOrders: 'Đơn đặt trước',
  preOrder: 'Đơn đặt trước',
  allPreOrders: 'Tất cả đơn đặt trước',
  addPreOrder: 'Thêm đơn đặt trước',
  editPreOrder: 'Sửa đơn đặt trước',
  preOrderDetails: 'Chi tiết đơn đặt trước',
  noPreOrdersYet: 'Chưa có đơn đặt trước',
  managePreOrders: 'Quản lý đơn đặt trước',
  trackUpcomingOrders: 'Theo dõi và quản lý đơn đặt trước sắp tới',
  
  // PreOrders - Page specific
  preOrderManagement: 'Quản lý đơn đặt trước',
  manageCustomerPreOrders: 'Quản lý đơn đặt trước và đặt cọc của khách hàng',
  activePreOrders: 'Đơn đặt trước hoạt động',
  active: 'Hoạt động',
  pendingArrival: 'Chờ hàng về',
  partiallyArrived: 'Đã về một phần',
  fullyArrived: 'Đã về đủ',
  searchPreOrders: 'Tìm kiếm đơn đặt trước...',
  activeFilters: 'Bộ lọc đang dùng:',
  found: 'tìm thấy',
  showHideColumns: 'Hiện/Ẩn cột',
  expectedDate: 'Ngày dự kiến',
  createdDate: 'Ngày tạo',
  viewDetails: 'Xem chi tiết',
  loadingPreOrders: 'Đang tải đơn đặt trước...',
  
  // PreOrders - Toast Messages
  preOrderDeletedSuccess: 'Đã xóa đơn đặt trước thành công',
  preOrderDeleteFailed: 'Không thể xóa đơn đặt trước',
  noPreOrdersToExport: 'Không có đơn đặt trước để xuất',
  exportedPreOrdersXLSX: 'Đã xuất {{count}} đơn đặt trước ra XLSX',
  exportedPreOrdersPDF: 'Đã xuất {{count}} đơn đặt trước ra PDF',
  exportPreOrdersXLSXFailed: 'Không thể xuất đơn đặt trước ra XLSX',
  exportPreOrdersPDFFailed: 'Không thể xuất đơn đặt trước ra PDF',
  customerCreatedSuccess: 'Đã tạo khách hàng thành công',
  customerCreationFailed: 'Không thể tạo khách hàng',
  preOrderCreatedSuccess: 'Đã tạo đơn đặt trước thành công',
  preOrderCreationFailed: 'Không thể tạo đơn đặt trước',
  preOrderUpdatedSuccess: 'Đã cập nhật đơn đặt trước thành công',
  preOrderUpdateFailed: 'Không thể cập nhật đơn đặt trước',
  preOrderStatusUpdatedSuccess: 'Đã cập nhật trạng thái đơn đặt trước thành công',
  preOrderStatusUpdateFailed: 'Không thể cập nhật trạng thái đơn đặt trước',
  
  // PreOrders - Add/Edit Forms
  createPreOrder: 'Tạo đơn đặt trước',
  addNewCustomerPreOrder: 'Thêm đơn đặt trước mới của khách hàng',
  basicInformation: 'Thông tin cơ bản',
  typeToSearchCustomers: 'Nhập để tìm kiếm khách hàng...',
  noCustomerFound: 'Không tìm thấy khách hàng',
  createNewCustomer: 'Tạo khách hàng mới',
  expectedArrivalDate: 'Ngày dự kiến về hàng',
  pickADate: 'Chọn ngày',
  addNotesOrInstructions: 'Thêm ghi chú hoặc hướng dẫn đặc biệt...',
  preOrderItems: 'Sản phẩm đặt trước',
  itemNumber: 'Sản phẩm {{number}}',
  selectExistingItem: 'Chọn sản phẩm có sẵn (Tùy chọn)',
  searchProductsPreOrdersSupplier: 'Tìm sản phẩm, đơn đặt trước, hoặc hàng nhà cung cấp...',
  searchByNameSKU: 'Tìm theo tên, SKU...',
  noItemsFound: 'Không tìm thấy sản phẩm.',
  preOrderItemsGroup: 'Sản phẩm đặt trước',
  purchaseOrderItems: 'Sản phẩm đơn mua hàng',
  itemNameRequired: 'Tên sản phẩm *',
  itemDescription: 'Mô tả sản phẩm',
  optionalDescriptionSpec: 'Mô tả hoặc thông số kỹ thuật (tùy chọn)',
  customerNameRequired2: 'Tên khách hàng là bắt buộc',
  updatePreOrderDetails: 'Cập nhật chi tiết đơn đặt trước',
  selectCustomerPlaceholder: 'Chọn khách hàng...',
  selectProductManually: 'Chọn sản phẩm hoặc nhập thủ công bên dưới',
  updating: 'Đang cập nhật...',
  updatePreOrder: 'Cập nhật đơn đặt trước',
  loadingPreOrder: 'Đang tải đơn đặt trước...',
  preOrderNotFound: 'Không tìm thấy đơn đặt trước',
  goBack: 'Quay lại',
  selectExistingProduct: 'Chọn sản phẩm có sẵn (Tùy chọn)',
  
  // PreOrders - Details
  preOrderInformation: 'Thông tin đơn đặt trước',
  markPartiallyArrived: 'Đánh dấu đã về một phần',
  markFullyArrived: 'Đánh dấu đã về đủ',
  cancelPreOrder: 'Hủy đơn đặt trước',
  arrivedQuantityDisplay: '{{arrived}} / {{total}} đã về',
  arrivalProgress: 'Tiến độ hàng về',
  orderedQuantity: 'Số lượng đặt',
  arrivedQuantity: 'Số lượng đã về',
  noItemsInPreOrder: 'Không có sản phẩm nào trong đơn đặt trước này',
  deletePreOrderTitle: 'Xóa đơn đặt trước',
  deletePreOrderConfirm: 'Bạn có chắc chắn muốn xóa đơn đặt trước này? Hành động này không thể hoàn tác và sẽ xóa tất cả sản phẩm liên quan.',
  noPreOrdersMatchFilters: 'Không có đơn đặt trước nào phù hợp với bộ lọc',
  noPreOrdersYetClickAdd: 'Chưa có đơn đặt trước. Nhấn "Thêm đơn đặt trước" để tạo mới.',
  itemsOrdered: 'Sản phẩm đã đặt',
  notSet: 'Chưa đặt',
  
  // PreOrders - Notifications
  reminderSettings: 'Cài đặt nhắc nhở',
  enableReminders: 'Bật nhắc nhở',
  enableRemindersDescription: 'Gửi SMS hoặc email nhắc nhở cho khách hàng trước ngày dự kiến về hàng',
  reminderChannel: 'Kênh thông báo',
  sms: 'SMS',
  smsBothEmail: 'SMS & Email',
  reminderDaysBefore: 'Số ngày trước khi hàng về',
  reminderDaysBeforeHint: 'Chọn thời điểm gửi nhắc nhở',
  daysBefore: '{{days}} ngày trước',
  daysBeforePlural: '{{days}} ngày trước',
  reminderTime: 'Thời gian nhắc nhở',
  reminderTimeHint: 'Thời gian trong ngày để gửi nhắc nhở',
  reminderTimezone: 'Múi giờ',
  reminderPhone: 'Số điện thoại',
  reminderPhoneHint: 'Ghi đè số điện thoại khách hàng cho nhắc nhở này',
  reminderEmail: 'Địa chỉ email',
  reminderEmailHint: 'Ghi đè email khách hàng cho nhắc nhở này',
  priorityLow: 'Thấp',
  priorityNormal: 'Bình thường',
  priorityHigh: 'Cao',
  priorityUrgent: 'Khẩn cấp',
  sendReminderNow: 'Gửi nhắc nhở ngay',
  sendReminder: 'Gửi nhắc nhở',
  reminderSent: 'Đã gửi nhắc nhở thành công',
  reminderFailed: 'Không thể gửi nhắc nhở',
  reminderHistory: 'Lịch sử nhắc nhở',
  lastReminderSent: 'Nhắc nhở cuối cùng',
  reminderStatus: 'Trạng thái nhắc nhở',
  reminderStatusPending: 'Đang chờ',
  reminderStatusSent: 'Đã gửi',
  reminderStatusFailed: 'Thất bại',
  noRemindersYet: 'Chưa có nhắc nhở nào được gửi',
  reminderScheduled: 'Nhắc nhở đã lên lịch',
  reminderTimeline: 'Dòng thời gian nhắc nhở',
  reminderDelivered: 'Đã gửi',
  reminderDeliveredTo: 'Đã gửi qua {{channel}}',
  upcomingReminders: 'Nhắc nhở sắp tới',
  nextReminderIn: 'Nhắc nhở tiếp theo trong {{days}} ngày',
  reminderNotConfigured: 'Chưa cài đặt nhắc nhở',
  reminderEnabled: 'Đã bật nhắc nhở',
  reminderDisabled: 'Đã tắt nhắc nhở',
  lastSent: 'Lần gửi cuối',
  nextReminderBefore: 'Nhắc nhở tiếp theo trước',
  filterByPriority: 'Lọc theo độ ưu tiên',
  allPriorities: 'Tất cả độ ưu tiên',
  enabled: 'Đã bật',
  disabled: 'Đã tắt',
  configureReminders: 'Cài đặt nhắc nhở',
  useCustomerContact: 'Sử dụng thông tin liên hệ khách hàng',
  customContactInfo: 'Thông tin liên hệ tùy chỉnh',
  reminderWillBeSentTo: 'Nhắc nhở sẽ được gửi đến',
  sendReminderConfirmTitle: 'Gửi nhắc nhở',
  sendReminderConfirmDesc: 'Chọn kênh để gửi nhắc nhở cho khách hàng về đơn đặt trước này.',
  sending: 'Đang gửi...',
  selectChannel: 'Chọn kênh',
  bothChannels: 'Cả hai',
  remindersSent: 'Nhắc nhở đã gửi',
  daysUntilNextReminder: 'Ngày đến nhắc nhở',
  currentSettings: 'Cài đặt hiện tại',
  channel: 'Kênh',
  messageContent: 'Nội dung tin nhắn',
  recipient: 'Người nhận',
  sentDate: 'Ngày gửi',
  viewMessage: 'Xem tin nhắn',
  hideMessage: 'Ẩn tin nhắn',
  noExpectedDate: 'Chưa đặt ngày dự kiến',
  neverSent: 'Chưa gửi',
  
  // Pick & Pack Workflow
  orderFulfillment: 'Xử lý đơn hàng',
  fulfillmentWorkflow: 'Quy trình xử lý',
  pickItems: 'Lấy hàng',
  packItems: 'Đóng gói',
  generateLabel: 'Tạo nhãn',
  complete: 'Hoàn thành',
  
  // Scanning
  scanProduct: 'Quét sản phẩm',
  scanBarcode: 'Quét mã vạch',
  manualEntry: 'Nhập thủ công',
  barcodeScanner: 'Máy quét mã vạch',
  scanBarcodeToVerifyItems: 'Quét mã vạch để xác minh sản phẩm...',
  
  // Product Info
  productName: 'Tên sản phẩm',
  pickStatus: 'Trạng thái lấy hàng',
  barcode: 'Mã vạch',
  
  // Pick Status
  notStarted: 'Chưa bắt đầu',
  inProgress: 'Đang thực hiện',
  completed: 'Đã hoàn thành',
  picked: 'Đã lấy',
  partiallyPicked: 'Lấy một phần',
  notFound: 'Không tìm thấy',
  itemReview: 'Xem lại sản phẩm',
  
  // Actions
  markAsPicked: 'Đánh dấu đã lấy',
  cannotFind: 'Không tìm thấy',
  skip: 'Bỏ qua',
  printLabel: 'In nhãn',
  completeOrder: 'Hoàn thành đơn',
  next: 'Tiếp theo',
  previous: 'Trước',
  cancel: 'Hủy',
  print: 'In',
  save: 'Lưu',
  view: 'Xem',
  printed: 'Đã in',
  
  // Carton & Packing
  addToCarton: 'Thêm vào thùng',
  packageWeight: 'Trọng lượng kiện',
  packingMaterials: 'Vật liệu đóng gói',
  weight: 'Trọng lượng',
  weightKg: 'Trọng lượng (kg)',
  weightOptional: 'Trọng lượng (kg) <span className="text-xs text-gray-500 font-normal">(tùy chọn, tối đa 40kg)</span>',
  
  // Validation Messages
  scanAllItems: 'Quét tất cả sản phẩm',
  wrongProductScanned: 'Quét sai sản phẩm',
  quantityMismatch: 'Số lượng không khớp',
  itemAlreadyPicked: 'Sản phẩm đã được lấy',
  weightLimitExceededDesc: 'Lô hàng GLS không được vượt quá 40kg mỗi thùng. Vui lòng giảm trọng lượng hoặc chia thành nhiều thùng.',
  
  // Instructions
  scanEachProductToPick: 'Quét từng sản phẩm để lấy hàng',
  packItemsIntoCarton: 'Đóng gói sản phẩm vào thùng',
  verifyQuantities: 'Xác minh số lượng',
  clickToMinimize: 'Nhấp để thu nhỏ',
  
  // Progress
  itemsPicked: 'Sản phẩm đã lấy',
  percentComplete: 'Hoàn thành {{percent}}%',
  remainingItems: 'Còn {{count}} sản phẩm',
  
  // Alerts
  itemNotFoundInWarehouse: 'Không tìm thấy sản phẩm trong kho',
  lowStockAlert: 'Cảnh báo tồn kho thấp',
  locationMismatch: 'Vị trí không khớp',
  errorNoPacking: 'Không có sản phẩm để đóng gói trong đơn hiện tại',
  
  // Loading States
  loadingOrder: 'Đang tải đơn hàng...',
  generatingLabel: 'Đang tạo nhãn...',
  loadingDocuments: 'Đang tải tài liệu...',
  loadingFiles: 'Đang tải tệp...',
  
  // Empty States
  noItemsToPick: 'Không có sản phẩm để lấy',
  noLocation: 'Không có vị trí',
  orderComplete: 'Đơn hàng đã hoàn thành',
  noFilesAttachedToOrder: 'Không có tệp đính kèm trong đơn hàng này',
  
  // Documents & Labels
  orderFiles: 'Tệp đơn hàng',
  documentsCount: 'Tài liệu sản phẩm ({{count}})',
  
  // Service Items
  serviceItemNoLocation: 'Lấy cuối cùng - Không có vị trí vật lý',
  note: 'Ghi chú',
  
  // Pending Services
  pendingServices: 'Dịch vụ chờ xử lý',
  pendingServicesDescription: 'Khách hàng này có các bản ghi dịch vụ chờ xử lý có thể thêm vào đơn hàng.',
  laborFee: 'Phí nhân công',
  partsCost: 'Phí linh kiện',
  serviceFee: 'Phí dịch vụ',
  servicePart: 'Linh kiện dịch vụ',
  applyToOrder: 'Thêm vào đơn',
  applied: 'Đã thêm',
  serviceApplied: 'Đã thêm dịch vụ',
  serviceAppliedDesc: '{{name}} đã được thêm vào đơn hàng',
  serviceAlreadyApplied: 'Đã được thêm',
  serviceAlreadyAppliedDesc: 'Dịch vụ này đã được thêm vào đơn hàng',
  
  // Packing Checklist
  itemsVerified: 'Đã xác minh sản phẩm',
  packingSlipIncluded: 'Đã bao gồm phiếu đóng gói',
  boxSealed: 'Đã niêm phong thùng',
  weightRecorded: 'Đã ghi trọng lượng',
  fragileProtected: 'Đã bảo vệ hàng dễ vỡ',
  promotionalMaterials: 'Vật liệu quảng cáo',
  
  // Error Messages
  failedToCreateCartons: 'Không thể tạo thùng đề xuất bởi AI',
  failedToCreateCarton: 'Không thể tạo thùng',
  failedToUpdateTrackingNumber: 'Không thể cập nhật mã vận đơn',
  failedToCreateLabels: 'Không thể tạo nhãn PPL',
  failedToCancelLabels: 'Không thể hủy nhãn PPL',
  failedToDeleteLabels: 'Không thể xóa nhãn PPL',
  failedToRetrieveLabel: 'Không thể lấy nhãn PPL',
  failedToSaveTrackingNumbers: 'Không thể lưu mã vận đơn. Vui lòng thử lại.',
  failedToShipSomeOrders: 'Không thể giao một số đơn hàng',
  
  // Success Messages
  shippingLabelsCancelled: 'Đã hủy nhãn vận chuyển với PPL',
  labelDataRemoved: 'Đã xóa dữ liệu nhãn khỏi đơn hàng',
  allPickedQuantitiesCleared: 'Đã xóa tất cả số lượng đã lấy.',
  
  // Repacking
  orderSentForRepacking: 'Đơn hàng đã được gửi để đóng gói lại',
  
  // Tracking Numbers
  enterTrackingNumber: 'Nhập mã vận đơn...',
  enterDHLTrackingNumber: 'Nhập mã vận đơn DHL...',
  enterGLSTrackingNumber: 'Nhập mã vận đơn GLS...',
  
  // Copy Fields
  paketSize: 'Kích thước gói',
  fullAddress: 'Địa chỉ đầy đủ',
  
  // Mute/Unmute
  muteSounds: 'Tắt tiếng',
  unmuteSounds: 'Bật tiếng',
  
  // Progress Pills - Scroll Navigation
  scrollToItems: 'Cuộn đến Sản phẩm',
  scrollToDocuments: 'Cuộn đến Tài liệu',
  scrollToCartons: 'Cuộn đến Thùng hàng',
  scrollToShippingLabels: 'Cuộn đến Nhãn vận chuyển',
  
  // Bundle Items
  
  // Packing Instructions

  // Pick & Pack - PickPack Component Labels
  skuLabel: 'SKU:',
  barcodeLabel: 'Mã vạch:',
  cartonHash: 'Thùng #',
  optionalMax40kg: '(tùy chọn, tối đa 40kg)',
  exceedsGls40kgLimit: 'Vượt quá giới hạn 40kg của GLS',
  aiCalculated: 'Tính toán bởi AI',

  // Export Columns (Pre-Orders)
  preOrderIdColumn: 'Mã đặt trước',
  customerColumn: 'Khách hàng',
  itemsColumn: 'Sản phẩm',
  statusColumn: 'Trạng thái',
  createdDateColumn: 'Ngày tạo',
  expectedDeliveryColumn: 'Ngày dự kiến',
  notesColumn: 'Ghi chú',

  // Validation Messages (Pre-Orders)
  quantityMinOne: 'Số lượng tối thiểu là 1',
  atLeastOneItemRequired: 'Cần ít nhất một sản phẩm',

  // Placeholder Text
  pleaseProvideReturnReason: 'Vui lòng cung cấp lý do trả hàng...',
  enterCustomPrice: 'Nhập giá tùy chỉnh',
  enterDhlTrackingNumber: 'Nhập mã vận đơn DHL...',
  enterGlsTrackingNumber: 'Nhập mã vận đơn GLS...',
  
  // Order Document Selector
  selectDocumentsToInclude: 'Chọn tài liệu để đính kèm với đơn hàng này',
  documentsPreviouslySent: 'tài liệu đã gửi trước đây (được đánh dấu bằng',
  documentSelected: '{{count}} đã chọn',
  documentWillBeIncluded: '{{count}} tài liệu sẽ được đính kèm',
  documentsWillBeIncluded: '{{count}} tài liệu sẽ được đính kèm',

  // PickPack.tsx - Comprehensive Translation Keys
  // Default values & placeholders
  weightPlaceholder: '0.000',
  
  // UI Labels & Headers
  exit: 'Thoát',
  closeModal: 'ĐÓNG',
  time: 'Thời gian',
  score: 'Điểm',
  trackYourPickingProgress: 'Theo dõi tiến độ lấy hàng',
  pickPackWorkflow: 'Quy trình Lấy & Đóng gói',
  manageOrderFulfillment: 'Quản lý thực hiện đơn hàng từ lấy hàng đến vận chuyển',
  swipeToView: 'Vuốt để xem →',
  orderLabel: 'Đơn hàng:',
  
  // Tab Labels
  all: 'Tất cả',
  overview: 'Tổng quan',
  pend: 'Chờ',
  ready: 'Sẵn sàng',
  pack: 'Đóng gói',
  
  // Shipping Information
  noShippingAddressProvided: 'Chưa cung cấp địa chỉ giao hàng',
  shippingAddressLabel: 'Địa chỉ giao hàng',
  shippingMethodLabel: 'Phương thức vận chuyển',
  trackingNumberLabel: 'Mã vận đơn',
  
  // Packing Completion Modal
  packingComplete: 'Hoàn thành đóng gói!',
  excellentWork: 'Tuyệt vời! Đơn hàng {{orderId}} đã sẵn sàng để giao',
  pickNextOrder: 'LẤY ĐƠN TIẾP',
  packNextOrder: 'ĐÓNG ĐƠN TIẾP ({{count}})',
  goToReadyToShip: 'ĐẾN SÀNSÀNG GIAO ({{count}})',
  proceedToPacking: 'TIẾP TỤC ĐÓNG GÓI',
  backToOverview: 'TRỞ VỀ TỔNG QUAN',
  
  // PPL Label Management
  noCarton: 'Không có thùng',
  addCartonLabel: 'Thêm nhãn thùng',
  
  // GLS Shipping
  glsShipping: 'Vận chuyển GLS ({{count}} {{unit}})',
  carton: 'thùng',
  cartonsPlural: 'thùng',
  noCartonsAddedToGls: 'Chưa thêm thùng vào GLS. Sử dụng nút bên dưới để thêm thùng cho vận chuyển tiết kiệm.',
  empfanger: 'Empfänger (Người nhận)',
  absender: 'Absender (Người gửi)',
  vorUndNachname: 'Vor- und Nachname*',
  firma: 'Firma',
  strasse: 'Straße*',
  hausnummer: 'Hausnummer*',
  plz: 'PLZ*',
  wohnort: 'Wohnort*',
  land: 'Land*',
  eMail: 'E-Mail',
  telefon: 'Telefon',
  glsShippingLabels: 'Nhãn vận chuyển GLS ({{count}})',
  duplicate: 'Trùng lặp',
  
  // Toast Error Messages (Extended)
  errorTitle: 'Lỗi',
  failedToPrintLabel: 'Không thể in nhãn',
  failedToGenerateLabel: 'Không thể tạo nhãn',
  failedToDeleteLabel: 'Không thể xóa nhãn',
  creatingShippingLabelFromPPL: 'Đang tạo nhãn vận chuyển từ PPL API',
  labelPdfNotAvailable: 'PDF nhãn không khả dụng. Nhãn có thể vẫn đang được xử lý.',
  couldNotOpenPrintWindow: 'Không thể mở cửa sổ in. Vui lòng cho phép popup trên trang này.',
  labelRemovedSuccessfully: 'Đã xóa nhãn thành công.',
  pleaseAllowClipboardAccess: 'Vui lòng cho phép truy cập clipboard',
  
  // Mobile Labels
  unableToDisplayItemDetails: 'Không thể hiển thị chi tiết sản phẩm. Vui lòng điều hướng bằng các nút Trước/Sau.',
  ordersCompletedToday: 'Đơn hàng hoàn thành hôm nay',
  ordersPickedAndReadyToPack: 'Đơn hàng đã lấy và sẵn sàng để đóng gói',
  ordersOrganizedByDestination: 'Đơn hàng được tổ chức theo nhà vận chuyển',
  
  // Confirmation messages
  deleteLabelConfirm: 'Xóa nhãn #{{labelNumber}}?\n\nĐiều này sẽ hủy vận chuyển với PPL.',
  
  // Additional UI Labels
  pickingItem: 'Lấy sản phẩm',
  nextItem: 'Sản phẩm tiếp theo',
  bundleItems: 'Sản phẩm combo',
  pickingAccuracy: 'Độ chính xác lấy hàng',
  avgItemsPerOrder: 'TB sản phẩm/Đơn',
  avgPickTime: 'TB thời gian lấy',
  
  // Section Headers
  orderItemsHeader: 'Sản phẩm trong đơn',
  orderSummaryHeader: 'Tóm tắt đơn hàng',
  
  // Delete Dialog
  deleteOrdersTitle: 'Xóa đơn hàng',
  deleteOrdersConfirm: 'Bạn có chắc chắn muốn xóa {{count}} đơn hàng? Hành động này không thể hoàn tác.',
  
  // Additional Keys
  each: 'mỗi',
  selected: 'đã chọn',
  selectedCount: '{{count}} đã chọn',
  
  // EditOrder.tsx - Quick Note Templates
  handleWithCareFragile: 'Cầm nhẹ - hàng dễ vỡ',
  keepUprightTransport: 'Giữ thẳng đứng khi vận chuyển',
  packAntiStatic: 'Đóng gói với vật liệu chống tĩnh điện',
  doubleBoxRequired: 'Yêu cầu đóng gói 2 lớp',
  separateFromOthers: 'Tách riêng với các sản phẩm khác',
  doNotStack: 'Không xếp chồng',
  tempSensitiveKeepCool: 'Nhạy cảm nhiệt độ - giữ mát',
  requiresSignatureDelivery: 'Yêu cầu ký nhận khi giao hàng',
  packExtraBubbleWrap: 'Đóng gói thêm màng xốp',
  
  // EditOrder.tsx - Validation Messages
  pleaseSelectCustomer: 'Vui lòng chọn khách hàng',
  pleaseAddProduct: 'Vui lòng thêm ít nhất một sản phẩm vào đơn hàng',
  allProductsMustHaveQuantity: 'Tất cả sản phẩm phải có số lượng lớn hơn 0',
  
  // EditOrder.tsx - Category Names
  bundles: 'Combo',
  services: 'Dịch vụ',
  uncategorized: 'Chưa phân loại',
  
  // EditOrder.tsx - UI Labels
  itemAdded: 'sản phẩm đã thêm',
  searchSelectProductsAbove: 'Tìm kiếm và chọn sản phẩm ở trên để thêm vào',
  configurePricingNotes: 'Cấu hình giá và ghi chú',
  shippingCostLabel: 'Phí vận chuyển',
  actualShippingCostLabel: 'Phí vận chuyển thực tế',
  rounding: 'Làm tròn',
  total: 'Tổng',
  products: 'Sản phẩm',
  requiredFieldsMissing: 'Thiếu trường bắt buộc:',
  
  // OrderDetails.tsx - Additional Status/Priority Labels
  unknown: 'Không rõ',
  paymentPending: 'Chờ thanh toán',
  highPriority: 'Ưu tiên cao',
  mediumPriority: 'Ưu tiên trung bình',
  lowPriority: 'Ưu tiên thấp',
  
  // OrderDetails.tsx - Customer Types
  vip: 'VIP',
  wholesale: 'Bán sỉ',
  business: 'Doanh nghiệp',
  retail: 'Bán lẻ',
  
  // Sale Type (Order Type - Retail/Wholesale)
  saleType: 'Loại bán hàng',
  retailOrder: 'Đơn bán lẻ',
  wholesaleOrder: 'Đơn bán sỉ',
  wholesalePricesApplied: 'Đã áp dụng giá sỉ',
  retailPricesApplied: 'Đã áp dụng giá lẻ',
  pricesUpdatedForSaleType: 'Giá sản phẩm đã được cập nhật theo loại bán hàng',
  
  // OrderDetails.tsx - Pick/Pack Activity
  pickingStarted: 'Bắt đầu lấy hàng',
  pickedItem: 'Đã lấy: {{product}}',
  pickingCompleted: 'Hoàn thành lấy hàng',
  packingStarted: 'Bắt đầu đóng gói',
  packed: 'Đã đóng gói',
  packedItem: 'Đã đóng gói: {{product}}',
  packingCompleted: 'Hoàn thành đóng gói',
  
  // OrderDetails.tsx - Timeline/Progress
  trackingInformation: 'Thông tin vận đơn',
  trackingUpdatesNotImplemented: 'Cập nhật vận đơn qua API (chưa triển khai)',
  trackingHash: 'Vận đơn #{{number}}',
  orderShippedTimeline: 'Đơn hàng đã gửi',
  readyToShipTimeline: 'Sẵn sàng gửi hàng',
  packingCompletedTimeline: 'Hoàn thành đóng gói',
  packingStartedTimeline: 'Bắt đầu đóng gói',
  pickingCompletedTimeline: 'Hoàn thành lấy hàng',
  pickingStartedTimeline: 'Bắt đầu lấy hàng',
  paymentReceived: 'Đã nhận thanh toán',
  orderCreatedTimeline: 'Đơn hàng đã tạo',
  duration: 'Thời lượng',
  awaitingShipment: 'Đang chờ gửi hàng',
  
  // OrderDetails.tsx - Actions & Dialogs
  edit: 'Sửa',
  export: 'Xuất',
  returnThisItem: 'Trả lại sản phẩm này',
  makeCustomPrice: 'Tạo giá tùy chỉnh',
  
  // OrderDetails.tsx - Picking Mode
  pickingProgress: 'Tiến trình lấy hàng',
  allItemsPickedReady: 'Đã lấy tất cả sản phẩm! Sẵn sàng gửi hàng.',
  markAllPicked: 'Đánh dấu tất cả đã lấy',
  clearAll: 'Xóa tất cả',
  returnUnpickedItems: 'Trả lại sản phẩm chưa lấy',
  
  // OrderDetails.tsx - Return Dialog
  returnQty: 'SL trả lại:',
  of: 'của',
  returnSummary: 'Tóm tắt trả hàng',
  returning: 'Đang trả lại',
  itemsWithTotal: 'sản phẩm với tổng số',
  units: 'đơn vị',
  totalReturnValue: 'Tổng giá trị trả lại:',
  
  // OrderDetails.tsx - Custom Price Dialog
  currentPrice: 'Giá hiện tại:',
  validToOptional: 'Có hiệu lực đến (Tùy chọn)',
  originalPrice: 'Giá gốc:',
  customPriceLabel: 'Giá tùy chỉnh:',
  priceComparison: 'So sánh giá',
  difference: 'Chênh lệch:',
  less: 'ít hơn',
  more: 'nhiều hơn',
  setForCustomer: 'Đặt giá tùy chỉnh cho {{product}} cho {{customer}}',
  
  // OrderDetails.tsx - Invoice Labels
  off: 'giảm',
  qtyColon: 'SL:',
  skuColon: 'SKU:',
  priceColon: 'Giá:',
  noteColon: 'Ghi chú:',
  
  // OrderDetails.tsx - Dialog Field Labels
  orderIdLabel: 'Mã đơn hàng',
  customerLabel: 'Khách hàng',
  orderDateLabel: 'Ngày đặt hàng',
  totalAmountLabel: 'Tổng tiền',
  totalAmount: 'Tổng tiền',
  
  // OrderDetails.tsx - Tickets
  noTicketsForOrder: 'Không có ticket nào cho đơn hàng này',
  viewAllTickets: 'Xem tất cả {{count}} tickets',
  
  // OrderDetails.tsx - Attachments
  attachments: 'Tệp đính kèm',
  viewAttachment: 'Xem tệp đính kèm',
  
  // OrderDetails.tsx - Misc Labels
  orderLink: 'Liên kết đơn hàng',
  message: 'Tin nhắn',
  loc: 'Vị trí:',
  shippingLabelCarrier: 'Nhãn vận chuyển - {{carrier}}',
  carrierUnknown: 'Không rõ',
  pplDobirka: 'PPL - Dobírka',
  dhlNachnahme: 'DHL - Nachnahme',
  
  // PickPack.tsx - Main Workflow
  
  // PickPack.tsx - Tab Labels
  
  // PickPack.tsx - Quick Actions Section
  quickActions: 'Thao tác nhanh',
  startNextPriorityOrder: 'Bắt đầu đơn ưu tiên tiếp theo',
  batchPickingMode: 'Chế độ lấy hàng hàng loạt',
  disableBatchMode: 'Tắt chế độ hàng loạt',
  optimizePickRoute: 'Tối ưu lộ trình lấy hàng',
  viewPerformanceStats: 'Xem thống kê hiệu suất',
  hideStats: 'Ẩn thống kê',
  
  // PickPack.tsx - Performance Statistics Dialog
  performanceStatistics: 'Thống kê hiệu suất',
  dailyTarget: 'Mục tiêu hàng ngày',
  efficiencyScore: 'Điểm hiệu suất',
  excellent: 'Xuất sắc',
  ordersTarget: '{{completed}} / {{target}} đơn',
  
  // PickPack.tsx - Today's Activity
  todaysActivity: 'Hoạt động hôm nay',
  noActivityTodayYet: 'Chưa có hoạt động hôm nay',
  activitiesWillAppear: 'Hoạt động sẽ hiển thị khi xử lý đơn hàng',
  
  // PickPack.tsx - Batch Picking
  batchPickingModeActive: 'Chế độ lấy hàng loạt đang bật',
  ordersSelected: '{{count}} đơn được chọn',
  clearSelection: 'Bỏ chọn',
  startBatchPick: 'Bắt đầu lấy hàng loạt ({{count}})',
  ordersReadyToPick: 'Đơn hàng sẵn sàng lấy ({{count}})',
  totalItemsAcrossOrders: '{{items}} sản phẩm trên {{orders}} đơn',
  totalItemsToPick: '{{items}} sản phẩm cần lấy',
  estimatedTime: '~{{hours}}h {{minutes}}p dự kiến',
  
  // PickPack.tsx - Order Actions
  startPicking: 'Bắt đầu lấy hàng',
  startPacking: 'Bắt đầu đóng gói',
  resumePicking: 'Tiếp tục lấy hàng',
  start: 'Bắt đầu',
  confirmShipment: 'Xác nhận giao vận',
  putOrderOnHold: 'Tạm giữ đơn hàng',
  putOnHold: 'Tạm giữ',
  cancelOrder: 'Hủy đơn hàng',
  sendBackToPick: 'Trả về lấy hàng',
  ship: 'Giao vận',
  shipAll: 'Giao vận tất cả',
  markAsShipped: 'Đánh dấu đã giao vận',
  markAllAsShipped: 'Đánh dấu tất cả đã giao vận',
  shipOrders: 'Giao vận {{count}}',
  
  // PickPack.tsx - Order States/Messages
  ordersBeingPicked: 'Đơn hàng đang lấy',
  readyForPacking: 'Sẵn sàng đóng gói',
  orderReady: 'đơn sẵn sàng',
  ordersReady: 'đơn sẵn sàng',
  noOrdersCurrentlyBeingPicked: 'Không có đơn hàng đang được lấy',
  noOrdersReadyForPacking: 'Không có đơn hàng sẵn sàng đóng gói',
  noOrdersReadyToShip: 'Không có đơn hàng sẵn sàng giao vận',
  noPendingOrdersToPick: 'Không có đơn hàng chờ lấy',
  noLabelGeneratedYet: 'Chưa tạo nhãn',
  thisTrackingAlreadyUsed: 'Mã vận đơn này đã được sử dụng bởi thùng khác',
  shippedOrdersFrom: 'Đã giao vận {{count}} đơn từ {{title}}',
  shipCount: 'Giao {{count}}',
  modified: 'Đã sửa',
  label: 'Nhãn',
  repackOrder: 'Đóng gói lại',
  returnToPacking: 'Trả về đóng gói',
  packedBy: 'Đóng gói bởi {{name}}',
  
  // PickPack.tsx - Carton & Packing
  cartonWithCount: 'Thùng ({{count}})',
  cartonOf: 'Thùng {{current}} / {{total}}',
  dhlNachnahmeWithCOD: 'DHL Nachnahme (COD)',
  recalculateCartonsTooltip: 'Tính lại thùng dựa trên sản phẩm hiện tại',
  
  // PickPack.tsx - Navigation & Controls
  focusBarcode: 'Focus Barcode',
  quickPickAllBundleItems: 'Lấy nhanh tất cả sản phẩm combo',
  shipTo: 'Gửi đến',
  noAddressProvided: 'Chưa có địa chỉ',
  goToThisItem: 'Đi tới sản phẩm này',
  close: 'Đóng',
  confirmShipmentAction: 'Xác nhận giao hàng',
  continuePicking: 'Tiếp tục lấy hàng',
  scan: 'Quét',
  done: 'Xong',
  resume: 'Tiếp tục',
  pause: 'Tạm dừng',
  esc: 'Esc',
  
  // PickPack.tsx - Time & Progress
  progress: 'Tiến độ',
  elapsed: 'Đã trôi qua',
  elapsedTime: 'Thời gian đã trôi',
  pickingTime: 'Thời gian lấy hàng',
  packingTime: 'Thời gian đóng gói',
  
  // PickPack.tsx - Details & Information
  details: 'Chi tiết',
  viewFullDetails: 'Xem chi tiết đầy đủ',
  adminAccessRequired: 'Yêu cầu quyền quản trị viên',
  specialHandling: 'XỬ LÝ ĐẶC BIỆT',
  shippingDetails: 'Chi tiết vận chuyển',
  shippedOrdersCount: 'Đã giao {{count}} đơn hàng',
  
  // PickPack.tsx - GLS/DHL Forms
  paket: 'Paket',
  paketAndPaymentDetails: 'Paket & Chi tiết thanh toán',
  paketgrosse: 'Paketgröße*',
  dobirka: 'Dobírka (COD)',
  iban: 'IBAN*',
  bic: 'BIC*',
  kontoinhaber: 'Kontoinhaber*',
  betragInEUR: 'Betrag in EUR*',
  verwendungszweck: 'Verwendungszweck*',
  adresszusatz: 'Adresszusatz',
  eMailDesEmpfangers: 'E-Mail des Empfängers*',
  eMailDesAbsenders: 'E-Mail des Absenders*',
  
  // PickPack.tsx - Shipping Label Actions
  updateTrackingFromBarcode: 'Cập nhật mã vận đơn từ barcode nhãn',
  creatingShippingLabel: 'Đang tạo nhãn vận chuyển từ PPL API',
  pplLabelCreatedSuccess: 'Nhãn vận chuyển PPL đã được tạo thành công',
  shippingLabelTitle: 'Nhãn vận chuyển - {{orderId}}',
  cartonDataPreservedCanRegenerate: 'Dữ liệu thùng đã được bảo toàn. Bạn có thể tạo lại nhãn nếu cần.',
  
  // PickPack.tsx - Dialogs
  confirmShipmentDialog: 'Bạn có chắc muốn đánh dấu đơn hàng này là đã giao vận?',
  confirmShipAllDialog: 'Bạn có chắc muốn đánh dấu tất cả {{count}} đơn hàng là đã giao vận?',
  resetOrderDialog: 'Thao tác này sẽ xóa tất cả số lượng đã lấy. Bạn có chắc chắn?',
  resetOrderDialogDetailed: 'Bạn có chắc muốn đặt lại đơn hàng này? Tất cả số lượng đã lấy sẽ bị xóa và bạn sẽ bắt đầu từ đầu.',
  putOnHoldDialog: 'Bạn có chắc muốn tạm giữ đơn hàng này?',
  putOnHoldDialogDetailed: 'Bạn có chắc muốn tạm giữ đơn hàng {{orderId}}? Đơn hàng sẽ bị tạm dừng và có thể tiếp tục sau.',
  cancelOrderDialog: 'Bạn có chắc muốn hủy đơn hàng này?',
  cancelOrderDialogDetailed: 'Bạn có chắc muốn hủy đơn hàng {{orderId}}? Thao tác này sẽ đánh dấu đơn hàng là đã hủy.',
  downloadPDF: 'Tải PDF',
  deleteAllLabelsConfirm: 'Xóa tất cả {{count}} nhãn vận chuyển?\\n\\nThao tác này sẽ hủy tất cả lô hàng với PPL. Dữ liệu thùng (trọng lượng, kích thước) sẽ được giữ lại.\\n\\nSau khi xóa, bạn có thể tạo lại nhãn bằng nút "Tạo tất cả nhãn".',
  deleteThisLabelConfirm: 'Xóa nhãn này?\\n\\nThao tác này sẽ hủy lô hàng với PPL. Dữ liệu thùng sẽ được giữ lại.',
  deleteLabelConfirmShort: 'Xóa nhãn #{{number}}?\\n\\nThao tác này sẽ hủy lô hàng với PPL.',
  
  // PickPack.tsx - Image & Visual Elements
  packingInstructionsImage: 'Hướng dẫn đóng gói',
  clickToExpand: 'Nhấp để mở rộng ảnh',
  hideBarcode: 'Ẩn máy quét barcode',
  showBarcode: 'Hiện máy quét barcode',
  clickToMarkVerified: 'Nhấp để đánh dấu tất cả đã xác minh',
  clickToUnverifyAll: 'Nhấp để bỏ xác minh tất cả',
  completePackingReadyForShipping: 'Hoàn tất đóng gói - Sẵn sàng vận chuyển',
  completeAllStepsToFinishPacking: 'Hoàn thành tất cả các bước để kết thúc đóng gói',
  
  // PickPack.tsx - Status & Totals
  date: 'Ngày:',
  totalCartons: 'Tổng số thùng:',
  totalLabels: 'Tổng số nhãn:',
  forMaterial: 'Cho: {{name}}',
  glsShippingLabelsCount: 'Nhãn vận chuyển GLS ({{count}})',
  pickedBy: 'Được lấy bởi {{name}}',
  trackingLabel: 'Theo dõi: {{number}}',
  forCartonNumber: 'Cho thùng #{{number}}',
  shippingLabelNumber: 'Nhãn vận chuyển #{{number}}',
  orderPrefix: 'Đơn hàng {{orderId}}',
  
  // PickPack.tsx - Notes & Instructions Headers
  packingInstructionsHeader: 'HƯỚNG DẪN ĐÓNG GÓI',
  
  // PickPack.tsx - Shipping Labels
  dhlShippingLabel: 'Nhãn vận chuyển DHL',
  
  // PickPack.tsx - Error Messages
  failedToUpdateTracking: 'Không thể cập nhật mã vận đơn',
  failedToCancelPPLLabels: 'Không thể hủy nhãn PPL',
  failedToDeletePPLLabels: 'Không thể xóa nhãn PPL',
  failedToGenerateLabels: 'Không thể tạo nhãn',
  
  // OrderDetails.tsx - Page Elements
  noTicketsForThisOrder: 'Không có ticket cho đơn hàng này',
  
  // AddOrder.tsx - Mobile Order Summary
  shippingMethod: 'Phương thức vận chuyển',
  subtotalColon: 'Tạm tính:',
  shippingColon: 'Vận chuyển:',
  taxWithRate: 'Thuế ({{rate}}%):',
  creatingOrder: 'Đang tạo...',
  
  // PickPack.tsx - Packing Mode Card Headers
  noPackingMaterialsSpecified: 'Không có vật liệu đóng gói cho đơn hàng này',
  recalculating: 'Đang tính lại...',
  recalculateAI: 'Tính lại AI',
  addAnotherCarton: 'Thêm thùng carton',
  documentsWithCount: 'Tài liệu ({{count}})',
  printAll: 'In tất cả',
  printingDots: 'Đang in...',
  allDocumentsMergedAndPrinted: 'Tất cả {{count}} tài liệu đã được gộp và đánh dấu đã in',
  glsMaxWeightInfo: 'Tối đa 40 kg • Chu vi + cạnh dài nhất tối đa 300 cm',
  
  // PickPack.tsx - DHL Shipping
  dhlShipping: 'Vận chuyển DHL',
  createLabelOnDhlWebsite: 'Tạo nhãn trên trang DHL',
  packageAndPaymentDetails: 'Thông tin kiện hàng & Thanh toán',
  packageSize: 'Kích thước gói',
  totalWeightRecommended: 'Tổng trọng lượng: {{weight}} kg → Đề xuất: Gói {{size}}',
  nachnahmeWithFee: 'Thu tiền khi giao (+8,99€)',
  nachnahmeDescription: 'Thanh toán có nên được thu khi giao hàng không?',
  bankDetailsNotConfigured: 'Thông tin ngân hàng chưa được cấu hình trong cài đặt',
  recipientAddress: 'Người nhận',
  frequentBuyerInAddressbook: 'Khách quen - Đã có trong sổ địa chỉ DHL',
  importantBicIbanNote: 'Quan trọng: Vui lòng nhập BIC và IBAN bằng chữ hoa (A-Z) và số (0-9).',
  
  // PickPack.tsx - GLS Shipping
  glsShippingWithCartons: 'Vận chuyển GLS ({{count}} {{cartonText}})',
  cartonSingular: 'thùng',
  additionalCartonsViaGls: 'Các thùng bổ sung gửi qua GLS để tiết kiệm chi phí',
  totalWeightKg: 'Tổng trọng lượng: {{weight}} kg',
  cartonNumberGls: 'Thùng #{{number}} (GLS)',
  
  // PickPack.tsx - PPL Shipping
  creatingLabels: 'Đang tạo nhãn...',
  generatePplLabels: 'Tạo nhãn PPL',
  retrieving: 'Đang lấy...',
  retryLabelDownload: 'Thử lại tải nhãn',
  shippingLabelsWithCount: 'Nhãn vận chuyển ({{count}})',
  
  // OrderTrackingPanel.tsx - Shipment Tracking
  shipmentTracking: 'Theo dõi Vận chuyển',
  noTrackingInfo: 'Không có thông tin theo dõi cho đơn hàng này',
  trackingDisabled: 'Theo dõi bị tắt. Bật trong Cài đặt để xem theo dõi vận chuyển.',
  loadingTrackingInfo: 'Đang tải thông tin theo dõi...',
  cartonTracked: '{{count}} thùng được theo dõi',
  cartonsTracked: '{{count}} thùng được theo dõi',
  trackingRefreshed: 'Đã Làm mới Theo dõi',
  trackingInfoUpdated: 'Thông tin theo dõi đã được cập nhật',
  refreshFailed: 'Làm mới Thất bại',
  failedToRefreshTracking: 'Không thể làm mới thông tin theo dõi',
  trackingHistory: 'Lịch sử Theo dõi',
  estimatedDelivery: 'Dự kiến Giao hàng',
  
} as const;

export default orders;
