import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useReports } from "@/contexts/ReportsContext";
import { ReportHeader } from "@/components/reports/ReportHeader";
import { MetricCard } from "@/components/reports/MetricCard";
import { BarChartCard } from "@/components/reports/BarChartCard";
import { PieChartCard } from "@/components/reports/PieChartCard";
import { TrendLineChart } from "@/components/reports/TrendLineChart";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  Users, Coins, UserCheck, TrendingUp, AlertTriangle,
  BarChart3, Heart, UserPlus, ArrowUpRight, ArrowDownRight,
  Target, Star
} from "lucide-react";
import { aggregateCustomerMetrics, preparePieChartData } from "@/lib/reportUtils";
import { formatCurrency, formatCompactNumber } from "@/lib/currencyUtils";
import { exportToXLSX, exportToPDF, PDFColumn } from "@/lib/exportUtils";
import { useToast } from "@/hooks/use-toast";
import { format, differenceInDays, subMonths, eachMonthOfInterval, startOfMonth, endOfMonth } from "date-fns";

export default function CustomerReports() {
  const { t } = useTranslation('reports');
  const { t: tCommon } = useTranslation('common');
  const { t: tCustomers } = useTranslation('customers');
  const { toast } = useToast();
  const { getDateRangeValues } = useReports();
  const { start: startDate, end: endDate } = getDateRangeValues();
  const [activeTab, setActiveTab] = useState("overview");

  const { data: orders = [], isLoading: ordersLoading } = useQuery({ queryKey: ['/api/orders'] });
  const { data: customers = [], isLoading: customersLoading } = useQuery({ queryKey: ['/api/customers'] });

  const isLoading = ordersLoading || customersLoading;
  const now = useMemo(() => new Date(), []);

  const filteredOrders = useMemo(() => {
    return (orders as any[]).filter((order: any) => {
      const orderDate = new Date(order.createdAt);
      return orderDate >= startDate && orderDate <= endDate;
    });
  }, [orders, startDate, endDate]);

  const customerMetrics = useMemo(() => {
    return aggregateCustomerMetrics(filteredOrders, customers as any[]);
  }, [filteredOrders, customers]);

  const topCustomers = useMemo(() => customerMetrics.slice(0, 10), [customerMetrics]);

  const metrics = useMemo(() => {
    const totalCustomers = (customers as any[]).length;
    const activeCustomers = customerMetrics.length;
    const totalRevenue = customerMetrics.reduce((sum, c) => sum + c.totalSpent, 0);
    const avgLifetimeValue = customerMetrics.length > 0 ? totalRevenue / customerMetrics.length : 0;
    const avgOrdersPerCustomer = customerMetrics.length > 0
      ? customerMetrics.reduce((sum, c) => sum + c.orderCount, 0) / customerMetrics.length : 0;

    const newCustomersThisMonth = (customers as any[]).filter((c: any) => {
      const createdAt = new Date(c.createdAt);
      return createdAt >= startOfMonth(now) && createdAt <= endOfMonth(now);
    }).length;

    const returningCustomers = customerMetrics.filter(c => c.orderCount > 1).length;
    const retentionRate = activeCustomers > 0 ? (returningCustomers / activeCustomers) * 100 : 0;

    return {
      totalCustomers,
      activeCustomers,
      avgLifetimeValue,
      avgOrdersPerCustomer,
      totalRevenue,
      newCustomersThisMonth,
      returningCustomers,
      retentionRate,
    };
  }, [customers, customerMetrics, now]);

  const customersAtRisk = useMemo(() => {
    const riskThreshold = 90;
    return customerMetrics
      .filter(c => {
        if (!c.lastOrderDate) return true;
        const daysSinceLastOrder = differenceInDays(now, new Date(c.lastOrderDate));
        return daysSinceLastOrder > riskThreshold && c.orderCount > 1;
      })
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 10);
  }, [customerMetrics, now]);

  const customerSegmentation = useMemo(() => {
    const highValue = customerMetrics.filter(c => c.totalSpent > 50000).length;
    const mediumValue = customerMetrics.filter(c => c.totalSpent > 10000 && c.totalSpent <= 50000).length;
    const lowValue = customerMetrics.filter(c => c.totalSpent <= 10000).length;
    return preparePieChartData([
      { name: t('highValueCustomers'), value: highValue },
      { name: t('mediumValueCustomers'), value: mediumValue },
      { name: t('lowValueCustomers'), value: lowValue },
    ]);
  }, [customerMetrics, t]);

  const purchaseFrequency = useMemo(() => {
    const frequent = customerMetrics.filter(c => c.orderCount >= 10).length;
    const regular = customerMetrics.filter(c => c.orderCount >= 5 && c.orderCount < 10).length;
    const occasional = customerMetrics.filter(c => c.orderCount >= 2 && c.orderCount < 5).length;
    const oneTime = customerMetrics.filter(c => c.orderCount === 1).length;
    return preparePieChartData([
      { name: t('frequentBuyers'), value: frequent },
      { name: t('regularBuyers'), value: regular },
      { name: t('occasionalBuyers'), value: occasional },
      { name: t('oneTimeBuyers'), value: oneTime },
    ]);
  }, [customerMetrics, t]);

  const customerTypeSplit = useMemo(() => {
    const newCustomers = customerMetrics.filter(c => c.orderCount === 1).length;
    const returning = customerMetrics.filter(c => c.orderCount > 1).length;
    return preparePieChartData([
      { name: t('newCustomer'), value: newCustomers },
      { name: t('returningCustomer'), value: returning },
    ]);
  }, [customerMetrics, t]);

  const monthlyCustomerAcquisition = useMemo(() => {
    const last12Months = eachMonthOfInterval({ start: subMonths(now, 11), end: now });
    return last12Months.map(monthDate => {
      const monthStart = startOfMonth(monthDate);
      const monthEnd = endOfMonth(monthDate);
      
      const newCustomers = (customers as any[]).filter((c: any) => {
        const createdAt = new Date(c.createdAt);
        return createdAt >= monthStart && createdAt <= monthEnd;
      }).length;

      const monthOrders = (orders as any[]).filter((o: any) => {
        const orderDate = new Date(o.createdAt);
        return orderDate >= monthStart && orderDate <= monthEnd;
      });
      
      const uniqueCustomers = new Set(monthOrders.map((o: any) => o.customerId)).size;
      const revenue = monthOrders.reduce((sum, o: any) => sum + parseFloat(o.grandTotal || '0'), 0);
      const avgLTV = uniqueCustomers > 0 ? revenue / uniqueCustomers : 0;

      return {
        month: format(monthDate, 'MMM'),
        fullMonth: format(monthDate, 'MMM yyyy'),
        newCustomers,
        activeCustomers: uniqueCustomers,
        avgLTV,
        revenue,
      };
    });
  }, [customers, orders, now]);

  const topCustomersChartData = useMemo(() => {
    return topCustomers.map(c => ({
      name: c.customerName.length > 15 ? c.customerName.substring(0, 15) + '...' : c.customerName,
      totalSpent: c.totalSpent,
      orderCount: c.orderCount,
    }));
  }, [topCustomers]);

  const handleExportExcel = () => {
    try {
      const exportData = customerMetrics.map(c => ({
        [tCustomers('customer')]: c.customerName,
        [t('totalOrders')]: c.orderCount,
        [t('totalSpent')]: c.totalSpent.toFixed(2),
        [t('avgOrderValue')]: c.avgOrderValue.toFixed(2),
        [t('firstOrder')]: c.firstOrderDate ? format(c.firstOrderDate, 'yyyy-MM-dd') : '-',
        [t('lastOrder')]: c.lastOrderDate ? format(c.lastOrderDate, 'yyyy-MM-dd') : '-',
      }));
      exportToXLSX(exportData, `Customer_Report_${format(new Date(), 'yyyy-MM-dd')}`, t('customerReport'));
      toast({ title: t('exportSuccessful'), description: t('customerReportExportedXlsx') });
    } catch (error) {
      toast({ title: t('exportFailed'), description: t('failedToExportCustomerReport'), variant: "destructive" });
    }
  };

  const handleExportPDF = () => {
    try {
      const exportData = topCustomers.map(c => ({
        customer: c.customerName,
        orders: c.orderCount.toString(),
        spent: formatCurrency(c.totalSpent, 'CZK'),
        avgOrder: formatCurrency(c.avgOrderValue, 'CZK'),
      }));
      const columns: PDFColumn[] = [
        { key: 'customer', header: tCustomers('customer') },
        { key: 'orders', header: tCommon('orders') },
        { key: 'spent', header: t('totalSpent') },
        { key: 'avgOrder', header: t('avgOrderValue') },
      ];
      exportToPDF(exportData, columns, `Customer_Report_${format(new Date(), 'yyyy-MM-dd')}`, t('topCustomers'));
      toast({ title: t('exportSuccessful'), description: t('customerReportExportedPdf') });
    } catch (error) {
      toast({ title: t('exportFailed'), description: t('failedToExportCustomerReportPdf'), variant: "destructive" });
    }
  };

  if (isLoading) {
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
    <div className="space-y-6" data-testid="customer-reports">
      <ReportHeader
        title={t('customerReport')}
        description={t('customerAnalyticsDesc')}
        onExportExcel={handleExportExcel}
        onExportPDF={handleExportPDF}
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-flex">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">{t('overview')}</span>
          </TabsTrigger>
          <TabsTrigger value="retention" className="flex items-center gap-2">
            <Heart className="h-4 w-4" />
            <span className="hidden sm:inline">{t('customerRetention')}</span>
          </TabsTrigger>
          <TabsTrigger value="growth" className="flex items-center gap-2">
            <UserPlus className="h-4 w-4" />
            <span className="hidden sm:inline">{t('customerAcquisition')}</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title={tCustomers('totalCustomers')}
              value={metrics.totalCustomers}
              icon={Users}
              iconColor="text-blue-600"
              iconBgColor="bg-blue-100"
              testId="metric-total-customers"
            />
            <MetricCard
              title={t('activeCustomers')}
              value={metrics.activeCustomers}
              subtitle={t('withOrders')}
              icon={UserCheck}
              iconColor="text-green-600"
              iconBgColor="bg-green-100"
              testId="metric-active-customers"
            />
            <MetricCard
              title={t('avgLifetimeValue')}
              value={formatCurrency(metrics.avgLifetimeValue, 'CZK')}
              icon={Coins}
              iconColor="text-purple-600"
              iconBgColor="bg-purple-100"
              testId="metric-avg-ltv"
            />
            <MetricCard
              title={t('customerRetention')}
              value={`${metrics.retentionRate.toFixed(1)}%`}
              icon={Heart}
              iconColor="text-pink-600"
              iconBgColor="bg-pink-100"
              testId="metric-retention-rate"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-500 rounded-full">
                    <Coins className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t('totalRevenue')}</p>
                    <p className="text-2xl font-bold">{formatCompactNumber(metrics.totalRevenue)} Kč</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-green-500 rounded-full">
                    <UserPlus className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t('newCustomersThisMonth')}</p>
                    <p className="text-2xl font-bold">{metrics.newCustomersThisMonth}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-purple-500 rounded-full">
                    <Target className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t('averageOrdersPerCustomer')}</p>
                    <p className="text-2xl font-bold">{metrics.avgOrdersPerCustomer.toFixed(1)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <BarChartCard
            title={t('top10CustomersByRevenue')}
            data={topCustomersChartData}
            bars={[{ dataKey: 'totalSpent', name: `${t('totalSpent')} (CZK)`, color: '#3b82f6' }]}
            formatValue={(value) => formatCurrency(value, 'CZK')}
            testId="chart-top-customers"
          />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <PieChartCard title={t('customerSegmentationByValue')} data={customerSegmentation} testId="chart-customer-segmentation" />
            <PieChartCard title={t('purchaseFrequency')} data={purchaseFrequency} testId="chart-purchase-frequency" />
          </div>
        </TabsContent>

        <TabsContent value="retention" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <PieChartCard title={t('customerTypeSplit')} data={customerTypeSplit} colors={['#3b82f6', '#10b981']} testId="chart-customer-type" />
            
            <Card data-testid="retention-metrics-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Heart className="h-5 w-5 text-pink-500" />
                  {t('retentionMetrics')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                  <span className="text-sm">{t('returningCustomers')}</span>
                  <span className="font-bold text-green-600">{metrics.returningCustomers}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                  <span className="text-sm">{t('retentionRate')}</span>
                  <Badge variant={metrics.retentionRate > 50 ? "default" : "secondary"}>
                    {metrics.retentionRate.toFixed(1)}%
                  </Badge>
                </div>
                <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                  <span className="text-sm">{t('avgOrdersPerCustomer')}</span>
                  <span className="font-bold">{metrics.avgOrdersPerCustomer.toFixed(1)}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card data-testid="customers-at-risk-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                {t('customersAtRisk')}
              </CardTitle>
              <CardDescription>{t('customersAtRiskDesc') || 'Customers with no orders in the last 90 days'}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{tCustomers('customer')}</TableHead>
                      <TableHead className="text-right">{t('totalSpent')}</TableHead>
                      <TableHead className="text-right">{t('orders')}</TableHead>
                      <TableHead className="text-right">{t('noActivityDays')}</TableHead>
                      <TableHead>{t('status')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {customersAtRisk.map((customer) => {
                      const daysSince = customer.lastOrderDate 
                        ? differenceInDays(now, new Date(customer.lastOrderDate)) 
                        : 999;
                      return (
                        <TableRow key={customer.customerId}>
                          <TableCell className="font-medium">{customer.customerName}</TableCell>
                          <TableCell className="text-right">{formatCurrency(customer.totalSpent, 'CZK')}</TableCell>
                          <TableCell className="text-right">{customer.orderCount}</TableCell>
                          <TableCell className="text-right">{daysSince}</TableCell>
                          <TableCell>
                            <Badge variant="destructive">{t('atRisk')}</Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {customersAtRisk.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground">
                          {t('noCustomersAtRisk') || 'No customers at risk'}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="growth" className="space-y-6 mt-6">
          <TrendLineChart
            title={t('customerAcquisitionTrend')}
            data={monthlyCustomerAcquisition}
            lines={[
              { dataKey: 'newCustomers', name: t('newCustomers'), color: '#3b82f6' },
              { dataKey: 'activeCustomers', name: t('activeCustomers'), color: '#10b981' },
            ]}
            testId="chart-customer-acquisition"
          />

          <TrendLineChart
            title={t('customerLifetimeValueTrend')}
            data={monthlyCustomerAcquisition}
            lines={[
              { dataKey: 'avgLTV', name: t('avgLifetimeValue'), color: '#8b5cf6' },
              { dataKey: 'revenue', name: t('revenue'), color: '#10b981' },
            ]}
            formatValue={(value) => formatCurrency(value, 'CZK')}
            testId="chart-ltv-trend"
          />

          <Card data-testid="monthly-customer-breakdown">
            <CardHeader>
              <CardTitle>{t('monthlyCustomerBreakdown')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('month')}</TableHead>
                      <TableHead className="text-right">{t('newCustomers')}</TableHead>
                      <TableHead className="text-right">{t('activeCustomers')}</TableHead>
                      <TableHead className="text-right">{t('avgLifetimeValue')}</TableHead>
                      <TableHead className="text-right">{t('revenue')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[...monthlyCustomerAcquisition].reverse().map((m) => (
                      <TableRow key={m.fullMonth}>
                        <TableCell className="font-medium">{m.fullMonth}</TableCell>
                        <TableCell className="text-right">
                          <Badge variant="outline">{m.newCustomers}</Badge>
                        </TableCell>
                        <TableCell className="text-right">{m.activeCustomers}</TableCell>
                        <TableCell className="text-right">{formatCurrency(m.avgLTV, 'CZK')}</TableCell>
                        <TableCell className="text-right text-green-600">{formatCurrency(m.revenue, 'CZK')}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Card data-testid="table-top-customers">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 text-amber-500" />
            {t('topCustomersByRevenue')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{tCustomers('customer')}</TableHead>
                  <TableHead className="text-right">{tCommon('orders')}</TableHead>
                  <TableHead className="text-right">{t('totalSpent')}</TableHead>
                  <TableHead className="text-right">{t('avgOrderValue')}</TableHead>
                  <TableHead>{t('lastOrder')}</TableHead>
                  <TableHead>{t('status')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topCustomers.map((customer) => {
                  const daysSince = customer.lastOrderDate 
                    ? differenceInDays(now, new Date(customer.lastOrderDate)) 
                    : 999;
                  const status = daysSince < 30 ? 'active' : daysSince < 90 ? 'recent' : 'inactive';
                  return (
                    <TableRow key={customer.customerId}>
                      <TableCell className="font-medium">{customer.customerName}</TableCell>
                      <TableCell className="text-right">{customer.orderCount}</TableCell>
                      <TableCell className="text-right font-semibold text-green-600">
                        {formatCurrency(customer.totalSpent, 'CZK')}
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(customer.avgOrderValue, 'CZK')}</TableCell>
                      <TableCell>
                        {customer.lastOrderDate ? format(customer.lastOrderDate, 'MMM dd, yyyy') : '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={status === 'active' ? 'default' : status === 'recent' ? 'secondary' : 'destructive'}>
                          {status === 'active' ? t('loyal') : status === 'recent' ? t('recent') : t('atRisk')}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {topCustomers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      {t('noCustomerData')}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
