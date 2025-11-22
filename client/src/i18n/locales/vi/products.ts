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
  
  // ProductForm - Form Sections
  imageSection: 'Hình ảnh sản phẩm',
  basicInfoSection: 'Thông tin cơ bản',
  stockSection: 'Tồn kho',
  pricingSection: 'Giá cả',
  supplierSection: 'Thông tin nhà cung cấp',
  variantsSection: 'Biến thể sản phẩm',
  packingSection: 'Hướng dẫn đóng gói',
  filesSection: 'Tệp đính kèm',
  
  // ProductForm - Basic Fields
  vietnameseName: 'Tên tiếng Việt',
  vietnameseNamePlaceholder: 'Nhập tên sản phẩm tiếng Việt',
  productNameRequired: 'Tên sản phẩm là bắt buộc',
  skuRequired: 'SKU là bắt buộc',
  descriptionPlaceholder: 'Nhập mô tả sản phẩm',
  selectCategory: 'Chọn danh mục',
  selectWarehouse: 'Chọn kho',
  warehouseLocation: 'Vị trí trong kho',
  warehouseLocationPlaceholder: 'vd: A1-5',
  selectSupplier: 'Chọn nhà cung cấp',
  
  // ProductForm - Stock Fields
  currentQuantity: 'Số lượng hiện tại',
  lowStockAlertHelp: 'Cảnh báo khi tồn kho thấp hơn con số này',
  
  // ProductForm - Pricing Fields
  priceUsd: 'Giá USD',
  priceVnd: 'Giá VND',
  priceCny: 'Giá CNY',
  salesPrice: 'Giá bán',
  importCost: 'Giá nhập',
  
  // ProductForm - Physical Attributes
  dimensionsCm: 'Kích thước (cm)',
  weightKg: 'Trọng lượng (kg)',
  lengthCm: 'Dài (cm)',
  widthCm: 'Rộng (cm)',
  heightCm: 'Cao (cm)',
  
  // ProductForm - Image Upload
  uploadProductImages: 'Tải lên hình ảnh sản phẩm',
  imagePurpose: 'Mục đích hình ảnh',
  setPrimary: 'Đặt làm chính',
  viewImage: 'Xem hình ảnh',
  imageUploaded: 'Đã tải lên hình ảnh',
  
  // Image Purpose Descriptions
  mainWmsImageDesc: 'Hình ảnh sản phẩm chính cho quản lý kho',
  inHandDesc: 'Sản phẩm cầm tay để tham khảo khi lấy/đóng gói',
  detailShotDesc: 'Chi tiết cận cảnh, kết cấu hoặc tính năng',
  packagingDesc: 'Bao bì và hộp sản phẩm',
  labelBarcodeDesc: 'Nhãn sản phẩm, mã vạch hoặc thẻ SKU',
  
  // ProductForm - Variants
  addVariantSeries: 'Thêm loạt biến thể',
  bulkScanBarcodes: 'Quét mã vạch hàng loạt',
  variantBarcode: 'Mã vạch',
  variantQuantity: 'Số lượng',
  variantImportCost: 'Giá nhập',
  noVariantsYet: 'Chưa có biến thể nào',
  variantImage: 'Hình ảnh biến thể',
  uploadVariantImage: 'Tải lên hình ảnh',
  
  // ProductForm - Series Input
  seriesInputLabel: 'Nhập loạt',
  seriesInputPlaceholder: 'vd: 001-005 hoặc 1,3,5',
  seriesInputHelp: 'Nhập khoảng (001-005) hoặc phân cách bằng dấu phẩy (1,3,5)',
  generateVariants: 'Tạo biến thể',
  
  // ProductForm - Bulk Scan
  bulkScanTitle: 'Quét mã vạch hàng loạt',
  bulkScanPlaceholder: 'Quét hoặc dán mã vạch (mỗi dòng một mã)',
  bulkScanHelp: 'Mỗi mã vạch sẽ tạo một biến thể mới',
  startScanning: 'Bắt đầu quét',
  stopScanning: 'Dừng quét',
  
  // ProductForm - Tiered Pricing
  addTieredPrice: 'Thêm giá theo số lượng',
  editTieredPrice: 'Sửa giá theo số lượng',
  deleteTieredPrice: 'Xóa giá theo số lượng',
  minQuantity: 'Số lượng tối thiểu',
  maxQuantity: 'Số lượng tối đa',
  priceType: 'Loại giá',
  tiered: 'Theo bậc',
  wholesale: 'Bán sỉ',
  noTieredPricing: 'Chưa thiết lập giá theo số lượng',
  
  // ProductForm - Packing
  packingMaterial: 'Vật liệu đóng gói',
  selectPackingMaterial: 'Chọn vật liệu đóng gói',
  packingInstructions: 'Hướng dẫn đóng gói',
  addPackingInstruction: 'Thêm hướng dẫn',
  packingInstructionText: 'Văn bản hướng dẫn',
  packingInstructionImage: 'Hình ảnh hướng dẫn',
  noPackingInstructions: 'Chưa có hướng dẫn đóng gói',
  
  // ProductForm - Buttons
  saveProduct: 'Lưu sản phẩm',
  updateProduct: 'Cập nhật sản phẩm',
  cancel: 'Hủy',
  add: 'Thêm',
  save: 'Lưu',
  delete: 'Xóa',
  close: 'Đóng',
  confirm: 'Xác nhận',
  expandAll: 'Mở rộng tất cả',
  collapseAll: 'Thu gọn tất cả',
  
  // ProductForm - Toast Messages
  productSaved: 'Lưu sản phẩm thành công',
  productSaveError: 'Không thể lưu sản phẩm',
  variantAdded: 'Thêm biến thể thành công',
  variantUpdated: 'Cập nhật biến thể thành công',
  variantDeleted: 'Xóa biến thể thành công',
  variantError: 'Không thể lưu biến thể',
  tieredPriceAdded: 'Thêm giá theo số lượng thành công',
  tieredPriceUpdated: 'Cập nhật giá theo số lượng thành công',
  tieredPriceDeleted: 'Xóa giá theo số lượng thành công',
  tieredPriceError: 'Không thể lưu giá theo số lượng',
  imageUploadSuccess: 'Tải lên hình ảnh thành công',
  imageUploadError: 'Không thể tải lên hình ảnh',
  imageDeleteSuccess: 'Xóa hình ảnh thành công',
  imageDeleteError: 'Không thể xóa hình ảnh',
  
  // ProductForm - Validation
  enterVariantName: 'Nhập tên biến thể',
  enterBarcode: 'Nhập mã vạch',
  enterQuantity: 'Nhập số lượng',
  enterPrice: 'Nhập giá',
  enterImportCost: 'Nhập giá nhập',
  enterSeriesInput: 'Nhập loạt',
  enterMinQuantity: 'Nhập số lượng tối thiểu',
  atLeastOnePrice: 'Phải chỉ định ít nhất một giá',
  invalidSeriesFormat: 'Định dạng loạt không hợp lệ',
  
  // ProductForm - Auto-conversion
  autoConverted: 'Tự động chuyển đổi từ {{from}}',
  currencyAutoConversion: 'Tự động chuyển đổi tiền tệ',
  conversionNote: 'Các tiền tệ khác sẽ tự động điền sau 1 giây',
  
  // ProductDetails - Tabs
  detailsTab: 'Chi tiết',
  variantsTab: 'Biến thể',
  imagesTab: 'Hình ảnh',
  filesTab: 'Tệp tin',
  historyTab: 'Lịch sử',
  locationsTab: 'Vị trí',
  
  // ProductDetails - Actions
  saveChanges: 'Lưu thay đổi',
  discardChanges: 'Hủy thay đổi',
  downloadInvoice: 'Tải hóa đơn',
  printLabel: 'In nhãn',
  
  // Search
  searchItems: 'Tìm kiếm sản phẩm...',
  searchProducts: 'Tìm kiếm sản phẩm...',
  
  // Variants - Extended
  variants: {
    addVariantButton: 'Thêm biến thể',
    uploadingImage: 'Đang tải lên...',
    addSeriesButton: 'Thêm loạt',
    addSeriesTitle: 'Thêm loạt biến thể',
    addSeriesDescription: 'Tạo nhiều biến thể sử dụng mẫu như "Kích thước <1-10>"',
    seriesPattern: 'Mẫu loạt',
    seriesPatternPlaceholder: 'vd: Kích thước <1-10> hoặc Màu <1-5>',
    seriesPatternHelp: 'Sử dụng <bắt đầu-kết thúc> để tạo loạt số',
    quantityPerVariant: 'Số lượng mỗi biến thể',
    variantPriceOptional: 'Giá biến thể (Tùy chọn)',
    variantPriceHelper: 'Để trống để sử dụng giá mặc định của sản phẩm. Nhập giá bằng bất kỳ loại tiền nào - các loại khác tự động chuyển đổi.',
    variantImportCostOptional: 'Giá nhập biến thể (Tùy chọn)',
    variantImportCostHelper: 'Để trống để sử dụng giá nhập mặc định của sản phẩm. Nhập giá bằng bất kỳ loại tiền nào - các loại khác tự động chuyển đổi.',
    priceCzk: 'Giá CZK',
    priceEur: 'Giá EUR',
    importCostUsd: 'Giá nhập USD',
    importCostCzk: 'Giá nhập CZK',
    importCostEur: 'Giá nhập EUR',
    optional: 'Tùy chọn',
    addVariantSeriesButton: 'Thêm loạt biến thể',
    bulkScanBarcodesButton: 'Quét mã vạch hàng loạt',
    deleteSelected: 'Xóa đã chọn',
    deleteVariantsTitle: 'Xóa biến thể',
    deleteVariantsConfirm: 'Bạn có chắc chắn muốn xóa {{count}} biến thể?',
    scanOrEnter: 'Quét hoặc nhập',
    noVariants: 'Chưa có biến thể nào',
    noVariantsHelper: 'Nhấn "Thêm biến thể" để tạo các biến thể sản phẩm',
    addVariantTitle: 'Thêm biến thể sản phẩm',
    addVariantDescription: 'Thêm biến thể mới với thuộc tính tùy chỉnh',
    tableHeaders: {
      image: 'Hình ảnh',
      name: 'Tên',
      barcode: 'Mã vạch',
      quantity: 'Số lượng',
      priceCzk: 'Giá CZK',
      priceEur: 'Giá EUR',
      importCostUsd: 'Giá nhập USD',
      importCostCzk: 'Giá nhập CZK',
      importCostEur: 'Giá nhập EUR',
    },
  },
  
  // Tiered Pricing - Extended
  tieredPricing: {
    title: 'Bảng giá theo số lượng',
    dialogDescription: 'Đặt giá theo số lượng cho sản phẩm này',
    addTier: 'Thêm bậc giá',
    updateButton: 'Cập nhật bậc',
    addButton: 'Thêm bậc',
    units: 'đơn vị',
    removeButton: 'Xóa bậc',
  },
  
  // Packing & Shipping
  packing: {
    title: 'Chi tiết đóng gói & vận chuyển',
    description: 'Kích thước, vật liệu và hướng dẫn xử lý',
    physicalSpecifications: 'Thông số vật lý',
    lengthCm: 'Dài (cm)',
    widthCm: 'Rộng (cm)',
    heightCm: 'Cao (cm)',
    weightKg: 'Trọng lượng (kg)',
    packingMaterials: 'Vật liệu đóng gói',
    handlingInstructions: 'Hướng dẫn xử lý',
  },
  
  // Files & Documents
  files: {
    title: 'Tệp và tài liệu sản phẩm',
    description: 'Tệp đính kèm và tài liệu',
    filesTitle: 'Tệp sản phẩm',
    filesDescription: 'Tài liệu và tệp có thể được đính kèm sau khi tạo sản phẩm. Bao gồm PDF, hình ảnh, thông số kỹ thuật và tài liệu khác.',
  },
  
  // Form Submission
  submit: {
    updating: 'Đang cập nhật...',
    creating: 'Đang tạo...',
    cancel: 'Hủy',
  },
  
  // Bulk Scan Dialog
  bulkScan: {
    title: 'Quét mã vạch hàng loạt',
    description: 'Quét mã vạch lần lượt. Chúng sẽ được tự động gán cho các biến thể chưa có mã vạch (từ đầu đến cuối).',
    scannedBarcodes: 'Mã vạch đã quét',
    placeholder: 'Quét hoặc dán mã vạch vào đây (mỗi dòng một mã)',
    helperText: 'Nhập mỗi mã vạch một dòng. Mã vạch sẽ được gán theo thứ tự cho các biến thể.',
    variantsWithoutBarcodes: 'biến thể chưa có mã vạch',
    barcodesEntered: 'mã vạch đã nhập',
    scannerReady: 'Máy quét sẵn sàng',
    scannerReadyDescription: 'Bắt đầu quét mã vạch. Nhấn Enter sau mỗi lần quét.',
    scanning: 'Đang quét...',
    startScanning: 'Bắt đầu quét',
    assignBarcodes: 'Gán mã vạch',
  },
  
  // Image Viewer
  imageViewer: {
    productImageAlt: 'Hình ảnh sản phẩm',
    close: 'Đóng',
    download: 'Tải xuống',
    downloadStarted: 'Bắt đầu tải xuống',
    downloadDescription: 'Hình ảnh của bạn đang được tải xuống.',
  },
  
  // Form Errors
  formErrors: {
    title: 'Lỗi xác thực biểu mẫu',
    invalidValue: 'Giá trị không hợp lệ',
  },
  
  // Warehouse Locations
  warehouseLocations: {
    title: 'Vị trí kho',
    infoMessage: 'Vị trí kho có thể được thêm sau khi tạo sản phẩm.',
  },
  
} as const;

export default products;
