import { useParams, Link } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Package, 
  ArrowLeft, 
  Edit, 
  Trash2, 
  Copy,
  CheckCircle,
  XCircle,
  Box,
  DollarSign,
  ShoppingCart,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import type { ProductBundle, BundleItem, Product } from '@shared/schema';

interface ProductVariant {
  id: string;
  productId: string;
  name: string;
  sku?: string;
  barcode?: string;
  quantity: number;
}

interface BundleWithItems extends ProductBundle {
  items: (BundleItem & {
    product: Product;
    variant?: ProductVariant;
  })[];
}

export default function BundleDetails() {
  const { id } = useParams();
  const [, navigate] = useLocation();
  const { t } = useTranslation();
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const toggleExpanded = (itemId: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  useEffect(() => {
    if (id === 'create') {
      navigate('/inventory/bundles/create', { replace: true });
    }
  }, [id, navigate]);

  const { data: bundle, isLoading } = useQuery<BundleWithItems>({
    queryKey: ['/api/bundles', id],
    enabled: !!id && id !== 'create'
  });

  const { data: orders } = useQuery<any[]>({
    queryKey: ['/api/orders'],
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await apiRequest('DELETE', `/api/bundles/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/bundles'] });
      toast({
        title: t('inventory:bundleDeleted'),
        description: t('inventory:bundleDeleted')
      });
      // @ts-ignore
      navigate('/inventory/bundles');
    },
    onError: (error) => {
      toast({
        title: t('inventory:error'),
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  const duplicateMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', `/api/bundles/${id}/duplicate`);
      return response.json();
    },
    onSuccess: (newBundle) => {
      queryClient.invalidateQueries({ queryKey: ['/api/bundles'] });
      toast({
        title: t('inventory:bundleDuplicated'),
        description: t('inventory:bundleDuplicated')
      });
      // @ts-ignore
      navigate(`/inventory/bundles/${newBundle.id}`);
    },
    onError: (error) => {
      toast({
        title: t('inventory:error'),
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('PATCH', `/api/bundles/${id}`, {
        isActive: !bundle?.isActive
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/bundles', id] });
      toast({
        title: bundle?.isActive ? t('inventory:bundleDeactivated') : t('inventory:bundleActivated'),
        description: bundle?.isActive ? t('inventory:bundleDeactivated') : t('inventory:bundleActivated')
      });
    },
    onError: (error) => {
      toast({
        title: t('inventory:error'),
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  if (!bundle) return null;

  const calculateTotalBasePrice = () => {
    let totalCzk = 0;
    let totalEur = 0;

    bundle.items.forEach(item => {
      const basePriceCzk = parseFloat(item.product.priceCzk || '0');
      const basePriceEur = parseFloat(item.product.priceEur || '0');
      
      totalCzk += basePriceCzk * item.quantity;
      totalEur += basePriceEur * item.quantity;
    });

    return { totalCzk, totalEur };
  };

  const basePrice = calculateTotalBasePrice();
  const savings = {
    czk: basePrice.totalCzk - parseFloat(bundle.priceCzk || '0'),
    eur: basePrice.totalEur - parseFloat(bundle.priceEur || '0')
  };
  const savingsPercentage = basePrice.totalCzk > 0 
    ? ((savings.czk / basePrice.totalCzk) * 100).toFixed(1)
    : '0';

  return (
    <div className="px-mobile py-mobile max-w-7xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => window.history.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Package className="h-6 w-6" />
              {bundle.name}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge 
                variant={bundle.isActive ? "default" : "secondary"}
                className="text-xs"
              >
                {bundle.isActive ? (
                  <><CheckCircle className="mr-1 h-3 w-3" />{t('inventory:active')}</>
                ) : (
                  <><XCircle className="mr-1 h-3 w-3" />{t('inventory:inactive')}</>
                )}
              </Badge>
              {bundle.sku && (
                <span className="text-sm text-muted-foreground">SKU: {bundle.sku}</span>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => duplicateMutation.mutate()}
            disabled={duplicateMutation.isPending}
          >
            <Copy className="h-4 w-4 mr-2" />
            {t('inventory:duplicateBundle')}
          </Button>
          
          <Link href={`/inventory/bundles/${id}/edit`}>
            <Button variant="outline" size="sm">
              <Edit className="h-4 w-4 mr-2" />
              {t('inventory:edit')}
            </Button>
          </Link>
          
          <Button
            variant={bundle.isActive ? "secondary" : "default"}
            size="sm"
            onClick={() => toggleActiveMutation.mutate()}
            disabled={toggleActiveMutation.isPending}
          >
            {bundle.isActive ? t('inventory:deactivateBundle') : t('inventory:activateBundle')}
          </Button>
          
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm">
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t('inventory:deleteBundle')}</AlertDialogTitle>
                <AlertDialogDescription>
                  {t('inventory:deleteBundleConfirmation')}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t('inventory:cancel')}</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => deleteMutation.mutate()}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {t('inventory:delete')}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Main Content - Left Column (2/3) */}
        <div className="lg:col-span-2 space-y-4">
          {/* Bundle Items */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Box className="h-5 w-5" />
                {t('inventory:bundleItems')} ({bundle.items.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2">
                {(() => {
                  // Group bundle items by product
                  const groupedItems = bundle.items.reduce((acc: any, item) => {
                    if (!acc[item.productId]) {
                      acc[item.productId] = {
                        product: item.product,
                        items: []
                      };
                    }
                    acc[item.productId].items.push(item);
                    return acc;
                  }, {});
                  
                  return Object.entries(groupedItems).map(([productId, group]: any) => {
                    const totalQuantity = group.items.reduce((sum: number, item: any) => sum + item.quantity, 0);
                    const hasMultipleVariants = group.items.length > 1;
                    const isExpanded = expandedItems.has(productId);
                    
                    return (
                      <div key={productId} className="border rounded-lg">
                        <div className="flex items-center justify-between p-3 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <Link href={`/inventory/products/${productId}`}>
                                <p className="font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 hover:underline cursor-pointer">
                                  {group.product.name}
                                </p>
                              </Link>
                              <Badge variant="outline" className="text-xs">
                                {t('inventory:qty')}: {totalQuantity}
                              </Badge>
                              {!hasMultipleVariants && group.items[0].variant && (
                                <Badge variant="secondary" className="text-xs">
                                  {group.items[0].variant.name}
                                </Badge>
                              )}
                              {hasMultipleVariants && (
                                <Badge variant="secondary" className="text-xs">
                                  {group.items.length} {t('inventory:variants')}
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-3 mt-1">
                              <p className="text-xs text-muted-foreground">
                                {t('inventory:sku')}: {group.product.sku}
                              </p>
                              <span className="text-xs text-muted-foreground">•</span>
                              <p className="text-xs text-muted-foreground">
                                {t('inventory:stock')}: {group.items.reduce((sum: number, item: any) => 
                                  sum + (item.variant?.quantity ?? item.product.quantity ?? 0), 0
                                )}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="text-right">
                              <p className="text-sm font-semibold">
                                {(parseFloat(group.product.priceCzk || '0') * totalQuantity).toFixed(2)} {t('common:currencyCzk')}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {t('common:currencyEur')}{(parseFloat(group.product.priceEur || '0') * totalQuantity).toFixed(2)}
                              </p>
                            </div>
                            {hasMultipleVariants && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleExpanded(productId)}
                                className="h-8 w-8 p-0"
                              >
                                {isExpanded ? (
                                  <ChevronUp className="h-4 w-4" />
                                ) : (
                                  <ChevronDown className="h-4 w-4" />
                                )}
                              </Button>
                            )}
                          </div>
                        </div>
                        
                        {/* Expandable Variant Details */}
                        {hasMultipleVariants && isExpanded && (
                          <div className="border-t p-3 bg-muted/30">
                            <div className="space-y-1.5">
                              {group.items.map((item: any, vIndex: number) => (
                                <div 
                                  key={item.variant?.id || vIndex}
                                  className="flex items-center justify-between p-2 bg-background rounded border text-sm"
                                >
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-medium text-muted-foreground w-6">
                                      #{vIndex + 1}
                                    </span>
                                    <div>
                                      <p className="font-medium">
                                        {item.variant?.name || t('inventory:variantNumber', { number: vIndex + 1 })}
                                      </p>
                                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                        {item.variant?.barcode && (
                                          <>
                                            <span>{t('inventory:barcode')}: {item.variant.barcode}</span>
                                            <span>•</span>
                                          </>
                                        )}
                                        <span>{t('inventory:stock')}: {item.variant?.quantity ?? 0}</span>
                                      </div>
                                    </div>
                                  </div>
                                  <Badge variant="outline" className="text-xs">
                                    {t('inventory:qty')}: {item.quantity}
                                  </Badge>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  });
                })()}
              </div>
            </CardContent>
          </Card>

          {/* Bundle Information */}
          {bundle.description && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">{t('inventory:description')}</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-sm text-muted-foreground">{bundle.description}</p>
              </CardContent>
            </Card>
          )}

          {/* Order History */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                {t('inventory:orderHistory')}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {(() => {
                const bundleOrders = orders?.filter(order => 
                  order.items?.some((item: any) => item.bundleId === bundle.id)
                ) || [];

                if (bundleOrders.length === 0) {
                  return (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                      {t('inventory:noOrdersFoundForBundle')}
                    </div>
                  );
                }

                return (
                  <div className="space-y-2">
                    {bundleOrders.slice(0, 5).map((order: any) => (
                      <Link key={order.id} href={`/orders/${order.id}`}>
                        <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors cursor-pointer">
                          <div>
                            <p className="font-medium text-sm">{order.customerId || t('inventory:unknownCustomer')}</p>
                            <p className="text-xs text-muted-foreground">
                              {order.createdAt && format(new Date(order.createdAt), 'MMM dd, yyyy')}
                            </p>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {order.status}
                          </Badge>
                        </div>
                      </Link>
                    ))}
                    {bundleOrders.length > 5 && (
                      <p className="text-xs text-center text-muted-foreground pt-2">
                        {t('inventory:moreOrders', { count: bundleOrders.length - 5 })}
                      </p>
                    )}
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar - Right Column (1/3) */}
        <div className="space-y-4">
          {/* Pricing */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                {t('inventory:pricing')}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-3">
              <div>
                <p className="text-xs text-muted-foreground">{t('inventory:basePrice')}</p>
                <p className="text-lg font-bold">{basePrice.totalCzk.toFixed(2)} {t('common:currencyCzk')}</p>
                <p className="text-xs text-muted-foreground">{t('common:currencyEur')}{basePrice.totalEur.toFixed(2)}</p>
              </div>
              
              <Separator />
              
              <div>
                <p className="text-xs text-muted-foreground">{t('inventory:bundlePrice')}</p>
                <p className="text-lg font-bold text-green-600 dark:text-green-400">
                  {parseFloat(bundle.priceCzk || '0').toFixed(2)} {t('common:currencyCzk')}
                </p>
                <p className="text-xs text-green-600 dark:text-green-400">
                  {t('common:currencyEur')}{parseFloat(bundle.priceEur || '0').toFixed(2)}
                </p>
              </div>
              
              <Separator />
              
              <div>
                <p className="text-xs text-muted-foreground">{t('inventory:customerSavings')}</p>
                <Badge variant="default" className="bg-green-500 mt-1">
                  {savingsPercentage}% {t('inventory:off')}
                </Badge>
                <p className="text-xs mt-2">
                  {t('inventory:savings')}: {savings.czk.toFixed(2)} {t('common:currencyCzk')} ({t('common:currencyEur')}{savings.eur.toFixed(2)})
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Statistics */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">{t('inventory:statistics')}</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-3">
              <div>
                <p className="text-xs text-muted-foreground">{t('inventory:availableBundleStock')}</p>
                <div className="flex items-center gap-2 mt-1">
                  {(() => {
                    // Calculate how many complete bundles can be made
                    const availableBundles = bundle.items.map(item => {
                      const availableQuantity = item.variant?.quantity ?? item.product.quantity ?? 0;
                      return Math.floor(availableQuantity / item.quantity);
                    });
                    const stock = availableBundles.length > 0 ? Math.min(...availableBundles) : 0;
                    const isInStock = stock > 0;
                    
                    return (
                      <>
                        <p className="text-2xl font-bold">{stock}</p>
                        <Badge 
                          variant="outline" 
                          className={isInStock ? "bg-green-50 text-green-700 border-green-300" : "bg-red-50 text-red-700 border-red-300"}
                        >
                          {isInStock ? t('inventory:inStock') : t('inventory:outOfStock')}
                        </Badge>
                      </>
                    );
                  })()}
                </div>
                <p className="text-xs text-muted-foreground mt-1">{t('inventory:completeBundlesAvailable')}</p>
              </div>
              
              <Separator />
              
              <div>
                <p className="text-xs text-muted-foreground">{t('inventory:totalItems')}</p>
                <p className="text-2xl font-bold">{bundle.items.reduce((sum, item) => sum + item.quantity, 0)}</p>
                <p className="text-xs text-muted-foreground">{bundle.items.length} {t('inventory:uniqueProducts')}</p>
              </div>
              
              <Separator />
              
              <div>
                <p className="text-xs text-muted-foreground">{t('inventory:profitMargin')}</p>
                <p className="text-2xl font-bold">
                  {(() => {
                    const totalImportCostCzk = bundle.items.reduce((sum, item) => 
                      sum + (parseFloat(item.product.importCostCzk || '0') * item.quantity), 0
                    );
                    const bundlePriceCzk = parseFloat(bundle.priceCzk || '0');
                    const profitMargin = totalImportCostCzk > 0 
                      ? ((bundlePriceCzk - totalImportCostCzk) / bundlePriceCzk * 100)
                      : 0;
                    return profitMargin.toFixed(1);
                  })()}%
                </p>
              </div>
              
              <Separator />
              
              <div>
                <p className="text-xs text-muted-foreground">{t('inventory:netProfit')}</p>
                <p className="text-lg font-bold">
                  {(() => {
                    const totalImportCostCzk = bundle.items.reduce((sum, item) => 
                      sum + (parseFloat(item.product.importCostCzk || '0') * item.quantity), 0
                    );
                    const bundlePriceCzk = parseFloat(bundle.priceCzk || '0');
                    const netProfitCzk = bundlePriceCzk - totalImportCostCzk;
                    return netProfitCzk.toFixed(2);
                  })()} {t('common:currencyCzk')}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t('common:currencyEur')}{(() => {
                    const totalImportCostEur = bundle.items.reduce((sum, item) => 
                      sum + (parseFloat(item.product.importCostEur || '0') * item.quantity), 0
                    );
                    const bundlePriceEur = parseFloat(bundle.priceEur || '0');
                    const netProfitEur = bundlePriceEur - totalImportCostEur;
                    return netProfitEur.toFixed(2);
                  })()}
                </p>
              </div>
              
              {bundle.createdAt && (
                <>
                  <Separator />
                  <div>
                    <p className="text-xs text-muted-foreground">{t('common:created')}</p>
                    <p className="text-sm">{format(new Date(bundle.createdAt), 'MMM dd, yyyy')}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {bundle.notes && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">{t('common:notes')}</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-sm text-muted-foreground">{bundle.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
