import * as XLSX from 'xlsx';
import { db } from '../db';
import {
  products,
  customers,
  warehouses,
  suppliers,
  discounts,
  expenses,
  importBatches,
  importBatchItems,
  type InsertImportBatch,
  type InsertImportBatchItem,
} from '@shared/schema';
import { eq, sql } from 'drizzle-orm';

type EntityType = 'products' | 'customers' | 'warehouses' | 'suppliers' | 'discounts' | 'returns' | 'expenses';

interface ColumnConfig {
  key: string;
  label: string;
  viLabel?: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'decimal';
  required: boolean;
}

interface EntityConfig {
  tableName: string;
  columns: ColumnConfig[];
  validateRow: (row: Record<string, any>) => { valid: boolean; errors: string[]; processedData: Record<string, any> };
}

const entityConfigs: Record<EntityType, EntityConfig> = {
  products: {
    tableName: 'products',
    columns: [
      { key: 'name', label: 'Name', viLabel: 'Tên', type: 'string', required: true },
      { key: 'vietnameseName', label: 'Vietnamese Name', viLabel: 'Tên Tiếng Việt', type: 'string', required: false },
      { key: 'sku', label: 'SKU', viLabel: 'Mã SKU', type: 'string', required: true },
      { key: 'categoryId', label: 'Category ID', viLabel: 'Mã Danh Mục', type: 'string', required: false },
      { key: 'warehouseId', label: 'Warehouse ID', viLabel: 'Mã Kho', type: 'string', required: false },
      { key: 'supplierId', label: 'Supplier ID', viLabel: 'Mã Nhà Cung Cấp', type: 'string', required: false },
      { key: 'description', label: 'Description', viLabel: 'Mô Tả', type: 'string', required: false },
      { key: 'quantity', label: 'Quantity', viLabel: 'Số Lượng', type: 'number', required: false },
      { key: 'lowStockAlert', label: 'Low Stock Alert', viLabel: 'Cảnh Báo Tồn Kho Thấp', type: 'number', required: false },
      { key: 'lowStockAlertType', label: 'Low Stock Alert Type', viLabel: 'Loại Cảnh Báo Tồn Kho', type: 'string', required: false },
      { key: 'priceCzk', label: 'Price CZK', viLabel: 'Giá CZK', type: 'decimal', required: false },
      { key: 'priceEur', label: 'Price EUR', viLabel: 'Giá EUR', type: 'decimal', required: false },
      { key: 'priceUsd', label: 'Price USD', viLabel: 'Giá USD', type: 'decimal', required: false },
      { key: 'priceVnd', label: 'Price VND', viLabel: 'Giá VND', type: 'decimal', required: false },
      { key: 'priceCny', label: 'Price CNY', viLabel: 'Giá CNY', type: 'decimal', required: false },
      { key: 'wholesalePriceCzk', label: 'Wholesale Price CZK', viLabel: 'Giá Sỉ CZK', type: 'decimal', required: false },
      { key: 'wholesalePriceEur', label: 'Wholesale Price EUR', viLabel: 'Giá Sỉ EUR', type: 'decimal', required: false },
      { key: 'importCostUsd', label: 'Import Cost USD', viLabel: 'Giá Nhập USD', type: 'decimal', required: false },
      { key: 'importCostCzk', label: 'Import Cost CZK', viLabel: 'Giá Nhập CZK', type: 'decimal', required: false },
      { key: 'importCostEur', label: 'Import Cost EUR', viLabel: 'Giá Nhập EUR', type: 'decimal', required: false },
      { key: 'importCostVnd', label: 'Import Cost VND', viLabel: 'Giá Nhập VND', type: 'decimal', required: false },
      { key: 'importCostCny', label: 'Import Cost CNY', viLabel: 'Giá Nhập CNY', type: 'decimal', required: false },
      { key: 'barcode', label: 'Barcode', viLabel: 'Mã Vạch', type: 'string', required: false },
      { key: 'imageUrl', label: 'Image URL', viLabel: 'Đường Dẫn Ảnh', type: 'string', required: false },
      { key: 'length', label: 'Length', viLabel: 'Chiều Dài', type: 'decimal', required: false },
      { key: 'width', label: 'Width', viLabel: 'Chiều Rộng', type: 'decimal', required: false },
      { key: 'height', label: 'Height', viLabel: 'Chiều Cao', type: 'decimal', required: false },
      { key: 'dimensionUnit', label: 'Dimension Unit', viLabel: 'Đơn Vị Kích Thước', type: 'string', required: false },
      { key: 'weight', label: 'Weight', viLabel: 'Cân Nặng', type: 'decimal', required: false },
      { key: 'weightUnit', label: 'Weight Unit', viLabel: 'Đơn Vị Cân Nặng', type: 'string', required: false },
      { key: 'unitWeightKg', label: 'Unit Weight Kg', viLabel: 'Cân Nặng Đơn Vị Kg', type: 'decimal', required: false },
      { key: 'unitLengthCm', label: 'Unit Length Cm', viLabel: 'Chiều Dài Đơn Vị Cm', type: 'decimal', required: false },
      { key: 'unitWidthCm', label: 'Unit Width Cm', viLabel: 'Chiều Rộng Đơn Vị Cm', type: 'decimal', required: false },
      { key: 'unitHeightCm', label: 'Unit Height Cm', viLabel: 'Chiều Cao Đơn Vị Cm', type: 'decimal', required: false },
      { key: 'isActive', label: 'Is Active', viLabel: 'Hoạt Động', type: 'boolean', required: false },
      { key: 'warehouseLocation', label: 'Warehouse Location', viLabel: 'Vị Trí Kho', type: 'string', required: false },
      { key: 'shipmentNotes', label: 'Shipment Notes', viLabel: 'Ghi Chú Vận Chuyển', type: 'string', required: false },
      { key: 'packingMaterialId', label: 'Packing Material ID', viLabel: 'Mã Vật Liệu Đóng Gói', type: 'string', required: false },
      { key: 'packingInstructionsText', label: 'Packing Instructions', viLabel: 'Hướng Dẫn Đóng Gói', type: 'string', required: false },
      { key: 'packagingRequirement', label: 'Packaging Requirement', viLabel: 'Yêu Cầu Đóng Gói', type: 'string', required: false },
      { key: 'sellingUnitName', label: 'Selling Unit Name', viLabel: 'Đơn Vị Bán', type: 'string', required: false },
      { key: 'bulkUnitName', label: 'Bulk Unit Name', viLabel: 'Đơn Vị Lớn', type: 'string', required: false },
      { key: 'bulkUnitQty', label: 'Bulk Unit Qty', viLabel: 'Số Lượng Đơn Vị Lớn', type: 'number', required: false },
      { key: 'bulkPriceCzk', label: 'Bulk Price CZK', viLabel: 'Giá Lớn CZK', type: 'decimal', required: false },
      { key: 'bulkPriceEur', label: 'Bulk Price EUR', viLabel: 'Giá Lớn EUR', type: 'decimal', required: false },
      { key: 'allowBulkSales', label: 'Allow Bulk Sales', viLabel: 'Cho Phép Bán Sỉ', type: 'boolean', required: false },
      { key: 'unitContentsInfo', label: 'Unit Contents Info', viLabel: 'Thông Tin Đơn Vị', type: 'string', required: false },
      { key: 'minStockLevel', label: 'Min Stock Level', viLabel: 'Tồn Kho Tối Thiểu', type: 'number', required: false },
      { key: 'maxStockLevel', label: 'Max Stock Level', viLabel: 'Tồn Kho Tối Đa', type: 'number', required: false },
      { key: 'isVirtual', label: 'Is Virtual', viLabel: 'Sản Phẩm Ảo', type: 'boolean', required: false },
      { key: 'masterProductId', label: 'Master Product ID', viLabel: 'Mã Sản Phẩm Gốc', type: 'string', required: false },
      { key: 'inventoryDeductionRatio', label: 'Inventory Deduction Ratio', viLabel: 'Tỷ Lệ Trừ Tồn Kho', type: 'decimal', required: false },
    ],
    validateRow: (row) => {
      const errors: string[] = [];
      const processedData: Record<string, any> = {};

      if (!row.name || String(row.name).trim() === '') {
        errors.push('Name is required');
      } else {
        processedData.name = String(row.name).trim();
      }

      if (!row.sku || String(row.sku).trim() === '') {
        errors.push('SKU is required');
      } else {
        processedData.sku = String(row.sku).trim();
      }

      if (row.quantity !== undefined && row.quantity !== '') {
        const qty = parseInt(String(row.quantity), 10);
        if (isNaN(qty) || qty < 0) {
          errors.push('Quantity must be a non-negative integer');
        } else {
          processedData.quantity = qty;
        }
      }

      const decimalFields = [
        'priceCzk', 'priceEur', 'priceUsd', 'priceVnd', 'priceCny',
        'wholesalePriceCzk', 'wholesalePriceEur', 
        'importCostUsd', 'importCostCzk', 'importCostEur', 'importCostVnd', 'importCostCny',
        'length', 'width', 'height', 'weight',
        'unitWeightKg', 'unitLengthCm', 'unitWidthCm', 'unitHeightCm',
        'bulkPriceCzk', 'bulkPriceEur', 'inventoryDeductionRatio'
      ];
      for (const field of decimalFields) {
        if (row[field] !== undefined && row[field] !== '') {
          const val = parseFloat(String(row[field]));
          if (isNaN(val)) {
            errors.push(`${field} must be a valid number`);
          } else {
            processedData[field] = String(val);
          }
        }
      }

      const stringFields = [
        'vietnameseName', 'categoryId', 'warehouseId', 'supplierId', 'description', 
        'barcode', 'imageUrl', 'warehouseLocation', 'shipmentNotes',
        'packingMaterialId', 'packingInstructionsText', 'packagingRequirement',
        'dimensionUnit', 'weightUnit',
        'sellingUnitName', 'bulkUnitName', 'unitContentsInfo',
        'lowStockAlertType', 'masterProductId'
      ];
      for (const field of stringFields) {
        if (row[field] !== undefined && row[field] !== '') {
          processedData[field] = String(row[field]).trim();
        }
      }

      const booleanFields = ['isActive', 'allowBulkSales', 'isVirtual'];
      for (const field of booleanFields) {
        if (row[field] !== undefined && row[field] !== '') {
          processedData[field] = String(row[field]).toLowerCase() === 'true' || row[field] === true || row[field] === 1;
        }
      }

      const intFields = ['lowStockAlert', 'bulkUnitQty', 'minStockLevel', 'maxStockLevel'];
      for (const field of intFields) {
        if (row[field] !== undefined && row[field] !== '') {
          const val = parseInt(String(row[field]), 10);
          if (!isNaN(val)) {
            processedData[field] = val;
          }
        }
      }

      return { valid: errors.length === 0, errors, processedData };
    },
  },

  customers: {
    tableName: 'customers',
    columns: [
      { key: 'name', label: 'Name', viLabel: 'Tên', type: 'string', required: true },
      { key: 'facebookName', label: 'Facebook Name', viLabel: 'Tên Facebook', type: 'string', required: false },
      { key: 'facebookUrl', label: 'Facebook URL', viLabel: 'Đường Dẫn Facebook', type: 'string', required: false },
      { key: 'email', label: 'Email', viLabel: 'Email', type: 'string', required: false },
      { key: 'phone', label: 'Phone', viLabel: 'Điện Thoại', type: 'string', required: false },
      { key: 'address', label: 'Address', viLabel: 'Địa Chỉ', type: 'string', required: false },
      { key: 'city', label: 'City', viLabel: 'Thành Phố', type: 'string', required: false },
      { key: 'zipCode', label: 'Zip Code', viLabel: 'Mã Bưu Điện', type: 'string', required: false },
      { key: 'country', label: 'Country', viLabel: 'Quốc Gia', type: 'string', required: false },
      { key: 'notes', label: 'Notes', viLabel: 'Ghi Chú', type: 'string', required: false },
      { key: 'type', label: 'Type', viLabel: 'Loại', type: 'string', required: false },
      { key: 'vatId', label: 'VAT ID', viLabel: 'Mã VAT', type: 'string', required: false },
      { key: 'taxId', label: 'Tax ID', viLabel: 'Mã Thuế', type: 'string', required: false },
      { key: 'preferredLanguage', label: 'Preferred Language', viLabel: 'Ngôn Ngữ Ưa Thích', type: 'string', required: false },
      { key: 'preferredCurrency', label: 'Preferred Currency', viLabel: 'Tiền Tệ Ưa Thích', type: 'string', required: false },
      { key: 'billingFirstName', label: 'Billing First Name', viLabel: 'Tên Thanh Toán', type: 'string', required: false },
      { key: 'billingLastName', label: 'Billing Last Name', viLabel: 'Họ Thanh Toán', type: 'string', required: false },
      { key: 'billingCompany', label: 'Billing Company', viLabel: 'Công Ty Thanh Toán', type: 'string', required: false },
      { key: 'billingEmail', label: 'Billing Email', viLabel: 'Email Thanh Toán', type: 'string', required: false },
      { key: 'billingTel', label: 'Billing Tel', viLabel: 'Điện Thoại Thanh Toán', type: 'string', required: false },
      { key: 'billingStreet', label: 'Billing Street', viLabel: 'Đường Thanh Toán', type: 'string', required: false },
      { key: 'billingCity', label: 'Billing City', viLabel: 'Thành Phố Thanh Toán', type: 'string', required: false },
      { key: 'billingZipCode', label: 'Billing Zip Code', viLabel: 'Mã Bưu Điện Thanh Toán', type: 'string', required: false },
      { key: 'billingCountry', label: 'Billing Country', viLabel: 'Quốc Gia Thanh Toán', type: 'string', required: false },
      { key: 'ico', label: 'ICO', viLabel: 'ICO', type: 'string', required: false },
      { key: 'dic', label: 'DIC', viLabel: 'DIC', type: 'string', required: false },
    ],
    validateRow: (row) => {
      const errors: string[] = [];
      const processedData: Record<string, any> = {};

      if (!row.name || String(row.name).trim() === '') {
        errors.push('Name is required');
      } else {
        processedData.name = String(row.name).trim();
      }

      const stringFields = ['facebookName', 'facebookUrl', 'email', 'phone', 'address', 'city', 
                            'zipCode', 'country', 'notes', 'type', 'vatId', 'taxId', 
                            'preferredLanguage', 'preferredCurrency', 'billingFirstName', 
                            'billingLastName', 'billingCompany', 'billingEmail', 'billingTel',
                            'billingStreet', 'billingCity', 'billingZipCode', 'billingCountry',
                            'ico', 'dic'];
      for (const field of stringFields) {
        if (row[field] !== undefined && row[field] !== '') {
          processedData[field] = String(row[field]).trim();
        }
      }

      return { valid: errors.length === 0, errors, processedData };
    },
  },

  warehouses: {
    tableName: 'warehouses',
    columns: [
      { key: 'id', label: 'ID', viLabel: 'Mã', type: 'string', required: true },
      { key: 'code', label: 'Code', viLabel: 'Mã Kho', type: 'string', required: false },
      { key: 'name', label: 'Name', viLabel: 'Tên', type: 'string', required: true },
      { key: 'location', label: 'Location', viLabel: 'Vị Trí', type: 'string', required: false },
      { key: 'address', label: 'Address', viLabel: 'Địa Chỉ', type: 'string', required: false },
      { key: 'city', label: 'City', viLabel: 'Thành Phố', type: 'string', required: false },
      { key: 'country', label: 'Country', viLabel: 'Quốc Gia', type: 'string', required: false },
      { key: 'zipCode', label: 'Zip Code', viLabel: 'Mã Bưu Điện', type: 'string', required: false },
      { key: 'phone', label: 'Phone', viLabel: 'Điện Thoại', type: 'string', required: false },
      { key: 'email', label: 'Email', viLabel: 'Email', type: 'string', required: false },
      { key: 'manager', label: 'Manager', viLabel: 'Quản Lý', type: 'string', required: false },
      { key: 'capacity', label: 'Capacity', viLabel: 'Sức Chứa', type: 'number', required: false },
      { key: 'type', label: 'Type', viLabel: 'Loại', type: 'string', required: false },
      { key: 'status', label: 'Status', viLabel: 'Trạng Thái', type: 'string', required: false },
      { key: 'notes', label: 'Notes', viLabel: 'Ghi Chú', type: 'string', required: false },
      { key: 'floorArea', label: 'Floor Area', viLabel: 'Diện Tích Sàn', type: 'decimal', required: false },
      { key: 'totalAisles', label: 'Total Aisles', viLabel: 'Tổng Số Lối Đi', type: 'number', required: false },
      { key: 'maxRacks', label: 'Max Racks', viLabel: 'Số Kệ Tối Đa', type: 'number', required: false },
      { key: 'maxLevels', label: 'Max Levels', viLabel: 'Số Tầng Tối Đa', type: 'number', required: false },
      { key: 'maxBins', label: 'Max Bins', viLabel: 'Số Ngăn Tối Đa', type: 'number', required: false },
    ],
    validateRow: (row) => {
      const errors: string[] = [];
      const processedData: Record<string, any> = {};

      if (!row.id || String(row.id).trim() === '') {
        errors.push('ID is required');
      } else {
        processedData.id = String(row.id).trim();
      }

      if (!row.name || String(row.name).trim() === '') {
        errors.push('Name is required');
      } else {
        processedData.name = String(row.name).trim();
      }

      const stringFields = ['code', 'location', 'address', 'city', 'country', 'zipCode', 
                            'phone', 'email', 'manager', 'type', 'status', 'notes'];
      for (const field of stringFields) {
        if (row[field] !== undefined && row[field] !== '') {
          processedData[field] = String(row[field]).trim();
        }
      }

      const intFields = ['capacity', 'totalAisles', 'maxRacks', 'maxLevels', 'maxBins'];
      for (const field of intFields) {
        if (row[field] !== undefined && row[field] !== '') {
          const val = parseInt(String(row[field]), 10);
          if (!isNaN(val)) {
            processedData[field] = val;
          }
        }
      }

      if (row.floorArea !== undefined && row.floorArea !== '') {
        const val = parseFloat(String(row.floorArea));
        if (!isNaN(val)) {
          processedData.floorArea = String(val);
        }
      }

      return { valid: errors.length === 0, errors, processedData };
    },
  },

  suppliers: {
    tableName: 'suppliers',
    columns: [
      { key: 'name', label: 'Name', viLabel: 'Tên', type: 'string', required: true },
      { key: 'contactPerson', label: 'Contact Person', viLabel: 'Người Liên Hệ', type: 'string', required: false },
      { key: 'email', label: 'Email', viLabel: 'Email', type: 'string', required: false },
      { key: 'phone', label: 'Phone', viLabel: 'Điện Thoại', type: 'string', required: false },
      { key: 'address', label: 'Address', viLabel: 'Địa Chỉ', type: 'string', required: false },
      { key: 'country', label: 'Country', viLabel: 'Quốc Gia', type: 'string', required: false },
      { key: 'website', label: 'Website', viLabel: 'Trang Web', type: 'string', required: false },
      { key: 'supplierLink', label: 'Supplier Link', viLabel: 'Liên Kết Nhà Cung Cấp', type: 'string', required: false },
      { key: 'notes', label: 'Notes', viLabel: 'Ghi Chú', type: 'string', required: false },
    ],
    validateRow: (row) => {
      const errors: string[] = [];
      const processedData: Record<string, any> = {};

      if (!row.name || String(row.name).trim() === '') {
        errors.push('Name is required');
      } else {
        processedData.name = String(row.name).trim();
      }

      const stringFields = ['contactPerson', 'email', 'phone', 'address', 'country', 
                            'website', 'supplierLink', 'notes'];
      for (const field of stringFields) {
        if (row[field] !== undefined && row[field] !== '') {
          processedData[field] = String(row[field]).trim();
        }
      }

      return { valid: errors.length === 0, errors, processedData };
    },
  },

  discounts: {
    tableName: 'discounts',
    columns: [
      { key: 'discountId', label: 'Discount ID', viLabel: 'Mã Giảm Giá', type: 'string', required: true },
      { key: 'name', label: 'Name', viLabel: 'Tên', type: 'string', required: true },
      { key: 'description', label: 'Description', viLabel: 'Mô Tả', type: 'string', required: false },
      { key: 'type', label: 'Type', viLabel: 'Loại', type: 'string', required: true },
      { key: 'percentage', label: 'Percentage', viLabel: 'Phần Trăm', type: 'decimal', required: false },
      { key: 'value', label: 'Value', viLabel: 'Giá Trị', type: 'decimal', required: false },
      { key: 'buyQuantity', label: 'Buy Quantity', viLabel: 'Số Lượng Mua', type: 'number', required: false },
      { key: 'getQuantity', label: 'Get Quantity', viLabel: 'Số Lượng Tặng', type: 'number', required: false },
      { key: 'minOrderAmount', label: 'Min Order Amount', viLabel: 'Đơn Hàng Tối Thiểu', type: 'decimal', required: false },
      { key: 'status', label: 'Status', viLabel: 'Trạng Thái', type: 'string', required: false },
      { key: 'startDate', label: 'Start Date', viLabel: 'Ngày Bắt Đầu', type: 'date', required: false },
      { key: 'endDate', label: 'End Date', viLabel: 'Ngày Kết Thúc', type: 'date', required: false },
      { key: 'applicationScope', label: 'Application Scope', viLabel: 'Phạm Vi Áp Dụng', type: 'string', required: false },
      { key: 'productId', label: 'Product ID', viLabel: 'Mã Sản Phẩm', type: 'string', required: false },
      { key: 'categoryId', label: 'Category ID', viLabel: 'Mã Danh Mục', type: 'string', required: false },
    ],
    validateRow: (row) => {
      const errors: string[] = [];
      const processedData: Record<string, any> = {};

      if (!row.discountId || String(row.discountId).trim() === '') {
        errors.push('Discount ID is required');
      } else {
        processedData.discountId = String(row.discountId).trim();
      }

      if (!row.name || String(row.name).trim() === '') {
        errors.push('Name is required');
      } else {
        processedData.name = String(row.name).trim();
      }

      if (!row.type || String(row.type).trim() === '') {
        errors.push('Type is required');
      } else {
        const type = String(row.type).trim().toLowerCase();
        if (!['percentage', 'fixed', 'buy_x_get_y'].includes(type)) {
          errors.push('Type must be one of: percentage, fixed, buy_x_get_y');
        } else {
          processedData.type = type;
        }
      }

      const stringFields = ['description', 'status', 'applicationScope', 'productId', 'categoryId'];
      for (const field of stringFields) {
        if (row[field] !== undefined && row[field] !== '') {
          processedData[field] = String(row[field]).trim();
        }
      }

      const decimalFields = ['percentage', 'value', 'minOrderAmount'];
      for (const field of decimalFields) {
        if (row[field] !== undefined && row[field] !== '') {
          const val = parseFloat(String(row[field]));
          if (!isNaN(val)) {
            processedData[field] = String(val);
          }
        }
      }

      const intFields = ['buyQuantity', 'getQuantity'];
      for (const field of intFields) {
        if (row[field] !== undefined && row[field] !== '') {
          const val = parseInt(String(row[field]), 10);
          if (!isNaN(val)) {
            processedData[field] = val;
          }
        }
      }

      const dateFields = ['startDate', 'endDate'];
      for (const field of dateFields) {
        if (row[field] !== undefined && row[field] !== '') {
          const dateVal = row[field];
          if (dateVal instanceof Date) {
            processedData[field] = dateVal.toISOString().split('T')[0];
          } else {
            processedData[field] = String(dateVal).trim();
          }
        }
      }

      return { valid: errors.length === 0, errors, processedData };
    },
  },

  returns: {
    tableName: 'returns',
    columns: [
      { key: 'orderId', label: 'Order ID', viLabel: 'Mã Đơn Hàng', type: 'string', required: true },
      { key: 'reason', label: 'Reason', viLabel: 'Lý Do', type: 'string', required: true },
      { key: 'status', label: 'Status', viLabel: 'Trạng Thái', type: 'string', required: false },
      { key: 'notes', label: 'Notes', viLabel: 'Ghi Chú', type: 'string', required: false },
    ],
    validateRow: (row) => {
      const errors: string[] = [];
      const processedData: Record<string, any> = {};

      if (!row.orderId || String(row.orderId).trim() === '') {
        errors.push('Order ID is required');
      } else {
        processedData.orderId = String(row.orderId).trim();
      }

      if (!row.reason || String(row.reason).trim() === '') {
        errors.push('Reason is required');
      } else {
        processedData.reason = String(row.reason).trim();
      }

      const stringFields = ['status', 'notes'];
      for (const field of stringFields) {
        if (row[field] !== undefined && row[field] !== '') {
          processedData[field] = String(row[field]).trim();
        }
      }

      return { valid: errors.length === 0, errors, processedData };
    },
  },

  expenses: {
    tableName: 'expenses',
    columns: [
      { key: 'expenseId', label: 'Expense ID', viLabel: 'Mã Chi Phí', type: 'string', required: true },
      { key: 'name', label: 'Name', viLabel: 'Tên', type: 'string', required: true },
      { key: 'category', label: 'Category', viLabel: 'Danh Mục', type: 'string', required: false },
      { key: 'amount', label: 'Amount', viLabel: 'Số Tiền', type: 'decimal', required: true },
      { key: 'currency', label: 'Currency', viLabel: 'Tiền Tệ', type: 'string', required: false },
      { key: 'paymentMethod', label: 'Payment Method', viLabel: 'Phương Thức Thanh Toán', type: 'string', required: false },
      { key: 'status', label: 'Status', viLabel: 'Trạng Thái', type: 'string', required: false },
      { key: 'date', label: 'Date', viLabel: 'Ngày', type: 'date', required: true },
      { key: 'description', label: 'Description', viLabel: 'Mô Tả', type: 'string', required: false },
      { key: 'notes', label: 'Notes', viLabel: 'Ghi Chú', type: 'string', required: false },
      { key: 'isRecurring', label: 'Is Recurring', viLabel: 'Định Kỳ', type: 'boolean', required: false },
      { key: 'recurringType', label: 'Recurring Type', viLabel: 'Loại Định Kỳ', type: 'string', required: false },
      { key: 'recurringInterval', label: 'Recurring Interval', viLabel: 'Khoảng Thời Gian Định Kỳ', type: 'number', required: false },
    ],
    validateRow: (row) => {
      const errors: string[] = [];
      const processedData: Record<string, any> = {};

      if (!row.expenseId || String(row.expenseId).trim() === '') {
        errors.push('Expense ID is required');
      } else {
        processedData.expenseId = String(row.expenseId).trim();
      }

      if (!row.name || String(row.name).trim() === '') {
        errors.push('Name is required');
      } else {
        processedData.name = String(row.name).trim();
      }

      if (row.amount === undefined || row.amount === '') {
        errors.push('Amount is required');
      } else {
        const val = parseFloat(String(row.amount));
        if (isNaN(val)) {
          errors.push('Amount must be a valid number');
        } else {
          processedData.amount = String(val);
        }
      }

      if (!row.date) {
        errors.push('Date is required');
      } else {
        if (row.date instanceof Date) {
          processedData.date = row.date;
        } else {
          const dateVal = new Date(String(row.date));
          if (isNaN(dateVal.getTime())) {
            errors.push('Date must be a valid date');
          } else {
            processedData.date = dateVal;
          }
        }
      }

      const stringFields = ['category', 'currency', 'paymentMethod', 'status', 'description', 
                            'notes', 'recurringType'];
      for (const field of stringFields) {
        if (row[field] !== undefined && row[field] !== '') {
          processedData[field] = String(row[field]).trim();
        }
      }

      if (row.isRecurring !== undefined && row.isRecurring !== '') {
        processedData.isRecurring = String(row.isRecurring).toLowerCase() === 'true' || 
                                     row.isRecurring === true || row.isRecurring === 1;
      }

      if (row.recurringInterval !== undefined && row.recurringInterval !== '') {
        const val = parseInt(String(row.recurringInterval), 10);
        if (!isNaN(val)) {
          processedData.recurringInterval = val;
        }
      }

      return { valid: errors.length === 0, errors, processedData };
    },
  },
};

export function getEntityConfig(entity: EntityType): EntityConfig {
  return entityConfigs[entity];
}

export function generateTemplate(entity: EntityType): string[] {
  const config = entityConfigs[entity];
  if (!config) {
    throw new Error(`Unknown entity: ${entity}`);
  }
  return config.columns.map((col) => col.label);
}

export function generateTemplateWorkbook(entity: EntityType): Buffer {
  const headers = generateTemplate(entity);
  const worksheet = XLSX.utils.aoa_to_sheet([headers]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, entity);
  return Buffer.from(XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }));
}

export function parseExcelFile(buffer: Buffer, entity: EntityType): Record<string, any>[] {
  const config = entityConfigs[entity];
  if (!config) {
    throw new Error(`Unknown entity: ${entity}`);
  }

  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const rawData = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: '' });

  const labelToKey: Record<string, string> = {};
  for (const col of config.columns) {
    labelToKey[col.label.toLowerCase()] = col.key;
    labelToKey[col.key.toLowerCase()] = col.key;
    if (col.viLabel) {
      labelToKey[col.viLabel.toLowerCase()] = col.key;
    }
  }

  return rawData.map((row) => {
    const mappedRow: Record<string, any> = {};
    for (const [key, value] of Object.entries(row)) {
      const normalizedKey = key.toLowerCase().trim();
      const mappedKey = labelToKey[normalizedKey];
      if (mappedKey) {
        mappedRow[mappedKey] = value;
      }
    }
    return mappedRow;
  });
}

export function validateRow(
  row: Record<string, any>,
  entity: EntityType
): { valid: boolean; errors: string[]; processedData: Record<string, any> } {
  const config = entityConfigs[entity];
  if (!config) {
    throw new Error(`Unknown entity: ${entity}`);
  }
  return config.validateRow(row);
}

export async function createImportBatch(
  entity: EntityType,
  rows: Record<string, any>[],
  userId: string | null
): Promise<string> {
  const batchData: InsertImportBatch = {
    entity,
    status: 'pending',
    totalRows: rows.length,
    createdBy: userId,
    successCount: 0,
    errorCount: 0,
  };

  const [batch] = await db.insert(importBatches).values(batchData).returning();

  const itemsData: InsertImportBatchItem[] = rows.map((row, index) => ({
    batchId: batch.id,
    rowNumber: index + 1,
    originalData: row,
    status: 'pending' as const,
  }));

  if (itemsData.length > 0) {
    await db.insert(importBatchItems).values(itemsData);
  }

  return batch.id;
}

export async function processImportBatch(
  batchId: string,
  onProgress?: (progress: { processed: number; total: number; current: string }) => void
): Promise<{ success: number; errors: number }> {
  const [batch] = await db.select().from(importBatches).where(eq(importBatches.id, batchId));
  if (!batch) {
    throw new Error(`Batch not found: ${batchId}`);
  }

  await db.update(importBatches)
    .set({ status: 'processing' })
    .where(eq(importBatches.id, batchId));

  const items = await db.select().from(importBatchItems)
    .where(eq(importBatchItems.batchId, batchId));

  let successCount = 0;
  let errorCount = 0;

  for (const item of items) {
    try {
      const validation = validateRow(item.originalData as Record<string, any>, batch.entity as EntityType);
      
      if (!validation.valid) {
        await db.update(importBatchItems)
          .set({
            status: 'error',
            errorMessage: validation.errors.join('; '),
          })
          .where(eq(importBatchItems.id, item.id));
        errorCount++;
        continue;
      }

      const entityId = await insertEntity(batch.entity as EntityType, validation.processedData);

      await db.update(importBatchItems)
        .set({
          status: 'success',
          processedData: validation.processedData,
          entityId,
        })
        .where(eq(importBatchItems.id, item.id));
      successCount++;

      if (onProgress) {
        onProgress({
          processed: successCount + errorCount,
          total: items.length,
          current: `Row ${item.rowNumber}`,
        });
      }
    } catch (error: any) {
      await db.update(importBatchItems)
        .set({
          status: 'error',
          errorMessage: error.message || 'Unknown error',
        })
        .where(eq(importBatchItems.id, item.id));
      errorCount++;
    }
  }

  await db.update(importBatches)
    .set({
      status: errorCount === items.length ? 'failed' : 'completed',
      successCount,
      errorCount,
      completedAt: new Date(),
    })
    .where(eq(importBatches.id, batchId));

  return { success: successCount, errors: errorCount };
}

async function insertEntity(entity: EntityType, data: Record<string, any>): Promise<string> {
  switch (entity) {
    case 'products': {
      const [result] = await db.insert(products).values(data as any).returning();
      return result.id;
    }
    case 'customers': {
      const [result] = await db.insert(customers).values(data as any).returning();
      return result.id;
    }
    case 'warehouses': {
      const [result] = await db.insert(warehouses).values(data as any).returning();
      return result.id;
    }
    case 'suppliers': {
      const [result] = await db.insert(suppliers).values(data as any).returning();
      return result.id;
    }
    case 'discounts': {
      const [result] = await db.insert(discounts).values(data as any).returning();
      return result.id;
    }
    case 'expenses': {
      const [result] = await db.insert(expenses).values(data as any).returning();
      return result.id;
    }
    case 'returns': {
      throw new Error('Returns import not supported - no dedicated returns table');
    }
    default:
      throw new Error(`Unknown entity: ${entity}`);
  }
}

export async function revertImportBatch(batchId: string): Promise<void> {
  const [batch] = await db.select().from(importBatches).where(eq(importBatches.id, batchId));
  if (!batch) {
    throw new Error(`Batch not found: ${batchId}`);
  }

  if (batch.status === 'reverted') {
    throw new Error('Batch has already been reverted');
  }

  const items = await db.select().from(importBatchItems)
    .where(eq(importBatchItems.batchId, batchId));

  for (const item of items) {
    if (item.status === 'success' && item.entityId) {
      try {
        await deleteEntity(batch.entity as EntityType, item.entityId);
      } catch (error) {
        console.error(`Failed to delete entity ${item.entityId}:`, error);
      }
    }
  }

  await db.update(importBatches)
    .set({ status: 'reverted' })
    .where(eq(importBatches.id, batchId));
}

async function deleteEntity(entity: EntityType, entityId: string): Promise<void> {
  switch (entity) {
    case 'products':
      await db.delete(products).where(eq(products.id, entityId));
      break;
    case 'customers':
      await db.delete(customers).where(eq(customers.id, entityId));
      break;
    case 'warehouses':
      await db.delete(warehouses).where(eq(warehouses.id, entityId));
      break;
    case 'suppliers':
      await db.delete(suppliers).where(eq(suppliers.id, entityId));
      break;
    case 'discounts':
      await db.delete(discounts).where(eq(discounts.id, entityId));
      break;
    case 'expenses':
      await db.delete(expenses).where(eq(expenses.id, entityId));
      break;
    case 'returns':
      break;
    default:
      throw new Error(`Unknown entity: ${entity}`);
  }
}

export async function exportToExcel(entity: EntityType): Promise<Buffer> {
  const config = entityConfigs[entity];
  if (!config) {
    throw new Error(`Unknown entity: ${entity}`);
  }

  const data = await fetchEntityData(entity);
  
  const headers = config.columns.map((col) => col.label);
  const rows = data.map((item) => {
    return config.columns.map((col) => {
      const value = item[col.key];
      if (value === null || value === undefined) return '';
      if (col.type === 'boolean') return value ? 'TRUE' : 'FALSE';
      if (col.type === 'date' && value instanceof Date) return value.toISOString().split('T')[0];
      return value;
    });
  });

  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, entity);
  
  return Buffer.from(XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }));
}

async function fetchEntityData(entity: EntityType): Promise<Record<string, any>[]> {
  switch (entity) {
    case 'products':
      return await db.select().from(products);
    case 'customers':
      return await db.select().from(customers);
    case 'warehouses':
      return await db.select().from(warehouses);
    case 'suppliers':
      return await db.select().from(suppliers);
    case 'discounts':
      return await db.select().from(discounts);
    case 'expenses':
      return await db.select().from(expenses);
    case 'returns':
      return [];
    default:
      throw new Error(`Unknown entity: ${entity}`);
  }
}

export async function getImportBatch(batchId: string) {
  const [batch] = await db.select().from(importBatches).where(eq(importBatches.id, batchId));
  return batch;
}

export async function getImportBatchItems(batchId: string) {
  return await db.select().from(importBatchItems)
    .where(eq(importBatchItems.batchId, batchId));
}

export async function getImportBatches(entity?: EntityType) {
  if (entity) {
    return await db.select().from(importBatches)
      .where(eq(importBatches.entity, entity))
      .orderBy(sql`${importBatches.createdAt} DESC`);
  }
  return await db.select().from(importBatches)
    .orderBy(sql`${importBatches.createdAt} DESC`);
}
