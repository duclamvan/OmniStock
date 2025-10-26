import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, Package, ChevronLeft, ExternalLink, MapPin } from "lucide-react";
import { Link } from "wouter";

interface UnderAllocatedItem {
  type: 'product' | 'variant';
  productId: string;
  productName: string;
  productSku?: string;
  variantId?: string | null;
  variantName?: string | null;
  variantBarcode?: string | null;
  recordedQuantity: number;
  locationQuantity: number;
  discrepancy: number;
  imageUrl?: string;
}

export default function UnderAllocated() {
  const { data: items = [], isLoading } = useQuery<UnderAllocatedItem[]>({
    queryKey: ['/api/under-allocated-items'],
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
              <AlertTriangle className="h-5 w-5 sm:h-6 sm:w-6 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
              <h1 className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white truncate">
                Under-Allocated
              </h1>
            </div>
          </div>
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 ml-10 sm:ml-11 mb-3">
            Items with more quantity in record than in stock locations
          </p>
          {!isLoading && items.length > 0 && (
            <div className="ml-10 sm:ml-11">
              <Link href={`/stock?q=${items.map(i => i.productSku || i.productName).filter(Boolean).join(' ')}&from=under-allocated`}>
                <Button className="w-full sm:w-auto bg-yellow-600 hover:bg-yellow-700 text-white" size="sm" data-testid="button-check-all-locations">
                  <MapPin className="h-4 w-4 mr-2" />
                  Check All Stock Locations
                </Button>
              </Link>
            </div>
          )}
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
                All Inventory Records Aligned
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                No items have more quantity in record than in stock locations
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Summary Card */}
            <Card className="mb-4 sm:mb-6 border-yellow-200 dark:border-yellow-800">
              <CardContent className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-1">Total Under-Allocated Items</p>
                    <p className="text-2xl sm:text-3xl font-bold text-yellow-600 dark:text-yellow-400">{items.length}</p>
                  </div>
                  <div className="sm:text-right">
                    <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-1">Total Discrepancy</p>
                    <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                      {items.reduce((sum, item) => sum + item.discrepancy, 0)} units
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Items List */}
            <div className="space-y-3 sm:space-y-4">
              {items.map((item, index) => (
                <Card key={`${item.productId}-${item.variantId || 'base'}-${index}`} className="border-yellow-200 dark:border-yellow-800/50">
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
                          <Badge className="flex-shrink-0 bg-yellow-600 text-white text-xs">
                            {item.type === 'variant' ? 'Variant' : 'Product'}
                          </Badge>
                        </div>

                        {/* Stock Stats */}
                        <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-3 sm:mb-4">
                          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-2 sm:p-3">
                            <p className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400 mb-0.5 sm:mb-1 leading-tight">Recorded</p>
                            <p className="text-base sm:text-xl font-bold text-gray-900 dark:text-white">
                              {item.recordedQuantity}
                            </p>
                          </div>
                          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-2 sm:p-3">
                            <p className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400 mb-0.5 sm:mb-1 leading-tight">In Stock</p>
                            <p className="text-base sm:text-xl font-bold text-blue-600 dark:text-blue-400">
                              {item.locationQuantity}
                            </p>
                          </div>
                          <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-2 sm:p-3">
                            <p className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400 mb-0.5 sm:mb-1 leading-tight">Missing</p>
                            <p className="text-base sm:text-xl font-bold text-yellow-600 dark:text-yellow-400">
                              +{item.discrepancy}
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
                          <Link href={`/stock?q=${encodeURIComponent(item.productSku || item.productName)}`} className="flex-1 sm:flex-none">
                            <Button size="sm" className="w-full sm:w-auto bg-yellow-600 hover:bg-yellow-700 text-white" data-testid={`button-check-locations-${item.productId}`}>
                              <MapPin className="h-4 w-4 mr-1.5" />
                              <span className="hidden sm:inline">Check Stock Locations</span>
                              <span className="sm:hidden">Check Locations</span>
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
