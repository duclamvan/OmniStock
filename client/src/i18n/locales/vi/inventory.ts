const inventory = {
  // Module Name
  inventory: 'Tồn kho',
  stockManagement: 'Quản lý tồn kho',
  
  // Actions
  receiveStock: 'Nhập kho',
  adjustStock: 'Điều chỉnh tồn kho',
  transferStock: 'Chuyển kho',
  stockCount: 'Kiểm kê',
  
  // Inventory Fields
  stockLevel: 'Mức tồn kho',
  availableStock: 'Tồn kho khả dụng',
  reservedStock: 'Tồn kho đã đặt',
  incomingStock: 'Hàng đang về',
  stockValue: 'Giá trị tồn kho',
  lowStock: 'Tồn kho thấp',
  outOfStock: 'Hết hàng',
  overstock: 'Tồn kho dư thừa',
  
  // Warehouse Operations
  receiving: 'Nhập kho',
  putaway: 'Cất hàng',
  picking: 'Lấy hàng',
  packing: 'Đóng gói',
  shipping: 'Xuất hàng',
  inbound: 'Nhập kho',
  outbound: 'Xuất kho',
  
  // Stock Movements
  stockIn: 'Nhập kho',
  stockOut: 'Xuất kho',
  stockAdjustment: 'Điều chỉnh tồn kho',
  stockTransfer: 'Chuyển kho',
  
  // Reasons
  adjustment: 'Điều chỉnh',
  damaged: 'Hư hỏng',
  lost: 'Thất lạc',
  found: 'Tìm thấy',
  returned: 'Hoàn trả',
  expired: 'Hết hạn',
  sold: 'Đã bán',
  
  // Location
  warehouse: 'Kho hàng',
  location: 'Vị trí',
  bin: 'Ngăn',
  zone: 'Khu vực',
  rack: 'Giá',
  shelf: 'Kệ',
  
  // Messages
  stockUpdated: 'Cập nhật tồn kho thành công',
  stockReceived: 'Nhập kho thành công',
  adjustmentSaved: 'Lưu điều chỉnh tồn kho thành công',
  
} as const;

export default inventory;
