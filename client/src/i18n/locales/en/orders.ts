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
  captureOrder: 'Capture Order',
  createReturn: 'Create Return',
  createTicket: 'Create Ticket',
  createCustomPrice: 'Create Custom Price',
  startPickingMode: 'Start Picking Mode',
  exitPickingMode: 'Exit Picking Mode',
  cardView: 'Card View',
  listView: 'List View',
  switchToCardView: 'Switch to Card View',
  switchToListView: 'Switch to List View',
  
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
  priority: 'Priority',
  orderType: 'Order Type',
  currency: 'Currency',
  orderLocation: 'Order Location',
  
  // Order Status
  pending: 'Pending',
  awaitingStock: 'Awaiting Stock',
  toFulfill: 'To Fulfill',
  picking: 'Picking',
  pickShort: 'Pick',
  packing: 'Packing',
  packShort: 'Pack',
  readyToShip: 'Ready to Ship',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  processing: 'Processing',
  onHold: 'On Hold',
  awaitingPacking: 'Awaiting Packing',
  
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
  itemsWithCount: '{{count}} items',
  product: 'Product',
  sku: 'SKU',
  qty: 'Qty',
  quantity: 'Quantity',
  unitPrice: 'Unit Price',
  lineTotal: 'Line Total',
  price: 'Price',
  image: 'Image',
  variant: 'Variant',
  variantName: 'Variant Name',
  bundle: 'Bundle',
  offer: 'OFFER',
  freeItem: 'FREE',
  scanBarcodeOrSku: 'Scan barcode or SKU...',
  readyToScan: 'Ready to scan...',
  
  // Fulfillment
  fulfillmentStage: 'Fulfillment Stage',
  pickList: 'Pick List',
  packingList: 'Packing List',
  shippingLabel: 'Shipping Label',
  trackingNumber: 'Tracking Number',
  carrier: 'Carrier',
  fulfillmentLocation: 'Fulfillment Location',
  
  // Communication
  communicationChannel: 'Communication Channel',
  viber: 'Viber',
  whatsapp: 'WhatsApp',
  zalo: 'Zalo',
  
  // Toast Messages - Status Updates
  statusUpdated: 'Status Updated',
  statusUpdatedDesc: 'Order status has been updated successfully',
  paymentStatusUpdated: 'Payment Status Updated',
  paymentStatusUpdatedDesc: 'Payment status has been updated successfully',
  priorityUpdated: 'Priority Updated',
  priorityUpdatedDesc: 'Order priority has been updated successfully',
  updateFailed: 'Update Failed',
  failedToUpdateStatus: 'Failed to update order status',
  failedToUpdatePayment: 'Failed to update payment status',
  failedToUpdatePriority: 'Failed to update priority',
  
  // Toast Messages - Order Actions
  orderCaptured: 'Order Captured',
  orderCapturedDesc: 'Order screenshot saved successfully',
  downloadFailed: 'Download Failed',
  downloadFailedDesc: 'Could not generate invoice',
  exportOrder: 'Export Order',
  exportOrderDesc: 'Export functionality coming soon',
  copied: 'Copied!',
  copiedToClipboard: '{{label}} copied to clipboard',
  
  // Toast Messages - Return/Custom Price
  allItemsPicked: 'All items picked',
  allItemsPickedDesc: 'No items to return - all items have been picked successfully',
  noItemsSelected: 'No items selected',
  noItemsSelectedDesc: 'Please select at least one item to return',
  reasonRequired: 'Reason required',
  reasonRequiredDesc: 'Please provide a reason for the return',
  missingInformation: 'Missing Information',
  missingInformationDesc: 'Please enter a custom price and valid from date',
  customPriceCreated: 'Custom price created for {{product}}',
  customPriceError: 'Failed to create custom price',
  nameRequired: 'Name required',
  nameRequiredDesc: 'Please enter a customer name',
  phoneRequired: 'Phone required',
  phoneRequiredDesc: 'Please enter a phone number',
  
  // Toast Messages - PPL/Shipping Labels
  creatingCartonLabel: 'Creating Carton Label...',
  creatingCartonLabelDesc: 'Generating new PPL shipping label. This may take a few seconds.',
  cartonLabelAdded: 'Carton Label Added',
  cartonLabelAddedDesc: 'New carton created with PPL tracking number: {{trackingNumber}}. You now have {{count}} carton(s).',
  error: 'Error',
  failedToAddCartonLabel: 'Failed to add carton label',
  
  // Toast Messages - Clipboard/Paste
  pasteFailed: 'Paste failed',
  pasteFailedClipboardAccess: 'Please allow clipboard access or paste manually',
  pasteFailedClipboardAccessShort: 'Please allow clipboard access',
  
  // Toast Messages - Packing Validation
  almostThere: 'Almost there!',
  completeAllSteps: 'Please complete all required steps before finishing packing.',
  
  // Toast Messages - Shipping Errors
  failedToShipOrders: 'Failed to ship some orders',
  noLabelFound: 'No Label Found',
  noLabelFoundDesc: 'No shipping label has been generated for this order yet.',
  failedToLoadLabel: 'Failed to load shipping label',
  
  // Toast Messages - Address
  success: 'Success',
  addressSavedWithCustomer: 'Address saved (will be created with customer)',
  
  // Toast Messages - Weight/Packing Constraints
  weightLimitExceeded: 'Weight Limit Exceeded',
  glsWeightLimitDesc: 'GLS shipments cannot exceed 40kg per carton. Please reduce weight or split into multiple cartons.',
  
  // Toast Messages - Packing/Items
  noItemsToPack: 'No items to pack in the current order',
  failedToCreateAICartons: 'Failed to create AI-suggested cartons',
  errorCreatingCarton: 'Error Creating Carton',
  failedToSave: 'Failed to Save',
  failedToRecalculateCartons: 'Failed to recalculate cartons',
  
  // Toast Messages - PPL Label Management
  pplLabelsCreated: 'PPL Labels Created',
  pplLabelCreationFailed: 'PPL Label Creation Failed',
  pplLabelsCancelled: 'PPL Labels Cancelled',
  pplLabelsCancelledDesc: 'Shipping labels have been cancelled with PPL',
  pplLabelsRemoved: 'PPL Labels Removed',
  pplLabelsRemovedDesc: 'Label data has been removed from the order',
  pplLabelRetrieved: 'PPL Label Retrieved',
  labelRetrievalFailed: 'Label Retrieval Failed',
  
  // Toast Messages - Packing Actions
  repackingOrder: 'Repacking Order',
  failedToInitiateRepacking: 'Failed to initiate repacking',
  orderReset: 'Order Reset',
  orderResetDesc: 'All picked quantities have been cleared.',
  cannotCompletePacking: 'Cannot Complete Packing',
  orderReturnedToPacking: 'Order {{orderId}} returned to packing',
  failedToReturnToPacking: 'Failed to return order to packing',
  orderSentBackToPick: 'Order {{orderId}} sent back to pick',
  failedToSendBackToPick: 'Failed to send order back to pick',
  sendBackToWait: 'Send back to Wait',
  orderSentBackToWait: 'Order {{orderId}} sent back to waiting',
  failedToSendBackToWait: 'Failed to send order back to waiting',
  orderOnHold: 'Order On Hold',
  orderPutOnHold: '{{orderId}} has been put on hold',
  failedToPutOnHold: 'Failed to put order on hold',
  orderCancelled: 'Order Cancelled',
  orderCancelledDesc: '{{orderId}} has been cancelled',
  failedToCancelOrder: 'Failed to cancel order',
  
  // Toast Messages - Shipping Actions
  failedToSaveTracking: 'Failed to save tracking numbers. Please try again.',
  failedToShipOrder: 'Failed to ship order',
  ordersReturnedToReady: 'Orders returned to ready status',
  failedToUndoShipment: 'Failed to undo shipment',
  
  // Toast Messages - Generic/Actions
  pleaseTryAgain: 'Please try again',
  pleaseAddCartonsFirst: 'Please add cartons first before generating labels',
  failedToPrintLabels: 'Failed to print labels',
  cartonDataPreserved: 'Carton data preserved. Use \'Generate All Labels\' to create new labels.',
  ordersShipped: 'Orders Shipped',
  shipmentUndone: 'Shipment Undone',
  
  // Toast Messages - Documents/Printing
  documentsSentToPrinter: 'Documents Sent to Printer',
  printError: 'Print Error',
  labelsSentToPrinter: 'Labels Sent to Printer',
  
  // Toast Messages - Clipboard/Copy
  copyFailed: 'Copy failed',
  
  // Toast Messages - Label Generation
  noCartons: 'No Cartons',
  generatingLabels: 'Generating Labels...',
  labelsGenerated: 'Labels Generated',
  allLabelsDeleted: 'All Labels Deleted',
  labelDeleted: 'Label Deleted',
  generatingPPLLabel: 'Generating PPL Label...',
  labelGenerated: 'Label Generated',
  
  // Order Details Sections
  invoice: 'Invoice',
  customerInformation: 'Customer Information',
  supportTickets: 'Support Tickets',
  pickPackLogs: 'Pick & Pack Logs',
  orderProgress: 'Order Progress',
  shippingMethodTracking: 'Shipping Method & Tracking',
  warehouseLocation: 'Warehouse Location',
  filesSent: 'Files Sent',
  productDocuments: 'Product Documents',
  uploadedFiles: 'Uploaded Files',
  shippingLabels: 'Shipping Labels',
  
  // Customer Details
  customerDetails: 'Customer Details',
  customerType: 'Customer Type',
  phone: 'Phone',
  email: 'Email',
  company: 'Company',
  location: 'Location',
  badges: 'Badges',
  showBadges: 'Show Badges',
  hideBadges: 'Hide Badges',
  
  // Shipping Details
  method: 'Method',
  tracking: 'Tracking',
  noTrackingNumber: 'No tracking number',
  noShippingAddress: 'No shipping address selected for this order',
  shippedAt: 'Shipped At',
  cartons: 'Cartons',
  box: 'box',
  boxes: 'boxes',
  cartonNumber: 'Carton #{{number}}',
  companyBox: 'Company Box',
  nonCompany: 'Non-Company',
  totalWeight: 'Total Weight',
  itemsWeight: 'Items Weight',
  dimensions: 'Dimensions (L×W×H)',
  totalShipmentWeight: 'Total Shipment Weight',
  standard: 'Standard',
  
  // Shipping Categories (by Carrier)
  pplCzCarrier: 'PPL CZ',
  pplCzSubtitle: 'CZ & SK',
  glsDeCarrier: 'GLS DE',
  glsDeSubtitle: 'EU Countries',
  dhlDeCarrier: 'DHL DE',
  dhlDeSubtitle: 'DE + Swiss + Nachnahme',
  czechiaSlovakia: 'Czechia & Slovakia',
  germanyEU: 'Germany & EU',
  personalDelivery: 'Personal Delivery',
  customerPickup: 'Customer Pickup',
  otherDestinations: 'Other Destinations',
  
  // Order Items Table
  landingCost: 'Landing Cost',
  itemNotes: 'Item Notes',
  addNote: 'Add Note',
  editNote: 'Edit Note',
  saveNote: 'Save Note',
  shippingNotes: 'Shipping Notes',
  quickNoteTemplates: 'Quick Note Templates',
  templates: 'Templates',
  
  // Pricing & Calculations
  subtotal: 'Subtotal',
  discount: 'Discount',
  discountType: 'Discount Type',
  discountValue: 'Discount Value',
  flatDiscount: 'Flat',
  rateDiscount: 'Rate',
  tax: 'Tax',
  taxRate: 'Tax Rate',
  taxAmount: 'Tax Amount',
  shipping: 'Shipping',
  adjustment: 'Adjustment',
  grandTotal: 'Grand Total',
  itemTotal: 'Item Total',
  actualShippingCost: 'Actual Shipping Cost',
  profitMargin: 'Profit Margin',
  clickToEditOrRoundUp: 'Click to edit or Round Up',
  
  // Tax Invoice
  taxInvoice: 'Tax Invoice',
  taxInvoiceEnabled: 'Tax Invoice Enabled',
  ico: 'IČO',
  dic: 'DIČ',
  vatId: 'VAT ID',
  nameAndAddress: 'Name & Address',
  country: 'Country',
  
  // COD (Cash on Delivery)
  codAmount: 'COD Amount',
  codCurrency: 'COD Currency',
  enableCod: 'Enable COD',
  
  // Customer Selection & Creation
  searchCustomer: 'Search Customer',
  searchCustomerPlaceholder: 'Search by name, email, phone, or paste Facebook URL...',
  customersFound: '{{count}} customer(s) found',
  quickCustomer: 'Quick Customer',
  newCustomer: 'New',
  quickTemp: 'Quick',
  telephoneCustomer: 'Tel',
  messagingCustomer: 'Msg',
  customCustomer: 'Custom',
  quickCustomerOneTime: 'Quick Customer (One-time)',
  telephoneOrder: 'Telephone Order',
  socialMediaCustomer: 'Social Media Customer',
  customCustomerOneTime: 'Custom Customer (One-time)',
  selectCustomer: 'Select Customer',
  idPhoneNumber: 'ID/Phone Number *',
  socialMediaApp: 'Social Media App *',
  formatWithoutSpaces: 'Format without spaces (e.g. +420776887045)',
  confirm: 'Confirm',
  
  // Product Selection
  searchProduct: 'Search Product',
  searchProductPlaceholder: 'Search products, SKUs, or scan barcode...',
  productsFound: '{{count}} product(s) found',
  selectProduct: 'Select Product',
  selectVariant: 'Select Variant',
  selectBundle: 'Select Bundle',
  addItem: 'Add Item',
  addToOrder: 'Add to Order',
  removeItem: 'Remove Item',
  noProductsFound: 'No products found',
  barcodeScanMode: 'Barcode Scan Mode',
  
  // Shipping Address
  shippingAddressSelection: 'Shipping Address Selection',
  selectShippingAddress: 'Select Shipping Address',
  selectOrAddShippingAddress: 'Select or add a shipping address for this order',
  searchAddress: 'Search Address',
  searchAddressPlaceholder: 'Type to search addresses...',
  street: 'Street',
  streetNumber: 'Street Number',
  city: 'City',
  state: 'State',
  zipCode: 'Zip Code',
  pickupPoint: 'Pickup Point',
  addNewAddress: 'Add New Address',
  editAddress: 'Edit Address',
  copyAddress: 'Copy address',
  deleteAddress: 'Delete Address',
  setAsDefault: 'Set as Default',
  
  // Documents & Files
  productDocumentsSelection: 'Product Documents Selection',
  selectDocumentsToSend: 'Select Documents to Send',
  documentsSelected: '{{count}} document(s) selected',
  uploadFiles: 'Upload Files',
  fileUpload: 'File Upload',
  dropFilesHere: 'Drop files here or click to browse',
  maxFileSize: 'Max file size: 10MB',
  supportedFormats: 'Supported formats: PDF, DOC, DOCX, XLS, XLSX, PNG, JPG',
  
  // Order Form Sections
  orderDetails: 'Order Details',
  itemsSection: 'Items',
  shippingInformation: 'Shipping Information',
  paymentInformation: 'Payment Information',
  additionalInformation: 'Additional Information',
  orderSummary: 'Order Summary',
  
  // Priority Levels
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  
  // Order Types
  pos: 'POS',
  ord: 'ORD',
  web: 'Web',
  tel: 'Tel',
  
  // Column Visibility
  showVatColumn: 'Show VAT Column',
  showDiscountColumn: 'Show Discount Column',
  showColumn: 'Show Column',
  hideColumn: 'Hide Column',
  
  // Buttons
  saveOrder: 'Save Order',
  updateOrder: 'Update Order',
  calculateShipping: 'Calculate Shipping',
  applyDiscount: 'Apply Discount',
  removeDiscount: 'Remove Discount',
  addShipping: 'Add Shipping',
  backToOrders: 'Back to Orders',
  
  // Validation Messages
  customerRequired: 'Please select a customer',
  itemsRequired: 'Please add at least one item to the order',
  invalidQuantity: 'Invalid quantity',
  invalidPrice: 'Invalid price',
  invalidDiscount: 'Invalid discount',
  
  // Create Return Dialog
  createReturnTicket: 'Create Return Ticket',
  selectItemsToReturn: 'Select items to return from order {{orderId}}',
  selectAllItems: 'Select All Items',
  returnReason: 'Return Reason',
  returnReasonPlaceholder: 'Enter reason for return...',
  returnQuantity: 'Return Quantity',
  
  // Custom Price Dialog
  customPrice: 'Custom Price',
  validFrom: 'Valid From',
  validTo: 'Valid To',
  setCustomPrice: 'Set Custom Price',
  
  // Variant/Bundle Selection
  selectVariantOrBundle: 'Select Variant/Bundle',
  selectProductVariants: 'Select Product Variants',
  availableVariants: 'Available Variants',
  availableBundles: 'Available Bundles',
  variantQuantity: 'Quantity',
  addSelectedVariants: 'Add Selected Variants',
  addSelectedBundles: 'Add Selected Bundles',
  
  // AI Carton Packing
  aiCartonPacking: 'AI Carton Packing',
  optimizePackaging: 'Optimize Packaging',
  packingPlan: 'Packing Plan',
  cartonType: 'Carton Type',
  recommendedCartons: 'Recommended Cartons',
  
  // AllOrders Page
  allOrders: 'All Orders',
  ordersToFulfill: 'Orders to Fulfill',
  shippedOrders: 'Shipped Orders',
  payLaterOrders: 'Pay Later Orders',
  preOrdersPage: 'Pre-Orders',
  trackAndManageOrders: 'Track and manage customer orders and shipments',
  searchPlaceholder: 'Search orders...',
  exportToExcel: 'Export to Excel',
  exportToPDF: 'Export to PDF',
  exportOptions: 'Export Options',
  bulkActions: 'Bulk Actions',
  viewMode: 'View Mode',
  normalView: 'Normal',
  compactView: 'Compact',
  expandAll: 'Expand All',
  collapseAll: 'Collapse All',
  expanded: 'Expanded',
  collapsed: 'Collapsed',
  selectAll: 'Select All',
  deselectAll: 'Deselect All',
  deleteSelected: 'Delete Selected',
  changeStatus: 'Change Status',
  changePaymentStatus: 'Change Payment Status',
  showColumns: 'Show Columns',
  loadingOrders: 'Loading orders...',
  filtersAndSearch: 'Filters & Search',
  record: 'Record',
  walkInCustomer: 'Walk-in Customer',
  unknownCustomer: 'Unknown Customer',
  itemsColon: 'Items:',
  showLess: 'Show less',
  moreItems: '+{{count}} more item(s)',
  previousOrder: 'Previous Order',
  nextOrder: 'Next Order',
  
  // Filters
  filterByStatus: 'Filter by Status',
  allStatuses: 'All Statuses',
  
  // Toast Messages
  loadError: 'Failed to load orders',
  orderCreated: 'Order created successfully',
  orderUpdated: 'Order updated successfully',
  orderDeleted: 'Order deleted successfully',
  orderShipped: 'Order shipped successfully',
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
  totalCustomers: 'Total Customers',
  newCustomers: 'New Customers',
  returningCustomers: 'Returning Customers',
  
  // Table Headers
  orderIdHeader: 'Order ID',
  customerNameHeader: 'Customer',
  statusHeader: 'Status',
  totalHeader: 'Total',
  dateHeader: 'Date',
  shippingMethodHeader: 'Shipping Method',
  paymentMethodHeader: 'Payment Method',
  actionsHeader: 'Actions',
  
  // Confirmation
  deleteConfirmTitle: 'Confirm Deletion',
  deleteConfirmMessage: 'Are you sure you want to delete {{count}} order(s)? This action cannot be undone.',
  deleteCancel: 'Cancel',
  deleteConfirm: 'Delete',
  
  // Pick & Pack Logs
  logTime: 'Time',
  logUser: 'User',
  logAction: 'Action',
  logItem: 'Item',
  logQuantity: 'Quantity',
  logLocation: 'Location',
  noLogsYet: 'No pick/pack activity logs yet',
  
  // Pick & Pack UI
  clickToUnverifyAllItems: 'Click to unverify all items',
  clickToMarkAllItemsAsVerified: 'Click to mark all items as verified',
  hideBarcodeScanner: 'Hide barcode scanner',
  showBarcodeScanner: 'Show barcode scanner',
  hideBundleItems: 'Hide bundle items',
  showBundleItems: 'Show bundle items',
  packingInstructions: 'Packing instructions',
  recalculateCartonsBasedOnCurrentItems: 'Recalculate cartons based on current items',
  updateTrackingNumberFromLabelBarcode: 'Update tracking number from label barcode',
  resetOrder: 'Reset Order',
  viewOrderDetails: 'View Order Details',
  
  // Support Tickets
  ticketStatus: 'Status',
  ticketPriority: 'Priority',
  ticketSubject: 'Subject',
  ticketCreated: 'Created',
  noTicketsYet: 'No support tickets for this order yet',
  createNewTicket: 'Create New Ticket',
  viewTicket: 'View Ticket',
  
  // AddOrder Page - Headers and Titles
  createNewOrder: 'Create New Order',
  addProductsConfigureDetails: 'Add products and configure details',
  newOrder: 'New Order',
  back: 'Back',
  orderSettings: 'Order Settings',
  searchSelectOrCreateNew: 'Search and select or create new',
  addProducts: 'Add Products',
  searchAddProducts: 'Search and add products to order',
  searchProducts: 'Search Products',
  
  // AddOrder Page - Toast Messages
  shippingAddressCreatedSuccess: 'Shipping address created successfully',
  shippingAddressCreatedError: 'Failed to create shipping address',
  shippingAddressUpdatedSuccess: 'Shipping address updated successfully',
  shippingAddressUpdatedError: 'Failed to update shipping address',
  addressParsed: 'Address Parsed',
  addressParsedSuccess: 'Parsed with {{confidence}} confidence',
  parseFailed: 'Parse Failed',
  addressParseError: 'Could not parse address',
  defaultEmailPasted: 'Default email pasted',
  pasteDefaultEmail: 'Paste default email',
  barcodeScanModeOn: 'Barcode scan mode ON',
  barcodeScanModeOff: 'Barcode scan mode OFF',
  rapidModeContinueScanning: 'Rapid mode: Keep scanning without clearing',
  normalModeClearAfterAdd: 'Normal mode: Products clear after adding',
  formValidationError: 'Form Validation Error',
  checkRequiredFields: 'Please check all required fields and try again',
  totalAdjusted: 'Total Adjusted',
  adjustmentDescription: 'Discount set to {{amount}}',
  totalRounded: 'Total Rounded Up',
  roundedUpDescription: 'Adjustment: {{amount}}',
  alreadyRounded: 'Already Rounded',
  alreadyRoundedDescription: 'Total is already a whole number',
  
  // AddOrder Page - Form Fields and Labels
  name: 'Name',
  firstName: 'First Name',
  lastName: 'Last Name',
  orderLocationPlaceholder: 'e.g., Prague Warehouse, Main Office',
  selectOrderLocation: 'Select order source',
  locationOnline: 'Online',
  locationInStore: 'In-Store',
  locationPhone: 'Phone',
  locationFacebook: 'Facebook',
  locationOther: 'Other',
  enterCustomerName: 'Enter customer name',
  phoneNumber: 'Phone Number',
  postalCode: 'Postal Code',
  houseNumber: 'House Number',
  emailOptional: 'Email (optional)',
  companyOptional: 'Company (optional)',
  branchOrPickupLocation: 'Branch or pickup location',
  typeHere: 'Type here',
  syncedWithCustomerName: 'Synced with Customer Name',
  placeUrlOrType: 'Place URL or Type',
  addressSearch: 'Address Search',
  smartPasteAddressParser: 'Smart Paste - Address Parser',
  pasteFullAddressForAutoparsing: 'e.g., Nguyen anh van, Potocni 1299 vejprty, Bưu điện 43191 vejprty, Sdt 607638460',
  startTypingAddress: 'Start typing an address...',
  addCustomerToOrder: 'Add Customer to Order',
  
  // AddOrder Page - Product Selection
  clickToSeeAllProducts: 'Click to see all products (Vietnamese diacritics supported)...',
  productsFoundCount: '{{count}} product(s) found',
  noProductsFoundFor: 'No products found for "{{search}}"',
  trySearchingByNameSKU: 'Try searching by name, SKU, or category',
  best: 'Best',
  service: 'Service',
  scanModeOff: 'Scan Mode: OFF',
  scanModeOn: 'Scan Mode: ON',
  stock: 'Stock',
  
  // AddOrder Page - Order Items
  noItemsYet: 'No items yet',
  itemsAdded: '{{count}} item(s) added',
  addOptionalNote: 'Add note (optional)',
  vat: 'VAT',
  disc: 'Disc',
  
  // AddOrder Page - Shipping and Discount
  addSpecialInstructions: 'Add special instructions for packing or shipping...',
  selectShipping: 'Select shipping',
  selectPayment: 'Select payment',
  shippingAndDiscount: 'Shipping & Discount',
  additionalOptions: 'Additional Options',
  selectOrAddAddress: 'Select or add a shipping address for this order',
  companyIdentificationNumber: 'Company identification number',
  taxIdentificationNumber: 'Tax identification number',
  companyNameAndAddress: 'Company name and address',
  euVatIdentificationNumber: 'EU VAT identification number',
  countryName: 'Country name',
  
  // AddOrder Page - Order Summary
  clickToEnter: 'Click to enter',
  formValidationErrors: 'Form Validation Errors',
  formValidationErrorsCount: 'Form Validation Errors ({{count}})',
  invalidValue: 'Invalid value',
  creating: 'Creating...',
  saveDraft: 'Save Draft',
  marginAnalysis: 'Margin Analysis',
  totalCost: 'Total Cost',
  totalCostColon: 'Total Cost:',
  totalProfitColon: 'Total Profit:',
  margin: 'Margin',
  chooseVariantsFor: 'Choose variants and quantities for:',
  addShippingNotesDescription: 'Add shipping notes or special instructions for this item',
  
  // New Customer Form
  newCustomerDetails: 'New Customer Details',
  customerNameRequired: 'Customer Name *',
  facebookName: 'Facebook Name',
  facebookUrl: 'Facebook URL',
  nameCopied: 'Name copied',
  customerNameCopiedToFacebookUrl: 'Customer name copied to Facebook URL',
  copyCustomerName: 'Copy customer name',
  smartPaste: 'Smart Paste',
  pasteAnyAddressInfo: 'Paste any address info and we\'ll split it automatically',
  parsing: 'Parsing...',
  parseFill: 'Parse & Fill',
  addressSearchOptional: 'Address Search (optional)',
  searchingAddresses: 'Searching addresses...',
  addressesFound: '{{count}} address(es) found',
  noAddressesFound: 'No addresses found',
  searchOfficialAddress: 'Search for an official address to auto-fill the fields below',
  address: 'Address',
  
  // Product Selection - Additional Labels
  noItemsAddedYet: 'No items added to order yet',
  searchAndSelectProducts: 'Search and select products above to add them',
  
  // Payment/Shipping Details
  paymentDetails: 'Payment Details',
  configurePricing: 'Configure pricing and notes',
  addDiscount: 'Add Discount',
  amount: 'Amount',
  percentage: 'Percentage',
  quickSelect: 'Quick select:',
  realCostFromCarrier: 'Real cost from carrier',
  roundingOrOtherAdjustments: 'Rounding or other adjustments',
  cashOnDeliveryOptional: 'Cash on delivery amount (optional)',
  currencyForCod: 'Currency for cash on delivery',
  selectCurrency: 'Select currency',
  additionalOrderNotes: 'Additional order notes...',
  addTaxInvoiceSection: 'Add Tax Invoice Section',
  taxInvoiceInformation: 'Tax Invoice Information',
  taxRatePercent: 'Tax Rate (%)',
  vatIdOptional: 'VAT ID (optional)',
  euVatIdNumber: 'EU VAT identification number',
  
  // Files & Documents
  filesDocuments: 'Files & Documents',
  uploadFilesDocuments: 'Upload files and manage product documents',
  uploadedFilesCount: 'Uploaded Files ({{count}})',
  noFilesYet: 'No files yet',
  uploadFilesOrAddProducts: 'Upload files or add products with files',
  
  // Order Summary Labels
  subtotalLabel: 'Subtotal:',
  taxLabel: 'Tax ({{rate}}%):',
  discountLabel: 'Discount{{rate}}:',
  grandTotalLabel: 'Grand Total:',
  discountSetTo: 'Discount set to {{amount}}',
  discountApplied: 'Discount Applied',
  totalRoundedUp: 'Total Rounded Up',
  adjustmentAmount: 'Adjustment: {{amount}}',
  totalAlreadyWhole: 'Total is already a whole number',
  
  // Toast Messages - Additional
  orderCreatedWithPacking: 'Order created successfully with packing plan',
  orderCreatedSuccess: 'Order created successfully',
  orderCreatedError: 'Failed to create order. Please try again',
  aiPackingDisabled: 'AI Packing Disabled',
  aiPackingDisabledDesc: 'AI Carton Packing is disabled in settings',
  aiPackingDisabledError: 'AI Carton Packing is disabled. Enable it in Settings to use this feature.',
  enableAiPackingInSettings: 'Please enable AI Carton Packing in Settings to use this feature',
  pleaseAddItemsFirst: 'Please add items to the order first',
  packingPlanOptimized: 'Packing plan optimized successfully',
  failedToOptimizePacking: 'Failed to optimize packing',
  saveOrderBeforeCartons: 'Please save the order before adding cartons',
  addManualCartonError: 'Failed to add manual carton',
  noVariantsSelected: 'No Variants Selected',
  noVariantsSelectedDesc: 'Please select at least one variant with quantity > 0',
  variantsAdded: 'Added {{count}} variant(s) to order',
  variantsAddedToOrder: 'Added {{count}} variant(s) to order',
  filesUploaded: '{{count}} file(s) uploaded successfully',
  filesUploadedSuccessfully: '{{count}} file(s) uploaded successfully',
  fileRemoved: 'File removed',
  fileRemovedDesc: 'File has been removed from the upload list',
  fileRemovedFromList: 'File has been removed from the upload list',
  pleaseAddAtLeastOneItem: 'Please add at least one item to the order',
  addressCopiedToClipboard: 'Address copied to clipboard',
  editShippingAddress: 'Edit Shipping Address',
  addShippingAddress: 'Add Shipping Address',
  updateShippingAddressDetails: 'Update the shipping address details',
  enterNewShippingAddressDetails: 'Enter the new shipping address details',
  typeNoteOrSelectTemplate: 'Type your own note or select a predefined one below...',
  quickTemplates: 'Quick templates:',
  uploadFilesManageDocs: 'Upload files and manage product documents',
  upload: 'Upload',
  smartPasteExample: 'e.g., Nguyen anh van, Potocni 1299 vejprty, Bưu điện 43191 vejprty, Sdt 607638460',
  shippingNotesOptional: 'Shipping Notes (Optional)',
  
  // PreOrders
  preOrders: 'Pre-Orders',
  preOrder: 'Pre-Order',
  allPreOrders: 'All Pre-Orders',
  addPreOrder: 'Add Pre-Order',
  editPreOrder: 'Edit Pre-Order',
  preOrderDetails: 'Pre-Order Details',
  noPreOrdersYet: 'No pre-orders yet',
  managePreOrders: 'Manage pre-orders',
  trackUpcomingOrders: 'Track and manage upcoming pre-orders',
  
  // PreOrders - Page specific
  preOrderManagement: 'Pre-Order Management',
  manageCustomerPreOrders: 'Manage customer pre-orders and advance bookings',
  activePreOrders: 'Active Pre-Orders',
  active: 'Active',
  pendingArrival: 'Pending Arrival',
  partiallyArrived: 'Partially Arrived',
  fullyArrived: 'Fully Arrived',
  searchPreOrders: 'Search pre-orders...',
  activeFilters: 'Active filters:',
  found: 'found',
  showHideColumns: 'Show/Hide Columns',
  expectedDate: 'Expected Date',
  createdDate: 'Created Date',
  viewDetails: 'View Details',
  loadingPreOrders: 'Loading pre-orders...',
  
  // PreOrders - Toast Messages
  preOrderDeletedSuccess: 'Pre-order deleted successfully',
  preOrderDeleteFailed: 'Failed to delete pre-order',
  noPreOrdersToExport: 'There are no pre-orders to export',
  exportedPreOrdersXLSX: 'Exported {{count}} pre-orders to XLSX',
  exportedPreOrdersPDF: 'Exported {{count}} pre-orders to PDF',
  exportPreOrdersXLSXFailed: 'Failed to export pre-orders to XLSX',
  exportPreOrdersPDFFailed: 'Failed to export pre-orders to PDF',
  customerCreatedSuccess: 'Customer created successfully',
  customerCreationFailed: 'Failed to create customer',
  preOrderCreatedSuccess: 'Pre-order created successfully',
  preOrderCreationFailed: 'Failed to create pre-order',
  preOrderUpdatedSuccess: 'Pre-order updated successfully',
  preOrderUpdateFailed: 'Failed to update pre-order',
  preOrderStatusUpdatedSuccess: 'Pre-order status updated successfully',
  preOrderStatusUpdateFailed: 'Failed to update pre-order status',
  
  // PreOrders - Add/Edit Forms
  createPreOrder: 'Create Pre-Order',
  addNewCustomerPreOrder: 'Add a new customer pre-order',
  basicInformation: 'Basic Information',
  typeToSearchCustomers: 'Type to search customers...',
  noCustomerFound: 'No customer found',
  createNewCustomer: 'Create New Customer',
  expectedArrivalDate: 'Expected Arrival Date',
  pickADate: 'Pick a date',
  addNotesOrInstructions: 'Add any notes or special instructions...',
  preOrderItems: 'Pre-Order Items',
  itemNumber: 'Item {{number}}',
  selectExistingItem: 'Select Existing Item (Optional)',
  searchProductsPreOrdersSupplier: 'Search products, pre-orders, or supplier items...',
  searchByNameSKU: 'Search by name, SKU...',
  noItemsFound: 'No items found.',
  preOrderItemsGroup: 'Pre-Order Items',
  purchaseOrderItems: 'Purchase Order Items',
  itemNameRequired: 'Item Name *',
  itemDescription: 'Item Description',
  optionalDescriptionSpec: 'Optional description or specifications',
  customerNameRequired2: 'Customer name is required',
  updatePreOrderDetails: 'Update pre-order details',
  selectCustomerPlaceholder: 'Select customer...',
  selectProductManually: 'Select a product or enter manually below',
  updating: 'Updating...',
  updatePreOrder: 'Update Pre-Order',
  loadingPreOrder: 'Loading pre-order...',
  preOrderNotFound: 'Pre-order not found',
  goBack: 'Go Back',
  selectExistingProduct: 'Select Existing Product (Optional)',
  
  // PreOrders - Details
  preOrderInformation: 'Pre-Order Information',
  markPartiallyArrived: 'Mark as Partially Arrived',
  markFullyArrived: 'Mark as Fully Arrived',
  cancelPreOrder: 'Cancel Pre-Order',
  arrivedQuantityDisplay: '{{arrived}} / {{total}} arrived',
  arrivalProgress: 'Arrival Progress',
  orderedQuantity: 'Ordered Quantity',
  arrivedQuantity: 'Arrived Quantity',
  noItemsInPreOrder: 'No items in this pre-order',
  deletePreOrderTitle: 'Delete Pre-Order',
  deletePreOrderConfirm: 'Are you sure you want to delete this pre-order? This action cannot be undone and will also delete all associated items.',
  noPreOrdersMatchFilters: 'No pre-orders match your filters',
  noPreOrdersYetClickAdd: 'No pre-orders yet. Click "Add Pre-Order" to create one.',
  itemsOrdered: 'Items Ordered',
  notSet: 'Not set',
  
  // PreOrders - Notifications
  reminderSettings: 'Reminder Settings',
  enableReminders: 'Enable Reminders',
  enableRemindersDescription: 'Send SMS or email reminders to the customer before the expected arrival date',
  reminderChannel: 'Notification Channel',
  sms: 'SMS',
  smsBothEmail: 'SMS & Email',
  reminderDaysBefore: 'Days Before Arrival',
  reminderDaysBeforeHint: 'Select when to send reminders',
  daysBefore: '{{days}} day before',
  daysBeforePlural: '{{days}} days before',
  reminderTime: 'Reminder Time',
  reminderTimeHint: 'Time of day to send reminders',
  reminderTimezone: 'Timezone',
  reminderPhone: 'Phone Number',
  reminderPhoneHint: 'Override customer phone for this reminder',
  reminderEmail: 'Email Address',
  reminderEmailHint: 'Override customer email for this reminder',
  priorityLow: 'Low',
  priorityNormal: 'Normal',
  priorityHigh: 'High',
  priorityUrgent: 'Urgent',
  sendReminderNow: 'Send Reminder Now',
  sendReminder: 'Send Reminder',
  reminderSent: 'Reminder sent successfully',
  reminderFailed: 'Failed to send reminder',
  reminderHistory: 'Reminder History',
  lastReminderSent: 'Last Reminder Sent',
  reminderStatus: 'Reminder Status',
  reminderStatusPending: 'Pending',
  reminderStatusSent: 'Sent',
  reminderStatusFailed: 'Failed',
  noRemindersYet: 'No reminders sent yet',
  reminderScheduled: 'Reminder scheduled',
  reminderTimeline: 'Reminder Timeline',
  reminderDelivered: 'Delivered',
  reminderDeliveredTo: 'Delivered to {{channel}}',
  upcomingReminders: 'Upcoming Reminders',
  nextReminderIn: 'Next reminder in {{days}} days',
  reminderNotConfigured: 'No reminders configured',
  reminderEnabled: 'Reminders enabled',
  reminderDisabled: 'Reminders disabled',
  lastSent: 'Last sent',
  nextReminderBefore: 'Next reminder before',
  filterByPriority: 'Filter by priority',
  allPriorities: 'All Priorities',
  enabled: 'Enabled',
  disabled: 'Disabled',
  configureReminders: 'Configure Reminders',
  useCustomerContact: 'Use customer contact details',
  customContactInfo: 'Custom Contact Info',
  reminderWillBeSentTo: 'Reminder will be sent to',
  sendReminderConfirmTitle: 'Send Reminder',
  sendReminderConfirmDesc: 'Select the channel to send a reminder to the customer about this pre-order.',
  sending: 'Sending...',
  selectChannel: 'Select Channel',
  bothChannels: 'Both',
  remindersSent: 'Reminders Sent',
  daysUntilNextReminder: 'Days Until Next',
  currentSettings: 'Current Settings',
  channel: 'Channel',
  messageContent: 'Message Content',
  recipient: 'Recipient',
  sentDate: 'Sent Date',
  viewMessage: 'View Message',
  hideMessage: 'Hide Message',
  noExpectedDate: 'No expected date set',
  neverSent: 'Never sent',
  
  // Pick & Pack Workflow
  orderFulfillment: 'Order Fulfillment',
  fulfillmentWorkflow: 'Fulfillment Workflow',
  pickItems: 'Pick Items',
  packItems: 'Pack Items',
  generateLabel: 'Generate Label',
  complete: 'Complete',
  
  // Scanning
  scanProduct: 'Scan Product',
  scanBarcode: 'Scan Barcode',
  manualEntry: 'Manual Entry',
  barcodeScanner: 'Barcode Scanner',
  scanBarcodeToVerifyItems: 'Scan barcode to verify items...',
  
  // Product Info
  productName: 'Product Name',
  pickStatus: 'Pick Status',
  barcode: 'Barcode',
  
  // Pick Status
  notStarted: 'Not Started',
  inProgress: 'In Progress',
  completed: 'Completed',
  picked: 'Picked',
  partiallyPicked: 'Partially Picked',
  notFound: 'Not Found',
  itemReview: 'Item Review',
  
  // Actions
  markAsPicked: 'Mark as Picked',
  cannotFind: 'Cannot Find',
  skip: 'Skip',
  printLabel: 'Print Label',
  completeOrder: 'Complete Order',
  next: 'Next',
  previous: 'Previous',
  cancel: 'Cancel',
  print: 'Print',
  save: 'Save',
  view: 'View',
  printed: 'Printed',
  
  // Carton & Packing
  addToCarton: 'Add to Carton',
  packageWeight: 'Package Weight',
  packingMaterials: 'Packing Materials',
  weight: 'Weight',
  weightKg: 'Weight (kg)',
  weightOptional: 'Weight (kg) <span className="text-xs text-gray-500 font-normal">(optional, max 40kg)</span>',
  
  // Validation Messages
  scanAllItems: 'Scan all items',
  wrongProductScanned: 'Wrong product scanned',
  quantityMismatch: 'Quantity mismatch',
  itemAlreadyPicked: 'Item already picked',
  weightLimitExceededDesc: 'GLS shipments cannot exceed 40kg per carton. Please reduce weight or split into multiple cartons.',
  
  // Instructions
  scanEachProductToPick: 'Scan each product to pick',
  packItemsIntoCarton: 'Pack items into carton',
  verifyQuantities: 'Verify quantities',
  clickToMinimize: 'Click to minimize',
  
  // Progress
  itemsPicked: 'Items Picked',
  percentComplete: '{{percent}}% complete',
  remainingItems: '{{count}} remaining items',
  
  // Alerts
  itemNotFoundInWarehouse: 'Item not found in warehouse',
  lowStockAlert: 'Low stock alert',
  locationMismatch: 'Location mismatch',
  errorNoPacking: 'No items to pack in the current order',
  
  // Loading States
  loadingOrder: 'Loading order...',
  generatingLabel: 'Generating label...',
  loadingDocuments: 'Loading documents...',
  loadingFiles: 'Loading files...',
  
  // Empty States
  noItemsToPick: 'No items to pick',
  noLocation: 'No location',
  orderComplete: 'Order complete',
  noFilesAttachedToOrder: 'No files attached to this order',
  
  // Documents & Labels
  orderFiles: 'Order Files',
  documentsCount: 'Product Documents ({{count}})',
  
  // Service Items
  serviceItemNoLocation: 'Pick last - No physical location',
  note: 'Note',
  
  // Pending Services
  pendingServices: 'Pending Services',
  pendingServicesDescription: 'This customer has pending service records that can be added to the order.',
  laborFee: 'Labor Fee',
  partsCost: 'Parts Cost',
  serviceFee: 'Service Fee',
  servicePart: 'Service Part',
  applyToOrder: 'Add to Order',
  applied: 'Applied',
  serviceApplied: 'Service Applied',
  serviceAppliedDesc: '{{name}} has been added to the order',
  serviceAlreadyApplied: 'Already Applied',
  serviceAlreadyAppliedDesc: 'This service has already been added to the order',
  
  // Packing Checklist
  itemsVerified: 'Items Verified',
  packingSlipIncluded: 'Packing Slip Included',
  boxSealed: 'Box Sealed',
  weightRecorded: 'Weight Recorded',
  fragileProtected: 'Fragile Protected',
  promotionalMaterials: 'Promotional Materials',
  
  // Error Messages
  failedToCreateCartons: 'Failed to create AI-suggested cartons',
  failedToCreateCarton: 'Failed to create carton',
  failedToUpdateTrackingNumber: 'Failed to update tracking number',
  failedToCreateLabels: 'Failed to create PPL labels',
  failedToCancelLabels: 'Failed to cancel PPL labels',
  failedToDeleteLabels: 'Failed to delete PPL labels',
  failedToRetrieveLabel: 'Failed to retrieve PPL label',
  failedToSaveTrackingNumbers: 'Failed to save tracking numbers. Please try again.',
  failedToShipSomeOrders: 'Failed to ship some orders',
  
  // Success Messages
  shippingLabelsCancelled: 'Shipping labels have been cancelled with PPL',
  labelDataRemoved: 'Label data has been removed from the order',
  allPickedQuantitiesCleared: 'All picked quantities have been cleared.',
  
  // Repacking
  orderSentForRepacking: 'Order has been sent for repacking',
  
  // Tracking Numbers
  enterTrackingNumber: 'Enter tracking number...',
  enterDHLTrackingNumber: 'Enter DHL tracking number...',
  enterGLSTrackingNumber: 'Enter GLS tracking number...',
  
  // Copy Fields
  paketSize: 'Paket size',
  fullAddress: 'Full Address',
  
  // Mute/Unmute
  muteSounds: 'Mute sounds',
  unmuteSounds: 'Unmute sounds',
  
  // Progress Pills - Scroll Navigation
  scrollToItems: 'Scroll to Items',
  scrollToDocuments: 'Scroll to Documents',
  scrollToCartons: 'Scroll to Cartons',
  scrollToShippingLabels: 'Scroll to Shipping Labels',
  
  // Bundle Items
  
  // Packing Instructions

  // Pick & Pack - PickPack Component Labels
  skuLabel: 'SKU:',
  barcodeLabel: 'Barcode:',
  cartonHash: 'Carton #',
  optionalMax40kg: '(optional, max 40kg)',
  exceedsGls40kgLimit: 'Exceeds GLS 40kg limit',
  aiCalculated: 'AI calculated',

  // Export Columns (Pre-Orders)
  preOrderIdColumn: 'Pre-Order ID',
  customerColumn: 'Customer',
  itemsColumn: 'Items',
  statusColumn: 'Status',
  createdDateColumn: 'Created Date',
  expectedDeliveryColumn: 'Expected Delivery',
  notesColumn: 'Notes',

  // Validation Messages (Pre-Orders)
  quantityMinOne: 'Quantity must be at least 1',
  atLeastOneItemRequired: 'At least one item is required',

  // Placeholder Text
  pleaseProvideReturnReason: 'Please provide a reason for the return...',
  enterCustomPrice: 'Enter custom price',
  enterDhlTrackingNumber: 'Enter DHL tracking number...',
  enterGlsTrackingNumber: 'Enter GLS tracking number...',
  
  // Order Document Selector
  selectDocumentsToInclude: 'Select documents to include with this order',
  available: 'available',
  documentsPreviouslySent: 'document(s) previously sent (marked with',
  documentSelected: '{{count}} selected',
  documentWillBeIncluded: '{{count}} document will be included',
  documentsWillBeIncluded: '{{count}} documents will be included',
  
  // MarginPill Component
  marginBreakdown: 'Margin Breakdown',
  sellingPrice: 'Selling Price',
  quantityUnits: 'Quantity: {{count}} units',
  
  // TrackingStatusBadge Component
  noTracking: 'No tracking',
  outForDelivery: 'Out for Delivery',
  inTransit: 'In Transit',
  exception: 'Exception',
  labelCreated: 'Label Created',
  cartonsCount: '{{count}} carton',
  cartonsCount_plural: '{{count}} cartons',
  lastUpdate: 'Last update: {{time}}',
  never: 'Never',
  
  // AICartonPackingPanel Component
  cartonPacking: 'Carton Packing',
  addCarton: 'Add Carton',
  aiOptimize: 'AI Optimize',
  standardBox: 'Standard Box',

  // PickPack.tsx - Comprehensive Translation Keys
  // Default values & placeholders
  weightPlaceholder: '0.000',
  
  // UI Labels & Headers
  exit: 'Exit',
  closeModal: 'CLOSE',
  time: 'Time',
  score: 'Score',
  trackYourPickingProgress: 'Track your picking progress',
  pickPackWorkflow: 'Pick & Pack Workflow',
  manageOrderFulfillment: 'Manage order fulfillment from picking to shipping',
  swipeToView: 'Swipe to view →',
  orderLabel: 'Order:',
  
  // Tab Labels
  all: 'All',
  overview: 'Overview',
  pend: 'Pend',
  ready: 'Ready',
  pack: 'Pack',
  
  // Shipping Information
  noShippingAddressProvided: 'No shipping address provided',
  shippingAddressLabel: 'Shipping Address',
  shippingMethodLabel: 'Shipping Method',
  trackingNumberLabel: 'Tracking Number',
  
  // Packing Completion Modal
  packingComplete: 'Packing Complete!',
  excellentWork: 'Excellent work! Order {{orderId}} is ready to ship',
  pickNextOrder: 'PICK NEXT ORDER',
  packNextOrder: 'PACK NEXT ORDER ({{count}})',
  goToReadyToShip: 'GO TO READY TO SHIP ({{count}})',
  proceedToPacking: 'PROCEED TO PACKING',
  backToOverview: 'BACK TO OVERVIEW',
  
  // PPL Label Management
  noCarton: 'No Carton',
  addCartonLabel: 'Add Carton Label',
  
  // GLS Shipping
  glsShipping: 'GLS Shipping ({{count}} {{unit}})',
  carton: 'carton',
  cartonsPlural: 'cartons',
  noCartonsAddedToGls: 'No cartons added to GLS yet. Use the button below to add cartons for cost-effective shipping.',
  empfanger: 'Empfänger (Recipient)',
  absender: 'Absender (Sender)',
  vorUndNachname: 'Vor- und Nachname*',
  firma: 'Firma',
  strasse: 'Straße*',
  hausnummer: 'Hausnummer*',
  plz: 'PLZ*',
  wohnort: 'Wohnort*',
  land: 'Land*',
  eMail: 'E-Mail',
  telefon: 'Telefon',
  glsShippingLabels: 'GLS Shipping Labels ({{count}})',
  duplicate: 'Duplicate',
  
  // Toast Error Messages (Extended)
  errorTitle: 'Error',
  failedToPrintLabel: 'Failed to print label',
  failedToGenerateLabel: 'Failed to generate label',
  failedToDeleteLabel: 'Failed to delete label',
  creatingShippingLabelFromPPL: 'Creating shipping label from PPL API',
  labelPdfNotAvailable: 'Label PDF not available. The label might still be processing.',
  couldNotOpenPrintWindow: 'Could not open print window. Please allow popups for this site.',
  labelRemovedSuccessfully: 'Label removed successfully.',
  pleaseAllowClipboardAccess: 'Please allow clipboard access',
  
  // Mobile Labels
  unableToDisplayItemDetails: 'Unable to displayItemDetails. Please navigate using the Previous/Next buttons.',
  ordersCompletedToday: 'Orders Completed Today',
  ordersPickedAndReadyToPack: 'Orders that have been picked and ready to pack',
  ordersOrganizedByDestination: 'Orders organized by shipping carrier',
  
  // Confirmation messages
  deleteLabelConfirm: 'Delete label #{{labelNumber}}?\n\nThis will cancel the shipment with PPL.',
  
  // Additional UI Labels
  pickingItem: 'Picking Item',
  nextItem: 'Next Item',
  bundleItems: 'Bundle Items',
  pickingAccuracy: 'Picking Accuracy',
  avgItemsPerOrder: 'Avg. Items/Order',
  avgPickTime: 'Avg. Pick Time',
  
  // Section Headers
  orderItemsHeader: 'Order Items',
  orderSummaryHeader: 'Order Summary',
  
  // Delete Dialog
  deleteOrdersTitle: 'Delete Orders',
  deleteOrdersConfirm: 'Are you sure you want to delete {{count}} order(s)? This action cannot be undone.',
  
  // Additional Keys
  each: 'each',
  selected: 'selected',
  selectedCount: '{{count}} selected',
  
  // EditOrder.tsx - Quick Note Templates
  handleWithCareFragile: 'Handle with care - fragile item',
  keepUprightTransport: 'Keep upright during transport',
  packAntiStatic: 'Pack with anti-static materials',
  doubleBoxRequired: 'Double box required',
  separateFromOthers: 'Separate from other items',
  doNotStack: 'Do not stack',
  tempSensitiveKeepCool: 'Temperature sensitive - keep cool',
  requiresSignatureDelivery: 'Requires signature on delivery',
  packExtraBubbleWrap: 'Pack with extra bubble wrap',
  
  // EditOrder.tsx - Validation Messages
  pleaseSelectCustomer: 'Please select a customer',
  pleaseAddProduct: 'Please add at least one product to the order',
  allProductsMustHaveQuantity: 'All products must have a quantity greater than 0',
  
  // EditOrder.tsx - Category Names
  bundles: 'Bundles',
  services: 'Services',
  uncategorized: 'Uncategorized',
  
  // EditOrder.tsx - UI Labels
  itemAdded: 'item added',
  searchSelectProductsAbove: 'Search and select products above to add them',
  configurePricingNotes: 'Configure pricing and notes',
  shippingCostLabel: 'Shipping Cost',
  actualShippingCostLabel: 'Actual Shipping Cost',
  rounding: 'Rounding',
  total: 'Total',
  products: 'Products',
  requiredFieldsMissing: 'Required fields missing:',
  
  // OrderDetails.tsx - Additional Status/Priority Labels
  unknown: 'Unknown',
  paymentPending: 'Payment Pending',
  highPriority: 'High Priority',
  mediumPriority: 'Medium Priority',
  lowPriority: 'Low Priority',
  
  // OrderDetails.tsx - Customer Types
  vip: 'VIP',
  wholesale: 'Wholesale',
  business: 'Business',
  retail: 'Retail',
  
  // Sale Type (Order Type - Retail/Wholesale)
  saleType: 'Sale Type',
  retailOrder: 'Retail Order',
  wholesaleOrder: 'Wholesale Order',
  wholesalePricesApplied: 'Wholesale Prices Applied',
  retailPricesApplied: 'Retail Prices Applied',
  pricesUpdatedForSaleType: 'Item prices have been updated based on the selected sale type',
  
  // OrderDetails.tsx - Pick/Pack Activity
  pickingStarted: 'Picking Started',
  pickedItem: 'Picked: {{product}}',
  pickingCompleted: 'Picking Completed',
  packingStarted: 'Packing Started',
  packed: 'Packed',
  packedItem: 'Packed: {{product}}',
  packingCompleted: 'Packing Completed',
  
  // OrderDetails.tsx - Timeline/Progress
  trackingInformation: 'Tracking Information',
  trackingUpdatesNotImplemented: 'Tracking updates via API (not yet implemented)',
  trackingHash: 'Tracking #{{number}}',
  orderShippedTimeline: 'Order Shipped',
  readyToShipTimeline: 'Ready to Ship',
  packingCompletedTimeline: 'Packing Completed',
  packingStartedTimeline: 'Packing Started',
  pickingCompletedTimeline: 'Picking Completed',
  pickingStartedTimeline: 'Picking Started',
  paymentReceived: 'Payment Received',
  orderCreatedTimeline: 'Order Created',
  duration: 'Duration',
  awaitingShipment: 'Awaiting shipment',
  
  // OrderDetails.tsx - Actions & Dialogs
  edit: 'Edit',
  export: 'Export',
  returnThisItem: 'Return this item',
  setExclusivePrice: 'Set Exclusive Price',
  
  // OrderDetails.tsx - Picking Mode
  pickingProgress: 'Picking Progress',
  allItemsPickedReady: 'All items picked! Ready to ship.',
  markAllPicked: 'Mark All Picked',
  clearAll: 'Clear All',
  returnUnpickedItems: 'Return Unpicked Items',
  
  // OrderDetails.tsx - Return Dialog
  returnQty: 'Return Qty:',
  of: 'of',
  returnSummary: 'Return Summary',
  returning: 'Returning',
  itemsWithTotal: 'item(s) with a total of',
  units: 'unit(s)',
  totalReturnValue: 'Total Return Value:',
  
  // OrderDetails.tsx - Custom Price Dialog
  currentPrice: 'Current Price:',
  validToOptional: 'Valid To (Optional)',
  originalPrice: 'Original Price:',
  customPriceLabel: 'Custom Price:',
  priceComparison: 'Price Comparison',
  difference: 'Difference:',
  less: 'less',
  more: 'more',
  setForCustomer: 'Set a custom price for {{product}} for {{customer}}',
  
  // OrderDetails.tsx - Invoice Labels
  off: 'off',
  qtyColon: 'Qty:',
  skuColon: 'SKU:',
  priceColon: 'Price:',
  noteColon: 'Note:',
  
  // OrderDetails.tsx - Dialog Field Labels
  orderIdLabel: 'Order ID',
  customerLabel: 'Customer',
  orderDateLabel: 'Order Date',
  totalAmountLabel: 'Total Amount',
  totalAmount: 'Total Amount',
  
  // OrderDetails.tsx - Tickets
  noTicketsForOrder: 'No tickets for this order',
  viewAllTickets: 'View all {{count}} tickets',
  
  // OrderDetails.tsx - Attachments
  attachments: 'Attachments',
  viewAttachment: 'View Attachment',
  
  // OrderDetails.tsx - Misc Labels
  orderLink: 'Order link',
  message: 'Message',
  loc: 'Loc:',
  shippingLabelCarrier: 'Shipping Label - {{carrier}}',
  carrierUnknown: 'Unknown',
  pplDobirka: 'PPL - Dobírka',
  dhlNachnahme: 'DHL - Nachnahme',
  
  // PickPack.tsx - Main Workflow
  
  // PickPack.tsx - Tab Labels
  
  // PickPack.tsx - Quick Actions Section
  quickActions: 'Quick Actions',
  startNextPriorityOrder: 'Start Next Priority Order',
  batchPickingMode: 'Batch Picking Mode',
  disableBatchMode: 'Disable Batch Mode',
  optimizePickRoute: 'Optimize Pick Route',
  viewPerformanceStats: 'View Performance Stats',
  hideStats: 'Hide Stats',
  
  // PickPack.tsx - Performance Statistics Dialog
  performanceStatistics: 'Performance Statistics',
  dailyTarget: 'Daily Target',
  efficiencyScore: 'Efficiency Score',
  excellent: 'Excellent',
  ordersTarget: '{{completed}} / {{target}} orders',
  
  // PickPack.tsx - Today's Activity
  todaysActivity: 'Today\'s Activity',
  noActivityTodayYet: 'No activity today yet',
  activitiesWillAppear: 'Activities will appear as orders are processed',
  
  // PickPack.tsx - Batch Picking
  batchPickingModeActive: 'Batch Picking Mode Active',
  ordersSelected: '{{count}} orders selected',
  clearSelection: 'Clear Selection',
  startBatchPick: 'Start Batch Pick ({{count}})',
  ordersReadyToPick: 'Orders Ready to Pick ({{count}})',
  totalItemsAcrossOrders: '{{items}} total items across {{orders}} orders',
  totalItemsToPick: '{{items}} total items to pick',
  estimatedTime: '~{{hours}}h {{minutes}}m est.',
  
  // PickPack.tsx - Order Actions
  startPicking: 'Start Picking',
  startPacking: 'Start Packing',
  resumePicking: 'Resume Picking',
  start: 'Start',
  confirmShipment: 'Confirm Shipment',
  putOrderOnHold: 'Put Order On Hold',
  putOnHold: 'Put On Hold',
  cancelOrder: 'Cancel Order',
  sendBackToPick: 'Send back to Pick',
  ship: 'Ship',
  shipAll: 'Ship All',
  markAsShipped: 'Mark as Shipped',
  markAllAsShipped: 'Mark all as shipped',
  shipOrders: 'Ship {{count}}',
  
  // PickPack.tsx - Order States/Messages
  ordersBeingPicked: 'Orders Being Picked',
  readyForPacking: 'Ready for Packing',
  orderReady: 'order ready',
  ordersReady: 'orders ready',
  noOrdersCurrentlyBeingPicked: 'No orders currently being picked',
  noOrdersReadyForPacking: 'No orders ready for packing',
  noOrdersReadyToShip: 'No orders ready to ship',
  noPendingOrdersToPick: 'No pending orders to pick',
  noLabelGeneratedYet: 'No label generated yet',
  thisTrackingAlreadyUsed: 'This tracking number is already used by another carton',
  shippedOrdersFrom: 'Shipped {{count}} orders from {{title}}',
  shipCount: 'Ship {{count}}',
  modified: 'Modified',
  label: 'Label',
  repackOrder: 'Repack Order',
  returnToPacking: 'Return to Packing',
  packedBy: 'Packed by {{name}}',
  
  // PickPack.tsx - Carton & Packing
  cartonWithCount: 'Cartons ({{count}})',
  cartonOf: 'Carton {{current}} of {{total}}',
  dhlNachnahmeWithCOD: 'DHL Nachnahme (with COD)',
  recalculateCartonsTooltip: 'Recalculate cartons based on current items',
  
  // PickPack.tsx - Navigation & Controls
  focusBarcode: 'Focus Barcode',
  quickPickAllBundleItems: 'Quick Pick All Bundle Items',
  shipTo: 'Ship To',
  noAddressProvided: 'No address provided',
  goToThisItem: 'Go to This Item',
  close: 'Close',
  confirmShipmentAction: 'Confirm Shipment',
  continuePicking: 'Continue Picking',
  scan: 'Scan',
  done: 'Done',
  resume: 'Resume',
  pause: 'Pause',
  esc: 'Esc',
  
  // PickPack.tsx - Time & Progress
  progress: 'Progress',
  elapsed: 'Elapsed',
  elapsedTime: 'Elapsed Time',
  pickingTime: 'Picking Time',
  packingTime: 'Packing Time',
  completePackingReadyForShipping: 'Complete Packing - Ready for Shipping',
  completeAllStepsToFinishPacking: 'Complete All Steps to Finish Packing',
  forceFinishPacking: 'Force Finish Packing (Skip Checks)',
  forceFinishWarning: 'This will complete packing without verifying all steps. Use only if you are certain everything is correct.',
  
  // PickPack.tsx - Details & Information
  details: 'Details',
  viewFullDetails: 'View Full Details',
  adminAccessRequired: 'Admin access required',
  specialHandling: 'SPECIAL HANDLING',
  shippingDetails: 'Shipping Details',
  shippedOrdersCount: 'Shipped {{count}} orders',
  
  // PickPack.tsx - GLS/DHL Forms
  paket: 'Paket',
  paketAndPaymentDetails: 'Paket & Zahlungsdetails',
  paketgrosse: 'Paketgröße*',
  dobirka: 'Dobírka (COD)',
  iban: 'IBAN*',
  bic: 'BIC*',
  kontoinhaber: 'Kontoinhaber*',
  betragInEUR: 'Betrag in EUR*',
  verwendungszweck: 'Verwendungszweck*',
  adresszusatz: 'Adresszusatz',
  eMailDesEmpfangers: 'E-Mail des Empfängers*',
  eMailDesAbsenders: 'E-Mail des Absenders*',
  
  // PickPack.tsx - Shipping Label Actions
  updateTrackingFromBarcode: 'Update tracking number from label barcode',
  creatingShippingLabel: 'Creating shipping label from PPL API',
  pplLabelCreatedSuccess: 'PPL shipping label created successfully',
  shippingLabelTitle: 'Shipping Label - {{orderId}}',
  cartonDataPreservedCanRegenerate: 'Carton data preserved. You can regenerate the label if needed.',
  
  // PickPack.tsx - Dialogs
  confirmShipmentDialog: 'Are you sure you want to mark this order as shipped?',
  confirmShipAllDialog: 'Are you sure you want to mark all {{count}} orders as shipped?',
  resetOrderDialog: 'This will clear all picked quantities. Are you sure?',
  resetOrderDialogDetailed: 'Are you sure you want to reset this order? All picked quantities will be cleared and you\'ll start from the beginning.',
  putOnHoldDialog: 'Are you sure you want to put this order on hold?',
  putOnHoldDialogDetailed: 'Are you sure you want to put order {{orderId}} on hold? The order will be paused and can be resumed later.',
  cancelOrderDialog: 'Are you sure you want to cancel this order?',
  cancelOrderDialogDetailed: 'Are you sure you want to cancel order {{orderId}}? This action will mark the order as cancelled.',
  downloadPDF: 'Download PDF',
  deleteAllLabelsConfirm: 'Delete all {{count}} shipping labels?\\n\\nThis will cancel all shipments with PPL. Your carton data (weight, dimensions) will be preserved.\\n\\nAfter deletion, you can regenerate labels using the "Generate All Labels" button.',
  deleteThisLabelConfirm: 'Delete this label?\\n\\nThis will cancel the shipment with PPL. Your carton data will be preserved.',
  deleteLabelConfirmShort: 'Delete label #{{number}}?\\n\\nThis will cancel the shipment with PPL.',
  
  // PickPack.tsx - Image & Visual Elements
  packingInstructionsImage: 'Packing instructions',
  clickToExpand: 'Click to expand image',
  hideBarcode: 'Hide barcode scanner',
  showBarcode: 'Show barcode scanner',
  clickToMarkVerified: 'Click to mark all items as verified',
  clickToUnverifyAll: 'Click to unverify all items',
  
  // PickPack.tsx - Status & Totals
  date: 'Date:',
  totalCartons: 'Total Cartons:',
  totalLabels: 'Total Labels:',
  forMaterial: 'For: {{name}}',
  glsShippingLabelsCount: 'GLS Shipping Labels ({{count}})',
  pickedBy: 'Picked by {{name}}',
  trackingLabel: 'Tracking: {{number}}',
  forCartonNumber: 'For Carton #{{number}}',
  shippingLabelNumber: 'Shipping Label #{{number}}',
  orderPrefix: 'Order {{orderId}}',
  
  // PickPack.tsx - Notes & Instructions Headers
  packingInstructionsHeader: 'PACKING INSTRUCTIONS',
  
  // PickPack.tsx - Shipping Labels
  dhlShippingLabel: 'DHL Shipping Label',
  
  // PickPack.tsx - Error Messages
  failedToUpdateTracking: 'Failed to update tracking number',
  failedToCancelPPLLabels: 'Failed to cancel PPL labels',
  failedToDeletePPLLabels: 'Failed to delete PPL labels',
  failedToGenerateLabels: 'Failed to generate labels',
  
  // OrderDetails.tsx - Page Elements
  noTicketsForThisOrder: 'No tickets for this order',
  
  // AddOrder.tsx - Mobile Order Summary
  shippingMethod: 'Shipping Method',
  subtotalColon: 'Subtotal:',
  shippingColon: 'Shipping:',
  taxWithRate: 'Tax ({{rate}}%):',
  creatingOrder: 'Creating...',
  
  // PickPack.tsx - Packing Mode Card Headers
  noPackingMaterialsSpecified: 'No packing materials specified for this order',
  recalculating: 'Recalculating...',
  recalculateAI: 'Recalculate AI',
  addAnotherCarton: 'Add Another Carton',
  documentsWithCount: 'Documents ({{count}})',
  printAll: 'Print All',
  printingDots: 'Printing...',
  allDocumentsMergedAndPrinted: 'All {{count}} document(s) merged and marked as printed',
  glsMaxWeightInfo: 'Max. 40 kg • Circumference + longest side max. 300 cm',
  
  // PickPack.tsx - DHL Shipping
  dhlShipping: 'DHL Shipping',
  createLabelOnDhlWebsite: 'Create Label on DHL Website',
  packageAndPaymentDetails: 'Package & Payment Details',
  packageSize: 'Package Size',
  totalWeightRecommended: 'Total weight: {{weight}} kg → Recommended: {{size}} Package',
  nachnahmeWithFee: 'Cash on Delivery (+8.99€)',
  nachnahmeDescription: 'Should payment be collected upon delivery?',
  bankDetailsNotConfigured: 'Bank details not configured in settings',
  recipientAddress: 'Recipient',
  frequentBuyerInAddressbook: 'Frequent buyer - Already in DHL addressbook',
  importantBicIbanNote: 'Important: Please enter BIC and IBAN in uppercase letters (A-Z) and digits (0-9).',
  
  // PickPack.tsx - GLS Shipping
  glsShippingWithCartons: 'GLS Shipping ({{count}} {{cartonText}})',
  cartonSingular: 'carton',
  additionalCartonsViaGls: 'Additional cartons shipped via GLS for cost savings',
  totalWeightKg: 'Total weight: {{weight}} kg',
  cartonNumberGls: 'Carton #{{number}} (GLS)',
  
  // PickPack.tsx - PPL Shipping
  creatingLabels: 'Creating Labels...',
  generatePplLabels: 'Generate PPL Labels',
  retrieving: 'Retrieving...',
  retryLabelDownload: 'Retry Label Download',
  shippingLabelsWithCount: 'Shipping Labels ({{count}})',
  
  // OrderTrackingPanel.tsx - Shipment Tracking
  shipmentTracking: 'Shipment Tracking',
  noTrackingInfo: 'No tracking information available for this order',
  trackingDisabled: 'Tracking is disabled. Enable it in Settings to view shipment tracking.',
  loadingTrackingInfo: 'Loading tracking information...',
  cartonTracked: '{{count}} carton tracked',
  cartonsTracked: '{{count}} cartons tracked',
  trackingRefreshed: 'Tracking Refreshed',
  trackingInfoUpdated: 'Tracking information has been updated',
  refreshFailed: 'Refresh Failed',
  failedToRefreshTracking: 'Failed to refresh tracking information',
  trackingHistory: 'Tracking History',
  estimatedDelivery: 'Estimated Delivery',
  
  // DHL Bookmarklet Autofill
  prepareDhlAutofill: 'Prepare DHL Autofill',
  dhlAutofillReady: 'DHL Autofill Ready',
  dhlAutofillPrepared: 'DHL Autofill Prepared',
  dhlAutofillReadyDescription: 'Data saved. Open DHL website and click your bookmarklet to autofill.',
  dhlBookmarkletTitle: 'DHL Autofill Bookmarklet Setup',
  dhlBookmarkletDescription: 'Set up a browser bookmark to automatically fill DHL shipping forms with order data.',
  dhlBookmarkletStep1Title: 'Prepare Order Data',
  dhlBookmarkletStep1Desc: 'Click "Prepare DHL Autofill" button to save the current order data for autofill.',
  dhlBookmarkletStep2Title: 'Create Bookmarklet',
  dhlBookmarkletStep2Desc: 'Copy the code below and create a new browser bookmark. Paste this code as the URL/Location field.',
  dhlBookmarkletStep3Title: 'Open DHL Website',
  dhlBookmarkletStep3Desc: 'Navigate to DHL Online Frankieren (Product Selection page or Address Input page).',
  dhlBookmarkletStep4Title: 'Click Your Bookmarklet',
  dhlBookmarkletStep4Desc: 'Click the bookmarklet from your bookmarks bar. It will automatically fill all form fields!',
  dhlBookmarkletNote: 'The bookmarklet contains order-specific data and works on both the Product Selection page (country, package size, COD) and the Address Input page (recipient/sender details). Click it on each page to fill the forms.',
  bookmarkletCodeCopied: 'Bookmarklet code copied to clipboard',
  clickPrepareFirst: 'Click "Prepare DHL Autofill" button first to generate the bookmarklet code',
  
  // DHL Bookmarklet - First Time Setup Section
  firstTimeSetup: 'First Time Setup (One-Time Only)',
  setupStepA: 'Copy the Bookmarklet Code',
  setupStepADesc: 'First, click "Prepare DHL Autofill" on an order, then copy the code below.',
  setupStepB: 'Create a Browser Bookmark',
  setupStepBDesc: 'Create a new bookmark in your browser and paste the code as the URL.',
  chromeInstructions: 'Chrome/Edge',
  chromeStep1: 'Right-click bookmarks bar → "Add page..."',
  chromeStep2: 'Name it "DHL Autofill"',
  chromeStep3: 'In URL field, paste the copied code',
  chromeStep4: 'Click "Save"',
  firefoxInstructions: 'Firefox',
  firefoxStep1: 'Right-click bookmarks bar → "Add Bookmark..."',
  firefoxStep2: 'Name it "DHL Autofill"',
  firefoxStep3: 'In Location field, paste the copied code',
  firefoxStep4: 'Click "Save"',
  
  // DHL Bookmarklet - Daily Usage Section
  dailyUsage: 'Daily Usage (Every Order)',
  usageStep1Title: 'Prepare Order Data',
  usageStep1Desc: 'Click "Prepare DHL Autofill" button for the order you want to ship.',
  usageStep2Title: 'Update Your Bookmark',
  usageStep2Desc: 'Copy the new code and update your bookmark URL (right-click → Edit).',
  usageStep3Title: 'Open DHL Website',
  usageStep3Desc: 'Go to DHL Online Frankieren (www.dhl.de/de/privatkunden/pakete-versenden/online-frankieren.html)',
  usageStep4Title: 'Click Your Bookmark',
  usageStep4Desc: 'Click "DHL Autofill" bookmark on the Product Selection or Address pages. Forms will be filled automatically!',
  
  // DHL Bookmarklet - Notes
  importantNotes: 'Important Notes',
  bookmarkletNote1: 'You need to update the bookmark code for each new order (each order has different data).',
  bookmarkletNote2: 'The bookmarklet works on both Product Selection and Address Input pages - click it on each page.',
  bookmarkletNote3: 'If fields are not filled, refresh the DHL page and try clicking the bookmark again.',
  
  // DHL Unified Button
  openDhlAgain: 'Open DHL Again',
  dhlAutofillOpenedDescription: 'DHL website opened. Copy the bookmarklet code below and use it to autofill.',
  autofillReady: 'Autofill Ready',
  copyBookmarkletInstructions: 'Copy the bookmarklet code, add it to your browser bookmarks, then click it on the DHL page to autofill.',
  copyBookmarklet: 'Copy Bookmarklet',
  fullInstructions: 'Full Instructions',
  setupInstructions: 'Setup Instructions',
  createLabelOnDHL: 'Create Label on DHL Website',
  openDhlWebsite: 'Open DHL Website',
  viewSetupInstructions: 'View setup instructions',
  dragToBookmarksBar: 'Drag to bookmarks bar',
  dragToBookmarksBarDesc: 'Drag this button to your bookmarks bar to save it!',
  orRightClickAddBookmark: 'Or right-click and "Add to Bookmarks"',
  
} as const;

export default orders;
