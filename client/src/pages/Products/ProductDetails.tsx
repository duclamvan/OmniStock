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
import { formatCurrency, formatDate } from "@/lib/currencyUtils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import CostHistoryChart from "@/components/products/CostHistoryChart";
import ProductFiles from "@/components/ProductFiles";
import ProductLocations from "@/components/ProductLocations";
import ProductVariants from "@/components/ProductVariants";
import { ImagePlaceholder } from "@/components/ImagePlaceholder";

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

  const { data: packingMaterials } = useQuery<any[]>({
    queryKey: ['/api/packing-materials'],
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

  const { data: orderHistory = [], isLoading: orderHistoryLoading, isError: orderHistoryError } = useQuery<any[]>({
    queryKey: ['/api/products', id, 'order-history'],
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto p-6 lg:p-8 space-y-6">
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
    order.items?.some((item: any) => item.productId === product.id)
  ) || [];

  const totalSold = productOrders.reduce((sum, order) => {
    const items = order.items?.filter((item: any) => item.productId === product.id) || [];
    return sum + items.reduce((itemSum: number, item: any) => itemSum + (item.quantity || 0), 0);
  }, 0);

  const totalRevenue = productOrders.reduce((sum, order) => {
    const items = order.items?.filter((item: any) => item.productId === product.id) || [];
    return sum + items.reduce((itemSum: number, item: any) => itemSum + ((item.price || 0) * (item.quantity || 0)), 0);
  }, 0);

  const warehouse = warehouses?.find((w: any) => w.id === product.warehouseId);
  const category = categories?.find((c: any) => c.id === product.categoryId);
  const supplier = suppliers?.find((s: any) => s.id === product.supplierId);
  const packingMaterial = packingMaterials?.find((pm: any) => pm.id === product.packingMaterialId);
  
  const stockStatus = product.quantity <= 5 ? "critical" : product.quantity <= 20 ? "low" : "healthy";
  const stockBadgeVariant = stockStatus === "critical" ? "destructive" : stockStatus === "low" ? "outline" : "default";

  // Parse product images with error handling and fallback
  let productImages: any[] = [];
  try {
    if (product.images && typeof product.images === 'string') {
      const parsed = JSON.parse(product.images);
      productImages = Array.isArray(parsed) ? parsed : [];
    } else if (product.images && typeof product.images === 'object' && !Array.isArray(product.images)) {
      // If images is an object (not string), check if it's already an array
      if (Array.isArray(product.images)) {
        productImages = product.images;
      }
    }
  } catch (error) {
    // Silent fail - images field is likely empty or invalid, will use fallback
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

  // Calculate margins for each currency (CZK and EUR only)
  const marginEur = product.priceEur && landingCostEur ? calculateMargin(parseFloat(product.priceEur), landingCostEur) : null;
  const marginCzk = product.priceCzk && landingCostCzk ? calculateMargin(parseFloat(product.priceCzk), landingCostCzk) : null;

  // Primary margin for display (use first available)
  const primaryMargin = marginEur || marginCzk || '0';

  return (
    <div className="max-w-7xl mx-auto p-4 lg:p-6 space-y-4">
      {/* Header with Back Button and Edit */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/inventory/products")}
          className="text-slate-600 hover:text-slate-900"
          data-testid="button-back"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Products
        </Button>
        <Button 
          onClick={() => navigate(`/inventory/products/edit/${id}`)} 
          className="bg-blue-600 hover:bg-blue-700"
          data-testid="button-edit"
        >
          <Edit className="h-4 w-4 mr-2" />
          Edit Product
        </Button>
      </div>

      {/* Product Hero Section */}
      <Card className="border-slate-200 shadow-sm">
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Product Image */}
            <div className="flex-shrink-0">
              {displayImage ? (
                <img
                  src={displayImage}
                  alt={product.name}
                  className="w-32 h-32 object-contain rounded-xl border-2 border-slate-200 shadow-sm bg-slate-50"
                  data-testid="img-product-primary"
                />
              ) : (
                <ImagePlaceholder size="lg" variant="product" data-testid="placeholder-product-image" />
              )}
            </div>

            {/* Product Info */}
            <div className="flex-1 space-y-4">
              {/* Title & Subtitle */}
              <div>
                <h1 className="text-3xl font-bold text-slate-900 mb-2" data-testid="text-product-name">
                  {product.name}
                </h1>
                {product.englishName && (
                  <p className="text-lg text-slate-500" data-testid="text-english-name">
                    {product.englishName}
                  </p>
                )}
              </div>

              {/* Badges Row */}
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="px-3 py-1 text-sm font-medium" data-testid="badge-sku">
                  <Hash className="h-3.5 w-3.5 mr-1.5" />
                  {product.sku}
                </Badge>
                {category && (
                  <Badge variant="secondary" className="px-3 py-1 text-sm font-medium" data-testid="badge-category">
                    <Box className="h-3.5 w-3.5 mr-1.5" />
                    {category.name}
                  </Badge>
                )}
                {product.barcode && (
                  <Badge variant="outline" className="px-3 py-1 text-sm font-medium" data-testid="badge-barcode">
                    <Barcode className="h-3.5 w-3.5 mr-1.5" />
                    {product.barcode}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Performance Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-slate-200 hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="text-sm font-medium text-slate-600">Current Stock</div>
                <div className="text-2xl font-bold text-slate-900" data-testid="text-metric-stock">{product.quantity}</div>
                <div className="text-xs text-slate-500">{product.unit}</div>
              </div>
              <div className="p-2 bg-blue-50 rounded-lg">
                <Package className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="text-sm font-medium text-slate-600">Total Sold</div>
                <div className="text-2xl font-bold text-slate-900" data-testid="text-metric-sold">{totalSold}</div>
                <div className="text-xs text-slate-500">All time</div>
              </div>
              <div className="p-2 bg-green-50 rounded-lg">
                <ShoppingCart className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="text-sm font-medium text-slate-600">Total Revenue</div>
                <div className="text-2xl font-bold text-slate-900" data-testid="text-metric-revenue">{formatCurrency(totalRevenue, "CZK")}</div>
                <div className="text-xs text-slate-500">All time</div>
              </div>
              <div className="p-2 bg-purple-50 rounded-lg">
                <DollarSign className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="text-sm font-medium text-slate-600">Profit Margin</div>
                <div className={`text-2xl font-bold ${getMarginColor(Number(primaryMargin))}`} data-testid="text-metric-margin">
                  {primaryMargin}%
                </div>
                <div className="text-xs text-slate-500">Per unit</div>
              </div>
              <div className="p-2 bg-amber-50 rounded-lg">
                <TrendingUp className="h-6 w-6 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Information Sections */}
      <Accordion
        type="multiple"
        value={expandedSections}
        onValueChange={setExpandedSections}
        className="space-y-2"
      >
        {/* Basic Information */}
        <AccordionItem value="basic" className="border-slate-200 rounded-xl bg-white shadow-sm">
          <AccordionTrigger className="px-4 py-3 hover:no-underline" data-testid="accordion-basic">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 rounded-lg">
                <Info className="h-5 w-5 text-blue-600" />
              </div>
              <span className="text-lg font-semibold text-slate-900">Basic Information</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <div className="space-y-6 pt-2">
              {/* Multi-Purpose Image Gallery */}
              {productImages.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Product Images</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    {productImages.map((img: any, idx: number) => {
                      const config = IMAGE_PURPOSE_CONFIG[img.purpose as keyof typeof IMAGE_PURPOSE_CONFIG];
                      const Icon = config?.icon || ImageIcon;
                      return (
                        <div key={idx} className="group">
                          <div className={`aspect-square border-2 rounded-lg overflow-hidden ${img.isPrimary ? 'ring-2 ring-blue-500 ring-offset-2' : 'border-slate-200'} transition-all hover:shadow-md bg-slate-50 flex items-center justify-center`}>
                            <img
                              src={img.url}
                              alt={config?.label || img.purpose}
                              className="w-full h-full object-contain p-2"
                              data-testid={`img-gallery-${idx}`}
                            />
                          </div>
                          <div className="mt-2 flex items-center gap-2">
                            <Badge variant="outline" className={`text-xs ${config?.color}`}>
                              <Icon className="h-3 w-3 mr-1" />
                              {config?.label || img.purpose}
                            </Badge>
                            {img.isPrimary && (
                              <Badge className="text-xs bg-blue-600">
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
              )}

              {productImages.length > 0 && <Separator />}

              {/* Product Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Product Name</label>
                    <p className="text-lg font-semibold text-slate-900 mt-1" data-testid="text-name">{product.name}</p>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">SKU</label>
                    <p className="text-lg font-mono text-slate-900 mt-1" data-testid="text-sku">{product.sku}</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Category</label>
                    <p className="text-lg text-slate-900 mt-1" data-testid="text-category">{category?.name || "Uncategorized"}</p>
                  </div>
                </div>
              </div>

              {product.description && (
                <>
                  <Separator />
                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Description</label>
                    <p className="text-base text-slate-700 mt-2 leading-relaxed" data-testid="text-description">{product.description}</p>
                  </div>
                </>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Pricing & Costs */}
        <AccordionItem value="pricing" className="border-slate-200 rounded-xl bg-white shadow-sm">
          <AccordionTrigger className="px-4 py-3 hover:no-underline" data-testid="accordion-pricing">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-50 rounded-lg">
                <DollarSign className="h-5 w-5 text-purple-600" />
              </div>
              <span className="text-lg font-semibold text-slate-900">Pricing & Costs</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <div className="space-y-6 pt-2">
              {/* Selling Prices */}
              <div>
                <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-4">Selling Prices</h3>
                <div className="grid grid-cols-2 gap-2">
                  {product.priceCzk && (
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-3 border border-blue-200">
                      <div className="text-xs font-medium text-blue-700">CZK</div>
                      <div className="text-lg font-bold text-blue-900 mt-1" data-testid="text-price-czk">{formatCurrency(product.priceCzk, "CZK")}</div>
                    </div>
                  )}
                  {product.priceEur && (
                    <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-3 border border-purple-200">
                      <div className="text-xs font-medium text-purple-700">EUR</div>
                      <div className="text-lg font-bold text-purple-900 mt-1" data-testid="text-price-eur">{formatCurrency(product.priceEur, "EUR")}</div>
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              {/* Import Costs */}
              <div>
                <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-4">Import Costs</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {product.importCostUsd && (
                    <div className="bg-amber-50 rounded-lg p-3 border border-amber-200">
                      <div className="text-xs font-medium text-amber-700">USD</div>
                      <div className="text-lg font-bold text-amber-900 mt-1" data-testid="text-import-usd">{formatCurrency(product.importCostUsd, "USD")}</div>
                    </div>
                  )}
                  {product.importCostCzk && (
                    <div className="bg-amber-50 rounded-lg p-3 border border-amber-200">
                      <div className="text-xs font-medium text-amber-700">CZK</div>
                      <div className="text-lg font-bold text-amber-900 mt-1" data-testid="text-import-czk">{formatCurrency(product.importCostCzk, "CZK")}</div>
                    </div>
                  )}
                  {product.importCostEur && (
                    <div className="bg-amber-50 rounded-lg p-3 border border-amber-200">
                      <div className="text-xs font-medium text-amber-700">EUR</div>
                      <div className="text-lg font-bold text-amber-900 mt-1" data-testid="text-import-eur">{formatCurrency(product.importCostEur, "EUR")}</div>
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              {/* Profit Margin - Multi-Currency */}
              <div>
                <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-4">Profit Analysis</h3>
                {(marginEur || marginCzk) ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {marginEur && (
                      <div className="border-2 border-slate-200 rounded-lg p-4 hover:border-blue-300 transition-colors">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-sm font-bold text-slate-700">EUR</span>
                          <Badge variant="outline" className={`font-bold ${getMarginColor(Number(marginEur))}`}>
                            {marginEur}%
                          </Badge>
                        </div>
                        <div className="space-y-2">
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
                      <div className="border-2 border-slate-200 rounded-lg p-4 hover:border-blue-300 transition-colors">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-sm font-bold text-slate-700">CZK</span>
                          <Badge variant="outline" className={`font-bold ${getMarginColor(Number(marginCzk))}`}>
                            {marginCzk}%
                          </Badge>
                        </div>
                        <div className="space-y-2">
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
                  </div>
                ) : (
                  <p className="text-sm text-slate-500 italic">No pricing data available for margin calculation</p>
                )}
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Stock & Warehouse Locations */}
        <AccordionItem value="stock" className="border-slate-200 rounded-xl bg-white shadow-sm">
          <AccordionTrigger className="px-4 py-3 hover:no-underline" data-testid="accordion-stock">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-50 rounded-lg">
                <Package className="h-5 w-5 text-green-600" />
              </div>
              <span className="text-lg font-semibold text-slate-900">Stock & Warehouse Locations</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4 space-y-8 pt-2">
            {/* Stock Summary */}
            <div>
              <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-4">Stock Summary</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Current Quantity</label>
                  <p className="text-2xl font-bold text-slate-900 mt-2" data-testid="text-quantity">{product.quantity}</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Unit</label>
                  <p className="text-2xl font-bold text-slate-900 mt-2" data-testid="text-unit">{product.unit || 'units'}</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Low Stock Alert</label>
                  <p className="text-2xl font-bold text-slate-900 mt-2" data-testid="text-low-stock">{product.lowStockAlert || 5}</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Barcode</label>
                  <p className="text-lg font-mono text-slate-900 mt-2" data-testid="text-barcode-detail">{product.barcode || "Not set"}</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Warehouse</label>
                  <p className="text-lg text-slate-900 mt-2" data-testid="text-warehouse">{warehouse?.name || "Not assigned"}</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Warehouse Location</label>
                  <p className="text-lg font-mono text-slate-900 mt-2" data-testid="text-location">{product.warehouseLocation || "Not specified"}</p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Warehouse Locations */}
            <div>
              <ProductLocations productId={id!} productName={product.name} readOnly={true} />
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Variants */}
        <AccordionItem value="variants" className="border-slate-200 rounded-xl bg-white shadow-sm">
          <AccordionTrigger className="px-4 py-3 hover:no-underline" data-testid="accordion-variants">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-cyan-50 rounded-lg">
                <Box className="h-5 w-5 text-cyan-600" />
              </div>
              <span className="text-lg font-semibold text-slate-900">Product Variants</span>
              {variantsLoading && <Skeleton className="h-5 w-16 ml-2" />}
              {!variantsLoading && variants.length > 0 && (
                <Badge variant="secondary" className="ml-2">{variants.length} variants</Badge>
              )}
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            {variantsLoading ? (
              <div className="space-y-2 pt-2">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-32 w-full" />
              </div>
            ) : variants.length > 0 ? (
              <div className="pt-2">
                <ProductVariants productId={id!} />
              </div>
            ) : (
              <div className="text-center py-12 text-slate-500">
                <Box className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="font-medium">No variants configured</p>
              </div>
            )}
          </AccordionContent>
        </AccordionItem>

        {/* Supplier Information */}
        {supplier && (
          <AccordionItem value="supplier" className="border-slate-200 rounded-xl bg-white shadow-sm">
            <AccordionTrigger className="px-4 py-3 hover:no-underline" data-testid="accordion-supplier">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-50 rounded-lg">
                  <Users className="h-5 w-5 text-orange-600" />
                </div>
                <span className="text-lg font-semibold text-slate-900">Supplier Information</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4">
              <div className="space-y-6 pt-2">
                <div className="flex items-start gap-4">
                  <ImagePlaceholder size="lg" variant="building" data-testid="placeholder-supplier-image" />
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-slate-900" data-testid="text-supplier-name">{supplier.name}</h3>
                    {supplier.contactPerson && (
                      <p className="text-sm text-slate-600 mt-1" data-testid="text-supplier-contact">
                        Contact: {supplier.contactPerson}
                      </p>
                    )}
                  </div>
                </div>
                <Separator />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {supplier.email && (
                    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                      <Mail className="h-5 w-5 text-slate-400" />
                      <a href={`mailto:${supplier.email}`} className="text-sm text-blue-600 hover:underline font-medium" data-testid="link-supplier-email">
                        {supplier.email}
                      </a>
                    </div>
                  )}
                  {supplier.phone && (
                    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                      <Phone className="h-5 w-5 text-slate-400" />
                      <a href={`tel:${supplier.phone}`} className="text-sm text-blue-600 hover:underline font-medium" data-testid="link-supplier-phone">
                        {supplier.phone}
                      </a>
                    </div>
                  )}
                  {supplier.website && (
                    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                      <Globe className="h-5 w-5 text-slate-400" />
                      <a href={supplier.website} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline font-medium" data-testid="link-supplier-website">
                        {supplier.website}
                      </a>
                    </div>
                  )}
                  {supplier.address && (
                    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                      <MapPin className="h-5 w-5 text-slate-400" />
                      <span className="text-sm text-slate-700 font-medium" data-testid="text-supplier-address">{supplier.address}</span>
                    </div>
                  )}
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        )}

        {/* Packing & Shipping Details */}
        <AccordionItem value="packing" className="border-slate-200 rounded-xl bg-white shadow-sm">
          <AccordionTrigger className="px-4 py-3 hover:no-underline" data-testid="accordion-packing">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-pink-50 rounded-lg">
                <Package className="h-5 w-5 text-pink-600" />
              </div>
              <span className="text-lg font-semibold text-slate-900">Packing & Shipping Details</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <div className="space-y-6 pt-2">
              {/* Physical Dimensions & Weight */}
              <div>
                <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-4">Physical Dimensions & Weight</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg p-4 border border-slate-200">
                    <div className="text-xs font-medium text-slate-600">Length</div>
                    <div className="text-2xl font-bold text-slate-900 mt-1" data-testid="text-length">{product.length || '-'} cm</div>
                  </div>
                  <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg p-4 border border-slate-200">
                    <div className="text-xs font-medium text-slate-600">Width</div>
                    <div className="text-2xl font-bold text-slate-900 mt-1" data-testid="text-width">{product.width || '-'} cm</div>
                  </div>
                  <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg p-4 border border-slate-200">
                    <div className="text-xs font-medium text-slate-600">Height</div>
                    <div className="text-2xl font-bold text-slate-900 mt-1" data-testid="text-height">{product.height || '-'} cm</div>
                  </div>
                  <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg p-4 border border-slate-200">
                    <div className="text-xs font-medium text-slate-600">Weight</div>
                    <div className="text-2xl font-bold text-slate-900 mt-1" data-testid="text-weight">{product.weight || '-'} kg</div>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Packing Material */}
              {packingMaterial && (
                <>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-4">Packing Material</h3>
                    <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-slate-900" data-testid="text-packing-material">{packingMaterial.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {packingMaterial.sizeLength}×{packingMaterial.sizeWidth}×{packingMaterial.sizeHeight} cm
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm mt-3">
                        <div>
                          <span className="text-slate-600">Type:</span>
                          <span className="ml-2 font-medium text-slate-900">{packingMaterial.materialType}</span>
                        </div>
                        <div>
                          <span className="text-slate-600">Cost:</span>
                          <span className="ml-2 font-medium text-slate-900">{formatCurrency(Number(packingMaterial.costPerUnit || 0), 'EUR')}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <Separator />
                </>
              )}

              {/* Packing Instructions */}
              <div>
                <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-4">Packing Instructions</h3>
                {(() => {
                  const hasGroupedInstructions = product.groupedPackingInstructions && 
                    Array.isArray(product.groupedPackingInstructions) && 
                    product.groupedPackingInstructions.length > 0;
                  const hasLegacyInstructions = product.packingInstructionsText || product.packingInstructionsImage;

                  if (hasGroupedInstructions) {
                    return (
                      <div className="space-y-4">
                        {product.groupedPackingInstructions.map((instruction: any, idx: number) => (
                          <div key={idx} className="bg-slate-50 rounded-lg p-4 border-2 border-slate-200">
                            <div className="flex items-center gap-2 mb-3">
                              <Badge variant="outline" className="font-bold">Step {idx + 1}</Badge>
                            </div>
                            {instruction.text && (
                              <p className="text-sm text-slate-700 mb-3 whitespace-pre-wrap leading-relaxed" data-testid={`text-packing-instruction-${idx}`}>
                                {instruction.text}
                              </p>
                            )}
                            {instruction.image && (
                              <img
                                src={instruction.image}
                                alt={`Step ${idx + 1}`}
                                className="max-w-md rounded-lg border-2 border-slate-200 shadow-sm"
                                data-testid={`img-packing-instruction-${idx}`}
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    );
                  } else if (hasLegacyInstructions) {
                    return (
                      <div className="space-y-4 bg-slate-50 rounded-lg p-4 border-2 border-slate-200">
                        {product.packingInstructionsText && (
                          <div>
                            <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed" data-testid="text-packing-instructions-legacy">
                              {product.packingInstructionsText}
                            </p>
                          </div>
                        )}
                        {product.packingInstructionsImage && (
                          <img
                            src={product.packingInstructionsImage}
                            alt="Packing instructions"
                            className="max-w-md rounded-lg border-2 border-slate-200 shadow-sm"
                            data-testid="img-packing-instructions"
                          />
                        )}
                      </div>
                    );
                  } else {
                    return (
                      <div className="text-center py-8 text-slate-500">
                        <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
                        <p className="font-medium">No packing instructions available</p>
                      </div>
                    );
                  }
                })()}
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Import Costs & Analytics */}
        <AccordionItem value="analytics" className="border-slate-200 rounded-xl bg-white shadow-sm">
          <AccordionTrigger className="px-4 py-3 hover:no-underline" data-testid="accordion-analytics">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-50 rounded-lg">
                <BarChart3 className="h-5 w-5 text-indigo-600" />
              </div>
              <span className="text-lg font-semibold text-slate-900">Import Costs & Analytics</span>
              {costHistoryLoading && <Skeleton className="h-5 w-16 ml-2" />}
              {!costHistoryLoading && costHistory.length > 0 && (
                <Badge variant="secondary" className="ml-2">{costHistory.length} entries</Badge>
              )}
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            {costHistoryLoading ? (
              <div className="space-y-2 pt-2">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-48 w-full" />
              </div>
            ) : costHistoryError ? (
              <div className="text-center py-12 text-red-600">
                <BarChart3 className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="font-medium">Failed to load cost history data</p>
              </div>
            ) : costHistory.length > 0 ? (
              <div className="pt-2">
                <CostHistoryChart data={costHistory} currency="€" />
              </div>
            ) : (
              <div className="text-center py-12 text-slate-500">
                <BarChart3 className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="font-medium">No cost history available</p>
              </div>
            )}
          </AccordionContent>
        </AccordionItem>

        {/* Tiered Pricing */}
        <AccordionItem value="tiered" className="border-slate-200 rounded-xl bg-white shadow-sm">
          <AccordionTrigger className="px-4 py-3 hover:no-underline" data-testid="accordion-tiered">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-50 rounded-lg">
                <Euro className="h-5 w-5 text-emerald-600" />
              </div>
              <span className="text-lg font-semibold text-slate-900">Tiered Pricing</span>
              {tieredPricingLoading && <Skeleton className="h-5 w-16 ml-2" />}
              {!tieredPricingLoading && tieredPricing.length > 0 && (
                <Badge variant="secondary" className="ml-2">{tieredPricing.length} tiers</Badge>
              )}
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            {tieredPricingLoading ? (
              <div className="space-y-2 pt-2">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-32 w-full" />
              </div>
            ) : tieredPricingError ? (
              <div className="text-center py-12 text-red-600">
                <Euro className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="font-medium">Failed to load tiered pricing data</p>
              </div>
            ) : tieredPricing.length > 0 ? (
              <div className="rounded-lg border border-slate-200 overflow-hidden mt-2">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead className="font-semibold">Min Quantity</TableHead>
                      <TableHead className="font-semibold">Max Quantity</TableHead>
                      <TableHead className="font-semibold">Price (CZK)</TableHead>
                      <TableHead className="font-semibold">Price (EUR)</TableHead>
                      <TableHead className="font-semibold">Type</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tieredPricing.map((tier: any, idx: number) => (
                      <TableRow key={tier.id || idx} data-testid={`row-tier-${idx}`}>
                        <TableCell className="font-medium" data-testid={`text-tier-min-${idx}`}>{tier.minQuantity}</TableCell>
                        <TableCell className="font-medium" data-testid={`text-tier-max-${idx}`}>{tier.maxQuantity || '∞'}</TableCell>
                        <TableCell>{tier.priceCzk ? formatCurrency(tier.priceCzk, "CZK") : '-'}</TableCell>
                        <TableCell>{tier.priceEur ? formatCurrency(tier.priceEur, "EUR") : '-'}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{tier.priceType || 'tiered'}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-12 text-slate-500">
                <Euro className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="font-medium">No tiered pricing configured</p>
              </div>
            )}
          </AccordionContent>
        </AccordionItem>

        {/* Order History */}
        <AccordionItem value="order-history" className="border-slate-200 rounded-xl bg-white shadow-sm">
          <AccordionTrigger className="px-4 py-3 hover:no-underline" data-testid="accordion-order-history">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-50 rounded-lg">
                <ShoppingCart className="h-5 w-5 text-purple-600" />
              </div>
              <span className="text-lg font-semibold text-slate-900">Order History</span>
              {orderHistoryLoading && <Skeleton className="h-5 w-16 ml-2" />}
              {!orderHistoryLoading && orderHistory.length > 0 && (
                <Badge variant="secondary" className="ml-2">{orderHistory.length} orders</Badge>
              )}
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            {orderHistoryLoading ? (
              <div className="space-y-2 pt-2">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-32 w-full" />
              </div>
            ) : orderHistoryError ? (
              <div className="text-center py-12 text-red-600">
                <ShoppingCart className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="font-medium">Failed to load order history</p>
              </div>
            ) : orderHistory.length > 0 ? (
              <div className="rounded-lg border border-slate-200 overflow-hidden mt-2">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead className="font-semibold">Order</TableHead>
                      <TableHead className="font-semibold">Customer</TableHead>
                      <TableHead className="font-semibold">Date</TableHead>
                      <TableHead className="font-semibold text-right">Quantity</TableHead>
                      <TableHead className="font-semibold text-right">Price/Unit</TableHead>
                      <TableHead className="font-semibold text-right">Revenue</TableHead>
                      <TableHead className="font-semibold text-right">Profit</TableHead>
                      <TableHead className="font-semibold text-right">Margin</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orderHistory.map((order: any, idx: number) => {
                      const profitMargin = parseFloat(order.profitMargin);
                      const profitColor = profitMargin >= 30 ? 'text-green-600' : profitMargin >= 15 ? 'text-blue-600' : profitMargin >= 0 ? 'text-amber-600' : 'text-red-600';
                      
                      return (
                        <TableRow key={order.orderId || idx} data-testid={`row-order-${idx}`}>
                          <TableCell className="font-medium" data-testid={`text-order-number-${idx}`}>
                            {order.orderNumber}
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium text-sm">{order.customerName || 'Unknown'}</p>
                              {order.customerEmail && (
                                <p className="text-xs text-muted-foreground">{order.customerEmail}</p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">
                            {order.orderDate ? formatDate(order.orderDate) : '-'}
                          </TableCell>
                          <TableCell className="text-right font-medium">{order.quantity}</TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(order.pricePerUnit, order.currency || 'CZK')}
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            {formatCurrency(order.totalRevenue, order.currency || 'CZK')}
                          </TableCell>
                          <TableCell className={`text-right font-semibold ${order.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {formatCurrency(order.profit, order.currency || 'CZK')}
                          </TableCell>
                          <TableCell className={`text-right font-bold ${profitColor}`}>
                            {order.profitMargin}%
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
                
                {/* Summary */}
                {orderHistory.length > 0 && (
                  <div className="bg-slate-50 px-4 py-3 border-t">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Total Orders</p>
                        <p className="font-bold text-lg">{orderHistory.length}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Total Quantity</p>
                        <p className="font-bold text-lg">
                          {orderHistory.reduce((sum: number, order: any) => sum + (order.quantity || 0), 0)}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Total Revenue</p>
                        <p className="font-bold text-lg text-green-600">
                          {formatCurrency(
                            orderHistory.reduce((sum: number, order: any) => sum + (order.totalRevenue || 0), 0),
                            orderHistory[0]?.currency || 'CZK'
                          )}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Total Profit</p>
                        <p className="font-bold text-lg text-green-600">
                          {formatCurrency(
                            orderHistory.reduce((sum: number, order: any) => sum + (order.profit || 0), 0),
                            orderHistory[0]?.currency || 'CZK'
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12 text-slate-500">
                <ShoppingCart className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="font-medium">No order history available</p>
                <p className="text-sm mt-2">This product hasn't been included in any orders yet</p>
              </div>
            )}
          </AccordionContent>
        </AccordionItem>

        {/* Product Documents */}
        <AccordionItem value="advanced" className="border-slate-200 rounded-xl bg-white shadow-sm">
          <AccordionTrigger className="px-4 py-3 hover:no-underline" data-testid="accordion-advanced">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-100 rounded-lg">
                <Warehouse className="h-5 w-5 text-slate-600" />
              </div>
              <span className="text-lg font-semibold text-slate-900">Product Documents</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4 pt-2">
            <ProductFiles productId={id!} />
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
