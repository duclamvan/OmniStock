import { useState } from "react";
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
import { ArrowLeft, Save, Plus, X } from "lucide-react";
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

const discountSchema = z.object({
  name: z.string().min(1, "Discount name is required"),
  description: z.string().optional(),
  percentage: z.coerce.number().min(1, "Percentage must be at least 1").max(100, "Percentage cannot exceed 100"),
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
  message: "Please select required fields based on application scope",
  path: ["applicationScope"],
});

type DiscountFormData = z.infer<typeof discountSchema>;

export default function AddDiscount() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [discountId, setDiscountId] = useState("");
  const [productSearchOpen, setProductSearchOpen] = useState(false);
  const [categorySearchOpen, setCategorySearchOpen] = useState(false);

  // Fetch products
  const { data: products = [] } = useQuery({
    queryKey: ['/api/products'],
  });

  // Fetch categories
  const { data: categories = [] } = useQuery({
    queryKey: ['/api/categories'],
  });

  const form = useForm<DiscountFormData>({
    resolver: zodResolver(discountSchema),
    defaultValues: {
      name: "",
      description: "",
      percentage: 0,
      status: "active",
      startDate: "",
      endDate: "",
      applicationScope: "specific_product",
      selectedProductIds: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "selectedProductIds",
  });

  const watchName = form.watch("name");
  const watchStartDate = form.watch("startDate");
  const watchApplicationScope = form.watch("applicationScope");

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
      percentage: data.percentage,
      status: data.status,
      startDate: new Date(data.startDate),
      endDate: new Date(data.endDate),
      applicationScope: data.applicationScope,
    };

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
    <div className="p-6 max-w-4xl mx-auto">
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
        <Card>
          <CardHeader>
            <CardTitle>Discount Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Discount ID and Name */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Discount ID</Label>
                <Input value={discountId} disabled className="bg-gray-50" />
                <p className="text-xs text-gray-500 mt-1">Auto-generated from name and date</p>
              </div>
              <div>
                <Label>Discount Name</Label>
                <Input 
                  {...form.register("name")}
                  placeholder="e.g., Summer Sale"
                />
                {form.formState.errors.name && (
                  <p className="text-sm text-red-500 mt-1">{form.formState.errors.name.message}</p>
                )}
              </div>
            </div>

            {/* Percentage and Status */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Discount Percentage</Label>
                <div className="relative">
                  <Input 
                    type="number"
                    {...form.register("percentage")}
                    placeholder="15"
                    className="pr-8"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">%</span>
                </div>
                {form.formState.errors.percentage && (
                  <p className="text-sm text-red-500 mt-1">{form.formState.errors.percentage.message}</p>
                )}
              </div>
              <div>
                <Label>Status</Label>
                <Select
                  value={form.watch("status")}
                  onValueChange={(value) => form.setValue("status", value as any)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="finished">Finished</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Date Range */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>From Date</Label>
                <Input 
                  type="date"
                  {...form.register("startDate")}
                />
                {form.formState.errors.startDate && (
                  <p className="text-sm text-red-500 mt-1">{form.formState.errors.startDate.message}</p>
                )}
              </div>
              <div>
                <Label>To Date</Label>
                <Input 
                  type="date"
                  {...form.register("endDate")}
                />
                {form.formState.errors.endDate && (
                  <p className="text-sm text-red-500 mt-1">{form.formState.errors.endDate.message}</p>
                )}
              </div>
            </div>

            {/* Application Scope */}
            <div>
              <Label>Application Scope</Label>
              <Select
                value={form.watch("applicationScope")}
                onValueChange={(value) => form.setValue("applicationScope", value as any)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="specific_product">Specific product</SelectItem>
                  <SelectItem value="all_products">All products</SelectItem>
                  <SelectItem value="specific_category">Specific category</SelectItem>
                  <SelectItem value="selected_products">Selected products</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Product Selection for specific_product */}
            {watchApplicationScope === 'specific_product' && (
              <div>
                <Label>Product Name</Label>
                <Popover open={productSearchOpen} onOpenChange={setProductSearchOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={productSearchOpen}
                      className="w-full justify-between"
                    >
                      {form.watch("productId")
                        ? products.find((product: any) => product.id === form.watch("productId"))?.name
                        : "Select product..."}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0">
                    <Command>
                      <CommandInput placeholder="Search product..." />
                      <CommandEmpty>No product found.</CommandEmpty>
                      <CommandGroup className="max-h-64 overflow-auto">
                        {products.map((product: any) => (
                          <CommandItem
                            key={product.id}
                            value={product.name}
                            onSelect={() => {
                              form.setValue("productId", product.id);
                              setProductSearchOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                form.watch("productId") === product.id ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {product.name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </Command>
                  </PopoverContent>
                </Popover>
                {form.formState.errors.productId && (
                  <p className="text-sm text-red-500 mt-1">{form.formState.errors.productId.message}</p>
                )}
              </div>
            )}

            {/* Category Selection for specific_category */}
            {watchApplicationScope === 'specific_category' && (
              <div>
                <Label>Category</Label>
                <Popover open={categorySearchOpen} onOpenChange={setCategorySearchOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={categorySearchOpen}
                      className="w-full justify-between"
                    >
                      {form.watch("categoryId")
                        ? categories.find((category: any) => category.id === form.watch("categoryId"))?.name
                        : "Select category..."}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0">
                    <Command>
                      <CommandInput placeholder="Search category..." />
                      <CommandEmpty>No category found.</CommandEmpty>
                      <CommandGroup className="max-h-64 overflow-auto">
                        {categories.map((category: any) => (
                          <CommandItem
                            key={category.id}
                            value={category.name}
                            onSelect={() => {
                              form.setValue("categoryId", category.id);
                              setCategorySearchOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                form.watch("categoryId") === category.id ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {category.name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </Command>
                  </PopoverContent>
                </Popover>
                {form.formState.errors.categoryId && (
                  <p className="text-sm text-red-500 mt-1">{form.formState.errors.categoryId.message}</p>
                )}
              </div>
            )}

            {/* Multiple Product Selection for selected_products */}
            {watchApplicationScope === 'selected_products' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <Label>Selected Products</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => append({ productId: "" })}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Product
                  </Button>
                </div>
                {fields.map((field, index) => (
                  <div key={field.id} className="flex gap-2">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          className="flex-1 justify-between"
                        >
                          {form.watch(`selectedProductIds.${index}.productId`)
                            ? products.find((product: any) => product.id === form.watch(`selectedProductIds.${index}.productId`))?.name
                            : "Select product..."}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-full p-0">
                        <Command>
                          <CommandInput placeholder="Search product..." />
                          <CommandEmpty>No product found.</CommandEmpty>
                          <CommandGroup className="max-h-64 overflow-auto">
                            {products.map((product: any) => (
                              <CommandItem
                                key={product.id}
                                value={product.name}
                                onSelect={() => {
                                  form.setValue(`selectedProductIds.${index}.productId`, product.id);
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    form.watch(`selectedProductIds.${index}.productId`) === product.id ? "opacity-100" : "opacity-0"
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
                      onClick={() => remove(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                {form.formState.errors.selectedProductIds && (
                  <p className="text-sm text-red-500 mt-1">{form.formState.errors.selectedProductIds.message}</p>
                )}
              </div>
            )}

            {/* Description */}
            <div>
              <Label>Description (optional)</Label>
              <Textarea 
                {...form.register("description")}
                placeholder="Enter discount description..."
                className="h-24"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-4 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/discounts")}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createDiscountMutation.isPending}
                className="bg-teal-600 hover:bg-teal-700"
              >
                <Save className="h-4 w-4 mr-2" />
                Save Now
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}