import { useState, useEffect, useRef, useMemo } from "react";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ArrowLeft, Save, Plus, X, Percent, Banknote, ShoppingBag, Tag, Calendar, Info, Gift, Trash2 } from "lucide-react";
import { format } from "date-fns";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import type { Product, Category } from "@/shared/schema";

// Schema will be created inside the component to access t() function
const createDiscountSchema = (t: any) => z.object({
  name: z.string().min(1, t('discounts:nameRequired')),
  description: z.string().optional(),
  discountType: z.enum(['percentage', 'fixed_amount', 'buy_x_get_y']),
  percentage: z.union([z.coerce.number().min(1).max(100), z.literal(''), z.undefined()]).optional(),
  fixedAmount: z.union([z.coerce.number().min(0), z.literal(''), z.undefined()]).optional(),
  fixedAmountEur: z.union([z.coerce.number().min(0), z.literal(''), z.undefined()]).optional(),
  buyQuantity: z.union([z.coerce.number().min(1), z.literal(''), z.undefined()]).optional(),
  getQuantity: z.union([z.coerce.number().min(1), z.literal(''), z.undefined()]).optional(),
  getProductType: z.enum(['same_product', 'different_product']).optional(),
  getProductId: z.string().optional(),
  status: z.enum(['active', 'inactive', 'finished']),
  startDate: z.string().min(1, t('discounts:startDateRequired')),
  endDate: z.string().min(1, t('discounts:endDateRequired')),
  applicationScope: z.enum(['specific_product', 'all_products', 'specific_category', 'selected_products']),
  productId: z.string().optional(),
  categoryId: z.string().optional(),
  selectedProductIds: z.array(z.object({
    productId: z.string().min(1, t('discounts:productRequired'))
  })).optional(),
}).refine((data) => {
  // Validate discount type specific fields - only check when that type is selected
  if (data.discountType === 'percentage') {
    const pct = typeof data.percentage === 'number' ? data.percentage : 0;
    if (pct <= 0 || pct > 100) return false;
  }
  if (data.discountType === 'fixed_amount') {
    const amt = typeof data.fixedAmount === 'number' ? data.fixedAmount : 0;
    if (amt <= 0) return false;
  }
  if (data.discountType === 'buy_x_get_y') {
    const buyQty = typeof data.buyQuantity === 'number' ? data.buyQuantity : 0;
    const getQty = typeof data.getQuantity === 'number' ? data.getQuantity : 0;
    if (buyQty < 1 || getQty < 1 || !data.getProductType) {
      return false;
    }
    if (data.getProductType === 'different_product' && !data.getProductId) {
      return false;
    }
  }
  
  // Validate application scope specific fields
  if (data.applicationScope === 'specific_product' && !data.productId) {
    return false;
  }
  if (data.applicationScope === 'specific_category' && !data.categoryId) {
    return false;
  }
  if (data.applicationScope === 'selected_products' && (!data.selectedProductIds || data.selectedProductIds.length === 0)) {
    return false;
  }
  return true;
}, {
  message: t('discounts:fillRequiredFields'),
  path: ["discountType"],
});

function ProductSelectorItem({ 
  index, 
  products, 
  selectedProductId, 
  onSelect, 
  onRemove, 
  t 
}: { 
  index: number;
  products: Product[];
  selectedProductId: string;
  onSelect: (productId: string) => void;
  onRemove: () => void;
  t: any;
}) {
  const [open, setOpen] = useState(false);
  const selectedProduct = products.find(p => String(p.id) === selectedProductId);
  
  return (
    <div className="flex gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="flex-1 justify-between"
          >
            {selectedProduct ? selectedProduct.name : t('discounts:searchProducts')}
            <Check className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[300px] p-0">
          <Command>
            <CommandInput placeholder={t('discounts:searchProducts')} />
            <CommandEmpty>{t('discounts:noProducts')}</CommandEmpty>
            <CommandGroup className="max-h-60 overflow-auto">
              {products.map((product) => (
                <CommandItem
                  key={product.id}
                  onSelect={() => {
                    onSelect(String(product.id));
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      selectedProductId === String(product.id) ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {product.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </Command>
        </PopoverContent>
      </Popover>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={onRemove}
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}

export default function EditDiscount() {
  const { t } = useTranslation(['discounts', 'common']);
  const discountSchema = useMemo(() => createDiscountSchema(t), [t]);
  type DiscountFormData = z.infer<typeof discountSchema>;
  const [location, navigate] = useLocation();
  const { toast } = useToast();
  // URL pattern is /discounts/:id/edit - extract ID from second-to-last segment
  const pathParts = location.split('/');
  const id = pathParts[pathParts.length - 2];
  const [discountId, setDiscountId] = useState("");
  const [productSearchOpen, setProductSearchOpen] = useState(false);
  const [categorySearchOpen, setCategorySearchOpen] = useState(false);
  const [getProductSearchOpen, setGetProductSearchOpen] = useState(false);
  const [displayName, setDisplayName] = useState("");
  
  // Refs for debouncing currency conversion
  const czkTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const eurTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch discount data
  const { data: discount, isLoading } = useQuery<any>({
    queryKey: ['/api/discounts', id],
    enabled: !!id && id !== 'discounts',
  });

  // Fetch products
  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ['/api/products'],
  });

  // Fetch categories
  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['/api/categories'],
  });

  const form = useForm<DiscountFormData>({
    resolver: zodResolver(discountSchema),
    defaultValues: {
      name: "",
      description: "",
      discountType: "percentage",
      percentage: undefined,
      fixedAmount: undefined,
      buyQuantity: undefined,
      getQuantity: undefined,
      getProductType: "same_product",
      status: "active",
      startDate: "",
      endDate: "",
      applicationScope: "all_products",
      selectedProductIds: [],
    },
  });

  // Update form when discount data is loaded
  useEffect(() => {
    if (discount) {
      // Map backend 'type' field to frontend 'discountType', handle different naming conventions
      const backendType = discount.type || discount.discountType || "percentage";
      // Convert 'fixed' to 'fixed_amount' if needed
      const discountType = backendType === 'fixed' ? 'fixed_amount' : backendType;
      
      const formData: any = {
        name: discount.name,
        description: discount.description || "",
        discountType: discountType,
        percentage: discountType === 'percentage' ? (discount.percentage || undefined) : undefined,
        fixedAmount: discountType === 'fixed_amount' ? (discount.fixedAmount || discount.value || undefined) : undefined,
        buyQuantity: discountType === 'buy_x_get_y' ? (discount.buyQuantity || undefined) : undefined,
        getQuantity: discountType === 'buy_x_get_y' ? (discount.getQuantity || undefined) : undefined,
        getProductType: discount.getProductType || "same_product",
        getProductId: discount.getProductId || undefined,
        status: discount.status,
        startDate: discount.startDate ? new Date(discount.startDate).toISOString().slice(0, 16) : "",
        endDate: discount.endDate ? new Date(discount.endDate).toISOString().slice(0, 16) : "",
        applicationScope: discount.applicationScope || "all_products",
        productId: discount.productId ? String(discount.productId) : undefined,
        categoryId: discount.categoryId ? String(discount.categoryId) : undefined,
      };

      // Handle selectedProductIds - ensure it's an array of objects with productId
      if (discount.selectedProductIds && Array.isArray(discount.selectedProductIds) && discount.selectedProductIds.length > 0) {
        formData.selectedProductIds = discount.selectedProductIds.map((id: string) => ({ productId: String(id) }));
      } else {
        formData.selectedProductIds = [];
      }

      form.reset(formData);
      setDiscountId(discount.discountId);
      setDisplayName(discount.name);
    }
  }, [discount, form]);

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "selectedProductIds",
  });

  const watchName = form.watch("name");
  const watchStartDate = form.watch("startDate");
  const watchDiscountType = form.watch("discountType");
  const watchApplicationScope = form.watch("applicationScope");
  const watchGetProductType = form.watch("getProductType");

  // Track previous discount type to detect changes
  const previousDiscountType = useRef(watchDiscountType);
  const isInitialLoad = useRef(true);

  // Clear fields from other discount types when switching types
  useEffect(() => {
    // Skip on initial load to allow form to populate from backend data
    if (isInitialLoad.current) {
      isInitialLoad.current = false;
      previousDiscountType.current = watchDiscountType;
      return;
    }

    // Only clear if the type actually changed
    if (previousDiscountType.current !== watchDiscountType) {
      // Clear conversion timers
      if (czkTimeoutRef.current) {
        clearTimeout(czkTimeoutRef.current);
        czkTimeoutRef.current = null;
      }
      if (eurTimeoutRef.current) {
        clearTimeout(eurTimeoutRef.current);
        eurTimeoutRef.current = null;
      }

      // Clear fields based on the NEW type (keep only relevant fields)
      if (watchDiscountType === 'percentage') {
        // Clear fixed amount fields
        form.setValue('fixedAmount', undefined);
        form.setValue('fixedAmountEur', undefined);
        // Clear buy_x_get_y fields
        form.setValue('buyQuantity', undefined);
        form.setValue('getQuantity', undefined);
        form.setValue('getProductType', 'same_product');
        form.setValue('getProductId', undefined);
      } else if (watchDiscountType === 'fixed_amount') {
        // Clear percentage fields
        form.setValue('percentage', undefined);
        // Clear buy_x_get_y fields
        form.setValue('buyQuantity', undefined);
        form.setValue('getQuantity', undefined);
        form.setValue('getProductType', 'same_product');
        form.setValue('getProductId', undefined);
      } else if (watchDiscountType === 'buy_x_get_y') {
        // Clear percentage fields
        form.setValue('percentage', undefined);
        // Clear fixed amount fields
        form.setValue('fixedAmount', undefined);
        form.setValue('fixedAmountEur', undefined);
      }

      previousDiscountType.current = watchDiscountType;
    }
  }, [watchDiscountType, form]);

  // Clear application scope fields when switching scopes
  const previousApplicationScope = useRef(watchApplicationScope);
  useEffect(() => {
    if (previousApplicationScope.current !== watchApplicationScope) {
      // Clear fields based on the NEW scope
      if (watchApplicationScope !== 'specific_product') {
        form.setValue('productId', undefined);
      }
      if (watchApplicationScope !== 'specific_category') {
        form.setValue('categoryId', undefined);
      }
      if (watchApplicationScope !== 'selected_products') {
        form.setValue('selectedProductIds', []);
      }
      previousApplicationScope.current = watchApplicationScope;
    }
  }, [watchApplicationScope, form]);

  // Generate discount ID when name or start date changes
  useEffect(() => {
    if (watchName && watchStartDate) {
      const year = new Date(watchStartDate).getFullYear();
      const cleanName = watchName
        .toUpperCase()
        .replace(/[^A-Z0-9\s]/g, '')
        .split(' ')
        .filter(word => word.length > 0)
        .join('');
      setDiscountId(`#${year}${cleanName}`);
    }
  }, [watchName, watchStartDate]);

  const updateDiscountMutation = useMutation({
    mutationFn: (data: any) => apiRequest('PATCH', `/api/discounts/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/discounts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/discounts', id] });
      toast({
        title: t('common:success'),
        description: t('discounts:discountUpdated'),
      });
      navigate("/discounts");
    },
    onError: (error: any) => {
      toast({
        title: t('common:error'),
        description: error.message || t('discounts:failedToUpdate'),
        variant: "destructive",
      });
    },
  });

  const deleteDiscountMutation = useMutation({
    mutationFn: () => apiRequest('DELETE', `/api/discounts/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/discounts'] });
      toast({
        title: t('common:success'),
        description: t('discounts:discountDeleted'),
      });
      navigate("/discounts");
    },
    onError: (error: any) => {
      toast({
        title: t('common:error'),
        description: error.message || t('discounts:failedToDelete'),
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: DiscountFormData) => {
    // Map frontend 'discountType' back to backend 'type' field
    const backendType = data.discountType === 'fixed_amount' ? 'fixed' : data.discountType;
    
    const submitData: any = {
      name: data.name,
      description: data.description,
      type: backendType, // Backend uses 'type' not 'discountType'
      status: data.status,
      startDate: data.startDate,
      endDate: data.endDate,
      applicationScope: data.applicationScope,
    };

    // Add discount type specific fields
    if (data.discountType === 'percentage') {
      submitData.percentage = data.percentage;
    } else if (data.discountType === 'fixed_amount') {
      submitData.value = data.fixedAmount; // Backend uses 'value' for fixed amounts
    } else if (data.discountType === 'buy_x_get_y') {
      submitData.buyQuantity = data.buyQuantity;
      submitData.getQuantity = data.getQuantity;
      submitData.getProductType = data.getProductType;
      if (data.getProductType === 'different_product') {
        submitData.getProductId = data.getProductId;
      }
    }

    // Add application scope specific fields
    if (data.applicationScope === 'specific_product') {
      submitData.productId = data.productId;
    } else if (data.applicationScope === 'specific_category') {
      submitData.categoryId = data.categoryId;
    } else if (data.applicationScope === 'selected_products') {
      submitData.selectedProductIds = data.selectedProductIds?.map(item => item.productId);
    }

    updateDiscountMutation.mutate(submitData);
  };

  if (isLoading) {
    return (
      <div className="p-2 sm:p-4 md:p-6 max-w-6xl mx-auto overflow-x-hidden">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-6"></div>
          <div className="space-y-4">
            <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-2 sm:p-4 md:p-6 max-w-6xl mx-auto overflow-x-hidden">
      <div className="mb-4 sm:mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => window.history.back()}
          className="mb-3 sm:mb-4 w-full sm:w-auto justify-start"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t('common:back')}
        </Button>
        <h1 className="text-xl sm:text-2xl font-bold">{t('discounts:editDiscount')}</h1>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Info className="h-5 w-5" />
                  {t('discounts:basicInfo')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>{t('discounts:discountId')}</Label>
                    <Input value={discountId || t('discounts:autoGenerated')} disabled className="bg-gray-50" />
                    <p className="text-xs text-gray-500 mt-1">{t('discounts:generatedFromNameAndDate')}</p>
                  </div>
                  <div>
                    <Label>{t('discounts:discountName')} {t('discounts:required')}</Label>
                    <Input 
                      {...form.register("name")}
                      placeholder={t('discounts:placeholderName')}
                      onBlur={(e) => setDisplayName(e.target.value)}
                    />
                    {form.formState.errors.name && (
                      <p className="text-sm text-red-500 mt-1">{form.formState.errors.name.message}</p>
                    )}
                  </div>
                </div>

                <div>
                  <Label>{t('discounts:description')}</Label>
                  <Textarea 
                    {...form.register("description")}
                    placeholder={t('discounts:placeholderDescription')}
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>{t('discounts:startDate')} {t('discounts:required')}</Label>
                    <Input 
                      type="datetime-local"
                      {...form.register("startDate")}
                    />
                    {form.formState.errors.startDate && (
                      <p className="text-sm text-red-500 mt-1">{form.formState.errors.startDate.message}</p>
                    )}
                  </div>
                  <div>
                    <Label>{t('discounts:endDate')} {t('discounts:required')}</Label>
                    <Input 
                      type="datetime-local"
                      {...form.register("endDate")}
                    />
                    {form.formState.errors.endDate && (
                      <p className="text-sm text-red-500 mt-1">{form.formState.errors.endDate.message}</p>
                    )}
                  </div>
                </div>

                <div>
                  <Label>{t('common:status')}</Label>
                  <Select value={form.watch('status')} onValueChange={(value) => form.setValue('status', value as any)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-2 bg-green-500 rounded-full" />
                          {t('common:active')}
                        </div>
                      </SelectItem>
                      <SelectItem value="inactive">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-2 bg-gray-500 rounded-full" />
                          {t('common:inactive')}
                        </div>
                      </SelectItem>
                      <SelectItem value="finished">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-2 bg-red-500 rounded-full" />
                          {t('common:finished')}
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Discount Type */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Tag className="h-5 w-5" />
                  {t('discounts:discountType')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <RadioGroup 
                  value={watchDiscountType} 
                  onValueChange={(value) => form.setValue('discountType', value as any)}
                >
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className={cn(
                      "border rounded-lg p-4 cursor-pointer transition-all",
                      watchDiscountType === 'percentage' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                    )}>
                      <label htmlFor="percentage" className="cursor-pointer">
                        <div className="flex items-start gap-3">
                          <RadioGroupItem value="percentage" id="percentage" className="mt-1" />
                          <div className="flex-1">
                            <div className="flex items-center gap-2 font-medium">
                              <Percent className="h-4 w-4" />
                              {t('discounts:percentage')}
                            </div>
                            <p className="text-sm text-gray-600 mt-1">{t('discounts:discountByPercentage')}</p>
                          </div>
                        </div>
                      </label>
                    </div>

                    <div className={cn(
                      "border rounded-lg p-4 cursor-pointer transition-all",
                      watchDiscountType === 'fixed_amount' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                    )}>
                      <label htmlFor="fixed_amount" className="cursor-pointer">
                        <div className="flex items-start gap-3">
                          <RadioGroupItem value="fixed_amount" id="fixed_amount" className="mt-1" />
                          <div className="flex-1">
                            <div className="flex items-center gap-2 font-medium">
                              <Tag className="h-4 w-4" />
                              {t('discounts:setSalePrice')}
                            </div>
                            <p className="text-sm text-gray-600 mt-1">{t('discounts:setNewPriceDescription')}</p>
                          </div>
                        </div>
                      </label>
                    </div>

                    <div className={cn(
                      "border rounded-lg p-4 cursor-pointer transition-all",
                      watchDiscountType === 'buy_x_get_y' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                    )}>
                      <label htmlFor="buy_x_get_y" className="cursor-pointer">
                        <div className="flex items-start gap-3">
                          <RadioGroupItem value="buy_x_get_y" id="buy_x_get_y" className="mt-1" />
                          <div className="flex-1">
                            <div className="flex items-center gap-2 font-medium">
                              <Gift className="h-4 w-4" />
                              {t('discounts:buyXGetY')}
                            </div>
                            <p className="text-sm text-gray-600 mt-1">{t('discounts:buyXItemsGetYFree')}</p>
                          </div>
                        </div>
                      </label>
                    </div>
                  </div>
                </RadioGroup>

                <Separator />

                {/* Discount Type Specific Fields */}
                {watchDiscountType === 'percentage' && (
                  <div>
                    <Label>{t('discounts:discountPercentage')} {t('discounts:required')}</Label>
                    <div className="flex items-center gap-2">
                      <Input 
                        type="number"
                        min="1"
                        max="100"
                        {...form.register("percentage", { valueAsNumber: true })}
                        placeholder={t('discounts:placeholderPercentage')}
                        className="max-w-[100px]"
                      />
                      <span className="text-gray-600">%</span>
                    </div>
                    {form.formState.errors.percentage && (
                      <p className="text-sm text-red-500 mt-1">{form.formState.errors.percentage.message}</p>
                    )}
                  </div>
                )}

                {watchDiscountType === 'fixed_amount' && (
                  <div className="space-y-3">
                    <Label>{t('discounts:newSalePrice')} {t('discounts:required')}</Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm text-gray-600">{t('discounts:salePriceCzk')}</Label>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-600">Kč</span>
                          <Input 
                            type="number"
                            min="0"
                            step="0.01"
                            value={form.watch('fixedAmount') || ''}
                            onChange={(e) => {
                              const czkValue = parseFloat(e.target.value);
                              if (!isNaN(czkValue)) {
                                form.setValue('fixedAmount', czkValue);
                                
                                if (czkTimeoutRef.current) {
                                  clearTimeout(czkTimeoutRef.current);
                                }
                                
                                czkTimeoutRef.current = setTimeout(() => {
                                  form.setValue('fixedAmountEur', parseFloat((czkValue / 25).toFixed(2)));
                                }, 1500);
                              } else {
                                form.setValue('fixedAmount', undefined);
                                if (czkTimeoutRef.current) {
                                  clearTimeout(czkTimeoutRef.current);
                                }
                              }
                            }}
                            placeholder={t('discounts:placeholderSalePriceCzk')}
                            className="max-w-[150px]"
                          />
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{t('discounts:autoConversion')}</p>
                      </div>
                      <div>
                        <Label className="text-sm text-gray-600">{t('discounts:salePriceEur')}</Label>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-600">€</span>
                          <Input 
                            type="number"
                            min="0"
                            step="0.01"
                            value={form.watch('fixedAmountEur') || (form.watch('fixedAmount') && !czkTimeoutRef.current ? (form.watch('fixedAmount') / 25).toFixed(2) : '')}
                            onChange={(e) => {
                              const eurValue = parseFloat(e.target.value);
                              if (!isNaN(eurValue)) {
                                form.setValue('fixedAmountEur', eurValue);
                                
                                if (eurTimeoutRef.current) {
                                  clearTimeout(eurTimeoutRef.current);
                                }
                                
                                eurTimeoutRef.current = setTimeout(() => {
                                  form.setValue('fixedAmount', parseFloat((eurValue * 25).toFixed(2)));
                                }, 1500);
                              } else {
                                form.setValue('fixedAmountEur', undefined);
                                if (eurTimeoutRef.current) {
                                  clearTimeout(eurTimeoutRef.current);
                                }
                              }
                            }}
                            placeholder={t('discounts:placeholderSalePriceEur')}
                            className="max-w-[150px]"
                          />
                        </div>
                      </div>
                    </div>
                    {form.formState.errors.fixedAmount && (
                      <p className="text-sm text-red-500 mt-1">{form.formState.errors.fixedAmount.message}</p>
                    )}
                  </div>
                )}

                {watchDiscountType === 'buy_x_get_y' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label>{t('discounts:buyQuantity')} {t('discounts:required')}</Label>
                        <Input 
                          type="number"
                          min="1"
                          {...form.register("buyQuantity", { valueAsNumber: true })}
                          placeholder={t('discounts:placeholderBuyQuantity')}
                        />
                        {form.formState.errors.buyQuantity && (
                          <p className="text-sm text-red-500 mt-1">{form.formState.errors.buyQuantity.message}</p>
                        )}
                      </div>
                      <div>
                        <Label>{t('discounts:getQuantity')} {t('discounts:required')}</Label>
                        <Input 
                          type="number"
                          min="1"
                          {...form.register("getQuantity", { valueAsNumber: true })}
                          placeholder={t('discounts:placeholderGetQuantity')}
                        />
                        {form.formState.errors.getQuantity && (
                          <p className="text-sm text-red-500 mt-1">{form.formState.errors.getQuantity.message}</p>
                        )}
                      </div>
                    </div>

                    <div>
                      <Label>{t('discounts:customerGets')} {t('discounts:required')}</Label>
                      <RadioGroup 
                        value={watchGetProductType} 
                        onValueChange={(value) => form.setValue('getProductType', value as any)}
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="same_product" id="same_product" />
                          <label htmlFor="same_product" className="cursor-pointer">{t('discounts:sameProduct')}</label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="different_product" id="different_product" />
                          <label htmlFor="different_product" className="cursor-pointer">{t('discounts:differentProduct')}</label>
                        </div>
                      </RadioGroup>
                    </div>

                    {watchGetProductType === 'different_product' && (
                      <div>
                        <Label>{t('discounts:getFreeProduct')} {t('discounts:required')}</Label>
                        <Popover open={getProductSearchOpen} onOpenChange={setGetProductSearchOpen}>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              role="combobox"
                              aria-expanded={getProductSearchOpen}
                              className="w-full justify-between"
                            >
                              {form.watch('getProductId')
                                ? products.find((product) => product.id === form.watch('getProductId'))?.name
                                : t('discounts:searchProducts')}
                              <Check className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-full p-0">
                            <Command>
                              <CommandInput placeholder={t('discounts:searchProducts')} />
                              <CommandEmpty>{t('discounts:noProducts')}</CommandEmpty>
                              <CommandGroup className="max-h-60 overflow-auto">
                                {products.map((product) => (
                                  <CommandItem
                                    key={product.id}
                                    onSelect={() => {
                                      form.setValue('getProductId', product.id);
                                      setGetProductSearchOpen(false);
                                    }}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        form.watch('getProductId') === product.id ? "opacity-100" : "opacity-0"
                                      )}
                                    />
                                    {product.name}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </Command>
                          </PopoverContent>
                        </Popover>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Application Scope */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingBag className="h-5 w-5" />
                  {t('discounts:applicationScope')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>{t('discounts:appliesTo')} {t('discounts:required')}</Label>
                  <Select 
                    value={watchApplicationScope} 
                    onValueChange={(value) => form.setValue('applicationScope', value as any)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all_products">{t('discounts:allProducts')}</SelectItem>
                      <SelectItem value="specific_product">{t('discounts:specificProduct')}</SelectItem>
                      <SelectItem value="specific_category">{t('discounts:specificCategory')}</SelectItem>
                      <SelectItem value="selected_products">{t('discounts:selectedProducts')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {watchApplicationScope === 'specific_product' && (
                  <div>
                    <Label>{t('discounts:selectProduct')} {t('discounts:required')}</Label>
                    <Popover open={productSearchOpen} onOpenChange={setProductSearchOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={productSearchOpen}
                          className="w-full justify-between"
                        >
                          {form.watch('productId')
                            ? products.find((product) => String(product.id) === form.watch('productId'))?.name
                            : t('discounts:searchProducts')}
                          <Check className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-full p-0">
                        <Command>
                          <CommandInput placeholder={t('discounts:searchProducts')} />
                          <CommandEmpty>{t('discounts:noProducts')}</CommandEmpty>
                          <CommandGroup className="max-h-60 overflow-auto">
                            {products.map((product) => (
                              <CommandItem
                                key={product.id}
                                onSelect={() => {
                                  form.setValue('productId', String(product.id));
                                  setProductSearchOpen(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    form.watch('productId') === String(product.id) ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                {product.name}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
                )}

                {watchApplicationScope === 'specific_category' && (
                  <div>
                    <Label>{t('discounts:selectCategory')} {t('discounts:required')}</Label>
                    <Popover open={categorySearchOpen} onOpenChange={setCategorySearchOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={categorySearchOpen}
                          className="w-full justify-between"
                        >
                          {form.watch('categoryId')
                            ? categories.find((category) => String(category.id) === String(form.watch('categoryId')))?.name
                            : t('discounts:searchCategories')}
                          <Check className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-full p-0">
                        <Command>
                          <CommandInput placeholder={t('discounts:searchCategories')} />
                          <CommandEmpty>{t('discounts:noCategories')}</CommandEmpty>
                          <CommandGroup className="max-h-60 overflow-auto">
                            {categories.map((category) => (
                              <CommandItem
                                key={category.id}
                                onSelect={() => {
                                  form.setValue('categoryId', String(category.id));
                                  setCategorySearchOpen(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    String(form.watch('categoryId')) === String(category.id) ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                {category.name}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
                )}

                {watchApplicationScope === 'selected_products' && (
                  <div className="space-y-2">
                    <Label>{t('discounts:selectedProducts')} {t('discounts:required')}</Label>
                    {fields.map((field, index) => (
                      <ProductSelectorItem
                        key={field.id}
                        index={index}
                        products={products}
                        selectedProductId={form.watch(`selectedProductIds.${index}.productId`) || ''}
                        onSelect={(productId) => form.setValue(`selectedProductIds.${index}.productId`, productId)}
                        onRemove={() => remove(index)}
                        t={t}
                      />
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => append({ productId: "" })}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      {t('discounts:addProduct')}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Summary Sidebar */}
          <div className="lg:col-span-1">
            <Card className="sticky top-20 overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-blue-500 to-purple-600 text-white">
                <CardTitle className="text-xl">{t('discounts:discountSummary')}</CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div>
                  <p className="text-sm text-gray-600">{t('discounts:discountName')}</p>
                  <p className="font-semibold">{displayName || t('discounts:enterName')}</p>
                </div>

                {!(watchApplicationScope === 'specific_product' && form.watch('productId')) && (
                  <>
                    <Separator />

                    <div>
                      <p className="text-sm text-gray-600">{t('discounts:discountType')}</p>
                      <p className="font-semibold capitalize">
                        {watchDiscountType === 'buy_x_get_y' ? t('discounts:buyXGetY') : watchDiscountType.replace('_', ' ')}
                      </p>
                    </div>
                  </>
                )}

                {watchDiscountType === 'percentage' && form.watch('percentage') > 0 && (
                  <>
                    <div>
                      <p className="text-sm text-gray-600">{t('discounts:discountValue')}</p>
                      <p className="font-semibold text-green-600 text-2xl">{form.watch('percentage')}% {t('common:off')}</p>
                    </div>
                    {watchApplicationScope === 'specific_product' && form.watch('productId') && (() => {
                      const selectedProduct = products.find(p => String(p.id) === form.watch('productId'));
                      const productPrice = selectedProduct?.priceCzk ? Number(selectedProduct.priceCzk) : 0;
                      const discountAmount = productPrice * form.watch('percentage') / 100;
                      const finalPrice = productPrice - discountAmount;
                      
                      return selectedProduct ? (
                        <div className="bg-gray-50 rounded-lg p-3">
                          <p className="text-sm font-medium">{selectedProduct.name}</p>
                          <p className="text-sm mt-1">{t('discounts:itemPrice')}: Kč {productPrice.toFixed(0)}</p>
                          <p className="text-sm text-green-600 font-semibold">
                            {t('discounts:discount')}: Kč {discountAmount.toFixed(0)}
                          </p>
                          <p className="text-sm font-semibold">
                            {t('discounts:finalPrice')}: Kč {finalPrice.toFixed(0)}
                          </p>
                        </div>
                      ) : null;
                    })()}
                  </>
                )}

                {watchDiscountType === 'fixed_amount' && form.watch('fixedAmount') > 0 && (
                  <>
                    <div>
                      <p className="text-sm text-gray-600">{t('discounts:newSalePrice')}</p>
                      <div className="space-y-1">
                        <p className="font-semibold text-green-600 text-xl">Kč {Number(form.watch('fixedAmount')) || 0}</p>
                        <p className="text-sm text-gray-600">≈ €{((Number(form.watch('fixedAmount')) || 0) / 25).toFixed(2)}</p>
                      </div>
                    </div>
                    {watchApplicationScope === 'specific_product' && form.watch('productId') && (() => {
                      const selectedProduct = products.find(p => String(p.id) === form.watch('productId'));
                      const originalPrice = selectedProduct?.priceCzk ? Number(selectedProduct.priceCzk) : 0;
                      const salePrice = Number(form.watch('fixedAmount')) || 0;
                      const savings = Math.max(0, originalPrice - salePrice);
                      const savingsPercent = originalPrice > 0 ? ((savings / originalPrice) * 100).toFixed(0) : 0;
                      
                      return selectedProduct ? (
                        <div className="bg-gray-50 rounded-lg p-3">
                          <p className="text-sm font-medium">{selectedProduct.name}</p>
                          <p className="text-sm mt-1 line-through text-gray-500">{t('discounts:originalPrice')}: Kč {originalPrice.toFixed(0)}</p>
                          <p className="text-sm text-green-600 font-semibold">
                            {t('discounts:salePrice')}: Kč {salePrice.toFixed(0)}
                          </p>
                          {savings > 0 && (
                            <p className="text-xs text-green-600 mt-1">
                              {t('discounts:youSave')}: Kč {savings.toFixed(0)} ({savingsPercent}%)
                            </p>
                          )}
                        </div>
                      ) : null;
                    })()}
                  </>
                )}

                {watchDiscountType === 'buy_x_get_y' && (
                  <>
                    <div>
                      <p className="text-sm text-gray-600">{t('discounts:promotion')}</p>
                      <p className="font-semibold text-green-600 text-lg">
                        {t('discounts:buyGetFree', { buy: form.watch('buyQuantity') || 0, get: form.watch('getQuantity') || 0 })}
                      </p>
                    </div>
                    {form.watch('buyQuantity') > 0 && form.watch('getQuantity') > 0 && (
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-xs text-gray-600">{t('discounts:effectiveDiscount')}</p>
                        <p className="text-sm font-semibold text-green-600">
                          {((form.watch('getQuantity') / (form.watch('buyQuantity') + form.watch('getQuantity'))) * 100).toFixed(1)}% {t('common:off')}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {t('discounts:onTotalItems', { total: form.watch('buyQuantity') + form.watch('getQuantity') })}
                        </p>
                      </div>
                    )}
                  </>
                )}

                {!(watchApplicationScope === 'specific_product' && form.watch('productId')) && (
                  <>
                    <Separator />

                    <div>
                      <p className="text-sm text-gray-600">{t('discounts:applicationScope')}</p>
                      <p className="font-semibold">
                        {watchApplicationScope === 'all_products' && t('discounts:allProducts')}
                        {watchApplicationScope === 'specific_product' && t('discounts:specificProductNotSelected')}
                        {watchApplicationScope === 'specific_category' && (
                          <>
                            {t('discounts:specificCategory')}
                            {form.watch('categoryId') && (
                              <span className="block text-sm text-gray-600 font-normal mt-1">
                                {categories.find(c => String(c.id) === String(form.watch('categoryId')))?.name}
                              </span>
                            )}
                          </>
                        )}
                        {watchApplicationScope === 'selected_products' && (
                          <>
                            {t('discounts:selectedProducts')}
                            {form.watch('selectedProductIds')?.filter(item => item.productId).length > 0 && (
                              <span className="block text-sm text-gray-600 font-normal mt-1">
                                {t('discounts:productsSelected', { count: form.watch('selectedProductIds').filter(item => item.productId).length })}
                              </span>
                            )}
                          </>
                        )}
                      </p>
                    </div>
                  </>
                )}

                <div>
                  <p className="text-sm text-gray-600">{t('common:status')}</p>
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      "h-2 w-2 rounded-full",
                      form.watch('status') === 'active' ? 'bg-green-500' : 
                      form.watch('status') === 'inactive' ? 'bg-gray-500' : 'bg-red-500'
                    )} />
                    <span className="font-semibold capitalize">{form.watch('status')}</span>
                  </div>
                </div>

                <Separator />

                <Button
                  type="submit"
                  className="w-full"
                  disabled={updateDiscountMutation.isPending}
                  onClick={() => {
                    const errors = form.formState.errors;
                    if (Object.keys(errors).length > 0) {
                      console.log("Form errors:", errors);
                      toast({
                        title: t('common:error'),
                        description: t('discounts:fillRequiredFields'),
                        variant: "destructive",
                      });
                    }
                  }}
                >
                  <Save className="h-4 w-4 mr-2" />
                  {updateDiscountMutation.isPending ? t('common:updating') + "..." : t('discounts:updateDiscount')}
                </Button>

                <Separator />

                <Button
                  type="button"
                  variant="ghost"
                  className="w-full text-[#6e6e6e] hover:text-red-700 hover:bg-red-50"
                  onClick={() => {
                    if (confirm(t('discounts:deleteConfirmDescription'))) {
                      deleteDiscountMutation.mutate();
                    }
                  }}
                  disabled={deleteDiscountMutation.isPending}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {deleteDiscountMutation.isPending ? t('common:deleting') + "..." : t('discounts:deleteDiscount')}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
}