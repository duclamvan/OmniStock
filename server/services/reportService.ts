import { db } from '../db';
import { 
  orders, 
  orderItems, 
  products, 
  customers, 
  appSettings,
  expenses,
  receipts,
  receiptItems,
  stockAdjustmentHistory,
  activityLog,
  users
} from '@shared/schema';
import { eq, gte, lte, and, sql, desc, between, inArray } from 'drizzle-orm';
import { format } from 'date-fns';
import * as fs from 'fs';
import * as path from 'path';

const REPORTS_DIR = './reports';

export interface ReportSettings {
  dailySummaryEnabled: boolean;
  weeklyReportEnabled: boolean;
  monthlyReportEnabled: boolean;
  yearlyReportEnabled: boolean;
  lowStockAlertEnabled: boolean;
  orderStatusNotificationsEnabled: boolean;
}

export interface ReportData {
  period: string;
  startDate: string;
  endDate: string;
  generatedAt: string;
  summary: {
    totalOrders: number;
    completedOrders: number;
    pendingOrders: number;
    cancelledOrders: number;
    totalRevenue: number;
    totalItemsSold: number;
    averageOrderValue: number;
    newCustomers: number;
  };
  inventory: {
    totalProducts: number;
    lowStockProducts: number;
    outOfStockProducts: number;
    stockAdjustments: number;
    itemsReceived: number;
  };
  topProducts: Array<{
    id: string;
    name: string;
    quantitySold: number;
    revenue: number;
  }>;
  topCustomers: Array<{
    id: string;
    name: string;
    orderCount: number;
    totalSpent: number;
  }>;
  financials?: {
    totalExpenses: number;
    grossProfit: number;
    expensesByCategory: Record<string, number>;
  };
}

export async function getReportSettings(): Promise<ReportSettings> {
  const settings = await db.select().from(appSettings);
  const settingsMap = new Map(settings.map(s => [s.key, s.value]));
  
  const getBoolValue = (key: string, defaultVal: boolean = false): boolean => {
    const val = settingsMap.get(key);
    if (val === undefined || val === null) return defaultVal;
    if (typeof val === 'boolean') return val;
    if (typeof val === 'string') return val === 'true';
    return defaultVal;
  };
  
  return {
    dailySummaryEnabled: getBoolValue('daily_summary_report_email', false),
    weeklyReportEnabled: getBoolValue('weekly_report_email', true),
    monthlyReportEnabled: getBoolValue('monthly_report_email', false),
    yearlyReportEnabled: getBoolValue('yearly_report_email', false),
    lowStockAlertEnabled: getBoolValue('low_stock_alert_email', true),
    orderStatusNotificationsEnabled: getBoolValue('order_status_change_notifications', true),
  };
}

function getDateRange(period: 'daily' | 'weekly' | 'monthly' | 'yearly'): { start: Date; end: Date } {
  const now = new Date();
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  
  switch (period) {
    case 'daily':
      start.setDate(start.getDate() - 1);
      break;
    case 'weekly':
      start.setDate(start.getDate() - 7);
      break;
    case 'monthly':
      start.setMonth(start.getMonth() - 1);
      break;
    case 'yearly':
      start.setFullYear(start.getFullYear() - 1);
      break;
  }
  
  return { start, end };
}

export async function generateReport(period: 'daily' | 'weekly' | 'monthly' | 'yearly'): Promise<ReportData> {
  const { start, end } = getDateRange(period);
  
  const allOrders = await db.select().from(orders)
    .where(and(
      gte(orders.createdAt, start),
      lte(orders.createdAt, end)
    ));
  
  const completedOrders = allOrders.filter(o => o.orderStatus === 'delivered' || o.orderStatus === 'shipped');
  const pendingOrders = allOrders.filter(o => o.orderStatus === 'pending' || o.orderStatus === 'processing' || o.orderStatus === 'ready_to_ship');
  const cancelledOrders = allOrders.filter(o => o.orderStatus === 'cancelled');
  
  const orderIds = allOrders.map(o => o.id);
  let allOrderItems: any[] = [];
  if (orderIds.length > 0) {
    allOrderItems = await db.select().from(orderItems)
      .where(sql`${orderItems.orderId} = ANY(ARRAY[${sql.raw(orderIds.map(id => `'${id}'`).join(','))}]::text[])`);
  }
  
  const totalRevenue = allOrders.reduce((sum, o) => sum + Number(o.grandTotal || 0), 0);
  const totalItemsSold = allOrderItems.reduce((sum, item) => sum + (item.quantity || 0), 0);
  const averageOrderValue = allOrders.length > 0 ? totalRevenue / allOrders.length : 0;
  
  const newCustomers = await db.select({ count: sql<number>`count(*)` })
    .from(customers)
    .where(and(
      gte(customers.createdAt, start),
      lte(customers.createdAt, end)
    ));
  
  const allProducts = await db.select().from(products);
  // Support both percentage and amount-based low stock alerts
  const lowStockProducts = allProducts.filter(p => {
    const quantity = p.quantity || 0;
    if (quantity === 0) return false; // Skip out of stock for this metric
    const alertType = p.lowStockAlertType || 'percentage';
    const alertValue = p.lowStockAlert || 45;
    
    if (alertType === 'percentage') {
      const maxStock = p.maxStockLevel || 100;
      const threshold = Math.ceil((maxStock * alertValue) / 100);
      return quantity <= threshold;
    } else {
      return quantity <= alertValue;
    }
  });
  const outOfStockProducts = allProducts.filter(p => (p.quantity || 0) === 0);
  
  const stockAdjustments = await db.select({ count: sql<number>`count(*)` })
    .from(stockAdjustmentHistory)
    .where(and(
      gte(stockAdjustmentHistory.createdAt, start),
      lte(stockAdjustmentHistory.createdAt, end)
    ));
  
  const periodReceipts = await db.select().from(receipts)
    .where(and(
      gte(receipts.createdAt, start),
      lte(receipts.createdAt, end)
    ));
  
  let itemsReceived = 0;
  if (periodReceipts.length > 0) {
    const receiptIds = periodReceipts.map(r => r.id);
    const receivedItems = await db.select().from(receiptItems)
      .where(sql`${receiptItems.receiptId} = ANY(ARRAY[${sql.raw(receiptIds.map(id => `'${id}'`).join(','))}]::text[])`);
    itemsReceived = receivedItems.reduce((sum, item) => sum + (item.receivedQuantity || 0), 0);
  }
  
  const productSales: Record<string, { name: string; quantity: number; revenue: number }> = {};
  for (const item of allOrderItems) {
    const product = allProducts.find(p => p.id === item.productId);
    if (product) {
      if (!productSales[product.id]) {
        productSales[product.id] = { name: product.name, quantity: 0, revenue: 0 };
      }
      productSales[product.id].quantity += item.quantity || 0;
      productSales[product.id].revenue += Number(item.total || 0);
    }
  }
  
  const topProducts = Object.entries(productSales)
    .map(([id, data]) => ({ id, ...data, quantitySold: data.quantity }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);
  
  const customerOrders: Record<string, { name: string; orderCount: number; totalSpent: number }> = {};
  for (const order of allOrders) {
    if (order.customerId) {
      const customer = await db.select().from(customers).where(eq(customers.id, order.customerId)).limit(1);
      if (customer[0]) {
        if (!customerOrders[order.customerId]) {
          customerOrders[order.customerId] = { 
            name: customer[0].name || `Customer ${order.customerId}`, 
            orderCount: 0, 
            totalSpent: 0 
          };
        }
        customerOrders[order.customerId].orderCount++;
        customerOrders[order.customerId].totalSpent += Number(order.grandTotal || 0);
      }
    }
  }
  
  const topCustomers = Object.entries(customerOrders)
    .map(([id, data]) => ({ id, ...data }))
    .sort((a, b) => b.totalSpent - a.totalSpent)
    .slice(0, 10);
  
  const periodExpenses = await db.select().from(expenses)
    .where(and(
      gte(expenses.date, start),
      lte(expenses.date, end)
    ));
  
  const totalExpenses = periodExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
  const expensesByCategory: Record<string, number> = {};
  for (const expense of periodExpenses) {
    const category = expense.category || 'Other';
    expensesByCategory[category] = (expensesByCategory[category] || 0) + Number(expense.amount || 0);
  }
  
  const reportData: ReportData = {
    period,
    startDate: start.toISOString(),
    endDate: end.toISOString(),
    generatedAt: new Date().toISOString(),
    summary: {
      totalOrders: allOrders.length,
      completedOrders: completedOrders.length,
      pendingOrders: pendingOrders.length,
      cancelledOrders: cancelledOrders.length,
      totalRevenue,
      totalItemsSold,
      averageOrderValue: Math.round(averageOrderValue * 100) / 100,
      newCustomers: Number(newCustomers[0]?.count || 0),
    },
    inventory: {
      totalProducts: allProducts.length,
      lowStockProducts: lowStockProducts.length,
      outOfStockProducts: outOfStockProducts.length,
      stockAdjustments: Number(stockAdjustments[0]?.count || 0),
      itemsReceived,
    },
    topProducts,
    topCustomers,
    financials: {
      totalExpenses,
      grossProfit: totalRevenue - totalExpenses,
      expensesByCategory,
    },
  };
  
  return reportData;
}

export async function saveReport(report: ReportData): Promise<string> {
  if (!fs.existsSync(REPORTS_DIR)) {
    fs.mkdirSync(REPORTS_DIR, { recursive: true });
  }
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const fileName = `report_${report.period}_${timestamp}.json`;
  const filePath = path.join(REPORTS_DIR, fileName);
  
  fs.writeFileSync(filePath, JSON.stringify(report, null, 2), 'utf-8');
  
  console.log(`📊 Report saved: ${fileName}`);
  return filePath;
}

export async function generateAndSaveReport(period: 'daily' | 'weekly' | 'monthly' | 'yearly'): Promise<{ report: ReportData; filePath: string }> {
  console.log(`📊 Generating ${period} report...`);
  
  const report = await generateReport(period);
  const filePath = await saveReport(report);
  
  console.log(`✅ ${period.charAt(0).toUpperCase() + period.slice(1)} report generated:`);
  console.log(`   Orders: ${report.summary.totalOrders} (${report.summary.completedOrders} completed)`);
  console.log(`   Revenue: ${report.summary.totalRevenue.toFixed(2)}`);
  console.log(`   Items Sold: ${report.summary.totalItemsSold}`);
  console.log(`   Low Stock: ${report.inventory.lowStockProducts} products`);
  
  return { report, filePath };
}

export async function getLowStockAlerts(): Promise<Array<{ id: string; name: string; sku: string; stock: number; threshold: number; alertType: string }>> {
  const allProducts = await db.select().from(products);
  
  return allProducts
    .filter(p => {
      const quantity = p.quantity || 0;
      const alertType = p.lowStockAlertType || 'percentage';
      const alertValue = p.lowStockAlert || 45;
      
      if (alertType === 'percentage') {
        const maxStock = p.maxStockLevel || 100;
        const threshold = Math.ceil((maxStock * alertValue) / 100);
        return quantity <= threshold;
      } else {
        return quantity <= alertValue;
      }
    })
    .map(p => {
      const alertType = p.lowStockAlertType || 'percentage';
      const alertValue = p.lowStockAlert || 45;
      let threshold: number;
      
      if (alertType === 'percentage') {
        const maxStock = p.maxStockLevel || 100;
        threshold = Math.ceil((maxStock * alertValue) / 100);
      } else {
        threshold = alertValue;
      }
      
      return {
        id: p.id,
        name: p.name,
        sku: p.sku || '',
        stock: p.quantity || 0,
        threshold,
        alertType,
      };
    })
    .sort((a, b) => a.stock - b.stock);
}

export async function listReports(): Promise<Array<{ fileName: string; period: string; generatedAt: string; size: number }>> {
  if (!fs.existsSync(REPORTS_DIR)) {
    return [];
  }
  
  const files = fs.readdirSync(REPORTS_DIR)
    .filter(f => f.endsWith('.json'))
    .map(fileName => {
      const filePath = path.join(REPORTS_DIR, fileName);
      const stats = fs.statSync(filePath);
      const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      
      return {
        fileName,
        period: content.period || 'unknown',
        generatedAt: content.generatedAt || stats.mtime.toISOString(),
        size: stats.size,
      };
    })
    .sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime());
  
  return files;
}

export async function getReportByFileName(fileName: string): Promise<ReportData | null> {
  const filePath = path.join(REPORTS_DIR, fileName);
  
  if (!fs.existsSync(filePath)) {
    return null;
  }
  
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

export async function generateHTMLReport(timeframe: 'daily' | 'weekly' | 'monthly' | 'yearly'): Promise<string> {
  const { start, end } = getDateRange(timeframe);
  const now = new Date();
  
  const allOrders = await db.select().from(orders)
    .where(and(
      gte(orders.createdAt, start),
      lte(orders.createdAt, end)
    ))
    .orderBy(desc(orders.createdAt))
    .limit(50);
  
  const statusBreakdown: Record<string, number> = {};
  const carrierBreakdown: Record<string, number> = {};
  
  for (const order of allOrders) {
    const status = order.orderStatus || 'unknown';
    statusBreakdown[status] = (statusBreakdown[status] || 0) + 1;
    
    const carrier = order.shippingMethod || 'Not specified';
    carrierBreakdown[carrier] = (carrierBreakdown[carrier] || 0) + 1;
  }
  
  const allProducts = await db.select().from(products);
  const lowStockItems = allProducts.filter(p => {
    const quantity = p.quantity || 0;
    const alertType = p.lowStockAlertType || 'percentage';
    const alertValue = p.lowStockAlert || 45;
    
    if (alertType === 'percentage') {
      const maxStock = p.maxStockLevel || 100;
      const threshold = Math.ceil((maxStock * alertValue) / 100);
      return quantity <= threshold && quantity > 0;
    } else {
      return quantity <= alertValue && quantity > 0;
    }
  }).slice(0, 20);
  
  const outOfStockCount = allProducts.filter(p => (p.quantity || 0) === 0).length;
  
  const stockAdjustments = await db.select().from(stockAdjustmentHistory)
    .where(and(
      gte(stockAdjustmentHistory.createdAt, start),
      lte(stockAdjustmentHistory.createdAt, end)
    ))
    .orderBy(desc(stockAdjustmentHistory.createdAt))
    .limit(20);
  
  const activities = await db.select({
    id: activityLog.id,
    userId: activityLog.userId,
    action: activityLog.action,
    entityType: activityLog.entityType,
    entityId: activityLog.entityId,
    description: activityLog.description,
    createdAt: activityLog.createdAt,
  }).from(activityLog)
    .where(and(
      gte(activityLog.createdAt, start),
      lte(activityLog.createdAt, end)
    ))
    .orderBy(desc(activityLog.createdAt))
    .limit(30);
  
  const userIds = Array.from(new Set(activities.map(a => a.userId).filter(Boolean))) as string[];
  let userMap: Record<string, { firstName?: string | null; lastName?: string | null; username?: string | null }> = {};
  
  if (userIds.length > 0) {
    const usersData = await db.select({
      id: users.id,
      firstName: users.firstName,
      lastName: users.lastName,
      username: users.username,
    }).from(users).where(inArray(users.id, userIds));
    
    for (const u of usersData) {
      userMap[u.id] = u;
    }
  }
  
  const totalRevenue = allOrders.reduce((sum, o) => sum + Number(o.grandTotal || 0), 0);
  const completedOrders = allOrders.filter(o => o.orderStatus === 'delivered' || o.orderStatus === 'shipped').length;
  const pendingOrders = allOrders.filter(o => ['pending', 'processing', 'ready_to_ship', 'to_fulfill'].includes(o.orderStatus || '')).length;
  
  const periodLabel = timeframe.charAt(0).toUpperCase() + timeframe.slice(1);
  const startDateStr = format(start, 'MMM dd, yyyy');
  const endDateStr = format(end, 'MMM dd, yyyy');
  const generatedAtStr = format(now, 'MMM dd, yyyy HH:mm:ss');
  
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Warehouse Operations Report - ${periodLabel}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background: #f5f7fa;
      color: #1a1a2e;
      line-height: 1.6;
      padding: 20px;
    }
    .container { max-width: 1000px; margin: 0 auto; background: #fff; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); overflow: hidden; }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: #fff;
      padding: 40px;
      text-align: center;
    }
    .header h1 { font-size: 28px; font-weight: 700; margin-bottom: 8px; }
    .header .subtitle { opacity: 0.9; font-size: 16px; }
    .header .period { margin-top: 16px; font-size: 14px; background: rgba(255,255,255,0.2); display: inline-block; padding: 8px 20px; border-radius: 20px; }
    .content { padding: 40px; }
    .section { margin-bottom: 40px; }
    .section-title { font-size: 20px; font-weight: 600; color: #333; margin-bottom: 20px; padding-bottom: 10px; border-bottom: 2px solid #667eea; }
    .metrics-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
    .metric-card {
      background: linear-gradient(135deg, #f8f9ff 0%, #f0f4ff 100%);
      border-radius: 10px;
      padding: 24px;
      text-align: center;
      border: 1px solid #e8ecf4;
    }
    .metric-card .value { font-size: 32px; font-weight: 700; color: #667eea; margin-bottom: 8px; }
    .metric-card .label { font-size: 14px; color: #666; text-transform: uppercase; letter-spacing: 0.5px; }
    .table-container { overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; font-size: 14px; }
    th, td { padding: 14px 16px; text-align: left; border-bottom: 1px solid #eee; }
    th { background: #f8f9fa; font-weight: 600; color: #555; text-transform: uppercase; font-size: 12px; letter-spacing: 0.5px; }
    tr:hover { background: #f9fafb; }
    .badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 500;
    }
    .badge-success { background: #d4edda; color: #155724; }
    .badge-warning { background: #fff3cd; color: #856404; }
    .badge-danger { background: #f8d7da; color: #721c24; }
    .badge-info { background: #d1ecf1; color: #0c5460; }
    .badge-secondary { background: #e2e3e5; color: #383d41; }
    .breakdown-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px; margin-top: 20px; }
    .breakdown-item { background: #f8f9fa; padding: 16px; border-radius: 8px; text-align: center; }
    .breakdown-item .count { font-size: 24px; font-weight: 700; color: #333; }
    .breakdown-item .label { font-size: 13px; color: #666; margin-top: 4px; }
    .low-stock { color: #dc3545; }
    .footer {
      background: #f8f9fa;
      padding: 24px 40px;
      text-align: center;
      font-size: 13px;
      color: #666;
      border-top: 1px solid #eee;
    }
    .empty-state { text-align: center; padding: 40px; color: #999; font-style: italic; }
    @media print {
      body { background: #fff; padding: 0; }
      .container { box-shadow: none; border-radius: 0; }
      .section { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📊 Warehouse Operations Report</h1>
      <div class="subtitle">Davie Supply - Comprehensive ${periodLabel} Analysis</div>
      <div class="period">${startDateStr} — ${endDateStr}</div>
    </div>
    
    <div class="content">
      <section class="section">
        <h2 class="section-title">📈 Summary Metrics</h2>
        <div class="metrics-grid">
          <div class="metric-card">
            <div class="value">${allOrders.length}</div>
            <div class="label">Total Orders</div>
          </div>
          <div class="metric-card">
            <div class="value">${completedOrders}</div>
            <div class="label">Completed</div>
          </div>
          <div class="metric-card">
            <div class="value">${pendingOrders}</div>
            <div class="label">Pending</div>
          </div>
          <div class="metric-card">
            <div class="value">${new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: 'CZK', maximumFractionDigits: 0 }).format(totalRevenue)}</div>
            <div class="label">Revenue</div>
          </div>
          <div class="metric-card">
            <div class="value">${allProducts.length}</div>
            <div class="label">Total Products</div>
          </div>
          <div class="metric-card">
            <div class="value">${lowStockItems.length}</div>
            <div class="label">Low Stock Items</div>
          </div>
          <div class="metric-card">
            <div class="value">${outOfStockCount}</div>
            <div class="label">Out of Stock</div>
          </div>
          <div class="metric-card">
            <div class="value">${stockAdjustments.length}</div>
            <div class="label">Stock Adjustments</div>
          </div>
        </div>
      </section>
      
      <section class="section">
        <h2 class="section-title">📦 Orders Breakdown</h2>
        <div class="breakdown-grid">
          ${Object.entries(statusBreakdown).map(([status, count]) => `
            <div class="breakdown-item">
              <div class="count">${count}</div>
              <div class="label">${status.replace(/_/g, ' ').toUpperCase()}</div>
            </div>
          `).join('')}
        </div>
        ${Object.keys(carrierBreakdown).length > 0 ? `
        <h3 style="margin-top: 30px; margin-bottom: 16px; font-size: 16px; color: #444;">Shipping Carriers Used</h3>
        <div class="breakdown-grid">
          ${Object.entries(carrierBreakdown).map(([carrier, count]) => `
            <div class="breakdown-item">
              <div class="count">${count}</div>
              <div class="label">${carrier}</div>
            </div>
          `).join('')}
        </div>
        ` : ''}
      </section>
      
      <section class="section">
        <h2 class="section-title">🛒 Recent Orders</h2>
        ${allOrders.length > 0 ? `
        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Status</th>
                <th>Payment</th>
                <th>Total</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              ${allOrders.slice(0, 15).map(o => `
                <tr>
                  <td><strong>${o.orderId}</strong></td>
                  <td><span class="badge ${o.orderStatus === 'delivered' || o.orderStatus === 'shipped' ? 'badge-success' : o.orderStatus === 'cancelled' ? 'badge-danger' : 'badge-warning'}">${(o.orderStatus || 'unknown').replace(/_/g, ' ')}</span></td>
                  <td><span class="badge ${o.paymentStatus === 'paid' ? 'badge-success' : 'badge-secondary'}">${o.paymentStatus || 'unknown'}</span></td>
                  <td>${new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: o.currency || 'CZK' }).format(Number(o.grandTotal || 0))}</td>
                  <td>${o.createdAt ? format(new Date(o.createdAt), 'MMM dd, HH:mm') : 'N/A'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        ` : '<div class="empty-state">No orders in this period</div>'}
      </section>
      
      <section class="section">
        <h2 class="section-title">📦 Inventory Status</h2>
        <h3 style="margin-bottom: 16px; font-size: 16px; color: #dc3545;">⚠️ Low Stock Items (${lowStockItems.length})</h3>
        ${lowStockItems.length > 0 ? `
        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th>SKU</th>
                <th>Current Stock</th>
                <th>Alert Threshold</th>
              </tr>
            </thead>
            <tbody>
              ${lowStockItems.map(p => {
                const alertType = p.lowStockAlertType || 'percentage';
                const alertValue = p.lowStockAlert || 45;
                const maxStock = p.maxStockLevel || 100;
                const threshold = alertType === 'percentage' 
                  ? Math.ceil((maxStock * alertValue) / 100)
                  : alertValue;
                return `
                <tr>
                  <td><strong>${p.name}</strong></td>
                  <td>${p.sku || 'N/A'}</td>
                  <td class="low-stock"><strong>${p.quantity || 0}</strong></td>
                  <td>${threshold} ${alertType === 'percentage' ? `(${alertValue}%)` : 'units'}</td>
                </tr>
              `}).join('')}
            </tbody>
          </table>
        </div>
        ` : '<div class="empty-state">All products are well stocked! ✅</div>'}
        
        ${stockAdjustments.length > 0 ? `
        <h3 style="margin-top: 30px; margin-bottom: 16px; font-size: 16px; color: #444;">Recent Stock Adjustments</h3>
        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th>Type</th>
                <th>Quantity</th>
                <th>Reason</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              ${stockAdjustments.slice(0, 10).map(a => `
                <tr>
                  <td><span class="badge ${a.adjustmentType === 'add' ? 'badge-success' : a.adjustmentType === 'remove' ? 'badge-danger' : 'badge-info'}">${a.adjustmentType || 'adjust'}</span></td>
                  <td>${a.adjustedQuantity || 0}</td>
                  <td>${a.reason || 'N/A'}</td>
                  <td>${a.createdAt ? format(new Date(a.createdAt), 'MMM dd, HH:mm') : 'N/A'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        ` : ''}
      </section>
      
      <section class="section">
        <h2 class="section-title">👥 Employee Activity</h2>
        ${activities.length > 0 ? `
        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th>User</th>
                <th>Action</th>
                <th>Entity</th>
                <th>Description</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody>
              ${activities.map(a => {
                const user = a.userId ? userMap[a.userId] : null;
                const userName = user 
                  ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username || 'Unknown'
                  : 'System';
                return `
                <tr>
                  <td><strong>${userName}</strong></td>
                  <td><span class="badge badge-info">${a.action || 'action'}</span></td>
                  <td>${a.entityType || '-'} ${a.entityId ? `#${a.entityId.substring(0, 8)}` : ''}</td>
                  <td>${(a.description || '').substring(0, 60)}${(a.description || '').length > 60 ? '...' : ''}</td>
                  <td>${a.createdAt ? format(new Date(a.createdAt), 'MMM dd, HH:mm') : 'N/A'}</td>
                </tr>
              `}).join('')}
            </tbody>
          </table>
        </div>
        ` : '<div class="empty-state">No activity logged in this period</div>'}
      </section>
    </div>
    
    <div class="footer">
      <p><strong>Report Generated:</strong> ${generatedAtStr}</p>
      <p style="margin-top: 8px;">Davie Supply Warehouse Management System</p>
    </div>
  </div>
</body>
</html>`;
  
  return html;
}

let reportSchedulerInterval: NodeJS.Timeout | null = null;
let lastReportCheck: Date | null = null;
let lastDailyReport: Date | null = null;
let lastWeeklyReport: Date | null = null;
let lastMonthlyReport: Date | null = null;
let lastYearlyReport: Date | null = null;

export async function startReportScheduler() {
  console.log('📊 Starting report scheduler...');
  
  reportSchedulerInterval = setInterval(async () => {
    try {
      const settings = await getReportSettings();
      const now = new Date();
      
      if (settings.dailySummaryEnabled) {
        const hoursSinceLastDaily = lastDailyReport 
          ? (now.getTime() - lastDailyReport.getTime()) / (1000 * 60 * 60) 
          : 25;
        
        if (hoursSinceLastDaily >= 24) {
          console.log('⏰ Scheduled daily report triggered');
          await generateAndSaveReport('daily');
          lastDailyReport = now;
        }
      }
      
      if (settings.weeklyReportEnabled) {
        const hoursSinceLastWeekly = lastWeeklyReport 
          ? (now.getTime() - lastWeeklyReport.getTime()) / (1000 * 60 * 60) 
          : 24 * 8;
        
        if (hoursSinceLastWeekly >= 24 * 7) {
          console.log('⏰ Scheduled weekly report triggered');
          await generateAndSaveReport('weekly');
          lastWeeklyReport = now;
        }
      }
      
      if (settings.monthlyReportEnabled) {
        const hoursSinceLastMonthly = lastMonthlyReport 
          ? (now.getTime() - lastMonthlyReport.getTime()) / (1000 * 60 * 60) 
          : 24 * 31;
        
        if (hoursSinceLastMonthly >= 24 * 30) {
          console.log('⏰ Scheduled monthly report triggered');
          await generateAndSaveReport('monthly');
          lastMonthlyReport = now;
        }
      }
      
      if (settings.yearlyReportEnabled) {
        const hoursSinceLastYearly = lastYearlyReport 
          ? (now.getTime() - lastYearlyReport.getTime()) / (1000 * 60 * 60) 
          : 24 * 366;
        
        if (hoursSinceLastYearly >= 24 * 365) {
          console.log('⏰ Scheduled yearly report triggered');
          await generateAndSaveReport('yearly');
          lastYearlyReport = now;
        }
      }
      
      lastReportCheck = now;
    } catch (error) {
      console.error('Report scheduler error:', error);
    }
  }, 60 * 60 * 1000);
  
  console.log('✅ Report scheduler started (checking every hour)');
}

export function stopReportScheduler() {
  if (reportSchedulerInterval) {
    clearInterval(reportSchedulerInterval);
    reportSchedulerInterval = null;
    console.log('⏹️ Report scheduler stopped');
  }
}

export function getReportSchedulerStatus() {
  return {
    isRunning: reportSchedulerInterval !== null,
    lastCheck: lastReportCheck,
    lastReports: {
      daily: lastDailyReport,
      weekly: lastWeeklyReport,
      monthly: lastMonthlyReport,
      yearly: lastYearlyReport,
    },
  };
}
