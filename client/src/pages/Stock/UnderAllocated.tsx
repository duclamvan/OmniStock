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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
        <div className="px-4 py-4 max-w-7xl mx-auto">
          <div className="flex items-center justify-between gap-3 mb-2">
            <div className="flex items-center gap-3">
              <Link href="/stock">
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" data-testid="button-back-to-stock">
                  <ChevronLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Under-Allocated Inventory
                </h1>
              </div>
            </div>
            {!isLoading && items.length > 0 && (
              <Link href={`/stock?q=${items.map(i => i.productSku || i.productName).filter(Boolean).join(' ')}`}>
                <Button className="bg-yellow-600 hover:bg-yellow-700 text-white" data-testid="button-check-all-locations">
                  <MapPin className="h-4 w-4 mr-2" />
                  Check All Stock Locations
                </Button>
              </Link>
            )}
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 ml-11">
            Items with more quantity in record than in stock locations
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-6 max-w-7xl mx-auto">
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="flex gap-4">
                    <Skeleton className="h-20 w-20 rounded-md flex-shrink-0" />
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
            <CardContent className="p-12 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/20 mb-4">
                <Package className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                All Inventory Records Aligned
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                No items have more quantity in record than in stock locations
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Summary Card */}
            <Card className="mb-6 border-yellow-200 dark:border-yellow-800">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Under-Allocated Items</p>
                    <p className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">{items.length}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Discrepancy</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {items.reduce((sum, item) => sum + item.discrepancy, 0)} units
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Items List */}
            <div className="space-y-4">
              {items.map((item, index) => (
                <Card key={`${item.productId}-${item.variantId || 'base'}-${index}`} className="border-yellow-200 dark:border-yellow-800/50">
                  <CardContent className="p-6">
                    <div className="flex gap-4">
                      {/* Product Image */}
                      <div className="flex-shrink-0">
                        {item.imageUrl ? (
                          <img
                            src={item.imageUrl}
                            alt={item.productName}
                            className="h-20 w-20 rounded-md object-cover bg-gray-100 dark:bg-gray-800"
                          />
                        ) : (
                          <div className="h-20 w-20 rounded-md bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center">
                            <Package className="h-8 w-8 text-gray-400" />
                          </div>
                        )}
                      </div>

                      {/* Product Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-lg text-gray-900 dark:text-white mb-1">
                              {item.productName}
                              {item.type === 'variant' && item.variantName && (
                                <span className="text-gray-600 dark:text-gray-400 font-normal"> - {item.variantName}</span>
                              )}
                            </h3>
                            {item.productSku && (
                              <p className="text-sm text-gray-500 dark:text-gray-400 font-mono mb-1">
                                SKU: {item.productSku}
                              </p>
                            )}
                            {item.variantBarcode && (
                              <p className="text-sm text-gray-500 dark:text-gray-400 font-mono">
                                Barcode: {item.variantBarcode}
                              </p>
                            )}
                          </div>
                          <Badge className="ml-3 flex-shrink-0 bg-yellow-600 text-white">
                            {item.type === 'variant' ? 'Variant' : 'Product'}
                          </Badge>
                        </div>

                        {/* Stock Stats */}
                        <div className="grid grid-cols-3 gap-4 mb-4">
                          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                            <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Recorded Quantity</p>
                            <p className="text-xl font-bold text-gray-900 dark:text-white">
                              {item.recordedQuantity}
                            </p>
                          </div>
                          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
                            <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">In Locations</p>
                            <p className="text-xl font-bold text-blue-600 dark:text-blue-400">
                              {item.locationQuantity}
                            </p>
                          </div>
                          <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-3">
                            <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Discrepancy</p>
                            <p className="text-xl font-bold text-yellow-600 dark:text-yellow-400">
                              +{item.discrepancy}
                            </p>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-wrap gap-2">
                          <Link href={`/inventory/products/${item.productId}`}>
                            <Button size="sm" variant="outline" data-testid={`button-view-product-${item.productId}`}>
                              <ExternalLink className="h-4 w-4 mr-1" />
                              View Product
                            </Button>
                          </Link>
                          <Link href={`/stock?q=${encodeURIComponent(item.productSku || item.productName)}`}>
                            <Button size="sm" className="bg-yellow-600 hover:bg-yellow-700 text-white" data-testid={`button-check-locations-${item.productId}`}>
                              <MapPin className="h-4 w-4 mr-1" />
                              Check Stock Locations
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
