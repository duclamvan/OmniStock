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
import { fuzzySearch } from "@/lib/fuzzySearch";
import { formatCompactNumber } from "@/lib/currencyUtils";
import { Plus, Package, PackageX, RefreshCw, Search, Eye, Filter, Clock, CheckCircle, MoreVertical, FileDown } from "lucide-react";
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

export default function AllReturns() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedReturns, setSelectedReturns] = useState<any[]>([]);

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
        title: "Error",
        description: "Failed to load returns. Please try again.",
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
        title: "Success",
        description: `Deleted ${selectedReturns.length} return(s) successfully`,
      });
      setSelectedReturns([]);
    },
    onError: (error: any) => {
      console.error("Return delete error:", error);
      const errorMessage = error.message || "Failed to delete returns";
      toast({
        title: "Error",
        description: errorMessage.includes('referenced') || errorMessage.includes('constraint')
          ? "Cannot delete return - it's being used in existing records" 
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
      header: "Return ID",
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
      header: "Customer Name",
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
      header: "Order Number",
      sortable: true,
      cell: (returnItem) => (
        <span className="font-mono text-sm text-slate-700 dark:text-slate-300">
          {returnItem.orderId || '-'}
        </span>
      ),
    },
    {
      key: "reason",
      header: "Reason",
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
      header: "Return Date",
      sortable: true,
      cell: (returnItem) => format(new Date(returnItem.returnDate), 'dd MMM yyyy'),
    },
    {
      key: "returnType",
      header: "Return Type",
      sortable: true,
      cell: (returnItem) => {
        const typeMap: Record<string, { label: string; color: string }> = {
          'exchange': { label: 'Exchange', color: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300' },
          'refund': { label: 'Refund', color: 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300' },
          'store_credit': { label: 'Store Credit', color: 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300' },
        };
        const type = typeMap[returnItem.returnType] || { label: returnItem.returnType, color: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300' };
        return <Badge className={type.color}>{type.label}</Badge>;
      },
    },
    {
      key: "status",
      header: "Status",
      cell: (returnItem) => {
        const statusMap: Record<string, { label: string; color: string }> = {
          'awaiting': { label: 'Awaiting', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-300' },
          'processing': { label: 'Processing', color: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300' },
          'completed': { label: 'Completed', color: 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300' },
          'cancelled': { label: 'Cancelled', color: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300' },
        };
        const status = statusMap[returnItem.status] || { label: returnItem.status, color: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300' };
        return <Badge className={status.color}>{status.label}</Badge>;
      },
    },
    {
      key: "total",
      header: "Total",
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
              Edit
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
      label: "Delete Selected",
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
          'awaiting': 'Awaiting',
          'processing': 'Processing',
          'completed': 'Completed',
          'cancelled': 'Cancelled',
        };

        const returnTypeMap: Record<string, string> = {
          'exchange': 'Exchange',
          'refund': 'Refund',
          'store_credit': 'Store Credit',
        };

        return {
          'Return ID': returnItem.returnId || returnItem.id,
          'Customer': returnItem.customer?.name || '-',
          'Order ID': returnItem.orderId || '-',
          'Items Count': returnItem.items?.length || 0,
          'Total Refund': returnItem.total ? `$${returnItem.total.toFixed(2)}` : '-',
          'Status': statusMap[returnItem.status] || returnItem.status,
          'Return Type': returnTypeMap[returnItem.returnType] || returnItem.returnType,
          'Date': format(new Date(returnItem.returnDate), 'dd MMM yyyy'),
          'Reason': returnItem.notes || '-',
        };
      });

      exportToXLSX(exportData, 'returns', 'Returns');
      
      toast({
        title: "Success",
        description: `Exported ${exportData.length} returns to XLSX`,
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Error",
        description: "Failed to export returns to XLSX",
        variant: "destructive",
      });
    }
  };

  const handleExportPDF = () => {
    try {
      const statusMap: Record<string, string> = {
        'awaiting': 'Awaiting',
        'processing': 'Processing',
        'completed': 'Completed',
        'cancelled': 'Cancelled',
      };

      const returnTypeMap: Record<string, string> = {
        'exchange': 'Exchange',
        'refund': 'Refund',
        'store_credit': 'Store Credit',
      };

      const exportData = filteredReturns.map((returnItem: any) => ({
        returnId: returnItem.returnId || returnItem.id,
        customer: returnItem.customer?.name || '-',
        orderId: returnItem.orderId || '-',
        itemsCount: returnItem.items?.length || 0,
        total: returnItem.total ? `$${returnItem.total.toFixed(2)}` : '-',
        status: statusMap[returnItem.status] || returnItem.status,
        returnType: returnTypeMap[returnItem.returnType] || returnItem.returnType,
        date: format(new Date(returnItem.returnDate), 'dd MMM yyyy'),
        reason: returnItem.notes || '-',
      }));

      const columns: PDFColumn[] = [
        { key: 'returnId', header: 'Return ID' },
        { key: 'customer', header: 'Customer' },
        { key: 'orderId', header: 'Order ID' },
        { key: 'itemsCount', header: 'Items Count' },
        { key: 'total', header: 'Total Refund' },
        { key: 'status', header: 'Status' },
        { key: 'returnType', header: 'Return Type' },
        { key: 'date', header: 'Date' },
        { key: 'reason', header: 'Reason' },
      ];

      exportToPDF('Returns Report', exportData, columns, 'returns');
      
      toast({
        title: "Success",
        description: `Exported ${exportData.length} returns to PDF`,
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Error",
        description: "Failed to export returns to PDF",
        variant: "destructive",
      });
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
          <p className="text-slate-600 dark:text-slate-400 font-medium">Loading returns...</p>
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
            Returns Management
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Process customer returns and manage refunds
          </p>
        </div>
        <div className="flex gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" data-testid="button-export-returns">
                <FileDown className="mr-2 h-4 w-4" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Export Options</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleExportXLSX} data-testid="button-export-xlsx">
                <FileDown className="mr-2 h-4 w-4" />
                Export to XLSX
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportPDF} data-testid="button-export-pdf">
                <FileDown className="mr-2 h-4 w-4" />
                Export to PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Link href="/returns/add">
            <Button data-testid="button-add-return">
              <Plus className="mr-2 h-4 w-4" />
              Add Return
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Returns */}
        <Card className="border-slate-200 dark:border-slate-800 hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Total Returns
                </p>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <p className="text-3xl font-bold text-slate-900 dark:text-slate-100 truncate cursor-help">
                        {formatCompactNumber(totalReturns)}
                      </p>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="font-mono">{totalReturns.toLocaleString()} returns</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <div className="flex-shrink-0 p-3 rounded-xl bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-cyan-950 dark:to-blue-950">
                <Package className="h-7 w-7 text-cyan-600 dark:text-cyan-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pending Returns */}
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
                      <p className="text-3xl font-bold text-amber-600 dark:text-amber-400 truncate cursor-help">
                        {formatCompactNumber(pendingReturns)}
                      </p>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="font-mono">{pendingReturns.toLocaleString()} awaiting returns</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <div className="flex-shrink-0 p-3 rounded-xl bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-950 dark:to-yellow-950">
                <Clock className="h-7 w-7 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Processing Returns */}
        <Card className="border-slate-200 dark:border-slate-800 hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Processing
                </p>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <p className="text-3xl font-bold text-blue-600 dark:text-blue-400 truncate cursor-help">
                        {formatCompactNumber(processingReturns)}
                      </p>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="font-mono">{processingReturns.toLocaleString()} in processing</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <div className="flex-shrink-0 p-3 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950">
                <RefreshCw className="h-7 w-7 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Completed Returns */}
        <Card className="border-slate-200 dark:border-slate-800 hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Completed
                </p>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400 truncate cursor-help">
                        {formatCompactNumber(completedReturns)}
                      </p>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="font-mono">{completedReturns.toLocaleString()} completed</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <div className="flex-shrink-0 p-3 rounded-xl bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-950 dark:to-green-950">
                <CheckCircle className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
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
          <div className="grid grid-cols-1 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search returns by ID, customer, order, or notes..."
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
            <CardTitle className="text-lg">All Returns ({filteredReturns?.length || 0})</CardTitle>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Toggle Columns</DropdownMenuLabel>
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
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {selectedReturns.length} return(s). This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
