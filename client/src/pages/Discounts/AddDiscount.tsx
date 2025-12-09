import { useState, useEffect, useRef, useMemo } from "react";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ArrowLeft, Save, Plus, X, Percent, Banknote, ShoppingBag, Tag, Calendar, Info, Gift, Hash, FileText, Loader2, ChevronsUpDown, Package, DollarSign, AlertCircle, XCircle } from "lucide-react";
import { format } from "date-fns";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
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
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { Product, Category } from "@shared/schema";
import { fuzzySearch, calculateSearchScore } from "@/lib/fuzzySearch";

// Schema will be created inside the component to access t() function
const createDiscountSchema = (t: any) => z.object({
  name: z.string().min(1, t('discounts:nameRequired')),
  description: z.string().optional(),
  discountType: z.enum(['percentage', 'fixed_amount', 'buy_x_get_y']),
  percentage: z.coerce.number().min(1).max(100).optional(),
  fixedAmount: z.coerce.number().min(0.01).optional(),
  fixedAmountEur: z.coerce.number().min(0.01).optional(),
  buyQuantity: z.coerce.number().min(1).optional(),
  getQuantity: z.coerce.number().min(1).optional(),
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
  // Validate discount type specific fields
  if (data.discountType === 'percentage' && (!data.percentage || data.percentage <= 0)) {
    return false;
  }
  if (data.discountType === 'fixed_amount' && (!data.fixedAmount || data.fixedAmount <= 0)) {
    return false;
  }
  if (data.discountType === 'buy_x_get_y') {
    if (!data.buyQuantity || !data.getQuantity || !data.getProductType) {
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

export default function AddDiscount() {
  const { t } = useTranslation(['discounts', 'common']);
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [discountId, setDiscountId] = useState("");
  const [productSearchOpen, setProductSearchOpen] = useState(false);
  const [categorySearchOpen, setCategorySearchOpen] = useState(false);
  const [getProductSearchOpen, setGetProductSearchOpen] = useState(false);
  const [productSearch, setProductSearch] = useState("");
  const [categorySearch, setCategorySearch] = useState("");
  const [getProductSearch, setGetProductSearch] = useState("");
  const [selectedProductSearchOpen, setSelectedProductSearchOpen] = useState<number | null>(null);
  const [selectedProductSearchTerm, setSelectedProductSearchTerm] = useState("");
  
  // Refs for debouncing currency conversion
  const czkTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const eurTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Create schema with translations
  const discountSchema = useMemo(() => createDiscountSchema(t), [t]);
  type DiscountFormData = z.infer<typeof discountSchema>;

  // Fetch products
  const { data: products = [], isLoading: productsLoading } = useQuery<Product[]>({
    queryKey: ['/api/products'],
  });

  // Fetch categories
  const { data: categories = [], isLoading: categoriesLoading } = useQuery<Category[]>({
    queryKey: ['/api/categories'],
  });

  const form = useForm<DiscountFormData>({
    resolver: zodResolver(discountSchema),
    defaultValues: {
      name: "",
      description: "",
      discountType: "percentage",
      percentage: 10,
      fixedAmount: undefined,
      fixedAmountEur: undefined,
      buyQuantity: 1,
      getQuantity: 1,
      getProductType: "same_product",
      status: "active",
      startDate: "",
      endDate: "",
      applicationScope: "all_products",
      selectedProductIds: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "selectedProductIds",
  });

  const watchName = form.watch("name");
  const watchStartDate = form.watch("startDate");
  const watchDiscountType = form.watch("discountType");
  const watchApplicationScope = form.watch("applicationScope");
  const watchGetProductType = form.watch("getProductType");
  const watchSelectedProductIds = form.watch("selectedProductIds");

  // Filtered and sorted products with fuzzy search
  const filteredProducts = useMemo(() => {
    if (!productSearch.trim()) return products;
    
    return fuzzySearch(products, productSearch, {
      fields: ['name', 'sku', 'description'],
      threshold: 0.3,
    }).map(result => result.item);
  }, [products, productSearch]);

  const filteredGetProducts = useMemo(() => {
    if (!getProductSearch.trim()) return products;
    
    return fuzzySearch(products, getProductSearch, {
      fields: ['name', 'sku', 'description'],
      threshold: 0.3,
    }).map(result => result.item);
  }, [products, getProductSearch]);

  const filteredSelectedProducts = useMemo(() => {
    if (!selectedProductSearchTerm.trim()) return products;
    
    return fuzzySearch(products, selectedProductSearchTerm, {
      fields: ['name', 'sku', 'description'],
      threshold: 0.3,
    }).map(result => result.item);
  }, [products, selectedProductSearchTerm]);

  // Filtered categories with product count
  const categoriesWithCount = useMemo(() => {
    return categories.map(category => {
      const productCount = products.filter(p => String(p.categoryId) === String(category.id)).length;
      return { ...category, productCount };
    });
  }, [categories, products]);

  const filteredCategories = useMemo(() => {
    if (!categorySearch.trim()) return categoriesWithCount;
    
    return fuzzySearch(categoriesWithCount, categorySearch, {
      fields: ['name', 'description'],
      threshold: 0.3,
    }).map(result => result.item);
  }, [categoriesWithCount, categorySearch]);

  // Check for duplicate products in selected products
  const getAlreadySelectedProductIds = () => {
    return new Set(watchSelectedProductIds?.map(item => item.productId).filter(Boolean) || []);
  };

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

  const createDiscountMutation = useMutation({
    mutationFn: (data: any) => apiRequest('POST', '/api/discounts', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/discounts'] });
      toast({
        title: t('common:success'),
        description: t('discounts:discountCreated'),
      });
      navigate("/discounts");
    },
    onError: (error: any) => {
      toast({
        title: t('common:error'),
        description: error.message || t('discounts:failedToCreate'),
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: DiscountFormData) => {
    // Generate discountId if not set
    const generatedDiscountId = discountId || `DISC-${Date.now()}`;
    
    const submitData: any = {
      discountId: generatedDiscountId,
      name: data.name,
      description: data.description,
      type: data.discountType, // Backend uses 'type', not 'discountType'
      status: data.status,
      startDate: data.startDate, // Keep as string, backend will parse
      endDate: data.endDate,     // Keep as string, backend will parse
      applicationScope: data.applicationScope,
    };

    // Map discount type to backend format and add type-specific fields
    if (data.discountType === 'percentage') {
      submitData.percentage = data.percentage;
    } else if (data.discountType === 'fixed_amount') {
      submitData.type = 'fixed'; // Backend uses 'fixed', not 'fixed_amount'
      submitData.value = data.fixedAmount; // Backend uses 'value' for fixed amount
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

    createDiscountMutation.mutate(submitData);
  };

  const onFormError = (errors: any) => {
    console.log("Form validation errors:", errors);
    toast({
      title: t('discounts:pleaseFixErrors'),
      description: t('discounts:fillRequiredFields'),
      variant: "destructive",
    });
  };

  const formatPrice = (price: string | number | null | undefined, currency: 'CZK' | 'EUR') => {
    const numPrice = typeof price === 'string' ? parseFloat(price) : price;
    if (numPrice === null || numPrice === undefined || isNaN(numPrice)) return '-';
    
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(numPrice);
  };

  return (
    <div className="p-2 sm:p-4 md:p-6 max-w-7xl mx-auto overflow-x-hidden">
      {/* Header */}
      <div className="mb-4 sm:mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => window.history.back()}
          className="mb-3 sm:mb-4 w-full sm:w-auto justify-start"
          data-testid="button-back"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t('discounts:backToDiscounts')}
        </Button>
        <h1 className="text-2xl sm:text-3xl font-bold">{t('discounts:addPageTitle')}</h1>
        <p className="text-sm sm:text-base text-muted-foreground mt-1">{t('discounts:addPageSubtitle')}</p>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit, onFormError)} className="space-y-4 sm:space-y-6">
        {/* Basic Information */}
        <Card className="border-l-4 border-l-blue-500 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Info className="h-5 w-5 text-blue-600" />
              {t('discounts:basicInformation')}
            </CardTitle>
            <CardDescription>{t('discounts:addPageSubtitle')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-sm font-medium">
                  <Hash className="h-4 w-4 text-slate-500" />
                  {t('discounts:discountId')}
                </Label>
                <Input 
                  value={discountId || t('discounts:autoGenerated')} 
                  disabled 
                  className="bg-muted h-10" 
                  data-testid="input-discountId"
                />
                <p className="text-xs text-muted-foreground">{t('discounts:generatedFromNameAndDate')}</p>
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-sm font-medium">
                  <Tag className="h-4 w-4 text-slate-500" />
                  {t('discounts:discountName')} <span className="text-destructive">*</span>
                </Label>
                <Input 
                  {...form.register("name")}
                  placeholder={t('discounts:placeholderName')}
                  className="h-10"
                  data-testid="input-name"
                />
                {form.formState.errors.name && (
                  <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm font-medium">
                <FileText className="h-4 w-4 text-slate-500" />
                {t('common:description')}
              </Label>
              <Textarea 
                {...form.register("description")}
                placeholder={t('discounts:placeholderDescription')}
                rows={3}
                className="resize-none"
                data-testid="textarea-description"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-sm font-medium">
                  <Calendar className="h-4 w-4 text-slate-500" />
                  {t('common:startDate')} <span className="text-destructive">*</span>
                </Label>
                <Input 
                  type="datetime-local"
                  {...form.register("startDate")}
                  className="h-10"
                  data-testid="input-startDate"
                />
                {form.formState.errors.startDate && (
                  <p className="text-sm text-destructive">{form.formState.errors.startDate.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-sm font-medium">
                  <Calendar className="h-4 w-4 text-slate-500" />
                  {t('common:endDate')} <span className="text-destructive">*</span>
                </Label>
                <Input 
                  type="datetime-local"
                  {...form.register("endDate")}
                  className="h-10"
                  data-testid="input-endDate"
                />
                {form.formState.errors.endDate && (
                  <p className="text-sm text-destructive">{form.formState.errors.endDate.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">{t('common:status')}</Label>
                <Select 
                  value={form.watch('status')} 
                  onValueChange={(value) => form.setValue('status', value as any)}
                >
                  <SelectTrigger className="h-10" data-testid="select-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 bg-green-500 rounded-full" />
                        {t('discounts:active')}
                      </div>
                    </SelectItem>
                    <SelectItem value="inactive">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 bg-gray-500 rounded-full" />
                        {t('discounts:inactive')}
                      </div>
                    </SelectItem>
                    <SelectItem value="finished">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 bg-red-500 rounded-full" />
                        {t('discounts:finished')}
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Discount Type */}
        <Card className="border-l-4 border-l-green-500 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Percent className="h-5 w-5 text-green-600" />
              {t('discounts:discountTypeValue')}
            </CardTitle>
            <CardDescription>{t('discounts:percentageDesc')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div 
                className={cn(
                  "border rounded-lg p-4 cursor-pointer transition-all",
                  watchDiscountType === 'percentage' ? 'border-green-500 bg-green-50 dark:bg-green-950' : 'border-border hover:border-green-300'
                )}
                onClick={() => form.setValue('discountType', 'percentage')}
                data-testid="option-discount-percentage"
              >
                <div className="flex items-start gap-3">
                  <div className={cn(
                    "h-4 w-4 mt-1 rounded-full border-2 flex items-center justify-center shrink-0",
                    watchDiscountType === 'percentage' ? 'border-green-500' : 'border-muted-foreground/30'
                  )}>
                    {watchDiscountType === 'percentage' && (
                      <div className="h-2 w-2 rounded-full bg-green-500" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 font-medium">
                      <Percent className="h-4 w-4 text-green-600" />
                      {t('discounts:percentageOff')}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{t('discounts:percentageDesc')}</p>
                  </div>
                </div>
              </div>

              <div 
                className={cn(
                  "border rounded-lg p-4 cursor-pointer transition-all",
                  watchDiscountType === 'fixed_amount' ? 'border-green-500 bg-green-50 dark:bg-green-950' : 'border-border hover:border-green-300'
                )}
                onClick={() => form.setValue('discountType', 'fixed_amount')}
                data-testid="option-discount-fixed"
              >
                <div className="flex items-start gap-3">
                  <div className={cn(
                    "h-4 w-4 mt-1 rounded-full border-2 flex items-center justify-center shrink-0",
                    watchDiscountType === 'fixed_amount' ? 'border-green-500' : 'border-muted-foreground/30'
                  )}>
                    {watchDiscountType === 'fixed_amount' && (
                      <div className="h-2 w-2 rounded-full bg-green-500" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 font-medium">
                      <Banknote className="h-4 w-4 text-green-600" />
                      {t('discounts:fixedAmountOff')}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{t('discounts:fixedAmountDesc')}</p>
                  </div>
                </div>
              </div>

              <div 
                className={cn(
                  "border rounded-lg p-4 cursor-pointer transition-all",
                  watchDiscountType === 'buy_x_get_y' ? 'border-green-500 bg-green-50 dark:bg-green-950' : 'border-border hover:border-green-300'
                )}
                onClick={() => form.setValue('discountType', 'buy_x_get_y')}
                data-testid="option-discount-buyxgety"
              >
                <div className="flex items-start gap-3">
                  <div className={cn(
                    "h-4 w-4 mt-1 rounded-full border-2 flex items-center justify-center shrink-0",
                    watchDiscountType === 'buy_x_get_y' ? 'border-green-500' : 'border-muted-foreground/30'
                  )}>
                    {watchDiscountType === 'buy_x_get_y' && (
                      <div className="h-2 w-2 rounded-full bg-green-500" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 font-medium">
                      <Gift className="h-4 w-4 text-green-600" />
                      {t('discounts:buyXGetY')}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{t('discounts:buyXGetYDesc')}</p>
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Discount Type Specific Fields */}
            {watchDiscountType === 'percentage' && (
              <div>
                <Label>{t('discounts:discountPercentage')} {t('discounts:required')}</Label>
                <div className="flex items-center gap-2 mt-2">
                  <Input 
                    type="number"
                    min="1"
                    max="100"
                    {...form.register("percentage", { valueAsNumber: true })}
                    placeholder={t('discounts:placeholderPercentage')}
                    className="max-w-[120px]"
                    data-testid="input-percentage"
                  />
                  <span className="text-muted-foreground font-medium">%</span>
                </div>
                {form.formState.errors.percentage && (
                  <p className="text-sm text-destructive mt-1">{form.formState.errors.percentage.message}</p>
                )}
              </div>
            )}

            {watchDiscountType === 'fixed_amount' && (
              <div>
                <Label>{t('discounts:discountAmount')} {t('discounts:required')}</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground font-medium min-w-[30px]">{t('discounts:currencyCZK')}</span>
                      <Input 
                        type="number"
                        min="0.01"
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
                        placeholder={t('discounts:placeholderFixedAmount')}
                        data-testid="input-fixedAmount-czk"
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground font-medium min-w-[30px]">{t('discounts:currencyEUR')}</span>
                      <Input 
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={form.watch('fixedAmountEur') || (form.watch('fixedAmount') && !czkTimeoutRef.current ? ((form.watch('fixedAmount') ?? 0) / 25).toFixed(2) : '')}
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
                        placeholder={t('discounts:placeholderFixedAmountEur')}
                        data-testid="input-fixedAmount-eur"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{t('discounts:autoConversion')}</p>
                    <p className="text-xs text-muted-foreground">{t('discounts:approxRate')}</p>
                  </div>
                </div>
                {form.formState.errors.fixedAmount && (
                  <p className="text-sm text-destructive mt-1">{form.formState.errors.fixedAmount.message}</p>
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
                      data-testid="input-buyQuantity"
                    />
                    {form.formState.errors.buyQuantity && (
                      <p className="text-sm text-destructive mt-1">{form.formState.errors.buyQuantity.message}</p>
                    )}
                  </div>
                  <div>
                    <Label>{t('discounts:getQuantity')} {t('discounts:required')}</Label>
                    <Input 
                      type="number"
                      min="1"
                      {...form.register("getQuantity", { valueAsNumber: true })}
                      placeholder={t('discounts:placeholderGetQuantity')}
                      data-testid="input-getQuantity"
                    />
                    {form.formState.errors.getQuantity && (
                      <p className="text-sm text-destructive mt-1">{form.formState.errors.getQuantity.message}</p>
                    )}
                  </div>
                </div>

                <div>
                  <Label>{t('discounts:customerGets')} {t('discounts:required')}</Label>
                  <RadioGroup 
                    value={watchGetProductType} 
                    onValueChange={(value) => form.setValue('getProductType', value as any)}
                    className="mt-2"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="same_product" id="same_product" data-testid="radio-same-product" />
                      <label htmlFor="same_product" className="cursor-pointer">{t('discounts:sameProduct')}</label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="different_product" id="different_product" data-testid="radio-different-product" />
                      <label htmlFor="different_product" className="cursor-pointer">{t('discounts:differentProduct')}</label>
                    </div>
                  </RadioGroup>
                </div>

                {watchGetProductType === 'different_product' && (
                  <div>
                    <Label className="flex items-center justify-between">
                      <span>{t('discounts:getFreeProduct')} {t('discounts:required')}</span>
                      <span className="text-xs text-muted-foreground">{t('common:pressToNavigate')}</span>
                    </Label>
                    <Popover open={getProductSearchOpen} onOpenChange={setGetProductSearchOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={getProductSearchOpen}
                          className="w-full justify-between mt-2"
                          data-testid="button-select-free-product"
                        >
                          {form.watch('getProductId')
                            ? products.find((product) => product.id === form.watch('getProductId'))?.name
                            : t('discounts:searchProducts')}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[500px] p-0" align="start">
                        <Command>
                          <CommandInput 
                            placeholder={t('discounts:searchProducts')}
                            value={getProductSearch}
                            onValueChange={setGetProductSearch}
                          />
                          <CommandEmpty>
                            {productsLoading ? t('common:loading') : t('discounts:noProducts')}
                          </CommandEmpty>
                          <CommandList>
                            <CommandGroup className="max-h-[300px]">
                              {filteredGetProducts.map((product) => (
                                <CommandItem
                                  key={product.id}
                                  value={product.id}
                                  onSelect={() => {
                                    form.setValue('getProductId', product.id);
                                    setGetProductSearchOpen(false);
                                    setGetProductSearch("");
                                  }}
                                  data-testid={`option-free-product-${product.id}`}
                                  className="flex items-center gap-3 py-3"
                                >
                                  <Check
                                    className={cn(
                                      "h-4 w-4 shrink-0",
                                      form.watch('getProductId') === product.id ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                      <p className="font-medium truncate">{product.name}</p>
                                      {product.sku && (
                                        <Badge variant="outline" className="text-xs shrink-0">
                                          {product.sku}
                                        </Badge>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                      {product.priceCzk && (
                                        <span className="flex items-center gap-1">
                                          <DollarSign className="h-3 w-3" />
                                          {formatPrice(product.priceCzk, 'CZK')}
                                        </span>
                                      )}
                                      <span className="flex items-center gap-1">
                                        <Package className="h-3 w-3" />
                                        {t('common:stock')}: {product.quantity || 0}
                                      </span>
                                    </div>
                                  </div>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    {form.watch('getProductId') && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          form.setValue('getProductId', undefined);
                          setGetProductSearch("");
                        }}
                        className="mt-2"
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        {t('common:clearSelection')}
                      </Button>
                    )}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Application Scope */}
        <Card className="border-l-4 border-l-purple-500 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <ShoppingBag className="h-5 w-5 text-purple-600" />
              {t('discounts:applicationScope')}
            </CardTitle>
            <CardDescription>{t('discounts:selectProductsToDiscount')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label className="text-sm font-medium">{t('discounts:appliesTo')} <span className="text-destructive">*</span></Label>
              <Select 
                value={watchApplicationScope} 
                onValueChange={(value) => {
                  form.setValue('applicationScope', value as any);
                  form.setValue('productId', undefined);
                  form.setValue('categoryId', undefined);
                  form.setValue('selectedProductIds', []);
                }}
              >
                <SelectTrigger className="h-10" data-testid="select-applicationScope">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all_products">
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4" />
                      {t('discounts:allProducts')}
                    </div>
                  </SelectItem>
                  <SelectItem value="specific_product">
                    <div className="flex items-center gap-2">
                      <Tag className="h-4 w-4" />
                      {t('discounts:specificProduct')}
                    </div>
                  </SelectItem>
                  <SelectItem value="specific_category">
                    <div className="flex items-center gap-2">
                      <ShoppingBag className="h-4 w-4" />
                      {t('discounts:specificCategory')}
                    </div>
                  </SelectItem>
                  <SelectItem value="selected_products">
                    <div className="flex items-center gap-2">
                      <ShoppingBag className="h-4 w-4" />
                      {t('discounts:selectedProducts')}
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {watchApplicationScope === 'specific_product' && (
              <div>
                <Label className="flex items-center justify-between">
                  <span>{t('discounts:selectProduct')} {t('discounts:required')}</span>
                  <span className="text-xs text-muted-foreground">{t('common:searchable')}</span>
                </Label>
                <Popover open={productSearchOpen} onOpenChange={setProductSearchOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={productSearchOpen}
                      className="w-full justify-between mt-2"
                      data-testid="button-select-product"
                    >
                      {form.watch('productId')
                        ? products.find((product) => product.id === form.watch('productId'))?.name
                        : t('discounts:searchProducts')}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[500px] p-0" align="start">
                    <Command>
                      <CommandInput 
                        placeholder={t('discounts:searchProducts')}
                        value={productSearch}
                        onValueChange={setProductSearch}
                      />
                      <CommandEmpty>
                        {productsLoading ? t('common:loading') : t('discounts:noProducts')}
                      </CommandEmpty>
                      <CommandList>
                        <CommandGroup className="max-h-[300px]">
                          {filteredProducts.map((product) => (
                            <CommandItem
                              key={product.id}
                              value={product.id}
                              onSelect={() => {
                                form.setValue('productId', product.id);
                                setProductSearchOpen(false);
                                setProductSearch("");
                              }}
                              data-testid={`option-product-${product.id}`}
                              className="flex items-center gap-3 py-3"
                            >
                              <Check
                                className={cn(
                                  "h-4 w-4 shrink-0",
                                  form.watch('productId') === product.id ? "opacity-100" : "opacity-0"
                                )}
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <p className="font-medium truncate">{product.name}</p>
                                  {product.sku && (
                                    <Badge variant="outline" className="text-xs shrink-0">
                                      {product.sku}
                                    </Badge>
                                  )}
                                </div>
                                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                  {product.priceCzk && (
                                    <span className="flex items-center gap-1">
                                      <DollarSign className="h-3 w-3" />
                                      {formatPrice(product.priceCzk, 'CZK')}
                                    </span>
                                  )}
                                  <span className="flex items-center gap-1">
                                    <Package className="h-3 w-3" />
                                    {t('common:stock')}: {product.quantity || 0}
                                  </span>
                                </div>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                {form.watch('productId') && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      form.setValue('productId', undefined);
                      setProductSearch("");
                    }}
                    className="mt-2"
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    {t('common:clearSelection')}
                  </Button>
                )}
              </div>
            )}

            {watchApplicationScope === 'specific_category' && (
              <div>
                <Label className="flex items-center justify-between">
                  <span>{t('discounts:selectCategory')} {t('discounts:required')}</span>
                  <span className="text-xs text-muted-foreground">{t('common:searchable')}</span>
                </Label>
                <Popover open={categorySearchOpen} onOpenChange={setCategorySearchOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={categorySearchOpen}
                      className="w-full justify-between mt-2"
                      data-testid="button-select-category"
                    >
                      {form.watch('categoryId')
                        ? categories.find((category) => String(category.id) === String(form.watch('categoryId')))?.name
                        : t('discounts:searchCategories')}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[400px] p-0" align="start">
                    <Command>
                      <CommandInput 
                        placeholder={t('discounts:searchCategories')}
                        value={categorySearch}
                        onValueChange={setCategorySearch}
                      />
                      <CommandEmpty>
                        {categoriesLoading ? t('common:loading') : t('discounts:noCategories')}
                      </CommandEmpty>
                      <CommandList>
                        <CommandGroup className="max-h-[300px]">
                          {filteredCategories.map((category) => (
                            <CommandItem
                              key={category.id}
                              value={String(category.id)}
                              onSelect={() => {
                                form.setValue('categoryId', String(category.id));
                                setCategorySearchOpen(false);
                                setCategorySearch("");
                              }}
                              data-testid={`option-category-${category.id}`}
                              className="flex items-center gap-3 py-3"
                            >
                              <Check
                                className={cn(
                                  "h-4 w-4 shrink-0",
                                  form.watch('categoryId') === String(category.id) ? "opacity-100" : "opacity-0"
                                )}
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <p className="font-medium truncate">{category.name}</p>
                                  <Badge variant="secondary" className="text-xs shrink-0">
                                    {t('discounts:productsInCategory', { count: category.productCount })}
                                  </Badge>
                                </div>
                                {category.description && (
                                  <p className="text-xs text-muted-foreground truncate">
                                    {category.description}
                                  </p>
                                )}
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                {form.watch('categoryId') && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      form.setValue('categoryId', undefined);
                      setCategorySearch("");
                    }}
                    className="mt-2"
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    {t('common:clearSelection')}
                  </Button>
                )}
              </div>
            )}

            {watchApplicationScope === 'selected_products' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>{t('discounts:selectedProducts')} {t('discounts:required')} ({fields.length})</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => append({ productId: "" })}
                    data-testid="button-add-product"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    {t('discounts:addProduct')}
                  </Button>
                </div>

                {fields.length === 0 && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      {t('discounts:selectProductsFirst')}
                    </AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2 mt-2">
                  {fields.map((field, index) => {
                    const selectedProductId = form.watch(`selectedProductIds.${index}.productId`);
                    const selectedProduct = products.find(p => p.id === selectedProductId);
                    const alreadySelected = getAlreadySelectedProductIds();
                    
                    return (
                      <div key={field.id} className="flex gap-2 items-start">
                        <div className="flex-1">
                          <Popover 
                            open={selectedProductSearchOpen === index} 
                            onOpenChange={(open) => setSelectedProductSearchOpen(open ? index : null)}
                          >
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                role="combobox"
                                aria-expanded={selectedProductSearchOpen === index}
                                className="w-full justify-between"
                                data-testid={`button-select-product-${index}`}
                              >
                                <span className="truncate">
                                  {selectedProduct?.name || t('discounts:searchProducts')}
                                </span>
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[500px] p-0" align="start">
                              <Command>
                                <CommandInput 
                                  placeholder={t('discounts:searchProducts')}
                                  value={selectedProductSearchTerm}
                                  onValueChange={setSelectedProductSearchTerm}
                                />
                                <CommandEmpty>{t('discounts:noProducts')}</CommandEmpty>
                                <CommandList>
                                  <CommandGroup className="max-h-[250px]">
                                    {filteredSelectedProducts
                                      .filter(product => !alreadySelected.has(product.id) || product.id === selectedProductId)
                                      .map((product) => {
                                        const isDuplicate = alreadySelected.has(product.id) && product.id !== selectedProductId;
                                        
                                        return (
                                          <CommandItem
                                            key={product.id}
                                            value={product.id}
                                            disabled={isDuplicate}
                                            onSelect={() => {
                                              if (!isDuplicate) {
                                                form.setValue(`selectedProductIds.${index}.productId`, product.id);
                                                setSelectedProductSearchOpen(null);
                                                setSelectedProductSearchTerm("");
                                              }
                                            }}
                                            data-testid={`option-product-${index}-${product.id}`}
                                            className="flex items-center gap-3 py-3"
                                          >
                                            <Check
                                              className={cn(
                                                "h-4 w-4 shrink-0",
                                                selectedProductId === product.id ? "opacity-100" : "opacity-0"
                                              )}
                                            />
                                            <div className="flex-1 min-w-0">
                                              <div className="flex items-center gap-2 mb-1">
                                                <p className={cn(
                                                  "font-medium truncate",
                                                  isDuplicate && "text-muted-foreground"
                                                )}>
                                                  {product.name}
                                                </p>
                                                {product.sku && (
                                                  <Badge variant="outline" className="text-xs shrink-0">
                                                    {product.sku}
                                                  </Badge>
                                                )}
                                                {isDuplicate && (
                                                  <Badge variant="destructive" className="text-xs shrink-0">
                                                    {t('discounts:alreadySelected')}
                                                  </Badge>
                                                )}
                                              </div>
                                              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                                {product.priceCzk && (
                                                  <span className="flex items-center gap-1">
                                                    <DollarSign className="h-3 w-3" />
                                                    {formatPrice(product.priceCzk, 'CZK')}
                                                  </span>
                                                )}
                                                <span className="flex items-center gap-1">
                                                  <Package className="h-3 w-3" />
                                                  {t('common:stock')}: {product.quantity || 0}
                                                </span>
                                              </div>
                                            </div>
                                          </CommandItem>
                                        );
                                      })}
                                  </CommandGroup>
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          </Popover>
                          {selectedProduct && (
                            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                              {selectedProduct.sku && <span>SKU: {selectedProduct.sku}</span>}
                              {selectedProduct.priceCzk && <span>• {formatPrice(selectedProduct.priceCzk, 'CZK')}</span>}
                            </p>
                          )}
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => remove(index)}
                          data-testid={`button-remove-product-${index}`}
                          className="shrink-0"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Form Validation Errors */}
        {Object.keys(form.formState.errors).length > 0 && (
          <Alert variant="destructive" className="border-red-200 bg-red-50 dark:bg-red-950/30">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="font-medium mb-1">{t('discounts:pleaseFixErrors')}</div>
              <ul className="text-sm list-disc list-inside space-y-0.5">
                {form.formState.errors.name && <li>{t('discounts:nameRequired')}</li>}
                {form.formState.errors.startDate && <li>{t('discounts:startDateRequired')}</li>}
                {form.formState.errors.endDate && <li>{t('discounts:endDateRequired')}</li>}
                {form.formState.errors.discountType && <li>{t('discounts:fillRequiredFields')}</li>}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col-reverse sm:flex-row gap-3 sm:gap-4 sm:justify-end pt-2 pb-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate("/discounts")}
            disabled={createDiscountMutation.isPending}
            className="w-full sm:w-auto"
            data-testid="button-cancel"
          >
            {t('common:cancel')}
          </Button>
          <Button 
            type="submit" 
            disabled={createDiscountMutation.isPending}
            className="w-full sm:w-auto sm:min-w-[160px]"
            data-testid="button-submit"
          >
            {createDiscountMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {t('common:creating')}...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                {t('discounts:createDiscount')}
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
