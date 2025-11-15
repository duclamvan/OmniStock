const products = {
  // Module Name
  products: 'Sản phẩm',
  product: 'Sản phẩm',
  productManagement: 'Quản lý sản phẩm',
  
  // Actions
  addProduct: 'Thêm sản phẩm',
  editProduct: 'Chỉnh sửa sản phẩm',
  viewProduct: 'Xem sản phẩm',
  deleteProduct: 'Xóa sản phẩm',
  
  // Product Fields
  productName: 'Tên sản phẩm',
  productCode: 'Mã sản phẩm',
  sku: 'SKU',
  barcode: 'Barcode',
  description: 'Mô tả',
  category: 'Danh mục',
  brand: 'Thương hiệu',
  supplier: 'Nhà cung cấp',
  
  // Pricing
  costPrice: 'Giá nhập',
  sellingPrice: 'Giá bán',
  retailPrice: 'Giá bán lẻ',
  wholesalePrice: 'Giá bán sỉ',
  margin: 'Lợi nhuận',
  markup: 'Tỷ suất lợi nhuận',
  
  // Product Details
  weight: 'Khối lượng',
  dimensions: 'Kích thước',
  length: 'Dài',
  width: 'Rộng',
  height: 'Cao',
  volume: 'Thể tích',
  color: 'Màu sắc',
  size: 'Kích cỡ',
  
  // Product Types
  regular: 'Thông thường',
  bundle: 'Combo',
  service: 'Dịch vụ',
  variant: 'Biến thể',
  
  // Stock
  stockQty: 'Số lượng tồn kho',
  minStock: 'Tồn kho tối thiểu',
  maxStock: 'Tồn kho tối đa',
  reorderPoint: 'Điểm đặt hàng lại',
  
  // Product Status
  inStock: 'Còn hàng',
  lowStock: 'Tồn kho thấp',
  outOfStock: 'Hết hàng',
  discontinued: 'Ngừng kinh doanh',
  
  // Messages
  productCreated: 'Tạo sản phẩm thành công',
  productUpdated: 'Cập nhật sản phẩm thành công',
  productDeleted: 'Xóa sản phẩm thành công',
  
} as const;

export default products;
