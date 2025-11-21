const orders = {
  // Module Name
  orders: 'Orders',
  order: 'Order',
  orderManagement: 'Order Management',
  
  // Actions
  createOrder: 'Create Order',
  editOrder: 'Edit Order',
  viewOrder: 'View Order',
  deleteOrder: 'Delete Order',
  addOrder: 'Add Order',
  pickAndPack: 'Pick & Pack',
  shipOrder: 'Ship Order',
  
  // Order Fields
  orderNumber: 'Order Number',
  orderDate: 'Order Date',
  orderStatus: 'Order Status',
  customer: 'Customer',
  customerName: 'Customer Name',
  shippingAddress: 'Shipping Address',
  billingAddress: 'Billing Address',
  orderTotal: 'Order Total',
  orderSubtotal: 'Order Subtotal',
  shippingCost: 'Shipping Cost',
  orderNotes: 'Order Notes',
  paymentMethod: 'Payment Method',
  paymentStatus: 'Payment Status',
  
  // Order Status
  toFulfill: 'To Fulfill',
  picking: 'Picking',
  packing: 'Packing',
  readyToShip: 'Ready to Ship',
  shipped: 'Shipped',
  delivered: 'Delivered',
  processing: 'Processing',
  onHold: 'On Hold',
  
  // Payment Status
  paid: 'Paid',
  unpaid: 'Unpaid',
  payLater: 'Pay Later',
  refunded: 'Refunded',
  partiallyPaid: 'Partially Paid',
  
  // Payment Methods
  cash: 'Cash',
  card: 'Card',
  transfer: 'Transfer',
  cod: 'COD',
  bankTransfer: 'Bank Transfer',
  paypal: 'PayPal',
  
  // Order Items
  orderItems: 'Order Items',
  item: 'Item',
  items: 'Items',
  product: 'Product',
  sku: 'SKU',
  qty: 'Qty',
  unitPrice: 'Unit Price',
  lineTotal: 'Line Total',
  
  // Fulfillment
  fulfillmentStage: 'Fulfillment Stage',
  pickList: 'Pick List',
  packingList: 'Packing List',
  shippingLabel: 'Shipping Label',
  trackingNumber: 'Tracking Number',
  carrier: 'Carrier',
  
  // Communication
  communicationChannel: 'Communication Channel',
  viber: 'Viber',
  whatsapp: 'WhatsApp',
  zalo: 'Zalo',
  
  // Messages
  orderCreated: 'Order created successfully',
  orderUpdated: 'Order updated successfully',
  orderDeleted: 'Order deleted successfully',
  orderShipped: 'Order shipped successfully',
  
  // AllOrders Page
  allOrders: 'All Orders',
  searchPlaceholder: 'Search orders...',
  exportToExcel: 'Export to Excel',
  exportToPDF: 'Export to PDF',
  bulkActions: 'Bulk Actions',
  viewMode: 'View Mode',
  normalView: 'Normal',
  compactView: 'Compact',
  expandAll: 'Expand All',
  collapseAll: 'Collapse All',
  selectAll: 'Select All',
  deselectAll: 'Deselect All',
  deleteSelected: 'Delete Selected',
  changeStatus: 'Change Status',
  changePaymentStatus: 'Change Payment Status',
  
  // Filters
  filterByStatus: 'Filter by Status',
  allStatuses: 'All Statuses',
  
  // Toast Messages
  loadError: 'Failed to load orders',
  updateSuccess: 'Order updated successfully',
  updateError: 'Failed to update order',
  deleteSuccess: 'Deleted {{count}} order(s) successfully',
  deleteError: 'Failed to delete orders',
  bulkUpdateSuccess: 'Updated {{count}} order(s) successfully',
  bulkUpdateError: 'Failed to update orders',
  paymentUpdateSuccess: 'Updated payment status for {{count}} order(s)',
  paymentUpdateError: 'Failed to update payment status',
  noDataToExport: 'No orders to export',
  exportSuccessExcel: 'Exported {{count}} orders to XLSX',
  exportSuccessPDF: 'Exported {{count}} orders to PDF',
  exportError: 'Failed to export orders',
  
  // Statistics
  totalRevenue: 'Total Revenue',
  totalProfit: 'Total Profit',
  totalOrders: 'Total Orders',
  newCustomers: 'New Customers',
  returningCustomers: 'Returning Customers',
  
  // Table Headers
  customerNameHeader: 'Customer',
  statusHeader: 'Status',
  totalHeader: 'Total',
  dateHeader: 'Date',
  actionsHeader: 'Actions',
  
  // Confirmation
  deleteConfirmTitle: 'Confirm Deletion',
  deleteConfirmMessage: 'Are you sure you want to delete {{count}} order(s)? This action cannot be undone.',
  deleteCancel: 'Cancel',
  deleteConfirm: 'Delete',
  
} as const;

export default orders;
