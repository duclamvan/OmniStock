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
  ShoppingCart,
  Tag,
  Calendar,
  FileText,
  AlertCircle,
  CheckCircle,
  XCircle,
  Box,
  Hash,
  DollarSign,
  Percent,
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
import type { Bundle, BundleItem, Product, ProductVariant } from '@shared/schema';

interface BundleWithItems extends Bundle {
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
      navigate('/inventory');
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
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link href="/inventory">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Package className="h-8 w-8" />
              {bundle.name}
            </h1>
            <p className="text-muted-foreground mt-1">
              Bundle Details
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => duplicateMutation.mutate()}
            disabled={duplicateMutation.isPending}
          >
            <Copy className="mr-2 h-4 w-4" />
            Duplicate
          </Button>
          
          <Link href={`/inventory/bundles/${id}/edit`}>
            <Button variant="outline">
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </Button>
          </Link>
          
          <Button
            variant={bundle.isActive ? "secondary" : "default"}
            onClick={() => toggleActiveMutation.mutate()}
            disabled={toggleActiveMutation.isPending}
          >
            {bundle.isActive ? (
              <>
                <XCircle className="mr-2 h-4 w-4" />
                Deactivate
              </>
            ) : (
              <>
                <CheckCircle className="mr-2 h-4 w-4" />
                Activate
              </>
            )}
          </Button>
          
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Bundle</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete this bundle? This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => deleteMutation.mutate()}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Information */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Info Card */}
          <Card>
            <CardHeader>
              <CardTitle>Bundle Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
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

          {/* Bundle Items Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Box className="h-5 w-5" />
                Bundle Items ({bundle.items.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {bundle.items.map((item, index) => {
                  const isExpanded = expandedItems.has(index);
                  const productVariants = item.productId ? allVariants[item.productId] || [] : [];
                  
                  return (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-semibold">{item.product.name}</h4>
                            <Badge variant="outline">
                              <Hash className="mr-1 h-3 w-3" />
                              Qty: {item.quantity}
                            </Badge>
                          </div>
                          
                          {item.product.sku && (
                            <p className="text-sm text-muted-foreground">
                              SKU: {item.product.sku}
                            </p>
                          )}
                          
                          {item.variant && (
                            <div className="mt-2 p-2 bg-muted rounded">
                              <p className="text-sm font-medium">Variant: {item.variant.name}</p>
                              {item.variant.sku && (
                                <p className="text-xs text-muted-foreground">
                                  Variant SKU: {item.variant.sku}
                                </p>
                              )}
                            </div>
                          )}
                          
                          <div className="mt-2 grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-xs text-muted-foreground">Unit Price CZK</p>
                              <p className="font-medium">{parseFloat(item.product.priceCzk || '0').toFixed(2)} Kč</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Unit Price EUR</p>
                              <p className="font-medium">€{parseFloat(item.product.priceEur || '0').toFixed(2)}</p>
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
                                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                                    {productVariants.map((variant: any, vIndex: number) => (
                                      <div 
                                        key={vIndex}
                                        className="p-2 bg-background rounded border text-xs"
                                      >
                                        <p className="font-medium truncate" title={variant.name}>
                                          {variant.name || `Color ${vIndex + 1}`}
                                        </p>
                                        {variant.sku && (
                                          <p className="text-muted-foreground truncate" title={variant.sku}>
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
                        
                        <div className="text-right ml-4">
                          <p className="text-xs text-muted-foreground">Subtotal</p>
                          <p className="font-semibold">
                            {(parseFloat(item.product.priceCzk || '0') * item.quantity).toFixed(2)} Kč
                          </p>
                          <p className="text-sm text-muted-foreground">
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
        </div>

        {/* Pricing Sidebar */}
        <div className="space-y-6">
          {/* Pricing Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Pricing
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Base Price */}
              <div>
                <p className="text-sm font-medium text-muted-foreground">Base Price (Sum of Items)</p>
                <p className="text-2xl font-bold">{basePrice.totalCzk.toFixed(2)} Kč</p>
                <p className="text-sm text-muted-foreground">€{basePrice.totalEur.toFixed(2)}</p>
              </div>
              
              <Separator />
              
              {/* Bundle Price */}
              <div>
                <p className="text-sm font-medium text-muted-foreground">Bundle Price</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {parseFloat(bundle.priceCzk || '0').toFixed(2)} Kč
                </p>
                <p className="text-sm text-green-600 dark:text-green-400">
                  €{parseFloat(bundle.priceEur || '0').toFixed(2)}
                </p>
              </div>
              
              <Separator />
              
              {/* Savings */}
              <div>
                <p className="text-sm font-medium text-muted-foreground">Customer Savings</p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="default" className="bg-green-500">
                    <Percent className="mr-1 h-3 w-3" />
                    {savingsPercentage}% OFF
                  </Badge>
                </div>
                <p className="text-sm mt-2">
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

          {/* Quick Actions Card */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link href={`/orders/new?bundle=${id}`}>
                <Button className="w-full" variant="outline">
                  <ShoppingCart className="mr-2 h-4 w-4" />
                  Create Order with Bundle
                </Button>
              </Link>
              
              <Button 
                className="w-full" 
                variant="outline"
                onClick={() => {
                  // Copy bundle details to clipboard
                  const bundleText = `Bundle: ${bundle.name}\nPrice: ${bundle.priceCzk} Kč / €${bundle.priceEur}\nItems: ${bundle.items.length}`;
                  navigator.clipboard.writeText(bundleText);
                  toast({
                    title: 'Copied to clipboard',
                    description: 'Bundle details have been copied.'
                  });
                }}
              >
                <Copy className="mr-2 h-4 w-4" />
                Copy Bundle Details
              </Button>
            </CardContent>
          </Card>

          {/* Statistics Card */}
          <Card>
            <CardHeader>
              <CardTitle>Statistics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Total Items</span>
                <span className="font-medium">{bundle.items.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Total Quantity</span>
                <span className="font-medium">
                  {bundle.items.reduce((sum, item) => sum + item.quantity, 0)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Unique Products</span>
                <span className="font-medium">
                  {new Set(bundle.items.map(item => item.productId)).size}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">With Variants</span>
                <span className="font-medium">
                  {bundle.items.filter(item => item.variantId).length}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}