/**
 * Historical Data Import Script
 * 
 * This script imports legacy order data (2019-2025) from CSV files into the historical_orders table.
 * It uses JSONB snapshots to store customer and item data without requiring foreign keys.
 * 
 * Usage:
 *   npx tsx scripts/import_history.ts
 * 
 * Expected CSV files in ./import_data folder:
 *   - OrdersID.csv (header file with invoice details)
 *   - Orders.csv (line items file with product details)
 * 
 * CSV Format for OrdersID.csv:
 *   Invoice Number, Date, Customer Name, Customer Address, FB_ID, Payment Method, Total, Currency
 * 
 * CSV Format for Orders.csv:
 *   Invoice Number, Product Name, SKU, Quantity, Unit Price, Total Price
 */

import * as fs from 'fs';
import * as path from 'path';
import { db } from '../server/db';
import { historicalOrders } from '../shared/schema';

interface OrderHeader {
  invoiceNumber: string;
  date: string;
  customerName?: string;
  customerAddress?: string;
  fbId?: string;
  phone?: string;
  email?: string;
  paymentMethod?: string;
  shippingMethod?: string;
  total: number;
  currency: string;
  notes?: string;
}

interface OrderItem {
  invoiceNumber: string;
  productName: string;
  sku?: string;
  quantity: number;
  unitPrice?: number;
  totalPrice?: number;
}

function parseCSV(content: string): string[][] {
  const lines = content.trim().split('\n');
  return lines.map(line => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  });
}

function parseDate(dateStr: string): string {
  // Handle various date formats: DD.MM.YYYY, MM/DD/YYYY, YYYY-MM-DD
  const cleanDate = dateStr.trim();
  
  // DD.MM.YYYY format (common in Czech)
  if (cleanDate.match(/^\d{1,2}\.\d{1,2}\.\d{4}$/)) {
    const [day, month, year] = cleanDate.split('.');
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  
  // MM/DD/YYYY format
  if (cleanDate.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)) {
    const [month, day, year] = cleanDate.split('/');
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  
  // Already in YYYY-MM-DD format
  if (cleanDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return cleanDate;
  }
  
  // Fallback: try to parse as Date
  const parsed = new Date(cleanDate);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split('T')[0];
  }
  
  console.warn(`Could not parse date: ${dateStr}, using current date`);
  return new Date().toISOString().split('T')[0];
}

function parseNumber(value: string | undefined): number {
  if (!value) return 0;
  // Handle Czech number format (1 234,56) and standard format (1,234.56)
  const cleanValue = value
    .replace(/\s/g, '') // Remove spaces
    .replace(/,(?=\d{3}(?:[,.]|$))/g, '') // Remove thousand separators
    .replace(',', '.'); // Convert decimal comma to dot
  return parseFloat(cleanValue) || 0;
}

async function importHistoricalData() {
  const importDir = './import_data';
  
  if (!fs.existsSync(importDir)) {
    console.log(`📁 Creating import_data folder...`);
    fs.mkdirSync(importDir, { recursive: true });
    console.log(`
📋 Please place your CSV files in the ./import_data folder:
   - OrdersID.csv (order headers with invoice details)
   - Orders.csv (line items with product details)
   
Then run this script again.
`);
    return;
  }

  const headerFile = path.join(importDir, 'OrdersID.csv');
  const itemsFile = path.join(importDir, 'Orders.csv');
  
  if (!fs.existsSync(headerFile) && !fs.existsSync(itemsFile)) {
    console.log(`
⚠️  No CSV files found in ./import_data folder.
   
Please add:
   - OrdersID.csv (order headers)
   - Orders.csv (line items)
   
Or a combined file with all order data.
`);
    return;
  }

  // Parse order headers
  const headers = new Map<string, OrderHeader>();
  if (fs.existsSync(headerFile)) {
    console.log('📄 Reading OrdersID.csv...');
    const headerContent = fs.readFileSync(headerFile, 'utf-8');
    const headerRows = parseCSV(headerContent);
    
    // Skip header row
    for (let i = 1; i < headerRows.length; i++) {
      const row = headerRows[i];
      if (row.length < 2) continue;
      
      const invoiceNumber = row[0];
      if (!invoiceNumber) continue;
      
      headers.set(invoiceNumber, {
        invoiceNumber,
        date: row[1] || new Date().toISOString().split('T')[0],
        customerName: row[2] || undefined,
        customerAddress: row[3] || undefined,
        fbId: row[4] || undefined,
        paymentMethod: row[5] || undefined,
        total: parseNumber(row[6]),
        currency: row[7] || 'CZK',
        notes: row[8] || undefined,
      });
    }
    console.log(`   Found ${headers.size} order headers`);
  }

  // Parse order items
  const itemsByInvoice = new Map<string, OrderItem[]>();
  if (fs.existsSync(itemsFile)) {
    console.log('📄 Reading Orders.csv...');
    const itemsContent = fs.readFileSync(itemsFile, 'utf-8');
    const itemRows = parseCSV(itemsContent);
    
    // Skip header row
    for (let i = 1; i < itemRows.length; i++) {
      const row = itemRows[i];
      if (row.length < 2) continue;
      
      const invoiceNumber = row[0];
      if (!invoiceNumber) continue;
      
      const item: OrderItem = {
        invoiceNumber,
        productName: row[1] || 'Unknown Product',
        sku: row[2] || undefined,
        quantity: parseNumber(row[3]) || 1,
        unitPrice: parseNumber(row[4]),
        totalPrice: parseNumber(row[5]),
      };
      
      if (!itemsByInvoice.has(invoiceNumber)) {
        itemsByInvoice.set(invoiceNumber, []);
      }
      itemsByInvoice.get(invoiceNumber)!.push(item);
    }
    console.log(`   Found ${itemRows.length - 1} line items across ${itemsByInvoice.size} invoices`);
  }

  // Merge headers and items
  const allInvoices = new Set([...headers.keys(), ...itemsByInvoice.keys()]);
  console.log(`\n📊 Processing ${allInvoices.size} unique invoices...`);
  
  let imported = 0;
  let errors = 0;

  for (const invoiceNumber of allInvoices) {
    try {
      const header = headers.get(invoiceNumber);
      const items = itemsByInvoice.get(invoiceNumber) || [];
      
      // Calculate total from items if not in header
      const itemsTotal = items.reduce((sum, item) => sum + (item.totalPrice || 0), 0);
      const totalRevenue = header?.total || itemsTotal;
      
      // Build customer snapshot
      const customerSnapshot = header ? {
        name: header.customerName,
        address: header.customerAddress,
        fbId: header.fbId,
        phone: header.phone,
        email: header.email,
      } : undefined;
      
      // Build items snapshot
      const itemsSnapshot = items.map(item => ({
        sku: item.sku,
        name: item.productName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
      }));
      
      // Insert into database
      await db.insert(historicalOrders).values({
        legacyInvoiceId: invoiceNumber,
        orderDate: parseDate(header?.date || new Date().toISOString().split('T')[0]),
        totalRevenue: totalRevenue.toString(),
        totalProfit: null, // Will be calculated if cost data is available
        currency: header?.currency || 'CZK',
        customerSnapshot: customerSnapshot as any,
        itemsSnapshot: itemsSnapshot as any,
        paymentMethod: header?.paymentMethod,
        notes: header?.notes,
        importedFrom: 'OrdersID.csv + Orders.csv',
      });
      
      imported++;
      
      if (imported % 100 === 0) {
        console.log(`   Imported ${imported} orders...`);
      }
    } catch (error) {
      errors++;
      console.error(`❌ Error importing invoice ${invoiceNumber}:`, error);
    }
  }

  console.log(`
✅ Import complete!
   - Imported: ${imported} orders
   - Errors: ${errors}
   
View imported data with:
   SELECT * FROM historical_orders ORDER BY order_date DESC LIMIT 10;
`);
}

// Run the import
importHistoricalData().catch(console.error);
