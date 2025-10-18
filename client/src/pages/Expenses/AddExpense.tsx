import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

const expenseSchema = z.object({
  vendorName: z.string().min(1, "Vendor name is required"),
  category: z.string().min(1, "Category is required"),
  amount: z.coerce.number().positive("Amount must be greater than 0"),
  currency: z.enum(['USD', 'EUR', 'CZK', 'VND', 'CNY']),
  date: z.date({
    required_error: "Date is required",
  }),
  description: z.string().optional(),
  invoiceNumber: z.string().optional(),
  paymentMethod: z.enum(['cash', 'bank_transfer', 'credit_card', 'paypal', 'other']),
  status: z.enum(['pending', 'paid', 'overdue']),
  notes: z.string().optional(),
  // Recurring fields
  isRecurring: z.boolean().default(false),
  recurringType: z.enum(['weekly', 'monthly', 'yearly']).optional(),
  recurringInterval: z.coerce.number().int().min(1).optional(),
  recurringDayOfWeek: z.coerce.number().int().min(0).max(6).optional(), // 0=Sunday, 6=Saturday
  recurringDayOfMonth: z.coerce.number().int().min(1).max(31).optional(),
  recurringMonth: z.coerce.number().int().min(1).max(12).optional(),
  recurringDay: z.coerce.number().int().min(1).max(31).optional(),
  recurringStartDate: z.date().optional(),
  recurringEndDate: z.date().optional(),
});

type ExpenseFormData = z.infer<typeof expenseSchema>;

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

export default function AddExpense() {
  const [, navigate] = useLocation();
  const { toast } = useToast();

  // Generate expense ID
  const generateExpenseId = () => {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `EXP${year}${month}${random}`;
  };

  const [expenseId] = useState(generateExpenseId());

  const [showRecurring, setShowRecurring] = useState(false);

  const form = useForm<ExpenseFormData>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      vendorName: '',
      category: 'Office Supplies',
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

  const createExpenseMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest('POST', '/api/expenses', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/expenses'] });
      toast({
        title: "Success",
        description: "Expense created successfully",
      });
      navigate('/expenses');
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create expense",
        variant: "destructive",
      });
    },
  });

  const onSubmit = async (data: ExpenseFormData) => {
    const expenseData = {
      expenseId,
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

    await createExpenseMutation.mutateAsync(expenseData);
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
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Paid</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Pending</Badge>;
      case 'overdue':
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Overdue</Badge>;
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

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-12">
      <form onSubmit={form.handleSubmit(onSubmit)}>
        {/* Action Bar */}
        <div className="sticky top-0 z-20 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => navigate('/expenses')}
                  data-testid="button-back"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <div>
                  <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Add Expense</h1>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Create a new business expense record</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left: Main Form */}
            <div className="lg:col-span-2 space-y-6">
              {/* Expense Header */}
              <div className="bg-white dark:bg-slate-800 rounded-lg border-2 border-slate-200 dark:border-slate-700 shadow-sm">
                <div className="p-8 border-b-2 border-slate-200 dark:border-slate-700">
                  <div className="flex items-start justify-between">
                    <div>
                      <h2 className="text-3xl font-bold text-slate-900 dark:text-white uppercase tracking-tight">
                        EXPENSE BILL
                      </h2>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Business Expense Record</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-500 dark:text-slate-400 uppercase">Bill ID</p>
                      <p className="font-mono font-bold text-lg text-primary mt-1">{expenseId}</p>
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
                        Bill From (Vendor)
                      </h3>
                      <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="vendorName" className="text-sm font-medium mb-2">
                              Vendor Name *
                            </Label>
                            <Input
                              id="vendorName"
                              placeholder="e.g., Office Depot, Amazon"
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

                          <div>
                            <Label htmlFor="invoiceNumber" className="text-sm font-medium mb-2">
                              Invoice Number
                            </Label>
                            <Input
                              id="invoiceNumber"
                              placeholder="INV-2025-001"
                              {...form.register("invoiceNumber")}
                              data-testid="input-invoice-number"
                              className="text-base"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Expense Information */}
                    <div>
                      <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-500 uppercase tracking-wide flex items-center gap-2 mb-4">
                        <Receipt className="h-3 w-3" />
                        Expense Information
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <Label htmlFor="date" className="text-sm font-medium mb-2">
                            Expense Date *
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
                                {form.watch("date") ? formatCzechDate(form.watch("date")) : "Select date"}
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
                            Category *
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
                            Status *
                          </Label>
                          <Select
                            value={form.watch("status")}
                            onValueChange={(value: any) => form.setValue("status", value)}
                          >
                            <SelectTrigger data-testid="select-status">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="paid">Paid</SelectItem>
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="overdue">Overdue</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>

                    {/* Expense Details */}
                    <div>
                      <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-500 uppercase tracking-wide flex items-center gap-2 mb-4">
                        <DollarSign className="h-3 w-3" />
                        Expense Details
                      </h3>
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="md:col-span-2">
                            <Label htmlFor="amount" className="text-sm font-medium mb-2">
                              Amount *
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
                              Currency *
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
                            Payment Method *
                          </Label>
                          <Select
                            value={form.watch("paymentMethod")}
                            onValueChange={(value: any) => form.setValue("paymentMethod", value)}
                          >
                            <SelectTrigger data-testid="select-payment-method">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="cash">Cash</SelectItem>
                              <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                              <SelectItem value="credit_card">Credit Card</SelectItem>
                              <SelectItem value="paypal">PayPal</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label htmlFor="description" className="text-sm font-medium mb-2">
                            Description
                          </Label>
                          <Textarea
                            id="description"
                            placeholder="What was this expense for?"
                            rows={2}
                            {...form.register("description")}
                            data-testid="input-description"
                            className="text-base"
                          />
                        </div>

                        <div>
                          <Label htmlFor="notes" className="text-sm font-medium mb-2">
                            Additional Notes
                          </Label>
                          <Textarea
                            id="notes"
                            placeholder="Any additional notes or comments..."
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
                            Recurring Expense
                          </h3>
                          {form.watch('isRecurring') && (
                            <Badge variant="secondary" className="ml-2 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">
                              Active
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
                              Repeat Every *
                            </Label>
                            <div className="grid grid-cols-2 gap-3">
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
                                  <SelectItem value="weekly">Week(s)</SelectItem>
                                  <SelectItem value="monthly">Month(s)</SelectItem>
                                  <SelectItem value="yearly">Year(s)</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          {/* Day of Week - For Weekly */}
                          {form.watch("recurringType") === 'weekly' && (
                            <div>
                              <Label htmlFor="recurringDayOfWeek" className="text-sm font-medium mb-2">
                                On Day
                              </Label>
                              <Select
                                value={form.watch("recurringDayOfWeek")?.toString() || '1'}
                                onValueChange={(value: any) => form.setValue("recurringDayOfWeek", parseInt(value))}
                              >
                                <SelectTrigger data-testid="select-day-of-week">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="0">Sunday</SelectItem>
                                  <SelectItem value="1">Monday</SelectItem>
                                  <SelectItem value="2">Tuesday</SelectItem>
                                  <SelectItem value="3">Wednesday</SelectItem>
                                  <SelectItem value="4">Thursday</SelectItem>
                                  <SelectItem value="5">Friday</SelectItem>
                                  <SelectItem value="6">Saturday</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          )}

                          {/* Day of Month - For Monthly */}
                          {form.watch("recurringType") === 'monthly' && (
                            <div>
                              <Label htmlFor="recurringDayOfMonth" className="text-sm font-medium mb-2">
                                On Day of Month
                              </Label>
                              <Input
                                id="recurringDayOfMonth"
                                type="number"
                                min="1"
                                max="31"
                                placeholder="1"
                                {...form.register("recurringDayOfMonth")}
                                data-testid="input-day-of-month"
                                className="text-base"
                              />
                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                Enter a day between 1-31
                              </p>
                            </div>
                          )}

                          {/* Month and Day - For Yearly */}
                          {form.watch("recurringType") === 'yearly' && (
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <Label htmlFor="recurringMonth" className="text-sm font-medium mb-2">
                                  Month
                                </Label>
                                <Select
                                  value={form.watch("recurringMonth")?.toString() || '1'}
                                  onValueChange={(value: any) => form.setValue("recurringMonth", parseInt(value))}
                                >
                                  <SelectTrigger data-testid="select-month">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="1">January</SelectItem>
                                    <SelectItem value="2">February</SelectItem>
                                    <SelectItem value="3">March</SelectItem>
                                    <SelectItem value="4">April</SelectItem>
                                    <SelectItem value="5">May</SelectItem>
                                    <SelectItem value="6">June</SelectItem>
                                    <SelectItem value="7">July</SelectItem>
                                    <SelectItem value="8">August</SelectItem>
                                    <SelectItem value="9">September</SelectItem>
                                    <SelectItem value="10">October</SelectItem>
                                    <SelectItem value="11">November</SelectItem>
                                    <SelectItem value="12">December</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <Label htmlFor="recurringDay" className="text-sm font-medium mb-2">
                                  Day
                                </Label>
                                <Input
                                  id="recurringDay"
                                  type="number"
                                  min="1"
                                  max="31"
                                  placeholder="1"
                                  {...form.register("recurringDay")}
                                  data-testid="input-recurring-day"
                                  className="text-base"
                                />
                              </div>
                            </div>
                          )}

                          {/* Start Date */}
                          <div>
                            <Label className="text-sm font-medium mb-2">
                              Start Date (Optional)
                            </Label>
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  className={cn(
                                    "w-full justify-start text-left font-normal",
                                    !form.watch("recurringStartDate") && "text-muted-foreground"
                                  )}
                                  data-testid="button-recurring-start-date"
                                >
                                  <CalendarIcon className="mr-2 h-4 w-4" />
                                  {form.watch("recurringStartDate") ? (
                                    formatCzechDate(form.watch("recurringStartDate")!)
                                  ) : (
                                    <span>Pick start date</span>
                                  )}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0">
                                <Calendar
                                  mode="single"
                                  selected={form.watch("recurringStartDate")}
                                  onSelect={(date) => form.setValue("recurringStartDate", date)}
                                />
                              </PopoverContent>
                            </Popover>
                          </div>

                          {/* End Date */}
                          <div>
                            <Label className="text-sm font-medium mb-2">
                              End Date (Optional)
                            </Label>
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  className={cn(
                                    "w-full justify-start text-left font-normal",
                                    !form.watch("recurringEndDate") && "text-muted-foreground"
                                  )}
                                  data-testid="button-recurring-end-date"
                                >
                                  <CalendarIcon className="mr-2 h-4 w-4" />
                                  {form.watch("recurringEndDate") ? (
                                    formatCzechDate(form.watch("recurringEndDate")!)
                                  ) : (
                                    <span>Pick end date (leave empty for no end)</span>
                                  )}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0">
                                <Calendar
                                  mode="single"
                                  selected={form.watch("recurringEndDate")}
                                  onSelect={(date) => form.setValue("recurringEndDate", date)}
                                  disabled={(date) => 
                                    form.watch("recurringStartDate") ? date < form.watch("recurringStartDate")! : false
                                  }
                                />
                              </PopoverContent>
                            </Popover>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                              Leave empty for no end date
                            </p>
                          </div>

                          {/* Summary */}
                          <div className="bg-white dark:bg-slate-900 p-3 rounded-md border border-slate-200 dark:border-slate-700">
                            <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                              Recurring Summary:
                            </p>
                            <p className="text-sm text-slate-900 dark:text-white">
                              {(() => {
                                const interval = form.watch("recurringInterval") || 1;
                                const type = form.watch("recurringType");
                                
                                if (type === 'weekly') {
                                  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                                  const day = days[form.watch("recurringDayOfWeek") || 1];
                                  return `Every ${interval > 1 ? interval + ' weeks' : 'week'} on ${day}`;
                                }
                                
                                if (type === 'monthly') {
                                  const dayOfMonth = form.watch("recurringDayOfMonth") || 1;
                                  return `Every ${interval > 1 ? interval + ' months' : 'month'} on day ${dayOfMonth}`;
                                }
                                
                                if (type === 'yearly') {
                                  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
                                  const month = months[(form.watch("recurringMonth") || 1) - 1];
                                  const day = form.watch("recurringDay") || 1;
                                  return `Every ${interval > 1 ? interval + ' years' : 'year'} on ${month} ${day}`;
                                }
                                
                                return 'Configure recurring options above';
                              })()}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Expense Summary Sidebar - Paper Bill Style */}
            <div className="lg:col-span-1">
              <div className="sticky top-20 z-10">
                <Card className="shadow-2xl border-4 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900">
                  {/* Bill Header - Like a paper invoice */}
                  <div className="bg-slate-900 dark:bg-slate-800 text-white px-6 py-5 border-b-4 border-slate-700">
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-2 mb-1">
                        <FileText className="h-6 w-6" />
                        <h2 className="text-2xl font-bold tracking-wide">EXPENSE BILL</h2>
                      </div>
                      <p className="text-xs text-slate-300 uppercase tracking-widest">Davie Supply</p>
                    </div>
                  </div>

                  <CardContent className="p-6 bg-slate-50 dark:bg-slate-900">
                    {/* Document Info Section */}
                    <div className="bg-white dark:bg-slate-800 rounded-lg p-4 mb-4 border-2 border-slate-200 dark:border-slate-700 shadow-sm">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Bill Number</p>
                          <p className="font-mono text-sm font-bold text-slate-900 dark:text-white">{expenseId}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Date</p>
                          <p className="text-sm font-semibold text-slate-900 dark:text-white">
                            {formatCzechDate(form.watch("date") || new Date())}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Vendor Information */}
                    {form.watch("vendorName") && (
                      <div className="bg-white dark:bg-slate-800 rounded-lg p-4 mb-4 border-2 border-slate-200 dark:border-slate-700 shadow-sm">
                        <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">Bill From</p>
                        <p className="text-base font-bold text-slate-900 dark:text-white">{form.watch("vendorName")}</p>
                        {form.watch("invoiceNumber") && (
                          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                            Invoice # <span className="font-mono font-semibold">{form.watch("invoiceNumber")}</span>
                          </p>
                        )}
                      </div>
                    )}

                    {/* Expense Details */}
                    <div className="bg-white dark:bg-slate-800 rounded-lg p-4 mb-4 border-2 border-slate-200 dark:border-slate-700 shadow-sm">
                      <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">Expense Details</p>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between items-center py-2 border-b border-slate-200 dark:border-slate-700">
                          <span className="text-sm text-slate-600 dark:text-slate-400">Category</span>
                          <span className="font-semibold text-slate-900 dark:text-white">{form.watch("category")}</span>
                        </div>
                        
                        {form.watch("description") && (
                          <div className="py-2 border-b border-slate-200 dark:border-slate-700">
                            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Description</p>
                            <p className="text-sm text-slate-900 dark:text-white">{form.watch("description")}</p>
                          </div>
                        )}

                        <div className="flex justify-between items-center py-2 border-b border-slate-200 dark:border-slate-700">
                          <span className="text-sm text-slate-600 dark:text-slate-400 flex items-center gap-1">
                            {getPaymentMethodIcon(form.watch("paymentMethod"))}
                            Payment
                          </span>
                          <span className="font-medium text-slate-900 dark:text-white capitalize text-sm">
                            {form.watch("paymentMethod").replace('_', ' ')}
                          </span>
                        </div>

                        <div className="flex justify-between items-center py-2">
                          <span className="text-sm text-slate-600 dark:text-slate-400">Status</span>
                          <div>{getStatusBadge(form.watch("status"))}</div>
                        </div>
                      </div>
                    </div>

                    {/* Total Amount - Highlighted Section */}
                    <div className="bg-gradient-to-br from-slate-800 to-slate-900 dark:from-slate-700 dark:to-slate-800 rounded-lg p-5 mb-4 border-3 border-slate-700 shadow-lg">
                      <div className="flex justify-between items-end" data-testid="summary-total">
                        <div>
                          <p className="text-xs text-slate-300 uppercase tracking-widest mb-1">Total Amount</p>
                          <p className="text-sm text-slate-400">Due Now</p>
                        </div>
                        <div className="text-right">
                          <div className="text-3xl font-bold text-white tabular-nums">
                            {formatCurrency(form.watch('amount'), form.watch('currency'))}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Notes Section */}
                    {form.watch("notes") && (
                      <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-4 mb-4 border-2 border-amber-200 dark:border-amber-700">
                        <p className="text-[10px] font-bold text-amber-800 dark:text-amber-400 uppercase tracking-wide mb-2">Notes</p>
                        <p className="text-sm text-amber-900 dark:text-amber-200">{form.watch("notes")}</p>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="space-y-2 pt-2">
                      <Button
                        type="submit"
                        className="w-full bg-slate-900 hover:bg-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600"
                        size="lg"
                        disabled={createExpenseMutation.isPending}
                        data-testid="button-save"
                      >
                        {createExpenseMutation.isPending ? (
                          <>
                            <span className="animate-spin mr-2">⏳</span>
                            Processing...
                          </>
                        ) : (
                          <>
                            <Save className="mr-2 h-5 w-5" />
                            Record Expense
                          </>
                        )}
                      </Button>
                      
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full border-2"
                        onClick={() => navigate('/expenses')}
                        data-testid="button-cancel"
                      >
                        Cancel
                      </Button>
                    </div>

                    {/* Footer */}
                    <div className="mt-6 pt-4 border-t-2 border-dashed border-slate-300 dark:border-slate-700 text-center">
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        This is an expense record for internal accounting purposes
                      </p>
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
