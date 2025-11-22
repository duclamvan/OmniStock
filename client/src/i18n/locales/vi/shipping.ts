const shipping = {
  // Module Name
  shipping: 'Vận chuyển',
  shippingManagement: 'Quản lý vận chuyển',
  
  // Carriers (Keep brand names in English)
  carrier: 'Đơn vị vận chuyển',
  gls: 'GLS DE',
  ppl: 'PPL CZ',
  dhl: 'DHL DE',
  dpd: 'DPD',
  ups: 'UPS',
  fedex: 'FedEx',
  
  // Shipping Fields
  shippingMethod: 'Phương thức vận chuyển',
  shippingCost: 'Phí vận chuyển',
  shippingAddress: 'Địa chỉ giao hàng',
  trackingNumber: 'Mã vận đơn',
  trackingNumbers: 'Mã vận đơn',
  shippingLabel: 'Nhãn vận chuyển',
  shipmentLabels: 'Nhãn vận chuyển',
  estimatedDelivery: 'Thời gian giao hàng dự kiến',
  deliveryDate: 'Ngày giao hàng',
  
  // Shipping Status
  pendingShipment: 'Chờ giao hàng',
  readyToShip: 'Sẵn sàng giao hàng',
  inTransit: 'Đang vận chuyển',
  outForDelivery: 'Đang giao hàng',
  delivered: 'Đã giao hàng',
  failed: 'Giao hàng thất bại',
  returned: 'Hoàn trả',
  active: 'Đang hoạt động',
  cancelled: 'Đã hủy',
  
  // Package Details
  package: 'Kiện hàng',
  packages: 'Kiện hàng',
  packageWeight: 'Khối lượng kiện hàng',
  packageDimensions: 'Kích thước kiện hàng',
  carton: 'Thùng',
  cartons: 'Thùng',
  
  // Actions
  createShipment: 'Tạo đơn vận chuyển',
  generateLabel: 'Tạo nhãn',
  printLabel: 'In nhãn',
  trackShipment: 'Theo dõi vận đơn',
  view: 'Xem',
  viewLabel: 'Xem nhãn',
  cancel: 'Hủy',
  clear: 'Xóa',
  clearFilters: 'Xóa bộ lọc',
  saveAddress: 'Lưu địa chỉ',
  testConnection: 'Kiểm tra kết nối',
  createTestParcel: 'Tạo kiện hàng thử nghiệm',
  
  // Messages
  shipmentCreated: 'Tạo đơn vận chuyển thành công',
  labelGenerated: 'Tạo nhãn vận chuyển thành công',
  trackingUpdated: 'Cập nhật thông tin vận đơn',
  labelCancelled: 'Đã hủy nhãn',
  labelCancelledSuccess: 'Nhãn vận chuyển đã được hủy thành công.',
  addressSaved: 'Đã lưu địa chỉ',
  addressSavedSuccess: 'Địa chỉ người gửi mặc định đã được lưu thành công',
  pplAddressSavedSuccess: 'Địa chỉ người gửi PPL mặc định đã được lưu thành công',
  testParcelCreated: 'Tạo kiện hàng thử nghiệm',
  testParcelCreatedSuccess: 'Tạo kiện hàng thử nghiệm thành công. Mã vận đơn:',
  
  // Errors
  error: 'Lỗi',
  failedToCancelLabel: 'Không thể hủy nhãn vận chuyển',
  failedToSaveAddress: 'Không thể lưu địa chỉ',
  failedToCreateTestParcel: 'Không thể tạo kiện hàng thử nghiệm',
  validationError: 'Lỗi xác thực',
  fillAllRequiredFields: 'Vui lòng điền tất cả các trường bắt buộc (được đánh dấu *)',
  fillRequiredFields: 'Vui lòng điền đường, mã bưu điện và thành phố',
  fillIBANAndAccountHolder: 'Vui lòng điền IBAN và chủ tài khoản',
  connectionFailed: 'Kết nối thất bại',
  unableToConnectToPPL: 'Không thể kết nối với PPL API',
  pplConnectionFailed: 'Kết nối PPL thất bại',
  pplConnectionSuccess: 'Kết nối PPL thành công',
  pplConnectionError: 'Lỗi kết nối PPL',
  errorOccurredWhileTesting: 'Đã xảy ra lỗi khi kiểm tra kết nối PPL',
  failedToConnect: 'Không thể kết nối với PPL API',
  successfullyConnected: 'Kết nối thành công với PPL API',
  
  // Page Descriptions
  manageShippingLabels: 'Quản lý tất cả nhãn vận chuyển (PPL CZ, GLS DE, DHL DE) đã tạo cho đơn hàng',
  manageMultiCarrierShipping: 'Quản lý tích hợp vận chuyển đa nhà vận chuyển và kiểm tra kết nối API',
  
  // Table & List
  all: 'Tất cả',
  labels: 'Nhãn',
  showing: 'Hiển thị',
  of: 'trên',
  search: 'Tìm kiếm...',
  orderAndCustomer: 'Đơn hàng & Khách hàng',
  created: 'Đã tạo',
  actions: 'Hành động',
  batchId: 'Mã lô',
  
  // Loading & Empty States
  loadingLabels: 'Đang tải nhãn...',
  noShipmentLabelsFound: 'Không tìm thấy nhãn vận chuyển',
  testingConnection: 'Đang kiểm tra kết nối...',
  saving: 'Đang lưu...',
  creatingTestParcel: 'Đang tạo kiện hàng thử nghiệm...',
  
  // Dialogs
  cancelShipmentLabel: 'Hủy nhãn vận chuyển',
  cancelShipmentConfirmation: 'Bạn có chắc chắn muốn hủy nhãn vận chuyển này? Hành động này không thể hoàn tác và mã vận đơn sẽ không còn hiệu lực.',
  
  // Tabs
  connectionStatus: 'Trạng thái kết nối',
  connection: 'Kết nối',
  shippingInformation: 'Thông tin vận chuyển',
  shippingInfo: 'Thông tin vận chuyển',
  
  // Connection Status
  connected: 'Đã kết nối',
  disconnected: 'Chưa kết nối',
  provider: 'Nhà cung cấp',
  status: 'Trạng thái',
  response: 'Phản hồi',
  noConnectionTestYet: 'Chưa thực hiện kiểm tra kết nối. Nhấp vào nút bên dưới để kiểm tra.',
  unknownError: 'Đã xảy ra lỗi không xác định',
  
  // Carrier Descriptions
  czechParcelService: 'Dịch vụ Giao hàng Séc',
  
  // Address Form Fields
  name: 'Tên',
  firstName: 'Họ',
  lastName: 'Tên',
  company: 'Công ty',
  companyName: 'Tên công ty',
  companyName2: 'Công ty (name2)',
  street: 'Đường',
  streetAddress: 'Địa chỉ đường',
  streetName: 'Tên đường',
  houseNumber: 'Số nhà',
  city: 'Thành phố',
  zipCode: 'Mã bưu điện',
  postalCode: 'Mã bưu điện',
  country: 'Quốc gia',
  contact: 'Liên hệ',
  contactPersonName: 'Tên người liên hệ',
  phone: 'Điện thoại',
  email: 'Email',
  addressSupplement: 'Địa chỉ bổ sung',
  recipientName: 'Tên người nhận',
  yourName: 'Tên của bạn',
  
  // PPL Specific
  defaultPPLSenderAddress: 'Địa chỉ người gửi PPL CZ mặc định',
  setDefaultSenderAddress: 'Đặt địa chỉ người gửi mặc định (công ty của bạn) được sử dụng cho tất cả nhãn PPL CZ',
  saveDefaultAddress: 'Lưu địa chỉ mặc định',
  pplShipping: 'Vận chuyển PPL CZ',
  testLabelGenerationAndView: 'Thử nghiệm tạo nhãn và xem chi tiết tích hợp',
  testLabelGeneration: 'Thử nghiệm tạo nhãn',
  testAddress: 'Địa chỉ thử nghiệm',
  
  // GLS Specific
  glsDE: 'GLS DE',
  defaultGLSSenderAddress: 'Địa chỉ người gửi GLS DE mặc định',
  setGLSDefaultSenderAddress: 'Đặt địa chỉ người gửi mặc định được sử dụng cho tự động điền nhãn GLS DE qua bookmarklet',
  saveGLSSenderAddress: 'Lưu địa chỉ người gửi GLS',
  configureGLSSenderAddress: 'Cấu hình địa chỉ người gửi cho quy trình nhãn GLS thủ công',
  desktopHowToUseGLS: 'Desktop: Cách sử dụng tự động điền GLS',
  mobileAndroidSetup: 'Mobile (Android): Cài đặt Tampermonkey cho Kiwi Browser',
  glsAutofillExplanation: 'GLS Đức không cung cấp API doanh nghiệp cho vận chuyển khách hàng cá nhân. Phương pháp bookmarklet cho phép bạn tự động điền biểu mẫu web GLS với dữ liệu đơn hàng, tránh lỗi nhập liệu thủ công và tăng tốc quy trình vận chuyển của bạn.',
  glsManualWorkflow: 'Quy trình vận chuyển GLS thủ công:',
  
  // DHL Specific
  dhlDE: 'DHL DE',
  dhlDefaultSenderAddress: 'Địa chỉ người gửi DHL DE mặc định',
  saveDHLSenderAddress: 'Lưu địa chỉ người gửi DHL',
  dhlBankDetails: 'Thông tin ngân hàng DHL (cho COD/Nachnahme)',
  iban: 'IBAN',
  bic: 'BIC',
  accountHolder: 'Chủ tài khoản',
  saveBankDetails: 'Lưu thông tin ngân hàng',
  howToUseDHLManualShipping: 'Cách sử dụng vận chuyển DHL thủ công',
  saveYourSenderAddress: 'Lưu địa chỉ người gửi và thông tin ngân hàng ở trên',
  goToAnyOrder: 'Vào bất kỳ đơn hàng nào ở chế độ Pick & Pack',
  clickShipWithDHL: 'Nhấp "Ship with DHL" để xem thông tin vận chuyển',
  copyPrefilledInfo: 'Sao chép thông tin vận chuyển đã điền sẵn sang trang web DHL',
  createLabelsManually: 'Tạo nhãn thủ công trên cổng vận chuyển DHL',
  dhlManualShippingExplanation: 'Vận chuyển DHL thủ công cho phép bạn tạo nhãn thông qua cổng chính thức của DHL trong khi có tất cả thông tin vận chuyển được điền sẵn trong giao diện Pick & Pack của bạn để sao chép-dán nhanh chóng, giảm lỗi nhập dữ liệu thủ công.',
  dhlManualWorkflow: 'Quy trình vận chuyển DHL thủ công:',
  
  // Features
  features: 'Tính năng',
  whyThisApproach: 'Tại sao phương pháp này?',
  importantNotes: 'Lưu ý quan trọng',
  manualLabelWorkflow: 'Quy trình nhãn thủ công qua website',
  manualLabelWorkflowViaDHL: 'Quy trình nhãn thủ công qua website DHL',
  manualLabelWorkflowViaGLS: 'Quy trình nhãn thủ công qua website GLS',
  noAPIIntegrationRequired: 'Không cần tích hợp API',
  bookmarkletAutofill: 'Tự động điền bookmarklet cho desktop',
  tampermonkeyScriptForMobile: 'Script Tampermonkey cho mobile (Kiwi Browser)',
  affordableRates: 'Giá cả phải chăng từ €3.29 trong Đức',
  prefilledShippingInformation: 'Thông tin vận chuyển điền sẵn để sao chép-dán',
  codSupportWithBankDetails: 'Hỗ trợ COD (Nachnahme) với thông tin ngân hàng',
  reliableDelivery: 'Giao hàng đáng tin cậy trên khắp Đức và Châu Âu',
  
  // Workflow Steps
  labelsCreatedViaGLSWebsite: 'Nhãn được tạo qua website GLS',
  labelsCreatedViaDHLWebsite: 'Nhãn được tạo qua website DHL',
  bookmarkletAutoFills: 'Bookmarklet tự động điền dữ liệu người nhận',
  shippingInfoPrefilledForCopyPaste: 'Thông tin vận chuyển điền sẵn để sao chép-dán',
  bankDetailsStoredForCOD: 'Thông tin ngân hàng được lưu cho COD',
  oneTimeSetup: 'Cần cài đặt bookmarklet một lần',
  bestForGermanDomestic: 'Tốt nhất cho vận chuyển nội địa Đức',
  suitableForDomesticAndInternational: 'Phù hợp cho vận chuyển nội địa và quốc tế',
  
  // GLS Instructions
  glsDesktopStep1: 'Lưu địa chỉ người gửi ở trên',
  glsDesktopStep2: 'Vào bất kỳ đơn hàng nào và nhấp "Ship with GLS"',
  glsDesktopStep3: 'Làm theo hướng dẫn cài đặt bookmarklet một lần',
  glsDesktopStep4: 'Sử dụng bookmarklet để tự động điền biểu mẫu GLS bất cứ lúc nào',
  glsMobileNote: 'Lưu ý: Script mobile hoạt động giống như bookmarklet trên desktop nhưng chạy tự động khi bạn truy cập trang web GLS từ đơn hàng.',
  
  // Additional Carriers
  zasilkovna: 'Zásilkovna',
  cpExpress: 'CP Express',
  geis: 'Geis',
  toptrans: 'Toptrans',
  customCarrier: 'Đơn vị vận chuyển tùy chỉnh',
  
  // Tracking Statuses Detailed
  created: 'Đã tạo',
  confirmed: 'Đã xác nhận',
  pickedUp: 'Đã lấy hàng',
  inWarehouse: 'Tại kho',
  sorting: 'Đang phân loại',
  onRoute: 'Đang trên đường',
  nearbyHub: 'Tại hub gần',
  delivering: 'Đang giao',
  deliveryAttempted: 'Đã thử giao',
  awaitingPickup: 'Chờ lấy hàng',
  partiallyDelivered: 'Giao một phần',
  exception: 'Có vấn đề',
  delayed: 'Trễ hẹn',
  lost: 'Thất lạc',
  
  // Label Generation & Printing
  labelGeneration: 'Tạo nhãn',
  labelPrinting: 'In nhãn',
  printLabels: 'In nhãn',
  bulkPrintLabels: 'In hàng loạt nhãn',
  labelFormat: 'Định dạng nhãn',
  labelSize: 'Kích thước nhãn',
  a4Label: 'Nhãn A4',
  a5Label: 'Nhãn A5',
  thermalLabel: 'Nhãn nhiệt',
  customLabelSize: 'Kích thước nhãn tùy chỉnh',
  
  // Shipping Labels & Documents
  shippingLabels: 'Nhãn vận chuyển',
  packingSlip: 'Phiếu đóng gói',
  packingSlips: 'Phiếu đóng gói',
  commercialInvoice: 'Hóa đơn thương mại',
  customsDeclaration: 'Tờ khai hải quan',
  customsForm: 'Mẫu hải quan',
  exportDocuments: 'Chứng từ xuất khẩu',
  returnLabel: 'Nhãn trả hàng',
  proofOfDelivery: 'Bằng chứng giao hàng',
  deliveryReceipt: 'Biên nhận giao hàng',
  
  // Packing & Shipping Details
  packageNumber: 'Số kiện',
  numberOfPackages: 'Số lượng kiện hàng',
  totalWeight: 'Tổng trọng lượng',
  volumetricWeight: 'Trọng lượng thể tích',
  actualWeight: 'Trọng lượng thực',
  chargeableWeight: 'Trọng lượng tính phí',
  packageContents: 'Nội dung kiện hàng',
  packageValue: 'Giá trị kiện hàng',
  declaredValue: 'Giá trị khai báo',
  
  // Shipping Options
  shippingOptions: 'Tùy chọn vận chuyển',
  standardShipping: 'Vận chuyển tiêu chuẩn',
  expressShipping: 'Vận chuyển nhanh',
  overnightShipping: 'Vận chuyển qua đêm',
  economyShipping: 'Vận chuyển tiết kiệm',
  internationalShipping: 'Vận chuyển quốc tế',
  domesticShipping: 'Vận chuyển nội địa',
  freeShipping: 'Miễn phí vận chuyển',
  
  // Shipping Costs & Fees
  baseRate: 'Giá cơ bản',
  fuelSurcharge: 'Phụ phí nhiên liệu',
  remoteFee: 'Phí vùng xa',
  handlingFee: 'Phí xử lý',
  insuranceFee: 'Phí bảo hiểm',
  codFee: 'Phí COD',
  totalShippingCost: 'Tổng phí vận chuyển',
  estimatedCost: 'Chi phí ước tính',
  actualCost: 'Chi phí thực tế',
  
  // Tracking & Updates
  trackingHistory: 'Lịch sử vận đơn',
  trackingInfo: 'Thông tin theo dõi',
  trackingDetails: 'Chi tiết vận đơn',
  lastUpdate: 'Cập nhật cuối',
  statusUpdate: 'Cập nhật trạng thái',
  scanEvent: 'Sự kiện quét',
  trackingUrl: 'URL theo dõi',
  carrierTrackingUrl: 'URL theo dõi đơn vị vận chuyển',
  
  // Customs & International
  customsValue: 'Giá trị hải quan',
  customsDuties: 'Thuế hải quan',
  harmonizedCode: 'Mã HS',
  countryOfOrigin: 'Quốc gia xuất xứ',
  exportReason: 'Lý do xuất khẩu',
  commercialSale: 'Bán thương mại',
  gift: 'Quà tặng',
  sample: 'Mẫu hàng',
  return: 'Hoàn trả',
  
  // Delivery Options
  deliveryOptions: 'Tùy chọn giao hàng',
  homeDelivery: 'Giao tận nhà',
  pickupPoint: 'Điểm lấy hàng',
  lockerDelivery: 'Giao tại tủ khóa',
  signatureRequired: 'Yêu cầu chữ ký',
  leaveAtDoor: 'Để tại cửa',
  deliveryInstructions: 'Hướng dẫn giao hàng',
  preferredDeliveryTime: 'Thời gian giao hàng ưa thích',
  
  // Rate Shopping & Comparison
  getRates: 'Lấy giá',
  compareRates: 'So sánh giá',
  bestRate: 'Giá tốt nhất',
  cheapestOption: 'Tùy chọn rẻ nhất',
  fastestOption: 'Tùy chọn nhanh nhất',
  recommendedCarrier: 'Đơn vị vận chuyển được đề xuất',
  
  // Batch Operations
  batchShipping: 'Vận chuyển hàng loạt',
  bulkShipping: 'Vận chuyển số lượng lớn',
  multipleShipments: 'Nhiều đơn vận chuyển',
  consolidatedShipment: 'Đơn vận chuyển hợp nhất',
  
  // Returns & Refunds
  returnShipment: 'Vận chuyển trả hàng',
  returnRequest: 'Yêu cầu trả hàng',
  returnAuthorization: 'Ủy quyền trả hàng',
  returnTracking: 'Theo dõi hàng trả',
  refundShipping: 'Hoàn phí vận chuyển',
  
  // Shipping Zones
  shippingZone: 'Khu vực vận chuyển',
  zone1: 'Khu vực 1',
  zone2: 'Khu vực 2',
  zone3: 'Khu vực 3',
  domesticZone: 'Khu vực nội địa',
  internationalZone: 'Khu vực quốc tế',
  
  // Address Validation
  validateAddress: 'Xác thực địa chỉ',
  addressVerified: 'Địa chỉ đã xác thực',
  addressInvalid: 'Địa chỉ không hợp lệ',
  addressCorrected: 'Địa chỉ đã sửa',
  suggestedAddress: 'Địa chỉ đề xuất',
  
} as const;

export default shipping;
