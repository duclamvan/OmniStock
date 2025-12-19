import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  ArrowLeft, 
  Save, 
  CalendarIcon,
  ShoppingCart,
  Plus,
  X,
  User,
  Package,
  Search,
  UserPlus,
  Bell,
  Loader2,
  Phone,
  Mail
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
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { insertPreOrderSchema } from "@shared/schema";
import { getCountryFlag } from "@/lib/countries";

// Note: We'll use t() for error messages in the component, not in the schema
// The schema uses English by default and we translate in the form errors display
const formSchema = insertPreOrderSchema.extend({
  expectedDate: z.date().optional(),
  items: z.array(
    z.object({
      productId: z.string().optional(),
      itemName: z.string().min(1),
      itemDescription: z.string().optional(),
      quantity: z.coerce.number().min(1),
    })
  ).min(1),
  reminderEnabled: z.boolean().default(false),
  reminderChannel: z.enum(['sms', 'email', 'both']).default('sms'),
  reminderDaysBefore: z.array(z.number()).default([1, 3]),
  reminderPhone: z.string().optional(),
  reminderEmail: z.string().email().optional().or(z.literal('')),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
}).omit({ expectedDate: true }).extend({
  expectedDate: z.date().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface ItemRow {
  id: string;
  productId?: string;
  itemName: string;
  itemDescription?: string;
  quantity: number;
}

export default function AddPreOrder() {
  const { t } = useTranslation('orders');
  const { t: tCommon } = useTranslation('common');
  const [, navigate] = useLocation();
  const params = useParams<{ id?: string }>();
  const editId = params.id;
  const isEditMode = Boolean(editId);
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [items, setItems] = useState<ItemRow[]>([
    { id: crypto.randomUUID(), itemName: "", itemDescription: "", quantity: 1 }
  ]);
  const [customerSearchOpen, setCustomerSearchOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [productSearchOpen, setProductSearchOpen] = useState<Record<string, boolean>>({});
  const [selectedProducts, setSelectedProducts] = useState<Record<string, any>>({});
  const [showNewCustomerDialog, setShowNewCustomerDialog] = useState(false);
  const [newCustomerData, setNewCustomerData] = useState({
    name: '',
    email: '',
    tel: '',
    country: '',
  });

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      customerId: '',
      status: 'pending',
      notes: '',
      expectedDate: undefined,
      items: [{ itemName: "", quantity: 1 }],
      reminderEnabled: false,
      reminderChannel: 'sms',
      reminderDaysBefore: [1, 3],
      reminderPhone: '',
      reminderEmail: '',
      priority: 'normal',
    },
  });

  const { data: preOrder, isLoading: isLoadingPreOrder } = useQuery<any>({
    queryKey: ['/api/pre-orders', editId],
    enabled: isEditMode,
  });

  const { data: customers, isLoading: isLoadingCustomers } = useQuery<any[]>({
    queryKey: ['/api/customers'],
  });

  const { data: products, isLoading: isLoadingProducts } = useQuery<any[]>({
    queryKey: ['/api/products'],
  });

  const { data: preOrders } = useQuery<any[]>({
    queryKey: ['/api/pre-orders'],
  });

  const { data: purchases } = useQuery<any[]>({
    queryKey: ['/api/imports/purchases'],
  });

  useEffect(() => {
    if (isEditMode && preOrder && customers) {
      form.setValue('customerId', preOrder.customerId);
      form.setValue('status', preOrder.status);
      form.setValue('notes', preOrder.notes || '');
      
      if (preOrder.expectedDate) {
        form.setValue('expectedDate', parseISO(preOrder.expectedDate));
      }

      const customer = customers.find((c: any) => c.id === preOrder.customerId);
      if (customer) {
        setSelectedCustomer(customer);
      }

      if (preOrder.items && preOrder.items.length > 0) {
        setItems(preOrder.items.map((item: any) => ({
          id: crypto.randomUUID(),
          productId: item.productId || undefined,
          itemName: item.itemName,
          itemDescription: item.itemDescription || "",
          quantity: item.quantity,
        })));
      }

      form.setValue('reminderEnabled', preOrder.reminderEnabled ?? false);
      form.setValue('reminderChannel', preOrder.reminderChannel || 'sms');
      form.setValue('reminderDaysBefore', preOrder.reminderDaysBefore || [1, 3]);
      form.setValue('reminderPhone', preOrder.reminderPhone || '');
      form.setValue('reminderEmail', preOrder.reminderEmail || '');
      form.setValue('priority', preOrder.priority || 'normal');
    }
  }, [isEditMode, preOrder, customers, form]);

  // Sync items state to form for validation
  useEffect(() => {
    form.setValue('items', items.map(item => ({
      productId: item.productId,
      itemName: item.itemName,
      itemDescription: item.itemDescription || '',
      quantity: item.quantity,
    })));
  }, [items, form]);

  const createCustomerMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest('POST', '/api/customers', {
        ...data,
        billingFirstName: data.name.split(' ')[0] || data.name,
        billingLastName: data.name.split(' ').slice(1).join(' ') || data.name,
        billingEmail: data.email || '',
        billingTel: data.tel || '',
        country: data.country || '',
      }) as any;
    },
    onSuccess: (newCustomer: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/customers'] });
      setSelectedCustomer(newCustomer);
      form.setValue('customerId', newCustomer.id);
      setShowNewCustomerDialog(false);
      setNewCustomerData({ name: '', email: '', tel: '', country: '' });
      toast({
        title: tCommon('success'),
        description: t('customerCreatedSuccess'),
      });
    },
    onError: (error: any) => {
      toast({
        title: tCommon('error'),
        description: error.message || t('customerCreationFailed'),
        variant: "destructive",
      });
    },
  });

  const createPreOrderMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest('POST', '/api/pre-orders', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/pre-orders'] });
      toast({
        title: tCommon('success'),
        description: t('preOrderCreatedSuccess'),
      });
      navigate('/orders/pre-orders');
    },
    onError: (error: any) => {
      toast({
        title: tCommon('error'),
        description: error.message || t('preOrderCreationFailed'),
        variant: "destructive",
      });
    },
  });

  const updatePreOrderMutation = useMutation({
    mutationFn: async (data: any) => {
      await apiRequest('PATCH', `/api/pre-orders/${editId}`, {
        customerId: data.customerId,
        status: data.status,
        notes: data.notes,
        expectedDate: data.expectedDate,
        reminderEnabled: data.reminderEnabled,
        reminderChannel: data.reminderChannel,
        reminderDaysBefore: data.reminderDaysBefore,
        reminderPhone: data.reminderPhone || null,
        reminderEmail: data.reminderEmail || null,
        priority: data.priority,
      });

      if (preOrder?.items) {
        await Promise.all(
          preOrder.items.map((item: any) =>
            apiRequest('DELETE', `/api/pre-order-items/${item.id}`)
          )
        );
      }

      await Promise.all(
        data.items.map((item: any) =>
          apiRequest('POST', '/api/pre-order-items', {
            preOrderId: editId,
            productId: item.productId || null,
            itemName: item.itemName,
            itemDescription: item.itemDescription || null,
            quantity: item.quantity,
          })
        )
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/pre-orders'] });
      queryClient.invalidateQueries({ queryKey: ['/api/pre-orders', editId] });
      toast({
        title: tCommon('success'),
        description: t('preOrderUpdatedSuccess'),
      });
      navigate('/orders/pre-orders');
    },
    onError: (error: any) => {
      toast({
        title: tCommon('error'),
        description: error.message || t('preOrderUpdateFailed'),
        variant: "destructive",
      });
    },
  });

  const addItem = () => {
    setItems([...items, { 
      id: crypto.randomUUID(), 
      itemName: "", 
      itemDescription: "", 
      quantity: 1 
    }]);
  };

  const removeItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter(item => item.id !== id));
    }
  };

  const updateItem = (id: string, field: keyof ItemRow, value: any) => {
    setItems(items.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  // Combine products, pre-order items, and purchase items for autocomplete
  const getAllItems = () => {
    const productItems = (products || []).map((p: any) => ({
      id: p.id,
      name: p.name,
      sku: p.sku,
      description: p.description,
      type: 'product' as const,
    }));

    const preOrderItems = (preOrders || []).flatMap((po: any) => 
      (po.items || []).map((item: any) => ({
        id: `preorder-${po.id}-${item.id}`,
        name: item.itemName,
        description: item.itemDescription,
        type: 'preorder' as const,
        preOrderId: po.id,
      }))
    );

    const purchaseItems = (purchases || []).flatMap((purchase: any) =>
      (purchase.items || []).map((item: any) => ({
        id: `purchase-${purchase.id}-${item.id}`,
        name: item.name,
        sku: item.sku,
        description: item.notes,
        type: 'purchase' as const,
        purchaseId: purchase.id,
        supplier: purchase.supplier,
      }))
    );

    return [...productItems, ...preOrderItems, ...purchaseItems];
  };

  const handleProductSelect = (itemId: string, selectedItem: any) => {
    setSelectedProducts(prev => ({ ...prev, [itemId]: selectedItem }));
    setItems(items.map(item => 
      item.id === itemId 
        ? { 
            ...item, 
            productId: selectedItem.type === 'product' ? selectedItem.id : undefined,
            itemName: selectedItem.name,
            itemDescription: selectedItem.description || "",
          } 
        : item
    ));
    setProductSearchOpen(prev => ({ ...prev, [itemId]: false }));
  };

  const handleCreateCustomer = () => {
    if (!newCustomerData.name.trim()) {
      toast({
        title: tCommon('error'),
        description: t('customerNameRequired2'),
        variant: "destructive",
      });
      return;
    }
    createCustomerMutation.mutate(newCustomerData);
  };

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);

    try {
      const preOrderData = {
        customerId: data.customerId,
        status: data.status,
        notes: data.notes,
        expectedDate: data.expectedDate ? format(data.expectedDate, 'yyyy-MM-dd') : undefined,
        items: items.map(item => ({
          productId: item.productId || null,
          itemName: item.itemName,
          itemDescription: item.itemDescription || null,
          quantity: item.quantity,
        })),
        reminderEnabled: data.reminderEnabled,
        reminderChannel: data.reminderChannel,
        reminderDaysBefore: data.reminderDaysBefore,
        reminderPhone: data.reminderPhone || null,
        reminderEmail: data.reminderEmail || null,
        priority: data.priority,
      };

      if (isEditMode) {
        await updatePreOrderMutation.mutateAsync(preOrderData);
      } else {
        await createPreOrderMutation.mutateAsync(preOrderData);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isEditMode && isLoadingPreOrder) {
    return (
      <div className="flex items-center justify-center min-h-[400px]" data-testid="loading-state">
        <div className="text-center space-y-3">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-slate-600" />
          <p className="text-slate-600">{t('loadingPreOrder')}</p>
        </div>
      </div>
    );
  }

  if (isEditMode && !preOrder && !isLoadingPreOrder) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-3">
          <p className="text-slate-600">{t('preOrderNotFound')}</p>
          <Button onClick={() => window.history.back()} data-testid="button-back-not-found">
            {t('goBack')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6 p-2 sm:p-4 md:p-6 overflow-x-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 sm:gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => window.history.back()}
          className="flex-shrink-0"
          data-testid="button-back"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight truncate" data-testid={isEditMode ? "heading-edit-pre-order" : "heading-add-pre-order"}>
            {isEditMode ? t('editPreOrder') : t('createPreOrder')}
          </h1>
          <p className="text-slate-600 mt-1 text-xs sm:text-sm md:text-base">
            {isEditMode ? t('updatePreOrderDetails') : t('addNewCustomerPreOrder')}
          </p>
        </div>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 sm:space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
              <User className="h-5 w-5" />
              {t('basicInformation')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Customer Selector */}
            <div>
              <Label htmlFor="customerId" className="text-sm font-medium text-slate-700">{t('customer')} *</Label>
              <Popover open={customerSearchOpen} onOpenChange={setCustomerSearchOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={customerSearchOpen}
                    className="w-full justify-between font-normal h-10 mt-1.5 border-slate-300 hover:border-slate-400 hover:bg-slate-50 transition-colors"
                    data-testid="button-select-customer"
                  >
                    {selectedCustomer ? (
                      <span className="truncate text-slate-900 font-medium">{selectedCustomer.name}</span>
                    ) : (
                      <span className="text-slate-500">{t('typeToSearchCustomers')}</span>
                    )}
                    <Search className="ml-2 h-4 w-4 shrink-0 text-slate-500" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <Command>
                    <CommandInput 
                      placeholder={t('typeToSearchCustomers')}
                      data-testid="input-search-customer"
                    />
                    <CommandList>
                      <CommandEmpty>
                        <div className="text-center py-6">
                          <p className="text-sm text-slate-500 mb-3">{t('noCustomerFound')}</p>
                          <Button
                            size="sm"
                            onClick={() => {
                              setCustomerSearchOpen(false);
                              setShowNewCustomerDialog(true);
                            }}
                            className="gap-2"
                            data-testid="button-create-customer-empty"
                          >
                            <UserPlus className="h-4 w-4" />
                            {t('createNewCustomer')}
                          </Button>
                        </div>
                      </CommandEmpty>
                      <CommandGroup heading={t('customers')}>
                        {customers?.map((customer: any) => (
                          <CommandItem
                            key={customer.id}
                            value={customer.name}
                            onSelect={() => {
                              setSelectedCustomer(customer);
                              form.setValue('customerId', customer.id);
                              setCustomerSearchOpen(false);
                            }}
                            data-testid={`option-customer-${customer.id}`}
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-xl">{getCountryFlag(customer.country || '')}</span>
                              <div className="flex flex-col">
                                <span className="font-medium">{customer.name}</span>
                                {customer.billingEmail && (
                                  <span className="text-xs text-slate-500">{customer.billingEmail}</span>
                                )}
                              </div>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                      <CommandGroup>
                        <CommandItem
                          onSelect={() => {
                            setCustomerSearchOpen(false);
                            setShowNewCustomerDialog(true);
                          }}
                          className="border-t bg-slate-50 aria-selected:bg-slate-100"
                          data-testid="button-create-customer"
                        >
                          <div className="flex items-center gap-2 w-full justify-center py-1">
                            <UserPlus className="h-4 w-4 text-blue-600" />
                            <span className="font-medium text-blue-600">{t('createNewCustomer')}</span>
                          </div>
                        </CommandItem>
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              {form.formState.errors.customerId && (
                <p className="text-sm text-red-500 mt-1" data-testid="error-customer">
                  {form.formState.errors.customerId.message}
                </p>
              )}
            </div>

            {/* Expected Date */}
            <div>
              <Label htmlFor="expectedDate" className="text-sm font-medium text-slate-700">
                {t('expectedArrivalDate')}
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal h-10 mt-1.5 border-slate-300 hover:border-slate-400 hover:bg-slate-50 transition-colors",
                      !form.watch("expectedDate") && "text-slate-500"
                    )}
                    data-testid="button-select-date"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4 text-slate-600" />
                    {form.watch("expectedDate") ? (
                      <span className="text-slate-900 font-medium">
                        {format(form.watch("expectedDate")!, "EEEE, MMMM d, yyyy")}
                      </span>
                    ) : (
                      <span>{t('pickADate')}</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 shadow-lg border-slate-200" align="start">
                  <Calendar
                    mode="single"
                    selected={form.watch("expectedDate")}
                    onSelect={(date) => form.setValue("expectedDate", date)}
                    initialFocus
                    disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                    className="rounded-lg"
                    classNames={{
                      day_today: "bg-blue-100 text-blue-900 font-bold border-2 border-blue-500 hover:bg-blue-200",
                      day_selected: "bg-blue-600 text-white hover:bg-blue-700 font-semibold",
                    }}
                    data-testid="calendar-expected-date"
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Notes */}
            <div>
              <Label htmlFor="notes">{tCommon('notes')}</Label>
              <Textarea
                id="notes"
                placeholder={t('addNotesOrInstructions')}
                rows={3}
                {...form.register("notes")}
                data-testid="textarea-notes"
              />
            </div>
          </CardContent>
        </Card>

        {/* Reminder Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
              <Bell className="h-5 w-5" />
              {t('reminderSettings')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Enable Reminders Switch */}
            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900 rounded-lg">
              <div className="space-y-0.5">
                <Label htmlFor="reminderEnabled" className="text-base font-medium">
                  {t('enableReminders')}
                </Label>
                <p className="text-sm text-slate-500">
                  {t('enableRemindersDescription')}
                </p>
              </div>
              <Switch
                id="reminderEnabled"
                checked={form.watch("reminderEnabled")}
                onCheckedChange={(checked) => form.setValue("reminderEnabled", checked)}
                data-testid="switch-reminder-enabled"
              />
            </div>

            {/* Priority Selector - Always Visible */}
            <div>
              <Label htmlFor="priority" className="text-sm font-medium text-slate-700">
                {t('priority')}
              </Label>
              <Select
                value={form.watch("priority")}
                onValueChange={(value: 'low' | 'normal' | 'high' | 'urgent') => form.setValue("priority", value)}
              >
                <SelectTrigger className="mt-1.5" data-testid="select-priority">
                  <SelectValue placeholder={t('priorityNormal')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low" data-testid="option-priority-low">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-slate-400" />
                      {t('priorityLow')}
                    </span>
                  </SelectItem>
                  <SelectItem value="normal" data-testid="option-priority-normal">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-blue-500" />
                      {t('priorityNormal')}
                    </span>
                  </SelectItem>
                  <SelectItem value="high" data-testid="option-priority-high">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-orange-500" />
                      {t('priorityHigh')}
                    </span>
                  </SelectItem>
                  <SelectItem value="urgent" data-testid="option-priority-urgent">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-red-500" />
                      {t('priorityUrgent')}
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Conditional Reminder Options */}
            {form.watch("reminderEnabled") && (
              <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                {/* Channel and Days Before - Side by side on desktop */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Reminder Channel */}
                  <div>
                    <Label htmlFor="reminderChannel" className="text-sm font-medium text-slate-700">
                      {t('reminderChannel')}
                    </Label>
                    <Select
                      value={form.watch("reminderChannel")}
                      onValueChange={(value: 'sms' | 'email' | 'both') => form.setValue("reminderChannel", value)}
                    >
                      <SelectTrigger className="mt-1.5" data-testid="select-reminder-channel">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="email" data-testid="option-channel-email">
                          <span className="flex items-center gap-2">
                            <Mail className="h-4 w-4" />
                            {t('email')}
                          </span>
                        </SelectItem>
                        <SelectItem value="sms" data-testid="option-channel-sms">
                          <span className="flex items-center gap-2">
                            <Phone className="h-4 w-4" />
                            {t('sms')}
                          </span>
                        </SelectItem>
                        <SelectItem value="both" data-testid="option-channel-both">
                          <span className="flex items-center gap-2">
                            <Bell className="h-4 w-4" />
                            {t('smsBothEmail')}
                          </span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Reminder Timing - When to notify */}
                  <div>
                    <Label className="text-sm font-medium text-slate-700">
                      {t('reminderTiming')}
                    </Label>
                    <div className="flex flex-wrap gap-3 mt-2">
                      {[
                        { value: -3, label: t('daysBefore', { count: 3 }) },
                        { value: -1, label: t('daysBefore', { count: 1 }) },
                        { value: 0, label: t('sameDay') },
                        { value: 1, label: t('daysAfter', { count: 1 }) },
                        { value: 2, label: t('daysAfter', { count: 2 }) },
                      ].map((option) => (
                        <div key={option.value} className="flex items-center space-x-1.5">
                          <Checkbox
                            id={`day-${option.value}`}
                            checked={form.watch("reminderDaysBefore")?.includes(option.value)}
                            onCheckedChange={(checked) => {
                              const current = form.watch("reminderDaysBefore") || [];
                              if (checked) {
                                form.setValue("reminderDaysBefore", [...current, option.value].sort((a, b) => a - b));
                              } else {
                                form.setValue("reminderDaysBefore", current.filter((d: number) => d !== option.value));
                              }
                            }}
                            data-testid={`checkbox-days-${option.value}`}
                          />
                          <Label htmlFor={`day-${option.value}`} className="text-sm font-normal">
                            {option.label}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Contact Override - Show based on selected channel */}
                {(form.watch("reminderChannel") === 'sms' || form.watch("reminderChannel") === 'both') && (
                  <div>
                    <Label htmlFor="reminderPhone" className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5" />
                      {t('reminderPhone')}
                    </Label>
                    <p className="text-xs text-slate-500 mb-1.5">{t('reminderPhoneHint')}</p>
                    <Input
                      id="reminderPhone"
                      type="tel"
                      placeholder="+420 123 456 789"
                      value={form.watch("reminderPhone") || ""}
                      onChange={(e) => form.setValue("reminderPhone", e.target.value)}
                      data-testid="input-reminder-phone"
                    />
                  </div>
                )}

                {(form.watch("reminderChannel") === 'email' || form.watch("reminderChannel") === 'both') && (
                  <div>
                    <Label htmlFor="reminderEmail" className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
                      <Mail className="h-3.5 w-3.5" />
                      {t('reminderEmail')}
                    </Label>
                    <p className="text-xs text-slate-500 mb-1.5">{t('reminderEmailHint')}</p>
                    <Input
                      id="reminderEmail"
                      type="email"
                      placeholder="customer@example.com"
                      value={form.watch("reminderEmail") || ""}
                      onChange={(e) => form.setValue("reminderEmail", e.target.value)}
                      data-testid="input-reminder-email"
                    />
                    {form.formState.errors.reminderEmail && (
                      <p className="text-sm text-red-500 mt-1">
                        {form.formState.errors.reminderEmail.message}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pre-Order Items */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
              <Package className="h-5 w-5" />
              {t('preOrderItems')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {items.map((item, index) => (
              <div 
                key={item.id} 
                className="p-4 border rounded-lg space-y-3 bg-slate-50 dark:bg-slate-900"
                data-testid={`item-row-${index}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    {t('itemNumber', { number: index + 1 })}
                  </span>
                  {items.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeItem(item.id)}
                      className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                      data-testid={`button-remove-item-${index}`}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                {/* Product Selector (Optional) */}
                <div>
                  <Label htmlFor={`product-${item.id}`} className="text-xs">
                    {t('selectExistingItem')}
                  </Label>
                  <Popover 
                    open={productSearchOpen[item.id] || false} 
                    onOpenChange={(open) => setProductSearchOpen(prev => ({ ...prev, [item.id]: open }))}
                  >
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={productSearchOpen[item.id] || false}
                        className="w-full justify-between font-normal"
                        data-testid={`button-select-product-${index}`}
                      >
                        {selectedProducts[item.id] ? (
                          <span className="truncate">
                            {selectedProducts[item.id].name}
                            {selectedProducts[item.id].sku && ` (${selectedProducts[item.id].sku})`}
                            <span className="ml-2 text-xs text-slate-500">
                              {selectedProducts[item.id].type === 'product' ? '📦 Product' : 
                               selectedProducts[item.id].type === 'preorder' ? '🔄 Pre-Order' :
                               '🚚 Supplier'}
                            </span>
                          </span>
                        ) : (
                          <span className="text-muted-foreground">{t('selectOrSearch')}</span>
                        )}
                        <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    {!selectedProducts[item.id] && (
                      <p className="text-xs text-muted-foreground mt-1">{t('searchProductsPreOrdersSupplier')}</p>
                    )}
                    <PopoverContent className="w-full p-0" align="start">
                      <Command>
                        <CommandInput 
                          placeholder={t('searchByNameSKU')}
                          data-testid={`input-search-product-${index}`}
                        />
                        <CommandList>
                          <CommandEmpty>{t('noItemsFound')}</CommandEmpty>
                          <CommandGroup heading={t('products')}>
                            {getAllItems()
                              .filter(i => i.type === 'product')
                              .map((productItem: any) => (
                                <CommandItem
                                  key={productItem.id}
                                  value={`${productItem.name} ${productItem.sku || ''}`}
                                  onSelect={() => handleProductSelect(item.id, productItem)}
                                  data-testid={`option-product-${productItem.id}`}
                                >
                                  <div className="flex items-center gap-2">
                                    <span>📦</span>
                                    <div className="flex flex-col">
                                      <span className="font-medium">{productItem.name}</span>
                                      {productItem.sku && (
                                        <span className="text-xs text-slate-500">{productItem.sku}</span>
                                      )}
                                    </div>
                                  </div>
                                </CommandItem>
                              ))}
                          </CommandGroup>
                          <CommandGroup heading={t('preOrderItemsGroup')}>
                            {getAllItems()
                              .filter(i => i.type === 'preorder')
                              .map((preOrderItem: any) => (
                                <CommandItem
                                  key={preOrderItem.id}
                                  value={preOrderItem.name}
                                  onSelect={() => handleProductSelect(item.id, preOrderItem)}
                                  data-testid={`option-preorder-${preOrderItem.id}`}
                                >
                                  <div className="flex items-center gap-2">
                                    <span>🔄</span>
                                    <div className="flex flex-col">
                                      <span className="font-medium">{preOrderItem.name}</span>
                                      {preOrderItem.description && (
                                        <span className="text-xs text-slate-500 truncate max-w-[300px]">
                                          {preOrderItem.description}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </CommandItem>
                              ))}
                          </CommandGroup>
                          <CommandGroup heading={t('purchaseOrderItems')}>
                            {getAllItems()
                              .filter(i => i.type === 'purchase')
                              .map((purchaseItem: any) => (
                                <CommandItem
                                  key={purchaseItem.id}
                                  value={`${purchaseItem.name} ${purchaseItem.sku || ''}`}
                                  onSelect={() => handleProductSelect(item.id, purchaseItem)}
                                  data-testid={`option-purchase-${purchaseItem.id}`}
                                >
                                  <div className="flex items-center gap-2">
                                    <span>🚚</span>
                                    <div className="flex flex-col">
                                      <span className="font-medium">{purchaseItem.name}</span>
                                      <div className="flex items-center gap-2 text-xs text-slate-500">
                                        {purchaseItem.sku && <span>{purchaseItem.sku}</span>}
                                        {purchaseItem.supplier && (
                                          <>
                                            {purchaseItem.sku && <span>•</span>}
                                            <span>{purchaseItem.supplier}</span>
                                          </>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </CommandItem>
                              ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Item Name */}
                  <div>
                    <Label htmlFor={`itemName-${item.id}`}>
                      {t('itemNameRequired')}
                    </Label>
                    <Input
                      id={`itemName-${item.id}`}
                      placeholder="e.g., Blue Widget"
                      value={item.itemName}
                      onChange={(e) => updateItem(item.id, 'itemName', e.target.value)}
                      data-testid={`input-item-name-${index}`}
                    />
                  </div>

                  {/* Quantity */}
                  <div>
                    <Label htmlFor={`quantity-${item.id}`}>
                      {t('quantity')} *
                    </Label>
                    <Input
                      id={`quantity-${item.id}`}
                      type="number"
                      min="1"
                      placeholder="1"
                      value={item.quantity}
                      onChange={(e) => updateItem(item.id, 'quantity', parseInt(e.target.value) || 1)}
                      data-testid={`input-quantity-${index}`}
                    />
                  </div>
                </div>

                {/* Item Description */}
                <div>
                  <Label htmlFor={`itemDescription-${item.id}`}>
                    {t('itemDescription')}
                  </Label>
                  <Input
                    id={`itemDescription-${item.id}`}
                    placeholder={t('optionalDescriptionSpec')}
                    value={item.itemDescription || ""}
                    onChange={(e) => updateItem(item.id, 'itemDescription', e.target.value)}
                    data-testid={`input-item-description-${index}`}
                  />
                </div>
              </div>
            ))}

            <Button
              type="button"
              variant="outline"
              onClick={addItem}
              className="w-full"
              data-testid="button-add-item"
            >
              <Plus className="h-4 w-4 mr-2" />
              {t('addItem')}
            </Button>
          </CardContent>
        </Card>

        {/* Submit Button */}
        <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/orders/pre-orders')}
            className="w-full sm:w-auto"
            data-testid="button-cancel"
          >
            {tCommon('cancel')}
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting || !selectedCustomer || items.length === 0}
            className="w-full sm:w-auto"
            data-testid="button-submit"
          >
            <Save className="h-4 w-4 mr-2" />
            {isSubmitting 
              ? (isEditMode ? t('updating') : t('creating')) 
              : (isEditMode ? t('updatePreOrder') : t('createPreOrder'))}
          </Button>
        </div>
      </form>

      {/* Create New Customer Dialog */}
      <Dialog open={showNewCustomerDialog} onOpenChange={setShowNewCustomerDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-blue-600" />
              {t('createNewCustomer')}
            </DialogTitle>
            <DialogDescription>
              {t('addNewCustomerDescription')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="newCustomerName" className="text-sm font-medium">
                {t('customerNameRequired')}
              </Label>
              <Input
                id="newCustomerName"
                placeholder="e.g., John Doe or ABC Company"
                value={newCustomerData.name}
                onChange={(e) => setNewCustomerData(prev => ({ ...prev, name: e.target.value }))}
                data-testid="input-new-customer-name"
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="newCustomerEmail" className="text-sm font-medium">
                {tCommon('emailOptional')}
              </Label>
              <Input
                id="newCustomerEmail"
                type="email"
                placeholder="e.g., customer@example.com"
                value={newCustomerData.email}
                onChange={(e) => setNewCustomerData(prev => ({ ...prev, email: e.target.value }))}
                data-testid="input-new-customer-email"
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="newCustomerTel" className="text-sm font-medium">
                {tCommon('phoneOptional')}
              </Label>
              <Input
                id="newCustomerTel"
                type="tel"
                placeholder="e.g., +420 123 456 789"
                value={newCustomerData.tel}
                onChange={(e) => setNewCustomerData(prev => ({ ...prev, tel: e.target.value }))}
                data-testid="input-new-customer-tel"
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="newCustomerCountry" className="text-sm font-medium">
                {tCommon('countryOptional')}
              </Label>
              <Input
                id="newCustomerCountry"
                placeholder="e.g., Czech Republic"
                value={newCustomerData.country}
                onChange={(e) => setNewCustomerData(prev => ({ ...prev, country: e.target.value }))}
                data-testid="input-new-customer-country"
                className="mt-1.5"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowNewCustomerDialog(false);
                setNewCustomerData({ name: '', email: '', tel: '', country: '' });
              }}
              data-testid="button-cancel-customer"
            >
              {tCommon('cancel')}
            </Button>
            <Button
              onClick={handleCreateCustomer}
              disabled={createCustomerMutation.isPending || !newCustomerData.name.trim()}
              data-testid="button-save-customer"
            >
              {createCustomerMutation.isPending ? (
                <>Creating...</>
              ) : (
                <>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Create Customer
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
