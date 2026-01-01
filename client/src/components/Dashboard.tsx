import { lazy, Suspense, memo, useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { 
  Package, 
  AlertCircle, 
  CheckCircle2, 
  Truck, 
  ClipboardCheck,
  Euro,
  TrendingUp,
  TrendingDown,
  DollarSign,
  AlertTriangle,
  Target,
  Users,
  Headphones,
  CreditCard,
  Bell,
  Info,
  ArrowRight,
  Activity,
  ShoppingCart,
  ClipboardList,
  Tag,
  Ship,
  Calendar,
  Percent,
  Phone,
  Ticket,
  BarChart3,
  Layers,
  RefreshCw,
  Clock,
  Sun
} from "lucide-react";
import { Link } from "wouter";
import { useLocalization } from "@/contexts/LocalizationContext";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { formatDistanceToNow } from "date-fns";

// Lazy load chart components
const RevenueChart = lazy(() => import("./charts/RevenueChart").then(m => ({ default: m.RevenueChart })));
const ExpensesChart = lazy(() => import("./charts/ExpensesChart").then(m => ({ default: m.ExpensesChart })));
const YearlyChart = lazy(() => import("./charts/YearlyChart").then(m => ({ default: m.YearlyChart })));

// TypeScript interfaces for API responses
interface OperationsPulseData {
  ordersAwaitingFulfillment: number;
  ordersAtRiskOfSLA: number;
  pickPackThroughputToday: number;
  carrierExceptions: number;
  pendingStockAdjustments: number;
  timestamp: string;
}

interface FinancialControlData {
  totalRevenueEur: number;
  netProfit: number;
  profitMarginPercent: number;
  averageOrderValue: number;
  agedReceivables: {
    '30-60days': number;
    '60-90days': number;
    '90plus': number;
  };
  cashConversionByCurrency: {
    EUR: { current: number; previous: number; trend: number };
    CZK: { current: number; previous: number; trend: number };
    USD: { current: number; previous: number; trend: number };
  };
  timestamp: string;
}

interface InventoryRiskData {
  lowStockCount: number;
  overAllocatedSKUs: number;
  agingInventoryCount: number;
  inboundBacklog: number;
  supplierDelayAlerts: number;
  timestamp: string;
}

interface FulfillmentEfficiencyData {
  pickErrorsCount: number;
  aiCartonRecommendationsUsed: number;
  aiAdoptionRatePercent: number;
  ordersByStage: {
    to_fulfill: number;
    picking: number;
    packing: number;
    shipped: number;
    fulfilled: number;
  };
  carrierOnTimeRatePercent: number;
  timestamp: string;
}

interface CustomerSupportData {
  top10CustomersByRevenue: Array<{
    customerId: string;
    name: string;
    revenue: number;
  }>;
  activeSupportTickets: {
    low: number;
    medium: number;
    high: number;
    urgent: number;
  };
  totalActiveTickets: number;
  codPaymentStatus: {
    pending: number;
    paid: number;
    failed: number;
  };
  retentionRatePercent: number;
  timestamp: string;
}

interface SystemAlertsData {
  returnsSpike: {
    thisWeek: number;
    lastWeek: number;
    averageWeekly: number;
    spikePercent: number;
    isAlert: boolean;
  };
  recentCriticalNotifications: Array<{
    id: string;
    title: string;
    description: string;
    type: string;
    createdAt: string;
  }>;
  integrationHealth: {
    orderProcessing: string;
    lastOrderAt: string | null;
    recentOrderCount: number;
  };
  recentAuditHighlights: Array<{
    id: string;
    description: string;
    createdAt: string;
  }>;
  timestamp: string;
}

interface ActionItemsData {
  preordersAwaitingNotice: Array<{
    id: string;
    customerId: string;
    customerName: string;
    customerPhone: string | null;
    status: string;
    expectedDate: string | null;
    reminderEnabled: boolean;
    priority: string;
    notes: string | null;
    createdAt: string;
  }>;
  preordersCount: number;
  openTickets: Array<{
    id: number;
    ticketId: string;
    subject: string;
    severity: string;
    status: string;
    customerId: string | null;
    customerName: string | null;
    orderId: string | null;
    createdAt: string;
  }>;
  openTicketsCount: number;
  ticketsBySeverity: {
    urgent: number;
    high: number;
    medium: number;
    low: number;
  };
  activeDiscounts: Array<{
    id: number;
    discountId: string;
    name: string;
    type: string;
    percentage: string | null;
    value: string | null;
    minOrderAmount: string | null;
    startDate: string | null;
    endDate: string | null;
    applicationScope: string;
  }>;
  activeDiscountsCount: number;
  incomingShipments: Array<{
    id: number;
    shipmentName: string | null;
    carrier: string;
    trackingNumber: string;
    status: string;
    origin: string;
    destination: string;
    estimatedDelivery: string | null;
    totalUnits: number | null;
    createdAt: string;
  }>;
  incomingShipmentsCount: number;
  timestamp: string;
}

interface SalesGrowthData {
  dailySales: Array<{ date: string; revenue: number; orders: number; profit: number }>;
  weeklySales: Array<{ week: string; revenue: number; orders: number; profit: number }>;
  monthlySales: Array<{ month: string; revenue: number; orders: number; profit: number }>;
  todayMetrics: {
    revenue: number;
    profit: number;
    orders: number;
    aov: number;
    changeVsYesterday: number;
    profitChangeVsYesterday: number;
  };
  weeklyComparison: {
    thisWeekRevenue: number;
    thisWeekOrders: number;
    lastWeekRevenue: number;
    lastWeekOrders: number;
    changePercent: number;
  };
  monthlyComparison: {
    thisMonthRevenue: number;
    thisMonthOrders: number;
    lastMonthRevenue: number;
    lastMonthOrders: number;
    changePercent: number;
  };
  salesVelocity: {
    ordersPerDay: number;
    avgRevenuePerDay: number;
  };
  averageOrderValue: {
    today: number;
    thisWeek: number;
    thisMonth: number;
  };
  topSellingProducts: Array<{
    productId: string;
    name: string;
    sku: string;
    unitsSold: number;
    revenue: number;
  }>;
  timestamp: string;
}

interface FulfillmentPipelineData {
  pipeline: {
    inQueue: number;
    inPicking: number;
    inPacking: number;
    readyToShip: number;
    shippedLast24h: number;
  };
  metrics: {
    addedLast24h: number;
    shippedLast24h: number;
    avgProcessingHours: number;
  };
  recentActivity: Array<{
    type: string;
    orderId: string;
    timestamp: string;
    customerName?: string;
  }>;
  timestamp: string;
}

interface InventoryHealthData {
  summary: {
    totalInventoryValue: number;
    totalUnits: number;
    totalProducts: number;
    healthyStock: number;
    lowStock: number;
    outOfStock: number;
    slowMovers: number;
  };
  turnover: {
    monthlyTurnover: number;
    annualizedTurnover: number;
    daysOfSupply: number;
    sellThroughRate30Days: number;
  };
  reorderAlerts: Array<{
    id: string;
    name: string;
    sku: string;
    quantity: number;
    coverageDays: number;
    dailySalesRate: number;
    needsReorder: boolean;
    outOfStock: boolean;
  }>;
  overstocked: Array<{
    id: string;
    name: string;
    sku: string;
    quantity: number;
    coverageDays: number;
  }>;
  stockHealthDistribution: {
    healthy: number;
    lowStock: number;
    outOfStock: number;
    overstocked: number;
    slowMoving: number;
  };
  timestamp: string;
}

// Skeleton components
const MetricCardSkeleton = memo(() => (
  <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
    <CardContent className="p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-24 bg-slate-200 dark:bg-slate-700" />
          <Skeleton className="h-8 w-32 bg-slate-200 dark:bg-slate-700" />
          <Skeleton className="h-3 w-20 bg-slate-200 dark:bg-slate-700" />
        </div>
        <Skeleton className="h-12 w-12 rounded-lg ml-4 bg-slate-200 dark:bg-slate-700" />
      </div>
    </CardContent>
  </Card>
));
MetricCardSkeleton.displayName = 'MetricCardSkeleton';

const ChartSkeleton = memo(() => (
  <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
    <CardHeader className="flex flex-row items-center justify-between">
      <Skeleton className="h-6 w-32 bg-slate-200 dark:bg-slate-700" />
      <Skeleton className="h-8 w-24 bg-slate-200 dark:bg-slate-700" />
    </CardHeader>
    <CardContent>
      <Skeleton className="h-64 w-full bg-slate-200 dark:bg-slate-700" />
    </CardContent>
  </Card>
));
ChartSkeleton.displayName = 'ChartSkeleton';

type ChartPeriod = 'daily' | 'weekly' | 'monthly';

interface ChartDataPoint {
  label: string;
  revenue: number;
  profit: number;
  cost: number;
}

interface PeriodMetrics {
  totalRevenue: number;
  totalProfit: number;
  totalCost: number;
  profitMargin: number;
  prevPeriodRevenue: number;
  prevPeriodProfit: number;
  revenueChange: number;
  profitChange: number;
}

interface SalesAnalyticsSectionProps {
  formatCurrency: (amount: number, currency: string) => string;
  t: (key: string) => string;
  salesGrowth: SalesGrowthData | undefined;
  isLoading: boolean;
}

const SalesAnalyticsSection = memo(({ formatCurrency, t, salesGrowth, isLoading }: SalesAnalyticsSectionProps) => {
  const [chartPeriod, setChartPeriod] = useState<ChartPeriod>('daily');
  
  const { chartData, metrics } = useMemo(() => {
    if (!salesGrowth) {
      return { 
        chartData: [], 
        metrics: { 
          totalRevenue: 0, totalProfit: 0, totalCost: 0, profitMargin: 0,
          prevPeriodRevenue: 0, prevPeriodProfit: 0, revenueChange: 0, profitChange: 0
        } 
      };
    }

    let data: ChartDataPoint[] = [];
    let totalRevenue = 0;
    let totalProfit = 0;
    let totalCost = 0;
    let prevPeriodRevenue = 0;
    let prevPeriodProfit = 0;

    if (chartPeriod === 'daily' && salesGrowth.dailySales) {
      data = salesGrowth.dailySales.map(day => {
        const cost = day.revenue - day.profit;
        return {
          label: new Date(day.date).toLocaleDateString('en', { weekday: 'short' }),
          revenue: day.revenue,
          profit: day.profit,
          cost: cost
        };
      });
      totalRevenue = data.reduce((sum, d) => sum + d.revenue, 0);
      totalProfit = data.reduce((sum, d) => sum + d.profit, 0);
      totalCost = data.reduce((sum, d) => sum + d.cost, 0);
      prevPeriodRevenue = salesGrowth.weeklyComparison?.lastWeekRevenue || 0;
      prevPeriodProfit = prevPeriodRevenue * (salesGrowth.todayMetrics?.profit && salesGrowth.todayMetrics?.revenue 
        ? salesGrowth.todayMetrics.profit / Math.max(salesGrowth.todayMetrics.revenue, 1) : 0.3);
    } else if (chartPeriod === 'weekly' && salesGrowth.weeklySales) {
      data = salesGrowth.weeklySales.map((week, index) => {
        const cost = week.revenue - week.profit;
        return {
          label: `Week ${index + 1}`,
          revenue: week.revenue,
          profit: week.profit,
          cost: cost
        };
      });
      totalRevenue = data.reduce((sum, d) => sum + d.revenue, 0);
      totalProfit = data.reduce((sum, d) => sum + d.profit, 0);
      totalCost = data.reduce((sum, d) => sum + d.cost, 0);
      prevPeriodRevenue = salesGrowth.monthlyComparison?.lastMonthRevenue || 0;
      prevPeriodProfit = prevPeriodRevenue * 0.3;
    } else if (chartPeriod === 'monthly' && salesGrowth.monthlySales) {
      data = salesGrowth.monthlySales.map(month => {
        const cost = month.revenue - month.profit;
        return {
          label: new Date(month.month + '-01').toLocaleDateString('en', { month: 'short' }),
          revenue: month.revenue,
          profit: month.profit,
          cost: cost
        };
      });
      totalRevenue = data.reduce((sum, d) => sum + d.revenue, 0);
      totalProfit = data.reduce((sum, d) => sum + d.profit, 0);
      totalCost = data.reduce((sum, d) => sum + d.cost, 0);
      prevPeriodRevenue = salesGrowth.monthlyComparison?.lastMonthRevenue || 0;
      prevPeriodProfit = prevPeriodRevenue * 0.3;
    }

    const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
    const revenueChange = prevPeriodRevenue > 0 ? ((totalRevenue - prevPeriodRevenue) / prevPeriodRevenue) * 100 : 0;
    const profitChange = prevPeriodProfit > 0 ? ((totalProfit - prevPeriodProfit) / prevPeriodProfit) * 100 : 0;

    return {
      chartData: data,
      metrics: {
        totalRevenue,
        totalProfit,
        totalCost,
        profitMargin,
        prevPeriodRevenue,
        prevPeriodProfit,
        revenueChange,
        profitChange
      }
    };
  }, [salesGrowth, chartPeriod]);

  const periodLabel = chartPeriod === 'daily' ? t('last7Days') : chartPeriod === 'weekly' ? t('last4Weeks') : t('last12Months');

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-slate-800 p-3 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg">
          <p className="font-semibold text-gray-900 dark:text-gray-100 mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {formatCurrency(entry.value, 'EUR')}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (isLoading && !salesGrowth) {
    return (
      <section>
        <div className="mb-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2" data-testid="heading-sales-analytics">
            <BarChart3 className="h-5 w-5 text-blue-500" />
            {t('salesAnalytics')}
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">{t('trackDailyWeeklyMonthly')}</p>
        </div>
        <ChartSkeleton />
      </section>
    );
  }

  return (
    <section>
      <div className="mb-4">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2" data-testid="heading-sales-analytics">
          <BarChart3 className="h-5 w-5 text-blue-500" />
          {t('salesAnalytics')}
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">{t('trackDailyWeeklyMonthly')}</p>
      </div>

      <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="text-gray-900 dark:text-gray-100 text-lg">{t('revenueAndProfit')}</CardTitle>
              <CardDescription className="text-gray-600 dark:text-gray-400">{periodLabel}</CardDescription>
            </div>
            <Tabs value={chartPeriod} onValueChange={(value) => setChartPeriod(value as ChartPeriod)} className="w-full sm:w-auto">
              <TabsList className="grid w-full sm:w-auto grid-cols-3 bg-slate-100 dark:bg-slate-700/50 p-1 rounded-lg">
                <TabsTrigger 
                  value="daily" 
                  className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-600 data-[state=active]:shadow-sm rounded-md px-4 py-2 text-sm font-medium transition-all"
                  data-testid="tab-daily"
                >
                  {t('daily')}
                </TabsTrigger>
                <TabsTrigger 
                  value="weekly" 
                  className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-600 data-[state=active]:shadow-sm rounded-md px-4 py-2 text-sm font-medium transition-all"
                  data-testid="tab-weekly"
                >
                  {t('weekly')}
                </TabsTrigger>
                <TabsTrigger 
                  value="monthly" 
                  className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-600 data-[state=active]:shadow-sm rounded-md px-4 py-2 text-sm font-medium transition-all"
                  data-testid="tab-monthly"
                >
                  {t('monthly')}
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent>
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
              <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.05}/>
                  </linearGradient>
                  <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#94a3b8" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:stroke-slate-700" />
                <XAxis 
                  dataKey="label" 
                  stroke="#64748b" 
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis 
                  stroke="#64748b" 
                  fontSize={12}
                  tickFormatter={(value) => `€${(value / 1000).toFixed(0)}k`}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend 
                  wrapperStyle={{ paddingTop: '20px' }}
                  formatter={(value) => <span className="text-gray-600 dark:text-gray-300 text-sm">{value}</span>}
                />
                <Area 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorRevenue)" 
                  name={t('revenue')}
                />
                <Area 
                  type="monotone" 
                  dataKey="profit" 
                  stroke="#10b981" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorProfit)" 
                  name={t('profit')}
                />
                <Area 
                  type="monotone" 
                  dataKey="cost" 
                  stroke="#94a3b8" 
                  strokeWidth={1.5}
                  fillOpacity={1} 
                  fill="url(#colorCost)" 
                  name={t('cost')}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <Separator className="my-4 bg-slate-200 dark:bg-slate-700" />

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-4">
              <p className="text-xs font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wide">{t('periodRevenue')}</p>
              <p className="text-xl font-bold text-gray-900 dark:text-gray-100 mt-1" data-testid="value-period-revenue">
                {formatCurrency(metrics.totalRevenue, 'EUR')}
              </p>
              <div className="flex items-center gap-1 mt-2">
                {metrics.revenueChange >= 0 ? (
                  <TrendingUp className="h-3 w-3 text-green-600 dark:text-green-400" />
                ) : (
                  <TrendingDown className="h-3 w-3 text-red-600 dark:text-red-400" />
                )}
                <span className={`text-xs ${metrics.revenueChange >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {metrics.revenueChange >= 0 ? '+' : ''}{metrics.revenueChange.toFixed(1)}% {t('vsPrevPeriod')}
                </span>
              </div>
            </div>

            <div className="bg-emerald-50 dark:bg-emerald-950/30 rounded-lg p-4">
              <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">{t('periodProfit')}</p>
              <p className="text-xl font-bold text-gray-900 dark:text-gray-100 mt-1" data-testid="value-period-profit">
                {formatCurrency(metrics.totalProfit, 'EUR')}
              </p>
              <div className="flex items-center gap-1 mt-2">
                {metrics.profitChange >= 0 ? (
                  <TrendingUp className="h-3 w-3 text-green-600 dark:text-green-400" />
                ) : (
                  <TrendingDown className="h-3 w-3 text-red-600 dark:text-red-400" />
                )}
                <span className={`text-xs ${metrics.profitChange >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {metrics.profitChange >= 0 ? '+' : ''}{metrics.profitChange.toFixed(1)}% {t('vsPrevPeriod')}
                </span>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-700/30 rounded-lg p-4">
              <p className="text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wide">{t('periodCost')}</p>
              <p className="text-xl font-bold text-gray-900 dark:text-gray-100 mt-1" data-testid="value-period-cost">
                {formatCurrency(metrics.totalCost, 'EUR')}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                {((metrics.totalCost / metrics.totalRevenue) * 100).toFixed(1)}% of revenue
              </p>
            </div>

            <div className="bg-purple-50 dark:bg-purple-950/30 rounded-lg p-4">
              <p className="text-xs font-medium text-purple-600 dark:text-purple-400 uppercase tracking-wide">{t('profitMargin')}</p>
              <p className="text-xl font-bold text-gray-900 dark:text-gray-100 mt-1" data-testid="value-profit-margin">
                {metrics.profitMargin.toFixed(1)}%
              </p>
              <div className="flex items-center gap-1 mt-2">
                <Target className="h-3 w-3 text-purple-600 dark:text-purple-400" />
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  Target: 45%
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
});
SalesAnalyticsSection.displayName = 'SalesAnalyticsSection';

export function Dashboard() {
  const { t } = useTranslation(['dashboard', 'common']);
  const { formatCurrency } = useLocalization();
  
  // Query all dashboard endpoints
  // Operations pulse - faster polling (15s) for critical fulfillment metrics
  const { data: operationsPulse, isLoading: operationsLoading, dataUpdatedAt: operationsUpdatedAt } = useQuery<OperationsPulseData>({
    queryKey: ['/api/dashboard/operations-pulse'],
    staleTime: 10 * 1000, // Data stale after 10 seconds
    refetchInterval: 15 * 1000, // Refetch every 15 seconds for near real-time order updates
    refetchOnWindowFocus: true,
    refetchIntervalInBackground: false,
  });

  const { data: financialControl, isLoading: financialLoading } = useQuery<FinancialControlData>({
    queryKey: ['/api/dashboard/financial-control'],
    staleTime: 60 * 1000,
    refetchInterval: 60 * 1000,
  });

  const { data: inventoryRisk, isLoading: inventoryLoading } = useQuery<InventoryRiskData>({
    queryKey: ['/api/dashboard/inventory-risk'],
    staleTime: 60 * 1000,
    refetchInterval: 60 * 1000,
  });

  // Fulfillment efficiency - faster polling (20s) for pick/pack metrics
  const { data: fulfillmentEfficiency, isLoading: fulfillmentLoading } = useQuery<FulfillmentEfficiencyData>({
    queryKey: ['/api/dashboard/fulfillment-efficiency'],
    staleTime: 15 * 1000,
    refetchInterval: 20 * 1000, // Faster refresh for fulfillment metrics
    refetchOnWindowFocus: true,
    refetchIntervalInBackground: false,
  });

  const { data: customerSupport, isLoading: customerLoading } = useQuery<CustomerSupportData>({
    queryKey: ['/api/dashboard/customer-support'],
    staleTime: 60 * 1000,
    refetchInterval: 60 * 1000,
  });

  // System alerts - faster polling (15s) for real-time alert detection
  const { data: systemAlerts, isLoading: alertsLoading } = useQuery<SystemAlertsData>({
    queryKey: ['/api/dashboard/system-alerts'],
    staleTime: 10 * 1000,
    refetchInterval: 15 * 1000,
    refetchOnWindowFocus: true,
    refetchIntervalInBackground: false,
  });

  // Action items - preorders, tickets, discounts, incoming shipments
  const { data: actionItems, isLoading: actionItemsLoading } = useQuery<ActionItemsData>({
    queryKey: ['/api/dashboard/action-items'],
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000, // Refresh every minute
    refetchOnWindowFocus: true,
  });

  const { user } = useAuth();
  const isAdmin = user?.role === 'administrator';
  
  const { data: majorNotifications, isLoading: notificationsLoading } = useQuery<any[]>({
    queryKey: ['/api/notifications?majorOnly=true&limit=10'],
    enabled: isAdmin,
    staleTime: 30 * 1000,
    refetchInterval: 30 * 1000,
  });

  // Sales growth KPIs
  const { data: salesGrowth, isLoading: salesGrowthLoading } = useQuery<SalesGrowthData>({
    queryKey: ['/api/dashboard/sales-growth'],
    staleTime: 60 * 1000,
    refetchInterval: 60 * 1000,
  });

  // Fulfillment Pipeline - 24h order flow
  const { data: fulfillmentPipeline, isLoading: pipelineLoading } = useQuery<FulfillmentPipelineData>({
    queryKey: ['/api/dashboard/fulfillment-pipeline'],
    staleTime: 30 * 1000,
    refetchInterval: 30 * 1000,
  });

  // Inventory health KPIs
  const { data: inventoryHealth, isLoading: inventoryHealthLoading } = useQuery<InventoryHealthData>({
    queryKey: ['/api/dashboard/inventory-health'],
    staleTime: 60 * 1000,
    refetchInterval: 60 * 1000,
  });

  return (
    <div className="space-y-6 lg:space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100" data-testid="heading-dashboard">
            {t('dashboard:salesDashboard')}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1" data-testid="text-dashboard-subtitle">
            {t('dashboard:salesInsight')}
          </p>
        </div>
        <Badge variant="outline" className="text-sm flex items-center gap-2 w-fit">
          <Activity className="h-4 w-4 text-green-500" />
          <span className="text-gray-900 dark:text-gray-100">{t('common:liveUpdates')}</span>
        </Badge>
      </div>

      {/* Sales Hero Cards - Key KPIs at the top */}
      <section>
        <div className="mb-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2" data-testid="heading-today-overview">
            <Sun className="h-5 w-5 text-yellow-500" />
            {t('todaysOverview')}
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">{t('todaysOverviewDescription')}</p>
        </div>

        {salesGrowthLoading && !salesGrowth ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {[...Array(4)].map((_, i) => <MetricCardSkeleton key={i} />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {/* Today's Revenue */}
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/40 dark:to-blue-900/20 border-blue-200 dark:border-blue-800" data-testid="card-today-revenue">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-blue-600 dark:text-blue-400" data-testid="label-today-revenue">{t('todayRevenue')}</p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-1" data-testid="value-today-revenue">
                      {formatCurrency(salesGrowth?.todayMetrics.revenue || 0, 'EUR')}
                    </p>
                    {salesGrowth?.todayMetrics.changeVsYesterday !== undefined && (
                      <div className="flex items-center gap-1 mt-2">
                        {salesGrowth.todayMetrics.changeVsYesterday >= 0 ? (
                          <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
                        ) : (
                          <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-400" />
                        )}
                        <span className={`text-xs font-medium ${salesGrowth.todayMetrics.changeVsYesterday >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                          {salesGrowth.todayMetrics.changeVsYesterday >= 0 ? '+' : ''}{salesGrowth.todayMetrics.changeVsYesterday.toFixed(1)}% {t('vsYesterday')}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="p-3 bg-blue-200 dark:bg-blue-800/40 rounded-lg">
                    <Euro className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Today's Profit */}
            <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/40 dark:to-green-900/20 border-green-200 dark:border-green-800" data-testid="card-today-profit">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-green-600 dark:text-green-400" data-testid="label-today-profit">{t('todayProfit')}</p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-1" data-testid="value-today-profit">
                      {formatCurrency(salesGrowth?.todayMetrics.profit || 0, 'EUR')}
                    </p>
                    {salesGrowth?.todayMetrics.profitChangeVsYesterday !== undefined && (
                      <div className="flex items-center gap-1 mt-2">
                        {salesGrowth.todayMetrics.profitChangeVsYesterday >= 0 ? (
                          <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
                        ) : (
                          <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-400" />
                        )}
                        <span className={`text-xs font-medium ${salesGrowth.todayMetrics.profitChangeVsYesterday >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                          {salesGrowth.todayMetrics.profitChangeVsYesterday >= 0 ? '+' : ''}{salesGrowth.todayMetrics.profitChangeVsYesterday.toFixed(1)}% {t('vsYesterday')}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="p-3 bg-green-200 dark:bg-green-800/40 rounded-lg">
                    <TrendingUp className="h-6 w-6 text-green-600 dark:text-green-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Today's Orders */}
            <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/40 dark:to-purple-900/20 border-purple-200 dark:border-purple-800" data-testid="card-today-orders">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-purple-600 dark:text-purple-400" data-testid="label-today-orders">{t('todayOrders')}</p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-1" data-testid="value-today-orders">
                      {salesGrowth?.todayMetrics.orders || 0}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">{t('ordersPlaced')}</p>
                  </div>
                  <div className="p-3 bg-purple-200 dark:bg-purple-800/40 rounded-lg">
                    <ShoppingCart className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Today's AOV */}
            <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950/40 dark:to-orange-900/20 border-orange-200 dark:border-orange-800" data-testid="card-today-aov">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-orange-600 dark:text-orange-400" data-testid="label-today-aov">{t('todayAOV')}</p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-1" data-testid="value-today-aov">
                      {formatCurrency(salesGrowth?.todayMetrics.aov || 0, 'EUR')}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">{t('perTransaction')}</p>
                  </div>
                  <div className="p-3 bg-orange-200 dark:bg-orange-800/40 rounded-lg">
                    <DollarSign className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </section>

      <Separator className="bg-slate-200 dark:bg-slate-700" />

      {/* Sales Analytics - Modern Tabbed Chart */}
      <SalesAnalyticsSection formatCurrency={formatCurrency} t={t} salesGrowth={salesGrowth} isLoading={salesGrowthLoading} />

      <Separator className="bg-slate-200 dark:bg-slate-700" />

      {/* Fulfillment Pipeline Section */}
      <section>
        <div className="mb-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2" data-testid="heading-fulfillment-pipeline">
            <Truck className="h-5 w-5 text-blue-500" />
            {t('fulfillmentPipeline')}
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">{t('fulfillmentPipelineDescription')}</p>
        </div>

        {pipelineLoading && !fulfillmentPipeline ? (
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
            {[...Array(5)].map((_, i) => <MetricCardSkeleton key={i} />)}
          </div>
        ) : (
          <>
            {/* Pipeline Stage Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 mb-6">
              {/* In Queue */}
              <Link href="/orders?status=to_fulfill">
                <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 cursor-pointer hover:shadow-lg transition-shadow" data-testid="card-pipeline-queue">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                        <ClipboardList className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                      </div>
                      <p className="text-xs font-medium text-gray-600 dark:text-gray-400">{t('inQueue')}</p>
                    </div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-gray-100" data-testid="value-pipeline-queue">
                      {fulfillmentPipeline?.pipeline.inQueue || 0}
                    </p>
                  </CardContent>
                </Card>
              </Link>

              {/* Picking */}
              <Link href="/pick-pack">
                <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 cursor-pointer hover:shadow-lg transition-shadow" data-testid="card-pipeline-picking">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                        <Package className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      </div>
                      <p className="text-xs font-medium text-gray-600 dark:text-gray-400">{t('picking')}</p>
                    </div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-gray-100" data-testid="value-pipeline-picking">
                      {fulfillmentPipeline?.pipeline.inPicking || 0}
                    </p>
                  </CardContent>
                </Card>
              </Link>

              {/* Packing */}
              <Link href="/pick-pack">
                <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 cursor-pointer hover:shadow-lg transition-shadow" data-testid="card-pipeline-packing">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                        <Layers className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                      </div>
                      <p className="text-xs font-medium text-gray-600 dark:text-gray-400">{t('packing')}</p>
                    </div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-gray-100" data-testid="value-pipeline-packing">
                      {fulfillmentPipeline?.pipeline.inPacking || 0}
                    </p>
                  </CardContent>
                </Card>
              </Link>

              {/* Ready to Ship */}
              <Link href="/orders?status=ready_to_ship">
                <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 cursor-pointer hover:shadow-lg transition-shadow" data-testid="card-pipeline-ready">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                        <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                      </div>
                      <p className="text-xs font-medium text-gray-600 dark:text-gray-400">{t('readyToShip')}</p>
                    </div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-gray-100" data-testid="value-pipeline-ready">
                      {fulfillmentPipeline?.pipeline.readyToShip || 0}
                    </p>
                  </CardContent>
                </Card>
              </Link>

              {/* Shipped (24h) */}
              <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700" data-testid="card-pipeline-shipped">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                      <Ship className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <p className="text-xs font-medium text-gray-600 dark:text-gray-400">{t('shippedLast24h')}</p>
                  </div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100" data-testid="value-pipeline-shipped">
                    {fulfillmentPipeline?.pipeline.shippedLast24h || 0}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Metrics and Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* 24h Metrics */}
              <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                <CardHeader>
                  <CardTitle className="text-sm text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    <Clock className="h-4 w-4 text-blue-500" />
                    {t('last24hMetrics')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-gray-900 dark:text-gray-100" data-testid="value-added-24h">
                        {fulfillmentPipeline?.metrics.addedLast24h || 0}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{t('ordersAdded')}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-green-600 dark:text-green-400" data-testid="value-shipped-24h">
                        {fulfillmentPipeline?.metrics.shippedLast24h || 0}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{t('ordersShipped')}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-gray-900 dark:text-gray-100" data-testid="value-avg-processing">
                        {fulfillmentPipeline?.metrics.avgProcessingHours || 0}h
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{t('avgProcessing')}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Recent Activity */}
              <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                <CardHeader>
                  <CardTitle className="text-sm text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    <Activity className="h-4 w-4 text-green-500" />
                    {t('recentActivity')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {fulfillmentPipeline?.recentActivity.slice(0, 6).map((activity, index) => (
                      <div key={index} className="flex items-center justify-between text-sm py-1 border-b border-slate-100 dark:border-slate-700 last:border-0">
                        <div className="flex items-center gap-2">
                          {activity.type === 'shipped' ? (
                            <Ship className="h-3 w-3 text-green-500" />
                          ) : (
                            <ClipboardCheck className="h-3 w-3 text-blue-500" />
                          )}
                          <span className="text-gray-900 dark:text-gray-100 font-medium">{activity.orderId}</span>
                          {activity.customerName && (
                            <span className="text-gray-500 dark:text-gray-400 text-xs truncate max-w-[100px]">
                              {activity.customerName}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={activity.type === 'shipped' ? 'default' : 'outline'} className="text-[10px]">
                            {activity.type === 'shipped' ? t('shipped') : t('added')}
                          </Badge>
                          <span className="text-xs text-gray-400">
                            {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                          </span>
                        </div>
                      </div>
                    ))}
                    {(!fulfillmentPipeline?.recentActivity || fulfillmentPipeline.recentActivity.length === 0) && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">{t('noRecentActivity')}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </section>

      <Separator className="bg-slate-200 dark:bg-slate-700" />

      {/* Action Items Section - Quick access to pending work */}
      <section>
        <div className="mb-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2" data-testid="heading-action-items">
            <ClipboardList className="h-5 w-5 text-orange-500" />
            {t('common:actionItems')}
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">{t('common:actionItemsDescription')}</p>
        </div>

        {actionItemsLoading && !actionItems ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <MetricCardSkeleton key={i} />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Pre-orders Awaiting Notice */}
            <Link href="/pre-orders">
              <Card className={`cursor-pointer hover:shadow-lg transition-shadow h-full ${(actionItems?.preordersCount || 0) > 0 ? 'bg-purple-50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'}`} data-testid="card-preorders-action">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400 flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      {t('common:preordersAwaitingNotice')}
                    </CardTitle>
                    <Badge variant={actionItems?.preordersCount ? 'default' : 'outline'} className={actionItems?.preordersCount ? 'bg-purple-600' : ''}>
                      {actionItems?.preordersCount || 0}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  {actionItems?.preordersAwaitingNotice?.length ? (
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {actionItems.preordersAwaitingNotice.slice(0, 3).map((po) => (
                        <div key={po.id} className="text-sm border-l-2 border-purple-400 pl-2">
                          <p className="font-medium text-gray-900 dark:text-gray-100 truncate">{po.customerName}</p>
                          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                            <Badge variant="outline" className="text-[10px] px-1 py-0">
                              {po.status === 'pending' ? t('common:pending') : t('common:partiallyArrived')}
                            </Badge>
                            {po.expectedDate && (
                              <span>{new Date(po.expectedDate).toLocaleDateString()}</span>
                            )}
                          </div>
                        </div>
                      ))}
                      {(actionItems?.preordersCount || 0) > 3 && (
                        <p className="text-xs text-purple-600 dark:text-purple-400 flex items-center gap-1">
                          +{(actionItems?.preordersCount || 0) - 3} {t('common:more')} <ArrowRight className="h-3 w-3" />
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 dark:text-gray-400">{t('common:noPreordersWaiting')}</p>
                  )}
                </CardContent>
              </Card>
            </Link>

            {/* Open Tickets */}
            <Link href="/tickets">
              <Card className={`cursor-pointer hover:shadow-lg transition-shadow h-full ${(actionItems?.openTicketsCount || 0) > 0 ? 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'}`} data-testid="card-tickets-action">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400 flex items-center gap-2">
                      <Ticket className="h-4 w-4" />
                      {t('common:openTickets')}
                    </CardTitle>
                    <Badge variant={actionItems?.openTicketsCount ? 'destructive' : 'outline'}>
                      {actionItems?.openTicketsCount || 0}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  {actionItems?.ticketsBySeverity && (actionItems.ticketsBySeverity.urgent > 0 || actionItems.ticketsBySeverity.high > 0) ? (
                    <div className="space-y-1">
                      {actionItems.ticketsBySeverity.urgent > 0 && (
                        <div className="flex items-center gap-2 text-sm">
                          <Badge variant="destructive" className="text-[10px] px-1.5 py-0">{t('common:urgent')}</Badge>
                          <span className="font-bold text-red-600 dark:text-red-400">{actionItems.ticketsBySeverity.urgent}</span>
                        </div>
                      )}
                      {actionItems.ticketsBySeverity.high > 0 && (
                        <div className="flex items-center gap-2 text-sm">
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-orange-500 text-orange-500">{t('common:high')}</Badge>
                          <span className="font-medium text-orange-600 dark:text-orange-400">{actionItems.ticketsBySeverity.high}</span>
                        </div>
                      )}
                      {actionItems?.openTickets?.slice(0, 2).map((ticket) => (
                        <div key={ticket.id} className="text-xs text-gray-600 dark:text-gray-400 truncate border-l-2 border-red-400 pl-2">
                          {ticket.subject}
                        </div>
                      ))}
                    </div>
                  ) : actionItems?.openTicketsCount ? (
                    <div className="space-y-1">
                      {actionItems?.openTickets?.slice(0, 3).map((ticket) => (
                        <div key={ticket.id} className="text-xs text-gray-600 dark:text-gray-400 truncate border-l-2 border-gray-300 dark:border-gray-600 pl-2">
                          {ticket.subject}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 dark:text-gray-400">{t('common:noOpenTickets')}</p>
                  )}
                </CardContent>
              </Card>
            </Link>

            {/* Active Discounts */}
            <Link href="/discounts">
              <Card className={`cursor-pointer hover:shadow-lg transition-shadow h-full ${(actionItems?.activeDiscountsCount || 0) > 0 ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'}`} data-testid="card-discounts-action">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400 flex items-center gap-2">
                      <Tag className="h-4 w-4" />
                      {t('common:activeDiscounts')}
                    </CardTitle>
                    <Badge variant={actionItems?.activeDiscountsCount ? 'default' : 'outline'} className={actionItems?.activeDiscountsCount ? 'bg-green-600' : ''}>
                      {actionItems?.activeDiscountsCount || 0}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  {actionItems?.activeDiscounts?.length ? (
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {actionItems.activeDiscounts.slice(0, 3).map((discount) => (
                        <div key={discount.id} className="text-sm border-l-2 border-green-400 pl-2">
                          <p className="font-medium text-gray-900 dark:text-gray-100 truncate">{discount.name}</p>
                          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                            {discount.percentage ? (
                              <>
                                <Percent className="h-3 w-3" />
                                <span>{discount.percentage}%</span>
                              </>
                            ) : discount.value ? (
                              <span>{formatCurrency(parseFloat(discount.value), 'EUR')}</span>
                            ) : discount.type ? (
                              <Badge variant="outline" className="text-[10px] px-1 py-0">{discount.type}</Badge>
                            ) : null}
                            {discount.endDate && (
                              <span className="text-orange-500">→ {new Date(discount.endDate).toLocaleDateString()}</span>
                            )}
                          </div>
                        </div>
                      ))}
                      {(actionItems?.activeDiscountsCount || 0) > 3 && (
                        <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                          +{(actionItems?.activeDiscountsCount || 0) - 3} {t('common:more')} <ArrowRight className="h-3 w-3" />
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 dark:text-gray-400">{t('common:noActiveDiscounts')}</p>
                  )}
                </CardContent>
              </Card>
            </Link>

            {/* Incoming Shipments */}
            <Link href="/receiving">
              <Card className={`cursor-pointer hover:shadow-lg transition-shadow h-full ${(actionItems?.incomingShipmentsCount || 0) > 0 ? 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'}`} data-testid="card-shipments-action">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400 flex items-center gap-2">
                      <Ship className="h-4 w-4" />
                      {t('common:incomingShipments')}
                    </CardTitle>
                    <Badge variant={actionItems?.incomingShipmentsCount ? 'default' : 'outline'} className={actionItems?.incomingShipmentsCount ? 'bg-blue-600' : ''}>
                      {actionItems?.incomingShipmentsCount || 0}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  {actionItems?.incomingShipments?.length ? (
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {actionItems.incomingShipments.slice(0, 3).map((shipment) => (
                        <div key={shipment.id} className="text-sm border-l-2 border-blue-400 pl-2">
                          <p className="font-medium text-gray-900 dark:text-gray-100 truncate">
                            {shipment.shipmentName || shipment.trackingNumber}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                            <Badge variant="outline" className="text-[10px] px-1 py-0">
                              {shipment.status === 'pending' ? t('common:pending') : t('common:inTransit')}
                            </Badge>
                            {shipment.estimatedDelivery && (
                              <span>ETA: {new Date(shipment.estimatedDelivery).toLocaleDateString()}</span>
                            )}
                          </div>
                        </div>
                      ))}
                      {(actionItems?.incomingShipmentsCount || 0) > 3 && (
                        <p className="text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1">
                          +{(actionItems?.incomingShipmentsCount || 0) - 3} {t('common:more')} <ArrowRight className="h-3 w-3" />
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 dark:text-gray-400">{t('common:noIncomingShipments')}</p>
                  )}
                </CardContent>
              </Card>
            </Link>
          </div>
        )}
      </section>

      <Separator className="bg-slate-200 dark:bg-slate-700" />

      {/* Section 2: Financial Control */}
      <section>
        <div className="mb-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2" data-testid="heading-financial-control">
            <Euro className="h-5 w-5" />
            {t('common:financialControl')}
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">{t('common:revenueProfitCashFlowMetrics')}</p>
        </div>

        {financialLoading && !financialControl ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {[...Array(4)].map((_, i) => <MetricCardSkeleton key={i} />)}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4">
              {/* Total Revenue */}
              <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400" data-testid="label-total-revenue">{t('common:totalRevenue')}</p>
                    <Euro className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100" data-testid="value-total-revenue">
                    {formatCurrency(financialControl?.totalRevenueEur || 0, 'EUR')}
                  </p>
                  {financialControl?.cashConversionByCurrency.EUR && (
                    <div className="flex items-center gap-1 mt-2">
                      {financialControl.cashConversionByCurrency.EUR.trend >= 0 ? (
                        <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-400" />
                      )}
                      <span className={`text-xs ${financialControl.cashConversionByCurrency.EUR.trend >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        {Math.abs(financialControl.cashConversionByCurrency.EUR.trend).toFixed(1)}{t('common:vsLastMonth')}
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Net Profit */}
              <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400" data-testid="label-net-profit">{t('common:netProfit')}</p>
                    <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100" data-testid="value-net-profit">
                    {formatCurrency(financialControl?.netProfit || 0, 'EUR')}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                    {t('common:margin')}: <span className="font-semibold text-green-600 dark:text-green-400" data-testid="value-profit-margin">{financialControl?.profitMarginPercent.toFixed(1)}%</span>
                  </p>
                </CardContent>
              </Card>

              {/* Average Order Value */}
              <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400" data-testid="label-average-order-value">{t('common:avgOrderValue')}</p>
                    <DollarSign className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100" data-testid="value-average-order-value">
                    {formatCurrency(financialControl?.averageOrderValue || 0, 'EUR')}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">{t('perTransaction')}</p>
                </CardContent>
              </Card>

              {/* Aged Receivables */}
              <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400" data-testid="label-aged-receivables">{t('agedReceivables')}</p>
                    <AlertCircle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-600 dark:text-gray-400">30-60d:</span>
                      <span className="font-semibold text-gray-900 dark:text-gray-100" data-testid="value-receivables-30-60">
                        {formatCurrency(financialControl?.agedReceivables['30-60days'] || 0, 'EUR')}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-600 dark:text-gray-400">60-90d:</span>
                      <span className="font-semibold text-orange-600 dark:text-orange-400" data-testid="value-receivables-60-90">
                        {formatCurrency(financialControl?.agedReceivables['60-90days'] || 0, 'EUR')}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-600 dark:text-gray-400">90+ days:</span>
                      <span className="font-semibold text-red-600 dark:text-red-400" data-testid="value-receivables-90-plus">
                        {formatCurrency(financialControl?.agedReceivables['90plus'] || 0, 'EUR')}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Currency Breakdown */}
            <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
              <CardHeader>
                <CardTitle className="text-lg text-gray-900 dark:text-gray-100" data-testid="heading-currency-breakdown">{t('currencyDistribution')}</CardTitle>
                <CardDescription className="text-gray-600 dark:text-gray-400">{t('thisMonthVsLastMonth')}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {Object.entries(financialControl?.cashConversionByCurrency || {}).map(([currency, data]) => (
                    <div key={currency} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-gray-900 dark:text-gray-100" data-testid={`label-currency-${currency.toLowerCase()}`}>{currency}</span>
                        <Badge variant={data.trend >= 0 ? 'default' : 'destructive'} className="text-xs">
                          {data.trend >= 0 ? '+' : ''}{data.trend.toFixed(1)}%
                        </Badge>
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {t('current')}: <span className="font-semibold text-gray-900 dark:text-gray-100" data-testid={`value-currency-current-${currency.toLowerCase()}`}>{data.current.toFixed(0)}</span>
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {t('previous')}: <span className="font-semibold text-gray-900 dark:text-gray-100" data-testid={`value-currency-previous-${currency.toLowerCase()}`}>{data.previous.toFixed(0)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </section>

      <Separator className="bg-slate-200 dark:bg-slate-700" />

      {/* Section 3: Inventory Risk */}
      <section>
        <div className="mb-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2" data-testid="heading-inventory-risk">
            <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            {t('inventoryRiskAlerts')}
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">{t('stockIssuesRequiringAttention')}</p>
        </div>

        {inventoryLoading && !inventoryRisk ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => <MetricCardSkeleton key={i} />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {/* Low Stock Products */}
            <Link href="/inventory?lowStock=true">
              <Card className={`cursor-pointer hover:shadow-lg transition-shadow ${(inventoryRisk?.lowStockCount || 0) > 0 ? 'bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'}`} data-testid="card-low-stock">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className={`h-5 w-5 ${(inventoryRisk?.lowStockCount || 0) > 0 ? 'text-orange-600 dark:text-orange-400' : 'text-gray-600 dark:text-gray-400'}`} />
                        <p className="font-semibold text-gray-900 dark:text-gray-100" data-testid="label-low-stock">{t('lowStockProducts')}</p>
                      </div>
                      <p className="text-3xl font-bold mt-2 text-gray-900 dark:text-gray-100" data-testid="value-low-stock">{inventoryRisk?.lowStockCount || 0}</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 flex items-center gap-1">
                        {t('viewAll')} <ArrowRight className="h-3 w-3" />
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>

            {/* Over-Allocated SKUs */}
            <Link href="/inventory">
              <Card className={`cursor-pointer hover:shadow-lg transition-shadow ${(inventoryRisk?.overAllocatedSKUs || 0) > 0 ? 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'}`} data-testid="card-over-allocated">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <AlertCircle className={`h-5 w-5 ${(inventoryRisk?.overAllocatedSKUs || 0) > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-gray-400'}`} />
                        <p className="font-semibold text-gray-900 dark:text-gray-100" data-testid="label-over-allocated">{t('overAllocatedSkus')}</p>
                      </div>
                      <p className="text-3xl font-bold mt-2 text-gray-900 dark:text-gray-100" data-testid="value-over-allocated">{inventoryRisk?.overAllocatedSKUs || 0}</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 flex items-center gap-1">
                        {t('reconcile')} <ArrowRight className="h-3 w-3" />
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>

            {/* Aging Inventory */}
            <Link href="/products">
              <Card className={`cursor-pointer hover:shadow-lg transition-shadow ${(inventoryRisk?.agingInventoryCount || 0) > 0 ? 'bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-800' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'}`} data-testid="card-aging-inventory">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className={`h-5 w-5 ${(inventoryRisk?.agingInventoryCount || 0) > 0 ? 'text-yellow-600 dark:text-yellow-400' : 'text-gray-600 dark:text-gray-400'}`} />
                        <p className="font-semibold text-gray-900 dark:text-gray-100" data-testid="label-aging-inventory">{t('agingInventory')}</p>
                      </div>
                      <p className="text-3xl font-bold mt-2 text-gray-900 dark:text-gray-100" data-testid="value-aging-inventory">{inventoryRisk?.agingInventoryCount || 0}</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{t('ninetyDaysNoMovement')}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>

            {/* Inbound Backlog */}
            <Link href="/receiving">
              <Card className={`cursor-pointer hover:shadow-lg transition-shadow ${(inventoryRisk?.inboundBacklog || 0) > 0 ? 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'}`} data-testid="card-inbound-backlog">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Package className={`h-5 w-5 ${(inventoryRisk?.inboundBacklog || 0) > 0 ? 'text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400'}`} />
                        <p className="font-semibold text-gray-900 dark:text-gray-100" data-testid="label-inbound-backlog">{t('inboundBacklog')}</p>
                      </div>
                      <p className="text-3xl font-bold mt-2 text-gray-900 dark:text-gray-100" data-testid="value-inbound-backlog">{inventoryRisk?.inboundBacklog || 0}</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 flex items-center gap-1">
                        {t('processReceipts')} <ArrowRight className="h-3 w-3" />
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>

            {/* Supplier Delays */}
            <Link href="/imports">
              <Card className={`cursor-pointer hover:shadow-lg transition-shadow ${(inventoryRisk?.supplierDelayAlerts || 0) > 0 ? 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'}`} data-testid="card-supplier-delays">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Truck className={`h-5 w-5 ${(inventoryRisk?.supplierDelayAlerts || 0) > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-gray-400'}`} />
                        <p className="font-semibold text-gray-900 dark:text-gray-100" data-testid="label-supplier-delays">{t('supplierDelays')}</p>
                      </div>
                      <p className="text-3xl font-bold mt-2 text-gray-900 dark:text-gray-100" data-testid="value-supplier-delays">{inventoryRisk?.supplierDelayAlerts || 0}</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 flex items-center gap-1">
                        {t('reviewShipments')} <ArrowRight className="h-3 w-3" />
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>
        )}
      </section>

      <Separator className="bg-slate-200 dark:bg-slate-700" />

      {/* Section 4: Fulfillment Efficiency & Section 5: Customer & Support */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Section 4: Fulfillment Efficiency */}
        <section>
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2" data-testid="heading-fulfillment-efficiency">
              <Target className="h-5 w-5" />
              {t('fulfillmentEfficiency')}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">{t('pickPackPerformanceMetrics')}</p>
          </div>

          {fulfillmentLoading && !fulfillmentEfficiency ? (
            <div className="space-y-4">
              <MetricCardSkeleton />
              <MetricCardSkeleton />
              <MetricCardSkeleton />
            </div>
          ) : (
            <div className="space-y-4">
              {/* Pick Errors */}
              <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400" data-testid="label-pick-errors">{t('pickErrorsThisMonth')}</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1" data-testid="value-pick-errors">
                        {fulfillmentEfficiency?.pickErrorsCount || 0}
                      </p>
                    </div>
                    <AlertCircle className="h-8 w-8 text-orange-600 dark:text-orange-400" />
                  </div>
                </CardContent>
              </Card>

              {/* AI Adoption Rate */}
              <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                <CardContent className="p-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400" data-testid="label-ai-adoption">{t('aiCartonRecommendations')}</p>
                      <Badge variant="default" className="text-xs">{fulfillmentEfficiency?.aiAdoptionRatePercent.toFixed(1)}%</Badge>
                    </div>
                    <Progress value={fulfillmentEfficiency?.aiAdoptionRatePercent || 0} className="h-2" data-testid="progress-ai-adoption" />
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      {fulfillmentEfficiency?.aiCartonRecommendationsUsed || 0} {t('ordersUsedAiSuggestions')}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Carrier OTD */}
              <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                <CardContent className="p-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400" data-testid="label-carrier-otd">{t('carrierOnTimeDelivery')}</p>
                      <Badge variant={fulfillmentEfficiency && fulfillmentEfficiency.carrierOnTimeRatePercent >= 90 ? 'default' : 'destructive'} className="text-xs">
                        {fulfillmentEfficiency?.carrierOnTimeRatePercent.toFixed(1)}%
                      </Badge>
                    </div>
                    <Progress value={fulfillmentEfficiency?.carrierOnTimeRatePercent || 0} className="h-2" data-testid="progress-carrier-otd" />
                    <p className="text-xs text-gray-600 dark:text-gray-400">{t('targetDeliveryRate')}</p>
                  </div>
                </CardContent>
              </Card>

              {/* Order Stage Distribution */}
              <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                <CardHeader>
                  <CardTitle className="text-sm text-gray-900 dark:text-gray-100" data-testid="heading-order-stages">{t('orderStageDistribution')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {fulfillmentEfficiency && Object.entries(fulfillmentEfficiency.ordersByStage).map(([stage, count]) => (
                    <div key={stage} className="flex items-center justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400 capitalize" data-testid={`label-stage-${stage}`}>{stage.replace('_', ' ')}</span>
                      <Badge variant="outline" data-testid={`value-stage-${stage}`}>{count}</Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          )}
        </section>

        {/* Section 5: Customer & Support */}
        <section>
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2" data-testid="heading-customer-support">
              <Users className="h-5 w-5" />
              {t('customerAndSupport')}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">{t('customerMetricsAndTickets')}</p>
          </div>

          {customerLoading && !customerSupport ? (
            <div className="space-y-4">
              <MetricCardSkeleton />
              <MetricCardSkeleton />
              <MetricCardSkeleton />
            </div>
          ) : (
            <div className="space-y-4">
              {/* Top Customers */}
              <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                <CardHeader>
                  <CardTitle className="text-sm text-gray-900 dark:text-gray-100" data-testid="heading-top-customers">{t('topCustomersThisMonth')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {customerSupport?.top10CustomersByRevenue.slice(0, 5).map((customer, index) => (
                    <div key={customer.customerId} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500 dark:text-gray-400">#{index + 1}</span>
                        <span className="font-medium text-gray-900 dark:text-gray-100" data-testid={`customer-name-${index}`}>{customer.name}</span>
                      </div>
                      <span className="font-semibold text-gray-900 dark:text-gray-100" data-testid={`customer-revenue-${index}`}>
                        {formatCurrency(customer.revenue, 'EUR')}
                      </span>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Support Tickets */}
              <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm text-gray-900 dark:text-gray-100" data-testid="heading-support-tickets">{t('activeSupportTickets')}</CardTitle>
                    <Badge variant="outline" data-testid="value-total-tickets">{customerSupport?.totalActiveTickets || 0}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">{t('low')}</span>
                    <Badge variant="outline" className="bg-blue-50 dark:bg-blue-950/20" data-testid="value-tickets-low">
                      {customerSupport?.activeSupportTickets.low || 0}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">{t('medium')}</span>
                    <Badge variant="outline" className="bg-yellow-50 dark:bg-yellow-950/20" data-testid="value-tickets-medium">
                      {customerSupport?.activeSupportTickets.medium || 0}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">{t('high')}</span>
                    <Badge variant="warning" data-testid="value-tickets-high">
                      {customerSupport?.activeSupportTickets.high || 0}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">{t('urgent')}</span>
                    <Badge variant="destructive" data-testid="value-tickets-urgent">
                      {customerSupport?.activeSupportTickets.urgent || 0}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              {/* COD Status */}
              <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm text-gray-900 dark:text-gray-100 flex items-center gap-2" data-testid="heading-cod-status">
                      <CreditCard className="h-4 w-4" />
                      {t('codCollectionStatus')}
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">{t('pending')}</span>
                    <Badge variant="outline" className="bg-yellow-50 dark:bg-yellow-950/20" data-testid="value-cod-pending">
                      {customerSupport?.codPaymentStatus.pending || 0}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">{t('paid')}</span>
                    <Badge variant="default" className="bg-green-600 dark:bg-green-700" data-testid="value-cod-paid">
                      {customerSupport?.codPaymentStatus.paid || 0}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">{t('failed')}</span>
                    <Badge variant="destructive" data-testid="value-cod-failed">
                      {customerSupport?.codPaymentStatus.failed || 0}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Retention Rate */}
              <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400" data-testid="label-retention-rate">{t('customerRetentionRate')}</p>
                      <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-1" data-testid="value-retention-rate">
                        {customerSupport?.retentionRatePercent.toFixed(1)}%
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{t('ninetyDayCohort')}</p>
                    </div>
                    <Users className="h-8 w-8 text-purple-600 dark:text-purple-400" />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </section>
      </div>

      <Separator className="bg-slate-200 dark:bg-slate-700" />

      {/* Section 6: System & Alerts */}
      <section>
        <div className="mb-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2" data-testid="heading-system-alerts">
            <Bell className="h-5 w-5 text-red-600 dark:text-red-400" />
            {t('systemAlertsAndActivity')}
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">{t('criticalAlertsAndActivities')}</p>
        </div>

        {alertsLoading && !systemAlerts ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <MetricCardSkeleton />
            <MetricCardSkeleton />
            <MetricCardSkeleton />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Recent Major Activities - Admin Only */}
            {isAdmin && majorNotifications && majorNotifications.length > 0 && (
              <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 lg:col-span-3">
                <CardHeader>
                  <CardTitle className="text-sm text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    <Activity className="h-4 w-4" />
                    {t('recentMajorActivities')}
                  </CardTitle>
                  <CardDescription className="text-xs text-gray-600 dark:text-gray-400">
                    {t('majorActivitiesFromAllUsers')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-80 overflow-y-auto">
                    {majorNotifications.map((notif: any) => {
                      const getNotificationIcon = (type: string) => {
                        switch (type) {
                          case 'order_created':
                          case 'order_shipped':
                            return <ShoppingCart className="h-5 w-5 text-blue-600 dark:text-blue-400" />;
                          case 'shipment_arrived':
                            return <Package className="h-5 w-5 text-green-600 dark:text-green-400" />;
                          case 'inventory_alert':
                            return <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />;
                          case 'receipt_approved':
                            return <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />;
                          default:
                            return <Bell className="h-5 w-5 text-gray-600 dark:text-gray-400" />;
                        }
                      };

                      return (
                        <div 
                          key={notif.id} 
                          className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                        >
                          <div className="flex-shrink-0 mt-0.5">
                            {getNotificationIcon(notif.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                              {notif.title}
                            </p>
                            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                              {notif.description}
                            </p>
                            <div className="flex items-center gap-3 mt-2 text-xs text-gray-500 dark:text-gray-400">
                              {notif.userName && (
                                <span className="flex items-center gap-1">
                                  <Users className="h-3 w-3" />
                                  {notif.userName}
                                </span>
                              )}
                              <span>
                                {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true })}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Returns Spike Alert */}
            <Card className={`${systemAlerts?.returnsSpike.isAlert ? 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'}`}>
              <CardHeader>
                <CardTitle className="text-sm text-gray-900 dark:text-gray-100 flex items-center gap-2" data-testid="heading-returns-spike">
                  <AlertCircle className={`h-4 w-4 ${systemAlerts?.returnsSpike.isAlert ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-gray-400'}`} />
                  {t('returnsSpikeDetection')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">{t('thisWeek')}</span>
                  <Badge variant={systemAlerts?.returnsSpike.isAlert ? 'destructive' : 'outline'} data-testid="value-returns-this-week">
                    {systemAlerts?.returnsSpike.thisWeek || 0}
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">{t('lastWeek')}</span>
                  <Badge variant="outline" data-testid="value-returns-last-week">{systemAlerts?.returnsSpike.lastWeek || 0}</Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">{t('trend')}</span>
                  <span className={`font-semibold ${systemAlerts?.returnsSpike.spikePercent && systemAlerts.returnsSpike.spikePercent > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`} data-testid="value-returns-trend">
                    {(systemAlerts?.returnsSpike.spikePercent ?? 0) >= 0 ? '+' : ''}{(systemAlerts?.returnsSpike.spikePercent ?? 0).toFixed(1)}%
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Integration Health */}
            <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
              <CardHeader>
                <CardTitle className="text-sm text-gray-900 dark:text-gray-100 flex items-center gap-2" data-testid="heading-integration-health">
                  <Activity className="h-4 w-4" />
                  {t('integrationHealth')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">{t('orderProcessing')}</span>
                  <Badge variant={systemAlerts?.integrationHealth.orderProcessing === 'healthy' ? 'default' : 'warning'} data-testid="value-order-processing-status">
                    {systemAlerts?.integrationHealth.orderProcessing === 'healthy' ? t('healthy') : t('unknown')}
                  </Badge>
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  {t('recentOrders')}: <span className="font-semibold text-gray-900 dark:text-gray-100" data-testid="value-recent-order-count">{systemAlerts?.integrationHealth.recentOrderCount || 0}</span>
                </div>
              </CardContent>
            </Card>

            {/* Recent Audit Log */}
            <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
              <CardHeader>
                <CardTitle className="text-sm text-gray-900 dark:text-gray-100 flex items-center gap-2" data-testid="heading-recent-audit">
                  <Info className="h-4 w-4" />
                  {t('recentActivityFeed')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {systemAlerts?.recentAuditHighlights.slice(0, 5).map((activity) => (
                    <div key={activity.id} className="text-xs text-gray-600 dark:text-gray-400 pb-2 border-b border-slate-200 dark:border-slate-700 last:border-0" data-testid={`audit-item-${activity.id}`}>
                      {activity.description}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </section>

      <Separator className="bg-slate-200 dark:bg-slate-700" />

      {/* Inventory Health Section */}
      <section>
        <div className="mb-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2" data-testid="heading-inventory-health">
            <Layers className="h-5 w-5 text-blue-500" />
            {t('inventoryHealth')}
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">{t('inventoryHealthDescription')}</p>
        </div>

        {inventoryHealthLoading && !inventoryHealth ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <MetricCardSkeleton key={i} />)}
          </div>
        ) : (
          <>
            {/* Turnover Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {/* Inventory Turnover */}
              <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700" data-testid="card-inventory-turnover">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{t('inventoryTurnover')}</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-gray-100" data-testid="value-turnover">
                        {inventoryHealth?.turnover.annualizedTurnover.toFixed(1) || 0}x
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t('annualized')}</p>
                    </div>
                    <div className="h-12 w-12 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                      <RefreshCw className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Days of Supply */}
              <Card className={`${(inventoryHealth?.turnover.daysOfSupply || 0) < 30 ? 'bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-800' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'}`} data-testid="card-days-supply">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{t('daysOfSupply')}</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-gray-100" data-testid="value-days-supply">
                        {inventoryHealth?.turnover.daysOfSupply === 999 ? '∞' : inventoryHealth?.turnover.daysOfSupply || 0}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t('currentStock')}</p>
                    </div>
                    <div className={`h-12 w-12 rounded-lg flex items-center justify-center ${(inventoryHealth?.turnover.daysOfSupply || 0) < 30 ? 'bg-yellow-100 dark:bg-yellow-900/30' : 'bg-green-100 dark:bg-green-900/30'}`}>
                      <Clock className={`h-6 w-6 ${(inventoryHealth?.turnover.daysOfSupply || 0) < 30 ? 'text-yellow-600 dark:text-yellow-400' : 'text-green-600 dark:text-green-400'}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Sell-Through Rate */}
              <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700" data-testid="card-sell-through">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{t('sellThroughRate')}</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-gray-100" data-testid="value-sell-through">
                        {inventoryHealth?.turnover.sellThroughRate30Days.toFixed(1) || 0}%
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t('last30Days')}</p>
                    </div>
                    <div className="h-12 w-12 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                      <Percent className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Inventory Value */}
              <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700" data-testid="card-inventory-value">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{t('totalInventoryValue')}</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-gray-100" data-testid="value-inventory-value">
                        {formatCurrency(inventoryHealth?.summary.totalInventoryValue || 0)}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{inventoryHealth?.summary.totalUnits || 0} {t('units')}</p>
                    </div>
                    <div className="h-12 w-12 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                      <Package className="h-6 w-6 text-green-600 dark:text-green-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Stock Health Distribution & Reorder Alerts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Stock Health Distribution */}
              <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                <CardHeader>
                  <CardTitle className="text-sm text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    {t('stockHealthDistribution')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      {t('healthy')}
                    </span>
                    <Badge variant="outline" className="text-green-600 dark:text-green-400" data-testid="value-healthy-stock">
                      {inventoryHealth?.stockHealthDistribution.healthy || 0}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
                      <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                      {t('lowStock')}
                    </span>
                    <Badge variant="outline" className="text-yellow-600 dark:text-yellow-400" data-testid="value-low-stock">
                      {inventoryHealth?.stockHealthDistribution.lowStock || 0}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
                      <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                      {t('outOfStock')}
                    </span>
                    <Badge variant="outline" className="text-red-600 dark:text-red-400" data-testid="value-out-of-stock">
                      {inventoryHealth?.stockHealthDistribution.outOfStock || 0}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
                      <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                      {t('overstocked')}
                    </span>
                    <Badge variant="outline" className="text-purple-600 dark:text-purple-400" data-testid="value-overstocked">
                      {inventoryHealth?.stockHealthDistribution.overstocked || 0}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
                      <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                      {t('slowMoving')}
                    </span>
                    <Badge variant="outline" className="text-gray-600 dark:text-gray-400" data-testid="value-slow-moving">
                      {inventoryHealth?.stockHealthDistribution.slowMoving || 0}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Reorder Alerts */}
              <Card className={`${(inventoryHealth?.reorderAlerts?.length || 0) > 0 ? 'bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'}`}>
                <CardHeader>
                  <CardTitle className="text-sm text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    <AlertTriangle className={`h-4 w-4 ${(inventoryHealth?.reorderAlerts?.length || 0) > 0 ? 'text-orange-500' : 'text-gray-500'}`} />
                    {t('reorderAlerts')}
                  </CardTitle>
                  <CardDescription>{t('productsNeedingReorder')}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {inventoryHealth?.reorderAlerts.slice(0, 8).map((product, index) => (
                      <Link key={product.id} href={`/products/${product.id}`}>
                        <div className="flex items-center justify-between text-sm py-1 border-b border-slate-100 dark:border-slate-700 last:border-0 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded px-1" data-testid={`reorder-alert-${index}`}>
                          <div className="flex items-center gap-2">
                            <Badge variant={product.outOfStock ? 'destructive' : 'warning'} className="text-xs">
                              {product.outOfStock ? t('outOfStock') : `${product.coverageDays}d`}
                            </Badge>
                            <span className="text-gray-900 dark:text-gray-100 truncate max-w-[150px]">{product.name}</span>
                          </div>
                          <span className="text-gray-500 dark:text-gray-400 text-xs">{product.quantity} {t('inStock')}</span>
                        </div>
                      </Link>
                    ))}
                    {(!inventoryHealth?.reorderAlerts || inventoryHealth.reorderAlerts.length === 0) && (
                      <div className="text-center py-4">
                        <CheckCircle2 className="h-8 w-8 text-green-500 mx-auto mb-2" />
                        <p className="text-sm text-green-600 dark:text-green-400">{t('allProductsWellStocked')}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </section>

    </div>
  );
}
