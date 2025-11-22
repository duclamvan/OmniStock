import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { formatCompactNumber } from "@/lib/currencyUtils";
import { fuzzySearch } from "@/lib/fuzzySearch";
import { exportToXLSX, exportToPDF, type PDFColumn } from "@/lib/exportUtils";
import { Plus, Eye, Edit, Trash2, MoreVertical, ShoppingCart, Filter, Package, Clock, CheckCircle, Activity, Calendar, Search, FileDown, FileText, User } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";

interface PreOrder {
  id: string;
  customerId: string;
  status: string;
  notes: string | null;
  expectedDate: string | null;
  createdAt: string;
  updatedAt: string;
  customer: {
    id: string;
    name: string;
  } | null;
  itemsCount: number;
}

export default function AllPreOrders() {
  const { t } = useTranslation('orders');
  const { t: tCommon } = useTranslation('common');
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  
  const statusConfig = {
    pending: {
      label: t('pending'),
      className: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-800",
    },
    partially_arrived: {
      label: t('partiallyArrived'),
      className: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-400 dark:border-blue-800",
    },
    fully_arrived: {
      label: t('fullyArrived'),
      className: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800",
    },
    cancelled: {
      label: t('cancelled'),
      className: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-800",
    },
  };
  const [deletePreOrderId, setDeletePreOrderId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Column visibility state with localStorage persistence
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>(() => {
    const saved = localStorage.getItem('preOrdersVisibleColumns');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return {};
      }
    }
    return {
      customer: true,
      itemsCount: true,
      status: true,
      expectedDate: true,
      createdAt: true,
    };
  });

  // Toggle column visibility
  const toggleColumnVisibility = (columnKey: string) => {
    const newVisibility = { ...visibleColumns, [columnKey]: !visibleColumns[columnKey] };
    setVisibleColumns(newVisibility);
    localStorage.setItem('preOrdersVisibleColumns', JSON.stringify(newVisibility));
  };

  const { data: preOrders = [], isLoading } = useQuery<PreOrder[]>({
    queryKey: ['/api/pre-orders'],
  });

  const deletePreOrderMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest('DELETE', `/api/pre-orders/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/pre-orders'] });
      setDeletePreOrderId(null);
      toast({
        title: tCommon('success'),
        description: t('preOrderDeletedSuccess'),
      });
    },
    onError: () => {
      toast({
        title: tCommon('error'),
        description: t('preOrderDeleteFailed'),
        variant: "destructive",
      });
    },
  });

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "—";
    try {
      return format(new Date(dateString), "MMM d, yyyy");
    } catch {
      return "—";
    }
  };

  // Export handlers
  const handleExportXLSX = () => {
    try {
      if (!filteredPreOrders || filteredPreOrders.length === 0) {
        toast({
          title: tCommon('noDataToExport'),
          description: t('noPreOrdersToExport'),
          variant: "destructive",
        });
        return;
      }

      const exportData = filteredPreOrders.map(preOrder => ({
        'Pre-Order ID': preOrder.id,
        'Customer': preOrder.customer?.name || 'Unknown',
        'Items': preOrder.itemsCount,
        'Status': statusConfig[preOrder.status as keyof typeof statusConfig]?.label || preOrder.status,
        'Created Date': formatDate(preOrder.createdAt),
        'Expected Delivery': formatDate(preOrder.expectedDate),
        'Notes': preOrder.notes || '',
      }));

      exportToXLSX(exportData, 'pre-orders', 'PreOrders');
      
      toast({
        title: tCommon('success'),
        description: t('exportedPreOrdersXLSX', { count: exportData.length }),
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: tCommon('error'),
        description: t('exportPreOrdersXLSXFailed'),
        variant: "destructive",
      });
    }
  };

  const handleExportPDF = () => {
    try {
      if (!filteredPreOrders || filteredPreOrders.length === 0) {
        toast({
          title: tCommon('noDataToExport'),
          description: t('noPreOrdersToExport'),
          variant: "destructive",
        });
        return;
      }

      const exportData = filteredPreOrders.map(preOrder => ({
        id: preOrder.id,
        customer: preOrder.customer?.name || 'Unknown',
        items: preOrder.itemsCount.toString(),
        status: statusConfig[preOrder.status as keyof typeof statusConfig]?.label || preOrder.status,
        createdDate: formatDate(preOrder.createdAt),
        expectedDelivery: formatDate(preOrder.expectedDate),
      }));

      const columns: PDFColumn[] = [
        { key: 'id', header: 'Pre-Order ID' },
        { key: 'customer', header: 'Customer' },
        { key: 'items', header: 'Items' },
        { key: 'status', header: 'Status' },
        { key: 'createdDate', header: 'Created Date' },
        { key: 'expectedDelivery', header: 'Expected Delivery' },
      ];

      exportToPDF('Pre-Orders Report', exportData, columns, 'pre-orders');
      
      toast({
        title: tCommon('success'),
        description: t('exportedPreOrdersPDF', { count: exportData.length }),
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: tCommon('error'),
        description: t('exportPreOrdersPDFFailed'),
        variant: "destructive",
      });
    }
  };

  // Filter pre-orders based on search query and filters
  let filteredPreOrders = preOrders || [];

  // Apply search filter
  if (searchQuery) {
    filteredPreOrders = fuzzySearch(filteredPreOrders, searchQuery, {
      fields: ['customer.name', 'notes'],
      threshold: 0.2,
      fuzzy: true,
      vietnameseNormalization: true,
    }).map(r => r.item);
  }

  // Apply status filter
  if (statusFilter !== "all") {
    filteredPreOrders = filteredPreOrders.filter(p => p.status === statusFilter);
  }

  // Calculate stats
  const totalPreOrders = preOrders.length;
  const activePreOrders = preOrders.filter(p => p.status === 'pending' || p.status === 'partially_arrived').length;
  const pendingArrival = preOrders.filter(p => p.status === 'pending').length;
  const totalItems = preOrders.reduce((sum: number, p: any) => sum + (p.itemsCount || 0), 0);

  const columns: DataTableColumn<PreOrder>[] = [
    {
      key: "customer",
      header: t('customer'),
      sortable: true,
      sortKey: "customer.name",
      className: "min-w-[200px]",
      cell: (preOrder) => (
        <div className="flex items-center gap-3" onClick={() => setLocation(`/orders/pre-orders/${preOrder.id}`)} role="button" tabIndex={0}>
          <div className="p-2 rounded-lg bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-cyan-950 dark:to-blue-950">
            <ShoppingCart className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
          </div>
          <div>
            <div className="font-semibold text-slate-900 dark:text-slate-100" data-testid={`text-customer-name-${preOrder.id}`}>
              {preOrder.customer?.name || t('unknownCustomer')}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              ID: {preOrder.id.slice(0, 8)}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: "itemsCount",
      header: t('items'),
      sortable: true,
      className: "text-right",
      cell: (preOrder) => (
        <div className="flex items-center justify-end gap-2">
          <Package className="h-4 w-4 text-slate-400" />
          <span className="font-semibold text-slate-900 dark:text-slate-100" data-testid={`text-items-count-${preOrder.id}`}>
            {preOrder.itemsCount}
          </span>
        </div>
      ),
    },
    {
      key: "status",
      header: tCommon('status'),
      sortable: true,
      className: "text-center",
      cell: (preOrder) => {
        const config = statusConfig[preOrder.status as keyof typeof statusConfig] || statusConfig.pending;
        return (
          <Badge 
            variant="outline" 
            className={`${config.className} font-medium px-2.5 py-1`}
            data-testid={`badge-status-${preOrder.id}`}
          >
            {config.label}
          </Badge>
        );
      },
    },
    {
      key: "expectedDate",
      header: t('expectedDate'),
      sortable: true,
      className: "min-w-[120px]",
      cell: (preOrder) => (
        preOrder.expectedDate ? (
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-slate-400" />
            <span className="text-sm text-slate-700 dark:text-slate-300" data-testid={`text-expected-date-${preOrder.id}`}>
              {formatDate(preOrder.expectedDate)}
            </span>
          </div>
        ) : (
          <span className="text-sm text-slate-400">—</span>
        )
      ),
    },
    {
      key: "createdAt",
      header: t('createdDate'),
      sortable: true,
      className: "min-w-[120px]",
      cell: (preOrder) => (
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-slate-400" />
          <span className="text-sm text-slate-700 dark:text-slate-300" data-testid={`text-created-date-${preOrder.id}`}>
            {formatDate(preOrder.createdAt)}
          </span>
        </div>
      ),
    },
    {
      key: "actions",
      header: "",
      className: "w-16 text-center",
      cell: (preOrder) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon"
              className="h-8 w-8 hover:bg-cyan-50 dark:hover:bg-cyan-950"
              data-testid={`button-actions-${preOrder.id}`}
            >
              <MoreVertical className="h-4 w-4 text-slate-600 dark:text-slate-400" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() => setLocation(`/orders/pre-orders/${preOrder.id}`)}
              data-testid={`action-view-${preOrder.id}`}
            >
              <Eye className="h-4 w-4 mr-2" />
              {t('viewDetails')}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setLocation(`/orders/pre-orders/edit/${preOrder.id}`)}
              data-testid={`action-edit-${preOrder.id}`}
            >
              <Edit className="h-4 w-4 mr-2" />
              {tCommon('edit')}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => setDeletePreOrderId(preOrder.id)}
              className="text-red-600 focus:text-red-600"
              data-testid={`action-delete-${preOrder.id}`}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {tCommon('delete')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  // Filter columns based on visibility
  const visibleColumnsFiltered = columns.filter(col => 
    col.key === 'actions' || visibleColumns[col.key] !== false
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[600px]">
        <div className="text-center">
          <div className="relative w-16 h-16 mx-auto mb-6">
            <div className="absolute inset-0 border-4 border-cyan-200 dark:border-cyan-800 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-cyan-600 dark:border-cyan-400 rounded-full border-t-transparent animate-spin"></div>
          </div>
          <p className="text-slate-600 dark:text-slate-400 font-medium">{t('loadingPreOrders')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight" data-testid="heading-pre-orders">
            {t('preOrders')}
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            {t('manageCustomerPreOrders')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" data-testid="button-export">
                <FileDown className="h-4 w-4 mr-2" />
                {tCommon('export')}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleExportXLSX} data-testid="action-export-xlsx">
                <FileDown className="h-4 w-4 mr-2" />
                {tCommon('exportToXLSX')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportPDF} data-testid="action-export-pdf">
                <FileText className="h-4 w-4 mr-2" />
                {tCommon('exportToPDF')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button 
            onClick={() => setLocation('/orders/pre-orders/add')}
            data-testid="button-add-pre-order"
          >
            <Plus className="h-4 w-4 mr-2" />
            {t('addPreOrder')}
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
        {/* Total Pre-Orders */}
        <Card className="border-slate-200 dark:border-slate-800 hover:shadow-lg transition-shadow">
          <CardContent className="p-3 sm:p-4 md:p-6">
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
                  {t('totalPreOrders')}
                </p>
                <p className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-900 dark:text-slate-100 truncate">
                  {totalPreOrders}
                </p>
              </div>
              <div className="flex-shrink-0 p-2 sm:p-2.5 md:p-3 rounded-xl bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-cyan-950 dark:to-blue-950">
                <ShoppingCart className="h-5 w-5 sm:h-6 sm:w-6 md:h-7 md:w-7 text-cyan-600 dark:text-cyan-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Active Pre-Orders */}
        <Card className="border-slate-200 dark:border-slate-800 hover:shadow-lg transition-shadow">
          <CardContent className="p-3 sm:p-4 md:p-6">
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
                  {t('active')}
                </p>
                <p className="text-xl sm:text-2xl md:text-3xl font-bold text-blue-600 dark:text-blue-400 truncate">
                  {activePreOrders}
                </p>
              </div>
              <div className="flex-shrink-0 p-2 sm:p-2.5 md:p-3 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950">
                <Activity className="h-5 w-5 sm:h-6 sm:w-6 md:h-7 md:w-7 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pending Arrival */}
        <Card className="border-slate-200 dark:border-slate-800 hover:shadow-lg transition-shadow">
          <CardContent className="p-3 sm:p-4 md:p-6">
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
                  {t('pendingArrival')}
                </p>
                <p className="text-xl sm:text-2xl md:text-3xl font-bold text-amber-600 dark:text-amber-400 truncate">
                  {pendingArrival}
                </p>
              </div>
              <div className="flex-shrink-0 p-2 sm:p-2.5 md:p-3 rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950 dark:to-orange-950">
                <Clock className="h-5 w-5 sm:h-6 sm:w-6 md:h-7 md:w-7 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Total Items */}
        <Card className="border-slate-200 dark:border-slate-800 hover:shadow-lg transition-shadow">
          <CardContent className="p-3 sm:p-4 md:p-6">
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
                  {t('totalItems')}
                </p>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <p className="text-xl sm:text-2xl md:text-3xl font-bold text-purple-600 dark:text-purple-400 cursor-help truncate">
                        {formatCompactNumber(totalItems)}
                      </p>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="font-mono">{totalItems.toLocaleString()} {t('items')}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <div className="flex-shrink-0 p-2 sm:p-2.5 md:p-3 rounded-xl bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-950 dark:to-indigo-950">
                <Package className="h-5 w-5 sm:h-6 sm:w-6 md:h-7 md:w-7 text-purple-600 dark:text-purple-400" />
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
            <CardTitle className="text-lg">{tCommon('filtersAndSearch')}</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Search */}
            <div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder={t('searchPreOrders')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-10 border-slate-300 dark:border-slate-700 focus:border-cyan-500 dark:focus:border-cyan-500"
                  data-testid="input-search-pre-orders"
                />
              </div>
            </div>

            {/* Status Filter */}
            <div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-10 border-slate-300 dark:border-slate-700 focus:border-cyan-500 dark:focus:border-cyan-500">
                  <SelectValue placeholder={t('filterByStatus')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('allStatuses')}</SelectItem>
                  <SelectItem value="pending">{t('pending')}</SelectItem>
                  <SelectItem value="partially_arrived">{t('partiallyArrived')}</SelectItem>
                  <SelectItem value="fully_arrived">{t('fullyArrived')}</SelectItem>
                  <SelectItem value="cancelled">{t('cancelled')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Active Filters Display */}
          {(searchQuery || statusFilter !== "all") && (
            <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
              <span className="text-sm text-slate-600 dark:text-slate-400">{t('activeFilters')}</span>
              {searchQuery && (
                <Badge variant="secondary" className="text-xs">
                  {tCommon('search')}: {searchQuery}
                </Badge>
              )}
              {statusFilter !== "all" && (
                <Badge variant="secondary" className="text-xs">
                  {tCommon('status')}: {statusFilter}
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Data Table */}
      <Card className="border-slate-200 dark:border-slate-800">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>{t('allPreOrders')}</CardTitle>
            <CardDescription className="mt-1">
              {filteredPreOrders.length} {filteredPreOrders.length === 1 ? t('preOrder') : t('preOrders')} {t('found')}
            </CardDescription>
          </div>
          {/* Column Visibility Menu - Desktop Only */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="h-8 w-8 hidden sm:flex">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>{tCommon('toggleColumns')}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {[
                { key: 'customer', label: t('customer') },
                { key: 'itemsCount', label: t('items') },
                { key: 'status', label: tCommon('status') },
                { key: 'expectedDate', label: t('expectedDate') },
                { key: 'createdAt', label: t('createdDate') },
              ].map((col) => (
                <DropdownMenuItem
                  key={col.key}
                  onClick={() => toggleColumnVisibility(col.key)}
                  className="flex items-center justify-between"
                >
                  <span>{col.label}</span>
                  {visibleColumns[col.key] && (
                    <CheckCircle className="h-4 w-4 text-cyan-600" />
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </CardHeader>
        <CardContent className="p-0 sm:p-6">
          {!filteredPreOrders || filteredPreOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4">
              <ShoppingCart className="h-12 w-12 text-slate-400 mb-4" />
              <p className="text-slate-500 text-center" data-testid="text-no-pre-orders">
                {searchQuery || statusFilter !== "all" 
                  ? t('noPreOrdersMatchFilters')
                  : t('noPreOrdersYetClickAdd')}
              </p>
            </div>
          ) : (
            <>
              {/* Mobile Card View */}
              <div className="sm:hidden space-y-3 p-3">
                {filteredPreOrders.map((preOrder) => {
                  const config = statusConfig[preOrder.status as keyof typeof statusConfig] || statusConfig.pending;
                  return (
                    <div 
                      key={preOrder.id} 
                      className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-4"
                      data-testid={`card-pre-order-${preOrder.id}`}
                    >
                      <div className="space-y-3">
                        {/* Top Row - Pre-Order ID, Date, Status, Actions */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div 
                              className="font-semibold text-slate-900 dark:text-slate-100 cursor-pointer hover:text-cyan-600 dark:hover:text-cyan-400 truncate"
                              onClick={() => setLocation(`/orders/pre-orders/${preOrder.id}`)}
                              data-testid={`text-pre-order-id-${preOrder.id}`}
                            >
                              {preOrder.id.slice(0, 8).toUpperCase()}
                            </div>
                            <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                              <Clock className="h-3 w-3" />
                              {formatDate(preOrder.createdAt)}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <Badge 
                              variant="outline" 
                              className={`${config.className} font-medium text-xs px-2 py-0.5`}
                              data-testid={`badge-status-mobile-${preOrder.id}`}
                            >
                              {config.label}
                            </Badge>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  className="h-8 w-8"
                                  data-testid={`button-actions-mobile-${preOrder.id}`}
                                >
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => setLocation(`/orders/pre-orders/${preOrder.id}`)}
                                  data-testid={`action-view-mobile-${preOrder.id}`}
                                >
                                  <Eye className="h-4 w-4 mr-2" />
                                  {t('viewDetails')}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => setLocation(`/orders/pre-orders/edit/${preOrder.id}`)}
                                  data-testid={`action-edit-mobile-${preOrder.id}`}
                                >
                                  <Edit className="h-4 w-4 mr-2" />
                                  {tCommon('edit')}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => setDeletePreOrderId(preOrder.id)}
                                  className="text-red-600 focus:text-red-600"
                                  data-testid={`action-delete-mobile-${preOrder.id}`}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  {tCommon('delete')}
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>

                        {/* Customer Info */}
                        <div 
                          className="flex items-center gap-2 p-2 bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-cyan-950/30 dark:to-blue-950/30 rounded-lg cursor-pointer hover:shadow-sm transition-shadow"
                          onClick={() => setLocation(`/orders/pre-orders/${preOrder.id}`)}
                        >
                          <div className="p-1.5 rounded bg-white dark:bg-slate-800">
                            <User className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-slate-600 dark:text-slate-400">{t('customer')}</p>
                            <p className="font-semibold text-slate-900 dark:text-slate-100 truncate" data-testid={`text-customer-mobile-${preOrder.id}`}>
                              {preOrder.customer?.name || t('unknownCustomer')}
                            </p>
                          </div>
                        </div>

                        {/* Key Details Grid */}
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div className="bg-slate-50 dark:bg-slate-800/50 p-2 rounded">
                            <div className="flex items-center gap-1 text-xs text-slate-600 dark:text-slate-400 mb-1">
                              <Package className="h-3 w-3" />
                              {t('itemsOrdered')}
                            </div>
                            <p className="font-semibold text-slate-900 dark:text-slate-100" data-testid={`text-items-mobile-${preOrder.id}`}>
                              {preOrder.itemsCount} {preOrder.itemsCount === 1 ? t('item') : t('items')}
                            </p>
                          </div>
                          
                          <div className="bg-slate-50 dark:bg-slate-800/50 p-2 rounded">
                            <div className="flex items-center gap-1 text-xs text-slate-600 dark:text-slate-400 mb-1">
                              <Calendar className="h-3 w-3" />
                              {t('expectedDate')}
                            </div>
                            <p className="font-semibold text-slate-900 dark:text-slate-100" data-testid={`text-expected-mobile-${preOrder.id}`}>
                              {preOrder.expectedDate ? formatDate(preOrder.expectedDate) : t('notSet')}
                            </p>
                          </div>
                        </div>

                        {/* Notes Preview (if any) */}
                        {preOrder.notes && (
                          <div className="text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 p-2 rounded border-l-2 border-slate-300 dark:border-slate-600">
                            <div className="flex items-center gap-1 mb-1">
                              <FileText className="h-3 w-3" />
                              <span className="font-medium">{tCommon('notes')}:</span>
                            </div>
                            <p className="line-clamp-2">{preOrder.notes}</p>
                          </div>
                        )}

                        {/* Quick Actions */}
                        <div className="flex gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1"
                            onClick={() => setLocation(`/orders/pre-orders/${preOrder.id}`)}
                            data-testid={`button-view-mobile-${preOrder.id}`}
                          >
                            <Eye className="h-3.5 w-3.5 mr-1.5" />
                            {tCommon('view')}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1"
                            onClick={() => setLocation(`/orders/pre-orders/edit/${preOrder.id}`)}
                            data-testid={`button-edit-mobile-${preOrder.id}`}
                          >
                            <Edit className="h-3.5 w-3.5 mr-1.5" />
                            {tCommon('edit')}
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop Table View */}
              <div className="hidden sm:block">
                <DataTable
                  data={filteredPreOrders}
                  columns={visibleColumnsFiltered}
                  getRowKey={(preOrder) => preOrder.id}
                  showPagination={true}
                  defaultItemsPerPage={20}
                  itemsPerPageOptions={[10, 20, 50, 100]}
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!deletePreOrderId} onOpenChange={() => setDeletePreOrderId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('deletePreOrderTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('deletePreOrderConfirm')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">
              {tCommon('cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletePreOrderId && deletePreOrderMutation.mutate(deletePreOrderId)}
              className="bg-red-600 hover:bg-red-700"
              data-testid="button-confirm-delete"
            >
              {tCommon('delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
