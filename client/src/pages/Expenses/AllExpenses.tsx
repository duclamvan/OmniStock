import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { DataTable, DataTableColumn } from "@/components/ui/data-table";
import { fuzzySearch } from "@/lib/fuzzySearch";
import { formatCompactNumber } from "@/lib/currencyUtils";
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
  Filter,
  MoreVertical,
  CheckCircle2,
} from "lucide-react";
import { format } from "date-fns";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function AllExpenses() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedExpenses, setSelectedExpenses] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  // Column visibility state with localStorage persistence
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>(() => {
    const saved = localStorage.getItem('expensesVisibleColumns');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return {};
      }
    }
    return {
      invoiceNumber: true,
      vendor: true,
      category: true,
      amount: true,
      paymentMethod: true,
      status: true,
      date: true,
    };
  });

  // Toggle column visibility
  const toggleColumnVisibility = (columnKey: string) => {
    const newVisibility = { ...visibleColumns, [columnKey]: !visibleColumns[columnKey] };
    setVisibleColumns(newVisibility);
    localStorage.setItem('expensesVisibleColumns', JSON.stringify(newVisibility));
  };

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
      return await apiRequest('DELETE', `/api/expenses/${id}`);
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

  // Apply filters
  let filteredExpenses = expenses || [];

  // Apply search filter
  if (searchQuery) {
    filteredExpenses = fuzzySearch(filteredExpenses, searchQuery, {
      fields: ['expenseId', 'name', 'category', 'description', 'paymentMethod', 'vendor'],
      threshold: 0.2,
      fuzzy: true,
      vietnameseNormalization: true,
    }).map(r => r.item);
  }

  // Apply status filter
  if (statusFilter !== "all") {
    filteredExpenses = filteredExpenses.filter(e => e.status === statusFilter);
  }

  // Apply category filter
  if (categoryFilter !== "all") {
    filteredExpenses = filteredExpenses.filter(e => e.category === categoryFilter);
  }

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
  const pendingTotal = pendingExpenses.reduce((sum, expense) => {
    const amount = parseFloat(expense.amount || '0') || 0;
    return sum + amount;
  }, 0);

  const paidExpenses = expenses.filter(e => e.status === 'paid');
  const paidTotal = paidExpenses.reduce((sum, expense) => {
    const amount = parseFloat(expense.amount || '0') || 0;
    return sum + amount;
  }, 0);

  // Get unique categories
  const categories = Array.from(new Set(expenses.map(e => e.category).filter(Boolean)));

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
      key: "invoiceNumber",
      header: "Invoice #",
      sortable: true,
      cell: (row: any) => (
        <Link href={`/expenses/${row.id}`}>
          <span className="font-medium text-cyan-600 hover:underline cursor-pointer dark:text-cyan-400">
            {row.expenseId || row.name}
          </span>
        </Link>
      ),
    },
    {
      key: "vendor",
      header: "Vendor",
      sortable: true,
      cell: (row: any) => (
        <span className="text-sm text-slate-700 dark:text-slate-300">
          {row.vendor || row.name || '-'}
        </span>
      ),
    },
    {
      key: "category",
      header: "Category",
      sortable: true,
      className: "text-center",
      cell: (row: any) => (
        <Badge variant="outline" className="border-slate-200 dark:border-slate-700">
          {row.category || 'General'}
        </Badge>
      ),
    },
    {
      key: "amount",
      header: "Amount",
      sortable: true,
      className: "text-right",
      cell: (row: any) => {
        const amount = parseFloat(row.amount || '0') || 0;
        const symbol = getCurrencySymbol(row.currency || 'USD');
        return (
          <div className="flex items-center justify-end gap-2">
            <DollarSign className="h-4 w-4 text-slate-400" />
            <span className="font-semibold text-slate-900 dark:text-slate-100">
              {symbol}{amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        );
      },
    },
    {
      key: "paymentMethod",
      header: "Payment Method",
      sortable: true,
      className: "text-center",
      cell: (row: any) => {
        const methodConfig = {
          'cash': { label: 'Cash', icon: DollarSign, color: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800' },
          'card': { label: 'Card', icon: CreditCard, color: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-400 dark:border-blue-800' },
          'bank_transfer': { label: 'Transfer', icon: Receipt, color: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-400 dark:border-purple-800' },
          'check': { label: 'Check', icon: Receipt, color: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950 dark:text-orange-400 dark:border-orange-800' },
        };
        
        if (!row.paymentMethod || !methodConfig[row.paymentMethod as keyof typeof methodConfig]) {
          return <span className="text-sm text-slate-400">-</span>;
        }
        
        const config = methodConfig[row.paymentMethod as keyof typeof methodConfig];
        const Icon = config.icon;
        
        return (
          <Badge className={`${config.color} font-medium px-2.5 py-1`} variant="outline">
            <Icon className="h-3 w-3 mr-1.5" />
            {config.label}
          </Badge>
        );
      },
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      className: "text-center",
      cell: (row: any) => {
        const statusConfig = {
          'paid': { label: 'Paid', icon: CheckCircle2, color: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800' },
          'pending': { label: 'Pending', icon: Clock, color: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-800' },
          'overdue': { label: 'Overdue', icon: TrendingUp, color: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-800' },
        };
        
        const status = row.status || 'pending';
        const config = statusConfig[status as keyof typeof statusConfig] || statusConfig['pending'];
        const Icon = config.icon;
        
        return (
          <Badge className={`${config.color} font-medium px-2.5 py-1`} variant="outline">
            <Icon className="h-3 w-3 mr-1.5" />
            {config.label}
          </Badge>
        );
      },
    },
    {
      key: "date",
      header: "Date",
      sortable: true,
      cell: (row: any) => (
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-slate-400" />
          <span className="text-sm text-slate-700 dark:text-slate-300">
            {formatDate(row.date)}
          </span>
        </div>
      ),
    },
    {
      key: "actions",
      header: "",
      className: "w-16 text-center",
      cell: (row: any) => (
        <Link href={`/expenses/${row.id}`}>
          <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-cyan-50 dark:hover:bg-cyan-950" data-testid={`button-view-${row.id}`}>
            <Eye className="h-4 w-4 text-slate-600 dark:text-slate-400" />
          </Button>
        </Link>
      ),
    },
  ];

  // Filter columns based on visibility
  const visibleColumnsFiltered = columns.filter(col => 
    col.key === 'actions' || visibleColumns[col.key] !== false
  );

  const bulkActions = [
    {
      type: "button" as const,
      label: "Delete Selected",
      action: (selectedItems: any[]) => {
        setSelectedExpenses(selectedItems);
        setShowDeleteDialog(true);
      },
      variant: "destructive" as const,
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[600px]">
        <div className="text-center">
          <div className="relative w-16 h-16 mx-auto mb-6">
            <div className="absolute inset-0 border-4 border-cyan-200 dark:border-cyan-800 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-cyan-600 dark:border-cyan-400 rounded-full border-t-transparent animate-spin"></div>
          </div>
          <p className="text-slate-600 dark:text-slate-400 font-medium">Loading expenses...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            Expenses
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Track business expenses and manage invoices
          </p>
        </div>
        <Button onClick={() => navigate('/expenses/add')} data-testid="button-add-expense">
          <Plus className="h-4 w-4 mr-2" />
          Add Expense
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Expenses */}
        <Card className="border-slate-200 dark:border-slate-800 hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Total Expenses
                </p>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <p className="text-3xl font-bold text-slate-900 dark:text-slate-100 truncate cursor-help">
                        ${formatCompactNumber(totalExpenses)}
                      </p>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="font-mono">${totalExpenses.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">All time</p>
              </div>
              <div className="flex-shrink-0 p-3 rounded-xl bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-cyan-950 dark:to-blue-950">
                <DollarSign className="h-7 w-7 text-cyan-600 dark:text-cyan-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* This Month */}
        <Card className="border-slate-200 dark:border-slate-800 hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
                  This Month
                </p>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <p className="text-3xl font-bold text-slate-900 dark:text-slate-100 truncate cursor-help">
                        ${formatCompactNumber(thisMonthTotal)}
                      </p>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="font-mono">${thisMonthTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{thisMonthExpenses.length} expenses</p>
              </div>
              <div className="flex-shrink-0 p-3 rounded-xl bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-950 dark:to-yellow-950">
                <Calendar className="h-7 w-7 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pending */}
        <Card className="border-slate-200 dark:border-slate-800 hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Pending
                </p>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <p className="text-3xl font-bold text-slate-900 dark:text-slate-100 truncate cursor-help">
                        ${formatCompactNumber(pendingTotal)}
                      </p>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="font-mono">${pendingTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{pendingExpenses.length} expenses</p>
              </div>
              <div className="flex-shrink-0 p-3 rounded-xl bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-950 dark:to-green-950">
                <Clock className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Paid */}
        <Card className="border-slate-200 dark:border-slate-800 hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Paid
                </p>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <p className="text-3xl font-bold text-slate-900 dark:text-slate-100 truncate cursor-help">
                        ${formatCompactNumber(paidTotal)}
                      </p>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="font-mono">${paidTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{paidExpenses.length} expenses</p>
              </div>
              <div className="flex-shrink-0 p-3 rounded-xl bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-950 dark:to-indigo-950">
                <CheckCircle2 className="h-7 w-7 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters & Search */}
      <Card className="border-slate-200 dark:border-slate-800">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-slate-600 dark:text-slate-400" />
            <CardTitle className="text-lg">Filters & Search</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Search expenses..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-10 border-slate-200 dark:border-slate-700 focus:border-cyan-500 dark:focus:border-cyan-500"
                data-testid="input-search"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-10 border-slate-200 dark:border-slate-700 focus:border-cyan-500" data-testid="select-status">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="h-10 border-slate-200 dark:border-slate-700 focus:border-cyan-500" data-testid="select-category">
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Expenses Table */}
      <Card className="border-slate-200 dark:border-slate-800">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">All Expenses ({filteredExpenses?.length || 0})</CardTitle>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 border-slate-200 dark:border-slate-700" data-testid="button-column-visibility">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>Toggle Columns</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {columns.filter(col => col.key !== 'actions').map((col) => (
                  <DropdownMenuItem
                    key={col.key}
                    onClick={() => toggleColumnVisibility(col.key)}
                    className="justify-between"
                  >
                    {col.header}
                    {visibleColumns[col.key] !== false && (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    )}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent className="p-0 sm:p-6">
          <DataTable
            columns={visibleColumnsFiltered}
            data={filteredExpenses}
            bulkActions={bulkActions}
            getRowKey={(expense) => expense.id}
            itemsPerPageOptions={[10, 20, 50, 100]}
            defaultItemsPerPage={20}
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
