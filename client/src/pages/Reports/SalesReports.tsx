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
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ShoppingCart, TrendingUp, TrendingDown, Package, Coins, 
  Calendar, CalendarDays, CalendarRange, BarChart3,
  ArrowUpRight, ArrowDownRight, Target, Zap, Clock, Star,
  DollarSign, PiggyBank, Activity, Users
} from "lucide-react";
import { aggregateProductSales, aggregateMonthlyRevenue, preparePieChartData, convertToBaseCurrency } from "@/lib/reportUtils";
import { formatCurrency, formatCompactNumber } from "@/lib/currencyUtils";
import { exportToXLSX, exportToPDF, PDFColumn } from "@/lib/exportUtils";
import { useToast } from "@/hooks/use-toast";
import { 
  format, subDays, subWeeks, subMonths, subYears, 
  startOfDay, endOfDay, startOfWeek, endOfWeek, 
  startOfMonth, endOfMonth, startOfYear, endOfYear,
  eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval,
  getDay, getHours, differenceInDays, isSameDay, isSameWeek, isSameMonth, isSameYear
} from "date-fns";

interface PeriodMetrics {
  revenue: number;
  profit: number;
  orders: number;
  units: number;
  avgOrderValue: number;
  revenueGrowth: number;
  profitGrowth: number;
  ordersGrowth: number;
}

interface DayOfWeekSales {
  day: string;
  dayIndex: number;
  revenue: number;
  orders: number;
}

interface HourOfDaySales {
  hour: number;
  revenue: number;
  orders: number;
}

export default function SalesReports() {
  const { toast } = useToast();
  const { t } = useTranslation('reports');
  const { t: tCommon } = useTranslation('common');
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
  const { data: categories = [] } = useQuery({ queryKey: ['/api/categories'] });

  const isLoading = ordersLoading || productsLoading || itemsLoading;

  const now = useMemo(() => new Date(), []);

  const calculatePeriodMetrics = (
    ordersData: any[], 
    orderItemsData: any[], 
    productsData: any[],
    startDate: Date, 
    endDate: Date,
    prevStartDate: Date,
    prevEndDate: Date
  ): PeriodMetrics => {
    const currentOrders = ordersData.filter((order: any) => {
      const orderDate = new Date(order.createdAt);
      return orderDate >= startDate && orderDate <= endDate;
    });

    const prevOrders = ordersData.filter((order: any) => {
      const orderDate = new Date(order.createdAt);
      return orderDate >= prevStartDate && orderDate <= prevEndDate;
    });

    const currentOrderIds = new Set(currentOrders.map((o: any) => o.id));
    const prevOrderIds = new Set(prevOrders.map((o: any) => o.id));

    const currentItems = orderItemsData.filter((item: any) => currentOrderIds.has(item.orderId));
    const prevItems = orderItemsData.filter((item: any) => prevOrderIds.has(item.orderId));

    const calcRevenue = (periodOrders: any[]) => periodOrders.reduce((sum, order: any) => {
      return sum + convertToBaseCurrency(parseFloat(order.totalPrice || '0'), order.currency || 'CZK');
    }, 0);
    
    const calcProfit = (periodOrders: any[], items: any[], prods: any[]) => {
      const orderMap = new Map(periodOrders.map((o: any) => [o.id, o]));
      const revenue = periodOrders.reduce((sum, order: any) => {
        return sum + convertToBaseCurrency(parseFloat(order.totalPrice || '0'), order.currency || 'CZK');
      }, 0);
      const costs = items.reduce((sum, item: any) => {
        const order = orderMap.get(item.orderId);
        if (!order) return sum;
        const product = prods.find((p: any) => p.id === item.productId);
        if (!product) return sum;
        return sum + (parseFloat(product.importCostCzk || '0') * (item.quantity || 0));
      }, 0);
      return revenue - costs;
    };
    
    const calcUnits = (items: any[]) => items.reduce((sum, item: any) => sum + (item.quantity || 0), 0);

    const currentRevenue = calcRevenue(currentOrders);
    const prevRevenue = calcRevenue(prevOrders);
    const currentProfit = calcProfit(currentOrders, currentItems, productsData);
    const prevProfit = calcProfit(prevOrders, prevItems, productsData);

    const revenueGrowth = prevRevenue > 0 ? ((currentRevenue - prevRevenue) / prevRevenue) * 100 : 0;
    const profitGrowth = prevProfit !== 0 ? ((currentProfit - prevProfit) / Math.abs(prevProfit)) * 100 : (currentProfit !== 0 ? 100 : 0);
    const ordersGrowth = prevOrders.length > 0 ? ((currentOrders.length - prevOrders.length) / prevOrders.length) * 100 : 0;

    return {
      revenue: currentRevenue,
      profit: currentProfit,
      orders: currentOrders.length,
      units: calcUnits(currentItems),
      avgOrderValue: currentOrders.length > 0 ? currentRevenue / currentOrders.length : 0,
      revenueGrowth,
      profitGrowth,
      ordersGrowth,
    };
  };

  const todayMetrics = useMemo(() => {
    return calculatePeriodMetrics(
      orders as any[], orderItems as any[], products as any[],
      startOfDay(now), endOfDay(now),
      startOfDay(subDays(now, 1)), endOfDay(subDays(now, 1))
    );
  }, [orders, orderItems, products, now]);

  const weekMetrics = useMemo(() => {
    return calculatePeriodMetrics(
      orders as any[], orderItems as any[], products as any[],
      startOfWeek(now, { weekStartsOn: 1 }), endOfWeek(now, { weekStartsOn: 1 }),
      startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 }), endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 })
    );
  }, [orders, orderItems, products, now]);

  const monthMetrics = useMemo(() => {
    return calculatePeriodMetrics(
      orders as any[], orderItems as any[], products as any[],
      startOfMonth(now), endOfMonth(now),
      startOfMonth(subMonths(now, 1)), endOfMonth(subMonths(now, 1))
    );
  }, [orders, orderItems, products, now]);

  const yearMetrics = useMemo(() => {
    return calculatePeriodMetrics(
      orders as any[], orderItems as any[], products as any[],
      startOfYear(now), endOfYear(now),
      startOfYear(subYears(now, 1)), endOfYear(subYears(now, 1))
    );
  }, [orders, orderItems, products, now]);

  const dailySalesData = useMemo(() => {
    const last30Days = eachDayOfInterval({ start: subDays(now, 29), end: now });
    return last30Days.map(day => {
      const dayOrders = (orders as any[]).filter((order: any) => {
        const orderDate = new Date(order.createdAt);
        return isSameDay(orderDate, day);
      });
      const orderIds = new Set(dayOrders.map((o: any) => o.id));
      const orderMap = new Map(dayOrders.map((o: any) => [o.id, o]));
      const dayItems = (orderItems as any[]).filter((item: any) => orderIds.has(item.orderId));
      const revenue = dayOrders.reduce((sum, order: any) => {
        return sum + convertToBaseCurrency(parseFloat(order.totalPrice || '0'), order.currency || 'CZK');
      }, 0);
      const costs = dayItems.reduce((sum, item: any) => {
        const order = orderMap.get(item.orderId);
        if (!order) return sum;
        const product = (products as any[]).find((p: any) => p.id === item.productId);
        if (!product) return sum;
        return sum + (parseFloat(product.importCostCzk || '0') * (item.quantity || 0));
      }, 0);
      const profit = revenue - costs;
      return {
        date: format(day, 'MMM dd'),
        fullDate: format(day, 'yyyy-MM-dd'),
        revenue,
        profit,
        orders: dayOrders.length,
        units: dayItems.reduce((sum, item: any) => sum + (item.quantity || 0), 0),
      };
    });
  }, [orders, orderItems, products, now]);

  const weeklySalesData = useMemo(() => {
    const last12Weeks = eachWeekOfInterval({ start: subWeeks(now, 11), end: now }, { weekStartsOn: 1 });
    return last12Weeks.map(weekStart => {
      const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
      const weekOrders = (orders as any[]).filter((order: any) => {
        const orderDate = new Date(order.createdAt);
        return orderDate >= weekStart && orderDate <= weekEnd;
      });
      const orderIds = new Set(weekOrders.map((o: any) => o.id));
      const orderMap = new Map(weekOrders.map((o: any) => [o.id, o]));
      const weekItems = (orderItems as any[]).filter((item: any) => orderIds.has(item.orderId));
      const revenue = weekOrders.reduce((sum, order: any) => {
        return sum + convertToBaseCurrency(parseFloat(order.totalPrice || '0'), order.currency || 'CZK');
      }, 0);
      const costs = weekItems.reduce((sum, item: any) => {
        const order = orderMap.get(item.orderId);
        if (!order) return sum;
        const product = (products as any[]).find((p: any) => p.id === item.productId);
        if (!product) return sum;
        return sum + (parseFloat(product.importCostCzk || '0') * (item.quantity || 0));
      }, 0);
      const profit = revenue - costs;
      return {
        week: `W${format(weekStart, 'ww')}`,
        startDate: format(weekStart, 'MMM dd'),
        revenue,
        profit,
        orders: weekOrders.length,
        avgOrderValue: weekOrders.length > 0 ? revenue / weekOrders.length : 0,
      };
    });
  }, [orders, orderItems, products, now]);

  const monthlySalesData = useMemo(() => {
    const last12Months = eachMonthOfInterval({ start: subMonths(now, 11), end: now });
    return last12Months.map(monthStart => {
      const monthEnd = endOfMonth(monthStart);
      const monthOrders = (orders as any[]).filter((order: any) => {
        const orderDate = new Date(order.createdAt);
        return orderDate >= monthStart && orderDate <= monthEnd;
      });
      const orderIds = new Set(monthOrders.map((o: any) => o.id));
      const orderMap = new Map(monthOrders.map((o: any) => [o.id, o]));
      const monthItems = (orderItems as any[]).filter((item: any) => orderIds.has(item.orderId));
      const revenue = monthOrders.reduce((sum, order: any) => {
        return sum + convertToBaseCurrency(parseFloat(order.totalPrice || '0'), order.currency || 'CZK');
      }, 0);
      const costs = monthItems.reduce((sum, item: any) => {
        const order = orderMap.get(item.orderId);
        if (!order) return sum;
        const product = (products as any[]).find((p: any) => p.id === item.productId);
        if (!product) return sum;
        return sum + (parseFloat(product.importCostCzk || '0') * (item.quantity || 0));
      }, 0);
      const profit = revenue - costs;
      return {
        month: format(monthStart, 'MMM yyyy'),
        shortMonth: format(monthStart, 'MMM'),
        revenue,
        profit,
        orders: monthOrders.length,
        profitMargin: revenue > 0 ? (profit / revenue) * 100 : 0,
      };
    });
  }, [orders, orderItems, products, now]);

  const dayOfWeekAnalysis = useMemo((): DayOfWeekSales[] => {
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const daySales = dayNames.map((day, index) => ({ day, dayIndex: index, revenue: 0, orders: 0 }));
    
    (orders as any[]).forEach((order: any) => {
      const orderDate = new Date(order.createdAt);
      const dayIndex = getDay(orderDate);
      daySales[dayIndex].orders += 1;
      daySales[dayIndex].revenue += convertToBaseCurrency(parseFloat(order.totalPrice || '0'), order.currency || 'CZK');
    });

    return daySales;
  }, [orders]);

  const hourOfDayAnalysis = useMemo((): HourOfDaySales[] => {
    const hourSales = Array.from({ length: 24 }, (_, hour) => ({ hour, revenue: 0, orders: 0 }));
    
    (orders as any[]).forEach((order: any) => {
      const orderDate = new Date(order.createdAt);
      const hour = getHours(orderDate);
      hourSales[hour].orders += 1;
    });

    return hourSales;
  }, [orders]);

  const productSales = useMemo(() => {
    const allOrderIds = new Set((orders as any[]).map((o: any) => o.id));
    const allItems = (orderItems as any[]).filter((item: any) => allOrderIds.has(item.orderId));
    return aggregateProductSales(allItems, products as any[], orders as any[]);
  }, [orderItems, products, orders]);

  const topSellingProducts = useMemo(() => productSales.slice(0, 10), [productSales]);

  const salesByCategory = useMemo(() => {
    const categorySales: { [key: string]: number } = {};
    const orderMap = new Map((orders as any[]).map((o: any) => [o.id, o]));
    const allItems = (orderItems as any[]).filter((item: any) => orderMap.has(item.orderId));

    allItems.forEach((item: any) => {
      const product = (products as any[]).find((p: any) => p.id === item.productId);
      const order = orderMap.get(item.orderId);
      if (product && product.categoryId && order) {
        const category = (categories as any[]).find((c: any) => c.id === product.categoryId);
        const categoryName = category?.name || tCommon('uncategorized');
        const revenue = convertToBaseCurrency(parseFloat(item.totalPrice || '0'), order.currency || 'CZK');
        categorySales[categoryName] = (categorySales[categoryName] || 0) + revenue;
      }
    });

    const data = Object.entries(categorySales).map(([name, value]) => ({ name, value }));
    return preparePieChartData(data);
  }, [orderItems, products, categories, orders, tCommon]);

  const insights = useMemo(() => {
    const bestDay = [...dayOfWeekAnalysis].sort((a, b) => b.revenue - a.revenue)[0];
    const worstDay = [...dayOfWeekAnalysis].sort((a, b) => a.revenue - b.revenue)[0];
    const peakHour = [...hourOfDayAnalysis].sort((a, b) => b.orders - a.orders)[0];
    const bestMonth = [...monthlySalesData].sort((a, b) => b.revenue - a.revenue)[0];
    const avgProfitMargin = monthlySalesData.reduce((sum, m) => sum + m.profitMargin, 0) / monthlySalesData.length;
    const totalProfit = yearMetrics.profit;
    const totalRevenue = yearMetrics.revenue;

    return {
      bestDay,
      worstDay,
      peakHour,
      bestMonth,
      avgProfitMargin,
      totalProfit,
      totalRevenue,
      yearlyGrowth: yearMetrics.revenueGrowth,
    };
  }, [dayOfWeekAnalysis, hourOfDayAnalysis, monthlySalesData, yearMetrics]);

  const handleExportExcel = () => {
    try {
      const exportData = [
        ...dailySalesData.map(d => ({
          [t('date')]: d.fullDate,
          [t('revenue')]: d.revenue.toFixed(2),
          [t('profit')]: d.profit.toFixed(2),
          [t('orders')]: d.orders,
          [t('unitsSold')]: d.units,
        })),
      ];
      exportToXLSX(exportData, `Sales_Report_${format(new Date(), 'yyyy-MM-dd')}`, t('salesReport'));
      toast({ title: t('exportSuccessful'), description: t('salesReportExportedXlsx') });
    } catch (error) {
      toast({ title: t('exportFailed'), description: t('failedToExportSalesReport'), variant: "destructive" });
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
        { key: 'product', header: t('product') },
        { key: 'quantity', header: t('qty') },
        { key: 'revenue', header: t('revenue') },
        { key: 'profit', header: t('profit') },
      ];
      exportToPDF(exportData, columns, `Sales_Report_${format(new Date(), 'yyyy-MM-dd')}`, t('salesReport'));
      toast({ title: t('exportSuccessful'), description: t('salesReportExportedPdf') });
    } catch (error) {
      toast({ title: t('exportFailed'), description: t('failedToExportSalesReportPdf'), variant: "destructive" });
    }
  };

  const GrowthIndicator = ({ value, label }: { value: number; label?: string }) => {
    const isPositive = value >= 0;
    return (
      <div className={`flex items-center gap-1 text-sm ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
        {isPositive ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
        <span>{Math.abs(value).toFixed(1)}%</span>
        {label && <span className="text-muted-foreground text-xs">{label}</span>}
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
            <p className="text-xs text-muted-foreground">{t('orders')}</p>
            <p className="text-base font-semibold">{metrics.orders}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{t('avgOrderValue')}</p>
            <p className="text-base font-semibold">{formatCompactNumber(metrics.avgOrderValue)} Kč</p>
          </div>
        </div>
        <div className="pt-2 border-t">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">{t('unitsSold')}</span>
            <span className="font-medium">{metrics.units}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-48" />)}
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="sales-reports">
      <ReportHeader
        title={t('salesReportsTitle')}
        description={t('salesReportsDesc')}
        onExportExcel={handleExportExcel}
        onExportPDF={handleExportPDF}
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-flex">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">{t('overview')}</span>
          </TabsTrigger>
          <TabsTrigger value="daily" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span className="hidden sm:inline">{t('daily')}</span>
          </TabsTrigger>
          <TabsTrigger value="weekly" className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4" />
            <span className="hidden sm:inline">{t('weekly')}</span>
          </TabsTrigger>
          <TabsTrigger value="monthly" className="flex items-center gap-2">
            <CalendarRange className="h-4 w-4" />
            <span className="hidden sm:inline">{t('monthly')}</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <PeriodCard title={t('today')} icon={Calendar} metrics={todayMetrics} iconColor="text-blue-600" bgColor="bg-blue-50 dark:bg-blue-950" />
            <PeriodCard title={t('thisWeek')} icon={CalendarDays} metrics={weekMetrics} iconColor="text-purple-600" bgColor="bg-purple-50 dark:bg-purple-950" />
            <PeriodCard title={t('thisMonth')} icon={CalendarRange} metrics={monthMetrics} iconColor="text-green-600" bgColor="bg-green-50 dark:bg-green-950" />
            <PeriodCard title={t('thisYear')} icon={Target} metrics={yearMetrics} iconColor="text-orange-600" bgColor="bg-orange-50 dark:bg-orange-950" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="lg:col-span-2" data-testid="insights-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-amber-500" />
                  {t('keyInsights')}
                </CardTitle>
                <CardDescription>{t('keyInsightsDesc')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-green-50 dark:bg-green-950">
                    <Star className="h-5 w-5 text-green-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-green-800 dark:text-green-200">{t('bestSellingDay')}</p>
                      <p className="text-sm text-green-600">{insights.bestDay?.day}: {formatCurrency(insights.bestDay?.revenue || 0, 'CZK')}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-950">
                    <Clock className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-blue-800 dark:text-blue-200">{t('peakHour')}</p>
                      <p className="text-sm text-blue-600">{insights.peakHour?.hour}:00 - {insights.peakHour?.orders} {t('orders')}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-purple-50 dark:bg-purple-950">
                    <TrendingUp className="h-5 w-5 text-purple-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-purple-800 dark:text-purple-200">{t('bestMonth')}</p>
                      <p className="text-sm text-purple-600">{insights.bestMonth?.month}: {formatCurrency(insights.bestMonth?.revenue || 0, 'CZK')}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-950">
                    <PiggyBank className="h-5 w-5 text-amber-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-amber-800 dark:text-amber-200">{t('avgProfitMargin')}</p>
                      <p className="text-sm text-amber-600">{insights.avgProfitMargin.toFixed(1)}%</p>
                    </div>
                  </div>
                </div>
                <div className="pt-4 border-t grid grid-cols-2 gap-4">
                  <div className="text-center p-4 rounded-lg bg-muted/50">
                    <p className="text-2xl font-bold text-green-600">{formatCompactNumber(insights.totalProfit)} Kč</p>
                    <p className="text-sm text-muted-foreground">{t('yearlyProfit')}</p>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-muted/50">
                    <p className="text-2xl font-bold">{formatCompactNumber(insights.totalRevenue)} Kč</p>
                    <p className="text-sm text-muted-foreground">{t('yearlyRevenue')}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card data-testid="day-of-week-card">
              <CardHeader>
                <CardTitle className="text-base">{t('salesByDayOfWeek')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {dayOfWeekAnalysis.map((day) => {
                    const maxRevenue = Math.max(...dayOfWeekAnalysis.map(d => d.revenue));
                    const percentage = maxRevenue > 0 ? (day.revenue / maxRevenue) * 100 : 0;
                    return (
                      <div key={day.day} className="flex items-center gap-2">
                        <span className="w-10 text-sm font-medium">{day.day}</span>
                        <div className="flex-1 h-6 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-500"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <span className="w-16 text-xs text-right text-muted-foreground">{formatCompactNumber(day.revenue)}</span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <PieChartCard
              title={t('salesByCategory')}
              data={salesByCategory}
              formatValue={(value) => formatCurrency(value, 'CZK')}
              testId="chart-sales-by-category"
            />
            
            <Card data-testid="table-top-products">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  {t('topSellingProducts')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('product')}</TableHead>
                        <TableHead className="text-right">{t('qty')}</TableHead>
                        <TableHead className="text-right">{t('revenue')}</TableHead>
                        <TableHead className="text-right">{t('profit')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {topSellingProducts.slice(0, 5).map((product) => (
                        <TableRow key={product.productId}>
                          <TableCell className="font-medium max-w-[150px] truncate">{product.productName}</TableCell>
                          <TableCell className="text-right">{product.quantity}</TableCell>
                          <TableCell className="text-right">{formatCompactNumber(product.revenue)} Kč</TableCell>
                          <TableCell className="text-right text-green-600">{formatCompactNumber(product.profit)} Kč</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="daily" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('dailySalesLast30Days')}</CardTitle>
              <CardDescription>{t('dailySalesDesc')}</CardDescription>
            </CardHeader>
            <CardContent>
              <TrendLineChart
                title=""
                data={dailySalesData}
                lines={[
                  { dataKey: 'revenue', name: `${t('revenue')} (CZK)`, color: '#3b82f6' },
                  { dataKey: 'profit', name: `${t('profit')} (CZK)`, color: '#10b981' },
                ]}
                formatValue={(value) => formatCurrency(value, 'CZK')}
                testId="chart-daily-sales"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('dailyBreakdown')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto max-h-96">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('date')}</TableHead>
                      <TableHead className="text-right">{t('revenue')}</TableHead>
                      <TableHead className="text-right">{t('profit')}</TableHead>
                      <TableHead className="text-right">{t('orders')}</TableHead>
                      <TableHead className="text-right">{t('unitsSold')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[...dailySalesData].reverse().map((day) => (
                      <TableRow key={day.fullDate}>
                        <TableCell className="font-medium">{day.date}</TableCell>
                        <TableCell className="text-right">{formatCurrency(day.revenue, 'CZK')}</TableCell>
                        <TableCell className="text-right text-green-600">{formatCurrency(day.profit, 'CZK')}</TableCell>
                        <TableCell className="text-right">{day.orders}</TableCell>
                        <TableCell className="text-right">{day.units}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="weekly" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('weeklySalesLast12Weeks')}</CardTitle>
              <CardDescription>{t('weeklySalesDesc')}</CardDescription>
            </CardHeader>
            <CardContent>
              <BarChartCard
                title=""
                data={weeklySalesData}
                bars={[
                  { dataKey: 'revenue', name: `${t('revenue')} (CZK)`, color: '#3b82f6' },
                  { dataKey: 'profit', name: `${t('profit')} (CZK)`, color: '#10b981' },
                ]}
                testId="chart-weekly-sales"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('weeklyBreakdown')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('week')}</TableHead>
                      <TableHead>{t('startDate')}</TableHead>
                      <TableHead className="text-right">{t('revenue')}</TableHead>
                      <TableHead className="text-right">{t('profit')}</TableHead>
                      <TableHead className="text-right">{t('orders')}</TableHead>
                      <TableHead className="text-right">{t('avgOrderValue')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[...weeklySalesData].reverse().map((week) => (
                      <TableRow key={week.week}>
                        <TableCell className="font-medium">{week.week}</TableCell>
                        <TableCell>{week.startDate}</TableCell>
                        <TableCell className="text-right">{formatCurrency(week.revenue, 'CZK')}</TableCell>
                        <TableCell className="text-right text-green-600">{formatCurrency(week.profit, 'CZK')}</TableCell>
                        <TableCell className="text-right">{week.orders}</TableCell>
                        <TableCell className="text-right">{formatCurrency(week.avgOrderValue, 'CZK')}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="monthly" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('monthlySalesLast12Months')}</CardTitle>
              <CardDescription>{t('monthlySalesDesc')}</CardDescription>
            </CardHeader>
            <CardContent>
              <TrendLineChart
                title=""
                data={monthlySalesData}
                lines={[
                  { dataKey: 'revenue', name: `${t('revenue')} (CZK)`, color: '#3b82f6' },
                  { dataKey: 'profit', name: `${t('profit')} (CZK)`, color: '#10b981' },
                ]}
                formatValue={(value) => formatCurrency(value, 'CZK')}
                testId="chart-monthly-sales"
              />
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>{t('monthlyBreakdown')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('month')}</TableHead>
                        <TableHead className="text-right">{t('revenue')}</TableHead>
                        <TableHead className="text-right">{t('profit')}</TableHead>
                        <TableHead className="text-right">{t('margin')}</TableHead>
                        <TableHead className="text-right">{t('orders')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {[...monthlySalesData].reverse().map((month) => (
                        <TableRow key={month.month}>
                          <TableCell className="font-medium">{month.month}</TableCell>
                          <TableCell className="text-right">{formatCurrency(month.revenue, 'CZK')}</TableCell>
                          <TableCell className="text-right text-green-600">{formatCurrency(month.profit, 'CZK')}</TableCell>
                          <TableCell className="text-right">
                            <Badge variant={month.profitMargin > 20 ? "default" : "secondary"}>
                              {month.profitMargin.toFixed(1)}%
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">{month.orders}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('profitMarginTrend')}</CardTitle>
                <CardDescription>{t('profitMarginTrendDesc')}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {monthlySalesData.slice(-6).map((month) => {
                    const marginColor = month.profitMargin > 25 ? 'bg-green-500' : month.profitMargin > 15 ? 'bg-amber-500' : 'bg-red-500';
                    return (
                      <div key={month.month} className="flex items-center gap-3">
                        <span className="w-16 text-sm font-medium">{month.shortMonth}</span>
                        <div className="flex-1 h-4 bg-muted rounded-full overflow-hidden">
                          <div 
                            className={`h-full ${marginColor} rounded-full transition-all duration-500`}
                            style={{ width: `${Math.min(month.profitMargin * 2, 100)}%` }}
                          />
                        </div>
                        <span className="w-14 text-sm text-right font-medium">{month.profitMargin.toFixed(1)}%</span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
