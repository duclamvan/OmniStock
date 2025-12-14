import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Plus, 
  Search, 
  Pencil, 
  Trash2, 
  Eye,
  Building2,
  TrendingUp,
  Calendar,
  ShoppingBag,
  MoreVertical,
  ExternalLink,
  Mail,
  Phone,
  Filter,
  Check,
  Download,
  FileSpreadsheet,
  FileText
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Input } from "@/components/ui/input";
import { fuzzySearch } from "@/lib/fuzzySearch";
import { formatCompactNumber } from "@/lib/currencyUtils";
import { exportToXLSX, exportToPDF, type PDFColumn } from "@/lib/exportUtils";
import type { Supplier } from "@shared/schema";
import type { DataTableColumn } from "@/components/ui/data-table";
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
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { format } from "date-fns";
import { ImportExportMenu } from "@/components/imports/ImportExportMenu";

const getCountryFlag = (country: string): string => {
  const countryFlags: Record<string, string> = {
    'China': '🇨🇳',
    'Vietnam': '🇻🇳',
    'Czech Republic': '🇨🇿',
    'Germany': '🇩🇪',
    'USA': '🇺🇸',
    'UK': '🇬🇧',
    'Poland': '🇵🇱',
    'Slovakia': '🇸🇰',
    'Austria': '🇦🇹',
    'Hungary': '🇭🇺',
  };
  return countryFlags[country] || '🌍';
};

export default function AllSuppliers() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { t } = useTranslation(['inventory', 'common']);
  const [deleteSupplier, setDeleteSupplier] = useState<Supplier | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSuppliers, setSelectedSuppliers] = useState<Supplier[]>([]);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Column visibility state with localStorage persistence
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>(() => {
    const saved = localStorage.getItem('suppliersVisibleColumns');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return {};
      }
    }
    return {
      name: true,
      contactPerson: true,
      email: true,
      phone: true,
      country: true,
      totalOrders: true,
    };
  });

  // Toggle column visibility
  const toggleColumnVisibility = (columnKey: string) => {
    const newVisibility = { ...visibleColumns, [columnKey]: !visibleColumns[columnKey] };
    setVisibleColumns(newVisibility);
    localStorage.setItem('suppliersVisibleColumns', JSON.stringify(newVisibility));
  };

  const { data: suppliers = [], isLoading, error } = useQuery<Supplier[]>({
    queryKey: ["/api/suppliers"],
    retry: false,
  });

  const { data: purchases = [] } = useQuery<any[]>({
    queryKey: ["/api/purchases"],
    retry: false,
  });

  const { data: products = [] } = useQuery<any[]>({
    queryKey: ["/api/products"],
    retry: false,
  });

  useEffect(() => {
    if (error) {
      toast({
        title: t('common:error'),
        description: t('inventory:loadError'),
        variant: "destructive",
      });
    }
  }, [error, toast, t]);

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/suppliers/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/suppliers"] });
      toast({ 
        title: t('common:success'),
        description: t('inventory:supplierDeleted') 
      });
      setDeleteSupplier(null);
      setShowDeleteDialog(false);
      setSelectedSuppliers([]);
    },
    onError: (error: any) => {
      const message = error.message?.includes("being used")
        ? t('inventory:deleteErrorReferenced')
        : t('inventory:deleteError');
      toast({ 
        title: t('common:error'),
        description: message, 
        variant: "destructive" 
      });
    },
  });

  const handleBulkDelete = async () => {
    try {
      await Promise.all(
        selectedSuppliers.map(supplier => deleteMutation.mutateAsync(supplier.id))
      );
    } catch (error) {
      console.error('Error deleting suppliers:', error);
    }
  };

  const handleExportXLSX = () => {
    try {
      if (!filteredSuppliers || filteredSuppliers.length === 0) {
        toast({
          title: t('inventory:noDataToExport'),
          description: t('inventory:noProductsToExport'),
          variant: "destructive",
        });
        return;
      }

      const exportData = filteredSuppliers.map(supplier => ({
        [t('inventory:exportColumnName')]: supplier.name || '',
        [t('inventory:exportColumnCompany')]: supplier.name || '',
        [t('inventory:exportColumnContactPerson')]: supplier.contactPerson || '',
        [t('inventory:exportColumnEmail')]: supplier.email || '',
        [t('inventory:exportColumnPhone')]: supplier.phone || '',
        [t('inventory:exportColumnCountry')]: supplier.country || '',
        [t('inventory:exportColumnTotalPurchases')]: `$${parseFloat(supplier.totalPurchased || '0').toFixed(2)}`,
        [t('inventory:exportColumnLastPurchaseDate')]: supplier.lastPurchaseDate 
          ? format(new Date(supplier.lastPurchaseDate), 'dd/MM/yyyy')
          : t('inventory:never'),
        [t('inventory:exportColumnAddress')]: supplier.address || '',
        [t('inventory:exportColumnWebsite')]: supplier.website || '',
      }));

      exportToXLSX(exportData, 'suppliers', 'Suppliers');
      
      toast({
        title: t('common:success'),
        description: t('inventory:exportSuccessXLSX', { count: exportData.length }),
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: t('inventory:exportFailed'),
        description: t('inventory:exportFailedXLSX'),
        variant: "destructive",
      });
    }
  };

  const handleExportPDF = () => {
    try {
      if (!filteredSuppliers || filteredSuppliers.length === 0) {
        toast({
          title: t('inventory:noDataToExport'),
          description: t('inventory:noProductsToExport'),
          variant: "destructive",
        });
        return;
      }

      const columns: PDFColumn[] = [
        { key: 'name', header: t('inventory:exportColumnName') },
        { key: 'contactPerson', header: t('inventory:exportColumnContactPerson') },
        { key: 'email', header: t('inventory:exportColumnEmail') },
        { key: 'phone', header: t('inventory:exportColumnPhone') },
        { key: 'country', header: t('inventory:exportColumnCountry') },
        { key: 'totalPurchases', header: t('inventory:exportColumnTotalPurchases') },
        { key: 'lastPurchaseDate', header: t('inventory:exportColumnLastPurchase') },
      ];

      const exportData = filteredSuppliers.map(supplier => ({
        name: supplier.name || '',
        contactPerson: supplier.contactPerson || '',
        email: supplier.email || '',
        phone: supplier.phone || '',
        country: supplier.country || '',
        totalPurchases: `$${parseFloat(supplier.totalPurchased || '0').toFixed(2)}`,
        lastPurchaseDate: supplier.lastPurchaseDate 
          ? format(new Date(supplier.lastPurchaseDate), 'dd/MM/yyyy')
          : t('inventory:never'),
      }));

      exportToPDF(t('inventory:suppliersReport'), exportData, columns, 'suppliers');
      
      toast({
        title: t('common:success'),
        description: t('inventory:exportSuccessPDF', { count: exportData.length }),
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: t('inventory:exportFailed'),
        description: t('inventory:exportFailedPDF'),
        variant: "destructive",
      });
    }
  };

  const filteredSuppliers = searchQuery
    ? fuzzySearch(suppliers, searchQuery, {
        fields: ['name', 'contactPerson', 'email', 'phone', 'country'],
        threshold: 0.2,
        fuzzy: true,
        vietnameseNormalization: true,
      }).map(r => r.item)
    : suppliers;

  // Calculate products count per supplier
  const productCountBySupplier: { [supplierId: string]: number } = {};
  products.forEach((product: any) => {
    if (product.supplierId) {
      productCountBySupplier[product.supplierId] = (productCountBySupplier[product.supplierId] || 0) + 1;
    }
  });

  // Calculate stats
  const totalSuppliers = suppliers.length;
  
  // Active suppliers (had purchases in last 90 days)
  const activeSuppliers = suppliers.filter(supplier => {
    if (!supplier.lastPurchaseDate) return false;
    try {
      const lastPurchase = new Date(supplier.lastPurchaseDate);
      const daysSinceLastPurchase = (Date.now() - lastPurchase.getTime()) / (1000 * 60 * 60 * 24);
      return daysSinceLastPurchase <= 90;
    } catch {
      return false;
    }
  });

  // Total purchase value
  const totalPurchaseValue = suppliers.reduce((sum, supplier) => {
    const amount = parseFloat(supplier.totalPurchased || '0') || 0;
    return sum + amount;
  }, 0);

  // Top supplier by purchase value
  const topSupplier = suppliers.reduce((top, supplier) => {
    const amount = parseFloat(supplier.totalPurchased || '0') || 0;
    const topAmount = parseFloat(top?.totalPurchased || '0') || 0;
    return amount > topAmount ? supplier : top;
  }, suppliers[0] || null);
  const topSupplierValue = parseFloat(topSupplier?.totalPurchased || '0') || 0;

  const formatDate = (dateStr: string | Date | null | undefined) => {
    if (!dateStr) return '-';
    try {
      const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
      if (isNaN(date.getTime())) return '-';
      return format(date, 'dd/MM/yyyy');
    } catch {
      return '-';
    }
  };

  const getStatusBadge = (supplier: Supplier) => {
    if (!supplier.lastPurchaseDate) {
      return <Badge variant="secondary" className="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">{t('inventory:new')}</Badge>;
    }
    const lastPurchase = new Date(supplier.lastPurchaseDate);
    const daysSince = (Date.now() - lastPurchase.getTime()) / (1000 * 60 * 60 * 24);
    
    if (daysSince <= 30) {
      return <Badge className="bg-green-100 text-green-800 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800">{t('inventory:active')}</Badge>;
    } else if (daysSince <= 90) {
      return <Badge className="bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800">{t('inventory:regular')}</Badge>;
    } else {
      return <Badge variant="outline" className="text-slate-500 dark:text-slate-400">{t('inventory:inactive')}</Badge>;
    }
  };

  const columns: DataTableColumn<Supplier>[] = [
    {
      key: "name",
      header: t('inventory:supplier'),
      cell: (supplier) => (
        <div className="min-w-[180px]">
          <span className="font-semibold text-slate-900 dark:text-slate-100 block">
            {supplier.name}
          </span>
          {supplier.contactPerson && (
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{supplier.contactPerson}</p>
          )}
        </div>
      ),
    },
    {
      key: "contact",
      header: t('inventory:contactInfo'),
      cell: (supplier) => (
        <div className="space-y-1 min-w-[160px]" onClick={(e) => e.stopPropagation()}>
          {supplier.email && (
            <div className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-400">
              <Mail className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
              <a 
                href={`mailto:${supplier.email}`} 
                className="hover:text-cyan-600 dark:hover:text-cyan-400 truncate max-w-[200px]"
              >
                {supplier.email}
              </a>
            </div>
          )}
          {supplier.phone && (
            <div className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-400">
              <Phone className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
              <a 
                href={`tel:${supplier.phone}`} 
                className="hover:text-cyan-600 dark:hover:text-cyan-400"
              >
                {supplier.phone}
              </a>
            </div>
          )}
          {!supplier.email && !supplier.phone && (
            <span className="text-sm text-slate-400 dark:text-slate-500">-</span>
          )}
        </div>
      ),
    },
    {
      key: "lastPurchaseDate",
      header: t('inventory:lastPurchaseDate'),
      cell: (supplier) => {
        const dateStr = formatDate(supplier.lastPurchaseDate);
        if (dateStr === '-') {
          return <span className="text-slate-400">{t('inventory:never')}</span>;
        }
        
        const lastPurchase = new Date(supplier.lastPurchaseDate!);
        const daysSince = Math.floor((Date.now() - lastPurchase.getTime()) / (1000 * 60 * 60 * 24));
        
        return (
          <div className="min-w-[100px]">
            <span className="font-medium text-slate-900 dark:text-slate-100 block">{dateStr}</span>
            <span className="text-sm text-slate-500 dark:text-slate-400">
              {daysSince === 0 ? t('inventory:today') : 
               daysSince === 1 ? t('inventory:yesterday') :
               t('inventory:daysAgo', { days: daysSince })}
            </span>
          </div>
        );
      },
    },
    {
      key: "totalPurchased",
      header: t('inventory:totalValue'),
      cell: (supplier) => {
        const amount = parseFloat(supplier.totalPurchased || '0');
        return (
          <span className="font-semibold text-slate-900 dark:text-slate-100">
            ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        );
      },
    },
    {
      key: "country",
      header: t('inventory:location'),
      cell: (supplier) => {
        if (!supplier.country) return <span className="text-slate-400">-</span>;
        return (
          <div className="flex items-center gap-2">
            <span className="text-xl">{getCountryFlag(supplier.country)}</span>
            <span className="font-medium text-slate-700 dark:text-slate-300">{supplier.country}</span>
          </div>
        );
      },
    },
    {
      key: "status",
      header: t('inventory:status'),
      cell: (supplier) => getStatusBadge(supplier),
    },
    {
      key: "actions",
      header: "",
      cell: (supplier) => (
        <div onClick={(e) => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>{t('inventory:actions')}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate(`/suppliers/${supplier.id}`)}>
                <Eye className="h-4 w-4 mr-2" />
                {t('inventory:viewSupplier')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate(`/suppliers/${supplier.id}/edit`)}>
                <Pencil className="h-4 w-4 mr-2" />
                {t('inventory:editSupplier')}
              </DropdownMenuItem>
              {supplier.supplierLink && (
                <DropdownMenuItem asChild>
                  <a
                    href={supplier.supplierLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    {t('inventory:visitWebsite')}
                  </a>
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => {
                  setDeleteSupplier(supplier);
                  setShowDeleteDialog(true);
                }}
                className="text-red-600 focus:text-red-600"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {t('common:delete')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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
      label: t('common:delete'),
      action: (selectedItems: Supplier[]) => {
        setSelectedSuppliers(selectedItems);
        setShowDeleteDialog(true);
      },
      variant: "destructive" as const,
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[600px] bg-white dark:bg-slate-900">
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
    <div className="space-y-4 sm:space-y-6 bg-gray-50 dark:bg-slate-900 min-h-screen -m-6 p-2 sm:p-4 md:p-6 overflow-x-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">{t('inventory:suppliers')}</h1>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 mt-1 hidden sm:block">{t('inventory:manageProductsDescription')}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <ImportExportMenu
            entity="suppliers"
            entityLabel="Suppliers"
            onImportComplete={() => queryClient.invalidateQueries({ queryKey: ['/api/suppliers'] })}
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="default" className="w-full sm:w-auto" data-testid="button-export">
                <Download className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                {t('inventory:export')}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>{t('inventory:exportFormat')}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleExportXLSX} data-testid="button-export-xlsx">
                <FileSpreadsheet className="h-4 w-4 mr-2 text-green-600" />
                {t('inventory:exportAsXLSX')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportPDF} data-testid="button-export-pdf">
                <FileText className="h-4 w-4 mr-2 text-red-600" />
                {t('inventory:exportAsPDF')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button onClick={() => navigate('/suppliers/new')} size="default" className="w-full sm:w-auto" data-testid="button-add-supplier">
            <Plus className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
            {t('inventory:addSupplier')}
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
        {/* Total Suppliers */}
        <Card className="border-slate-200 dark:border-slate-800 hover:shadow-lg transition-shadow">
          <CardContent className="p-3 sm:p-4 md:p-6">
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
                  {t('inventory:totalOrders')}
                </p>
                <p className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-900 dark:text-slate-100 truncate">
                  {totalSuppliers}
                </p>
              </div>
              <div className="flex-shrink-0 p-2 sm:p-2.5 md:p-3 rounded-xl bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-cyan-950 dark:to-blue-950">
                <Building2 className="h-5 w-5 sm:h-6 sm:w-6 md:h-7 md:w-7 text-cyan-600 dark:text-cyan-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Active Suppliers */}
        <Card className="border-slate-200 dark:border-slate-800 hover:shadow-lg transition-shadow">
          <CardContent className="p-3 sm:p-4 md:p-6">
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
                  {t('inventory:active')}
                </p>
                <p className="text-xl sm:text-2xl md:text-3xl font-bold text-emerald-600 dark:text-emerald-400 truncate">
                  {activeSuppliers.length}
                </p>
              </div>
              <div className="flex-shrink-0 p-2 sm:p-2.5 md:p-3 rounded-xl bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-950 dark:to-green-950">
                <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 md:h-7 md:w-7 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Total Purchases */}
        <Card className="border-slate-200 dark:border-slate-800 hover:shadow-lg transition-shadow">
          <CardContent className="p-3 sm:p-4 md:p-6">
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
                  {t('inventory:totalPurchases')}
                </p>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <p className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-900 dark:text-slate-100 cursor-help truncate">
                        ${formatCompactNumber(totalPurchaseValue)}
                      </p>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="font-mono">${totalPurchaseValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <div className="flex-shrink-0 p-2 sm:p-2.5 md:p-3 rounded-xl bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-950 dark:to-indigo-950">
                <ShoppingBag className="h-5 w-5 sm:h-6 sm:w-6 md:h-7 md:w-7 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Top Supplier */}
        <Card className="border-slate-200 dark:border-slate-800 hover:shadow-lg transition-shadow">
          <CardContent className="p-3 sm:p-4 md:p-6">
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Top Supplier
                </p>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <p className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-900 dark:text-slate-100 cursor-help truncate">
                        ${formatCompactNumber(topSupplierValue)}
                      </p>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="font-semibold mb-1">{topSupplier?.name || 'N/A'}</p>
                      <p className="font-mono text-sm">${topSupplierValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                {topSupplier && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 truncate">
                    {topSupplier.name}
                  </p>
                )}
              </div>
              <div className="flex-shrink-0 p-2 sm:p-2.5 md:p-3 rounded-xl bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950 dark:to-amber-950">
                <Calendar className="h-5 w-5 sm:h-6 sm:w-6 md:h-7 md:w-7 text-orange-600 dark:text-orange-400" />
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
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder={t('common:searchSuppliers')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-10 border-slate-300 dark:border-slate-700 focus:border-cyan-500 dark:focus:border-cyan-500"
                data-testid="input-search-suppliers"
              />
            </div>
          </div>

          {/* Active Filters Display */}
          {searchQuery && (
            <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
              <span className="text-sm text-slate-600 dark:text-slate-400">Active filters:</span>
              <Badge variant="secondary" className="text-xs">
                Search: {searchQuery}
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSearchQuery("")}
                className="h-6 px-2 text-xs"
              >
                Clear all
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Suppliers Table */}
      <Card className="border-slate-200 dark:border-slate-800">
        <CardContent className="p-0 sm:p-6">
          {/* Mobile Card View */}
          <div className="sm:hidden space-y-3 p-3">
            {filteredSuppliers?.map((supplier: Supplier) => (
              <div 
                key={supplier.id} 
                className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-4 cursor-pointer hover:border-cyan-400 dark:hover:border-cyan-600 hover:shadow-md transition-all active:scale-[0.99]"
                onClick={() => navigate(`/suppliers/${supplier.id}`)}
                data-testid={`card-supplier-${supplier.id}`}
              >
                <div className="space-y-3">
                  {/* Top Row - Supplier Name, Status, Actions */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <Avatar className="h-12 w-12 flex-shrink-0">
                        <AvatarFallback className="text-sm bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-cyan-950 dark:to-blue-950 text-cyan-600 dark:text-cyan-400 font-semibold">
                          {supplier.name?.charAt(0) || 'S'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                          {supplier.name}
                        </p>
                        {supplier.contactPerson && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                            {supplier.contactPerson}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {getStatusBadge(supplier)}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            className="h-8 w-8"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuLabel>{t('inventory:actions')}</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigate(`/suppliers/${supplier.id}`); }}>
                            <Eye className="h-4 w-4 mr-2" />
                            {t('inventory:viewSupplier')}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigate(`/suppliers/${supplier.id}/edit`); }}>
                            <Pencil className="h-4 w-4 mr-2" />
                            {t('inventory:editSupplier')}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteSupplier(supplier);
                              setShowDeleteDialog(true);
                            }}
                            className="text-red-600 focus:text-red-600"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            {t('common:delete')}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  {/* Middle Row - Contact & Location */}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-slate-500 dark:text-slate-400 text-xs mb-1">Contact</p>
                      {supplier.email && (
                        <div className="flex items-center gap-1.5 mb-1">
                          <Mail className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500 flex-shrink-0" />
                          <a 
                            href={`mailto:${supplier.email}`}
                            className="text-slate-700 dark:text-slate-300 hover:text-cyan-600 dark:hover:text-cyan-400 truncate text-xs"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {supplier.email}
                          </a>
                        </div>
                      )}
                      {supplier.phone && (
                        <div className="flex items-center gap-1.5">
                          <Phone className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500 flex-shrink-0" />
                          <a 
                            href={`tel:${supplier.phone}`}
                            className="text-slate-700 dark:text-slate-300 hover:text-cyan-600 dark:hover:text-cyan-400 text-xs"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {supplier.phone}
                          </a>
                        </div>
                      )}
                      {!supplier.email && !supplier.phone && (
                        <p className="text-slate-400 dark:text-slate-500 text-xs">No contact info</p>
                      )}
                    </div>
                    <div>
                      <p className="text-slate-500 dark:text-slate-400 text-xs mb-1">Location</p>
                      {supplier.country ? (
                        <div className="flex items-center gap-1.5">
                          <span className="text-lg">{getCountryFlag(supplier.country)}</span>
                          <p className="font-medium text-slate-700 dark:text-slate-300 text-xs truncate">
                            {supplier.country}
                          </p>
                        </div>
                      ) : (
                        <p className="text-slate-400 dark:text-slate-500 text-xs">Not specified</p>
                      )}
                    </div>
                  </div>

                  {/* Bottom Row - Stats */}
                  <div className="grid grid-cols-2 gap-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Products Supplied</p>
                      <p className="text-lg font-bold text-slate-900 dark:text-slate-100">
                        {productCountBySupplier[supplier.id] || 0}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Total Purchases</p>
                      <p className="text-lg font-bold text-slate-900 dark:text-slate-100">
                        ${parseFloat(supplier.totalPurchased || '0').toLocaleString('en-US', { 
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 0 
                        })}
                      </p>
                      {supplier.lastPurchaseDate && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          {formatDate(supplier.lastPurchaseDate)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            
            {filteredSuppliers.length === 0 && (
              <div className="text-center py-12">
                <Building2 className="h-12 w-12 text-slate-300 dark:text-slate-700 mx-auto mb-4" />
                <p className="text-slate-500 dark:text-slate-400 font-medium">No suppliers found</p>
                <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">
                  Try adjusting your search criteria
                </p>
              </div>
            )}
          </div>

          {/* Header & Controls - Always Visible */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-4 sm:px-0 py-4 sm:py-0 sm:pb-4">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">All Suppliers</h2>
              <Badge variant="secondary" className="text-sm">
                {filteredSuppliers?.length || 0}
              </Badge>
            </div>
            
            {/* Column Visibility Toggle - Desktop only */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-9 hidden sm:flex">
                  <MoreVertical className="h-4 w-4 mr-2" />
                  Columns
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>Toggle Columns</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {[
                  { key: 'name', label: 'Supplier Name' },
                  { key: 'contact', label: 'Contact' },
                  { key: 'lastPurchaseDate', label: 'Last Purchase' },
                  { key: 'totalPurchased', label: 'Total Value' },
                  { key: 'country', label: 'Location' },
                  { key: 'status', label: 'Status' },
                ].map(({ key, label }) => (
                  <DropdownMenuItem
                    key={key}
                    onClick={() => toggleColumnVisibility(key)}
                    className="flex items-center justify-between"
                  >
                    <span>{label}</span>
                    {visibleColumns[key] && <Check className="h-4 w-4 text-cyan-600" />}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Desktop Table View */}
          <div className="hidden sm:block">
            <DataTable
              columns={visibleColumnsFiltered}
              data={filteredSuppliers}
              bulkActions={bulkActions}
              getRowKey={(supplier) => supplier.id}
              itemsPerPageOptions={[10, 20, 50, 100]}
              defaultItemsPerPage={20}
              onRowClick={(supplier) => navigate(`/suppliers/${supplier.id}`)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Supplier{selectedSuppliers.length > 1 ? 's' : ''}?</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedSuppliers.length > 1 
                ? `This will permanently delete ${selectedSuppliers.length} suppliers.` 
                : deleteSupplier 
                ? `This will permanently delete "${deleteSupplier.name}".`
                : 'This will permanently delete the selected supplier.'}
              {' '}This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleBulkDelete}
              className="bg-red-600 hover:bg-red-700"
              data-testid="button-confirm-delete"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
