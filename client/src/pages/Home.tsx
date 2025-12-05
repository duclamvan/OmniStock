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
import { formatCurrency, formatDate } from "@/lib/currencyUtils";
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
  status: string;
  paymentStatus?: string;
  grandTotal: string;
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
  
  // Fetch dashboard metrics
  const { data: metrics, isLoading: metricsLoading } = useQuery<DashboardMetrics>({
    queryKey: ['/api/dashboard/metrics'],
  });

  // Fetch low stock products
  const { data: lowStockProducts = [], isLoading: stockLoading } = useQuery<LowStockProduct[]>({
    queryKey: ['/api/products/low-stock'],
  });

  // Fetch recent orders
  const { data: recentOrders = [], isLoading: ordersLoading } = useQuery<RecentOrder[]>({
    queryKey: ['/api/orders'],
  });

  // Fetch unpaid orders
  const { data: unpaidOrders = [] } = useQuery<any[]>({
    queryKey: ['/api/orders/unpaid'],
  });

  // Fetch stock adjustment requests
  const { data: stockAdjustmentRequests = [] } = useQuery<any[]>({
    queryKey: ['/api/stock-adjustment-requests'],
    staleTime: 0,
    refetchInterval: 30000,
  });

  // Fetch shipments waiting to be received
  const { data: shipmentsToReceive = [] } = useQuery<any[]>({
    queryKey: ['/api/imports/shipments/to-receive'],
  });

  // Fetch shipments currently being received
  const { data: shipmentsReceiving = [] } = useQuery<any[]>({
    queryKey: ['/api/imports/shipments/receiving'],
  });

  // Fetch customers for insights
  const { data: customers = [] } = useQuery<any[]>({
    queryKey: ['/api/customers'],
  });

  // Fetch products for insights
  const { data: products = [] } = useQuery<any[]>({
    queryKey: ['/api/products'],
  });

  // Fetch recently received items
  const { data: recentlyReceived, isLoading: receivedLoading } = useQuery<RecentlyReceivedData>({
    queryKey: ['/api/dashboard/recently-received'],
  });

  // Fetch employee activities
  const { data: activities = [], isLoading: activitiesLoading } = useQuery<ActivityLog[]>({
    queryKey: ['/api/dashboard/activities', 5],
  });

  const pendingAdjustments = stockAdjustmentRequests.filter(req => req.status === 'pending');
  const pendingReceivingCount = (shipmentsToReceive?.length || 0) + (shipmentsReceiving?.length || 0);

  // Calculate order pipeline counts from recent orders
  const orderStatusCounts: OrderStatusCounts = {
    pending: recentOrders.filter((o: RecentOrder) => o.status === 'pending').length,
    to_fulfill: recentOrders.filter((o: RecentOrder) => o.status === 'to_fulfill').length,
    picking: recentOrders.filter((o: RecentOrder) => o.status === 'picking').length,
    packed: recentOrders.filter((o: RecentOrder) => o.status === 'packed').length,
    shipped: recentOrders.filter((o: RecentOrder) => o.status === 'shipped').length,
    delivered: recentOrders.filter((o: RecentOrder) => o.status === 'delivered').length,
    cancelled: recentOrders.filter((o: RecentOrder) => o.status === 'cancelled').length,
  };

  // Calculate payment stats
  const paidOrders = recentOrders.filter((o: RecentOrder) => o.paymentStatus === 'paid');
  const paymentRate = recentOrders.length > 0 ? (paidOrders.length / recentOrders.length) * 100 : 0;

  // Calculate total unpaid amount from unpaid orders API
  const totalUnpaidAmount = Array.isArray(unpaidOrders) 
    ? unpaidOrders.reduce((sum, order) => sum + parseFloat(order.grandTotal || '0'), 0) 
    : 0;

  // Calculate fulfillment rate
  const fulfilledOrders = recentOrders.filter((o: RecentOrder) => ['shipped', 'delivered'].includes(o.status));
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
    <div className="space-y-4 sm:space-y-6">
      {/* Header with Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-gray-100">
            {t('dashboard:title')}
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            {t('dashboard:subtitle')}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap shrink-0">
          <Link href="/orders/add" className="flex-1 sm:flex-initial min-w-[120px]">
            <Button size="sm" className="w-full sm:w-auto min-h-[44px]" data-testid="button-new-order">
              <Plus className="h-4 w-4 mr-2" />
              {t('newOrder')}
            </Button>
          </Link>
          <Link href="/orders/pick-pack" className="flex-1 sm:flex-initial min-w-[120px]">
            <Button size="sm" variant="outline" className="w-full sm:w-auto min-h-[44px]" data-testid="button-pick-pack">
              <PackageCheck className="h-4 w-4 mr-2" />
              {t('pickAndPack')}
            </Button>
          </Link>
        </div>
      </div>

      {/* Critical Alerts Banner */}
      {(pendingAdjustments.length > 0 || lowStockProducts.length > 5) && (
        <Card className="bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950/30 dark:to-amber-950/30 border-orange-200 dark:border-orange-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 dark:bg-orange-900/50 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 dark:text-white text-sm">
                  {t('dashboard:attentionRequired')}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  {pendingAdjustments.length > 0 && `${pendingAdjustments.length} ${t('dashboard:pendingApprovals')}`}
                  {pendingAdjustments.length > 0 && lowStockProducts.length > 5 && ' • '}
                  {lowStockProducts.length > 5 && `${lowStockProducts.length} ${t('dashboard:lowStockItems')}`}
                </p>
              </div>
              <div className="flex gap-2">
                {pendingAdjustments.length > 0 && (
                  <Link href="/stock/approvals">
                    <Button size="sm" variant="outline" className="min-h-[36px]" data-testid="button-view-approvals">
                      {t('dashboard:reviewApprovals')}
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Executive Summary - Key Metrics Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Today's Revenue */}
        <Card className="relative overflow-hidden">
          <CardContent className="p-4 sm:p-5">
            {metricsLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-8 w-28" />
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground">{t('dashboard:todayRevenue')}</p>
                  <div className="p-1.5 bg-emerald-100 dark:bg-emerald-900/50 rounded-lg">
                    <DollarSign className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  </div>
                </div>
                <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {formatCurrency(metrics?.totalRevenueToday || 0, 'EUR')}
                </p>
                <div className="flex items-center gap-1 mt-1">
                  <TrendingUp className="h-3 w-3 text-emerald-500" />
                  <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                    {formatCurrency(metrics?.totalProfitToday || 0, 'EUR')} {t('dashboard:profit')}
                  </span>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Orders to Fulfill */}
        <Card className="relative overflow-hidden">
          <CardContent className="p-4 sm:p-5">
            {metricsLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-8 w-16" />
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground">{t('dashboard:toFulfill')}</p>
                  <div className="p-1.5 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
                    <PackageCheck className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>
                <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {metrics?.fulfillOrdersToday || 0}
                </p>
                <div className="flex items-center gap-1 mt-1">
                  <ShoppingCart className="h-3 w-3 text-blue-500" />
                  <span className="text-xs text-muted-foreground">
                    {t('dashboard:ofTotal', { count: metrics?.totalOrdersToday || 0 })}
                  </span>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Fulfillment Rate */}
        <Card className="relative overflow-hidden">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs sm:text-sm font-medium text-muted-foreground">{t('dashboard:fulfillmentRate')}</p>
              <div className="p-1.5 bg-purple-100 dark:bg-purple-900/50 rounded-lg">
                <Target className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
            <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">
              {fulfillmentRate.toFixed(0)}%
            </p>
            <Progress value={fulfillmentRate} className="h-1.5 mt-2" />
          </CardContent>
        </Card>

        {/* Profit Margin */}
        <Card className="relative overflow-hidden">
          <CardContent className="p-4 sm:p-5">
            {metricsLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-8 w-16" />
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground">{t('dashboard:profitMargin')}</p>
                  <div className="p-1.5 bg-cyan-100 dark:bg-cyan-900/50 rounded-lg">
                    <BarChart3 className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
                  </div>
                </div>
                <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {profitMargin}%
                </p>
                <div className="flex items-center gap-1 mt-1">
                  <span className="text-xs text-muted-foreground">
                    {t('dashboard:thisMonth')}
                  </span>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Main Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        
        {/* Left Column - Orders & Operations */}
        <div className="lg:col-span-2 space-y-4 sm:space-y-6">
          
          {/* Pick & Pack Flow */}
          <Card>
            <CardHeader className="p-4 sm:p-6 pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                    <PackageCheck className="h-5 w-5 text-blue-600" />
                    {t('dashboard:pickPackFlow')}
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm mt-1">
                    {t('dashboard:pickPackFlowDesc')}
                  </CardDescription>
                </div>
                <Link href="/orders/pick-pack">
                  <Button variant="ghost" size="sm" className="min-h-[36px]" data-testid="button-view-all-orders">
                    {t('viewAll')}
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0">
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 sm:gap-3">
                <Link href="/orders?status=pending" className="block">
                  <div className="text-center p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-colors cursor-pointer" data-testid="pipeline-pending">
                    <p className="text-2xl sm:text-3xl font-bold text-amber-600 dark:text-amber-400">{orderStatusCounts.pending}</p>
                    <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">{t('dashboard:pending')}</p>
                  </div>
                </Link>
                <Link href="/orders?status=to_fulfill" className="block">
                  <div className="text-center p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors cursor-pointer" data-testid="pipeline-to-fulfill">
                    <p className="text-2xl sm:text-3xl font-bold text-blue-600 dark:text-blue-400">{orderStatusCounts.to_fulfill}</p>
                    <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">{t('dashboard:toFulfillStatus')}</p>
                  </div>
                </Link>
                <Link href="/orders?status=picking" className="block">
                  <div className="text-center p-3 rounded-lg bg-indigo-50 dark:bg-indigo-950/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors cursor-pointer" data-testid="pipeline-picking">
                    <p className="text-2xl sm:text-3xl font-bold text-indigo-600 dark:text-indigo-400">{orderStatusCounts.picking}</p>
                    <p className="text-xs text-indigo-700 dark:text-indigo-300 mt-1">{t('dashboard:picking')}</p>
                  </div>
                </Link>
                <Link href="/orders?status=packed" className="block">
                  <div className="text-center p-3 rounded-lg bg-cyan-50 dark:bg-cyan-950/30 hover:bg-cyan-100 dark:hover:bg-cyan-900/50 transition-colors cursor-pointer" data-testid="pipeline-packed">
                    <p className="text-2xl sm:text-3xl font-bold text-cyan-600 dark:text-cyan-400">{orderStatusCounts.packed}</p>
                    <p className="text-xs text-cyan-700 dark:text-cyan-300 mt-1">{t('dashboard:packed')}</p>
                  </div>
                </Link>
                <Link href="/orders?status=shipped" className="block">
                  <div className="text-center p-3 rounded-lg bg-purple-50 dark:bg-purple-950/30 hover:bg-purple-100 dark:hover:bg-purple-900/50 transition-colors cursor-pointer" data-testid="pipeline-shipped">
                    <p className="text-2xl sm:text-3xl font-bold text-purple-600 dark:text-purple-400">{orderStatusCounts.shipped}</p>
                    <p className="text-xs text-purple-700 dark:text-purple-300 mt-1">{t('dashboard:shipped')}</p>
                  </div>
                </Link>
                <Link href="/orders?status=delivered" className="block">
                  <div className="text-center p-3 rounded-lg bg-green-50 dark:bg-green-950/30 hover:bg-green-100 dark:hover:bg-green-900/50 transition-colors cursor-pointer" data-testid="pipeline-delivered">
                    <p className="text-2xl sm:text-3xl font-bold text-green-600 dark:text-green-400">{orderStatusCounts.delivered}</p>
                    <p className="text-xs text-green-700 dark:text-green-300 mt-1">{t('dashboard:delivered')}</p>
                  </div>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Payments & Financial Health */}
          <Card>
            <CardHeader className="p-4 sm:p-6 pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                    <Wallet className="h-5 w-5 text-green-600" />
                    {t('dashboard:paymentsFinancial')}
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm mt-1">
                    {t('dashboard:paymentsFinancialDesc')}
                  </CardDescription>
                </div>
                <Link href="/orders/pay-later">
                  <Button variant="ghost" size="sm" className="min-h-[36px]" data-testid="button-view-unpaid">
                    {t('dashboard:viewUnpaid')}
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {/* Payment Rate */}
                <div className="p-4 rounded-lg bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30">
                  <div className="flex items-center gap-2 mb-2">
                    <BadgeCheck className="h-4 w-4 text-green-600" />
                    <span className="text-xs font-medium text-green-700 dark:text-green-300">{t('dashboard:paymentRate')}</span>
                  </div>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">{paymentRate.toFixed(0)}%</p>
                  <Progress value={paymentRate} className="h-1.5 mt-2" />
                </div>

                {/* Unpaid Orders */}
                <div className="p-4 rounded-lg bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-950/30 dark:to-orange-950/30">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="h-4 w-4 text-red-600" />
                    <span className="text-xs font-medium text-red-700 dark:text-red-300">{t('dashboard:unpaidOrders')}</span>
                  </div>
                  <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                    {Array.isArray(unpaidOrders) ? unpaidOrders.length : 0}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">{t('dashboard:ordersAwaiting')}</p>
                </div>

                {/* Outstanding Amount */}
                <div className="p-4 rounded-lg bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-950/30 dark:to-yellow-950/30">
                  <div className="flex items-center gap-2 mb-2">
                    <CircleDollarSign className="h-4 w-4 text-amber-600" />
                    <span className="text-xs font-medium text-amber-700 dark:text-amber-300">{t('dashboard:outstanding')}</span>
                  </div>
                  <p className="text-xl font-bold text-amber-600 dark:text-amber-400">
                    {formatCurrency(totalUnpaidAmount, 'EUR')}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">{t('dashboard:toCollect')}</p>
                </div>

                {/* Monthly Revenue */}
                <div className="p-4 rounded-lg bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="h-4 w-4 text-blue-600" />
                    <span className="text-xs font-medium text-blue-700 dark:text-blue-300">{t('dashboard:monthRevenue')}</span>
                  </div>
                  <p className="text-xl font-bold text-blue-600 dark:text-blue-400">
                    {formatCurrency(metrics?.thisMonthRevenue || 0, 'EUR')}
                  </p>
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
                    {formatCurrency(metrics?.thisMonthProfit || 0, 'EUR')} {t('dashboard:profit')}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recent Orders */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between p-4 sm:p-6 pb-3">
              <div>
                <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5 text-emerald-600" />
                  {t('recentOrders')}
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm mt-1">
                  {t('dashboard:recentOrdersDesc')}
                </CardDescription>
              </div>
              <Link href="/orders">
                <Button variant="ghost" size="sm" className="min-h-[36px]">
                  {t('viewAll')}
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0">
              {ordersLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
                </div>
              ) : recentOrders.length > 0 ? (
                <div className="space-y-2">
                  {recentOrders.slice(0, 5).map((order) => (
                    <Link key={order.id} href={`/orders/${order.id}`}>
                      <div className="group flex items-center gap-3 p-3 rounded-lg border border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer" data-testid={`order-row-${order.id}`}>
                        <Avatar className="h-9 w-9 shrink-0">
                          <AvatarImage src={order.customer?.imageUrl} />
                          <AvatarFallback className="bg-gradient-to-br from-blue-500 to-cyan-500 text-white text-xs font-semibold">
                            {(order.customer?.name || 'W').charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm text-gray-900 dark:text-white font-mono">{order.orderId}</span>
                            <Badge className={`${getStatusColor(order.status || 'pending')} text-[10px] px-1.5 py-0`}>
                              {(order.status || 'pending').replace(/_/g, ' ')}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground truncate">
                            {order.customer?.name || t('walkInCustomer')} • {formatDate(order.createdAt)}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-bold text-sm text-gray-900 dark:text-white">
                            {formatCurrency(parseFloat(order.grandTotal), order.currency as any)}
                          </p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300" />
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <XCircle className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">{t('noRecentOrders')}</p>
                  <Link href="/orders/add">
                    <Button variant="outline" size="sm" className="mt-3">
                      <Plus className="h-4 w-4 mr-2" />
                      {t('createOrder')}
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Tasks & Insights */}
        <div className="space-y-4 sm:space-y-6">
          
          {/* Warehouse Operations Tasks */}
          <Card>
            <CardHeader className="p-4 sm:p-6 pb-3">
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-orange-600" />
                {t('dashboard:warehouseTasks')}
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                {t('dashboard:warehouseTasksDesc')}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0 space-y-3">
              {/* Pending Receiving */}
              <Link href="/receiving">
                <div className="flex items-center justify-between p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors cursor-pointer" data-testid="task-receiving">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                      <Truck className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <p className="font-medium text-sm text-gray-900 dark:text-white">{t('dashboard:pendingReceiving')}</p>
                      <p className="text-xs text-muted-foreground">{t('dashboard:shipmentsToReceive')}</p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                    {pendingReceivingCount}
                  </Badge>
                </div>
              </Link>

              {/* Stock Approvals */}
              <Link href="/stock/approvals">
                <div className="flex items-center justify-between p-3 rounded-lg bg-orange-50 dark:bg-orange-950/30 hover:bg-orange-100 dark:hover:bg-orange-900/50 transition-colors cursor-pointer" data-testid="task-approvals">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-orange-100 dark:bg-orange-900 rounded-lg">
                      <ClipboardCheck className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                    </div>
                    <div>
                      <p className="font-medium text-sm text-gray-900 dark:text-white">{t('dashboard:stockApprovals')}</p>
                      <p className="text-xs text-muted-foreground">{t('dashboard:pendingApprovalDesc')}</p>
                    </div>
                  </div>
                  <Badge variant="secondary" className={pendingAdjustments.length > 0 ? "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300" : ""}>
                    {pendingAdjustments.length}
                  </Badge>
                </div>
              </Link>

              {/* Low Stock */}
              <Link href="/inventory?lowStock=true">
                <div className="flex items-center justify-between p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-colors cursor-pointer" data-testid="task-low-stock">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-amber-100 dark:bg-amber-900 rounded-lg">
                      <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div>
                      <p className="font-medium text-sm text-gray-900 dark:text-white">{t('dashboard:lowStockAlerts')}</p>
                      <p className="text-xs text-muted-foreground">{t('dashboard:needsReorder')}</p>
                    </div>
                  </div>
                  <Badge variant="secondary" className={lowStockProducts.length > 0 ? "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300" : ""}>
                    {lowStockProducts.length}
                  </Badge>
                </div>
              </Link>

              {/* Pick & Pack */}
              <Link href="/orders/pick-pack">
                <div className="flex items-center justify-between p-3 rounded-lg bg-purple-50 dark:bg-purple-950/30 hover:bg-purple-100 dark:hover:bg-purple-900/50 transition-colors cursor-pointer" data-testid="task-pick-pack">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                      <PackageCheck className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      <p className="font-medium text-sm text-gray-900 dark:text-white">{t('dashboard:ordersToPack')}</p>
                      <p className="text-xs text-muted-foreground">{t('dashboard:readyForFulfillment')}</p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300">
                    {orderStatusCounts.to_fulfill + orderStatusCounts.picking}
                  </Badge>
                </div>
              </Link>
            </CardContent>
          </Card>

          {/* Recent Receiving */}
          <Card>
            <CardHeader className="p-4 sm:p-6 pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                    <PackageOpen className="h-5 w-5 text-teal-600" />
                    {t('dashboard:recentReceiving')}
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    {t('dashboard:recentReceivingDesc')}
                  </CardDescription>
                </div>
                <Link href="/receiving">
                  <Button variant="ghost" size="sm" className="min-h-[36px]" data-testid="button-view-receiving">
                    {t('dashboard:viewReceiving')}
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0">
              {receivedLoading ? (
                <Skeleton className="h-12 w-full" />
              ) : recentlyReceived && recentlyReceived.products.length > 0 ? (
                <div className="p-3 rounded-lg bg-teal-50 dark:bg-teal-950/30">
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    <span className="font-medium text-teal-700 dark:text-teal-400">
                      {t('dashboard:recentlyReceived')}
                    </span>{' '}
                    {recentlyReceived.products.slice(0, 5).join(', ')}
                    {recentlyReceived.products.length > 5 && ` ${t('dashboard:andMore', { count: recentlyReceived.products.length - 5 })}`}
                  </p>
                </div>
              ) : (
                <div className="text-center py-4">
                  <PackageOpen className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">{t('dashboard:noRecentReceiving')}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Employee Activity */}
          <Card>
            <CardHeader className="p-4 sm:p-6 pb-3">
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-indigo-600" />
                {t('dashboard:employeeActivity')}
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                {t('dashboard:employeeActivityDesc')}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0">
              {activitiesLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
                </div>
              ) : activities.length > 0 ? (
                <div className="space-y-2">
                  {activities.slice(0, 5).map((activity) => (
                    <div key={activity.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors" data-testid={`activity-row-${activity.id}`}>
                      <Avatar className="h-8 w-8 shrink-0">
                        <AvatarImage src={activity.user?.profileImageUrl} />
                        <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-500 text-white text-xs font-semibold">
                          {(activity.user?.firstName || 'U').charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-900 dark:text-white truncate">
                          <span className="font-medium">
                            {activity.user?.firstName || 'User'}
                          </span>{' '}
                          <span className="text-muted-foreground">
                            {getActionText(activity.action)} {getEntityText(activity.entityType)}
                          </span>
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {activity.entityId}
                        </p>
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {formatTimeAgo(activity.createdAt)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4">
                  <UserCheck className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">{t('dashboard:noRecentActivity')}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Business Insights */}
          <Card>
            <CardHeader className="p-4 sm:p-6 pb-3">
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                <Activity className="h-5 w-5 text-cyan-600" />
                {t('dashboard:businessInsights')}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0 space-y-4">
              {/* Customer Stats */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-blue-500" />
                  <span className="text-sm text-muted-foreground">{t('dashboard:totalCustomers')}</span>
                </div>
                <span className="font-bold text-gray-900 dark:text-white">{customers.length}</span>
              </div>
              
              <Separator />
              
              {/* Product Stats */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-purple-500" />
                  <span className="text-sm text-muted-foreground">{t('dashboard:totalProducts')}</span>
                </div>
                <span className="font-bold text-gray-900 dark:text-white">{products.length}</span>
              </div>
              
              <Separator />
              
              {/* Total Orders */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="h-4 w-4 text-emerald-500" />
                  <span className="text-sm text-muted-foreground">{t('dashboard:ordersThisMonth')}</span>
                </div>
                <span className="font-bold text-gray-900 dark:text-white">{recentOrders.length}</span>
              </div>
              
              <Separator />
              
              {/* Avg Order Value */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-green-500" />
                  <span className="text-sm text-muted-foreground">{t('dashboard:avgOrderValue')}</span>
                </div>
                <span className="font-bold text-gray-900 dark:text-white">
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
          <Card>
            <CardHeader className="p-4 sm:p-6 pb-3">
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                <Zap className="h-5 w-5 text-yellow-600" />
                {t('quickActions')}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0">
              <div className="grid grid-cols-2 gap-2">
                <Link href="/orders/add">
                  <Button variant="outline" className="w-full h-auto py-3 flex-col gap-1" data-testid="quick-new-order">
                    <Plus className="h-5 w-5" />
                    <span className="text-xs">{t('newOrder')}</span>
                  </Button>
                </Link>
                <Link href="/inventory/add">
                  <Button variant="outline" className="w-full h-auto py-3 flex-col gap-1" data-testid="quick-add-product">
                    <Package className="h-5 w-5" />
                    <span className="text-xs">{t('addProduct')}</span>
                  </Button>
                </Link>
                <Link href="/customers/add">
                  <Button variant="outline" className="w-full h-auto py-3 flex-col gap-1" data-testid="quick-add-customer">
                    <Users className="h-5 w-5" />
                    <span className="text-xs">{t('addCustomer')}</span>
                  </Button>
                </Link>
                <Link href="/receiving">
                  <Button variant="outline" className="w-full h-auto py-3 flex-col gap-1" data-testid="quick-receiving">
                    <Truck className="h-5 w-5" />
                    <span className="text-xs">{t('receiveGoods')}</span>
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
