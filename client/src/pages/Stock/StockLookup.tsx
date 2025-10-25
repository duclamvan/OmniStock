import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Package, MapPin, Barcode, TrendingUp, TrendingDown, AlertCircle, ChevronRight, Layers, MoveRight, ArrowUpDown } from "lucide-react";
import { Link } from "wouter";
import { fuzzySearch } from "@/lib/fuzzySearch";
import { formatCurrency } from "@/lib/currencyUtils";
import MoveInventoryDialog from "@/components/warehouse/MoveInventoryDialog";
import StockAdjustmentDialog from "@/components/warehouse/StockAdjustmentDialog";

interface Variant {
  id: string;
  name: string;
  barcode?: string;
  quantity: number;
  imageUrl?: string;
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
  quantity: number;
  variants: Variant[];
  totalStock: number;
  priceCzk?: string;
  priceEur?: string;
  importCostCzk?: string;
  importCostEur?: string;
  latestLandingCost?: string;
  locations?: ProductLocation[];
  imageUrl?: string;
  images?: any;
}

export default function StockLookup() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [adjustDialogOpen, setAdjustDialogOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<ProductLocation | null>(null);

  // Fetch all products
  const { data: rawProducts = [], isLoading: productsLoading } = useQuery<any[]>({
    queryKey: ['/api/products'],
  });

  // Fetch warehouses for location display
  const { data: warehouses = [] } = useQuery<any[]>({
    queryKey: ['/api/warehouses'],
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
        quantity: productQuantity,
        variants: [], // Will be fetched on-demand when product is expanded
        totalStock: productQuantity, // Will include variants when fetched
        priceCzk: p.priceCzk,
        priceEur: p.priceEur,
        importCostCzk: p.importCostCzk,
        importCostEur: p.importCostEur,
        latestLandingCost: p.latestLandingCost,
        locations: p.locations,
        imageUrl: primaryImage,
        images: p.images
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

  const isLoading = productsLoading;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-6">
      {/* Header - Sticky on mobile */}
      <div className="sticky top-0 z-10 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="px-3 py-3">
          <h1 className="text-lg font-bold text-gray-900 dark:text-white mb-2.5">Stock Lookup</h1>
          
          {/* Search Bar */}
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
        </div>
      </div>

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
            
            // Calculate pricing
            const priceCzk = parseFloat(displayProduct.priceCzk || '0');
            const priceEur = parseFloat(displayProduct.priceEur || '0');
            const costCzk = parseFloat(displayProduct.latestLandingCost || displayProduct.importCostCzk || '0');
            const costEur = parseFloat(displayProduct.importCostEur || '0');
            
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
                      </div>

                      {/* Bottom Row: Pricing - Horizontal layout */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm">
                          {priceCzk > 0 && (
                            <span className="font-bold text-gray-900 dark:text-white" data-testid={`text-price-czk-${product.id}`}>
                              {formatCurrency(priceCzk, 'CZK').replace(/\s/g, '')}
                            </span>
                          )}
                          {priceEur > 0 && (
                            <span className="font-semibold text-blue-600 dark:text-blue-400" data-testid={`text-price-eur-${product.id}`}>
                              {formatCurrency(priceEur, 'EUR').replace(/\s/g, '')}
                            </span>
                          )}
                          {!priceCzk && !priceEur && (
                            <span className="text-gray-500 dark:text-gray-400 text-xs">No price</span>
                          )}
                        </div>
                        
                        {displayProduct.locations && displayProduct.locations.length > 0 && (
                          <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
                            <MapPin className="h-3.5 w-3.5" />
                            <span className="text-[11px] font-medium">{displayProduct.locations.length}</span>
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
                      <div className="grid grid-cols-2 gap-3">
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
                                <div className="flex items-center gap-3">
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
                                  <div>
                                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                                      {variant.name}
                                    </p>
                                    {variant.barcode && (
                                      <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                                        {variant.barcode}
                                      </p>
                                    )}
                                  </div>
                                </div>
                                <Badge variant="secondary" className="ml-2">
                                  {variant.quantity} units
                                </Badge>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Pricing Info */}
                      {(priceCzk > 0 || priceEur > 0) && (
                        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Sale Price</p>
                              <p className="text-xl font-bold text-green-600 dark:text-green-400">
                                {priceCzk > 0 ? formatCurrency(priceCzk, 'CZK') : formatCurrency(priceEur, 'EUR')}
                              </p>
                            </div>
                            {(costCzk > 0 || costEur > 0) && (
                              <div className="text-right">
                                <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Cost Price</p>
                                <p className="text-lg font-semibold text-gray-700 dark:text-gray-300">
                                  {costCzk > 0 ? formatCurrency(costCzk, 'CZK') : formatCurrency(costEur, 'EUR')}
                                </p>
                                {((priceCzk > 0 && costCzk > 0) || (priceEur > 0 && costEur > 0)) && (
                                  <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                                    Margin: {priceCzk > 0 && costCzk > 0 
                                      ? ((priceCzk - costCzk) / priceCzk * 100).toFixed(1)
                                      : ((priceEur - costEur) / priceEur * 100).toFixed(1)}%
                                  </p>
                                )}
                              </div>
                            )}
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

                      {/* Action Buttons */}
                      <div className="flex gap-2 pt-2">
                        <Link href={`/inventory/products/${product.id}`} className="flex-1">
                          <Button variant="outline" className="w-full" size="sm" data-testid={`button-view-details-${product.id}`}>
                            View Full Details
                          </Button>
                        </Link>
                        <Link href={`/inventory/${product.id}/edit`} className="flex-1">
                          <Button variant="default" className="w-full" size="sm" data-testid={`button-edit-${product.id}`}>
                            Edit Product
                          </Button>
                        </Link>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

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
