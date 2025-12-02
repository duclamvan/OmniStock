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
  stockAdjustmentHistory
} from '@shared/schema';
import { eq, gte, lte, and, sql, desc, between } from 'drizzle-orm';
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
    id: number;
    name: string;
    quantitySold: number;
    revenue: number;
  }>;
  topCustomers: Array<{
    id: number;
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
      .where(sql`${orderItems.orderId} = ANY(ARRAY[${sql.raw(orderIds.join(','))}]::int[])`);
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
  const lowStockProducts = allProducts.filter(p => (p.quantity || 0) <= (p.lowStockAlert || 5) && (p.quantity || 0) > 0);
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
      .where(sql`${receiptItems.receiptId} = ANY(ARRAY[${sql.raw(receiptIds.join(','))}]::int[])`);
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
    .map(([id, data]) => ({ id: parseInt(id) || 0, ...data, quantitySold: data.quantity }))
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
    .map(([id, data]) => ({ id: parseInt(id) || 0, ...data }))
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

export async function getLowStockAlerts(): Promise<Array<{ id: string; name: string; sku: string; stock: number; threshold: number }>> {
  const allProducts = await db.select().from(products);
  
  return allProducts
    .filter(p => (p.quantity || 0) <= (p.lowStockAlert || 5))
    .map(p => ({
      id: p.id,
      name: p.name,
      sku: p.sku || '',
      stock: p.quantity || 0,
      threshold: p.lowStockAlert || 5,
    }))
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
