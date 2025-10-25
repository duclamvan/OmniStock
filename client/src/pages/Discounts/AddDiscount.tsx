import { useState, useEffect, useRef, useMemo } from "react";
import { useLocation } from "wouter";
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

const discountSchema = z.object({
  name: z.string().min(1, "Discount name is required"),
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
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  applicationScope: z.enum(['specific_product', 'all_products', 'specific_category', 'selected_products']),
  productId: z.string().optional(),
  categoryId: z.string().optional(),
  selectedProductIds: z.array(z.object({
    productId: z.string().min(1, "Product is required")
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
  message: "Please fill in all required fields for the selected discount type and scope",
  path: ["discountType"],
});

type DiscountFormData = z.infer<typeof discountSchema>;

export default function AddDiscount() {
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
      fixedAmount: 0,
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
        title: "Success",
        description: "Discount created successfully",
      });
      navigate("/discounts");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create discount",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: DiscountFormData) => {
    const submitData: any = {
      name: data.name,
      description: data.description,
      discountType: data.discountType,
      status: data.status,
      startDate: new Date(data.startDate),
      endDate: new Date(data.endDate),
      applicationScope: data.applicationScope,
    };

    // Add discount type specific fields
    if (data.discountType === 'percentage') {
      submitData.percentage = data.percentage;
    } else if (data.discountType === 'fixed_amount') {
      submitData.fixedAmount = data.fixedAmount;
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
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/discounts")}
          className="mb-4"
          data-testid="button-back"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Discounts
        </Button>
        <h1 className="text-3xl font-bold">Add New Discount</h1>
        <p className="text-muted-foreground mt-1">Create promotional discounts for your products</p>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Information */}
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Info className="h-5 w-5 text-blue-600" />
              Basic Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="flex items-center gap-2">
                  <Hash className="h-4 w-4 text-slate-500" />
                  Discount ID
                </Label>
                <Input 
                  value={discountId || "Auto-generated"} 
                  disabled 
                  className="bg-muted" 
                  data-testid="input-discountId"
                />
                <p className="text-xs text-muted-foreground mt-1">Generated from name and date</p>
              </div>
              <div>
                <Label className="flex items-center gap-2">
                  <Tag className="h-4 w-4 text-slate-500" />
                  Discount Name *
                </Label>
                <Input 
                  {...form.register("name")}
                  placeholder="e.g., Summer Sale 2024"
                  data-testid="input-name"
                />
                {form.formState.errors.name && (
                  <p className="text-sm text-destructive mt-1">{form.formState.errors.name.message}</p>
                )}
              </div>
            </div>

            <div>
              <Label className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-slate-500" />
                Description
              </Label>
              <Textarea 
                {...form.register("description")}
                placeholder="Describe the discount and its terms..."
                rows={3}
                className="resize-none"
                data-testid="textarea-description"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-slate-500" />
                  Start Date *
                </Label>
                <Input 
                  type="datetime-local"
                  {...form.register("startDate")}
                  data-testid="input-startDate"
                />
                {form.formState.errors.startDate && (
                  <p className="text-sm text-destructive mt-1">{form.formState.errors.startDate.message}</p>
                )}
              </div>
              <div>
                <Label className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-slate-500" />
                  End Date *
                </Label>
                <Input 
                  type="datetime-local"
                  {...form.register("endDate")}
                  data-testid="input-endDate"
                />
                {form.formState.errors.endDate && (
                  <p className="text-sm text-destructive mt-1">{form.formState.errors.endDate.message}</p>
                )}
              </div>
              <div>
                <Label>Status</Label>
                <Select 
                  value={form.watch('status')} 
                  onValueChange={(value) => form.setValue('status', value as any)}
                >
                  <SelectTrigger data-testid="select-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 bg-green-500 rounded-full" />
                        Active
                      </div>
                    </SelectItem>
                    <SelectItem value="inactive">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 bg-gray-500 rounded-full" />
                        Inactive
                      </div>
                    </SelectItem>
                    <SelectItem value="finished">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 bg-red-500 rounded-full" />
                        Finished
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Discount Type */}
        <Card className="border-l-4 border-l-green-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Percent className="h-5 w-5 text-green-600" />
              Discount Type & Value
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <RadioGroup 
              value={watchDiscountType} 
              onValueChange={(value) => form.setValue('discountType', value as any)}
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div 
                  className={cn(
                    "border rounded-lg p-4 cursor-pointer transition-all",
                    watchDiscountType === 'percentage' ? 'border-green-500 bg-green-50 dark:bg-green-950' : 'border-border hover:border-green-300'
                  )}
                  onClick={() => form.setValue('discountType', 'percentage')}
                  data-testid="option-discount-percentage"
                >
                  <label htmlFor="percentage" className="cursor-pointer">
                    <div className="flex items-start gap-3">
                      <RadioGroupItem value="percentage" id="percentage" className="mt-1" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 font-medium">
                          <Percent className="h-4 w-4 text-green-600" />
                          Percentage Off
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">Discount by percentage</p>
                      </div>
                    </div>
                  </label>
                </div>

                <div 
                  className={cn(
                    "border rounded-lg p-4 cursor-pointer transition-all",
                    watchDiscountType === 'fixed_amount' ? 'border-green-500 bg-green-50 dark:bg-green-950' : 'border-border hover:border-green-300'
                  )}
                  onClick={() => form.setValue('discountType', 'fixed_amount')}
                  data-testid="option-discount-fixed"
                >
                  <label htmlFor="fixed_amount" className="cursor-pointer">
                    <div className="flex items-start gap-3">
                      <RadioGroupItem value="fixed_amount" id="fixed_amount" className="mt-1" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 font-medium">
                          <Banknote className="h-4 w-4 text-green-600" />
                          Fixed Amount Off
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">Fixed discount amount</p>
                      </div>
                    </div>
                  </label>
                </div>

                <div 
                  className={cn(
                    "border rounded-lg p-4 cursor-pointer transition-all",
                    watchDiscountType === 'buy_x_get_y' ? 'border-green-500 bg-green-50 dark:bg-green-950' : 'border-border hover:border-green-300'
                  )}
                  onClick={() => form.setValue('discountType', 'buy_x_get_y')}
                  data-testid="option-discount-buyxgety"
                >
                  <label htmlFor="buy_x_get_y" className="cursor-pointer">
                    <div className="flex items-start gap-3">
                      <RadioGroupItem value="buy_x_get_y" id="buy_x_get_y" className="mt-1" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 font-medium">
                          <Gift className="h-4 w-4 text-green-600" />
                          Buy X Get Y
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">Buy X items, get Y free</p>
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
                <Label>Discount Percentage *</Label>
                <div className="flex items-center gap-2 mt-2">
                  <Input 
                    type="number"
                    min="1"
                    max="100"
                    {...form.register("percentage", { valueAsNumber: true })}
                    placeholder="10"
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
                <Label>Discount Amount *</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground font-medium min-w-[30px]">CZK</span>
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
                        placeholder="120.00"
                        data-testid="input-fixedAmount-czk"
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground font-medium min-w-[30px]">EUR</span>
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
                        placeholder="4.80"
                        data-testid="input-fixedAmount-eur"
                      />
                    </div>
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
                    <Label>Buy Quantity *</Label>
                    <Input 
                      type="number"
                      min="1"
                      {...form.register("buyQuantity", { valueAsNumber: true })}
                      placeholder="10"
                      data-testid="input-buyQuantity"
                    />
                    {form.formState.errors.buyQuantity && (
                      <p className="text-sm text-destructive mt-1">{form.formState.errors.buyQuantity.message}</p>
                    )}
                  </div>
                  <div>
                    <Label>Get Free Quantity *</Label>
                    <Input 
                      type="number"
                      min="1"
                      {...form.register("getQuantity", { valueAsNumber: true })}
                      placeholder="1"
                      data-testid="input-getQuantity"
                    />
                    {form.formState.errors.getQuantity && (
                      <p className="text-sm text-destructive mt-1">{form.formState.errors.getQuantity.message}</p>
                    )}
                  </div>
                </div>

                <div>
                  <Label>Free Product Type *</Label>
                  <RadioGroup 
                    value={watchGetProductType} 
                    onValueChange={(value) => form.setValue('getProductType', value as any)}
                    className="mt-2"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="same_product" id="same_product" data-testid="radio-same-product" />
                      <label htmlFor="same_product" className="cursor-pointer">Same Product</label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="different_product" id="different_product" data-testid="radio-different-product" />
                      <label htmlFor="different_product" className="cursor-pointer">Different Product</label>
                    </div>
                  </RadioGroup>
                </div>

                {watchGetProductType === 'different_product' && (
                  <div>
                    <Label className="flex items-center justify-between">
                      <span>Select Free Product *</span>
                      <span className="text-xs text-muted-foreground">Press ↑↓ to navigate, Enter to select</span>
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
                            : "Search products..."}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[500px] p-0" align="start">
                        <Command>
                          <CommandInput 
                            placeholder="Search by name, SKU, or description..." 
                            value={getProductSearch}
                            onValueChange={setGetProductSearch}
                          />
                          <CommandEmpty>
                            {productsLoading ? "Loading products..." : "No product found."}
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
                                        Stock: {product.quantity || 0}
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
                        Clear selection
                      </Button>
                    )}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Application Scope */}
        <Card className="border-l-4 border-l-purple-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <ShoppingBag className="h-5 w-5 text-purple-600" />
              Application Scope
            </CardTitle>
            <CardDescription>Define which products this discount applies to</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Apply Discount To</Label>
              <Select 
                value={watchApplicationScope} 
                onValueChange={(value) => {
                  form.setValue('applicationScope', value as any);
                  // Clear related fields when changing scope
                  form.setValue('productId', undefined);
                  form.setValue('categoryId', undefined);
                  form.setValue('selectedProductIds', []);
                }}
              >
                <SelectTrigger className="mt-2" data-testid="select-applicationScope">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all_products">
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4" />
                      All Products
                    </div>
                  </SelectItem>
                  <SelectItem value="specific_product">
                    <div className="flex items-center gap-2">
                      <Tag className="h-4 w-4" />
                      Specific Product
                    </div>
                  </SelectItem>
                  <SelectItem value="specific_category">
                    <div className="flex items-center gap-2">
                      <ShoppingBag className="h-4 w-4" />
                      Specific Category
                    </div>
                  </SelectItem>
                  <SelectItem value="selected_products">
                    <div className="flex items-center gap-2">
                      <ShoppingBag className="h-4 w-4" />
                      Multiple Products
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {watchApplicationScope === 'specific_product' && (
              <div>
                <Label className="flex items-center justify-between">
                  <span>Select Product *</span>
                  <span className="text-xs text-muted-foreground">Searchable with fuzzy matching</span>
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
                        : "Search products..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[500px] p-0" align="start">
                    <Command>
                      <CommandInput 
                        placeholder="Search by name, SKU, or description..." 
                        value={productSearch}
                        onValueChange={setProductSearch}
                      />
                      <CommandEmpty>
                        {productsLoading ? "Loading products..." : "No product found."}
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
                                    Stock: {product.quantity || 0}
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
                    Clear selection
                  </Button>
                )}
              </div>
            )}

            {watchApplicationScope === 'specific_category' && (
              <div>
                <Label className="flex items-center justify-between">
                  <span>Select Category *</span>
                  <span className="text-xs text-muted-foreground">Searchable with product count</span>
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
                        : "Search categories..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[400px] p-0" align="start">
                    <Command>
                      <CommandInput 
                        placeholder="Search categories..." 
                        value={categorySearch}
                        onValueChange={setCategorySearch}
                      />
                      <CommandEmpty>
                        {categoriesLoading ? "Loading categories..." : "No category found."}
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
                                    {category.productCount} products
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
                    Clear selection
                  </Button>
                )}
              </div>
            )}

            {watchApplicationScope === 'selected_products' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Selected Products * ({fields.length})</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => append({ productId: "" })}
                    data-testid="button-add-product"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Product
                  </Button>
                </div>

                {fields.length === 0 && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Click "Add Product" to start adding products to this discount.
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
                                  {selectedProduct?.name || "Search products..."}
                                </span>
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[500px] p-0" align="start">
                              <Command>
                                <CommandInput 
                                  placeholder="Search by name, SKU..." 
                                  value={selectedProductSearchTerm}
                                  onValueChange={setSelectedProductSearchTerm}
                                />
                                <CommandEmpty>No product found.</CommandEmpty>
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
                                                    Already added
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
                                                  Stock: {product.quantity || 0}
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

        {/* Action Buttons */}
        <div className="flex justify-end gap-4 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate("/discounts")}
            disabled={createDiscountMutation.isPending}
            data-testid="button-cancel"
          >
            Cancel
          </Button>
          <Button 
            type="submit" 
            disabled={createDiscountMutation.isPending}
            className="min-w-[160px]"
            data-testid="button-submit"
          >
            {createDiscountMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Create Discount
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
