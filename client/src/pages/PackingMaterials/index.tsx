import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import { Plus, Search, Package2, Edit, Trash2, DollarSign, Layers, Archive, ExternalLink, Filter, ShoppingCart, Copy, Tag, MoreVertical, Check, FileDown, FileText } from "lucide-react";
import { exportToXLSX, exportToPDF, PDFColumn } from "@/lib/exportUtils";
import { format } from "date-fns";
import { DataTable, DataTableColumn, BulkAction } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import type { PackingMaterial } from "@shared/schema";
import { formatCurrency, formatCompactNumber } from "@/lib/currencyUtils";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

function getDisplayUrl(url: string | null): { display: string; href: string } | null {
  if (!url) return null;
  
  try {
    const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`);
    return {
      display: urlObj.hostname.replace('www.', ''),
      href: urlObj.href
    };
  } catch {
    return {
      display: url,
      href: url.startsWith('http') ? url : `https://${url}`
    };
  }
}

export default function PackingMaterials() {
  const { t } = useTranslation('warehouse');
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [supplierFilter, setSupplierFilter] = useState<string>("all");
  const { toast } = useToast();

  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>(() => {
    const saved = localStorage.getItem('packingMaterialsVisibleColumns');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return {};
      }
    }
    return {
      name: true,
      category: true,
      quantity: true,
      cost: true,
      supplier: true,
      status: true,
    };
  });

  const toggleColumnVisibility = (columnKey: string) => {
    const newVisibility = { ...visibleColumns, [columnKey]: !visibleColumns[columnKey] };
    setVisibleColumns(newVisibility);
    localStorage.setItem('packingMaterialsVisibleColumns', JSON.stringify(newVisibility));
  };

  const { data: allMaterials = [], isLoading } = useQuery<PackingMaterial[]>({
    queryKey: ["/api/packing-materials", searchQuery],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchQuery) params.set("search", searchQuery);
      const response = await fetch(`/api/packing-materials?${params}`);
      if (!response.ok) throw new Error("Failed to fetch packing materials");
      return response.json();
    },
  });

  const uniqueSuppliers = useMemo(() => {
    const suppliers = allMaterials
      .map(m => m.supplier)
      .filter((url): url is string => Boolean(url))
      .map(url => {
        const info = getDisplayUrl(url);
        return info ? info.display : url;
      });
    return Array.from(new Set(suppliers)).sort();
  }, [allMaterials]);

  const materials = useMemo(() => {
    let filtered = allMaterials;
    
    if (categoryFilter !== "all") {
      filtered = filtered.filter(m => m.category === categoryFilter);
    }
    
    if (supplierFilter !== "all") {
      filtered = filtered.filter(m => {
        const info = getDisplayUrl(m.supplier);
        return info?.display === supplierFilter;
      });
    }
    
    return filtered;
  }, [allMaterials, categoryFilter, supplierFilter]);

  const handleCopyNames = async (selectedMaterials: PackingMaterial[]) => {
    const names = selectedMaterials.map(m => m.name).join('\n');
    try {
      await navigator.clipboard.writeText(names);
      toast({
        title: t('copiedToClipboard'),
        description: t('copiedMaterialNames', { count: selectedMaterials.length }),
      });
    } catch (error) {
      toast({
        title: t('failedToCopy'),
        description: t('couldNotCopyToClipboard'),
        variant: "destructive",
      });
    }
  };

  const handleBulkDelete = async (selectedMaterials: PackingMaterial[]) => {
    if (!confirm(t('deleteMaterialsConfirm', { count: selectedMaterials.length }))) {
      return;
    }

    try {
      const ids = selectedMaterials.map(m => m.id);
      await apiRequest('POST', '/api/packing-materials/bulk-delete', { ids });

      toast({
        title: t('materialsDeleted'),
        description: t('deletedMaterialsSuccess', { count: selectedMaterials.length }),
      });

      queryClient.invalidateQueries({ queryKey: ['/api/packing-materials'] });
    } catch (error) {
      toast({
        title: t('failedToDelete'),
        description: t('couldNotDeleteMaterials'),
        variant: "destructive",
      });
    }
  };

  const handleBulkUpdateCategory = async (selectedMaterials: PackingMaterial[], category: string) => {
    try {
      const ids = selectedMaterials.map(m => m.id);
      await apiRequest('POST', '/api/packing-materials/bulk-update-category', { ids, category });

      const getCategoryLabel = (cat: string) => {
        const categoryKeys: Record<string, string> = {
          cartons: 'categoryCartons',
          filling: 'categoryFilling',
          protective: 'categoryProtective',
          supplies: 'categorySupplies',
          packaging: 'categoryPackaging'
        };
        return t(categoryKeys[cat] || cat);
      };

      toast({
        title: t('categoryUpdated'),
        description: t('updatedMaterialsCategory', { count: selectedMaterials.length, category: getCategoryLabel(category) }),
      });

      queryClient.invalidateQueries({ queryKey: ['/api/packing-materials'] });
    } catch (error) {
      toast({
        title: t('failedToUpdate'),
        description: t('couldNotUpdateCategory'),
        variant: "destructive",
      });
    }
  };

  const bulkActions: BulkAction<PackingMaterial>[] = [
    {
      type: "button",
      label: t('copyNames'),
      icon: Copy,
      variant: "ghost",
      action: handleCopyNames,
    },
    {
      type: "button",
      label: t('delete'),
      icon: Trash2,
      variant: "ghost",
      action: handleBulkDelete,
    },
    {
      type: "select",
      label: t('changeCategory'),
      icon: Tag,
      placeholder: t('changeCategory') + '...',
      options: [
        { value: "cartons", label: t('categoryCartons') },
        { value: "filling", label: t('categoryFilling') },
        { value: "protective", label: t('categoryProtective') },
        { value: "supplies", label: t('categorySupplies') },
        { value: "packaging", label: t('categoryPackaging') },
      ],
      action: handleBulkUpdateCategory,
    },
  ];

  const getCategoryLabel = (category: string) => {
    const categoryKeys: Record<string, string> = {
      cartons: 'categoryCartons',
      filling: 'categoryFilling',
      protective: 'categoryProtective',
      supplies: 'categorySupplies',
      packaging: 'categoryPackaging'
    };
    return t(categoryKeys[category] || category);
  };

  const allColumns: DataTableColumn<PackingMaterial>[] = [
    {
      key: "imageUrl",
      header: t('image'),
      className: "w-24",
      cell: (material) => (
        <div className="w-16 h-16 bg-slate-50 rounded-lg flex items-center justify-center overflow-hidden">
          {material.imageUrl ? (
            <img 
              src={material.imageUrl} 
              alt={material.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <Package2 className="h-8 w-8 text-muted-foreground" />
          )}
        </div>
      ),
    },
    {
      key: "name",
      header: t('materialName'),
      sortable: true,
      cell: (material) => (
        <div className="min-w-[200px]">
          <div className="font-semibold text-base">{material.name}</div>
          {material.code && (
            <div className="text-sm text-muted-foreground mt-0.5">{t('materialCode')}: {material.code}</div>
          )}
        </div>
      ),
    },
    {
      key: "category",
      header: t('category'),
      sortable: true,
      className: "min-w-[140px]",
      cell: (material) => {
        return material.category ? (
          <Badge variant="outline" className="text-xs">
            {getCategoryLabel(material.category)}
          </Badge>
        ) : (
          <span className="text-muted-foreground text-sm">-</span>
        );
      },
    },
    {
      key: "quantity",
      header: t('stockQty'),
      sortable: true,
      className: "text-right",
      cell: (material) => (
        <span className="font-medium text-slate-900 dark:text-slate-100">
          {material.stockQuantity ? material.stockQuantity.toLocaleString() : '-'}
        </span>
      ),
    },
    {
      key: "cost",
      header: t('unitCost'),
      sortable: true,
      className: "text-right",
      cell: (material) => (
        <span className="font-medium text-slate-900 dark:text-slate-100">
          {material.cost ? formatCurrency(parseFloat(material.cost), 'EUR') : '-'}
        </span>
      ),
    },
    {
      key: "supplier",
      header: t('supplier'),
      sortable: true,
      className: "min-w-[150px]",
      cell: (material) => {
        const urlInfo = getDisplayUrl(material.supplier);
        
        return urlInfo ? (
          <a 
            href={urlInfo.href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1 text-sm font-medium group"
            onClick={(e) => e.stopPropagation()}
          >
            {urlInfo.display}
            <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
          </a>
        ) : (
          <span className="text-muted-foreground text-sm">{t('noSupplier')}</span>
        );
      },
    },
    {
      key: "status",
      header: t('status'),
      sortable: true,
      className: "text-center",
      cell: (material) => {
        const stockQty = material.stockQuantity || 0;
        const minStock = material.minStockLevel || 10;
        const isLowStock = stockQty <= minStock;
        
        return isLowStock ? (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-800">
            {t('lowStock')}
          </Badge>
        ) : (
          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800">
            {t('inStock')}
          </Badge>
        );
      },
    },
    {
      key: "actions",
      header: t('actions'),
      className: "text-right",
      cell: (material) => {
        const urlInfo = getDisplayUrl(material.supplier);
        
        return (
          <div className="flex items-center justify-end gap-2">
            {urlInfo && (
              <a 
                href={urlInfo.href}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
              >
                <Button variant="default" size="sm" className="bg-blue-600 hover:bg-blue-700">
                  <ShoppingCart className="h-4 w-4 mr-1" />
                  {t('purchase')}
                </Button>
              </a>
            )}
            <Link href={`/packing-materials/edit/${material.id}`}>
              <Button variant="outline" size="sm">
                <Edit className="h-4 w-4 mr-1" />
                {t('edit')}
              </Button>
            </Link>
          </div>
        );
      },
    },
  ];

  const columns = allColumns.filter(col => 
    col.key === 'imageUrl' || col.key === 'actions' || visibleColumns[col.key] !== false
  );

  const stats = {
    total: materials.length,
    lowStock: materials.filter(m => (m.stockQuantity || 0) <= (m.minStockLevel || 10)).length,
    categories: Array.from(new Set(materials.map(m => m.category).filter(Boolean))).length,
    totalValue: materials.reduce((sum, m) => sum + ((parseFloat(m.cost || '0')) * (m.stockQuantity || 0)), 0),
  };

  // Export handlers
  const handleExportXLSX = () => {
    try {
      const exportData = materials.map(material => ({
        [t('materialName')]: material.name || '-',
        [t('category')]: material.category ? getCategoryLabel(material.category) : '-',
        [t('dimensions')]: material.dimensions || '-',
        [t('weight')]: material.weight ? `${material.weight} kg` : '-',
        [t('unitCost')]: material.cost ? formatCurrency(parseFloat(material.cost), 'EUR') : '-',
        [t('quantity')]: material.stockQuantity ? material.stockQuantity.toLocaleString() : '-',
        [t('supplier')]: material.supplier ? getDisplayUrl(material.supplier)?.display || material.supplier : '-',
        [t('status')]: (material.stockQuantity || 0) <= (material.minStockLevel || 10) ? t('lowStock') : t('inStock'),
      }));

      exportToXLSX(exportData, `Packing_Materials_${format(new Date(), 'yyyy-MM-dd')}`, t('packingMaterials'));
      
      toast({
        title: t('exportSuccessful'),
        description: t('exportedMaterials', { count: exportData.length, format: 'XLSX' }),
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: t('exportFailed'),
        description: t('failedToExportMaterials', { format: 'XLSX' }),
        variant: "destructive",
      });
    }
  };

  const handleExportPDF = () => {
    try {
      const exportData = materials.map(material => ({
        name: material.name || '-',
        category: material.category ? getCategoryLabel(material.category) : '-',
        dimensions: material.dimensions || '-',
        weight: material.weight ? `${material.weight} kg` : '-',
        unitPrice: material.cost ? formatCurrency(parseFloat(material.cost), 'EUR') : '-',
        stock: material.stockQuantity ? material.stockQuantity.toLocaleString() : '-',
        supplier: material.supplier ? getDisplayUrl(material.supplier)?.display || material.supplier : '-',
        status: (material.stockQuantity || 0) <= (material.minStockLevel || 10) ? t('lowStock') : t('inStock'),
      }));

      const columns: PDFColumn[] = [
        { key: 'name', header: t('materialName') },
        { key: 'category', header: t('category') },
        { key: 'dimensions', header: t('dimensions') },
        { key: 'weight', header: t('weight') },
        { key: 'unitPrice', header: t('unitCost') },
        { key: 'stock', header: t('quantity') },
        { key: 'supplier', header: t('supplier') },
        { key: 'status', header: t('status') },
      ];

      exportToPDF(t('packingMaterials'), exportData, columns, `Packing_Materials_${format(new Date(), 'yyyy-MM-dd')}`);
      
      toast({
        title: t('exportSuccessful'),
        description: t('exportedMaterials', { count: exportData.length, format: 'PDF' }),
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: t('exportFailed'),
        description: t('failedToExportMaterials', { format: 'PDF' }),
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
          <p className="text-slate-600 dark:text-slate-400 font-medium">{t('loadingPackingMaterials')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            {t('packingMaterials')}
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            {t('manageMaterialsInventory')}
          </p>
        </div>
        <div className="flex gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" data-testid="button-export">
                <FileDown className="h-4 w-4 mr-2" />
                {t('export')}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>{t('exportOptions')}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleExportXLSX} data-testid="button-export-xlsx">
                <FileDown className="h-4 w-4 mr-2" />
                {t('exportAsXLSX')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportPDF} data-testid="button-export-pdf">
                <FileText className="h-4 w-4 mr-2" />
                {t('exportAsPDF')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Link href="/packing-materials/add">
            <Button data-testid="button-add-material">
              <Plus className="h-4 w-4 mr-2" />
              {t('addMaterial')}
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
        <Card className="border-slate-200 dark:border-slate-800 hover:shadow-lg transition-shadow">
          <CardContent className="p-3 sm:p-4 md:p-6">
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
                  {t('totalMaterials')}
                </p>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <p className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-900 dark:text-slate-100 truncate cursor-help">
                        {formatCompactNumber(stats.total)}
                      </p>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="font-mono">{stats.total.toLocaleString()} {t('materials')}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <div className="flex-shrink-0 p-2 sm:p-2.5 md:p-3 rounded-xl bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-cyan-950 dark:to-blue-950">
                <Package2 className="h-5 w-5 sm:h-6 sm:w-6 md:h-7 md:w-7 text-cyan-600 dark:text-cyan-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 dark:border-slate-800 hover:shadow-lg transition-shadow">
          <CardContent className="p-3 sm:p-4 md:p-6">
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
                  {t('lowStock')}
                </p>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <p className="text-xl sm:text-2xl md:text-3xl font-bold text-amber-600 dark:text-amber-400 truncate cursor-help">
                        {formatCompactNumber(stats.lowStock)}
                      </p>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="font-mono">{stats.lowStock.toLocaleString()} {t('needsRestocking')}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <div className="flex-shrink-0 p-2 sm:p-2.5 md:p-3 rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950 dark:to-orange-950">
                <Archive className="h-5 w-5 sm:h-6 sm:w-6 md:h-7 md:w-7 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 dark:border-slate-800 hover:shadow-lg transition-shadow">
          <CardContent className="p-3 sm:p-4 md:p-6">
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
                  {t('category')}
                </p>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <p className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-900 dark:text-slate-100 truncate cursor-help">
                        {formatCompactNumber(stats.categories)}
                      </p>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="font-mono">{stats.categories.toLocaleString()} {t('uniqueCategories')}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <div className="flex-shrink-0 p-2 sm:p-2.5 md:p-3 rounded-xl bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-950 dark:to-indigo-950">
                <Layers className="h-5 w-5 sm:h-6 sm:w-6 md:h-7 md:w-7 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 dark:border-slate-800 hover:shadow-lg transition-shadow">
          <CardContent className="p-3 sm:p-4 md:p-6">
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
                  {t('totalValue')}
                </p>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <p className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-900 dark:text-slate-100 truncate cursor-help">
                        {formatCompactNumber(stats.totalValue)}
                      </p>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="font-mono">{formatCurrency(stats.totalValue, 'EUR')}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <div className="flex-shrink-0 p-2 sm:p-2.5 md:p-3 rounded-xl bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-950 dark:to-green-950">
                <DollarSign className="h-5 w-5 sm:h-6 sm:w-6 md:h-7 md:w-7 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-200 dark:border-slate-800">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-slate-600 dark:text-slate-400" />
              <CardTitle className="text-lg">{t('searchMaterials')}</CardTitle>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="hidden sm:flex">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>{t('columnSettings')}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {allColumns
                  .filter(col => col.key !== 'imageUrl' && col.key !== 'actions')
                  .map((col) => (
                    <DropdownMenuItem
                      key={col.key}
                      onClick={() => toggleColumnVisibility(col.key)}
                      className="flex items-center justify-between"
                    >
                      <span>{col.header}</span>
                      {visibleColumns[col.key] !== false && (
                        <Check className="h-4 w-4 ml-2" />
                      )}
                    </DropdownMenuItem>
                  ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="relative md:col-span-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder={t('searchMaterials')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-10 focus:border-cyan-500"
                data-testid="input-search"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="h-10 focus:border-cyan-500" data-testid="select-category">
                <SelectValue placeholder={t('filterByCategory')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('allCategories')}</SelectItem>
                <SelectItem value="cartons">{t('categoryCartons')}</SelectItem>
                <SelectItem value="filling">{t('categoryFilling')}</SelectItem>
                <SelectItem value="protective">{t('categoryProtective')}</SelectItem>
                <SelectItem value="supplies">{t('categorySupplies')}</SelectItem>
                <SelectItem value="packaging">{t('categoryPackaging')}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={supplierFilter} onValueChange={setSupplierFilter}>
              <SelectTrigger className="h-10 focus:border-cyan-500" data-testid="select-supplier">
                <SelectValue placeholder={t('filterBySupplier')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('allSuppliers')}</SelectItem>
                {uniqueSuppliers.map((supplier) => (
                  <SelectItem key={supplier} value={supplier}>
                    {supplier}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-200 dark:border-slate-800">
        <CardContent className="p-0 sm:p-6">
          {/* Mobile Card View */}
          <div className="sm:hidden space-y-3 p-3">
            {materials?.map((material) => {
              const stockQty = material.stockQuantity || 0;
              const minStock = material.minStockLevel || 10;
              const isLowStock = stockQty <= minStock;
              const urlInfo = getDisplayUrl(material.supplier);

              return (
                <div key={material.id} className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-gray-100 dark:border-slate-800 p-4">
                  <div className="space-y-3">
                    {/* Top Row - Material Image, Name, Status, Actions */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-12 h-12 bg-slate-50 dark:bg-slate-800 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0">
                          {material.imageUrl ? (
                            <img 
                              src={material.imageUrl} 
                              alt={material.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Package2 className="h-6 w-6 text-muted-foreground" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                            {material.name}
                          </p>
                          {material.code && (
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {t('materialCode')}: {material.code}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {isLowStock ? (
                          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-800">
                            {t('lowStock')}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800">
                            {t('inStock')}
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    {/* Middle Row - Key Details (grid-cols-2) */}
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500 dark:text-gray-400">{t('category')}</p>
                        <p className="font-medium text-gray-900 dark:text-gray-100">
                          {material.category ? getCategoryLabel(material.category) : 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500 dark:text-gray-400">{t('quantity')}</p>
                        <p className="font-medium text-gray-900 dark:text-gray-100">
                          {stockQty.toLocaleString()} {t('unit')}s
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500 dark:text-gray-400">{t('unitCost')}</p>
                        <p className="font-medium text-gray-900 dark:text-gray-100">
                          {material.cost ? formatCurrency(parseFloat(material.cost), 'EUR') : 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500 dark:text-gray-400">{t('dimensions')}</p>
                        <p className="font-medium text-gray-900 dark:text-gray-100">
                          {material.dimensions || 'N/A'}
                        </p>
                      </div>
                    </div>
                    
                    {/* Bottom Row - Supplier & Actions */}
                    <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-slate-800">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-500 dark:text-gray-400">{t('supplier')}</p>
                        {urlInfo ? (
                          <a 
                            href={urlInfo.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1 truncate"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {urlInfo.display}
                            <ExternalLink className="h-3 w-3 flex-shrink-0" />
                          </a>
                        ) : (
                          <p className="text-sm text-gray-500 dark:text-gray-400">{t('noSupplier')}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {urlInfo && (
                          <a 
                            href={urlInfo.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Button size="sm" className="bg-blue-600 hover:bg-blue-700 h-8">
                              <ShoppingCart className="h-3 w-3 mr-1" />
                              {t('purchase')}
                            </Button>
                          </a>
                        )}
                        <Link href={`/packing-materials/edit/${material.id}`}>
                          <Button size="sm" variant="outline" className="h-8">
                            <Edit className="h-3 w-3 mr-1" />
                            {t('edit')}
                          </Button>
                        </Link>
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
              columns={columns}
              data={materials}
              getRowKey={(material: PackingMaterial) => material.id}
              bulkActions={bulkActions}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
