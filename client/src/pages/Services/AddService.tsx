import { useState, useEffect, useMemo, useRef } from "react";
import { useLocation, useParams } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { 
  ArrowLeft, 
  Save, 
  CalendarIcon,
  Wrench,
  Package,
  Plus,
  Trash2,
  DollarSign,
  PackagePlus,
  Box,
  Edit3,
  Filter
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { Check, ChevronsUpDown } from "lucide-react";
import { insertServiceSchema } from "@shared/schema";
import { formatCzechDate } from "@/lib/dateUtils";

// Extend the schema for form validation
const serviceFormSchema = insertServiceSchema.extend({
  customerId: z.string().optional().nullable(),
  name: z.string().min(1, "Service name is required"),
  serviceDate: z.date().optional().nullable(),
  serviceCost: z.string().optional().default("0"),
  notes: z.string().optional(),
});

type ServiceFormData = z.infer<typeof serviceFormSchema>;

interface ServiceItem {
  productId: string | null;
  productName: string;
  sku: string | null;
  quantity: number;
  unitPrice: string;
  totalPrice: string;
  customProductName?: string;
  isCustom?: boolean;
}

interface Customer {
  id: string;
  name: string;
  email: string | null;
}

interface Product {
  id: string;
  name: string;
  sku: string;
  priceEur: string | null;
  categoryId: string | null;
}

interface Category {
  id: number;
  name: string;
}

export default function AddService() {
  const [, navigate] = useLocation();
  const params = useParams();
  const { toast } = useToast();
  const isEditing = !!params.id;

  const [serviceItems, setServiceItems] = useState<ServiceItem[]>([]);
  const [customerOpen, setCustomerOpen] = useState(false);
  const [productOpen, setProductOpen] = useState<{ [key: number]: boolean }>({});
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [customToggles, setCustomToggles] = useState<{ [key: number]: boolean }>({});
  const defaultCategorySet = useRef(false);

  // Fetch existing service data if editing
  const { data: existingService, isLoading: loadingService } = useQuery({
    queryKey: ['/api/services', params.id],
    queryFn: async () => {
      if (!params.id) return null;
      const response = await fetch(`/api/services/${params.id}`);
      if (!response.ok) throw new Error('Failed to fetch service');
      return response.json();
    },
    enabled: isEditing,
  });

  // Fetch customers for selector
  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ['/api/customers'],
  });

  // Fetch categories
  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['/api/categories'],
  });

  // Fetch products for parts selector
  const { data: allProducts = [] } = useQuery<Product[]>({
    queryKey: ['/api/products'],
  });

  // Filter products by selected category
  const filteredProducts = useMemo(() => {
    if (selectedCategory === 'all') return allProducts;
    return allProducts.filter(p => p.categoryId === selectedCategory);
  }, [allProducts, selectedCategory]);

  // Set default category to "Electronic Parts" when categories load
  useEffect(() => {
    if (categories.length > 0 && !defaultCategorySet.current) {
      const electronicPartsCategory = categories.find(
        (cat) => cat.name === 'Electronic Parts'
      );
      if (electronicPartsCategory) {
        setSelectedCategory(electronicPartsCategory.id.toString());
      }
      defaultCategorySet.current = true;
    }
  }, [categories]);

  const form = useForm<ServiceFormData>({
    resolver: zodResolver(serviceFormSchema),
    defaultValues: {
      customerId: null,
      name: '',
      description: '',
      serviceDate: new Date(),
      serviceCost: '0',
      status: 'pending',
      notes: '',
    },
  });

  // Load existing service data into form when editing
  useEffect(() => {
    if (existingService && isEditing) {
      form.reset({
        customerId: existingService.customerId,
        name: existingService.name,
        description: existingService.description || '',
        serviceDate: existingService.serviceDate ? new Date(existingService.serviceDate) : null,
        serviceCost: existingService.serviceCost || '0',
        status: existingService.status,
        notes: existingService.notes || '',
      });
      
      // Load service items if available
      if (existingService.items && Array.isArray(existingService.items)) {
        const loadedItems = existingService.items.map((item: any, idx: number) => {
          const isCustom = item.productId === null || item.isCustom;
          if (isCustom) {
            setCustomToggles(prev => ({ ...prev, [idx]: true }));
          }
          return {
            productId: item.productId,
            productName: item.productName,
            sku: item.sku,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice,
            customProductName: item.customProductName,
            isCustom,
          };
        });
        setServiceItems(loadedItems);
      }
    }
  }, [existingService, isEditing, form]);

  // Calculate total parts cost
  const partsCost = useMemo(() => {
    return serviceItems.reduce((sum, item) => {
      return sum + parseFloat(item.totalPrice || '0');
    }, 0);
  }, [serviceItems]);

  // Calculate total cost
  const totalCost = useMemo(() => {
    const serviceCostValue = parseFloat(form.watch('serviceCost') || '0');
    return serviceCostValue + partsCost;
  }, [form.watch('serviceCost'), partsCost]);

  // Create/Update service mutation
  const saveServiceMutation = useMutation({
    mutationFn: async (data: any) => {
      if (isEditing) {
        return await apiRequest('PATCH', `/api/services/${params.id}`, data);
      } else {
        return await apiRequest('POST', '/api/services', data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/services'] });
      toast({
        title: "Success",
        description: `Service ${isEditing ? 'updated' : 'created'} successfully`,
      });
      navigate('/services');
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || `Failed to ${isEditing ? 'update' : 'create'} service`,
        variant: "destructive",
      });
    },
  });

  const onSubmit = async (data: ServiceFormData) => {
    const serviceData = {
      ...data,
      serviceDate: data.serviceDate ? data.serviceDate.toISOString() : null,
      serviceCost: parseFloat(data.serviceCost || '0').toString(),
      partsCost: partsCost.toString(),
      totalCost: totalCost.toString(),
      items: serviceItems,
    };

    await saveServiceMutation.mutateAsync(serviceData);
  };

  const addServiceItem = () => {
    const newIndex = serviceItems.length;
    setServiceItems([
      ...serviceItems,
      {
        productId: '',
        productName: '',
        sku: null,
        quantity: 1,
        unitPrice: '0',
        totalPrice: '0',
        isCustom: false,
      },
    ]);
    setCustomToggles(prev => ({ ...prev, [newIndex]: false }));
  };

  const removeServiceItem = (index: number) => {
    setServiceItems(serviceItems.filter((_, i) => i !== index));
    const newToggles = { ...customToggles };
    delete newToggles[index];
    setCustomToggles(newToggles);
  };

  const toggleCustomProduct = (index: number, isCustom: boolean) => {
    const updated = [...serviceItems];
    setCustomToggles(prev => ({ ...prev, [index]: isCustom }));
    
    if (isCustom) {
      // Switch to custom mode - clear product selection
      updated[index] = {
        ...updated[index],
        productId: null,
        productName: '',
        sku: null,
        customProductName: '',
        isCustom: true,
      };
    } else {
      // Switch to regular mode - clear custom fields
      updated[index] = {
        ...updated[index],
        productId: '',
        productName: '',
        customProductName: undefined,
        isCustom: false,
      };
    }
    setServiceItems(updated);
  };

  const updateServiceItem = (index: number, field: keyof ServiceItem, value: any) => {
    const updated = [...serviceItems];
    updated[index] = { ...updated[index], [field]: value };
    
    // Auto-calculate total price when quantity or unit price changes
    if (field === 'quantity' || field === 'unitPrice') {
      const quantity = field === 'quantity' ? value : updated[index].quantity;
      const unitPrice = field === 'unitPrice' ? value : updated[index].unitPrice;
      updated[index].totalPrice = (quantity * parseFloat(unitPrice || '0')).toFixed(2);
    }
    
    // If product selected, auto-fill price and details
    if (field === 'productId' && value) {
      const product = allProducts.find(p => p.id === value);
      if (product) {
        updated[index].productName = product.name;
        updated[index].sku = product.sku;
        updated[index].unitPrice = product.priceEur || '0';
        updated[index].totalPrice = (updated[index].quantity * parseFloat(product.priceEur || '0')).toFixed(2);
      }
    }
    
    setServiceItems(updated);
  };

  const formatCurrency = (amount: number) => {
    return `€${amount.toFixed(2)}`;
  };

  if (isEditing && loadingService) {
    return (
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="text-center py-12">
          <p className="text-slate-600">Loading service...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/services')}
          data-testid="button-back"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight" data-testid="text-page-title">
            {isEditing ? 'Edit Service' : 'Add Service'}
          </h1>
          <p className="text-slate-600 mt-1">
            {isEditing ? 'Update service details and parts' : 'Create a new service record'}
          </p>
        </div>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Service Details Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wrench className="h-5 w-5" />
                  Service Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Customer Selector */}
                <div>
                  <Label>Customer</Label>
                  <Popover open={customerOpen} onOpenChange={setCustomerOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={customerOpen}
                        className="w-full justify-between"
                        data-testid="button-select-customer"
                      >
                        {form.watch('customerId')
                          ? customers.find((c) => c.id === form.watch('customerId'))?.name
                          : "Select customer..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0">
                      <Command>
                        <CommandInput placeholder="Search customer..." />
                        <CommandEmpty>No customer found.</CommandEmpty>
                        <CommandGroup>
                          {customers.map((customer) => (
                            <CommandItem
                              key={customer.id}
                              value={customer.name}
                              onSelect={() => {
                                form.setValue('customerId', customer.id);
                                setCustomerOpen(false);
                              }}
                              data-testid={`option-customer-${customer.id}`}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  form.watch('customerId') === customer.id ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {customer.name}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Service Name */}
                <div>
                  <Label htmlFor="name">Service Name *</Label>
                  <Input
                    id="name"
                    placeholder="e.g., Phone Screen Repair"
                    {...form.register("name")}
                    data-testid="input-service-name"
                    className={form.formState.errors.name ? "border-red-500" : ""}
                  />
                  {form.formState.errors.name && (
                    <p className="text-sm text-red-500 mt-1">
                      {form.formState.errors.name.message}
                    </p>
                  )}
                </div>

                {/* Description */}
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Service details..."
                    rows={3}
                    {...form.register("description")}
                    data-testid="input-description"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Service Date */}
                  <div>
                    <Label>Service Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !form.watch("serviceDate") && "text-muted-foreground"
                          )}
                          data-testid="button-select-date"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {form.watch("serviceDate") ? formatCzechDate(form.watch("serviceDate")!) : "Select date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={form.watch("serviceDate") || undefined}
                          onSelect={(date) => form.setValue("serviceDate", date || null)}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  {/* Service Cost */}
                  <div>
                    <Label htmlFor="serviceCost">Service Cost (€)</Label>
                    <Input
                      id="serviceCost"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      {...form.register("serviceCost")}
                      data-testid="input-service-cost"
                    />
                  </div>
                </div>

                {/* Status */}
                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={form.watch("status")}
                    onValueChange={(value) => form.setValue("status", value)}
                  >
                    <SelectTrigger data-testid="select-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Notes */}
                <div>
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    placeholder="Additional notes..."
                    rows={3}
                    {...form.register("notes")}
                    data-testid="input-notes"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Parts Used Card */}
            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5 text-primary" />
                    Parts Used
                  </CardTitle>
                  <Button
                    type="button"
                    onClick={addServiceItem}
                    className="bg-primary hover:bg-primary/90 shadow-md"
                    data-testid="button-add-part"
                  >
                    <PackagePlus className="h-4 w-4 mr-2" />
                    Add Part
                  </Button>
                </div>
                <CardDescription className="mt-2">
                  Add parts from inventory or create custom items
                </CardDescription>
              </CardHeader>
              <CardContent>
                {serviceItems.length === 0 ? (
                  <div className="text-center py-12 border-2 border-dashed rounded-lg" data-testid="text-no-parts">
                    <Package className="h-12 w-12 mx-auto text-slate-300 mb-3" />
                    <p className="text-slate-500 font-medium">No parts added yet</p>
                    <p className="text-sm text-slate-400 mt-1">Click "Add Part" to get started</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {serviceItems.map((item, index) => (
                      <div key={index} className="border-2 rounded-lg p-5 bg-slate-50/50 relative" data-testid={`part-row-${index}`}>
                        {/* Visual indicator for custom vs regular product */}
                        <div className="absolute -top-3 left-4 bg-white px-2 py-1 rounded-md border flex items-center gap-2">
                          {customToggles[index] ? (
                            <>
                              <Edit3 className="h-3 w-3 text-purple-500" />
                              <span className="text-xs font-medium text-purple-700">Custom Part</span>
                            </>
                          ) : (
                            <>
                              <Box className="h-3 w-3 text-blue-500" />
                              <span className="text-xs font-medium text-blue-700">Inventory Part</span>
                            </>
                          )}
                        </div>

                        <div className="space-y-5 mt-2">
                          {/* Product Selection Section */}
                          <div className="space-y-4">
                            <div className="flex items-center gap-3 pb-3 border-b">
                              <Package className="h-4 w-4 text-primary" />
                              <h4 className="font-semibold text-sm">Product Selection</h4>
                            </div>

                            {/* Custom Product Toggle */}
                            <div className="flex items-center space-x-3 bg-white p-3 rounded-md border">
                              <Checkbox
                                id={`custom-${index}`}
                                checked={customToggles[index] || false}
                                onCheckedChange={(checked) => toggleCustomProduct(index, checked as boolean)}
                                data-testid={`checkbox-custom-product-${index}`}
                              />
                              <Label htmlFor={`custom-${index}`} className="cursor-pointer font-medium text-sm">
                                Use Custom Product
                              </Label>
                            </div>

                            {/* Category Filter - Only show for regular products */}
                            {!customToggles[index] && (
                              <div>
                                <Label className="text-xs text-slate-600 flex items-center gap-2 mb-2">
                                  <Filter className="h-3 w-3" />
                                  Filter by Category
                                </Label>
                                <Select
                                  value={selectedCategory}
                                  onValueChange={setSelectedCategory}
                                >
                                  <SelectTrigger data-testid={`select-category-${index}`} className="bg-white">
                                    <SelectValue placeholder="Select category" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="all">All Categories</SelectItem>
                                    {categories.map((category) => (
                                      <SelectItem key={category.id} value={category.id.toString()}>
                                        {category.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            )}

                            {/* Product Selector or Custom Fields */}
                            {customToggles[index] ? (
                              <div className="grid grid-cols-2 gap-4">
                                {/* Custom Product Name */}
                                <div>
                                  <Label className="text-xs text-slate-600 mb-2">Product Name *</Label>
                                  <Input
                                    placeholder="Enter custom product name"
                                    value={item.customProductName || ''}
                                    onChange={(e) => {
                                      updateServiceItem(index, 'customProductName', e.target.value);
                                      updateServiceItem(index, 'productName', e.target.value);
                                    }}
                                    data-testid={`input-custom-name-${index}`}
                                    className="bg-white"
                                  />
                                </div>

                                {/* Custom Unit Price */}
                                <div>
                                  <Label className="text-xs text-slate-600 mb-2">Unit Price (€) *</Label>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    placeholder="0.00"
                                    value={item.unitPrice}
                                    onChange={(e) => updateServiceItem(index, 'unitPrice', e.target.value)}
                                    data-testid={`input-custom-price-${index}`}
                                    className="bg-white"
                                  />
                                </div>
                              </div>
                            ) : (
                              <div>
                                <Label className="text-xs text-slate-600 mb-2">Select Product</Label>
                                <Popover
                                  open={productOpen[index]}
                                  onOpenChange={(open) => setProductOpen({ ...productOpen, [index]: open })}
                                >
                                  <PopoverTrigger asChild>
                                    <Button
                                      variant="outline"
                                      role="combobox"
                                      className="w-full justify-between bg-white"
                                      data-testid={`button-select-product-${index}`}
                                    >
                                      {item.productId
                                        ? allProducts.find((p) => p.id === item.productId)?.name || "Select..."
                                        : "Select product..."}
                                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-full p-0">
                                    <Command>
                                      <CommandInput placeholder="Search product..." />
                                      <CommandEmpty>No product found.</CommandEmpty>
                                      <CommandGroup>
                                        {filteredProducts.map((product) => (
                                          <CommandItem
                                            key={product.id}
                                            value={product.name}
                                            onSelect={() => {
                                              updateServiceItem(index, 'productId', product.id);
                                              setProductOpen({ ...productOpen, [index]: false });
                                            }}
                                            data-testid={`option-product-${product.id}`}
                                          >
                                            <Check
                                              className={cn(
                                                "mr-2 h-4 w-4",
                                                item.productId === product.id ? "opacity-100" : "opacity-0"
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

                          {/* Pricing Details Section */}
                          <div className="space-y-4">
                            <div className="flex items-center gap-3 pb-3 border-b">
                              <DollarSign className="h-4 w-4 text-primary" />
                              <h4 className="font-semibold text-sm">Pricing Details</h4>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              {/* Quantity */}
                              <div>
                                <Label className="text-xs text-slate-600 mb-2">Quantity</Label>
                                <Input
                                  type="number"
                                  min="1"
                                  value={item.quantity}
                                  onChange={(e) => updateServiceItem(index, 'quantity', parseInt(e.target.value) || 1)}
                                  data-testid={`input-quantity-${index}`}
                                  className="bg-white"
                                />
                              </div>

                              {/* Unit Price - Only editable for custom products */}
                              {!customToggles[index] && (
                                <div>
                                  <Label className="text-xs text-slate-600 mb-2">Unit Price (€)</Label>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    value={item.unitPrice}
                                    onChange={(e) => updateServiceItem(index, 'unitPrice', e.target.value)}
                                    data-testid={`input-unit-price-${index}`}
                                    className="bg-white"
                                  />
                                </div>
                              )}

                              {/* Total Price */}
                              <div className={customToggles[index] ? "col-span-2" : ""}>
                                <Label className="text-xs text-slate-600 mb-2">Total (€)</Label>
                                <Input
                                  type="text"
                                  value={formatCurrency(parseFloat(item.totalPrice || '0'))}
                                  readOnly
                                  disabled
                                  data-testid={`text-total-price-${index}`}
                                  className="font-semibold"
                                />
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Remove Button */}
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeServiceItem(index)}
                          className="absolute -top-3 -right-3 text-red-600 hover:text-red-700 hover:bg-red-50 bg-white border shadow-sm rounded-full h-8 w-8"
                          data-testid={`button-remove-part-${index}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Summary Sidebar */}
          <div className="lg:col-span-1">
            <Card className="sticky top-4">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Cost Summary
                </CardTitle>
                <CardDescription>Review before saving</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-6">
                <div className="space-y-3">
                  <div className="flex justify-between text-sm" data-testid="summary-service-cost">
                    <span className="text-slate-600">Service Cost:</span>
                    <span className="font-medium">
                      {formatCurrency(parseFloat(form.watch('serviceCost') || '0'))}
                    </span>
                  </div>
                  
                  <div className="flex justify-between text-sm" data-testid="summary-parts-cost">
                    <span className="text-slate-600">Parts Cost:</span>
                    <span className="font-medium">
                      {formatCurrency(partsCost)}
                    </span>
                  </div>
                  
                  <div className="pt-3 border-t">
                    <div className="flex justify-between" data-testid="summary-total-cost">
                      <span className="font-bold text-lg">Total Cost:</span>
                      <span className="text-2xl font-bold text-primary">
                        {formatCurrency(totalCost)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 space-y-3">
                  <Button
                    type="submit"
                    className="w-full"
                    size="lg"
                    disabled={saveServiceMutation.isPending}
                    data-testid="button-save"
                  >
                    {saveServiceMutation.isPending ? (
                      <>Saving...</>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        {isEditing ? 'Update Service' : 'Create Service'}
                      </>
                    )}
                  </Button>
                  
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => navigate('/services')}
                    data-testid="button-cancel"
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
}
