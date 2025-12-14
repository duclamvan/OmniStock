import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { useForm } from "react-hook-form";
import { useTranslation } from 'react-i18next';
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { 
  ArrowLeft, 
  Save, 
  CalendarIcon, 
  Receipt,
  DollarSign,
  Building2,
  FileText,
  CreditCard,
  Wallet,
  Repeat,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { formatCzechDate } from "@/lib/dateUtils";
import { useSettings } from "@/contexts/SettingsContext";

export default function EditExpense() {
  const { t } = useTranslation(['financial', 'common']);
  const [, navigate] = useLocation();
  const { id } = useParams();
  const { toast } = useToast();
  const { financialSettings } = useSettings();

  const categories = financialSettings.expenseCategories ?? [];

  const expenseSchema = z.object({
    vendorName: z.string().min(1, t('vendorNameRequired')),
    category: z.string().min(1, t('categoryIsRequired')),
    amount: z.coerce.number().positive(t('amountMustBeGreaterThanZero')),
    currency: z.enum(['USD', 'EUR', 'CZK', 'VND', 'CNY']),
    date: z.date({
      required_error: t('dateIsRequired'),
    }),
    description: z.string().optional(),
    invoiceNumber: z.string().optional(),
    paymentMethod: z.enum(['cash', 'bank_transfer', 'credit_card', 'paypal', 'other']),
    status: z.enum(['pending', 'paid', 'overdue']),
    notes: z.string().optional(),
    isRecurring: z.boolean().default(false),
    recurringType: z.enum(['weekly', 'monthly', 'yearly']).optional(),
    recurringInterval: z.coerce.number().int().min(1).optional(),
    recurringDayOfWeek: z.coerce.number().int().min(0).max(6).optional(),
    recurringDayOfMonth: z.coerce.number().int().min(1).max(31).optional(),
    recurringMonth: z.coerce.number().int().min(1).max(12).optional(),
    recurringDay: z.coerce.number().int().min(1).max(31).optional(),
    recurringStartDate: z.date().optional(),
    recurringEndDate: z.date().optional(),
  });

  type ExpenseFormData = z.infer<typeof expenseSchema>;

  const [showRecurring, setShowRecurring] = useState(false);

  const { data: expense, isLoading } = useQuery<any>({
    queryKey: [`/api/expenses/${id}`],
    enabled: !!id,
  });

  const form = useForm<ExpenseFormData>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      vendorName: '',
      category: categories[0],
      amount: undefined,
      currency: 'CZK',
      date: new Date(),
      paymentMethod: 'bank_transfer',
      status: 'paid',
      description: '',
      invoiceNumber: '',
      notes: '',
      isRecurring: false,
      recurringType: 'monthly',
      recurringInterval: 1,
      recurringDayOfMonth: 1,
    },
  });

  useEffect(() => {
    if (expense) {
      const isRecurring = expense.isRecurring || false;
      form.reset({
        vendorName: expense.name || '',
        category: expense.category || categories[0],
        amount: expense.amount ? parseFloat(expense.amount) : undefined,
        currency: expense.currency as any || 'CZK',
        date: expense.date ? new Date(expense.date) : new Date(),
        description: expense.description || '',
        invoiceNumber: expense.invoiceNumber || '',
        paymentMethod: expense.paymentMethod || 'bank_transfer',
        status: expense.status || 'paid',
        notes: expense.notes || '',
        isRecurring: isRecurring,
        recurringType: expense.recurringType || 'monthly',
        recurringInterval: expense.recurringInterval || 1,
        recurringDayOfMonth: expense.recurringDayOfMonth || 1,
      });
      setShowRecurring(isRecurring);
    }
  }, [expense, form, categories]);

  const updateExpenseMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest('PATCH', `/api/expenses/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/expenses'] });
      queryClient.invalidateQueries({ queryKey: [`/api/expenses/${id}`] });
      toast({
        title: t('success'),
        description: t('expenseUpdatedSuccessfully'),
      });
      navigate('/expenses');
    },
    onError: (error: any) => {
      toast({
        title: t('error'),
        description: error.message || t('failedToUpdateExpense'),
        variant: "destructive",
      });
    },
  });

  const onSubmit = async (data: ExpenseFormData) => {
    const expenseData = {
      expenseId: expense?.expenseId,
      name: data.vendorName,
      category: data.category,
      amount: data.amount,
      currency: data.currency,
      date: data.date.toISOString(),
      description: data.description,
      invoiceNumber: data.invoiceNumber,
      paymentMethod: data.paymentMethod,
      status: data.status,
      notes: data.notes,
    };

    await updateExpenseMutation.mutateAsync(expenseData);
  };

  const formatCurrency = (amount: number | undefined, currency: string) => {
    const validAmount = typeof amount === 'number' && !isNaN(amount) ? amount : 0;
    const symbols: Record<string, string> = {
      'USD': '$',
      'EUR': '€',
      'CZK': 'Kč',
      'VND': '₫',
      'CNY': '¥'
    };
    const symbol = symbols[currency] || currency;
    return currency === 'CZK' 
      ? `${validAmount.toFixed(2)} ${symbol}`
      : `${symbol}${validAmount.toFixed(2)}`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">{t('paid')}</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">{t('pending')}</Badge>;
      case 'overdue':
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">{t('overdue')}</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case 'cash':
        return <Wallet className="h-4 w-4" />;
      case 'credit_card':
        return <CreditCard className="h-4 w-4" />;
      default:
        return <DollarSign className="h-4 w-4" />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 bg-white dark:bg-slate-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-400">{t('loadingExpenseDetails')}...</p>
        </div>
      </div>
    );
  }

  if (!expense) {
    return (
      <div className="text-center py-12 bg-white dark:bg-slate-900">
        <p className="text-slate-600 dark:text-slate-400">{t('expenseNotFound')}</p>
        <Button onClick={() => window.history.back()} className="mt-4">
          {t('backToExpenses')}
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-12 overflow-x-hidden">
      <form onSubmit={form.handleSubmit(onSubmit)}>
        {/* Action Bar */}
        <div className="sticky top-0 z-20 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="max-w-7xl mx-auto px-3 sm:px-6 py-3 sm:py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 sm:gap-4">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => window.history.back()}
                  data-testid="button-back"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">{t('editExpense')}</h1>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">{t('updateExpenseDetails')}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
            {/* Left: Main Form */}
            <div className="lg:col-span-2 space-y-6">
              {/* Expense Header */}
              <div className="bg-white dark:bg-slate-800 rounded-lg border-2 border-slate-200 dark:border-slate-700 shadow-sm">
                <div className="p-8 border-b-2 border-slate-200 dark:border-slate-700">
                  <div className="flex items-start justify-between">
                    <div>
                      <h2 className="text-3xl font-bold text-slate-900 dark:text-white uppercase tracking-tight">
                        {t('expenseBill').toUpperCase()}
                      </h2>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{t('businessExpenseRecord')}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-500 dark:text-slate-400 uppercase">{t('billId')}</p>
                      <p className="font-mono font-bold text-lg text-primary mt-1">{expense.expenseId}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                        {formatCzechDate(new Date())}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Vendor Information */}
                <div className="p-8">
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-500 uppercase tracking-wide flex items-center gap-2 mb-4">
                        <Building2 className="h-3 w-3" />
                        {t('billFrom')}
                      </h3>
                      <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
                        <div>
                          <Label htmlFor="vendorName" className="text-sm font-medium mb-2">
                            {t('vendorName')} *
                          </Label>
                          <Input
                            id="vendorName"
                            placeholder={t('officeDepot') + ', ' + t('amazon')}
                            {...form.register("vendorName")}
                            data-testid="input-vendor-name"
                            className={cn(
                              "text-base",
                              form.formState.errors.vendorName && "border-red-500"
                            )}
                          />
                          {form.formState.errors.vendorName && (
                            <p className="text-xs text-red-500 mt-1">
                              {form.formState.errors.vendorName.message}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Expense Information */}
                    <div>
                      <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-500 uppercase tracking-wide flex items-center gap-2 mb-4">
                        <Receipt className="h-3 w-3" />
                        {t('expenseInformation')}
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <Label htmlFor="date" className="text-sm font-medium mb-2">
                            {t('expenseDate')} *
                          </Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                type="button"
                                variant="outline"
                                className={cn(
                                  "w-full justify-start text-left font-normal",
                                  !form.watch("date") && "text-muted-foreground"
                                )}
                                data-testid="button-date"
                              >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {form.watch("date") ? formatCzechDate(form.watch("date")) : t('selectDate')}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                              <Calendar
                                mode="single"
                                selected={form.watch("date")}
                                onSelect={(date) => date && form.setValue("date", date)}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                        </div>

                        <div>
                          <Label htmlFor="category" className="text-sm font-medium mb-2">
                            {t('category')} *
                          </Label>
                          <Select
                            value={form.watch("category")}
                            onValueChange={(value) => form.setValue("category", value)}
                          >
                            <SelectTrigger data-testid="select-category">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {categories.map((cat) => (
                                <SelectItem key={cat} value={cat}>
                                  {cat}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label htmlFor="status" className="text-sm font-medium mb-2">
                            {t('status')} *
                          </Label>
                          <Select
                            value={form.watch("status")}
                            onValueChange={(value: any) => form.setValue("status", value)}
                          >
                            <SelectTrigger data-testid="select-status">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="paid">{t('paid')}</SelectItem>
                              <SelectItem value="pending">{t('pending')}</SelectItem>
                              <SelectItem value="overdue">{t('overdue')}</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>

                    {/* Expense Details */}
                    <div>
                      <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-500 uppercase tracking-wide flex items-center gap-2 mb-4">
                        <DollarSign className="h-3 w-3" />
                        {t('expenseDetailsSection')}
                      </h3>
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="md:col-span-2">
                            <Label htmlFor="amount" className="text-sm font-medium mb-2">
                              {t('amount')} *
                            </Label>
                            <Input
                              id="amount"
                              type="number"
                              step="0.01"
                              placeholder="0.00"
                              {...form.register("amount")}
                              data-testid="input-amount"
                              className={cn(
                                "text-base font-medium",
                                form.formState.errors.amount && "border-red-500"
                              )}
                            />
                            {form.formState.errors.amount && (
                              <p className="text-xs text-red-500 mt-1">
                                {form.formState.errors.amount.message}
                              </p>
                            )}
                          </div>

                          <div>
                            <Label htmlFor="currency" className="text-sm font-medium mb-2">
                              {t('currency')} *
                            </Label>
                            <Select
                              value={form.watch("currency")}
                              onValueChange={(value: any) => form.setValue("currency", value)}
                            >
                              <SelectTrigger data-testid="select-currency">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="CZK">CZK (Kč)</SelectItem>
                                <SelectItem value="EUR">EUR (€)</SelectItem>
                                <SelectItem value="USD">USD ($)</SelectItem>
                                <SelectItem value="VND">VND (₫)</SelectItem>
                                <SelectItem value="CNY">CNY (¥)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div>
                          <Label htmlFor="paymentMethod" className="text-sm font-medium mb-2">
                            {t('paymentMethod')} *
                          </Label>
                          <Select
                            value={form.watch("paymentMethod")}
                            onValueChange={(value: any) => form.setValue("paymentMethod", value)}
                          >
                            <SelectTrigger data-testid="select-payment-method">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="cash">{t('cash')}</SelectItem>
                              <SelectItem value="bank_transfer">{t('bankTransfer')}</SelectItem>
                              <SelectItem value="credit_card">{t('creditCard')}</SelectItem>
                              <SelectItem value="paypal">{t('paypal')}</SelectItem>
                              <SelectItem value="other">{t('other')}</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label htmlFor="description" className="text-sm font-medium mb-2">
                            {t('description')}
                          </Label>
                          <Textarea
                            id="description"
                            placeholder={t('whatWasThisExpenseFor')}
                            rows={2}
                            {...form.register("description")}
                            data-testid="input-description"
                            className="text-base"
                          />
                        </div>

                        <div>
                          <Label htmlFor="notes" className="text-sm font-medium mb-2">
                            {t('additionalNotesOrComments')}
                          </Label>
                          <Textarea
                            id="notes"
                            placeholder={t('additionalNotesOrComments')}
                            rows={2}
                            {...form.register("notes")}
                            data-testid="input-notes"
                            className="text-base"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Recurring Expense Options */}
                    <div className="border-t border-slate-200 dark:border-slate-700 pt-6">
                      <button
                        type="button"
                        onClick={() => {
                          setShowRecurring(!showRecurring);
                          if (!showRecurring) {
                            form.setValue('isRecurring', true);
                          } else {
                            form.setValue('isRecurring', false);
                          }
                        }}
                        className="w-full flex items-center justify-between text-left hover:bg-slate-50 dark:hover:bg-slate-800 p-3 rounded-lg transition-colors"
                        data-testid="button-toggle-recurring"
                      >
                        <div className="flex items-center gap-2">
                          <Repeat className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                            {t('recurringExpense')}
                          </h3>
                          {form.watch('isRecurring') && (
                            <Badge variant="secondary" className="ml-2 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">
                              {t('active')}
                            </Badge>
                          )}
                        </div>
                        {showRecurring ? (
                          <ChevronUp className="h-4 w-4 text-slate-500" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-slate-500" />
                        )}
                      </button>

                      {showRecurring && (
                        <div className="mt-4 space-y-4 bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg border-2 border-blue-200 dark:border-blue-800">
                          {/* Recurring Type */}
                          <div>
                            <Label htmlFor="recurringType" className="text-sm font-medium mb-2">
                              {t('repeatEvery')} *
                            </Label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <Input
                                id="recurringInterval"
                                type="number"
                                min="1"
                                placeholder="1"
                                {...form.register("recurringInterval")}
                                data-testid="input-recurring-interval"
                                className="text-base"
                              />
                              <Select
                                value={form.watch("recurringType")}
                                onValueChange={(value: any) => form.setValue("recurringType", value)}
                              >
                                <SelectTrigger data-testid="select-recurring-type">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="weekly">{t('weeks')}</SelectItem>
                                  <SelectItem value="monthly">{t('months')}</SelectItem>
                                  <SelectItem value="yearly">{t('years')}</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          {/* Day of Month for Monthly */}
                          {form.watch("recurringType") === 'monthly' && (
                            <div>
                              <Label htmlFor="recurringDayOfMonth" className="text-sm font-medium mb-2">
                                {t('onDayOfMonth')}
                              </Label>
                              <Select
                                value={form.watch("recurringDayOfMonth")?.toString() || "1"}
                                onValueChange={(value) => form.setValue("recurringDayOfMonth", parseInt(value))}
                              >
                                <SelectTrigger data-testid="select-recurring-day-of-month">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                                    <SelectItem key={day} value={day.toString()}>
                                      {day}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          )}

                          {/* Day of Week for Weekly */}
                          {form.watch("recurringType") === 'weekly' && (
                            <div>
                              <Label htmlFor="recurringDayOfWeek" className="text-sm font-medium mb-2">
                                {t('onDay')}
                              </Label>
                              <Select
                                value={form.watch("recurringDayOfWeek")?.toString() || "1"}
                                onValueChange={(value) => form.setValue("recurringDayOfWeek", parseInt(value))}
                              >
                                <SelectTrigger data-testid="select-recurring-day-of-week">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="0">{t('sunday')}</SelectItem>
                                  <SelectItem value="1">{t('monday')}</SelectItem>
                                  <SelectItem value="2">{t('tuesday')}</SelectItem>
                                  <SelectItem value="3">{t('wednesday')}</SelectItem>
                                  <SelectItem value="4">{t('thursday')}</SelectItem>
                                  <SelectItem value="5">{t('friday')}</SelectItem>
                                  <SelectItem value="6">{t('saturday')}</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Summary Sidebar */}
            <div className="lg:col-span-1">
              <Card className="sticky top-24 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border-b border-slate-200 dark:border-slate-700">
                  <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
                    <Receipt className="h-5 w-5" />
                    {t('expenseSummary')}
                  </CardTitle>
                  <CardDescription className="text-slate-600 dark:text-slate-400">{t('reviewChangesBeforeSaving')}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 pt-6">
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600 dark:text-slate-400">{t('expenseId')}:</span>
                      <span className="font-mono font-medium text-slate-900 dark:text-white">{expense.expenseId}</span>
                    </div>
                    
                    {form.watch("vendorName") && (
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600 dark:text-slate-400">{t('vendorName')}:</span>
                        <span className="font-medium text-slate-900 dark:text-white">{form.watch("vendorName")}</span>
                      </div>
                    )}
                    
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600 dark:text-slate-400">{t('category')}:</span>
                      <span className="font-medium text-slate-900 dark:text-white">{form.watch("category")}</span>
                    </div>
                    
                    {form.watch('isRecurring') && (
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600 dark:text-slate-400">{t('recurring')}:</span>
                        <Badge variant="secondary" className="bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">
                          {form.watch("recurringInterval")} {form.watch("recurringType")}
                        </Badge>
                      </div>
                    )}
                    
                    {form.watch("amount") && (
                      <div className="pt-3 border-t border-slate-200 dark:border-slate-700">
                        <div className="flex justify-between">
                          <span className="text-slate-600 dark:text-slate-400">{t('totalAmount')}:</span>
                          <span className="text-xl font-bold text-slate-900 dark:text-white">
                            {formatCurrency(form.watch("amount"), form.watch("currency"))}
                          </span>
                        </div>
                      </div>
                    )}
                    
                    <div className="flex justify-between text-sm items-center">
                      <span className="text-slate-600 dark:text-slate-400">{t('payment')}:</span>
                      <span className="font-medium capitalize flex items-center gap-1 text-slate-900 dark:text-white">
                        {getPaymentMethodIcon(form.watch("paymentMethod"))}
                        {form.watch("paymentMethod").replace('_', ' ')}
                      </span>
                    </div>
                    
                    <div className="flex justify-between text-sm items-center">
                      <span className="text-slate-600 dark:text-slate-400">{t('status')}:</span>
                      {getStatusBadge(form.watch("status"))}
                    </div>
                  </div>

                  <div className="pt-4 space-y-3 border-t border-slate-200 dark:border-slate-700">
                    <Button
                      type="submit"
                      className="w-full"
                      size="lg"
                      disabled={updateExpenseMutation.isPending}
                      data-testid="button-update-expense"
                    >
                      {updateExpenseMutation.isPending ? (
                        <>{t('updating')}...</>
                      ) : (
                        <>
                          <Save className="mr-2 h-4 w-4" />
                          {t('updateExpense')}
                        </>
                      )}
                    </Button>
                    
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      onClick={() => navigate('/expenses')}
                      data-testid="button-cancel"
                    >
                      {t('common:cancel')}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
