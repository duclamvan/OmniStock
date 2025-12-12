import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { useTranslation } from "react-i18next";
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
import { Plus, Search, Edit, Trash2, Tag, Calendar, Percent, Filter, MoreVertical, TrendingDown, DollarSign, Check, FileDown, FileText } from "lucide-react";
import { exportToXLSX, exportToPDF, PDFColumn } from "@/lib/exportUtils";
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
  const { t } = useTranslation(['discounts', 'common']);
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
        title: t('common:error'),
        description: t('discounts:failedToLoad'),
        variant: "destructive",
      });
    }
  }, [error, toast, t]);

  // Reference to clear selection function from DataTable
  const clearSelectionRef = useRef<(() => void) | null>(null);

  const deleteSaleMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      await Promise.all(ids.map(id => apiRequest('DELETE', `/api/discounts/${id}`)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/discounts'] });
      toast({
        title: t('common:success'),
        description: t('discounts:deletedCount', { count: selectedSales.length }),
      });
      setSelectedSales([]);
      clearSelectionRef.current?.();
    },
    onError: (error: any) => {
      console.error("Sale delete error:", error);
      const errorMessage = error.message || t('discounts:failedToDelete');
      toast({
        title: t('common:error'),
        description: errorMessage.includes('referenced') || errorMessage.includes('constraint')
          ? t('discounts:cannotDelete')
          : errorMessage,
        variant: "destructive",
      });
    },
  });

  const activateMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      await Promise.all(ids.map(id => apiRequest('PATCH', `/api/discounts/${id}`, { status: 'active' })));
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/discounts'] });
      toast({
        title: t('common:success'),
        description: t('discounts:activatedCount', { count: variables.length }),
      });
      clearSelectionRef.current?.();
    },
    onError: (error: any) => {
      toast({
        title: t('common:error'),
        description: error.message || t('discounts:failedToActivate'),
        variant: "destructive",
      });
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      await Promise.all(ids.map(id => apiRequest('PATCH', `/api/discounts/${id}`, { status: 'inactive' })));
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/discounts'] });
      toast({
        title: t('common:success'),
        description: t('discounts:deactivatedCount', { count: variables.length }),
      });
      clearSelectionRef.current?.();
    },
    onError: (error: any) => {
      toast({
        title: t('common:error'),
        description: error.message || t('discounts:failedToDeactivate'),
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
      header: t('discounts:code'),
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
      header: t('discounts:discount'),
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
      header: t('common:type'),
      sortable: true,
      className: "hidden md:table-cell",
      cell: (sale) => {
        const types: Record<string, { label: string; color: string }> = {
          'percentage': { label: t('discounts:percentage'), color: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300' },
          'fixed': { label: t('discounts:fixedAmount'), color: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300' },
          'buy_x_get_y': { label: t('discounts:buyXGetY'), color: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-300' },
        };
        const type = types[sale.type] || { label: sale.type || '-', color: 'bg-slate-50 text-slate-700 border-slate-200' };
        return (
          <Badge className={`${type.color} text-xs`} variant="outline">
            {type.label}
          </Badge>
        );
      },
    },
    {
      key: "value",
      header: t('discounts:value'),
      sortable: true,
      className: "text-right",
      cell: (sale) => {
        if (sale.type === 'percentage') {
          return <span className="font-medium text-xs lg:text-sm">{sale.percentage}%</span>;
        } else if (sale.type === 'fixed') {
          return <span className="font-medium text-xs lg:text-sm">${sale.value}</span>;
        } else if (sale.type === 'buy_x_get_y') {
          return <span className="font-medium text-xs">B{sale.buyQuantity}G{sale.getQuantity}</span>;
        }
        return <span className="text-slate-500 text-xs">-</span>;
      },
    },
    {
      key: "scope",
      header: t('discounts:scope'),
      sortable: true,
      className: "hidden md:table-cell",
      cell: (sale) => {
        const scopes: Record<string, { label: string; shortLabel: string; color: string }> = {
          'specific_product': { label: t('discounts:specificProduct'), shortLabel: t('discounts:scopeProduct'), color: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300' },
          'all_products': { label: t('discounts:allProducts'), shortLabel: t('discounts:scopeAll'), color: 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300' },
          'specific_category': { label: t('discounts:specificCategory'), shortLabel: t('discounts:scopeCategory'), color: 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300' },
          'selected_products': { label: t('discounts:selectedProducts'), shortLabel: t('discounts:scopeSelected'), color: 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300' },
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
      header: t('common:status'),
      cell: (sale) => {
        const statusMap: Record<string, { label: string; color: string }> = {
          'active': { label: t('discounts:active'), color: 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300' },
          'inactive': { label: t('discounts:inactive'), color: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300' },
          'finished': { label: t('discounts:finished'), color: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300' },
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
      header: t('discounts:validFrom'),
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
      header: t('discounts:validTo'),
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
      label: t('discounts:activate'),
      action: (sales: any[]) => {
        activateMutation.mutate(sales.map(s => s.id));
      },
    },
    {
      type: "button" as const,
      label: t('discounts:deactivate'),
      action: (sales: any[]) => {
        deactivateMutation.mutate(sales.map(s => s.id));
      },
    },
    {
      type: "button" as const,
      label: t('common:delete'),
      variant: "destructive" as const,
      action: (sales: any[]) => {
        setSelectedSales(sales);
        setShowDeleteDialog(true);
      },
    },
    {
      type: "button" as const,
      label: t('common:export'),
      action: (sales: any[]) => {
        toast({
          title: t('common:export'),
          description: t('discounts:exportingCount', { count: sales.length }),
        });
      },
    },
  ];

  const handleDeleteConfirm = () => {
    deleteSaleMutation.mutate(selectedSales.map(sale => sale.id));
    setShowDeleteDialog(false);
  };

  // Export handlers
  const handleExportXLSX = () => {
    try {
      const exportData = filteredSales.map(sale => ({
        [t('discounts:exportCode')]: sale.discountId || '-',
        [t('discounts:exportDescription')]: sale.name || '-',
        [t('discounts:exportType')]: sale.type === 'percentage' ? t('discounts:percentage')
          : sale.type === 'fixed' ? t('discounts:fixedAmount')
          : sale.type === 'buy_x_get_y' ? t('discounts:buyXGetY')
          : sale.type || '-',
        [t('discounts:exportValue')]: sale.type === 'percentage' ? `${sale.percentage}%`
          : sale.type === 'fixed' ? `$${sale.value}`
          : sale.type === 'buy_x_get_y' ? t('discounts:buyXGetYFormat', { buy: sale.buyQuantity, get: sale.getQuantity })
          : '-',
        [t('discounts:exportMinPurchase')]: sale.minPurchaseAmount ? `$${sale.minPurchaseAmount}` : '-',
        [t('discounts:exportMaxUses')]: sale.maxUses || t('discounts:unlimited'),
        [t('discounts:exportValidFrom')]: format(new Date(sale.startDate), 'dd/MM/yyyy'),
        [t('discounts:exportValidUntil')]: format(new Date(sale.endDate), 'dd/MM/yyyy'),
        [t('discounts:exportStatus')]: sale.status === 'active' ? t('discounts:active')
          : sale.status === 'inactive' ? t('discounts:inactive')
          : sale.status === 'finished' ? t('discounts:finished')
          : sale.status || '-',
      }));

      exportToXLSX(exportData, t('discounts:exportFilename', { date: format(new Date(), 'yyyy-MM-dd') }), t('discounts:pageTitle'));
      
      toast({
        title: t('common:exportSuccessful'),
        description: t('discounts:exportedToXLSX', { count: exportData.length }),
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: t('common:exportFailed'),
        description: t('discounts:exportFailedXLSX'),
        variant: "destructive",
      });
    }
  };

  const handleExportPDF = () => {
    try {
      const exportData = filteredSales.map(sale => ({
        code: sale.discountId || '-',
        description: sale.name || '-',
        type: sale.type === 'percentage' ? t('discounts:percentage')
          : sale.type === 'fixed' ? t('discounts:fixedAmount')
          : sale.type === 'buy_x_get_y' ? t('discounts:buyXGetY')
          : sale.type || '-',
        value: sale.type === 'percentage' ? `${sale.percentage}%`
          : sale.type === 'fixed' ? `$${sale.value}`
          : sale.type === 'buy_x_get_y' ? t('discounts:buyXGetYFormat', { buy: sale.buyQuantity, get: sale.getQuantity })
          : '-',
        minPurchase: sale.minPurchaseAmount ? `$${sale.minPurchaseAmount}` : '-',
        maxUses: sale.maxUses || t('discounts:unlimited'),
        validFrom: format(new Date(sale.startDate), 'dd/MM/yyyy'),
        validUntil: format(new Date(sale.endDate), 'dd/MM/yyyy'),
        status: sale.status === 'active' ? t('discounts:active')
          : sale.status === 'inactive' ? t('discounts:inactive')
          : sale.status === 'finished' ? t('discounts:finished')
          : sale.status || '-',
      }));

      const columns: PDFColumn[] = [
        { key: 'code', header: t('discounts:exportCode') },
        { key: 'description', header: t('discounts:exportDescription') },
        { key: 'type', header: t('discounts:exportType') },
        { key: 'value', header: t('discounts:exportValue') },
        { key: 'minPurchase', header: t('discounts:exportMinPurchase') },
        { key: 'maxUses', header: t('discounts:exportMaxUses') },
        { key: 'validFrom', header: t('discounts:exportValidFrom') },
        { key: 'validUntil', header: t('discounts:exportValidUntil') },
        { key: 'status', header: t('discounts:exportStatus') },
      ];

      exportToPDF(t('discounts:exportReport'), exportData, columns, t('discounts:exportFilename', { date: format(new Date(), 'yyyy-MM-dd') }));
      
      toast({
        title: t('common:exportSuccessful'),
        description: t('discounts:exportedToPDF', { count: exportData.length }),
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: t('common:exportFailed'),
        description: t('discounts:exportFailedPDF'),
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
          <p className="text-slate-600 dark:text-slate-400 font-medium">{t('discounts:loadingDiscounts')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 overflow-x-hidden p-2 sm:p-4 md:p-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            {t('discounts:pageTitle')}
          </h1>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 mt-1">
            {t('discounts:pageSubtitle')}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="w-full sm:w-auto" data-testid="button-export">
                <FileDown className="h-4 w-4 mr-2" />
                {t('common:export')}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>{t('common:exportOptions')}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleExportXLSX} data-testid="button-export-xlsx">
                <FileDown className="h-4 w-4 mr-2" />
                {t('common:exportAsXLSX')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportPDF} data-testid="button-export-pdf">
                <FileText className="h-4 w-4 mr-2" />
                {t('common:exportAsPDF')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Link href="/discounts/add">
            <Button className="w-full sm:w-auto" data-testid="button-add-discount">
              <Plus className="h-4 w-4 mr-2" />
              {t('discounts:addDiscount')}
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
        {/* Total Discounts */}
        <Card className="border-slate-200 dark:border-slate-800 hover:shadow-lg transition-shadow">
          <CardContent className="p-3 sm:p-4 md:p-6">
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
                  {t('discounts:totalDiscounts')}
                </p>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <p className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-900 dark:text-slate-100 truncate cursor-help">
                        {formatCompactNumber(sales?.length || 0)}
                      </p>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="font-mono">{t('discounts:tooltipDiscounts', { count: sales?.length || 0 })}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <div className="flex-shrink-0 p-2 sm:p-2.5 md:p-3 rounded-xl bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-cyan-950 dark:to-blue-950">
                <Tag className="h-5 w-5 sm:h-6 sm:w-6 md:h-7 md:w-7 text-cyan-600 dark:text-cyan-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Active Discounts */}
        <Card className="border-slate-200 dark:border-slate-800 hover:shadow-lg transition-shadow">
          <CardContent className="p-3 sm:p-4 md:p-6">
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
                  {t('discounts:activeDiscounts')}
                </p>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <p className="text-xl sm:text-2xl md:text-3xl font-bold text-emerald-600 dark:text-emerald-400 truncate cursor-help">
                        {formatCompactNumber(activeDiscounts)}
                      </p>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="font-mono">{t('discounts:tooltipActive', { count: activeDiscounts })}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <div className="flex-shrink-0 p-2 sm:p-2.5 md:p-3 rounded-xl bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-950 dark:to-green-950">
                <Check className="h-5 w-5 sm:h-6 sm:w-6 md:h-7 md:w-7 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Expired Discounts */}
        <Card className="border-slate-200 dark:border-slate-800 hover:shadow-lg transition-shadow">
          <CardContent className="p-3 sm:p-4 md:p-6">
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
                  {t('discounts:expiredDiscounts')}
                </p>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <p className="text-xl sm:text-2xl md:text-3xl font-bold text-red-600 dark:text-red-400 truncate cursor-help">
                        {formatCompactNumber(expiredDiscounts)}
                      </p>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="font-mono">{t('discounts:tooltipExpired', { count: expiredDiscounts })}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <div className="flex-shrink-0 p-2 sm:p-2.5 md:p-3 rounded-xl bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-950 dark:to-rose-950">
                <TrendingDown className="h-5 w-5 sm:h-6 sm:w-6 md:h-7 md:w-7 text-red-600 dark:text-red-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Total Savings */}
        <Card className="border-slate-200 dark:border-slate-800 hover:shadow-lg transition-shadow">
          <CardContent className="p-3 sm:p-4 md:p-6">
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
                  {t('discounts:wideScopeOffers')}
                </p>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <p className="text-xl sm:text-2xl md:text-3xl font-bold text-purple-600 dark:text-purple-400 truncate cursor-help">
                        {formatCompactNumber(totalSavings)}
                      </p>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="font-mono">{t('discounts:discountsApplyingToMultiple', { count: totalSavings })}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <div className="flex-shrink-0 p-2 sm:p-2.5 md:p-3 rounded-xl bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-950 dark:to-indigo-950">
                <DollarSign className="h-5 w-5 sm:h-6 sm:w-6 md:h-7 md:w-7 text-purple-600 dark:text-purple-400" />
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
                placeholder={t('common:searchDiscounts')}
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
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">All Discounts ({filteredSales?.length || 0})</CardTitle>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="hidden sm:flex">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>{t('discounts:toggleColumns')}</DropdownMenuLabel>
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
        </CardHeader>
        <CardContent className="p-0 sm:p-4 md:p-6 overflow-x-auto">
          {/* Mobile Card View */}
          <div className="sm:hidden space-y-3 p-3">
            {filteredSales?.map((sale: any) => {
              // Helper functions for mobile view
              const getTypeInfo = () => {
                const types: Record<string, { label: string; color: string }> = {
                  'percentage': { label: t('discounts:percentage'), color: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300' },
                  'fixed': { label: t('discounts:fixed'), color: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300' },
                  'buy_x_get_y': { label: t('discounts:buyXGetY'), color: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-300' },
                };
                return types[sale.type] || { label: sale.type || '-', color: 'bg-slate-50 text-slate-700 border-slate-200' };
              };

              const getValueDisplay = () => {
                if (sale.type === 'percentage') {
                  return `${sale.percentage}%`;
                } else if (sale.type === 'fixed') {
                  return `$${sale.value}`;
                } else if (sale.type === 'buy_x_get_y') {
                  return t('discounts:buyXGetYValue', { buy: sale.buyQuantity, get: sale.getQuantity });
                }
                return '-';
              };

              const getStatusInfo = () => {
                const statusMap: Record<string, { label: string; color: string }> = {
                  'active': { label: t('discounts:active'), color: 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300' },
                  'inactive': { label: t('discounts:inactive'), color: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300' },
                  'finished': { label: t('discounts:finished'), color: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300' },
                };
                const status = statusMap[sale.status] || { label: sale.status, color: 'bg-slate-100 text-slate-800' };
                
                // Check if expired
                if (isSaleExpired(sale)) {
                  return { label: t('discounts:expired'), color: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' };
                }
                
                return status;
              };

              const typeInfo = getTypeInfo();
              const statusInfo = getStatusInfo();

              return (
                <div key={sale.id} className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-gray-100 dark:border-slate-800 p-4">
                  <div className="space-y-3">
                    {/* Top Row - Name, Type Badge, Status, Actions */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Link href={`/discounts/${sale.id}/edit`}>
                            <p className="font-semibold text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer truncate">
                              {sale.name}
                            </p>
                          </Link>
                          <Badge className={`${typeInfo.color} text-xs px-1.5 py-0 h-5 flex-shrink-0`} variant="outline">
                            {typeInfo.label}
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                          {sale.discountId || t('discounts:noCode')}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Badge className={`${statusInfo.color} text-xs px-1.5 py-0 h-5`}>
                          {statusInfo.label}
                        </Badge>
                        <Link href={`/discounts/${sale.id}/edit`}>
                          <Button size="icon" variant="ghost" className="h-8 w-8" data-testid={`button-edit-mobile-${sale.id}`}>
                            <Edit className="h-4 w-4" />
                          </Button>
                        </Link>
                      </div>
                    </div>

                    {/* Discount Value Display */}
                    <div className="bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-cyan-950/30 dark:to-blue-950/30 rounded-lg p-3 border border-cyan-100 dark:border-cyan-900">
                      <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">{t('discounts:discountValue')}</p>
                      <p className="text-2xl font-bold text-cyan-600 dark:text-cyan-400">
                        {getValueDisplay()}
                      </p>
                    </div>

                    {/* Middle Row - Key Details */}
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500 dark:text-gray-400 text-xs">{t('discounts:validFrom')}</p>
                        <div className="flex items-center gap-1 mt-1">
                          <Calendar className="h-3 w-3 text-gray-400" />
                          <p className="font-medium text-gray-900 dark:text-gray-100 text-xs">
                            {format(new Date(sale.startDate), 'dd/MM/yy')}
                          </p>
                        </div>
                      </div>
                      <div>
                        <p className="text-gray-500 dark:text-gray-400 text-xs">{t('discounts:validTo')}</p>
                        <div className="flex items-center gap-1 mt-1">
                          <Calendar className="h-3 w-3 text-gray-400" />
                          <p className="font-medium text-gray-900 dark:text-gray-100 text-xs">
                            {format(new Date(sale.endDate), 'dd/MM/yy')}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Additional Details */}
                    <div className="grid grid-cols-2 gap-4 text-sm pt-2 border-t border-gray-100 dark:border-slate-800">
                      <div>
                        <p className="text-gray-500 dark:text-gray-400 text-xs">{t('discounts:usageLimit')}</p>
                        <p className="font-medium text-gray-900 dark:text-gray-100 text-sm mt-1">
                          {sale.maxUses ? t('discounts:usesCount', { count: sale.maxUses }) : t('discounts:unlimited')}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500 dark:text-gray-400 text-xs">{t('discounts:minPurchase')}</p>
                        <p className="font-medium text-gray-900 dark:text-gray-100 text-sm mt-1">
                          {sale.minPurchaseAmount ? `$${sale.minPurchaseAmount}` : t('discounts:none')}
                        </p>
                      </div>
                    </div>

                    {/* Scope and Restrictions */}
                    {(sale.applicationScope || sale.customerRestrictions) && (
                      <div className="text-xs bg-slate-50 dark:bg-slate-800/50 rounded p-2">
                        {sale.applicationScope && (
                          <div className="flex items-center gap-1">
                            <Tag className="h-3 w-3 text-slate-400" />
                            <span className="text-gray-600 dark:text-gray-400">{t('discounts:scope')}:</span>
                            <span className="font-medium text-gray-900 dark:text-gray-100">
                              {sale.applicationScope === 'all_products' ? t('discounts:allProducts') :
                               sale.applicationScope === 'specific_product' ? t('discounts:specificProduct') :
                               sale.applicationScope === 'specific_category' ? t('discounts:specificCategory') :
                               sale.applicationScope === 'selected_products' ? t('discounts:selectedProducts') :
                               sale.applicationScope}
                            </span>
                          </div>
                        )}
                        {sale.customerRestrictions && (
                          <div className="flex items-center gap-1 mt-1">
                            <span className="text-gray-600 dark:text-gray-400">{t('discounts:restrictions')}:</span>
                            <span className="font-medium text-gray-900 dark:text-gray-100">
                              {sale.customerRestrictions}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            {filteredSales.length === 0 && (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <Tag className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="font-medium">{t('discounts:noDiscountsFound')}</p>
                <p className="text-sm mt-1">{t('discounts:tryAdjustingSearch')}</p>
              </div>
            )}
          </div>

          {/* Desktop Table View */}
          <div className="hidden sm:block">
            <DataTable
              data={filteredSales}
              columns={columns}
              bulkActions={bulkActions}
              getRowKey={(sale) => sale.id}
              itemsPerPageOptions={[10, 20, 50, 100]}
              defaultItemsPerPage={20}
              renderBulkActions={({ selectedRows, selectedItems, bulkActions: actions, clearSelection }) => {
                clearSelectionRef.current = clearSelection;
                return selectedRows.size > 0 && (
                  <div className="px-4 sm:px-0 pb-3">
                    <div className="flex items-center gap-2 flex-wrap">
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
                    </div>
                  </div>
                );
              }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('discounts:deleteDiscounts')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('discounts:confirmDelete', { count: selectedSales.length })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common:cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-red-600 hover:bg-red-700">
              {t('common:delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
