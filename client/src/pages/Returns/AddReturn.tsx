import { useState, useEffect, useRef, useMemo } from "react";
import { useLocation, useParams } from "wouter";
import { useTranslation } from 'react-i18next';
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
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
  Clock
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
import { cn, handleDecimalKeyDown } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

export default function AddReturn() {
  const [, navigate] = useLocation();
  const params = useParams();
  const editId = params.id;
  const isEditMode = !!editId;
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
  const [returnId, setReturnId] = useState("");
  const [customerSearchOpen, setCustomerSearchOpen] = useState(false);
  const [orderSearchOpen, setOrderSearchOpen] = useState(false);
  const [productSearchOpen, setProductSearchOpen] = useState<number | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [currency, setCurrency] = useState<Currency>("EUR");
  const [barcodeInput, setBarcodeInput] = useState("");
  const barcodeInputRef = useRef<HTMLInputElement>(null);

  const { data: customers = [] } = useQuery<any[]>({
    queryKey: ['/api/customers'],
  });

  const { data: orders = [] } = useQuery<any[]>({
    queryKey: ['/api/orders?includeItems=true'],
  });

  const productsQuery = useQuery<any[]>({
    queryKey: ['/api/products'],
  });
  const products = productsQuery.data || [];

  const form = useForm<ReturnFormData>({
    resolver: zodResolver(returnSchema),
    defaultValues: {
      customerId: "",
      orderId: "",
      returnDate: format(new Date(), 'yyyy-MM-dd'),
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

  const { data: existingReturn } = useQuery({
    queryKey: ['/api/returns', editId],
    queryFn: async () => {
      const response = await fetch(`/api/returns/${editId}`);
      if (!response.ok) throw new Error('Failed to load return');
      return response.json();
    },
    enabled: isEditMode,
  });

  const watchCustomerId = form.watch("customerId");
  const watchOrderId = form.watch("orderId");

  const customerOrders = orders.filter((order: any) => 
    order.customerId === watchCustomerId
  ).sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const generateReturnId = () => {
    const prefix = '#RET';
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.random().toString(36).substring(2, 4).toUpperCase();
    return `${prefix}${timestamp}${random}`;
  };

  useEffect(() => {
    if (!isEditMode) {
      setReturnId(generateReturnId());
    }
  }, [isEditMode]);

  useEffect(() => {
    if (isEditMode && existingReturn && customers.length > 0) {
      setReturnId(existingReturn.returnId || '');
      form.reset({
        customerId: existingReturn.customerId || "",
        orderId: existingReturn.orderId || "",
        returnDate: existingReturn.returnDate ? format(new Date(existingReturn.returnDate), 'yyyy-MM-dd') : "",
        returnType: existingReturn.returnType || "refund",
        status: existingReturn.status || "awaiting",
        trackingNumber: existingReturn.trackingNumber || "",
        shippingCarrier: existingReturn.shippingCarrier || "",
        notes: existingReturn.notes || "",
        items: existingReturn.items || [],
      });
      
      const customer = customers.find((c: any) => c.id === existingReturn.customerId);
      if (customer) {
        setSelectedCustomer(customer);
      }
      
      if (existingReturn.orderId) {
        const order = orders.find((o: any) => o.id === existingReturn.orderId);
        if (order) {
          setSelectedOrder(order);
          setCurrency((order.currency || 'EUR') as Currency);
        }
      }
    }
  }, [isEditMode, existingReturn, customers, orders, form]);

  useEffect(() => {
    if (watchCustomerId && customerOrders.length === 1 && !watchOrderId) {
      const order = customerOrders[0];
      form.setValue("orderId", order.id);
      handleOrderSelect(order);
    }
  }, [watchCustomerId, customerOrders.length]);

  useEffect(() => {
    const returnFormData = sessionStorage.getItem('returnFormData');
    if (returnFormData) {
      try {
        const data = JSON.parse(returnFormData);
        
        if (data.customerId) {
          form.setValue('customerId', data.customerId);
        }
        if (data.orderId) {
          form.setValue('orderId', data.orderId);
          const order = orders.find((o: any) => o.id === data.orderId);
          if (order) {
            setSelectedOrder(order);
          }
        }
        if (data.reason) {
          form.setValue('notes', data.reason);
        }
        
        if (data.items && data.items.length > 0) {
          data.items.forEach((item: any) => {
            append({
              productId: item.productId || '',
              productName: item.productName || '',
              sku: item.sku || '',
              quantity: item.quantity || 1,
              price: item.price || 0,
            });
          });
        }
        
        sessionStorage.removeItem('returnFormData');
        
        toast({
          title: t('inventory:returnPrefilled'),
          description: t('inventory:returnPrefilledDesc', { orderNumber: data.orderNumber }),
        });
      } catch (error) {
        console.error('Error parsing return form data:', error);
      }
    }
  }, [orders]);

  const handleOrderSelect = (order: any) => {
    setSelectedOrder(order);
    setCurrency((order.currency || 'EUR') as Currency);
    
    if (order.items && order.items.length > 0) {
      while (fields.length > 0) {
        remove(0);
      }
      
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

  const createReturnMutation = useMutation({
    mutationFn: (data: any) => apiRequest('POST', '/api/returns', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/returns'] });
      toast({
        title: t('common:success'),
        description: t('inventory:returnCreatedSuccess'),
      });
      navigate("/returns");
    },
    onError: (error: any) => {
      toast({
        title: t('common:error'),
        description: error.message || t('inventory:failedToCreateReturn'),
        variant: "destructive",
      });
    },
  });

  const updateReturnMutation = useMutation({
    mutationFn: (data: any) => apiRequest('PATCH', `/api/returns/${editId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/returns'] });
      toast({ title: t('common:success'), description: t('inventory:returnUpdated') });
      navigate("/returns");
    },
    onError: (error: any) => {
      toast({ title: t('common:error'), description: error.message, variant: "destructive" });
    },
  });

  const onSubmit = (data: ReturnFormData) => {
    const submitData = {
      ...data,
      returnId,
      returnDate: new Date(data.returnDate),
    };

    isEditMode ? updateReturnMutation.mutate(submitData) : createReturnMutation.mutate(submitData);
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

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => window.history.back()}
          className="mb-2 -ml-2"
          data-testid="button-back"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t('inventory:backToReturns')}
        </Button>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h1 className="text-2xl font-bold">{isEditMode ? t('inventory:editReturn') : t('inventory:addReturn')}</h1>
            <p className="text-sm text-muted-foreground">{isEditMode ? t('inventory:updateReturnInformation') : t('inventory:processCustomerReturns')}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">{t('inventory:returnIdLabel')}</span>
            <span className="text-lg font-bold text-primary">{returnId}</span>
          </div>
        </div>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card className="ring-1 ring-border shadow-sm">
              <CardContent className="p-4 md:p-6 space-y-6">
                <div>
                  <div className="flex items-center gap-2 text-lg font-semibold mb-4">
                    <User className="h-5 w-5 text-primary" />
                    {t('inventory:customerOrderDetails')}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">{t('inventory:customer')} *</Label>
                      <Popover open={customerSearchOpen} onOpenChange={setCustomerSearchOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={customerSearchOpen}
                            className="w-full justify-between h-10 mt-1"
                            data-testid="button-customer-select"
                          >
                            <span className="truncate">
                              {watchCustomerId ? selectedCustomer?.name : t('inventory:selectCustomer')}
                            </span>
                            <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[300px] p-0" align="start">
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
                                  <Check className={cn("mr-2 h-4 w-4", watchCustomerId === customer.id ? "opacity-100" : "opacity-0")} />
                                  {customer.name}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </Command>
                        </PopoverContent>
                      </Popover>
                      {form.formState.errors.customerId && (
                        <p className="text-xs text-red-500 mt-1">{form.formState.errors.customerId.message}</p>
                      )}
                    </div>

                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">{t('inventory:orderNumberLabel')}</Label>
                      <Popover open={orderSearchOpen} onOpenChange={setOrderSearchOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={orderSearchOpen}
                            className="w-full justify-between h-10 mt-1"
                            disabled={!watchCustomerId || customerOrders.length === 0}
                            data-testid="button-order-select"
                          >
                            <span className="truncate">
                              {watchOrderId && selectedOrder
                                ? `#${selectedOrder.orderId || selectedOrder.id.slice(0, 8).toUpperCase()}`
                                : customerOrders.length === 0 
                                  ? t('inventory:noOrdersAvailable')
                                  : t('inventory:selectOrder')}
                            </span>
                            <ShoppingCart className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[350px] p-0" align="start">
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
                                  className="flex items-start py-2"
                                >
                                  <Check className={cn("mr-2 h-4 w-4 mt-0.5", watchOrderId === order.id ? "opacity-100" : "opacity-0")} />
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-2">
                                      <span className="font-medium text-sm">#{order.orderId || order.id.slice(0, 8).toUpperCase()}</span>
                                      <span className="text-sm font-medium">
                                        {getCurrencySymbol((order.currency || 'EUR') as Currency)}{parseFloat(order.grandTotal || '0').toFixed(2)}
                                      </span>
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                      {format(new Date(order.createdAt), 'dd/MM/yyyy')} • {order.items?.length || 0} {t('inventory:items')}
                                    </div>
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

                <Separator />

                <div>
                  <div className="flex items-center gap-2 text-lg font-semibold mb-4">
                    <FileText className="h-5 w-5 text-primary" />
                    {t('inventory:returnInformation')}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">{t('inventory:returnDate')} *</Label>
                      <Input 
                        type="date"
                        {...form.register("returnDate")}
                        className="h-10 mt-1"
                        data-testid="input-returnDate"
                      />
                      {form.formState.errors.returnDate && (
                        <p className="text-xs text-red-500 mt-1">{form.formState.errors.returnDate.message}</p>
                      )}
                    </div>

                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">{t('inventory:returnTypeLabel')} *</Label>
                      <Select
                        value={form.watch("returnType")}
                        onValueChange={(value) => form.setValue("returnType", value as any)}
                      >
                        <SelectTrigger className="h-10 mt-1" data-testid="select-returnType">
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
                        <Badge variant="destructive" className="mt-1 text-xs">
                          {t('inventory:disposedNotReturnedToInventory')}
                        </Badge>
                      )}
                    </div>

                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">{t('inventory:statusLabel')} *</Label>
                      <Select
                        value={form.watch("status")}
                        onValueChange={(value) => form.setValue("status", value as any)}
                      >
                        <SelectTrigger className="h-10 mt-1" data-testid="select-status">
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
                  </div>

                  <div className="mt-4">
                    <Label className="text-sm font-medium text-muted-foreground">{t('inventory:returnReason')} / {t('inventory:notes')}</Label>
                    <Textarea 
                      {...form.register("notes")}
                      placeholder={t('inventory:notesPlaceholder')}
                      className="min-h-[80px] mt-1"
                      data-testid="textarea-notes"
                    />
                  </div>
                </div>

                <Separator />

                <div>
                  <div className="flex items-center gap-2 text-lg font-semibold mb-4">
                    <TruckIcon className="h-5 w-5 text-primary" />
                    {t('inventory:shippingInformation')}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">{t('inventory:trackingNumber')}</Label>
                      <Input 
                        {...form.register("trackingNumber")}
                        placeholder={t('inventory:trackingNumber')}
                        className="h-10 mt-1"
                        data-testid="input-trackingNumber"
                      />
                    </div>

                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">{t('inventory:shippingCarrier')}</Label>
                      <Select
                        value={form.watch("shippingCarrier")}
                        onValueChange={(value) => form.setValue("shippingCarrier", value)}
                      >
                        <SelectTrigger className="h-10 mt-1" data-testid="select-shippingCarrier">
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
                </div>

                <Separator />

                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2 text-lg font-semibold">
                      <Package className="h-5 w-5 text-primary" />
                      {t('inventory:itemsReturned')}
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleAddItem}
                      data-testid="button-addItem"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      {t('common:add')}
                    </Button>
                  </div>

                  <div className="relative mb-4">
                    <Input
                      ref={barcodeInputRef}
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
                      className="pl-10 h-10"
                      disabled={productsQuery.isLoading}
                      data-testid="input-search-scan"
                    />
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  </div>

                  {fields.length === 0 ? (
                    <div className="text-center py-8 bg-muted/30 rounded-lg border border-dashed">
                      <Package className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">{t('inventory:noItemsAddedYet')}</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {/* Header row - desktop only */}
                      <div className="hidden md:grid md:grid-cols-[1fr_80px_100px_80px_40px] gap-2 px-2 text-xs font-medium text-muted-foreground">
                        <div>{t('inventory:product')}</div>
                        <div className="text-center">{t('inventory:qty')}</div>
                        <div className="text-right">{t('inventory:price')}</div>
                        <div className="text-right">{t('inventory:subtotal')}</div>
                        <div></div>
                      </div>

                      {fields.map((field, index) => (
                        <div key={field.id} className="p-3 rounded-lg border bg-muted/20 hover:bg-muted/30 transition-colors">
                          {/* Desktop layout - grid */}
                          <div className="hidden md:grid md:grid-cols-[1fr_80px_100px_80px_40px] gap-2 items-center">
                            <Popover open={productSearchOpen === index} onOpenChange={(open) => setProductSearchOpen(open ? index : null)}>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="ghost"
                                  role="combobox"
                                  aria-expanded={productSearchOpen === index}
                                  className="w-full justify-start h-9 px-2 font-normal"
                                  data-testid={`button-product-${index}`}
                                >
                                  <span className="truncate text-left">
                                    {form.watch(`items.${index}.productName`) || t('inventory:selectProduct')}
                                  </span>
                                  {form.watch(`items.${index}.sku`) && (
                                    <span className="ml-2 text-xs text-muted-foreground">
                                      ({form.watch(`items.${index}.sku`)})
                                    </span>
                                  )}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-[300px] p-0" align="start">
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
                                        <Check className={cn("mr-2 h-4 w-4", form.watch(`items.${index}.productId`) === product.id ? "opacity-100" : "opacity-0")} />
                                        <div className="flex flex-col">
                                          <span className="text-sm">{product.name}</span>
                                          <span className="text-xs text-muted-foreground">{product.sku}</span>
                                        </div>
                                      </CommandItem>
                                    ))}
                                  </CommandGroup>
                                </Command>
                              </PopoverContent>
                            </Popover>

                            <Input 
                              type="number"
                              min="1"
                              {...form.register(`items.${index}.quantity`)}
                              placeholder="1"
                              className="h-9 text-center"
                              data-testid={`input-quantity-${index}`}
                            />

                            <div className="relative">
                              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                                {getCurrencySymbol(currency)}
                              </span>
                              <Input 
                                type="number"
                                step="0.01"
                                min="0"
                                {...form.register(`items.${index}.price`)}
                                placeholder="0.00"
                                className="h-9 pl-6 text-right"
                                onKeyDown={handleDecimalKeyDown}
                                data-testid={`input-price-${index}`}
                              />
                            </div>

                            <div className="text-right text-sm font-medium">
                              {getCurrencySymbol(currency)}{((form.watch(`items.${index}.quantity`) || 0) * (form.watch(`items.${index}.price`) || 0)).toFixed(2)}
                            </div>

                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => remove(index)}
                              className="h-9 w-9"
                              data-testid={`button-remove-${index}`}
                            >
                              <X className="h-4 w-4 text-muted-foreground hover:text-red-500" />
                            </Button>
                          </div>

                          {/* Mobile layout - stacked */}
                          <div className="md:hidden space-y-3">
                            <div className="flex items-center justify-between">
                              <Popover open={productSearchOpen === index} onOpenChange={(open) => setProductSearchOpen(open ? index : null)}>
                                <PopoverTrigger asChild>
                                  <Button
                                    variant="outline"
                                    role="combobox"
                                    aria-expanded={productSearchOpen === index}
                                    className="flex-1 justify-start h-10 font-normal mr-2"
                                    data-testid={`button-product-mobile-${index}`}
                                  >
                                    <span className="truncate text-left">
                                      {form.watch(`items.${index}.productName`) || t('inventory:selectProduct')}
                                    </span>
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[280px] p-0" align="start">
                                  <Command>
                                    <CommandInput placeholder={t('inventory:searchProduct')} />
                                    <CommandEmpty>{t('inventory:noProductFound')}</CommandEmpty>
                                    <CommandGroup className="max-h-64 overflow-auto">
                                      {products.map((product: any) => (
                                        <CommandItem
                                          key={product.id}
                                          value={product.name}
                                          onSelect={() => handleProductSelect(product.id, index)}
                                        >
                                          <Check className={cn("mr-2 h-4 w-4", form.watch(`items.${index}.productId`) === product.id ? "opacity-100" : "opacity-0")} />
                                          <div className="flex flex-col">
                                            <span className="text-sm">{product.name}</span>
                                            <span className="text-xs text-muted-foreground">{product.sku}</span>
                                          </div>
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
                                className="h-10 w-10 shrink-0"
                                data-testid={`button-remove-mobile-${index}`}
                              >
                                <X className="h-4 w-4 text-muted-foreground" />
                              </Button>
                            </div>

                            <div className="grid grid-cols-3 gap-2">
                              <div>
                                <Label className="text-xs text-muted-foreground">{t('inventory:qty')}</Label>
                                <Input 
                                  type="number"
                                  min="1"
                                  {...form.register(`items.${index}.quantity`)}
                                  placeholder="1"
                                  className="h-10 text-center mt-1"
                                />
                              </div>
                              <div>
                                <Label className="text-xs text-muted-foreground">{t('inventory:price')}</Label>
                                <div className="relative mt-1">
                                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                                    {getCurrencySymbol(currency)}
                                  </span>
                                  <Input 
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    {...form.register(`items.${index}.price`)}
                                    placeholder="0.00"
                                    className="h-10 pl-6 text-right"
                                    onKeyDown={handleDecimalKeyDown}
                                  />
                                </div>
                              </div>
                              <div>
                                <Label className="text-xs text-muted-foreground">{t('inventory:subtotal')}</Label>
                                <div className="h-10 flex items-center justify-end text-sm font-semibold mt-1">
                                  {getCurrencySymbol(currency)}{((form.watch(`items.${index}.quantity`) || 0) * (form.watch(`items.${index}.price`) || 0)).toFixed(2)}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}

                      {form.formState.errors.items && (
                        <p className="text-xs text-red-500">{form.formState.errors.items.message}</p>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end gap-3 mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/returns")}
                data-testid="button-cancel"
              >
                {t('common:cancel')}
              </Button>
              <Button
                type="submit"
                disabled={createReturnMutation.isPending || updateReturnMutation.isPending}
                data-testid="button-submit"
              >
                <Save className="h-4 w-4 mr-2" />
                {(createReturnMutation.isPending || updateReturnMutation.isPending) 
                  ? (isEditMode ? t('common:saving') : t('common:creating'))
                  : (isEditMode ? t('common:saveChanges') : t('inventory:createReturn'))}
              </Button>
            </div>
          </div>

          <div className="lg:col-span-1 space-y-4">
            <Card className="ring-1 ring-border shadow-sm sticky top-6">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-lg font-semibold mb-4">
                  <Receipt className="h-5 w-5 text-primary" />
                  {t('inventory:returnSummary')}
                </div>
                
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">{t('inventory:customer')}</span>
                    <span className="font-medium">{selectedCustomer?.name || '-'}</span>
                  </div>
                  
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">{t('inventory:orderNumber')}</span>
                    <span className="font-medium">
                      {selectedOrder ? `#${selectedOrder.orderId || selectedOrder.id.slice(0, 8).toUpperCase()}` : '-'}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">{t('inventory:returnType')}</span>
                    <Badge variant="outline" className="capitalize text-xs">
                      {form.watch("returnType").replace('_', ' ')}
                    </Badge>
                  </div>

                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">{t('inventory:status')}</span>
                    <Badge className={cn("border text-xs", getStatusColor(form.watch("status")))}>
                      <span className="flex items-center gap-1">
                        {getStatusIcon(form.watch("status"))}
                        <span className="capitalize">{form.watch("status")}</span>
                      </span>
                    </Badge>
                  </div>

                  <Separator />

                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">{t('inventory:items')}</span>
                    <span className="font-medium">{fields.length}</span>
                  </div>

                  <div className="flex justify-between items-center pt-2 border-t">
                    <span className="font-semibold">{t('inventory:totalRefund')}</span>
                    <span className="text-xl font-bold text-primary">
                      {getCurrencySymbol(currency)}{returnTotal.toFixed(2)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {selectedOrder && (
              <Card className="ring-1 ring-border shadow-sm">
                <CardContent className="p-4">
                  <h3 className="font-semibold mb-3">{t('inventory:originalOrderDetails')}</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t('inventory:orderDate')}</span>
                      <span>{format(new Date(selectedOrder.createdAt), 'dd/MM/yyyy')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t('inventory:originalTotal')}</span>
                      <span className="font-medium">
                        {getCurrencySymbol(currency)}{selectedOrder.totalPrice?.toFixed(2) || '0.00'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t('inventory:items')}</span>
                      <span>{selectedOrder.items?.length || 0}</span>
                    </div>
                    {selectedOrder.paymentStatus && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{t('inventory:payment')}</span>
                        <Badge variant="outline" className="capitalize text-xs">
                          {selectedOrder.paymentStatus.replace('_', ' ')}
                        </Badge>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {watchCustomerId && customerOrders.length > 0 && (
              <Card className="ring-1 ring-border shadow-sm">
                <CardContent className="p-4">
                  <h3 className="font-semibold mb-3">{t('inventory:customerOrderHistory')}</h3>
                  <div className="max-h-48 overflow-y-auto space-y-2">
                    {customerOrders.slice(0, 5).map((order: any) => (
                      <div 
                        key={order.id}
                        className={cn(
                          "p-2 rounded-lg border cursor-pointer transition-colors text-sm",
                          watchOrderId === order.id 
                            ? "bg-primary/10 border-primary" 
                            : "hover:bg-muted/50"
                        )}
                        onClick={() => {
                          form.setValue("orderId", order.id);
                          handleOrderSelect(order);
                        }}
                        data-testid={`order-history-${order.id}`}
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="font-medium">#{order.orderId || order.id.slice(0, 8).toUpperCase()}</p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(order.createdAt), 'dd/MM/yyyy')}
                            </p>
                          </div>
                          <p className="font-medium">{getCurrencySymbol((order.currency || 'EUR') as Currency)}{order.totalPrice?.toFixed(2) || '0.00'}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  {customerOrders.length > 5 && (
                    <p className="text-xs text-muted-foreground text-center pt-2">
                      {t('inventory:showingOrdersOf', { visible: 5, total: customerOrders.length })}
                    </p>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
