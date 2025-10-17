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
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
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
  Filter,
  User,
  FileText
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

  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ['/api/customers'],
  });

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['/api/categories'],
  });

  const { data: allProducts = [] } = useQuery<Product[]>({
    queryKey: ['/api/products'],
  });

  const filteredProducts = useMemo(() => {
    if (selectedCategory === 'all') return allProducts;
    return allProducts.filter(p => p.categoryId === selectedCategory);
  }, [allProducts, selectedCategory]);

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

  const partsCost = useMemo(() => {
    return serviceItems.reduce((sum, item) => {
      return sum + parseFloat(item.totalPrice || '0');
    }, 0);
  }, [serviceItems]);

  const totalCost = useMemo(() => {
    const serviceCostValue = parseFloat(form.watch('serviceCost') || '0');
    return serviceCostValue + partsCost;
  }, [form.watch('serviceCost'), partsCost]);

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
      updated[index] = {
        ...updated[index],
        productId: null,
        productName: '',
        sku: null,
        customProductName: '',
        isCustom: true,
      };
    } else {
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
    
    if (field === 'quantity' || field === 'unitPrice') {
      const quantity = field === 'quantity' ? value : updated[index].quantity;
      const unitPrice = field === 'unitPrice' ? value : updated[index].unitPrice;
      updated[index].totalPrice = (quantity * parseFloat(unitPrice || '0')).toFixed(2);
    }
    
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Pending</Badge>;
      case 'in_progress':
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">In Progress</Badge>;
      case 'completed':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Completed</Badge>;
      case 'cancelled':
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isEditing && loadingService) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-400">Loading service...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Action Bar */}
      <div className="bg-white dark:bg-slate-900 border-b sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/services')}
              data-testid="button-back"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <Separator orientation="vertical" className="h-6" />
            <div className="flex items-center gap-2">
              <Wrench className="h-5 w-5 text-slate-700 dark:text-slate-300" />
              <h2 className="font-semibold text-sm">
                {isEditing ? 'Edit Service Bill' : 'New Service Bill'}
              </h2>
            </div>
          </div>
        </div>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)}>
        <div className="max-w-7xl mx-auto p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Bill Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Bill Document */}
              <div className="bg-white dark:bg-slate-900 shadow-lg rounded-lg border border-slate-200 dark:border-slate-800">
                {/* Bill Header */}
                <div className="p-8 border-b-4 border-slate-900 dark:border-slate-700">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Wrench className="h-6 w-6 text-slate-700 dark:text-slate-300" />
                        <h1 className="text-3xl font-bold text-slate-900 dark:text-white" data-testid="text-page-title">
                          SERVICE BILL
                        </h1>
                      </div>
                      <p className="text-slate-600 dark:text-slate-400 font-medium">Davie Supply</p>
                      <p className="text-sm text-slate-500 dark:text-slate-500">
                        Professional Service & Repair
                      </p>
                    </div>
                    
                    <div className="text-right">
                      <p className="text-xs text-slate-500 dark:text-slate-500 uppercase tracking-wide mb-1">
                        {isEditing ? 'Bill ID' : 'Draft'}
                      </p>
                      <p className="text-lg font-mono font-semibold text-slate-900 dark:text-white">
                        {isEditing && params.id ? `#${params.id.substring(0, 8).toUpperCase()}` : 'NEW'}
                      </p>
                    </div>
                  </div>

                  {/* Customer & Date Section */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Bill To */}
                    <div>
                      <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-500 uppercase tracking-wide mb-3 flex items-center gap-2">
                        <User className="h-3 w-3" />
                        Bill To
                      </h3>
                      <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded border border-slate-200 dark:border-slate-700">
                        <Popover open={customerOpen} onOpenChange={setCustomerOpen}>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              role="combobox"
                              aria-expanded={customerOpen}
                              className="w-full justify-between bg-white dark:bg-slate-900"
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
                    </div>

                    {/* Service Date & Status */}
                    <div>
                      <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-500 uppercase tracking-wide mb-3 flex items-center gap-2">
                        <CalendarIcon className="h-3 w-3" />
                        Service Information
                      </h3>
                      <div className="space-y-3">
                        <div>
                          <Label className="text-xs text-slate-600 dark:text-slate-400 mb-1">Service Date</Label>
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

                        <div>
                          <Label className="text-xs text-slate-600 dark:text-slate-400 mb-1">Status</Label>
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
                      </div>
                    </div>
                  </div>
                </div>

                {/* Service Details Section */}
                <div className="p-8 border-b border-slate-200 dark:border-slate-700">
                  <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-500 uppercase tracking-wide mb-4 flex items-center gap-2">
                    <FileText className="h-3 w-3" />
                    Service Details
                  </h3>
                  
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="name" className="text-sm font-medium mb-2">
                        Service Name <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="name"
                        placeholder="e.g., Phone Screen Repair"
                        {...form.register("name")}
                        data-testid="input-service-name"
                        className={cn(
                          "text-base",
                          form.formState.errors.name ? "border-red-500" : ""
                        )}
                      />
                      {form.formState.errors.name && (
                        <p className="text-sm text-red-500 mt-1">
                          {form.formState.errors.name.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="description" className="text-sm font-medium mb-2">Description</Label>
                      <Textarea
                        id="description"
                        placeholder="Describe the service performed..."
                        rows={3}
                        {...form.register("description")}
                        data-testid="input-description"
                        className="text-base"
                      />
                    </div>

                    <div>
                      <Label htmlFor="serviceCost" className="text-sm font-medium mb-2">
                        Service Labor Cost (€)
                      </Label>
                      <Input
                        id="serviceCost"
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        {...form.register("serviceCost")}
                        data-testid="input-service-cost"
                        className="text-base font-medium"
                      />
                    </div>

                    <div>
                      <Label htmlFor="notes" className="text-sm font-medium mb-2">Additional Notes</Label>
                      <Textarea
                        id="notes"
                        placeholder="Any additional information or special instructions..."
                        rows={2}
                        {...form.register("notes")}
                        data-testid="input-notes"
                        className="text-base"
                      />
                    </div>
                  </div>
                </div>

                {/* Parts/Items Section */}
                <div className="p-8">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-500 uppercase tracking-wide flex items-center gap-2">
                        <Package className="h-3 w-3" />
                        Parts & Materials
                      </h3>
                      <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                        Add parts from inventory or create custom items
                      </p>
                    </div>
                    <Button
                      type="button"
                      onClick={addServiceItem}
                      size="sm"
                      className="shadow-md"
                      data-testid="button-add-part"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Part
                    </Button>
                  </div>

                  {serviceItems.length === 0 ? (
                    <div className="text-center py-12 border-2 border-dashed rounded-lg bg-slate-50 dark:bg-slate-800/50" data-testid="text-no-parts">
                      <Package className="h-12 w-12 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
                      <p className="text-slate-500 dark:text-slate-400 font-medium">No parts added</p>
                      <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">
                        Click "Add Part" to include parts and materials
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Table Header */}
                      <div className="hidden md:grid md:grid-cols-12 gap-4 pb-3 border-b border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">
                        <div className="col-span-5">Item</div>
                        <div className="col-span-2 text-center">Quantity</div>
                        <div className="col-span-2 text-right">Unit Price</div>
                        <div className="col-span-2 text-right">Total</div>
                        <div className="col-span-1"></div>
                      </div>

                      {/* Parts List */}
                      {serviceItems.map((item, index) => (
                        <div
                          key={index}
                          className="border border-slate-200 dark:border-slate-700 rounded-lg p-4 bg-white dark:bg-slate-800 hover:shadow-md transition-shadow"
                          data-testid={`part-row-${index}`}
                        >
                          <div className="space-y-4">
                            {/* Type Badge & Controls */}
                            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-700">
                              <div className="flex items-center gap-2">
                                {customToggles[index] ? (
                                  <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                                    <Edit3 className="h-3 w-3 mr-1" />
                                    Custom Part
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                    <Box className="h-3 w-3 mr-1" />
                                    Inventory Part
                                  </Badge>
                                )}
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeServiceItem(index)}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                data-testid={`button-remove-part-${index}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>

                            {/* Custom Toggle */}
                            <div className="flex items-center space-x-3">
                              <Checkbox
                                id={`custom-${index}`}
                                checked={customToggles[index] || false}
                                onCheckedChange={(checked) => toggleCustomProduct(index, checked as boolean)}
                                data-testid={`checkbox-custom-product-${index}`}
                              />
                              <Label htmlFor={`custom-${index}`} className="cursor-pointer text-sm font-medium">
                                Use custom product (not from inventory)
                              </Label>
                            </div>

                            {/* Category Filter for Inventory Parts */}
                            {!customToggles[index] && (
                              <div>
                                <Label className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-2 mb-2">
                                  <Filter className="h-3 w-3" />
                                  Filter by Category
                                </Label>
                                <Select
                                  value={selectedCategory}
                                  onValueChange={setSelectedCategory}
                                >
                                  <SelectTrigger data-testid={`select-category-${index}`}>
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

                            {/* Product Selection */}
                            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                              {/* Item Name/Selection - 5 cols */}
                              <div className="md:col-span-5">
                                <Label className="text-xs text-slate-600 dark:text-slate-400 mb-2">
                                  {customToggles[index] ? 'Product Name *' : 'Select Product *'}
                                </Label>
                                {customToggles[index] ? (
                                  <Input
                                    placeholder="Enter custom product name"
                                    value={item.customProductName || ''}
                                    onChange={(e) => {
                                      updateServiceItem(index, 'customProductName', e.target.value);
                                      updateServiceItem(index, 'productName', e.target.value);
                                    }}
                                    data-testid={`input-custom-name-${index}`}
                                  />
                                ) : (
                                  <Popover
                                    open={productOpen[index]}
                                    onOpenChange={(open) => setProductOpen({ ...productOpen, [index]: open })}
                                  >
                                    <PopoverTrigger asChild>
                                      <Button
                                        variant="outline"
                                        role="combobox"
                                        className="w-full justify-between"
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
                                )}
                              </div>

                              {/* Quantity - 2 cols */}
                              <div className="md:col-span-2">
                                <Label className="text-xs text-slate-600 dark:text-slate-400 mb-2">Quantity</Label>
                                <Input
                                  type="number"
                                  min="1"
                                  value={item.quantity}
                                  onChange={(e) => updateServiceItem(index, 'quantity', parseInt(e.target.value) || 1)}
                                  data-testid={`input-quantity-${index}`}
                                  className="text-center"
                                />
                              </div>

                              {/* Unit Price - 2 cols */}
                              <div className="md:col-span-2">
                                <Label className="text-xs text-slate-600 dark:text-slate-400 mb-2">Unit Price (€)</Label>
                                <Input
                                  type="number"
                                  step="0.01"
                                  placeholder="0.00"
                                  value={item.unitPrice}
                                  onChange={(e) => updateServiceItem(index, 'unitPrice', e.target.value)}
                                  data-testid={`input-unit-price-${index}`}
                                  className={customToggles[index] ? "" : ""}
                                />
                              </div>

                              {/* Total - 2 cols */}
                              <div className="md:col-span-2">
                                <Label className="text-xs text-slate-600 dark:text-slate-400 mb-2">Total (€)</Label>
                                <Input
                                  type="text"
                                  value={formatCurrency(parseFloat(item.totalPrice || '0'))}
                                  readOnly
                                  disabled
                                  data-testid={`text-total-price-${index}`}
                                  className="font-semibold bg-slate-50 dark:bg-slate-700 text-right"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Cost Summary Sidebar - Fixed sticky positioning */}
            <div className="lg:col-span-1">
              <div className="sticky top-20 z-10">
                <Card className="shadow-xl border-2">
                  <CardHeader className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 border-b-2">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <DollarSign className="h-5 w-5" />
                      Cost Summary
                    </CardTitle>
                    <CardDescription>Review totals</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <div className="space-y-4">
                      {/* Cost Breakdown */}
                      <div className="space-y-3 pb-4">
                        <div className="flex justify-between items-center py-2 border-b border-slate-200 dark:border-slate-700" data-testid="summary-service-cost">
                          <span className="text-sm text-slate-600 dark:text-slate-400">Service Labor:</span>
                          <span className="font-semibold text-slate-900 dark:text-white">
                            {formatCurrency(parseFloat(form.watch('serviceCost') || '0'))}
                          </span>
                        </div>
                        
                        <div className="flex justify-between items-center py-2 border-b border-slate-200 dark:border-slate-700" data-testid="summary-parts-cost">
                          <span className="text-sm text-slate-600 dark:text-slate-400">
                            Parts & Materials:
                            {serviceItems.length > 0 && (
                              <span className="ml-1 text-xs">({serviceItems.length})</span>
                            )}
                          </span>
                          <span className="font-semibold text-slate-900 dark:text-white">
                            {formatCurrency(partsCost)}
                          </span>
                        </div>
                      </div>
                      
                      {/* Total */}
                      <div className="pt-4 border-t-2 border-slate-300 dark:border-slate-600">
                        <div className="flex justify-between items-center" data-testid="summary-total-cost">
                          <span className="font-bold text-base text-slate-900 dark:text-white">Total Amount:</span>
                          <div className="text-right">
                            <div className="text-2xl font-bold text-primary">
                              {formatCurrency(totalCost)}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Status Display */}
                      <div className="pt-4 pb-2">
                        <Label className="text-xs text-slate-600 dark:text-slate-400 mb-2">Current Status</Label>
                        <div className="mt-2">
                          {getStatusBadge(form.watch("status") || "pending")}
                        </div>
                      </div>

                      <Separator />

                      {/* Action Buttons */}
                      <div className="pt-2 space-y-3">
                        <Button
                          type="submit"
                          className="w-full"
                          size="lg"
                          disabled={saveServiceMutation.isPending}
                          data-testid="button-save"
                        >
                          {saveServiceMutation.isPending ? (
                            <>
                              <span className="animate-spin mr-2">⏳</span>
                              Saving...
                            </>
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
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
