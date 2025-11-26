import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
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
  Coins, TrendingUp, TrendingDown, AlertCircle, PieChart, 
  BarChart3, Calendar, ArrowUpRight, ArrowDownRight, Receipt,
  Target, DollarSign
} from "lucide-react";
import { convertToBaseCurrency, preparePieChartData } from "@/lib/reportUtils";
import { formatCurrency, formatCompactNumber } from "@/lib/currencyUtils";
import { exportToXLSX, exportToPDF, PDFColumn } from "@/lib/exportUtils";
import { useToast } from "@/hooks/use-toast";
import { 
  format, eachMonthOfInterval, startOfMonth, endOfMonth, subMonths,
  startOfWeek, endOfWeek, subWeeks
} from "date-fns";

export default function ExpenseReports() {
  const { t } = useTranslation('reports');
  const { t: tCommon } = useTranslation('common');
  const { t: tFinancial } = useTranslation('financial');
  const { toast } = useToast();
  const { getDateRangeValues } = useReports();
  const { start: startDate, end: endDate } = getDateRangeValues();
  const [activeTab, setActiveTab] = useState("overview");

  const { data: expenses = [], isLoading: expensesLoading } = useQuery({ queryKey: ['/api/expenses'] });
  const { data: orders = [] } = useQuery({ queryKey: ['/api/orders'] });

  const now = useMemo(() => new Date(), []);

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

  const weekMetrics = useMemo(() => {
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
    const prevWeekStart = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
    const prevWeekEnd = endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });

    const weekExpenses = (expenses as any[]).filter((e: any) => {
      const d = new Date(e.createdAt || e.date);
      return d >= weekStart && d <= weekEnd;
    });
    const prevWeekExpenses = (expenses as any[]).filter((e: any) => {
      const d = new Date(e.createdAt || e.date);
      return d >= prevWeekStart && d <= prevWeekEnd;
    });

    const total = weekExpenses.reduce((sum, e: any) => sum + convertToBaseCurrency(parseFloat(e.amount || '0'), e.currency), 0);
    const prevTotal = prevWeekExpenses.reduce((sum, e: any) => sum + convertToBaseCurrency(parseFloat(e.amount || '0'), e.currency), 0);
    const growth = prevTotal > 0 ? ((total - prevTotal) / prevTotal) * 100 : 0;

    return { total, count: weekExpenses.length, growth };
  }, [expenses, now]);

  const monthMetrics = useMemo(() => {
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);
    const prevMonthStart = startOfMonth(subMonths(now, 1));
    const prevMonthEnd = endOfMonth(subMonths(now, 1));

    const monthExpenses = (expenses as any[]).filter((e: any) => {
      const d = new Date(e.createdAt || e.date);
      return d >= monthStart && d <= monthEnd;
    });
    const prevMonthExpenses = (expenses as any[]).filter((e: any) => {
      const d = new Date(e.createdAt || e.date);
      return d >= prevMonthStart && d <= prevMonthEnd;
    });

    const total = monthExpenses.reduce((sum, e: any) => sum + convertToBaseCurrency(parseFloat(e.amount || '0'), e.currency), 0);
    const prevTotal = prevMonthExpenses.reduce((sum, e: any) => sum + convertToBaseCurrency(parseFloat(e.amount || '0'), e.currency), 0);
    const growth = prevTotal > 0 ? ((total - prevTotal) / prevTotal) * 100 : 0;

    return { total, count: monthExpenses.length, growth };
  }, [expenses, now]);

  const expensesByCategory = useMemo(() => {
    const categoryExpenses: { [key: string]: number } = {};
    filteredExpenses.forEach((expense: any) => {
      const category = expense.category || tFinancial('uncategorized');
      const amount = parseFloat(expense.amount || '0');
      const amountInCZK = convertToBaseCurrency(amount, expense.currency);
      categoryExpenses[category] = (categoryExpenses[category] || 0) + amountInCZK;
    });
    const data = Object.entries(categoryExpenses).map(([name, value]) => ({ name, value }));
    return preparePieChartData(data.sort((a, b) => b.value - a.value));
  }, [filteredExpenses, tFinancial]);

  const monthlyExpenseTrends = useMemo(() => {
    const last12Months = eachMonthOfInterval({ start: subMonths(now, 11), end: now });
    return last12Months.map(monthDate => {
      const monthStart = startOfMonth(monthDate);
      const monthEnd = endOfMonth(monthDate);

      const monthExpenses = (expenses as any[]).filter((expense: any) => {
        const expenseDate = new Date(expense.createdAt || expense.date);
        return expenseDate >= monthStart && expenseDate <= monthEnd;
      });
      const monthOrders = (orders as any[]).filter((order: any) => {
        const orderDate = new Date(order.createdAt);
        return orderDate >= monthStart && orderDate <= monthEnd;
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
        month: format(monthDate, 'MMM'),
        fullMonth: format(monthDate, 'MMM yyyy'),
        expenses: totalExpenses,
        revenue: totalRevenue,
        ratio: totalRevenue > 0 ? (totalExpenses / totalRevenue) * 100 : 0,
        count: monthExpenses.length,
      };
    });
  }, [expenses, orders, now]);

  const categoryTrendsData = useMemo(() => {
    const categories = new Set<string>();
    (expenses as any[]).forEach((e: any) => categories.add(e.category || tFinancial('uncategorized')));
    
    const last6Months = eachMonthOfInterval({ start: subMonths(now, 5), end: now });
    return last6Months.map(monthDate => {
      const monthStart = startOfMonth(monthDate);
      const monthEnd = endOfMonth(monthDate);
      const monthExpenses = (expenses as any[]).filter((e: any) => {
        const d = new Date(e.createdAt || e.date);
        return d >= monthStart && d <= monthEnd;
      });

      const result: any = { month: format(monthDate, 'MMM') };
      categories.forEach(cat => {
        result[cat] = monthExpenses
          .filter((e: any) => (e.category || tFinancial('uncategorized')) === cat)
          .reduce((sum, e: any) => sum + convertToBaseCurrency(parseFloat(e.amount || '0'), e.currency), 0);
      });
      return result;
    });
  }, [expenses, now, tFinancial]);

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
        [tCommon('date')]: format(new Date(exp.createdAt || exp.date), 'yyyy-MM-dd'),
        [tCommon('description')]: exp.description || '-',
        [tFinancial('category')]: exp.category || tFinancial('uncategorized'),
        [tCommon('amount')]: parseFloat(exp.amount || '0'),
        [tCommon('currency')]: exp.currency,
        [t('amountCZK')]: convertToBaseCurrency(parseFloat(exp.amount || '0'), exp.currency).toFixed(2),
      }));
      exportToXLSX(exportData, `Expense_Report_${format(new Date(), 'yyyy-MM-dd')}`, t('expenseReport'));
      toast({ title: t('exportSuccessful'), description: t('expenseReportExportedXlsx') });
    } catch (error) {
      toast({ title: t('exportFailed'), description: t('failedToExportExpenseReport'), variant: "destructive" });
    }
  };

  const handleExportPDF = () => {
    try {
      const exportData = topExpenses.map((exp: any) => ({
        description: exp.description || '-',
        category: exp.category || tFinancial('uncategorized'),
        amount: formatCurrency(exp.amountInCZK, 'CZK'),
        date: format(new Date(exp.createdAt || exp.date), 'MMM dd, yyyy'),
      }));
      const columns: PDFColumn[] = [
        { key: 'description', header: tCommon('description') },
        { key: 'category', header: tFinancial('category') },
        { key: 'amount', header: tCommon('amount') },
        { key: 'date', header: tCommon('date') },
      ];
      exportToPDF(exportData, columns, `Expense_Report_${format(new Date(), 'yyyy-MM-dd')}`, t('topExpenses'));
      toast({ title: t('exportSuccessful'), description: t('expenseReportExportedPdf') });
    } catch (error) {
      toast({ title: t('exportFailed'), description: t('failedToExportExpenseReportPdf'), variant: "destructive" });
    }
  };

  const GrowthIndicator = ({ value, inverted = false }: { value: number; inverted?: boolean }) => {
    const isPositive = inverted ? value <= 0 : value >= 0;
    const displayPositive = value >= 0;
    return (
      <div className={`flex items-center gap-1 text-sm ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
        {displayPositive ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
        <span>{Math.abs(value).toFixed(1)}%</span>
      </div>
    );
  };

  if (expensesLoading) {
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
    <div className="space-y-6" data-testid="expense-reports">
      <ReportHeader
        title={t('expenseReport')}
        description={t('expenseAnalysisDesc')}
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
            <span className="hidden sm:inline">{t('expenseTrend')}</span>
          </TabsTrigger>
          <TabsTrigger value="categories" className="flex items-center gap-2">
            <PieChart className="h-4 w-4" />
            <span className="hidden sm:inline">{t('categoryTrends')}</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title={tFinancial('totalExpenses')}
              value={formatCurrency(metrics.totalExpenses, 'CZK')}
              icon={Coins}
              iconColor="text-red-600"
              iconBgColor="bg-red-100"
              testId="metric-total-expenses"
            />
            <MetricCard
              title={t('expenseCount')}
              value={metrics.expenseCount}
              subtitle={tFinancial('transactions')}
              icon={Receipt}
              iconColor="text-blue-600"
              iconBgColor="bg-blue-100"
              testId="metric-expense-count"
            />
            <MetricCard
              title={t('avgExpense')}
              value={formatCurrency(metrics.avgExpense, 'CZK')}
              icon={Target}
              iconColor="text-purple-600"
              iconBgColor="bg-purple-100"
              testId="metric-avg-expense"
            />
            <MetricCard
              title={t('expenseRevenueRatio')}
              value={`${metrics.expenseToRevenueRatio.toFixed(1)}%`}
              icon={AlertCircle}
              iconColor="text-orange-600"
              iconBgColor="bg-orange-100"
              testId="metric-expense-ratio"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card data-testid="week-expense-card">
              <CardHeader className="bg-red-50 dark:bg-red-950 pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-red-600" />
                    {t('thisWeek')} {t('expenses')}
                  </CardTitle>
                  <GrowthIndicator value={weekMetrics.growth} inverted />
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">{t('total')}</p>
                    <p className="text-2xl font-bold text-red-600">{formatCompactNumber(weekMetrics.total)} Kč</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{t('expenseCount')}</p>
                    <p className="text-2xl font-bold">{weekMetrics.count}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card data-testid="month-expense-card">
              <CardHeader className="bg-orange-50 dark:bg-orange-950 pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-orange-600" />
                    {t('thisMonth')} {t('expenses')}
                  </CardTitle>
                  <GrowthIndicator value={monthMetrics.growth} inverted />
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">{t('total')}</p>
                    <p className="text-2xl font-bold text-orange-600">{formatCompactNumber(monthMetrics.total)} Kč</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{t('expenseCount')}</p>
                    <p className="text-2xl font-bold">{monthMetrics.count}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <PieChartCard
            title={t('expensesByCategory')}
            data={expensesByCategory}
            formatValue={(value) => formatCurrency(value, 'CZK')}
            testId="chart-expenses-by-category"
          />

          <Card data-testid="table-top-expenses">
            <CardHeader>
              <CardTitle>{t('topExpenses')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{tCommon('description')}</TableHead>
                      <TableHead>{tFinancial('category')}</TableHead>
                      <TableHead className="text-right">{tCommon('amount')}</TableHead>
                      <TableHead className="text-right">{tCommon('currency')}</TableHead>
                      <TableHead>{tCommon('date')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topExpenses.map((expense: any) => (
                      <TableRow key={expense.id}>
                        <TableCell className="font-medium">{expense.description || '-'}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{expense.category || tFinancial('uncategorized')}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-semibold text-red-600">
                          {formatCurrency(expense.amountInCZK, 'CZK')}
                        </TableCell>
                        <TableCell className="text-right">{expense.currency}</TableCell>
                        <TableCell>{format(new Date(expense.createdAt || expense.date), 'MMM dd, yyyy')}</TableCell>
                      </TableRow>
                    ))}
                    {topExpenses.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground">
                          {t('noExpenseData')}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="space-y-6 mt-6">
          <TrendLineChart
            title={t('monthlyExpenseVsRevenue')}
            data={monthlyExpenseTrends}
            lines={[
              { dataKey: 'expenses', name: `${tFinancial('expenses')} (CZK)`, color: '#ef4444' },
              { dataKey: 'revenue', name: `${t('revenue')} (CZK)`, color: '#10b981' },
            ]}
            formatValue={(value) => formatCurrency(value, 'CZK')}
            testId="chart-expense-trends"
          />

          <BarChartCard
            title={t('monthlyExpenseTrend')}
            data={monthlyExpenseTrends}
            bars={[
              { dataKey: 'expenses', name: tFinancial('expenses'), color: '#ef4444' },
              { dataKey: 'count', name: t('expenseCount'), color: '#3b82f6' },
            ]}
            testId="chart-monthly-expense-bar"
          />

          <Card data-testid="expense-ratio-trend">
            <CardHeader>
              <CardTitle>{t('expenseRevenueRatioTrend')}</CardTitle>
              <CardDescription>{t('expenseRevenueRatioDesc') || 'Track expense efficiency over time'}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {monthlyExpenseTrends.slice(-6).map((m) => {
                  const ratioColor = m.ratio < 20 ? 'bg-green-500' : m.ratio < 40 ? 'bg-amber-500' : 'bg-red-500';
                  return (
                    <div key={m.fullMonth} className="flex items-center gap-3">
                      <span className="w-16 text-sm font-medium">{m.month}</span>
                      <div className="flex-1 h-6 bg-muted rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${ratioColor} rounded-full transition-all duration-500`}
                          style={{ width: `${Math.min(m.ratio * 2, 100)}%` }}
                        />
                      </div>
                      <span className="w-14 text-sm text-right font-medium">{m.ratio.toFixed(1)}%</span>
                      <span className="w-24 text-xs text-right text-muted-foreground">{formatCompactNumber(m.expenses)} Kč</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categories" className="space-y-6 mt-6">
          <BarChartCard
            title={t('topExpenseCategories')}
            data={expensesByCategory.slice(0, 8).map(d => ({ name: d.name.length > 15 ? d.name.substring(0, 15) + '...' : d.name, value: d.value }))}
            bars={[{ dataKey: 'value', name: tCommon('amount'), color: '#ef4444' }]}
            formatValue={(value) => formatCurrency(value, 'CZK')}
            testId="chart-top-expense-categories"
          />

          <Card data-testid="expense-breakdown-table">
            <CardHeader>
              <CardTitle>{t('expenseBreakdownByMonth')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('month')}</TableHead>
                      <TableHead className="text-right">{t('expenses')}</TableHead>
                      <TableHead className="text-right">{t('revenue')}</TableHead>
                      <TableHead className="text-right">{t('ratio')}</TableHead>
                      <TableHead className="text-right">{t('expenseCount')}</TableHead>
                      <TableHead>{t('status')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[...monthlyExpenseTrends].reverse().map((m) => (
                      <TableRow key={m.fullMonth}>
                        <TableCell className="font-medium">{m.fullMonth}</TableCell>
                        <TableCell className="text-right text-red-600">{formatCurrency(m.expenses, 'CZK')}</TableCell>
                        <TableCell className="text-right text-green-600">{formatCurrency(m.revenue, 'CZK')}</TableCell>
                        <TableCell className="text-right">{m.ratio.toFixed(1)}%</TableCell>
                        <TableCell className="text-right">{m.count}</TableCell>
                        <TableCell>
                          <Badge variant={m.ratio < 20 ? "default" : m.ratio < 40 ? "secondary" : "destructive"}>
                            {m.ratio < 20 ? t('efficient') : m.ratio < 40 ? t('moderate') : t('high')}
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
      </Tabs>
    </div>
  );
}
