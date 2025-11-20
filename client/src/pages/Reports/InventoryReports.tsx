import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useReports } from "@/contexts/ReportsContext";
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
import { Package, AlertTriangle, TrendingDown, DollarSign, Clock, Mail, Palette } from "lucide-react";
import { calculateInventoryMetrics, preparePieChartData } from "@/lib/reportUtils";
import { formatCurrency } from "@/lib/currencyUtils";
import { exportToXLSX, exportToPDF, PDFColumn } from "@/lib/exportUtils";
import { useToast } from "@/hooks/use-toast";
import { format, differenceInDays } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export default function InventoryReports() {
  const { toast } = useToast();
  const { getDateRangeValues } = useReports();
  const [deadStockDays, setDeadStockDays] = useState(200);
  const [colorTrendsStartDate, setColorTrendsStartDate] = useState('');
  const [colorTrendsEndDate, setColorTrendsEndDate] = useState('');

  const { data: products = [], isLoading: productsLoading } = useQuery({ queryKey: ['/api/products'] });
  const { data: categories = [] } = useQuery({ queryKey: ['/api/categories'] });
  
  const { data: deadStockProducts = [], isLoading: deadStockLoading } = useQuery({ 
    queryKey: ['/api/reports/dead-stock', deadStockDays],
    enabled: deadStockDays > 0
  });
  
  const { data: reorderAlerts = [], isLoading: reorderAlertsLoading } = useQuery({ 
    queryKey: ['/api/reports/reorder-alerts']
  });
  
  const { data: colorTrends = [], isLoading: colorTrendsLoading } = useQuery({ 
    queryKey: ['/api/reports/color-trends', 'Gel Polish', colorTrendsStartDate, colorTrendsEndDate],
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
        const categoryName = category?.name || 'Uncategorized';
        const value = (product.quantity || 0) * parseFloat(product.priceCzk || '0');
        categoryStock[categoryName] = (categoryStock[categoryName] || 0) + value;
      }
    });

    const data = Object.entries(categoryStock).map(([name, value]) => ({ name, value }));
    return preparePieChartData(data);
  }, [products, categories]);

  const stockLevelData = useMemo(() => {
    const inStock = (products as any[]).filter((p: any) => (p.quantity || 0) > (p.lowStockAlert || 5)).length;
    const lowStock = inventoryMetrics.lowStockCount;
    const outOfStock = inventoryMetrics.outOfStockCount;

    return preparePieChartData([
      { name: 'In Stock', value: inStock },
      { name: 'Low Stock', value: lowStock },
      { name: 'Out of Stock', value: outOfStock },
    ]);
  }, [products, inventoryMetrics]);

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
        'Product': p.name,
        'SKU': p.sku || '',
        'Stock': p.quantity || 0,
        'Low Stock Alert': p.lowStockAlert || 0,
        'Price': parseFloat(p.priceCzk || '0'),
        'Total Value': (p.quantity || 0) * parseFloat(p.priceCzk || '0'),
        'Status': (p.quantity || 0) === 0 ? 'Out of Stock' : (p.quantity || 0) <= (p.lowStockAlert || 5) ? 'Low Stock' : 'In Stock',
      }));

      exportToXLSX(exportData, `Inventory_Report_${format(new Date(), 'yyyy-MM-dd')}`, 'Inventory Report');
      
      toast({
        title: "Export Successful",
        description: "Inventory report exported to XLSX",
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export inventory report",
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
        { key: 'product', header: 'Product' },
        { key: 'sku', header: 'SKU' },
        { key: 'quantity', header: 'Stock' },
        { key: 'alert', header: 'Alert Level' },
      ];

      exportToPDF(
        exportData,
        columns,
        `Inventory_Report_${format(new Date(), 'yyyy-MM-dd')}`,
        'Low Stock Alert'
      );

      toast({
        title: "Export Successful",
        description: "Inventory report exported to PDF",
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export inventory report to PDF",
        variant: "destructive",
      });
    }
  };

  const handleSendReorderAlerts = async () => {
    try {
      const response = await fetch('/api/reports/reorder-alerts/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await response.json();
      
      toast({
        title: "Email Feature",
        description: data.message || "Email notifications feature coming soon",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send email notifications",
        variant: "destructive",
      });
    }
  };

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
        title="Inventory Reports"
        description="Stock levels and inventory analysis"
        onExportExcel={handleExportExcel}
        onExportPDF={handleExportPDF}
      />

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Stock"
          value={inventoryMetrics.totalStock}
          subtitle="units"
          icon={Package}
          iconColor="text-blue-600"
          iconBgColor="bg-blue-100"
          testId="metric-total-stock"
        />
        <MetricCard
          title="Total Value"
          value={formatCurrency(inventoryMetrics.totalValue, 'CZK')}
          icon={DollarSign}
          iconColor="text-green-600"
          iconBgColor="bg-green-100"
          testId="metric-total-value"
        />
        <MetricCard
          title="Low Stock Items"
          value={inventoryMetrics.lowStockCount}
          subtitle="products"
          icon={AlertTriangle}
          iconColor="text-orange-600"
          iconBgColor="bg-orange-100"
          testId="metric-low-stock"
        />
        <MetricCard
          title="Out of Stock"
          value={inventoryMetrics.outOfStockCount}
          subtitle="products"
          icon={TrendingDown}
          iconColor="text-red-600"
          iconBgColor="bg-red-100"
          testId="metric-out-of-stock"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PieChartCard
          title="Inventory Value by Category"
          data={stockByCategory}
          formatValue={(value) => formatCurrency(value, 'CZK')}
          testId="chart-stock-by-category"
        />
        <PieChartCard
          title="Stock Level Distribution"
          data={stockLevelData}
          colors={['#10b981', '#f59e0b', '#ef4444']}
          testId="chart-stock-levels"
        />
      </div>

      {/* Low Stock Alerts */}
      <Card data-testid="table-low-stock">
        <CardHeader>
          <CardTitle>Low Stock Alerts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead className="text-right">Current Stock</TableHead>
                  <TableHead className="text-right">Alert Level</TableHead>
                  <TableHead>Status</TableHead>
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
                      <Badge variant="destructive">Low Stock</Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {inventoryMetrics.lowStockProducts.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-slate-500">
                      No low stock items
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
          <CardTitle>Highest Value Inventory Items</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead className="text-right">Unit Price</TableHead>
                  <TableHead className="text-right">Total Value</TableHead>
                  <TableHead className="text-right">Reorder Rate</TableHead>
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
                Dead Stock Report
              </CardTitle>
              <CardDescription>Products with 0 sales in the specified period</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="dead-stock-days" className="text-sm">Days threshold:</Label>
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
                    <TableHead>Product Name</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead className="text-right">Days Since Last Sale</TableHead>
                    <TableHead className="text-right">Current Stock</TableHead>
                    <TableHead className="text-right">Value</TableHead>
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
                        No dead stock products found
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
                Reorder Alerts
              </CardTitle>
              <CardDescription>Products below minimum stock level</CardDescription>
            </div>
            <Button
              onClick={handleSendReorderAlerts}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
              data-testid="button-send-email-alerts"
            >
              <Mail className="h-4 w-4" />
              Send Email Alert
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
                    <TableHead>Product Name</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead className="text-right">Current Stock</TableHead>
                    <TableHead className="text-right">Min Level</TableHead>
                    <TableHead className="text-right">Shortage</TableHead>
                    <TableHead>Urgency</TableHead>
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
                            {isUrgent ? 'Critical' : 'Low'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {(reorderAlerts as any[]).length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-slate-500">
                        No reorder alerts
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
              Color Trend Tracking - Gel Polish
            </CardTitle>
            <CardDescription className="mb-4">Sales trends by color/variant for Gel Polish category</CardDescription>
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <Label htmlFor="color-trends-start" className="text-sm">Start Date:</Label>
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
                <Label htmlFor="color-trends-end" className="text-sm">End Date:</Label>
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
                      <TableHead>Color/Variant</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead className="text-right">Total Sales</TableHead>
                      <TableHead>Trend</TableHead>
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
                            {index < 3 ? 'Top Seller' : 'Popular'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                    {(colorTrends as any[]).length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-slate-500">
                          No color trend data available
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
