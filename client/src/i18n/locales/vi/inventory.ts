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
  
  // AllInventory Page
  allInventory: 'Tất cả tồn kho',
  manageProductsDescription: 'Quản lý sản phẩm, mức tồn kho và theo dõi tồn kho',
  viewingArchive: 'Xem kho lưu trữ',
  viewingActive: 'Xem tồn kho đang hoạt động',
  
  // Actions - AllInventory
  addProduct: 'Thêm sản phẩm',
  exportToXLSX: 'Xuất Excel',
  exportToPDF: 'Xuất PDF',
  importFromExcel: 'Nhập từ Excel',
  showArchive: 'Hiện kho lưu trữ',
  showActive: 'Hiện đang hoạt động',
  toggleArchive: 'Chuyển kho lưu trữ',
  restoreProduct: 'Khôi phục sản phẩm',
  archiveProduct: 'Lưu trữ sản phẩm',
  editProduct: 'Sửa sản phẩm',
  deleteProduct: 'Xóa sản phẩm',
  columnSettings: 'Cài đặt cột',
  backToInventory: 'Quay lại tồn kho',
  
  // Search & Filters
  searchPlaceholder: 'Tìm kiếm sản phẩm theo tên, SKU hoặc mô tả...',
  filterByCategory: 'Lọc theo danh mục',
  allCategories: 'Tất cả danh mục',
  
  // Table Columns
  image: 'Hình ảnh',
  productColumn: 'Sản phẩm',
  category: 'Danh mục',
  qty: 'SL',
  quantity: 'Số lượng',
  unitsSold: 'Đã bán',
  lowStockAlert: 'Cảnh báo tồn kho thấp',
  priceEur: 'Giá EUR',
  priceCzk: 'Giá CZK',
  importCostUsd: 'Giá nhập USD',
  importCostCzk: 'Giá nhập CZK',
  importCostEur: 'Giá nhập EUR',
  sku: 'SKU',
  barcode: 'Mã vạch',
  supplier: 'Nhà cung cấp',
  status: 'Trạng thái',
  actions: 'Thao tác',
  name: 'Tên',
  
  // Product Status Badges
  active: 'Đang hoạt động',
  inactive: 'Không hoạt động',
  inStock: 'Còn hàng',
  warning: 'Cảnh báo',
  new: 'Mới',
  restocked: 'Đã nhập thêm',
  
  // Toast Messages - Success
  success: 'Thành công',
  error: 'Lỗi',
  productUpdatedSuccess: 'Cập nhật sản phẩm thành công',
  productDeletedSuccess: 'Đã đánh dấu sản phẩm không hoạt động',
  productRestoredSuccess: 'Khôi phục sản phẩm thành công',
  productArchivedSuccess: 'Đã chuyển sản phẩm vào kho lưu trữ',
  exportSuccessXLSX: 'Đã xuất {{count}} sản phẩm ra XLSX',
  exportSuccessPDF: 'Đã xuất {{count}} sản phẩm ra PDF',
  exportSuccessful: 'Xuất dữ liệu thành công',
  importSuccessful: 'Nhập dữ liệu thành công',
  importSuccess: 'Nhập thành công {{count}} sản phẩm',
  
  // Toast Messages - Errors
  loadError: 'Không thể tải sản phẩm',
  updateError: 'Không thể cập nhật sản phẩm',
  deleteError: 'Không thể xóa sản phẩm',
  deleteErrorReferenced: 'Không thể xóa sản phẩm - sản phẩm đang được sử dụng trong đơn hàng',
  restoreError: 'Không thể khôi phục sản phẩm',
  archiveError: 'Không thể lưu trữ sản phẩm',
  noDataToExport: 'Không có dữ liệu để xuất',
  noProductsToExport: 'Không có sản phẩm để xuất',
  exportFailed: 'Xuất dữ liệu thất bại',
  exportFailedXLSX: 'Không thể xuất ra XLSX',
  exportFailedPDF: 'Không thể xuất ra PDF',
  importFailed: 'Nhập dữ liệu thất bại',
  
  // Import Messages
  importCompletedWithErrors: 'Nhập hoàn tất nhưng có lỗi',
  importSuccessWithErrors: 'Đã nhập {{successCount}} sản phẩm, {{errorCount}} lỗi. Xem console để biết chi tiết.',
  importFailedExcel: 'Không thể nhập tệp Excel',
  noDataFound: 'Không tìm thấy dữ liệu',
  excelFileEmpty: 'Tệp Excel trống',
  rowSkipped: 'Bỏ qua dòng: Thiếu tên hoặc SKU',
  
  // Column Visibility
  showColumn: 'Hiện {{column}}',
  hideColumn: 'Ẩn {{column}}',
  visibleColumns: 'Các cột hiển thị',
  
  // Empty States
  noProducts: 'Không tìm thấy sản phẩm',
  noProductsDescription: 'Thêm sản phẩm đầu tiên để bắt đầu',
  noProductsInCategory: 'Không có sản phẩm trong danh mục này',
  
  // Additional AllInventory Page
  archivedProducts: 'Sản phẩm đã lưu trữ',
  viewActiveProducts: 'Xem sản phẩm hoạt động',
  viewArchive: 'Xem kho lưu trữ',
  searchProducts: 'Tìm kiếm sản phẩm...',
  exportFormat: 'Định dạng xuất',
  exportAsXLSX: 'Xuất dạng XLSX',
  exportAsPDF: 'Xuất dạng PDF',
  importXLS: 'Nhập XLS',
  toggleColumns: 'Cột',
  basicInfo: 'Thông tin cơ bản',
  stockInfo: 'Tồn kho',
  pricingInfo: 'Giá cả',
  otherInfo: 'Khác',
  
  // Bulk Actions
  restoreSelected: 'Khôi phục đã chọn',
  updateStock: 'Cập nhật tồn kho',
  bulkUpdate: 'Cập nhật hàng loạt',
  moveToArchive: 'Chuyển vào lưu trữ',
  partialSuccess: 'Thành công một phần',
  export: 'Xuất',
  
  // Over/Under Allocated
  overAllocatedInventory: 'Tồn kho phân bổ vượt mức',
  overAllocatedMessage: '{{count}} {{items}} có số lượng đặt hàng nhiều hơn số lượng khả dụng',
  item: 'mục có',
  items: 'mục có',
  viewResolveIssues: 'Xem & Giải quyết vấn đề',
  underAllocatedInventory: 'Tồn kho phân bổ thiếu',
  underAllocatedMessage: '{{count}} {{items}} có số lượng trong hồ sơ nhiều hơn tại vị trí kho',
  
  // Stats Cards
  totalProducts: 'Tổng sản phẩm',
  totalValue: 'Tổng giá trị',
  products: 'sản phẩm',
  itemsCount: 'mục',
  
  // Filters
  filtersSearch: 'Bộ lọc & Tìm kiếm',
  
} as const;

export default inventory;
