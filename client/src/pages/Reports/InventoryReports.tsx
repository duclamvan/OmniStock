import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useReports } from "@/contexts/ReportsContext";
import { ReportHeader } from "@/components/reports/ReportHeader";
import { MetricCard } from "@/components/reports/MetricCard";
import { BarChartCard } from "@/components/reports/BarChartCard";
import { PieChartCard } from "@/components/reports/PieChartCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Package, AlertTriangle, TrendingDown, DollarSign, PackageCheck } from "lucide-react";
import { calculateInventoryMetrics, preparePieChartData } from "@/lib/reportUtils";
import { formatCurrency } from "@/lib/currencyUtils";
import { exportToXLSX, exportToPDF, PDFColumn } from "@/lib/exportUtils";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

export default function InventoryReports() {
  const { toast } = useToast();
  const { getDateRangeValues } = useReports();

  const { data: products = [], isLoading: productsLoading } = useQuery({ queryKey: ['/api/products'] });
  const { data: categories = [] } = useQuery({ queryKey: ['/api/categories'] });

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
      }))
      .sort((a, b) => b.totalValue - a.totalValue)
      .slice(0, 10);
  }, [products]);

  const reorderProducts = useMemo(() => {
    return (products as any[])
      .filter((p: any) => p.reorderRate && p.quantity <= p.reorderRate)
      .map((p: any) => ({
        id: p.id,
        name: p.name,
        sku: p.sku,
        quantity: p.quantity || 0,
        reorderRate: p.reorderRate,
        lowStockAlert: p.lowStockAlert || 5,
      }))
      .sort((a, b) => a.quantity - b.quantity);
  }, [products]);

  const reorderCount = reorderProducts.length;

  const handleExportExcel = () => {
    try {
      const exportData = (products as any[]).map((p: any) => ({
        'Product': p.name,
        'SKU': p.sku || '',
        'Stock': p.quantity || 0,
        'Low Stock Alert': p.lowStockAlert || 0,
        'Reorder Rate': p.reorderRate || '',
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
        'Low Stock Alert',
        exportData,
        columns,
        `Inventory_Report_${format(new Date(), 'yyyy-MM-dd')}`
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

      {/* Needs Reorder Metric */}
      {reorderCount > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="Products Need Reorder"
            value={reorderCount}
            subtitle="products below reorder rate"
            icon={PackageCheck}
            iconColor="text-purple-600"
            iconBgColor="bg-purple-100"
            testId="metric-needs-reorder"
          />
        </div>
      )}

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

      {/* Products Need Reorder */}
      {reorderCount > 0 && (
        <Card data-testid="table-needs-reorder" className="border-purple-200 dark:border-purple-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PackageCheck className="h-5 w-5 text-purple-600" />
              Products Need Reorder
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead className="text-right">Current Stock</TableHead>
                    <TableHead className="text-right">Reorder Rate</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reorderProducts.slice(0, 10).map((product: any) => (
                    <TableRow key={product.id}>
                      <TableCell className="font-medium">{product.name}</TableCell>
                      <TableCell>{product.sku}</TableCell>
                      <TableCell className="text-right">{product.quantity}</TableCell>
                      <TableCell className="text-right">{product.reorderRate}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="border-purple-500 text-purple-700 bg-purple-50 dark:bg-purple-950 dark:text-purple-300">
                          Reorder Now
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

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
                </TableRow>
              </TableHeader>
              <TableBody>
                {topValueProducts.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell className="text-right">{product.quantity}</TableCell>
                    <TableCell className="text-right">{formatCurrency(product.price, 'CZK')}</TableCell>
                    <TableCell className="text-right font-semibold">{formatCurrency(product.totalValue, 'CZK')}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
