import { useState, useEffect } from 'react';
import { useLocation, useParams } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { ArrowLeft, Plus, X, Package, Save, AlertCircle, Check, Loader2, Search, CheckSquare, Square, Hash, ChevronDown, ChevronUp, Image as ImageIcon, Upload, Trash2, DollarSign } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
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
import { useTranslation } from 'react-i18next';
import type { Product, ProductBundle } from '@shared/schema';

interface ProductVariant {
  id: string;
  productId: string;
  name: string;
  sku?: string;
  barcode?: string;
  quantity: number;
}

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
    if (!isNaN(from) && !isNaN(to) && from <= to) {
      const selectedVariants = variants.filter(v => {
        const match = v.name.match(/\d+/);
        if (match) {
          const num = parseInt(match[0]);
          return num >= from && num <= to;
        }
        return false;
      });
      onChange(selectedVariants.map(v => v.id));
      // Clear the inputs after selection
      setRangeFrom('');
      setRangeTo('');
    }
  };

  const handleCustomInput = () => {
    const numbers = customInput.split(',').map(s => s.trim()).filter(s => s);
    if (numbers.length > 0) {
      const selectedVariants = variants.filter(v => {
        return numbers.some(num => v.name.includes(num));
      });
      onChange(selectedVariants.map(v => v.id));
      // Clear the input after selection
      setCustomInput('');
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="justify-between w-full">
          {selectedIds.length === 0 ? (
            <span className="text-gray-500 dark:text-gray-400">Select variants...</span>
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

          <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
            Choose one selection method:
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
                      className="flex items-center space-x-2 p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded cursor-pointer"
                      onClick={() => handleToggleVariant(variant.id)}
                    >
                      <Checkbox
                        checked={selectedIds.includes(variant.id)}
                        onCheckedChange={() => {}}
                      />
                      <span className="text-sm flex-1">{variant.name}</span>
                      {variant.barcode && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">{variant.barcode}</span>
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
  const { t } = useTranslation();
  const [expandedSections, setExpandedSections] = useState<string[]>(['details', 'items', 'pricing']);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoadingVariants, setIsLoadingVariants] = useState<Record<string, boolean>>({});
  const [variantsCache, setVariantsCache] = useState<Record<string, ProductVariant[]>>({});
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [searchQueries, setSearchQueries] = useState<Record<string, string>>({});
  const [openPopovers, setOpenPopovers] = useState<Record<string, boolean>>({});
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null);

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
      // Load existing image
      if (bundleData.imageUrl) {
        setExistingImageUrl(bundleData.imageUrl);
      }
      
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
      return apiRequest('PUT', `/api/bundles/${id}`, data);
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

  const handleSubmit = async () => {
    if (!validateForm()) {
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

    // Upload image if there's a new one
    let imageUrl = existingImageUrl;
    if (imageFile) {
      try {
        const formData = new FormData();
        formData.append('image', imageFile);
        
        const uploadResponse = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });
        
        if (!uploadResponse.ok) {
          throw new Error('Failed to upload image');
        }
        
        const uploadData = await uploadResponse.json();
        imageUrl = uploadData.imageUrl;
      } catch (error) {
        toast({
          title: 'Image Upload Error',
          description: 'Failed to upload image. Bundle will be saved without image.',
          variant: 'destructive',
        });
      }
    }

    const payload = {
      name: formData.name,
      description: formData.description,
      sku: formData.sku || null,
      priceCzk: discountedPrice.czk,
      priceEur: discountedPrice.eur,
      discountPercentage: formData.pricingMode === 'percentage' ? parseFloat(formData.discountPercentage) : 0,
      notes: formData.notes || null,
      items: bundleItems,
      imageUrl: imageUrl || null,
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
            onClick={() => window.history.back()}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{t('inventory:editBundle')}</h1>
            <p className="text-muted-foreground">
              {t('inventory:updateBundleConfigurationAndPricing')}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setLocation('/inventory/bundles')}
          >
            {t('inventory:cancel')}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={updateBundleMutation.isPending}
          >
            {updateBundleMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t('inventory:updating')}...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                {t('inventory:updateBundle')}
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Form Sections */}
      <Accordion type="multiple" value={expandedSections} onValueChange={setExpandedSections} className="space-y-3">
        {/* Basic Information Section */}
        <AccordionItem value="details" className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-slate-50">
            <div className="flex items-center gap-3 text-left">
              <div className="p-2 bg-emerald-100 rounded-lg">
                <Package className="h-4 w-4 text-emerald-600" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">{t('inventory:bundleDetails')}</h3>
                <p className="text-xs text-slate-500">{t('inventory:nameDescriptionSkuAndImage')}</p>
              </div>
              {errors.name && <AlertCircle className="h-4 w-4 text-destructive ml-2" />}
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <div className="space-y-4 pt-2">
              {/* Bundle Image Upload - First and Most Important */}
              <div>
                <Label>{t('inventory:bundleImageOptional')}</Label>
                <div className="mt-2">
                  {(imagePreview || existingImageUrl) ? (
                    <div className="relative w-48 h-48 rounded-lg border bg-slate-50 overflow-hidden group flex items-center justify-center">
                      <img
                        src={imagePreview || existingImageUrl || ''}
                        alt="Bundle preview"
                        className="w-full h-full object-contain"
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <label className="cursor-pointer">
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                setImageFile(file);
                                setImagePreview(URL.createObjectURL(file));
                              }
                            }}
                          />
                          <div className="p-2 bg-white rounded-full hover:bg-slate-100 transition-colors">
                            <Upload className="h-4 w-4 text-slate-700" />
                          </div>
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            if (imagePreview) {
                              URL.revokeObjectURL(imagePreview);
                            }
                            setImageFile(null);
                            setImagePreview(null);
                            setExistingImageUrl(null);
                          }}
                          className="p-2 bg-white rounded-full hover:bg-red-50 transition-colors"
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center w-48 h-48 border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:border-slate-400 hover:bg-slate-50 transition-colors">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setImageFile(file);
                            setImagePreview(URL.createObjectURL(file));
                          }
                        }}
                      />
                      <div className="text-center">
                        <ImageIcon className="h-12 w-12 mx-auto text-slate-400 mb-2" />
                        <p className="text-sm text-slate-600 font-medium">{t('inventory:uploadImage')}</p>
                        <p className="text-xs text-slate-500 mt-1">{t('inventory:clickToBrowse')}</p>
                      </div>
                    </label>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="name">
                  {t('inventory:bundleName')} <span className="text-destructive">*</span>
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
                  placeholder={t('inventory:bundleNamePlaceholder')}
                  className={errors.name ? 'border-destructive' : ''}
                />
                {errors.name && (
                  <p className="text-sm text-destructive mt-1">{errors.name}</p>
                )}
              </div>

              <div>
                <Label htmlFor="sku">{t('inventory:skuOptional')}</Label>
                <Input
                  id="sku"
                  value={formData.sku}
                  onChange={(e) => setFormData(prev => ({ ...prev, sku: e.target.value }))}
                  placeholder={t('inventory:bundleSkuPlaceholderSimple')}
                />
              </div>

              <div>
                <Label htmlFor="description">{t('inventory:description')}</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder={t('inventory:bundleDescriptionPlaceholder')}
                  rows={4}
                />
              </div>

              <div>
                <Label htmlFor="notes">{t('inventory:internalNotesOptional')}</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder={t('inventory:internalNotesPlaceholder')}
                  rows={3}
                />
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Products Section */}
        <AccordionItem value="items" className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-slate-50">
            <div className="flex items-center gap-3 text-left">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Plus className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">
                  {t('inventory:bundleProducts')} ({formData.items.length})
                </h3>
                <p className="text-xs text-slate-500">{t('inventory:selectProductsAndQuantities')}</p>
              </div>
              {errors.items && <AlertCircle className="h-4 w-4 text-destructive ml-2" />}
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <div className="space-y-4 pt-2">
              <div className="flex justify-end">
                <Button onClick={handleAddItem} size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  {t('inventory:addProduct')}
                </Button>
              </div>
              {errors.items && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{errors.items}</AlertDescription>
                </Alert>
              )}

              {formData.items.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed rounded-lg">
                  <Package className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">{t('inventory:noProductsAdded')}</h3>
                  <p className="text-muted-foreground mb-4">
                    {t('inventory:addProductsToBundle')}
                  </p>
                  <Button onClick={handleAddItem}>
                    <Plus className="mr-2 h-4 w-4" />
                    {t('inventory:addFirstProduct')}
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
                                  <Label>{t('inventory:product')}</Label>
                                  <div className="relative">
                                    <Input
                                      value={searchQueries[item.id] || item.productName || ''}
                                      onChange={(e) => {
                                        setSearchQueries(prev => ({ ...prev, [item.id]: e.target.value }));
                                        setOpenPopovers(prev => ({ ...prev, [item.id]: true }));
                                      }}
                                      onFocus={() => setOpenPopovers(prev => ({ ...prev, [item.id]: true }))}
                                      onBlur={() => {
                                        // Delay closing to allow click on dropdown
                                        setTimeout(() => setOpenPopovers(prev => ({ ...prev, [item.id]: false })), 200);
                                      }}
                                      placeholder={t('inventory:typeToSearchProducts')}
                                      className={errors[`item_${item.id}`] ? 'border-destructive' : ''}
                                      data-testid={`input-search-product-${index}`}
                                    />
                                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                                    
                                    {/* Dropdown results */}
                                    {openPopovers[item.id] && (
                                      <div className="absolute z-50 w-full mt-1 bg-background border rounded-md shadow-lg max-h-64 overflow-auto">
                                        {(() => {
                                          const query = searchQueries[item.id] || '';
                                          const filteredProducts = products.filter(p => {
                                            if (!query) return true;
                                            return p.name.toLowerCase().includes(query.toLowerCase()) ||
                                                   p.sku?.toLowerCase().includes(query.toLowerCase());
                                          });
                                          
                                          if (filteredProducts.length === 0) {
                                            return (
                                              <div className="p-4 text-center text-sm text-muted-foreground">
                                                {t('inventory:noProductsFound')}
                                              </div>
                                            );
                                          }
                                          
                                          return filteredProducts.map((product) => (
                                            <button
                                              key={product.id}
                                              type="button"
                                              onClick={() => {
                                                handleItemChange(item.id, 'productId', product.id);
                                                setOpenPopovers(prev => ({ ...prev, [item.id]: false }));
                                                setSearchQueries(prev => ({ ...prev, [item.id]: '' }));
                                              }}
                                              className={`w-full px-3 py-2 text-left text-sm hover:bg-accent transition-colors flex items-center justify-between ${
                                                item.productId === product.id ? 'bg-accent' : ''
                                              }`}
                                              data-testid={`product-option-${product.id}`}
                                            >
                                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                                {item.productId === product.id && (
                                                  <Check className="h-4 w-4 text-primary flex-shrink-0" />
                                                )}
                                                <span className="truncate">{product.name}</span>
                                              </div>
                                              <span className="text-xs text-muted-foreground ml-2 flex-shrink-0">
                                                {product.sku}
                                              </span>
                                            </button>
                                          ));
                                        })()}
                                      </div>
                                    )}
                                  </div>
                                  {errors[`item_${item.id}`] && (
                                    <p className="text-sm text-destructive mt-1">{errors[`item_${item.id}`]}</p>
                                  )}
                                </div>

                                <div>
                                  <Label>{t('inventory:quantity')}</Label>
                                  <Input
                                    type="number"
                                    min="1"
                                    value={item.quantity}
                                    onChange={(e) => handleItemChange(item.id, 'quantity', parseInt(e.target.value) || 1)}
                                    className={errors[`quantity_${item.id}`] ? 'border-destructive' : ''}
                                    data-testid={`input-quantity-${index}`}
                                  />
                                  {errors[`quantity_${item.id}`] && (
                                    <p className="text-sm text-destructive mt-1">{errors[`quantity_${item.id}`]}</p>
                                  )}
                                </div>
                              </div>

                              {/* Variant Selector */}
                              {item.productId && variantsCache[item.productId]?.length > 0 && (
                                <div>
                                  <Label>{t('inventory:variantsOptional')}</Label>
                                  <VariantSelector
                                    variants={variantsCache[item.productId]}
                                    selectedIds={item.variantIds || []}
                                    onChange={(ids) => handleItemChange(item.id, 'variantIds', ids)}
                                  />
                                </div>
                              )}

                              {/* Price Display */}
                              {item.productName && (
                                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                  <span>{t('inventory:price')}: {item.priceCzk.toFixed(2)} CZK / {item.priceEur.toFixed(2)} EUR</span>
                                  {item.variantIds && item.variantIds.length > 0 && (
                                    <span>× {item.variantIds.length} {t('inventory:variants')}</span>
                                  )}
                                  <span>× {item.quantity} {t('inventory:qty')}</span>
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
                      <span className="text-sm text-muted-foreground">{t('inventory:totalComponentValue')}:</span>
                      <div className="text-right">
                        <p className="font-semibold">{totals.totalCzk.toFixed(2)} CZK</p>
                        <p className="text-sm text-muted-foreground">{totals.totalEur.toFixed(2)} EUR</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Pricing Section */}
        <AccordionItem value="pricing" className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-slate-50">
            <div className="flex items-center gap-3 text-left">
              <div className="p-2 bg-amber-100 rounded-lg">
                <DollarSign className="h-4 w-4 text-amber-600" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">{t('inventory:bundlePricing')}</h3>
                <p className="text-xs text-slate-500">{t('inventory:configureHowBundlePriced')}</p>
              </div>
              {(errors.priceCzk || errors.priceEur) && <AlertCircle className="h-4 w-4 text-destructive ml-2" />}
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <div className="space-y-4 pt-2">
              <div>
                <Label>{t('inventory:pricingMode')}</Label>
                <Select
                  value={formData.pricingMode}
                  onValueChange={(value: any) => setFormData(prev => ({ ...prev, pricingMode: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">{t('inventory:percentageDiscount')}</SelectItem>
                    <SelectItem value="fixed">{t('inventory:fixedAmountDiscount')}</SelectItem>
                    <SelectItem value="per_item">{t('inventory:perItemDiscount')}</SelectItem>
                    <SelectItem value="set_per_item">{t('inventory:setPricePerItem')}</SelectItem>
                    <SelectItem value="manual">{t('inventory:manualPricing')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Dynamic pricing inputs based on mode */}
              {formData.pricingMode === 'percentage' && (
                <div>
                  <Label>{t('inventory:discountPercentage')}</Label>
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
                    <Label>{t('inventory:discountAmountCzk')}</Label>
                    <Input
                      type="number"
                      min="0"
                      value={formData.discountFixedCzk}
                      onChange={(e) => setFormData(prev => ({ ...prev, discountFixedCzk: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label>{t('inventory:discountAmountEur')}</Label>
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
                    <Label>{t('inventory:discountPerItemCzk')}</Label>
                    <Input
                      type="number"
                      min="0"
                      value={formData.perItemDiscountCzk}
                      onChange={(e) => setFormData(prev => ({ ...prev, perItemDiscountCzk: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label>{t('inventory:discountPerItemEur')}</Label>
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
                    <Label>{t('inventory:pricePerItemCzk')}</Label>
                    <Input
                      type="number"
                      min="0"
                      value={formData.setPerItemPriceCzk}
                      onChange={(e) => setFormData(prev => ({ ...prev, setPerItemPriceCzk: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label>{t('inventory:pricePerItemEur')}</Label>
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
                    <Label>{t('inventory:bundlePriceCzk')}</Label>
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
                    <Label>{t('inventory:bundlePriceEur')}</Label>
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
                <h4 className="font-medium">{t('inventory:pricePreview')}</h4>
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
                            <span className="text-muted-foreground">{t('inventory:componentTotal')}:</span>
                            <span>{totals.totalCzk.toFixed(2)} CZK</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">{t('inventory:bundlePrice')}:</span>
                            <span className="font-semibold">{discounted.czk.toFixed(2)} CZK</span>
                          </div>
                          {savingsCzk > 0 && (
                            <div className="flex justify-between text-sm text-green-600">
                              <span>{t('inventory:customerSaves')}:</span>
                              <span>{savingsCzk.toFixed(2)} CZK</span>
                            </div>
                          )}
                        </div>

                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">{t('inventory:componentTotal')}:</span>
                            <span>{totals.totalEur.toFixed(2)} EUR</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">{t('inventory:bundlePrice')}:</span>
                            <span className="font-semibold">{discounted.eur.toFixed(2)} EUR</span>
                          </div>
                          {savingsEur > 0 && (
                            <div className="flex justify-between text-sm text-green-600">
                              <span>{t('inventory:customerSaves')}:</span>
                              <span>{savingsEur.toFixed(2)} EUR</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {savingsPercent > 0 && (
                        <Alert>
                          <Check className="h-4 w-4" />
                          <AlertDescription>
                            {t('inventory:customersSaveByPurchasingBundle', { percentage: savingsPercent.toFixed(1) })}
                          </AlertDescription>
                        </Alert>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}