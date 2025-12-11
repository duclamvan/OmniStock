import { useState, useEffect, useRef, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, ArrowLeft, Save, Sparkles } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, addDays, addWeeks } from "date-fns";
import { cn } from "@/lib/utils";
import { CalendarIcon } from "lucide-react";

const ticketFormSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  category: z.string().optional(),
  priority: z.string().optional(),
  status: z.string().optional(),
  customerId: z.string().optional(),
  orderId: z.string().optional(),
  dueDate: z.date().optional(),
});

type TicketFormValues = z.infer<typeof ticketFormSchema>;

interface TicketFormProps {
  ticket?: any;
  mode: "add" | "edit";
}

export default function TicketForm({ ticket, mode }: TicketFormProps) {
  const { t } = useTranslation('system');
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [isGeneratingSubject, setIsGeneratingSubject] = useState(false);
  const [customerSearch, setCustomerSearch] = useState("");
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [hasManuallyEditedTitle, setHasManuallyEditedTitle] = useState(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch customers for dropdown
  const { data: customers = [] } = useQuery<any[]>({
    queryKey: ['/api/customers'],
  });

  // Fetch orders for dropdown
  const { data: orders = [] } = useQuery<any[]>({
    queryKey: ['/api/orders'],
  });

  // Read URL query parameters for pre-filling
  const urlParams = useMemo(() => {
    if (typeof window === 'undefined') return {};
    const params = new URLSearchParams(window.location.search);
    return {
      orderId: params.get('orderId') || undefined,
    };
  }, []);

  const form = useForm<TicketFormValues>({
    resolver: zodResolver(ticketFormSchema),
    defaultValues: {
      title: ticket?.title || "",
      description: ticket?.description || "",
      category: ticket?.category || "general",
      priority: ticket?.priority || "medium",
      status: ticket?.status || "open",
      customerId: ticket?.customerId || "",
      orderId: ticket?.orderId || "",
      dueDate: ticket?.dueDate ? new Date(ticket.dueDate) : undefined,
    },
  });

  // Memoize notify date options
  const notifyDateOptions = useMemo(() => {
    const today = new Date();
    return [
      { value: "NONE", label: t('noReminder') },
      { value: format(addDays(today, 1), "yyyy-MM-dd"), label: t('tomorrow') },
      { value: format(addDays(today, 2), "yyyy-MM-dd"), label: t('in2Days') },
      { value: format(addDays(today, 3), "yyyy-MM-dd"), label: t('in3Days') },
      { value: format(addDays(today, 5), "yyyy-MM-dd"), label: t('in5Days') },
      { value: format(addWeeks(today, 1), "yyyy-MM-dd"), label: t('in1Week') },
      { value: format(addWeeks(today, 2), "yyyy-MM-dd"), label: t('in2Weeks') },
      { value: format(addWeeks(today, 3), "yyyy-MM-dd"), label: t('in3Weeks') },
      { value: format(addWeeks(today, 4), "yyyy-MM-dd"), label: t('in1Month') },
      { value: "custom", label: t('customDate') },
    ];
  }, [t]);

  // Initialize customer search from existing ticket (wait for both ticket data AND customers to be loaded)
  useEffect(() => {
    if (ticket?.customerId && customers && customers.length > 0) {
      const customer = customers.find((c: any) => c.id === ticket.customerId);
      if (customer) {
        setCustomerSearch(customer.name);
      }
    }
  }, [ticket?.customerId, customers]);

  // Auto-fill from URL parameters (for creating ticket from Order Details)
  useEffect(() => {
    if (mode !== 'add') return; // Only in add mode
    if (!urlParams.orderId) return; // Only if orderId in URL
    if (!orders.length || !customers.length) return; // Wait for data to load

    const order = orders.find((o: any) => o.id === urlParams.orderId);
    if (!order) return;

    // Set orderId in form
    form.setValue('orderId', order.id);

    // Set customerId and customer search if available
    if (order.customerId) {
      const customer = customers.find((c: any) => c.id === order.customerId);
      if (customer) {
        form.setValue('customerId', customer.id);
        setCustomerSearch(customer.name);
      }
    }
  }, [mode, urlParams.orderId, orders, customers, form]);

  // AI Subject Generation function
  const generateSubject = async (descriptionText: string) => {
    if (!descriptionText.trim() || descriptionText.length < 10) return;

    setIsGeneratingSubject(true);
    try {
      const response = await apiRequest("POST", "/api/tickets/generate-subject", {
        description: descriptionText,
      });

      const data = await response.json();
      const generatedSubject = data.subject || "";
      
      if (generatedSubject) {
        form.setValue("title", generatedSubject, { shouldValidate: true, shouldDirty: true });
        setHasManuallyEditedTitle(false);
        toast({
          title: t('subjectGenerated'),
          description: generatedSubject,
        });
      }
    } catch (error) {
      console.error("Error generating subject:", error);
      toast({
        title: t('aiGenerationFailed'),
        description: t('couldNotGenerateSubject'),
        variant: "destructive",
      });
    } finally {
      setIsGeneratingSubject(false);
    }
  };

  // Manual generate handler
  const handleManualGenerate = () => {
    const description = form.getValues("description");
    if (!description || description.trim().length < 10) {
      toast({
        title: t('needMoreDetails'),
        description: t('writeDescriptionFirst'),
        variant: "destructive",
      });
      return;
    }
    generateSubject(description);
  };

  // Auto-generate subject when description changes (only in add mode and if user hasn't manually edited title)
  useEffect(() => {
    if (mode !== "add") return;
    if (hasManuallyEditedTitle) return;

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    const description = form.watch("description");
    const title = form.watch("title");

    if (description && description.trim().length > 20 && !title) {
      debounceTimerRef.current = setTimeout(() => {
        generateSubject(description);
      }, 2000);
    }

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [form.watch("description"), mode, hasManuallyEditedTitle]);

  // Reset hasManuallyEditedTitle when description changes AND title is empty
  useEffect(() => {
    const title = form.watch("title");
    if (!title || title.trim() === "") {
      setHasManuallyEditedTitle(false);
    }
  }, [form.watch("description"), form.watch("title")]);

  // Filter customers based on search
  const filteredCustomers = useMemo(() => {
    return customers
      .filter((customer: any) =>
        customer.name.toLowerCase().includes(customerSearch.toLowerCase())
      )
      .slice(0, 8);
  }, [customers, customerSearch]);

  // Handle customer selection
  const handleCustomerSelect = (customer: any) => {
    setCustomerSearch(customer.name);
    form.setValue("customerId", customer.id);
    setShowCustomerDropdown(false);
  };

  const mutation = useMutation({
    mutationFn: async (data: TicketFormValues) => {
      if (mode === "edit" && ticket) {
        return await apiRequest('PATCH', `/api/tickets/${ticket.id}`, data);
      } else {
        return await apiRequest('POST', '/api/tickets', data);
      }
    },
    onSuccess: () => {
      // Invalidate all ticket-related queries including filtered ones (by orderId, customerId, etc.)
      queryClient.invalidateQueries({ 
        predicate: (query) => {
          const key = query.queryKey[0];
          return typeof key === 'string' && key.startsWith('/api/tickets');
        }
      });
      toast({
        title: t('success'),
        description: mode === "edit" ? t('ticketUpdatedSuccessfully') : t('ticketCreatedSuccessfully'),
      });
      navigate('/tickets');
    },
    onError: (error) => {
      toast({
        title: t('error'),
        description: mode === "edit" ? t('failedToUpdateTicket') : t('failedToCreateTicket'),
        variant: "destructive",
      });
      console.error('Mutation error:', error);
    },
  });

  const onSubmit = (data: TicketFormValues) => {
    // Transform empty strings to null for foreign key fields
    const cleanedData = {
      ...data,
      customerId: data.customerId?.trim() || undefined,
      orderId: data.orderId?.trim() || undefined,
      title: data.title?.trim() || undefined,
      description: data.description?.trim() || undefined,
    };
    
    mutation.mutate(cleanedData);
  };

  return (
    <div className="space-y-4 sm:space-y-6 p-2 sm:p-4 md:p-6 overflow-x-hidden">
      {/* Header */}
      <div className="flex items-start gap-3 sm:gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => window.history.back()}
          className="shrink-0"
          data-testid="button-back"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight">
            {mode === "edit" ? t('editTicket') : t('newTicket')}
          </h1>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 mt-1">
            {mode === "edit" ? t('updateTicketDetails') : t('createNewSupportTicket')}
          </p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 sm:space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
            {/* Left: Main Form */}
            <div className="lg:col-span-2 space-y-4 sm:space-y-6">
              {/* Customer Selection */}
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg font-semibold">{t('customerInformation')}</CardTitle>
                </CardHeader>
                <CardContent className="pt-2">
                  <FormField
                    control={form.control}
                    name="customerId"
                    render={({ field }) => {
                      const customerNotFound = field.value && customers.length > 0 && !customers.find((c: any) => c.id === field.value);
                      
                      return (
                        <FormItem>
                          <div className="relative">
                            <FormControl>
                              <Input
                                placeholder={t('startTypingCustomerName')}
                                autoComplete="off"
                                autoCorrect="off"
                                autoCapitalize="off"
                                spellCheck={false}
                                value={customerSearch}
                                onChange={(e) => {
                                  setCustomerSearch(e.target.value);
                                  setShowCustomerDropdown(true);
                                  if (!e.target.value) {
                                    field.onChange("");
                                  }
                                }}
                                onFocus={() => setShowCustomerDropdown(true)}
                                onBlur={() => {
                                  setTimeout(() => setShowCustomerDropdown(false), 200);
                                }}
                                data-testid="input-customer-search"
                                className="text-lg h-12"
                              />
                            </FormControl>
                            {showCustomerDropdown && customerSearch && filteredCustomers.length > 0 && (
                              <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md shadow-lg max-h-64 overflow-auto">
                                {filteredCustomers.map((customer: any) => (
                                  <button
                                    key={customer.id}
                                    type="button"
                                    onClick={() => handleCustomerSelect(customer)}
                                    className="w-full px-4 py-2 text-left hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-between"
                                    data-testid={`button-customer-${customer.id}`}
                                  >
                                    <span className="font-medium">{customer.name}</span>
                                    {customer.email && (
                                      <span className="text-xs text-slate-500">{customer.email}</span>
                                    )}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                          {customerNotFound && (
                            <div className="text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950 px-3 py-2 rounded border border-amber-200 dark:border-amber-800 flex items-center gap-2">
                              <span className="font-medium">⚠️ {t('warning')}:</span>
                              <span>{t('selectedCustomerNotFound')}</span>
                            </div>
                          )}
                          {field.value && customerSearch && !customerNotFound && (
                            <div className="text-sm text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/50 px-3 py-2 rounded border border-blue-300 dark:border-blue-700">
                              {t('selected')}: <span className="font-medium">{customerSearch}</span>
                            </div>
                          )}
                          <FormMessage />
                        </FormItem>
                      );
                    }}
                  />
                </CardContent>
              </Card>

              {/* Description */}
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg font-semibold">{t('ticketDescription')}</CardTitle>
                </CardHeader>
                <CardContent className="pt-2">
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Textarea
                            placeholder={t('describeIssueOrRequest')}
                            className="min-h-[150px] text-base"
                            {...field}
                            data-testid="textarea-description"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              {/* Additional Details */}
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg font-semibold">{t('ticketDetails')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-5 pt-2">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">{t('subject')}</FormLabel>
                        <div className="flex gap-2">
                          <FormControl>
                            <Input 
                              placeholder={t('briefSubjectLine')} 
                              {...field}
                              onChange={(e) => {
                                field.onChange(e);
                                setHasManuallyEditedTitle(true);
                              }}
                              data-testid="input-title"
                              className="h-10"
                            />
                          </FormControl>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={handleManualGenerate}
                            disabled={isGeneratingSubject}
                            title={t('generateSubjectWithAI')}
                            data-testid="button-generate-subject"
                            className="h-10 w-10 shrink-0"
                          >
                            {isGeneratingSubject ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Sparkles className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="category"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium">{t('category')}</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || "general"}>
                            <FormControl>
                              <SelectTrigger data-testid="select-category">
                                <SelectValue placeholder={t('selectCategory')} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="shipping_issue">{t('shippingIssue')}</SelectItem>
                              <SelectItem value="product_question">{t('productQuestion')}</SelectItem>
                              <SelectItem value="payment_problem">{t('paymentProblem')}</SelectItem>
                              <SelectItem value="complaint">{t('complaint')}</SelectItem>
                              <SelectItem value="general">{t('general')}</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="priority"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium">{t('priority')}</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || "medium"}>
                            <FormControl>
                              <SelectTrigger data-testid="select-priority">
                                <SelectValue placeholder={t('selectPriority')} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="low">{t('low')}</SelectItem>
                              <SelectItem value="medium">{t('medium')}</SelectItem>
                              <SelectItem value="high">{t('high')}</SelectItem>
                              <SelectItem value="urgent">{t('urgent')}</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium">{t('status')}</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || "open"}>
                            <FormControl>
                              <SelectTrigger data-testid="select-status">
                                <SelectValue placeholder={t('selectStatus')} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="open">{t('open')}</SelectItem>
                              <SelectItem value="in_progress">{t('inProgress')}</SelectItem>
                              <SelectItem value="resolved">{t('resolved')}</SelectItem>
                              <SelectItem value="closed">{t('closed')}</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="dueDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium">{t('dueDate')}</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="outline"
                                  className={cn(
                                    "w-full pl-3 text-left font-normal",
                                    !field.value && "text-muted-foreground"
                                  )}
                                  data-testid="button-due-date"
                                >
                                  {field.value ? (
                                    format(field.value, "PPP")
                                  ) : (
                                    <span>{t('pickDate')}</span>
                                  )}
                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <div className="p-3 border-b space-y-2">
                                <p className="text-sm font-medium">{t('quickOptions')}</p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  {notifyDateOptions.map((option) => (
                                    <Button
                                      key={option.value}
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      className="justify-start"
                                      onClick={() => {
                                        if (option.value === "NONE") {
                                          field.onChange(undefined);
                                        } else if (option.value === "custom") {
                                          return;
                                        } else {
                                          field.onChange(new Date(option.value));
                                        }
                                      }}
                                      data-testid={`button-quick-date-${option.value}`}
                                    >
                                      {option.label}
                                    </Button>
                                  ))}
                                </div>
                              </div>
                              <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                disabled={(date) =>
                                  date < new Date(new Date().setHours(0, 0, 0, 0))
                                }
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="orderId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">{t('relatedOrder')}</FormLabel>
                        <Select onValueChange={(value) => field.onChange(value === "NONE" ? undefined : value)} value={field.value || "NONE"}>
                          <FormControl>
                            <SelectTrigger data-testid="select-order">
                              <SelectValue placeholder={t('selectOrder')} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="NONE">{t('none')}</SelectItem>
                            {orders.slice(0, 50).map((order: any) => (
                              <SelectItem key={order.id} value={order.id}>
                                {order.orderId} - {order.customer?.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </div>

            {/* Right: Summary/Actions */}
            <div className="lg:col-span-1 order-first lg:order-last">
              <div className="lg:sticky lg:top-20">
                <Card className="shadow-md">
                  <CardHeader className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 border-b">
                    <CardTitle className="text-lg font-semibold text-slate-900 dark:text-slate-100">{t('ticketSummary')}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 pt-6">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600 dark:text-slate-400">{t('category')}:</span>
                        <span className="font-medium capitalize">
                          {form.watch("category")?.replace(/_/g, ' ') || "-"}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600 dark:text-slate-400">{t('priority')}:</span>
                        <span className="font-medium capitalize">{form.watch("priority") || "-"}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600 dark:text-slate-400">{t('status')}:</span>
                        <span className="font-medium capitalize">
                          {form.watch("status")?.replace(/_/g, ' ') || "-"}
                        </span>
                      </div>
                      {form.watch("dueDate") && (
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-600 dark:text-slate-400">{t('dueDate')}:</span>
                          <span className="font-medium">
                            {format(form.watch("dueDate")!, "dd/MM/yyyy")}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="pt-4 border-t space-y-2">
                      <Button
                        type="submit"
                        className="w-full"
                        size="lg"
                        disabled={mutation.isPending}
                        data-testid="button-submit"
                      >
                        {mutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            {t('saving')}
                          </>
                        ) : (
                          <>
                            <Save className="mr-2 h-5 w-5" />
                            {mode === "edit" ? t('updateTicket') : t('createTicket')}
                          </>
                        )}
                      </Button>

                      <Button
                        type="button"
                        variant="outline"
                        className="w-full"
                        onClick={() => navigate('/tickets')}
                        data-testid="button-cancel"
                      >
                        {t('cancel')}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
}
