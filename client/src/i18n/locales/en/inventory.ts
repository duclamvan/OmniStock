const inventory = {
  // Module Name
  inventory: 'Inventory',
  stockManagement: 'Stock Management',
  
  // Actions
  receiveStock: 'Receive Stock',
  adjustStock: 'Adjust Stock',
  transferStock: 'Transfer Stock',
  stockCount: 'Stock Count',
  
  // Inventory Fields
  stockLevel: 'Stock Level',
  availableStock: 'Available Stock',
  reservedStock: 'Reserved Stock',
  incomingStock: 'Incoming Stock',
  stockValue: 'Stock Value',
  lowStock: 'Low Stock',
  outOfStock: 'Out of Stock',
  overstock: 'Overstock',
  
  // Warehouse Operations
  receiving: 'Receiving',
  putaway: 'Putaway',
  picking: 'Picking',
  packing: 'Packing',
  shipping: 'Shipping',
  inbound: 'Inbound',
  outbound: 'Outbound',
  
  // Stock Movements
  stockIn: 'Stock In',
  stockOut: 'Stock Out',
  stockAdjustment: 'Stock Adjustment',
  stockTransfer: 'Stock Transfer',
  
  // Reasons
  adjustment: 'Adjustment',
  damaged: 'Damaged',
  lost: 'Lost',
  found: 'Found',
  returned: 'Returned',
  expired: 'Expired',
  sold: 'Sold',
  
  // Location
  warehouse: 'Warehouse',
  location: 'Location',
  bin: 'Bin',
  zone: 'Zone',
  rack: 'Rack',
  shelf: 'Shelf',
  
  // Messages
  stockUpdated: 'Stock updated successfully',
  stockReceived: 'Stock received successfully',
  adjustmentSaved: 'Stock adjustment saved successfully',
  
  // AllInventory Page
  allInventory: 'All Inventory',
  manageProductsDescription: 'Manage products, stock levels, and inventory tracking',
  viewingArchive: 'Viewing Archive',
  viewingActive: 'Viewing Active Inventory',
  
  // Actions - AllInventory
  addProduct: 'Add Product',
  exportToXLSX: 'Export to XLSX',
  exportToPDF: 'Export to PDF',
  importFromExcel: 'Import from Excel',
  showArchive: 'Show Archive',
  showActive: 'Show Active',
  toggleArchive: 'Toggle Archive',
  restoreProduct: 'Restore Product',
  archiveProduct: 'Archive Product',
  editProduct: 'Edit Product',
  deleteProduct: 'Delete Product',
  columnSettings: 'Column Settings',
  backToInventory: 'Back to Inventory',
  
  // Search & Filters
  searchPlaceholder: 'Search products by name, SKU, or description...',
  filterByCategory: 'Filter by Category',
  allCategories: 'All Categories',
  
  // Table Columns
  image: 'Image',
  productColumn: 'Product',
  category: 'Category',
  qty: 'Qty',
  quantity: 'Quantity',
  unitsSold: 'Units Sold',
  lowStockAlert: 'Low Stock Alert',
  priceEur: 'Price EUR',
  priceCzk: 'Price CZK',
  importCostUsd: 'Import Cost USD',
  importCostCzk: 'Import Cost CZK',
  importCostEur: 'Import Cost EUR',
  sku: 'SKU',
  barcode: 'Barcode',
  supplier: 'Supplier',
  status: 'Status',
  actions: 'Actions',
  name: 'Name',
  
  // Product Status Badges
  active: 'Active',
  inactive: 'Inactive',
  inStock: 'In Stock',
  warning: 'Warning',
  new: 'New',
  restocked: 'Restocked',
  
  // Toast Messages - Success
  success: 'Success',
  error: 'Error',
  productUpdatedSuccess: 'Product updated successfully',
  productDeletedSuccess: 'Product marked as inactive',
  productRestoredSuccess: 'Product restored successfully',
  productArchivedSuccess: 'Product moved to archive',
  exportSuccessXLSX: 'Exported {{count}} products to XLSX',
  exportSuccessPDF: 'Exported {{count}} products to PDF',
  exportSuccessful: 'Export successful',
  importSuccessful: 'Import successful',
  importSuccess: 'Successfully imported {{count}} products',
  
  // Toast Messages - Errors
  loadError: 'Failed to load products',
  updateError: 'Failed to update product',
  deleteError: 'Failed to delete product',
  deleteErrorReferenced: 'Cannot delete product - it\'s being used in existing orders',
  restoreError: 'Failed to restore product',
  archiveError: 'Failed to archive product',
  noDataToExport: 'No data to export',
  noProductsToExport: 'There are no products to export',
  exportFailed: 'Export failed',
  exportFailedXLSX: 'Failed to export to XLSX',
  exportFailedPDF: 'Failed to export to PDF',
  importFailed: 'Import failed',
  
  // Import Messages
  importCompletedWithErrors: 'Import completed with errors',
  importSuccessWithErrors: '{{successCount}} products imported, {{errorCount}} errors. Check console for details.',
  importFailedExcel: 'Failed to import Excel file',
  noDataFound: 'No data found',
  excelFileEmpty: 'The Excel file is empty',
  rowSkipped: 'Row skipped: Missing name or SKU',
  
  // Column Visibility
  showColumn: 'Show {{column}}',
  hideColumn: 'Hide {{column}}',
  visibleColumns: 'Visible Columns',
  
  // Empty States
  noProducts: 'No products found',
  noProductsDescription: 'Add your first product to get started',
  noProductsInCategory: 'No products in this category',
  
  // Additional AllInventory Page
  archivedProducts: 'Archived Products',
  viewActiveProducts: 'View Active Products',
  viewArchive: 'View Archive',
  searchProducts: 'Search products...',
  exportFormat: 'Export Format',
  exportAsXLSX: 'Export as XLSX',
  exportAsPDF: 'Export as PDF',
  importXLS: 'Import XLS',
  toggleColumns: 'Columns',
  basicInfo: 'Basic Info',
  stockInfo: 'Stock',
  pricingInfo: 'Pricing',
  otherInfo: 'Other',
  
  // Bulk Actions
  restoreSelected: 'Restore Selected',
  updateStock: 'Update Stock',
  bulkUpdate: 'Bulk Update',
  moveToArchive: 'Move to Archive',
  partialSuccess: 'Partial Success',
  export: 'Export',
  
  // Over/Under Allocated
  overAllocatedInventory: 'Over-Allocated Inventory',
  overAllocatedMessage: '{{count}} {{items}} more quantity ordered than available in stock',
  item: 'item has',
  items: 'items have',
  viewResolveIssues: 'View & Resolve Issues',
  underAllocatedInventory: 'Under-Allocated Inventory',
  underAllocatedMessage: '{{count}} {{items}} more quantity in record than in stock locations',
  
  // Stats Cards
  totalProducts: 'Total Products',
  totalValue: 'Total Value',
  products: 'products',
  itemsCount: 'items',
  
  // Filters
  filtersSearch: 'Filters & Search',
  
} as const;

export default inventory;
