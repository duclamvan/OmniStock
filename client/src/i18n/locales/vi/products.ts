const products = {
  // Module Name
  products: 'Sản phẩm',
  product: 'Sản phẩm',
  productManagement: 'Quản lý sản phẩm',
  
  // Actions
  addProduct: 'Thêm sản phẩm',
  editProduct: 'Chỉnh sửa sản phẩm',
  viewProduct: 'Xem sản phẩm',
  deleteProduct: 'Xóa sản phẩm',
  
  // Product Fields
  productName: 'Tên sản phẩm',
  productCode: 'Mã sản phẩm',
  sku: 'SKU',
  barcode: 'Barcode',
  description: 'Mô tả',
  category: 'Danh mục',
  brand: 'Thương hiệu',
  supplier: 'Nhà cung cấp',
  
  // Pricing
  costPrice: 'Giá nhập',
  sellingPrice: 'Giá bán',
  retailPrice: 'Giá bán lẻ',
  wholesalePrice: 'Giá bán sỉ',
  margin: 'Lợi nhuận',
  markup: 'Tỷ suất lợi nhuận',
  
  // Product Details
  weight: 'Khối lượng',
  dimensions: 'Kích thước',
  length: 'Dài',
  width: 'Rộng',
  height: 'Cao',
  volume: 'Thể tích',
  color: 'Màu sắc',
  size: 'Kích cỡ',
  
  // Product Types
  regular: 'Thông thường',
  bundle: 'Combo',
  service: 'Dịch vụ',
  variant: 'Biến thể',
  
  // Stock
  stockQty: 'Số lượng tồn kho',
  minStock: 'Tồn kho tối thiểu',
  maxStock: 'Tồn kho tối đa',
  reorderPoint: 'Điểm đặt hàng lại',
  
  // Product Status
  inStock: 'Còn hàng',
  lowStock: 'Tồn kho thấp',
  outOfStock: 'Hết hàng',
  discontinued: 'Ngừng kinh doanh',
  
  // Messages
  productCreated: 'Tạo sản phẩm thành công',
  productUpdated: 'Cập nhật sản phẩm thành công',
  productDeleted: 'Xóa sản phẩm thành công',
  
  // Product Variants
  variants: 'Biến thể',
  productVariant: 'Biến thể sản phẩm',
  variantName: 'Tên biến thể',
  variantOptions: 'Tùy chọn biến thể',
  addVariant: 'Thêm biến thể',
  editVariant: 'Sửa biến thể',
  deleteVariant: 'Xóa biến thể',
  variantSku: 'SKU biến thể',
  variantPrice: 'Giá biến thể',
  variantStock: 'Tồn kho biến thể',
  
  // Bundles
  bundles: 'Combo',
  bundleItems: 'Sản phẩm trong combo',
  addBundle: 'Thêm combo',
  bundlePrice: 'Giá combo',
  bundleDiscount: 'Giảm giá combo',
  bundleComponents: 'Thành phần combo',
  
  // Product Images
  images: 'Hình ảnh',
  productImage: 'Hình ảnh sản phẩm',
  mainImage: 'Hình ảnh chính',
  additionalImages: 'Hình ảnh bổ sung',
  uploadImage: 'Tải lên hình ảnh',
  removeImage: 'Xóa hình ảnh',
  imageUrl: 'URL hình ảnh',
  thumbnail: 'Hình thu nhỏ',
  
  // Packaging Requirements
  packaging: 'Đóng gói',
  packagingType: 'Loại đóng gói',
  packagingMaterial: 'Vật liệu đóng gói',
  packagingRequirements: 'Yêu cầu đóng gói',
  fragile: 'Dễ vỡ',
  perishable: 'Dễ hỏng',
  hazardous: 'Nguy hiểm',
  requiresRefrigeration: 'Cần làm lạnh',
  
  // Dimensions & Weight Detailed
  productDimensions: 'Kích thước sản phẩm',
  productWeight: 'Trọng lượng sản phẩm',
  netWeight: 'Trọng lượng ròng',
  grossWeight: 'Trọng lượng gộp',
  volumetricWeight: 'Trọng lượng thể tích',
  cubicVolume: 'Thể tích khối',
  
  // Product Categories
  categories: 'Danh mục',
  mainCategory: 'Danh mục chính',
  subCategory: 'Danh mục phụ',
  productCategory: 'Danh mục sản phẩm',
  categoryName: 'Tên danh mục',
  addCategory: 'Thêm danh mục',
  editCategory: 'Sửa danh mục',
  deleteCategory: 'Xóa danh mục',
  
  // SKU Generation
  generateSku: 'Tạo SKU',
  autoGenerateSku: 'Tự động tạo SKU',
  skuPattern: 'Mẫu SKU',
  skuPrefix: 'Tiền tố SKU',
  customSku: 'SKU tùy chỉnh',
  
  // Product Attributes
  attributes: 'Thuộc tính',
  productAttributes: 'Thuộc tính sản phẩm',
  material: 'Chất liệu',
  manufacturer: 'Nhà sản xuất',
  origin: 'Xuất xứ',
  model: 'Mẫu mã',
  specifications: 'Thông số kỹ thuật',
  
  // Product Status Extended
  active: 'Hoạt động',
  inactive: 'Không hoạt động',
  draft: 'Bản nháp',
  archived: 'Lưu trữ',
  pending: 'Đang chờ',
  approved: 'Đã duyệt',
  
  // Pricing Extended
  basePrice: 'Giá cơ sở',
  salePrice: 'Giá khuyến mãi',
  memberPrice: 'Giá thành viên',
  minPrice: 'Giá tối thiểu',
  maxPrice: 'Giá tối đa',
  priceRange: 'Khoảng giá',
  profitMargin: 'Biên lợi nhuận',
  
  // Inventory Integration
  trackInventory: 'Theo dõi tồn kho',
  inventoryManagement: 'Quản lý tồn kho',
  stockTracking: 'Theo dõi hàng tồn',
  lowStockThreshold: 'Ngưỡng tồn kho thấp',
  reorderLevel: 'Mức đặt hàng lại',
  optimalStock: 'Tồn kho tối ưu',
  
  // Product History
  priceHistory: 'Lịch sử giá',
  stockHistory: 'Lịch sử tồn kho',
  updateHistory: 'Lịch sử cập nhật',
  changeLog: 'Nhật ký thay đổi',
  
  // Tags & Labels
  tags: 'Thẻ',
  productTags: 'Thẻ sản phẩm',
  labels: 'Nhãn',
  productLabels: 'Nhãn sản phẩm',
  featured: 'Nổi bật',
  newArrival: 'Hàng mới',
  bestseller: 'Bán chạy',
  onSale: 'Đang giảm giá',
  
  // ProductDetails Page
  productDetails: 'Chi tiết sản phẩm',
  backToProducts: 'Quay lại danh sách',
  editProductButton: 'Chỉnh sửa sản phẩm',
  recalculateReorderRate: 'Tính lại tỷ lệ đặt hàng',
  reorderRateSuccess: 'Tính toán tỷ lệ đặt hàng thành công',
  reorderRateError: 'Tính toán tỷ lệ đặt hàng thất bại',
  
  // Image Purpose Labels
  mainWmsImage: 'Ảnh chính WMS',
  inHand: 'Ảnh cầm tay',
  detailShot: 'Ảnh chi tiết',
  packagingLabel: 'Đóng gói',
  labelBarcode: 'Nhãn/Barcode',
  
  // Product Info Sections
  basicInformation: 'Thông tin cơ bản',
  pricingInformation: 'Thông tin giá',
  inventoryInformation: 'Thông tin tồn kho',
  physicalAttributes: 'Thuộc tính vật lý',
  packagingInfo: 'Thông tin đóng gói',
  costHistory: 'Lịch sử giá nhập',
  tieredPricing: 'Bảng giá theo số lượng',
  productLocations: 'Vị trí sản phẩm',
  productFiles: 'Tệp đính kèm',
  productImages: 'Hình ảnh sản phẩm',
  bundleInformation: 'Thông tin combo',
  
  // Table Headers
  quantityRange: 'Khoảng số lượng',
  pricePerUnit: 'Đơn giá',
  effectiveDate: 'Ngày hiệu lực',
  oldCost: 'Giá cũ',
  newCost: 'Giá mới',
  
} as const;

export default products;
