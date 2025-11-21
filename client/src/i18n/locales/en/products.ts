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
  
} as const;

export default products;
