import { useState, useEffect } from 'react';
import { useLocation, useParams } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { ArrowLeft, Plus, X, Package, Save, AlertCircle, Check, Loader2, Search, CheckSquare, Square, Hash, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
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
  variantIds?: string[]; // Support multiple variants
  quantity: number;
  productName?: string;
  variantNames?: string[]; // Names of selected variants
  priceCzk: number;
  priceEur: number;
}

interface BundleFormData {
  name: string;
  description: string;
  sku: string;
  pricingMode: 'percentage' | 'fixed' | 'per_item' | 'set_per_item' | 'manual';
  discountPercentage: string;
  discountFixedCzk: string;
  discountFixedEur: string;
  perItemDiscountCzk: string;
  perItemDiscountEur: string;
  setPerItemPriceCzk: string;
  setPerItemPriceEur: string;
  priceCzk: string;
  priceEur: string;
  notes: string;
  items: BundleItem[];
}

// Variant selector component
interface VariantSelectorProps {
  variants: ProductVariant[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}

function VariantSelector({ variants, selectedIds, onChange }: VariantSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectionMode, setSelectionMode] = useState<'individual' | 'range' | 'custom'>('individual');
  const [rangeFrom, setRangeFrom] = useState('');
  const [rangeTo, setRangeTo] = useState('');
  const [customInput, setCustomInput] = useState('');

  const filteredVariants = variants.filter(v => 
    v.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    v.barcode?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectAll = () => {
    onChange(variants.map(v => v.id));
  };

  const handleClearAll = () => {
    onChange([]);
  };

  const handleToggleVariant = (variantId: string) => {
    if (selectedIds.includes(variantId)) {
      onChange(selectedIds.filter(id => id !== variantId));
    } else {
      onChange([...selectedIds, variantId]);
    }
  };

  const handleRangeSelection = () => {
    const from = parseInt(rangeFrom);
    const to = parseInt(rangeTo);
    if (!isNaN(from) && !isNaN(to)) {
      const selectedVariants = variants.filter(v => {
        const match = v.name.match(/\d+/);
        if (match) {
          const num = parseInt(match[0]);
          return num >= from && num <= to;
        }
        return false;
      });
      onChange(selectedVariants.map(v => v.id));
    }
  };

  const handleCustomInput = () => {
    const numbers = customInput.split(',').map(s => s.trim());
    const selectedVariants = variants.filter(v => {
      return numbers.some(num => v.name.includes(num));
    });
    onChange(selectedVariants.map(v => v.id));
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="justify-between w-full">
          {selectedIds.length === 0 ? (
            <span className="text-muted-foreground">Select variants...</span>
          ) : (
            <span>{selectedIds.length} variant{selectedIds.length !== 1 ? 's' : ''} selected</span>
          )}
          <ChevronDown className="ml-2 h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">Select Variants</h4>
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" onClick={handleSelectAll}>
                Select All
              </Button>
              <Button size="sm" variant="ghost" onClick={handleClearAll}>
                Clear
              </Button>
            </div>
          </div>

          <Tabs value={selectionMode} onValueChange={(v) => setSelectionMode(v as any)}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="individual">Individual</TabsTrigger>
              <TabsTrigger value="range">Range</TabsTrigger>
              <TabsTrigger value="custom">Custom</TabsTrigger>
            </TabsList>

            <TabsContent value="individual" className="mt-4">
              <div className="space-y-2">
                <Input
                  placeholder="Search variants..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="mb-2"
                />
                <div className="max-h-[200px] overflow-y-auto space-y-1">
                  {filteredVariants.map(variant => (
                    <div
                      key={variant.id}
                      className="flex items-center space-x-2 p-2 hover:bg-muted rounded cursor-pointer"
                      onClick={() => handleToggleVariant(variant.id)}
                    >
                      <Checkbox
                        checked={selectedIds.includes(variant.id)}
                        onCheckedChange={() => {}}
                      />
                      <span className="text-sm flex-1">{variant.name}</span>
                      {variant.barcode && (
                        <span className="text-xs text-muted-foreground">{variant.barcode}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="range" className="mt-4 space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>From Number</Label>
                  <Input
                    type="number"
                    value={rangeFrom}
                    onChange={(e) => setRangeFrom(e.target.value)}
                    placeholder="e.g., 1"
                  />
                </div>
                <div>
                  <Label>To Number</Label>
                  <Input
                    type="number"
                    value={rangeTo}
                    onChange={(e) => setRangeTo(e.target.value)}
                    placeholder="e.g., 50"
                  />
                </div>
              </div>
              <Button onClick={handleRangeSelection} className="w-full">
                Select Range
              </Button>
            </TabsContent>

            <TabsContent value="custom" className="mt-4 space-y-3">
              <div>
                <Label>Enter Numbers (comma-separated)</Label>
                <Textarea
                  value={customInput}
                  onChange={(e) => setCustomInput(e.target.value)}
                  placeholder="e.g., 1, 5, 10, 15-20, 25"
                  rows={3}
                />
              </div>
              <Button onClick={handleCustomInput} className="w-full">
                Apply Custom Selection
              </Button>
            </TabsContent>
          </Tabs>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default function EditBundle() {
  const [, setLocation] = useLocation();
  const { id } = useParams() as { id: string };
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('details');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoadingVariants, setIsLoadingVariants] = useState<Record<string, boolean>>({});
  const [variantsCache, setVariantsCache] = useState<Record<string, ProductVariant[]>>({});
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  // Fetch existing bundle data
  const { data: bundleData, isLoading: isLoadingBundle } = useQuery<any>({
    queryKey: [`/api/bundles/${id}`],
    enabled: !!id,
  });

  const [formData, setFormData] = useState<BundleFormData>({
    name: '',
    description: '',
    sku: '',
    pricingMode: 'percentage',
    discountPercentage: '10',
    discountFixedCzk: '0',
    discountFixedEur: '0',
    perItemDiscountCzk: '0',
    perItemDiscountEur: '0',
    setPerItemPriceCzk: '0',
    setPerItemPriceEur: '0',
    priceCzk: '',
    priceEur: '',
    notes: '',
    items: [],
  });

  // Load bundle data when fetched
  useEffect(() => {
    if (bundleData) {
      // Determine pricing mode based on existing data
      let pricingMode: BundleFormData['pricingMode'] = 'manual';
      
      // Calculate total price from items
      let totalCzk = 0;
      let totalEur = 0;
      
      if (bundleData.items) {
        bundleData.items.forEach((item: any) => {
          const variantCount = item.variants?.length || 1;
          totalCzk += (parseFloat(item.product?.priceCzk || 0) * item.quantity * variantCount);
          totalEur += (parseFloat(item.product?.priceEur || 0) * item.quantity * variantCount);
        });
      }

      const bundlePriceCzk = parseFloat(bundleData.priceCzk || 0);
      const bundlePriceEur = parseFloat(bundleData.priceEur || 0);
      
      // Try to determine the pricing mode
      if (bundleData.discountPercentage && parseFloat(bundleData.discountPercentage) > 0) {
        pricingMode = 'percentage';
      } else if (totalCzk > 0 && bundlePriceCzk !== totalCzk) {
        pricingMode = 'manual';
      }

      // Group bundle items by product to consolidate variants
      const groupedItems: Record<string, any> = {};
      
      bundleData.items?.forEach((item: any) => {
        const productId = item.productId || item.product?.id;
        if (!productId) return;
        
        if (!groupedItems[productId]) {
          groupedItems[productId] = {
            id: Math.random().toString(36).substr(2, 9),
            productId,
            variantIds: [],
            variantNames: [],
            quantity: item.quantity || 1,
            productName: item.product?.name,
            priceCzk: parseFloat(item.product?.priceCzk || 0),
            priceEur: parseFloat(item.product?.priceEur || 0),
          };
        }
        
        // Add variant if present
        if (item.variantId && item.variant) {
          groupedItems[productId].variantIds.push(item.variantId);
          groupedItems[productId].variantNames.push(item.variant.name);
        } else if (item.variantId) {
          // If we have variantId but no variant object, just add the ID
          groupedItems[productId].variantIds.push(item.variantId);
        }
        
        // If this is a duplicate product with different quantity, take the max
        groupedItems[productId].quantity = Math.max(
          groupedItems[productId].quantity,
          item.quantity || 1
        );
      });
      
      const transformedItems: BundleItem[] = Object.values(groupedItems);

      setFormData({
        name: bundleData.name || '',
        description: bundleData.description || '',
        sku: bundleData.sku || '',
        pricingMode,
        discountPercentage: bundleData.discountPercentage?.toString() || '0',
        discountFixedCzk: '0',
        discountFixedEur: '0',
        perItemDiscountCzk: '0',
        perItemDiscountEur: '0',
        setPerItemPriceCzk: '0',
        setPerItemPriceEur: '0',
        priceCzk: bundleData.priceCzk?.toString() || '',
        priceEur: bundleData.priceEur?.toString() || '',
        notes: bundleData.notes || '',
        items: transformedItems,
      });

      // Load variants for all items with products
      transformedItems.forEach(item => {
        if (item.productId) {
          loadVariants(item.productId);
        }
      });
    }
  }, [bundleData]);

  // Fetch products for dropdown
  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ['/api/products'],
  });

  // Update bundle mutation
  const updateBundleMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest(`/api/bundles/${id}`, 'PUT', data);
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Bundle updated successfully',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/bundles'] });
      queryClient.invalidateQueries({ queryKey: [`/api/bundles/${id}`] });
      setLocation('/inventory/bundles');
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update bundle',
        variant: 'destructive',
      });
    },
  });

  const loadVariants = async (productId: string) => {
    if (variantsCache[productId] || isLoadingVariants[productId]) {
      return;
    }

    setIsLoadingVariants(prev => ({ ...prev, [productId]: true }));
    
    try {
      const response = await fetch(`/api/products/${productId}/variants`);
      if (response.ok) {
        const variants = await response.json();
        setVariantsCache(prev => ({ ...prev, [productId]: variants }));
        
        // Update variant names for items that have this product and selected variants
        setFormData(prev => ({
          ...prev,
          items: prev.items.map(item => {
            if (item.productId === productId && item.variantIds && item.variantIds.length > 0) {
              // Update variant names based on the loaded variants
              const variantNames = item.variantIds.map((variantId: string) => {
                const variant = variants.find((v: any) => v.id === variantId);
                return variant?.name || '';
              }).filter(Boolean);
              
              return {
                ...item,
                variantNames: variantNames
              };
            }
            return item;
          })
        }));
      }
    } catch (error) {
      console.error('Failed to load variants:', error);
    } finally {
      setIsLoadingVariants(prev => ({ ...prev, [productId]: false }));
    }
  };

  const toggleItemExpanded = (itemId: string) => {
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

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Bundle name is required';
    }

    if (formData.items.length === 0) {
      newErrors.items = 'At least one product is required';
    }

    // Validate each item
    formData.items.forEach((item, index) => {
      if (!item.productId) {
        newErrors[`item_${item.id}`] = 'Product selection is required';
      }
      if (!item.quantity || item.quantity <= 0) {
        newErrors[`quantity_${item.id}`] = 'Quantity must be greater than 0';
      }
    });

    // Validate pricing based on mode
    if (formData.pricingMode === 'manual') {
      if (!formData.priceCzk || parseFloat(formData.priceCzk) <= 0) {
        newErrors.priceCzk = 'Price CZK is required when using manual pricing';
      }
      if (!formData.priceEur || parseFloat(formData.priceEur) <= 0) {
        newErrors.priceEur = 'Price EUR is required when using manual pricing';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validateForm()) {
      // Switch to the first tab with errors
      if (errors.name || errors.description) {
        setActiveTab('details');
      } else if (errors.items || Object.keys(errors).some(key => key.startsWith('item_') || key.startsWith('quantity_'))) {
        setActiveTab('items');
      } else if (errors.priceCzk || errors.priceEur) {
        setActiveTab('pricing');
      }
      
      toast({
        title: 'Validation Error',
        description: 'Please fix the errors before submitting',
        variant: 'destructive',
      });
      return;
    }

    const { totalCzk, totalEur } = calculateTotalPrice();
    const discountedPrice = calculateDiscountedPrice(totalCzk, totalEur);

    // Build the request payload - handle multiple variants by creating separate items
    const bundleItems: any[] = [];
    formData.items.forEach(item => {
      if (item.variantIds && item.variantIds.length > 0) {
        // Create separate items for each variant
        item.variantIds.forEach(variantId => {
          bundleItems.push({
            productId: item.productId,
            variantId: variantId,
            quantity: item.quantity,
          });
        });
      } else {
        // No variants, just add the product
        bundleItems.push({
          productId: item.productId,
          variantId: null,
          quantity: item.quantity,
        });
      }
    });

    const payload = {
      name: formData.name,
      description: formData.description,
      sku: formData.sku || null,
      priceCzk: discountedPrice.czk,
      priceEur: discountedPrice.eur,
      discountPercentage: formData.pricingMode === 'percentage' ? parseFloat(formData.discountPercentage) : 0,
      notes: formData.notes || null,
      items: bundleItems,
    };

    updateBundleMutation.mutate(payload);
  };

  const handleAddItem = () => {
    const newItem: BundleItem = {
      id: Math.random().toString(36).substr(2, 9),
      productId: '',
      variantIds: [],
      quantity: 1,
      priceCzk: 0,
      priceEur: 0,
    };
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, newItem],
    }));
  };

  const handleRemoveItem = (itemId: string) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter(item => item.id !== itemId),
    }));
    
    // Clear any errors for this item
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[`item_${itemId}`];
      delete newErrors[`quantity_${itemId}`];
      return newErrors;
    });
  };

  const handleItemChange = (itemId: string, field: keyof BundleItem, value: any) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map(item => {
        if (item.id === itemId) {
          const updatedItem = { ...item, [field]: value };
          
          // If product changed, update price and load variants
          if (field === 'productId') {
            const product = products.find(p => p.id === value);
            if (product) {
              updatedItem.productName = product.name;
              updatedItem.priceCzk = parseFloat(product.priceCzk || '0');
              updatedItem.priceEur = parseFloat(product.priceEur || '0');
              updatedItem.variantIds = [];
              updatedItem.variantNames = [];
              
              // Load variants for this product
              loadVariants(value);
            }
          }
          
          // If variants changed, update variant names
          if (field === 'variantIds') {
            const variants = variantsCache[item.productId];
            if (variants) {
              updatedItem.variantNames = value.map((id: string) => 
                variants.find(v => v.id === id)?.name || ''
              ).filter(Boolean);
            } else {
              updatedItem.variantNames = [];
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
      const variantMultiplier = item.variantIds?.length || 1;
      totalCzk += item.priceCzk * item.quantity * variantMultiplier;
      totalEur += item.priceEur * item.quantity * variantMultiplier;
    });

    return { totalCzk, totalEur };
  };

  const calculateDiscountedPrice = (baseCzk: number, baseEur: number) => {
    switch (formData.pricingMode) {
      case 'percentage': {
        const discount = parseFloat(formData.discountPercentage || '0');
        return {
          czk: baseCzk * (1 - discount / 100),
          eur: baseEur * (1 - discount / 100)
        };
      }
      case 'fixed': {
        const fixedCzk = parseFloat(formData.discountFixedCzk || '0');
        const fixedEur = parseFloat(formData.discountFixedEur || '0');
        return {
          czk: Math.max(0, baseCzk - fixedCzk),
          eur: Math.max(0, baseEur - fixedEur)
        };
      }
      case 'per_item': {
        const perItemCzk = parseFloat(formData.perItemDiscountCzk || '0');
        const perItemEur = parseFloat(formData.perItemDiscountEur || '0');
        const totalItems = formData.items.reduce((sum, item) => {
          const variantCount = item.variantIds?.length || 1;
          return sum + (item.quantity * variantCount);
        }, 0);
        return {
          czk: Math.max(0, baseCzk - (perItemCzk * totalItems)),
          eur: Math.max(0, baseEur - (perItemEur * totalItems))
        };
      }
      case 'set_per_item': {
        const setPriceCzk = parseFloat(formData.setPerItemPriceCzk || '0');
        const setPriceEur = parseFloat(formData.setPerItemPriceEur || '0');
        const totalItems = formData.items.reduce((sum, item) => {
          const variantCount = item.variantIds?.length || 1;
          return sum + (item.quantity * variantCount);
        }, 0);
        return {
          czk: setPriceCzk * totalItems,
          eur: setPriceEur * totalItems
        };
      }
      case 'manual': {
        const manualCzk = parseFloat(formData.priceCzk || '0');
        const manualEur = parseFloat(formData.priceEur || '0');
        return {
          czk: manualCzk || baseCzk,
          eur: manualEur || baseEur
        };
      }
      default:
        return { czk: baseCzk, eur: baseEur };
    }
  };

  const totals = calculateTotalPrice();

  if (isLoadingBundle) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

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
            <h1 className="text-3xl font-bold">Edit Bundle</h1>
            <p className="text-muted-foreground">
              Update bundle configuration and pricing
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
            disabled={updateBundleMutation.isPending}
          >
            {updateBundleMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Updating...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Update Bundle
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
                    <Card key={item.id} className={errors[`item_${item.id}`] || errors[`quantity_${item.id}`] ? 'border-destructive' : ''}>
                      <CardContent className="pt-6">
                        <div className="space-y-4">
                          <div className="flex items-start gap-4">
                            <div className="flex-1 space-y-4">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <Label>Product</Label>
                                  <Select
                                    value={item.productId}
                                    onValueChange={(value) => handleItemChange(item.id, 'productId', value)}
                                  >
                                    <SelectTrigger className={errors[`item_${item.id}`] ? 'border-destructive' : ''}>
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
                                  {errors[`item_${item.id}`] && (
                                    <p className="text-sm text-destructive mt-1">{errors[`item_${item.id}`]}</p>
                                  )}
                                </div>

                                <div>
                                  <Label>Quantity</Label>
                                  <Input
                                    type="number"
                                    min="1"
                                    value={item.quantity}
                                    onChange={(e) => handleItemChange(item.id, 'quantity', parseInt(e.target.value) || 1)}
                                    className={errors[`quantity_${item.id}`] ? 'border-destructive' : ''}
                                  />
                                  {errors[`quantity_${item.id}`] && (
                                    <p className="text-sm text-destructive mt-1">{errors[`quantity_${item.id}`]}</p>
                                  )}
                                </div>
                              </div>

                              {/* Variant Selector */}
                              {item.productId && (
                                <div>
                                  <Label>Variants (Optional)</Label>
                                  {isLoadingVariants[item.productId] ? (
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                      Loading variants...
                                    </div>
                                  ) : variantsCache[item.productId] && variantsCache[item.productId].length > 0 ? (
                                    <div className="space-y-2">
                                      <VariantSelector
                                        variants={variantsCache[item.productId]}
                                        selectedIds={item.variantIds || []}
                                        onChange={(ids) => handleItemChange(item.id, 'variantIds', ids)}
                                      />
                                      
                                      {/* Show selected variants */}
                                      {item.variantIds && item.variantIds.length > 0 && (
                                        <div className="mt-2">
                                          <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => toggleItemExpanded(item.id)}
                                            className="w-full justify-between"
                                          >
                                            <span className="text-sm">
                                              {item.variantIds.length} variant{item.variantIds.length !== 1 ? 's' : ''} selected
                                            </span>
                                            {expandedItems.has(item.id) ? (
                                              <ChevronUp className="h-4 w-4" />
                                            ) : (
                                              <ChevronDown className="h-4 w-4" />
                                            )}
                                          </Button>
                                          
                                          {expandedItems.has(item.id) && (
                                            <div className="mt-2 p-3 bg-muted rounded-lg max-h-48 overflow-y-auto">
                                              <div className="flex flex-wrap gap-2">
                                                {item.variantNames?.map((name, idx) => (
                                                  <Badge 
                                                    key={idx} 
                                                    variant="secondary"
                                                    className="cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
                                                    onClick={() => {
                                                      const newIds = [...(item.variantIds || [])];
                                                      newIds.splice(idx, 1);
                                                      handleItemChange(item.id, 'variantIds', newIds);
                                                    }}
                                                  >
                                                    {name}
                                                    <X className="ml-1 h-3 w-3" />
                                                  </Badge>
                                                ))}
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  ) : (
                                    <p className="text-sm text-muted-foreground">No variants available</p>
                                  )}
                                </div>
                              )}

                              {/* Price Display */}
                              {item.productName && (
                                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                  <span>Price: {item.priceCzk.toFixed(2)} CZK / {item.priceEur.toFixed(2)} EUR</span>
                                  {item.variantIds && item.variantIds.length > 0 && (
                                    <span>× {item.variantIds.length} variants</span>
                                  )}
                                  <span>× {item.quantity} qty</span>
                                  <span className="font-medium text-foreground">
                                    = {(item.priceCzk * item.quantity * (item.variantIds?.length || 1)).toFixed(2)} CZK
                                  </span>
                                </div>
                              )}
                            </div>

                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemoveItem(item.id)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* Total Summary */}
              {formData.items.length > 0 && (
                <Card className="bg-muted/50">
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Total Component Value:</span>
                      <div className="text-right">
                        <p className="font-semibold">{totals.totalCzk.toFixed(2)} CZK</p>
                        <p className="text-sm text-muted-foreground">{totals.totalEur.toFixed(2)} EUR</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pricing" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Bundle Pricing</CardTitle>
              <CardDescription>
                Configure how the bundle should be priced
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Pricing Mode</Label>
                <Select
                  value={formData.pricingMode}
                  onValueChange={(value: any) => setFormData(prev => ({ ...prev, pricingMode: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage Discount</SelectItem>
                    <SelectItem value="fixed">Fixed Amount Discount</SelectItem>
                    <SelectItem value="per_item">Per Item Discount</SelectItem>
                    <SelectItem value="set_per_item">Set Price Per Item</SelectItem>
                    <SelectItem value="manual">Manual Pricing</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Dynamic pricing inputs based on mode */}
              {formData.pricingMode === 'percentage' && (
                <div>
                  <Label>Discount Percentage</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={formData.discountPercentage}
                      onChange={(e) => setFormData(prev => ({ ...prev, discountPercentage: e.target.value }))}
                    />
                    <span className="text-muted-foreground">%</span>
                  </div>
                </div>
              )}

              {formData.pricingMode === 'fixed' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Discount Amount (CZK)</Label>
                    <Input
                      type="number"
                      min="0"
                      value={formData.discountFixedCzk}
                      onChange={(e) => setFormData(prev => ({ ...prev, discountFixedCzk: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label>Discount Amount (EUR)</Label>
                    <Input
                      type="number"
                      min="0"
                      value={formData.discountFixedEur}
                      onChange={(e) => setFormData(prev => ({ ...prev, discountFixedEur: e.target.value }))}
                    />
                  </div>
                </div>
              )}

              {formData.pricingMode === 'per_item' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Discount Per Item (CZK)</Label>
                    <Input
                      type="number"
                      min="0"
                      value={formData.perItemDiscountCzk}
                      onChange={(e) => setFormData(prev => ({ ...prev, perItemDiscountCzk: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label>Discount Per Item (EUR)</Label>
                    <Input
                      type="number"
                      min="0"
                      value={formData.perItemDiscountEur}
                      onChange={(e) => setFormData(prev => ({ ...prev, perItemDiscountEur: e.target.value }))}
                    />
                  </div>
                </div>
              )}

              {formData.pricingMode === 'set_per_item' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Price Per Item (CZK)</Label>
                    <Input
                      type="number"
                      min="0"
                      value={formData.setPerItemPriceCzk}
                      onChange={(e) => setFormData(prev => ({ ...prev, setPerItemPriceCzk: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label>Price Per Item (EUR)</Label>
                    <Input
                      type="number"
                      min="0"
                      value={formData.setPerItemPriceEur}
                      onChange={(e) => setFormData(prev => ({ ...prev, setPerItemPriceEur: e.target.value }))}
                    />
                  </div>
                </div>
              )}

              {formData.pricingMode === 'manual' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Bundle Price (CZK)</Label>
                    <Input
                      type="number"
                      min="0"
                      value={formData.priceCzk}
                      onChange={(e) => {
                        setFormData(prev => ({ ...prev, priceCzk: e.target.value }));
                        if (errors.priceCzk) {
                          setErrors(prev => ({ ...prev, priceCzk: '' }));
                        }
                      }}
                      className={errors.priceCzk ? 'border-destructive' : ''}
                    />
                    {errors.priceCzk && (
                      <p className="text-sm text-destructive mt-1">{errors.priceCzk}</p>
                    )}
                  </div>
                  <div>
                    <Label>Bundle Price (EUR)</Label>
                    <Input
                      type="number"
                      min="0"
                      value={formData.priceEur}
                      onChange={(e) => {
                        setFormData(prev => ({ ...prev, priceEur: e.target.value }));
                        if (errors.priceEur) {
                          setErrors(prev => ({ ...prev, priceEur: '' }));
                        }
                      }}
                      className={errors.priceEur ? 'border-destructive' : ''}
                    />
                    {errors.priceEur && (
                      <p className="text-sm text-destructive mt-1">{errors.priceEur}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Price Preview */}
              <Separator />
              <div className="space-y-4">
                <h4 className="font-medium">Price Preview</h4>
                {(() => {
                  const discounted = calculateDiscountedPrice(totals.totalCzk, totals.totalEur);
                  const savingsCzk = totals.totalCzk - discounted.czk;
                  const savingsEur = totals.totalEur - discounted.eur;
                  const savingsPercent = totals.totalCzk > 0 ? (savingsCzk / totals.totalCzk * 100) : 0;

                  return (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Component Total:</span>
                            <span>{totals.totalCzk.toFixed(2)} CZK</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Bundle Price:</span>
                            <span className="font-semibold">{discounted.czk.toFixed(2)} CZK</span>
                          </div>
                          {savingsCzk > 0 && (
                            <div className="flex justify-between text-sm text-green-600">
                              <span>Customer Saves:</span>
                              <span>{savingsCzk.toFixed(2)} CZK</span>
                            </div>
                          )}
                        </div>

                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Component Total:</span>
                            <span>{totals.totalEur.toFixed(2)} EUR</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Bundle Price:</span>
                            <span className="font-semibold">{discounted.eur.toFixed(2)} EUR</span>
                          </div>
                          {savingsEur > 0 && (
                            <div className="flex justify-between text-sm text-green-600">
                              <span>Customer Saves:</span>
                              <span>{savingsEur.toFixed(2)} EUR</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {savingsPercent > 0 && (
                        <Alert>
                          <Check className="h-4 w-4" />
                          <AlertDescription>
                            Customers save {savingsPercent.toFixed(1)}% by purchasing this bundle
                          </AlertDescription>
                        </Alert>
                      )}
                    </>
                  );
                })()}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}