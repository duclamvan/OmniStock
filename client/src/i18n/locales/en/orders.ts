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
  
} as const;

export default orders;
