import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useReports } from "@/contexts/ReportsContext";
import { ReportHeader } from "@/components/reports/ReportHeader";
import { MetricCard } from "@/components/reports/MetricCard";
import { BarChartCard } from "@/components/reports/BarChartCard";
import { PieChartCard } from "@/components/reports/PieChartCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Coins, UserCheck, TrendingUp } from "lucide-react";
import { aggregateCustomerMetrics, convertToBaseCurrency, preparePieChartData } from "@/lib/reportUtils";
import { formatCurrency } from "@/lib/currencyUtils";
import { exportToXLSX, exportToPDF, PDFColumn } from "@/lib/exportUtils";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

export default function CustomerReports() {
  const { t } = useTranslation('reports');
  const { t: tCommon } = useTranslation('common');
  const { t: tCustomers } = useTranslation('customers');
  const { toast } = useToast();
  const { getDateRangeValues } = useReports();
  const { start: startDate, end: endDate } = getDateRangeValues();

  const { data: orders = [], isLoading: ordersLoading } = useQuery({ queryKey: ['/api/orders'] });
  const { data: customers = [], isLoading: customersLoading } = useQuery({ queryKey: ['/api/customers'] });

  const isLoading = ordersLoading || customersLoading;

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
    const avgLifetimeValue = customerMetrics.length > 0
      ? customerMetrics.reduce((sum, c) => sum + c.totalSpent, 0) / customerMetrics.length
      : 0;
    const avgOrdersPerCustomer = customerMetrics.length > 0
      ? customerMetrics.reduce((sum, c) => sum + c.orderCount, 0) / customerMetrics.length
      : 0;

    return {
      totalCustomers,
      activeCustomers,
      avgLifetimeValue,
      avgOrdersPerCustomer,
    };
  }, [customers, customerMetrics]);

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

  const topCustomersChartData = useMemo(() => {
    return topCustomers.map(c => ({
      name: c.customerName.length > 20 ? c.customerName.substring(0, 20) + '...' : c.customerName,
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
      
      toast({
        title: tCommon('success'),
        description: t('exportSuccessful'),
      });
    } catch (error) {
      toast({
        title: tCommon('error'),
        description: t('exportFailed'),
        variant: "destructive",
      });
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

      exportToPDF(
        exportData,
        columns,
        `Customer_Report_${format(new Date(), 'yyyy-MM-dd')}`,
        t('topCustomers')
      );

      toast({
        title: tCommon('success'),
        description: t('exportSuccessful'),
      });
    } catch (error) {
      toast({
        title: tCommon('error'),
        description: t('exportFailed'),
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
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

      {/* Key Metrics */}
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
          title={t('averageOrdersPerCustomer')}
          value={metrics.avgOrdersPerCustomer.toFixed(1)}
          icon={TrendingUp}
          iconColor="text-orange-600"
          iconBgColor="bg-orange-100"
          testId="metric-avg-orders"
        />
      </div>

      {/* Top Customers Chart */}
      <BarChartCard
        title={t('top10CustomersByRevenue')}
        data={topCustomersChartData}
        bars={[
          { dataKey: 'totalSpent', name: `${t('totalSpent')} (CZK)`, color: '#3b82f6' },
        ]}
        formatValue={(value) => formatCurrency(value, 'CZK')}
        testId="chart-top-customers"
      />

      {/* Customer Segmentation */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PieChartCard
          title={t('customerSegmentationByValue')}
          data={customerSegmentation}
          testId="chart-customer-segmentation"
        />
        <PieChartCard
          title={t('purchaseFrequency')}
          data={purchaseFrequency}
          testId="chart-purchase-frequency"
        />
      </div>

      {/* Top Customers Table */}
      <Card data-testid="table-top-customers">
        <CardHeader>
          <CardTitle>{t('topCustomersByRevenue')}</CardTitle>
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
                </TableRow>
              </TableHeader>
              <TableBody>
                {topCustomers.map((customer) => (
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
                  </TableRow>
                ))}
                {topCustomers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-slate-500">
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
