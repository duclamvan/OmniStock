import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from 'react-i18next';
import { useReports } from "@/contexts/ReportsContext";
import { ReportHeader } from "@/components/reports/ReportHeader";
import { MetricCard } from "@/components/reports/MetricCard";
import { TrendLineChart } from "@/components/reports/TrendLineChart";
import { PieChartCard } from "@/components/reports/PieChartCard";
import { BarChartCard } from "@/components/reports/BarChartCard";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  ShoppingCart, Truck, XCircle, CheckCircle, Clock, 
  TrendingUp, BarChart3, DollarSign, ArrowUpRight, ArrowDownRight,
  Target, Calendar, CalendarDays
} from "lucide-react";
import { preparePieChartData } from "@/lib/reportUtils";
import { formatCurrency, formatCompactNumber } from "@/lib/currencyUtils";
import { exportToXLSX, exportToPDF, PDFColumn } from "@/lib/exportUtils";
import { useToast } from "@/hooks/use-toast";
import { 
  format, eachMonthOfInterval, startOfMonth, subMonths, 
  differenceInDays, subWeeks, startOfWeek, endOfWeek,
  endOfMonth, eachDayOfInterval, subDays, getDay
} from "date-fns";

export default function OrderReports() {
  const { toast } = useToast();
  const { t } = useTranslation('reports');
  const { t: tCommon } = useTranslation('common');
  const { getDateRangeValues } = useReports();
  const { start: startDate, end: endDate } = getDateRangeValues();
  const [activeTab, setActiveTab] = useState("overview");

  const { data: orders = [], isLoading: ordersLoading } = useQuery({ queryKey: ['/api/orders'] });
  const now = useMemo(() => new Date(), []);

  const filteredOrders = useMemo(() => {
    return (orders as any[]).filter((order: any) => {
      const orderDate = new Date(order.createdAt);
      return orderDate >= startDate && orderDate <= endDate;
    });
  }, [orders, startDate, endDate]);

  const metrics = useMemo(() => {
    const totalOrders = filteredOrders.length;
    const toFulfill = filteredOrders.filter((o: any) => o.orderStatus === 'to_fulfill' || o.status === 'to_fulfill').length;
    const shipped = filteredOrders.filter((o: any) => o.orderStatus === 'shipped' || o.status === 'shipped').length;
    const cancelled = filteredOrders.filter((o: any) => o.orderStatus === 'cancelled' || o.status === 'cancelled').length;
    
    const totalRevenue = filteredOrders.reduce((sum, o: any) => sum + parseFloat(o.grandTotal || '0'), 0);
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    const fulfillmentRate = totalOrders > 0 ? (shipped / totalOrders) * 100 : 0;

    return { totalOrders, toFulfill, shipped, cancelled, totalRevenue, avgOrderValue, fulfillmentRate };
  }, [filteredOrders]);

  const weekMetrics = useMemo(() => {
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
    const prevWeekStart = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
    const prevWeekEnd = endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });

    const weekOrders = (orders as any[]).filter((o: any) => {
      const d = new Date(o.createdAt);
      return d >= weekStart && d <= weekEnd;
    });
    const prevWeekOrders = (orders as any[]).filter((o: any) => {
      const d = new Date(o.createdAt);
      return d >= prevWeekStart && d <= prevWeekEnd;
    });

    const revenue = weekOrders.reduce((sum, o: any) => sum + parseFloat(o.grandTotal || '0'), 0);
    const prevRevenue = prevWeekOrders.reduce((sum, o: any) => sum + parseFloat(o.grandTotal || '0'), 0);
    const growth = prevRevenue > 0 ? ((revenue - prevRevenue) / prevRevenue) * 100 : 0;

    return { orders: weekOrders.length, revenue, growth };
  }, [orders, now]);

  const monthMetrics = useMemo(() => {
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);
    const prevMonthStart = startOfMonth(subMonths(now, 1));
    const prevMonthEnd = endOfMonth(subMonths(now, 1));

    const monthOrders = (orders as any[]).filter((o: any) => {
      const d = new Date(o.createdAt);
      return d >= monthStart && d <= monthEnd;
    });
    const prevMonthOrders = (orders as any[]).filter((o: any) => {
      const d = new Date(o.createdAt);
      return d >= prevMonthStart && d <= prevMonthEnd;
    });

    const revenue = monthOrders.reduce((sum, o: any) => sum + parseFloat(o.grandTotal || '0'), 0);
    const prevRevenue = prevMonthOrders.reduce((sum, o: any) => sum + parseFloat(o.grandTotal || '0'), 0);
    const growth = prevRevenue > 0 ? ((revenue - prevRevenue) / prevRevenue) * 100 : 0;

    return { orders: monthOrders.length, revenue, growth };
  }, [orders, now]);

  const ordersByStatus = useMemo(() => {
    const statusCounts: { [key: string]: number } = {};
    filteredOrders.forEach((order: any) => {
      const status = order.orderStatus || order.status || 'unknown';
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });
    const data = Object.entries(statusCounts).map(([name, value]) => ({
      name: name.replace('_', ' ').toUpperCase(),
      value,
    }));
    return preparePieChartData(data);
  }, [filteredOrders]);

  const ordersByPaymentStatus = useMemo(() => {
    const paid = filteredOrders.filter((o: any) => o.paymentStatus === 'paid').length;
    const unpaid = filteredOrders.filter((o: any) => o.paymentStatus === 'unpaid' || !o.paymentStatus).length;
    const payLater = filteredOrders.filter((o: any) => o.paymentStatus === 'pay_later').length;
    return preparePieChartData([
      { name: t('financial.paid'), value: paid },
      { name: t('financial.unpaid'), value: unpaid },
      { name: tCommon('payLater'), value: payLater },
    ]);
  }, [filteredOrders, t, tCommon]);

  const orderValueDistribution = useMemo(() => {
    const high = filteredOrders.filter((o: any) => parseFloat(o.grandTotal || '0') > 5000).length;
    const medium = filteredOrders.filter((o: any) => {
      const price = parseFloat(o.grandTotal || '0');
      return price >= 1000 && price <= 5000;
    }).length;
    const low = filteredOrders.filter((o: any) => parseFloat(o.grandTotal || '0') < 1000).length;
    return preparePieChartData([
      { name: `${t('highValue')} (>5000 Kč)`, value: high },
      { name: `${t('mediumValue')} (1-5K Kč)`, value: medium },
      { name: `${t('lowValue')} (<1000 Kč)`, value: low },
    ]);
  }, [filteredOrders, t]);

  const monthlyOrderTrends = useMemo(() => {
    const last12Months = eachMonthOfInterval({ start: subMonths(now, 11), end: now });
    return last12Months.map(monthDate => {
      const monthStart = startOfMonth(monthDate);
      const monthEnd = endOfMonth(monthDate);
      const monthOrders = (orders as any[]).filter((order: any) => {
        const orderDate = new Date(order.createdAt);
        return orderDate >= monthStart && orderDate <= monthEnd;
      });
      const revenue = monthOrders.reduce((sum, o: any) => sum + parseFloat(o.grandTotal || '0'), 0);
      const fulfilled = monthOrders.filter((o: any) => (o.orderStatus || o.status) === 'shipped').length;
      return {
        month: format(monthDate, 'MMM'),
        fullMonth: format(monthDate, 'MMM yyyy'),
        orders: monthOrders.length,
        revenue,
        fulfilled,
        pending: monthOrders.filter((o: any) => (o.orderStatus || o.status) === 'to_fulfill').length,
        avgValue: monthOrders.length > 0 ? revenue / monthOrders.length : 0,
      };
    });
  }, [orders, now]);

  const dailyOrderTrends = useMemo(() => {
    const last30Days = eachDayOfInterval({ start: subDays(now, 29), end: now });
    return last30Days.map(day => {
      const dayOrders = (orders as any[]).filter((order: any) => {
        const orderDate = new Date(order.createdAt);
        return format(orderDate, 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd');
      });
      return {
        date: format(day, 'MMM dd'),
        orders: dayOrders.length,
        revenue: dayOrders.reduce((sum, o: any) => sum + parseFloat(o.grandTotal || '0'), 0),
      };
    });
  }, [orders, now]);

  const ordersByDayOfWeek = useMemo(() => {
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dayCounts = dayNames.map((day, index) => ({ day, orders: 0, revenue: 0 }));
    
    (orders as any[]).forEach((order: any) => {
      const orderDate = new Date(order.createdAt);
      const dayIndex = getDay(orderDate);
      dayCounts[dayIndex].orders += 1;
      dayCounts[dayIndex].revenue += parseFloat(order.grandTotal || '0');
    });
    return dayCounts;
  }, [orders]);

  const ordersByCurrency = useMemo(() => {
    const czk = filteredOrders.filter((o: any) => o.currency === 'CZK').length;
    const eur = filteredOrders.filter((o: any) => o.currency === 'EUR').length;
    const usd = filteredOrders.filter((o: any) => o.currency === 'USD').length;
    return preparePieChartData([
      { name: 'CZK', value: czk },
      { name: 'EUR', value: eur },
      { name: 'USD', value: usd },
    ].filter(d => d.value > 0));
  }, [filteredOrders]);

  const handleExportExcel = () => {
    try {
      const exportData = filteredOrders.map((o: any) => ({
        [t('orderId')]: o.orderId,
        [t('customer')]: o.customer?.name || '-',
        [t('date')]: format(new Date(o.createdAt), 'yyyy-MM-dd'),
        [t('status')]: o.orderStatus || o.status,
        [t('paymentStatus')]: o.paymentStatus || 'unpaid',
        [t('total')]: parseFloat(o.grandTotal || '0'),
        [tCommon('currency')]: o.currency,
      }));
      exportToXLSX(exportData, `Order_Report_${format(new Date(), 'yyyy-MM-dd')}`, t('orderReport'));
      toast({ title: t('exportSuccessful'), description: t('orderReportExportedXlsx') });
    } catch (error) {
      toast({ title: t('exportFailed'), description: t('failedToExportOrderReport'), variant: "destructive" });
    }
  };

  const handleExportPDF = () => {
    try {
      const exportData = monthlyOrderTrends.map(m => ({
        month: m.fullMonth,
        orders: m.orders.toString(),
        revenue: formatCurrency(m.revenue, 'CZK'),
        fulfilled: m.fulfilled.toString(),
        pending: m.pending.toString(),
      }));
      const columns: PDFColumn[] = [
        { key: 'month', header: t('month') },
        { key: 'orders', header: t('total') },
        { key: 'revenue', header: t('revenue') },
        { key: 'fulfilled', header: t('fulfilled') },
        { key: 'pending', header: t('pending') },
      ];
      exportToPDF(exportData, columns, `Order_Report_${format(new Date(), 'yyyy-MM-dd')}`, t('orderTrends'));
      toast({ title: t('exportSuccessful'), description: t('orderReportExportedPdf') });
    } catch (error) {
      toast({ title: t('exportFailed'), description: t('failedToExportOrderReportPdf'), variant: "destructive" });
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

  if (ordersLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32" />)}
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="order-reports">
      <ReportHeader
        title={t('orderReportsTitle')}
        description={t('orderReportsDesc')}
        onExportExcel={handleExportExcel}
        onExportPDF={handleExportPDF}
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-flex">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">{t('overview')}</span>
          </TabsTrigger>
          <TabsTrigger value="trends" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            <span className="hidden sm:inline">{t('orderTrends')}</span>
          </TabsTrigger>
          <TabsTrigger value="analysis" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            <span className="hidden sm:inline">{t('orderPerformance')}</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title={t('totalOrders')}
              value={metrics.totalOrders}
              icon={ShoppingCart}
              iconColor="text-blue-600"
              iconBgColor="bg-blue-100"
              testId="metric-total-orders"
            />
            <MetricCard
              title={t('totalRevenue')}
              value={formatCurrency(metrics.totalRevenue, 'CZK')}
              icon={DollarSign}
              iconColor="text-green-600"
              iconBgColor="bg-green-100"
              testId="metric-total-revenue"
            />
            <MetricCard
              title={t('avgOrderValue')}
              value={formatCurrency(metrics.avgOrderValue, 'CZK')}
              icon={Target}
              iconColor="text-purple-600"
              iconBgColor="bg-purple-100"
              testId="metric-avg-order-value"
            />
            <MetricCard
              title={t('fulfillmentRate')}
              value={`${metrics.fulfillmentRate.toFixed(1)}%`}
              icon={CheckCircle}
              iconColor="text-green-600"
              iconBgColor="bg-green-100"
              testId="metric-fulfillment-rate"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card data-testid="week-summary-card">
              <CardHeader className="bg-blue-50 dark:bg-blue-950 pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-blue-600" />
                    {t('ordersThisWeek')}
                  </CardTitle>
                  <GrowthIndicator value={weekMetrics.growth} />
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">{t('orders')}</p>
                    <p className="text-2xl font-bold">{weekMetrics.orders}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{t('revenue')}</p>
                    <p className="text-2xl font-bold text-green-600">{formatCompactNumber(weekMetrics.revenue)} Kč</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card data-testid="month-summary-card">
              <CardHeader className="bg-green-50 dark:bg-green-950 pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 text-green-600" />
                    {t('ordersThisMonth')}
                  </CardTitle>
                  <GrowthIndicator value={monthMetrics.growth} />
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">{t('orders')}</p>
                    <p className="text-2xl font-bold">{monthMetrics.orders}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{t('revenue')}</p>
                    <p className="text-2xl font-bold text-green-600">{formatCompactNumber(monthMetrics.revenue)} Kč</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title={t('toFulfill')}
              value={metrics.toFulfill}
              subtitle={t('pending')}
              icon={Truck}
              iconColor="text-orange-600"
              iconBgColor="bg-orange-100"
              testId="metric-to-fulfill"
            />
            <MetricCard
              title={t('shipped')}
              value={metrics.shipped}
              subtitle={t('completed')}
              icon={CheckCircle}
              iconColor="text-green-600"
              iconBgColor="bg-green-100"
              testId="metric-shipped"
            />
            <MetricCard
              title={t('cancelled')}
              value={metrics.cancelled}
              icon={XCircle}
              iconColor="text-red-600"
              iconBgColor="bg-red-100"
              testId="metric-cancelled"
            />
            <MetricCard
              title={t('pending')}
              value={filteredOrders.filter((o: any) => (o.orderStatus || o.status) === 'pending').length}
              icon={Clock}
              iconColor="text-amber-600"
              iconBgColor="bg-amber-100"
              testId="metric-pending"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <PieChartCard title={t('ordersByStatus')} data={ordersByStatus} testId="chart-orders-by-status" />
            <PieChartCard title={t('ordersByPaymentStatus')} data={ordersByPaymentStatus} colors={['#10b981', '#ef4444', '#f59e0b']} testId="chart-payment-status" />
          </div>
        </TabsContent>

        <TabsContent value="trends" className="space-y-6 mt-6">
          <TrendLineChart
            title={t('monthlyOrderTrends')}
            data={monthlyOrderTrends}
            lines={[
              { dataKey: 'orders', name: t('totalOrders'), color: '#3b82f6' },
              { dataKey: 'fulfilled', name: t('fulfilled'), color: '#10b981' },
              { dataKey: 'pending', name: t('pending'), color: '#f59e0b' },
            ]}
            testId="chart-monthly-order-trends"
          />

          <TrendLineChart
            title={t('dailySalesLast30Days')}
            data={dailyOrderTrends}
            lines={[
              { dataKey: 'orders', name: t('orders'), color: '#3b82f6' },
              { dataKey: 'revenue', name: `${t('revenue')} (CZK)`, color: '#10b981' },
            ]}
            formatValue={(value) => formatCurrency(value, 'CZK')}
            testId="chart-daily-order-trends"
          />

          <Card data-testid="order-day-of-week-card">
            <CardHeader>
              <CardTitle>{t('orderVolumeByDay')}</CardTitle>
              <CardDescription>{t('salesByDayOfWeek')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {ordersByDayOfWeek.map((day) => {
                  const maxOrders = Math.max(...ordersByDayOfWeek.map(d => d.orders));
                  const percentage = maxOrders > 0 ? (day.orders / maxOrders) * 100 : 0;
                  return (
                    <div key={day.day} className="flex items-center gap-3">
                      <span className="w-10 text-sm font-medium">{day.day}</span>
                      <div className="flex-1 h-6 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-500"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <span className="w-12 text-sm text-right">{day.orders}</span>
                      <span className="w-24 text-xs text-right text-muted-foreground">{formatCompactNumber(day.revenue)} Kč</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analysis" className="space-y-6 mt-6">
          <BarChartCard
            title={t('monthlyRevenueCostsComparison')}
            data={monthlyOrderTrends}
            bars={[
              { dataKey: 'revenue', name: t('revenue'), color: '#3b82f6' },
              { dataKey: 'avgValue', name: t('avgOrderValue'), color: '#10b981' },
            ]}
            testId="chart-monthly-revenue"
          />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <PieChartCard title={t('orderValueDistribution')} data={orderValueDistribution} testId="chart-order-value-distribution" />
            <PieChartCard title={t('ordersByCurrency')} data={ordersByCurrency} testId="chart-orders-by-currency" />
          </div>

          <Card data-testid="monthly-breakdown-table">
            <CardHeader>
              <CardTitle>{t('monthlyBreakdown')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('month')}</TableHead>
                      <TableHead className="text-right">{t('orders')}</TableHead>
                      <TableHead className="text-right">{t('revenue')}</TableHead>
                      <TableHead className="text-right">{t('avgOrderValue')}</TableHead>
                      <TableHead className="text-right">{t('fulfilled')}</TableHead>
                      <TableHead>{t('status')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[...monthlyOrderTrends].reverse().map((m) => {
                      const fulfillRate = m.orders > 0 ? (m.fulfilled / m.orders) * 100 : 0;
                      return (
                        <TableRow key={m.fullMonth}>
                          <TableCell className="font-medium">{m.fullMonth}</TableCell>
                          <TableCell className="text-right">{m.orders}</TableCell>
                          <TableCell className="text-right">{formatCurrency(m.revenue, 'CZK')}</TableCell>
                          <TableCell className="text-right">{formatCurrency(m.avgValue, 'CZK')}</TableCell>
                          <TableCell className="text-right">{m.fulfilled}</TableCell>
                          <TableCell>
                            <Badge variant={fulfillRate > 80 ? "default" : fulfillRate > 50 ? "secondary" : "destructive"}>
                              {fulfillRate.toFixed(0)}% {t('fulfilled')}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
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
