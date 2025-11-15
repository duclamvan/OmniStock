import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Package, 
  ShoppingCart, 
  TrendingUp, 
  AlertTriangle, 
  Truck, 
  Warehouse, 
  Users,
  Clock,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Plus,
  PackageCheck,
  DollarSign,
  ClipboardCheck,
  ChevronRight
} from "lucide-react";
import { Link } from "wouter";
import { formatCurrency, formatDate } from "@/lib/currencyUtils";

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
  grandTotal: string;
  currency: string;
  createdAt: string;
}

export default function Home() {
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
  const { data: unpaidOrders = [] } = useQuery({
    queryKey: ['/api/orders/unpaid'],
  });

  // Fetch stock adjustment requests
  const { data: stockAdjustmentRequests = [] } = useQuery<any[]>({
    queryKey: ['/api/stock-adjustment-requests'],
    staleTime: 0,
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
  });

  const pendingAdjustments = stockAdjustmentRequests.filter(req => req.status === 'pending');

  // Fetch over-allocated items
  const { data: overAllocatedItems = [] } = useQuery<any[]>({
    queryKey: ['/api/over-allocated-items'],
    staleTime: 0,
    refetchInterval: 60000,
  });

  // Fetch under-allocated items
  const { data: underAllocatedItems = [] } = useQuery<any[]>({
    queryKey: ['/api/under-allocated-items'],
    staleTime: 0,
    refetchInterval: 60000,
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200';
      case 'processing': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'shipped': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'delivered': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'cancelled': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-gray-100">
            Warehouse Management Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Real-time overview of your operations
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap shrink-0">
          <Link href="/orders/add" className="flex-1 sm:flex-initial min-w-[140px]">
            <Button size="sm" className="w-full sm:w-auto min-h-[44px]">
              <Plus className="h-4 w-4 mr-2" />
              New Order
            </Button>
          </Link>
          <Link href="/inventory/add" className="flex-1 sm:flex-initial min-w-[140px]">
            <Button size="sm" variant="outline" className="w-full sm:w-auto min-h-[44px]">
              <Plus className="h-4 w-4 mr-2" />
              Add Product
            </Button>
          </Link>
        </div>
      </div>

      {/* Stock Adjustment Approvals Notice */}
      {pendingAdjustments.length > 0 && (
        <Card className="bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-950/20 dark:to-red-950/20 border-orange-300 dark:border-orange-700">
          <CardContent className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row items-start justify-between gap-3 sm:gap-4">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <div className="p-2 bg-orange-100 dark:bg-orange-900/50 rounded-lg shrink-0">
                  <ClipboardCheck className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-1 text-sm sm:text-base">
                    Pending Stock Adjustment Approvals
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 mb-3">
                    <span className="font-bold text-orange-600 dark:text-orange-400">{pendingAdjustments.length}</span> stock adjustment {pendingAdjustments.length === 1 ? 'request' : 'requests'} waiting for admin approval
                  </p>
                  <Link href="/stock/approvals">
                    <Button 
                      size="sm" 
                      className="bg-orange-600 hover:bg-orange-700 dark:bg-orange-700 dark:hover:bg-orange-800 text-white min-h-[44px]"
                      data-testid="button-view-pending-approvals"
                    >
                      Review Approvals
                      <ArrowRight className="h-4 w-4 ml-1" />
                    </Button>
                  </Link>
                </div>
              </div>
              <Badge variant="destructive" className="text-xs sm:text-sm font-bold shrink-0 self-start">
                {pendingAdjustments.length} Pending
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Over-Allocated Items Warning */}
      {overAllocatedItems.length > 0 && (
        <Card className="bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-950/20 dark:to-orange-950/20 border-red-300 dark:border-red-700">
          <CardContent className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row items-start justify-between gap-3 sm:gap-4">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <div className="p-2 bg-red-100 dark:bg-red-900/50 rounded-lg shrink-0">
                  <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-red-900 dark:text-red-100 mb-1 text-sm sm:text-base">
                    Over-Allocated Inventory
                  </h3>
                  <p className="text-xs sm:text-sm text-red-800 dark:text-red-200 mb-3">
                    <span className="font-bold">{overAllocatedItems.length}</span> {overAllocatedItems.length === 1 ? 'item has' : 'items have'} more quantity ordered than available in stock
                  </p>
                  <Link href="/stock/over-allocated">
                    <Button 
                      size="sm" 
                      className="bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800 text-white min-h-[44px]"
                      data-testid="button-view-over-allocated"
                    >
                      View & Resolve Issues
                    </Button>
                  </Link>
                </div>
              </div>
              <Badge variant="destructive" className="text-xs sm:text-sm font-bold shrink-0 self-start">
                {overAllocatedItems.length}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Under-Allocated Items Warning */}
      {underAllocatedItems.length > 0 && (
        <Card className="bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-950/20 dark:to-amber-950/20 border-yellow-300 dark:border-yellow-700">
          <CardContent className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row items-start justify-between gap-3 sm:gap-4">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <div className="p-2 bg-yellow-100 dark:bg-yellow-900/50 rounded-lg shrink-0">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-yellow-900 dark:text-yellow-100 mb-1 text-sm sm:text-base">
                    Under-Allocated Inventory
                  </h3>
                  <p className="text-xs sm:text-sm text-yellow-800 dark:text-yellow-200 mb-3">
                    <span className="font-bold">{underAllocatedItems.length}</span> {underAllocatedItems.length === 1 ? 'item has' : 'items have'} more quantity in record than in stock locations
                  </p>
                  <Link href="/stock/under-allocated">
                    <Button 
                      size="sm" 
                      className="bg-yellow-600 hover:bg-yellow-700 dark:bg-yellow-700 dark:hover:bg-yellow-800 text-white min-h-[44px]"
                      data-testid="button-view-under-allocated"
                    >
                      View & Resolve Issues
                    </Button>
                  </Link>
                </div>
              </div>
              <Badge className="bg-yellow-600 text-white text-xs sm:text-sm font-bold shrink-0 self-start">
                {underAllocatedItems.length}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Key Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
        {/* Today's Orders */}
        <Card className="border-emerald-200 dark:border-emerald-800">
          <CardContent className="p-3 sm:p-4 md:p-6">
            {metricsLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-8 w-16" />
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground">Today's Orders</p>
                  <ShoppingCart className="h-5 w-5 sm:h-6 sm:w-6 md:h-7 md:w-7 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="flex items-baseline gap-2">
                  <p className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100">{metrics?.totalOrdersToday || 0}</p>
                  <p className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">
                    {metrics?.fulfillOrdersToday || 0} to fulfill
                  </p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Today's Revenue */}
        <Card className="border-blue-200 dark:border-blue-800">
          <CardContent className="p-3 sm:p-4 md:p-6">
            {metricsLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-8 w-24" />
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground">Today's Revenue</p>
                  <DollarSign className="h-5 w-5 sm:h-6 sm:w-6 md:h-7 md:w-7 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex items-baseline gap-2">
                  <p className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100">
                    {formatCurrency(metrics?.totalRevenueToday || 0, 'EUR')}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Profit: {formatCurrency(metrics?.totalProfitToday || 0, 'EUR')}
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Low Stock Alerts */}
        <Card className="border-amber-200 dark:border-amber-800">
          <CardContent className="p-3 sm:p-4 md:p-6">
            {stockLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-8 w-16" />
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground">Low Stock</p>
                  <AlertTriangle className="h-5 w-5 sm:h-6 sm:w-6 md:h-7 md:w-7 text-amber-600 dark:text-amber-400" />
                </div>
                <div className="flex items-baseline gap-2">
                  <p className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100">{lowStockProducts.length}</p>
                  <p className="text-sm text-muted-foreground">products</p>
                </div>
                {lowStockProducts.length > 0 && (
                  <Link href="/inventory">
                    <Button variant="link" className="h-auto p-0 text-xs mt-1">
                      View all <ArrowRight className="h-3 w-3 ml-1" />
                    </Button>
                  </Link>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Pending Payments */}
        <Card className="border-red-200 dark:border-red-800">
          <CardContent className="p-3 sm:p-4 md:p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs sm:text-sm font-medium text-muted-foreground">Pending Payments</p>
              <Clock className="h-5 w-5 sm:h-6 sm:w-6 md:h-7 md:w-7 text-red-600 dark:text-red-400" />
            </div>
            <div className="flex items-baseline gap-2">
              <p className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100">
                {Array.isArray(unpaidOrders) ? unpaidOrders.length : 0}
              </p>
              <p className="text-sm text-muted-foreground">orders</p>
            </div>
            {Array.isArray(unpaidOrders) && unpaidOrders.length > 0 && (
              <Link href="/orders/pay-later">
                <Button variant="link" className="h-auto p-0 text-xs mt-1">
                  View all <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-base sm:text-lg">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 sm:gap-3">
            <Link href="/orders/add">
              <Button variant="outline" className="w-full justify-start h-auto min-h-[44px] px-3 py-2 text-xs sm:text-sm">
                <Plus className="h-4 w-4 mr-1 sm:mr-2 shrink-0" />
                <span className="truncate">New Order</span>
              </Button>
            </Link>
            <Link href="/orders/pick-pack">
              <Button variant="outline" className="w-full justify-start h-auto min-h-[44px] px-3 py-2 text-xs sm:text-sm">
                <PackageCheck className="h-4 w-4 mr-1 sm:mr-2 shrink-0" />
                <span className="truncate">Pick & Pack</span>
              </Button>
            </Link>
            <Link href="/inventory/add">
              <Button variant="outline" className="w-full justify-start h-auto min-h-[44px] px-3 py-2 text-xs sm:text-sm">
                <Package className="h-4 w-4 mr-1 sm:mr-2 shrink-0" />
                <span className="truncate">Add Product</span>
              </Button>
            </Link>
            <Link href="/customers/add">
              <Button variant="outline" className="w-full justify-start h-auto min-h-[44px] px-3 py-2 text-xs sm:text-sm">
                <Users className="h-4 w-4 mr-1 sm:mr-2 shrink-0" />
                <span className="truncate">Add Customer</span>
              </Button>
            </Link>
            <Link href="/receiving">
              <Button variant="outline" className="w-full justify-start h-auto min-h-[44px] px-3 py-2 text-xs sm:text-sm">
                <Truck className="h-4 w-4 mr-1 sm:mr-2 shrink-0" />
                <span className="truncate">Receive Goods</span>
              </Button>
            </Link>
            <Link href="/warehouses">
              <Button variant="outline" className="w-full justify-start h-auto min-h-[44px] px-3 py-2 text-xs sm:text-sm">
                <Warehouse className="h-4 w-4 mr-1 sm:mr-2 shrink-0" />
                <span className="truncate">Warehouses</span>
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Low Stock Products */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between p-4 sm:p-6">
            <CardTitle className="text-base sm:text-lg flex items-center gap-2 min-w-0">
              <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-amber-600 shrink-0" />
              <span className="truncate">Low Stock Alert</span>
            </CardTitle>
            <Link href="/inventory" className="shrink-0">
              <Button variant="ghost" size="sm" className="min-h-[44px]">
                View All
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
            {stockLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
              </div>
            ) : lowStockProducts.length > 0 ? (
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {lowStockProducts.slice(0, 5).map((product) => (
                  <Link key={product.id} href={`/inventory/${product.id}/edit`}>
                    <div className="group relative flex items-center gap-3 p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:shadow-md hover:border-slate-300 dark:hover:border-slate-600 transition-all duration-200 min-h-[72px]">
                      {/* Product Icon */}
                      <div className="h-10 w-10 sm:h-12 sm:w-12 shrink-0 rounded-lg bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center ring-2 ring-slate-100 dark:ring-slate-800">
                        <Package className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                      </div>

                      {/* Product Info */}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm sm:text-base text-slate-900 dark:text-slate-100 truncate mb-1">
                          {product.name}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                          <span className="font-mono">{product.sku}</span>
                          <span className="text-slate-300 dark:text-slate-600">•</span>
                          <span className="text-orange-600 dark:text-orange-400 font-medium">
                            Alert at {product.lowStockAlert}
                          </span>
                        </div>
                      </div>

                      {/* Stock Badge & Arrow */}
                      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                        <Badge variant="destructive" className="text-xs px-3 py-1 font-bold whitespace-nowrap">
                          {product.quantity} left
                        </Badge>
                        <ChevronRight className="h-5 w-5 text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors" />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 sm:py-12">
                <CheckCircle2 className="h-10 w-10 sm:h-12 sm:w-12 text-green-500 mx-auto mb-3" />
                <p className="text-xs sm:text-sm text-muted-foreground">All products are well stocked</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Orders */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between p-4 sm:p-6">
            <CardTitle className="text-base sm:text-lg flex items-center gap-2 min-w-0">
              <ShoppingCart className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-600 shrink-0" />
              <span className="truncate">Recent Orders</span>
            </CardTitle>
            <Link href="/orders" className="shrink-0">
              <Button variant="ghost" size="sm" className="min-h-[44px]">
                View All
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
            {ordersLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
              </div>
            ) : recentOrders.length > 0 ? (
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {recentOrders.slice(0, 5).map((order) => (
                  <Link key={order.id} href={`/orders/${order.id}`}>
                    <div className="group relative flex items-center gap-3 p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:shadow-md hover:border-slate-300 dark:hover:border-slate-600 transition-all duration-200 min-h-[72px]">
                      {/* Customer Avatar */}
                      <Avatar className="h-10 w-10 sm:h-12 sm:w-12 shrink-0 ring-2 ring-slate-100 dark:ring-slate-800">
                        <AvatarImage src={order.customer?.imageUrl} />
                        <AvatarFallback className="bg-gradient-to-br from-blue-500 to-cyan-500 text-white font-semibold text-sm">
                          {(order.customer?.name || 'W').charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>

                      {/* Order Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-semibold text-sm sm:text-base text-slate-900 dark:text-slate-100 font-mono">
                            {order.orderId}
                          </p>
                          <Badge className={`${getStatusColor(order.status)} text-xs px-2 py-0.5`}>
                            {order.status.replace(/_/g, ' ')}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                          <span className="truncate">{order.customer?.name || 'Walk-in Customer'}</span>
                          <span className="text-slate-300 dark:text-slate-600">•</span>
                          <span className="whitespace-nowrap">{formatDate(order.createdAt)}</span>
                        </div>
                      </div>

                      {/* Amount & Arrow */}
                      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                        <div className="text-right">
                          <p className="font-bold text-sm sm:text-base text-slate-900 dark:text-slate-100 whitespace-nowrap">
                            {formatCurrency(parseFloat(order.grandTotal), order.currency as any)}
                          </p>
                        </div>
                        <ChevronRight className="h-5 w-5 text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors" />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 sm:py-12">
                <XCircle className="h-10 w-10 sm:h-12 sm:w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-xs sm:text-sm text-muted-foreground">No recent orders</p>
                <Link href="/orders/add">
                  <Button variant="outline" size="sm" className="mt-3 min-h-[44px]">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Order
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Month Performance */}
      {metrics && (
        <Card>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-cyan-600 shrink-0" />
              <span className="truncate">This Month Performance</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground mb-1">Revenue</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100 break-all">
                  {formatCurrency(metrics.thisMonthRevenue || 0, 'EUR')}
                </p>
              </div>
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground mb-1">Profit</p>
                <p className="text-xl sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400 break-all">
                  {formatCurrency(metrics.thisMonthProfit || 0, 'EUR')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
