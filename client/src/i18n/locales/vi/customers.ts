const customers = {
  // Module Name
  customers: 'Khách hàng',
  customer: 'Khách hàng',
  customerManagement: 'Quản lý khách hàng',
  
  // Actions
  addCustomer: 'Thêm khách hàng',
  editCustomer: 'Chỉnh sửa khách hàng',
  viewCustomer: 'Xem khách hàng',
  deleteCustomer: 'Xóa khách hàng',
  
  // Customer Fields
  customerName: 'Tên khách hàng',
  customerCode: 'Mã khách hàng',
  companyName: 'Tên công ty',
  contactPerson: 'Người liên hệ',
  email: 'Email',
  phone: 'Điện thoại',
  mobile: 'Di động',
  
  // Address
  address: 'Địa chỉ',
  shippingAddress: 'Địa chỉ giao hàng',
  billingAddress: 'Địa chỉ thanh toán',
  street: 'Đường',
  city: 'Thành phố',
  state: 'Tỉnh/Thành',
  postalCode: 'Mã bưu điện',
  country: 'Quốc gia',
  
  // Customer Details
  customerType: 'Loại khách hàng',
  retail: 'Bán lẻ',
  wholesale: 'Bán sỉ',
  vip: 'VIP',
  
  // Financial
  creditLimit: 'Hạn mức tín dụng',
  balance: 'Số dư',
  totalOrders: 'Tổng đơn hàng',
  totalSpent: 'Tổng chi tiêu',
  
  // Messages
  customerCreated: 'Tạo khách hàng thành công',
  customerUpdated: 'Cập nhật khách hàng thành công',
  customerDeleted: 'Xóa khách hàng thành công',
  
} as const;

export default customers;
