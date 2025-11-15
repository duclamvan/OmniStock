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
  
} as const;

export default shipping;
