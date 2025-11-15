const shipping = {
  // Module Name
  shipping: 'Vận chuyển',
  shippingManagement: 'Quản lý vận chuyển',
  
  // Carriers (Keep brand names in English)
  carrier: 'Đơn vị vận chuyển',
  gls: 'GLS',
  ppl: 'PPL',
  dhl: 'DHL',
  dpd: 'DPD',
  ups: 'UPS',
  fedex: 'FedEx',
  
  // Shipping Fields
  shippingMethod: 'Phương thức vận chuyển',
  shippingCost: 'Phí vận chuyển',
  shippingAddress: 'Địa chỉ giao hàng',
  trackingNumber: 'Mã vận đơn',
  shippingLabel: 'Nhãn vận chuyển',
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
  
  // Messages
  shipmentCreated: 'Tạo đơn vận chuyển thành công',
  labelGenerated: 'Tạo nhãn vận chuyển thành công',
  trackingUpdated: 'Cập nhật thông tin vận đơn',
  
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
  cancelled: 'Đã hủy',
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
