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
  ArrowLeft, 
  Save, 
  CalendarIcon,
  Plus,
  X,
  User,
  Package,
  Search,
  Loader2,
  Bell,
  Send,
  Clock,
  CheckCircle2,
  AlertCircle,
  Timer
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
import { format, parseISO, formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { insertPreOrderSchema } from "@shared/schema";

const COMMON_TIMEZONES = [
  'Europe/Prague',
  'Europe/London',
  'Europe/Berlin',
  'Europe/Paris',
  'Europe/Rome',
  'Europe/Madrid',
  'Europe/Amsterdam',
  'Europe/Vienna',
  'Europe/Warsaw',
  'Europe/Budapest',
  'America/New_York',
  'America/Chicago',
  'America/Los_Angeles',
  'Asia/Ho_Chi_Minh',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Australia/Sydney',
  'UTC',
];

const phoneRegex = /^(\+?[1-9]\d{0,14})?$/;

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
  reminderTimeUtc: z.string().default('09:00'),
  reminderTimezone: z.string().default('Europe/Prague'),
  reminderPhone: z.string().optional().refine(
    (val) => !val || phoneRegex.test(val.replace(/\s/g, '')),
    { message: 'Invalid phone number format' }
  ),
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

export default function EditPreOrder() {
  const { t } = useTranslation('orders');
  const { t: tCommon } = useTranslation('common');
  const [, navigate] = useLocation();
  const { id } = useParams();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSendingReminder, setIsSendingReminder] = useState(false);
  const [items, setItems] = useState<ItemRow[]>([
    { id: crypto.randomUUID(), itemName: "", itemDescription: "", quantity: 1 }
  ]);
  const [customerSearchOpen, setCustomerSearchOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);

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
      reminderTimeUtc: '09:00',
      reminderTimezone: 'Europe/Prague',
      reminderPhone: '',
      reminderEmail: '',
      priority: 'normal',
    },
  });

  const { data: preOrder, isLoading: isLoadingPreOrder } = useQuery<any>({
    queryKey: ['/api/pre-orders', id],
    enabled: !!id,
  });

  const { data: customers, isLoading: isLoadingCustomers } = useQuery<any[]>({
    queryKey: ['/api/customers'],
  });

  const { data: products, isLoading: isLoadingProducts } = useQuery<any[]>({
    queryKey: ['/api/products'],
  });

  useEffect(() => {
    if (preOrder && customers) {
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
      form.setValue('reminderTimeUtc', preOrder.reminderTimeUtc || '09:00');
      form.setValue('reminderTimezone', preOrder.reminderTimezone || 'Europe/Prague');
      form.setValue('reminderPhone', preOrder.reminderPhone || '');
      form.setValue('reminderEmail', preOrder.reminderEmail || '');
      form.setValue('priority', preOrder.priority || 'normal');
    }
  }, [preOrder, customers, form]);

  const updatePreOrderMutation = useMutation({
    mutationFn: async (data: any) => {
      await apiRequest('PATCH', `/api/pre-orders/${id}`, {
        customerId: data.customerId,
        status: data.status,
        notes: data.notes,
        expectedDate: data.expectedDate,
        reminderEnabled: data.reminderEnabled,
        reminderChannel: data.reminderChannel,
        reminderDaysBefore: data.reminderDaysBefore,
        reminderTimeUtc: data.reminderTimeUtc,
        reminderTimezone: data.reminderTimezone,
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
            preOrderId: id,
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
      queryClient.invalidateQueries({ queryKey: ['/api/pre-orders', id] });
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

  const sendReminderMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('POST', `/api/pre-orders/${id}/send-reminder`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/pre-orders', id] });
      toast({
        title: tCommon('success'),
        description: t('reminderSent'),
      });
    },
    onError: (error: any) => {
      toast({
        title: tCommon('error'),
        description: error.message || t('reminderFailed'),
        variant: "destructive",
      });
    },
  });

  const handleSendReminderNow = async () => {
    setIsSendingReminder(true);
    try {
      await sendReminderMutation.mutateAsync();
    } finally {
      setIsSendingReminder(false);
    }
  };

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

  const handleProductSelect = (itemId: string, productId: string) => {
    const product = products?.find((p: any) => p.id === productId);
    if (product) {
      setItems(items.map(item => 
        item.id === itemId 
          ? { 
              ...item, 
              productId: product.id,
              itemName: product.name,
              itemDescription: product.description || "",
            } 
          : item
      ));
    }
  };

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);

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
      reminderTimeUtc: data.reminderTimeUtc,
      reminderTimezone: data.reminderTimezone,
      reminderPhone: data.reminderPhone || null,
      reminderEmail: data.reminderEmail || null,
      priority: data.priority,
    };

    await updatePreOrderMutation.mutateAsync(preOrderData);
    setIsSubmitting(false);
  };

  const getReminderStatusIcon = (status: string | null | undefined) => {
    switch (status) {
      case 'sent':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      case 'pending':
        return <Timer className="h-4 w-4 text-yellow-600" />;
      default:
        return <Clock className="h-4 w-4 text-slate-400" />;
    }
  };

  const getReminderStatusText = (status: string | null | undefined) => {
    switch (status) {
      case 'sent':
        return t('reminderStatusSent');
      case 'failed':
        return t('reminderStatusFailed');
      case 'pending':
        return t('reminderStatusPending');
      default:
        return t('noRemindersYet');
    }
  };

  if (isLoadingPreOrder) {
    return (
      <div className="flex items-center justify-center min-h-[400px]" data-testid="loading-state">
        <div className="text-center space-y-3">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-slate-600" />
          <p className="text-slate-600">{t('loadingPreOrder')}</p>
        </div>
      </div>
    );
  }

  if (!preOrder) {
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
    <div className="max-w-4xl mx-auto space-y-6 p-4 md:p-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => window.history.back()}
          data-testid="button-back"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight" data-testid="heading-edit-pre-order">
            {t('editPreOrder')}
          </h1>
          <p className="text-slate-600 mt-1 text-sm md:text-base">
            {t('updatePreOrderDetails')}
          </p>
        </div>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
              <User className="h-5 w-5" />
              {t('basicInformation')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="customerId">{t('customer')} *</Label>
              <Popover open={customerSearchOpen} onOpenChange={setCustomerSearchOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={customerSearchOpen}
                    className="w-full justify-between"
                    data-testid="button-select-customer"
                  >
                    {selectedCustomer ? selectedCustomer.name : t('selectCustomer')}
                    <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <Command>
                    <CommandInput 
                      placeholder={t('searchCustomers')}
                      data-testid="input-search-customer"
                    />
                    <CommandList>
                      <CommandEmpty>{t('noCustomerFound')}</CommandEmpty>
                      <CommandGroup>
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
                            {customer.name}
                          </CommandItem>
                        ))}
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

            <div>
              <Label htmlFor="expectedDate">{t('expectedArrivalDate')}</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !form.watch("expectedDate") && "text-muted-foreground"
                    )}
                    data-testid="button-select-date"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {form.watch("expectedDate") ? (
                      format(form.watch("expectedDate")!, "PPP")
                    ) : (
                      <span>{t('pickADate')}</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={form.watch("expectedDate")}
                    onSelect={(date) => form.setValue("expectedDate", date)}
                    initialFocus
                    data-testid="calendar-expected-date"
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <Label htmlFor="notes">{t('notes')}</Label>
              <Textarea
                id="notes"
                placeholder={t('addNotesPlaceholder')}
                rows={3}
                {...form.register("notes")}
                data-testid="textarea-notes"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
              <Bell className="h-5 w-5" />
              {t('reminderSettings')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
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

            {form.watch("reminderEnabled") && (
              <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-700">
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
                      <SelectItem value="sms" data-testid="option-channel-sms">{t('sms')}</SelectItem>
                      <SelectItem value="email" data-testid="option-channel-email">{t('email')}</SelectItem>
                      <SelectItem value="both" data-testid="option-channel-both">{t('smsBothEmail')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-sm font-medium text-slate-700">
                    {t('reminderDaysBefore')}
                  </Label>
                  <p className="text-xs text-slate-500 mb-2">{t('reminderDaysBeforeHint')}</p>
                  <div className="flex flex-wrap gap-4">
                    {[1, 3, 7].map((day) => (
                      <div key={day} className="flex items-center space-x-2">
                        <Checkbox
                          id={`day-${day}`}
                          checked={form.watch("reminderDaysBefore")?.includes(day)}
                          onCheckedChange={(checked) => {
                            const current = form.watch("reminderDaysBefore") || [];
                            if (checked) {
                              form.setValue("reminderDaysBefore", [...current, day].sort((a, b) => a - b));
                            } else {
                              form.setValue("reminderDaysBefore", current.filter((d: number) => d !== day));
                            }
                          }}
                          data-testid={`checkbox-days-${day}`}
                        />
                        <Label htmlFor={`day-${day}`} className="text-sm font-normal">
                          {t('daysBefore', { count: day })}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="reminderTimeUtc" className="text-sm font-medium text-slate-700">
                      {t('reminderTime')}
                    </Label>
                    <p className="text-xs text-slate-500 mb-1.5">{t('reminderTimeHint')}</p>
                    <Input
                      id="reminderTimeUtc"
                      type="time"
                      value={form.watch("reminderTimeUtc")}
                      onChange={(e) => form.setValue("reminderTimeUtc", e.target.value)}
                      className="mt-1"
                      data-testid="input-reminder-time"
                    />
                  </div>
                  <div>
                    <Label htmlFor="reminderTimezone" className="text-sm font-medium text-slate-700">
                      {t('reminderTimezone')}
                    </Label>
                    <Select
                      value={form.watch("reminderTimezone")}
                      onValueChange={(value) => form.setValue("reminderTimezone", value)}
                    >
                      <SelectTrigger className="mt-1.5" data-testid="select-reminder-timezone">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {COMMON_TIMEZONES.map((tz) => (
                          <SelectItem key={tz} value={tz} data-testid={`option-timezone-${tz}`}>
                            {tz}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="reminderPhone" className="text-sm font-medium text-slate-700">
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
                    {form.formState.errors.reminderPhone && (
                      <p className="text-sm text-red-500 mt-1">
                        {form.formState.errors.reminderPhone.message}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="reminderEmail" className="text-sm font-medium text-slate-700">
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
                </div>

                {(preOrder.lastReminderSentAt || preOrder.lastReminderStatus) && (
                  <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                    <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      {t('lastReminderSent')}
                    </h4>
                    <div className="flex items-center gap-4 flex-wrap">
                      <div className="flex items-center gap-2">
                        {getReminderStatusIcon(preOrder.lastReminderStatus)}
                        <span className={cn(
                          "text-sm font-medium",
                          preOrder.lastReminderStatus === 'sent' && "text-green-600",
                          preOrder.lastReminderStatus === 'failed' && "text-red-600",
                          preOrder.lastReminderStatus === 'pending' && "text-yellow-600"
                        )}>
                          {getReminderStatusText(preOrder.lastReminderStatus)}
                        </span>
                      </div>
                      {preOrder.lastReminderSentAt && (
                        <span className="text-sm text-slate-500">
                          {format(parseISO(preOrder.lastReminderSentAt), 'PPP p')}
                          <span className="ml-1 text-slate-400">
                            ({formatDistanceToNow(parseISO(preOrder.lastReminderSentAt), { addSuffix: true })})
                          </span>
                        </span>
                      )}
                    </div>
                  </div>
                )}

                <div className="pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleSendReminderNow}
                    disabled={isSendingReminder}
                    className="w-full sm:w-auto"
                    data-testid="button-send-reminder-now"
                  >
                    {isSendingReminder ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        {t('sendReminder')}...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        {t('sendReminderNow')}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

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
                    {t('item')} {index + 1}
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

                <div>
                  <Label htmlFor={`product-${item.id}`} className="text-xs">
                    {t('selectExistingProduct')}
                  </Label>
                  <Select
                    value={item.productId || ""}
                    onValueChange={(value) => handleProductSelect(item.id, value)}
                  >
                    <SelectTrigger data-testid={`select-product-${index}`}>
                      <SelectValue placeholder={t('selectProductManually')} />
                    </SelectTrigger>
                    <SelectContent>
                      {products?.map((product: any) => (
                        <SelectItem 
                          key={product.id} 
                          value={product.id}
                          data-testid={`option-product-${product.id}`}
                        >
                          {product.name} ({product.sku})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor={`itemName-${item.id}`}>
                      {t('itemName')} *
                    </Label>
                    <Input
                      id={`itemName-${item.id}`}
                      placeholder={t('exampleBlueWidget')}
                      value={item.itemName}
                      onChange={(e) => updateItem(item.id, 'itemName', e.target.value)}
                      data-testid={`input-item-name-${index}`}
                    />
                  </div>

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

                <div>
                  <Label htmlFor={`itemDescription-${item.id}`}>
                    {t('itemDescription')}
                  </Label>
                  <Input
                    id={`itemDescription-${item.id}`}
                    placeholder={t('optionalDescription')}
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

        <div className="flex gap-3 justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/orders/pre-orders')}
            data-testid="button-cancel"
          >
            {tCommon('cancel')}
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting || !selectedCustomer || items.length === 0}
            data-testid="button-submit"
          >
            <Save className="h-4 w-4 mr-2" />
            {isSubmitting ? t('updating') : t('updatePreOrder')}
          </Button>
        </div>
      </form>
    </div>
  );
}
