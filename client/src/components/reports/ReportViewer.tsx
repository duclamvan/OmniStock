import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { useLocalization } from "@/contexts/LocalizationContext";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import {
  TrendingUp,
  TrendingDown,
  Package,
  Users,
  ShoppingCart,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  Clock,
  BarChart3,
  Coins,
  Calendar,
  Star,
  ArrowUpRight,
  ArrowDownRight,
  XCircle
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend
} from "recharts";

interface ReportData {
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

interface ReportViewerProps {
  reportData: ReportData;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

function MetricCard({ 
  title, 
  value, 
  icon: Icon, 
  trend,
  trendValue,
  colorClass = "text-blue-600"
}: { 
  title: string; 
  value: string | number; 
  icon: React.ElementType;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  colorClass?: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className={`text-2xl font-bold ${colorClass}`}>{value}</p>
            {trend && trendValue && (
              <div className="flex items-center gap-1 text-xs">
                {trend === 'up' ? (
                  <ArrowUpRight className="h-3 w-3 text-green-500" />
                ) : trend === 'down' ? (
                  <ArrowDownRight className="h-3 w-3 text-red-500" />
                ) : null}
                <span className={trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-muted-foreground'}>
                  {trendValue}
                </span>
              </div>
            )}
          </div>
          <div className={`p-2 rounded-lg bg-opacity-10 ${colorClass.replace('text-', 'bg-')}`}>
            <Icon className={`h-5 w-5 ${colorClass}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function ReportViewer({ reportData }: ReportViewerProps) {
  const { t } = useTranslation('reports');
  const { formatCurrency } = useLocalization();
  
  const { summary, inventory, topProducts, topCustomers, financials } = reportData;
  
  const orderStatusData = [
    { name: t('completed', 'Completed'), value: summary.completedOrders, color: '#10b981' },
    { name: t('pending', 'Pending'), value: summary.pendingOrders, color: '#f59e0b' },
    { name: t('cancelled', 'Cancelled'), value: summary.cancelledOrders, color: '#ef4444' },
  ].filter(item => item.value > 0);
  
  const inventoryHealthData = [
    { name: t('healthy', 'Healthy'), value: inventory.totalProducts - inventory.lowStockProducts - inventory.outOfStockProducts, color: '#10b981' },
    { name: t('lowStock', 'Low Stock'), value: inventory.lowStockProducts, color: '#f59e0b' },
    { name: t('outOfStock', 'Out of Stock'), value: inventory.outOfStockProducts, color: '#ef4444' },
  ].filter(item => item.value > 0);
  
  const topProductsChartData = topProducts.slice(0, 5).map(product => ({
    name: product.name.length > 20 ? product.name.substring(0, 17) + '...' : product.name,
    quantity: product.quantitySold,
    revenue: product.revenue
  }));
  
  const expenseCategories = financials?.expensesByCategory 
    ? Object.entries(financials.expensesByCategory).map(([category, amount], index) => ({
        name: category || 'Uncategorized',
        value: amount,
        color: COLORS[index % COLORS.length]
      }))
    : [];
  
  const completionRate = summary.totalOrders > 0 
    ? Math.round((summary.completedOrders / summary.totalOrders) * 100) 
    : 0;
    
  const profitMargin = summary.totalRevenue > 0 && financials
    ? Math.round((financials.grossProfit / summary.totalRevenue) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Report Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-4 border-b">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-blue-600" />
            {reportData.period}
          </h3>
          <p className="text-sm text-muted-foreground">
            {format(new Date(reportData.startDate), 'MMM d, yyyy')} - {format(new Date(reportData.endDate), 'MMM d, yyyy')}
          </p>
        </div>
        <Badge variant="outline" className="w-fit">
          <Calendar className="h-3 w-3 mr-1" />
          {t('generatedAt', 'Generated')}: {format(new Date(reportData.generatedAt), 'MMM d, yyyy HH:mm')}
        </Badge>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard
          title={t('totalOrders', 'Total Orders')}
          value={summary.totalOrders}
          icon={ShoppingCart}
          colorClass="text-blue-600"
        />
        <MetricCard
          title={t('totalRevenue', 'Revenue')}
          value={formatCurrency(summary.totalRevenue, 'CZK')}
          icon={DollarSign}
          colorClass="text-emerald-600"
        />
        <MetricCard
          title={t('itemsSold', 'Items Sold')}
          value={summary.totalItemsSold}
          icon={Package}
          colorClass="text-purple-600"
        />
        <MetricCard
          title={t('avgOrderValue', 'Avg Order Value')}
          value={formatCurrency(summary.averageOrderValue, 'CZK')}
          icon={TrendingUp}
          colorClass="text-orange-600"
        />
      </div>

      {/* Order Fulfillment & Financial Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Order Status */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              {t('orderFulfillment', 'Order Fulfillment')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{t('completionRate', 'Completion Rate')}</span>
                <span className="font-semibold text-green-600">{completionRate}%</span>
              </div>
              <Progress value={completionRate} className="h-2" />
              <div className="grid grid-cols-3 gap-2 pt-2">
                <div className="text-center p-2 rounded-lg bg-green-50 dark:bg-green-950">
                  <p className="text-lg font-bold text-green-600">{summary.completedOrders}</p>
                  <p className="text-xs text-muted-foreground">{t('completed', 'Completed')}</p>
                </div>
                <div className="text-center p-2 rounded-lg bg-amber-50 dark:bg-amber-950">
                  <p className="text-lg font-bold text-amber-600">{summary.pendingOrders}</p>
                  <p className="text-xs text-muted-foreground">{t('pending', 'Pending')}</p>
                </div>
                <div className="text-center p-2 rounded-lg bg-red-50 dark:bg-red-950">
                  <p className="text-lg font-bold text-red-600">{summary.cancelledOrders}</p>
                  <p className="text-xs text-muted-foreground">{t('cancelled', 'Cancelled')}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Financial Overview */}
        {financials && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Coins className="h-4 w-4 text-emerald-600" />
                {t('financialOverview', 'Financial Overview')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{t('profitMargin', 'Profit Margin')}</span>
                  <span className={`font-semibold ${profitMargin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {profitMargin}%
                  </span>
                </div>
                <Progress value={Math.max(0, Math.min(100, profitMargin))} className="h-2" />
                <div className="grid grid-cols-2 gap-2 pt-2">
                  <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950">
                    <p className="text-sm font-bold text-emerald-600">{formatCurrency(financials.grossProfit, 'CZK')}</p>
                    <p className="text-xs text-muted-foreground">{t('grossProfit', 'Gross Profit')}</p>
                  </div>
                  <div className="p-2 rounded-lg bg-red-50 dark:bg-red-950">
                    <p className="text-sm font-bold text-red-600">{formatCurrency(financials.totalExpenses, 'CZK')}</p>
                    <p className="text-xs text-muted-foreground">{t('expenses', 'Expenses')}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Inventory Health */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Package className="h-4 w-4 text-purple-600" />
            {t('inventoryHealth', 'Inventory Health')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950 text-center">
              <p className="text-xl font-bold text-blue-600">{inventory.totalProducts}</p>
              <p className="text-xs text-muted-foreground">{t('totalProducts', 'Total Products')}</p>
            </div>
            <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950 text-center">
              <p className="text-xl font-bold text-amber-600">{inventory.lowStockProducts}</p>
              <p className="text-xs text-muted-foreground">{t('lowStock', 'Low Stock')}</p>
            </div>
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950 text-center">
              <p className="text-xl font-bold text-red-600">{inventory.outOfStockProducts}</p>
              <p className="text-xs text-muted-foreground">{t('outOfStock', 'Out of Stock')}</p>
            </div>
            <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950 text-center">
              <p className="text-xl font-bold text-green-600">{inventory.itemsReceived}</p>
              <p className="text-xs text-muted-foreground">{t('itemsReceived', 'Items Received')}</p>
            </div>
            <div className="p-3 rounded-lg bg-purple-50 dark:bg-purple-950 text-center">
              <p className="text-xl font-bold text-purple-600">{inventory.stockAdjustments}</p>
              <p className="text-xs text-muted-foreground">{t('adjustments', 'Adjustments')}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Top Products Chart */}
      {topProductsChartData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Star className="h-4 w-4 text-yellow-500" />
              {t('topSellingProducts', 'Top Selling Products')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topProductsChartData} layout="vertical" margin={{ left: 10, right: 30 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" className="text-xs" />
                  <YAxis dataKey="name" type="category" width={100} className="text-xs" tick={{ fontSize: 10 }} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--background))', 
                      border: '1px solid hsl(var(--border))' 
                    }} 
                  />
                  <Bar dataKey="quantity" fill="#3b82f6" name={t('quantitySold', 'Quantity Sold')} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Top Customers */}
      {topCustomers.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4 text-violet-600" />
              {t('topCustomers', 'Top Customers')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {topCustomers.slice(0, 5).map((customer, index) => (
                <div key={customer.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    <Badge variant="secondary" className="w-6 h-6 flex items-center justify-center rounded-full text-xs">
                      {index + 1}
                    </Badge>
                    <div>
                      <p className="font-medium text-sm">{customer.name}</p>
                      <p className="text-xs text-muted-foreground">{customer.orderCount} {t('orders', 'orders')}</p>
                    </div>
                  </div>
                  <p className="font-semibold text-green-600">{formatCurrency(customer.totalSpent, 'CZK')}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Expense Breakdown */}
      {expenseCategories.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-red-500" />
              {t('expenseBreakdown', 'Expense Breakdown')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={expenseCategories}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={70}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    labelLine={false}
                  >
                    {expenseCategories.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number) => formatCurrency(value, 'CZK')}
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--background))', 
                      border: '1px solid hsl(var(--border))' 
                    }} 
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* New Customers */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Users className="h-4 w-4 text-blue-600" />
            {t('customerAcquisition', 'Customer Acquisition')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950 flex-1 text-center">
              <p className="text-3xl font-bold text-blue-600">{summary.newCustomers}</p>
              <p className="text-sm text-muted-foreground">{t('newCustomersThisPeriod', 'New Customers This Period')}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
