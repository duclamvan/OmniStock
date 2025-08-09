import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Package, Plus, Edit, Trash2, Search, Layers } from 'lucide-react';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import type { ProductBundle, Product, ProductVariant } from '@shared/schema';

interface BundleItem {
  productId?: string;
  variantId?: string;
  quantity: number;
  productName?: string;
  variantName?: string;
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
          
          // Update product name when product is selected
          if (field === 'productId') {
            const product = products.find(p => p.id === value);
            if (product) {
              updatedItem.productName = product.name;
              updatedItem.variantId = undefined;
              updatedItem.variantName = undefined;
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
      const product = products.find(p => p.id === item.productId);
      if (product) {
        totalCzk += (parseFloat(product.priceCzk || '0') * item.quantity);
        totalEur += (parseFloat(product.priceEur || '0') * item.quantity);
      }
    });

    return { totalCzk, totalEur };
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
                <div className="space-y-2">
                  {formData.items.map((item, index) => (
                    <div key={index} className="flex gap-2 items-center">
                      <Select
                        value={item.productId}
                        onValueChange={(value) => handleItemChange(index, 'productId', value)}
                      >
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="Select product" />
                        </SelectTrigger>
                        <SelectContent>
                          {products.map(product => (
                            <SelectItem key={product.id} value={product.id}>
                              {product.name} ({product.sku})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value))}
                        className="w-20"
                        placeholder="Qty"
                      />
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={() => handleRemoveItem(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  {formData.items.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No items added. Click "Add Item" to include products in this bundle.
                    </p>
                  )}
                </div>
              </div>

              {formData.items.length > 0 && (
                <div className="bg-muted p-3 rounded-lg">
                  <p className="text-sm font-medium">Total Component Value:</p>
                  <p className="text-sm">
                    CZK {calculateTotalPrice(formData.items).totalCzk.toFixed(2)} | 
                    EUR {calculateTotalPrice(formData.items).totalEur.toFixed(2)}
                  </p>
                </div>
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
          <Card key={bundle.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">{bundle.name}</CardTitle>
                  <p className="text-sm text-muted-foreground">{bundle.bundleId}</p>
                </div>
                <Badge variant="secondary">
                  <Layers className="mr-1 h-3 w-3" />
                  Bundle
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {bundle.description && (
                  <p className="text-sm text-muted-foreground">{bundle.description}</p>
                )}
                
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Price:</span>
                  <div className="text-right">
                    {bundle.priceCzk && (
                      <p className="text-sm">CZK {parseFloat(bundle.priceCzk).toFixed(2)}</p>
                    )}
                    {bundle.priceEur && (
                      <p className="text-sm">EUR {parseFloat(bundle.priceEur).toFixed(2)}</p>
                    )}
                  </div>
                </div>

                {bundle.discountPercentage && parseFloat(bundle.discountPercentage) > 0 && (
                  <Badge variant="outline" className="text-xs">
                    {bundle.discountPercentage}% Discount
                  </Badge>
                )}

                <div className="flex gap-2 mt-4">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEdit(bundle)}
                  >
                    <Edit className="mr-1 h-3 w-3" />
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => deleteBundleMutation.mutate(bundle.id)}
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