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
import { useTranslation } from 'react-i18next';
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
  orderId: z.string().optional().nullable(),
  name: z.string().min(1, "Service name is required"),
  serviceDate: z.date().optional().nullable(),
  serviceCost: z.string().optional().default("0"),
  currency: z.string().default('EUR'),
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

interface Order {
  id: string;
  orderId: string;
  customerId: string;
  currency: string;
  status: string;
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
  const [orderOpen, setOrderOpen] = useState(false);
  const [productSearchTerms, setProductSearchTerms] = useState<{ [key: number]: string }>({});
  const [openDropdownIndex, setOpenDropdownIndex] = useState<number | null>(null);

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

  const { data: allProducts = [] } = useQuery<Product[]>({
    queryKey: ['/api/products'],
  });

  const { data: orders = [] } = useQuery<Order[]>({
    queryKey: ['/api/orders'],
  });

  const form = useForm<ServiceFormData>({
    resolver: zodResolver(serviceFormSchema),
    defaultValues: {
      customerId: null,
      orderId: null,
      name: '',
      description: '',
      serviceDate: new Date(),
      serviceCost: '0',
      currency: 'EUR',
      status: 'pending',
      notes: '',
    },
  });

  useEffect(() => {
    if (existingService && isEditing) {
      form.reset({
        customerId: existingService.customerId,
        orderId: existingService.orderId || null,
        name: existingService.name,
        description: existingService.description || '',
        serviceDate: existingService.serviceDate ? new Date(existingService.serviceDate) : null,
        serviceCost: existingService.serviceCost || '0',
        currency: existingService.currency || 'EUR',
        status: existingService.status,
        notes: existingService.notes || '',
      });
      
      if (existingService.items && Array.isArray(existingService.items)) {
        const loadedItems = existingService.items.map((item: any, idx: number) => {
          setProductSearchTerms(prev => ({ ...prev, [idx]: item.productName }));
          return {
            productId: item.productId,
            productName: item.productName,
            sku: item.sku,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice,
            customProductName: item.customProductName,
            isCustom: item.productId === null || item.isCustom,
          };
        });
        setServiceItems(loadedItems);
      }
    }
  }, [existingService, isEditing, form]);

  // Auto-populate currency when order is selected
  useEffect(() => {
    const selectedOrderId = form.watch('orderId');
    if (selectedOrderId && orders.length > 0) {
      const selectedOrder = orders.find(o => o.id === selectedOrderId);
      if (selectedOrder && selectedOrder.currency) {
        form.setValue('currency', selectedOrder.currency);
        if (selectedOrder.customerId && !form.watch('customerId')) {
          form.setValue('customerId', selectedOrder.customerId);
        }
      }
    }
  }, [form.watch('orderId'), orders, form]);

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
    setProductSearchTerms(prev => ({ ...prev, [newIndex]: '' }));
  };

  const removeServiceItem = (index: number) => {
    const newItems = serviceItems.filter((_, i) => i !== index);
    setServiceItems(newItems);
    
    // Rebuild productSearchTerms with correct indices
    const newSearchTerms: { [key: number]: string } = {};
    newItems.forEach((item, newIndex) => {
      newSearchTerms[newIndex] = productSearchTerms[newIndex < index ? newIndex : newIndex + 1] || item.productName || '';
    });
    setProductSearchTerms(newSearchTerms);
  };

  const handleProductNameChange = (index: number, searchTerm: string) => {
    setProductSearchTerms(prev => ({ ...prev, [index]: searchTerm }));
    
    const updated = [...serviceItems];
    
    // Try to find matching product from inventory
    const matchingProduct = allProducts.find(p => 
      p.name.toLowerCase() === searchTerm.toLowerCase()
    );
    
    if (matchingProduct) {
      // Product from inventory - auto-fill price
      updated[index] = {
        ...updated[index],
        productId: matchingProduct.id,
        productName: matchingProduct.name,
        sku: matchingProduct.sku,
        unitPrice: matchingProduct.priceEur || '0',
        totalPrice: (updated[index].quantity * parseFloat(matchingProduct.priceEur || '0')).toFixed(2),
        isCustom: false,
      };
    } else {
      // Custom product - keep existing price or default to 0
      updated[index] = {
        ...updated[index],
        productId: null,
        productName: searchTerm,
        sku: null,
        isCustom: true,
      };
    }
    
    setServiceItems(updated);
  };

  const selectProductFromDropdown = (index: number, productId: string) => {
    const product = allProducts.find(p => p.id === productId);
    if (!product) return;
    
    setProductSearchTerms(prev => ({ ...prev, [index]: product.name }));
    
    const updated = [...serviceItems];
    updated[index] = {
      ...updated[index],
      productId: product.id,
      productName: product.name,
      sku: product.sku,
      unitPrice: product.priceEur || '0',
      totalPrice: (updated[index].quantity * parseFloat(product.priceEur || '0')).toFixed(2),
      isCustom: false,
    };
    setServiceItems(updated);
    setOpenDropdownIndex(null); // Close dropdown after selection
  };

  const updateServiceItem = (index: number, field: keyof ServiceItem, value: any) => {
    const updated = [...serviceItems];
    updated[index] = { ...updated[index], [field]: value };
    
    if (field === 'quantity' || field === 'unitPrice') {
      const quantity = field === 'quantity' ? value : updated[index].quantity;
      const unitPrice = field === 'unitPrice' ? value : updated[index].unitPrice;
      updated[index].totalPrice = (quantity * parseFloat(unitPrice || '0')).toFixed(2);
    }
    
    setServiceItems(updated);
  };

  const formatCurrency = (amount: number) => {
    const currency = form.watch('currency') || 'EUR';
    const symbols: Record<string, string> = {
      'USD': '$',
      'EUR': '€',
      'CZK': 'Kč',
      'VND': '₫',
      'CNY': '¥'
    };
    const symbol = symbols[currency] || currency;
    return currency === 'CZK' 
      ? `${amount.toFixed(2)} ${symbol}`
      : `${symbol}${amount.toFixed(2)}`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900">Pending</Badge>;
      case 'in_progress':
        return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 hover:bg-blue-100 dark:hover:bg-blue-900">In Progress</Badge>;
      case 'completed':
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 hover:bg-green-100 dark:hover:bg-green-900">Completed</Badge>;
      case 'cancelled':
        return <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 hover:bg-red-100 dark:hover:bg-red-900">Cancelled</Badge>;
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
              onClick={() => window.history.back()}
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
                      <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded border border-slate-200 dark:border-slate-700 space-y-3">
                        <div>
                          <Label className="text-xs text-slate-600 dark:text-slate-400 mb-1">Customer</Label>
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
                        
                        <div>
                          <Label className="text-xs text-slate-600 dark:text-slate-400 mb-1">
                            Linked Order
                          </Label>
                          <Popover open={orderOpen} onOpenChange={setOrderOpen}>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                role="combobox"
                                aria-expanded={orderOpen}
                                className="w-full justify-between bg-white dark:bg-slate-900"
                                data-testid="button-select-order"
                              >
                                {form.watch('orderId')
                                  ? orders.find((o) => o.id === form.watch('orderId'))?.orderId
                                  : "None"}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-full p-0">
                              <Command>
                                <CommandInput placeholder="Search order..." />
                                <CommandEmpty>No order found.</CommandEmpty>
                                <CommandGroup>
                                  <CommandItem
                                    value="none"
                                    onSelect={() => {
                                      form.setValue('orderId', null);
                                      setOrderOpen(false);
                                    }}
                                    data-testid="option-order-none"
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        !form.watch('orderId') ? "opacity-100" : "opacity-0"
                                      )}
                                    />
                                    None
                                  </CommandItem>
                                  {orders.map((order) => (
                                    <CommandItem
                                      key={order.id}
                                      value={order.orderId}
                                      onSelect={() => {
                                        form.setValue('orderId', order.id);
                                        setOrderOpen(false);
                                      }}
                                      data-testid={`option-order-${order.id}`}
                                    >
                                      <Check
                                        className={cn(
                                          "mr-2 h-4 w-4",
                                          form.watch('orderId') === order.id ? "opacity-100" : "opacity-0"
                                        )}
                                      />
                                      <div className="flex justify-between items-center w-full">
                                        <span>{order.orderId}</span>
                                        <span className="text-xs text-slate-500">{order.currency}</span>
                                      </div>
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </Command>
                            </PopoverContent>
                          </Popover>
                        </div>
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
                          <Label className="text-xs text-slate-600 dark:text-slate-400 mb-1">Currency</Label>
                          <Select
                            value={form.watch("currency")}
                            onValueChange={(value) => form.setValue("currency", value)}
                          >
                            <SelectTrigger data-testid="select-currency">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="EUR">EUR (€)</SelectItem>
                              <SelectItem value="CZK">CZK (Kč)</SelectItem>
                              <SelectItem value="USD">USD ($)</SelectItem>
                              <SelectItem value="VND">VND (₫)</SelectItem>
                              <SelectItem value="CNY">CNY (¥)</SelectItem>
                            </SelectContent>
                          </Select>
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
                    <div className="space-y-3">
                      {/* Parts List */}
                      {serviceItems.map((item, index) => {
                        const searchTerm = productSearchTerms[index] ?? item.productName ?? '';
                        const isDropdownOpen = openDropdownIndex === index;
                        
                        // Show filtered suggestions when typing, or top products when dropdown is open without search
                        const filteredSuggestions = searchTerm.length > 0
                          ? allProducts.filter(p =>
                              p.name.toLowerCase().includes(searchTerm.toLowerCase())
                            ).slice(0, 8)
                          : allProducts.slice(0, 15);
                        
                        const showSuggestions = (isDropdownOpen || searchTerm.length > 0) && filteredSuggestions.length > 0 && !item.productId;

                        return (
                          <div
                            key={index}
                            className="border border-slate-200 dark:border-slate-700 rounded-lg p-4 bg-white dark:bg-slate-800 hover:shadow-sm transition-shadow"
                            data-testid={`part-row-${index}`}
                          >
                            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start">
                              {/* Product Name with Autocomplete - 5 cols */}
                              <div className="md:col-span-5 relative">
                                <Label className="text-xs font-medium mb-1.5 block">Product Name</Label>
                                <Input
                                  placeholder="Click to select or type..."
                                  value={searchTerm}
                                  onChange={(e) => handleProductNameChange(index, e.target.value)}
                                  onFocus={() => setOpenDropdownIndex(index)}
                                  onBlur={() => {
                                    // Delay closing to allow click on dropdown items
                                    setTimeout(() => setOpenDropdownIndex(null), 200);
                                  }}
                                  data-testid={`input-product-name-${index}`}
                                  className="w-full"
                                  autoComplete="off"
                                />
                                {showSuggestions && (
                                  <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md shadow-lg max-h-64 overflow-auto">
                                    {searchTerm.length === 0 && (
                                      <div className="px-3 py-2 bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-600 sticky top-0">
                                        <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">
                                          Quick Select - Top Products
                                        </p>
                                      </div>
                                    )}
                                    {filteredSuggestions.map((product) => (
                                      <button
                                        key={product.id}
                                        type="button"
                                        className="w-full text-left px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-700 flex justify-between items-center border-b border-slate-100 dark:border-slate-700 last:border-b-0"
                                        onClick={() => selectProductFromDropdown(index, product.id)}
                                        data-testid={`suggestion-${product.id}`}
                                      >
                                        <span className="font-medium">{product.name}</span>
                                        <span className="text-xs text-slate-500">€{parseFloat(product.priceEur || '0').toFixed(2)}</span>
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>

                              {/* Quantity - 2 cols */}
                              <div className="md:col-span-2">
                                <Label className="text-xs font-medium mb-1.5 block">Qty</Label>
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
                                <Label className="text-xs font-medium mb-1.5 block">Price (€)</Label>
                                <Input
                                  type="number"
                                  step="0.01"
                                  placeholder="0.00"
                                  value={item.unitPrice}
                                  onChange={(e) => updateServiceItem(index, 'unitPrice', e.target.value)}
                                  data-testid={`input-unit-price-${index}`}
                                />
                              </div>

                              {/* Total - 2 cols */}
                              <div className="md:col-span-2">
                                <Label className="text-xs font-medium mb-1.5 block">Total (€)</Label>
                                <Input
                                  type="text"
                                  value={formatCurrency(parseFloat(item.totalPrice || '0'))}
                                  readOnly
                                  disabled
                                  data-testid={`text-total-price-${index}`}
                                  className="font-semibold bg-slate-50 dark:bg-slate-700 text-right"
                                />
                              </div>

                              {/* Remove Button - 1 col */}
                              <div className="md:col-span-1 flex items-end">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeServiceItem(index)}
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50 w-full md:w-auto"
                                  data-testid={`button-remove-part-${index}`}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
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
