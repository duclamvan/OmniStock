import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { DataTable, DataTableColumn } from "@/components/ui/data-table";
import { fuzzySearch } from "@/lib/fuzzySearch";
import { formatCompactNumber } from "@/lib/currencyUtils";
import { exportToXLSX, exportToPDF, type PDFColumn } from "@/lib/exportUtils";
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
  Download,
  Upload,
  FileSpreadsheet,
  FileText,
  FileDown,
  Edit,
  Trash2,
  Repeat,
  Check,
  RefreshCw,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

export default function AllExpenses() {
  const { t } = useTranslation(['financial', 'common']);
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedExpenses, setSelectedExpenses] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [recurringFilter, setRecurringFilter] = useState<string>("all");
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);

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
      recurring: true,
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
        title: t('error'),
        description: t('failedToLoadExpenses'),
        variant: "destructive",
      });
    }
  }, [error, toast, t]);

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest('DELETE', `/api/expenses/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/expenses'] });
      toast({
        title: t('success'),
        description: t('expenseDeletedSuccessfully'),
      });
      setShowDeleteDialog(false);
      setSelectedExpenses([]);
    },
    onError: () => {
      toast({
        title: t('error'),
        description: t('failedToDeleteExpense'),
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

  // Apply recurring filter
  if (recurringFilter !== "all") {
    filteredExpenses = filteredExpenses.filter(e => 
      recurringFilter === "recurring" ? e.isRecurring === true : e.isRecurring !== true
    );
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

  // Export to XLSX
  const handleExportXLSX = () => {
    try {
      if (!filteredExpenses || filteredExpenses.length === 0) {
        toast({
          title: t('noDataToExport'),
          description: t('thereAreNoExpensesToExport'),
          variant: "destructive",
        });
        return;
      }

      // Prepare export data
      const exportData = filteredExpenses.map(expense => {
        const amount = parseFloat(expense.amount || '0') || 0;
        const symbol = getCurrencySymbol(expense.currency || 'USD');
        
        return {
          'Invoice Number': expense.expenseId || expense.name || '-',
          'Description': expense.description || expense.name || '-',
          'Supplier/Vendor': expense.vendor || expense.name || '-',
          'Amount': `${symbol}${amount.toFixed(2)}`,
          'Currency': expense.currency || 'USD',
          'Category': expense.category || 'General',
          'Date': formatDate(expense.date),
          'Status': expense.status || 'pending',
          'Payment Method': expense.paymentMethod ? 
            expense.paymentMethod.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) : '-',
        };
      });

      exportToXLSX(exportData, 'expenses', t('expenses'));
      
      toast({
        title: t('exportSuccessful'),
        description: t('exportedExpenses', { count: filteredExpenses.length }),
      });
    } catch (error) {
      console.error('Error exporting to XLSX:', error);
      toast({
        title: t('exportFailed'),
        description: t('failedToExportExpenses'),
        variant: "destructive",
      });
    }
  };

  // Export to PDF
  const handleExportPDF = () => {
    try {
      if (!filteredExpenses || filteredExpenses.length === 0) {
        toast({
          title: t('noDataToExport'),
          description: t('thereAreNoExpensesToExport'),
          variant: "destructive",
        });
        return;
      }

      // Define columns for PDF
      const pdfColumns: PDFColumn[] = [
        { key: 'invoiceNumber', header: t('invoiceNumber') },
        { key: 'description', header: t('description') },
        { key: 'vendor', header: t('vendor') },
        { key: 'amount', header: t('amount') },
        { key: 'currency', header: t('currency') },
        { key: 'category', header: t('category') },
        { key: 'date', header: t('date') },
        { key: 'status', header: t('status') },
        { key: 'paymentMethod', header: t('paymentMethod') },
      ];

      // Prepare export data
      const exportData = filteredExpenses.map(expense => {
        const amount = parseFloat(expense.amount || '0') || 0;
        const symbol = getCurrencySymbol(expense.currency || 'USD');
        
        return {
          invoiceNumber: expense.expenseId || expense.name || '-',
          description: expense.description || expense.name || '-',
          vendor: expense.vendor || expense.name || '-',
          amount: `${symbol}${amount.toFixed(2)}`,
          currency: expense.currency || 'USD',
          category: expense.category || 'General',
          date: formatDate(expense.date),
          status: expense.status ? expense.status.charAt(0).toUpperCase() + expense.status.slice(1) : 'Pending',
          paymentMethod: expense.paymentMethod ? 
            expense.paymentMethod.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) : '-',
        };
      });

      exportToPDF(t('expensesReport'), exportData, pdfColumns, 'expenses');
      
      toast({
        title: t('exportInitiated'),
        description: t('preparingPDFExport', { count: filteredExpenses.length }),
      });
    } catch (error) {
      console.error('Error exporting to PDF:', error);
      toast({
        title: t('exportFailed'),
        description: t('failedToExportExpenses'),
        variant: "destructive",
      });
    }
  };

  // Comprehensive export with all expense fields
  const handleComprehensiveExport = () => {
    try {
      if (!filteredExpenses || filteredExpenses.length === 0) {
        toast({
          title: t('noDataToExport'),
          description: t('thereAreNoExpensesToExport'),
          variant: "destructive",
        });
        return;
      }

      const exportData = filteredExpenses.map(expense => {
        const amount = parseFloat(expense.amount || '0') || 0;
        
        return {
          'Expense ID': expense.expenseId || '',
          'Name': expense.name || '',
          'Description': expense.description || '',
          'Vendor': expense.vendor || '',
          'Amount': amount,
          'Currency': expense.currency || 'USD',
          'Category': expense.category || 'General',
          'Date': formatDate(expense.date),
          'Due Date': expense.dueDate ? formatDate(expense.dueDate) : '',
          'Status': expense.status || 'pending',
          'Payment Method': expense.paymentMethod || '',
          'Is Recurring': expense.isRecurring ? 'Yes' : 'No',
          'Recurring Frequency': expense.recurringFrequency || '',
          'Recurring Interval': expense.recurringInterval || '',
          'Recurring Day': expense.recurringDay || '',
          'Notes': expense.notes || '',
          'Tags': expense.tags || '',
          'Reference Number': expense.referenceNumber || '',
        };
      });

      exportToXLSX(exportData, 'expenses_comprehensive', t('expenses'));
      
      toast({
        title: t('exportSuccessful'),
        description: t('exportedExpenses', { count: filteredExpenses.length }),
      });
    } catch (error) {
      console.error('Error exporting to XLSX:', error);
      toast({
        title: t('exportFailed'),
        description: t('failedToExportExpenses'),
        variant: "destructive",
      });
    }
  };

  // Download template for import
  const handleDownloadTemplate = () => {
    const templateData = [
      {
        'Expense ID': 'EXP-001',
        'Name': 'Office Supplies Purchase',
        'Description': 'Paper, pens, and stationery for the office',
        'Vendor': 'Office Depot',
        'Amount': '150.00',
        'Currency': 'USD',
        'Category': 'Office Supplies',
        'Date': '2024-12-18',
        'Due Date': '2024-12-25',
        'Status': 'pending',
        'Payment Method': 'card',
        'Is Recurring': 'No',
        'Recurring Frequency': '',
        'Recurring Interval': '',
        'Recurring Day': '',
        'Notes': 'Monthly office supply replenishment',
        'Tags': 'office, supplies',
        'Reference Number': 'INV-12345',
      },
      {
        'Expense ID': 'EXP-002',
        'Name': 'Monthly Software Subscription',
        'Description': 'Cloud storage and productivity tools',
        'Vendor': 'Google Workspace',
        'Amount': '299.99',
        'Currency': 'EUR',
        'Category': 'Software',
        'Date': '2024-12-15',
        'Due Date': '',
        'Status': 'paid',
        'Payment Method': 'bank_transfer',
        'Is Recurring': 'Yes',
        'Recurring Frequency': 'monthly',
        'Recurring Interval': '1',
        'Recurring Day': '15',
        'Notes': 'Annual subscription paid monthly',
        'Tags': 'software, subscription',
        'Reference Number': 'GWS-98765',
      },
    ];

    exportToXLSX(templateData, 'expenses_import_template', t('importTemplate'));
    
    toast({
      title: t('templateDownloaded'),
      description: t('templateDownloadedDescription'),
    });
  };

  // Handle file select for import
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImportFile(file);
    }
  };

  // Handle import
  const handleImport = async () => {
    if (!importFile) {
      toast({
        title: t('common:error'),
        description: t('noFileSelected'),
        variant: "destructive",
      });
      return;
    }

    setIsImporting(true);
    try {
      const formData = new FormData();
      formData.append('file', importFile);

      const response = await fetch('/api/expenses/import', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Import failed');
      }

      const result = await response.json();
      
      queryClient.invalidateQueries({ queryKey: ['/api/expenses'] });
      setShowImportDialog(false);
      setImportFile(null);
      
      toast({
        title: t('importSuccessful'),
        description: t('importedExpenses', { count: result.imported || 0 }),
      });
    } catch (error: any) {
      console.error('Import error:', error);
      toast({
        title: t('importFailed'),
        description: error.message || t('failedToImportExpenses'),
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
    }
  };

  const columns: DataTableColumn<any>[] = [
    {
      key: "invoiceNumber",
      header: t('invoiceNumber'),
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
      header: t('vendor'),
      sortable: true,
      cell: (row: any) => (
        <span className="text-sm text-slate-700 dark:text-slate-300">
          {row.vendor || row.name || '-'}
        </span>
      ),
    },
    {
      key: "category",
      header: t('category'),
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
      header: t('amount'),
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
      header: t('paymentMethod'),
      sortable: true,
      className: "text-center",
      cell: (row: any) => {
        const methodConfig = {
          'cash': { label: t('cash'), icon: DollarSign, color: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800' },
          'card': { label: t('card'), icon: CreditCard, color: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-400 dark:border-blue-800' },
          'bank_transfer': { label: t('transfer'), icon: Receipt, color: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-400 dark:border-purple-800' },
          'check': { label: t('check'), icon: Receipt, color: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950 dark:text-orange-400 dark:border-orange-800' },
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
      header: t('status'),
      sortable: true,
      className: "text-center",
      cell: (row: any) => {
        const statusConfig = {
          'paid': { label: t('paid'), icon: CheckCircle2, color: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800' },
          'pending': { label: t('pending'), icon: Clock, color: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-800' },
          'overdue': { label: t('overdue'), icon: TrendingUp, color: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-800' },
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
      key: "recurring",
      header: t('recurring'),
      sortable: true,
      className: "text-center",
      cell: (row: any) => (
        row.isRecurring ? (
          <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950 dark:text-indigo-400 dark:border-indigo-800 font-medium px-2.5 py-1" variant="outline">
            <Repeat className="h-3 w-3 mr-1.5" />
            {t('recurring')}
          </Badge>
        ) : (
          <span className="text-sm text-slate-400">-</span>
        )
      ),
    },
    {
      key: "date",
      header: t('date'),
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
      label: t('deleteSelected'),
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
          <p className="text-slate-600 dark:text-slate-400 font-medium">{t('loadingExpenses')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 overflow-x-hidden p-2 sm:p-4 md:p-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            {t('expenses')}
          </h1>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 mt-1">
            {t('trackBusinessExpenses')}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          {/* Import/Export Menu - Three Dot Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="outline" 
                size="icon"
                className="w-10 sm:w-10"
                data-testid="button-import-export-menu"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>{t('importExport')}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setShowImportDialog(true)} data-testid="menu-import-xlsx">
                <Upload className="h-4 w-4 mr-2 text-blue-600" />
                {t('importFromExcel')}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleComprehensiveExport} data-testid="menu-export-comprehensive">
                <FileSpreadsheet className="h-4 w-4 mr-2 text-emerald-600" />
                {t('exportToExcel')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportXLSX} data-testid="menu-export-xlsx">
                <FileSpreadsheet className="h-4 w-4 mr-2 text-emerald-600" />
                {t('exportToXLSX')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportPDF} data-testid="menu-export-pdf">
                <FileText className="h-4 w-4 mr-2 text-red-600" />
                {t('exportToPDF')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button onClick={() => navigate('/expenses/add')} className="w-full sm:w-auto" data-testid="button-add-expense">
            <Plus className="h-4 w-4 mr-2" />
            {t('addExpense')}
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
        {/* Total Expenses */}
        <Card className="border-slate-200 dark:border-slate-800 hover:shadow-lg transition-shadow">
          <CardContent className="p-3 sm:p-4 md:p-6">
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
                  {t('totalExpenses')}
                </p>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <p className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-900 dark:text-slate-100 truncate cursor-help">
                        ${formatCompactNumber(totalExpenses)}
                      </p>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="font-mono">${totalExpenses.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{t('allTime')}</p>
              </div>
              <div className="flex-shrink-0 p-2 sm:p-2.5 md:p-3 rounded-xl bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-cyan-950 dark:to-blue-950">
                <DollarSign className="h-5 w-5 sm:h-6 sm:w-6 md:h-7 md:w-7 text-cyan-600 dark:text-cyan-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* This Month */}
        <Card className="border-slate-200 dark:border-slate-800 hover:shadow-lg transition-shadow">
          <CardContent className="p-3 sm:p-4 md:p-6">
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
                  {t('thisMonth')}
                </p>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <p className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-900 dark:text-slate-100 truncate cursor-help">
                        ${formatCompactNumber(thisMonthTotal)}
                      </p>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="font-mono">${thisMonthTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{thisMonthExpenses.length} {t('expenses').toLowerCase()}</p>
              </div>
              <div className="flex-shrink-0 p-2 sm:p-2.5 md:p-3 rounded-xl bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-950 dark:to-yellow-950">
                <Calendar className="h-5 w-5 sm:h-6 sm:w-6 md:h-7 md:w-7 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pending */}
        <Card className="border-slate-200 dark:border-slate-800 hover:shadow-lg transition-shadow">
          <CardContent className="p-3 sm:p-4 md:p-6">
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
                  {t('pending')}
                </p>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <p className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-900 dark:text-slate-100 truncate cursor-help">
                        ${formatCompactNumber(pendingTotal)}
                      </p>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="font-mono">${pendingTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{pendingExpenses.length} {t('expenses').toLowerCase()}</p>
              </div>
              <div className="flex-shrink-0 p-2 sm:p-2.5 md:p-3 rounded-xl bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-950 dark:to-green-950">
                <Clock className="h-5 w-5 sm:h-6 sm:w-6 md:h-7 md:w-7 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Paid */}
        <Card className="border-slate-200 dark:border-slate-800 hover:shadow-lg transition-shadow">
          <CardContent className="p-3 sm:p-4 md:p-6">
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
                  {t('paid')}
                </p>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <p className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-900 dark:text-slate-100 truncate cursor-help">
                        ${formatCompactNumber(paidTotal)}
                      </p>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="font-mono">${paidTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{paidExpenses.length} {t('expenses').toLowerCase()}</p>
              </div>
              <div className="flex-shrink-0 p-2 sm:p-2.5 md:p-3 rounded-xl bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-950 dark:to-indigo-950">
                <CheckCircle2 className="h-5 w-5 sm:h-6 sm:w-6 md:h-7 md:w-7 text-purple-600 dark:text-purple-400" />
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
            <CardTitle className="text-lg">{t('filtersAndSearch')}</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder={t('searchExpenses')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-10 border-slate-200 dark:border-slate-700 focus:border-cyan-500 dark:focus:border-cyan-500"
                data-testid="input-search"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-10 border-slate-200 dark:border-slate-700 focus:border-cyan-500" data-testid="select-status">
                <SelectValue placeholder={t('filterByStatus')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('allStatuses')}</SelectItem>
                <SelectItem value="paid">{t('paid')}</SelectItem>
                <SelectItem value="pending">{t('pending')}</SelectItem>
                <SelectItem value="overdue">{t('overdue')}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="h-10 border-slate-200 dark:border-slate-700 focus:border-cyan-500" data-testid="select-category">
                <SelectValue placeholder={t('filterByCategory')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('allCategories')}</SelectItem>
                {categories.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={recurringFilter} onValueChange={setRecurringFilter}>
              <SelectTrigger className="h-10 border-slate-200 dark:border-slate-700 focus:border-cyan-500" data-testid="select-recurring">
                <Repeat className="h-4 w-4 mr-2 text-slate-400" />
                <SelectValue placeholder={t('filterByRecurring')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('allExpenses')}</SelectItem>
                <SelectItem value="recurring">{t('recurringOnly')}</SelectItem>
                <SelectItem value="one-time">{t('oneTimeOnly')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Expenses Table */}
      <Card className="border-slate-200 dark:border-slate-800">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">{t('allExpenses')} ({filteredExpenses?.length || 0})</CardTitle>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 border-slate-200 dark:border-slate-700" data-testid="button-column-visibility">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>{t('toggleColumns')}</DropdownMenuLabel>
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
          {/* Mobile Card View */}
          <div className="sm:hidden space-y-3 p-3">
            {filteredExpenses?.map((expense: any) => {
              const amount = parseFloat(expense.amount || '0') || 0;
              const symbol = getCurrencySymbol(expense.currency || 'USD');
              const status = expense.status || 'pending';
              
              const statusConfig = {
                'paid': { label: t('paid'), icon: CheckCircle2, color: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800' },
                'pending': { label: t('pending'), icon: Clock, color: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-800' },
                'overdue': { label: t('overdue'), icon: TrendingUp, color: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-800' },
              };
              
              const methodConfig = {
                'cash': { label: t('cash'), icon: DollarSign, color: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800' },
                'card': { label: t('card'), icon: CreditCard, color: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-400 dark:border-blue-800' },
                'bank_transfer': { label: t('transfer'), icon: Receipt, color: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-400 dark:border-purple-800' },
                'check': { label: t('check'), icon: Receipt, color: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950 dark:text-orange-400 dark:border-orange-800' },
              };
              
              const statusInfo = statusConfig[status as keyof typeof statusConfig] || statusConfig['pending'];
              const StatusIcon = statusInfo.icon;
              
              return (
                <div key={expense.id} className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-4">
                  <div className="space-y-3">
                    {/* Top Row - Title, Status, Actions */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <Link href={`/expenses/${expense.id}`}>
                          <p className="font-semibold text-slate-900 dark:text-slate-100 truncate cursor-pointer hover:text-cyan-600 dark:hover:text-cyan-400">
                            {expense.description || expense.name || expense.expenseId || t('expense')}
                          </p>
                        </Link>
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                          {expense.expenseId || expense.name || 'N/A'}
                          {expense.vendor && <span className="ml-2">• {expense.vendor}</span>}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Badge className={`${statusInfo.color} font-medium px-2 py-0.5 text-xs`} variant="outline">
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {statusInfo.label}
                        </Badge>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="icon" variant="ghost" className="h-8 w-8" data-testid={`button-actions-${expense.id}`}>
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link href={`/expenses/${expense.id}`} className="flex items-center cursor-pointer">
                                <Eye className="h-4 w-4 mr-2" />
                                {t('viewDetails')}
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link href={`/expenses/${expense.id}/edit`} className="flex items-center cursor-pointer">
                                <Edit className="h-4 w-4 mr-2" />
                                {t('edit')}
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedExpenses([expense]);
                                setShowDeleteDialog(true);
                              }}
                              className="text-red-600 dark:text-red-400"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              {t('delete')}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                    
                    {/* Middle Row - Key Details */}
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-slate-500 dark:text-slate-400 text-xs mb-1">Category</p>
                        <Badge variant="outline" className="border-slate-200 dark:border-slate-700 text-xs">
                          {expense.category || 'General'}
                        </Badge>
                      </div>
                      <div>
                        <p className="text-slate-500 dark:text-slate-400 text-xs mb-1">{t('date')}</p>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-slate-400" />
                          <p className="font-medium text-slate-900 dark:text-slate-100 text-xs">
                            {formatDate(expense.date)}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    {/* Bottom Row - Amount & Payment Method */}
                    <div className="flex items-end justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                      <div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">{t('amount')}</p>
                        <p className="text-xl font-bold text-slate-900 dark:text-slate-100">
                          {symbol}{amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {expense.currency || 'USD'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">{t('paymentMethod')}</p>
                        {expense.paymentMethod && methodConfig[expense.paymentMethod as keyof typeof methodConfig] ? (() => {
                          const PaymentIcon = methodConfig[expense.paymentMethod as keyof typeof methodConfig].icon;
                          return (
                            <Badge className={`${methodConfig[expense.paymentMethod as keyof typeof methodConfig].color} font-medium px-2 py-0.5 text-xs`} variant="outline">
                              <PaymentIcon className="h-3 w-3 mr-1" />
                              {methodConfig[expense.paymentMethod as keyof typeof methodConfig].label}
                            </Badge>
                          );
                        })() : (
                          <span className="text-xs text-slate-400">-</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* Desktop Table View */}
          <div className="hidden sm:block">
            <DataTable
              columns={visibleColumnsFiltered}
              data={filteredExpenses}
              bulkActions={bulkActions}
              getRowKey={(expense) => expense.id}
              itemsPerPageOptions={[10, 20, 50, 100]}
              defaultItemsPerPage={20}
            />
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('areYouSure')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('deleteExpensesConfirmation', { count: selectedExpenses.length })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDelete}>
              {t('delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Import Expenses Dialog */}
      <Dialog open={showImportDialog} onOpenChange={(open) => {
        setShowImportDialog(open);
        if (!open) {
          setImportFile(null);
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('importExpenses')}</DialogTitle>
            <DialogDescription>
              {t('importExpensesDescription')}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Template Download Section */}
            <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex items-start gap-3">
                <FileDown className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                    {t('downloadTemplateFirst')}
                  </p>
                  <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                    {t('expenseTemplateDescription')}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDownloadTemplate}
                    className="mt-3"
                    data-testid="button-download-expense-template"
                  >
                    <FileDown className="h-4 w-4 mr-2" />
                    {t('downloadTemplate')}
                  </Button>
                </div>
              </div>
            </div>

            {/* File Upload Section */}
            <div className="space-y-2">
              <Label htmlFor="import-expense-file">{t('selectFile')}</Label>
              <Input
                id="import-expense-file"
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileSelect}
                className="cursor-pointer"
                data-testid="input-import-expense-file"
              />
              {importFile && (
                <p className="text-sm text-green-600 dark:text-green-400 flex items-center gap-2">
                  <Check className="h-4 w-4" />
                  {importFile.name}
                </p>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => {
                setShowImportDialog(false);
                setImportFile(null);
              }}
              data-testid="button-cancel-expense-import"
            >
              {t('cancel')}
            </Button>
            <Button
              onClick={handleImport}
              disabled={!importFile || isImporting}
              data-testid="button-confirm-expense-import"
            >
              {isImporting ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  {t('common:processing')}
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  {t('importExpenses')}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
