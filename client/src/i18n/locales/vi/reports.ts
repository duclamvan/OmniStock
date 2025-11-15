const reports = {
  // Reports Overview
  reports: 'Báo cáo',
  reporting: 'Báo cáo',
  report: 'Báo cáo',
  reportsManagement: 'Quản lý báo cáo',
  generateReport: 'Tạo báo cáo',
  viewReport: 'Xem báo cáo',
  downloadReport: 'Tải báo cáo',
  printReport: 'In báo cáo',
  exportReport: 'Xuất báo cáo',
  scheduleReport: 'Lên lịch báo cáo',
  
  // Report Types
  salesReport: 'Báo cáo bán hàng',
  inventoryReport: 'Báo cáo tồn kho',
  orderReport: 'Báo cáo đơn hàng',
  shippingReport: 'Báo cáo vận chuyển',
  financialReport: 'Báo cáo tài chính',
  customerReport: 'Báo cáo khách hàng',
  productReport: 'Báo cáo sản phẩm',
  performanceReport: 'Báo cáo hiệu suất',
  analyticsReport: 'Báo cáo phân tích',
  customReport: 'Báo cáo tùy chỉnh',
  
  // Time Periods
  reportPeriod: 'Khoảng thời gian báo cáo',
  daily: 'Hàng ngày',
  weekly: 'Hàng tuần',
  monthly: 'Hàng tháng',
  quarterly: 'Hàng quý',
  yearly: 'Hàng năm',
  customPeriod: 'Khoảng tùy chỉnh',
  dateRange: 'Khoảng ngày',
  startDate: 'Ngày bắt đầu',
  endDate: 'Ngày kết thúc',
  today: 'Hôm nay',
  yesterday: 'Hôm qua',
  lastWeek: 'Tuần trước',
  lastMonth: 'Tháng trước',
  lastQuarter: 'Quý trước',
  lastYear: 'Năm trước',
  thisWeek: 'Tuần này',
  thisMonth: 'Tháng này',
  thisQuarter: 'Quý này',
  thisYear: 'Năm nay',
  
  // Report Metrics
  totalOrders: 'Tổng đơn hàng',
  totalSales: 'Tổng doanh số',
  totalRevenue: 'Tổng doanh thu',
  totalProfit: 'Tổng lợi nhuận',
  averageOrderValue: 'Giá trị đơn hàng trung bình',
  orderCount: 'Số lượng đơn hàng',
  itemsSold: 'Hàng đã bán',
  unitsShipped: 'Đơn vị đã giao',
  returnRate: 'Tỷ lệ trả hàng',
  fulfillmentRate: 'Tỷ lệ xử lý đơn',
  onTimeDelivery: 'Giao hàng đúng hạn',
  customerSatisfaction: 'Hài lòng khách hàng',
  
  // Inventory Metrics
  stockLevel: 'Mức tồn kho',
  stockValue: 'Giá trị tồn kho',
  lowStockItems: 'Hàng sắp hết',
  outOfStockItems: 'Hàng hết kho',
  overstockedItems: 'Hàng tồn dư',
  stockTurnover: 'Vòng quay tồn kho',
  inventoryAccuracy: 'Độ chính xác tồn kho',
  deadStock: 'Hàng tồn ế',
  slowMovingItems: 'Hàng luân chuyển chậm',
  fastMovingItems: 'Hàng luân chuyển nhanh',
  
  // Financial Metrics
  grossRevenue: 'Doanh thu gộp',
  netRevenue: 'Doanh thu ròng',
  grossProfit: 'Lợi nhuận gộp',
  netProfit: 'Lợi nhuận ròng',
  profitMargin: 'Biên lợi nhuận',
  costOfGoodsSold: 'Giá vốn hàng bán',
  operatingExpenses: 'Chi phí hoạt động',
  taxExpenses: 'Chi phí thuế',
  shippingCosts: 'Chi phí vận chuyển',
  returnCosts: 'Chi phí trả hàng',
  
  // Customer Metrics
  newCustomers: 'Khách hàng mới',
  returningCustomers: 'Khách hàng quay lại',
  customerRetention: 'Giữ chân khách hàng',
  customerLifetimeValue: 'Giá trị vòng đời khách hàng',
  customerAcquisitionCost: 'Chi phí thu hút khách hàng',
  averageOrdersPerCustomer: 'Đơn hàng trung bình mỗi khách',
  
  // Product Metrics
  topSellingProducts: 'Sản phẩm bán chạy',
  leastSellingProducts: 'Sản phẩm bán kém',
  productPerformance: 'Hiệu suất sản phẩm',
  productRevenue: 'Doanh thu sản phẩm',
  productProfit: 'Lợi nhuận sản phẩm',
  productViews: 'Lượt xem sản phẩm',
  conversionRate: 'Tỷ lệ chuyển đổi',
  
  // Report Formats
  format: 'Định dạng',
  pdf: 'PDF',
  excel: 'Excel',
  csv: 'CSV',
  json: 'JSON',
  
  // Report Scheduling
  schedule: 'Lịch trình',
  frequency: 'Tần suất',
  emailReport: 'Email báo cáo',
  recipients: 'Người nhận',
  sendNow: 'Gửi ngay',
  autoGenerate: 'Tự động tạo',
  nextRunDate: 'Ngày chạy tiếp theo',
  lastRunDate: 'Ngày chạy cuối',
  
  // Report Filters
  filters: 'Bộ lọc',
  applyFilters: 'Áp dụng bộ lọc',
  clearFilters: 'Xóa bộ lọc',
  filterByStatus: 'Lọc theo trạng thái',
  filterByCustomer: 'Lọc theo khách hàng',
  filterByProduct: 'Lọc theo sản phẩm',
  filterByWarehouse: 'Lọc theo kho',
  filterByCarrier: 'Lọc theo đơn vị vận chuyển',
  filterByPaymentMethod: 'Lọc theo phương thức thanh toán',
  
  // Report Actions
  refresh: 'Làm mới',
  compare: 'So sánh',
  compareWith: 'So sánh với',
  previousPeriod: 'Kỳ trước',
  samePeriodLastYear: 'Cùng kỳ năm ngoái',
  benchmark: 'Chuẩn mực',
  trend: 'Xu hướng',
  growth: 'Tăng trưởng',
  decline: 'Giảm sút',
  
  // Chart Types
  chartType: 'Loại biểu đồ',
  lineChart: 'Biểu đồ đường',
  barChart: 'Biểu đồ cột',
  pieChart: 'Biểu đồ tròn',
  areaChart: 'Biểu đồ vùng',
  table: 'Bảng',
  
  // Messages
  reportGenerated: 'Đã tạo báo cáo thành công',
  reportGenerationFailed: 'Tạo báo cáo thất bại',
  noDataAvailable: 'Không có dữ liệu',
  loadingReport: 'Đang tải báo cáo...',
  generatingReport: 'Đang tạo báo cáo...',
} as const;

export default reports;
