import { useState, useEffect } from 'react';
import { useLocation, useParams } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
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
  id: string;
  productId: string;
  variantIds?: string[];
  quantity: number;
  productName?: string;
  variantNames?: string[];
  priceCzk: number;
  priceEur: number;
}

interface BundleFormData {
  name: string;
  nameEn: string;
  nameVi: string;
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

function BundleItemRow({
  item,
  index,
  products,
  variantsCache,
  errors,
  onItemChange,
  onRemoveItem,
}: {
  item: BundleItem;
  index: number;
  products: Product[];
  variantsCache: Record<string, ProductVariant[]>;
  errors: Record<string, string>;
  onItemChange: (id: string, field: string, value: any) => void;
  onRemoveItem: (id: string) => void;
}) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  
  const selectedProduct = products.find(p => p.id === item.productId);

  return (
    <Card className="relative">
      <CardContent className="p-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onRemoveItem(item.id)}
          data-testid={`button-remove-item-${index}`}
          className="absolute top-2 right-2 h-8 w-8"
        >
          <X className="h-4 w-4" />
        </Button>

        <div className="space-y-4">
          <div className="flex gap-3 pr-10">
            <div className="flex-1 space-y-2">
              <Label className="text-sm font-medium">{t('inventory:product')} *</Label>
              <Popover open={isOpen} onOpenChange={setIsOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={isOpen}
                    className={`w-full justify-between ${
                      errors[`item_${item.id}`] ? 'border-destructive' : ''
                    }`}
                    data-testid={`button-select-product-${index}`}
                  >
                    <span className="truncate">
                      {selectedProduct ? selectedProduct.name : t('inventory:selectProduct')}
                    </span>
                    <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[400px] p-0" align="start">
                  <Command>
                    <CommandInput 
                      placeholder={t('inventory:searchProducts')} 
                      className="h-9"
                    />
                    <CommandEmpty>{t('inventory:noProductsFound')}</CommandEmpty>
                    <CommandGroup className="max-h-64 overflow-auto">
                      {products.map((product) => (
                        <CommandItem
                          key={product.id}
                          value={`${product.name} ${product.sku || ''}`}
                          onSelect={() => {
                            onItemChange(item.id, 'productId', product.id);
                            setIsOpen(false);
                          }}
                          data-testid={`product-option-${product.id}`}
                        >
                          <Check
                            className={`mr-2 h-4 w-4 ${
                              item.productId === product.id ? "opacity-100" : "opacity-0"
                            }`}
                          />
                          <div className="flex-1 flex items-center justify-between">
                            <span>{product.name}</span>
                            {product.sku && (
                              <span className="text-xs text-muted-foreground ml-2">
                                {product.sku}
                              </span>
                            )}
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </Command>
                </PopoverContent>
              </Popover>
              {errors[`item_${item.id}`] && (
                <p className="text-xs text-destructive">{errors[`item_${item.id}`]}</p>
              )}
            </div>

            <div className="w-28 space-y-2">
              <Label className="text-sm font-medium">{t('inventory:quantity')}</Label>
              <Input
                type="number"
                min="1"
                value={item.quantity}
                onChange={(e) => 
                  onItemChange(item.id, 'quantity', parseInt(e.target.value) || 1)
                }
                className={errors[`quantity_${item.id}`] ? 'border-destructive' : ''}
                data-testid={`input-quantity-${index}`}
              />
              {errors[`quantity_${item.id}`] && (
                <p className="text-xs text-destructive">{errors[`quantity_${item.id}`]}</p>
              )}
            </div>
          </div>

          {selectedProduct && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground border-t pt-3">
              <Package className="h-4 w-4" />
              <span>
                {item.quantity} × {parseFloat(selectedProduct.priceCzk || '0').toFixed(2)} Kč = 
                <span className="font-semibold text-foreground ml-1">
                  {(item.quantity * parseFloat(selectedProduct.priceCzk || '0')).toFixed(2)} Kč
                </span>
              </span>
              {item.variantIds && item.variantIds.length > 0 && (
                <Badge variant="secondary" className="ml-auto text-xs">
                  {item.variantIds.length} {t('inventory:variantCount', { count: item.variantIds.length })}
                </Badge>
              )}
            </div>
          )}

          {item.productId && variantsCache[item.productId]?.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm font-medium text-muted-foreground">
                {t('inventory:variantsOptional')}
              </Label>
              <VariantSelector
                variants={variantsCache[item.productId]}
                selectedIds={item.variantIds || []}
                onChange={(ids) => onItemChange(item.id, 'variantIds', ids)}
              />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface VariantSelectorProps {
  variants: ProductVariant[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}

function VariantSelector({ variants, selectedIds, onChange }: VariantSelectorProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectionMode, setSelectionMode] = useState<'individual' | 'range' | 'custom'>('individual');
  const [rangeFrom, setRangeFrom] = useState('');
  const [rangeTo, setRangeTo] = useState('');
  const [customInput, setCustomInput] = useState('');

  const filteredVariants = variants.filter(v => 
    v.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    v.sku?.toLowerCase().includes(searchQuery.toLowerCase())
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
      setRangeFrom('');
      setRangeTo('');
    }
  };

  const handleCustomSelection = () => {
    const numbers = customInput.split(',').map(n => n.trim()).filter(n => n);
    if (numbers.length > 0) {
      const selectedVariants = variants.filter(v => {
        const match = v.name.match(/\d+/);
        if (match) {
          return numbers.includes(match[0]);
        }
        return false;
      });
      onChange(selectedVariants.map(v => v.id));
      setCustomInput('');
    }
  };

  const selectedNames = variants
    .filter(v => selectedIds.includes(v.id))
    .map(v => v.name)
    .join(', ');

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full justify-between">
          <span className="truncate">
            {selectedIds.length === 0 
              ? t('inventory:selectVariants') 
              : selectedIds.length === 1
              ? selectedNames
              : t('inventory:variantsSelected', { count: selectedIds.length })}
          </span>
          <Search className="ml-2 h-4 w-4 shrink-0" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>{t('inventory:selectVariants')}</DialogTitle>
          <DialogDescription>
            {t('inventory:chooseVariantsToInclude')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="text-xs text-muted-foreground mb-2">
            {t('inventory:chooseSelectionMethod')}
          </div>
          <Tabs value={selectionMode} onValueChange={(v) => setSelectionMode(v as any)}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="individual">{t('inventory:individual')}</TabsTrigger>
              <TabsTrigger value="range">{t('inventory:range')}</TabsTrigger>
              <TabsTrigger value="custom">{t('inventory:custom')}</TabsTrigger>
            </TabsList>

            <TabsContent value="individual" className="space-y-4">
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder={t('inventory:searchVariants')}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSelectAll}
                >
                  <CheckSquare className="mr-1 h-4 w-4" />
                  {t('inventory:all')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClearAll}
                >
                  <Square className="mr-1 h-4 w-4" />
                  {t('inventory:none')}
                </Button>
              </div>

              <div className="max-h-[300px] overflow-y-auto space-y-2 border rounded-lg p-2">
                {filteredVariants.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">
                    {t('inventory:noVariantsFound')}
                  </p>
                ) : (
                  filteredVariants.map(variant => (
                    <div
                      key={variant.id}
                      className="flex items-center space-x-2 p-2 hover:bg-muted rounded cursor-pointer"
                      onClick={() => handleToggleVariant(variant.id)}
                    >
                      <Checkbox
                        checked={selectedIds.includes(variant.id)}
                        onCheckedChange={() => handleToggleVariant(variant.id)}
                      />
                      <div className="flex-1">
                        <p className="font-medium">{variant.name}</p>
                        {variant.sku && (
                          <p className="text-xs text-muted-foreground">SKU: {variant.sku}</p>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </TabsContent>

            <TabsContent value="range" className="space-y-4">
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  {t('inventory:selectVariantsByRange')}
                </p>
                <div className="flex gap-2 items-center">
                  <div className="flex-1">
                    <Label htmlFor="range-from">{t('inventory:from')}</Label>
                    <Input
                      id="range-from"
                      type="number"
                      placeholder="1"
                      value={rangeFrom}
                      onChange={(e) => setRangeFrom(e.target.value)}
                    />
                  </div>
                  <div className="flex-1">
                    <Label htmlFor="range-to">{t('inventory:to')}</Label>
                    <Input
                      id="range-to"
                      type="number"
                      placeholder="10"
                      value={rangeTo}
                      onChange={(e) => setRangeTo(e.target.value)}
                    />
                  </div>
                  <Button
                    onClick={handleRangeSelection}
                    className="mt-6"
                  >
                    {t('inventory:applyRange')}
                  </Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="custom" className="space-y-4">
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  {t('inventory:enterVariantNumbers')}
                </p>
                <div className="space-y-2">
                  <Label htmlFor="custom-numbers">{t('inventory:variantNumbers')}</Label>
                  <Input
                    id="custom-numbers"
                    placeholder="1, 3, 5, 7, 10"
                    value={customInput}
                    onChange={(e) => setCustomInput(e.target.value)}
                  />
                  <Button
                    onClick={handleCustomSelection}
                    className="w-full"
                  >
                    <Hash className="mr-2 h-4 w-4" />
                    {t('inventory:applyCustomSelection')}
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex justify-between items-center pt-2 border-t">
            <p className="text-sm text-muted-foreground">
              {t('inventory:variantsSelectedCount', { selected: selectedIds.length, total: variants.length })}
            </p>
            <Button onClick={() => setIsOpen(false)}>
              {t('inventory:done')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function EditBundle() {
  const { t } = useTranslation();
  const [, setLocation] = useLocation();
  const { id } = useParams() as { id: string };
  const { toast } = useToast();
  const [expandedSections, setExpandedSections] = useState<string[]>(['details', 'items', 'pricing']);
  const [variantsCache, setVariantsCache] = useState<Record<string, ProductVariant[]>>({});
  const [loadingVariants, setLoadingVariants] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null);

  const [formData, setFormData] = useState<BundleFormData>({
    name: '',
    nameEn: '',
    nameVi: '',
    description: '',
    sku: '',
    pricingMode: 'percentage',
    discountPercentage: '0',
    discountFixedCzk: '',
    discountFixedEur: '',
    perItemDiscountCzk: '',
    perItemDiscountEur: '',
    setPerItemPriceCzk: '',
    setPerItemPriceEur: '',
    priceCzk: '',
    priceEur: '',
    notes: '',
    items: []
  });

  const { data: bundleData, isLoading: isLoadingBundle } = useQuery<any>({
    queryKey: [`/api/bundles/${id}`],
    enabled: !!id,
  });

  const { data: products = [], isLoading: loadingProducts } = useQuery<Product[]>({
    queryKey: ['/api/products'],
  });

  const generateSKU = () => {
    const bundleName = formData.nameVi.trim() || 'BUNDLE';
    
    const namePart = bundleName
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .slice(0, 8);
    
    const randomNum = Math.floor(100 + Math.random() * 900);
    
    const sku = `BDL-${namePart || 'BUNDLE'}-${randomNum}`;
    
    setFormData(prev => ({ ...prev, sku }));
    
    toast({
      title: t('inventory:skuGenerated'),
      description: t('inventory:bundleSkuValue', { sku }),
    });
  };

  const fetchVariants = async (productId: string) => {
    if (variantsCache[productId] || loadingVariants[productId]) return;
    
    setLoadingVariants(prev => ({ ...prev, [productId]: true }));
    try {
      const response = await fetch(`/api/products/${productId}/variants`);
      if (response.ok) {
        const variants = await response.json();
        setVariantsCache(prev => ({ ...prev, [productId]: variants }));
        
        setFormData(prev => ({
          ...prev,
          items: prev.items.map(item => {
            if (item.productId === productId && item.variantIds && item.variantIds.length > 0) {
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
      console.error(`Failed to fetch variants for product ${productId}:`, error);
    } finally {
      setLoadingVariants(prev => ({ ...prev, [productId]: false }));
    }
  };

  useEffect(() => {
    formData.items.forEach(item => {
      if (item.productId) {
        fetchVariants(item.productId);
      }
    });
  }, [formData.items]);

  useEffect(() => {
    if (bundleData) {
      if (bundleData.imageUrl) {
        setExistingImageUrl(bundleData.imageUrl);
      }
      
      let pricingMode: BundleFormData['pricingMode'] = 'manual';
      
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
      
      if (bundleData.discountPercentage && parseFloat(bundleData.discountPercentage) > 0) {
        pricingMode = 'percentage';
      } else if (totalCzk > 0 && bundlePriceCzk !== totalCzk) {
        pricingMode = 'manual';
      }

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
        
        if (item.variantId && item.variant) {
          groupedItems[productId].variantIds.push(item.variantId);
          groupedItems[productId].variantNames.push(item.variant.name);
        } else if (item.variantId) {
          groupedItems[productId].variantIds.push(item.variantId);
        }
        
        groupedItems[productId].quantity = Math.max(
          groupedItems[productId].quantity,
          item.quantity || 1
        );
      });
      
      const transformedItems: BundleItem[] = Object.values(groupedItems);

      setFormData({
        name: bundleData.name || '',
        nameEn: bundleData.nameEn || '',
        nameVi: bundleData.nameVi || bundleData.name || '',
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

      transformedItems.forEach(item => {
        if (item.productId) {
          fetchVariants(item.productId);
        }
      });
    }
  }, [bundleData]);

  const updateBundleMutation = useMutation({
    mutationFn: async (data: BundleFormData & { imageUrl?: string | null }) => {
      const discountedPrices = calculateDiscountedPrice(
        calculateTotalPrice().totalCzk, 
        calculateTotalPrice().totalEur
      );
      
      const bundleItems: any[] = [];
      data.items.forEach(item => {
        if (item.variantIds && item.variantIds.length > 0) {
          item.variantIds.forEach(variantId => {
            bundleItems.push({
              productId: item.productId,
              variantId: variantId,
              quantity: item.quantity,
            });
          });
        } else {
          bundleItems.push({
            productId: item.productId,
            variantId: null,
            quantity: item.quantity,
          });
        }
      });

      const bundlePayload = {
        name: data.nameVi,
        nameEn: data.nameEn || null,
        nameVi: data.nameVi || null,
        description: data.description || null,
        sku: data.sku || null,
        priceCzk: data.pricingMode === 'manual' && data.priceCzk 
          ? parseFloat(data.priceCzk) 
          : discountedPrices.czk,
        priceEur: data.pricingMode === 'manual' && data.priceEur 
          ? parseFloat(data.priceEur) 
          : discountedPrices.eur,
        discountPercentage: data.pricingMode === 'percentage' 
          ? parseFloat(data.discountPercentage || '0') 
          : 0,
        notes: data.notes || null,
        imageUrl: data.imageUrl || null,
        items: bundleItems,
      };
      
      return apiRequest('PUT', `/api/bundles/${id}`, bundlePayload);
    },
    onSuccess: () => {
      toast({
        title: t('inventory:success'),
        description: t('inventory:bundleUpdated'),
      });
      queryClient.invalidateQueries({ queryKey: ['/api/bundles'] });
      queryClient.invalidateQueries({ queryKey: [`/api/bundles/${id}`] });
      setLocation('/inventory/bundles');
    },
    onError: (error: any) => {
      toast({
        title: t('inventory:error'),
        description: error.message || t('inventory:failedToUpdateBundle'),
        variant: 'destructive',
      });
    },
  });

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.nameVi.trim()) {
      newErrors.nameVi = t('inventory:bundleNameRequired');
    }

    if (formData.items.length === 0) {
      newErrors.items = t('inventory:atLeastOneProductRequired');
    }

    formData.items.forEach((item, index) => {
      if (!item.productId) {
        newErrors[`item_${item.id}`] = t('inventory:productRequired');
      }
      if (!item.quantity || item.quantity <= 0) {
        newErrors[`quantity_${item.id}`] = t('inventory:quantityMustBePositive');
      }
    });

    if (formData.pricingMode === 'manual') {
      if (!formData.priceCzk || parseFloat(formData.priceCzk) <= 0) {
        newErrors.priceCzk = t('inventory:priceCzkRequired');
      }
      if (!formData.priceEur || parseFloat(formData.priceEur) <= 0) {
        newErrors.priceEur = t('inventory:priceEurRequired');
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      toast({
        title: t('inventory:validationError'),
        description: t('inventory:pleaseFixErrors'),
        variant: 'destructive',
      });
      return;
    }

    let imageUrl = existingImageUrl;
    if (imageFile) {
      try {
        const uploadFormData = new FormData();
        uploadFormData.append('image', imageFile);
        
        const uploadResponse = await fetch('/api/upload', {
          method: 'POST',
          body: uploadFormData,
        });
        
        if (!uploadResponse.ok) {
          throw new Error(t('inventory:failedToUploadImage'));
        }
        
        const uploadData = await uploadResponse.json();
        imageUrl = uploadData.imageUrl;
      } catch (error) {
        toast({
          title: t('inventory:imageUploadError'),
          description: t('inventory:failedToUploadImage'),
          variant: 'destructive',
        });
      }
    }

    updateBundleMutation.mutate({ ...formData, imageUrl });
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
    
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[`item_${itemId}`];
      delete newErrors[`quantity_${itemId}`];
      return newErrors;
    });
  };

  const handleItemChange = (itemId: string, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map(item => {
        if (item.id === itemId) {
          const updatedItem = { ...item, [field]: value };
          
          if (field === 'productId') {
            const product = products.find(p => p.id === value);
            if (product) {
              updatedItem.productName = product.name;
              updatedItem.priceCzk = parseFloat(product.priceCzk || '0');
              updatedItem.priceEur = parseFloat(product.priceEur || '0');
              updatedItem.variantIds = [];
              updatedItem.variantNames = [];
              
              fetchVariants(value);
            }
          }
          
          if (field === 'variantIds') {
            const variants = variantsCache[item.productId];
            if (variants) {
              updatedItem.variantNames = value.map((id: string) => 
                variants.find(v => v.id === id)?.name || ''
              ).filter(Boolean);
            }
          }
          
          return updatedItem;
        }
        return item;
      })
    }));
    
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
    <div className="space-y-4 sm:space-y-6 p-2 sm:p-4 md:p-6 max-w-full overflow-x-hidden">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 sm:gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => window.history.back()}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">{t('inventory:editBundle')}</h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              {t('inventory:updateBundleConfigurationAndPricing')}
            </p>
          </div>
        </div>
        <div className="flex flex-col-reverse sm:flex-row gap-2">
          <Button
            variant="outline"
            className="w-full sm:w-auto"
            onClick={() => setLocation('/inventory/bundles')}
          >
            {t('inventory:cancel')}
          </Button>
          <Button
            className="w-full sm:w-auto"
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

      <Accordion type="multiple" value={expandedSections} onValueChange={setExpandedSections} className="space-y-3">
        <AccordionItem value="details" className="bg-white dark:bg-slate-800 rounded-xl border dark:border-slate-700 shadow-sm overflow-hidden">
          <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-slate-50 dark:hover:bg-slate-700">
            <div className="flex items-center gap-3 text-left">
              <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                <Package className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-slate-100">{t('inventory:bundleDetails')}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">{t('inventory:nameDescriptionSkuAndImage')}</p>
              </div>
              {errors.nameVi && <AlertCircle className="h-4 w-4 text-destructive ml-2" />}
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <div className="space-y-4 pt-2">
              <div>
                <Label>{t('inventory:bundleImageOptional')}</Label>
                <div className="mt-2">
                  {(imagePreview || existingImageUrl) ? (
                    <div className="relative w-48 h-48 rounded-lg border dark:border-slate-700 bg-slate-50 dark:bg-slate-800 overflow-hidden group flex items-center justify-center">
                      <img
                        src={imagePreview || existingImageUrl || ''}
                        alt={t('inventory:bundlePreview')}
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
                    <label className="flex flex-col items-center justify-center w-48 h-48 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg cursor-pointer hover:border-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
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
                        <ImageIcon className="h-12 w-12 mx-auto text-slate-400 dark:text-slate-500 mb-2" />
                        <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">{t('inventory:uploadImage')}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{t('inventory:clickToBrowse')}</p>
                      </div>
                    </label>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="nameVi">
                    {t('inventory:bundleNameVi')} <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="nameVi"
                    value={formData.nameVi}
                    onChange={(e) => {
                      setFormData(prev => ({ ...prev, nameVi: e.target.value }));
                      if (errors.nameVi) {
                        setErrors(prev => ({ ...prev, nameVi: '' }));
                      }
                    }}
                    onBlur={() => {
                      if (formData.nameVi.trim() && !formData.sku.trim()) {
                        generateSKU();
                      }
                    }}
                    placeholder={t('inventory:bundleNameViPlaceholder')}
                    className={errors.nameVi ? 'border-destructive' : ''}
                    data-testid="input-bundle-name-vi"
                  />
                  {errors.nameVi && (
                    <p className="text-sm text-destructive mt-1">{errors.nameVi}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="nameEn">{t('inventory:bundleNameEn')}</Label>
                  <Input
                    id="nameEn"
                    value={formData.nameEn}
                    onChange={(e) => setFormData(prev => ({ ...prev, nameEn: e.target.value }))}
                    placeholder={t('inventory:bundleNameEnPlaceholder')}
                    data-testid="input-bundle-name-en"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="sku">{t('inventory:skuOptional')}</Label>
                <div className="flex gap-2">
                  <Input
                    id="sku"
                    value={formData.sku}
                    onChange={(e) => setFormData(prev => ({ ...prev, sku: e.target.value }))}
                    placeholder={t('inventory:bundleSkuPlaceholder')}
                    data-testid="input-bundle-sku"
                  />
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={generateSKU}
                    className="whitespace-nowrap"
                    data-testid="button-generate-sku"
                  >
                    <Hash className="h-4 w-4 mr-2" />
                    {t('inventory:generate')}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {t('inventory:bundleSkuFormat')}
                </p>
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

        <AccordionItem value="items" className="bg-white dark:bg-slate-800 rounded-xl border dark:border-slate-700 shadow-sm overflow-hidden">
          <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-slate-50 dark:hover:bg-slate-700">
            <div className="flex items-center gap-3 text-left">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Plus className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                  {t('inventory:bundleProducts')} ({formData.items.length})
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">{t('inventory:selectProductsAndQuantities')}</p>
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
                    <BundleItemRow
                      key={item.id}
                      item={item}
                      index={index}
                      products={products}
                      variantsCache={variantsCache}
                      errors={errors}
                      onItemChange={handleItemChange}
                      onRemoveItem={handleRemoveItem}
                    />
                  ))}
                </div>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="pricing" className="bg-white dark:bg-slate-800 rounded-xl border dark:border-slate-700 shadow-sm overflow-hidden">
          <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-slate-50 dark:hover:bg-slate-700">
            <div className="flex items-center gap-3 text-left">
              <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                <DollarSign className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-slate-100">{t('inventory:bundlePricing')}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">{t('inventory:setBundlePriceAndDiscount')}</p>
              </div>
              {(errors.priceCzk || errors.priceEur) && <AlertCircle className="h-4 w-4 text-destructive ml-2" />}
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <div className="space-y-6 pt-2">
              {formData.items.length > 0 && (
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-3">{t('inventory:componentBreakdown')}</h4>
                    <div className="space-y-2">
                      {formData.items.filter(item => item.productId).map((item) => (
                        <div key={item.id} className="flex justify-between text-sm">
                          <span className="text-muted-foreground">
                            {item.productName}
                            {item.variantIds && item.variantIds.length > 0 && ` (${item.variantIds.length} variants)`}
                            {' '}× {item.quantity}
                          </span>
                          <div className="text-right">
                            <div>CZK {(item.priceCzk * item.quantity * (item.variantIds?.length || 1)).toFixed(2)}</div>
                            <div className="text-xs text-muted-foreground">
                              EUR {(item.priceEur * item.quantity * (item.variantIds?.length || 1)).toFixed(2)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  <div className="flex justify-between font-semibold">
                    <span>{t('inventory:totalComponentValue')}</span>
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

              <div>
                <Label>{t('inventory:pricingMode')}</Label>
                <Select
                  value={formData.pricingMode}
                  onValueChange={(value: 'percentage' | 'fixed' | 'per_item' | 'set_per_item' | 'manual') => 
                    setFormData(prev => ({ ...prev, pricingMode: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">{t('inventory:percentageDiscount')}</SelectItem>
                    <SelectItem value="fixed">{t('inventory:fixedAmountDiscount')}</SelectItem>
                    <SelectItem value="per_item">{t('inventory:discountPerItem')}</SelectItem>
                    <SelectItem value="set_per_item">{t('inventory:setPricePerItem')}</SelectItem>
                    <SelectItem value="manual">{t('inventory:setManualPrice')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.pricingMode === 'percentage' && (
                <div>
                  <Label htmlFor="discount">{t('inventory:bundleDiscountPercentage')}</Label>
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
                    {t('inventory:percentageDiscountAppliedToTotal')}
                  </p>
                </div>
              )}

              {formData.pricingMode === 'fixed' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="fixedCzk">{t('inventory:fixedDiscountCzk')}</Label>
                    <Input
                      id="fixedCzk"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.discountFixedCzk}
                      onChange={(e) => setFormData(prev => ({ ...prev, discountFixedCzk: e.target.value }))}
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <Label htmlFor="fixedEur">{t('inventory:fixedDiscountEur')}</Label>
                    <Input
                      id="fixedEur"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.discountFixedEur}
                      onChange={(e) => setFormData(prev => ({ ...prev, discountFixedEur: e.target.value }))}
                      placeholder="0"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 col-span-2">
                    {t('inventory:fixedAmountSubtractFromTotal')}
                  </p>
                </div>
              )}

              {formData.pricingMode === 'per_item' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="perItemCzk">{t('inventory:discountPerItemCzk')}</Label>
                    <Input
                      id="perItemCzk"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.perItemDiscountCzk}
                      onChange={(e) => setFormData(prev => ({ ...prev, perItemDiscountCzk: e.target.value }))}
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <Label htmlFor="perItemEur">{t('inventory:discountPerItemEur')}</Label>
                    <Input
                      id="perItemEur"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.perItemDiscountEur}
                      onChange={(e) => setFormData(prev => ({ ...prev, perItemDiscountEur: e.target.value }))}
                      placeholder="0"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 col-span-2">
                    {t('inventory:discountAppliedPerItemUnit')}
                  </p>
                </div>
              )}

              {formData.pricingMode === 'set_per_item' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="setPriceCzk">{t('inventory:pricePerItemCzk')}</Label>
                    <Input
                      id="setPriceCzk"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.setPerItemPriceCzk}
                      onChange={(e) => setFormData(prev => ({ ...prev, setPerItemPriceCzk: e.target.value }))}
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <Label htmlFor="setPriceEur">{t('inventory:pricePerItemEur')}</Label>
                    <Input
                      id="setPriceEur"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.setPerItemPriceEur}
                      onChange={(e) => setFormData(prev => ({ ...prev, setPerItemPriceEur: e.target.value }))}
                      placeholder="0"
                    />
                  </div>
                  <div className="col-span-2 space-y-2">
                    <p className="text-xs text-muted-foreground">
                      {t('inventory:setFixedPricePerItemUnit')}
                    </p>
                    {formData.items.length > 0 && (
                      <p className="text-xs text-green-600 dark:text-green-400">
                        {t('inventory:totalItems')}: {formData.items.reduce((sum, item) => {
                          const variantCount = item.variantIds?.length || 1;
                          return sum + (item.quantity * variantCount);
                        }, 0)} {t('inventory:units')}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {formData.pricingMode === 'manual' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="manualCzk">{t('inventory:bundlePriceCzk')}</Label>
                    <Input
                      id="manualCzk"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.priceCzk}
                      onChange={(e) => setFormData(prev => ({ ...prev, priceCzk: e.target.value }))}
                      placeholder={totals.totalCzk.toFixed(2)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="manualEur">{t('inventory:bundlePriceEur')}</Label>
                    <Input
                      id="manualEur"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.priceEur}
                      onChange={(e) => setFormData(prev => ({ ...prev, priceEur: e.target.value }))}
                      placeholder={totals.totalEur.toFixed(2)}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 col-span-2">
                    {t('inventory:setCustomPriceForBundle')}
                  </p>
                </div>
              )}

              {formData.items.length > 0 && (
                <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-semibold text-green-900 dark:text-green-100">
                        {t('inventory:calculatedBundlePrice')}
                      </p>
                      <p className="text-sm text-green-700 dark:text-green-300">
                        {formData.pricingMode === 'percentage' && t('inventory:afterPercentageDiscount', { percentage: formData.discountPercentage })}
                        {formData.pricingMode === 'fixed' && t('inventory:afterFixedDiscount')}
                        {formData.pricingMode === 'per_item' && t('inventory:withPerItemDiscount')}
                        {formData.pricingMode === 'set_per_item' && t('inventory:fixedPricePerItem')}
                        {formData.pricingMode === 'manual' && t('inventory:manualPricing')}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-green-900 dark:text-green-100">
                        CZK {calculateDiscountedPrice(totals.totalCzk, totals.totalEur).czk.toFixed(2)}
                      </div>
                      <div className="text-sm text-green-700 dark:text-green-300">
                        EUR {calculateDiscountedPrice(totals.totalCzk, totals.totalEur).eur.toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
