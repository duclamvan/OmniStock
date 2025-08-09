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
      apiRequest('/api/bundles', {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/bundles'] });
      setIsCreateDialogOpen(false);
      resetForm();
      toast({
        title: 'Success',
        description: 'Bundle created successfully'
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to create bundle',
        variant: 'destructive'
      });
    }
  });

  // Update bundle mutation
  const updateBundleMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: BundleFormData }) =>
      apiRequest(`/api/bundles/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/bundles'] });
      setEditingBundle(null);
      resetForm();
      toast({
        title: 'Success',
        description: 'Bundle updated successfully'
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to update bundle',
        variant: 'destructive'
      });
    }
  });

  // Delete bundle mutation
  const deleteBundleMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest(`/api/bundles/${id}`, {
        method: 'DELETE'
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/bundles'] });
      toast({
        title: 'Success',
        description: 'Bundle deleted successfully'
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to delete bundle',
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
        title: 'Error',
        description: 'Please provide a name and at least one item',
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
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Product Bundles</h1>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Bundle
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingBundle ? 'Edit Bundle' : 'Create New Bundle'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Bundle Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Big Carton Pack"
                  />
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
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe what this bundle contains"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="priceCzk">Price (CZK)</Label>
                  <Input
                    id="priceCzk"
                    type="number"
                    step="0.01"
                    value={formData.priceCzk}
                    onChange={(e) => setFormData(prev => ({ ...prev, priceCzk: e.target.value }))}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label htmlFor="priceEur">Price (EUR)</Label>
                  <Input
                    id="priceEur"
                    type="number"
                    step="0.01"
                    value={formData.priceEur}
                    onChange={(e) => setFormData(prev => ({ ...prev, priceEur: e.target.value }))}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label htmlFor="discount">Discount %</Label>
                  <Input
                    id="discount"
                    type="number"
                    step="0.01"
                    value={formData.discountPercentage}
                    onChange={(e) => setFormData(prev => ({ ...prev, discountPercentage: e.target.value }))}
                    placeholder="0"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <Label>Bundle Items</Label>
                  <Button type="button" size="sm" variant="outline" onClick={handleAddItem}>
                    <Plus className="mr-1 h-3 w-3" />
                    Add Item
                  </Button>
                </div>
                <div className="space-y-3">
                  {formData.items.map((item, index) => (
                    <Card key={index} className="p-3">
                      <div className="space-y-3">
                        <div className="flex gap-2">
                          <div className="flex-1 space-y-2">
                            <Label className="text-xs">Product</Label>
                            <Select
                              value={item.productId}
                              onValueChange={(value) => handleItemChange(index, 'productId', value)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select product" />
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
                              <Label className="text-xs">Variant (Optional)</Label>
                              <Select
                                value={item.variantId}
                                onValueChange={(value) => handleItemChange(index, 'variantId', value)}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select variant" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="">No variant</SelectItem>
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
                            <Label className="text-xs">Quantity</Label>
                            <Input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value) || 1)}
                              placeholder="Qty"
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
                      No items added. Click "Add Item" to include products in this bundle.
                    </p>
                  )}
                </div>
              </div>

              {formData.items.length > 0 && (
                <Card className="p-4 bg-muted/50">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Component Total:</span>
                      <div className="text-right">
                        <div className="text-sm font-medium">CZK {calculateTotalPrice(formData.items).totalCzk.toFixed(2)}</div>
                        <div className="text-sm text-muted-foreground">EUR {calculateTotalPrice(formData.items).totalEur.toFixed(2)}</div>
                      </div>
                    </div>
                    
                    {formData.discountPercentage && parseFloat(formData.discountPercentage) > 0 && (
                      <>
                        <div className="border-t pt-2 flex justify-between items-center">
                          <span className="text-sm">Bundle Discount ({formData.discountPercentage}%):</span>
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
                          <span className="text-sm font-medium">Suggested Price:</span>
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
                        <span className="text-sm font-medium">Manual Bundle Price:</span>
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
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Additional notes about this bundle"
                  rows={2}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsCreateDialogOpen(false);
                    setEditingBundle(null);
                    resetForm();
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={createBundleMutation.isPending || updateBundleMutation.isPending}
                >
                  {editingBundle ? 'Update' : 'Create'} Bundle
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          placeholder="Search bundles..."
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
                  Bundle
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
                    <span className="text-sm text-muted-foreground">Bundle Price:</span>
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
                        {parseFloat(bundle.discountPercentage).toFixed(0)}% Bundle Savings
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
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      if (confirm(`Are you sure you want to delete "${bundle.name}"?`)) {
                        deleteBundleMutation.mutate(bundle.id);
                      }
                    }}
                  >
                    <Trash2 className="mr-1 h-3 w-3" />
                    Delete
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
          <h3 className="mt-2 text-sm font-semibold">No bundles found</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {searchQuery ? 'Try adjusting your search.' : 'Get started by creating a new bundle.'}
          </p>
        </div>
      )}
    </div>
  );
}