import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { 
  Search, 
  Package, 
  MapPin, 
  Barcode, 
  TrendingUp, 
  TrendingDown, 
  AlertCircle, 
  ChevronDown, 
  Layers, 
  MoveRight, 
  ArrowUpDown,
  DollarSign,
  Warehouse
} from "lucide-react";
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

  const { data: rawProducts = [], isLoading: productsLoading } = useQuery<any[]>({
    queryKey: ['/api/products'],
  });

  const { data: warehouses = [] } = useQuery<any[]>({
    queryKey: ['/api/warehouses'],
  });

  const warehouseMap = useMemo(() => {
    const map: Record<string, string> = {};
    warehouses.forEach((w: any) => {
      map[w.id] = w.name;
    });
    return map;
  }, [warehouses]);

  const products: EnrichedProduct[] = useMemo(() => {
    return rawProducts.map((p: any) => {
      let productImages: any[] = [];
      try {
        if (p.images) {
          const parsed = typeof p.images === 'string' ? JSON.parse(p.images) : p.images;
          productImages = Array.isArray(parsed) ? parsed : [];
        }
      } catch {
        productImages = [];
      }

      const primaryImage = productImages.find((img: any) => img.isPrimary)?.url || 
                          productImages[0]?.url || 
                          p.imageUrl;

      const productQuantity = parseInt(p.quantity) || 0;
      
      return {
        id: p.id,
        name: p.name,
        sku: p.sku,
        barcode: p.barcode,
        categoryName: p.categoryName,
        quantity: productQuantity,
        variants: [],
        totalStock: productQuantity,
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

  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return products;
    
    return fuzzySearch(products, searchQuery, {
      fields: ['name', 'sku', 'barcode', 'categoryName'],
      threshold: 0.3
    }).map(result => result.item);
  }, [products, searchQuery]);

  const { data: selectedVariants = [] } = useQuery<Variant[]>({
    queryKey: [`/api/products/${selectedProduct}/variants`],
    enabled: !!selectedProduct,
  });

  const { data: selectedLocations = [], isLoading: locationsLoading } = useQuery<ProductLocation[]>({
    queryKey: [`/api/products/${selectedProduct}/locations`],
    enabled: !!selectedProduct,
  });

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
    if (stock === 0) return { label: "Out of Stock", color: "bg-red-500 hover:bg-red-600", icon: AlertCircle };
    if (stock <= lowStockThreshold) return { label: "Low Stock", color: "bg-yellow-500 hover:bg-yellow-600", icon: TrendingDown };
    if (stock <= lowStockThreshold * 2) return { label: "Medium Stock", color: "bg-blue-500 hover:bg-blue-600", icon: TrendingUp };
    return { label: "In Stock", color: "bg-green-500 hover:bg-green-600", icon: TrendingUp };
  };

  const isLoading = productsLoading;

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950 pb-8">
      <div className="sticky top-0 z-10 bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="px-4 py-5">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Stock Lookup</h1>
          
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <Input
              type="text"
              placeholder="Search by name, SKU, or barcode..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 h-12 text-base shadow-sm"
              data-testid="input-search-stock"
              autoFocus
            />
          </div>

          <div className="mt-4 flex gap-3 text-sm text-gray-600 dark:text-gray-400">
            <span className="font-medium">{products.length} products</span>
            <span>•</span>
            <span>{filteredProducts.length} results</span>
          </div>
        </div>
      </div>

      <div className="px-4 py-5 space-y-4">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <Card key={i} className="border-gray-200 dark:border-gray-700 shadow-sm">
              <CardContent className="p-5">
                <div className="flex gap-4">
                  <Skeleton className="h-24 w-24 rounded-xl flex-shrink-0" />
                  <div className="flex-1 space-y-3">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-4 w-1/3" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : filteredProducts.length === 0 ? (
          <Card className="border-gray-200 dark:border-gray-700 shadow-sm">
            <CardContent className="p-12 text-center">
              <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <p className="text-lg text-gray-600 dark:text-gray-400">
                {searchQuery ? "No products found" : "No products available"}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredProducts.map((product) => {
            const isExpanded = selectedProduct === product.id;
            const displayProduct = isExpanded && selectedProductData ? selectedProductData : product;
            const status = getStockStatus(displayProduct.totalStock);
            const StatusIcon = status.icon;
            
            const priceCzk = parseFloat(displayProduct.priceCzk || '0');
            const priceEur = parseFloat(displayProduct.priceEur || '0');
            const costCzk = parseFloat(displayProduct.latestLandingCost || displayProduct.importCostCzk || '0');
            const costEur = parseFloat(displayProduct.importCostEur || '0');
            
            return (
              <Card
                key={product.id}
                className="border-gray-200 dark:border-gray-700 shadow-md hover:shadow-lg transition-all duration-200 overflow-hidden"
                data-testid={`card-product-${product.id}`}
              >
                <CardContent className="p-5">
                  <div 
                    className="flex gap-4 cursor-pointer"
                    onClick={() => setSelectedProduct(isExpanded ? null : product.id)}
                  >
                    <div className="flex-shrink-0">
                      {product.imageUrl ? (
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          className="h-24 w-24 rounded-xl object-cover bg-gray-100 dark:bg-gray-800 shadow-sm ring-1 ring-gray-200 dark:ring-gray-700"
                        />
                      ) : (
                        <div className="h-24 w-24 rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center shadow-sm ring-1 ring-gray-200 dark:ring-gray-700">
                          <Package className="h-10 w-10 text-gray-400" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-bold text-gray-900 dark:text-white line-clamp-2 mb-1" data-testid={`text-product-name-${product.id}`}>
                            {product.name}
                          </h3>
                          <div className="flex flex-wrap items-center gap-2">
                            {product.sku && (
                              <Badge variant="outline" className="text-xs font-mono">
                                <Barcode className="h-3 w-3 mr-1" />
                                {product.sku}
                              </Badge>
                            )}
                            {product.categoryName && (
                              <Badge variant="secondary" className="text-xs">
                                {product.categoryName}
                              </Badge>
                            )}
                          </div>
                        </div>
                        
                        <Badge className={`${status.color} text-white flex items-center gap-1.5 flex-shrink-0 px-3 py-1.5 text-sm font-semibold shadow-sm`}>
                          <StatusIcon className="h-4 w-4" />
                          <span>{displayProduct.totalStock}</span>
                        </Badge>
                      </div>

                      <div className="flex items-center justify-between mt-3">
                        <div className="flex items-center gap-3">
                          {priceCzk > 0 && (
                            <div className="flex items-center gap-1.5" data-testid={`text-price-czk-${product.id}`}>
                              <span className="text-xs text-gray-500 dark:text-gray-400">CZK</span>
                              <span className="text-base font-bold text-green-600 dark:text-green-400">
                                {formatCurrency(priceCzk, 'CZK')}
                              </span>
                            </div>
                          )}
                          {priceEur > 0 && (
                            <div className="flex items-center gap-1.5" data-testid={`text-price-eur-${product.id}`}>
                              <span className="text-xs text-gray-500 dark:text-gray-400">EUR</span>
                              <span className="text-base font-bold text-blue-600 dark:text-blue-400">
                                {formatCurrency(priceEur, 'EUR')}
                              </span>
                            </div>
                          )}
                          {!priceCzk && !priceEur && (
                            <span className="text-sm text-gray-500 dark:text-gray-400">No price set</span>
                          )}
                        </div>
                        
                        {displayProduct.locations && displayProduct.locations.length > 0 && (
                          <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
                            <MapPin className="h-4 w-4" />
                            <span className="text-sm font-medium">{displayProduct.locations.length}</span>
                          </div>
                        )}
                      </div>

                      <div className="mt-3 flex items-center justify-end">
                        <ChevronDown className={`h-5 w-5 text-gray-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                      </div>
                    </div>
                  </div>

                  {isExpanded && selectedProductData && (
                    <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                      <Accordion type="multiple" className="w-full space-y-2">
                        <AccordionItem value="stock" className="border rounded-lg px-4 bg-white dark:bg-gray-800/50">
                          <AccordionTrigger className="hover:no-underline py-4">
                            <div className="flex items-center gap-2 font-semibold text-gray-900 dark:text-white">
                              <Package className="h-4 w-4" />
                              Stock Information
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="pb-4">
                            <div className="grid grid-cols-2 gap-4 mt-2">
                              <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/20 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
                                <p className="text-xs font-medium text-blue-600 dark:text-blue-400 mb-1">Base Stock</p>
                                <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{selectedProductData.quantity}</p>
                              </div>
                              <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/20 rounded-xl p-4 border border-purple-200 dark:border-purple-800">
                                <p className="text-xs font-medium text-purple-600 dark:text-purple-400 mb-1">Total Stock</p>
                                <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">{selectedProductData.totalStock}</p>
                              </div>
                            </div>
                          </AccordionContent>
                        </AccordionItem>

                        {(priceCzk > 0 || priceEur > 0) && (
                          <AccordionItem value="pricing" className="border rounded-lg px-4 bg-white dark:bg-gray-800/50">
                            <AccordionTrigger className="hover:no-underline py-4">
                              <div className="flex items-center gap-2 font-semibold text-gray-900 dark:text-white">
                                <DollarSign className="h-4 w-4" />
                                Pricing Details
                              </div>
                            </AccordionTrigger>
                            <AccordionContent className="pb-4">
                              <div className="space-y-4 mt-2">
                                <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/30 dark:to-emerald-900/20 rounded-xl p-4 border border-green-200 dark:border-green-800">
                                  <div className="flex items-start justify-between">
                                    <div>
                                      <p className="text-xs font-medium text-green-700 dark:text-green-400 mb-2">Sale Price</p>
                                      {priceCzk > 0 && (
                                        <p className="text-2xl font-bold text-green-600 dark:text-green-400 mb-1">
                                          {formatCurrency(priceCzk, 'CZK')}
                                        </p>
                                      )}
                                      {priceEur > 0 && (
                                        <p className="text-xl font-semibold text-green-600 dark:text-green-400">
                                          {formatCurrency(priceEur, 'EUR')}
                                        </p>
                                      )}
                                    </div>
                                    {(costCzk > 0 || costEur > 0) && (
                                      <div className="text-right">
                                        <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">Cost Price</p>
                                        {costCzk > 0 && (
                                          <p className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                            {formatCurrency(costCzk, 'CZK')}
                                          </p>
                                        )}
                                        {costEur > 0 && (
                                          <p className="text-base font-medium text-gray-700 dark:text-gray-300">
                                            {formatCurrency(costEur, 'EUR')}
                                          </p>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                  {((priceCzk > 0 && costCzk > 0) || (priceEur > 0 && costEur > 0)) && (
                                    <div className="mt-3 pt-3 border-t border-green-200 dark:border-green-800">
                                      <p className="text-xs text-green-700 dark:text-green-400">
                                        Margin: <span className="font-bold text-sm">
                                          {priceCzk > 0 && costCzk > 0 
                                            ? ((priceCzk - costCzk) / priceCzk * 100).toFixed(1)
                                            : ((priceEur - costEur) / priceEur * 100).toFixed(1)}%
                                        </span>
                                      </p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        )}

                        {selectedProductData.variants.length > 0 && (
                          <AccordionItem value="variants" className="border rounded-lg px-4 bg-white dark:bg-gray-800/50">
                            <AccordionTrigger className="hover:no-underline py-4">
                              <div className="flex items-center gap-2 font-semibold text-gray-900 dark:text-white">
                                <Layers className="h-4 w-4" />
                                Product Variants ({selectedProductData.variants.length})
                              </div>
                            </AccordionTrigger>
                            <AccordionContent className="pb-4">
                              <div className="space-y-3 mt-2">
                                {selectedProductData.variants.map((variant) => (
                                  <div
                                    key={variant.id}
                                    className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700"
                                  >
                                    <div className="flex items-center gap-3">
                                      {variant.imageUrl ? (
                                        <img
                                          src={variant.imageUrl}
                                          alt={variant.name}
                                          className="h-12 w-12 rounded-lg object-cover ring-1 ring-gray-200 dark:ring-gray-700"
                                        />
                                      ) : (
                                        <div className="h-12 w-12 rounded-lg bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                                          <Package className="h-6 w-6 text-gray-400" />
                                        </div>
                                      )}
                                      <div>
                                        <p className="text-sm font-semibold text-gray-900 dark:text-white">
                                          {variant.name}
                                        </p>
                                        {variant.barcode && (
                                          <p className="text-xs text-gray-500 dark:text-gray-400 font-mono mt-0.5">
                                            {variant.barcode}
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                    <Badge variant="secondary" className="ml-2 px-3 py-1">
                                      {variant.quantity} units
                                    </Badge>
                                  </div>
                                ))}
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        )}

                        {(selectedProductData.locations && selectedProductData.locations.length > 0) && (
                          <AccordionItem value="locations" className="border rounded-lg px-4 bg-white dark:bg-gray-800/50">
                            <AccordionTrigger className="hover:no-underline py-4">
                              <div className="flex items-center gap-2 font-semibold text-gray-900 dark:text-white">
                                <Warehouse className="h-4 w-4" />
                                Warehouse Locations ({selectedProductData.locations.length})
                              </div>
                            </AccordionTrigger>
                            <AccordionContent className="pb-4">
                              {locationsLoading ? (
                                <div className="space-y-3">
                                  <Skeleton className="h-20 w-full" />
                                  <Skeleton className="h-20 w-full" />
                                </div>
                              ) : (
                                <div className="space-y-3 mt-2">
                                  {selectedProductData.locations.map((loc) => (
                                    <div
                                      key={loc.id}
                                      className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700"
                                      data-testid={`location-card-${loc.id}`}
                                    >
                                      <div className="flex items-start justify-between mb-3">
                                        <div className="flex-1 min-w-0">
                                          <p className="text-base font-bold text-gray-900 dark:text-white font-mono mb-1">
                                            {loc.locationCode}
                                          </p>
                                          {loc.isPrimary && (
                                            <Badge variant="default" className="h-6 text-xs px-2">
                                              Primary Location
                                            </Badge>
                                          )}
                                        </div>
                                        <Badge variant="secondary" className="ml-2 px-3 py-1.5 text-sm font-semibold">
                                          {loc.quantity} units
                                        </Badge>
                                      </div>
                                      <div className="flex gap-2">
                                        <Button
                                          variant="outline"
                                          size="default"
                                          className="flex-1 h-11"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedLocation(loc);
                                            setMoveDialogOpen(true);
                                          }}
                                          data-testid={`button-move-${loc.id}`}
                                        >
                                          <MoveRight className="h-4 w-4 mr-2" />
                                          Move
                                        </Button>
                                        <Button
                                          variant="outline"
                                          size="default"
                                          className="flex-1 h-11"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedLocation(loc);
                                            setAdjustDialogOpen(true);
                                          }}
                                          data-testid={`button-adjust-${loc.id}`}
                                        >
                                          <ArrowUpDown className="h-4 w-4 mr-2" />
                                          Adjust
                                        </Button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </AccordionContent>
                          </AccordionItem>
                        )}
                      </Accordion>

                      {(!selectedProductData.locations || selectedProductData.locations.length === 0) && !locationsLoading && (
                        <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-6 text-center border border-gray-200 dark:border-gray-700 mt-4">
                          <MapPin className="h-10 w-10 text-gray-400 mx-auto mb-3" />
                          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                            No warehouse locations assigned
                          </p>
                        </div>
                      )}

                      <div className="flex gap-3 mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                        <Link href={`/inventory/products/${product.id}`} className="flex-1">
                          <Button variant="outline" className="w-full h-12 font-medium" size="default" data-testid={`button-view-details-${product.id}`}>
                            View Full Details
                          </Button>
                        </Link>
                        <Link href={`/inventory/${product.id}/edit`} className="flex-1">
                          <Button variant="default" className="w-full h-12 font-medium" size="default" data-testid={`button-edit-${product.id}`}>
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
