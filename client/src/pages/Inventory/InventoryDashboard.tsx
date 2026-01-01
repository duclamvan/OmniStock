import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Calendar,
  ShoppingCart,
  AlertCircle,
  CheckCircle2,
  Target,
  Layers,
  Package2,
  ArrowUpRight,
  Timer,
  Zap
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
  Legend,
  LineChart,
  Line,
  AreaChart,
  Area
} from "recharts";

interface ForecastData {
  period: string;
  days: number;
  expectedSales: number;
  stockNeeds: number;
  potentialShortfalls: number;
  shortfallProducts: Array<{ id: string; name: string; sku: string; shortfall: number }>;
}

interface ReorderItem {
  id: string;
  name: string;
  sku: string;
  currentStock: number;
  velocity: number;
  daysUntilOut: number | null;
  suggestedQty: number;
}

interface CoverageItem {
  id: string;
  name: string;
  sku: string;
  currentStock: number;
  velocity30: number;
  velocity90: number;
  coverageDays30: number | null;
  coverageDays90: number | null;
  runsOutIn30Days: boolean;
  runsOutIn90Days: boolean;
  runsOutIn180Days: boolean;
}

interface InventoryDashboardData {
  summary: {
    totalProducts: number;
    totalSKUs: number;
    totalUnits: number;
    totalProductUnits: number;
    totalVariantUnits: number;
    totalInventoryValue: number;
    healthyStock: number;
    lowStock: number;
    outOfStock: number;
    overstocked: number;
    slowMoving: number;
    incomingShipments: number;
    virtualProductsExcluded: number;
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
    productQuantity: number;
    variantQuantity: number;
    minStockLevel: number;
    lowStockAlert: number;
    categoryName?: string;
  }>;
  topLowStockVariants: Array<{
    id: string;
    name: string;
    sku?: string;
    quantity: number;
    parentProductId: string;
    parentProductName?: string;
    parentProductSku?: string;
  }>;
  fastMovingProducts: Array<{
    id: string;
    name: string;
    sku?: string;
    quantity: number;
    unitsSold: number;
  }>;
  variantBreakdown: {
    totalVariants: number;
    totalVariantUnits: number;
    variantsWithStock: number;
    variantsOutOfStock: number;
    lowStockVariants: number;
  };
  forecasts: {
    nextSeason: ForecastData;
    halfYear: ForecastData;
    nextYear: ForecastData;
  };
  stockCoverage: {
    runsOutIn30Days: CoverageItem[];
    runsOutIn90Days: CoverageItem[];
    runsOutIn180Days: CoverageItem[];
  };
  actionItems: {
    reorderNow: ReorderItem[];
    reorderSoon: ReorderItem[];
    clearanceCandidates: Array<{ id: string; name: string; sku: string; currentStock: number; coverageDays: number | null }>;
    slowMovers: Array<{ id: string; name: string; sku?: string; quantity: number; lastUpdated: string }>;
  };
  timestamp: string;
}

const COLORS = {
  healthy: '#22c55e',
  lowStock: '#f59e0b',
  outOfStock: '#ef4444',
  overstocked: '#3b82f6',
  primary: '#6366f1',
  secondary: '#8b5cf6',
  accent: '#06b6d4'
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

  const forecastChartData = data ? [
    { name: '90d', expected: data.forecasts.nextSeason.expectedSales, needs: data.forecasts.nextSeason.stockNeeds },
    { name: '180d', expected: data.forecasts.halfYear.expectedSales, needs: data.forecasts.halfYear.stockNeeds },
    { name: '365d', expected: data.forecasts.nextYear.expectedSales, needs: data.forecasts.nextYear.stockNeeds }
  ] : [];

  const categoryChartData = data?.stockByCategory.slice(0, 6).map(cat => ({
    name: cat.name.length > 10 ? cat.name.substring(0, 10) + '...' : cat.name,
    value: cat.totalValue,
    quantity: cat.totalQuantity
  })) || [];

  const stockHealthScore = data ? Math.round(
    (data.stockDistribution.healthy / (data.summary.totalProducts || 1)) * 100
  ) : 0;

  if (isLoading) {
    return (
      <div className="container mx-auto p-4 md:p-6 space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-72" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-80 lg:col-span-2" />
          <Skeleton className="h-80" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3" data-testid="page-title">
            <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl">
              <Boxes className="h-6 w-6 text-white" />
            </div>
            {t('inventory:inventoryDashboard')}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t('inventory:realTimeOverview')}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {dataUpdatedAt && (
            <span className="text-xs text-muted-foreground bg-muted px-3 py-1.5 rounded-full">
              {t('common:lastUpdated')}: {new Date(dataUpdatedAt).toLocaleTimeString()}
            </span>
          )}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => refetch()}
            disabled={isFetching}
            className="gap-2"
            data-testid="button-refresh"
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
            {t('common:refresh')}
          </Button>
        </div>
      </div>

      {/* Executive KPI Banner */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-indigo-500 to-indigo-600 text-white border-0" data-testid="card-total-skus">
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-indigo-100 text-xs md:text-sm font-medium">{t('inventory:totalSKUs')}</p>
                <p className="text-2xl md:text-3xl font-bold mt-1">{formatNumber(data?.summary.totalSKUs || 0)}</p>
                <p className="text-indigo-200 text-[10px] md:text-xs mt-1">
                  {formatNumber(data?.summary.totalProducts || 0)} {t('inventory:products')} + {formatNumber(data?.variantBreakdown?.totalVariants || 0)} {t('inventory:variants')}
                </p>
              </div>
              <Layers className="h-10 w-10 md:h-12 md:w-12 text-indigo-200 opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white border-0" data-testid="card-total-units">
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-emerald-100 text-xs md:text-sm font-medium">{t('inventory:totalUnits')}</p>
                <p className="text-2xl md:text-3xl font-bold mt-1">{formatNumber(data?.summary.totalUnits || 0)}</p>
                <p className="text-emerald-200 text-[10px] md:text-xs mt-1">
                  {formatNumber(data?.summary.totalProductUnits || 0)} + {formatNumber(data?.summary.totalVariantUnits || 0)} {t('inventory:variantUnits')}
                </p>
              </div>
              <Package2 className="h-10 w-10 md:h-12 md:w-12 text-emerald-200 opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-violet-500 to-violet-600 text-white border-0" data-testid="card-inventory-value">
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-violet-100 text-xs md:text-sm font-medium">{t('inventory:inventoryValue')}</p>
                <p className="text-xl md:text-2xl font-bold mt-1">{formatCurrency(data?.summary.totalInventoryValue || 0, 'EUR')}</p>
              </div>
              <DollarSign className="h-10 w-10 md:h-12 md:w-12 text-violet-200 opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-cyan-500 to-cyan-600 text-white border-0" data-testid="card-stock-health">
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-cyan-100 text-xs md:text-sm font-medium">{t('inventory:stockHealth')}</p>
                <p className="text-2xl md:text-3xl font-bold mt-1">{stockHealthScore}%</p>
                <Progress value={stockHealthScore} className="h-1.5 mt-2 bg-cyan-400/30" />
              </div>
              <Target className="h-10 w-10 md:h-12 md:w-12 text-cyan-200 opacity-80" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Stock Status Pills */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-2 md:gap-3">
        <div className="flex items-center gap-2 p-3 rounded-xl bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800" data-testid="pill-healthy">
          <CheckCircle2 className="h-5 w-5 text-green-600" />
          <div>
            <p className="text-lg md:text-xl font-bold text-green-700 dark:text-green-400">{data?.summary.healthyStock || 0}</p>
            <p className="text-[10px] md:text-xs text-green-600 dark:text-green-500">{t('inventory:healthy')}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800" data-testid="pill-low-stock">
          <AlertTriangle className="h-5 w-5 text-amber-600" />
          <div>
            <p className="text-lg md:text-xl font-bold text-amber-700 dark:text-amber-400">{data?.summary.lowStock || 0}</p>
            <p className="text-[10px] md:text-xs text-amber-600 dark:text-amber-500">{t('inventory:lowStockShort')}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800" data-testid="pill-out-of-stock">
          <PackageX className="h-5 w-5 text-red-600" />
          <div>
            <p className="text-lg md:text-xl font-bold text-red-700 dark:text-red-400">{data?.summary.outOfStock || 0}</p>
            <p className="text-[10px] md:text-xs text-red-600 dark:text-red-500">{t('inventory:outOfStockShort')}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 p-3 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800" data-testid="pill-overstocked">
          <TrendingUp className="h-5 w-5 text-blue-600" />
          <div>
            <p className="text-lg md:text-xl font-bold text-blue-700 dark:text-blue-400">{data?.summary.overstocked || 0}</p>
            <p className="text-[10px] md:text-xs text-blue-600 dark:text-blue-500">{t('inventory:overstockedShort')}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 p-3 rounded-xl bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800" data-testid="pill-slow-moving">
          <Clock className="h-5 w-5 text-orange-600" />
          <div>
            <p className="text-lg md:text-xl font-bold text-orange-700 dark:text-orange-400">{data?.summary.slowMoving || 0}</p>
            <p className="text-[10px] md:text-xs text-orange-600 dark:text-orange-500">{t('inventory:slowMovingShort')}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 p-3 rounded-xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800" data-testid="pill-incoming">
          <Truck className="h-5 w-5 text-purple-600" />
          <div>
            <p className="text-lg md:text-xl font-bold text-purple-700 dark:text-purple-400">{data?.summary.incomingShipments || 0}</p>
            <p className="text-[10px] md:text-xs text-purple-600 dark:text-purple-500">{t('inventory:incoming')}</p>
          </div>
        </div>
      </div>

      {/* Forecasting Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="border-l-4 border-l-indigo-500" data-testid="card-forecast-90">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm md:text-base flex items-center gap-2">
              <Calendar className="h-4 w-4 text-indigo-500" />
              {t('inventory:next90Days')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs md:text-sm text-muted-foreground">{t('inventory:expectedSales')}</span>
              <span className="font-bold text-sm md:text-base">{formatNumber(data?.forecasts?.nextSeason?.expectedSales || 0)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs md:text-sm text-muted-foreground">{t('inventory:stockNeeded')}</span>
              <span className="font-bold text-sm md:text-base text-amber-600">{formatNumber(data?.forecasts?.nextSeason?.stockNeeds || 0)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs md:text-sm text-muted-foreground">{t('inventory:potentialShortfalls')}</span>
              <Badge variant={data?.forecasts?.nextSeason?.potentialShortfalls ? "destructive" : "secondary"} className="text-xs">
                {data?.forecasts?.nextSeason?.potentialShortfalls || 0} {t('inventory:items')}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-violet-500" data-testid="card-forecast-180">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm md:text-base flex items-center gap-2">
              <Calendar className="h-4 w-4 text-violet-500" />
              {t('inventory:next180Days')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs md:text-sm text-muted-foreground">{t('inventory:expectedSales')}</span>
              <span className="font-bold text-sm md:text-base">{formatNumber(data?.forecasts?.halfYear?.expectedSales || 0)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs md:text-sm text-muted-foreground">{t('inventory:stockNeeded')}</span>
              <span className="font-bold text-sm md:text-base text-amber-600">{formatNumber(data?.forecasts?.halfYear?.stockNeeds || 0)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs md:text-sm text-muted-foreground">{t('inventory:potentialShortfalls')}</span>
              <Badge variant={data?.forecasts?.halfYear?.potentialShortfalls ? "destructive" : "secondary"} className="text-xs">
                {data?.forecasts?.halfYear?.potentialShortfalls || 0} {t('inventory:items')}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-cyan-500" data-testid="card-forecast-365">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm md:text-base flex items-center gap-2">
              <Calendar className="h-4 w-4 text-cyan-500" />
              {t('inventory:nextYear')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs md:text-sm text-muted-foreground">{t('inventory:expectedSales')}</span>
              <span className="font-bold text-sm md:text-base">{formatNumber(data?.forecasts?.nextYear?.expectedSales || 0)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs md:text-sm text-muted-foreground">{t('inventory:stockNeeded')}</span>
              <span className="font-bold text-sm md:text-base text-amber-600">{formatNumber(data?.forecasts?.nextYear?.stockNeeds || 0)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs md:text-sm text-muted-foreground">{t('inventory:potentialShortfalls')}</span>
              <Badge variant={data?.forecasts?.nextYear?.potentialShortfalls ? "destructive" : "secondary"} className="text-xs">
                {data?.forecasts?.nextYear?.potentialShortfalls || 0} {t('inventory:items')}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Items Section */}
      <Card data-testid="card-action-items">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-amber-500" />
            {t('inventory:actionRequired')}
          </CardTitle>
          <CardDescription>{t('inventory:actionRequiredDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="reorder" className="w-full">
            <TabsList className="grid w-full grid-cols-4 h-auto">
              <TabsTrigger value="reorder" className="text-xs md:text-sm py-2 relative">
                {t('inventory:reorderNow')}
                {(data?.actionItems?.reorderNow?.length || 0) > 0 && (
                  <Badge variant="destructive" className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-[10px]">
                    {data?.actionItems?.reorderNow?.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="soon" className="text-xs md:text-sm py-2 relative">
                {t('inventory:reorderSoon')}
                {(data?.actionItems?.reorderSoon?.length || 0) > 0 && (
                  <Badge variant="secondary" className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-[10px]">
                    {data?.actionItems?.reorderSoon?.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="clearance" className="text-xs md:text-sm py-2">{t('inventory:clearance')}</TabsTrigger>
              <TabsTrigger value="slow" className="text-xs md:text-sm py-2">{t('inventory:slowMovers')}</TabsTrigger>
            </TabsList>

            <TabsContent value="reorder" className="mt-4">
              {data?.actionItems?.reorderNow && data.actionItems.reorderNow.length > 0 ? (
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {data.actionItems.reorderNow.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-800" data-testid={`row-reorder-${item.id}`}>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{item.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-[10px]">{item.sku}</Badge>
                          <span className="text-xs text-muted-foreground">{item.currentStock} in stock</span>
                        </div>
                      </div>
                      <div className="text-right ml-2">
                        <p className="text-sm font-bold text-red-600">{item.daysUntilOut}d left</p>
                        <p className="text-xs text-muted-foreground">{t('inventory:suggest')}: +{item.suggestedQty}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle2 className="h-12 w-12 mx-auto mb-2 text-green-500" />
                  <p className="text-sm">{t('inventory:noUrgentReorders')}</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="soon" className="mt-4">
              {data?.actionItems?.reorderSoon && data.actionItems.reorderSoon.length > 0 ? (
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {data.actionItems.reorderSoon.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800" data-testid={`row-reorder-soon-${item.id}`}>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{item.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-[10px]">{item.sku}</Badge>
                          <span className="text-xs text-muted-foreground">{item.currentStock} in stock</span>
                        </div>
                      </div>
                      <div className="text-right ml-2">
                        <p className="text-sm font-bold text-amber-600">{item.daysUntilOut}d left</p>
                        <p className="text-xs text-muted-foreground">{t('inventory:suggest')}: +{item.suggestedQty}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle2 className="h-12 w-12 mx-auto mb-2 text-green-500" />
                  <p className="text-sm">{t('inventory:noUpcomingReorders')}</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="clearance" className="mt-4">
              {data?.actionItems?.clearanceCandidates && data.actionItems.clearanceCandidates.length > 0 ? (
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {data.actionItems.clearanceCandidates.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800" data-testid={`row-clearance-${item.id}`}>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{item.name}</p>
                        <Badge variant="outline" className="text-[10px] mt-1">{item.sku}</Badge>
                      </div>
                      <div className="text-right ml-2">
                        <p className="text-sm font-bold">{item.currentStock} units</p>
                        <p className="text-xs text-blue-600">{item.coverageDays}+ days supply</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-2" />
                  <p className="text-sm">{t('inventory:noClearanceCandidates')}</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="slow" className="mt-4">
              {data?.actionItems?.slowMovers && data.actionItems.slowMovers.length > 0 ? (
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {data.actionItems.slowMovers.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-3 bg-orange-50 dark:bg-orange-950/20 rounded-lg border border-orange-200 dark:border-orange-800" data-testid={`row-slow-${item.id}`}>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{item.name}</p>
                        <Badge variant="outline" className="text-[10px] mt-1">{item.sku}</Badge>
                      </div>
                      <div className="text-right ml-2">
                        <p className="text-sm font-bold">{item.quantity} units</p>
                        <p className="text-xs text-muted-foreground">No updates 90+ days</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <TrendingUp className="h-12 w-12 mx-auto mb-2 text-green-500" />
                  <p className="text-sm">{t('inventory:noSlowMovers')}</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Charts & Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Stock Distribution Pie */}
        <Card data-testid="card-stock-distribution">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="h-5 w-5 text-indigo-500" />
              {t('inventory:stockDistribution')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pieChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <RechartsPie>
                  <Pie
                    data={pieChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, value }) => `${value}`}
                    labelLine={false}
                  >
                    {pieChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={2} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                </RechartsPie>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                <p className="text-sm">{t('inventory:noDataAvailable')}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Category Value Chart */}
        <Card data-testid="card-category-value">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <DollarSign className="h-5 w-5 text-emerald-500" />
              {t('inventory:valueByCategory')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {categoryChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={categoryChartData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis type="number" tickFormatter={(value) => `€${formatNumber(value / 1000)}k`} tick={{ fontSize: 10 }} />
                  <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(value: number) => [`€${formatNumber(value)}`, t('inventory:value')]} />
                  <Bar dataKey="value" fill="#6366f1" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                <p className="text-sm">{t('inventory:noDataAvailable')}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Performers & Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Fast Moving Products */}
        <Card data-testid="card-fast-moving">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-green-600 text-base">
                <TrendingUp className="h-5 w-5" />
                {t('inventory:fastMovingProducts')}
              </CardTitle>
              <CardDescription className="text-xs">{t('inventory:topSellers')}</CardDescription>
            </div>
            <Link href="/inventory">
              <Button variant="ghost" size="sm" className="text-xs gap-1" data-testid="link-view-products">
                {t('common:viewAll')}
                <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {data?.fastMovingProducts && data.fastMovingProducts.length > 0 ? (
              <div className="space-y-2">
                {data.fastMovingProducts.slice(0, 5).map((product, index) => (
                  <div key={product.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors" data-testid={`row-fast-${product.id}`}>
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center text-white font-bold text-sm">
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{product.name}</p>
                      <Badge variant="outline" className="text-[10px]">{product.sku}</Badge>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-green-600">{formatNumber(product.unitsSold)}</p>
                      <p className="text-[10px] text-muted-foreground">{t('inventory:sold')}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                <Package className="h-10 w-10 mx-auto mb-2" />
                <p className="text-sm">{t('inventory:noSalesData')}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Low Stock Alert */}
        <Card data-testid="card-low-stock-alert">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-amber-600 text-base">
                <AlertTriangle className="h-5 w-5" />
                {t('inventory:lowStockAlert')}
              </CardTitle>
              <CardDescription className="text-xs">{t('inventory:needsAttention')}</CardDescription>
            </div>
            <Link href="/inventory">
              <Button variant="ghost" size="sm" className="text-xs gap-1" data-testid="link-view-low-stock">
                {t('common:viewAll')}
                <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {data?.topLowStockProducts && data.topLowStockProducts.length > 0 ? (
              <div className="space-y-2">
                {data.topLowStockProducts.slice(0, 5).map((product) => (
                  <div key={product.id} className="flex items-center justify-between p-2 bg-amber-50 dark:bg-amber-950/20 rounded-lg" data-testid={`row-low-${product.id}`}>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{product.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-[10px]">{product.sku}</Badge>
                        {product.categoryName && (
                          <span className="text-[10px] text-muted-foreground">{product.categoryName}</span>
                        )}
                      </div>
                    </div>
                    <div className="text-right ml-2">
                      <p className="text-lg font-bold text-amber-600">{product.quantity}</p>
                      <p className="text-[10px] text-muted-foreground">{t('inventory:inStock')}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                <CheckCircle2 className="h-10 w-10 mx-auto mb-2 text-green-500" />
                <p className="text-sm">{t('inventory:allStockHealthy')}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Warehouse Overview */}
      {data?.stockByWarehouse && data.stockByWarehouse.length > 0 && (
        <Card data-testid="card-warehouses">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Warehouse className="h-5 w-5 text-indigo-500" />
              {t('inventory:warehouseOverview')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.stockByWarehouse.map((warehouse) => (
                <div key={warehouse.id} className="p-4 border rounded-xl bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800" data-testid={`card-warehouse-${warehouse.id}`}>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-2 bg-indigo-100 dark:bg-indigo-900 rounded-lg">
                      <Warehouse className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <h3 className="font-semibold text-sm truncate">{warehouse.name}</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-muted-foreground">{t('inventory:products')}</p>
                      <p className="text-lg font-bold">{warehouse.productCount}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">{t('inventory:units')}</p>
                      <p className="text-lg font-bold">{formatNumber(warehouse.totalQuantity)}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-xs text-muted-foreground">{t('inventory:totalValue')}</p>
                      <p className="text-xl font-bold text-emerald-600">{formatCurrency(warehouse.totalValue, 'EUR')}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Variant Breakdown Summary */}
      {data?.variantBreakdown && data.variantBreakdown.totalVariants > 0 && (
        <Card data-testid="card-variants">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Layers className="h-5 w-5 text-purple-500" />
              {t('inventory:variantSummary')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="text-center p-3 bg-purple-50 dark:bg-purple-950/30 rounded-lg">
                <p className="text-2xl font-bold text-purple-600">{data.variantBreakdown.totalVariants}</p>
                <p className="text-xs text-muted-foreground">{t('inventory:totalVariants')}</p>
              </div>
              <div className="text-center p-3 bg-indigo-50 dark:bg-indigo-950/30 rounded-lg">
                <p className="text-2xl font-bold text-indigo-600">{formatNumber(data.variantBreakdown.totalVariantUnits)}</p>
                <p className="text-xs text-muted-foreground">{t('inventory:variantUnits')}</p>
              </div>
              <div className="text-center p-3 bg-green-50 dark:bg-green-950/30 rounded-lg">
                <p className="text-2xl font-bold text-green-600">{data.variantBreakdown.variantsWithStock}</p>
                <p className="text-xs text-muted-foreground">{t('inventory:inStock')}</p>
              </div>
              <div className="text-center p-3 bg-red-50 dark:bg-red-950/30 rounded-lg">
                <p className="text-2xl font-bold text-red-600">{data.variantBreakdown.variantsOutOfStock}</p>
                <p className="text-xs text-muted-foreground">{t('inventory:outOfStock')}</p>
              </div>
              <div className="text-center p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg">
                <p className="text-2xl font-bold text-amber-600">{data.variantBreakdown.lowStockVariants}</p>
                <p className="text-xs text-muted-foreground">{t('inventory:lowStock')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
