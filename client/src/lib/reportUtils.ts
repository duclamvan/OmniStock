import { format, parseISO, startOfMonth, subMonths, eachMonthOfInterval } from 'date-fns';
import Decimal from 'decimal.js';

export interface MonthlyData {
  month: string;
  year: number;
  monthName: string;
  revenueCZK: number;
  revenueEUR: number;
  revenueUSD: number;
  costCZK: number;
  costEUR: number;
  costUSD: number;
  profit: number;
  profitMargin: number;
  orderCount: number;
  unitsSold: number;
}

export interface ProductSale {
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  revenue: number;
  cost: number;
  profit: number;
  category?: string;
}

export interface CustomerMetric {
  customerId: string;
  customerName: string;
  orderCount: number;
  totalSpent: number;
  avgOrderValue: number;
  lastOrderDate: Date | null;
  firstOrderDate: Date | null;
}

const EXCHANGE_RATES = {
  USD_TO_CZK: 23,
  EUR_TO_CZK: 25,
  USD_TO_EUR: 0.92,
};

export function convertToBaseCurrency(amount: number, fromCurrency: string, toCurrency: string = 'CZK'): number {
  if (fromCurrency === toCurrency) return amount;
  
  if (toCurrency === 'CZK') {
    if (fromCurrency === 'EUR') return amount * EXCHANGE_RATES.EUR_TO_CZK;
    if (fromCurrency === 'USD') return amount * EXCHANGE_RATES.USD_TO_CZK;
  }
  
  if (toCurrency === 'EUR') {
    if (fromCurrency === 'CZK') return amount / EXCHANGE_RATES.EUR_TO_CZK;
    if (fromCurrency === 'USD') return amount * EXCHANGE_RATES.USD_TO_EUR;
  }
  
  if (toCurrency === 'USD') {
    if (fromCurrency === 'CZK') return amount / EXCHANGE_RATES.USD_TO_CZK;
    if (fromCurrency === 'EUR') return amount / EXCHANGE_RATES.USD_TO_EUR;
  }
  
  return amount;
}

export function aggregateMonthlyRevenue(
  orders: any[],
  orderItems: any[],
  products: any[],
  expenses: any[],
  monthsBack: number = 12
): MonthlyData[] {
  const now = new Date();
  const startDate = startOfMonth(subMonths(now, monthsBack - 1));
  const months = eachMonthOfInterval({ start: startDate, end: now });

  const monthlyData = months.map(monthDate => {
    const monthStr = format(monthDate, 'yyyy-MM');
    const monthName = format(monthDate, 'MMM yyyy');
    const year = monthDate.getFullYear();

    const monthOrders = orders.filter(order => {
      const orderDate = new Date(order.createdAt);
      return format(orderDate, 'yyyy-MM') === monthStr;
    });

    let revenueCZK = 0;
    let revenueEUR = 0;
    let revenueUSD = 0;
    let costCZK = 0;
    let costEUR = 0;
    let costUSD = 0;

    monthOrders.forEach(order => {
      const revenue = parseFloat(order.totalPrice || '0');
      if (order.currency === 'CZK') revenueCZK += revenue;
      else if (order.currency === 'EUR') revenueEUR += revenue;
      else if (order.currency === 'USD') revenueUSD += revenue;
    });

    const monthOrderIds = new Set(monthOrders.map(o => o.id));
    const monthOrderItems = orderItems.filter(item => monthOrderIds.has(item.orderId));

    monthOrderItems.forEach(item => {
      const product = products.find(p => p.id === item.productId);
      if (product) {
        const quantity = item.quantity || 0;
        costCZK += parseFloat(product.importCostCzk || '0') * quantity;
        costEUR += parseFloat(product.importCostEur || '0') * quantity;
        costUSD += parseFloat(product.importCostUsd || '0') * quantity;
      }
    });

    const monthExpenses = expenses.filter(expense => {
      const expenseDate = new Date(expense.createdAt || expense.date);
      return format(expenseDate, 'yyyy-MM') === monthStr;
    });

    monthExpenses.forEach(expense => {
      const amount = parseFloat(expense.amount || '0');
      if (expense.currency === 'CZK') costCZK += amount;
      else if (expense.currency === 'EUR') costEUR += amount;
      else if (expense.currency === 'USD') costUSD += amount;
    });

    const totalRevenue = revenueCZK + (revenueEUR * EXCHANGE_RATES.EUR_TO_CZK) + (revenueUSD * EXCHANGE_RATES.USD_TO_CZK);
    const totalCost = costCZK + (costEUR * EXCHANGE_RATES.EUR_TO_CZK) + (costUSD * EXCHANGE_RATES.USD_TO_CZK);
    const profit = totalRevenue - totalCost;
    const profitMargin = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;

    const unitsSold = monthOrderItems.reduce((sum, item) => sum + (item.quantity || 0), 0);

    return {
      month: monthStr,
      year,
      monthName,
      revenueCZK,
      revenueEUR,
      revenueUSD,
      costCZK,
      costEUR,
      costUSD,
      profit,
      profitMargin,
      orderCount: monthOrders.length,
      unitsSold,
    };
  });

  return monthlyData;
}

export function aggregateProductSales(
  orderItems: any[],
  products: any[],
  orders: any[]
): ProductSale[] {
  const productSales: { [key: string]: ProductSale } = {};

  orderItems.forEach(item => {
    const product = products.find(p => p.id === item.productId);
    if (!product) return;

    const order = orders.find(o => o.id === item.orderId);
    if (!order) return;

    if (!productSales[product.id]) {
      productSales[product.id] = {
        productId: product.id,
        productName: product.name,
        sku: product.sku || '',
        quantity: 0,
        revenue: 0,
        cost: 0,
        profit: 0,
        category: product.categoryId,
      };
    }

    const quantity = item.quantity || 0;
    const itemRevenue = parseFloat(item.totalPrice || '0');
    const itemCost = parseFloat(product.importCostCzk || '0') * quantity;

    productSales[product.id].quantity += quantity;
    productSales[product.id].revenue += convertToBaseCurrency(itemRevenue, order.currency);
    productSales[product.id].cost += itemCost;
    productSales[product.id].profit = productSales[product.id].revenue - productSales[product.id].cost;
  });

  return Object.values(productSales).sort((a, b) => b.quantity - a.quantity);
}

export function aggregateCustomerMetrics(
  orders: any[],
  customers: any[]
): CustomerMetric[] {
  const customerMetrics: { [key: string]: CustomerMetric } = {};

  orders.forEach(order => {
    if (!order.customerId) return;

    const customer = customers.find(c => c.id === order.customerId);
    if (!customer) return;

    if (!customerMetrics[customer.id]) {
      customerMetrics[customer.id] = {
        customerId: customer.id,
        customerName: customer.name,
        orderCount: 0,
        totalSpent: 0,
        avgOrderValue: 0,
        lastOrderDate: null,
        firstOrderDate: null,
      };
    }

    const orderAmount = parseFloat(order.totalPrice || '0');
    const amountInCZK = convertToBaseCurrency(orderAmount, order.currency);
    const orderDate = new Date(order.createdAt);

    customerMetrics[customer.id].orderCount += 1;
    customerMetrics[customer.id].totalSpent += amountInCZK;

    if (!customerMetrics[customer.id].lastOrderDate || orderDate > customerMetrics[customer.id].lastOrderDate!) {
      customerMetrics[customer.id].lastOrderDate = orderDate;
    }

    if (!customerMetrics[customer.id].firstOrderDate || orderDate < customerMetrics[customer.id].firstOrderDate!) {
      customerMetrics[customer.id].firstOrderDate = orderDate;
    }
  });

  Object.values(customerMetrics).forEach(metric => {
    metric.avgOrderValue = metric.orderCount > 0 ? metric.totalSpent / metric.orderCount : 0;
  });

  return Object.values(customerMetrics).sort((a, b) => b.totalSpent - a.totalSpent);
}

export function calculateInventoryMetrics(products: any[]) {
  const totalStock = products.reduce((sum, p) => sum + (p.quantity || 0), 0);
  const totalValue = products.reduce((sum, p) => {
    const qty = p.quantity || 0;
    const price = parseFloat(p.priceCzk || '0');
    return sum + (qty * price);
  }, 0);

  const lowStockProducts = products.filter(p => 
    p.quantity > 0 && p.quantity <= (p.lowStockAlert || 5)
  );

  const outOfStock = products.filter(p => p.quantity === 0);

  const overstock = products.filter(p => p.quantity > (p.lowStockAlert || 5) * 10);

  return {
    totalStock,
    totalValue,
    lowStockCount: lowStockProducts.length,
    outOfStockCount: outOfStock.length,
    overstockCount: overstock.length,
    lowStockProducts,
    outOfStockProducts: outOfStock,
    overstockProducts: overstock,
  };
}

export function prepareLineChartData(monthlyData: MonthlyData[], dataKey: 'profit' | 'revenueCZK' | 'revenueEUR' | 'profitMargin') {
  return monthlyData.map(m => ({
    month: m.monthName,
    value: m[dataKey],
  }));
}

export function preparePieChartData(data: { name: string; value: number }[]) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  return data.map(item => ({
    ...item,
    percentage: total > 0 ? ((item.value / total) * 100).toFixed(1) : '0',
  }));
}

export function calculateGrowthRate(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

export function formatPercentage(value: number): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
}
