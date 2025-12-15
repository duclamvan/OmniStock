import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { 
  Package, 
  ShoppingCart, 
  TrendingUp, 
  AlertTriangle, 
  Truck, 
  Users,
  Clock,
  XCircle,
  Plus,
  PackageCheck,
  DollarSign,
  ClipboardCheck,
  ChevronRight,
  Target,
  BarChart3,
  Layers,
  ClipboardList,
  Activity,
  Zap,
  CircleDollarSign,
  Wallet,
  BadgeCheck,
  PackageOpen,
  UserCheck
} from "lucide-react";
import { Link } from "wouter";
import { useLocalization } from "@/contexts/LocalizationContext";
import { useTranslation } from 'react-i18next';

interface DashboardMetrics {
  fulfillOrdersToday: number;
  totalOrdersToday: number;
  totalRevenueToday: number;
  totalProfitToday: number;
  thisMonthRevenue: number;
  thisMonthProfit: number;
}

interface LowStockProduct {
  id: string;
  name: string;
  sku: string;
  quantity: number;
  lowStockAlert: number;
}

interface RecentOrder {
  id: string;
  orderId: string;
  customer?: { 
    name?: string;
    imageUrl?: string;
  };
  orderStatus: string;
  paymentStatus?: string;
  grandTotal: string;
  totalCost?: string;
  currency: string;
  createdAt: string;
}

interface OrderStatusCounts {
  pending: number;
  to_fulfill: number;
  picking: number;
  packed: number;
  shipped: number;
  delivered: number;
  cancelled: number;
}

interface RecentlyReceivedData {
  products: string[];
  receivedAt: string | null;
  count: number;
}

interface ActivityLog {
  id: number;
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  description: string;
  createdAt: string;
  user?: {
    firstName?: string;
    lastName?: string;
    profileImageUrl?: string;
  };
}

export default function Home() {
  const { t } = useTranslation(['common', 'dashboard']);
  const { formatCurrency, formatDate } = useLocalization();
  
  const { data: metrics, isLoading: metricsLoading } = useQuery<DashboardMetrics>({
    queryKey: ['/api/dashboard/metrics'],
  });

  const { data: lowStockProducts = [], isLoading: stockLoading } = useQuery<LowStockProduct[]>({
    queryKey: ['/api/products/low-stock'],
  });

  const { data: recentOrders = [], isLoading: ordersLoading } = useQuery<RecentOrder[]>({
    queryKey: ['/api/orders'],
  });

  const { data: unpaidOrders = [] } = useQuery<any[]>({
    queryKey: ['/api/orders/unpaid'],
  });

  const { data: stockAdjustmentRequests = [] } = useQuery<any[]>({
    queryKey: ['/api/stock-adjustment-requests'],
    staleTime: 0,
    refetchInterval: 30000,
  });

  const { data: shipmentsToReceive = [] } = useQuery<any[]>({
    queryKey: ['/api/imports/shipments/to-receive'],
  });

  const { data: shipmentsReceiving = [] } = useQuery<any[]>({
    queryKey: ['/api/imports/shipments/receiving'],
  });

  const { data: customers = [] } = useQuery<any[]>({
    queryKey: ['/api/customers'],
  });

  const { data: products = [] } = useQuery<any[]>({
    queryKey: ['/api/products'],
  });

  const { data: recentlyReceived, isLoading: receivedLoading } = useQuery<RecentlyReceivedData>({
    queryKey: ['/api/dashboard/recently-received'],
  });

  const { data: activities = [], isLoading: activitiesLoading } = useQuery<ActivityLog[]>({
    queryKey: ['/api/dashboard/activities', 5],
  });

  const pendingAdjustments = stockAdjustmentRequests.filter(req => req.status === 'pending');
  const pendingReceivingCount = (shipmentsToReceive?.length || 0) + (shipmentsReceiving?.length || 0);

  const orderStatusCounts: OrderStatusCounts = {
    pending: recentOrders.filter((o: RecentOrder) => o.orderStatus === 'pending').length,
    to_fulfill: recentOrders.filter((o: RecentOrder) => o.orderStatus === 'to_fulfill').length,
    picking: recentOrders.filter((o: RecentOrder) => o.orderStatus === 'picking').length,
    packed: recentOrders.filter((o: RecentOrder) => o.orderStatus === 'packed').length,
    shipped: recentOrders.filter((o: RecentOrder) => o.orderStatus === 'shipped').length,
    delivered: recentOrders.filter((o: RecentOrder) => o.orderStatus === 'delivered').length,
    cancelled: recentOrders.filter((o: RecentOrder) => o.orderStatus === 'cancelled').length,
  };

  const isToday = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    return date.getFullYear() === today.getFullYear() &&
           date.getMonth() === today.getMonth() &&
           date.getDate() === today.getDate();
  };

  const todayOrders = recentOrders.filter((o: RecentOrder) => isToday(o.createdAt));
  
  const todayStatusCounts = {
    to_fulfill: todayOrders.filter((o: RecentOrder) => o.orderStatus === 'to_fulfill').length,
    picking: todayOrders.filter((o: RecentOrder) => o.orderStatus === 'picking').length,
    packed: todayOrders.filter((o: RecentOrder) => o.orderStatus === 'packed').length,
    shipped: todayOrders.filter((o: RecentOrder) => o.orderStatus === 'shipped').length,
  };

  const paidOrders = recentOrders.filter((o: RecentOrder) => o.paymentStatus === 'paid');
  const paymentRate = recentOrders.length > 0 ? (paidOrders.length / recentOrders.length) * 100 : 0;

  const totalUnpaidAmount = Array.isArray(unpaidOrders) 
    ? unpaidOrders.reduce((sum, order) => sum + parseFloat(order.grandTotal || '0'), 0) 
    : 0;

  const fulfilledOrders = recentOrders.filter((o: RecentOrder) => ['shipped', 'delivered'].includes(o.orderStatus));
  const fulfillmentRate = recentOrders.length > 0 ? (fulfilledOrders.length / recentOrders.length) * 100 : 0;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200';
      case 'to_fulfill': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'picking': return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200';
      case 'packed': return 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200';
      case 'shipped': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'delivered': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'cancelled': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    }
  };

  const profitMargin = metrics && metrics.thisMonthRevenue > 0 
    ? ((metrics.thisMonthProfit / metrics.thisMonthRevenue) * 100).toFixed(1) 
    : '0';

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return t('dashboard:justNow');
    if (diffMins < 60) return t('dashboard:minutesAgo', { count: diffMins });
    if (diffHours < 24) return t('dashboard:hoursAgo', { count: diffHours });
    return t('dashboard:daysAgo', { count: diffDays });
  };

  const getActionText = (action: string) => {
    const actionKey = `dashboard:action_${action}`;
    return t(actionKey, action);
  };

  const getEntityText = (entityType: string) => {
    const entityKey = `dashboard:entity_${entityType}`;
    return t(entityKey, entityType);
  };

  return (
    <div className="w-full max-w-full overflow-x-hidden space-y-3 sm:space-y-4 md:space-y-6 px-1 sm:px-0">
      {/* Header with Quick Actions */}
      <div className="flex flex-col gap-3 sm:gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          <h1 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-gray-100 truncate">
            {t('dashboard:title')}
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 sm:mt-1 line-clamp-2">
            {t('dashboard:subtitle')}
          </p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
          <Link href="/orders/add" className="flex-1 sm:flex-initial">
            <Button size="sm" className="w-full sm:w-auto min-h-[40px] sm:min-h-[44px] text-xs sm:text-sm" data-testid="button-new-order">
              <Plus className="h-4 w-4 mr-1.5 sm:mr-2 shrink-0" />
              <span className="truncate">{t('newOrder')}</span>
            </Button>
          </Link>
          <Link href="/orders/pick-pack" className="flex-1 sm:flex-initial">
            <Button size="sm" variant="outline" className="w-full sm:w-auto min-h-[40px] sm:min-h-[44px] text-xs sm:text-sm" data-testid="button-pick-pack">
              <PackageCheck className="h-4 w-4 mr-1.5 sm:mr-2 shrink-0" />
              <span className="truncate">{t('pickAndPack')}</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Critical Alerts Banner */}
      {(pendingAdjustments.length > 0 || lowStockProducts.length > 5) && (
        <Card className="bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950/30 dark:to-amber-950/30 border-orange-200 dark:border-orange-800">
          <CardContent className="p-3 sm:p-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="p-1.5 sm:p-2 bg-orange-100 dark:bg-orange-900/50 rounded-lg shrink-0">
                  <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-orange-600 dark:text-orange-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 dark:text-white text-xs sm:text-sm">
                    {t('dashboard:attentionRequired')}
                  </p>
                  <p className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400 truncate">
                    {pendingAdjustments.length > 0 && `${pendingAdjustments.length} ${t('dashboard:pendingApprovals')}`}
                    {pendingAdjustments.length > 0 && lowStockProducts.length > 5 && ' • '}
                    {lowStockProducts.length > 5 && `${lowStockProducts.length} ${t('dashboard:lowStockItems')}`}
                  </p>
                </div>
              </div>
              {pendingAdjustments.length > 0 && (
                <Link href="/stock/approvals" className="w-full sm:w-auto shrink-0">
                  <Button size="sm" variant="outline" className="w-full sm:w-auto min-h-[36px] text-xs sm:text-sm" data-testid="button-view-approvals">
                    {t('dashboard:reviewApprovals')}
                  </Button>
                </Link>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Executive Summary - Key Metrics Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
        {/* Today's Revenue */}
        <Card className="relative overflow-hidden">
          <CardContent className="p-3 sm:p-4 md:p-5">
            {metricsLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-3 sm:h-4 w-16 sm:w-20" />
                <Skeleton className="h-6 sm:h-8 w-20 sm:w-28" />
              </div>
            ) : (
              <>
                <div className="flex items-start sm:items-center justify-between mb-1.5 sm:mb-2 gap-1">
                  <p className="text-[10px] sm:text-xs md:text-sm font-medium text-muted-foreground leading-tight">{t('dashboard:todayRevenue')}</p>
                  <div className="p-1 sm:p-1.5 bg-emerald-100 dark:bg-emerald-900/50 rounded-md sm:rounded-lg shrink-0">
                    <DollarSign className="h-3 w-3 sm:h-4 sm:w-4 text-emerald-600 dark:text-emerald-400" />
                  </div>
                </div>
                <p className="text-base sm:text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-100 truncate">
                  {formatCurrency(metrics?.totalRevenueToday || 0, 'EUR')}
                </p>
                <div className="flex items-center gap-1 mt-1">
                  <TrendingUp className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-emerald-500 shrink-0" />
                  <span className="text-[9px] sm:text-xs text-emerald-600 dark:text-emerald-400 font-medium truncate">
                    {formatCurrency(metrics?.totalProfitToday || 0, 'EUR')} {t('dashboard:profit')}
                  </span>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Orders to Fulfill */}
        <Card className="relative overflow-hidden">
          <CardContent className="p-3 sm:p-4 md:p-5">
            {metricsLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-3 sm:h-4 w-16 sm:w-20" />
                <Skeleton className="h-6 sm:h-8 w-12 sm:w-16" />
              </div>
            ) : (
              <>
                <div className="flex items-start sm:items-center justify-between mb-1.5 sm:mb-2 gap-1">
                  <p className="text-[10px] sm:text-xs md:text-sm font-medium text-muted-foreground leading-tight">{t('dashboard:toFulfill')}</p>
                  <div className="p-1 sm:p-1.5 bg-blue-100 dark:bg-blue-900/50 rounded-md sm:rounded-lg shrink-0">
                    <PackageCheck className="h-3 w-3 sm:h-4 sm:w-4 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>
                <p className="text-base sm:text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {metrics?.fulfillOrdersToday || 0}
                </p>
                <div className="flex items-center gap-1 mt-1">
                  <ShoppingCart className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-blue-500 shrink-0" />
                  <span className="text-[9px] sm:text-xs text-muted-foreground truncate">
                    {t('dashboard:ofTotal', { count: metrics?.totalOrdersToday || 0 })}
                  </span>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Fulfillment Rate */}
        <Card className="relative overflow-hidden">
          <CardContent className="p-3 sm:p-4 md:p-5">
            <div className="flex items-start sm:items-center justify-between mb-1.5 sm:mb-2 gap-1">
              <p className="text-[10px] sm:text-xs md:text-sm font-medium text-muted-foreground leading-tight">{t('dashboard:fulfillmentRate')}</p>
              <div className="p-1 sm:p-1.5 bg-purple-100 dark:bg-purple-900/50 rounded-md sm:rounded-lg shrink-0">
                <Target className="h-3 w-3 sm:h-4 sm:w-4 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
            <p className="text-base sm:text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-100">
              {fulfillmentRate.toFixed(0)}%
            </p>
            <Progress value={fulfillmentRate} className="h-1 sm:h-1.5 mt-1.5 sm:mt-2" />
          </CardContent>
        </Card>

        {/* Profit Margin */}
        <Card className="relative overflow-hidden">
          <CardContent className="p-3 sm:p-4 md:p-5">
            {metricsLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-3 sm:h-4 w-16 sm:w-20" />
                <Skeleton className="h-6 sm:h-8 w-12 sm:w-16" />
              </div>
            ) : (
              <>
                <div className="flex items-start sm:items-center justify-between mb-1.5 sm:mb-2 gap-1">
                  <p className="text-[10px] sm:text-xs md:text-sm font-medium text-muted-foreground leading-tight">{t('dashboard:profitMargin')}</p>
                  <div className="p-1 sm:p-1.5 bg-cyan-100 dark:bg-cyan-900/50 rounded-md sm:rounded-lg shrink-0">
                    <BarChart3 className="h-3 w-3 sm:h-4 sm:w-4 text-cyan-600 dark:text-cyan-400" />
                  </div>
                </div>
                <p className="text-base sm:text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {profitMargin}%
                </p>
                <div className="flex items-center gap-1 mt-1">
                  <span className="text-[9px] sm:text-xs text-muted-foreground">
                    {t('dashboard:thisMonth')}
                  </span>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Main Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
        
        {/* Left Column - Orders & Operations */}
        <div className="lg:col-span-2 space-y-3 sm:space-y-4 md:space-y-6">
          
          {/* Pick & Pack Flow */}
          <Card className="overflow-hidden">
            <CardHeader className="p-3 sm:p-4 md:p-6 pb-2 sm:pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="min-w-0">
                  <CardTitle className="text-sm sm:text-base md:text-lg flex items-center gap-1.5 sm:gap-2">
                    <PackageCheck className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 shrink-0" />
                    <span className="truncate">{t('dashboard:pickPackFlow')}</span>
                  </CardTitle>
                  <CardDescription className="text-[10px] sm:text-xs md:text-sm mt-0.5 sm:mt-1 line-clamp-1">
                    {t('dashboard:todaysOrders')}
                  </CardDescription>
                </div>
                <Link href="/orders/pick-pack" className="shrink-0">
                  <Button variant="ghost" size="sm" className="h-8 sm:min-h-[36px] text-xs sm:text-sm px-2 sm:px-3" data-testid="button-view-all-orders">
                    {t('viewAll')}
                    <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4 ml-0.5 sm:ml-1" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 md:p-6 pt-0">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2 md:gap-3">
                <Link href="/orders?status=to_fulfill" className="block">
                  <div className="text-center p-2 sm:p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors cursor-pointer" data-testid="pipeline-to-fulfill">
                    <p className="text-lg sm:text-2xl md:text-3xl font-bold text-blue-600 dark:text-blue-400">{todayStatusCounts.to_fulfill}</p>
                    <p className="text-[10px] sm:text-xs text-blue-700 dark:text-blue-300 mt-0.5 sm:mt-1 truncate">{t('dashboard:toFulfillStatus')}</p>
                  </div>
                </Link>
                <Link href="/orders?status=picking" className="block">
                  <div className="text-center p-2 sm:p-3 rounded-lg bg-indigo-50 dark:bg-indigo-950/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors cursor-pointer" data-testid="pipeline-picking">
                    <p className="text-lg sm:text-2xl md:text-3xl font-bold text-indigo-600 dark:text-indigo-400">{todayStatusCounts.picking}</p>
                    <p className="text-[10px] sm:text-xs text-indigo-700 dark:text-indigo-300 mt-0.5 sm:mt-1 truncate">{t('dashboard:picking')}</p>
                  </div>
                </Link>
                <Link href="/orders?status=packed" className="block">
                  <div className="text-center p-2 sm:p-3 rounded-lg bg-cyan-50 dark:bg-cyan-950/30 hover:bg-cyan-100 dark:hover:bg-cyan-900/50 transition-colors cursor-pointer" data-testid="pipeline-packed">
                    <p className="text-lg sm:text-2xl md:text-3xl font-bold text-cyan-600 dark:text-cyan-400">{todayStatusCounts.packed}</p>
                    <p className="text-[10px] sm:text-xs text-cyan-700 dark:text-cyan-300 mt-0.5 sm:mt-1 truncate">{t('dashboard:packed')}</p>
                  </div>
                </Link>
                <Link href="/orders?status=shipped" className="block">
                  <div className="text-center p-2 sm:p-3 rounded-lg bg-purple-50 dark:bg-purple-950/30 hover:bg-purple-100 dark:hover:bg-purple-900/50 transition-colors cursor-pointer" data-testid="pipeline-shipped">
                    <p className="text-lg sm:text-2xl md:text-3xl font-bold text-purple-600 dark:text-purple-400">{todayStatusCounts.shipped}</p>
                    <p className="text-[10px] sm:text-xs text-purple-700 dark:text-purple-300 mt-0.5 sm:mt-1 truncate">{t('dashboard:shipped')}</p>
                  </div>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Payments & Financial Health */}
          <Card className="overflow-hidden">
            <CardHeader className="p-3 sm:p-4 md:p-6 pb-2 sm:pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="min-w-0">
                  <CardTitle className="text-sm sm:text-base md:text-lg flex items-center gap-1.5 sm:gap-2">
                    <Wallet className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 shrink-0" />
                    <span className="truncate">{t('dashboard:paymentsFinancial')}</span>
                  </CardTitle>
                  <CardDescription className="text-[10px] sm:text-xs md:text-sm mt-0.5 sm:mt-1 line-clamp-1">
                    {t('dashboard:paymentsFinancialDesc')}
                  </CardDescription>
                </div>
                <Link href="/orders/pay-later" className="shrink-0">
                  <Button variant="ghost" size="sm" className="h-8 sm:min-h-[36px] text-xs sm:text-sm px-2 sm:px-3" data-testid="button-view-unpaid">
                    {t('dashboard:viewUnpaid')}
                    <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4 ml-0.5 sm:ml-1" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 md:p-6 pt-0">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
                {/* Payment Rate */}
                <div className="p-2.5 sm:p-3 md:p-4 rounded-lg bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30">
                  <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
                    <BadgeCheck className="h-3 w-3 sm:h-4 sm:w-4 text-green-600 shrink-0" />
                    <span className="text-[10px] sm:text-xs font-medium text-green-700 dark:text-green-300 truncate">{t('dashboard:paymentRate')}</span>
                  </div>
                  <p className="text-lg sm:text-xl md:text-2xl font-bold text-green-600 dark:text-green-400">{paymentRate.toFixed(0)}%</p>
                  <Progress value={paymentRate} className="h-1 sm:h-1.5 mt-1.5 sm:mt-2" />
                </div>

                {/* Unpaid Orders */}
                <div className="p-2.5 sm:p-3 md:p-4 rounded-lg bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-950/30 dark:to-orange-950/30">
                  <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
                    <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-red-600 shrink-0" />
                    <span className="text-[10px] sm:text-xs font-medium text-red-700 dark:text-red-300 truncate">{t('dashboard:unpaidOrders')}</span>
                  </div>
                  <p className="text-lg sm:text-xl md:text-2xl font-bold text-red-600 dark:text-red-400">
                    {Array.isArray(unpaidOrders) ? unpaidOrders.length : 0}
                  </p>
                  <p className="text-[9px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1 truncate">{t('dashboard:ordersAwaiting')}</p>
                </div>

                {/* Outstanding Amount */}
                <div className="p-2.5 sm:p-3 md:p-4 rounded-lg bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-950/30 dark:to-yellow-950/30">
                  <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
                    <CircleDollarSign className="h-3 w-3 sm:h-4 sm:w-4 text-amber-600 shrink-0" />
                    <span className="text-[10px] sm:text-xs font-medium text-amber-700 dark:text-amber-300 truncate">{t('dashboard:outstanding')}</span>
                  </div>
                  <p className="text-base sm:text-lg md:text-xl font-bold text-amber-600 dark:text-amber-400 truncate">
                    {formatCurrency(totalUnpaidAmount, 'EUR')}
                  </p>
                  <p className="text-[9px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1 truncate">{t('dashboard:toCollect')}</p>
                </div>

                {/* Monthly Revenue */}
                <div className="p-2.5 sm:p-3 md:p-4 rounded-lg bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30">
                  <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
                    <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-blue-600 shrink-0" />
                    <span className="text-[10px] sm:text-xs font-medium text-blue-700 dark:text-blue-300 truncate">{t('dashboard:monthRevenue')}</span>
                  </div>
                  <p className="text-base sm:text-lg md:text-xl font-bold text-blue-600 dark:text-blue-400 truncate">
                    {formatCurrency(metrics?.thisMonthRevenue || 0, 'EUR')}
                  </p>
                  <p className="text-[9px] sm:text-xs text-emerald-600 dark:text-emerald-400 mt-0.5 sm:mt-1 truncate">
                    {formatCurrency(metrics?.thisMonthProfit || 0, 'EUR')} {t('dashboard:profit')}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recent Orders */}
          <Card className="overflow-hidden">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 md:p-6 pb-2 sm:pb-3 gap-2">
              <div className="min-w-0">
                <CardTitle className="text-sm sm:text-base md:text-lg flex items-center gap-1.5 sm:gap-2">
                  <ShoppingCart className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-600 shrink-0" />
                  <span className="truncate">{t('recentOrders')}</span>
                </CardTitle>
                <CardDescription className="text-[10px] sm:text-xs md:text-sm mt-0.5 sm:mt-1 line-clamp-1">
                  {t('dashboard:recentOrdersDesc')}
                </CardDescription>
              </div>
              <Link href="/orders" className="shrink-0">
                <Button variant="ghost" size="sm" className="h-8 sm:min-h-[36px] text-xs sm:text-sm px-2 sm:px-3">
                  {t('viewAll')}
                  <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4 ml-0.5 sm:ml-1" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 md:p-6 pt-0">
              {ordersLoading ? (
                <div className="space-y-2 sm:space-y-3">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-14 sm:h-16 w-full" />)}
                </div>
              ) : recentOrders.length > 0 ? (
                <div className="space-y-1.5 sm:space-y-2">
                  {recentOrders.slice(0, 5).map((order) => (
                    <Link key={order.id} href={`/orders/${order.id}`}>
                      <div className="group flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg border border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer" data-testid={`order-row-${order.id}`}>
                        <Avatar className="h-7 w-7 sm:h-9 sm:w-9 shrink-0">
                          <AvatarImage src={order.customer?.imageUrl} />
                          <AvatarFallback className="bg-gradient-to-br from-blue-500 to-cyan-500 text-white text-[10px] sm:text-xs font-semibold">
                            {(order.customer?.name || 'W').charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0 overflow-hidden">
                          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                            <span className="font-semibold text-xs sm:text-sm text-gray-900 dark:text-white font-mono truncate">{order.orderId}</span>
                            <Badge className={`${getStatusColor(order.orderStatus || 'pending')} text-[8px] sm:text-[10px] px-1 sm:px-1.5 py-0 shrink-0`}>
                              {(order.orderStatus || 'pending').replace(/_/g, ' ')}
                            </Badge>
                          </div>
                          <p className="text-[10px] sm:text-xs text-muted-foreground truncate">
                            {order.customer?.name || t('walkInCustomer')} • {formatDate(order.createdAt)}
                          </p>
                        </div>
                        <div className="text-right shrink-0 min-w-0">
                          <p className="font-bold text-xs sm:text-sm text-gray-900 dark:text-white truncate">
                            {formatCurrency(parseFloat(order.grandTotal), order.currency as any)}
                          </p>
                          {order.totalCost && (
                            <p className="text-[9px] sm:text-[10px] text-emerald-600 dark:text-emerald-400 truncate">
                              +{formatCurrency(parseFloat(order.grandTotal) - parseFloat(order.totalCost), order.currency as any)}
                            </p>
                          )}
                        </div>
                        <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 shrink-0 hidden sm:block" />
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 sm:py-8">
                  <XCircle className="h-8 w-8 sm:h-10 sm:w-10 text-gray-300 mx-auto mb-2 sm:mb-3" />
                  <p className="text-xs sm:text-sm text-muted-foreground">{t('noRecentOrders')}</p>
                  <Link href="/orders/add">
                    <Button variant="outline" size="sm" className="mt-2 sm:mt-3 text-xs sm:text-sm">
                      <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
                      {t('createOrder')}
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Tasks & Insights */}
        <div className="space-y-3 sm:space-y-4 md:space-y-6">
          
          {/* Warehouse Operations Tasks */}
          <Card className="overflow-hidden">
            <CardHeader className="p-3 sm:p-4 md:p-6 pb-2 sm:pb-3">
              <CardTitle className="text-sm sm:text-base md:text-lg flex items-center gap-1.5 sm:gap-2">
                <ClipboardList className="h-4 w-4 sm:h-5 sm:w-5 text-orange-600 shrink-0" />
                <span className="truncate">{t('dashboard:warehouseTasks')}</span>
              </CardTitle>
              <CardDescription className="text-[10px] sm:text-xs md:text-sm line-clamp-1">
                {t('dashboard:warehouseTasksDesc')}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 md:p-6 pt-0 space-y-2 sm:space-y-3">
              {/* Pending Receiving */}
              <Link href="/receiving">
                <div className="flex items-center justify-between p-2.5 sm:p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors cursor-pointer" data-testid="task-receiving">
                  <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                    <div className="p-1.5 sm:p-2 bg-blue-100 dark:bg-blue-900 rounded-lg shrink-0">
                      <Truck className="h-3 w-3 sm:h-4 sm:w-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-xs sm:text-sm text-gray-900 dark:text-white truncate">{t('dashboard:pendingReceiving')}</p>
                      <p className="text-[10px] sm:text-xs text-muted-foreground truncate">{t('dashboard:shipmentsToReceive')}</p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 shrink-0 text-[10px] sm:text-xs">
                    {pendingReceivingCount}
                  </Badge>
                </div>
              </Link>

              {/* Stock Approvals */}
              <Link href="/stock/approvals">
                <div className="flex items-center justify-between p-2.5 sm:p-3 rounded-lg bg-orange-50 dark:bg-orange-950/30 hover:bg-orange-100 dark:hover:bg-orange-900/50 transition-colors cursor-pointer" data-testid="task-approvals">
                  <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                    <div className="p-1.5 sm:p-2 bg-orange-100 dark:bg-orange-900 rounded-lg shrink-0">
                      <ClipboardCheck className="h-3 w-3 sm:h-4 sm:w-4 text-orange-600 dark:text-orange-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-xs sm:text-sm text-gray-900 dark:text-white truncate">{t('dashboard:stockApprovals')}</p>
                      <p className="text-[10px] sm:text-xs text-muted-foreground truncate">{t('dashboard:pendingApprovalDesc')}</p>
                    </div>
                  </div>
                  <Badge variant="secondary" className={`shrink-0 text-[10px] sm:text-xs ${pendingAdjustments.length > 0 ? "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300" : ""}`}>
                    {pendingAdjustments.length}
                  </Badge>
                </div>
              </Link>

              {/* Low Stock */}
              <Link href="/inventory?lowStock=true">
                <div className="flex items-center justify-between p-2.5 sm:p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-colors cursor-pointer" data-testid="task-low-stock">
                  <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                    <div className="p-1.5 sm:p-2 bg-amber-100 dark:bg-amber-900 rounded-lg shrink-0">
                      <AlertTriangle className="h-3 w-3 sm:h-4 sm:w-4 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-xs sm:text-sm text-gray-900 dark:text-white truncate">{t('dashboard:lowStockAlerts')}</p>
                      <p className="text-[10px] sm:text-xs text-muted-foreground truncate">{t('dashboard:needsReorder')}</p>
                    </div>
                  </div>
                  <Badge variant="secondary" className={`shrink-0 text-[10px] sm:text-xs ${lowStockProducts.length > 0 ? "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300" : ""}`}>
                    {lowStockProducts.length}
                  </Badge>
                </div>
              </Link>

              {/* Pick & Pack */}
              <Link href="/orders/pick-pack">
                <div className="flex items-center justify-between p-2.5 sm:p-3 rounded-lg bg-purple-50 dark:bg-purple-950/30 hover:bg-purple-100 dark:hover:bg-purple-900/50 transition-colors cursor-pointer" data-testid="task-pick-pack">
                  <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                    <div className="p-1.5 sm:p-2 bg-purple-100 dark:bg-purple-900 rounded-lg shrink-0">
                      <PackageCheck className="h-3 w-3 sm:h-4 sm:w-4 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-xs sm:text-sm text-gray-900 dark:text-white truncate">{t('dashboard:ordersToPack')}</p>
                      <p className="text-[10px] sm:text-xs text-muted-foreground truncate">{t('dashboard:readyForFulfillment')}</p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300 shrink-0 text-[10px] sm:text-xs">
                    {orderStatusCounts.to_fulfill + orderStatusCounts.picking}
                  </Badge>
                </div>
              </Link>
            </CardContent>
          </Card>

          {/* Recent Receiving */}
          <Card className="overflow-hidden">
            <CardHeader className="p-3 sm:p-4 md:p-6 pb-2 sm:pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="min-w-0">
                  <CardTitle className="text-sm sm:text-base md:text-lg flex items-center gap-1.5 sm:gap-2">
                    <PackageOpen className="h-4 w-4 sm:h-5 sm:w-5 text-teal-600 shrink-0" />
                    <span className="truncate">{t('dashboard:recentReceiving')}</span>
                  </CardTitle>
                  <CardDescription className="text-[10px] sm:text-xs md:text-sm line-clamp-1">
                    {t('dashboard:recentReceivingDesc')}
                  </CardDescription>
                </div>
                <Link href="/receiving" className="shrink-0">
                  <Button variant="ghost" size="sm" className="h-8 sm:min-h-[36px] text-xs sm:text-sm px-2 sm:px-3" data-testid="button-view-receiving">
                    {t('dashboard:viewReceiving')}
                    <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4 ml-0.5 sm:ml-1" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 md:p-6 pt-0">
              {receivedLoading ? (
                <Skeleton className="h-10 sm:h-12 w-full" />
              ) : recentlyReceived && recentlyReceived.products.length > 0 ? (
                <div className="p-2.5 sm:p-3 rounded-lg bg-teal-50 dark:bg-teal-950/30">
                  <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-300">
                    <span className="font-medium text-teal-700 dark:text-teal-400">
                      {t('dashboard:recentlyReceived')}
                    </span>{' '}
                    <span className="line-clamp-2">
                      {recentlyReceived.products.slice(0, 5).join(', ')}
                      {recentlyReceived.products.length > 5 && ` ${t('dashboard:andMore', { count: recentlyReceived.products.length - 5 })}`}
                    </span>
                  </p>
                </div>
              ) : (
                <div className="text-center py-3 sm:py-4">
                  <PackageOpen className="h-6 w-6 sm:h-8 sm:w-8 text-gray-300 mx-auto mb-1.5 sm:mb-2" />
                  <p className="text-xs sm:text-sm text-muted-foreground">{t('dashboard:noRecentReceiving')}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Employee Activity */}
          <Card className="overflow-hidden">
            <CardHeader className="p-3 sm:p-4 md:p-6 pb-2 sm:pb-3">
              <CardTitle className="text-sm sm:text-base md:text-lg flex items-center gap-1.5 sm:gap-2">
                <UserCheck className="h-4 w-4 sm:h-5 sm:w-5 text-indigo-600 shrink-0" />
                <span className="truncate">{t('dashboard:employeeActivity')}</span>
              </CardTitle>
              <CardDescription className="text-[10px] sm:text-xs md:text-sm line-clamp-1">
                {t('dashboard:employeeActivityDesc')}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 md:p-6 pt-0">
              {activitiesLoading ? (
                <div className="space-y-1.5 sm:space-y-2">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-10 sm:h-12 w-full" />)}
                </div>
              ) : activities.length > 0 ? (
                <div className="space-y-1.5 sm:space-y-2">
                  {activities.slice(0, 5).map((activity) => (
                    <div key={activity.id} className="flex items-center gap-2 sm:gap-3 p-1.5 sm:p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors" data-testid={`activity-row-${activity.id}`}>
                      <Avatar className="h-6 w-6 sm:h-8 sm:w-8 shrink-0">
                        <AvatarImage src={activity.user?.profileImageUrl} />
                        <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-500 text-white text-[10px] sm:text-xs font-semibold">
                          {(activity.user?.firstName || 'U').charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0 overflow-hidden">
                        <p className="text-xs sm:text-sm text-gray-900 dark:text-white truncate">
                          <span className="font-medium">
                            {activity.user?.firstName || 'User'}
                          </span>{' '}
                          <span className="text-muted-foreground">
                            {getActionText(activity.action)} {getEntityText(activity.entityType)}
                          </span>
                        </p>
                        <p className="text-[10px] sm:text-xs text-muted-foreground truncate">
                          {activity.entityId}
                        </p>
                      </div>
                      <span className="text-[9px] sm:text-xs text-muted-foreground shrink-0 whitespace-nowrap">
                        {formatTimeAgo(activity.createdAt)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-3 sm:py-4">
                  <UserCheck className="h-6 w-6 sm:h-8 sm:w-8 text-gray-300 mx-auto mb-1.5 sm:mb-2" />
                  <p className="text-xs sm:text-sm text-muted-foreground">{t('dashboard:noRecentActivity')}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Business Insights */}
          <Card className="overflow-hidden">
            <CardHeader className="p-3 sm:p-4 md:p-6 pb-2 sm:pb-3">
              <CardTitle className="text-sm sm:text-base md:text-lg flex items-center gap-1.5 sm:gap-2">
                <Activity className="h-4 w-4 sm:h-5 sm:w-5 text-cyan-600 shrink-0" />
                <span className="truncate">{t('dashboard:businessInsights')}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 md:p-6 pt-0 space-y-3 sm:space-y-4">
              {/* Customer Stats */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                  <Users className="h-3 w-3 sm:h-4 sm:w-4 text-blue-500 shrink-0" />
                  <span className="text-xs sm:text-sm text-muted-foreground truncate">{t('dashboard:totalCustomers')}</span>
                </div>
                <span className="font-bold text-gray-900 dark:text-white text-xs sm:text-sm shrink-0">{customers.length}</span>
              </div>
              
              <Separator />
              
              {/* Product Stats */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                  <Package className="h-3 w-3 sm:h-4 sm:w-4 text-purple-500 shrink-0" />
                  <span className="text-xs sm:text-sm text-muted-foreground truncate">{t('dashboard:totalProducts')}</span>
                </div>
                <span className="font-bold text-gray-900 dark:text-white text-xs sm:text-sm shrink-0">{products.length}</span>
              </div>
              
              <Separator />
              
              {/* Total Orders */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                  <ShoppingCart className="h-3 w-3 sm:h-4 sm:w-4 text-emerald-500 shrink-0" />
                  <span className="text-xs sm:text-sm text-muted-foreground truncate">{t('dashboard:ordersThisMonth')}</span>
                </div>
                <span className="font-bold text-gray-900 dark:text-white text-xs sm:text-sm shrink-0">{recentOrders.length}</span>
              </div>
              
              <Separator />
              
              {/* Avg Order Value */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                  <DollarSign className="h-3 w-3 sm:h-4 sm:w-4 text-green-500 shrink-0" />
                  <span className="text-xs sm:text-sm text-muted-foreground truncate">{t('dashboard:avgOrderValue')}</span>
                </div>
                <span className="font-bold text-gray-900 dark:text-white text-xs sm:text-sm shrink-0">
                  {recentOrders.length > 0 
                    ? formatCurrency(
                        recentOrders.reduce((sum, o) => sum + parseFloat(o.grandTotal || '0'), 0) / recentOrders.length,
                        'EUR'
                      )
                    : formatCurrency(0, 'EUR')
                  }
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="overflow-hidden">
            <CardHeader className="p-3 sm:p-4 md:p-6 pb-2 sm:pb-3">
              <CardTitle className="text-sm sm:text-base md:text-lg flex items-center gap-1.5 sm:gap-2">
                <Zap className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-600 shrink-0" />
                <span className="truncate">{t('quickActions')}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 md:p-6 pt-0">
              <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
                <Link href="/orders/add">
                  <Button variant="outline" className="w-full h-auto py-2.5 sm:py-3 flex-col gap-0.5 sm:gap-1 text-xs sm:text-sm" data-testid="quick-new-order">
                    <Plus className="h-4 w-4 sm:h-5 sm:w-5" />
                    <span className="text-[10px] sm:text-xs truncate">{t('newOrder')}</span>
                  </Button>
                </Link>
                <Link href="/inventory/add">
                  <Button variant="outline" className="w-full h-auto py-2.5 sm:py-3 flex-col gap-0.5 sm:gap-1 text-xs sm:text-sm" data-testid="quick-add-product">
                    <Package className="h-4 w-4 sm:h-5 sm:w-5" />
                    <span className="text-[10px] sm:text-xs truncate">{t('addProduct')}</span>
                  </Button>
                </Link>
                <Link href="/customers/add">
                  <Button variant="outline" className="w-full h-auto py-2.5 sm:py-3 flex-col gap-0.5 sm:gap-1 text-xs sm:text-sm" data-testid="quick-add-customer">
                    <Users className="h-4 w-4 sm:h-5 sm:w-5" />
                    <span className="text-[10px] sm:text-xs truncate">{t('addCustomer')}</span>
                  </Button>
                </Link>
                <Link href="/receiving">
                  <Button variant="outline" className="w-full h-auto py-2.5 sm:py-3 flex-col gap-0.5 sm:gap-1 text-xs sm:text-sm" data-testid="quick-receiving">
                    <Truck className="h-4 w-4 sm:h-5 sm:w-5" />
                    <span className="text-[10px] sm:text-xs truncate">{t('receiveGoods')}</span>
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
