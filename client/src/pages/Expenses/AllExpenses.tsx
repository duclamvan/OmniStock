import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { DataTable, DataTableColumn } from "@/components/ui/data-table";
import { createVietnameseSearchMatcher } from "@/lib/vietnameseSearch";
import { 
  Plus, 
  DollarSign, 
  TrendingUp, 
  Calendar, 
  Search, 
  Eye, 
  Receipt,
  CreditCard,
  Clock,
  Filter
} from "lucide-react";
import { format } from "date-fns";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function AllExpenses() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedExpenses, setSelectedExpenses] = useState<any[]>([]);

  const { data: expenses = [], isLoading, error } = useQuery<any[]>({
    queryKey: ['/api/expenses'],
    retry: false,
  });

  useEffect(() => {
    if (error) {
      toast({
        title: "Error",
        description: "Failed to load expenses. Please try again.",
        variant: "destructive",
      });
    }
  }, [error, toast]);

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest(`/api/expenses/${id}`, 'DELETE');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/expenses'] });
      toast({
        title: "Success",
        description: "Expense deleted successfully",
      });
      setShowDeleteDialog(false);
      setSelectedExpenses([]);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete expense",
        variant: "destructive",
      });
    },
  });

  const handleBulkDelete = async () => {
    try {
      await Promise.all(
        selectedExpenses.map(expense => deleteMutation.mutateAsync(expense.id))
      );
    } catch (error) {
      console.error('Error deleting expenses:', error);
    }
  };

  const searchMatcher = createVietnameseSearchMatcher(searchQuery);
  const filteredExpenses = expenses.filter(expense => 
    searchMatcher(expense.expenseId || '') ||
    searchMatcher(expense.name || '') ||
    searchMatcher(expense.category || '') ||
    searchMatcher(expense.description || '') ||
    searchMatcher(expense.paymentMethod || '')
  );

  // Calculate stats
  const totalExpenses = expenses.reduce((sum, expense) => {
    const amount = parseFloat(expense.amount || '0') || 0;
    return sum + amount;
  }, 0);

  const thisMonthExpenses = expenses.filter(expense => {
    if (!expense.date) return false;
    try {
      const expenseDate = new Date(expense.date);
      if (isNaN(expenseDate.getTime())) return false;
      const now = new Date();
      return expenseDate.getMonth() === now.getMonth() && 
             expenseDate.getFullYear() === now.getFullYear();
    } catch {
      return false;
    }
  });

  const thisMonthTotal = thisMonthExpenses.reduce((sum, expense) => {
    const amount = parseFloat(expense.amount || '0') || 0;
    return sum + amount;
  }, 0);

  const pendingExpenses = expenses.filter(e => e.status === 'pending');
  const overdueExpenses = expenses.filter(expense => {
    if (!expense.dueDate || expense.status === 'paid') return false;
    try {
      const dueDate = new Date(expense.dueDate);
      if (isNaN(dueDate.getTime())) return false;
      return dueDate < new Date();
    } catch {
      return false;
    }
  });

  const getCurrencySymbol = (currency: string) => {
    switch(currency) {
      case 'USD': return '$';
      case 'EUR': return '€';
      case 'CZK': return 'Kč';
      case 'VND': return '₫';
      case 'CNY': return '¥';
      default: return '';
    }
  };

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return '-';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return '-';
      return format(date, 'dd/MM/yyyy');
    } catch {
      return '-';
    }
  };

  const columns: DataTableColumn<any>[] = [
    {
      key: "name",
      header: "Name",
      cell: (row: any) => (
        <Link href={`/expenses/${row.id}`}>
          <span className="font-medium text-blue-600 hover:underline cursor-pointer">
            {row.name}
          </span>
        </Link>
      ),
    },
    {
      key: "description",
      header: "Description",
      cell: (row: any) => (
        <span className="text-sm text-slate-600 line-clamp-2 max-w-xs">
          {row.description || '-'}
        </span>
      ),
    },
    {
      key: "date",
      header: "Date",
      cell: (row: any) => formatDate(row.date),
    },
    {
      key: "category",
      header: "Category",
      cell: (row: any) => (
        <Badge variant="outline">
          {row.category || 'General'}
        </Badge>
      ),
    },
    {
      key: "recurring",
      header: "Recurring",
      cell: (row: any) => (
        <span className="text-sm capitalize">
          {row.recurring && row.recurring !== 'none' ? row.recurring : '-'}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (row: any) => (
        <Badge 
          variant={row.status === 'paid' ? 'default' : 
                  row.status === 'pending' ? 'secondary' : 'destructive'}
        >
          {row.status || 'pending'}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      cell: (row: any) => (
        <div className="flex gap-2">
          <Link href={`/expenses/${row.id}`}>
            <Button variant="ghost" size="icon">
              <Eye className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      ),
    },
  ];

  const bulkActions = [
    {
      label: "Delete Selected",
      action: (selectedItems: any[]) => {
        setSelectedExpenses(selectedItems);
        setShowDeleteDialog(true);
      },
      variant: "destructive" as const,
    },
  ];

  // Remove loading state to prevent UI refresh indicators

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Expenses</h1>
          <p className="text-slate-600 mt-1">Manage and track all business expenses</p>
        </div>
        <Button onClick={() => navigate('/expenses/add')} size="lg">
          <Plus className="mr-2 h-5 w-5" />
          Add Expense
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalExpenses.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${thisMonthTotal.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">{thisMonthExpenses.length} expenses</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingExpenses.length}</div>
            <p className="text-xs text-muted-foreground">Awaiting payment</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
            <TrendingUp className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{overdueExpenses.length}</div>
            <p className="text-xs text-muted-foreground">Need attention</p>
          </CardContent>
        </Card>
      </div>

      {/* Expenses Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <CardTitle>All Expenses</CardTitle>
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search expenses..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={filteredExpenses}
            bulkActions={bulkActions}
            getRowKey={(expense) => expense.id}
          />
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {selectedExpenses.length} expense(s). 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDelete}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}