import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Package, MapPin, DollarSign, Barcode, TrendingUp, TrendingDown, AlertCircle, ChevronRight } from "lucide-react";
import { Link } from "wouter";
import { fuzzySearch } from "@/lib/fuzzySearch";

interface Product {
  id: string;
  name: string;
  sku?: string;
  barcode?: string;
  category?: string;
  totalStock: number;
  reservedStock?: number;
  availableStock: number;
  price: number;
  costPrice?: number;
  locations?: Array<{
    warehouseId: string;
    warehouseName: string;
    location: string;
    quantity: number;
  }>;
  image?: string;
}

export default function StockLookup() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Fetch all products with stock and location info
  const { data: products = [], isLoading } = useQuery<Product[]>({
    queryKey: ['/api/products'],
    select: (data: any[]) => {
      return data.map((p) => {
        const totalStock = p.totalStock || 0;
        const reservedStock = p.reservedStock || 0;
        const availableStock = totalStock - reservedStock;
        
        return {
          id: p.id,
          name: p.name,
          sku: p.sku,
          barcode: p.barcode,
          category: p.category,
          totalStock,
          reservedStock,
          availableStock,
          price: p.price || 0,
          costPrice: p.costPrice,
          locations: p.locations || [],
          image: p.image
        };
      });
    }
  });

  // Filter products using fuzzy search
  const filteredProducts = searchQuery.trim()
    ? fuzzySearch(products, searchQuery, {
        fields: ['name', 'sku', 'barcode', 'category'],
        threshold: 0.3
      }).map(result => result.item)
    : products;

  const getStockStatus = (available: number, total: number) => {
    if (total === 0) return { label: "Out of Stock", color: "bg-red-500", icon: AlertCircle };
    if (available === 0) return { label: "Reserved", color: "bg-orange-500", icon: AlertCircle };
    if (available < total * 0.2) return { label: "Low Stock", color: "bg-yellow-500", icon: TrendingDown };
    return { label: "In Stock", color: "bg-green-500", icon: TrendingUp };
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-6">
      {/* Header - Sticky on mobile */}
      <div className="sticky top-0 z-10 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="px-4 py-4">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Stock Lookup</h1>
          
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
      <div className="px-4 py-4 space-y-3">
        {isLoading ? (
          // Loading skeletons
          Array.from({ length: 5 }).map((_, i) => (
            <Card key={i} className="border-gray-200 dark:border-gray-700">
              <CardContent className="p-4">
                <div className="flex gap-3">
                  <Skeleton className="h-16 w-16 rounded-lg flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                    <Skeleton className="h-3 w-1/3" />
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
            const status = getStockStatus(product.availableStock, product.totalStock);
            const StatusIcon = status.icon;
            
            return (
              <Card
                key={product.id}
                className="border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => setSelectedProduct(selectedProduct?.id === product.id ? null : product)}
                data-testid={`card-product-${product.id}`}
              >
                <CardContent className="p-4">
                  {/* Product Header */}
                  <div className="flex gap-3">
                    {/* Product Image */}
                    <div className="flex-shrink-0">
                      {product.image ? (
                        <img
                          src={product.image}
                          alt={product.name}
                          className="h-16 w-16 rounded-lg object-cover bg-gray-100 dark:bg-gray-800"
                        />
                      ) : (
                        <div className="h-16 w-16 rounded-lg bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center">
                          <Package className="h-8 w-8 text-gray-400" />
                        </div>
                      )}
                    </div>

                    {/* Product Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 dark:text-white truncate" data-testid={`text-product-name-${product.id}`}>
                            {product.name}
                          </h3>
                          <div className="flex items-center gap-2 mt-1 text-xs text-gray-500 dark:text-gray-400">
                            {product.sku && (
                              <span className="flex items-center gap-1">
                                <Barcode className="h-3 w-3" />
                                {product.sku}
                              </span>
                            )}
                            {product.category && (
                              <>
                                <span>•</span>
                                <span>{product.category}</span>
                              </>
                            )}
                          </div>
                        </div>
                        
                        {/* Stock Badge */}
                        <Badge className={`${status.color} text-white flex items-center gap-1 flex-shrink-0`}>
                          <StatusIcon className="h-3 w-3" />
                          <span className="text-xs">{product.availableStock}</span>
                        </Badge>
                      </div>

                      {/* Quick Info Row */}
                      <div className="mt-3 flex items-center justify-between text-sm">
                        <div className="flex items-center gap-1 text-green-600 dark:text-green-400 font-semibold">
                          <DollarSign className="h-4 w-4" />
                          <span data-testid={`text-price-${product.id}`}>{product.price.toFixed(2)} CZK</span>
                        </div>
                        
                        {product.locations && product.locations.length > 0 && (
                          <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                            <MapPin className="h-4 w-4" />
                            <span className="text-xs">{product.locations.length} location{product.locations.length > 1 ? 's' : ''}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Expand Indicator */}
                    <ChevronRight className={`h-5 w-5 text-gray-400 flex-shrink-0 transition-transform ${selectedProduct?.id === product.id ? 'rotate-90' : ''}`} />
                  </div>

                  {/* Expanded Details */}
                  {selectedProduct?.id === product.id && (
                    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 space-y-3">
                      {/* Stock Breakdown */}
                      <div className="grid grid-cols-3 gap-3">
                        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total Stock</p>
                          <p className="text-lg font-bold text-gray-900 dark:text-white">{product.totalStock}</p>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Reserved</p>
                          <p className="text-lg font-bold text-orange-600 dark:text-orange-400">{product.reservedStock || 0}</p>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Available</p>
                          <p className="text-lg font-bold text-green-600 dark:text-green-400">{product.availableStock}</p>
                        </div>
                      </div>

                      {/* Pricing Info */}
                      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Sale Price</p>
                            <p className="text-xl font-bold text-green-600 dark:text-green-400">
                              {product.price.toFixed(2)} CZK
                            </p>
                          </div>
                          {product.costPrice && (
                            <div className="text-right">
                              <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Cost Price</p>
                              <p className="text-lg font-semibold text-gray-700 dark:text-gray-300">
                                {product.costPrice.toFixed(2)} CZK
                              </p>
                              <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                                Margin: {((product.price - product.costPrice) / product.price * 100).toFixed(1)}%
                              </p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Warehouse Locations */}
                      {product.locations && product.locations.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                            <MapPin className="h-4 w-4" />
                            Warehouse Locations
                          </h4>
                          <div className="space-y-2">
                            {product.locations.map((loc, idx) => (
                              <div
                                key={idx}
                                className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 rounded-lg p-3"
                              >
                                <div className="flex-1">
                                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                                    {loc.warehouseName || loc.warehouseId}
                                  </p>
                                  <p className="text-xs text-gray-600 dark:text-gray-400 font-mono mt-1">
                                    {loc.location}
                                  </p>
                                </div>
                                <Badge variant="secondary" className="ml-2">
                                  {loc.quantity} units
                                </Badge>
                              </div>
                            ))}
                          </div>
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
    </div>
  );
}
