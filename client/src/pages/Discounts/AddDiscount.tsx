import { useState, useEffect } from "react";
import { useLocation } from "wouter";
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
import { ArrowLeft, Save, Plus, X, Percent, DollarSign, ShoppingBag, Tag, Calendar, Info, Gift } from "lucide-react";
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

const discountSchema = z.object({
  name: z.string().min(1, "Discount name is required"),
  description: z.string().optional(),
  discountType: z.enum(['percentage', 'fixed_amount', 'buy_x_get_y']),
  percentage: z.coerce.number().min(1).max(100).optional(),
  fixedAmount: z.coerce.number().min(0.01).optional(),
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

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/discounts")}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Discounts
        </Button>
        <h1 className="text-2xl font-bold">Add New Discount</h1>
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
                  Basic Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Discount ID</Label>
                    <Input value={discountId || "Auto-generated"} disabled className="bg-gray-50" />
                    <p className="text-xs text-gray-500 mt-1">Generated from name and date</p>
                  </div>
                  <div>
                    <Label>Discount Name *</Label>
                    <Input 
                      {...form.register("name")}
                      placeholder="e.g., Summer Sale"
                    />
                    {form.formState.errors.name && (
                      <p className="text-sm text-red-500 mt-1">{form.formState.errors.name.message}</p>
                    )}
                  </div>
                </div>

                <div>
                  <Label>Description</Label>
                  <Textarea 
                    {...form.register("description")}
                    placeholder="Describe the discount..."
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Start Date *</Label>
                    <Input 
                      type="datetime-local"
                      {...form.register("startDate")}
                    />
                    {form.formState.errors.startDate && (
                      <p className="text-sm text-red-500 mt-1">{form.formState.errors.startDate.message}</p>
                    )}
                  </div>
                  <div>
                    <Label>End Date *</Label>
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
                  <Label>Status</Label>
                  <Select value={form.watch('status')} onValueChange={(value) => form.setValue('status', value as any)}>
                    <SelectTrigger>
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
              </CardContent>
            </Card>

            {/* Discount Type */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Tag className="h-5 w-5" />
                  Discount Type
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
                              Percentage
                            </div>
                            <p className="text-sm text-gray-600 mt-1">Discount by percentage</p>
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
                              <DollarSign className="h-4 w-4" />
                              Fixed Amount
                            </div>
                            <p className="text-sm text-gray-600 mt-1">Fixed discount amount</p>
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
                              Buy X Get Y
                            </div>
                            <p className="text-sm text-gray-600 mt-1">Buy X items, get Y free</p>
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
                    <div className="flex items-center gap-2">
                      <Input 
                        type="number"
                        min="1"
                        max="100"
                        {...form.register("percentage", { valueAsNumber: true })}
                        placeholder="10"
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
                    <Label>Discount Amount *</Label>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm text-gray-600">CZK</Label>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-600">Kč</span>
                          <Input 
                            type="number"
                            min="0.01"
                            step="0.01"
                            {...form.register("fixedAmount", { valueAsNumber: true })}
                            placeholder="120.00"
                            className="max-w-[150px]"
                          />
                        </div>
                      </div>
                      <div>
                        <Label className="text-sm text-gray-600">EUR (converted)</Label>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-600">€</span>
                          <Input 
                            type="number"
                            value={form.watch('fixedAmount') ? (form.watch('fixedAmount') / 25).toFixed(2) : ''}
                            disabled
                            className="max-w-[150px] bg-gray-50"
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
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Buy Quantity *</Label>
                        <Input 
                          type="number"
                          min="1"
                          {...form.register("buyQuantity", { valueAsNumber: true })}
                          placeholder="10"
                        />
                        {form.formState.errors.buyQuantity && (
                          <p className="text-sm text-red-500 mt-1">{form.formState.errors.buyQuantity.message}</p>
                        )}
                      </div>
                      <div>
                        <Label>Get Free Quantity *</Label>
                        <Input 
                          type="number"
                          min="1"
                          {...form.register("getQuantity", { valueAsNumber: true })}
                          placeholder="1"
                        />
                        {form.formState.errors.getQuantity && (
                          <p className="text-sm text-red-500 mt-1">{form.formState.errors.getQuantity.message}</p>
                        )}
                      </div>
                    </div>

                    <div>
                      <Label>Free Product Type *</Label>
                      <RadioGroup 
                        value={watchGetProductType} 
                        onValueChange={(value) => form.setValue('getProductType', value as any)}
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="same_product" id="same_product" />
                          <label htmlFor="same_product" className="cursor-pointer">Same Product</label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="different_product" id="different_product" />
                          <label htmlFor="different_product" className="cursor-pointer">Different Product</label>
                        </div>
                      </RadioGroup>
                    </div>

                    {watchGetProductType === 'different_product' && (
                      <div>
                        <Label>Select Free Product *</Label>
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
                                : "Select product..."}
                              <Check className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-full p-0">
                            <Command>
                              <CommandInput placeholder="Search products..." />
                              <CommandEmpty>No product found.</CommandEmpty>
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
                  Application Scope
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Apply Discount To</Label>
                  <Select 
                    value={watchApplicationScope} 
                    onValueChange={(value) => form.setValue('applicationScope', value as any)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all_products">All Products</SelectItem>
                      <SelectItem value="specific_product">Specific Product</SelectItem>
                      <SelectItem value="specific_category">Specific Category</SelectItem>
                      <SelectItem value="selected_products">Selected Products</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {watchApplicationScope === 'specific_product' && (
                  <div>
                    <Label>Select Product</Label>
                    <Popover open={productSearchOpen} onOpenChange={setProductSearchOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={productSearchOpen}
                          className="w-full justify-between"
                        >
                          {form.watch('productId')
                            ? products.find((product) => product.id === form.watch('productId'))?.name
                            : "Select product..."}
                          <Check className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-full p-0">
                        <Command>
                          <CommandInput placeholder="Search products..." />
                          <CommandEmpty>No product found.</CommandEmpty>
                          <CommandGroup className="max-h-60 overflow-auto">
                            {products.map((product) => (
                              <CommandItem
                                key={product.id}
                                onSelect={() => {
                                  form.setValue('productId', product.id);
                                  setProductSearchOpen(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    form.watch('productId') === product.id ? "opacity-100" : "opacity-0"
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
                    <Label>Select Category</Label>
                    <Popover open={categorySearchOpen} onOpenChange={setCategorySearchOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={categorySearchOpen}
                          className="w-full justify-between"
                        >
                          {form.watch('categoryId')
                            ? categories.find((category) => category.id === form.watch('categoryId'))?.name
                            : "Select category..."}
                          <Check className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-full p-0">
                        <Command>
                          <CommandInput placeholder="Search categories..." />
                          <CommandEmpty>No category found.</CommandEmpty>
                          <CommandGroup className="max-h-60 overflow-auto">
                            {categories.map((category) => (
                              <CommandItem
                                key={category.id}
                                onSelect={() => {
                                  form.setValue('categoryId', category.id);
                                  setCategorySearchOpen(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    form.watch('categoryId') === category.id ? "opacity-100" : "opacity-0"
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
                    <Label>Selected Products</Label>
                    {fields.map((field, index) => (
                      <div key={field.id} className="flex gap-2">
                        <Select
                          value={form.watch(`selectedProductIds.${index}.productId`)}
                          onValueChange={(value) => form.setValue(`selectedProductIds.${index}.productId`, value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select product..." />
                          </SelectTrigger>
                          <SelectContent>
                            {products.map((product) => (
                              <SelectItem key={product.id} value={product.id}>
                                {product.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => remove(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => append({ productId: "" })}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Product
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Summary Sidebar */}
          <div className="lg:col-span-1">
            <Card className="sticky top-20">
              <CardHeader className="bg-gradient-to-r from-blue-500 to-purple-600 text-white">
                <CardTitle className="text-xl">Discount Summary</CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div>
                  <p className="text-sm text-gray-600">Discount Name</p>
                  <p className="font-semibold">{form.watch('name') || "Enter name..."}</p>
                </div>

                <Separator />

                <div>
                  <p className="text-sm text-gray-600">Discount Type</p>
                  <p className="font-semibold capitalize">
                    {watchDiscountType === 'buy_x_get_y' ? 'Buy X Get Y' : watchDiscountType.replace('_', ' ')}
                  </p>
                </div>

                {watchDiscountType === 'percentage' && form.watch('percentage') > 0 && (
                  <>
                    <div>
                      <p className="text-sm text-gray-600">Discount Value</p>
                      <p className="font-semibold text-green-600 text-2xl">{form.watch('percentage')}% OFF</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-sm">Item Price: Kč 500</p>
                      <p className="text-sm text-green-600 font-semibold">
                        You Save: Kč {(500 * form.watch('percentage') / 100).toFixed(0)}
                      </p>
                      <p className="text-sm font-semibold">
                        Final Price: Kč {(500 - (500 * form.watch('percentage') / 100)).toFixed(0)}
                      </p>
                    </div>
                  </>
                )}

                {watchDiscountType === 'fixed_amount' && form.watch('fixedAmount') > 0 && (
                  <>
                    <div>
                      <p className="text-sm text-gray-600">Discount Value</p>
                      <div className="space-y-1">
                        <p className="font-semibold text-green-600 text-xl">Kč {form.watch('fixedAmount')} OFF</p>
                        <p className="text-sm text-gray-600">≈ €{(form.watch('fixedAmount') / 25).toFixed(2)}</p>
                      </div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-sm">Item Price: Kč 500</p>
                      <p className="text-sm text-green-600 font-semibold">
                        You Save: Kč {form.watch('fixedAmount')}
                      </p>
                      <p className="text-sm font-semibold">
                        Final Price: Kč {Math.max(0, 500 - form.watch('fixedAmount')).toFixed(0)}
                      </p>
                    </div>
                  </>
                )}

                {watchDiscountType === 'buy_x_get_y' && (
                  <>
                    <div>
                      <p className="text-sm text-gray-600">Promotion</p>
                      <p className="font-semibold text-green-600 text-lg">
                        Buy {form.watch('buyQuantity') || 0} Get {form.watch('getQuantity') || 0} Free
                      </p>
                    </div>
                    {form.watch('buyQuantity') > 0 && form.watch('getQuantity') > 0 && (
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-xs text-gray-600">Effective Discount</p>
                        <p className="text-sm font-semibold text-green-600">
                          {((form.watch('getQuantity') / (form.watch('buyQuantity') + form.watch('getQuantity'))) * 100).toFixed(1)}% OFF
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          on total {form.watch('buyQuantity') + form.watch('getQuantity')} items
                        </p>
                      </div>
                    )}
                  </>
                )}

                <Separator />

                <div>
                  <p className="text-sm text-gray-600">Application Scope</p>
                  <p className="font-semibold">
                    {watchApplicationScope === 'all_products' && 'All Products'}
                    {watchApplicationScope === 'specific_product' && (
                      <>
                        Specific Product
                        {form.watch('productId') && (
                          <span className="block text-sm text-gray-600 font-normal mt-1">
                            {products.find(p => p.id === form.watch('productId'))?.name}
                          </span>
                        )}
                      </>
                    )}
                    {watchApplicationScope === 'specific_category' && (
                      <>
                        Specific Category
                        {form.watch('categoryId') && (
                          <span className="block text-sm text-gray-600 font-normal mt-1">
                            {categories.find(c => c.id === form.watch('categoryId'))?.name}
                          </span>
                        )}
                      </>
                    )}
                    {watchApplicationScope === 'selected_products' && (
                      <>
                        Selected Products
                        {form.watch('selectedProductIds')?.filter(item => item.productId).length > 0 && (
                          <span className="block text-sm text-gray-600 font-normal mt-1">
                            {form.watch('selectedProductIds').filter(item => item.productId).length} products selected
                          </span>
                        )}
                      </>
                    )}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-gray-600">Status</p>
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
                  disabled={createDiscountMutation.isPending}
                >
                  <Save className="h-4 w-4 mr-2" />
                  {createDiscountMutation.isPending ? "Creating..." : "Create Discount"}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
}