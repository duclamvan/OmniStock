import { useMemo, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useTranslation } from 'react-i18next';
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
import { Package, AlertTriangle, TrendingDown, Coins, Clock, Mail, Palette } from "lucide-react";
import { calculateInventoryMetrics, preparePieChartData } from "@/lib/reportUtils";
import { formatCurrency } from "@/lib/currencyUtils";
import { exportToXLSX, exportToPDF, PDFColumn } from "@/lib/exportUtils";
import { useToast } from "@/hooks/use-toast";
import { format, differenceInDays } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export default function InventoryReports() {
  const { toast } = useToast();
  const { t } = useTranslation(['reports', 'common']);
  const { getDateRangeValues } = useReports();
  const [deadStockDays, setDeadStockDays] = useState(200);
  const [colorTrendsStartDate, setColorTrendsStartDate] = useState('');
  const [colorTrendsEndDate, setColorTrendsEndDate] = useState('');

  const { data: products = [], isLoading: productsLoading } = useQuery({ queryKey: ['/api/products'] });
  const { data: categories = [] } = useQuery({ queryKey: ['/api/categories'] });
  
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

  const inventoryMetrics = useMemo(() => {
    return calculateInventoryMetrics(products as any[]);
  }, [products]);

  const stockByCategory = useMemo(() => {
    const categoryStock: { [key: string]: number } = {};

    (products as any[]).forEach((product: any) => {
      if (product.categoryId) {
        const category = (categories as any[]).find((c: any) => c.id === product.categoryId);
        const categoryName = category?.name || t('common:uncategorized');
        const value = (product.quantity || 0) * parseFloat(product.priceCzk || '0');
        categoryStock[categoryName] = (categoryStock[categoryName] || 0) + value;
      }
    });

    const data = Object.entries(categoryStock).map(([name, value]) => ({ name, value }));
    return preparePieChartData(data);
  }, [products, categories, t]);

  const stockLevelData = useMemo(() => {
    const inStock = (products as any[]).filter((p: any) => (p.quantity || 0) > (p.lowStockAlert || 5)).length;
    const lowStock = inventoryMetrics.lowStockCount;
    const outOfStock = inventoryMetrics.outOfStockCount;

    return preparePieChartData([
      { name: t('reports.inStock'), value: inStock },
      { name: t('reports.lowStock'), value: lowStock },
      { name: t('reports.outOfStock'), value: outOfStock },
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

  const handleExportExcel = () => {
    try {
      const exportData = (products as any[]).map((p: any) => ({
        [t('reports.product')]: p.name,
        [t('reports.sku')]: p.sku || '',
        [t('reports.stock')]: p.quantity || 0,
        [t('reports.lowStockAlert')]: p.lowStockAlert || 0,
        [t('reports.price')]: parseFloat(p.priceCzk || '0'),
        [t('reports.totalValue')]: (p.quantity || 0) * parseFloat(p.priceCzk || '0'),
        [t('reports.status')]: (p.quantity || 0) === 0 ? t('reports.outOfStock') : (p.quantity || 0) <= (p.lowStockAlert || 5) ? t('reports.lowStock') : t('reports.inStock'),
      }));

      exportToXLSX(exportData, `Inventory_Report_${format(new Date(), 'yyyy-MM-dd')}`, t('reports.inventoryReport'));
      
      toast({
        title: t('reports.exportSuccessful'),
        description: t('reports.inventoryReportExportedXlsx'),
      });
    } catch (error) {
      toast({
        title: t('reports.exportFailed'),
        description: t('reports.failedToExportInventoryReport'),
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
        { key: 'product', header: t('reports.product') },
        { key: 'sku', header: t('reports.sku') },
        { key: 'quantity', header: t('reports.stock') },
        { key: 'alert', header: t('reports.lowStockAlert') },
      ];

      exportToPDF(
        exportData,
        columns,
        `Inventory_Report_${format(new Date(), 'yyyy-MM-dd')}`,
        t('reports.lowStockAlerts')
      );

      toast({
        title: t('reports.exportSuccessful'),
        description: t('reports.inventoryReportExportedPdf'),
      });
    } catch (error) {
      toast({
        title: t('reports.exportFailed'),
        description: t('reports.failedToExportInventoryReportPdf'),
        variant: "destructive",
      });
    }
  };

  const sendReorderAlertsMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('/api/reports/reorder-alerts/notify', {
        method: 'POST',
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/reports/reorder-alerts'] });
      toast({
        title: "Email Feature",
        description: data.message || "Email notifications feature coming soon",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send email notifications",
        variant: "destructive",
      });
    },
  });

  if (productsLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="inventory-reports">
      <ReportHeader
        title={t('reports.inventoryReportsTitle')}
        description={t('reports.inventoryReportsDesc')}
        onExportExcel={handleExportExcel}
        onExportPDF={handleExportPDF}
      />

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title={t('reports.totalStock')}
          value={inventoryMetrics.totalStock}
          subtitle={t('reports.units')}
          icon={Package}
          iconColor="text-blue-600"
          iconBgColor="bg-blue-100"
          testId="metric-total-stock"
        />
        <MetricCard
          title={t('reports.totalValue')}
          value={formatCurrency(inventoryMetrics.totalValue, 'CZK')}
          icon={Coins}
          iconColor="text-green-600"
          iconBgColor="bg-green-100"
          testId="metric-total-value"
        />
        <MetricCard
          title={t('reports.lowStockItems')}
          value={inventoryMetrics.lowStockCount}
          subtitle={t('reports.products')}
          icon={AlertTriangle}
          iconColor="text-orange-600"
          iconBgColor="bg-orange-100"
          testId="metric-low-stock"
        />
        <MetricCard
          title={t('reports.outOfStockItems')}
          value={inventoryMetrics.outOfStockCount}
          subtitle={t('reports.products')}
          icon={TrendingDown}
          iconColor="text-red-600"
          iconBgColor="bg-red-100"
          testId="metric-out-of-stock"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PieChartCard
          title={t('reports.inventoryValueByCategory')}
          data={stockByCategory}
          formatValue={(value) => formatCurrency(value, 'CZK')}
          testId="chart-stock-by-category"
        />
        <PieChartCard
          title={t('reports.stockLevelDistribution')}
          data={stockLevelData}
          colors={['#10b981', '#f59e0b', '#ef4444']}
          testId="chart-stock-levels"
        />
      </div>

      {/* Low Stock Alerts */}
      <Card data-testid="table-low-stock">
        <CardHeader>
          <CardTitle>{t('reports.lowStockAlerts')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('reports.product')}</TableHead>
                  <TableHead>{t('reports.sku')}</TableHead>
                  <TableHead className="text-right">{t('reports.currentStock')}</TableHead>
                  <TableHead className="text-right">{t('reports.alertLevel')}</TableHead>
                  <TableHead>{t('reports.status')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inventoryMetrics.lowStockProducts.slice(0, 10).map((product: any) => (
                  <TableRow key={product.id}>
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell>{product.sku}</TableCell>
                    <TableCell className="text-right">{product.quantity}</TableCell>
                    <TableCell className="text-right">{product.lowStockAlert || 5}</TableCell>
                    <TableCell>
                      <Badge variant="destructive">{t('reports.lowStock')}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {inventoryMetrics.lowStockProducts.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-slate-500">
                      {t('reports.noLowStockItems')}
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
          <CardTitle>{t('reports.highestValueInventory')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('reports.product')}</TableHead>
                  <TableHead className="text-right">{t('reports.quantity')}</TableHead>
                  <TableHead className="text-right">{t('reports.unitPrice')}</TableHead>
                  <TableHead className="text-right">{t('reports.totalValue')}</TableHead>
                  <TableHead className="text-right">{t('reports.reorderRate')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topValueProducts.map((product) => (
                  <TableRow key={product.id}>
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
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-slate-600" />
                {t('reports.deadStockReport')}
              </CardTitle>
              <CardDescription>{t('reports.deadStockDesc')}</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="dead-stock-days" className="text-sm">{t('reports.daysThreshold')}:</Label>
              <Input
                id="dead-stock-days"
                type="number"
                value={deadStockDays}
                onChange={(e) => setDeadStockDays(parseInt(e.target.value) || 200)}
                className="w-24"
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
                    <TableHead>{t('reports.productName')}</TableHead>
                    <TableHead>{t('reports.sku')}</TableHead>
                    <TableHead className="text-right">{t('reports.daysSinceLastSale')}</TableHead>
                    <TableHead className="text-right">{t('reports.currentStock')}</TableHead>
                    <TableHead className="text-right">{t('reports.value')}</TableHead>
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
                        {t('reports.noDeadStockFound')}
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
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-600" />
                {t('reports.reorderAlerts')}
              </CardTitle>
              <CardDescription>{t('reports.reorderAlertsDesc')}</CardDescription>
            </div>
            <Button
              onClick={() => sendReorderAlertsMutation.mutate()}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
              disabled={sendReorderAlertsMutation.isPending}
              data-testid="button-send-email-alerts"
            >
              <Mail className="h-4 w-4" />
              {sendReorderAlertsMutation.isPending ? t('reports.sending') : t('reports.sendEmailAlert')}
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
                    <TableHead>{t('reports.productName')}</TableHead>
                    <TableHead>{t('reports.sku')}</TableHead>
                    <TableHead className="text-right">{t('reports.currentStock')}</TableHead>
                    <TableHead className="text-right">{t('reports.minLevel')}</TableHead>
                    <TableHead className="text-right">{t('reports.shortage')}</TableHead>
                    <TableHead>{t('reports.urgency')}</TableHead>
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
                            {isUrgent ? t('reports.critical') : t('reports.low')}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {(reorderAlerts as any[]).length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-slate-500">
                        {t('reports.noReorderAlerts')}
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
              {t('reports.colorTrendTracking')}
            </CardTitle>
            <CardDescription className="mb-4">{t('reports.colorTrendDesc')}</CardDescription>
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <Label htmlFor="color-trends-start" className="text-sm">{t('reports.startDate')}:</Label>
                <Input
                  id="color-trends-start"
                  type="date"
                  value={colorTrendsStartDate}
                  onChange={(e) => setColorTrendsStartDate(e.target.value)}
                  className="w-40"
                  data-testid="input-color-trends-start"
                />
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="color-trends-end" className="text-sm">{t('reports.endDate')}:</Label>
                <Input
                  id="color-trends-end"
                  type="date"
                  value={colorTrendsEndDate}
                  onChange={(e) => setColorTrendsEndDate(e.target.value)}
                  className="w-40"
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
                      <TableHead>{t('reports.colorVariant')}</TableHead>
                      <TableHead>{t('reports.product')}</TableHead>
                      <TableHead className="text-right">{t('reports.totalSales')}</TableHead>
                      <TableHead>{t('reports.trend')}</TableHead>
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
                            {index < 3 ? t('reports.topSeller') : t('reports.popular')}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                    {(colorTrends as any[]).length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-slate-500">
                          {t('reports.noColorTrendData')}
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
    </div>
  );
}
