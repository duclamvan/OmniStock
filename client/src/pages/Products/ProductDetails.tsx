import { useParams, useLocation, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Package, Banknote, BarChart3, Calendar, MapPin, Edit, ShoppingCart, TrendingUp, AlertCircle, Euro } from "lucide-react";
import { formatCurrency } from "@/lib/currencyUtils";
import { format } from "date-fns";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export default function ProductDetails() {
  const { id } = useParams();
  const [, navigate] = useLocation();

  const { data: product, isLoading } = useQuery<any>({
    queryKey: ['/api/products', id],
    enabled: !!id,
  });

  const { data: orders } = useQuery<any[]>({
    queryKey: ['/api/orders'],
  });

  const { data: purchases } = useQuery<any[]>({
    queryKey: ['/api/purchases'],
  });

  const { data: warehouses } = useQuery<any[]>({
    queryKey: ['/api/warehouses'],
  });

  const { data: variants } = useQuery<any[]>({
    queryKey: [`/api/products/${id}/variants`],
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading product details...</div>
      </div>
    );
  }

  if (!product) {
    return null;
  }

  // Calculate product statistics
  const productOrders = orders?.filter(order => 
    order.items?.some(item => item.productId === product.id)
  ) || [];

  const productPurchases = purchases?.filter(purchase => 
    purchase.items?.some(item => item.productId === product.id)
  ) || [];

  const totalSold = productOrders.reduce((sum, order) => {
    const items = order.items?.filter(item => item.productId === product.id) || [];
    return sum + items.reduce((itemSum, item) => itemSum + (item.quantity || 0), 0);
  }, 0);

  const totalRevenue = productOrders.reduce((sum, order) => {
    const items = order.items?.filter(item => item.productId === product.id) || [];
    return sum + items.reduce((itemSum, item) => itemSum + ((item.price || 0) * (item.quantity || 0)), 0);
  }, 0);

  const warehouse = warehouses?.find((w: any) => w.id === product.warehouseId);
  const stockStatus = product.quantity <= 5 ? "critical" : product.quantity <= 20 ? "low" : "healthy";
  const stockBadgeVariant = stockStatus === "critical" ? "destructive" : stockStatus === "low" ? "outline" : "default";

  // Calculate profit margin based on landing cost
  const avgSellingPrice = parseFloat(product.priceEur) || parseFloat(product.priceCzk) || 0;
  const landingCost = parseFloat(product.latest_landing_cost) || parseFloat(product.importCostEur) || parseFloat(product.importCostCzk) || 0;
  const profitMargin = avgSellingPrice > 0 && landingCost > 0 ? ((avgSellingPrice - landingCost) / avgSellingPrice * 100).toFixed(1) : 0;
  
  // Determine margin color based on percentage
  const getMarginColor = (margin: number) => {
    if (margin > 30) return 'text-green-600';
    if (margin > 15) return 'text-yellow-600';
    return 'text-red-600';
  };
  
  const getMarginBadgeVariant = (margin: number): "default" | "destructive" | "outline" => {
    if (margin > 30) return 'default';
    if (margin > 15) return 'outline';
    return 'destructive';
  };

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/inventory/products")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Products
          </Button>
        </div>
        <Button onClick={() => navigate(`/inventory/products/edit/${id}`)}>
          <Edit className="h-4 w-4 mr-2" />
          Edit Product
        </Button>
      </div>

      {/* Product Header Card */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
            <div className="flex items-start gap-4">
              {product.imageUrl ? (
                <img
                  src={product.imageUrl}
                  alt={product.name}
                  className="w-24 h-24 object-cover rounded-lg"
                />
              ) : (
                <div className="w-24 h-24 bg-slate-100 rounded-lg flex items-center justify-center">
                  <Package className="h-12 w-12 text-slate-400" />
                </div>
              )}
              <div>
                <CardTitle className="text-2xl mb-1">{product.name}</CardTitle>
                {product.englishName && (
                  <div className="text-lg text-slate-600 mb-2">{product.englishName}</div>
                )}
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">SKU: {product.sku}</Badge>
                  {product.barcode && <Badge variant="outline">Barcode: {product.barcode}</Badge>}
                  <Badge variant={stockBadgeVariant}>
                    Stock: {product.quantity} {product.unit || 'pcs'}
                  </Badge>
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-slate-500">Category</div>
              <div className="font-medium">{product.category || "Uncategorized"}</div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-slate-500">Current Stock</div>
                <div className="text-2xl font-bold">{product.quantity}</div>
                <div className="text-xs text-slate-500">{product.unit}</div>
              </div>
              <Package className="h-8 w-8 text-slate-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-slate-500">Total Sold</div>
                <div className="text-2xl font-bold">{totalSold}</div>
                <div className="text-xs text-slate-500">All time</div>
              </div>
              <ShoppingCart className="h-8 w-8 text-slate-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-slate-500">Total Revenue</div>
                <div className="text-2xl font-bold">{formatCurrency(totalRevenue, "CZK")}</div>
                <div className="text-xs text-slate-500">All time</div>
              </div>
              <Banknote className="h-8 w-8 text-slate-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-slate-500">Profit Margin</div>
                <div className="text-2xl font-bold">{profitMargin}%</div>
                <div className="text-xs text-slate-500">Per unit</div>
              </div>
              <TrendingUp className="h-8 w-8 text-slate-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pricing Information */}
      <Card>
        <CardHeader>
          <CardTitle>Pricing & Costs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Selling Prices */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Selling Prices</h3>
              <div className="space-y-2 text-sm">
                {product.priceCzk && (
                  <div className="flex justify-between items-center py-1">
                    <span className="text-slate-600 dark:text-slate-400">Czech Republic</span>
                    <span className="font-semibold text-slate-900 dark:text-slate-100">{formatCurrency(product.priceCzk, "CZK")}</span>
                  </div>
                )}
                {product.priceEur && (
                  <div className="flex justify-between items-center py-1">
                    <span className="text-slate-600 dark:text-slate-400">Europe</span>
                    <span className="font-semibold text-slate-900 dark:text-slate-100">{formatCurrency(product.priceEur, "EUR")}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Landing Cost */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Landing Cost</h3>
              {product.latest_landing_cost ? (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-3 cursor-help hover:border-slate-300 dark:hover:border-slate-600 transition-colors" data-testid="landing-cost-display">
                        <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                          €{parseFloat(product.latest_landing_cost).toFixed(2)}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                          per unit, all-in
                        </div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <div className="text-sm">
                        <p className="font-semibold mb-1">Landing Cost Breakdown</p>
                        <p>Includes: Product cost, freight, duties, and fees</p>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ) : (
                <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-3" data-testid="landing-cost-pending">
                  <div className="text-sm text-slate-600 dark:text-slate-400">
                    Not calculated yet
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                    Available after receiving shipments
                  </div>
                </div>
              )}
            </div>

            {/* Margin Analysis */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Margin</h3>
              {product.latest_landing_cost && product.priceEur ? (
                <div className="space-y-3">
                  <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-slate-600 dark:text-slate-400">Profit Margin</span>
                      <Badge 
                        variant={getMarginBadgeVariant(Number(profitMargin))}
                        className={`font-bold ${getMarginColor(Number(profitMargin))}`}
                        data-testid="margin-badge"
                      >
                        {profitMargin}%
                      </Badge>
                    </div>
                    <div className="space-y-1.5 text-sm border-t border-slate-100 dark:border-slate-800 pt-2">
                      <div className="flex justify-between">
                        <span className="text-slate-500 dark:text-slate-400">Sell Price</span>
                        <span className="font-medium">€{parseFloat(product.priceEur).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500 dark:text-slate-400">Cost</span>
                        <span className="font-medium">€{parseFloat(product.latest_landing_cost).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between pt-1.5 border-t border-slate-100 dark:border-slate-800" data-testid="profit-per-unit">
                        <span className="text-slate-700 dark:text-slate-300 font-semibold">Profit</span>
                        <span className={`font-bold ${getMarginColor(Number(profitMargin))}`}>
                          €{(parseFloat(product.priceEur) - parseFloat(product.latest_landing_cost)).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-3">
                  <div className="text-sm text-slate-500 dark:text-slate-400">
                    Requires landing cost data
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Product Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Product Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-sm text-slate-500">Description</div>
              <div className="mt-1">{product.description || "No description available"}</div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-slate-500">Unit Type</div>
                <div className="mt-1 font-medium">{product.unit}</div>
              </div>
              <div>
                <div className="text-sm text-slate-500">Tax Rate</div>
                <div className="mt-1 font-medium">{product.taxRate || 0}%</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-slate-500">Min Stock Level</div>
                <div className="mt-1 font-medium">{product.minStock || 0}</div>
              </div>
              <div>
                <div className="text-sm text-slate-500">Reorder Quantity</div>
                <div className="mt-1 font-medium">{product.reorderQuantity || 0}</div>
              </div>
            </div>

            {/* Dimensions & Weight */}
            {(product.length || product.width || product.height || product.weight) && (
              <div>
                <div className="text-sm text-slate-500 mb-2">Dimensions & Weight</div>
                <div className="grid grid-cols-2 gap-4">
                  {(product.length || product.width || product.height) && (
                    <div>
                      <div className="text-xs text-slate-500">Dimensions (L×W×H)</div>
                      <div className="mt-1 font-medium">
                        {product.length || 0} × {product.width || 0} × {product.height || 0} cm
                      </div>
                    </div>
                  )}
                  {product.weight && (
                    <div>
                      <div className="text-xs text-slate-500">Weight</div>
                      <div className="mt-1 font-medium">{product.weight} kg</div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Location & Supplier</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-sm text-slate-500">Warehouse</div>
              <div className="mt-1 flex items-center gap-2">
                <MapPin className="h-4 w-4 text-slate-400" />
                <span className="font-medium">{warehouse?.name || "No warehouse assigned"}</span>
              </div>
              {warehouse && (
                <div className="text-sm text-slate-500 mt-1">
                  {warehouse.address}, {warehouse.city}
                </div>
              )}
            </div>

            <div>
              <div className="text-sm text-slate-500">Supplier</div>
              <div className="mt-1 font-medium">{product.supplier || "No supplier assigned"}</div>
            </div>

            <div>
              <div className="text-sm text-slate-500">Created</div>
              <div className="mt-1 flex items-center gap-2">
                <Calendar className="h-4 w-4 text-slate-400" />
                <span>{product.createdAt ? format(new Date(product.createdAt), "PPP") : "N/A"}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Product Variants */}
      {variants && variants.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Product Variants</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-4 text-sm font-medium text-slate-600">Variant Name</th>
                    <th className="text-left py-2 px-4 text-sm font-medium text-slate-600">Barcode</th>
                    <th className="text-right py-2 px-4 text-sm font-medium text-slate-600">Quantity</th>
                    <th className="text-right py-2 px-4 text-sm font-medium text-slate-600">Import Cost (USD)</th>
                    <th className="text-right py-2 px-4 text-sm font-medium text-slate-600">Import Cost (CZK)</th>
                    <th className="text-right py-2 px-4 text-sm font-medium text-slate-600">Import Cost (EUR)</th>
                  </tr>
                </thead>
                <tbody>
                  {variants.map((variant) => (
                    <tr key={variant.id} className="border-b hover:bg-slate-50">
                      <td className="py-2 px-4 text-sm">{variant.name}</td>
                      <td className="py-2 px-4 text-sm">{variant.barcode || "-"}</td>
                      <td className="py-2 px-4 text-sm text-right">{variant.quantity}</td>
                      <td className="py-2 px-4 text-sm text-right">
                        {variant.importCostUsd ? formatCurrency(variant.importCostUsd, "USD") : "-"}
                      </td>
                      <td className="py-2 px-4 text-sm text-right">
                        {variant.importCostCzk ? formatCurrency(variant.importCostCzk, "CZK") : "-"}
                      </td>
                      <td className="py-2 px-4 text-sm text-right">
                        {variant.importCostEur ? formatCurrency(variant.importCostEur, "EUR") : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Orders */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Orders</CardTitle>
        </CardHeader>
        <CardContent>
          {productOrders.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              No orders found for this product
            </div>
          ) : (
            <div className="space-y-4">
              {productOrders.slice(0, 5).map((order) => {
                const orderItems = order.items?.filter(item => item.productId === product.id) || [];
                return (
                  <div key={order.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-slate-50">
                    <div className="flex-1">
                      <div className="font-medium text-base">
                        Order #{order.orderId} - {order.customer?.name || "Unknown Customer"}
                      </div>
                      <div className="text-sm text-slate-500">
                        {order.createdAt ? format(new Date(order.createdAt), "PPP") : "N/A"}
                      </div>
                      <div className="text-sm text-slate-500 mt-1">
                        Status: <Badge variant={order.orderStatus === 'delivered' ? 'default' : 'outline'}>{order.orderStatus}</Badge>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">
                        {orderItems.reduce((sum, item) => sum + (item.quantity || 0), 0)} units
                      </div>
                      <div className="text-sm text-slate-500">
                        {formatCurrency(
                          orderItems.reduce((sum, item) => sum + ((item.price || 0) * (item.quantity || 0)), 0),
                          order.currency
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              {productOrders.length > 5 && (
                <div className="text-center pt-4">
                  <Button variant="outline" size="sm" onClick={() => navigate(`/orders?product=${product.id}`)}>
                    View all {productOrders.length} orders
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}