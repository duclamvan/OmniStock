import { useState, useEffect, useRef, useMemo } from "react";
import { useLocation, useParams } from "wouter";
import { useTranslation } from 'react-i18next';
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
import { useSettings } from "@/contexts/SettingsContext";
import { 
  ArrowLeft, 
  Save, 
  Plus, 
  X, 
  Search, 
  Package, 
  User, 
  FileText, 
  TruckIcon, 
  ShoppingCart,
  Receipt,
  CheckCircle2,
  AlertCircle,
  Clock,
  Trash2,
  Scan
} from "lucide-react";
import { getCurrencySymbol, Currency } from "@/lib/currencyUtils";
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
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function EditReturn() {
  const [, navigate] = useLocation();
  const { id } = useParams();
  const { toast } = useToast();
  const { t } = useTranslation(['inventory', 'common']);
  const { inventorySettings } = useSettings();
  
  const enabledReturnTypes = useMemo(() => {
    return (inventorySettings.returnTypes || []).filter(rt => rt.enabled);
  }, [inventorySettings.returnTypes]);
  
  const returnSchema = z.object({
    customerId: z.string().min(1, t('common:required')),
    orderId: z.string().optional(),
    returnDate: z.string().min(1, t('common:required')),
    returnType: z.string().min(1, t('common:required')),
    status: z.enum(['awaiting', 'processing', 'completed', 'cancelled']),
    trackingNumber: z.string().optional(),
    shippingCarrier: z.string().optional(),
    notes: z.string().optional(),
    items: z.array(z.object({
      productId: z.string().min(1, t('common:required')),
      productName: z.string().min(1, t('common:required')),
      sku: z.string().optional(),
      quantity: z.coerce.number().min(1, t('inventory:quantityMustBeGreaterThanZero')),
      price: z.coerce.number().min(0, t('common:mustBeNonNegative')),
    })).min(1, t('inventory:atLeastOneProductRequired')),
  });

  type ReturnFormData = z.infer<typeof returnSchema>;
  const scanningEnabled = inventorySettings.enableBarcodeScanning ?? true;
  const [customerSearchOpen, setCustomerSearchOpen] = useState(false);
  const [orderSearchOpen, setOrderSearchOpen] = useState(false);
  const [productSearchOpen, setProductSearchOpen] = useState<number | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [currency, setCurrency] = useState<Currency>("EUR");
  const [barcodeInput, setBarcodeInput] = useState("");
  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Fetch return data
  const { data: returnData, isLoading: returnLoading } = useQuery<any>({
    queryKey: [`/api/returns/${id}`],
    enabled: !!id,
  });

  // Fetch customers
  const { data: customers = [] } = useQuery<any[]>({
    queryKey: ['/api/customers'],
  });

  // Fetch orders with items included
  const { data: orders = [] } = useQuery<any[]>({
    queryKey: ['/api/orders?includeItems=true'],
  });

  // Fetch products
  const productsQuery = useQuery<any[]>({
    queryKey: ['/api/products'],
  });
  const products = productsQuery.data || [];

  const form = useForm<ReturnFormData>({
    resolver: zodResolver(returnSchema),
    defaultValues: {
      customerId: "",
      orderId: "",
      returnDate: "",
      returnType: "refund",
      status: "awaiting",
      trackingNumber: "",
      shippingCarrier: "",
      notes: "",
      items: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const watchCustomerId = form.watch("customerId");
  const watchOrderId = form.watch("orderId");

  // Filter orders by selected customer
  const customerOrders = orders.filter((order: any) => 
    order.customerId === watchCustomerId
  ).sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // Update form when return data is loaded
  useEffect(() => {
    if (returnData && customers.length > 0) {
      form.reset({
        customerId: returnData.customerId || "",
        orderId: returnData.orderId || "",
        returnDate: returnData.returnDate ? format(new Date(returnData.returnDate), 'yyyy-MM-dd') : "",
        returnType: returnData.returnType || "refund",
        status: returnData.status || "awaiting",
        trackingNumber: returnData.trackingNumber || "",
        shippingCarrier: returnData.shippingCarrier || "",
        notes: returnData.notes || "",
        items: returnData.items || [],
      });
      
      // Set selected customer
      const customer = customers.find((c: any) => c.id === returnData.customerId);
      if (customer) {
        setSelectedCustomer(customer);
      }
      
      // Set selected order and currency
      if (returnData.orderId) {
        const order = orders.find((o: any) => o.id === returnData.orderId);
        if (order) {
          setSelectedOrder(order);
          setCurrency((order.currency || 'EUR') as Currency);
        }
      }
    }
  }, [returnData, customers, orders, form]);

  const handleOrderSelect = (order: any) => {
    setSelectedOrder(order);
    setCurrency((order.currency || 'EUR') as Currency);
    
    // Auto-populate items from order if current items are empty
    if (order.items && order.items.length > 0 && fields.length === 0) {
      order.items.forEach((item: any) => {
        const product = products.find((p: any) => p.id === item.productId);
        append({
          productId: item.productId || '',
          productName: product?.name || item.productName || '',
          sku: product?.sku || item.sku || '',
          quantity: item.quantity || 1,
          price: parseFloat(item.price || product?.sellingPriceEur || "0"),
        });
      });

      toast({
        title: t('inventory:itemsLoaded'),
        description: t('inventory:itemsLoadedDesc', { count: order.items.length }),
      });
    }
  };

  const updateReturnMutation = useMutation({
    mutationFn: (data: any) => apiRequest('PUT', `/api/returns/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/returns'] });
      queryClient.invalidateQueries({ queryKey: [`/api/returns/${id}`] });
      toast({
        title: t('common:success'),
        description: t('inventory:returnUpdatedSuccess'),
      });
      navigate("/returns");
    },
    onError: (error: any) => {
      toast({
        title: t('common:error'),
        description: error.message || t('inventory:failedToUpdateReturn'),
        variant: "destructive",
      });
    },
  });

  const deleteReturnMutation = useMutation({
    mutationFn: () => apiRequest('DELETE', `/api/returns/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/returns'] });
      toast({
        title: t('common:success'),
        description: t('inventory:returnDeletedSuccess'),
      });
      navigate("/returns");
    },
    onError: (error: any) => {
      toast({
        title: t('common:error'),
        description: error.message || t('inventory:failedToDeleteReturn'),
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ReturnFormData) => {
    const submitData = {
      ...data,
      returnDate: new Date(data.returnDate),
    };

    updateReturnMutation.mutate(submitData);
  };

  const handleAddItem = () => {
    const newIndex = fields.length;
    append({
      productId: "",
      productName: "",
      sku: "",
      quantity: 1,
      price: 0,
    });
    
    // Focus on the Product field (button) after adding the item
    setTimeout(() => {
      const productButton = document.querySelector(`[data-testid="button-product-${newIndex}"]`) as HTMLButtonElement;
      if (productButton) {
        productButton.focus();
      }
    }, 50);
  };

  const handleProductSelect = (productId: string, index: number) => {
    const product = products.find((p: any) => p.id === productId);
    if (product) {
      // Try to get price from selected order items first
      let price = parseFloat(product.sellingPriceEur || "0");
      if (selectedOrder?.items) {
        const orderItem = selectedOrder.items.find((item: any) => item.productId === productId);
        if (orderItem && orderItem.price) {
          price = parseFloat(orderItem.price);
        }
      }
      
      form.setValue(`items.${index}.productId`, product.id);
      form.setValue(`items.${index}.productName`, product.name);
      form.setValue(`items.${index}.sku`, product.sku || "");
      form.setValue(`items.${index}.price`, price);
    }
    setProductSearchOpen(null);
  };

  const playSound = (frequency: number, duration: number) => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = frequency;
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration / 1000);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + duration / 1000);
    } catch (error) {
      console.error('Error playing sound:', error);
    }
  };

  const handleBarcodeScan = (barcode: string) => {
    const cleanBarcode = barcode.trim();
    
    if (!cleanBarcode) {
      return;
    }

    if (productsQuery.isLoading) {
      toast({
        title: t('inventory:pleaseWaitLoadingProducts'),
        description: t('inventory:productsStillLoading'),
      });
      return;
    }

    const product = products.find((p: any) => 
      p.barcode === cleanBarcode || p.sku === cleanBarcode
    );

    if (product) {
      playSound(440, 100);
      
      const existingItemIndex = fields.findIndex((field, idx) => 
        form.watch(`items.${idx}.productId`) === product.id
      );

      if (existingItemIndex >= 0) {
        const currentQuantity = form.watch(`items.${existingItemIndex}.quantity`) || 0;
        form.setValue(`items.${existingItemIndex}.quantity`, currentQuantity + 1);
        
        toast({
          title: t('inventory:productAdded'),
          description: `${product.name} - ${t('inventory:quantity')}: ${currentQuantity + 1}`,
        });
      } else {
        let price = parseFloat(product.priceEur || product.sellingPriceEur || "0");
        if (selectedOrder?.items) {
          const orderItem = selectedOrder.items.find((item: any) => item.productId === product.id);
          if (orderItem && orderItem.price) {
            price = parseFloat(orderItem.price);
          }
        }
        
        append({
          productId: product.id,
          productName: product.name,
          sku: product.sku || "",
          quantity: 1,
          price: price,
        });
        
        toast({
          title: t('inventory:productAdded'),
          description: product.name,
        });
      }

      setBarcodeInput("");
      setTimeout(() => {
        barcodeInputRef.current?.focus();
      }, 50);
    } else {
      playSound(200, 150);
      
      toast({
        title: t('inventory:productNotFound'),
        description: t('inventory:productNotFoundDesc', { barcode: cleanBarcode }),
        variant: "destructive",
      });
      
      setBarcodeInput("");
      setTimeout(() => {
        barcodeInputRef.current?.focus();
      }, 50);
    }
  };

  // Calculate totals
  const returnTotal = fields.reduce((sum, field, index) => {
    const quantity = form.watch(`items.${index}.quantity`) || 0;
    const price = form.watch(`items.${index}.price`) || 0;
    return sum + (quantity * price);
  }, 0);

  const getStatusIcon = (status: string) => {
    switch(status) {
      case 'awaiting': return <Clock className="h-4 w-4" />;
      case 'processing': return <AlertCircle className="h-4 w-4" />;
      case 'completed': return <CheckCircle2 className="h-4 w-4" />;
      default: return <X className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'awaiting': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'processing': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (returnLoading) {
    return (
      <div className="p-6 max-w-7xl mx-auto bg-white dark:bg-slate-900">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (!returnData) {
    return (
      <div className="p-6 max-w-7xl mx-auto bg-white dark:bg-slate-900">
        <div className="text-center">
          <p className="text-gray-500 dark:text-gray-400">{t('inventory:returnNotFound')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-2 sm:p-4 md:p-6 max-w-7xl mx-auto overflow-x-hidden">
      <div className="mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => window.history.back()}
          className="mb-4"
          data-testid="button-back"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t('inventory:backToReturns')}
        </Button>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">{t('inventory:editReturn')}</h1>
            <p className="text-sm sm:text-base text-muted-foreground dark:text-gray-400 mt-1">{t('inventory:updateReturnInformation')}</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-left sm:text-right">
              <p className="text-sm text-muted-foreground">{t('inventory:returnIdLabel')}</p>
              <p className="text-xl sm:text-2xl font-bold text-primary">{returnData.returnId || ''}</p>
            </div>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setShowDeleteDialog(true)}
              data-testid="button-delete"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {t('common:delete')}
            </Button>
          </div>
        </div>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Main Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Customer & Order Selection */}
            <Card className="bg-white dark:bg-slate-800 border-gray-200 dark:border-gray-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-gray-100">
                  <User className="h-5 w-5 text-blue-500 dark:text-blue-400" />
                  {t('inventory:customerOrderDetails')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="customer" className="text-base font-semibold">{t('inventory:customer')} *</Label>
                  <Popover open={customerSearchOpen} onOpenChange={setCustomerSearchOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={customerSearchOpen}
                        className="w-full justify-between h-11 text-base"
                        data-testid="button-customer-select"
                      >
                        {watchCustomerId
                          ? selectedCustomer?.name || customers.find((c: any) => c.id === watchCustomerId)?.name
                          : t('inventory:selectCustomer')}
                        <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0" align="start">
                      <Command>
                        <CommandInput placeholder={t('inventory:searchCustomer')} data-testid="input-customer-search" />
                        <CommandEmpty>{t('inventory:noCustomerFound')}</CommandEmpty>
                        <CommandGroup className="max-h-64 overflow-auto">
                          {customers.map((customer: any) => (
                            <CommandItem
                              key={customer.id}
                              value={customer.name}
                              onSelect={() => {
                                form.setValue("customerId", customer.id);
                                form.setValue("orderId", "");
                                setSelectedOrder(null);
                                setSelectedCustomer(customer);
                                const customerOrdersList = orders.filter((o: any) => o.customerId === customer.id);
                                if (customerOrdersList.length > 0) {
                                  const latestOrder = customerOrdersList.sort((a: any, b: any) => 
                                    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                                  )[0];
                                  setCurrency((latestOrder.currency || 'EUR') as Currency);
                                }
                                setCustomerSearchOpen(false);
                              }}
                              data-testid={`option-customer-${customer.id}`}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  watchCustomerId === customer.id ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {customer.name}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  {form.formState.errors.customerId && (
                    <p className="text-sm text-red-500 mt-1">{form.formState.errors.customerId.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="order" className="text-base font-semibold">{t('inventory:orderNumberLabel')}</Label>
                  <p className="text-sm text-muted-foreground mb-2">{t('inventory:selectOriginalOrder')}</p>
                  <Popover open={orderSearchOpen} onOpenChange={setOrderSearchOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={orderSearchOpen}
                        className="w-full justify-between h-11 text-base"
                        disabled={!watchCustomerId || customerOrders.length === 0}
                        data-testid="button-order-select"
                      >
                        {watchOrderId && selectedOrder
                          ? `#${selectedOrder.orderId || selectedOrder.id.slice(0, 8).toUpperCase()} - ${format(new Date(selectedOrder.createdAt), 'dd/MM/yyyy')}`
                          : customerOrders.length === 0 
                            ? t('inventory:noOrdersAvailable')
                            : t('inventory:selectOrder')}
                        <ShoppingCart className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[400px] p-0" align="start">
                      <Command>
                        <CommandInput placeholder={t('inventory:searchOrder')} data-testid="input-order-search" />
                        <CommandEmpty>{t('inventory:noOrderFound')}</CommandEmpty>
                        <CommandGroup className="max-h-64 overflow-auto">
                          {customerOrders.map((order: any) => (
                            <CommandItem
                              key={order.id}
                              value={order.id}
                              onSelect={() => {
                                form.setValue("orderId", order.id);
                                handleOrderSelect(order);
                                setOrderSearchOpen(false);
                              }}
                              data-testid={`option-order-${order.id}`}
                              className="flex items-start py-3"
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4 mt-0.5",
                                  watchOrderId === order.id ? "opacity-100" : "opacity-0"
                                )}
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="font-medium">#{order.orderId || order.id.slice(0, 8).toUpperCase()}</span>
                                  <Badge variant="outline" className="capitalize text-xs shrink-0">
                                    {order.orderStatus || 'pending'}
                                  </Badge>
                                </div>
                                <div className="flex items-center justify-between text-sm text-muted-foreground mt-1">
                                  <span>{format(new Date(order.createdAt), 'dd/MM/yyyy')}</span>
                                  <span className="font-medium text-foreground">
                                    {getCurrencySymbol((order.currency || 'EUR') as Currency)}{parseFloat(order.grandTotal || '0').toFixed(2)}
                                  </span>
                                </div>
                                <div className="text-xs text-muted-foreground mt-0.5">
                                  {order.items?.length || 0} {t('inventory:items')}
                                </div>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
              </CardContent>
            </Card>

            {/* Return Details */}
            <Card className="bg-white dark:bg-slate-800 border-gray-200 dark:border-gray-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-gray-100">
                  <FileText className="h-5 w-5 text-purple-500" />
                  {t('inventory:returnInformation')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="returnDate" className="text-base font-semibold">{t('inventory:returnDate')} *</Label>
                    <Input 
                      id="returnDate"
                      type="date"
                      {...form.register("returnDate")}
                      className="h-11"
                      data-testid="input-returnDate"
                    />
                    {form.formState.errors.returnDate && (
                      <p className="text-sm text-red-500 mt-1">{form.formState.errors.returnDate.message}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="returnType" className="text-base font-semibold">{t('inventory:returnTypeLabel')} *</Label>
                    <Select
                      value={form.watch("returnType")}
                      onValueChange={(value) => form.setValue("returnType", value as any)}
                    >
                      <SelectTrigger className="h-11" data-testid="select-returnType">
                        <SelectValue placeholder={t('inventory:returnType')} />
                      </SelectTrigger>
                      <SelectContent>
                        {enabledReturnTypes.map((rt) => (
                          <SelectItem key={rt.value} value={rt.value}>
                            {t(`inventory:${rt.labelKey}`)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {enabledReturnTypes.find(rt => rt.value === form.watch("returnType"))?.disposesInventory && (
                      <Badge variant="destructive" className="mt-2">
                        {t('inventory:disposedNotReturnedToInventory')}
                      </Badge>
                    )}
                  </div>
                </div>

                <div>
                  <Label htmlFor="status" className="text-base font-semibold">{t('inventory:statusLabel')} *</Label>
                  <Select
                    value={form.watch("status")}
                    onValueChange={(value) => form.setValue("status", value as any)}
                  >
                    <SelectTrigger className="h-11" data-testid="select-status">
                      <SelectValue placeholder={t('inventory:status')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="awaiting">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          {t('inventory:awaitingStatus')}
                        </div>
                      </SelectItem>
                      <SelectItem value="processing">
                        <div className="flex items-center gap-2">
                          <AlertCircle className="h-4 w-4" />
                          {t('inventory:processingStatus')}
                        </div>
                      </SelectItem>
                      <SelectItem value="completed">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4" />
                          {t('inventory:completedStatus')}
                        </div>
                      </SelectItem>
                      <SelectItem value="cancelled">
                        <div className="flex items-center gap-2">
                          <X className="h-4 w-4" />
                          {t('inventory:cancelledStatus')}
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="notes" className="text-base font-semibold">{t('inventory:returnReason')} / {t('inventory:notes')}</Label>
                  <Textarea 
                    id="notes"
                    {...form.register("notes")}
                    placeholder={t('inventory:notesPlaceholder')}
                    className="min-h-[100px]"
                    data-testid="textarea-notes"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Shipping Details */}
            <Card className="bg-white dark:bg-slate-800 border-gray-200 dark:border-gray-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-gray-100">
                  <TruckIcon className="h-5 w-5 text-orange-500" />
                  {t('inventory:shippingInformation')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="trackingNumber" className="text-base font-semibold">{t('inventory:trackingNumber')}</Label>
                    <Input 
                      id="trackingNumber"
                      {...form.register("trackingNumber")}
                      placeholder={t('inventory:trackingNumber')}
                      className="h-11"
                      data-testid="input-trackingNumber"
                    />
                  </div>

                  <div>
                    <Label htmlFor="shippingCarrier" className="text-base font-semibold">{t('inventory:shippingCarrier')}</Label>
                    <Select
                      value={form.watch("shippingCarrier")}
                      onValueChange={(value) => form.setValue("shippingCarrier", value)}
                    >
                      <SelectTrigger className="h-11" data-testid="select-shippingCarrier">
                        <SelectValue placeholder={t('inventory:pleaseSelect')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="dhl">{t('inventory:dhl')}</SelectItem>
                        <SelectItem value="fedex">{t('inventory:fedex')}</SelectItem>
                        <SelectItem value="ups">{t('inventory:ups')}</SelectItem>
                        <SelectItem value="usps">{t('inventory:usps')}</SelectItem>
                        <SelectItem value="vnpost">{t('inventory:vnPost')}</SelectItem>
                        <SelectItem value="other">{t('inventory:other')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Items Returned */}
            <Card className="bg-white dark:bg-slate-800 border-gray-200 dark:border-gray-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-gray-100">
                  <Package className="h-5 w-5 text-green-500" />
                  {t('inventory:itemsReturned')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Unified Search/Scan Input with Add Button */}
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      ref={barcodeInputRef}
                      id="barcode-scan"
                      type="text"
                      value={barcodeInput}
                      onChange={(e) => setBarcodeInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleBarcodeScan(barcodeInput);
                        }
                      }}
                      placeholder={t('inventory:searchOrScanProduct')}
                      className="pl-10"
                      disabled={productsQuery.isLoading}
                      data-testid="input-search-scan"
                    />
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  </div>
                  <Button
                    type="button"
                    variant="default"
                    onClick={handleAddItem}
                    data-testid="button-addItem"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    {t('common:add')}
                  </Button>
                </div>

                {fields.length === 0 ? (
                  <div className="text-center py-8 bg-muted/50 rounded-lg">
                    <Package className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground text-sm">{t('inventory:noItemsAddedYet')}</p>
                  </div>
                ) : (
                  <>
                    {fields.map((field, index) => (
                      <div key={field.id} className="border rounded-lg p-4 space-y-4 bg-muted/20">
                        <div className="flex justify-between items-start gap-4">
                          <div className="flex-1 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <Label className="text-sm font-medium">{t('inventory:product')} *</Label>
                                <Popover open={productSearchOpen === index} onOpenChange={(open) => setProductSearchOpen(open ? index : null)}>
                                  <PopoverTrigger asChild>
                                    <Button
                                      variant="outline"
                                      role="combobox"
                                      aria-expanded={productSearchOpen === index}
                                      className="w-full justify-between h-10 overflow-hidden"
                                      data-testid={`button-product-${index}`}
                                    >
                                      <span className="truncate flex-1 text-left">
                                        {form.watch(`items.${index}.productName`) || t('inventory:selectProduct')}
                                      </span>
                                      <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-full p-0" align="start">
                                    <Command>
                                      <CommandInput placeholder={t('inventory:searchProduct')} data-testid={`input-product-search-${index}`} />
                                      <CommandEmpty>{t('inventory:noProductFound')}</CommandEmpty>
                                      <CommandGroup className="max-h-64 overflow-auto">
                                        {products.map((product: any) => (
                                          <CommandItem
                                            key={product.id}
                                            value={product.name}
                                            onSelect={() => handleProductSelect(product.id, index)}
                                            data-testid={`option-product-${product.id}-${index}`}
                                          >
                                            <Check
                                              className={cn(
                                                "mr-2 h-4 w-4",
                                                form.watch(`items.${index}.productId`) === product.id ? "opacity-100" : "opacity-0"
                                              )}
                                            />
                                            <div className="flex flex-col">
                                              <span>{product.name}</span>
                                              <span className="text-sm text-muted-foreground">{product.sku}</span>
                                            </div>
                                          </CommandItem>
                                        ))}
                                      </CommandGroup>
                                    </Command>
                                  </PopoverContent>
                                </Popover>
                              </div>

                              <div>
                                <Label className="text-sm font-medium">{t('inventory:quantityLabel')} *</Label>
                                <Input 
                                  type="number"
                                  min="1"
                                  {...form.register(`items.${index}.quantity`)}
                                  placeholder={t('inventory:quantityPlaceholder')}
                                  className="h-10"
                                  data-testid={`input-quantity-${index}`}
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <Label className="text-sm font-medium">{t('inventory:skuLabel')}</Label>
                                <Input
                                  {...form.register(`items.${index}.sku`)}
                                  placeholder={t('inventory:skuPlaceholder')}
                                  className="h-10"
                                  readOnly
                                  data-testid={`input-sku-${index}`}
                                />
                              </div>

                              <div>
                                <Label className="text-sm font-medium">{t('inventory:priceLabel')} ({getCurrencySymbol(currency)}) *</Label>
                                <Input 
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  {...form.register(`items.${index}.price`)}
                                  placeholder={t('inventory:pricePlaceholder')}
                                  className="h-10"
                                  data-testid={`input-price-${index}`}
                                />
                              </div>
                            </div>
                          </div>

                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => remove(index)}
                            className="shrink-0"
                            data-testid={`button-remove-${index}`}
                          >
                            <X className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>

                        {/* Item Subtotal */}
                        <div className="flex justify-end pt-2 border-t">
                          <div className="text-sm">
                            <span className="text-muted-foreground">{t('inventory:subtotal')}: </span>
                            <span className="font-semibold">
                              {getCurrencySymbol(currency)}{((form.watch(`items.${index}.quantity`) || 0) * (form.watch(`items.${index}.price`) || 0)).toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}

                    {form.formState.errors.items && (
                      <p className="text-sm text-red-500">{form.formState.errors.items.message}</p>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 sm:gap-4">
              <Button
                type="button"
                variant="outline"
                className="w-full sm:w-auto"
                onClick={() => navigate("/returns")}
                data-testid="button-cancel"
              >
                {t('common:cancel')}
              </Button>
              <Button
                type="submit"
                disabled={updateReturnMutation.isPending}
                className="w-full sm:w-auto bg-teal-600 hover:bg-teal-700"
                data-testid="button-submit"
              >
                <Save className="h-4 w-4 mr-2" />
                {updateReturnMutation.isPending ? t('common:saving') : t('common:saveChanges')}
              </Button>
            </div>
          </div>

          {/* Right Column - Return Summary */}
          <div className="lg:col-span-1 space-y-6">
            {/* Return Summary */}
            <Card className="sticky top-6 bg-white dark:bg-slate-800 border-gray-200 dark:border-gray-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-gray-100">
                  <Receipt className="h-5 w-5 text-teal-500" />
                  {t('inventory:returnSummary')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">{t('inventory:customer')}</span>
                    <span className="text-sm font-medium">
                      {selectedCustomer?.name || customers.find((c: any) => c.id === watchCustomerId)?.name || '-'}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">{t('inventory:orderNumber')}</span>
                    <span className="text-sm font-medium">
                      {selectedOrder ? `#${selectedOrder.orderId || selectedOrder.id.slice(0, 8).toUpperCase()}` : '-'}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">{t('inventory:returnType')}</span>
                    <Badge variant="outline" className="capitalize">
                      {form.watch("returnType").replace('_', ' ')}
                    </Badge>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">{t('inventory:status')}</span>
                    <Badge className={cn("border", getStatusColor(form.watch("status")))}>
                      <span className="flex items-center gap-1">
                        {getStatusIcon(form.watch("status"))}
                        <span className="capitalize">{form.watch("status")}</span>
                      </span>
                    </Badge>
                  </div>

                  <Separator />

                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">{t('inventory:itemsCount', { count: fields.length })}</span>
                    <span className="text-sm font-medium">{fields.length}</span>
                  </div>

                  <div className="flex justify-between items-center pt-2 border-t">
                    <span className="text-base font-semibold">{t('inventory:totalRefund')}</span>
                    <span className="text-xl font-bold text-teal-600">
                      {getCurrencySymbol(currency)}{returnTotal.toFixed(2)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Original Order Details */}
            {selectedOrder && (
              <Card className="bg-white dark:bg-slate-800 border-gray-200 dark:border-gray-700">
                <CardHeader>
                  <CardTitle className="text-base text-gray-900 dark:text-gray-100">{t('inventory:originalOrderDetails')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">{t('inventory:orderDate')}</span>
                    <span className="text-sm font-medium">
                      {format(new Date(selectedOrder.createdAt), 'dd/MM/yyyy')}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">{t('inventory:originalTotal')}</span>
                    <span className="text-sm font-semibold">
                      {getCurrencySymbol(currency)}{parseFloat(selectedOrder.grandTotal || selectedOrder.totalPrice || '0').toFixed(2)}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">{t('inventory:orderStatus')}</span>
                    <Badge variant="outline" className="capitalize">
                      {selectedOrder.orderStatus || 'pending'}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </form>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('inventory:areYouSure')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('inventory:deleteThisReturn')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common:cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteReturnMutation.mutate()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('common:delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
