import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { 
  Package, 
  AlertTriangle, 
  PackageX, 
  TrendingUp, 
  TrendingDown,
  Warehouse,
  Boxes,
  ArrowRight,
  RefreshCw,
  DollarSign,
  Clock,
  Truck,
  BarChart3,
  PieChart
} from "lucide-react";
import { useLocalization } from "@/contexts/LocalizationContext";
import {
  PieChart as RechartsPie,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from "recharts";

interface InventoryDashboardData {
  summary: {
    totalProducts: number;
    totalUnits: number;
    totalInventoryValue: number;
    healthyStock: number;
    lowStock: number;
    outOfStock: number;
    overstocked: number;
    slowMoving: number;
    incomingShipments: number;
  };
  stockDistribution: {
    healthy: number;
    lowStock: number;
    outOfStock: number;
    overstocked: number;
  };
  stockByCategory: Array<{
    id: string;
    name: string;
    productCount: number;
    totalQuantity: number;
    totalValue: number;
  }>;
  stockByWarehouse: Array<{
    id: string;
    name: string;
    productCount: number;
    totalQuantity: number;
    totalValue: number;
  }>;
  topLowStockProducts: Array<{
    id: string;
    name: string;
    sku?: string;
    quantity: number;
    minStockLevel: number;
    lowStockAlert: number;
    categoryName?: string;
  }>;
  fastMovingProducts: Array<{
    id: string;
    name: string;
    sku?: string;
    quantity: number;
    unitsSold: number;
  }>;
  timestamp: string;
}

const COLORS = {
  healthy: '#22c55e',
  lowStock: '#eab308',
  outOfStock: '#ef4444',
  overstocked: '#3b82f6'
};

export default function InventoryDashboard() {
  const { t } = useTranslation(['inventory', 'common']);
  const { formatCurrency, formatNumber } = useLocalization();

  const { data, isLoading, isFetching, refetch, dataUpdatedAt } = useQuery<InventoryDashboardData>({
    queryKey: ['/api/dashboard/inventory'],
    staleTime: 30000,
    refetchInterval: 60000,
    refetchOnWindowFocus: true
  });

  const pieChartData = data ? [
    { name: t('inventory:healthyStock'), value: data.stockDistribution.healthy, color: COLORS.healthy },
    { name: t('inventory:lowStock'), value: data.stockDistribution.lowStock, color: COLORS.lowStock },
    { name: t('inventory:outOfStock'), value: data.stockDistribution.outOfStock, color: COLORS.outOfStock },
    { name: t('inventory:overstocked'), value: data.stockDistribution.overstocked, color: COLORS.overstocked }
  ].filter(item => item.value > 0) : [];

  const categoryChartData = data?.stockByCategory.map(cat => ({
    name: cat.name.length > 12 ? cat.name.substring(0, 12) + '...' : cat.name,
    value: cat.totalValue,
    quantity: cat.totalQuantity
  })) || [];

  if (isLoading) {
    return (
      <div className="container mx-auto p-4 md:p-6 space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="page-title">
            <BarChart3 className="h-6 w-6" />
            {t('inventory:inventoryDashboard')}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t('inventory:realTimeOverview')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {dataUpdatedAt && (
            <span className="text-xs text-muted-foreground">
              {t('common:lastUpdated')}: {new Date(dataUpdatedAt).toLocaleTimeString()}
            </span>
          )}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => refetch()}
            disabled={isFetching}
            data-testid="button-refresh"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
            {t('common:refresh')}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
        <Card data-testid="card-total-products">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <Package className="h-8 w-8 text-blue-500" />
              <span className="text-2xl font-bold">{formatNumber(data?.summary.totalProducts || 0)}</span>
            </div>
            <p className="text-sm text-muted-foreground mt-2">{t('inventory:totalProducts')}</p>
          </CardContent>
        </Card>

        <Card data-testid="card-total-units">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <Boxes className="h-8 w-8 text-indigo-500" />
              <span className="text-2xl font-bold">{formatNumber(data?.summary.totalUnits || 0)}</span>
            </div>
            <p className="text-sm text-muted-foreground mt-2">{t('inventory:totalUnits')}</p>
          </CardContent>
        </Card>

        <Card data-testid="card-inventory-value">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <DollarSign className="h-8 w-8 text-emerald-500" />
              <span className="text-xl font-bold">{formatCurrency(data?.summary.totalInventoryValue || 0, 'EUR')}</span>
            </div>
            <p className="text-sm text-muted-foreground mt-2">{t('inventory:inventoryValue')}</p>
          </CardContent>
        </Card>

        <Card data-testid="card-healthy-stock" className="border-l-4 border-l-green-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <TrendingUp className="h-8 w-8 text-green-500" />
              <span className="text-2xl font-bold text-green-600">{data?.summary.healthyStock || 0}</span>
            </div>
            <p className="text-sm text-muted-foreground mt-2">{t('inventory:healthyStock')}</p>
          </CardContent>
        </Card>

        <Card data-testid="card-low-stock" className="border-l-4 border-l-yellow-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <AlertTriangle className="h-8 w-8 text-yellow-500" />
              <span className="text-2xl font-bold text-yellow-600">{data?.summary.lowStock || 0}</span>
            </div>
            <p className="text-sm text-muted-foreground mt-2">{t('inventory:lowStock')}</p>
          </CardContent>
        </Card>

        <Card data-testid="card-out-of-stock" className="border-l-4 border-l-red-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <PackageX className="h-8 w-8 text-red-500" />
              <span className="text-2xl font-bold text-red-600">{data?.summary.outOfStock || 0}</span>
            </div>
            <p className="text-sm text-muted-foreground mt-2">{t('inventory:outOfStock')}</p>
          </CardContent>
        </Card>

        <Card data-testid="card-overstocked" className="border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <TrendingDown className="h-8 w-8 text-blue-500" />
              <span className="text-2xl font-bold text-blue-600">{data?.summary.overstocked || 0}</span>
            </div>
            <p className="text-sm text-muted-foreground mt-2">{t('inventory:overstocked')}</p>
          </CardContent>
        </Card>

        <Card data-testid="card-slow-moving">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <Clock className="h-8 w-8 text-orange-500" />
              <span className="text-2xl font-bold">{data?.summary.slowMoving || 0}</span>
            </div>
            <p className="text-sm text-muted-foreground mt-2">{t('inventory:slowMoving')}</p>
          </CardContent>
        </Card>

        <Card data-testid="card-incoming">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <Truck className="h-8 w-8 text-purple-500" />
              <span className="text-2xl font-bold">{data?.summary.incomingShipments || 0}</span>
            </div>
            <p className="text-sm text-muted-foreground mt-2">{t('inventory:incomingShipments')}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card data-testid="card-stock-distribution">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              {t('inventory:stockDistribution')}
            </CardTitle>
            <CardDescription>{t('inventory:stockDistributionDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
            {pieChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <RechartsPie>
                  <Pie
                    data={pieChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {pieChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </RechartsPie>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                {t('inventory:noDataAvailable')}
              </div>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-stock-by-category">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              {t('inventory:stockByCategory')}
            </CardTitle>
            <CardDescription>{t('inventory:stockByCategoryDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
            {categoryChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={categoryChartData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tickFormatter={(value) => `€${formatNumber(value)}`} />
                  <YAxis type="category" dataKey="name" width={100} />
                  <Tooltip 
                    formatter={(value: number) => [`€${formatNumber(value)}`, t('inventory:value')]}
                  />
                  <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                {t('inventory:noDataAvailable')}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card data-testid="card-low-stock-alert">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-yellow-600">
                <AlertTriangle className="h-5 w-5" />
                {t('inventory:lowStockAlertTitle')}
              </CardTitle>
              <CardDescription>{t('inventory:lowStockAlertDesc')}</CardDescription>
            </div>
            <Link href="/inventory">
              <Button variant="outline" size="sm" data-testid="link-view-all-inventory">
                {t('common:viewAll')}
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {data?.topLowStockProducts && data.topLowStockProducts.length > 0 ? (
              <div className="space-y-3">
                {data.topLowStockProducts.map((product) => (
                  <div key={product.id} className="flex items-center justify-between p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg" data-testid={`row-low-stock-${product.id}`}>
                    <div className="flex-1">
                      <p className="font-medium text-sm">{product.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {product.sku && (
                          <Badge variant="outline" className="text-xs">{product.sku}</Badge>
                        )}
                        {product.categoryName && (
                          <span className="text-xs text-muted-foreground">{product.categoryName}</span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-yellow-600">{product.quantity}</p>
                      <p className="text-xs text-muted-foreground">{t('inventory:inStockLabel')}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <TrendingUp className="h-12 w-12 mx-auto mb-2 text-green-500" />
                <p>{t('inventory:noLowStockProducts')}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-fast-moving">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-600">
              <TrendingUp className="h-5 w-5" />
              {t('inventory:fastMovingProducts')}
            </CardTitle>
            <CardDescription>{t('inventory:fastMovingDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
            {data?.fastMovingProducts && data.fastMovingProducts.length > 0 ? (
              <div className="space-y-3">
                {data.fastMovingProducts.slice(0, 5).map((product, index) => (
                  <div key={product.id} className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg" data-testid={`row-fast-moving-${product.id}`}>
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-bold text-green-600">#{index + 1}</span>
                      <div>
                        <p className="font-medium text-sm">{product.name}</p>
                        {product.sku && (
                          <Badge variant="outline" className="text-xs mt-1">{product.sku}</Badge>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-green-600">{formatNumber(product.unitsSold)}</p>
                      <p className="text-xs text-muted-foreground">{t('inventory:unitsSoldLabel')}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-2" />
                <p>{t('inventory:noSalesData')}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {data?.stockByWarehouse && data.stockByWarehouse.length > 0 && (
        <Card data-testid="card-stock-by-warehouse">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Warehouse className="h-5 w-5" />
              {t('inventory:stockByWarehouse')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.stockByWarehouse.map((warehouse) => (
                <div key={warehouse.id} className="p-4 border rounded-lg" data-testid={`card-warehouse-${warehouse.id}`}>
                  <div className="flex items-center gap-2 mb-3">
                    <Warehouse className="h-5 w-5 text-muted-foreground" />
                    <h3 className="font-semibold">{warehouse.name}</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-muted-foreground">{t('inventory:products')}</p>
                      <p className="font-bold">{warehouse.productCount}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">{t('inventory:unitsLabel')}</p>
                      <p className="font-bold">{formatNumber(warehouse.totalQuantity)}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-muted-foreground">{t('inventory:valueLabel')}</p>
                      <p className="font-bold text-lg">{formatCurrency(warehouse.totalValue, 'EUR')}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
