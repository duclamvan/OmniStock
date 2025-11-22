const products = {
  // Module Name
  products: 'Products',
  product: 'Product',
  productManagement: 'Product Management',
  
  // Actions
  addProduct: 'Add Product',
  editProduct: 'Edit Product',
  viewProduct: 'View Product',
  deleteProduct: 'Delete Product',
  
  // Product Fields
  productName: 'Product Name',
  productCode: 'Product Code',
  sku: 'SKU',
  barcode: 'Barcode',
  description: 'Description',
  category: 'Category',
  brand: 'Brand',
  supplier: 'Supplier',
  
  // Pricing
  costPrice: 'Cost Price',
  sellingPrice: 'Selling Price',
  retailPrice: 'Retail Price',
  wholesalePrice: 'Wholesale Price',
  margin: 'Margin',
  markup: 'Markup',
  
  // Product Details
  weight: 'Weight',
  dimensions: 'Dimensions',
  length: 'Length',
  width: 'Width',
  height: 'Height',
  volume: 'Volume',
  color: 'Color',
  size: 'Size',
  
  // Product Types
  regular: 'Regular',
  bundle: 'Bundle',
  service: 'Service',
  variant: 'Variant',
  
  // Stock
  stockQty: 'Stock Quantity',
  minStock: 'Minimum Stock',
  maxStock: 'Maximum Stock',
  reorderPoint: 'Reorder Point',
  
  // Product Status
  inStock: 'In Stock',
  lowStock: 'Low Stock',
  outOfStock: 'Out of Stock',
  discontinued: 'Discontinued',
  
  // Messages
  productCreated: 'Product created successfully',
  productUpdated: 'Product updated successfully',
  productDeleted: 'Product deleted successfully',
  
  // ProductDetails Page
  productDetails: 'Product Details',
  backToProducts: 'Back to Products',
  editProductButton: 'Edit Product',
  recalculateReorderRate: 'Recalculate Reorder Rate',
  reorderRateSuccess: 'Reorder rate recalculated successfully',
  reorderRateError: 'Failed to recalculate reorder rate',
  
  // Image Purpose Labels
  mainWmsImage: 'Main WMS Image',
  inHand: 'In Hand',
  detailShot: 'Detail Shot',
  packagingLabel: 'Packaging',
  labelBarcode: 'Label/Barcode',
  
  // Product Info Sections
  basicInformation: 'Basic Information',
  pricingInformation: 'Pricing Information',
  inventoryInformation: 'Inventory Information',
  physicalAttributes: 'Physical Attributes',
  packagingInfo: 'Packaging Information',
  costHistory: 'Cost History',
  tieredPricing: 'Tiered Pricing',
  productLocations: 'Product Locations',
  productFiles: 'Product Files',
  productImages: 'Product Images',
  bundleInformation: 'Bundle Information',
  
  // Table Headers
  quantityRange: 'Quantity Range',
  pricePerUnit: 'Price per Unit',
  effectiveDate: 'Effective Date',
  oldCost: 'Old Cost',
  newCost: 'New Cost',
  
  // ProductForm - Form Sections
  imageSection: 'Product Images',
  basicInfoSection: 'Basic Information',
  stockSection: 'Stock & Inventory',
  pricingSection: 'Pricing',
  supplierSection: 'Supplier Information',
  variantsSection: 'Product Variants',
  packingSection: 'Packing Instructions',
  filesSection: 'Product Files',
  
  // ProductForm - Basic Fields
  vietnameseName: 'Vietnamese Name',
  vietnameseNamePlaceholder: 'Enter Vietnamese product name',
  productNameRequired: 'Product name is required',
  skuRequired: 'SKU is required',
  descriptionPlaceholder: 'Enter product description',
  selectCategory: 'Select Category',
  selectWarehouse: 'Select Warehouse',
  warehouseLocation: 'Warehouse Location',
  warehouseLocationPlaceholder: 'e.g., A1-5',
  selectSupplier: 'Select Supplier',
  
  // ProductForm - Stock Fields
  currentQuantity: 'Current Quantity',
  lowStockThreshold: 'Low Stock Threshold',
  lowStockAlertHelp: 'Alert when stock falls below this number',
  
  // ProductForm - Pricing Fields
  priceUsd: 'Price USD',
  priceVnd: 'Price VND',
  priceCny: 'Price CNY',
  salesPrice: 'Sales Price',
  importCost: 'Import Cost',
  
  // ProductForm - Physical Attributes
  dimensionsCm: 'Dimensions (cm)',
  weightKg: 'Weight (kg)',
  lengthCm: 'Length (cm)',
  widthCm: 'Width (cm)',
  heightCm: 'Height (cm)',
  
  // ProductForm - Image Upload
  uploadProductImages: 'Upload Product Images',
  imagePurpose: 'Image Purpose',
  setPrimary: 'Set as Primary',
  removeImage: 'Remove Image',
  viewImage: 'View Image',
  imageUploaded: 'Image uploaded',
  
  // Image Purpose Descriptions
  mainWmsImageDesc: 'Primary product image for warehouse management',
  inHandDesc: 'Product held in hand for picking/packing reference',
  detailShotDesc: 'Close-up details, texture, or features',
  packagingDesc: 'Product packaging and box',
  labelBarcodeDesc: 'Product label, barcode, or SKU tag',
  
  // ProductForm - Variants
  addVariant: 'Add Variant',
  addVariantSeries: 'Add Variant Series',
  bulkScanBarcodes: 'Bulk Scan Barcodes',
  variantName: 'Variant Name',
  variantBarcode: 'Barcode',
  variantQuantity: 'Quantity',
  variantPrice: 'Price',
  variantImportCost: 'Import Cost',
  editVariant: 'Edit Variant',
  deleteVariant: 'Delete Variant',
  noVariantsYet: 'No variants added yet',
  variantImage: 'Variant Image',
  uploadVariantImage: 'Upload Image',
  
  // ProductForm - Series Input
  seriesInputLabel: 'Series Input',
  seriesInputPlaceholder: 'e.g., 001-005 or 1,3,5',
  seriesInputHelp: 'Enter range (001-005) or comma-separated (1,3,5)',
  generateVariants: 'Generate Variants',
  
  // ProductForm - Bulk Scan
  bulkScanTitle: 'Bulk Scan Barcodes',
  bulkScanPlaceholder: 'Scan or paste barcodes (one per line)',
  bulkScanHelp: 'Each barcode will create a new variant',
  startScanning: 'Start Scanning',
  stopScanning: 'Stop Scanning',
  
  // ProductForm - Tiered Pricing
  addTieredPrice: 'Add Tiered Price',
  editTieredPrice: 'Edit Tiered Price',
  deleteTieredPrice: 'Delete Tiered Price',
  minQuantity: 'Min Quantity',
  maxQuantity: 'Max Quantity',
  priceType: 'Price Type',
  tiered: 'Tiered',
  wholesale: 'Wholesale',
  noTieredPricing: 'No tiered pricing set up yet',
  
  // ProductForm - Packing
  packingMaterial: 'Packing Material',
  selectPackingMaterial: 'Select Packing Material',
  packingInstructions: 'Packing Instructions',
  addPackingInstruction: 'Add Instruction',
  packingInstructionText: 'Instruction Text',
  packingInstructionImage: 'Instruction Image',
  noPackingInstructions: 'No packing instructions yet',
  
  // ProductForm - Buttons
  saveProduct: 'Save Product',
  updateProduct: 'Update Product',
  cancel: 'Cancel',
  add: 'Add',
  save: 'Save',
  delete: 'Delete',
  close: 'Close',
  confirm: 'Confirm',
  expandAll: 'Expand All',
  collapseAll: 'Collapse All',
  
  // ProductForm - Toast Messages
  productSaved: 'Product saved successfully',
  productSaveError: 'Failed to save product',
  variantAdded: 'Variant added successfully',
  variantUpdated: 'Variant updated successfully',
  variantDeleted: 'Variant deleted successfully',
  variantError: 'Failed to save variant',
  tieredPriceAdded: 'Tiered price added successfully',
  tieredPriceUpdated: 'Tiered price updated successfully',
  tieredPriceDeleted: 'Tiered price deleted successfully',
  tieredPriceError: 'Failed to save tiered price',
  imageUploadSuccess: 'Image uploaded successfully',
  imageUploadError: 'Failed to upload image',
  imageDeleteSuccess: 'Image deleted successfully',
  imageDeleteError: 'Failed to delete image',
  
  // ProductForm - Validation
  enterVariantName: 'Enter variant name',
  enterBarcode: 'Enter barcode',
  enterQuantity: 'Enter quantity',
  enterPrice: 'Enter price',
  enterImportCost: 'Enter import cost',
  enterSeriesInput: 'Enter series input',
  enterMinQuantity: 'Enter minimum quantity',
  atLeastOnePrice: 'At least one price must be specified',
  invalidSeriesFormat: 'Invalid series format',
  
  // ProductForm - Auto-conversion
  autoConverted: 'Auto-converted from {{from}}',
  currencyAutoConversion: 'Currency auto-conversion',
  conversionNote: 'Other currencies will be auto-filled after 1 second',
  
  // ProductDetails - Tabs
  detailsTab: 'Details',
  variantsTab: 'Variants',
  imagesTab: 'Images',
  filesTab: 'Files',
  historyTab: 'History',
  locationsTab: 'Locations',
  
  // ProductDetails - Actions
  saveChanges: 'Save Changes',
  discardChanges: 'Discard Changes',
  downloadInvoice: 'Download Invoice',
  printLabel: 'Print Label',
  
} as const;

export default products;
