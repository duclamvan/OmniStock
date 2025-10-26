import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Search, Package, MapPin, Barcode, TrendingUp, TrendingDown, AlertCircle, ChevronRight, Layers, MoveRight, ArrowUpDown, FileText, AlertTriangle } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Link } from "wouter";
import { fuzzySearch } from "@/lib/fuzzySearch";
import MoveInventoryDialog from "@/components/warehouse/MoveInventoryDialog";
import StockAdjustmentDialog from "@/components/warehouse/StockAdjustmentDialog";

interface Variant {
  id: string;
  name: string;
  barcode?: string;
  quantity: number;
  imageUrl?: string;
  priceCzk?: number;
  priceEur?: number;
}

interface ProductLocation {
  id: string;
  productId: string;
  warehouseId: string;
  locationCode: string;
  quantity: number;
  isPrimary: boolean;
}

interface EnrichedProduct {
  id: string;
  name: string;
  sku?: string;
  barcode?: string;
  categoryName?: string;
  description?: string;
  quantity: number;
  variants: Variant[];
  totalStock: number;
  locations?: ProductLocation[];
  imageUrl?: string;
  images?: any;
  priceCzk?: number;
  priceEur?: number;
}

export default function StockLookup() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [adjustDialogOpen, setAdjustDialogOpen] = useState(false);
  const [descriptionDialogOpen, setDescriptionDialogOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<ProductLocation | null>(null);
  const [barcodeMode, setBarcodeMode] = useState(false);
  const [barcodeInput, setBarcodeInput] = useState("");
  const isMobile = useIsMobile();

  // Fetch all products
  const { data: rawProducts = [], isLoading: productsLoading } = useQuery<any[]>({
    queryKey: ['/api/products'],
  });

  // Fetch warehouses for location display
  const { data: warehouses = [] } = useQuery<any[]>({
    queryKey: ['/api/warehouses'],
  });

  // Fetch over-allocated items
  const { data: overAllocatedItems = [] } = useQuery<any[]>({
    queryKey: ['/api/over-allocated-items'],
    staleTime: 0,
    refetchInterval: 60000, // Refresh every minute
  });

  // Fetch under-allocated items
  const { data: underAllocatedItems = [] } = useQuery<any[]>({
    queryKey: ['/api/under-allocated-items'],
    staleTime: 0,
    refetchInterval: 60000, // Refresh every minute
  });

  // Create warehouse lookup map
  const warehouseMap = useMemo(() => {
    const map: Record<string, string> = {};
    warehouses.forEach((w: any) => {
      map[w.id] = w.name;
    });
    return map;
  }, [warehouses]);

  // Enrich products with variant data and calculate total stock
  const products: EnrichedProduct[] = useMemo(() => {
    return rawProducts.map((p: any) => {
      // Parse images if needed
      let productImages: any[] = [];
      try {
        if (p.images) {
          const parsed = typeof p.images === 'string' ? JSON.parse(p.images) : p.images;
          productImages = Array.isArray(parsed) ? parsed : [];
        }
      } catch {
        productImages = [];
      }

      // Get primary image
      const primaryImage = productImages.find((img: any) => img.isPrimary)?.url || 
                          productImages[0]?.url || 
                          p.imageUrl;

      // Note: We don't have variants data here yet, this will be enhanced with a better API
      const productQuantity = parseInt(p.quantity) || 0;
      
      return {
        id: p.id,
        name: p.name,
        sku: p.sku,
        barcode: p.barcode,
        categoryName: p.categoryName,
        description: p.description,
        quantity: productQuantity,
        variants: [], // Will be fetched on-demand when product is expanded
        totalStock: productQuantity, // Will include variants when fetched
        locations: p.locations,
        imageUrl: primaryImage,
        images: p.images,
        priceCzk: p.priceCzk,
        priceEur: p.priceEur
      };
    });
  }, [rawProducts]);

  // Filter products using fuzzy search
  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return products;
    
    return fuzzySearch(products, searchQuery, {
      fields: ['name', 'sku', 'barcode', 'categoryName'],
      threshold: 0.3
    }).map(result => result.item);
  }, [products, searchQuery]);

  // Fetch variants for selected product
  const { data: selectedVariants = [] } = useQuery<Variant[]>({
    queryKey: [`/api/products/${selectedProduct}/variants`],
    enabled: !!selectedProduct,
  });

  // Fetch locations for selected product
  const { data: selectedLocations = [], isLoading: locationsLoading } = useQuery<ProductLocation[]>({
    queryKey: [`/api/products/${selectedProduct}/locations`],
    enabled: !!selectedProduct,
  });

  // Get enriched selected product with variants and locations
  const selectedProductData = useMemo(() => {
    if (!selectedProduct) return null;
    
    const product = products.find(p => p.id === selectedProduct);
    if (!product) return null;

    const variantsTotalStock = selectedVariants.reduce((sum, v) => sum + (v.quantity || 0), 0);
    const totalStock = product.quantity + variantsTotalStock;

    return {
      ...product,
      variants: selectedVariants,
      locations: selectedLocations,
      totalStock
    };
  }, [selectedProduct, products, selectedVariants, selectedLocations]);

  const getStockStatus = (stock: number, lowStockThreshold: number = 5) => {
    if (stock === 0) return { label: "Out of Stock", color: "bg-red-500", icon: AlertCircle };
    if (stock <= lowStockThreshold) return { label: "Low Stock", color: "bg-yellow-500", icon: TrendingDown };
    if (stock <= lowStockThreshold * 2) return { label: "Medium Stock", color: "bg-blue-500", icon: TrendingUp };
    return { label: "In Stock", color: "bg-green-500", icon: TrendingUp };
  };

  const handleBarcodeScan = (barcode: string) => {
    if (!barcode.trim()) return;

    // Use barcode as search query to find and filter products
    setSearchQuery(barcode);
    setBarcodeInput("");
    
    // Find matching product to auto-expand
    const product = products.find(p => 
      p.barcode?.toLowerCase() === barcode.toLowerCase() ||
      p.sku?.toLowerCase() === barcode.toLowerCase()
    );

    if (product) {
      setSelectedProduct(product.id);
    }
  };

  const handleBarcodeKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleBarcodeScan(barcodeInput);
    }
  };

  const isLoading = productsLoading;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-6">
      {/* Header - Sticky on mobile */}
      <div className="sticky top-0 z-10 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="px-3 py-3">
          <div className="flex items-center justify-between mb-2.5">
            <h1 className="text-lg font-bold text-gray-900 dark:text-white">Stock Lookup</h1>
            <Button
              variant={barcodeMode ? "default" : "outline"}
              size="sm"
              onClick={() => setBarcodeMode(!barcodeMode)}
              className="h-8"
              data-testid="button-toggle-barcode-mode"
            >
              <Barcode className="h-4 w-4 mr-1.5" />
              {barcodeMode ? "Scanning" : "Scan"}
            </Button>
          </div>
          
          {/* Search/Barcode Input */}
          {barcodeMode ? (
            <div>
              <div className="relative">
                <Barcode className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-blue-600" />
                <Input
                  type="text"
                  placeholder="Scan barcode to search product..."
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value)}
                  onKeyPress={handleBarcodeKeyPress}
                  className="pl-10 h-12 text-base border-blue-300 focus:border-blue-500"
                  data-testid="input-barcode-scan"
                  autoFocus
                />
              </div>
              <div className="mt-2 flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400">
                <div className="flex items-center gap-1">
                  <div className="h-2 w-2 rounded-full bg-blue-600 animate-pulse"></div>
                  <span>Ready to scan</span>
                </div>
                <span>•</span>
                <span>Scan to find product</span>
              </div>
            </div>
          ) : (
            <>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search by name, SKU, or barcode..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-12 text-base"
                  data-testid="input-search-stock"
                  autoFocus
                />
              </div>

              {/* Quick Stats */}
              <div className="mt-3 flex gap-2 text-xs text-gray-600 dark:text-gray-400">
                <span>{products.length} products</span>
                <span>•</span>
                <span>{filteredProducts.length} results</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Over-Allocated Items Warning */}
      {overAllocatedItems.length > 0 && (
        <div className="px-3 pt-3">
          <Card className="bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-950/20 dark:to-orange-950/20 border-red-300 dark:border-red-700">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 p-2 bg-red-100 dark:bg-red-900/50 rounded-lg">
                  <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-red-900 dark:text-red-100 mb-1">
                    Over-Allocated Inventory
                  </h3>
                  <p className="text-sm text-red-800 dark:text-red-200 mb-3">
                    <span className="font-bold">{overAllocatedItems.length}</span> {overAllocatedItems.length === 1 ? 'item has' : 'items have'} more quantity ordered than available in stock
                  </p>
                  <Link href="/stock/over-allocated">
                    <Button 
                      size="sm" 
                      className="bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800 text-white"
                      data-testid="button-view-over-allocated"
                    >
                      View & Resolve Issues
                    </Button>
                  </Link>
                </div>
                <Badge variant="destructive" className="text-sm font-bold flex-shrink-0">
                  {overAllocatedItems.length}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Under-Allocated Items Warning */}
      {underAllocatedItems.length > 0 && (
        <div className={`px-3 ${overAllocatedItems.length > 0 ? 'pt-2' : 'pt-3'}`}>
          <Card className="bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-950/20 dark:to-amber-950/20 border-yellow-300 dark:border-yellow-700">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 p-2 bg-yellow-100 dark:bg-yellow-900/50 rounded-lg">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-yellow-900 dark:text-yellow-100 mb-1">
                    Under-Allocated Inventory
                  </h3>
                  <p className="text-sm text-yellow-800 dark:text-yellow-200 mb-3">
                    <span className="font-bold">{underAllocatedItems.length}</span> {underAllocatedItems.length === 1 ? 'item has' : 'items have'} more quantity in record than in stock locations
                  </p>
                  <Link href="/stock/under-allocated">
                    <Button 
                      size="sm" 
                      className="bg-yellow-600 hover:bg-yellow-700 dark:bg-yellow-700 dark:hover:bg-yellow-800 text-white"
                      data-testid="button-view-under-allocated"
                    >
                      View & Resolve Issues
                    </Button>
                  </Link>
                </div>
                <Badge className="bg-yellow-600 text-white text-sm font-bold flex-shrink-0">
                  {underAllocatedItems.length}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Content */}
      <div className="px-3 py-3 space-y-2">
        {isLoading ? (
          // Loading skeletons
          Array.from({ length: 5 }).map((_, i) => (
            <Card key={i} className="border-gray-200 dark:border-gray-700">
              <CardContent className="p-3">
                <div className="flex gap-3">
                  <Skeleton className="h-20 w-20 rounded-md flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                    <Skeleton className="h-3 w-2/3" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : filteredProducts.length === 0 ? (
          <Card className="border-gray-200 dark:border-gray-700">
            <CardContent className="p-8 text-center">
              <Package className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600 dark:text-gray-400">
                {searchQuery ? "No products found" : "No products available"}
              </p>
            </CardContent>
          </Card>
        ) : (
          // Product Cards
          filteredProducts.map((product) => {
            const isExpanded = selectedProduct === product.id;
            const displayProduct = isExpanded && selectedProductData ? selectedProductData : product;
            const status = getStockStatus(displayProduct.totalStock);
            const StatusIcon = status.icon;
            
            return (
              <Card
                key={product.id}
                className="border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => setSelectedProduct(isExpanded ? null : product.id)}
                data-testid={`card-product-${product.id}`}
              >
                <CardContent className="p-3">
                  {/* Product Header */}
                  <div className="flex gap-3">
                    {/* Product Image */}
                    <div className="flex-shrink-0">
                      {product.imageUrl ? (
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          className="h-20 w-20 rounded-md object-cover bg-gray-100 dark:bg-gray-800"
                        />
                      ) : (
                        <div className="h-20 w-20 rounded-md bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center">
                          <Package className="h-8 w-8 text-gray-400" />
                        </div>
                      )}
                    </div>

                    {/* Product Info */}
                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      {/* Top Row: Name + Stock */}
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h3 className="font-semibold text-sm leading-tight text-gray-900 dark:text-white line-clamp-2" data-testid={`text-product-name-${product.id}`}>
                            {product.name}
                          </h3>
                          <Badge className={`${status.color} text-white flex items-center gap-1 flex-shrink-0 h-6 px-2`}>
                            <StatusIcon className="h-3 w-3" />
                            <span className="font-bold">{displayProduct.totalStock}</span>
                          </Badge>
                        </div>
                        
                        {/* SKU and Category - More compact */}
                        <div className="flex items-center gap-1.5 text-[11px] text-gray-500 dark:text-gray-400 mb-1.5">
                          {product.sku && (
                            <span className="flex items-center gap-0.5 font-mono">
                              <Barcode className="h-3 w-3" />
                              {product.sku}
                            </span>
                          )}
                          {product.categoryName && (
                            <>
                              {product.sku && <span>•</span>}
                              <span className="truncate">{product.categoryName}</span>
                            </>
                          )}
                        </div>

                        {/* Prices */}
                        {(product.priceCzk || product.priceEur) && (
                          <div className="flex items-center gap-2 text-xs font-medium">
                            {product.priceCzk && (
                              <span className="text-blue-600 dark:text-blue-400">
                                {Number(product.priceCzk).toLocaleString('cs-CZ')} Kč
                              </span>
                            )}
                            {product.priceCzk && product.priceEur && (
                              <span className="text-gray-400 dark:text-gray-600">•</span>
                            )}
                            {product.priceEur && (
                              <span className="text-green-600 dark:text-green-400">
                                €{Number(product.priceEur).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Bottom Row: Location count */}
                      <div className="flex items-center justify-end">
                        {displayProduct.locations && displayProduct.locations.length > 0 && (
                          <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
                            <MapPin className="h-3.5 w-3.5" />
                            <span className="text-[11px] font-medium">{displayProduct.locations.length} location{displayProduct.locations.length > 1 ? 's' : ''}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Expand Indicator */}
                    <ChevronRight className={`h-4 w-4 text-gray-400 flex-shrink-0 self-center transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && selectedProductData && (
                    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 space-y-3">
                      {/* Stock Breakdown */}
                      <div className={`grid gap-3 ${selectedProductData.variants.length > 0 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
                          <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Base Stock</p>
                          <p className="text-lg font-bold text-blue-600 dark:text-blue-400">{selectedProductData.quantity}</p>
                        </div>
                        {selectedProductData.variants.length > 0 && (
                          <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3">
                            <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Variant Stock</p>
                            <p className="text-lg font-bold text-purple-600 dark:text-purple-400">
                              {selectedProductData.variants.reduce((sum, v) => sum + (v.quantity || 0), 0)}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Variants List */}
                      {selectedProductData.variants.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                            <Layers className="h-4 w-4" />
                            Product Variants ({selectedProductData.variants.length})
                          </h4>
                          <div className="space-y-2">
                            {selectedProductData.variants.map((variant) => (
                              <div
                                key={variant.id}
                                className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 rounded-lg p-3"
                              >
                                <div className="flex items-center gap-3 flex-1">
                                  {variant.imageUrl ? (
                                    <img
                                      src={variant.imageUrl}
                                      alt={variant.name}
                                      className="h-10 w-10 rounded object-cover"
                                    />
                                  ) : (
                                    <div className="h-10 w-10 rounded bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                                      <Package className="h-5 w-5 text-gray-400" />
                                    </div>
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                                      {variant.name}
                                    </p>
                                    {variant.barcode && (
                                      <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                                        {variant.barcode}
                                      </p>
                                    )}
                                    {(variant.priceCzk || variant.priceEur) && (
                                      <div className="flex items-center gap-2 text-[11px] font-medium mt-1">
                                        {variant.priceCzk && (
                                          <span className="text-blue-600 dark:text-blue-400">
                                            {Number(variant.priceCzk).toLocaleString('cs-CZ')} Kč
                                          </span>
                                        )}
                                        {variant.priceCzk && variant.priceEur && (
                                          <span className="text-gray-400 dark:text-gray-600">•</span>
                                        )}
                                        {variant.priceEur && (
                                          <span className="text-green-600 dark:text-green-400">
                                            €{Number(variant.priceEur).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                          </span>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <Badge variant="secondary" className="ml-2 flex-shrink-0">
                                  {variant.quantity} units
                                </Badge>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Warehouse Locations */}
                      {locationsLoading ? (
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-16 w-full" />
                        </div>
                      ) : selectedProductData.locations && selectedProductData.locations.length > 0 ? (
                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                              <MapPin className="h-4 w-4" />
                              Warehouse Locations ({selectedProductData.locations.length})
                            </h4>
                            <Link href={`/inventory/products/${product.id}`}>
                              <Button variant="ghost" size="sm" className="h-7 text-xs" data-testid={`button-view-all-locations-${product.id}`}>
                                View All
                              </Button>
                            </Link>
                          </div>
                          <div className="space-y-2">
                            {selectedProductData.locations.map((loc) => (
                              <div
                                key={loc.id}
                                className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3"
                                data-testid={`location-card-${loc.id}`}
                              >
                                <div className="flex items-start justify-between mb-2">
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-900 dark:text-white font-mono">
                                      {loc.locationCode}
                                    </p>
                                    {loc.isPrimary && (
                                      <Badge variant="default" className="mt-1 h-5 text-xs">
                                        Primary
                                      </Badge>
                                    )}
                                  </div>
                                  <Badge variant="secondary" className="ml-2">
                                    {loc.quantity} units
                                  </Badge>
                                </div>
                                <div className="flex gap-2 mt-3">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="flex-1 h-8 text-xs"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedLocation(loc);
                                      setMoveDialogOpen(true);
                                    }}
                                    data-testid={`button-move-${loc.id}`}
                                  >
                                    <MoveRight className="h-3 w-3 mr-1" />
                                    Move
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="flex-1 h-8 text-xs"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedLocation(loc);
                                      setAdjustDialogOpen(true);
                                    }}
                                    data-testid={`button-adjust-${loc.id}`}
                                  >
                                    <ArrowUpDown className="h-3 w-3 mr-1" />
                                    Adjust
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 text-center">
                          <MapPin className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            No warehouse locations assigned
                          </p>
                        </div>
                      )}

                      {/* Item Description Button */}
                      {selectedProductData.description && (
                        <Button
                          variant="outline"
                          className="w-full"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDescriptionDialogOpen(true);
                          }}
                          data-testid={`button-view-description-${product.id}`}
                        >
                          <FileText className="h-4 w-4 mr-2" />
                          View Item Description
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Item Description Dialog */}
      {selectedProduct && selectedProductData && selectedProductData.description && (
        <>
          {isMobile ? (
            <Drawer open={descriptionDialogOpen} onOpenChange={setDescriptionDialogOpen}>
              <DrawerContent className="max-h-[85vh]">
                <DrawerHeader>
                  <DrawerTitle className="text-left">Item Description</DrawerTitle>
                </DrawerHeader>
                <div className="px-4 pb-6 overflow-y-auto">
                  <div className="mb-4">
                    <div className="flex items-center gap-3 mb-4">
                      {selectedProductData.imageUrl && (
                        <img
                          src={selectedProductData.imageUrl}
                          alt={selectedProductData.name}
                          className="h-16 w-16 rounded-md object-cover bg-gray-100 dark:bg-gray-800"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm text-gray-900 dark:text-white mb-1">
                          {selectedProductData.name}
                        </h3>
                        {selectedProductData.sku && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                            {selectedProductData.sku}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                    <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                      {selectedProductData.description}
                    </p>
                  </div>
                </div>
              </DrawerContent>
            </Drawer>
          ) : (
            <Dialog open={descriptionDialogOpen} onOpenChange={setDescriptionDialogOpen}>
              <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
                <DialogHeader>
                  <DialogTitle>Item Description</DialogTitle>
                </DialogHeader>
                <div className="overflow-y-auto flex-1 pr-2">
                  <div className="mb-4">
                    <div className="flex items-center gap-3 mb-4">
                      {selectedProductData.imageUrl && (
                        <img
                          src={selectedProductData.imageUrl}
                          alt={selectedProductData.name}
                          className="h-16 w-16 rounded-md object-cover bg-gray-100 dark:bg-gray-800"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-base text-gray-900 dark:text-white mb-1">
                          {selectedProductData.name}
                        </h3>
                        {selectedProductData.sku && (
                          <p className="text-sm text-gray-500 dark:text-gray-400 font-mono">
                            {selectedProductData.sku}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                    <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                      {selectedProductData.description}
                    </p>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </>
      )}

      {/* Warehouse Management Dialogs */}
      {selectedProduct && selectedProductData && (
        <>
          <MoveInventoryDialog
            open={moveDialogOpen}
            onOpenChange={setMoveDialogOpen}
            productId={selectedProduct}
            productName={selectedProductData.name}
            fromLocation={selectedLocation}
            locations={selectedProductData.locations || []}
            onSuccess={() => {
              setSelectedLocation(null);
            }}
          />
          <StockAdjustmentDialog
            open={adjustDialogOpen}
            onOpenChange={setAdjustDialogOpen}
            productId={selectedProduct}
            productName={selectedProductData.name}
            location={selectedLocation}
            onSuccess={() => {
              setSelectedLocation(null);
            }}
          />
        </>
      )}
    </div>
  );
}
