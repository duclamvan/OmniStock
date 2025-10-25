import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { DataTable, DataTableColumn } from "@/components/ui/data-table";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { fuzzySearch } from "@/lib/fuzzySearch";
import { formatCurrency, formatCompactNumber } from "@/lib/currencyUtils";
import { format } from "date-fns";
import { Plus, Search, Edit, Trash2, Tag, Calendar, Percent, Filter, MoreVertical, TrendingDown, DollarSign, Check } from "lucide-react";
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

export default function AllDiscounts() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedSales, setSelectedSales] = useState<any[]>([]);

  // Column visibility state with localStorage persistence
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>(() => {
    const saved = localStorage.getItem('discountsVisibleColumns');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return {};
      }
    }
    return {
      code: true,
      name: true,
      type: true,
      value: true,
      scope: true,
      status: true,
      validFrom: true,
      validTo: true,
    };
  });

  // Toggle column visibility
  const toggleColumnVisibility = (columnKey: string) => {
    const newVisibility = { ...visibleColumns, [columnKey]: !visibleColumns[columnKey] };
    setVisibleColumns(newVisibility);
    localStorage.setItem('discountsVisibleColumns', JSON.stringify(newVisibility));
  };

  const { data: sales = [], isLoading, error } = useQuery<any[]>({
    queryKey: ['/api/discounts'],
    retry: false,
  });

  // Error handling
  useEffect(() => {
    if (error) {
      toast({
        title: "Error",
        description: "Failed to load discounts",
        variant: "destructive",
      });
    }
  }, [error, toast]);

  const deleteSaleMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      await Promise.all(ids.map(id => apiRequest('DELETE', `/api/discounts/${id}`)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/discounts'] });
      toast({
        title: "Success",
        description: `Deleted ${selectedSales.length} discount(s) successfully`,
      });
      setSelectedSales([]);
    },
    onError: (error: any) => {
      console.error("Sale delete error:", error);
      const errorMessage = error.message || "Failed to delete discounts";
      toast({
        title: "Error",
        description: errorMessage.includes('referenced') || errorMessage.includes('constraint')
          ? "Cannot delete discount - it's being used in existing records" 
          : errorMessage,
        variant: "destructive",
      });
    },
  });

  // Filter sales based on search query
  const filteredSales = searchQuery
    ? fuzzySearch(sales || [], searchQuery, {
        fields: ['name', 'description', 'discountId'],
        threshold: 0.2,
        fuzzy: true,
        vietnameseNormalization: true,
      }).map(r => r.item)
    : sales;

  // Check if sale is active
  const isSaleActive = (sale: any) => {
    if (sale.status !== 'active') return false;
    const now = new Date();
    const start = new Date(sale.startDate);
    const end = new Date(sale.endDate);
    return now >= start && now <= end;
  };

  // Check if sale is expired
  const isSaleExpired = (sale: any) => {
    const now = new Date();
    const end = new Date(sale.endDate);
    return now > end;
  };

  // Calculate stats
  const activeDiscounts = sales.filter(s => isSaleActive(s)).length;
  const expiredDiscounts = sales.filter(s => isSaleExpired(s)).length;
  const totalSavings = sales.filter(s => s.applicationScope === 'all_products' || s.applicationScope === 'selected_products').length;

  // Define table columns
  const allColumns: DataTableColumn<any>[] = [
    {
      key: "code",
      header: "Code",
      sortable: true,
      className: "min-w-[100px]",
      cell: (sale) => (
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-slate-600 dark:text-slate-400">
            {sale.discountId || '-'}
          </span>
        </div>
      ),
    },
    {
      key: "name",
      header: "Discount",
      sortable: true,
      className: "min-w-[120px]",
      cell: (sale) => (
        <div className="flex items-center gap-1 lg:gap-2">
          <Tag className="h-3 w-3 lg:h-4 lg:w-4 text-slate-400 flex-shrink-0 hidden sm:block" />
          <Link href={`/discounts/${sale.id}/edit`}>
            <span className="font-medium text-xs lg:text-sm text-blue-600 hover:text-blue-800 cursor-pointer truncate max-w-[100px] lg:max-w-none">
              {sale.name}
            </span>
          </Link>
        </div>
      ),
    },
    {
      key: "type",
      header: "Type",
      sortable: true,
      className: "hidden md:table-cell",
      cell: (sale) => {
        const types: Record<string, { label: string; color: string }> = {
          'percentage': { label: 'Percentage', color: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300' },
          'fixed_amount': { label: 'Fixed Amount', color: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300' },
          'buy_x_get_y': { label: 'Buy X Get Y', color: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-300' },
        };
        const type = types[sale.discountType] || { label: sale.discountType, color: 'bg-slate-50 text-slate-700' };
        return (
          <Badge className={`${type.color} text-xs`} variant="outline">
            {type.label}
          </Badge>
        );
      },
    },
    {
      key: "value",
      header: "Value",
      sortable: true,
      className: "text-right",
      cell: (sale) => {
        if (sale.discountType === 'percentage') {
          return <span className="font-medium text-xs lg:text-sm">{sale.percentage}%</span>;
        } else if (sale.discountType === 'fixed_amount') {
          return <span className="font-medium text-xs lg:text-sm">${sale.fixedAmount}</span>;
        } else if (sale.discountType === 'buy_x_get_y') {
          return <span className="font-medium text-xs">B{sale.buyQuantity}G{sale.getQuantity}</span>;
        }
        return <span className="text-slate-500 text-xs">-</span>;
      },
    },
    {
      key: "scope",
      header: "Scope",
      sortable: true,
      className: "hidden md:table-cell",
      cell: (sale) => {
        const scopes: Record<string, { label: string; shortLabel: string; color: string }> = {
          'specific_product': { label: 'Specific Product', shortLabel: 'Product', color: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300' },
          'all_products': { label: 'All Products', shortLabel: 'All', color: 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300' },
          'specific_category': { label: 'Specific Category', shortLabel: 'Category', color: 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300' },
          'selected_products': { label: 'Selected Products', shortLabel: 'Selected', color: 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300' },
        };
        const scope = scopes[sale.applicationScope] || { label: sale.applicationScope, shortLabel: sale.applicationScope, color: 'bg-slate-100 text-slate-800' };
        return (
          <Badge className={`${scope.color} text-xs px-1.5 py-0 h-5`}>
            <span className="lg:hidden">{scope.shortLabel}</span>
            <span className="hidden lg:inline">{scope.label}</span>
          </Badge>
        );
      },
    },
    {
      key: "status",
      header: "Status",
      cell: (sale) => {
        const statusMap: Record<string, { label: string; color: string }> = {
          'active': { label: 'Active', color: 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300' },
          'inactive': { label: 'Inactive', color: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300' },
          'finished': { label: 'Finished', color: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300' },
        };
        const status = statusMap[sale.status] || { label: sale.status, color: 'bg-slate-100 text-slate-800' };
        return (
          <Badge className={`${status.color} text-xs px-1.5 py-0 h-5`}>
            {status.label}
          </Badge>
        );
      },
    },
    {
      key: "validFrom",
      header: "Valid From",
      sortable: true,
      className: "hidden lg:table-cell",
      cell: (sale) => (
        <div className="flex items-center gap-1 text-xs">
          <Calendar className="h-3 w-3 text-slate-400 hidden xl:block" />
          {format(new Date(sale.startDate), 'dd/MM/yy')}
        </div>
      ),
    },
    {
      key: "validTo",
      header: "Valid To",
      sortable: true,
      className: "hidden lg:table-cell",
      cell: (sale) => (
        <span className="text-xs">{format(new Date(sale.endDate), 'dd/MM/yy')}</span>
      ),
    },
    {
      key: "actions",
      header: "",
      className: "w-10",
      cell: (sale) => (
        <Link href={`/discounts/${sale.id}/edit`}>
          <Button size="icon" variant="ghost" className="h-7 w-7 lg:h-8 lg:w-8 hover:bg-cyan-50 dark:hover:bg-cyan-950" data-testid={`button-edit-${sale.id}`}>
            <Edit className="h-3 w-3 lg:h-4 lg:w-4 text-slate-600 dark:text-slate-400" />
          </Button>
        </Link>
      ),
    },
  ];

  // Filter columns based on visibility
  const columns = allColumns.filter(col => 
    col.key === 'actions' || visibleColumns[col.key] !== false
  );

  // Bulk actions
  const bulkActions = [
    {
      type: "button" as const,
      label: "Activate",
      action: (sales: any[]) => {
        toast({
          title: "Activate Sales",
          description: `Activating ${sales.length} sales...`,
        });
      },
    },
    {
      type: "button" as const,
      label: "Deactivate",
      action: (sales: any[]) => {
        toast({
          title: "Deactivate Sales",
          description: `Deactivating ${sales.length} sales...`,
        });
      },
    },
    {
      type: "button" as const,
      label: "Delete",
      variant: "destructive" as const,
      action: (sales: any[]) => {
        setSelectedSales(sales);
        setShowDeleteDialog(true);
      },
    },
    {
      type: "button" as const,
      label: "Export",
      action: (sales: any[]) => {
        toast({
          title: "Export",
          description: `Exporting ${sales.length} discounts...`,
        });
      },
    },
  ];

  const handleDeleteConfirm = () => {
    deleteSaleMutation.mutate(selectedSales.map(sale => sale.id));
    setShowDeleteDialog(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[600px]">
        <div className="text-center">
          <div className="relative w-16 h-16 mx-auto mb-6">
            <div className="absolute inset-0 border-4 border-cyan-200 dark:border-cyan-800 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-cyan-600 dark:border-cyan-400 rounded-full border-t-transparent animate-spin"></div>
          </div>
          <p className="text-slate-600 dark:text-slate-400 font-medium">Loading discounts...</p>
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
            Discount Management
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Manage promotional discounts and special offers
          </p>
        </div>
        <Link href="/discounts/add">
          <Button data-testid="button-add-discount">
            <Plus className="h-4 w-4 mr-2" />
            Add Discount
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Discounts */}
        <Card className="border-slate-200 dark:border-slate-800 hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Total Discounts
                </p>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <p className="text-3xl font-bold text-slate-900 dark:text-slate-100 truncate cursor-help">
                        {formatCompactNumber(sales?.length || 0)}
                      </p>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="font-mono">{(sales?.length || 0).toLocaleString()} discounts</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <div className="flex-shrink-0 p-3 rounded-xl bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-cyan-950 dark:to-blue-950">
                <Tag className="h-7 w-7 text-cyan-600 dark:text-cyan-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Active Discounts */}
        <Card className="border-slate-200 dark:border-slate-800 hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Active
                </p>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400 truncate cursor-help">
                        {formatCompactNumber(activeDiscounts)}
                      </p>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="font-mono">{activeDiscounts.toLocaleString()} active discounts</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <div className="flex-shrink-0 p-3 rounded-xl bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-950 dark:to-green-950">
                <Check className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Expired Discounts */}
        <Card className="border-slate-200 dark:border-slate-800 hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Expired
                </p>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <p className="text-3xl font-bold text-red-600 dark:text-red-400 truncate cursor-help">
                        {formatCompactNumber(expiredDiscounts)}
                      </p>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="font-mono">{expiredDiscounts.toLocaleString()} expired discounts</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <div className="flex-shrink-0 p-3 rounded-xl bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-950 dark:to-rose-950">
                <TrendingDown className="h-7 w-7 text-red-600 dark:text-red-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Total Savings */}
        <Card className="border-slate-200 dark:border-slate-800 hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Wide-Scope Offers
                </p>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <p className="text-3xl font-bold text-purple-600 dark:text-purple-400 truncate cursor-help">
                        {formatCompactNumber(totalSavings)}
                      </p>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="font-mono">{totalSavings.toLocaleString()} discounts applying to multiple products</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <div className="flex-shrink-0 p-3 rounded-xl bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-950 dark:to-indigo-950">
                <DollarSign className="h-7 w-7 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters Section */}
      <Card className="border-slate-200 dark:border-slate-800">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-slate-600 dark:text-slate-400" />
            <CardTitle className="text-base">Filters & Search</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search discounts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-10 focus:border-cyan-500 border-slate-200 dark:border-slate-800"
                data-testid="input-search-discounts"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Discounts Table */}
      <Card className="overflow-hidden border-slate-200 dark:border-slate-800">
        <CardContent className="p-0 sm:p-6">
          <div className="overflow-x-auto">
            <DataTable
              data={filteredSales}
              columns={columns}
              bulkActions={bulkActions}
              getRowKey={(sale) => sale.id}
              itemsPerPageOptions={[10, 20, 50, 100]}
              defaultItemsPerPage={20}
              renderBulkActions={({ selectedRows, selectedItems, bulkActions: actions }) => (
                <div className="px-4 sm:px-0 pb-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-mobile-lg font-semibold">Discounts ({filteredSales?.length || 0})</h2>
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
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuLabel>Toggle Columns</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {allColumns.filter(col => col.key !== 'actions').map((col) => (
                          <DropdownMenuItem
                            key={col.key}
                            onClick={() => toggleColumnVisibility(col.key)}
                            className="flex items-center justify-between"
                          >
                            <span>{col.header}</span>
                            {visibleColumns[col.key] !== false && (
                              <Check className="h-4 w-4" />
                            )}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
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
            <AlertDialogTitle>Delete Discounts</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedSales.length} discount(s)? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
