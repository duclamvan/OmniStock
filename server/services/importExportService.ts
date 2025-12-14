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
      { key: 'name', label: 'Name', type: 'string', required: true },
      { key: 'vietnameseName', label: 'Vietnamese Name', type: 'string', required: false },
      { key: 'sku', label: 'SKU', type: 'string', required: true },
      { key: 'categoryId', label: 'Category ID', type: 'string', required: false },
      { key: 'warehouseId', label: 'Warehouse ID', type: 'string', required: false },
      { key: 'supplierId', label: 'Supplier ID', type: 'string', required: false },
      { key: 'description', label: 'Description', type: 'string', required: false },
      { key: 'quantity', label: 'Quantity', type: 'number', required: false },
      { key: 'lowStockAlert', label: 'Low Stock Alert', type: 'number', required: false },
      { key: 'priceCzk', label: 'Price CZK', type: 'decimal', required: false },
      { key: 'priceEur', label: 'Price EUR', type: 'decimal', required: false },
      { key: 'priceUsd', label: 'Price USD', type: 'decimal', required: false },
      { key: 'wholesalePriceCzk', label: 'Wholesale Price CZK', type: 'decimal', required: false },
      { key: 'wholesalePriceEur', label: 'Wholesale Price EUR', type: 'decimal', required: false },
      { key: 'importCostUsd', label: 'Import Cost USD', type: 'decimal', required: false },
      { key: 'importCostCzk', label: 'Import Cost CZK', type: 'decimal', required: false },
      { key: 'importCostEur', label: 'Import Cost EUR', type: 'decimal', required: false },
      { key: 'barcode', label: 'Barcode', type: 'string', required: false },
      { key: 'length', label: 'Length', type: 'decimal', required: false },
      { key: 'width', label: 'Width', type: 'decimal', required: false },
      { key: 'height', label: 'Height', type: 'decimal', required: false },
      { key: 'weight', label: 'Weight', type: 'decimal', required: false },
      { key: 'isActive', label: 'Is Active', type: 'boolean', required: false },
      { key: 'warehouseLocation', label: 'Warehouse Location', type: 'string', required: false },
      { key: 'sellingUnitName', label: 'Selling Unit Name', type: 'string', required: false },
      { key: 'bulkUnitName', label: 'Bulk Unit Name', type: 'string', required: false },
      { key: 'bulkUnitQty', label: 'Bulk Unit Qty', type: 'number', required: false },
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

      const decimalFields = ['priceCzk', 'priceEur', 'priceUsd', 'wholesalePriceCzk', 'wholesalePriceEur', 
                             'importCostUsd', 'importCostCzk', 'importCostEur', 'length', 'width', 'height', 'weight'];
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

      const stringFields = ['vietnameseName', 'categoryId', 'warehouseId', 'supplierId', 'description', 
                            'barcode', 'warehouseLocation', 'sellingUnitName', 'bulkUnitName'];
      for (const field of stringFields) {
        if (row[field] !== undefined && row[field] !== '') {
          processedData[field] = String(row[field]).trim();
        }
      }

      if (row.isActive !== undefined && row.isActive !== '') {
        processedData.isActive = String(row.isActive).toLowerCase() === 'true' || row.isActive === true || row.isActive === 1;
      }

      if (row.lowStockAlert !== undefined && row.lowStockAlert !== '') {
        const alert = parseInt(String(row.lowStockAlert), 10);
        if (!isNaN(alert)) {
          processedData.lowStockAlert = alert;
        }
      }

      if (row.bulkUnitQty !== undefined && row.bulkUnitQty !== '') {
        const qty = parseInt(String(row.bulkUnitQty), 10);
        if (!isNaN(qty)) {
          processedData.bulkUnitQty = qty;
        }
      }

      return { valid: errors.length === 0, errors, processedData };
    },
  },

  customers: {
    tableName: 'customers',
    columns: [
      { key: 'name', label: 'Name', type: 'string', required: true },
      { key: 'facebookName', label: 'Facebook Name', type: 'string', required: false },
      { key: 'facebookUrl', label: 'Facebook URL', type: 'string', required: false },
      { key: 'email', label: 'Email', type: 'string', required: false },
      { key: 'phone', label: 'Phone', type: 'string', required: false },
      { key: 'address', label: 'Address', type: 'string', required: false },
      { key: 'city', label: 'City', type: 'string', required: false },
      { key: 'zipCode', label: 'Zip Code', type: 'string', required: false },
      { key: 'country', label: 'Country', type: 'string', required: false },
      { key: 'notes', label: 'Notes', type: 'string', required: false },
      { key: 'type', label: 'Type', type: 'string', required: false },
      { key: 'vatId', label: 'VAT ID', type: 'string', required: false },
      { key: 'taxId', label: 'Tax ID', type: 'string', required: false },
      { key: 'preferredLanguage', label: 'Preferred Language', type: 'string', required: false },
      { key: 'preferredCurrency', label: 'Preferred Currency', type: 'string', required: false },
      { key: 'billingFirstName', label: 'Billing First Name', type: 'string', required: false },
      { key: 'billingLastName', label: 'Billing Last Name', type: 'string', required: false },
      { key: 'billingCompany', label: 'Billing Company', type: 'string', required: false },
      { key: 'billingEmail', label: 'Billing Email', type: 'string', required: false },
      { key: 'billingTel', label: 'Billing Tel', type: 'string', required: false },
      { key: 'billingStreet', label: 'Billing Street', type: 'string', required: false },
      { key: 'billingCity', label: 'Billing City', type: 'string', required: false },
      { key: 'billingZipCode', label: 'Billing Zip Code', type: 'string', required: false },
      { key: 'billingCountry', label: 'Billing Country', type: 'string', required: false },
      { key: 'ico', label: 'ICO', type: 'string', required: false },
      { key: 'dic', label: 'DIC', type: 'string', required: false },
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
      { key: 'id', label: 'ID', type: 'string', required: true },
      { key: 'code', label: 'Code', type: 'string', required: false },
      { key: 'name', label: 'Name', type: 'string', required: true },
      { key: 'location', label: 'Location', type: 'string', required: false },
      { key: 'address', label: 'Address', type: 'string', required: false },
      { key: 'city', label: 'City', type: 'string', required: false },
      { key: 'country', label: 'Country', type: 'string', required: false },
      { key: 'zipCode', label: 'Zip Code', type: 'string', required: false },
      { key: 'phone', label: 'Phone', type: 'string', required: false },
      { key: 'email', label: 'Email', type: 'string', required: false },
      { key: 'manager', label: 'Manager', type: 'string', required: false },
      { key: 'capacity', label: 'Capacity', type: 'number', required: false },
      { key: 'type', label: 'Type', type: 'string', required: false },
      { key: 'status', label: 'Status', type: 'string', required: false },
      { key: 'notes', label: 'Notes', type: 'string', required: false },
      { key: 'floorArea', label: 'Floor Area', type: 'decimal', required: false },
      { key: 'totalAisles', label: 'Total Aisles', type: 'number', required: false },
      { key: 'maxRacks', label: 'Max Racks', type: 'number', required: false },
      { key: 'maxLevels', label: 'Max Levels', type: 'number', required: false },
      { key: 'maxBins', label: 'Max Bins', type: 'number', required: false },
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
      { key: 'name', label: 'Name', type: 'string', required: true },
      { key: 'contactPerson', label: 'Contact Person', type: 'string', required: false },
      { key: 'email', label: 'Email', type: 'string', required: false },
      { key: 'phone', label: 'Phone', type: 'string', required: false },
      { key: 'address', label: 'Address', type: 'string', required: false },
      { key: 'country', label: 'Country', type: 'string', required: false },
      { key: 'website', label: 'Website', type: 'string', required: false },
      { key: 'supplierLink', label: 'Supplier Link', type: 'string', required: false },
      { key: 'notes', label: 'Notes', type: 'string', required: false },
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
      { key: 'discountId', label: 'Discount ID', type: 'string', required: true },
      { key: 'name', label: 'Name', type: 'string', required: true },
      { key: 'description', label: 'Description', type: 'string', required: false },
      { key: 'type', label: 'Type', type: 'string', required: true },
      { key: 'percentage', label: 'Percentage', type: 'decimal', required: false },
      { key: 'value', label: 'Value', type: 'decimal', required: false },
      { key: 'buyQuantity', label: 'Buy Quantity', type: 'number', required: false },
      { key: 'getQuantity', label: 'Get Quantity', type: 'number', required: false },
      { key: 'minOrderAmount', label: 'Min Order Amount', type: 'decimal', required: false },
      { key: 'status', label: 'Status', type: 'string', required: false },
      { key: 'startDate', label: 'Start Date', type: 'date', required: false },
      { key: 'endDate', label: 'End Date', type: 'date', required: false },
      { key: 'applicationScope', label: 'Application Scope', type: 'string', required: false },
      { key: 'productId', label: 'Product ID', type: 'string', required: false },
      { key: 'categoryId', label: 'Category ID', type: 'string', required: false },
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
      { key: 'orderId', label: 'Order ID', type: 'string', required: true },
      { key: 'reason', label: 'Reason', type: 'string', required: true },
      { key: 'status', label: 'Status', type: 'string', required: false },
      { key: 'notes', label: 'Notes', type: 'string', required: false },
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
      { key: 'expenseId', label: 'Expense ID', type: 'string', required: true },
      { key: 'name', label: 'Name', type: 'string', required: true },
      { key: 'category', label: 'Category', type: 'string', required: false },
      { key: 'amount', label: 'Amount', type: 'decimal', required: true },
      { key: 'currency', label: 'Currency', type: 'string', required: false },
      { key: 'paymentMethod', label: 'Payment Method', type: 'string', required: false },
      { key: 'status', label: 'Status', type: 'string', required: false },
      { key: 'date', label: 'Date', type: 'date', required: true },
      { key: 'description', label: 'Description', type: 'string', required: false },
      { key: 'notes', label: 'Notes', type: 'string', required: false },
      { key: 'isRecurring', label: 'Is Recurring', type: 'boolean', required: false },
      { key: 'recurringType', label: 'Recurring Type', type: 'string', required: false },
      { key: 'recurringInterval', label: 'Recurring Interval', type: 'number', required: false },
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
