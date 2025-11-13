import { useState } from "react";
import { useParams, useLocation, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  ArrowLeft, 
  Package, 
  Edit, 
  TrendingUp, 
  Image as ImageIcon,
  Hand,
  PackageOpen,
  FileType,
  DollarSign,
  Building,
  MapPin,
  Barcode,
  Hash,
  Box,
  Euro,
  Warehouse,
  Users,
  Ruler,
  Weight,
  ShoppingCart,
  BarChart3,
  Sparkles,
  Layers,
  FileText,
  MapPinned,
  Truck,
  AlertTriangle,
  CheckCircle
} from "lucide-react";
import { formatCurrency } from "@/lib/currencyUtils";
import { format } from "date-fns";
import CostHistoryChart from "@/components/products/CostHistoryChart";
import ProductFiles from "@/components/ProductFiles";
import ProductLocations from "@/components/ProductLocations";
import ProductVariants from "@/components/ProductVariants";
import { ImagePlaceholder } from "@/components/ImagePlaceholder";

const IMAGE_PURPOSE_CONFIG = {
  main: { label: 'Main WMS Image', icon: ImageIcon, color: 'text-blue-600' },
  in_hand: { label: 'In Hand', icon: Hand, color: 'text-emerald-600' },
  detail: { label: 'Detail Shot', icon: PackageOpen, color: 'text-indigo-600' },
  packaging: { label: 'Packaging', icon: Package, color: 'text-orange-600' },
  label: { label: 'Label/Barcode', icon: FileType, color: 'text-cyan-600' },
};

export default function ProductDetails() {
  const { id } = useParams();
  const [, navigate] = useLocation();
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  const { data: product, isLoading } = useQuery<any>({
    queryKey: ['/api/products', id],
    enabled: !!id,
  });

  const { data: orders } = useQuery<any[]>({ queryKey: ['/api/orders'] });
  const { data: warehouses } = useQuery<any[]>({ queryKey: ['/api/warehouses'] });
  const { data: categories } = useQuery<any[]>({ queryKey: ['/api/categories'] });
  const { data: suppliers } = useQuery<any[]>({ queryKey: ['/api/suppliers'] });
  const { data: packingMaterials } = useQuery<any[]>({ queryKey: ['/api/packing-materials'] });
  const { data: variants = [] } = useQuery<any[]>({
    queryKey: [`/api/products/${id}/variants`],
    enabled: !!id,
  });
  const { data: tieredPricing = [] } = useQuery<any[]>({
    queryKey: ['/api/products', id, 'tiered-pricing'],
    enabled: !!id,
  });
  const { data: costHistory = [] } = useQuery<any[]>({
    queryKey: ['/api/products', id, 'cost-history'],
    enabled: !!id,
  });
  const { data: bundles = [] } = useQuery<any[]>({
    queryKey: ['/api/bundles'],
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!product) return null;

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
  const category = categories?.find((c: any) => String(c.id) === product.categoryId);
  const supplier = suppliers?.find((s: any) => s.id === product.supplierId);
  const packingMaterial = packingMaterials?.find((pm: any) => pm.id === product.packingMaterialId);

  // Parse images
  let productImages: any[] = [];
  try {
    if (product.images) {
      const parsed = typeof product.images === 'string' ? JSON.parse(product.images) : product.images;
      productImages = Array.isArray(parsed) ? parsed : [];
    }
  } catch {
    productImages = [];
  }
  if (productImages.length === 0 && product.imageUrl) {
    productImages = [{ url: product.imageUrl, purpose: 'main', isPrimary: true }];
  }

  const displayImage = productImages[selectedImageIndex]?.url || productImages[0]?.url || product.imageUrl;

  // Calculate margins
  const landingCostEur = parseFloat(product.latestLandingCost) || parseFloat(product.importCostEur) || 0;
  const landingCostCzk = parseFloat(product.importCostCzk) || 0;
  const priceEur = parseFloat(product.priceEur) || 0;
  const priceCzk = parseFloat(product.priceCzk) || 0;
  const marginEur = priceEur && landingCostEur ? ((priceEur - landingCostEur) / priceEur * 100).toFixed(1) : null;
  const marginCzk = priceCzk && landingCostCzk ? ((priceCzk - landingCostCzk) / priceCzk * 100).toFixed(1) : null;
  const primaryMargin = marginEur || marginCzk || '0';

  // Stock status
  const stockStatus = product.quantity <= (product.lowStockAlert || 5) ? 'critical' : product.quantity <= (product.lowStockAlert || 5) * 2 ? 'low' : 'healthy';

  // Parse packing instructions
  let packingInstructions: any[] = [];
  try {
    const texts = product.packingInstructionsTexts ? JSON.parse(product.packingInstructionsTexts) : [];
    const images = product.packingInstructionsImages ? JSON.parse(product.packingInstructionsImages) : [];
    packingInstructions = texts.map((text: string, i: number) => ({
      text,
      image: images[i] || null
    }));
  } catch {}

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
          <Button variant="ghost" size="icon" onClick={() => window.history.back()} className="shrink-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl lg:text-2xl font-bold truncate">{product.name}</h1>
            <p className="text-xs sm:text-sm text-muted-foreground truncate">SKU: {product.sku}</p>
          </div>
        </div>
        <Link href={`/inventory/${id}/edit`}>
          <Button className="shrink-0">
            <Edit className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Edit Product</span>
          </Button>
        </Link>
      </div>

      {/* Hero Section - Image & Key Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Product Image */}
        <Card className="lg:col-span-1">
          <CardContent className="p-6">
            <div className="aspect-square bg-muted rounded-lg overflow-hidden mb-4">
              {displayImage ? (
                <img src={displayImage} alt={product.name} className="w-full h-full object-contain" />
              ) : (
                <ImagePlaceholder className="w-full h-full" />
              )}
            </div>
            {productImages.length > 1 && (
              <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-2">
                {productImages.map((img, idx) => {
                  const config = IMAGE_PURPOSE_CONFIG[img.purpose as keyof typeof IMAGE_PURPOSE_CONFIG];
                  const Icon = config?.icon || ImageIcon;
                  return (
                    <button
                      key={idx}
                      onClick={() => setSelectedImageIndex(idx)}
                      className={`aspect-square rounded border-2 overflow-hidden ${
                        idx === selectedImageIndex ? 'border-primary' : 'border-border hover:border-primary/50'
                      }`}
                    >
                      {img.url ? (
                        <img src={img.url} alt="" className="w-full h-full object-contain" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-muted">
                          <Icon className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Key Stats Cards */}
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">Current Stock</CardTitle>
                <Box className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{product.quantity || 0}</div>
              {stockStatus === 'critical' && (
                <Badge variant="destructive" className="mt-2">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Critical Stock
                </Badge>
              )}
              {stockStatus === 'low' && (
                <Badge variant="outline" className="mt-2 border-orange-500 text-orange-700">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Low Stock
                </Badge>
              )}
              {stockStatus === 'healthy' && (
                <Badge className="mt-2 bg-green-100 text-green-800 hover:bg-green-100">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  In Stock
                </Badge>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Sold</CardTitle>
                <ShoppingCart className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{totalSold}</div>
              <p className="text-xs text-muted-foreground mt-2">All time</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{formatCurrency(totalRevenue, 'CZK')}</div>
              <p className="text-xs text-muted-foreground mt-2">All time</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">Profit Margin</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <div className={`text-3xl font-bold ${parseFloat(primaryMargin) > 30 ? 'text-green-600' : parseFloat(primaryMargin) > 15 ? 'text-yellow-600' : 'text-red-600'}`}>
                {primaryMargin}%
              </div>
              <p className="text-xs text-muted-foreground mt-2">Per unit</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left Column */}
        <div className="space-y-4">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Package className="h-5 w-5" />
                Basic Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Product Name</p>
                  <p className="font-medium">{product.name}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">SKU</p>
                  <p className="font-medium font-mono">{product.sku}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Category</p>
                  <p className="font-medium">{category?.name || 'Uncategorized'}</p>
                </div>
                {product.vietnameseName && (
                  <div>
                    <p className="text-muted-foreground">Vietnamese Name</p>
                    <p className="font-medium">{product.vietnameseName}</p>
                  </div>
                )}
                {product.barcode && (
                  <div>
                    <p className="text-muted-foreground">Barcode</p>
                    <p className="font-medium font-mono">{product.barcode}</p>
                  </div>
                )}
                <div>
                  <p className="text-muted-foreground">Low Stock Alert</p>
                  <p className="font-medium">{product.lowStockAlert || 5} units</p>
                </div>
              </div>
              {product.description && (
                <div className="pt-2 border-t">
                  <p className="text-muted-foreground text-sm mb-1">Description</p>
                  <p className="text-sm">{product.description}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Pricing & Costs */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Euro className="h-5 w-5" />
                Pricing & Costs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Selling Prices */}
                <div>
                  <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Selling Prices
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="p-2 rounded bg-muted/50">
                      <p className="text-muted-foreground text-xs">CZK</p>
                      <p className="font-bold text-lg">{formatCurrency(priceCzk, 'CZK')}</p>
                    </div>
                    <div className="p-2 rounded bg-muted/50">
                      <p className="text-muted-foreground text-xs">EUR</p>
                      <p className="font-bold text-lg">{formatCurrency(priceEur, 'EUR')}</p>
                    </div>
                  </div>
                </div>

                {/* Import Costs */}
                <div>
                  <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                    <Truck className="h-4 w-4" />
                    Import Costs
                  </h4>
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    {product.importCostUsd && (
                      <div className="p-2 rounded bg-blue-50 dark:bg-blue-950/30">
                        <p className="text-muted-foreground text-xs">USD</p>
                        <p className="font-semibold">${parseFloat(product.importCostUsd).toFixed(2)}</p>
                      </div>
                    )}
                    {landingCostCzk > 0 && (
                      <div className="p-2 rounded bg-blue-50 dark:bg-blue-950/30">
                        <p className="text-muted-foreground text-xs">CZK</p>
                        <p className="font-semibold">{formatCurrency(landingCostCzk, 'CZK')}</p>
                      </div>
                    )}
                    {landingCostEur > 0 && (
                      <div className="p-2 rounded bg-blue-50 dark:bg-blue-950/30">
                        <p className="text-muted-foreground text-xs">EUR</p>
                        <p className="font-semibold">{formatCurrency(landingCostEur, 'EUR')}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Profit Margins */}
                {(marginEur || marginCzk) && (
                  <div>
                    <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      Profit Margins
                    </h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      {marginCzk && (
                        <div className="p-2 rounded bg-green-50 dark:bg-green-950/30">
                          <p className="text-muted-foreground text-xs">CZK Margin</p>
                          <p className="font-bold text-green-700 dark:text-green-400">{marginCzk}%</p>
                        </div>
                      )}
                      {marginEur && (
                        <div className="p-2 rounded bg-green-50 dark:bg-green-950/30">
                          <p className="text-muted-foreground text-xs">EUR Margin</p>
                          <p className="font-bold text-green-700 dark:text-green-400">{marginEur}%</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Dimensions & Weight */}
          {(product.length || product.width || product.height || product.weight) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Ruler className="h-5 w-5" />
                  Dimensions & Weight
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {product.length && (
                    <div>
                      <p className="text-muted-foreground">Length</p>
                      <p className="font-medium">{product.length} cm</p>
                    </div>
                  )}
                  {product.width && (
                    <div>
                      <p className="text-muted-foreground">Width</p>
                      <p className="font-medium">{product.width} cm</p>
                    </div>
                  )}
                  {product.height && (
                    <div>
                      <p className="text-muted-foreground">Height</p>
                      <p className="font-medium">{product.height} cm</p>
                    </div>
                  )}
                  {product.weight && (
                    <div>
                      <p className="text-muted-foreground">Weight</p>
                      <p className="font-medium">{parseFloat(product.weight).toFixed(3)} kg</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Warehouse & Location */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Warehouse className="h-5 w-5" />
                Warehouse & Location
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Warehouse</p>
                  <p className="font-medium">{warehouse?.name || 'Not assigned'}</p>
                </div>
                {product.warehouseLocation && (
                  <div>
                    <p className="text-muted-foreground">Location Code</p>
                    <p className="font-medium font-mono">{product.warehouseLocation}</p>
                  </div>
                )}
              </div>
              {product.shipmentNotes && (
                <div className="pt-2 border-t">
                  <p className="text-muted-foreground text-sm mb-1">Shipment Notes</p>
                  <p className="text-sm">{product.shipmentNotes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Supplier Information */}
          {supplier && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Supplier Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-muted-foreground">Supplier Name</p>
                    <p className="font-medium">{supplier.name}</p>
                  </div>
                  {supplier.country && (
                    <div>
                      <p className="text-muted-foreground">Country</p>
                      <p className="font-medium">{supplier.country}</p>
                    </div>
                  )}
                  {supplier.contactPerson && (
                    <div>
                      <p className="text-muted-foreground">Contact Person</p>
                      <p className="font-medium">{supplier.contactPerson}</p>
                    </div>
                  )}
                  {supplier.email && (
                    <div>
                      <p className="text-muted-foreground">Email</p>
                      <p className="font-medium">{supplier.email}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Packing Material */}
          {packingMaterial && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Layers className="h-5 w-5" />
                  Packing Material
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  {packingMaterial.imageUrl && (
                    <img src={packingMaterial.imageUrl} alt="" className="w-16 h-16 object-contain rounded border" />
                  )}
                  <div className="flex-1">
                    <p className="font-medium">{packingMaterial.name}</p>
                    {packingMaterial.dimensions && (
                      <p className="text-sm text-muted-foreground">{packingMaterial.dimensions}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column */}
        <div className="space-y-4">
          {/* Packing Instructions */}
          {packingInstructions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Packing Instructions ({packingInstructions.length} steps)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {packingInstructions.map((instruction, index) => (
                    <div key={index} className="border rounded-lg p-3 bg-muted/30">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline" className="text-xs">Step {index + 1}</Badge>
                      </div>
                      {instruction.image && (
                        <img src={instruction.image} alt={`Step ${index + 1}`} className="w-full h-32 object-contain rounded border mb-2" />
                      )}
                      {instruction.text && (
                        <p className="text-sm">{instruction.text}</p>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Product Variants */}
          {variants.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Sparkles className="h-5 w-5" />
                  Product Variants ({variants.length})
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">Multiple variants available - can be selected individually in orders</p>
              </CardHeader>
              <CardContent>
                <ProductVariants productId={id!} />
              </CardContent>
            </Card>
          )}

          {/* Bundles Containing This Product */}
          {bundles.filter((b: any) => b.items?.some((item: any) => item.productId === id)).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Layers className="h-5 w-5" />
                  Included in Bundles ({bundles.filter((b: any) => b.items?.some((item: any) => item.productId === id)).length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {bundles.filter((b: any) => b.items?.some((item: any) => item.productId === id)).map((bundle: any) => {
                    const bundleItem = bundle.items?.find((item: any) => item.productId === id);
                    return (
                      <div key={bundle.id} className="flex items-center gap-3 p-3 border rounded-lg bg-muted/30">
                        {bundle.imageUrl && (
                          <img src={bundle.imageUrl} alt={bundle.name} className="w-12 h-12 object-contain rounded border" />
                        )}
                        <div className="flex-1">
                          <Link href={`/inventory/bundles/${bundle.id}`}>
                            <p className="font-medium text-blue-600 hover:text-blue-800 hover:underline">{bundle.name}</p>
                          </Link>
                          {bundleItem && (
                            <p className="text-sm text-muted-foreground">
                              Quantity in bundle: {bundleItem.quantity}× {bundleItem.variantName ? `(${bundleItem.variantName})` : ''}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          {bundle.priceEur && (
                            <p className="font-semibold text-sm">{formatCurrency(parseFloat(bundle.priceEur), 'EUR')}</p>
                          )}
                          {bundle.priceCzk && (
                            <p className="text-xs text-muted-foreground">{formatCurrency(parseFloat(bundle.priceCzk), 'CZK')}</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Tiered Pricing */}
          {tieredPricing.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Tiered Pricing
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Quantity Range</TableHead>
                      <TableHead className="text-right">Price CZK</TableHead>
                      <TableHead className="text-right">Price EUR</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tieredPricing.map((tier: any) => (
                      <TableRow key={tier.id}>
                        <TableCell className="font-medium">
                          {tier.minQuantity}+ units
                        </TableCell>
                        <TableCell className="text-right">{formatCurrency(parseFloat(tier.priceCzk || '0'), 'CZK')}</TableCell>
                        <TableCell className="text-right">{formatCurrency(parseFloat(tier.priceEur || '0'), 'EUR')}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Cost History Chart */}
          {costHistory.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Cost History
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CostHistoryChart data={costHistory} />
              </CardContent>
            </Card>
          )}

          {/* Product Locations */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <MapPinned className="h-5 w-5" />
                Storage Locations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ProductLocations productId={id!} />
            </CardContent>
          </Card>

          {/* Product Files */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Documents & Files
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ProductFiles productId={id!} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
