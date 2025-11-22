import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useReports } from "@/contexts/ReportsContext";
import { ReportHeader } from "@/components/reports/ReportHeader";
import { MetricCard } from "@/components/reports/MetricCard";
import { TrendLineChart } from "@/components/reports/TrendLineChart";
import { PieChartCard } from "@/components/reports/PieChartCard";
import { MonthlyComparisonTable } from "@/components/reports/MonthlyComparisonTable";
import { Skeleton } from "@/components/ui/skeleton";
import { Coins, TrendingUp, PiggyBank, Percent } from "lucide-react";
import { aggregateMonthlyRevenue, convertToBaseCurrency, preparePieChartData } from "@/lib/reportUtils";
import { formatCurrency } from "@/lib/currencyUtils";
import { exportToXLSX, exportToPDF, PDFColumn } from "@/lib/exportUtils";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

export default function FinancialReports() {
  const { t } = useTranslation(['reports', 'financial', 'common']);
  const { toast } = useToast();
  const { getDateRangeValues, currencyFilter } = useReports();
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

  const isLoading = ordersLoading || productsLoading || itemsLoading || expensesLoading;

  // Filter data by date range
  const filteredOrders = useMemo(() => {
    return (orders as any[]).filter((order: any) => {
      const orderDate = new Date(order.createdAt);
      return orderDate >= startDate && orderDate <= endDate;
    });
  }, [orders, startDate, endDate]);

  const filteredExpenses = useMemo(() => {
    return (expenses as any[]).filter((expense: any) => {
      const expenseDate = new Date(expense.createdAt || expense.date);
      return expenseDate >= startDate && expenseDate <= endDate;
    });
  }, [expenses, startDate, endDate]);

  // Calculate monthly data
  const monthlyData = useMemo(() => {
    if (isLoading) return [];
    return aggregateMonthlyRevenue(
      filteredOrders,
      orderItems as any[],
      products as any[],
      filteredExpenses,
      12
    );
  }, [filteredOrders, orderItems, products, filteredExpenses, isLoading]);

  // Calculate key metrics
  const metrics = useMemo(() => {
    let totalRevenueCZK = 0;
    let totalRevenueEUR = 0;
    let totalRevenueUSD = 0;
    let totalCostCZK = 0;
    let totalCostEUR = 0;
    let totalCostUSD = 0;

    filteredOrders.forEach((order: any) => {
      const revenue = parseFloat(order.totalPrice || '0');
      if (currencyFilter === 'all' || order.currency === currencyFilter) {
        if (order.currency === 'CZK') totalRevenueCZK += revenue;
        else if (order.currency === 'EUR') totalRevenueEUR += revenue;
        else if (order.currency === 'USD') totalRevenueUSD += revenue;
      }
    });

    const filteredOrderIds = new Set(filteredOrders.map((o: any) => o.id));
    const filteredOrderItems = (orderItems as any[]).filter((item: any) => filteredOrderIds.has(item.orderId));

    filteredOrderItems.forEach((item: any) => {
      const product = (products as any[]).find((p: any) => p.id === item.productId);
      if (product) {
        const quantity = item.quantity || 0;
        totalCostCZK += parseFloat(product.importCostCzk || '0') * quantity;
        totalCostEUR += parseFloat(product.importCostEur || '0') * quantity;
        totalCostUSD += parseFloat(product.importCostUsd || '0') * quantity;
      }
    });

    filteredExpenses.forEach((expense: any) => {
      const amount = parseFloat(expense.amount || '0');
      if (expense.currency === 'CZK') totalCostCZK += amount;
      else if (expense.currency === 'EUR') totalCostEUR += amount;
      else if (expense.currency === 'USD') totalCostUSD += amount;
    });

    const totalRevenue = totalRevenueCZK + convertToBaseCurrency(totalRevenueEUR, 'EUR') + convertToBaseCurrency(totalRevenueUSD, 'USD');
    const totalCost = totalCostCZK + convertToBaseCurrency(totalCostEUR, 'EUR') + convertToBaseCurrency(totalCostUSD, 'USD');
    const profit = totalRevenue - totalCost;
    const profitMargin = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;

    return {
      totalRevenueCZK,
      totalRevenueEUR,
      totalRevenueUSD,
      totalRevenue,
      totalCost,
      profit,
      profitMargin,
    };
  }, [filteredOrders, orderItems, products, filteredExpenses, currencyFilter]);

  // Prepare chart data
  const revenueChartData = useMemo(() => {
    return monthlyData.map(m => ({
      month: m.monthName,
      CZK: m.revenueCZK,
      EUR: m.revenueEUR * 25,
      USD: m.revenueUSD * 23,
    }));
  }, [monthlyData]);

  const profitChartData = useMemo(() => {
    return monthlyData.map(m => ({
      month: m.monthName,
      profit: m.profit,
      margin: m.profitMargin,
    }));
  }, [monthlyData]);

  const revenueByCurrencyData = useMemo(() => {
    const data = [
      { name: 'CZK', value: metrics.totalRevenueCZK },
      { name: 'EUR', value: convertToBaseCurrency(metrics.totalRevenueEUR, 'EUR') },
      { name: 'USD', value: convertToBaseCurrency(metrics.totalRevenueUSD, 'USD') },
    ].filter(d => d.value > 0);
    return preparePieChartData(data);
  }, [metrics]);

  const costBreakdownData = useMemo(() => {
    const filteredOrderIds = new Set(filteredOrders.map((o: any) => o.id));
    const filteredOrderItems = (orderItems as any[]).filter((item: any) => filteredOrderIds.has(item.orderId));

    let productCosts = 0;
    filteredOrderItems.forEach((item: any) => {
      const product = (products as any[]).find((p: any) => p.id === item.productId);
      if (product) {
        const quantity = item.quantity || 0;
        productCosts += parseFloat(product.importCostCzk || '0') * quantity;
      }
    });

    const expenseCosts = filteredExpenses.reduce((sum, exp: any) => {
      return sum + convertToBaseCurrency(parseFloat(exp.amount || '0'), exp.currency);
    }, 0);

    const data = [
      { name: 'Product Costs', value: productCosts },
      { name: 'Expenses', value: expenseCosts },
    ].filter(d => d.value > 0);
    return preparePieChartData(data);
  }, [filteredOrders, orderItems, products, filteredExpenses]);

  // Export handlers
  const handleExportExcel = () => {
    try {
      const exportData = monthlyData.map(m => ({
        'Month': m.monthName,
        'Revenue CZK': m.revenueCZK.toFixed(2),
        'Revenue EUR': m.revenueEUR.toFixed(2),
        'Revenue USD': m.revenueUSD.toFixed(2),
        'Total Cost': (m.costCZK + (m.costEUR * 25) + (m.costUSD * 23)).toFixed(2),
        'Profit': m.profit.toFixed(2),
        'Margin %': m.profitMargin.toFixed(2),
        'Orders': m.orderCount,
      }));

      exportToXLSX(exportData, `Financial_Report_${format(new Date(), 'yyyy-MM-dd')}`, t('reports:financialReport'));
      
      toast({
        title: t('common:success'),
        description: t('reports:exportSuccessful'),
      });
    } catch (error) {
      toast({
        title: t('common:error'),
        description: t('reports:exportFailed'),
        variant: "destructive",
      });
    }
  };

  const handleExportPDF = () => {
    try {
      const exportData = monthlyData.map(m => ({
        month: m.monthName,
        revenueCZK: formatCurrency(m.revenueCZK, 'CZK'),
        profit: formatCurrency(m.profit, 'CZK'),
        margin: `${m.profitMargin.toFixed(1)}%`,
        orders: m.orderCount.toString(),
      }));

      const columns: PDFColumn[] = [
        { key: 'month', header: t('common:month') },
        { key: 'revenueCZK', header: t('reports:totalRevenue') },
        { key: 'profit', header: t('reports:totalProfit') },
        { key: 'margin', header: t('reports:profitMargin') },
        { key: 'orders', header: t('common:orders') },
      ];

      exportToPDF(
        exportData,
        columns,
        `Financial_Report_${format(new Date(), 'yyyy-MM-dd')}`,
        t('reports:financialReport')
      );

      toast({
        title: t('common:success'),
        description: t('reports:exportSuccessful'),
      });
    } catch (error) {
      toast({
        title: t('common:error'),
        description: t('reports:exportFailed'),
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
    <div className="space-y-6" data-testid="financial-reports">
      <ReportHeader
        title={t('reports:financialReport')}
        description={t('reports:financialOverviewDesc')}
        onExportExcel={handleExportExcel}
        onExportPDF={handleExportPDF}
        showCurrencyFilter
      />

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title={t('reports:totalRevenue')}
          value={formatCurrency(metrics.totalRevenue, 'CZK')}
          icon={Coins}
          iconColor="text-green-600"
          iconBgColor="bg-green-100"
          testId="metric-total-revenue"
        />
        <MetricCard
          title={t('reports:totalProfit')}
          value={formatCurrency(metrics.profit, 'CZK')}
          icon={TrendingUp}
          iconColor="text-blue-600"
          iconBgColor="bg-blue-100"
          testId="metric-total-profit"
        />
        <MetricCard
          title={t('financial:totalCosts')}
          value={formatCurrency(metrics.totalCost, 'CZK')}
          icon={PiggyBank}
          iconColor="text-orange-600"
          iconBgColor="bg-orange-100"
          testId="metric-total-costs"
        />
        <MetricCard
          title={t('reports:profitMargin')}
          value={`${metrics.profitMargin.toFixed(1)}%`}
          icon={Percent}
          iconColor="text-purple-600"
          iconBgColor="bg-purple-100"
          testId="metric-profit-margin"
        />
      </div>

      {/* Revenue Trends */}
      <TrendLineChart
        title={t('reports:revenueTrendsLast12Months')}
        data={revenueChartData}
        lines={[
          { dataKey: 'CZK', name: 'CZK', color: '#3b82f6' },
          { dataKey: 'EUR', name: `EUR (${t('common:in')} CZK)`, color: '#10b981' },
          { dataKey: 'USD', name: `USD (${t('common:in')} CZK)`, color: '#f59e0b' },
        ]}
        formatValue={(value) => formatCurrency(value, 'CZK')}
        testId="chart-revenue-trends"
      />

      {/* Profit Trends */}
      <TrendLineChart
        title={t('reports:profitMarginTrends')}
        data={profitChartData}
        lines={[
          { dataKey: 'profit', name: `${t('reports:totalProfit')} (CZK)`, color: '#3b82f6' },
          { dataKey: 'margin', name: `${t('reports:profitMargin')} %`, color: '#10b981' },
        ]}
        formatValue={(value) => value.toLocaleString()}
        testId="chart-profit-trends"
      />

      {/* Monthly Comparison Table */}
      <MonthlyComparisonTable
        title={t('reports:monthlyFinancialComparison')}
        data={monthlyData}
        formatCurrency={(value, currency) => formatCurrency(value, currency as any)}
        testId="table-monthly-comparison"
      />

      {/* Revenue & Cost Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PieChartCard
          title={t('reports:revenueByCurrency')}
          data={revenueByCurrencyData}
          formatValue={(value) => formatCurrency(value, 'CZK')}
          testId="chart-revenue-by-currency"
        />
        <PieChartCard
          title={t('reports:costStructure')}
          data={costBreakdownData}
          formatValue={(value) => formatCurrency(value, 'CZK')}
          testId="chart-cost-breakdown"
        />
      </div>
    </div>
  );
}
