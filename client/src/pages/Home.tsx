import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
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
  ClipboardCheck
} from "lucide-react";
import { Link } from "wouter";
import { formatCurrency } from "@/lib/currencyUtils";

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
  customer?: { name?: string };
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Warehouse Management Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Real-time overview of your operations</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/orders/add">
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              New Order
            </Button>
          </Link>
          <Link href="/inventory/add">
            <Button size="sm" variant="outline">
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
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-orange-100 dark:bg-orange-900/50 rounded-lg">
                  <ClipboardCheck className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                    Pending Stock Adjustment Approvals
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
                    <span className="font-bold text-orange-600 dark:text-orange-400">{pendingAdjustments.length}</span> stock adjustment {pendingAdjustments.length === 1 ? 'request' : 'requests'} waiting for admin approval
                  </p>
                  <Link href="/stock/approvals">
                    <Button 
                      size="sm" 
                      className="bg-orange-600 hover:bg-orange-700 dark:bg-orange-700 dark:hover:bg-orange-800 text-white"
                      data-testid="button-view-pending-approvals"
                    >
                      Review Approvals
                      <ArrowRight className="h-4 w-4 ml-1" />
                    </Button>
                  </Link>
                </div>
              </div>
              <Badge variant="destructive" className="text-sm font-bold flex-shrink-0">
                {pendingAdjustments.length} Pending
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Today's Orders */}
        <Card className="border-emerald-200 dark:border-emerald-800">
          <CardContent className="p-6">
            {metricsLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-8 w-16" />
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-muted-foreground">Today's Orders</p>
                  <ShoppingCart className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="flex items-baseline gap-2">
                  <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{metrics?.totalOrdersToday || 0}</p>
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
          <CardContent className="p-6">
            {metricsLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-8 w-24" />
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-muted-foreground">Today's Revenue</p>
                  <DollarSign className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex items-baseline gap-2">
                  <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
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
          <CardContent className="p-6">
            {stockLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-8 w-16" />
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-muted-foreground">Low Stock</p>
                  <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div className="flex items-baseline gap-2">
                  <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{lowStockProducts.length}</p>
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
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-muted-foreground">Pending Payments</p>
              <Clock className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
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
        <CardHeader>
          <CardTitle className="text-lg">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            <Link href="/orders/add">
              <Button variant="outline" className="w-full justify-start">
                <Plus className="h-4 w-4 mr-2" />
                New Order
              </Button>
            </Link>
            <Link href="/orders/pick-pack">
              <Button variant="outline" className="w-full justify-start">
                <PackageCheck className="h-4 w-4 mr-2" />
                Pick & Pack
              </Button>
            </Link>
            <Link href="/inventory/add">
              <Button variant="outline" className="w-full justify-start">
                <Package className="h-4 w-4 mr-2" />
                Add Product
              </Button>
            </Link>
            <Link href="/customers/add">
              <Button variant="outline" className="w-full justify-start">
                <Users className="h-4 w-4 mr-2" />
                Add Customer
              </Button>
            </Link>
            <Link href="/receiving">
              <Button variant="outline" className="w-full justify-start">
                <Truck className="h-4 w-4 mr-2" />
                Receive Goods
              </Button>
            </Link>
            <Link href="/warehouses">
              <Button variant="outline" className="w-full justify-start">
                <Warehouse className="h-4 w-4 mr-2" />
                Warehouses
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Low Stock Products */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              Low Stock Alert
            </CardTitle>
            <Link href="/inventory">
              <Button variant="ghost" size="sm">
                View All
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {stockLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
              </div>
            ) : lowStockProducts.length > 0 ? (
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {lowStockProducts.slice(0, 5).map((product) => (
                  <Link key={product.id} href={`/inventory/${product.id}/edit`}>
                    <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{product.name}</p>
                        <p className="text-xs text-muted-foreground">{product.sku}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="destructive" className="text-xs">
                          {product.quantity} left
                        </Badge>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">All products are well stocked</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Orders */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-emerald-600" />
              Recent Orders
            </CardTitle>
            <Link href="/orders">
              <Button variant="ghost" size="sm">
                View All
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {ordersLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
              </div>
            ) : recentOrders.length > 0 ? (
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {recentOrders.slice(0, 5).map((order) => (
                  <Link key={order.id} href={`/orders/${order.id}`}>
                    <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm font-mono">{order.orderId}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {order.customer?.name || 'Walk-in'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={getStatusColor(order.status)} variant="secondary">
                          {order.status}
                        </Badge>
                        <p className="text-sm font-semibold whitespace-nowrap">
                          {formatCurrency(parseFloat(order.grandTotal), order.currency as any)}
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <XCircle className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No recent orders</p>
                <Link href="/orders/add">
                  <Button variant="outline" size="sm" className="mt-3">
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
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-cyan-600" />
              This Month Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Revenue</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {formatCurrency(metrics.thisMonthRevenue || 0, 'EUR')}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Profit</p>
                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
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
