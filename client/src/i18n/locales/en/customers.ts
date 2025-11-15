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
  
} as const;

export default customers;
