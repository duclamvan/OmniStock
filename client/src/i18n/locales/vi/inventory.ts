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
  
  // Temperature Zones
  temperatureZone: 'Khu vực nhiệt độ',
  ambient: 'Nhiệt độ phòng',
  refrigerated: 'Làm lạnh',
  frozen: 'Đông lạnh',
  temperatureControlled: 'Kiểm soát nhiệt độ',
  
  // Quality Control
  qualityControl: 'Kiểm soát chất lượng',
  qcInspection: 'Kiểm tra chất lượng',
  inspectionRequired: 'Cần kiểm tra',
  inspectionStatus: 'Trạng thái kiểm tra',
  passed: 'Đạt',
  failed: 'Không đạt',
  quarantine: 'Cách ly',
  inspectedBy: 'Người kiểm tra',
  inspectionDate: 'Ngày kiểm tra',
  inspectionNotes: 'Ghi chú kiểm tra',
  
  // Batch/Lot Tracking
  batch: 'Lô',
  batchNumber: 'Số lô',
  batchTracking: 'Theo dõi theo lô',
  lot: 'Đợt',
  lotNumber: 'Số đợt',
  lotTracking: 'Theo dõi theo đợt',
  serialNumber: 'Số serial',
  serialTracking: 'Theo dõi serial',
  
  // Expiration & Dates
  expirationDate: 'Ngày hết hạn',
  manufacturingDate: 'Ngày sản xuất',
  bestBefore: 'Tốt nhất trước',
  useBy: 'Dùng trước',
  expirationAlert: 'Cảnh báo hết hạn',
  expirationAlertDays: 'Số ngày cảnh báo hết hạn',
  expiringSoon: 'Sắp hết hạn',
  trackExpiration: 'Theo dõi hết hạn',
  
  // Warehouse Locations Detailed
  binLocation: 'Vị trí ngăn',
  shelfLocation: 'Vị trí kệ',
  aisle: 'Lối đi',
  position: 'Vị trí',
  locationType: 'Loại vị trí',
  locationCode: 'Mã vị trí',
  locationCapacity: 'Sức chứa vị trí',
  availableCapacity: 'Sức chứa khả dụng',
  usedCapacity: 'Sức chứa đã dùng',
  
  // Bin & Zone Management
  binManagement: 'Quản lý ngăn',
  zoneManagement: 'Quản lý khu vực',
  addLocation: 'Thêm vị trí',
  editLocation: 'Sửa vị trí',
  assignLocation: 'Gán vị trí',
  suggestedLocation: 'Vị trí đề xuất',
  
  // Stock Adjustments Detailed
  adjustmentType: 'Loại điều chỉnh',
  adjustmentReason: 'Lý do điều chỉnh',
  adjustmentQuantity: 'Số lượng điều chỉnh',
  adjustmentDate: 'Ngày điều chỉnh',
  adjustedBy: 'Người điều chỉnh',
  adjustmentNotes: 'Ghi chú điều chỉnh',
  increaseStock: 'Tăng tồn kho',
  decreaseStock: 'Giảm tồn kho',
  
  // Measurement Units
  measurementUnit: 'Đơn vị đo',
  weightUnit: 'Đơn vị trọng lượng',
  lengthUnit: 'Đơn vị chiều dài',
  volumeUnit: 'Đơn vị thể tích',
  unit: 'Đơn vị',
  pieces: 'Cái',
  boxes: 'Hộp',
  pallets: 'Pallet',
  
  // Stock Status
  available: 'Khả dụng',
  reserved: 'Đã đặt trước',
  allocated: 'Đã phân bổ',
  inTransit: 'Đang vận chuyển',
  onHold: 'Tạm giữ',
  
  // Cycle Count
  cycleCount: 'Kiểm kê định kỳ',
  countSchedule: 'Lịch kiểm kê',
  startCount: 'Bắt đầu kiểm kê',
  completeCount: 'Hoàn tất kiểm kê',
  countedQuantity: 'Số lượng đếm được',
  systemQuantity: 'Số lượng hệ thống',
  variance: 'Chênh lệch',
  countNotes: 'Ghi chú kiểm kê',
  
  // Additional Operations
  replenishment: 'Bổ sung hàng',
  consolidation: 'Hợp nhất',
  crossDocking: 'Cross-docking',
  stockAllocation: 'Phân bổ tồn kho',
  stockReservation: 'Đặt trước tồn kho',
  
} as const;

export default inventory;
