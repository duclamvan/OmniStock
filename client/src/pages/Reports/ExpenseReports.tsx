import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useReports } from "@/contexts/ReportsContext";
import { ReportHeader } from "@/components/reports/ReportHeader";
import { MetricCard } from "@/components/reports/MetricCard";
import { TrendLineChart } from "@/components/reports/TrendLineChart";
import { PieChartCard } from "@/components/reports/PieChartCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Coins, TrendingUp, AlertCircle, PieChart } from "lucide-react";
import { convertToBaseCurrency, preparePieChartData } from "@/lib/reportUtils";
import { formatCurrency } from "@/lib/currencyUtils";
import { exportToXLSX, exportToPDF, PDFColumn } from "@/lib/exportUtils";
import { useToast } from "@/hooks/use-toast";
import { format, eachMonthOfInterval, startOfMonth, subMonths } from "date-fns";

export default function ExpenseReports() {
  const { t } = useTranslation(['reports', 'financial', 'common']);
  const { toast } = useToast();
  const { getDateRangeValues } = useReports();
  const { start: startDate, end: endDate } = getDateRangeValues();

  const { data: expenses = [], isLoading: expensesLoading } = useQuery({ queryKey: ['/api/expenses'] });
  const { data: orders = [] } = useQuery({ queryKey: ['/api/orders'] });

  const filteredExpenses = useMemo(() => {
    return (expenses as any[]).filter((expense: any) => {
      const expenseDate = new Date(expense.createdAt || expense.date);
      return expenseDate >= startDate && expenseDate <= endDate;
    });
  }, [expenses, startDate, endDate]);

  const filteredOrders = useMemo(() => {
    return (orders as any[]).filter((order: any) => {
      const orderDate = new Date(order.createdAt);
      return orderDate >= startDate && orderDate <= endDate;
    });
  }, [orders, startDate, endDate]);

  const metrics = useMemo(() => {
    let totalExpensesCZK = 0;
    let totalExpensesEUR = 0;
    let totalExpensesUSD = 0;

    filteredExpenses.forEach((expense: any) => {
      const amount = parseFloat(expense.amount || '0');
      if (expense.currency === 'CZK') totalExpensesCZK += amount;
      else if (expense.currency === 'EUR') totalExpensesEUR += amount;
      else if (expense.currency === 'USD') totalExpensesUSD += amount;
    });

    const totalExpenses = totalExpensesCZK + convertToBaseCurrency(totalExpensesEUR, 'EUR') + convertToBaseCurrency(totalExpensesUSD, 'USD');

    const totalRevenue = filteredOrders.reduce((sum, order: any) => {
      const revenue = parseFloat(order.totalPrice || '0');
      return sum + convertToBaseCurrency(revenue, order.currency);
    }, 0);

    const expenseToRevenueRatio = totalRevenue > 0 ? (totalExpenses / totalRevenue) * 100 : 0;
    const avgExpense = filteredExpenses.length > 0 ? totalExpenses / filteredExpenses.length : 0;

    return {
      totalExpenses,
      totalExpensesCZK,
      totalExpensesEUR,
      totalExpensesUSD,
      totalRevenue,
      expenseToRevenueRatio,
      avgExpense,
      expenseCount: filteredExpenses.length,
    };
  }, [filteredExpenses, filteredOrders]);

  const expensesByCategory = useMemo(() => {
    const categoryExpenses: { [key: string]: number } = {};

    filteredExpenses.forEach((expense: any) => {
      const category = expense.category || t('financial:uncategorized');
      const amount = parseFloat(expense.amount || '0');
      const amountInCZK = convertToBaseCurrency(amount, expense.currency);
      categoryExpenses[category] = (categoryExpenses[category] || 0) + amountInCZK;
    });

    const data = Object.entries(categoryExpenses).map(([name, value]) => ({ name, value }));
    return preparePieChartData(data.sort((a, b) => b.value - a.value));
  }, [filteredExpenses, t]);

  const monthlyExpenseTrends = useMemo(() => {
    const now = new Date();
    const startDate = startOfMonth(subMonths(now, 11));
    const months = eachMonthOfInterval({ start: startDate, end: now });

    return months.map(monthDate => {
      const monthStr = format(monthDate, 'yyyy-MM');
      const monthName = format(monthDate, 'MMM yyyy');

      const monthExpenses = (expenses as any[]).filter((expense: any) => {
        const expenseDate = new Date(expense.createdAt || expense.date);
        return format(expenseDate, 'yyyy-MM') === monthStr;
      });

      const monthOrders = (orders as any[]).filter((order: any) => {
        const orderDate = new Date(order.createdAt);
        return format(orderDate, 'yyyy-MM') === monthStr;
      });

      const totalExpenses = monthExpenses.reduce((sum, exp: any) => {
        const amount = parseFloat(exp.amount || '0');
        return sum + convertToBaseCurrency(amount, exp.currency);
      }, 0);

      const totalRevenue = monthOrders.reduce((sum, order: any) => {
        const revenue = parseFloat(order.totalPrice || '0');
        return sum + convertToBaseCurrency(revenue, order.currency);
      }, 0);

      return {
        month: monthName,
        expenses: totalExpenses,
        revenue: totalRevenue,
        ratio: totalRevenue > 0 ? (totalExpenses / totalRevenue) * 100 : 0,
      };
    });
  }, [expenses, orders]);

  const topExpenses = useMemo(() => {
    return [...filteredExpenses]
      .map((exp: any) => ({
        ...exp,
        amountInCZK: convertToBaseCurrency(parseFloat(exp.amount || '0'), exp.currency),
      }))
      .sort((a, b) => b.amountInCZK - a.amountInCZK)
      .slice(0, 10);
  }, [filteredExpenses]);

  const handleExportExcel = () => {
    try {
      const exportData = filteredExpenses.map((exp: any) => ({
        [t('common:date')]: format(new Date(exp.createdAt || exp.date), 'yyyy-MM-dd'),
        [t('common:description')]: exp.description || '-',
        [t('financial:category')]: exp.category || t('financial:uncategorized'),
        [t('common:amount')]: parseFloat(exp.amount || '0'),
        [t('common:currency')]: exp.currency,
        [t('reports:amountCZK')]: convertToBaseCurrency(parseFloat(exp.amount || '0'), exp.currency).toFixed(2),
      }));

      exportToXLSX(exportData, `Expense_Report_${format(new Date(), 'yyyy-MM-dd')}`, t('reports:expenseReport'));
      
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
      const exportData = topExpenses.map((exp: any) => ({
        description: exp.description || '-',
        category: exp.category || t('financial:uncategorized'),
        amount: formatCurrency(exp.amountInCZK, 'CZK'),
        date: format(new Date(exp.createdAt || exp.date), 'MMM dd, yyyy'),
      }));

      const columns: PDFColumn[] = [
        { key: 'description', header: t('common:description') },
        { key: 'category', header: t('financial:category') },
        { key: 'amount', header: t('common:amount') },
        { key: 'date', header: t('common:date') },
      ];

      exportToPDF(
        exportData,
        columns,
        `Expense_Report_${format(new Date(), 'yyyy-MM-dd')}`,
        t('reports:topExpenses')
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

  if (expensesLoading) {
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
    <div className="space-y-6" data-testid="expense-reports">
      <ReportHeader
        title={t('reports:expenseReport')}
        description={t('reports:expenseAnalysisDesc')}
        onExportExcel={handleExportExcel}
        onExportPDF={handleExportPDF}
      />

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title={t('financial:totalExpenses')}
          value={formatCurrency(metrics.totalExpenses, 'CZK')}
          icon={Coins}
          iconColor="text-red-600"
          iconBgColor="bg-red-100"
          testId="metric-total-expenses"
        />
        <MetricCard
          title={t('reports:expenseCount')}
          value={metrics.expenseCount}
          subtitle={t('financial:transactions')}
          icon={PieChart}
          iconColor="text-blue-600"
          iconBgColor="bg-blue-100"
          testId="metric-expense-count"
        />
        <MetricCard
          title={t('reports:avgExpense')}
          value={formatCurrency(metrics.avgExpense, 'CZK')}
          icon={TrendingUp}
          iconColor="text-purple-600"
          iconBgColor="bg-purple-100"
          testId="metric-avg-expense"
        />
        <MetricCard
          title={t('reports:expenseRevenueRatio')}
          value={`${metrics.expenseToRevenueRatio.toFixed(1)}%`}
          icon={AlertCircle}
          iconColor="text-orange-600"
          iconBgColor="bg-orange-100"
          testId="metric-expense-ratio"
        />
      </div>

      {/* Monthly Expense Trends */}
      <TrendLineChart
        title={t('reports:monthlyExpenseVsRevenue')}
        data={monthlyExpenseTrends}
        lines={[
          { dataKey: 'expenses', name: `${t('financial:expenses')} (CZK)`, color: '#ef4444' },
          { dataKey: 'revenue', name: `${t('reports:totalRevenue')} (CZK)`, color: '#10b981' },
        ]}
        formatValue={(value) => formatCurrency(value, 'CZK')}
        testId="chart-expense-trends"
      />

      {/* Expense Breakdown */}
      <PieChartCard
        title={t('reports:expensesByCategory')}
        data={expensesByCategory}
        formatValue={(value) => formatCurrency(value, 'CZK')}
        testId="chart-expenses-by-category"
      />

      {/* Top Expenses Table */}
      <Card data-testid="table-top-expenses">
        <CardHeader>
          <CardTitle>{t('reports:topExpenses')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('common:description')}</TableHead>
                  <TableHead>{t('financial:category')}</TableHead>
                  <TableHead className="text-right">{t('common:amount')}</TableHead>
                  <TableHead className="text-right">{t('common:currency')}</TableHead>
                  <TableHead>{t('common:date')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topExpenses.map((expense: any) => (
                  <TableRow key={expense.id}>
                    <TableCell className="font-medium">{expense.description || '-'}</TableCell>
                    <TableCell>{expense.category || t('financial:uncategorized')}</TableCell>
                    <TableCell className="text-right font-semibold text-red-600">
                      {formatCurrency(expense.amountInCZK, 'CZK')}
                    </TableCell>
                    <TableCell className="text-right">{expense.currency}</TableCell>
                    <TableCell>{format(new Date(expense.createdAt || expense.date), 'MMM dd, yyyy')}</TableCell>
                  </TableRow>
                ))}
                {topExpenses.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-slate-500">
                      {t('reports:noExpenseData')}
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
