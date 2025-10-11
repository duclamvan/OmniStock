import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  ArrowLeft, 
  Package, 
  Edit, 
  ShoppingCart, 
  TrendingUp, 
  Image as ImageIcon,
  Hand,
  PackageOpen,
  FileType,
  Star,
  BarChart3,
  DollarSign,
  Building,
  MapPin,
  Users,
  Barcode,
  Hash,
  Box,
  Euro,
  Warehouse,
  Info,
  Mail,
  Phone,
  Globe
} from "lucide-react";
import { formatCurrency } from "@/lib/currencyUtils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import CostHistoryChart from "@/components/products/CostHistoryChart";
import ProductFiles from "@/components/ProductFiles";
import ProductLocations from "@/components/ProductLocations";
import ProductVariants from "@/components/ProductVariants";

const IMAGE_PURPOSE_CONFIG = {
  main: {
    label: 'Main WMS Image',
    icon: ImageIcon,
    color: 'text-blue-600 bg-blue-50 border-blue-300',
  },
  in_hand: {
    label: 'In Hand',
    icon: Hand,
    color: 'text-emerald-600 bg-emerald-50 border-emerald-300',
  },
  detail: {
    label: 'Detail Shot',
    icon: PackageOpen,
    color: 'text-indigo-600 bg-indigo-50 border-indigo-300',
  },
  packaging: {
    label: 'Packaging',
    icon: Package,
    color: 'text-orange-600 bg-orange-50 border-orange-300',
  },
  label: {
    label: 'Label/Barcode',
    icon: FileType,
    color: 'text-cyan-600 bg-cyan-50 border-cyan-300',
  },
};

export default function ProductDetails() {
  const { id } = useParams();
  const [, navigate] = useLocation();
  const [expandedSections, setExpandedSections] = useState<string[]>(["basic", "pricing"]);

  const { data: product, isLoading } = useQuery<any>({
    queryKey: ['/api/products', id],
    enabled: !!id,
  });

  const { data: orders } = useQuery<any[]>({
    queryKey: ['/api/orders'],
  });

  const { data: warehouses } = useQuery<any[]>({
    queryKey: ['/api/warehouses'],
  });

  const { data: categories } = useQuery<any[]>({
    queryKey: ['/api/categories'],
  });

  const { data: suppliers } = useQuery<any[]>({
    queryKey: ['/api/suppliers'],
  });

  const { data: variants = [], isLoading: variantsLoading } = useQuery<any[]>({
    queryKey: [`/api/products/${id}/variants`],
    enabled: !!id,
  });

  const { data: tieredPricing = [], isLoading: tieredPricingLoading, isError: tieredPricingError } = useQuery<any[]>({
    queryKey: ['/api/products', id, 'tiered-pricing'],
    enabled: !!id,
  });

  const { data: costHistory = [], isLoading: costHistoryLoading, isError: costHistoryError } = useQuery<any[]>({
    queryKey: ['/api/products', id, 'cost-history'],
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!product) {
    return null;
  }

  const productOrders = orders?.filter(order => 
    order.items?.some(item => item.productId === product.id)
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
  const category = categories?.find((c: any) => c.id === product.categoryId);
  const supplier = suppliers?.find((s: any) => s.id === product.supplierId);
  
  const stockStatus = product.quantity <= 5 ? "critical" : product.quantity <= 20 ? "low" : "healthy";
  const stockBadgeVariant = stockStatus === "critical" ? "destructive" : stockStatus === "low" ? "outline" : "default";

  // Parse product images with error handling and fallback
  let productImages: any[] = [];
  try {
    if (product.images) {
      const parsed = JSON.parse(product.images);
      productImages = Array.isArray(parsed) ? parsed : [];
    }
  } catch (error) {
    console.error('Failed to parse product images:', error);
    productImages = [];
  }
  
  // Fallback to single imageUrl if images array is empty
  if (productImages.length === 0 && product.imageUrl) {
    productImages = [{
      url: product.imageUrl,
      purpose: 'main',
      isPrimary: true
    }];
  }
  
  const primaryImage = productImages.find((img: any) => img.isPrimary) || productImages[0];
  const displayImage = primaryImage?.url || product.imageUrl;

  // Calculate profit margins for each currency
  const calculateMargin = (sellingPrice: number, cost: number) => {
    if (sellingPrice > 0 && cost > 0) {
      return ((sellingPrice - cost) / sellingPrice * 100).toFixed(1);
    }
    return null;
  };

  const getMarginColor = (margin: number) => {
    if (margin > 30) return 'text-green-600';
    if (margin > 15) return 'text-yellow-600';
    return 'text-red-600';
  };

  // Landing cost (prefer latest_landing_cost, fallback to import costs)
  const landingCostEur = parseFloat(product.latest_landing_cost) || parseFloat(product.importCostEur) || 0;
  const landingCostCzk = parseFloat(product.importCostCzk) || 0;
  const landingCostUsd = parseFloat(product.importCostUsd) || 0;

  // Calculate margins for each currency
  const marginEur = product.priceEur && landingCostEur ? calculateMargin(parseFloat(product.priceEur), landingCostEur) : null;
  const marginCzk = product.priceCzk && landingCostCzk ? calculateMargin(parseFloat(product.priceCzk), landingCostCzk) : null;
  const marginUsd = product.priceUsd && landingCostUsd ? calculateMargin(parseFloat(product.priceUsd), landingCostUsd) : null;
  const marginVnd = product.priceVnd && landingCostEur ? calculateMargin(parseFloat(product.priceVnd), landingCostEur * 27000) : null;
  const marginCny = product.priceCny && landingCostEur ? calculateMargin(parseFloat(product.priceCny), landingCostEur * 7.8) : null;

  // Primary margin for display (use first available)
  const primaryMargin = marginEur || marginCzk || marginUsd || marginVnd || marginCny || '0';

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/inventory/products")}
          data-testid="button-back"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Products
        </Button>
        <Button onClick={() => navigate(`/inventory/products/edit/${id}`)} data-testid="button-edit">
          <Edit className="h-4 w-4 mr-2" />
          Edit Product
        </Button>
      </div>

      {/* Product Header Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-6">
            {/* Product Image */}
            <div className="flex-shrink-0">
              {displayImage ? (
                <img
                  src={displayImage}
                  alt={product.name}
                  className="w-32 h-32 object-cover rounded-lg border-2 border-slate-200"
                  data-testid="img-product-primary"
                />
              ) : (
                <div className="w-32 h-32 bg-slate-100 rounded-lg flex items-center justify-center border-2 border-slate-200">
                  <Package className="h-16 w-16 text-slate-400" />
                </div>
              )}
            </div>

            {/* Product Info */}
            <div className="flex-1 space-y-4">
              <div>
                <h1 className="text-3xl font-bold text-slate-900" data-testid="text-product-name">
                  {product.name}
                </h1>
                {product.englishName && (
                  <p className="text-lg text-slate-600 mt-1" data-testid="text-english-name">
                    {product.englishName}
                  </p>
                )}
              </div>

              {/* Badges */}
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" data-testid="badge-sku">
                  <Hash className="h-3 w-3 mr-1" />
                  SKU: {product.sku}
                </Badge>
                <Badge variant={stockBadgeVariant} data-testid="badge-stock-status">
                  <Package className="h-3 w-3 mr-1" />
                  {product.quantity} {product.unit || 'units'}
                </Badge>
                {category && (
                  <Badge variant="secondary" data-testid="badge-category">
                    <Box className="h-3 w-3 mr-1" />
                    {category.name}
                  </Badge>
                )}
                {product.barcode && (
                  <Badge variant="outline" data-testid="badge-barcode">
                    <Barcode className="h-3 w-3 mr-1" />
                    {product.barcode}
                  </Badge>
                )}
              </div>

              {/* Summary Statistics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-50 rounded-lg p-3">
                  <div className="text-xs text-slate-600 mb-1">Images</div>
                  <div className="text-lg font-bold" data-testid="text-images-count">
                    {productImages.length}
                  </div>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <div className="text-xs text-slate-600 mb-1">Variants</div>
                  {variantsLoading ? (
                    <Skeleton className="h-6 w-8" />
                  ) : (
                    <div className="text-lg font-bold" data-testid="text-variants-count">
                      {variants.length}
                    </div>
                  )}
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <div className="text-xs text-slate-600 mb-1">Stock</div>
                  <div className="text-lg font-bold" data-testid="text-stock-quantity">
                    {product.quantity}
                  </div>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <div className="text-xs text-slate-600 mb-1">Tiered Prices</div>
                  {tieredPricingLoading ? (
                    <Skeleton className="h-6 w-8" />
                  ) : (
                    <div className="text-lg font-bold" data-testid="text-tiered-prices-count">
                      {tieredPricing.length}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-slate-500">Current Stock</div>
                <div className="text-2xl font-bold" data-testid="text-metric-stock">{product.quantity}</div>
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
                <div className="text-2xl font-bold" data-testid="text-metric-sold">{totalSold}</div>
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
                <div className="text-2xl font-bold" data-testid="text-metric-revenue">{formatCurrency(totalRevenue, "CZK")}</div>
                <div className="text-xs text-slate-500">All time</div>
              </div>
              <DollarSign className="h-8 w-8 text-slate-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-slate-500">Profit Margin</div>
                <div className={`text-2xl font-bold ${getMarginColor(Number(primaryMargin))}`} data-testid="text-metric-margin">
                  {primaryMargin}%
                </div>
                <div className="text-xs text-slate-500">Per unit</div>
              </div>
              <TrendingUp className="h-8 w-8 text-slate-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Accordion Sections */}
      <Accordion
        type="multiple"
        value={expandedSections}
        onValueChange={setExpandedSections}
        className="space-y-4"
      >
        {/* Basic Information */}
        <AccordionItem value="basic" className="border rounded-lg bg-white">
          <AccordionTrigger className="px-6 hover:no-underline" data-testid="accordion-basic">
            <div className="flex items-center gap-2">
              <Info className="h-5 w-5 text-slate-600" />
              <span className="font-semibold">Basic Information</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-6">
            <div className="space-y-6">
              {/* Multi-Purpose Image Gallery */}
              {productImages.length > 0 ? (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-slate-700">Product Images</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {productImages.map((img: any, idx: number) => {
                      const config = IMAGE_PURPOSE_CONFIG[img.purpose as keyof typeof IMAGE_PURPOSE_CONFIG];
                      const Icon = config?.icon || ImageIcon;
                      return (
                        <div key={idx} className="relative group">
                          <div className={`border-2 rounded-lg overflow-hidden ${img.isPrimary ? 'border-blue-500' : 'border-slate-200'}`}>
                            <img
                              src={img.url}
                              alt={config?.label || img.purpose}
                              className="w-full h-32 object-cover"
                              data-testid={`img-gallery-${idx}`}
                            />
                          </div>
                          <div className="mt-2 flex items-center gap-2">
                            <Badge variant="outline" className={config?.color}>
                              <Icon className="h-3 w-3 mr-1" />
                              {config?.label || img.purpose}
                            </Badge>
                            {img.isPrimary && (
                              <Badge variant="default" className="bg-blue-600">
                                <Star className="h-3 w-3 mr-1" />
                                Primary
                              </Badge>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : product.imageUrl && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-slate-700">Product Image</h3>
                  <img
                    src={product.imageUrl}
                    alt={product.name}
                    className="w-48 h-48 object-cover rounded-lg border-2 border-slate-200"
                    data-testid="img-single"
                  />
                </div>
              )}

              <Separator />

              {/* Product Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-slate-600">Product Name</label>
                    <p className="text-base font-semibold text-slate-900" data-testid="text-name">{product.name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-600">SKU</label>
                    <p className="text-base font-mono text-slate-900" data-testid="text-sku">{product.sku}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-600">Category</label>
                    <p className="text-base text-slate-900" data-testid="text-category">{category?.name || "Uncategorized"}</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-slate-600">Warehouse</label>
                    <p className="text-base text-slate-900" data-testid="text-warehouse">{warehouse?.name || "Not assigned"}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-600">Location</label>
                    <p className="text-base text-slate-900" data-testid="text-location">{product.warehouseLocation || "Not specified"}</p>
                  </div>
                </div>
              </div>

              {product.description && (
                <>
                  <Separator />
                  <div>
                    <label className="text-sm font-medium text-slate-600">Description</label>
                    <p className="text-base text-slate-700 mt-1" data-testid="text-description">{product.description}</p>
                  </div>
                </>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Stock & Inventory */}
        <AccordionItem value="stock" className="border rounded-lg bg-white">
          <AccordionTrigger className="px-6 hover:no-underline" data-testid="accordion-stock">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-slate-600" />
              <span className="font-semibold">Stock & Inventory</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="text-sm font-medium text-slate-600">Current Quantity</label>
                <p className="text-2xl font-bold text-slate-900 mt-1" data-testid="text-quantity">{product.quantity}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-600">Low Stock Alert</label>
                <p className="text-2xl font-bold text-slate-900 mt-1" data-testid="text-low-stock">{product.lowStockAlert || 5}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-600">Barcode</label>
                <p className="text-lg font-mono text-slate-900 mt-1" data-testid="text-barcode-detail">{product.barcode || "Not set"}</p>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Pricing & Costs */}
        <AccordionItem value="pricing" className="border rounded-lg bg-white">
          <AccordionTrigger className="px-6 hover:no-underline" data-testid="accordion-pricing">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-slate-600" />
              <span className="font-semibold">Pricing & Costs</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-6">
            <div className="space-y-6">
              {/* Selling Prices */}
              <div>
                <h3 className="text-sm font-semibold text-slate-700 mb-3">Selling Prices</h3>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  {product.priceCzk && (
                    <div className="bg-slate-50 rounded-lg p-3">
                      <div className="text-xs text-slate-600">Czech Republic (CZK)</div>
                      <div className="text-lg font-bold" data-testid="text-price-czk">{formatCurrency(product.priceCzk, "CZK")}</div>
                    </div>
                  )}
                  {product.priceEur && (
                    <div className="bg-slate-50 rounded-lg p-3">
                      <div className="text-xs text-slate-600">Europe (EUR)</div>
                      <div className="text-lg font-bold" data-testid="text-price-eur">{formatCurrency(product.priceEur, "EUR")}</div>
                    </div>
                  )}
                  {product.priceUsd && (
                    <div className="bg-slate-50 rounded-lg p-3">
                      <div className="text-xs text-slate-600">USA (USD)</div>
                      <div className="text-lg font-bold" data-testid="text-price-usd">{formatCurrency(product.priceUsd, "USD")}</div>
                    </div>
                  )}
                  {product.priceVnd && (
                    <div className="bg-slate-50 rounded-lg p-3">
                      <div className="text-xs text-slate-600">Vietnam (VND)</div>
                      <div className="text-lg font-bold" data-testid="text-price-vnd">{formatCurrency(product.priceVnd, "VND")}</div>
                    </div>
                  )}
                  {product.priceCny && (
                    <div className="bg-slate-50 rounded-lg p-3">
                      <div className="text-xs text-slate-600">China (CNY)</div>
                      <div className="text-lg font-bold" data-testid="text-price-cny">{formatCurrency(product.priceCny, "CNY")}</div>
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              {/* Import Costs */}
              <div>
                <h3 className="text-sm font-semibold text-slate-700 mb-3">Import Costs</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {product.importCostUsd && (
                    <div className="bg-orange-50 rounded-lg p-3">
                      <div className="text-xs text-orange-600">USD</div>
                      <div className="text-lg font-bold text-orange-900" data-testid="text-import-usd">{formatCurrency(product.importCostUsd, "USD")}</div>
                    </div>
                  )}
                  {product.importCostCzk && (
                    <div className="bg-orange-50 rounded-lg p-3">
                      <div className="text-xs text-orange-600">CZK</div>
                      <div className="text-lg font-bold text-orange-900" data-testid="text-import-czk">{formatCurrency(product.importCostCzk, "CZK")}</div>
                    </div>
                  )}
                  {product.importCostEur && (
                    <div className="bg-orange-50 rounded-lg p-3">
                      <div className="text-xs text-orange-600">EUR</div>
                      <div className="text-lg font-bold text-orange-900" data-testid="text-import-eur">{formatCurrency(product.importCostEur, "EUR")}</div>
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              {/* Profit Margin - Multi-Currency */}
              <div>
                <h3 className="text-sm font-semibold text-slate-700 mb-3">Profit Analysis (by Currency)</h3>
                {(marginEur || marginCzk || marginUsd || marginVnd || marginCny) ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {marginEur && (
                      <div className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-medium text-slate-600">EUR</span>
                          <Badge variant="outline" className={getMarginColor(Number(marginEur))}>
                            {marginEur}%
                          </Badge>
                        </div>
                        <div className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-600">Cost:</span>
                            <span className="font-semibold">{formatCurrency(landingCostEur, "EUR")}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-600">Price:</span>
                            <span className="font-semibold">{formatCurrency(product.priceEur, "EUR")}</span>
                          </div>
                        </div>
                      </div>
                    )}
                    {marginCzk && (
                      <div className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-medium text-slate-600">CZK</span>
                          <Badge variant="outline" className={getMarginColor(Number(marginCzk))}>
                            {marginCzk}%
                          </Badge>
                        </div>
                        <div className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-600">Cost:</span>
                            <span className="font-semibold">{formatCurrency(landingCostCzk, "CZK")}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-600">Price:</span>
                            <span className="font-semibold">{formatCurrency(product.priceCzk, "CZK")}</span>
                          </div>
                        </div>
                      </div>
                    )}
                    {marginUsd && (
                      <div className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-medium text-slate-600">USD</span>
                          <Badge variant="outline" className={getMarginColor(Number(marginUsd))}>
                            {marginUsd}%
                          </Badge>
                        </div>
                        <div className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-600">Cost:</span>
                            <span className="font-semibold">{formatCurrency(landingCostUsd, "USD")}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-600">Price:</span>
                            <span className="font-semibold">{formatCurrency(product.priceUsd, "USD")}</span>
                          </div>
                        </div>
                      </div>
                    )}
                    {marginVnd && (
                      <div className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-medium text-slate-600">VND</span>
                          <Badge variant="outline" className={getMarginColor(Number(marginVnd))}>
                            {marginVnd}%
                          </Badge>
                        </div>
                        <div className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-600">Price:</span>
                            <span className="font-semibold">{formatCurrency(product.priceVnd, "VND")}</span>
                          </div>
                        </div>
                      </div>
                    )}
                    {marginCny && (
                      <div className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-medium text-slate-600">CNY</span>
                          <Badge variant="outline" className={getMarginColor(Number(marginCny))}>
                            {marginCny}%
                          </Badge>
                        </div>
                        <div className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-600">Price:</span>
                            <span className="font-semibold">{formatCurrency(product.priceCny, "CNY")}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">No pricing data available for margin calculation</p>
                )}
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Import Costs & Analytics */}
        <AccordionItem value="analytics" className="border rounded-lg bg-white">
          <AccordionTrigger className="px-6 hover:no-underline" data-testid="accordion-analytics">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-slate-600" />
              <span className="font-semibold">Import Costs & Analytics</span>
              {costHistoryLoading && <Skeleton className="h-4 w-16 ml-2" />}
              {!costHistoryLoading && costHistory.length > 0 && (
                <Badge variant="secondary" className="ml-2">{costHistory.length}</Badge>
              )}
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-6">
            {costHistoryLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-48 w-full" />
              </div>
            ) : costHistoryError ? (
              <div className="text-center py-8 text-red-600">
                <p>Failed to load cost history data</p>
              </div>
            ) : costHistory.length > 0 ? (
              <CostHistoryChart data={costHistory} currency="€" />
            ) : (
              <div className="text-center py-8 text-slate-500">
                <p>No cost history available</p>
              </div>
            )}
          </AccordionContent>
        </AccordionItem>

        {/* Tiered Pricing */}
        <AccordionItem value="tiered" className="border rounded-lg bg-white">
          <AccordionTrigger className="px-6 hover:no-underline" data-testid="accordion-tiered">
            <div className="flex items-center gap-2">
              <Euro className="h-5 w-5 text-slate-600" />
              <span className="font-semibold">Tiered Pricing</span>
              {tieredPricingLoading && <Skeleton className="h-4 w-16 ml-2" />}
              {!tieredPricingLoading && tieredPricing.length > 0 && (
                <Badge variant="secondary" className="ml-2">{tieredPricing.length}</Badge>
              )}
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-6">
            {tieredPricingLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-32 w-full" />
              </div>
            ) : tieredPricingError ? (
              <div className="text-center py-8 text-red-600">
                <p>Failed to load tiered pricing data</p>
              </div>
            ) : tieredPricing.length > 0 ? (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Min Quantity</TableHead>
                      <TableHead>Max Quantity</TableHead>
                      <TableHead>Price (CZK)</TableHead>
                      <TableHead>Price (EUR)</TableHead>
                      <TableHead>Price (USD)</TableHead>
                      <TableHead>Type</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tieredPricing.map((tier: any, idx: number) => (
                      <TableRow key={tier.id || idx} data-testid={`row-tier-${idx}`}>
                        <TableCell data-testid={`text-tier-min-${idx}`}>{tier.minQuantity}</TableCell>
                        <TableCell data-testid={`text-tier-max-${idx}`}>{tier.maxQuantity || '∞'}</TableCell>
                        <TableCell>{tier.priceCzk ? formatCurrency(tier.priceCzk, "CZK") : '-'}</TableCell>
                        <TableCell>{tier.priceEur ? formatCurrency(tier.priceEur, "EUR") : '-'}</TableCell>
                        <TableCell>{tier.priceUsd ? formatCurrency(tier.priceUsd, "USD") : '-'}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{tier.priceType || 'tiered'}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-8 text-slate-500">
                <p>No tiered pricing configured</p>
              </div>
            )}
          </AccordionContent>
        </AccordionItem>

        {/* Supplier Information */}
        {supplier && (
          <AccordionItem value="supplier" className="border rounded-lg bg-white">
            <AccordionTrigger className="px-6 hover:no-underline" data-testid="accordion-supplier">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-slate-600" />
                <span className="font-semibold">Supplier Information</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-6">
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 bg-slate-100 rounded-lg flex items-center justify-center">
                    <Building className="h-8 w-8 text-slate-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-slate-900" data-testid="text-supplier-name">{supplier.name}</h3>
                    {supplier.contactPerson && (
                      <p className="text-sm text-slate-600" data-testid="text-supplier-contact">
                        Contact: {supplier.contactPerson}
                      </p>
                    )}
                  </div>
                </div>
                <Separator />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {supplier.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-slate-400" />
                      <a href={`mailto:${supplier.email}`} className="text-sm text-blue-600 hover:underline" data-testid="link-supplier-email">
                        {supplier.email}
                      </a>
                    </div>
                  )}
                  {supplier.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-slate-400" />
                      <a href={`tel:${supplier.phone}`} className="text-sm text-blue-600 hover:underline" data-testid="link-supplier-phone">
                        {supplier.phone}
                      </a>
                    </div>
                  )}
                  {supplier.website && (
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4 text-slate-400" />
                      <a href={supplier.website} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline" data-testid="link-supplier-website">
                        {supplier.website}
                      </a>
                    </div>
                  )}
                  {supplier.address && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-slate-400" />
                      <span className="text-sm text-slate-700" data-testid="text-supplier-address">{supplier.address}</span>
                    </div>
                  )}
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        )}

        {/* Variants */}
        <AccordionItem value="variants" className="border rounded-lg bg-white">
          <AccordionTrigger className="px-6 hover:no-underline" data-testid="accordion-variants">
            <div className="flex items-center gap-2">
              <Box className="h-5 w-5 text-slate-600" />
              <span className="font-semibold">Product Variants</span>
              {variantsLoading && <Skeleton className="h-4 w-16 ml-2" />}
              {!variantsLoading && variants.length > 0 && (
                <Badge variant="secondary" className="ml-2">{variants.length}</Badge>
              )}
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-6">
            {variantsLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-32 w-full" />
              </div>
            ) : variants.length > 0 ? (
              <ProductVariants productId={id!} />
            ) : (
              <div className="text-center py-8 text-slate-500">
                <p>No variants configured</p>
              </div>
            )}
          </AccordionContent>
        </AccordionItem>

        {/* Packing Instructions */}
        {(product.packingInstructionsText || product.packingInstructionsImage) && (
          <AccordionItem value="packing" className="border rounded-lg bg-white">
            <AccordionTrigger className="px-6 hover:no-underline" data-testid="accordion-packing">
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5 text-slate-600" />
                <span className="font-semibold">Packing Instructions</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-6">
              <div className="space-y-4">
                {product.packingInstructionsText && (
                  <div>
                    <label className="text-sm font-medium text-slate-600">Instructions</label>
                    <p className="text-base text-slate-700 mt-2 whitespace-pre-wrap" data-testid="text-packing-instructions">
                      {product.packingInstructionsText}
                    </p>
                  </div>
                )}
                {product.packingInstructionsImage && (
                  <div>
                    <label className="text-sm font-medium text-slate-600">Reference Image</label>
                    <img
                      src={product.packingInstructionsImage}
                      alt="Packing instructions"
                      className="mt-2 max-w-md rounded-lg border-2 border-slate-200"
                      data-testid="img-packing-instructions"
                    />
                  </div>
                )}
              </div>
            </AccordionContent>
          </AccordionItem>
        )}

        {/* Advanced Settings */}
        <AccordionItem value="advanced" className="border rounded-lg bg-white">
          <AccordionTrigger className="px-6 hover:no-underline" data-testid="accordion-advanced">
            <div className="flex items-center gap-2">
              <Warehouse className="h-5 w-5 text-slate-600" />
              <span className="font-semibold">Advanced Settings</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-6 space-y-6">
            {/* Product Files */}
            <div>
              <ProductFiles productId={id!} />
            </div>

            <Separator />

            {/* Product Locations */}
            <div>
              <ProductLocations productId={id!} productName={product.name} readOnly={true} />
            </div>

            <Separator />

            {/* Dimensions & Weight */}
            <div>
              <h3 className="text-sm font-semibold text-slate-700 mb-3">Dimensions & Weight</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-slate-50 rounded-lg p-3">
                  <div className="text-xs text-slate-600">Length</div>
                  <div className="text-lg font-bold" data-testid="text-length">{product.length || '-'} cm</div>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <div className="text-xs text-slate-600">Width</div>
                  <div className="text-lg font-bold" data-testid="text-width">{product.width || '-'} cm</div>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <div className="text-xs text-slate-600">Height</div>
                  <div className="text-lg font-bold" data-testid="text-height">{product.height || '-'} cm</div>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <div className="text-xs text-slate-600">Weight</div>
                  <div className="text-lg font-bold" data-testid="text-weight">{product.weight || '-'} kg</div>
                </div>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
