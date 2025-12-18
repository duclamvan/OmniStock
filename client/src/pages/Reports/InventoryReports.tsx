import { useMemo, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useTranslation } from 'react-i18next';
import { Link } from "wouter";
import { useReports } from "@/contexts/ReportsContext";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ReportHeader } from "@/components/reports/ReportHeader";
import { MetricCard } from "@/components/reports/MetricCard";
import { BarChartCard } from "@/components/reports/BarChartCard";
import { PieChartCard } from "@/components/reports/PieChartCard";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  Package, AlertTriangle, TrendingDown, Coins, Clock, Mail, Palette, History, 
  ChevronLeft, ChevronRight, FileSpreadsheet, FileText, TrendingUp, Activity,
  ShoppingCart, Eye, ChevronDown, Zap, BarChart3, Truck, PackageCheck, AlertCircle
} from "lucide-react";
import { calculateInventoryMetrics, preparePieChartData } from "@/lib/reportUtils";
import { formatCurrency } from "@/lib/currencyUtils";
import { exportToXLSX, exportToPDF, PDFColumn } from "@/lib/exportUtils";
import { useToast } from "@/hooks/use-toast";
import { format, differenceInDays, subDays } from "date-fns";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  LineChart, Line, AreaChart, Area, Legend, Cell, PieChart, Pie 
} from "recharts";

interface DashboardSummary {
  totalProducts: number;
  totalUnits: number;
  inventoryValue: number;
  healthyStock: number;
  lowStock: number;
  outOfStock: number;
  overstocked: number;
  slowMoving: number;
  incomingShipments: number;
}

interface FastMovingProduct {
  id: string;
  name: string;
  sku: string;
  unitsSold: number;
  currentStock: number;
  velocity: number;
}

export default function InventoryReports() {
  const { toast } = useToast();
  const { t } = useTranslation('reports');
  const { t: tCommon } = useTranslation('common');
  const { getDateRangeValues } = useReports();
  const [deadStockDays, setDeadStockDays] = useState(200);
  const [colorTrendsStartDate, setColorTrendsStartDate] = useState('');
  const [colorTrendsEndDate, setColorTrendsEndDate] = useState('');
  const [adjustmentHistoryStartDate, setAdjustmentHistoryStartDate] = useState('');
  const [adjustmentHistoryEndDate, setAdjustmentHistoryEndDate] = useState('');
  const [adjustmentHistoryOffset, setAdjustmentHistoryOffset] = useState(0);
  const [movementTypeFilter, setMovementTypeFilter] = useState<string>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [isReorderInsightsOpen, setIsReorderInsightsOpen] = useState(true);
  const [isFastMovingOpen, setIsFastMovingOpen] = useState(true);
  const ADJUSTMENT_HISTORY_LIMIT = 20;

  const { data: products = [], isLoading: productsLoading } = useQuery({ queryKey: ['/api/products'] });
  const { data: categories = [] } = useQuery({ queryKey: ['/api/categories'] });
  
  const { data: dashboardData, isLoading: dashboardLoading } = useQuery({
    queryKey: ['/api/dashboard/inventory'],
    queryFn: async () => {
      const response = await fetch('/api/dashboard/inventory');
      if (!response.ok) throw new Error('Failed to fetch dashboard data');
      return response.json();
    }
  });

  const { data: deadStockProducts = [], isLoading: deadStockLoading } = useQuery({ 
    queryKey: ['/api/reports/dead-stock', deadStockDays],
    queryFn: async () => {
      const response = await fetch(`/api/reports/dead-stock?days=${deadStockDays}`);
      if (!response.ok) throw new Error('Failed to fetch dead stock');
      return response.json();
    },
    enabled: deadStockDays > 0
  });
  
  const { data: reorderAlerts = [], isLoading: reorderAlertsLoading } = useQuery({ 
    queryKey: ['/api/reports/reorder-alerts']
  });
  
  const { data: colorTrends = [], isLoading: colorTrendsLoading } = useQuery({ 
    queryKey: ['/api/reports/color-trends', 'Gel Polish', colorTrendsStartDate, colorTrendsEndDate],
    queryFn: async () => {
      const params = new URLSearchParams({
        categoryName: 'Gel Polish',
        ...(colorTrendsStartDate && { startDate: colorTrendsStartDate }),
        ...(colorTrendsEndDate && { endDate: colorTrendsEndDate })
      });
      const response = await fetch(`/api/reports/color-trends?${params}`);
      if (!response.ok) throw new Error('Failed to fetch color trends');
      return response.json();
    },
    enabled: true
  });

  const { data: users = [] } = useQuery({ queryKey: ['/api/users'] });
  
  const { data: productLocations = [] } = useQuery({ 
    queryKey: ['/api/product-locations'],
    queryFn: async () => {
      const response = await fetch('/api/product-locations');
      if (!response.ok) throw new Error('Failed to fetch product locations');
      return response.json();
    }
  });

  const { data: stockAdjustmentHistoryData, isLoading: adjustmentHistoryLoading } = useQuery({ 
    queryKey: ['/api/stock-adjustment-history', adjustmentHistoryStartDate, adjustmentHistoryEndDate, adjustmentHistoryOffset, ADJUSTMENT_HISTORY_LIMIT],
    queryFn: async () => {
      const params = new URLSearchParams({
        limit: ADJUSTMENT_HISTORY_LIMIT.toString(),
        offset: adjustmentHistoryOffset.toString(),
        ...(adjustmentHistoryStartDate && { startDate: adjustmentHistoryStartDate }),
        ...(adjustmentHistoryEndDate && { endDate: adjustmentHistoryEndDate })
      });
      const response = await fetch(`/api/stock-adjustment-history?${params}`);
      if (!response.ok) throw new Error('Failed to fetch stock adjustment history');
      return response.json();
    }
  });

  const stockAdjustmentHistory = stockAdjustmentHistoryData?.history || [];
  const stockAdjustmentHistoryTotal = stockAdjustmentHistoryData?.total || 0;

  const inventoryMetrics = useMemo(() => {
    return calculateInventoryMetrics(products as any[]);
  }, [products]);

  const dashboardSummary: DashboardSummary = useMemo(() => {
    if (dashboardData?.summary) {
      return {
        totalProducts: dashboardData.summary.totalProducts || 0,
        totalUnits: dashboardData.summary.totalUnits || inventoryMetrics.totalStock,
        inventoryValue: dashboardData.summary.totalInventoryValue || inventoryMetrics.totalValue,
        healthyStock: dashboardData.summary.healthyStock || 0,
        lowStock: dashboardData.summary.lowStock || inventoryMetrics.lowStockCount,
        outOfStock: dashboardData.summary.outOfStock || inventoryMetrics.outOfStockCount,
        overstocked: dashboardData.summary.overstocked || 0,
        slowMoving: dashboardData.summary.slowMoving || 0,
        incomingShipments: dashboardData.summary.incomingShipments || 0,
      };
    }
    return {
      totalProducts: (products as any[]).length,
      totalUnits: inventoryMetrics.totalStock,
      inventoryValue: inventoryMetrics.totalValue,
      healthyStock: (products as any[]).filter((p: any) => (p.quantity || 0) > (p.lowStockAlert || 5)).length,
      lowStock: inventoryMetrics.lowStockCount,
      outOfStock: inventoryMetrics.outOfStockCount,
      overstocked: 0,
      slowMoving: 0,
      incomingShipments: 0,
    };
  }, [dashboardData, products, inventoryMetrics]);

  const stockByCategory = useMemo(() => {
    const categoryStock: { [key: string]: number } = {};

    (products as any[]).forEach((product: any) => {
      if (product.categoryId) {
        const category = (categories as any[]).find((c: any) => c.id === product.categoryId);
        const categoryName = category?.name || tCommon('uncategorized');
        const value = (product.quantity || 0) * parseFloat(product.priceCzk || '0');
        categoryStock[categoryName] = (categoryStock[categoryName] || 0) + value;
      }
    });

    const data = Object.entries(categoryStock).map(([name, value]) => ({ name, value }));
    return preparePieChartData(data);
  }, [products, categories, tCommon]);

  const stockHealthData = useMemo(() => {
    return preparePieChartData([
      { name: t('healthyStock'), value: dashboardSummary.healthyStock },
      { name: t('lowStock'), value: dashboardSummary.lowStock },
      { name: t('outOfStock'), value: dashboardSummary.outOfStock },
      { name: t('overstocked'), value: dashboardSummary.overstocked },
    ]);
  }, [dashboardSummary, t]);

  const stockLevelData = useMemo(() => {
    const inStock = (products as any[]).filter((p: any) => (p.quantity || 0) > (p.lowStockAlert || 5)).length;
    const lowStock = inventoryMetrics.lowStockCount;
    const outOfStock = inventoryMetrics.outOfStockCount;

    return preparePieChartData([
      { name: t('inStock'), value: inStock },
      { name: t('lowStock'), value: lowStock },
      { name: t('outOfStock'), value: outOfStock },
    ]);
  }, [products, inventoryMetrics, t]);

  const topValueProducts = useMemo(() => {
    return (products as any[])
      .map((p: any) => ({
        id: p.id,
        name: p.name,
        sku: p.sku,
        quantity: p.quantity || 0,
        price: parseFloat(p.priceCzk || '0'),
        totalValue: (p.quantity || 0) * parseFloat(p.priceCzk || '0'),
        reorderRate: p.reorderRate ? parseFloat(p.reorderRate) : null,
      }))
      .sort((a, b) => b.totalValue - a.totalValue)
      .slice(0, 10);
  }, [products]);

  const fastMovingProducts: FastMovingProduct[] = useMemo(() => {
    const productsWithSales = (products as any[])
      .filter((p: any) => p.totalSold && p.totalSold > 0)
      .map((p: any) => ({
        id: p.id,
        name: p.name,
        sku: p.sku || 'N/A',
        unitsSold: p.totalSold || 0,
        currentStock: p.quantity || 0,
        velocity: p.totalSold / 30,
      }))
      .sort((a, b) => b.unitsSold - a.unitsSold)
      .slice(0, 10);
    return productsWithSales;
  }, [products]);

  const strategicReorderProducts = useMemo(() => {
    return (products as any[])
      .filter((p: any) => {
        const currentStock = p.quantity || 0;
        const minLevel = p.minStockLevel || p.lowStockAlert || 5;
        return currentStock <= minLevel * 1.5;
      })
      .map((p: any) => {
        const currentStock = p.quantity || 0;
        const avgDailyDemand = p.totalSold ? p.totalSold / 30 : 0.5;
        const daysOfCover = avgDailyDemand > 0 ? currentStock / avgDailyDemand : 999;
        const leadTimeDays = p.leadTimeDays || 7;
        const minLevel = p.minStockLevel || p.lowStockAlert || 5;
        
        let priority: 'critical' | 'warning' | 'normal' = 'normal';
        if (currentStock === 0 || daysOfCover <= leadTimeDays) {
          priority = 'critical';
        } else if (daysOfCover <= leadTimeDays * 2 || currentStock <= minLevel) {
          priority = 'warning';
        }

        return {
          id: p.id,
          name: p.name,
          sku: p.sku || 'N/A',
          currentStock,
          minLevel,
          avgDailyDemand: avgDailyDemand.toFixed(1),
          daysOfCover: Math.round(daysOfCover),
          leadTimeDays,
          priority,
        };
      })
      .sort((a, b) => {
        const priorityOrder = { critical: 0, warning: 1, normal: 2 };
        return priorityOrder[a.priority] - priorityOrder[b.priority] || a.daysOfCover - b.daysOfCover;
      })
      .slice(0, 15);
  }, [products]);

  const stockMovementTrendData = useMemo(() => {
    const last30Days = Array.from({ length: 30 }, (_, i) => {
      const date = subDays(new Date(), 29 - i);
      return {
        date: format(date, 'MMM dd'),
        fullDate: format(date, 'yyyy-MM-dd'),
        additions: 0,
        removals: 0,
        adjustments: 0,
      };
    });

    stockAdjustmentHistory.forEach((item: any) => {
      const itemDate = format(new Date(item.createdAt), 'yyyy-MM-dd');
      const dayData = last30Days.find(d => d.fullDate === itemDate);
      if (dayData) {
        if (item.adjustmentType === 'add') {
          dayData.additions += item.adjustedQuantity || 0;
        } else if (item.adjustmentType === 'remove') {
          dayData.removals += item.adjustedQuantity || 0;
        } else {
          dayData.adjustments += 1;
        }
      }
    });

    return last30Days;
  }, [stockAdjustmentHistory]);

  const filteredAdjustmentHistory = useMemo(() => {
    return stockAdjustmentHistory.filter((item: any) => {
      if (movementTypeFilter !== 'all' && item.adjustmentType !== movementTypeFilter) {
        return false;
      }
      if (sourceFilter !== 'all' && item.source !== sourceFilter) {
        return false;
      }
      return true;
    });
  }, [stockAdjustmentHistory, movementTypeFilter, sourceFilter]);

  const productLookup = useMemo(() => {
    const map = new Map<string, string>();
    (products as any[]).forEach((p: any) => map.set(p.id, p.name));
    return map;
  }, [products]);

  const userLookup = useMemo(() => {
    const map = new Map<string, string>();
    (users as any[]).forEach((u: any) => map.set(u.id, u.username || u.email || u.firstName || 'Unknown'));
    return map;
  }, [users]);

  const locationLookup = useMemo(() => {
    const map = new Map<string, string>();
    (productLocations as any[]).forEach((loc: any) => map.set(loc.id, loc.locationCode));
    return map;
  }, [productLocations]);

  const handleExportExcel = () => {
    try {
      const exportData = (products as any[]).map((p: any) => ({
        [t('product')]: p.name,
        [t('sku')]: p.sku || '',
        [t('stock')]: p.quantity || 0,
        [t('lowStockAlert')]: p.lowStockAlert || 0,
        [t('price')]: parseFloat(p.priceCzk || '0'),
        [t('totalValue')]: (p.quantity || 0) * parseFloat(p.priceCzk || '0'),
        [t('status')]: (p.quantity || 0) === 0 ? t('outOfStock') : (p.quantity || 0) <= (p.lowStockAlert || 5) ? t('lowStock') : t('inStock'),
      }));

      exportToXLSX(exportData, `Inventory_Report_${format(new Date(), 'yyyy-MM-dd')}`, t('inventoryReport'));
      
      toast({
        title: t('exportSuccessful'),
        description: t('inventoryReportExportedXlsx'),
      });
    } catch (error) {
      toast({
        title: t('exportFailed'),
        description: t('failedToExportInventoryReport'),
        variant: "destructive",
      });
    }
  };

  const handleExportPDF = () => {
    try {
      const exportData = inventoryMetrics.lowStockProducts.map((p: any) => ({
        product: p.name,
        sku: p.sku || '',
        quantity: p.quantity?.toString() || '0',
        alert: p.lowStockAlert?.toString() || '0',
      }));

      const columns: PDFColumn[] = [
        { key: 'product', header: t('product') },
        { key: 'sku', header: t('sku') },
        { key: 'quantity', header: t('stock') },
        { key: 'alert', header: t('lowStockAlert') },
      ];

      exportToPDF(
        t('lowStockAlerts'),
        exportData,
        columns,
        `Inventory_Report_${format(new Date(), 'yyyy-MM-dd')}`
      );

      toast({
        title: t('exportSuccessful'),
        description: t('inventoryReportExportedPdf'),
      });
    } catch (error) {
      toast({
        title: t('exportFailed'),
        description: t('failedToExportInventoryReportPdf'),
        variant: "destructive",
      });
    }
  };

  const handleExportStockHistoryExcel = () => {
    try {
      const exportData = stockAdjustmentHistory.map((item: any) => ({
        [t('date')]: format(new Date(item.createdAt), 'yyyy-MM-dd HH:mm'),
        [t('product')]: productLookup.get(item.productId) || t('unknownProduct'),
        [t('locationCode')]: locationLookup.get(item.locationId) || t('unknownLocation'),
        [t('adjustmentType')]: item.adjustmentType,
        [t('previousQty')]: item.previousQuantity,
        [t('change')]: item.adjustmentType === 'set' 
          ? item.adjustedQuantity 
          : (item.adjustmentType === 'add' ? `+${item.adjustedQuantity}` : `-${item.adjustedQuantity}`),
        [t('newQty')]: item.newQuantity,
        [t('reason')]: item.reason,
        [t('source')]: item.source,
        [t('adjustedBy')]: item.adjustedBy ? (userLookup.get(item.adjustedBy) || t('unknownUser')) : '',
      }));

      exportToXLSX(exportData, `Stock_Adjustment_History_${format(new Date(), 'yyyy-MM-dd')}`, t('stockAdjustmentHistory'));
      
      toast({
        title: t('exportSuccessful'),
        description: t('stockHistoryExportedXlsx'),
      });
    } catch (error) {
      toast({
        title: t('exportFailed'),
        description: t('failedToExportStockHistory'),
        variant: "destructive",
      });
    }
  };

  const handleExportStockHistoryPDF = () => {
    try {
      const exportData = stockAdjustmentHistory.map((item: any) => ({
        date: format(new Date(item.createdAt), 'yyyy-MM-dd HH:mm'),
        product: productLookup.get(item.productId) || t('unknownProduct'),
        location: locationLookup.get(item.locationId) || t('unknownLocation'),
        type: item.adjustmentType,
        prevQty: item.previousQuantity?.toString() || '0',
        change: item.adjustmentType === 'set' 
          ? item.adjustedQuantity?.toString() 
          : (item.adjustmentType === 'add' ? `+${item.adjustedQuantity}` : `-${item.adjustedQuantity}`),
        newQty: item.newQuantity?.toString() || '0',
        reason: item.reason || '',
      }));

      const columns: PDFColumn[] = [
        { key: 'date', header: t('date') },
        { key: 'product', header: t('product') },
        { key: 'location', header: t('locationCode') },
        { key: 'type', header: t('adjustmentType') },
        { key: 'prevQty', header: t('previousQty') },
        { key: 'change', header: t('change') },
        { key: 'newQty', header: t('newQty') },
        { key: 'reason', header: t('reason') },
      ];

      exportToPDF(
        t('stockAdjustmentHistory'),
        exportData,
        columns,
        `Stock_Adjustment_History_${format(new Date(), 'yyyy-MM-dd')}`
      );

      toast({
        title: t('exportSuccessful'),
        description: t('stockHistoryExportedPdf'),
      });
    } catch (error) {
      toast({
        title: t('exportFailed'),
        description: t('failedToExportStockHistory'),
        variant: "destructive",
      });
    }
  };

  const getAdjustmentTypeBadgeVariant = (type: string) => {
    switch (type) {
      case 'add': return 'default';
      case 'remove': return 'destructive';
      case 'set': return 'secondary';
      default: return 'outline';
    }
  };

  const getSourceBadgeVariant = (source: string) => {
    switch (source) {
      case 'direct': return 'outline';
      case 'approved_request': return 'default';
      case 'receiving': return 'secondary';
      case 'order_fulfillment': return 'destructive';
      default: return 'outline';
    }
  };

  const formatSourceLabel = (source: string) => {
    switch (source) {
      case 'direct': return t('direct');
      case 'approved_request': return t('approvedRequest');
      case 'receiving': return t('receiving');
      case 'order_fulfillment': return t('fulfillment');
      default: return source;
    }
  };

  const getPriorityBadge = (priority: 'critical' | 'warning' | 'normal') => {
    switch (priority) {
      case 'critical':
        return <Badge variant="destructive" className="gap-1" data-testid="badge-priority-critical"><AlertCircle className="h-3 w-3" />{t('critical')}</Badge>;
      case 'warning':
        return <Badge variant="default" className="gap-1 bg-yellow-500" data-testid="badge-priority-warning"><AlertTriangle className="h-3 w-3" />{t('warning')}</Badge>;
      default:
        return <Badge variant="secondary" data-testid="badge-priority-normal">{t('normal')}</Badge>;
    }
  };

  const sendReorderAlertsMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/reports/reorder-alerts/notify');
      return await response.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/reports/reorder-alerts'] });
      toast({
        title: t('emailFeature'),
        description: data.message || t('emailNotificationFeatureComingSoon'),
      });
    },
    onError: (error: Error) => {
      toast({
        title: tCommon('error'),
        description: error.message || t('failedToSendEmailNotifications'),
        variant: "destructive",
      });
    },
  });

  if (productsLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 p-2 sm:p-4 md:p-6 overflow-x-hidden" data-testid="inventory-reports">
      <ReportHeader
        title={t('inventoryReportsTitle')}
        description={t('inventoryReportsDesc')}
        onExportExcel={handleExportExcel}
        onExportPDF={handleExportPDF}
        showDateFilter
      />

      {/* Dashboard Summary Section */}
      <Card data-testid="card-dashboard-summary">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-blue-600" />
            {t('dashboardSummary')}
          </CardTitle>
          <CardDescription>{t('dashboardSummaryDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          {dashboardLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {[...Array(9)].map((_, i) => <Skeleton key={i} className="h-20" />)}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              <div className="bg-white dark:bg-slate-800 border-l-4 border-l-blue-500 rounded-lg p-4 shadow-sm" data-testid="summary-total-products">
                <div className="text-sm text-slate-500 dark:text-slate-400">{t('totalProducts')}</div>
                <div className="text-2xl font-bold">{dashboardSummary.totalProducts.toLocaleString()}</div>
              </div>
              <div className="bg-white dark:bg-slate-800 border-l-4 border-l-indigo-500 rounded-lg p-4 shadow-sm" data-testid="summary-total-units">
                <div className="text-sm text-slate-500 dark:text-slate-400">{t('totalUnits')}</div>
                <div className="text-2xl font-bold">{dashboardSummary.totalUnits.toLocaleString()}</div>
              </div>
              <div className="bg-white dark:bg-slate-800 border-l-4 border-l-emerald-500 rounded-lg p-4 shadow-sm" data-testid="summary-inventory-value">
                <div className="text-sm text-slate-500 dark:text-slate-400">{t('inventoryValue')}</div>
                <div className="text-2xl font-bold">{formatCurrency(dashboardSummary.inventoryValue, 'CZK')}</div>
              </div>
              <div className="bg-white dark:bg-slate-800 border-l-4 border-l-green-500 rounded-lg p-4 shadow-sm" data-testid="summary-healthy-stock">
                <div className="text-sm text-slate-500 dark:text-slate-400">{t('healthyStock')}</div>
                <div className="text-2xl font-bold text-green-600">{dashboardSummary.healthyStock}</div>
              </div>
              <div className="bg-white dark:bg-slate-800 border-l-4 border-l-yellow-500 rounded-lg p-4 shadow-sm" data-testid="summary-low-stock">
                <div className="text-sm text-slate-500 dark:text-slate-400">{t('lowStock')}</div>
                <div className="text-2xl font-bold text-yellow-600">{dashboardSummary.lowStock}</div>
              </div>
              <div className="bg-white dark:bg-slate-800 border-l-4 border-l-red-500 rounded-lg p-4 shadow-sm" data-testid="summary-out-of-stock">
                <div className="text-sm text-slate-500 dark:text-slate-400">{t('outOfStock')}</div>
                <div className="text-2xl font-bold text-red-600">{dashboardSummary.outOfStock}</div>
              </div>
              <div className="bg-white dark:bg-slate-800 border-l-4 border-l-purple-500 rounded-lg p-4 shadow-sm" data-testid="summary-overstocked">
                <div className="text-sm text-slate-500 dark:text-slate-400">{t('overstocked')}</div>
                <div className="text-2xl font-bold text-purple-600">{dashboardSummary.overstocked}</div>
              </div>
              <div className="bg-white dark:bg-slate-800 border-l-4 border-l-orange-500 rounded-lg p-4 shadow-sm" data-testid="summary-slow-moving">
                <div className="text-sm text-slate-500 dark:text-slate-400">{t('slowMoving')}</div>
                <div className="text-2xl font-bold text-orange-600">{dashboardSummary.slowMoving}</div>
              </div>
              <div className="bg-white dark:bg-slate-800 border-l-4 border-l-cyan-500 rounded-lg p-4 shadow-sm" data-testid="summary-incoming-shipments">
                <div className="text-sm text-slate-500 dark:text-slate-400">{t('incomingShipments')}</div>
                <div className="text-2xl font-bold text-cyan-600">{dashboardSummary.incomingShipments}</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stock Distribution Analytics Section */}
      <Card data-testid="card-stock-distribution-analytics">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-purple-600" />
            {t('stockDistributionAnalytics')}
          </CardTitle>
          <CardDescription>{t('stockDistributionAnalyticsDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div data-testid="chart-stock-health-distribution">
              <h4 className="text-sm font-medium mb-4">{t('stockHealthDistribution')}</h4>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={stockHealthData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  >
                    {stockHealthData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={['#10b981', '#f59e0b', '#ef4444', '#8b5cf6'][index % 4]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div data-testid="chart-stock-value-by-category">
              <h4 className="text-sm font-medium mb-4">{t('stockValueByCategory')}</h4>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={stockByCategory.slice(0, 6)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-20} textAnchor="end" height={60} />
                  <YAxis tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(value: number) => formatCurrency(value, 'CZK')} />
                  <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stock Movement Trends Section */}
      <Card data-testid="card-stock-movement-trends">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-green-600" />
            {t('stockMovementTrends')}
          </CardTitle>
          <CardDescription>{t('stockMovementTrendsDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64 mb-6" data-testid="chart-stock-movement-trends">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stockMovementTrendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Area type="monotone" dataKey="additions" stackId="1" stroke="#10b981" fill="#10b981" name={t('additions')} />
                <Area type="monotone" dataKey="removals" stackId="2" stroke="#ef4444" fill="#ef4444" name={t('removals')} />
                <Area type="monotone" dataKey="adjustments" stackId="3" stroke="#6366f1" fill="#6366f1" name={t('adjustments')} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="flex flex-wrap gap-4 mb-4 pt-4 border-t">
            <div className="flex items-center gap-2">
              <Label htmlFor="movement-type-filter" className="whitespace-nowrap">{t('movementType')}:</Label>
              <Select value={movementTypeFilter} onValueChange={setMovementTypeFilter}>
                <SelectTrigger className="w-32" id="movement-type-filter" data-testid="select-movement-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('allTypes')}</SelectItem>
                  <SelectItem value="add">{t('add')}</SelectItem>
                  <SelectItem value="remove">{t('remove')}</SelectItem>
                  <SelectItem value="set">{t('set')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="source-filter" className="whitespace-nowrap">{t('source')}:</Label>
              <Select value={sourceFilter} onValueChange={setSourceFilter}>
                <SelectTrigger className="w-40" id="source-filter" data-testid="select-source-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('allSources')}</SelectItem>
                  <SelectItem value="direct">{t('direct')}</SelectItem>
                  <SelectItem value="approved_request">{t('approvedRequest')}</SelectItem>
                  <SelectItem value="receiving">{t('receiving')}</SelectItem>
                  <SelectItem value="order_fulfillment">{t('fulfillment')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Strategic Reordering Insights */}
      <Collapsible open={isReorderInsightsOpen} onOpenChange={setIsReorderInsightsOpen}>
        <Card data-testid="card-strategic-reordering">
          <CardHeader>
            <CollapsibleTrigger className="flex items-center justify-between w-full">
              <div className="flex flex-col items-start">
                <CardTitle className="flex items-center gap-2">
                  <Truck className="h-5 w-5 text-indigo-600" />
                  {t('strategicReorderingInsights')}
                </CardTitle>
                <CardDescription className="mt-1">{t('strategicReorderingDesc')}</CardDescription>
              </div>
              <ChevronDown className={`h-5 w-5 transition-transform ${isReorderInsightsOpen ? 'rotate-180' : ''}`} />
            </CollapsibleTrigger>
          </CardHeader>
          <CollapsibleContent>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('productName')}</TableHead>
                      <TableHead>{t('sku')}</TableHead>
                      <TableHead className="text-right">{t('currentStock')}</TableHead>
                      <TableHead className="text-right">{t('minLevel')}</TableHead>
                      <TableHead className="text-right">{t('avgDailyDemand')}</TableHead>
                      <TableHead className="text-right">{t('daysOfCover')}</TableHead>
                      <TableHead className="text-right">{t('leadTimeDays')}</TableHead>
                      <TableHead>{t('reorderPriority')}</TableHead>
                      <TableHead>{t('actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {strategicReorderProducts.map((product) => (
                      <TableRow key={product.id} data-testid={`row-strategic-reorder-${product.id}`}>
                        <TableCell className="font-medium">{product.name}</TableCell>
                        <TableCell>{product.sku}</TableCell>
                        <TableCell className="text-right">{product.currentStock}</TableCell>
                        <TableCell className="text-right">{product.minLevel}</TableCell>
                        <TableCell className="text-right">{product.avgDailyDemand}</TableCell>
                        <TableCell className="text-right">{product.daysOfCover === 999 ? '∞' : product.daysOfCover}</TableCell>
                        <TableCell className="text-right">{product.leadTimeDays}</TableCell>
                        <TableCell>{getPriorityBadge(product.priority)}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Link href={`/products/${product.id}`}>
                              <Button variant="outline" size="sm" data-testid={`button-view-product-${product.id}`}>
                                <Eye className="h-3 w-3 mr-1" />
                                {t('viewProduct')}
                              </Button>
                            </Link>
                            <Link href={`/purchase-orders/new?productId=${product.id}`}>
                              <Button variant="default" size="sm" data-testid={`button-create-po-${product.id}`}>
                                <ShoppingCart className="h-3 w-3 mr-1" />
                                {t('createPO')}
                              </Button>
                            </Link>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {strategicReorderProducts.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center text-slate-500">
                          {t('noReorderRequired')}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Fast Moving Products */}
      <Collapsible open={isFastMovingOpen} onOpenChange={setIsFastMovingOpen}>
        <Card data-testid="card-fast-moving-products">
          <CardHeader>
            <CollapsibleTrigger className="flex items-center justify-between w-full">
              <div className="flex flex-col items-start">
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-amber-600" />
                  {t('fastMovingProducts')}
                </CardTitle>
                <CardDescription className="mt-1">{t('fastMovingProductsDesc')}</CardDescription>
              </div>
              <ChevronDown className={`h-5 w-5 transition-transform ${isFastMovingOpen ? 'rotate-180' : ''}`} />
            </CollapsibleTrigger>
          </CardHeader>
          <CollapsibleContent>
            <CardContent>
              <div className="space-y-4">
                {fastMovingProducts.length > 0 ? (
                  fastMovingProducts.map((product, index) => {
                    const maxSold = fastMovingProducts[0]?.unitsSold || 1;
                    const percentage = (product.unitsSold / maxSold) * 100;
                    
                    return (
                      <div key={product.id} className="flex items-center gap-4" data-testid={`row-fast-moving-${product.id}`}>
                        <div className="w-8 text-center font-bold text-slate-500">#{index + 1}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium truncate">{product.name}</span>
                            <Badge variant="outline" className="ml-2 shrink-0">
                              {product.unitsSold} {t('unitsSoldLabel')}
                            </Badge>
                          </div>
                          <Progress value={percentage} className="h-2" />
                          <div className="flex justify-between text-xs text-slate-500 mt-1">
                            <span>{t('sku')}: {product.sku}</span>
                            <span>{t('currentStock')}: {product.currentStock}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-8 text-slate-500" data-testid="text-no-fast-moving">
                    {t('noFastMovingProducts')}
                  </div>
                )}
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Key Metrics (existing) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title={t('totalStock')}
          value={inventoryMetrics.totalStock}
          subtitle={t('units')}
          icon={Package}
          iconColor="text-blue-600"
          iconBgColor="bg-blue-100"
          testId="metric-total-stock"
        />
        <MetricCard
          title={t('totalValue')}
          value={formatCurrency(inventoryMetrics.totalValue, 'CZK')}
          icon={Coins}
          iconColor="text-green-600"
          iconBgColor="bg-green-100"
          testId="metric-total-value"
        />
        <MetricCard
          title={t('lowStockItems')}
          value={inventoryMetrics.lowStockCount}
          subtitle={t('products')}
          icon={AlertTriangle}
          iconColor="text-orange-600"
          iconBgColor="bg-orange-100"
          testId="metric-low-stock"
        />
        <MetricCard
          title={t('outOfStockItems')}
          value={inventoryMetrics.outOfStockCount}
          subtitle={t('products')}
          icon={TrendingDown}
          iconColor="text-red-600"
          iconBgColor="bg-red-100"
          testId="metric-out-of-stock"
        />
      </div>

      {/* Charts (existing) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PieChartCard
          title={t('inventoryValueByCategory')}
          data={stockByCategory}
          formatValue={(value) => formatCurrency(value, 'CZK')}
          testId="chart-stock-by-category"
        />
        <PieChartCard
          title={t('stockLevelDistribution')}
          data={stockLevelData}
          colors={['#10b981', '#f59e0b', '#ef4444']}
          testId="chart-stock-levels"
        />
      </div>

      {/* Enhanced Low Stock Alerts */}
      <Card data-testid="table-low-stock">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-600" />
            {t('lowStockAlerts')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('product')}</TableHead>
                  <TableHead>{t('sku')}</TableHead>
                  <TableHead className="text-right">{t('currentStock')}</TableHead>
                  <TableHead className="text-right">{t('alertLevel')}</TableHead>
                  <TableHead className="text-right">{t('estimatedStockoutDays')}</TableHead>
                  <TableHead>{t('status')}</TableHead>
                  <TableHead>{t('actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inventoryMetrics.lowStockProducts.slice(0, 10).map((product: any) => {
                  const avgDailyDemand = product.totalSold ? product.totalSold / 30 : 0.5;
                  const daysUntilStockout = avgDailyDemand > 0 ? Math.round((product.quantity || 0) / avgDailyDemand) : 999;
                  
                  return (
                    <TableRow key={product.id} data-testid={`row-low-stock-${product.id}`}>
                      <TableCell className="font-medium">{product.name}</TableCell>
                      <TableCell>{product.sku}</TableCell>
                      <TableCell className="text-right">{product.quantity}</TableCell>
                      <TableCell className="text-right">{product.lowStockAlert || 5}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant={daysUntilStockout <= 7 ? "destructive" : "secondary"}>
                          {daysUntilStockout === 999 ? '∞' : `${daysUntilStockout}d`}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="destructive">{t('lowStock')}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Link href={`/products/${product.id}`}>
                            <Button variant="outline" size="sm" data-testid={`button-view-low-stock-${product.id}`}>
                              <Eye className="h-3 w-3 mr-1" />
                              {t('viewProduct')}
                            </Button>
                          </Link>
                          <Link href={`/purchase-orders/new?productId=${product.id}`}>
                            <Button variant="default" size="sm" data-testid={`button-create-po-low-stock-${product.id}`}>
                              <ShoppingCart className="h-3 w-3 mr-1" />
                              {t('createPO')}
                            </Button>
                          </Link>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {inventoryMetrics.lowStockProducts.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-slate-500">
                      {t('noLowStockItems')}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Top Value Products */}
      <Card data-testid="table-top-value">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Coins className="h-5 w-5 text-emerald-600" />
            {t('highestValueInventory')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('product')}</TableHead>
                  <TableHead className="text-right">{t('quantity')}</TableHead>
                  <TableHead className="text-right">{t('unitPrice')}</TableHead>
                  <TableHead className="text-right">{t('totalValue')}</TableHead>
                  <TableHead className="text-right">{t('reorderRate')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topValueProducts.map((product) => (
                  <TableRow key={product.id} data-testid={`row-top-value-${product.id}`}>
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell className="text-right">{product.quantity}</TableCell>
                    <TableCell className="text-right">{formatCurrency(product.price, 'CZK')}</TableCell>
                    <TableCell className="text-right font-semibold">{formatCurrency(product.totalValue, 'CZK')}</TableCell>
                    <TableCell className="text-right">
                      {product.reorderRate !== null ? `${product.reorderRate.toFixed(1)}%` : 'N/A'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Dead Stock Report */}
      <Card data-testid="card-dead-stock">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-slate-600" />
                {t('deadStockReport')}
              </CardTitle>
              <CardDescription>{t('deadStockDesc')}</CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full sm:w-auto">
              <Label htmlFor="dead-stock-days" className="text-sm whitespace-nowrap">{t('daysThreshold')}:</Label>
              <Input
                id="dead-stock-days"
                type="number"
                value={deadStockDays}
                onChange={(e) => setDeadStockDays(parseInt(e.target.value) || 200)}
                className="w-full sm:w-24"
                min={1}
                data-testid="input-dead-stock-days"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {deadStockLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('productName')}</TableHead>
                    <TableHead>{t('sku')}</TableHead>
                    <TableHead className="text-right">{t('daysSinceLastSale')}</TableHead>
                    <TableHead className="text-right">{t('currentStock')}</TableHead>
                    <TableHead className="text-right">{t('value')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(deadStockProducts as any[]).map((product: any) => {
                    const daysSince = product.lastSoldAt 
                      ? differenceInDays(new Date(), new Date(product.lastSoldAt))
                      : null;
                    const value = (product.quantity || 0) * parseFloat(product.sellingPriceCzk || '0');
                    
                    return (
                      <TableRow key={product.id} data-testid={`row-dead-stock-${product.id}`}>
                        <TableCell className="font-medium">{product.name}</TableCell>
                        <TableCell>{product.sku || 'N/A'}</TableCell>
                        <TableCell className="text-right">
                          {daysSince !== null ? `${daysSince} days` : 'Never sold'}
                        </TableCell>
                        <TableCell className="text-right">{product.quantity || 0}</TableCell>
                        <TableCell className="text-right">{formatCurrency(value, 'CZK')}</TableCell>
                      </TableRow>
                    );
                  })}
                  {(deadStockProducts as any[]).length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-slate-500">
                        {t('noDeadStockFound')}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reorder Alerts */}
      <Card data-testid="card-reorder-alerts">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-600" />
                {t('reorderAlerts')}
              </CardTitle>
              <CardDescription>{t('reorderAlertsDesc')}</CardDescription>
            </div>
            <Button
              onClick={() => sendReorderAlertsMutation.mutate()}
              variant="outline"
              size="sm"
              className="flex items-center gap-2 w-full sm:w-auto"
              disabled={sendReorderAlertsMutation.isPending}
              data-testid="button-send-email-alerts"
            >
              <Mail className="h-4 w-4" />
              {sendReorderAlertsMutation.isPending ? t('sending') : t('sendEmailAlert')}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {reorderAlertsLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('productName')}</TableHead>
                    <TableHead>{t('sku')}</TableHead>
                    <TableHead className="text-right">{t('currentStock')}</TableHead>
                    <TableHead className="text-right">{t('minLevel')}</TableHead>
                    <TableHead className="text-right">{t('shortage')}</TableHead>
                    <TableHead>{t('urgency')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(reorderAlerts as any[]).map((product: any) => {
                    const shortage = (product.minStockLevel || 0) - (product.quantity || 0);
                    const urgencyPercent = product.minStockLevel > 0 
                      ? ((product.quantity || 0) / product.minStockLevel) * 100 
                      : 0;
                    const isUrgent = urgencyPercent < 50;

                    return (
                      <TableRow key={product.id} data-testid={`row-reorder-${product.id}`}>
                        <TableCell className="font-medium">{product.name}</TableCell>
                        <TableCell>{product.sku || 'N/A'}</TableCell>
                        <TableCell className="text-right">{product.quantity || 0}</TableCell>
                        <TableCell className="text-right">{product.minStockLevel || 0}</TableCell>
                        <TableCell className="text-right">{shortage}</TableCell>
                        <TableCell>
                          <Badge 
                            variant={isUrgent ? "destructive" : "default"}
                            data-testid={`badge-urgency-${product.id}`}
                          >
                            {isUrgent ? t('critical') : t('low')}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {(reorderAlerts as any[]).length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-slate-500">
                        {t('noReorderAlerts')}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Color Trend Tracking (Gel Polish) */}
      <Card data-testid="card-color-trends">
        <CardHeader>
          <div>
            <CardTitle className="flex items-center gap-2 mb-4">
              <Palette className="h-5 w-5 text-purple-600" />
              {t('colorTrendTracking')}
            </CardTitle>
            <CardDescription className="mb-4">{t('colorTrendDesc')}</CardDescription>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                <Label htmlFor="color-trends-start" className="text-sm whitespace-nowrap">{t('startDate')}:</Label>
                <Input
                  id="color-trends-start"
                  type="date"
                  value={colorTrendsStartDate}
                  onChange={(e) => setColorTrendsStartDate(e.target.value)}
                  className="w-full sm:w-40"
                  data-testid="input-color-trends-start"
                />
              </div>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                <Label htmlFor="color-trends-end" className="text-sm whitespace-nowrap">{t('endDate')}:</Label>
                <Input
                  id="color-trends-end"
                  type="date"
                  value={colorTrendsEndDate}
                  onChange={(e) => setColorTrendsEndDate(e.target.value)}
                  className="w-full sm:w-40"
                  data-testid="input-color-trends-end"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {colorTrendsLoading ? (
            <Skeleton className="h-96 w-full" />
          ) : (
            <div className="space-y-6">
              {/* Bar Chart */}
              <div className="h-80" data-testid="chart-color-trends">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={(colorTrends as any[]).slice(0, 10)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="variantName" 
                      angle={-45}
                      textAnchor="end"
                      height={100}
                    />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="totalQuantitySold" fill="#8b5cf6" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('colorVariant')}</TableHead>
                      <TableHead>{t('product')}</TableHead>
                      <TableHead className="text-right">{t('totalSales')}</TableHead>
                      <TableHead>{t('trend')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(colorTrends as any[]).map((trend: any, index: number) => (
                      <TableRow key={`${trend.variantName}-${index}`} data-testid={`row-color-trend-${index}`}>
                        <TableCell className="font-medium">{trend.variantName}</TableCell>
                        <TableCell>{trend.productName}</TableCell>
                        <TableCell className="text-right">{trend.totalQuantitySold} units</TableCell>
                        <TableCell>
                          <Badge variant={index < 3 ? "default" : "secondary"}>
                            {index < 3 ? t('topSeller') : t('popular')}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                    {(colorTrends as any[]).length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-slate-500">
                          {t('noColorTrendData')}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stock Adjustment History */}
      <Card data-testid="card-stock-adjustment-history">
        <CardHeader>
          <div className="flex flex-col space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5 text-blue-600" />
                  {t('stockAdjustmentHistory')}
                </CardTitle>
                <CardDescription className="mt-1">{t('stockAdjustmentHistoryDesc')}</CardDescription>
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 sm:flex-none"
                  onClick={handleExportStockHistoryExcel}
                  data-testid="button-export-history-excel"
                >
                  <FileSpreadsheet className="h-4 w-4 mr-1" />
                  XLSX
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 sm:flex-none"
                  onClick={handleExportStockHistoryPDF}
                  data-testid="button-export-history-pdf"
                >
                  <FileText className="h-4 w-4 mr-1" />
                  PDF
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                <Label htmlFor="history-start-date" className="text-sm whitespace-nowrap">{t('startDate')}:</Label>
                <Input
                  id="history-start-date"
                  type="date"
                  value={adjustmentHistoryStartDate}
                  onChange={(e) => {
                    setAdjustmentHistoryStartDate(e.target.value);
                    setAdjustmentHistoryOffset(0);
                  }}
                  className="w-full sm:w-40"
                  data-testid="input-history-start-date"
                />
              </div>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                <Label htmlFor="history-end-date" className="text-sm whitespace-nowrap">{t('endDate')}:</Label>
                <Input
                  id="history-end-date"
                  type="date"
                  value={adjustmentHistoryEndDate}
                  onChange={(e) => {
                    setAdjustmentHistoryEndDate(e.target.value);
                    setAdjustmentHistoryOffset(0);
                  }}
                  className="w-full sm:w-40"
                  data-testid="input-history-end-date"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {adjustmentHistoryLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filteredAdjustmentHistory.length === 0 ? (
            <div className="text-center py-8 text-slate-500" data-testid="text-no-adjustment-history">
              {t('noAdjustmentHistory')}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('date')}</TableHead>
                      <TableHead>{t('product')}</TableHead>
                      <TableHead>{t('locationCode')}</TableHead>
                      <TableHead>{t('adjustmentType')}</TableHead>
                      <TableHead className="text-right">{t('previousQty')}</TableHead>
                      <TableHead className="text-right">{t('change')}</TableHead>
                      <TableHead className="text-right">{t('newQty')}</TableHead>
                      <TableHead>{t('reason')}</TableHead>
                      <TableHead>{t('source')}</TableHead>
                      <TableHead>{t('adjustedBy')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAdjustmentHistory.map((item: any, index: number) => (
                      <TableRow key={item.id} data-testid={`row-adjustment-history-${index}`}>
                        <TableCell className="whitespace-nowrap">
                          {format(new Date(item.createdAt), 'yyyy-MM-dd HH:mm')}
                        </TableCell>
                        <TableCell className="font-medium">
                          {productLookup.get(item.productId) || t('unknownProduct')}
                        </TableCell>
                        <TableCell>
                          {locationLookup.get(item.locationId) || t('unknownLocation')}
                        </TableCell>
                        <TableCell>
                          <Badge variant={getAdjustmentTypeBadgeVariant(item.adjustmentType) as any}>
                            {item.adjustmentType === 'add' ? t('add') : 
                             item.adjustmentType === 'remove' ? t('remove') : t('set')}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">{item.previousQuantity}</TableCell>
                        <TableCell className="text-right">
                          {item.adjustmentType === 'set' 
                            ? item.adjustedQuantity 
                            : (item.adjustmentType === 'add' 
                                ? <span className="text-green-600">+{item.adjustedQuantity}</span>
                                : <span className="text-red-600">-{item.adjustedQuantity}</span>
                              )
                          }
                        </TableCell>
                        <TableCell className="text-right">{item.newQuantity}</TableCell>
                        <TableCell className="max-w-xs truncate" title={item.reason}>
                          {item.reason}
                        </TableCell>
                        <TableCell>
                          <Badge variant={getSourceBadgeVariant(item.source) as any}>
                            {formatSourceLabel(item.source)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {item.adjustedBy 
                            ? (userLookup.get(item.adjustedBy) || t('unknownUser'))
                            : '-'
                          }
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-4 border-t">
                <div className="text-sm text-slate-500 text-center sm:text-left">
                  {t('showing')} {adjustmentHistoryOffset + 1}-{Math.min(adjustmentHistoryOffset + ADJUSTMENT_HISTORY_LIMIT, stockAdjustmentHistoryTotal)} {t('of')} {stockAdjustmentHistoryTotal} {t('records')}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 sm:flex-none"
                    onClick={() => setAdjustmentHistoryOffset(Math.max(0, adjustmentHistoryOffset - ADJUSTMENT_HISTORY_LIMIT))}
                    disabled={adjustmentHistoryOffset === 0}
                    data-testid="button-history-previous"
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    {t('previous')}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 sm:flex-none"
                    onClick={() => setAdjustmentHistoryOffset(adjustmentHistoryOffset + ADJUSTMENT_HISTORY_LIMIT)}
                    disabled={adjustmentHistoryOffset + ADJUSTMENT_HISTORY_LIMIT >= stockAdjustmentHistoryTotal}
                    data-testid="button-history-next"
                  >
                    {t('next')}
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
