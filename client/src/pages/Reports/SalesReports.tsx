import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useReports } from "@/contexts/ReportsContext";
import { ReportHeader } from "@/components/reports/ReportHeader";
import { MetricCard } from "@/components/reports/MetricCard";
import { TrendLineChart } from "@/components/reports/TrendLineChart";
import { PieChartCard } from "@/components/reports/PieChartCard";
import { BarChartCard } from "@/components/reports/BarChartCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { ShoppingCart, TrendingUp, Package, Coins } from "lucide-react";
import { aggregateProductSales, aggregateMonthlyRevenue, preparePieChartData } from "@/lib/reportUtils";
import { formatCurrency } from "@/lib/currencyUtils";
import { exportToXLSX, exportToPDF, PDFColumn } from "@/lib/exportUtils";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

export default function SalesReports() {
  const { toast } = useToast();
  const { getDateRangeValues } = useReports();
  const { start: startDate, end: endDate } = getDateRangeValues();

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
  const { data: categories = [] } = useQuery({ queryKey: ['/api/categories'] });

  const isLoading = ordersLoading || productsLoading || itemsLoading || expensesLoading;

  const filteredOrders = useMemo(() => {
    return (orders as any[]).filter((order: any) => {
      const orderDate = new Date(order.createdAt);
      return orderDate >= startDate && orderDate <= endDate;
    });
  }, [orders, startDate, endDate]);

  const filteredOrderItems = useMemo(() => {
    const filteredOrderIds = new Set(filteredOrders.map((order: any) => order.id));
    return (orderItems as any[]).filter((item: any) => filteredOrderIds.has(item.orderId));
  }, [orderItems, filteredOrders]);

  const productSales = useMemo(() => {
    return aggregateProductSales(filteredOrderItems, products as any[], filteredOrders);
  }, [filteredOrderItems, products, filteredOrders]);

  const topSellingProducts = useMemo(() => productSales.slice(0, 10), [productSales]);

  const monthlyData = useMemo(() => {
    if (isLoading) return [];
    return aggregateMonthlyRevenue(
      filteredOrders,
      orderItems as any[],
      products as any[],
      expenses as any[],
      12
    );
  }, [filteredOrders, orderItems, products, expenses, isLoading]);

  const metrics = useMemo(() => {
    const totalOrders = filteredOrders.length;
    const totalRevenue = filteredOrders.reduce((sum, order: any) => {
      return sum + parseFloat(order.totalPrice || '0');
    }, 0);
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    const totalUnitsSold = filteredOrderItems.reduce((sum, item: any) => sum + (item.quantity || 0), 0);

    return { totalOrders, totalRevenue, avgOrderValue, totalUnitsSold };
  }, [filteredOrders, filteredOrderItems]);

  const salesByCategory = useMemo(() => {
    const categorySales: { [key: string]: number } = {};

    filteredOrderItems.forEach((item: any) => {
      const product = (products as any[]).find((p: any) => p.id === item.productId);
      if (product && product.categoryId) {
        const category = (categories as any[]).find((c: any) => c.id === product.categoryId);
        const categoryName = category?.name || 'Uncategorized';
        const revenue = parseFloat(item.totalPrice || '0');
        categorySales[categoryName] = (categorySales[categoryName] || 0) + revenue;
      }
    });

    const data = Object.entries(categorySales).map(([name, value]) => ({ name, value }));
    return preparePieChartData(data);
  }, [filteredOrderItems, products, categories]);

  const salesTrends = useMemo(() => {
    return monthlyData.map(m => ({
      month: m.monthName,
      revenue: m.revenueCZK + (m.revenueEUR * 25),
      orders: m.orderCount,
      avgOrderValue: m.orderCount > 0 ? (m.revenueCZK + (m.revenueEUR * 25)) / m.orderCount : 0,
    }));
  }, [monthlyData]);

  const topProductsChartData = useMemo(() => {
    return topSellingProducts.map(p => ({
      name: p.productName.length > 20 ? p.productName.substring(0, 20) + '...' : p.productName,
      quantity: p.quantity,
      revenue: p.revenue,
    }));
  }, [topSellingProducts]);

  const handleExportExcel = () => {
    try {
      const exportData = topSellingProducts.map(p => ({
        'Product': p.productName,
        'SKU': p.sku,
        'Quantity Sold': p.quantity,
        'Revenue': p.revenue.toFixed(2),
        'Cost': p.cost.toFixed(2),
        'Profit': p.profit.toFixed(2),
      }));

      exportToXLSX(exportData, `Sales_Report_${format(new Date(), 'yyyy-MM-dd')}`, 'Sales Report');
      
      toast({
        title: "Export Successful",
        description: "Sales report exported to XLSX",
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export sales report",
        variant: "destructive",
      });
    }
  };

  const handleExportPDF = () => {
    try {
      const exportData = topSellingProducts.map(p => ({
        product: p.productName,
        quantity: p.quantity.toString(),
        revenue: formatCurrency(p.revenue, 'CZK'),
        profit: formatCurrency(p.profit, 'CZK'),
      }));

      const columns: PDFColumn[] = [
        { key: 'product', header: 'Product' },
        { key: 'quantity', header: 'Qty' },
        { key: 'revenue', header: 'Revenue' },
        { key: 'profit', header: 'Profit' },
      ];

      exportToPDF(
        exportData,
        columns,
        `Sales_Report_${format(new Date(), 'yyyy-MM-dd')}`,
        'Sales Report'
      );

      toast({
        title: "Export Successful",
        description: "Sales report exported to PDF",
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export sales report to PDF",
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
    <div className="space-y-6" data-testid="sales-reports">
      <ReportHeader
        title="Sales Reports"
        description="Sales performance and product analytics"
        onExportExcel={handleExportExcel}
        onExportPDF={handleExportPDF}
      />

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Orders"
          value={metrics.totalOrders}
          icon={ShoppingCart}
          iconColor="text-blue-600"
          iconBgColor="bg-blue-100"
          testId="metric-total-orders"
        />
        <MetricCard
          title="Total Revenue"
          value={formatCurrency(metrics.totalRevenue, 'CZK')}
          icon={Coins}
          iconColor="text-green-600"
          iconBgColor="bg-green-100"
          testId="metric-total-revenue"
        />
        <MetricCard
          title="Avg Order Value"
          value={formatCurrency(metrics.avgOrderValue, 'CZK')}
          icon={TrendingUp}
          iconColor="text-purple-600"
          iconBgColor="bg-purple-100"
          testId="metric-avg-order-value"
        />
        <MetricCard
          title="Units Sold"
          value={metrics.totalUnitsSold}
          icon={Package}
          iconColor="text-orange-600"
          iconBgColor="bg-orange-100"
          testId="metric-units-sold"
        />
      </div>

      {/* Sales Trends */}
      <TrendLineChart
        title="Sales Trends"
        data={salesTrends}
        lines={[
          { dataKey: 'revenue', name: 'Revenue (CZK)', color: '#3b82f6' },
          { dataKey: 'avgOrderValue', name: 'Avg Order Value', color: '#10b981' },
        ]}
        formatValue={(value) => formatCurrency(value, 'CZK')}
        testId="chart-sales-trends"
      />

      {/* Top Products Bar Chart */}
      <BarChartCard
        title="Top 10 Selling Products (by Quantity)"
        data={topProductsChartData}
        bars={[
          { dataKey: 'quantity', name: 'Units Sold', color: '#3b82f6' },
        ]}
        testId="chart-top-products"
      />

      {/* Sales by Category */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PieChartCard
          title="Sales by Category"
          data={salesByCategory}
          formatValue={(value) => formatCurrency(value, 'CZK')}
          testId="chart-sales-by-category"
        />
        
        {/* Top Products Table */}
        <Card data-testid="table-top-products">
          <CardHeader>
            <CardTitle>Top Selling Products</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                    <TableHead className="text-right">Profit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topSellingProducts.slice(0, 5).map((product) => (
                    <TableRow key={product.productId}>
                      <TableCell className="font-medium">{product.productName}</TableCell>
                      <TableCell className="text-right">{product.quantity}</TableCell>
                      <TableCell className="text-right">{formatCurrency(product.revenue, 'CZK')}</TableCell>
                      <TableCell className="text-right text-green-600">{formatCurrency(product.profit, 'CZK')}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
