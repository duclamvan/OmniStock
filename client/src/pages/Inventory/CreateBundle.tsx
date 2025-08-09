import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { ArrowLeft, Plus, X, Package, Save, AlertCircle, Check, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import type { Product, ProductVariant, ProductBundle } from '@shared/schema';

interface BundleItem {
  id: string; // Unique ID for React key
  productId: string;
  variantId?: string;
  quantity: number;
  productName?: string;
  variantName?: string;
  priceCzk: number;
  priceEur: number;
}

interface BundleFormData {
  name: string;
  description: string;
  sku: string;
  priceCzk: string;
  priceEur: string;
  discountPercentage: string;
  notes: string;
  items: BundleItem[];
}

export default function CreateBundle() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('details');
  const [variantsCache, setVariantsCache] = useState<Record<string, ProductVariant[]>>({});
  const [loadingVariants, setLoadingVariants] = useState<Record<string, boolean>>({});
  
  const [formData, setFormData] = useState<BundleFormData>({
    name: '',
    description: '',
    sku: '',
    priceCzk: '',
    priceEur: '',
    discountPercentage: '0',
    notes: '',
    items: []
  });

  // Validation states
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fetch products
  const { data: products = [], isLoading: loadingProducts } = useQuery<Product[]>({
    queryKey: ['/api/products'],
  });

  // Fetch variants for a product
  const fetchVariants = async (productId: string) => {
    if (variantsCache[productId] || loadingVariants[productId]) return;
    
    setLoadingVariants(prev => ({ ...prev, [productId]: true }));
    try {
      const response = await fetch(`/api/products/${productId}/variants`);
      if (response.ok) {
        const variants = await response.json();
        setVariantsCache(prev => ({ ...prev, [productId]: variants }));
      }
    } catch (error) {
      console.error(`Failed to fetch variants for product ${productId}:`, error);
    } finally {
      setLoadingVariants(prev => ({ ...prev, [productId]: false }));
    }
  };

  // Load variants when items change
  useEffect(() => {
    formData.items.forEach(item => {
      if (item.productId) {
        fetchVariants(item.productId);
      }
    });
  }, [formData.items]);

  // Create bundle mutation
  const createBundleMutation = useMutation({
    mutationFn: async (data: BundleFormData) => {
      // Create the bundle
      const bundleData = {
        name: data.name,
        description: data.description || null,
        sku: data.sku || null,
        priceCzk: data.priceCzk ? parseFloat(data.priceCzk) : null,
        priceEur: data.priceEur ? parseFloat(data.priceEur) : null,
        discountPercentage: data.discountPercentage ? parseFloat(data.discountPercentage) : 0,
        notes: data.notes || null,
        isActive: true
      };
      
      const bundle = await apiRequest('/api/bundles', {
        method: 'POST',
        body: JSON.stringify(bundleData)
      });

      // Create bundle items
      if (data.items.length > 0) {
        const itemsData = data.items.map(item => ({
          bundleId: bundle.id,
          productId: item.productId,
          variantId: item.variantId || null,
          quantity: item.quantity
        }));

        await apiRequest(`/api/bundles/${bundle.id}/items`, {
          method: 'POST',
          body: JSON.stringify(itemsData)
        });
      }

      return bundle;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/bundles'] });
      toast({
        title: 'Success',
        description: 'Bundle created successfully',
      });
      setLocation('/inventory/bundles');
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create bundle',
        variant: 'destructive',
      });
    }
  });

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Bundle name is required';
    }
    
    if (formData.items.length === 0) {
      newErrors.items = 'At least one product is required';
    }
    
    formData.items.forEach((item, index) => {
      if (!item.productId) {
        newErrors[`item_${index}`] = 'Product selection is required';
      }
      if (item.quantity <= 0) {
        newErrors[`quantity_${index}`] = 'Quantity must be greater than 0';
      }
    });
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validateForm()) {
      toast({
        title: 'Validation Error',
        description: 'Please fix the errors before submitting',
        variant: 'destructive',
      });
      return;
    }
    
    createBundleMutation.mutate(formData);
  };

  const handleAddItem = () => {
    const newItem: BundleItem = {
      id: `item_${Date.now()}`,
      productId: '',
      quantity: 1,
      priceCzk: 0,
      priceEur: 0
    };
    
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, newItem]
    }));
    
    // Clear item errors when adding new item
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors.items;
      return newErrors;
    });
  };

  const handleRemoveItem = (itemId: string) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter(item => item.id !== itemId)
    }));
  };

  const handleItemChange = (itemId: string, field: keyof BundleItem, value: any) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map(item => {
        if (item.id === itemId) {
          const updatedItem = { ...item, [field]: value };
          
          // Update product details when product is selected
          if (field === 'productId' && value) {
            const product = products.find(p => p.id === value);
            if (product) {
              updatedItem.productName = product.name;
              updatedItem.variantId = undefined;
              updatedItem.variantName = undefined;
              updatedItem.priceCzk = parseFloat(product.priceCzk || '0');
              updatedItem.priceEur = parseFloat(product.priceEur || '0');
              
              // Fetch variants for the new product
              fetchVariants(value);
            }
          }
          
          // Update variant name when variant is selected
          if (field === 'variantId' && item.productId) {
            const variants = variantsCache[item.productId];
            if (value && variants) {
              const variant = variants.find(v => v.id === value);
              if (variant) {
                updatedItem.variantName = variant.name;
              }
            } else {
              updatedItem.variantName = undefined;
            }
          }
          
          return updatedItem;
        }
        return item;
      })
    }));
    
    // Clear specific item error when it's modified
    if (field === 'productId' || field === 'quantity') {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[`item_${itemId}`];
        delete newErrors[`quantity_${itemId}`];
        return newErrors;
      });
    }
  };

  const calculateTotalPrice = () => {
    let totalCzk = 0;
    let totalEur = 0;

    formData.items.forEach(item => {
      totalCzk += item.priceCzk * item.quantity;
      totalEur += item.priceEur * item.quantity;
    });

    return { totalCzk, totalEur };
  };

  const calculateDiscountedPrice = (price: number) => {
    const discount = parseFloat(formData.discountPercentage || '0');
    return price * (1 - discount / 100);
  };

  const totals = calculateTotalPrice();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation('/inventory/bundles')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Create Bundle</h1>
            <p className="text-muted-foreground">
              Combine multiple products into a single bundle offering
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setLocation('/inventory/bundles')}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={createBundleMutation.isPending}
          >
            {createBundleMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Create Bundle
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Form Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="details">Bundle Details</TabsTrigger>
          <TabsTrigger value="items">
            Products ({formData.items.length})
            {errors.items && <span className="ml-1 text-destructive">•</span>}
          </TabsTrigger>
          <TabsTrigger value="pricing">Pricing</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>
                Define the bundle name, description, and other details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="name">
                  Bundle Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => {
                    setFormData(prev => ({ ...prev, name: e.target.value }));
                    if (errors.name) {
                      setErrors(prev => ({ ...prev, name: '' }));
                    }
                  }}
                  placeholder="e.g., Starter Beauty Kit"
                  className={errors.name ? 'border-destructive' : ''}
                />
                {errors.name && (
                  <p className="text-sm text-destructive mt-1">{errors.name}</p>
                )}
              </div>

              <div>
                <Label htmlFor="sku">SKU (Optional)</Label>
                <Input
                  id="sku"
                  value={formData.sku}
                  onChange={(e) => setFormData(prev => ({ ...prev, sku: e.target.value }))}
                  placeholder="e.g., BDL-001"
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe what this bundle includes and its benefits"
                  rows={4}
                />
              </div>

              <div>
                <Label htmlFor="notes">Internal Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Notes for internal use only"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="items" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Bundle Products</CardTitle>
                  <CardDescription>
                    Select products and quantities to include in this bundle
                  </CardDescription>
                </div>
                <Button onClick={handleAddItem} size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Product
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {errors.items && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{errors.items}</AlertDescription>
                </Alert>
              )}

              {formData.items.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed rounded-lg">
                  <Package className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No products added</h3>
                  <p className="text-muted-foreground mb-4">
                    Add products to create your bundle
                  </p>
                  <Button onClick={handleAddItem}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add First Product
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {formData.items.map((item, index) => (
                    <Card key={item.id} className="p-4">
                      <div className="space-y-3">
                        <div className="flex gap-3">
                          <div className="flex-1">
                            <Label className="text-xs">Product</Label>
                            <Select
                              value={item.productId}
                              onValueChange={(value) => handleItemChange(item.id, 'productId', value)}
                            >
                              <SelectTrigger className={errors[`item_${item.id}`] ? 'border-destructive' : ''}>
                                <SelectValue placeholder="Select a product" />
                              </SelectTrigger>
                              <SelectContent>
                                {products.map(product => (
                                  <SelectItem key={product.id} value={product.id}>
                                    <div className="flex items-center justify-between w-full">
                                      <span>{product.name}</span>
                                      <span className="text-xs text-muted-foreground ml-2">
                                        SKU: {product.sku}
                                      </span>
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {errors[`item_${item.id}`] && (
                              <p className="text-xs text-destructive mt-1">{errors[`item_${item.id}`]}</p>
                            )}
                          </div>

                          {item.productId && variantsCache[item.productId]?.length > 0 && (
                            <div className="flex-1">
                              <Label className="text-xs">Variant (Optional)</Label>
                              <Select
                                value={item.variantId || 'none'}
                                onValueChange={(value) => 
                                  handleItemChange(item.id, 'variantId', value === 'none' ? undefined : value)
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="No variant" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">No variant</SelectItem>
                                  {variantsCache[item.productId].map(variant => (
                                    <SelectItem key={variant.id} value={variant.id}>
                                      {variant.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          )}

                          <div className="w-32">
                            <Label className="text-xs">Quantity</Label>
                            <Input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => 
                                handleItemChange(item.id, 'quantity', parseInt(e.target.value) || 1)
                              }
                              className={errors[`quantity_${item.id}`] ? 'border-destructive' : ''}
                            />
                            {errors[`quantity_${item.id}`] && (
                              <p className="text-xs text-destructive mt-1">Invalid</p>
                            )}
                          </div>

                          <Button
                            variant="ghost"
                            size="icon"
                            className="mt-6"
                            onClick={() => handleRemoveItem(item.id)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>

                        {item.productName && (
                          <div className="flex items-center justify-between text-sm bg-muted px-3 py-2 rounded">
                            <span className="font-medium">
                              {item.productName}
                              {item.variantName && ` - ${item.variantName}`}
                            </span>
                            <span className="text-muted-foreground">
                              {item.quantity} × CZK {item.priceCzk.toFixed(2)} / EUR {item.priceEur.toFixed(2)}
                            </span>
                          </div>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pricing" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Bundle Pricing</CardTitle>
              <CardDescription>
                Set the bundle price and discount
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Component Total */}
              {formData.items.length > 0 && (
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-3">Component Breakdown</h4>
                    <div className="space-y-2">
                      {formData.items.filter(item => item.productId).map((item) => (
                        <div key={item.id} className="flex justify-between text-sm">
                          <span className="text-muted-foreground">
                            {item.productName}
                            {item.variantName && ` - ${item.variantName}`}
                            {' '}× {item.quantity}
                          </span>
                          <div className="text-right">
                            <div>CZK {(item.priceCzk * item.quantity).toFixed(2)}</div>
                            <div className="text-xs text-muted-foreground">
                              EUR {(item.priceEur * item.quantity).toFixed(2)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  <div className="flex justify-between font-semibold">
                    <span>Total Component Value</span>
                    <div className="text-right">
                      <div>CZK {totals.totalCzk.toFixed(2)}</div>
                      <div className="text-sm text-muted-foreground">
                        EUR {totals.totalEur.toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <Separator />

              {/* Bundle Discount */}
              <div>
                <Label htmlFor="discount">Bundle Discount (%)</Label>
                <Input
                  id="discount"
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={formData.discountPercentage}
                  onChange={(e) => setFormData(prev => ({ ...prev, discountPercentage: e.target.value }))}
                  placeholder="0"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Discount applied to the total component value
                </p>
              </div>

              {/* Suggested Price */}
              {formData.items.length > 0 && parseFloat(formData.discountPercentage || '0') > 0 && (
                <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-semibold text-green-900 dark:text-green-100">
                        Suggested Bundle Price
                      </p>
                      <p className="text-sm text-green-700 dark:text-green-300">
                        After {formData.discountPercentage}% discount
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-green-900 dark:text-green-100">
                        CZK {calculateDiscountedPrice(totals.totalCzk).toFixed(2)}
                      </div>
                      <div className="text-sm text-green-700 dark:text-green-300">
                        EUR {calculateDiscountedPrice(totals.totalEur).toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <Separator />

              {/* Manual Price Override */}
              <div className="space-y-4">
                <h4 className="font-semibold">Manual Bundle Price (Optional)</h4>
                <p className="text-sm text-muted-foreground">
                  Override the suggested price with a custom amount
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="priceCzk">Price CZK</Label>
                    <Input
                      id="priceCzk"
                      type="number"
                      step="0.01"
                      value={formData.priceCzk}
                      onChange={(e) => setFormData(prev => ({ ...prev, priceCzk: e.target.value }))}
                      placeholder={calculateDiscountedPrice(totals.totalCzk).toFixed(2)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="priceEur">Price EUR</Label>
                    <Input
                      id="priceEur"
                      type="number"
                      step="0.01"
                      value={formData.priceEur}
                      onChange={(e) => setFormData(prev => ({ ...prev, priceEur: e.target.value }))}
                      placeholder={calculateDiscountedPrice(totals.totalEur).toFixed(2)}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}