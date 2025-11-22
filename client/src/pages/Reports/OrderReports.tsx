import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from 'react-i18next';
import { useReports } from "@/contexts/ReportsContext";
import { ReportHeader } from "@/components/reports/ReportHeader";
import { MetricCard } from "@/components/reports/MetricCard";
import { TrendLineChart } from "@/components/reports/TrendLineChart";
import { PieChartCard } from "@/components/reports/PieChartCard";
import { BarChartCard } from "@/components/reports/BarChartCard";
import { Skeleton } from "@/components/ui/skeleton";
import { ShoppingCart, Truck, XCircle, CheckCircle } from "lucide-react";
import { preparePieChartData } from "@/lib/reportUtils";
import { formatCurrency } from "@/lib/currencyUtils";
import { exportToXLSX, exportToPDF, PDFColumn } from "@/lib/exportUtils";
import { useToast } from "@/hooks/use-toast";
import { format, eachMonthOfInterval, startOfMonth, subMonths } from "date-fns";

export default function OrderReports() {
  const { toast } = useToast();
  const { t } = useTranslation(['reports', 'common']);
  const { getDateRangeValues } = useReports();
  const { start: startDate, end: endDate } = getDateRangeValues();

  const { data: orders = [], isLoading: ordersLoading } = useQuery({ queryKey: ['/api/orders'] });

  const filteredOrders = useMemo(() => {
    return (orders as any[]).filter((order: any) => {
      const orderDate = new Date(order.createdAt);
      return orderDate >= startDate && orderDate <= endDate;
    });
  }, [orders, startDate, endDate]);

  const metrics = useMemo(() => {
    const totalOrders = filteredOrders.length;
    const toFulfill = filteredOrders.filter((o: any) => o.status === 'to_fulfill').length;
    const shipped = filteredOrders.filter((o: any) => o.status === 'shipped').length;
    const cancelled = filteredOrders.filter((o: any) => o.status === 'cancelled').length;

    return { totalOrders, toFulfill, shipped, cancelled };
  }, [filteredOrders]);

  const ordersByStatus = useMemo(() => {
    const statusCounts: { [key: string]: number } = {};

    filteredOrders.forEach((order: any) => {
      const status = order.status || 'unknown';
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
      { name: 'Paid', value: paid },
      { name: 'Unpaid', value: unpaid },
      { name: 'Pay Later', value: payLater },
    ]);
  }, [filteredOrders]);

  const monthlyOrderTrends = useMemo(() => {
    const now = new Date();
    const startDate = startOfMonth(subMonths(now, 11));
    const months = eachMonthOfInterval({ start: startDate, end: now });

    return months.map(monthDate => {
      const monthStr = format(monthDate, 'yyyy-MM');
      const monthName = format(monthDate, 'MMM yyyy');

      const monthOrders = (orders as any[]).filter((order: any) => {
        const orderDate = new Date(order.createdAt);
        return format(orderDate, 'yyyy-MM') === monthStr;
      });

      return {
        month: monthName,
        orders: monthOrders.length,
        fulfilled: monthOrders.filter((o: any) => o.status === 'shipped').length,
        pending: monthOrders.filter((o: any) => o.status === 'to_fulfill').length,
      };
    });
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
        'Order ID': o.orderId,
        'Customer': o.customer?.name || '-',
        'Date': format(new Date(o.createdAt), 'yyyy-MM-dd'),
        'Status': o.status,
        'Payment Status': o.paymentStatus || 'unpaid',
        'Total': parseFloat(o.totalPrice || '0'),
        'Currency': o.currency,
      }));

      exportToXLSX(exportData, `Order_Report_${format(new Date(), 'yyyy-MM-dd')}`, 'Order Report');
      
      toast({
        title: "Export Successful",
        description: "Order report exported to XLSX",
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export order report",
        variant: "destructive",
      });
    }
  };

  const handleExportPDF = () => {
    try {
      const exportData = monthlyOrderTrends.map(m => ({
        month: m.month,
        orders: m.orders.toString(),
        fulfilled: m.fulfilled.toString(),
        pending: m.pending.toString(),
      }));

      const columns: PDFColumn[] = [
        { key: 'month', header: 'Month' },
        { key: 'orders', header: 'Total' },
        { key: 'fulfilled', header: 'Fulfilled' },
        { key: 'pending', header: 'Pending' },
      ];

      exportToPDF(
        exportData,
        columns,
        `Order_Report_${format(new Date(), 'yyyy-MM-dd')}`,
        'Order Trends'
      );

      toast({
        title: "Export Successful",
        description: "Order report exported to PDF",
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export order report to PDF",
        variant: "destructive",
      });
    }
  };

  if (ordersLoading) {
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
    <div className="space-y-6" data-testid="order-reports">
      <ReportHeader
        title={t('reports.orderReportsTitle')}
        description={t('reports.orderReportsDesc')}
        onExportExcel={handleExportExcel}
        onExportPDF={handleExportPDF}
      />

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title={t('reports.totalOrders')}
          value={metrics.totalOrders}
          icon={ShoppingCart}
          iconColor="text-blue-600"
          iconBgColor="bg-blue-100"
          testId="metric-total-orders"
        />
        <MetricCard
          title={t('reports.toFulfill')}
          value={metrics.toFulfill}
          subtitle={t('reports.pending')}
          icon={Truck}
          iconColor="text-orange-600"
          iconBgColor="bg-orange-100"
          testId="metric-to-fulfill"
        />
        <MetricCard
          title={t('reports.shipped')}
          value={metrics.shipped}
          subtitle={t('reports.completed')}
          icon={CheckCircle}
          iconColor="text-green-600"
          iconBgColor="bg-green-100"
          testId="metric-shipped"
        />
        <MetricCard
          title={t('reports.cancelled')}
          value={metrics.cancelled}
          subtitle={t('reports.cancelled')}
          icon={XCircle}
          iconColor="text-red-600"
          iconBgColor="bg-red-100"
          testId="metric-cancelled"
        />
      </div>

      {/* Order Trends */}
      <TrendLineChart
        title={t('reports.orderTrends')}
        data={monthlyOrderTrends}
        lines={[
          { dataKey: 'orders', name: 'Total Orders', color: '#3b82f6' },
          { dataKey: 'fulfilled', name: 'Fulfilled', color: '#10b981' },
          { dataKey: 'pending', name: 'Pending', color: '#f59e0b' },
        ]}
        testId="chart-order-trends"
      />

      {/* Order Status & Payment Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PieChartCard
          title={t('reports.ordersByStatus')}
          data={ordersByStatus}
          testId="chart-orders-by-status"
        />
        <PieChartCard
          title={t('reports.ordersByPaymentStatus')}
          data={ordersByPaymentStatus}
          colors={['#10b981', '#ef4444', '#f59e0b']}
          testId="chart-payment-status"
        />
      </div>

      {/* Orders by Currency */}
      <PieChartCard
        title={t('reports.ordersByCurrency')}
        data={ordersByCurrency}
        testId="chart-orders-by-currency"
      />
    </div>
  );
}
