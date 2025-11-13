import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, Package, ChevronLeft, ExternalLink, TrendingUp } from "lucide-react";
import { Link } from "wouter";

interface OverAllocatedItem {
  type: 'product' | 'variant';
  productId: string;
  productName: string;
  productSku?: string;
  variantId?: string | null;
  variantName?: string | null;
  variantBarcode?: string | null;
  availableStock: number;
  orderedQuantity: number;
  shortfall: number;
  imageUrl?: string;
}

export default function OverAllocated() {
  const { data: items = [], isLoading } = useQuery<OverAllocatedItem[]>({
    queryKey: ['/api/over-allocated-items'],
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
        <div className="px-3 sm:px-4 py-3 sm:py-4 max-w-7xl mx-auto">
          <div className="flex items-center gap-2 sm:gap-3 mb-2">
            <Link href="/stock">
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0" data-testid="button-back-to-stock">
                <ChevronLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <AlertTriangle className="h-5 w-5 sm:h-6 sm:w-6 text-red-600 dark:text-red-400 flex-shrink-0" />
              <h1 className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white truncate">
                Over-Allocated
              </h1>
            </div>
          </div>
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 ml-10 sm:ml-11">
            Items with more quantity ordered than available in stock
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="px-3 sm:px-4 py-4 sm:py-6 max-w-7xl mx-auto">
        {isLoading ? (
          <div className="space-y-3 sm:space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4 sm:p-6">
                  <div className="flex gap-3 sm:gap-4">
                    <Skeleton className="h-16 w-16 sm:h-20 sm:w-20 rounded-md flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-5 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                      <Skeleton className="h-4 w-2/3" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : items.length === 0 ? (
          <Card>
            <CardContent className="p-8 sm:p-12 text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-green-100 dark:bg-green-900/20 mb-3 sm:mb-4">
                <Package className="h-6 w-6 sm:h-8 sm:w-8 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-2">
                All Stock Levels Healthy
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                No items have more quantity ordered than available in stock
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Summary Card */}
            <Card className="mb-4 sm:mb-6 border-red-200 dark:border-red-800">
              <CardContent className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-1">Total Over-Allocated Items</p>
                    <p className="text-2xl sm:text-3xl font-bold text-red-600 dark:text-red-400">{items.length}</p>
                  </div>
                  <div className="sm:text-right">
                    <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-1">Total Shortfall</p>
                    <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                      {items.reduce((sum, item) => sum + item.shortfall, 0)} units
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Items List */}
            <div className="space-y-3 sm:space-y-4">
              {items.map((item, index) => (
                <Card key={`${item.productId}-${item.variantId || 'base'}-${index}`} className="border-red-200 dark:border-red-800/50">
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex gap-3 sm:gap-4">
                      {/* Product Image */}
                      <div className="flex-shrink-0">
                        {item.imageUrl ? (
                          <img
                            src={item.imageUrl}
                            alt={item.productName}
                            className="h-16 w-16 sm:h-20 sm:w-20 rounded-md object-cover bg-gray-100 dark:bg-gray-800"
                          />
                        ) : (
                          <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-md bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center">
                            <Package className="h-6 w-6 sm:h-8 sm:w-8 text-gray-400" />
                          </div>
                        )}
                      </div>

                      {/* Product Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-2 sm:mb-3">
                          <div className="flex-1 min-w-0 pr-2">
                            <h3 className="font-semibold text-base sm:text-lg text-gray-900 dark:text-white mb-1 leading-tight">
                              {item.productName}
                              {item.type === 'variant' && item.variantName && (
                                <span className="block sm:inline text-sm sm:text-base text-gray-600 dark:text-gray-400 font-normal sm:before:content-['-'] sm:before:mx-1">
                                  {item.variantName}
                                </span>
                              )}
                            </h3>
                            {item.productSku && (
                              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 font-mono truncate">
                                SKU: {item.productSku}
                              </p>
                            )}
                            {item.variantBarcode && (
                              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 font-mono truncate">
                                Barcode: {item.variantBarcode}
                              </p>
                            )}
                          </div>
                          <Badge variant="destructive" className="flex-shrink-0 text-xs">
                            {item.type === 'variant' ? 'Variant' : 'Product'}
                          </Badge>
                        </div>

                        {/* Stock Stats */}
                        <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-3 sm:mb-4">
                          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-2 sm:p-3">
                            <p className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400 mb-0.5 sm:mb-1 leading-tight">Available</p>
                            <p className="text-base sm:text-xl font-bold text-gray-900 dark:text-white">
                              {item.availableStock}
                            </p>
                          </div>
                          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-2 sm:p-3">
                            <p className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400 mb-0.5 sm:mb-1 leading-tight">Ordered</p>
                            <p className="text-base sm:text-xl font-bold text-blue-600 dark:text-blue-400">
                              {item.orderedQuantity}
                            </p>
                          </div>
                          <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-2 sm:p-3">
                            <p className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400 mb-0.5 sm:mb-1 leading-tight">Shortfall</p>
                            <p className="text-base sm:text-xl font-bold text-red-600 dark:text-red-400">
                              -{item.shortfall}
                            </p>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col sm:flex-row gap-2">
                          <Link href={`/inventory/products/${item.productId}`} className="flex-1 sm:flex-none">
                            <Button size="sm" variant="outline" className="w-full sm:w-auto" data-testid={`button-view-product-${item.productId}`}>
                              <ExternalLink className="h-4 w-4 mr-1.5" />
                              <span className="hidden sm:inline">View Product</span>
                              <span className="sm:hidden">View</span>
                            </Button>
                          </Link>
                          <Link href={`/stock`} className="flex-1 sm:flex-none">
                            <Button size="sm" className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white" data-testid={`button-add-stock-${item.productId}`}>
                              <TrendingUp className="h-4 w-4 mr-1.5" />
                              <span className="hidden sm:inline">Add Stock</span>
                              <span className="sm:hidden">Add</span>
                            </Button>
                          </Link>
                          <Link href={`/orders`} className="flex-1 sm:flex-none">
                            <Button size="sm" variant="outline" className="w-full sm:w-auto" data-testid={`button-view-orders-${item.productId}`}>
                              <span className="hidden sm:inline">View Related Orders</span>
                              <span className="sm:hidden">Orders</span>
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
