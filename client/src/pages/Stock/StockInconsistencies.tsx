import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { AlertTriangle, Package, ChevronLeft, ExternalLink, Check, ArrowRight, TrendingUp, TrendingDown, MapPin } from "lucide-react";
import { Link } from "wouter";
import { useIsMobile } from "@/hooks/use-mobile";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface StockInconsistency {
  type: 'product' | 'variant';
  productId: string;
  productName: string;
  productSku?: string;
  variantId?: string | null;
  variantName?: string | null;
  variantBarcode?: string | null;
  imageUrl?: string;
  inconsistencyType: 'over_allocated' | 'under_allocated';
  availableStock?: number;
  orderedQuantity?: number;
  totalOrdered?: number;
  shortfall?: number;
  recordedQuantity?: number;
  locationQuantity?: number;
  discrepancy?: number;
}

interface InconsistenciesResponse {
  items: StockInconsistency[];
  summary: {
    total: number;
    overAllocated: number;
    underAllocated: number;
  };
}

export default function StockInconsistencies() {
  const { t } = useTranslation(['inventory', 'common']);
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const [filter, setFilter] = useState<'all' | 'over_allocated' | 'under_allocated'>('all');
  const [quickFixItem, setQuickFixItem] = useState<StockInconsistency | null>(null);
  const [newQuantity, setNewQuantity] = useState<string>("");

  const { data, isLoading, refetch } = useQuery<InconsistenciesResponse>({
    queryKey: ['/api/stock-inconsistencies'],
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  const items = data?.items || [];
  const summary = data?.summary || { total: 0, overAllocated: 0, underAllocated: 0 };

  const filteredItems = items.filter(item => {
    if (filter === 'all') return true;
    return item.inconsistencyType === filter;
  });

  const adjustStockMutation = useMutation({
    mutationFn: async ({ 
      productId, 
      variantId, 
      quantity,
      inconsistencyType 
    }: { 
      productId: string; 
      variantId?: string | null; 
      quantity: number;
      inconsistencyType: string;
    }) => {
      return apiRequest('POST', '/api/stock/quick-fix', { 
        productId, 
        variantId: variantId || null, 
        newQuantity: quantity,
        inconsistencyType,
        reason: 'Stock inconsistency quick fix'
      });
    },
    onSuccess: async () => {
      toast({
        title: t('common:success'),
        description: t('stockAdjustedSuccessfully'),
      });
      setQuickFixItem(null);
      setNewQuantity("");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['/api/stock-inconsistencies'] }),
        queryClient.invalidateQueries({ queryKey: ['/api/over-allocated-items'] }),
        queryClient.invalidateQueries({ queryKey: ['/api/under-allocated-items'] }),
        queryClient.invalidateQueries({ queryKey: ['/api/products'] }),
      ]);
      refetch();
    },
    onError: (error: any) => {
      toast({
        title: t('common:error'),
        description: error.message || t('failedToAdjustStock'),
        variant: "destructive",
      });
    },
  });

  const handleQuickFix = (item: StockInconsistency) => {
    setQuickFixItem(item);
    if (item.inconsistencyType === 'over_allocated') {
      setNewQuantity(String(item.totalOrdered || item.orderedQuantity || 0));
    } else {
      setNewQuantity(String(item.locationQuantity || 0));
    }
  };

  const handleApplyFix = () => {
    if (!quickFixItem || !newQuantity) return;
    
    const qty = parseInt(newQuantity, 10);
    if (isNaN(qty) || qty < 0) {
      toast({
        title: t('common:error'),
        description: t('invalidQuantity'),
        variant: "destructive",
      });
      return;
    }

    adjustStockMutation.mutate({
      productId: quickFixItem.productId,
      variantId: quickFixItem.variantId,
      quantity: qty,
      inconsistencyType: quickFixItem.inconsistencyType,
    });
  };

  const getSuggestedQuantity = (item: StockInconsistency): number => {
    if (item.inconsistencyType === 'over_allocated') {
      return item.totalOrdered || item.orderedQuantity || 0;
    }
    return item.locationQuantity || 0;
  };

  const QuickFixContent = () => (
    <div className="space-y-4">
      {quickFixItem && (
        <>
          <div className="flex items-center gap-3 pb-4 border-b">
            {quickFixItem.imageUrl ? (
              <img
                src={quickFixItem.imageUrl}
                alt={quickFixItem.productName}
                className="h-12 w-12 rounded-md object-cover"
              />
            ) : (
              <div className="h-12 w-12 rounded-md bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                <Package className="h-6 w-6 text-gray-400" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 dark:text-white truncate">
                {quickFixItem.productName}
              </p>
              {quickFixItem.variantName && (
                <p className="text-sm text-gray-500 dark:text-gray-400">{quickFixItem.variantName}</p>
              )}
            </div>
          </div>

          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {quickFixItem.inconsistencyType === 'over_allocated' ? t('currentStock') : t('recordedQuantity')}
              </span>
              <span className="font-bold text-gray-900 dark:text-white">
                {quickFixItem.inconsistencyType === 'over_allocated' 
                  ? quickFixItem.availableStock 
                  : quickFixItem.recordedQuantity}
              </span>
            </div>
            <div className="flex items-center justify-center gap-3 mb-3">
              <ArrowRight className="h-5 w-5 text-gray-400" />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {t('suggestedQuantity')}
              </span>
              <span className="font-bold text-green-600 dark:text-green-400">
                {getSuggestedQuantity(quickFixItem)}
              </span>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
              {t('setCorrectQuantity')}
            </label>
            <Input
              type="number"
              min="0"
              value={newQuantity}
              onChange={(e) => setNewQuantity(e.target.value)}
              placeholder={String(getSuggestedQuantity(quickFixItem))}
              className="text-lg font-bold text-center"
              data-testid="input-new-quantity"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                setQuickFixItem(null);
                setNewQuantity("");
              }}
              data-testid="button-cancel-fix"
            >
              {t('common:cancel')}
            </Button>
            <Button
              className="flex-1 bg-green-600 hover:bg-green-700 text-white"
              onClick={handleApplyFix}
              disabled={adjustStockMutation.isPending}
              data-testid="button-apply-fix"
            >
              {adjustStockMutation.isPending ? (
                <span className="flex items-center gap-2">
                  <span className="animate-spin">⏳</span>
                  {t('common:saving')}
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Check className="h-4 w-4" />
                  {t('applyFix')}
                </span>
              )}
            </Button>
          </div>
        </>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-6 overflow-x-hidden">
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
              <AlertTriangle className="h-5 w-5 sm:h-6 sm:w-6 text-orange-600 dark:text-orange-400 flex-shrink-0" />
              <h1 className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white truncate">
                {t('stockInconsistencies')}
              </h1>
            </div>
            <Badge variant="outline" className="text-orange-600 border-orange-600">
              {summary.total}
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 ml-10 sm:ml-11 mb-3">
            {t('stockInconsistenciesDescription')}
          </p>

          {/* Filter Tabs */}
          <div className="ml-10 sm:ml-11">
            <Tabs value={filter} onValueChange={(v) => setFilter(v as any)}>
              <TabsList className="grid w-full grid-cols-3 h-9">
                <TabsTrigger value="all" className="text-xs sm:text-sm" data-testid="tab-all">
                  {t('common:all')} ({summary.total})
                </TabsTrigger>
                <TabsTrigger value="over_allocated" className="text-xs sm:text-sm" data-testid="tab-over-allocated">
                  <TrendingDown className="h-3 w-3 mr-1 text-red-500" />
                  {summary.overAllocated}
                </TabsTrigger>
                <TabsTrigger value="under_allocated" className="text-xs sm:text-sm" data-testid="tab-under-allocated">
                  <TrendingUp className="h-3 w-3 mr-1 text-yellow-500" />
                  {summary.underAllocated}
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
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
        ) : filteredItems.length === 0 ? (
          <Card>
            <CardContent className="p-8 sm:p-12 text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-green-100 dark:bg-green-900/20 mb-3 sm:mb-4">
                <Check className="h-6 w-6 sm:h-8 sm:w-8 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-2">
                {t('noStockInconsistencies')}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t('allStockLevelsHealthy')}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3 sm:space-y-4">
            {filteredItems.map((item, index) => {
              const isOverAllocated = item.inconsistencyType === 'over_allocated';
              const borderColor = isOverAllocated 
                ? 'border-red-200 dark:border-red-800/50' 
                : 'border-yellow-200 dark:border-yellow-800/50';
              const badgeColor = isOverAllocated
                ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';

              return (
                <Card key={`${item.productId}-${item.variantId || 'base'}-${index}`} className={borderColor}>
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
                                {t('sku')}: {item.productSku}
                              </p>
                            )}
                          </div>
                          <Badge className={`flex-shrink-0 text-xs ${badgeColor}`}>
                            {isOverAllocated ? (
                              <><TrendingDown className="h-3 w-3 mr-1" />{t('overstock')}</>
                            ) : (
                              <><TrendingUp className="h-3 w-3 mr-1" />{t('missing')}</>
                            )}
                          </Badge>
                        </div>

                        {/* Stock Stats */}
                        <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-3 sm:mb-4">
                          {isOverAllocated ? (
                            <>
                              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-2 sm:p-3">
                                <p className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400 mb-0.5 sm:mb-1 leading-tight">{t('available')}</p>
                                <p className="text-base sm:text-xl font-bold text-gray-900 dark:text-white">
                                  {item.availableStock}
                                </p>
                              </div>
                              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-2 sm:p-3">
                                <p className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400 mb-0.5 sm:mb-1 leading-tight">{t('ordered')}</p>
                                <p className="text-base sm:text-xl font-bold text-blue-600 dark:text-blue-400">
                                  {item.totalOrdered || item.orderedQuantity}
                                </p>
                              </div>
                              <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-2 sm:p-3">
                                <p className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400 mb-0.5 sm:mb-1 leading-tight">{t('shortfall')}</p>
                                <p className="text-base sm:text-xl font-bold text-red-600 dark:text-red-400">
                                  -{item.shortfall || Math.abs((item.availableStock || 0) - (item.totalOrdered || item.orderedQuantity || 0))}
                                </p>
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-2 sm:p-3">
                                <p className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400 mb-0.5 sm:mb-1 leading-tight">{t('recorded')}</p>
                                <p className="text-base sm:text-xl font-bold text-gray-900 dark:text-white">
                                  {item.recordedQuantity}
                                </p>
                              </div>
                              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-2 sm:p-3">
                                <p className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400 mb-0.5 sm:mb-1 leading-tight">{t('inStockQty')}</p>
                                <p className="text-base sm:text-xl font-bold text-blue-600 dark:text-blue-400">
                                  {item.locationQuantity}
                                </p>
                              </div>
                              <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-2 sm:p-3">
                                <p className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400 mb-0.5 sm:mb-1 leading-tight">{t('difference')}</p>
                                <p className="text-base sm:text-xl font-bold text-yellow-600 dark:text-yellow-400">
                                  +{item.discrepancy || Math.abs((item.recordedQuantity || 0) - (item.locationQuantity || 0))}
                                </p>
                              </div>
                            </>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col sm:flex-row gap-2">
                          <Button
                            size="sm"
                            className="flex-1 sm:flex-none bg-green-600 hover:bg-green-700 text-white"
                            onClick={() => handleQuickFix(item)}
                            data-testid={`button-quick-fix-${item.productId}`}
                          >
                            <Check className="h-4 w-4 mr-1.5" />
                            {t('quickFix')}
                          </Button>
                          <Link href={`/inventory/products/${item.productId}`} className="flex-1 sm:flex-none">
                            <Button size="sm" variant="outline" className="w-full sm:w-auto" data-testid={`button-view-product-${item.productId}`}>
                              <ExternalLink className="h-4 w-4 mr-1.5" />
                              <span className="hidden sm:inline">{t('viewProduct')}</span>
                              <span className="sm:hidden">{t('common:view')}</span>
                            </Button>
                          </Link>
                          {!isOverAllocated && (
                            <Link href={`/stock?q=${encodeURIComponent(item.productSku || item.productName)}`} className="flex-1 sm:flex-none">
                              <Button size="sm" variant="outline" className="w-full sm:w-auto" data-testid={`button-check-locations-${item.productId}`}>
                                <MapPin className="h-4 w-4 mr-1.5" />
                                <span className="hidden sm:inline">{t('checkLocations')}</span>
                                <span className="sm:hidden">{t('locations')}</span>
                              </Button>
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Quick Fix Dialog/Drawer */}
      {isMobile ? (
        <Drawer open={!!quickFixItem} onOpenChange={(open) => !open && setQuickFixItem(null)}>
          <DrawerContent className="max-h-[85vh]">
            <DrawerHeader>
              <DrawerTitle>{t('quickFixStock')}</DrawerTitle>
            </DrawerHeader>
            <div className="px-4 pb-6">
              <QuickFixContent />
            </div>
          </DrawerContent>
        </Drawer>
      ) : (
        <Dialog open={!!quickFixItem} onOpenChange={(open) => !open && setQuickFixItem(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{t('quickFixStock')}</DialogTitle>
              <DialogDescription>
                {t('setCorrectQuantityDescription')}
              </DialogDescription>
            </DialogHeader>
            <QuickFixContent />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
