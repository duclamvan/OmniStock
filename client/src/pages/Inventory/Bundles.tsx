import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Package, 
  Plus, 
  Edit, 
  Trash2, 
  Search, 
  Layers, 
  X,
  ShoppingBag,
  DollarSign,
  Info
} from 'lucide-react';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { ProductBundle, Product, ProductVariant } from '@shared/schema';
import { useTranslation } from 'react-i18next';

interface BundleItem {
  productId?: string;
  variantId?: string;
  quantity: number;
  productName?: string;
  variantName?: string;
  priceCzk?: number;
  priceEur?: number;
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

export default function Bundles() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingBundle, setEditingBundle] = useState<ProductBundle | null>(null);
  const [selectedProductVariants, setSelectedProductVariants] = useState<{[key: string]: ProductVariant[]}>({});
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

  // Fetch bundles
  const { data: bundles = [], isLoading } = useQuery<ProductBundle[]>({
    queryKey: ['/api/bundles']
  });

  // Fetch products for selection
  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ['/api/products']
  });

  // Fetch bundle items when editing
  const { data: bundleItems = [] } = useQuery<BundleItem[]>({
    queryKey: editingBundle ? [`/api/bundles/${editingBundle.id}/items`] : null,
    enabled: !!editingBundle
  });

  // Fetch variants for selected products
  useEffect(() => {
    const fetchVariants = async () => {
      const productIds = [...new Set(formData.items.map(item => item.productId).filter(Boolean))];
      const variantData: {[key: string]: ProductVariant[]} = {};
      
      for (const productId of productIds) {
        if (productId && !selectedProductVariants[productId]) {
          try {
            const response = await fetch(`/api/products/${productId}/variants`);
            if (response.ok) {
              const variants = await response.json();
              variantData[productId] = variants;
            }
          } catch (error) {
            console.error(`Failed to fetch variants for product ${productId}:`, error);
          }
        }
      }
      
      if (Object.keys(variantData).length > 0) {
        setSelectedProductVariants(prev => ({ ...prev, ...variantData }));
      }
    };
    
    if (formData.items.length > 0) {
      fetchVariants();
    }
  }, [formData.items, selectedProductVariants]);

  // Create bundle mutation
  const createBundleMutation = useMutation({
    mutationFn: (data: BundleFormData) => 
      apiRequest('POST', '/api/bundles', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/bundles'] });
      setIsCreateDialogOpen(false);
      resetForm();
      toast({
        title: t('inventory:success'),
        description: t('inventory:bundleCreated')
      });
    },
    onError: () => {
      toast({
        title: t('inventory:error'),
        description: t('inventory:failedToCreateBundle'),
        variant: 'destructive'
      });
    }
  });

  // Update bundle mutation
  const updateBundleMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: BundleFormData }) =>
      apiRequest('PUT', `/api/bundles/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/bundles'] });
      setEditingBundle(null);
      resetForm();
      toast({
        title: t('inventory:success'),
        description: t('inventory:bundleUpdated')
      });
    },
    onError: () => {
      toast({
        title: t('inventory:error'),
        description: t('inventory:failedToUpdateBundle'),
        variant: 'destructive'
      });
    }
  });

  // Delete bundle mutation
  const deleteBundleMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest('DELETE', `/api/bundles/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/bundles'] });
      toast({
        title: t('inventory:success'),
        description: t('inventory:bundleDeleted')
      });
    },
    onError: () => {
      toast({
        title: t('inventory:error'),
        description: t('inventory:failedToDeleteBundle'),
        variant: 'destructive'
      });
    }
  });

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      sku: '',
      priceCzk: '',
      priceEur: '',
      discountPercentage: '0',
      notes: '',
      items: []
    });
  };

  const handleAddItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, { quantity: 1 }]
    }));
  };

  const handleRemoveItem = (index: number) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const handleItemChange = (index: number, field: keyof BundleItem, value: any) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map((item, i) => {
        if (i === index) {
          const updatedItem = { ...item, [field]: value };
          
          // Update product name and prices when product is selected
          if (field === 'productId') {
            const product = products.find(p => p.id === value);
            if (product) {
              updatedItem.productName = product.name;
              updatedItem.variantId = undefined;
              updatedItem.variantName = undefined;
              updatedItem.priceCzk = parseFloat(product.priceCzk || '0');
              updatedItem.priceEur = parseFloat(product.priceEur || '0');
            }
          }
          
          // Update variant name when variant is selected
          if (field === 'variantId' && item.productId) {
            const variants = selectedProductVariants[item.productId];
            const variant = variants?.find(v => v.id === value);
            if (variant) {
              updatedItem.variantName = variant.name;
            }
          }
          
          return updatedItem;
        }
        return item;
      })
    }));
  };

  const handleSubmit = () => {
    if (!formData.name || formData.items.length === 0) {
      toast({
        title: t('inventory:error'),
        description: t('inventory:provideNameAndItem'),
        variant: 'destructive'
      });
      return;
    }

    if (editingBundle) {
      updateBundleMutation.mutate({ id: editingBundle.id, data: formData });
    } else {
      createBundleMutation.mutate(formData);
    }
  };

  const handleEdit = (bundle: ProductBundle) => {
    setEditingBundle(bundle);
    setFormData({
      name: bundle.name,
      description: bundle.description || '',
      sku: bundle.sku || '',
      priceCzk: bundle.priceCzk || '',
      priceEur: bundle.priceEur || '',
      discountPercentage: bundle.discountPercentage || '0',
      notes: bundle.notes || '',
      items: []
    });
  };

  const calculateTotalPrice = (items: BundleItem[]) => {
    let totalCzk = 0;
    let totalEur = 0;

    items.forEach(item => {
      if (item.priceCzk && item.priceEur) {
        totalCzk += (item.priceCzk * item.quantity);
        totalEur += (item.priceEur * item.quantity);
      }
    });

    return { totalCzk, totalEur };
  };

  const calculateDiscountedPrice = (totalPrice: number, discountPercentage: string) => {
    const discount = parseFloat(discountPercentage || '0');
    return totalPrice * (1 - discount / 100);
  };

  const filteredBundles = bundles.filter(bundle =>
    bundle.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    bundle.bundleId.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (bundle.sku && bundle.sku.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 p-2 sm:p-4 md:p-6 max-w-full overflow-x-hidden">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold">{t('inventory:productBundles')}</h1>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto">
              <Plus className="mr-2 h-4 w-4" />
              {t('inventory:createBundle')}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingBundle ? t('inventory:editBundle') : t('inventory:createNewBundle')}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                <div>
                  <Label htmlFor="name">{t('inventory:bundleName')}</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder={t('inventory:bundleNamePlaceholder')}
                  />
                </div>
                <div>
                  <Label htmlFor="sku">{t('inventory:skuOptional')}</Label>
                  <Input
                    id="sku"
                    value={formData.sku}
                    onChange={(e) => setFormData(prev => ({ ...prev, sku: e.target.value }))}
                    placeholder={t('inventory:skuPlaceholder')}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="description">{t('inventory:description')}</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder={t('inventory:descriptionPlaceholder')}
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
                <div>
                  <Label htmlFor="priceCzk">{t('inventory:priceCzk')}</Label>
                  <Input
                    id="priceCzk"
                    type="number"
                    step="0.01"
                    value={formData.priceCzk}
                    onChange={(e) => setFormData(prev => ({ ...prev, priceCzk: e.target.value }))}
                    placeholder={t('inventory:discountPlaceholder')}
                  />
                </div>
                <div>
                  <Label htmlFor="priceEur">{t('inventory:priceEur')}</Label>
                  <Input
                    id="priceEur"
                    type="number"
                    step="0.01"
                    value={formData.priceEur}
                    onChange={(e) => setFormData(prev => ({ ...prev, priceEur: e.target.value }))}
                    placeholder={t('inventory:discountPlaceholder')}
                  />
                </div>
                <div>
                  <Label htmlFor="discount">{t('inventory:discountPercentage')}</Label>
                  <Input
                    id="discount"
                    type="number"
                    step="0.01"
                    value={formData.discountPercentage}
                    onChange={(e) => setFormData(prev => ({ ...prev, discountPercentage: e.target.value }))}
                    placeholder={t('inventory:discountPlaceholder')}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <Label>{t('inventory:bundleItems')}</Label>
                  <Button type="button" size="sm" variant="outline" onClick={handleAddItem}>
                    <Plus className="mr-1 h-3 w-3" />
                    {t('inventory:addItem')}
                  </Button>
                </div>
                <div className="space-y-3">
                  {formData.items.map((item, index) => (
                    <Card key={index} className="p-3">
                      <div className="space-y-3">
                        <div className="flex gap-2">
                          <div className="flex-1 space-y-2">
                            <Label className="text-xs">{t('inventory:product')}</Label>
                            <Select
                              value={item.productId}
                              onValueChange={(value) => handleItemChange(index, 'productId', value)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder={t('inventory:selectProduct')} />
                              </SelectTrigger>
                              <SelectContent>
                                {products.map(product => (
                                  <SelectItem key={product.id} value={product.id}>
                                    <div className="flex items-center justify-between w-full">
                                      <span>{product.name}</span>
                                      <span className="text-xs text-muted-foreground ml-2">({product.sku})</span>
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          
                          {item.productId && selectedProductVariants[item.productId]?.length > 0 && (
                            <div className="flex-1 space-y-2">
                              <Label className="text-xs">{t('inventory:variant')} ({t('inventory:optional')})</Label>
                              <Select
                                value={item.variantId || "NONE"}
                                onValueChange={(value) => handleItemChange(index, 'variantId', value === "NONE" ? null : value)}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder={t('inventory:selectVariant')} />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="NONE">{t('inventory:noVariant')}</SelectItem>
                                  {selectedProductVariants[item.productId].map(variant => (
                                    <SelectItem key={variant.id} value={variant.id}>
                                      {variant.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          )}
                          
                          <div className="w-24 space-y-2">
                            <Label className="text-xs">{t('inventory:quantity')}</Label>
                            <Input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value) || 1)}
                              placeholder={t('inventory:qty')}
                            />
                          </div>
                          
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="mt-6"
                            onClick={() => handleRemoveItem(index)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                        
                        {item.productName && (
                          <div className="flex items-center justify-between text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                            <span>{item.productName} {item.variantName && `- ${item.variantName}`}</span>
                            <span>
                              {item.priceCzk && item.priceEur && (
                                <>
                                  {item.quantity} × (CZK {item.priceCzk.toFixed(2)} / EUR {item.priceEur.toFixed(2)})
                                </>
                              )}
                            </span>
                          </div>
                        )}
                      </div>
                    </Card>
                  ))}
                  {formData.items.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      {t('inventory:noItemsAdded')}
                    </p>
                  )}
                </div>
              </div>

              {formData.items.length > 0 && (
                <Card className="p-4 bg-muted/50">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">{t('inventory:componentTotal')}:</span>
                      <div className="text-right">
                        <div className="text-sm font-medium">CZK {calculateTotalPrice(formData.items).totalCzk.toFixed(2)}</div>
                        <div className="text-sm text-muted-foreground">EUR {calculateTotalPrice(formData.items).totalEur.toFixed(2)}</div>
                      </div>
                    </div>
                    
                    {formData.discountPercentage && parseFloat(formData.discountPercentage) > 0 && (
                      <>
                        <div className="border-t pt-2 flex justify-between items-center">
                          <span className="text-sm">{t('inventory:bundleDiscount')} ({formData.discountPercentage}%):</span>
                          <div className="text-right">
                            <div className="text-sm text-red-600">
                              -CZK {(calculateTotalPrice(formData.items).totalCzk * parseFloat(formData.discountPercentage) / 100).toFixed(2)}
                            </div>
                            <div className="text-sm text-red-600">
                              -EUR {(calculateTotalPrice(formData.items).totalEur * parseFloat(formData.discountPercentage) / 100).toFixed(2)}
                            </div>
                          </div>
                        </div>
                        
                        <div className="border-t pt-2 flex justify-between items-center">
                          <span className="text-sm font-medium">{t('inventory:suggestedPrice')}:</span>
                          <div className="text-right">
                            <div className="text-sm font-bold text-green-600">
                              CZK {calculateDiscountedPrice(calculateTotalPrice(formData.items).totalCzk, formData.discountPercentage).toFixed(2)}
                            </div>
                            <div className="text-sm font-bold text-green-600">
                              EUR {calculateDiscountedPrice(calculateTotalPrice(formData.items).totalEur, formData.discountPercentage).toFixed(2)}
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                    
                    {(formData.priceCzk || formData.priceEur) && (
                      <div className="border-t pt-2 flex justify-between items-center">
                        <span className="text-sm font-medium">{t('inventory:manualBundlePrice')}:</span>
                        <div className="text-right">
                          {formData.priceCzk && <div className="text-sm font-bold">CZK {parseFloat(formData.priceCzk).toFixed(2)}</div>}
                          {formData.priceEur && <div className="text-sm font-bold">EUR {parseFloat(formData.priceEur).toFixed(2)}</div>}
                        </div>
                      </div>
                    )}
                  </div>
                </Card>
              )}

              <div>
                <Label htmlFor="notes">{t('inventory:notesOptional')}</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder={t('inventory:additionalNotesPlaceholder')}
                  rows={2}
                />
              </div>

              <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
                <Button
                  variant="outline"
                  className="w-full sm:w-auto"
                  onClick={() => {
                    setIsCreateDialogOpen(false);
                    setEditingBundle(null);
                    resetForm();
                  }}
                >
                  {t('inventory:cancel')}
                </Button>
                <Button
                  className="w-full sm:w-auto"
                  onClick={handleSubmit}
                  disabled={createBundleMutation.isPending || updateBundleMutation.isPending}
                >
                  {editingBundle ? t('inventory:updateBundle') : t('inventory:createBundle')}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          placeholder={t('inventory:searchBundles')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredBundles.map(bundle => (
          <Card key={bundle.id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <CardTitle className="text-lg line-clamp-1">{bundle.name}</CardTitle>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-xs text-muted-foreground">{bundle.bundleId}</p>
                    {bundle.sku && (
                      <>
                        <span className="text-xs text-muted-foreground">•</span>
                        <p className="text-xs text-muted-foreground">SKU: {bundle.sku}</p>
                      </>
                    )}
                  </div>
                </div>
                <Badge variant="secondary" className="ml-2">
                  <Layers className="mr-1 h-3 w-3" />
                  {t('inventory:bundle')}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {bundle.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">{bundle.description}</p>
                )}
                
                <div className="space-y-2 py-2 border-t border-b">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">{t('inventory:bundlePrice')}:</span>
                    <div className="text-right">
                      {bundle.priceCzk && (
                        <p className="text-sm font-semibold">CZK {parseFloat(bundle.priceCzk).toFixed(2)}</p>
                      )}
                      {bundle.priceEur && (
                        <p className="text-xs text-muted-foreground">EUR {parseFloat(bundle.priceEur).toFixed(2)}</p>
                      )}
                    </div>
                  </div>

                  {bundle.discountPercentage && parseFloat(bundle.discountPercentage) > 0 && (
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        <DollarSign className="mr-1 h-3 w-3" />
                        {parseFloat(bundle.discountPercentage).toFixed(0)}% {t('inventory:bundleSavings')}
                      </Badge>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => handleEdit(bundle)}
                  >
                    <Edit className="mr-1 h-3 w-3" />
                    {t('inventory:edit')}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      if (confirm(t('inventory:areYouSureDeleteBundle', { name: bundle.name }))) {
                        deleteBundleMutation.mutate(bundle.id);
                      }
                    }}
                  >
                    <Trash2 className="mr-1 h-3 w-3" />
                    {t('inventory:delete')}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredBundles.length === 0 && (
        <div className="text-center py-12">
          <Package className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-2 text-sm font-semibold">{t('inventory:noBundlesFound')}</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {searchQuery ? t('inventory:tryAdjustingSearchCriteria') : t('inventory:createYourFirstBundle')}
          </p>
        </div>
      )}
    </div>
  );
}