import { useState, useEffect, useMemo } from "react";
import { Link, useLocation } from "wouter";
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { DataTable, DataTableColumn } from "@/components/ui/data-table";
import { fuzzySearch } from "@/lib/fuzzySearch";
import { formatCompactNumber } from "@/lib/currencyUtils";
import { useSettings } from "@/contexts/SettingsContext";
import { Plus, Package, PackageX, RefreshCw, Search, Eye, Filter, Clock, CheckCircle, MoreVertical, FileDown, Download, Check, FileText } from "lucide-react";
import { format } from "date-fns";
import { exportToXLSX, exportToPDF, type PDFColumn } from "@/lib/exportUtils";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

export default function AllReturns() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { t } = useTranslation(['inventory', 'common']);
  const { inventorySettings } = useSettings();
  const [searchQuery, setSearchQuery] = useState("");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedReturns, setSelectedReturns] = useState<any[]>([]);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  
  const returnTypeDisplayMap = useMemo(() => {
    const types = inventorySettings.returnTypes || [];
    const map: Record<string, { label: string; color: string }> = {};
    const colors = [
      'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300',
      'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300',
      'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300',
      'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
      'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300',
      'bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-300',
    ];
    types.forEach((rt, index) => {
      map[rt.value] = {
        label: t(`inventory:${rt.labelKey}`),
        color: colors[index % colors.length]
      };
    });
    return map;
  }, [inventorySettings.returnTypes, t]);

  // Column visibility state with localStorage persistence
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>(() => {
    const saved = localStorage.getItem('returnsVisibleColumns');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return {};
      }
    }
    return {
      customer: true,
      orderNumber: true,
      reason: true,
      status: true,
      total: true,
      returnId: true,
    };
  });

  // Toggle column visibility
  const toggleColumnVisibility = (columnKey: string) => {
    const newVisibility = { ...visibleColumns, [columnKey]: !visibleColumns[columnKey] };
    setVisibleColumns(newVisibility);
    localStorage.setItem('returnsVisibleColumns', JSON.stringify(newVisibility));
  };

  const { data: returns = [], isLoading, error } = useQuery<any[]>({
    queryKey: ['/api/returns'],
    retry: false,
  });

  useEffect(() => {
    if (error) {
      toast({
        title: t('common:error'),
        description: t('inventory:failedToLoadReturns'),
        variant: "destructive",
      });
    }
  }, [error, toast]);

  const deleteReturnMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      await Promise.all(ids.map(id => apiRequest('DELETE', `/api/returns/${id}`)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/returns'] });
      toast({
        title: t('common:success'),
        description: t('inventory:deletedReturnsSuccessfully', { count: selectedReturns.length }),
      });
      setSelectedReturns([]);
    },
    onError: (error: any) => {
      console.error("Return delete error:", error);
      const errorMessage = error.message || t('inventory:failedToDeleteReturns');
      toast({
        title: t('common:error'),
        description: errorMessage.includes('referenced') || errorMessage.includes('constraint')
          ? t('inventory:cannotDeleteReturnInUse')
          : errorMessage,
        variant: "destructive",
      });
    },
  });

  // Filter returns based on search query
  const filteredReturns = searchQuery
    ? fuzzySearch(returns || [], searchQuery, {
        fields: ['returnId', 'customer.name', 'orderId', 'notes'],
        threshold: 0.2,
        fuzzy: true,
        vietnameseNormalization: true,
      }).map(r => r.item)
    : returns;

  // Calculate stats
  const totalReturns = returns?.length || 0;
  const pendingReturns = returns?.filter((r: any) => r.status === 'awaiting').length || 0;
  const processingReturns = returns?.filter((r: any) => r.status === 'processing').length || 0;
  const completedReturns = returns?.filter((r: any) => r.status === 'completed').length || 0;

  // Define table columns
  const columns: DataTableColumn<any>[] = [
    {
      key: "returnId",
      header: t('inventory:returnId'),
      sortable: true,
      cell: (returnItem) => (
        <Link href={`/returns/${returnItem.id}`}>
          <span className="font-mono text-sm text-cyan-600 hover:text-cyan-800 cursor-pointer">
            {returnItem.returnId || returnItem.id}
          </span>
        </Link>
      ),
    },
    {
      key: "customer",
      header: t('inventory:customerName'),
      sortable: true,
      cell: (returnItem) => (
        <div className="flex flex-col">
          {returnItem.customer ? (
            <>
              <Link href={`/returns/${returnItem.id}`}>
                <span className="text-cyan-600 hover:text-cyan-800 cursor-pointer">
                  {returnItem.customer.name}
                </span>
              </Link>
              {returnItem.customer.fbName && (
                <span className="text-xs text-slate-500">{returnItem.customer.fbName}</span>
              )}
            </>
          ) : (
            <span className="text-slate-400">-</span>
          )}
        </div>
      ),
    },
    {
      key: "orderNumber",
      header: t('inventory:orderNumber'),
      sortable: true,
      cell: (returnItem) => (
        <span className="font-mono text-sm text-slate-700 dark:text-slate-300">
          {returnItem.orderId || '-'}
        </span>
      ),
    },
    {
      key: "reason",
      header: t('inventory:reason'),
      sortable: false,
      cell: (returnItem) => (
        <div className="max-w-[175px]">
          <span className="text-sm text-slate-700 dark:text-slate-300 break-words line-clamp-2">
            {returnItem.notes || '-'}
          </span>
        </div>
      ),
    },
    {
      key: "returnDate",
      header: t('inventory:returnDate'),
      sortable: true,
      cell: (returnItem) => format(new Date(returnItem.returnDate), 'dd MMM yyyy'),
    },
    {
      key: "returnType",
      header: t('inventory:returnType'),
      sortable: true,
      cell: (returnItem) => {
        const typeMap: Record<string, { label: string; color: string }> = {
          'exchange': { label: t('inventory:exchange'), color: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300' },
          'refund': { label: t('inventory:refund'), color: 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300' },
          'store_credit': { label: t('inventory:storeCredit'), color: 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300' },
        };
        const type = typeMap[returnItem.returnType] || { label: returnItem.returnType, color: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300' };
        return <Badge className={type.color}>{type.label}</Badge>;
      },
    },
    {
      key: "status",
      header: t('inventory:status'),
      cell: (returnItem) => {
        const statusMap: Record<string, { label: string; color: string }> = {
          'awaiting': { label: t('inventory:awaiting'), color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-300' },
          'processing': { label: t('inventory:processing'), color: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300' },
          'completed': { label: t('inventory:completed'), color: 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300' },
          'cancelled': { label: t('inventory:cancelled'), color: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300' },
        };
        const status = statusMap[returnItem.status] || { label: returnItem.status, color: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300' };
        return <Badge className={status.color}>{status.label}</Badge>;
      },
    },
    {
      key: "total",
      header: t('inventory:total'),
      sortable: true,
      cell: (returnItem) => (
        <span className="font-semibold text-slate-900 dark:text-slate-100">
          {returnItem.total ? `$${returnItem.total.toFixed(2)}` : '-'}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      className: "w-16 text-center",
      cell: (returnItem) => (
        <div className="flex gap-2 justify-end">
          <Link href={`/returns/${returnItem.id}/edit`}>
            <Button variant="ghost" size="sm">
              {t('common:edit')}
            </Button>
          </Link>
          <Link href={`/returns/${returnItem.id}`}>
            <Button variant="ghost" size="sm">
              <Eye className="h-4 w-4" />
            </Button>
          </Link>
        </div>
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
      label: t('inventory:deleteSelected'),
      action: (selectedItems: any[]) => {
        setSelectedReturns(selectedItems);
        setShowDeleteDialog(true);
      },
      variant: "destructive" as const,
    },
  ];

  const handleDeleteConfirm = () => {
    deleteReturnMutation.mutate(selectedReturns.map(r => r.id));
    setShowDeleteDialog(false);
  };

  const handleExportXLSX = () => {
    try {
      const exportData = filteredReturns.map((returnItem: any) => {
        const statusMap: Record<string, string> = {
          'awaiting': t('inventory:awaiting'),
          'processing': t('inventory:processing'),
          'completed': t('inventory:completed'),
          'cancelled': t('inventory:cancelled'),
        };

        return {
          [t('inventory:returnId')]: returnItem.returnId || returnItem.id,
          [t('inventory:customer')]: returnItem.customer?.name || '-',
          [t('inventory:orderId')]: returnItem.orderId || '-',
          [t('inventory:itemsCount')]: returnItem.items?.length || 0,
          [t('inventory:totalRefund')]: returnItem.total ? `$${returnItem.total.toFixed(2)}` : '-',
          [t('inventory:status')]: statusMap[returnItem.status] || returnItem.status,
          [t('inventory:returnType')]: returnTypeDisplayMap[returnItem.returnType]?.label || returnItem.returnType,
          [t('inventory:date')]: format(new Date(returnItem.returnDate), 'dd MMM yyyy'),
          [t('inventory:reason')]: returnItem.notes || '-',
        };
      });

      exportToXLSX(exportData, 'returns', 'Returns');
      
      toast({
        title: t('common:success'),
        description: t('inventory:exportedReturnsToXLSX', { count: exportData.length }),
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: t('common:error'),
        description: t('inventory:failedToExportReturnsToXLSX'),
        variant: "destructive",
      });
    }
  };

  const handleExportPDF = () => {
    try {
      const statusMap: Record<string, string> = {
        'awaiting': t('inventory:awaiting'),
        'processing': t('inventory:processing'),
        'completed': t('inventory:completed'),
        'cancelled': t('inventory:cancelled'),
      };

      const exportData = filteredReturns.map((returnItem: any) => ({
        returnId: returnItem.returnId || returnItem.id,
        customer: returnItem.customer?.name || '-',
        orderId: returnItem.orderId || '-',
        itemsCount: returnItem.items?.length || 0,
        total: returnItem.total ? `$${returnItem.total.toFixed(2)}` : '-',
        status: statusMap[returnItem.status] || returnItem.status,
        returnType: returnTypeDisplayMap[returnItem.returnType]?.label || returnItem.returnType,
        date: format(new Date(returnItem.returnDate), 'dd MMM yyyy'),
        reason: returnItem.notes || '-',
      }));

      const columns: PDFColumn[] = [
        { key: 'returnId', header: t('inventory:returnId') },
        { key: 'customer', header: t('inventory:customer') },
        { key: 'orderId', header: t('inventory:orderId') },
        { key: 'itemsCount', header: t('inventory:itemsCount') },
        { key: 'total', header: t('inventory:totalRefund') },
        { key: 'status', header: t('inventory:status') },
        { key: 'returnType', header: t('inventory:returnType') },
        { key: 'date', header: t('inventory:date') },
        { key: 'reason', header: t('inventory:reason') },
      ];

      exportToPDF(t('inventory:returnsReport'), exportData, columns, 'returns');
      
      toast({
        title: t('common:success'),
        description: t('inventory:exportedReturnsToPDF', { count: exportData.length }),
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: t('common:error'),
        description: t('inventory:failedToExportReturnsToPDF'),
        variant: "destructive",
      });
    }
  };

  const handleExportComprehensiveXLSX = () => {
    try {
      const statusMap: Record<string, string> = {
        'awaiting': t('inventory:awaiting'),
        'processing': t('inventory:processing'),
        'completed': t('inventory:completed'),
        'cancelled': t('inventory:cancelled'),
      };

      const typeMap: Record<string, string> = {
        'exchange': t('inventory:exchange'),
        'refund': t('inventory:refund'),
        'store_credit': t('inventory:storeCredit'),
      };

      const exportData = filteredReturns.map((returnItem: any) => {
        const items = returnItem.items || [];
        const itemsString = items.map((item: any) => 
          `${item.product?.name || item.productName || 'Unknown'} x${item.quantity}`
        ).join('; ');

        return {
          [t('inventory:returnId')]: returnItem.returnId || returnItem.id,
          [t('inventory:orderId')]: returnItem.orderId || '-',
          [t('inventory:customer')]: returnItem.customer?.name || '-',
          [t('inventory:customerEmail')]: returnItem.customer?.email || '-',
          [t('inventory:customerPhone')]: returnItem.customer?.phone || '-',
          [t('inventory:returnDate')]: returnItem.returnDate ? format(new Date(returnItem.returnDate), 'yyyy-MM-dd') : '-',
          [t('inventory:status')]: statusMap[returnItem.status] || returnItem.status,
          [t('inventory:returnType')]: typeMap[returnItem.returnType] || returnItem.returnType,
          [t('inventory:reason')]: returnItem.notes || '-',
          [t('inventory:itemsLabel')]: itemsString || '-',
          [t('inventory:itemsCount')]: items.length,
          [t('inventory:refundAmount')]: returnItem.total ?? 0,
          [t('inventory:currency')]: returnItem.currency || 'EUR',
        };
      });

      exportToXLSX(exportData, 'returns_export', t('inventory:returnsReport'));
      
      toast({
        title: t('common:success'),
        description: t('inventory:exportedReturnsToXLSX', { count: exportData.length }),
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: t('common:error'),
        description: t('inventory:failedToExportReturnsToXLSX'),
        variant: "destructive",
      });
    }
  };

  const handleDownloadTemplate = () => {
    const templateData = [
      {
        'Return ID': 'RET-001',
        'Order ID': 'ORD-001',
        'Customer Name': 'John Doe',
        'Customer Email': 'john@example.com',
        'Customer Phone': '+420123456789',
        'Return Date': '2024-12-18',
        'Status': 'awaiting',
        'Return Type': 'refund',
        'Reason': 'Product damaged during shipping',
        'Items': 'Product A x2; Product B x1',
        'Items Count': '3',
        'Refund Amount': '150.00',
        'Currency': 'EUR',
      },
      {
        'Return ID': 'RET-002',
        'Order ID': 'ORD-002',
        'Customer Name': 'Jane Smith',
        'Customer Email': 'jane@example.com',
        'Customer Phone': '+420987654321',
        'Return Date': '2024-12-19',
        'Status': 'processing',
        'Return Type': 'exchange',
        'Reason': 'Wrong size ordered',
        'Items': 'Acrylic Powder x1',
        'Items Count': '1',
        'Refund Amount': '45.00',
        'Currency': 'CZK',
      }
    ];
    exportToXLSX(templateData, 'returns_import_template', t('inventory:returnsImportTemplate'));
    toast({
      title: t('common:success'),
      description: t('inventory:templateDownloaded'),
    });
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
        toast({
          title: t('common:error'),
          description: t('inventory:invalidReturnFileType'),
          variant: "destructive",
        });
        return;
      }
      setImportFile(file);
    }
  };

  const handleImport = async () => {
    if (!importFile) {
      toast({
        title: t('common:error'),
        description: t('inventory:noReturnFileSelected'),
        variant: "destructive",
      });
      return;
    }

    setIsImporting(true);
    try {
      const formData = new FormData();
      formData.append('file', importFile);

      const response = await fetch('/api/returns/import', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || t('inventory:importReturnsFailed'));
      }

      const result = await response.json();
      
      toast({
        title: t('common:success'),
        description: t('inventory:importReturnsSuccess', { count: result.imported || 0 }),
      });
      
      queryClient.invalidateQueries({ queryKey: ['/api/returns'] });
      setShowImportDialog(false);
      setImportFile(null);
    } catch (error: any) {
      console.error('Import error:', error);
      toast({
        title: t('common:error'),
        description: error.message || t('inventory:importReturnsFailed'),
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[600px]">
        <div className="text-center">
          <div className="relative w-16 h-16 mx-auto mb-6">
            <div className="absolute inset-0 border-4 border-cyan-200 dark:border-cyan-800 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-cyan-600 dark:border-cyan-400 rounded-full border-t-transparent animate-spin"></div>
          </div>
          <p className="text-slate-600 dark:text-slate-400 font-medium">{t('inventory:loadingInventory')}</p>
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
            {t('inventory:returns')}
          </h1>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 mt-1">
            {t('inventory:manageProductsDescription')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Import/Export Menu - Three Dot Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="outline" 
                size="icon"
                data-testid="button-import-export-menu"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>{t('inventory:importExport')}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setShowImportDialog(true)} data-testid="menu-import-xlsx">
                <Download className="h-4 w-4 mr-2" />
                {t('inventory:importFromExcel')}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleExportComprehensiveXLSX} data-testid="menu-export-xlsx">
                <FileDown className="h-4 w-4 mr-2" />
                {t('inventory:exportToExcel')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportPDF} data-testid="menu-export-pdf">
                <FileText className="h-4 w-4 mr-2" />
                {t('inventory:exportToPDF')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          {/* Add Return Button */}
          <Link href="/returns/add">
            <Button data-testid="button-add-return" className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">{t('inventory:addReturn')}</span>
              <span className="inline sm:hidden">{t('common:add')}</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
        {/* Total Returns */}
        <Card className="border-slate-200 dark:border-slate-800 hover:shadow-lg transition-shadow">
          <CardContent className="p-3 sm:p-4 md:p-6">
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
                  {t('inventory:totalReturns')}
                </p>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <p className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-900 dark:text-slate-100 truncate cursor-help">
                        {formatCompactNumber(totalReturns)}
                      </p>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="font-mono">{t('inventory:returnsCount', { count: totalReturns })}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <div className="flex-shrink-0 p-2 sm:p-2.5 md:p-3 rounded-xl bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-cyan-950 dark:to-blue-950">
                <Package className="h-5 w-5 sm:h-6 sm:w-6 md:h-7 md:w-7 text-cyan-600 dark:text-cyan-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pending Returns */}
        <Card className="border-slate-200 dark:border-slate-800 hover:shadow-lg transition-shadow">
          <CardContent className="p-3 sm:p-4 md:p-6">
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
                  {t('inventory:pending')}
                </p>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <p className="text-xl sm:text-2xl md:text-3xl font-bold text-amber-600 dark:text-amber-400 truncate cursor-help">
                        {formatCompactNumber(pendingReturns)}
                      </p>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="font-mono">{t('inventory:awaitingReturnsCount', { count: pendingReturns })}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <div className="flex-shrink-0 p-2 sm:p-2.5 md:p-3 rounded-xl bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-950 dark:to-yellow-950">
                <Clock className="h-5 w-5 sm:h-6 sm:w-6 md:h-7 md:w-7 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Processing Returns */}
        <Card className="border-slate-200 dark:border-slate-800 hover:shadow-lg transition-shadow">
          <CardContent className="p-3 sm:p-4 md:p-6">
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
                  {t('inventory:processing')}
                </p>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <p className="text-xl sm:text-2xl md:text-3xl font-bold text-blue-600 dark:text-blue-400 truncate cursor-help">
                        {formatCompactNumber(processingReturns)}
                      </p>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="font-mono">{t('inventory:inProcessingCount', { count: processingReturns })}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <div className="flex-shrink-0 p-2 sm:p-2.5 md:p-3 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950">
                <RefreshCw className="h-5 w-5 sm:h-6 sm:w-6 md:h-7 md:w-7 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Completed Returns */}
        <Card className="border-slate-200 dark:border-slate-800 hover:shadow-lg transition-shadow">
          <CardContent className="p-3 sm:p-4 md:p-6">
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
                  {t('inventory:completed')}
                </p>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <p className="text-xl sm:text-2xl md:text-3xl font-bold text-emerald-600 dark:text-emerald-400 truncate cursor-help">
                        {formatCompactNumber(completedReturns)}
                      </p>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="font-mono">{t('inventory:completedCount', { count: completedReturns })}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <div className="flex-shrink-0 p-2 sm:p-2.5 md:p-3 rounded-xl bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-950 dark:to-green-950">
                <CheckCircle className="h-5 w-5 sm:h-6 sm:w-6 md:h-7 md:w-7 text-emerald-600 dark:text-emerald-400" />
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
            <CardTitle className="text-lg">{t('inventory:filtersAndSearch')}</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder={t('inventory:searchReturnsByIdCustomer')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-10 pl-10 border-slate-200 dark:border-slate-800 focus:border-cyan-500"
                data-testid="input-search-returns"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Returns Table */}
      <Card className="border-slate-200 dark:border-slate-800">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">{t('inventory:allReturns')} ({filteredReturns?.length || 0})</CardTitle>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>{t('inventory:toggleColumns')}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {columns
                  .filter(col => col.key !== 'actions')
                  .map((col) => (
                    <DropdownMenuItem
                      key={col.key}
                      onClick={() => toggleColumnVisibility(col.key)}
                      className="flex items-center justify-between"
                    >
                      <span>{col.header}</span>
                      {visibleColumns[col.key] !== false && (
                        <span className="ml-2">✓</span>
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
            {filteredReturns?.map((returnItem: any) => {
              const statusMap: Record<string, { label: string; color: string }> = {
                'awaiting': { label: t('inventory:awaiting'), color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-300' },
                'processing': { label: t('inventory:processing'), color: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300' },
                'completed': { label: t('inventory:completed'), color: 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300' },
                'cancelled': { label: t('inventory:cancelled'), color: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300' },
              };
              const status = statusMap[returnItem.status] || { label: returnItem.status, color: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300' };

              const returnType = returnTypeDisplayMap[returnItem.returnType] || { label: returnItem.returnType, color: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300' };

              return (
                <div key={returnItem.id} className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800 p-4">
                  <div className="space-y-3">
                    {/* Top Row - Return ID, Date, Status */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <Link href={`/returns/${returnItem.id}`}>
                          <p className="font-mono text-sm font-semibold text-cyan-600 dark:text-cyan-400 hover:text-cyan-800 dark:hover:text-cyan-300 cursor-pointer">
                            {returnItem.returnId || returnItem.id}
                          </p>
                        </Link>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          {format(new Date(returnItem.returnDate), 'dd MMM yyyy')}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Badge className={status.color}>{status.label}</Badge>
                      </div>
                    </div>

                    {/* Customer & Order Reference */}
                    <div className="space-y-1">
                      {returnItem.customer ? (
                        <div>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{t('inventory:customer')}</p>
                          <Link href={`/returns/${returnItem.id}`}>
                            <p className="font-medium text-slate-900 dark:text-slate-100 hover:text-cyan-600 dark:hover:text-cyan-400 cursor-pointer">
                              {returnItem.customer.name}
                            </p>
                          </Link>
                          {returnItem.customer.fbName && (
                            <p className="text-xs text-slate-500 dark:text-slate-400">{returnItem.customer.fbName}</p>
                          )}
                        </div>
                      ) : (
                        <p className="text-sm text-slate-400">{t('inventory:noCustomerInformation')}</p>
                      )}
                    </div>

                    {/* Grid - Order Reference & Return Type */}
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{t('inventory:orderNumber')}</p>
                        <p className="font-mono text-sm font-medium text-slate-900 dark:text-slate-100">
                          {returnItem.orderId || '-'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{t('inventory:returnType')}</p>
                        <Badge className={returnType.color}>{returnType.label}</Badge>
                      </div>
                    </div>

                    {/* Return Reason */}
                    {returnItem.notes && (
                      <div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{t('inventory:reason')}</p>
                        <p className="text-sm text-slate-700 dark:text-slate-300 line-clamp-2">
                          {returnItem.notes}
                        </p>
                      </div>
                    )}

                    {/* Grid - Items & Total */}
                    <div className="grid grid-cols-2 gap-4 text-sm pt-2 border-t border-slate-200 dark:border-slate-700">
                      <div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{t('inventory:itemsReturned')}</p>
                        <p className="font-medium text-slate-900 dark:text-slate-100">
                          {t('inventory:itemsCount', { count: returnItem.items?.length || 0 })}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{t('inventory:totalRefund')}</p>
                        <p className="text-lg font-bold text-slate-900 dark:text-slate-100">
                          {returnItem.total ? `$${returnItem.total.toFixed(2)}` : '-'}
                        </p>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2 pt-2">
                      <Link href={`/returns/${returnItem.id}`} className="flex-1">
                        <Button variant="outline" size="sm" className="w-full" data-testid={`button-view-return-${returnItem.id}`}>
                          <Eye className="h-4 w-4 mr-2" />
                          {t('common:view')}
                        </Button>
                      </Link>
                      <Link href={`/returns/${returnItem.id}/edit`} className="flex-1">
                        <Button variant="default" size="sm" className="w-full" data-testid={`button-process-return-${returnItem.id}`}>
                          <RefreshCw className="h-4 w-4 mr-2" />
                          {t('inventory:processing')}
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop Table View */}
          <div className="hidden sm:block">
            <DataTable
              data={filteredReturns}
              columns={visibleColumnsFiltered}
              bulkActions={bulkActions}
              getRowKey={(returnItem) => returnItem.id}
              itemsPerPageOptions={[10, 20, 50, 100]}
              defaultItemsPerPage={20}
              renderBulkActions={({ selectedRows, selectedItems, bulkActions: actions }) => (
                <div className="px-4 sm:px-0 pb-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      {selectedRows.size > 0 && (
                        <>
                          <Badge variant="secondary" className="text-xs h-6 px-2">
                            {selectedRows.size}
                          </Badge>
                          {actions.map((action, index) => {
                            if (action.type === "button") {
                              return (
                                <Button
                                  key={index}
                                  size="sm"
                                  variant={action.variant || "ghost"}
                                  onClick={() => action.action(selectedItems)}
                                  className="h-6 px-2 text-xs"
                                >
                                  {action.label}
                                </Button>
                              );
                            }
                            return null;
                          })}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}
            />
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('inventory:areYouSure')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('inventory:deleteThisReturn')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common:cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm}>{t('common:delete')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Import Returns Dialog */}
      <Dialog open={showImportDialog} onOpenChange={(open) => {
        setShowImportDialog(open);
        if (!open) {
          setImportFile(null);
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('inventory:importReturns')}</DialogTitle>
            <DialogDescription>
              {t('inventory:importReturnsDescription')}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Template Download Section */}
            <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex items-start gap-3">
                <FileDown className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                    {t('inventory:downloadTemplateFirst')}
                  </p>
                  <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                    {t('inventory:returnTemplateDescription')}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDownloadTemplate}
                    className="mt-3"
                    data-testid="button-download-template"
                  >
                    <FileDown className="h-4 w-4 mr-2" />
                    {t('inventory:downloadTemplate')}
                  </Button>
                </div>
              </div>
            </div>

            {/* File Upload Section */}
            <div className="space-y-2">
              <Label htmlFor="import-file">{t('inventory:selectReturnFile')}</Label>
              <Input
                id="import-file"
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileSelect}
                className="cursor-pointer"
                data-testid="input-import-file"
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
              data-testid="button-cancel-import"
            >
              {t('common:cancel')}
            </Button>
            <Button
              onClick={handleImport}
              disabled={!importFile || isImporting}
              data-testid="button-confirm-import"
            >
              {isImporting ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  {t('common:processing')}
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  {t('inventory:importReturns')}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
