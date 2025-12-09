const products = {
  // Module Name
  products: 'Products',
  product: 'Product',
  productManagement: 'Product Management',
  
  // Actions
  addProduct: 'Add Product',
  addNewProduct: 'Add New Product',
  addNewProductDescription: 'Create a new product with details, pricing, and inventory information',
  editProduct: 'Edit Product',
  editProductDescription: 'Update product details, pricing, and inventory information',
  viewProduct: 'View Product',
  deleteProduct: 'Delete Product',
  addMode: 'Add Mode',
  editMode: 'Edit Mode',
  
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
  supplierSectionDesc: 'Supplier details and contact',
  variantsSection: 'Product Variants',
  variantsSectionDesc: 'Manage product variations and barcodes',
  packingSection: 'Packing Instructions',
  filesSection: 'Product Files',
  unitsSection: 'Packaging & Units',
  unitsSectionDesc: 'Configure selling units, bulk packaging, and conversion rates',
  
  // Multi-Unit Fields
  sellingUnitName: 'Selling Unit',
  sellingUnitNamePlaceholder: 'e.g., piece, bottle, box',
  sellingUnitNameHelp: 'The smallest unit you sell this product in',
  enableBulkUnit: 'Enable Bulk Unit',
  enableBulkUnitHelp: 'Allow selling in larger packaged units (e.g., cartons, cases)',
  bulkUnitName: 'Bulk Unit Name',
  bulkUnitNamePlaceholder: 'e.g., carton, case, box',
  bulkUnitQty: 'Selling Units per Bulk Unit',
  bulkUnitQtyHelp: 'How many selling units are in one bulk unit',
  bulkPriceCzk: 'Bulk Price (CZK)',
  bulkPriceEur: 'Bulk Price (EUR)',
  allowBulkSales: 'Allow Bulk Sales',
  allowBulkSalesHelp: 'Enable customers to purchase in bulk units',
  unitContentsInfo: 'Package Contents Description',
  unitContentsInfoPlaceholder: 'e.g., 12 bottles per carton',
  unitContentsInfoHelp: 'Displayed to customers for clarity',
  unitConversionPreview: 'Unit Conversion',
  perBulkUnit: 'per',
  inventoryTrackedIn: 'Inventory tracked in',
  bulkPricing: 'Bulk Pricing',
  
  // ProductForm - Basic Fields
  vietnameseName: 'Vietnamese Name',
  vietnameseNamePlaceholder: 'Enter Vietnamese product name',
  productNameRequired: 'Product name is required',
  skuRequired: 'SKU is required',
  minimumQuantityRequired: 'Minimum quantity is required',
  atLeastOnePriceRequired: 'At least one price must be specified',
  descriptionPlaceholder: 'Enter product description',
  selectCategory: 'Select Category',
  selectWarehouse: 'Select Warehouse',
  warehouseLocation: 'Warehouse Location',
  warehouseLocationPlaceholder: 'e.g., A1-5',
  selectSupplier: 'Select Supplier',
  selectASupplier: 'Select a supplier',
  searchSuppliersPlaceholder: 'Search suppliers...',
  noSupplierFound: 'No supplier found.',
  noSupplierSelected: 'No supplier selected',
  contactPerson: 'Contact Person',
  supplierLink: 'Supplier Link',
  addNewSupplier: 'Add New Supplier',
  scanOrEnter: 'Scan or enter',
  
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
  addProductVariant: 'Add Product Variant',
  addNewProductVariation: 'Add a new product variation with details',
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
  createProduct: 'Create Product',
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
  
  // Search
  searchItems: 'Search items...',
  searchProducts: 'Search products...',
  
  // Variants - Extended
  variants: {
    addVariantButton: 'Add Variant',
    uploadingImage: 'Uploading...',
    addSeriesButton: 'Add Series',
    addSeriesTitle: 'Add Variant Series',
    addSeriesDescription: 'Create multiple variants using a pattern like "Size <1-10>"',
    seriesPattern: 'Series Pattern',
    seriesPatternPlaceholder: 'e.g., Size <1-10> or Color <1-5>',
    seriesPatternHelp: 'Use <start-end> to generate a numbered series',
    quantityPerVariant: 'Quantity per Variant',
    variantPriceOptional: 'Variant Price (Optional)',
    variantPriceHelper: "Leave blank to use product's default price. Enter value in any currency - others auto-convert.",
    variantImportCostOptional: 'Variant Import Cost (Optional)',
    variantImportCostHelper: "Leave blank to use product's default import cost. Enter value in any currency - others auto-convert.",
    priceCzk: 'Price CZK',
    priceEur: 'Price EUR',
    importCostUsd: 'Import Cost USD',
    importCostCzk: 'Import Cost CZK',
    importCostEur: 'Import Cost EUR',
    optional: 'Optional',
    addVariantSeriesButton: 'Add Variant Series',
    bulkScanBarcodesButton: 'Bulk Scan Barcodes',
    deleteSelected: 'Delete Selected',
    deleteVariantsTitle: 'Delete Variants',
    deleteVariantsConfirm: 'Are you sure you want to delete {{count}} variant(s)?',
    scanOrEnter: 'Scan or enter',
    noVariants: 'No variants added yet',
    noVariantsHelper: 'Click "Add Variant" to create product variations',
    addVariantTitle: 'Add Product Variant',
    addVariantDescription: 'Add a new variant with custom properties',
    tableHeaders: {
      image: 'Image',
      name: 'Name',
      barcode: 'Barcode',
      quantity: 'Quantity',
      priceCzk: 'Price CZK',
      priceEur: 'Price EUR',
      importCostUsd: 'Import Cost USD',
      importCostCzk: 'Import Cost CZK',
      importCostEur: 'Import Cost EUR',
    },
  },
  
  // Tiered Pricing - Extended
  tieredPricing: {
    title: 'Tiered Pricing',
    dialogDescription: 'Set quantity-based pricing for this product',
    addTier: 'Add Tier',
    updateButton: 'Update Tier',
    addButton: 'Add Tier',
    units: 'units',
    removeButton: 'Remove Tier',
  },
  
  // Packing & Shipping
  packing: {
    title: 'Packing & Shipping Details',
    description: 'Dimensions, materials, and handling instructions',
    physicalSpecifications: 'Physical Specifications',
    lengthCm: 'Length (cm)',
    widthCm: 'Width (cm)',
    heightCm: 'Height (cm)',
    weightKg: 'Weight (kg)',
    packingMaterials: 'Packing Materials',
    handlingInstructions: 'Handling Instructions',
  },
  
  // Files & Documents
  files: {
    title: 'Product Files & Documents',
    description: 'Attached files and documentation',
    filesTitle: 'Product Files',
    filesDescription: 'Documents and files can be attached after creating the product. This includes PDFs, images, specifications, and other documentation.',
  },
  
  // Form Submission
  submit: {
    updating: 'Updating...',
    creating: 'Creating...',
    cancel: 'Cancel',
  },
  
  // Bulk Scan Dialog
  bulkScan: {
    title: 'Bulk Scan Barcodes',
    description: 'Scan barcodes one by one. They will be automatically assigned to variants without barcodes (from first to last).',
    scannedBarcodes: 'Scanned Barcodes',
    placeholder: 'Scan or paste barcodes here (one per line)',
    helperText: 'Enter one barcode per line. Barcodes will be assigned to variants in order.',
    variantsWithoutBarcodes: 'variants without barcodes',
    barcodesEntered: 'barcodes entered',
    scannerReady: 'Scanner Ready',
    scannerReadyDescription: 'Start scanning barcodes. Press Enter after each scan.',
    scanning: 'Scanning...',
    startScanning: 'Start Scanning',
    assignBarcodes: 'Assign Barcodes',
  },
  
  // Images - Extended
  images: {
    title: 'Product Images',
    uploadMultiple: 'Upload multiple images for different purposes',
    count_one: 'one image',
    count_other: '{{count}} images',
    noImagesYet: 'No images uploaded yet',
    uploadInstruction: 'Click on an image category to upload photos',
    autoCompressInfo: 'Images are automatically compressed to WebP format for optimal storage',
    primary: 'Primary',
    setPrimary: 'Set Primary',
    find: 'find',
    map: 'map',
    purposes: {
      main: 'Main Image',
      mainDescription: 'Primary product image for WMS',
      inHand: 'In Hand',
      inHandDescription: 'Product in hand for picking reference',
      detail: 'Detail Shot',
      detailDescription: 'Close-up of texture or features',
      packaging: 'Packaging',
      packagingDescription: 'Package or box image',
      label: 'Label/Barcode',
      labelDescription: 'Label, barcode, or SKU tag',
    },
  },

  // Image Viewer
  imageViewer: {
    productImageAlt: 'Product image',
    close: 'Close',
    download: 'Download',
    downloadStarted: 'Download Started',
    downloadDescription: 'Your image is being downloaded.',
  },
  
  // Form Errors
  formErrors: {
    title: 'Form Validation Errors',
    invalidValue: 'Invalid value',
  },
  
  // Warehouse Locations
  warehouseLocations: {
    title: 'Warehouse Locations',
    infoMessage: 'Warehouse locations can be added after creating the product.',
  },
  
  // ProductForm Accordion Sections
  formSections: {
    basicInfo: {
      title: 'Basic Information',
      description: 'Product name, SKU, and category',
    },
    stockInventory: {
      title: 'Stock & Inventory',
      description: 'Quantity, alerts, and warehouse locations',
    },
    pricing: {
      title: 'Pricing & Costs',
      description: 'Sales prices and import costs',
    },
  },
  
  // Form field labels
  formLabels: {
    productName: 'Product Name',
    productNamePlaceholder: 'Enter product name',
    vietnameseName: 'Vietnamese Name',
    vietnameseNamePlaceholder: 'Enter Vietnamese product name',
    sku: 'SKU',
    skuPlaceholder: 'Enter SKU code',
    descriptionLabel: 'Description',
    descriptionPlaceholder: 'Enter product description',
    quantity: 'Quantity',
    maxStockLevel: 'Max Stock Level',
    lowStockAlert: 'Low Stock Alert',
    lowStockAlertSettings: 'Low Stock Alert Settings',
    alertType: 'Alert Type',
    alertTypePercentage: 'Percentage (%)',
    alertTypeAmount: 'Fixed Amount',
    alertThresholdPercent: 'Threshold (%)',
    alertThresholdUnits: 'Threshold (units)',
    percentageAlertHint: 'Alert when stock falls below this % of max stock level',
    amountAlertHint: 'Alert when stock falls below this number of units',
    barcode: 'Barcode',
    barcodePlaceholder: 'Enter or scan barcode',
    salesPrices: 'Sales Prices',
    autoConvertHelper: 'Currency auto-converts on blur',
    importCosts: 'Import Costs',
    autoConvertRealtime: 'Currency auto-converts in real-time',
  },
  
  // CostHistoryChart Component
  noCostHistoryData: 'No cost history data available',
  trendIncreasing: '+{{percent}}% trend',
  trendDecreasing: '-{{percent}}% trend',
  stable: 'Stable',
  avgPrice: 'Avg: {{currency}}{{price}}',
  min: 'Min',
  max: 'Max',
  methodLabel: 'Method: {{method}}',
  sourceLabel: 'Source: {{source}}',
  average: 'Average',
  
  // Internal Errors (not user-facing, but extracted for consistency)
  errors: {
    imageUploadFailed: 'Failed to upload image',
  },
  
  // Default Fallback Values (for SKU generation and filenames)
  defaults: {
    productFallback: 'product',
    categoryFallback: 'GEN',
    productPartFallback: 'PROD',
  },
  
  // Supplier Details Labels (for ProductForm)
  supplierDetails: {
    email: 'Email',
    phone: 'Phone',
    country: 'Country',
    website: 'Website',
    viewLink: 'View Link',
    address: 'Address',
    viewSupplierDetails: 'View Supplier Details',
  },
  
} as const;

export default products;
