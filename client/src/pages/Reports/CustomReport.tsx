import { lazy, Suspense, memo, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MobileCardView } from "@/components/ui/responsive-table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Truck, Package, Euro, TrendingUp, Filter, ArrowUpDown, Bell, Info, AlertCircle, CheckCircle2 } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/currencyUtils";
import { FixedSizeList as List } from "react-window";
import { useToast } from "@/hooks/use-toast";

// Lazy load heavy chart components to reduce initial bundle size
const RevenueChart = lazy(() => import("@/components/charts/RevenueChart").then(m => ({ default: m.RevenueChart })));
const ExpensesChart = lazy(() => import("@/components/charts/ExpensesChart").then(m => ({ default: m.ExpensesChart })));
const YearlyChart = lazy(() => import("@/components/charts/YearlyChart").then(m => ({ default: m.YearlyChart })));

// Define types for dashboard data
interface DashboardMetrics {
  fulfillOrdersToday: number;
  totalOrdersToday: number;
  totalRevenueToday: number;
  totalProfitToday: number;
  thisMonthRevenue: number;
  thisMonthProfit: number;
  lastMonthRevenue: number;
  lastMonthProfit: number;
}

interface FinancialSummaryItem {
  month: string;
  orderCount: number;
  totalProfitEur: number;
  totalRevenueEur: number;
  profitCzkOrders: number;
  revenueCzkOrders: number;
  profitEurOrders: number;
  revenueEurOrders: number;
  totalProfitCzk: number;
  totalRevenueCzk: number;
}

interface Activity {
  id: string;
  user?: {
    firstName?: string;
    lastName?: string;
  };
  description: string;
  createdAt: string;
}

interface UnpaidOrder {
  id: string;
  orderId: string;
  customer?: {
    name?: string;
  };
  createdAt: string;
  grandTotal: string;
  currency: string;
  paymentStatus: string;
}

interface LowStockProduct {
  id: string;
  name: string;
  category?: {
    name?: string;
  };
  sku: string;
  quantity: number;
  lowStockAlert: number;
  supplier?: {
    name?: string;
  };
}

// Memoized skeleton components for better performance
const MetricCardSkeleton = memo(() => (
  <Card>
    <CardContent className="p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-3 w-20" />
        </div>
        <Skeleton className="h-12 w-12 rounded-lg ml-4" />
      </div>
    </CardContent>
  </Card>
));
MetricCardSkeleton.displayName = 'MetricCardSkeleton';

const ChartSkeleton = memo(() => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between">
      <Skeleton className="h-6 w-32" />
      <Skeleton className="h-8 w-24" />
    </CardHeader>
    <CardContent>
      <Skeleton className="h-64 w-full" />
    </CardContent>
  </Card>
));
ChartSkeleton.displayName = 'ChartSkeleton';

const TableRowSkeleton = memo(() => (
  <TableRow>
    <TableCell><Skeleton className="h-8 w-8 rounded-full" /></TableCell>
    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
    <TableCell><Skeleton className="h-6 w-16 rounded" /></TableCell>
  </TableRow>
));
TableRowSkeleton.displayName = 'TableRowSkeleton';

const ActivitySkeleton = memo(() => (
  <div className="flex items-center space-x-3">
    <Skeleton className="h-8 w-8 rounded-full" />
    <div className="flex-1 space-y-1">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-3 w-48" />
    </div>
    <Skeleton className="h-3 w-16" />
  </div>
));
ActivitySkeleton.displayName = 'ActivitySkeleton';

export default function CustomReport() {
  const { t } = useTranslation('reports');
  const { t: tCommon } = useTranslation('common');
  const { t: tFinancial } = useTranslation('financial');
  const { toast } = useToast();
  
  // Test functions for the stacked notification system
  const triggerSuccessToast = () => {
    toast({
      title: `✅ ${tCommon('success')}!`,
      description: t('orderProcessedSuccessfully'),
      variant: "default",
    });
  };
  
  const triggerErrorToast = () => {
    toast({
      title: `❌ ${tCommon('error')}`,
      description: t('paymentProcessingFailed'),
      variant: "destructive",
    });
  };
  
  const triggerInfoToast = () => {
    toast({
      title: `ℹ️ ${tCommon('information')}`,
      description: t('inventoryItemsAdded'),
      variant: "default",
    });
  };
  
  const triggerMultipleToasts = () => {
    // Trigger multiple toasts to test stacking
    setTimeout(() => {
      toast({
        title: `📦 ${t('orderReceived')}`,
        description: t('orderBeingPrepared'),
      });
    }, 0);
    
    setTimeout(() => {
      toast({
        title: `🚚 ${t('shipmentUpdate')}`,
        description: t('shipmentOutForDelivery'),
      });
    }, 100);
    
    setTimeout(() => {
      toast({
        title: `✨ ${t('newFeature')}`,
        description: t('checkNewDashboard'),
      });
    }, 200);
    
    setTimeout(() => {
      toast({
        title: `⚠️ ${t('lowStockAlert')}`,
        description: t('productRunningLowStock'),
        variant: "destructive",
      });
    }, 300);
  };

  // Dashboard data with optimized caching settings to reduce unnecessary requests
  const { data: metrics, isLoading: metricsLoading } = useQuery<DashboardMetrics>({
    queryKey: ['/api/dashboard/metrics'],
    staleTime: 60 * 1000, // 60 seconds - metrics are cached on backend
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false, // Prevent refetch on component mount
  });

  const { data: financialSummary, isLoading: summaryLoading } = useQuery<FinancialSummaryItem[]>({
    queryKey: ['/api/dashboard/financial-summary'],
    staleTime: 60 * 1000, // 60 seconds - summary is cached on backend
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false, // Prevent refetch on component mount
  });

  const { data: activities, isLoading: activitiesLoading } = useQuery<Activity[]>({
    queryKey: ['/api/dashboard/activities'],
    staleTime: 30 * 1000, // 30 seconds - activities are cached on backend
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false, // Prevent refetch on component mount
  });

  const { data: unpaidOrders, isLoading: unpaidLoading } = useQuery<UnpaidOrder[]>({
    queryKey: ['/api/orders/unpaid'],
    staleTime: 60 * 1000, // 60 seconds
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false, // Prevent refetch on component mount
  });

  const { data: lowStockProducts, isLoading: lowStockLoading } = useQuery<LowStockProduct[]>({
    queryKey: ['/api/products/low-stock'],
    staleTime: 60 * 1000, // 60 seconds - low stock is cached on backend
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false, // Prevent refetch on component mount
  });

  // Show skeleton loading state for dashboard
  if (metricsLoading && !metrics) {
    return (
      <div className="space-y-4 sm:space-y-6 lg:space-y-8 animate-in fade-in-50 duration-500">
        {/* Skeleton Metrics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
          {[...Array(4)].map((_, i) => (
            <MetricCardSkeleton key={i} />
          ))}
        </div>
        {/* Skeleton Monthly Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
          {[...Array(4)].map((_, i) => (
            <MetricCardSkeleton key={i} />
          ))}
        </div>
        {/* Skeleton Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartSkeleton />
          <ChartSkeleton />
        </div>
        <ChartSkeleton />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 lg:space-y-8 p-2 sm:p-4 md:p-6 overflow-x-hidden">
      {/* Test Notification System - Remove in production */}
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/30 dark:to-purple-900/30 border-blue-200 dark:border-blue-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Bell className="h-5 w-5" />
            {t('testNotificationSystem')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{t('clickButtonsToTest')}</p>
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
            <Button
              onClick={triggerSuccessToast}
              className="bg-green-600 hover:bg-green-700 w-full sm:w-auto"
              size="sm"
              data-testid="button-success-toast"
            >
              <CheckCircle2 className="h-4 w-4 mr-1" />
              {tCommon('success')}
            </Button>
            <Button
              onClick={triggerErrorToast}
              variant="destructive"
              className="w-full sm:w-auto"
              size="sm"
              data-testid="button-error-toast"
            >
              <AlertCircle className="h-4 w-4 mr-1" />
              {tCommon('error')}
            </Button>
            <Button
              onClick={triggerInfoToast}
              className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto"
              size="sm"
              data-testid="button-info-toast"
            >
              <Info className="h-4 w-4 mr-1" />
              {tCommon('information')}
            </Button>
            <Button
              onClick={triggerMultipleToasts}
              variant="outline"
              className="w-full sm:w-auto"
              size="sm"
              data-testid="button-multiple-toasts"
            >
              <Bell className="h-4 w-4 mr-1" />
              {t('trigger4Toasts')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
        {/* Fulfill Orders Today */}
        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-mobile-sm font-medium text-slate-600 dark:text-slate-400">{t('ordersToFulfill')}</p>
                <p className="text-mobile-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">
                  {metrics?.fulfillOrdersToday || 0}+
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{t('ordersToFulfill')}</p>
              </div>
              <div className="p-2 sm:p-3 bg-emerald-100 rounded-lg ml-4">
                <Truck className="h-5 w-5 sm:h-6 sm:w-6 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Total Orders Today */}
        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-mobile-sm font-medium text-slate-600 dark:text-slate-400">{t('totalOrders')}</p>
                <p className="text-mobile-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">
                  {metrics?.totalOrdersToday || 0}+
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{t('shippedToday')}</p>
              </div>
              <div className="p-2 sm:p-3 bg-blue-100 rounded-lg ml-4">
                <Package className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Total Revenue Today */}
        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-mobile-sm font-medium text-slate-600 dark:text-slate-400">{t('totalRevenue')}</p>
                <p className="text-mobile-xl font-bold text-slate-900 dark:text-slate-100 mt-1 break-all">
                  {formatCurrency(metrics?.totalRevenueToday || 0, 'EUR')}
                </p>
                <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">{t('todayIncrease', { percent: '10' })}</p>
              </div>
              <div className="p-2 sm:p-3 bg-green-100 rounded-lg ml-4">
                <Euro className="h-5 w-5 sm:h-6 sm:w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Total Profit Today */}
        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-mobile-sm font-medium text-slate-600 dark:text-slate-400">{t('totalProfit')}</p>
                <p className="text-mobile-xl font-bold text-slate-900 dark:text-slate-100 mt-1 break-all">
                  {formatCurrency(metrics?.totalProfitToday || 0, 'EUR')}
                </p>
                <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">{t('todayIncrease', { percent: '15' })} 🏆</p>
              </div>
              <div className="p-2 sm:p-3 bg-yellow-100 rounded-lg ml-4">
                <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      {/* Monthly Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
        <Card>
          <CardContent className="p-4 sm:p-6">
            <p className="text-mobile-sm font-medium text-slate-600 dark:text-slate-400">{t('thisMonthTotalRevenue')}</p>
            <p className="text-mobile-xl font-bold text-slate-900 dark:text-slate-100 mt-1 break-all">
              {formatCurrency(metrics?.thisMonthRevenue || 0, 'EUR')}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{t('allCurrenciesConverted')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400">{t('thisMonthTotalProfit')}</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {formatCurrency(metrics?.thisMonthProfit || 0, 'EUR')}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{t('allCurrenciesConverted')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400">{t('lastMonthTotalRevenue')}</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {formatCurrency(metrics?.lastMonthRevenue || 0, 'EUR')}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{t('allCurrenciesConverted')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400">{t('lastMonthTotalProfit')}</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {formatCurrency(metrics?.lastMonthProfit || 0, 'EUR')}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{t('allCurrenciesConverted')}</p>
          </CardContent>
        </Card>
      </div>
      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>{t('revenueAndProfit')}</CardTitle>
            <select className="text-sm border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 rounded px-3 py-1">
              <option>{tCommon('year')}</option>
              <option>{tCommon('month')}</option>
              <option>{tCommon('week')}</option>
            </select>
          </CardHeader>
          <CardContent>
            <Suspense fallback={<ChartSkeleton />}>
              <RevenueChart />
            </Suspense>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>{tFinancial('totalExpenses')}</CardTitle>
            <select className="text-sm border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 rounded px-3 py-1">
              <option>{t('thisYear')}</option>
              <option>{t('lastYear')}</option>
            </select>
          </CardHeader>
          <CardContent>
            <Suspense fallback={<ChartSkeleton />}>
              <ExpensesChart />
            </Suspense>
          </CardContent>
        </Card>
      </div>
      {/* Yearly Report Chart */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{t('yearlyReport')}</CardTitle>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-blue-800 rounded"></div>
              <span className="text-sm text-slate-600 dark:text-slate-400">{t('purchased')}</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-blue-400 rounded"></div>
              <span className="text-sm text-slate-600 dark:text-slate-400">{t('soldAmount')}</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<ChartSkeleton />}>
            <YearlyChart />
          </Suspense>
        </CardContent>
      </Card>
      {/* Data Tables Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Unpaid Orders */}
        <Card>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-mobile-lg">{t('unpaidOrders')}</CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
            {unpaidLoading ? (
              <div className="space-y-2 animate-in fade-in-50 duration-500">
                {/* Mobile Card Skeleton */}
                <div className="block sm:hidden space-y-4">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="p-4 border rounded-lg space-y-2">
                      <div className="flex items-center justify-between">
                        <Skeleton className="h-8 w-8 rounded-full" />
                        <Skeleton className="h-6 w-20 rounded" />
                      </div>
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-6 w-24" />
                    </div>
                  ))}
                </div>
                {/* Desktop Table Skeleton */}
                <div className="hidden sm:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{tCommon('customerName')}</TableHead>
                        <TableHead>{tCommon('orderID')}</TableHead>
                        <TableHead>{tCommon('orderDate')}</TableHead>
                        <TableHead>{tCommon('orderValue')}</TableHead>
                        <TableHead>{tCommon('status')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {[...Array(4)].map((_, i) => (
                        <TableRowSkeleton key={i} />
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            ) : (
              <>
                {/* Mobile Card View */}
                <MobileCardView
                  items={unpaidOrders?.slice(0, 4) || []}
                  renderCard={(order) => (
                    <div key={order.id} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="text-xs">
                              {order.customer?.name?.[0] || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium text-mobile-base">{order.customer?.name || tCommon('unknown')}</span>
                        </div>
                        <Badge variant={order.paymentStatus === 'pay_later' ? 'default' : 'secondary'} className="text-xs">
                          {order.paymentStatus === 'pay_later' ? 'Pay Later' : 'Pending'}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-mobile-sm">
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">Order ID:</span>
                          <p className="font-medium">{order.orderId}</p>
                        </div>
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">Date:</span>
                          <p className="font-medium">{formatDate(order.createdAt)}</p>
                        </div>
                      </div>
                      <div className="pt-2 border-t dark:border-slate-700">
                        <span className="text-gray-500 dark:text-gray-400 text-mobile-sm">Order Value:</span>
                        <p className="font-semibold text-mobile-lg">{formatCurrency(parseFloat(order.grandTotal), order.currency)}</p>
                      </div>
                    </div>
                  )}
                />
                {/* Desktop Table View */}
                <div className="hidden sm:block overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{tCommon('customerName')}</TableHead>
                        <TableHead>{tCommon('orderID')}</TableHead>
                        <TableHead>{tCommon('orderDate')}</TableHead>
                        <TableHead>{tCommon('orderValue')}</TableHead>
                        <TableHead>{tCommon('status')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {unpaidOrders?.slice(0, 4).map((order) => (
                        <TableRow key={order.id}>
                          <TableCell className="flex items-center space-x-2">
                            <Avatar className="h-6 w-6">
                              <AvatarFallback className="text-xs">
                                {order.customer?.name?.[0] || 'U'}
                              </AvatarFallback>
                            </Avatar>
                            <span>{order.customer?.name || tCommon('unknown')}</span>
                          </TableCell>
                          <TableCell>{order.orderId}</TableCell>
                          <TableCell>
                            {formatDate(order.createdAt)}
                          </TableCell>
                          <TableCell>
                            {formatCurrency(parseFloat(order.grandTotal), order.currency)}
                          </TableCell>
                          <TableCell>
                            <Badge variant={order.paymentStatus === 'pay_later' ? 'default' : 'secondary'}>
                              {order.paymentStatus === 'pay_later' ? tCommon('payLater') : tCommon('pending')}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* User Activities */}
        <Card>
          <CardHeader>
            <CardTitle>{t('userActivities')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {activitiesLoading ? (
                <div className="space-y-4 animate-in fade-in-50 duration-500">
                  {[...Array(5)].map((_, i) => (
                    <ActivitySkeleton key={i} />
                  ))}
                </div>
              ) : (
                activities?.map((activity) => (
                  <div key={activity.id} className="flex items-center space-x-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs">
                        {activity.user?.firstName?.[0]}{activity.user?.lastName?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                        {activity.user?.firstName} {activity.user?.lastName}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{activity.description}</p>
                    </div>
                    <span className="text-xs text-slate-400 dark:text-slate-500">
                      {new Date(activity.createdAt).toLocaleTimeString()}
                    </span>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
      {/* Low in Stock Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{t('lowInStock')}</CardTitle>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-slate-600 dark:text-slate-400">{tCommon('viewAllProducts')}</span>
            <Button variant="outline" size="sm">
              <Filter className="mr-1 h-4 w-4" />
              {tCommon('filter')}
            </Button>
            <Button variant="outline" size="sm">
              <ArrowUpDown className="mr-1 h-4 w-4" />
              {tCommon('sort')}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            {lowStockLoading ? (
              <div className="animate-in fade-in-50 duration-500">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{tCommon('productID')}</TableHead>
                      <TableHead>{tCommon('productName')}</TableHead>
                      <TableHead>{tCommon('category')}</TableHead>
                      <TableHead>{tCommon('sku')}</TableHead>
                      <TableHead>{tCommon('currentStock')}</TableHead>
                      <TableHead>{tCommon('lowStockAlert')}</TableHead>
                      <TableHead>{tCommon('supplier')}</TableHead>
                      <TableHead>{tCommon('status')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[...Array(5)].map((_, i) => (
                      <TableRow key={i}>
                        <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-6 w-20 rounded" /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{tCommon('productID')}</TableHead>
                    <TableHead>{tCommon('productName')}</TableHead>
                    <TableHead>{tCommon('category')}</TableHead>
                    <TableHead>{tCommon('sku')}</TableHead>
                    <TableHead>{tCommon('currentStock')}</TableHead>
                    <TableHead>{tCommon('lowStockAlert')}</TableHead>
                    <TableHead>{tCommon('supplier')}</TableHead>
                    <TableHead>{tCommon('status')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lowStockProducts?.slice(0, 5).map((product) => (
                    <TableRow key={product.id}>
                      <TableCell>#{product.id.slice(-6)}</TableCell>
                      <TableCell>{product.name}</TableCell>
                      <TableCell>{product.category?.name || 'N/A'}</TableCell>
                      <TableCell>{product.sku}</TableCell>
                      <TableCell>{product.quantity}</TableCell>
                      <TableCell>{product.lowStockAlert}</TableCell>
                      <TableCell>{product.supplier?.name || 'N/A'}</TableCell>
                      <TableCell>
                        <Badge variant="destructive">{t('lowInStock')}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </CardContent>
      </Card>
      {/* Monthly Financial Summary Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{t('monthlyFinancialSummary')}</CardTitle>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-slate-600 dark:text-slate-400">{t('allAmountsInEUR')}</span>
            <Button variant="outline" size="sm">
              <Filter className="mr-1 h-4 w-4" />
              {tCommon('filter')}
            </Button>
            <Button variant="outline" size="sm">
              <ArrowUpDown className="mr-1 h-4 w-4" />
              {tCommon('sort')}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            {summaryLoading ? (
              <div className="animate-in fade-in-50 duration-500">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{tCommon('month')}</TableHead>
                      <TableHead>{t('totalProfitEUR')}</TableHead>
                      <TableHead>{t('totalRevenueEUR')}</TableHead>
                      <TableHead>{t('profitCZKOrders')}</TableHead>
                      <TableHead>{t('revenueCZKOrders')}</TableHead>
                      <TableHead>{t('profitEUROrders')}</TableHead>
                      <TableHead>{t('revenueEUROrders')}</TableHead>
                      <TableHead>{t('totalProfitCZK')}</TableHead>
                      <TableHead>{t('totalRevenueCZK')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[...Array(6)].map((_, i) => (
                      <TableRow key={i}>
                        <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Month</TableHead>
                    <TableHead>Total Profit EUR</TableHead>
                    <TableHead>Total Revenue EUR</TableHead>
                    <TableHead>Profit CZK Orders</TableHead>
                    <TableHead>Revenue CZK Orders</TableHead>
                    <TableHead>Profit EUR Orders</TableHead>
                    <TableHead>Revenue EUR Orders</TableHead>
                    <TableHead>Total Profit CZK</TableHead>
                    <TableHead>Total Revenue CZK</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {financialSummary?.filter((month) => month.orderCount > 0 || new Date().getFullYear() === parseInt('20' + month.month.split('-')[1])).map((month) => (
                    <TableRow key={month.month}>
                      <TableCell>{month.month}</TableCell>
                      <TableCell>{formatCurrency(month.totalProfitEur || 0, 'EUR')}</TableCell>
                      <TableCell>{formatCurrency(month.totalRevenueEur || 0, 'EUR')}</TableCell>
                      <TableCell>{formatCurrency(month.profitCzkOrders || 0, 'CZK')}</TableCell>
                      <TableCell>{formatCurrency(month.revenueCzkOrders || 0, 'CZK')}</TableCell>
                      <TableCell>{formatCurrency(month.profitEurOrders || 0, 'EUR')}</TableCell>
                      <TableCell>{formatCurrency(month.revenueEurOrders || 0, 'EUR')}</TableCell>
                      <TableCell>{formatCurrency(month.totalProfitCzk || 0, 'CZK')}</TableCell>
                      <TableCell>{formatCurrency(month.totalRevenueCzk || 0, 'CZK')}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
