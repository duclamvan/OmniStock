import { useParams, Link } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Package, 
  ArrowLeft, 
  Edit, 
  Trash2, 
  Copy,
  Tag,
  Calendar,
  FileText,
  AlertCircle,
  CheckCircle,
  XCircle,
  Box,
  Hash,
  DollarSign,
  ChevronDown,
  ChevronUp,
  Palette
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from '@/hooks/use-toast';
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
import { useState } from 'react';
import { useLocation } from 'wouter';
import type { ProductBundle, BundleItem, Product, ProductVariant } from '@shared/schema';

interface BundleWithItems extends ProductBundle {
  items: (BundleItem & {
    product: Product;
    variant?: ProductVariant;
  })[];
}

export default function BundleDetails() {
  const { id } = useParams();
  const [, navigate] = useLocation();
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());

  // Fetch bundle details
  const { data: bundle, isLoading, error } = useQuery<BundleWithItems>({
    queryKey: ['/api/bundles', id],
    enabled: !!id
  });

  // Fetch all product variants for expanded items
  const { data: allVariants = {} } = useQuery({
    queryKey: ['/api/products/variants-by-products', bundle?.items.map(i => i.productId)],
    queryFn: async () => {
      if (!bundle) return {};
      
      const variantsByProduct: Record<string, any[]> = {};
      
      // Fetch variants for each product
      for (const item of bundle.items) {
        if (item.productId) {
          try {
            const response = await fetch(`/api/products/${item.productId}/variants`);
            if (response.ok) {
              const variants = await response.json();
              variantsByProduct[item.productId] = variants;
            }
          } catch (error) {
            console.error(`Failed to fetch variants for product ${item.productId}:`, error);
          }
        }
      }
      
      return variantsByProduct;
    },
    enabled: !!bundle && bundle.items.length > 0
  });

  const toggleExpanded = (index: number) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  // Delete bundle mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      await apiRequest('DELETE', `/api/bundles/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/bundles'] });
      toast({
        title: 'Bundle deleted',
        description: 'The bundle has been successfully deleted.'
      });
      // @ts-ignore
      navigate('/inventory/bundles');
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  // Duplicate bundle mutation
  const duplicateMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', `/api/bundles/${id}/duplicate`);
      return response.json();
    },
    onSuccess: (newBundle) => {
      queryClient.invalidateQueries({ queryKey: ['/api/bundles'] });
      toast({
        title: 'Bundle duplicated',
        description: 'The bundle has been successfully duplicated.'
      });
      // @ts-ignore
      navigate(`/inventory/bundles/${newBundle.id}`);
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  // Toggle active status mutation
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
        title: bundle?.isActive ? 'Bundle deactivated' : 'Bundle activated',
        description: `The bundle has been ${bundle?.isActive ? 'deactivated' : 'activated'}.`
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || !bundle) {
    return (
      <div className="container mx-auto p-6">
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Error Loading Bundle</CardTitle>
            <CardDescription>
              {error?.message || 'Bundle not found'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/inventory">
              <Button variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Inventory
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Calculate total base price
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
    <div className="container mx-auto p-4 sm:p-6 max-w-7xl">
      {/* Mobile-First Header */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          {/* Title Section */}
          <div className="flex items-start sm:items-center gap-3">
            <Link href="/inventory/bundles">
              <Button variant="ghost" size="icon" className="shrink-0">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold flex items-center gap-2 flex-wrap">
                <Package className="h-5 w-5 sm:h-6 sm:w-6 lg:h-8 lg:w-8 shrink-0" />
                <span className="break-words">{bundle.name}</span>
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Bundle Details
              </p>
            </div>
          </div>
          
          {/* Action Buttons - Mobile Responsive */}
          <div className="flex flex-wrap gap-2 ml-11 sm:ml-0">
            {/* Mobile: Show icons only for secondary actions */}
            <Button
              variant="outline"
              onClick={() => duplicateMutation.mutate()}
              disabled={duplicateMutation.isPending}
              size="sm"
              className="sm:size-default"
            >
              <Copy className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Duplicate</span>
            </Button>
            
            <Link href={`/inventory/bundles/${id}/edit`}>
              <Button variant="outline" size="sm" className="sm:size-default">
                <Edit className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Edit</span>
              </Button>
            </Link>
            
            <Button
              variant={bundle.isActive ? "secondary" : "default"}
              onClick={() => toggleActiveMutation.mutate()}
              disabled={toggleActiveMutation.isPending}
              size="sm"
              className="sm:size-default"
            >
              {bundle.isActive ? (
                <>
                  <XCircle className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Deactivate</span>
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Activate</span>
                </>
              )}
            </Button>
            
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" className="sm:size-default">
                  <Trash2 className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Delete</span>
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="max-w-[90vw] sm:max-w-lg">
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Bundle</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete this bundle? This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                  <AlertDialogCancel className="w-full sm:w-auto">Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => deleteMutation.mutate()}
                    className="w-full sm:w-auto bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </div>

      {/* Mobile-First Layout */}
      <div className="space-y-4 sm:space-y-6">
        {/* Bundle Information - Order 1 on mobile */}
        <Card>
            <CardHeader className="pb-3 sm:pb-6">
              <CardTitle className="text-base sm:text-lg">Bundle Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Status</p>
                  <Badge 
                    variant={bundle.isActive ? "default" : "secondary"}
                    className="mt-1"
                  >
                    {bundle.isActive ? (
                      <>
                        <CheckCircle className="mr-1 h-3 w-3" />
                        Active
                      </>
                    ) : (
                      <>
                        <AlertCircle className="mr-1 h-3 w-3" />
                        Inactive
                      </>
                    )}
                  </Badge>
                </div>
                
                {bundle.sku && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">SKU</p>
                    <p className="mt-1 font-mono">{bundle.sku}</p>
                  </div>
                )}
                
                {bundle.createdAt && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Created</p>
                    <p className="mt-1 flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {format(new Date(bundle.createdAt), 'MMM dd, yyyy')}
                    </p>
                  </div>
                )}
                
                {bundle.updatedAt && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Last Updated</p>
                    <p className="mt-1 flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {format(new Date(bundle.updatedAt), 'MMM dd, yyyy')}
                    </p>
                  </div>
                )}
              </div>
              
              {bundle.description && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">Description</p>
                    <p className="text-sm">{bundle.description}</p>
                  </div>
                </>
              )}
              
              {bundle.notes && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-1">
                      <FileText className="h-4 w-4" />
                      Notes
                    </p>
                    <p className="text-sm">{bundle.notes}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

        {/* Bundle Items Card - Order 2 on mobile */}
        <Card>
          <CardHeader className="pb-3 sm:pb-6">
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <Box className="h-4 w-4 sm:h-5 sm:w-5" />
              Bundle Items ({bundle.items.length})
            </CardTitle>
          </CardHeader>
            <CardContent className="p-3 sm:p-6">
              <div className="space-y-3 sm:space-y-4">
                {bundle.items.map((item, index) => {
                  const isExpanded = expandedItems.has(index);
                  const productVariants = item.productId ? allVariants[item.productId] || [] : [];
                  
                  return (
                    <div key={index} className="border rounded-lg p-3 sm:p-4">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
                            <h4 className="font-semibold text-sm sm:text-base">{item.product.name}</h4>
                            <Badge variant="outline" className="w-fit">
                              <Hash className="mr-1 h-3 w-3" />
                              Qty: {item.quantity}
                            </Badge>
                          </div>
                          
                          {/* Stock Availability */}
                          <div className="mb-2">
                            {(() => {
                              const stock = item.variant?.quantity ?? item.product.quantity ?? 0;
                              const required = item.quantity;
                              const isInStock = stock >= required;
                              
                              return (
                                <p className={`text-sm font-medium ${isInStock ? 'text-green-600' : 'text-red-600'}`}>
                                  {stock}/{required} in stock
                                </p>
                              );
                            })()}
                          </div>
                          
                          {item.product.sku && (
                            <p className="text-sm text-muted-foreground">
                              SKU: {item.product.sku}
                            </p>
                          )}
                          
                          {item.variant && (
                            <div className="mt-2 p-2 bg-muted rounded">
                              <p className="text-sm font-medium">Variant: {item.variant.name}</p>
                              {item.variant.barcode && (
                                <p className="text-xs text-muted-foreground">
                                  Variant Barcode: {item.variant.barcode}
                                </p>
                              )}
                            </div>
                          )}
                          
                          <div className="mt-2 grid grid-cols-2 gap-2 sm:gap-4">
                            <div>
                              <p className="text-xs text-muted-foreground">Unit Price CZK</p>
                              <p className="text-sm sm:text-base font-medium">{parseFloat(item.product.priceCzk || '0').toFixed(2)} Kč</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Unit Price EUR</p>
                              <p className="text-sm sm:text-base font-medium">€{parseFloat(item.product.priceEur || '0').toFixed(2)}</p>
                            </div>
                          </div>
                          
                          {/* Color Variants Expandable Section */}
                          {productVariants.length > 0 && (
                            <div className="mt-3">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleExpanded(index)}
                                className="w-full justify-start text-sm"
                              >
                                <Palette className="mr-2 h-4 w-4" />
                                View Color Variants ({productVariants.length})
                                {isExpanded ? (
                                  <ChevronUp className="ml-auto h-4 w-4" />
                                ) : (
                                  <ChevronDown className="ml-auto h-4 w-4" />
                                )}
                              </Button>
                              
                              {isExpanded && (
                                <div className="mt-2 p-3 bg-muted/50 rounded-lg">
                                  <div className="max-h-48 overflow-y-auto space-y-1 pr-2">
                                    {productVariants.map((variant: any, vIndex: number) => (
                                      <div 
                                        key={vIndex}
                                        className="flex items-center justify-between p-2 bg-background rounded border hover:bg-muted/50 transition-colors"
                                      >
                                        <div className="flex items-center gap-3">
                                          <span className="text-xs font-medium text-muted-foreground w-8">
                                            #{vIndex + 1}
                                          </span>
                                          <p className="text-sm font-medium">
                                            {variant.name || `Color ${vIndex + 1}`}
                                          </p>
                                        </div>
                                        {variant.sku && (
                                          <p className="text-xs text-muted-foreground">
                                            {variant.sku}
                                          </p>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                        
                        <div className="text-right sm:ml-4">
                          <p className="text-xs text-muted-foreground">Subtotal</p>
                          <p className="text-sm sm:text-base font-semibold">
                            {(parseFloat(item.product.priceCzk || '0') * item.quantity).toFixed(2)} Kč
                          </p>
                          <p className="text-xs sm:text-sm text-muted-foreground">
                            €{(parseFloat(item.product.priceEur || '0') * item.quantity).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
        </Card>

        {/* Statistics Card - Order 3 on mobile */}
        <Card>
          <CardHeader className="pb-3 sm:pb-6">
            <CardTitle className="text-base sm:text-lg">Statistics</CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-6 space-y-4">
            <div>
              <p className="text-xs sm:text-sm font-medium text-muted-foreground">Total Sold</p>
              <p className="text-lg sm:text-2xl font-bold">0</p>
              <p className="text-xs text-muted-foreground">All time</p>
            </div>
            
            <Separator />
            
            <div>
              <p className="text-xs sm:text-sm font-medium text-muted-foreground">Total Revenue</p>
              <p className="text-base sm:text-lg font-bold">0.00 Kč</p>
              <p className="text-xs text-muted-foreground">€0.00</p>
            </div>
            
            <Separator />
            
            <div>
              <p className="text-xs sm:text-sm font-medium text-muted-foreground">Profit Margin %</p>
              <p className="text-lg sm:text-2xl font-bold">
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
              <p className="text-xs text-muted-foreground">Based on import costs</p>
            </div>
            
            <Separator />
            
            <div>
              <p className="text-xs sm:text-sm font-medium text-muted-foreground">Net Profit</p>
              <p className="text-base sm:text-lg font-bold">
                  {(() => {
                    const totalImportCostCzk = bundle.items.reduce((sum, item) => 
                      sum + (parseFloat(item.product.importCostCzk || '0') * item.quantity), 0
                    );
                    const bundlePriceCzk = parseFloat(bundle.priceCzk || '0');
                    const netProfitCzk = bundlePriceCzk - totalImportCostCzk;
                    return netProfitCzk.toFixed(2);
                  })()} Kč
                </p>
                <p className="text-xs text-muted-foreground">
                  €{(() => {
                    const totalImportCostEur = bundle.items.reduce((sum, item) => 
                      sum + (parseFloat(item.product.importCostEur || '0') * item.quantity), 0
                    );
                    const bundlePriceEur = parseFloat(bundle.priceEur || '0');
                    const netProfitEur = bundlePriceEur - totalImportCostEur;
                    return netProfitEur.toFixed(2);
                  })()}
              </p>
            </div>
            
            <Separator />
            
            <div>
              <p className="text-xs sm:text-sm font-medium text-muted-foreground">Bundle Items</p>
              <p className="text-lg sm:text-2xl font-bold">{bundle.items.reduce((sum, item) => sum + item.quantity, 0)}</p>
              <p className="text-xs text-muted-foreground">{bundle.items.length} unique products</p>
            </div>
          </CardContent>
        </Card>

        {/* Pricing Card - Order 4 on mobile */}
        <Card>
          <CardHeader className="pb-3 sm:pb-6">
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <DollarSign className="h-4 w-4 sm:h-5 sm:w-5" />
              Pricing
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-6 space-y-4">
            {/* Base Price */}
            <div>
              <p className="text-xs sm:text-sm font-medium text-muted-foreground">Base Price (Sum of Items)</p>
              <p className="text-lg sm:text-2xl font-bold">{basePrice.totalCzk.toFixed(2)} Kč</p>
              <p className="text-xs sm:text-sm text-muted-foreground">€{basePrice.totalEur.toFixed(2)}</p>
            </div>
            
            <Separator />
            
            {/* Bundle Price */}
            <div>
              <p className="text-xs sm:text-sm font-medium text-muted-foreground">Bundle Price</p>
              <p className="text-lg sm:text-2xl font-bold text-green-600 dark:text-green-400">
                {parseFloat(bundle.priceCzk || '0').toFixed(2)} Kč
              </p>
              <p className="text-xs sm:text-sm text-green-600 dark:text-green-400">
                €{parseFloat(bundle.priceEur || '0').toFixed(2)}
              </p>
            </div>
            
            <Separator />
            
            {/* Savings */}
            <div>
              <p className="text-xs sm:text-sm font-medium text-muted-foreground">Customer Savings</p>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="default" className="bg-green-500 text-xs sm:text-sm">
                  {savingsPercentage}% OFF
                </Badge>
              </div>
              <p className="text-xs sm:text-sm mt-2">
                Save {savings.czk.toFixed(2)} Kč
              </p>
              <p className="text-xs text-muted-foreground">
                Save €{savings.eur.toFixed(2)}
              </p>
            </div>
            
            {bundle.discountPercentage && parseFloat(bundle.discountPercentage) > 0 && (
              <>
                <Separator />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Discount Applied</p>
                  <Badge variant="secondary">
                    {bundle.discountPercentage}% Discount
                  </Badge>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}