import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { CalendarIcon, ArrowLeft } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const expenseSchema = z.object({
  vendorName: z.string().min(1, "Vendor name is required"),
  category: z.string().min(1, "Category is required"),
  amount: z.string().min(1, "Amount is required"),
  currency: z.enum(['USD', 'EUR', 'CZK', 'VND', 'CNY']),
  date: z.date(),
  dueDate: z.date().optional().nullable(),
  paymentMethod: z.string().optional(),
  status: z.enum(['pending', 'paid', 'overdue']),
  recurring: z.enum(['none', 'monthly', 'quarterly', 'yearly']).optional(),
  description: z.string().optional(),
});

type ExpenseFormData = z.infer<typeof expenseSchema>;

const categories = [
  'Rent',
  'Utilities',
  'Supplies',
  'Equipment',
  'Transportation',
  'Marketing',
  'Salaries',
  'Insurance',
  'Maintenance',
  'Other',
];

const paymentMethods = [
  'Bank Transfer',
  'Credit Card',
  'Cash',
  'Check',
  'PayPal',
  'Other',
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
      currency: 'USD',
      status: 'pending',
      recurring: 'none',
    },
  });

  // Determine currency and amount from expense data
  const getCurrencyAndAmount = (expense: any) => {
    if (expense.amountUsd) return { currency: 'USD', amount: expense.amountUsd };
    if (expense.amountEur) return { currency: 'EUR', amount: expense.amountEur };
    if (expense.amountCzk) return { currency: 'CZK', amount: expense.amountCzk };
    if (expense.amountVnd) return { currency: 'VND', amount: expense.amountVnd };
    if (expense.amountCny) return { currency: 'CNY', amount: expense.amountCny };
    return { currency: 'USD', amount: '0' };
  };

  useEffect(() => {
    if (expense) {
      const { currency, amount } = getCurrencyAndAmount(expense);
      form.reset({
        vendorName: expense.vendorName || '',
        category: expense.category || '',
        amount: amount,
        currency: currency as any,
        date: expense.date ? new Date(expense.date) : new Date(),
        dueDate: expense.dueDate ? new Date(expense.dueDate) : undefined,
        paymentMethod: expense.paymentMethod || '',
        status: expense.status || 'pending',
        recurring: expense.recurring || 'none',
        description: expense.description || '',
      });
    }
  }, [expense, form]);

  const updateMutation = useMutation({
    mutationFn: async (data: ExpenseFormData) => {
      const amountField = `amount${data.currency.charAt(0).toUpperCase() + data.currency.slice(1).toLowerCase()}`;
      
      // Clear all amount fields
      const payload: any = {
        vendorName: data.vendorName,
        category: data.category,
        amountUsd: null,
        amountEur: null,
        amountCzk: null,
        amountVnd: null,
        amountCny: null,
        date: data.date,
        dueDate: data.dueDate || null,
        paymentMethod: data.paymentMethod,
        status: data.status,
        recurring: data.recurring,
        description: data.description,
      };
      
      // Set the selected currency amount
      payload[amountField] = data.amount;
      
      return await apiRequest(`/api/expenses/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
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
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update expense",
        variant: "destructive",
      });
      setIsSubmitting(false);
    },
  });

  const onSubmit = (data: ExpenseFormData) => {
    setIsSubmitting(true);
    updateMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!expense) {
    return (
      <div className="text-center">
        <p>Expense not found</p>
        <Button onClick={() => navigate('/expenses')} className="mt-4">
          Back to Expenses
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/expenses')}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-mobile-2xl sm:text-3xl font-bold">Edit Expense</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Expense Details</CardTitle>
          <CardDescription>
            Update the expense information
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="vendorName">Vendor Name</Label>
                <Input
                  id="vendorName"
                  placeholder="Type here"
                  {...form.register("vendorName")}
                />
                {form.formState.errors.vendorName && (
                  <p className="text-sm text-red-500">{form.formState.errors.vendorName.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
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

              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select
                  value={form.watch("category")}
                  onValueChange={(value) => form.setValue("category", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Please select" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.formState.errors.category && (
                  <p className="text-sm text-red-500">{form.formState.errors.category.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount">Amount</Label>
                <div className="flex gap-2">
                  <Select
                    value={form.watch("currency")}
                    onValueChange={(value: any) => form.setValue("currency", value)}
                  >
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                      <SelectItem value="CZK">CZK</SelectItem>
                      <SelectItem value="VND">VND</SelectItem>
                      <SelectItem value="CNY">CNY</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    placeholder="Type here"
                    {...form.register("amount")}
                    className="flex-1"
                  />
                </div>
                {form.formState.errors.amount && (
                  <p className="text-sm text-red-500">{form.formState.errors.amount.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="recurring">Recurring</Label>
                <Select
                  value={form.watch("recurring")}
                  onValueChange={(value: any) => form.setValue("recurring", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Please select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="dueDate">Due Date</Label>
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
                      selected={form.watch("dueDate") || undefined}
                      onSelect={(date) => form.setValue("dueDate", date || undefined)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label htmlFor="paymentMethod">Payment Method</Label>
                <Select
                  value={form.watch("paymentMethod")}
                  onValueChange={(value) => form.setValue("paymentMethod", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Please select" />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentMethods.map((method) => (
                      <SelectItem key={method} value={method}>
                        {method}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={form.watch("status")}
                  onValueChange={(value: any) => form.setValue("status", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Please select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Describe here..."
                {...form.register("description")}
                rows={4}
              />
            </div>

            <div className="flex gap-4 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/expenses')}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Updating..." : "Update Expense"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}