import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { ReportHeader } from "@/components/reports/ReportHeader";
import { MetricCard } from "@/components/reports/MetricCard";
import { TrendLineChart } from "@/components/reports/TrendLineChart";
import { PieChartCard } from "@/components/reports/PieChartCard";
import { BarChartCard } from "@/components/reports/BarChartCard";
import { MonthlyComparisonTable } from "@/components/reports/MonthlyComparisonTable";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  Coins, TrendingUp, TrendingDown, PiggyBank, Percent, 
  ArrowUpRight, ArrowDownRight, Calculator, Target, 
  BarChart3, DollarSign, Receipt, Wallet, LineChart
} from "lucide-react";
import { aggregateMonthlyRevenue, convertToBaseCurrency, preparePieChartData } from "@/lib/reportUtils";
import { formatCurrency, formatCompactNumber } from "@/lib/currencyUtils";
import { exportToXLSX, exportToPDF, PDFColumn } from "@/lib/exportUtils";
import { useToast } from "@/hooks/use-toast";
import { 
  format, subMonths, subYears, startOfMonth, endOfMonth, 
  startOfYear, endOfYear, eachMonthOfInterval, subWeeks, 
  startOfWeek, endOfWeek 
} from "date-fns";

interface PeriodMetrics {
  revenue: number;
  profit: number;
  costs: number;
  margin: number;
  orders: number;
  revenueGrowth: number;
  profitGrowth: number;
}

export default function FinancialReports() {
  const { t } = useTranslation('reports');
  const { t: tCommon } = useTranslation('common');
  const { t: tFinancial } = useTranslation('financial');
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("overview");

  const { data: orders = [], isLoading: ordersLoading } = useQuery({ queryKey: ['/api/orders'] });
  const { data: products = [], isLoading: productsLoading } = useQuery({ queryKey: ['/api/products'] });
  const { data: orderItems = [], isLoading: itemsLoading } = useQuery({
    queryKey: ['/api/order-items/all'],
    queryFn: async () => {
      const response = await fetch('/api/order-items/all', { credentials: 'include' });
      if (!response.ok) return [];
      return response.json();
    },
  });
  const { data: expenses = [], isLoading: expensesLoading } = useQuery({ queryKey: ['/api/expenses'] });

  const isLoading = ordersLoading || productsLoading || itemsLoading || expensesLoading;
  const now = useMemo(() => new Date(), []);

  const calculatePeriodMetrics = (
    startDate: Date, 
    endDate: Date, 
    prevStartDate: Date, 
    prevEndDate: Date
  ): PeriodMetrics => {
    const currentOrders = (orders as any[]).filter((order: any) => {
      const orderDate = new Date(order.createdAt);
      return orderDate >= startDate && orderDate <= endDate;
    });
    const prevOrders = (orders as any[]).filter((order: any) => {
      const orderDate = new Date(order.createdAt);
      return orderDate >= prevStartDate && orderDate <= prevEndDate;
    });

    const currentOrderIds = new Set(currentOrders.map((o: any) => o.id));
    const prevOrderIds = new Set(prevOrders.map((o: any) => o.id));

    const currentItems = (orderItems as any[]).filter((item: any) => currentOrderIds.has(item.orderId));
    const prevItems = (orderItems as any[]).filter((item: any) => prevOrderIds.has(item.orderId));

    const calcRevenue = (periodOrders: any[]) => periodOrders.reduce((sum, order: any) => {
      const revenue = parseFloat(order.grandTotal || '0');
      return sum + convertToBaseCurrency(revenue, order.currency || 'CZK');
    }, 0);

    const calcCosts = (items: any[]) => {
      return items.reduce((sum, item: any) => {
        const product = (products as any[]).find((p: any) => p.id === item.productId);
        if (!product) return sum;
        return sum + (parseFloat(product.importCostCzk || '0') * (item.quantity || 0));
      }, 0);
    };

    const currentExpenses = (expenses as any[]).filter((exp: any) => {
      const expDate = new Date(exp.createdAt || exp.date);
      return expDate >= startDate && expDate <= endDate;
    });
    const prevExpenses = (expenses as any[]).filter((exp: any) => {
      const expDate = new Date(exp.createdAt || exp.date);
      return expDate >= prevStartDate && expDate <= prevEndDate;
    });

    const calcExpenses = (exps: any[]) => exps.reduce((sum, exp: any) => {
      return sum + convertToBaseCurrency(parseFloat(exp.amount || '0'), exp.currency || 'CZK');
    }, 0);

    const currentRevenue = calcRevenue(currentOrders);
    const prevRevenue = calcRevenue(prevOrders);
    const currentProductCosts = calcCosts(currentItems);
    const prevProductCosts = calcCosts(prevItems);
    const currentExpenseCosts = calcExpenses(currentExpenses);
    const currentTotalCosts = currentProductCosts + currentExpenseCosts;
    const prevTotalCosts = prevProductCosts + calcExpenses(prevExpenses);
    const currentProfit = currentRevenue - currentTotalCosts;
    const prevProfit = prevRevenue - prevTotalCosts;

    return {
      revenue: currentRevenue,
      profit: currentProfit,
      costs: currentTotalCosts,
      margin: currentRevenue > 0 ? (currentProfit / currentRevenue) * 100 : 0,
      orders: currentOrders.length,
      revenueGrowth: prevRevenue > 0 ? ((currentRevenue - prevRevenue) / prevRevenue) * 100 : 0,
      profitGrowth: prevProfit > 0 ? ((currentProfit - prevProfit) / prevProfit) * 100 : 0,
    };
  };

  const weekMetrics = useMemo(() => {
    return calculatePeriodMetrics(
      startOfWeek(now, { weekStartsOn: 1 }), endOfWeek(now, { weekStartsOn: 1 }),
      startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 }), endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 })
    );
  }, [orders, orderItems, products, expenses, now]);

  const monthMetrics = useMemo(() => {
    return calculatePeriodMetrics(
      startOfMonth(now), endOfMonth(now),
      startOfMonth(subMonths(now, 1)), endOfMonth(subMonths(now, 1))
    );
  }, [orders, orderItems, products, expenses, now]);

  const yearMetrics = useMemo(() => {
    return calculatePeriodMetrics(
      startOfYear(now), endOfYear(now),
      startOfYear(subYears(now, 1)), endOfYear(subYears(now, 1))
    );
  }, [orders, orderItems, products, expenses, now]);

  const monthlyData = useMemo(() => {
    if (isLoading) return [];
    const last12Months = eachMonthOfInterval({ start: subMonths(now, 11), end: now });
    
    return last12Months.map(monthStart => {
      const monthEnd = endOfMonth(monthStart);
      const monthOrders = (orders as any[]).filter((order: any) => {
        const orderDate = new Date(order.createdAt);
        return orderDate >= monthStart && orderDate <= monthEnd;
      });
      
      const monthOrderIds = new Set(monthOrders.map((o: any) => o.id));
      const monthItems = (orderItems as any[]).filter((item: any) => monthOrderIds.has(item.orderId));
      
      const revenue = monthOrders.reduce((sum, order: any) => {
        return sum + convertToBaseCurrency(parseFloat(order.grandTotal || '0'), order.currency || 'CZK');
      }, 0);
      const costs = monthItems.reduce((sum, item: any) => {
        const product = (products as any[]).find((p: any) => p.id === item.productId);
        if (!product) return sum;
        return sum + (parseFloat(product.importCostCzk || '0') * (item.quantity || 0));
      }, 0);
      
      const monthExpenses = (expenses as any[]).filter((exp: any) => {
        const expDate = new Date(exp.createdAt || exp.date);
        return expDate >= monthStart && expDate <= monthEnd;
      }).reduce((sum, exp: any) => sum + convertToBaseCurrency(parseFloat(exp.amount || '0'), exp.currency || 'CZK'), 0);
      
      const totalCosts = costs + monthExpenses;
      const profit = revenue - totalCosts;
      
      return {
        month: format(monthStart, 'MMM'),
        fullMonth: format(monthStart, 'MMM yyyy'),
        revenue,
        costs: totalCosts,
        profit,
        margin: revenue > 0 ? (profit / revenue) * 100 : 0,
        orders: monthOrders.length,
      };
    });
  }, [orders, orderItems, products, expenses, isLoading, now]);

  const cashFlowData = useMemo(() => {
    return monthlyData.map((m, index) => {
      const cumulative = monthlyData.slice(0, index + 1).reduce((sum, d) => sum + d.profit, 0);
      return {
        ...m,
        netCashFlow: m.profit,
        cumulativeCashFlow: cumulative,
      };
    });
  }, [monthlyData]);

  const financialRatios = useMemo(() => {
    const totalRevenue = yearMetrics.revenue;
    const totalProfit = yearMetrics.profit;
    const totalCosts = yearMetrics.costs;
    const totalOrders = yearMetrics.orders;
    
    return {
      grossMargin: totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0,
      roi: totalCosts > 0 ? (totalProfit / totalCosts) * 100 : 0,
      revenuePerOrder: totalOrders > 0 ? totalRevenue / totalOrders : 0,
      profitPerOrder: totalOrders > 0 ? totalProfit / totalOrders : 0,
      costEfficiency: totalRevenue > 0 ? ((totalRevenue - totalCosts) / totalRevenue) * 100 : 0,
    };
  }, [yearMetrics]);

  const revenueByCurrencyData = useMemo(() => {
    const currencyTotals: { [key: string]: number } = { CZK: 0, EUR: 0, USD: 0 };
    
    (orders as any[]).forEach((order: any) => {
      const revenue = parseFloat(order.grandTotal || '0');
      if (currencyTotals[order.currency] !== undefined) {
        currencyTotals[order.currency] += revenue;
      }
    });
    
    return preparePieChartData(
      Object.entries(currencyTotals)
        .filter(([_, value]) => value > 0)
        .map(([name, value]) => ({ name, value: convertToBaseCurrency(value, name as any) }))
    );
  }, [orders]);

  const costBreakdownData = useMemo(() => {
    let productCosts = 0;
    (orderItems as any[]).forEach((item: any) => {
      const product = (products as any[]).find((p: any) => p.id === item.productId);
      if (product) {
        productCosts += parseFloat(product.importCostCzk || '0') * (item.quantity || 0);
      }
    });

    const expenseCosts = (expenses as any[]).reduce((sum, exp: any) => {
      return sum + convertToBaseCurrency(parseFloat(exp.amount || '0'), exp.currency);
    }, 0);

    return preparePieChartData([
      { name: t('productCosts'), value: productCosts },
      { name: t('expenses'), value: expenseCosts },
    ].filter(d => d.value > 0));
  }, [orderItems, products, expenses, t]);

  const handleExportExcel = () => {
    try {
      const exportData = monthlyData.map(m => ({
        [tCommon('month')]: m.fullMonth,
        [t('revenue')]: m.revenue.toFixed(2),
        [t('totalCost')]: m.costs.toFixed(2),
        [t('totalProfit')]: m.profit.toFixed(2),
        [t('profitMargin')]: `${m.margin.toFixed(1)}%`,
        [tCommon('orders')]: m.orders,
      }));
      exportToXLSX(exportData, `Financial_Report_${format(new Date(), 'yyyy-MM-dd')}`, t('financialReport'));
      toast({ title: t('exportSuccessful'), description: t('financialReportExportedXlsx') });
    } catch (error) {
      toast({ title: t('exportFailed'), description: t('failedToExportFinancialReport'), variant: "destructive" });
    }
  };

  const handleExportPDF = () => {
    try {
      const exportData = monthlyData.map(m => ({
        month: m.fullMonth,
        revenue: formatCurrency(m.revenue, 'CZK'),
        profit: formatCurrency(m.profit, 'CZK'),
        margin: `${m.margin.toFixed(1)}%`,
        orders: m.orders.toString(),
      }));
      const columns: PDFColumn[] = [
        { key: 'month', header: tCommon('month') },
        { key: 'revenue', header: t('totalRevenue') },
        { key: 'profit', header: t('totalProfit') },
        { key: 'margin', header: t('profitMargin') },
        { key: 'orders', header: tCommon('orders') },
      ];
      exportToPDF(exportData, columns, `Financial_Report_${format(new Date(), 'yyyy-MM-dd')}`, t('financialReport'));
      toast({ title: t('exportSuccessful'), description: t('financialReportExportedPdf') });
    } catch (error) {
      toast({ title: t('exportFailed'), description: t('failedToExportFinancialReportPdf'), variant: "destructive" });
    }
  };

  const GrowthIndicator = ({ value }: { value: number }) => {
    const isPositive = value >= 0;
    return (
      <div className={`flex items-center gap-1 text-sm ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
        {isPositive ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
        <span>{Math.abs(value).toFixed(1)}%</span>
      </div>
    );
  };

  const PeriodCard = ({ 
    title, 
    icon: Icon, 
    metrics, 
    iconColor, 
    bgColor 
  }: { 
    title: string; 
    icon: any; 
    metrics: PeriodMetrics; 
    iconColor: string; 
    bgColor: string;
  }) => (
    <Card className="overflow-hidden" data-testid={`period-card-${title.toLowerCase().replace(/\s/g, '-')}`}>
      <CardHeader className={`${bgColor} pb-2`}>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Icon className={`h-4 w-4 ${iconColor}`} />
            {title}
          </CardTitle>
          <GrowthIndicator value={metrics.revenueGrowth} />
        </div>
      </CardHeader>
      <CardContent className="pt-4 space-y-3">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-muted-foreground">{t('revenue')}</p>
            <p className="text-lg font-bold">{formatCompactNumber(metrics.revenue)} Kč</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{t('profit')}</p>
            <p className="text-lg font-bold text-green-600">{formatCompactNumber(metrics.profit)} Kč</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{t('costs')}</p>
            <p className="text-base font-semibold text-red-600">{formatCompactNumber(metrics.costs)} Kč</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{t('margin')}</p>
            <p className="text-base font-semibold">{metrics.margin.toFixed(1)}%</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-48" />)}
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="financial-reports">
      <ReportHeader
        title={t('financialReport')}
        description={t('financialOverviewDesc')}
        onExportExcel={handleExportExcel}
        onExportPDF={handleExportPDF}
        showCurrencyFilter
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-flex">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">{t('overview')}</span>
          </TabsTrigger>
          <TabsTrigger value="profitability" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            <span className="hidden sm:inline">{t('profitability')}</span>
          </TabsTrigger>
          <TabsTrigger value="cashflow" className="flex items-center gap-2">
            <Wallet className="h-4 w-4" />
            <span className="hidden sm:inline">{t('cashFlow')}</span>
          </TabsTrigger>
          <TabsTrigger value="breakdown" className="flex items-center gap-2">
            <Receipt className="h-4 w-4" />
            <span className="hidden sm:inline">{t('breakdown')}</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <PeriodCard title={t('thisWeek')} icon={Coins} metrics={weekMetrics} iconColor="text-blue-600" bgColor="bg-blue-50 dark:bg-blue-950" />
            <PeriodCard title={t('thisMonth')} icon={TrendingUp} metrics={monthMetrics} iconColor="text-green-600" bgColor="bg-green-50 dark:bg-green-950" />
            <PeriodCard title={t('thisYear')} icon={Target} metrics={yearMetrics} iconColor="text-purple-600" bgColor="bg-purple-50 dark:bg-purple-950" />
          </div>

          <Card data-testid="financial-ratios-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                {t('keyFinancialRatios')}
              </CardTitle>
              <CardDescription>{t('keyFinancialRatiosDesc')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="text-center p-4 rounded-lg bg-muted/50">
                  <p className="text-2xl font-bold text-green-600">{financialRatios.grossMargin.toFixed(1)}%</p>
                  <p className="text-sm text-muted-foreground">{t('grossMargin')}</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-muted/50">
                  <p className="text-2xl font-bold text-blue-600">{financialRatios.roi.toFixed(1)}%</p>
                  <p className="text-sm text-muted-foreground">{t('roi')}</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-muted/50">
                  <p className="text-2xl font-bold">{formatCompactNumber(financialRatios.revenuePerOrder)} Kč</p>
                  <p className="text-sm text-muted-foreground">{t('revenuePerOrder')}</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-muted/50">
                  <p className="text-2xl font-bold text-green-600">{formatCompactNumber(financialRatios.profitPerOrder)} Kč</p>
                  <p className="text-sm text-muted-foreground">{t('profitPerOrder')}</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-muted/50">
                  <p className="text-2xl font-bold text-purple-600">{financialRatios.costEfficiency.toFixed(1)}%</p>
                  <p className="text-sm text-muted-foreground">{t('costEfficiency')}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <TrendLineChart
            title={t('revenueProfitTrend')}
            data={monthlyData}
            lines={[
              { dataKey: 'revenue', name: `${t('revenue')} (CZK)`, color: '#3b82f6' },
              { dataKey: 'profit', name: `${t('profit')} (CZK)`, color: '#10b981' },
              { dataKey: 'costs', name: `${t('costs')} (CZK)`, color: '#ef4444' },
            ]}
            formatValue={(value) => formatCurrency(value, 'CZK')}
            testId="chart-revenue-profit-trend"
          />
        </TabsContent>

        <TabsContent value="profitability" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title={t('yearlyRevenue')}
              value={formatCurrency(yearMetrics.revenue, 'CZK')}
              icon={Coins}
              iconColor="text-blue-600"
              iconBgColor="bg-blue-100"
              testId="metric-yearly-revenue"
            />
            <MetricCard
              title={t('yearlyProfit')}
              value={formatCurrency(yearMetrics.profit, 'CZK')}
              icon={TrendingUp}
              iconColor="text-green-600"
              iconBgColor="bg-green-100"
              testId="metric-yearly-profit"
            />
            <MetricCard
              title={t('yearlyCosts')}
              value={formatCurrency(yearMetrics.costs, 'CZK')}
              icon={PiggyBank}
              iconColor="text-red-600"
              iconBgColor="bg-red-100"
              testId="metric-yearly-costs"
            />
            <MetricCard
              title={t('yearlyMargin')}
              value={`${yearMetrics.margin.toFixed(1)}%`}
              icon={Percent}
              iconColor="text-purple-600"
              iconBgColor="bg-purple-100"
              testId="metric-yearly-margin"
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>{t('monthlyProfitMarginAnalysis')}</CardTitle>
              <CardDescription>{t('monthlyProfitMarginDesc')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {monthlyData.slice(-6).map((m) => {
                  const marginColor = m.margin > 25 ? 'bg-green-500' : m.margin > 15 ? 'bg-amber-500' : 'bg-red-500';
                  return (
                    <div key={m.fullMonth} className="flex items-center gap-3">
                      <span className="w-20 text-sm font-medium">{m.month}</span>
                      <div className="flex-1 h-6 bg-muted rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${marginColor} rounded-full transition-all duration-500`}
                          style={{ width: `${Math.min(Math.max(m.margin * 2, 5), 100)}%` }}
                        />
                      </div>
                      <span className="w-16 text-sm text-right font-medium">{m.margin.toFixed(1)}%</span>
                      <span className="w-24 text-sm text-right text-muted-foreground">{formatCompactNumber(m.profit)} Kč</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <BarChartCard
            title={t('monthlyRevenueCostsComparison')}
            data={monthlyData}
            bars={[
              { dataKey: 'revenue', name: t('revenue'), color: '#3b82f6' },
              { dataKey: 'costs', name: t('costs'), color: '#ef4444' },
            ]}
            testId="chart-revenue-costs-comparison"
          />
        </TabsContent>

        <TabsContent value="cashflow" className="space-y-6 mt-6">
          <TrendLineChart
            title={t('cashFlowAnalysis')}
            data={cashFlowData}
            lines={[
              { dataKey: 'netCashFlow', name: t('netCashFlow'), color: '#10b981' },
              { dataKey: 'cumulativeCashFlow', name: t('cumulativeCashFlow'), color: '#3b82f6' },
            ]}
            formatValue={(value) => formatCurrency(value, 'CZK')}
            testId="chart-cash-flow"
          />

          <Card>
            <CardHeader>
              <CardTitle>{t('monthlyCashFlowBreakdown')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('month')}</TableHead>
                      <TableHead className="text-right">{t('revenue')}</TableHead>
                      <TableHead className="text-right">{t('costs')}</TableHead>
                      <TableHead className="text-right">{t('netCashFlow')}</TableHead>
                      <TableHead className="text-right">{t('cumulative')}</TableHead>
                      <TableHead>{t('status')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cashFlowData.slice(-6).reverse().map((m) => (
                      <TableRow key={m.fullMonth}>
                        <TableCell className="font-medium">{m.fullMonth}</TableCell>
                        <TableCell className="text-right">{formatCurrency(m.revenue, 'CZK')}</TableCell>
                        <TableCell className="text-right text-red-600">{formatCurrency(m.costs, 'CZK')}</TableCell>
                        <TableCell className={`text-right font-semibold ${m.netCashFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {m.netCashFlow >= 0 ? '+' : ''}{formatCurrency(m.netCashFlow, 'CZK')}
                        </TableCell>
                        <TableCell className="text-right">{formatCurrency(m.cumulativeCashFlow, 'CZK')}</TableCell>
                        <TableCell>
                          <Badge variant={m.netCashFlow >= 0 ? "default" : "destructive"}>
                            {m.netCashFlow >= 0 ? t('positive') : t('negative')}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="breakdown" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <PieChartCard
              title={t('revenueByCurrency')}
              data={revenueByCurrencyData}
              formatValue={(value) => formatCurrency(value, 'CZK')}
              testId="chart-revenue-by-currency"
            />
            <PieChartCard
              title={t('costStructure')}
              data={costBreakdownData}
              formatValue={(value) => formatCurrency(value, 'CZK')}
              testId="chart-cost-breakdown"
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>{t('monthlyFinancialDetails')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('month')}</TableHead>
                      <TableHead className="text-right">{t('revenue')}</TableHead>
                      <TableHead className="text-right">{t('costs')}</TableHead>
                      <TableHead className="text-right">{t('profit')}</TableHead>
                      <TableHead className="text-right">{t('margin')}</TableHead>
                      <TableHead className="text-right">{t('orders')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[...monthlyData].reverse().map((m) => (
                      <TableRow key={m.fullMonth}>
                        <TableCell className="font-medium">{m.fullMonth}</TableCell>
                        <TableCell className="text-right">{formatCurrency(m.revenue, 'CZK')}</TableCell>
                        <TableCell className="text-right text-red-600">{formatCurrency(m.costs, 'CZK')}</TableCell>
                        <TableCell className="text-right text-green-600">{formatCurrency(m.profit, 'CZK')}</TableCell>
                        <TableCell className="text-right">
                          <Badge variant={m.margin > 20 ? "default" : "secondary"}>{m.margin.toFixed(1)}%</Badge>
                        </TableCell>
                        <TableCell className="text-right">{m.orders}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
