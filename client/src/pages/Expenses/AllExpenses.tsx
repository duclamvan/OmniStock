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
import { Plus, DollarSign, TrendingUp, Calendar, Search, Eye } from "lucide-react";
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
      return await apiRequest(`/api/expenses/${id}`, {
        method: 'DELETE',
      });
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
    searchMatcher(expense.vendorName || '') ||
    searchMatcher(expense.category || '') ||
    searchMatcher(expense.description || '') ||
    searchMatcher(expense.paymentMethod || '')
  );

  // Calculate stats
  const totalExpenses = expenses.reduce((sum, expense) => {
    const amount = parseFloat(expense.amountUsd || '0') || 
                  parseFloat(expense.amountCzk || '0') || 
                  parseFloat(expense.amountEur || '0') || 0;
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
    const amount = parseFloat(expense.amountUsd || '0') || 
                  parseFloat(expense.amountCzk || '0') || 
                  parseFloat(expense.amountEur || '0') || 0;
    return sum + amount;
  }, 0);

  const getCurrencySymbol = (expense: any) => {
    if (expense.amountUsd) return '$';
    if (expense.amountEur) return '€';
    if (expense.amountCzk) return 'Kč';
    if (expense.amountVnd) return '₫';
    if (expense.amountCny) return '¥';
    return '$';
  };

  const getAmount = (expense: any) => {
    return expense.amountUsd || expense.amountEur || expense.amountCzk || 
           expense.amountVnd || expense.amountCny || '0';
  };

  const columns: DataTableColumn[] = [
    {
      header: "Expense ID",
      accessorKey: "expenseId",
      cell: (row: any) => (
        <Link href={`/expenses/${row.id}`}>
          <span className="font-medium text-blue-600 hover:underline cursor-pointer">
            {row.expenseId}
          </span>
        </Link>
      ),
    },
    {
      header: "Date",
      accessorKey: "date",
      cell: (row: any) => {
        if (!row.date) return '-';
        try {
          const date = new Date(row.date);
          if (isNaN(date.getTime())) return '-';
          return format(date, 'dd/MM/yyyy');
        } catch {
          return '-';
        }
      },
    },
    {
      header: "Vendor",
      accessorKey: "vendorName",
    },
    {
      header: "Category",
      accessorKey: "category",
      cell: (row: any) => (
        <Badge variant="outline">{row.category}</Badge>
      ),
    },
    {
      header: "Amount",
      accessorKey: "amount",
      cell: (row: any) => (
        <span className="font-medium">
          {getCurrencySymbol(row)}{parseFloat(getAmount(row)).toFixed(2)}
        </span>
      ),
    },
    {
      header: "Due Date",
      accessorKey: "dueDate",
      cell: (row: any) => {
        if (!row.dueDate) return '-';
        try {
          const date = new Date(row.dueDate);
          if (isNaN(date.getTime())) return '-';
          return format(date, 'dd/MM/yyyy');
        } catch {
          return '-';
        }
      },
    },
    {
      header: "Status",
      accessorKey: "status",
      cell: (row: any) => (
        <Badge 
          variant={row.status === 'paid' ? 'default' : 
                  row.status === 'pending' ? 'secondary' : 'destructive'}
        >
          {row.status}
        </Badge>
      ),
    },
    {
      header: "Payment Method",
      accessorKey: "paymentMethod",
      cell: (row: any) => row.paymentMethod || '-',
    },
    {
      header: "Actions",
      id: "actions",
      cell: (row: any) => (
        <div className="flex gap-2">
          <Link href={`/expenses/${row.id}`}>
            <Button variant="ghost" size="sm">
              <Eye className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      ),
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading expenses...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-mobile-2xl sm:text-3xl font-bold">All Expenses</h1>
        <Link href="/expenses/add">
          <Button className="touch-target">
            <Plus className="mr-2 h-4 w-4" />
            Add Expense
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-mobile-sm font-medium">Total Expenses</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalExpenses.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-mobile-sm font-medium">This Month</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${thisMonthTotal.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">{thisMonthExpenses.length} expenses</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-mobile-sm font-medium">Pending</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {expenses.filter(e => e.status === 'pending').length}
            </div>
            <p className="text-xs text-muted-foreground">To be paid</p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Table */}
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search expenses..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <DataTable
          columns={columns}
          data={filteredExpenses}
          getRowKey={(expense) => expense.id}
          selectable
          selectedRows={selectedExpenses}
          onSelectedRowsChange={setSelectedExpenses}
          bulkActions={
            selectedExpenses.length > 0 ? (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setShowDeleteDialog(true)}
              >
                Delete ({selectedExpenses.length})
              </Button>
            ) : null
          }
        />
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Expenses</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedExpenses.length} expense(s)? 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}