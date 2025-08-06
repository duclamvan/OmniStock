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

const expenseSchema = z.object({
  vendorName: z.string().min(1, "Vendor name is required"),
  category: z.string().min(1, "Category is required"),
  amount: z.string().min(1, "Amount is required"),
  currency: z.enum(['USD', 'EUR', 'CZK', 'VND', 'CNY']),
  date: z.date({
    required_error: "Date is required",
  }),
  dueDate: z.date().optional(),
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

export default function EditExpense() {
  const [, navigate] = useLocation();
  const { id } = useParams();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: expense, isLoading } = useQuery<any>({
    queryKey: [`/api/expenses/${id}`],
    enabled: !!id,
  });

  const form = useForm<ExpenseFormData>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      vendorName: '',
      category: 'Office Supplies',
      amount: '',
      currency: 'CZK',
      date: new Date(),
      paymentMethod: 'bank_transfer',
      status: 'pending',
      description: '',
      notes: '',
    },
  });

  // Determine currency and amount from expense data
  const getCurrencyAndAmount = (expense: any) => {
    if (expense.amountUsd) return { currency: 'USD', amount: expense.amountUsd };
    if (expense.amountEur) return { currency: 'EUR', amount: expense.amountEur };
    if (expense.amountCzk) return { currency: 'CZK', amount: expense.amountCzk };
    if (expense.amountVnd) return { currency: 'VND', amount: expense.amountVnd };
    if (expense.amountCny) return { currency: 'CNY', amount: expense.amountCny };
    return { currency: 'CZK', amount: '0' };
  };

  // Populate form with existing expense data
  useEffect(() => {
    if (expense) {
      const { currency, amount } = getCurrencyAndAmount(expense);
      form.reset({
        vendorName: expense.vendorName || '',
        category: expense.category || 'Office Supplies',
        amount: amount.toString(),
        currency: currency as any,
        date: expense.date ? new Date(expense.date) : new Date(),
        dueDate: expense.dueDate ? new Date(expense.dueDate) : undefined,
        description: expense.description || '',
        invoiceNumber: expense.invoiceNumber || '',
        paymentMethod: expense.paymentMethod || 'bank_transfer',
        status: expense.status || 'pending',
        notes: expense.notes || '',
      });
    }
  }, [expense, form]);

  const updateExpenseMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest(`/api/expenses/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/expenses'] });
      queryClient.invalidateQueries({ queryKey: [`/api/expenses/${id}`] });
      toast({
        title: "Success",
        description: "Expense updated successfully",
      });
      navigate('/expenses');
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update expense",
        variant: "destructive",
      });
    },
  });

  const onSubmit = async (data: ExpenseFormData) => {
    setIsSubmitting(true);
    
    const amountField = `amount${data.currency.charAt(0).toUpperCase() + data.currency.slice(1).toLowerCase()}`;
    
    // Clear all amount fields and set only the selected currency
    const expenseData = {
      expenseId: expense?.expenseId,
      vendorName: data.vendorName,
      category: data.category,
      amountUsd: null,
      amountEur: null,
      amountCzk: null,
      amountVnd: null,
      amountCny: null,
      [amountField]: parseFloat(data.amount),
      date: data.date.toISOString(),
      dueDate: data.dueDate?.toISOString(),
      description: data.description,
      invoiceNumber: data.invoiceNumber,
      paymentMethod: data.paymentMethod,
      status: data.status,
      notes: data.notes,
    };

    await updateExpenseMutation.mutateAsync(expenseData);
    setIsSubmitting(false);
  };

  // Quick amount buttons
  const quickAmounts = [100, 500, 1000, 5000, 10000];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-slate-600">Loading expense details...</p>
        </div>
      </div>
    );
  }

  if (!expense) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-600">Expense not found</p>
        <Button onClick={() => navigate('/expenses')} className="mt-4">
          Back to Expenses
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
          onClick={() => navigate('/expenses')}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight">Edit Expense</h1>
          <p className="text-slate-600 mt-1">Update expense details</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-slate-500">Expense ID</p>
          <p className="font-mono font-semibold">{expense.expenseId}</p>
        </div>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building className="h-5 w-5" />
                  Basic Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="vendorName">Vendor Name *</Label>
                  <Input
                    id="vendorName"
                    placeholder="e.g., Office Depot, Amazon"
                    {...form.register("vendorName")}
                    className={form.formState.errors.vendorName ? "border-red-500" : ""}
                  />
                  {form.formState.errors.vendorName && (
                    <p className="text-sm text-red-500 mt-1">
                      {form.formState.errors.vendorName.message}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="category">Category *</Label>
                    <Select
                      value={form.watch("category")}
                      onValueChange={(value) => form.setValue("category", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
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
                    <Label htmlFor="invoiceNumber">Invoice Number</Label>
                    <Input
                      id="invoiceNumber"
                      placeholder="INV-2025-001"
                      {...form.register("invoiceNumber")}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="What was this expense for?"
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
                  Payment Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="amount">Amount *</Label>
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

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="paymentMethod">Payment Method</Label>
                    <Select
                      value={form.watch("paymentMethod")}
                      onValueChange={(value: any) => form.setValue("paymentMethod", value)}
                    >
                      <SelectTrigger>
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
                    <Label htmlFor="status">Status</Label>
                    <Select
                      value={form.watch("status")}
                      onValueChange={(value: any) => form.setValue("status", value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="paid">Paid</SelectItem>
                        <SelectItem value="overdue">Overdue</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Expense Date *</Label>
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
                          {form.watch("date") ? format(form.watch("date"), "PPP") : "Select date"}
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
                    <Label>Due Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !form.watch("dueDate") && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {form.watch("dueDate") ? format(form.watch("dueDate"), "PPP") : "Select date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={form.watch("dueDate")}
                          onSelect={(date) => date && form.setValue("dueDate", date)}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Additional Notes */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Additional Notes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder="Any additional notes or comments..."
                  rows={4}
                  {...form.register("notes")}
                />
              </CardContent>
            </Card>
          </div>

          {/* Summary Sidebar */}
          <div className="lg:col-span-1">
            <Card className="sticky top-4">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
                <CardTitle className="flex items-center gap-2">
                  <Receipt className="h-5 w-5" />
                  Expense Summary
                </CardTitle>
                <CardDescription>Review changes before saving</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-6">
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Expense ID:</span>
                    <span className="font-mono font-medium">{expense.expenseId}</span>
                  </div>
                  
                  {form.watch("vendorName") && (
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">Vendor:</span>
                      <span className="font-medium">{form.watch("vendorName")}</span>
                    </div>
                  )}
                  
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Category:</span>
                    <span className="font-medium">{form.watch("category")}</span>
                  </div>
                  
                  {form.watch("amount") && (
                    <div className="pt-3 border-t">
                      <div className="flex justify-between">
                        <span className="text-slate-600">Total Amount:</span>
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
                    <span className="text-slate-600">Payment:</span>
                    <span className="font-medium capitalize">
                      {form.watch("paymentMethod").replace('_', ' ')}
                    </span>
                  </div>
                  
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Status:</span>
                    <span className={cn(
                      "font-medium capitalize",
                      form.watch("status") === 'paid' && "text-green-600",
                      form.watch("status") === 'pending' && "text-yellow-600",
                      form.watch("status") === 'overdue' && "text-red-600"
                    )}>
                      {form.watch("status")}
                    </span>
                  </div>
                  
                  <div className="pt-3 border-t">
                    <p className="text-xs text-slate-500 mb-2">Last Modified</p>
                    <p className="text-sm font-medium">
                      {expense.updatedAt ? format(new Date(expense.updatedAt), 'PPP') : 'Never'}
                    </p>
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
                      <>Updating...</>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Update Expense
                      </>
                    )}
                  </Button>
                  
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => navigate('/expenses')}
                  >
                    Cancel
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