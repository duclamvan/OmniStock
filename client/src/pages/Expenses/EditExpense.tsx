import { useState, useEffect } from "react";
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
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from 'react-i18next';
import { 
  ArrowLeft, 
  Save, 
  CalendarIcon, 
  Receipt,
  DollarSign,
  CreditCard,
  Building,
  FileText,
  Edit
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

const getExpenseSchema = (t: any) => z.object({
  name: z.string().min(1, t('nameIsRequired')),
  category: z.string().min(1, t('categoryIsRequired')),
  amount: z.string().min(1, t('amountRequired')),
  currency: z.enum(['USD', 'EUR', 'CZK', 'VND', 'CNY']),
  date: z.date({
    required_error: t('dateIsRequired'),
  }),
  description: z.string().optional(),
  recurring: z.enum(['none', 'monthly', 'quarterly', 'yearly']).optional(),
  paymentMethod: z.enum(['cash', 'bank_transfer', 'credit_card', 'paypal', 'other']),
  status: z.enum(['pending', 'paid', 'overdue']),
});

type ExpenseFormData = z.infer<ReturnType<typeof getExpenseSchema>>;

const categories = [
  'Office Supplies',
  'Travel',
  'Marketing',
  'Software',
  'Equipment',
  'Utilities',
  'Rent',
  'Salaries',
  'Insurance',
  'Legal',
  'Consulting',
  'Shipping',
  'Inventory',
  'Other'
];

export default function EditExpense() {
  const [, navigate] = useLocation();
  const { id } = useParams();
  const { toast } = useToast();
  const { t } = useTranslation(['financial', 'common']);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: expense, isLoading } = useQuery<any>({
    queryKey: [`/api/expenses/${id}`],
    enabled: !!id,
  });

  const form = useForm<ExpenseFormData>({
    resolver: zodResolver(getExpenseSchema(t)),
    defaultValues: {
      name: '',
      category: 'Office Supplies',
      amount: '',
      currency: 'CZK',
      date: new Date(),
      paymentMethod: 'bank_transfer',
      status: 'pending',
      description: '',
      recurring: 'none',
    },
  });



  // Populate form with existing expense data
  useEffect(() => {
    if (expense) {
      form.reset({
        name: expense.name || '',
        category: expense.category || 'Office Supplies',
        amount: expense.amount?.toString() || '',
        currency: expense.currency as any || 'CZK',
        date: expense.date ? new Date(expense.date) : new Date(),
        description: expense.description || '',
        recurring: expense.recurring || 'none',
        paymentMethod: expense.paymentMethod || 'bank_transfer',
        status: expense.status || 'pending',
      });
    }
  }, [expense, form]);

  const updateExpenseMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest('PATCH', `/api/expenses/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/expenses'] });
      queryClient.invalidateQueries({ queryKey: [`/api/expenses/${id}`] });
      toast({
        title: t('common:success'),
        description: t('expenseUpdatedSuccessfully'),
      });
      navigate('/expenses');
    },
    onError: (error: any) => {
      toast({
        title: t('common:error'),
        description: error.message || t('failedToUpdateExpense'),
        variant: "destructive",
      });
    },
  });

  const onSubmit = async (data: ExpenseFormData) => {
    setIsSubmitting(true);
    
    const expenseData = {
      expenseId: expense?.expenseId,
      name: data.name,
      category: data.category,
      amount: data.amount,
      currency: data.currency,
      date: data.date.toISOString(),
      description: data.description,
      recurring: data.recurring,
      paymentMethod: data.paymentMethod,
      status: data.status,
    };

    await updateExpenseMutation.mutateAsync(expenseData);
    setIsSubmitting(false);
  };

  // Quick amount buttons
  const quickAmounts = [100, 500, 1000, 5000, 10000];

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
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => window.history.back()}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">{t('editExpense')}</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">{t('updateExpenseDetails')}</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-slate-500">{t('expenseId')}</p>
          <p className="font-mono font-semibold">{expense.expenseId}</p>
        </div>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Information */}
            <Card className="bg-white dark:bg-slate-800 border-gray-200 dark:border-gray-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-gray-100">
                  <Building className="h-5 w-5 text-gray-700 dark:text-gray-300" />
                  {t('basicInformation')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="name">{t('common:name')} *</Label>
                  <Input
                    id="name"
                    placeholder={t('namePlaceholder')}
                    {...form.register("name")}
                    className={form.formState.errors.name ? "border-red-500" : ""}
                  />
                  {form.formState.errors.name && (
                    <p className="text-sm text-red-500 mt-1">
                      {form.formState.errors.name.message}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="category">{t('category')} *</Label>
                    <Select
                      value={form.watch("category")}
                      onValueChange={(value) => form.setValue("category", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t('selectCategory')} />
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
                    <Label htmlFor="recurring">{t('recurring')}</Label>
                    <Select
                      value={form.watch("recurring")}
                      onValueChange={(value: any) => form.setValue("recurring", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t('selectFrequency')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">{t('none')}</SelectItem>
                        <SelectItem value="monthly">{t('monthly')}</SelectItem>
                        <SelectItem value="quarterly">{t('quarterly')}</SelectItem>
                        <SelectItem value="yearly">{t('yearly')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="description">{t('common:description')}</Label>
                  <Textarea
                    id="description"
                    placeholder={t('descriptionPlaceholder')}
                    rows={3}
                    {...form.register("description")}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Payment Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  {t('paymentDetails')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="amount">{t('amount')} *</Label>
                  <div className="flex gap-2">
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      {...form.register("amount")}
                      className={cn(
                        "flex-1",
                        form.formState.errors.amount ? "border-red-500" : ""
                      )}
                    />
                    <Select
                      value={form.watch("currency")}
                      onValueChange={(value: any) => form.setValue("currency", value)}
                    >
                      <SelectTrigger className="w-24">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CZK">CZK</SelectItem>
                        <SelectItem value="EUR">EUR</SelectItem>
                        <SelectItem value="USD">USD</SelectItem>
                        <SelectItem value="VND">VND</SelectItem>
                        <SelectItem value="CNY">CNY</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {/* Quick amount buttons */}
                  <div className="flex gap-2 mt-2">
                    {quickAmounts.map((amt) => (
                      <Button
                        key={amt}
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => form.setValue("amount", amt.toString())}
                      >
                        {amt}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="paymentMethod">{t('paymentMethod')}</Label>
                    <Select
                      value={form.watch("paymentMethod")}
                      onValueChange={(value: any) => form.setValue("paymentMethod", value)}
                    >
                      <SelectTrigger>
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
                    <Label htmlFor="status">{t('common:status')}</Label>
                    <Select
                      value={form.watch("status")}
                      onValueChange={(value: any) => form.setValue("status", value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">{t('pending')}</SelectItem>
                        <SelectItem value="paid">{t('paid')}</SelectItem>
                        <SelectItem value="overdue">{t('overdue')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label>{t('expenseDate')} *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !form.watch("date") && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {form.watch("date") ? format(form.watch("date"), "PPP") : t('common:selectDate')}
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
              </CardContent>
            </Card>


          </div>

          {/* Summary Sidebar */}
          <div className="lg:col-span-1">
            <Card className="sticky top-4">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
                <CardTitle className="flex items-center gap-2">
                  <Receipt className="h-5 w-5" />
                  {t('expenseSummary')}
                </CardTitle>
                <CardDescription>{t('reviewChangesBeforeSaving')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-6">
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">{t('expenseId')}:</span>
                    <span className="font-mono font-medium">{expense.expenseId}</span>
                  </div>
                  
                  {form.watch("name") && (
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">{t('common:name')}:</span>
                      <span className="font-medium">{form.watch("name")}</span>
                    </div>
                  )}
                  
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">{t('category')}:</span>
                    <span className="font-medium">{form.watch("category")}</span>
                  </div>
                  
                  {form.watch("recurring") !== 'none' && (
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">{t('recurring')}:</span>
                      <span className="font-medium capitalize">{form.watch("recurring")}</span>
                    </div>
                  )}
                  
                  {form.watch("amount") && (
                    <div className="pt-3 border-t">
                      <div className="flex justify-between">
                        <span className="text-slate-600">{t('totalAmount')}:</span>
                        <span className="text-xl font-bold">
                          {form.watch("currency") === 'USD' && '$'}
                          {form.watch("currency") === 'EUR' && '€'}
                          {form.watch("currency") === 'CZK' && 'Kč '}
                          {form.watch("currency") === 'VND' && '₫'}
                          {form.watch("currency") === 'CNY' && '¥'}
                          {parseFloat(form.watch("amount") || '0').toFixed(2)}
                        </span>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">{t('payment')}:</span>
                    <span className="font-medium capitalize">
                      {form.watch("paymentMethod").replace('_', ' ')}
                    </span>
                  </div>
                  
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">{t('common:status')}:</span>
                    <span className={cn(
                      "font-medium capitalize",
                      form.watch("status") === 'paid' && "text-green-600",
                      form.watch("status") === 'pending' && "text-yellow-600",
                      form.watch("status") === 'overdue' && "text-red-600"
                    )}>
                      {form.watch("status")}
                    </span>
                  </div>
                  

                </div>

                <div className="pt-4 space-y-3">
                  <Button
                    type="submit"
                    className="w-full"
                    size="lg"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
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
                  >
                    {t('common:cancel')}
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