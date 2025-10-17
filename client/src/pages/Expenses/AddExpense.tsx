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
  Wallet
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
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Expense Summary Sidebar */}
            <div className="lg:col-span-1">
              <div className="sticky top-20 z-10">
                <Card className="shadow-xl border-2">
                  <CardHeader className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 border-b-2">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <FileText className="h-5 w-5" />
                      Expense Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <div className="space-y-6">
                      {/* Header Info */}
                      <div className="space-y-3">
                        <div className="flex justify-between items-center pb-3 border-b border-slate-200 dark:border-slate-700">
                          <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Bill ID</span>
                          <span className="font-mono font-semibold text-primary">{expenseId}</span>
                        </div>

                        <div className="flex justify-between items-center pb-3 border-b border-slate-200 dark:border-slate-700">
                          <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Date</span>
                          <span className="font-medium text-slate-900 dark:text-white">
                            {formatCzechDate(form.watch("date") || new Date())}
                          </span>
                        </div>

                        {form.watch("vendorName") && (
                          <div className="flex justify-between items-center pb-3 border-b border-slate-200 dark:border-slate-700">
                            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Vendor</span>
                            <span className="font-medium text-slate-900 dark:text-white text-right">
                              {form.watch("vendorName")}
                            </span>
                          </div>
                        )}

                        <div className="flex justify-between items-center pb-3 border-b border-slate-200 dark:border-slate-700">
                          <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Category</span>
                          <span className="font-medium text-slate-900 dark:text-white">
                            {form.watch("category")}
                          </span>
                        </div>

                        {form.watch("invoiceNumber") && (
                          <div className="flex justify-between items-center pb-3 border-b border-slate-200 dark:border-slate-700">
                            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Invoice #</span>
                            <span className="font-mono text-sm font-medium text-slate-900 dark:text-white">
                              {form.watch("invoiceNumber")}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Amount */}
                      <div className="pt-4 border-t-2 border-slate-300 dark:border-slate-600">
                        <div className="flex justify-between items-center" data-testid="summary-total">
                          <span className="font-bold text-base text-slate-900 dark:text-white">Total Amount:</span>
                          <div className="text-right">
                            <div className="text-2xl font-bold text-primary">
                              {formatCurrency(form.watch('amount'), form.watch('currency'))}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Payment & Status Info */}
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-slate-600 dark:text-slate-400 flex items-center gap-2">
                            {getPaymentMethodIcon(form.watch("paymentMethod"))}
                            Payment Method:
                          </span>
                          <span className="font-medium text-slate-900 dark:text-white capitalize">
                            {form.watch("paymentMethod").replace('_', ' ')}
                          </span>
                        </div>

                        <div className="flex justify-between items-center">
                          <span className="text-sm text-slate-600 dark:text-slate-400">Status:</span>
                          <div>
                            {getStatusBadge(form.watch("status"))}
                          </div>
                        </div>
                      </div>

                      <Separator />

                      {/* Action Buttons */}
                      <div className="pt-2 space-y-3">
                        <Button
                          type="submit"
                          className="w-full"
                          size="lg"
                          disabled={createExpenseMutation.isPending}
                          data-testid="button-save"
                        >
                          {createExpenseMutation.isPending ? (
                            <>
                              <span className="animate-spin mr-2">⏳</span>
                              Saving...
                            </>
                          ) : (
                            <>
                              <Save className="mr-2 h-4 w-4" />
                              Create Expense
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
