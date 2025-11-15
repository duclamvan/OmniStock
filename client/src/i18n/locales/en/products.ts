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
  
} as const;

export default products;
