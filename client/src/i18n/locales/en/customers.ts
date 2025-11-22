const customers = {
  // Module Name
  customers: 'Customers',
  customer: 'Customer',
  customerManagement: 'Customer Management',
  
  // Actions
  addCustomer: 'Add Customer',
  editCustomer: 'Edit Customer',
  viewCustomer: 'View Customer',
  deleteCustomer: 'Delete Customer',
  
  // Customer Fields
  customerName: 'Customer Name',
  customerCode: 'Customer Code',
  companyName: 'Company Name',
  contactPerson: 'Contact Person',
  email: 'Email',
  phone: 'Phone',
  mobile: 'Mobile',
  
  // Address
  address: 'Address',
  shippingAddress: 'Shipping Address',
  billingAddress: 'Billing Address',
  street: 'Street',
  city: 'City',
  state: 'State',
  postalCode: 'Postal Code',
  country: 'Country',
  
  // Customer Details
  customerType: 'Customer Type',
  retail: 'Retail',
  wholesale: 'Wholesale',
  vip: 'VIP',
  
  // Financial
  creditLimit: 'Credit Limit',
  balance: 'Balance',
  totalOrders: 'Total Orders',
  totalSpent: 'Total Spent',
  
  // Messages
  customerCreated: 'Customer created successfully',
  customerUpdated: 'Customer updated successfully',
  customerDeleted: 'Customer deleted successfully',
  failedToLoadCustomers: 'Failed to load customers',
  deletedCustomersSuccess: 'Deleted {{count}} customer(s) successfully',
  failedToDeleteCustomers: 'Failed to delete customers',
  cannotDeleteCustomerHasRecords: 'Cannot delete customer with existing orders or records',
  loadingCustomers: 'Loading customers...',
  monitorCustomerRelationships: 'Monitor customer relationships and loyalty',
  totalCustomers: 'Total Customers',
  vipCustomers: 'VIP Customers',
  regularCustomers: 'Regular Customers',
  lastPurchase: 'Last Purchase',
  blacklistCustomer: 'Blacklist Customer',
  blacklistCustomerDescription: 'Blacklisted {{name}}',
  updateType: 'Update Type',
  sendingEmailToCustomers: 'Sending email to {{count}} customer(s)',
  updatingTypeForCustomers: 'Updating type for {{count}} customer(s)',
  exportingCustomers: 'Exporting {{count}} customer(s)',
  noCustomersToExport: 'No customers to export',
  exportedCustomersToXLSX: 'Exported {{count}} customer(s) to XLSX',
  failedToExportCustomersToXLSX: 'Failed to export customers to XLSX',
  exportedCustomersToPDF: 'Exported {{count}} customer(s) to PDF',
  failedToExportCustomersToPDF: 'Failed to export customers to PDF',
  customersReport: 'Customers Report',
  lifetimeSpending: 'Lifetime Spending',
  
  // Customer Details Page
  loadingCustomerDetails: 'Loading customer details...',
  customerFor: 'Customer for {{duration}}',
  avgOrder: 'Avg Order',
  unpaid: 'Unpaid',
  prices: 'Prices',
  tickets: 'Tickets',
  locationBusinessInfo: 'Location & Business Info',
  taxBusinessInfo: 'Tax & Business Information',
  facebookId: 'Facebook ID',
  facebookName: 'Facebook Name',
  vatNumber: 'VAT Number',
  vatStatus: 'VAT Status',
  valid: 'Valid',
  invalid: 'Invalid',
  lastChecked: 'Last checked',
  companyName: 'Company Name',
  noTaxInfo: 'No tax information available',
  preferredCurrency: 'Preferred Currency',
  companyAddress: 'Company Address',
  euVatInformation: 'EU VAT Information',
  czechCompanyInformation: 'Czech Company Information',
  
  // Contact Information
  contactInformation: 'Contact Information',
  noContactInformation: 'No contact information available',
  
  // Shipping & Billing Addresses
  shippingAddresses: 'Shipping Addresses',
  billingAddresses: 'Billing Addresses',
  noShippingAddresses: 'No shipping addresses added yet',
  shippingAddressesWillAppear: 'Shipping addresses will appear here when added',
  noBillingAddresses: 'No billing addresses added yet',
  billingAddressesWillAppear: 'Billing addresses will appear here when added',
  primary: 'Primary',
  billingAddress: 'Billing Address',
  
  // Order History
  orderHistory: 'Order History',
  of: 'of',
  collapseAll: 'Collapse All',
  expandAll: 'Expand All',
  searchOrdersPlaceholder: 'Search orders, items, products...',
  noOrders: 'No orders found',
  ordersWillAppear: 'Orders will appear here once created',
  noOrdersMatch: 'No orders match your search',
  tryDifferentSearch: 'Try a different search term',
  clearSearch: 'Clear Search',
  item: 'item',
  items: 'items',
  paid: 'Paid',
  payLater: 'Pay Later',
  
  // Order Statuses
  toFulfill: 'To Fulfill',
  readyToShip: 'Ready to Ship',
  delivered: 'Delivered',
  shipped: 'Shipped',
  cancelled: 'Cancelled',
  pending: 'Pending',
  
  // Order Details
  viewOrder: 'View Order',
  showItems: 'Show Items',
  hideItems: 'Hide Items',
  quantity: 'Quantity',
  unitPrice: 'Unit Price',
  
  // Tickets
  noTickets: 'No tickets found',
  ticketsWillAppear: 'Tickets will appear here once created',
  createTicket: 'Create Ticket',
  viewAllTickets: 'View All Tickets',
  
} as const;

export default customers;
