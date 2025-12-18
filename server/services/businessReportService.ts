import OpenAI from 'openai';
import { db } from '../db';
import { orders, orderItems, products, expenses, businessReports, productLocations } from '@shared/schema';
import { eq, desc, and, gte, lte, sql, isNull, or } from 'drizzle-orm';
import { format, subDays } from 'date-fns';

export interface TopSellingItem {
  productId: string;
  name: string;
  sku: string;
  unitsSold: number;
  revenue: number;
}

export interface VelocityAlert {
  productId: string;
  name: string;
  sku: string;
  currentStock: number;
  dailyVelocity: number;
  daysUntilEmpty: number;
  urgency: 'critical' | 'warning' | 'normal';
}

export interface AIRecommendation {
  category: 'cash_flow' | 'inventory' | 'profit' | 'strategy';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  action: string;
}

export interface BusinessReportData {
  date: string;
  revenue: string;
  cashCollected: string;
  expenses: string;
  netCashFlow: string;
  totalStockValue: string;
  lowStockCount: number;
  deadStockCount: number;
  orderCount: number;
  averageOrderValue: string;
  topSellingItems: TopSellingItem[];
  velocityAlerts: VelocityAlert[];
  grossProfit: string;
  grossMargin: string;
  aiAnalysis: string;
  aiRecommendations: AIRecommendation[];
}

async function aggregateBusinessMetrics(): Promise<{
  revenue: number;
  cashCollected: number;
  expensesTotal: number;
  orderCount: number;
  topSellingItems: TopSellingItem[];
  lowStockCount: number;
  deadStockCount: number;
  totalStockValue: number;
  velocityAlerts: VelocityAlert[];
  grossProfit: number;
}> {
  const today = new Date();
  const thirtyDaysAgo = subDays(today, 30);
  const ninetyDaysAgo = subDays(today, 90);

  const recentOrders = await db.select()
    .from(orders)
    .where(gte(orders.createdAt, thirtyDaysAgo));

  let revenue = 0;
  let cashCollected = 0;
  recentOrders.forEach(order => {
    const total = parseFloat(order.grandTotal || '0');
    revenue += total;
    if (order.paymentStatus === 'paid') {
      cashCollected += total;
    }
  });

  const recentExpenses = await db.select()
    .from(expenses)
    .where(gte(expenses.createdAt, thirtyDaysAgo));
  
  const expensesTotal = recentExpenses.reduce((sum, exp) => 
    sum + parseFloat(exp.amount || '0'), 0);

  const orderItemsData = await db.select({
    productId: orderItems.productId,
    productName: orderItems.productName,
    sku: orderItems.sku,
    quantity: orderItems.quantity,
    total: orderItems.total,
  })
    .from(orderItems)
    .innerJoin(orders, eq(orderItems.orderId, orders.id))
    .where(gte(orders.createdAt, thirtyDaysAgo));

  const productSales: Record<string, { name: string; sku: string; unitsSold: number; revenue: number }> = {};
  let totalCost = 0;

  for (const item of orderItemsData) {
    if (!item.productId) continue;
    
    if (!productSales[item.productId]) {
      productSales[item.productId] = {
        name: item.productName || 'Unknown',
        sku: item.sku || '',
        unitsSold: 0,
        revenue: 0,
      };
    }
    productSales[item.productId].unitsSold += item.quantity || 0;
    productSales[item.productId].revenue += parseFloat(item.total || '0');
  }

  const topSellingItems: TopSellingItem[] = Object.entries(productSales)
    .map(([productId, data]) => ({ productId, ...data }))
    .sort((a, b) => b.unitsSold - a.unitsSold)
    .slice(0, 10);

  const allProducts = await db.select().from(products);
  
  for (const product of allProducts) {
    const salesData = productSales[product.id];
    if (salesData) {
      totalCost += (parseFloat(product.importCostCzk || '0') * salesData.unitsSold);
    }
  }
  
  const grossProfit = revenue - totalCost;

  let lowStockCount = 0;
  let totalStockValue = 0;
  
  for (const product of allProducts) {
    const stock = product.stock || 0;
    const minStock = product.minStock || 0;
    const price = parseFloat(product.price || '0');
    
    totalStockValue += stock * price;
    
    if (stock <= minStock && stock > 0) {
      lowStockCount++;
    }
  }

  const ninetyDaysAgoStr = format(ninetyDaysAgo, 'yyyy-MM-dd');
  const deadStockQuery = await db.select({ id: products.id })
    .from(products)
    .where(
      and(
        sql`${products.stock} > 0`,
        or(
          isNull(products.lastSoldAt),
          sql`${products.lastSoldAt} < ${ninetyDaysAgoStr}`
        )
      )
    );
  const deadStockCount = deadStockQuery.length;

  const velocityAlerts: VelocityAlert[] = [];
  const daysInPeriod = 30;
  
  for (const product of allProducts) {
    const sales = productSales[product.id];
    if (!sales) continue;
    
    const dailyVelocity = sales.unitsSold / daysInPeriod;
    if (dailyVelocity <= 0) continue;
    
    const currentStock = product.stock || 0;
    const daysUntilEmpty = Math.floor(currentStock / dailyVelocity);
    
    let urgency: 'critical' | 'warning' | 'normal' = 'normal';
    if (daysUntilEmpty <= 7) urgency = 'critical';
    else if (daysUntilEmpty <= 14) urgency = 'warning';
    
    if (urgency !== 'normal') {
      velocityAlerts.push({
        productId: product.id,
        name: product.name,
        sku: product.sku || '',
        currentStock,
        dailyVelocity: Math.round(dailyVelocity * 100) / 100,
        daysUntilEmpty,
        urgency,
      });
    }
  }

  velocityAlerts.sort((a, b) => a.daysUntilEmpty - b.daysUntilEmpty);

  return {
    revenue,
    cashCollected,
    expensesTotal,
    orderCount: recentOrders.length,
    topSellingItems,
    lowStockCount,
    deadStockCount,
    totalStockValue,
    velocityAlerts: velocityAlerts.slice(0, 10),
    grossProfit,
  };
}

async function generateAIAnalysis(metrics: {
  revenue: number;
  cashCollected: number;
  expensesTotal: number;
  grossProfit: number;
  grossMargin: number;
  lowStockCount: number;
  deadStockCount: number;
  velocityAlerts: VelocityAlert[];
  topSellingItems: TopSellingItem[];
}): Promise<{ analysis: string; recommendations: AIRecommendation[] }> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    console.warn('DEEPSEEK_API_KEY not configured, returning default analysis');
    return {
      analysis: 'AI analysis is not available. Please configure DEEPSEEK_API_KEY to enable AI-powered insights.',
      recommendations: [{
        category: 'strategy',
        priority: 'medium',
        title: 'Configure AI Analysis',
        description: 'Set up DEEPSEEK_API_KEY to get AI-powered business recommendations.',
        action: 'Add DEEPSEEK_API_KEY to environment variables',
      }],
    };
  }

  const openai = new OpenAI({ 
    apiKey,
    baseURL: 'https://api.deepseek.com/v1'
  });

  const prompt = `You are an expert CFO analyzing a business's financial health. Based on the following metrics from the last 30 days, provide actionable insights and recommendations.

BUSINESS METRICS:
- Revenue: ${metrics.revenue.toFixed(2)} CZK
- Cash Collected: ${metrics.cashCollected.toFixed(2)} CZK (${((metrics.cashCollected / metrics.revenue) * 100).toFixed(1)}% collection rate)
- Expenses: ${metrics.expensesTotal.toFixed(2)} CZK
- Gross Profit: ${metrics.grossProfit.toFixed(2)} CZK
- Gross Margin: ${metrics.grossMargin.toFixed(1)}%
- Net Cash Flow: ${(metrics.cashCollected - metrics.expensesTotal).toFixed(2)} CZK

INVENTORY HEALTH:
- Low Stock Items: ${metrics.lowStockCount} products
- Dead Stock (no sales 90+ days): ${metrics.deadStockCount} products
- Urgent Reorder Alerts: ${metrics.velocityAlerts.filter(v => v.urgency === 'critical').length} products running out within 7 days

TOP SELLING PRODUCTS:
${metrics.topSellingItems.slice(0, 5).map((p, i) => `${i + 1}. ${p.name} - ${p.unitsSold} units sold`).join('\n')}

Provide your analysis in the following JSON format:
{
  "analysis": "A 2-3 paragraph executive summary of the business health, key concerns, and opportunities",
  "recommendations": [
    {
      "category": "cash_flow|inventory|profit|strategy",
      "priority": "high|medium|low",
      "title": "Short action title",
      "description": "Detailed explanation of the issue or opportunity",
      "action": "Specific actionable step to take"
    }
  ]
}

Provide 4-6 specific, actionable recommendations. Focus on:
1. Cash flow optimization (payment collection, expense reduction)
2. Inventory management (reorder critical items, liquidate dead stock)
3. Profit improvement (pricing, cost reduction)
4. Strategic growth opportunities

Return ONLY the JSON object, no additional text.`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'deepseek-chat',
      messages: [
        {
          role: 'system',
          content: 'You are an expert CFO providing financial analysis. Always respond with valid JSON only.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 2000
    });

    const responseText = completion.choices[0]?.message?.content;
    if (!responseText) {
      throw new Error('Empty response from AI');
    }

    let cleanedResponse = responseText.trim();
    if (cleanedResponse.startsWith('```json')) {
      cleanedResponse = cleanedResponse.slice(7);
    }
    if (cleanedResponse.startsWith('```')) {
      cleanedResponse = cleanedResponse.slice(3);
    }
    if (cleanedResponse.endsWith('```')) {
      cleanedResponse = cleanedResponse.slice(0, -3);
    }
    cleanedResponse = cleanedResponse.trim();

    const parsed = JSON.parse(cleanedResponse);

    return {
      analysis: parsed.analysis || 'Analysis completed.',
      recommendations: parsed.recommendations || [],
    };

  } catch (error: any) {
    console.error('AI analysis error:', error.message);
    return {
      analysis: `Unable to generate AI analysis: ${error.message}. Please review the metrics manually.`,
      recommendations: [{
        category: 'strategy',
        priority: 'high',
        title: 'Review Metrics Manually',
        description: 'AI analysis was unable to complete. Review the business metrics above to identify improvement areas.',
        action: 'Check cash flow, inventory levels, and profit margins',
      }],
    };
  }
}

export async function generateBusinessReport(): Promise<BusinessReportData> {
  console.log('Generating business report...');
  
  const metrics = await aggregateBusinessMetrics();
  
  const grossMargin = metrics.revenue > 0 
    ? (metrics.grossProfit / metrics.revenue) * 100 
    : 0;
  
  const { analysis, recommendations } = await generateAIAnalysis({
    ...metrics,
    grossMargin,
  });

  const reportData: BusinessReportData = {
    date: format(new Date(), 'yyyy-MM-dd'),
    revenue: metrics.revenue.toFixed(2),
    cashCollected: metrics.cashCollected.toFixed(2),
    expenses: metrics.expensesTotal.toFixed(2),
    netCashFlow: (metrics.cashCollected - metrics.expensesTotal).toFixed(2),
    totalStockValue: metrics.totalStockValue.toFixed(2),
    lowStockCount: metrics.lowStockCount,
    deadStockCount: metrics.deadStockCount,
    orderCount: metrics.orderCount,
    averageOrderValue: metrics.orderCount > 0 
      ? (metrics.revenue / metrics.orderCount).toFixed(2) 
      : '0',
    topSellingItems: metrics.topSellingItems,
    velocityAlerts: metrics.velocityAlerts,
    grossProfit: metrics.grossProfit.toFixed(2),
    grossMargin: grossMargin.toFixed(2),
    aiAnalysis: analysis,
    aiRecommendations: recommendations,
  };

  const [savedReport] = await db.insert(businessReports).values({
    date: reportData.date,
    revenue: reportData.revenue,
    cashCollected: reportData.cashCollected,
    expenses: reportData.expenses,
    netCashFlow: reportData.netCashFlow,
    totalStockValue: reportData.totalStockValue,
    lowStockCount: reportData.lowStockCount,
    deadStockCount: reportData.deadStockCount,
    orderCount: reportData.orderCount,
    averageOrderValue: reportData.averageOrderValue,
    topSellingItems: reportData.topSellingItems,
    velocityAlerts: reportData.velocityAlerts,
    grossProfit: reportData.grossProfit,
    grossMargin: reportData.grossMargin,
    aiAnalysis: reportData.aiAnalysis,
    aiRecommendations: reportData.aiRecommendations,
  }).returning();

  console.log('Business report saved with ID:', savedReport.id);
  return reportData;
}

export async function getLatestBusinessReport() {
  const [report] = await db.select()
    .from(businessReports)
    .orderBy(desc(businessReports.createdAt))
    .limit(1);
  
  return report || null;
}

export async function getBusinessReports(limit = 10, offset = 0) {
  const reports = await db.select()
    .from(businessReports)
    .orderBy(desc(businessReports.createdAt))
    .limit(limit)
    .offset(offset);
  
  const [countResult] = await db.select({ count: sql<number>`count(*)` })
    .from(businessReports);
  
  return {
    reports,
    total: Number(countResult?.count || 0),
  };
}

export async function getBusinessReportById(id: string) {
  const [report] = await db.select()
    .from(businessReports)
    .where(eq(businessReports.id, id))
    .limit(1);
  
  return report || null;
}
