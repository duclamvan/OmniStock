import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import { 
  Plus, 
  Search, 
  Package2, 
  Edit, 
  Trash2, 
  DollarSign, 
  Layers, 
  Archive, 
  ExternalLink, 
  Filter, 
  ShoppingCart, 
  Copy, 
  Tag, 
  MoreVertical, 
  Check, 
  FileDown, 
  FileText,
  Box,
  Boxes,
  Ruler,
  Shield,
  Wrench,
  PackageOpen,
  ChevronDown
} from "lucide-react";
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
import { useIsMobile } from "@/hooks/use-mobile";

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

function getCategoryIcon(category: string) {
  switch (category) {
    case 'cartons':
      return Box;
    case 'filling':
      return PackageOpen;
    case 'protective':
      return Shield;
    case 'supplies':
      return Wrench;
    case 'packaging':
      return Boxes;
    default:
      return Package2;
  }
}

function formatDimensionsCompact(dimensions: string | null | undefined): string {
  if (!dimensions) return '-';
  const match = dimensions.match(/(\d+)\s*[xX×]\s*(\d+)\s*[xX×]\s*(\d+)/);
  if (match) {
    return `${match[1]}×${match[2]}×${match[3]}`;
  }
  return dimensions;
}

export default function PackingMaterials() {
  const { t } = useTranslation('warehouse');
  const isMobile = useIsMobile();
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [supplierFilter, setSupplierFilter] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);
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

      const getCategoryLabelLocal = (cat: string) => {
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
        description: t('updatedMaterialsCategory', { count: selectedMaterials.length, category: getCategoryLabelLocal(category) }),
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
        const Icon = getCategoryIcon(material.category);
        return material.category ? (
          <Badge variant="outline" className="text-xs flex items-center gap-1 w-fit">
            <Icon className="h-3 w-3" />
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

  const stats = useMemo(() => {
    const cartonMaterials = allMaterials.filter(m => m.category === 'cartons');
    return {
      total: materials.length,
      lowStock: materials.filter(m => (m.stockQuantity || 0) <= (m.minStockLevel || 10)).length,
      categories: Array.from(new Set(materials.map(m => m.category).filter(Boolean))).length,
      totalValue: materials.reduce((sum, m) => sum + ((parseFloat(m.cost || '0')) * (m.stockQuantity || 0)), 0),
      cartons: cartonMaterials.reduce((sum, m) => sum + (m.stockQuantity || 0), 0),
      cartonsLow: cartonMaterials.filter(m => (m.stockQuantity || 0) <= (m.minStockLevel || 10)).length,
    };
  }, [allMaterials, materials]);

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

      const pdfColumns: PDFColumn[] = [
        { key: 'name', header: t('materialName') },
        { key: 'category', header: t('category') },
        { key: 'dimensions', header: t('dimensions') },
        { key: 'weight', header: t('weight') },
        { key: 'unitPrice', header: t('unitCost') },
        { key: 'stock', header: t('quantity') },
        { key: 'supplier', header: t('supplier') },
        { key: 'status', header: t('status') },
      ];

      exportToPDF(t('packingMaterials'), exportData, pdfColumns, `Packing_Materials_${format(new Date(), 'yyyy-MM-dd')}`);
      
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

  const handlePurchaseFromSameSupplier = (supplier: string) => {
    const urlInfo = getDisplayUrl(supplier);
    if (urlInfo) {
      window.open(urlInfo.href, '_blank');
    }
  };

  const activeFiltersCount = (categoryFilter !== 'all' ? 1 : 0) + (supplierFilter !== 'all' ? 1 : 0);

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
    <div className="space-y-4 sm:space-y-6 p-3 sm:p-4 md:p-6 max-w-full overflow-x-hidden">
      {/* Header Section - Stacks vertically on mobile */}
      <div className="flex flex-col gap-3 sm:gap-4">
        <div className="flex-1">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            {t('packingMaterials')}
          </h1>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 mt-1">
            {t('manageMaterialsInventory')}
          </p>
        </div>
        
        {/* Action Buttons - Full width on mobile, arranged horizontally */}
        <div className="flex flex-wrap gap-2 sm:flex-nowrap">
          {/* Mobile: Quick Add Carton Button */}
          <Link href="/packing-materials/add?category=cartons" className="flex-1 sm:flex-none sm:hidden">
            <Button variant="outline" className="w-full" data-testid="button-quick-add-carton">
              <Box className="h-4 w-4 mr-2" />
              {t('addCarton')}
            </Button>
          </Link>
          
          {/* Export Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="flex-1 sm:flex-none" data-testid="button-export">
                <FileDown className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">{t('export')}</span>
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
          
          {/* Add Material Button */}
          <Link href="/packing-materials/add" className="flex-1 sm:flex-none">
            <Button className="w-full sm:w-auto" data-testid="button-add-material">
              <Plus className="h-4 w-4 mr-2" />
              {t('addMaterial')}
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards - 2 columns on mobile, up to 5 on large screens */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3 md:gap-4">
        {/* Total Materials */}
        <Card className="border-slate-200 dark:border-slate-800 hover:shadow-lg transition-shadow">
          <CardContent className="p-3 sm:p-4 md:p-6">
            <div className="flex items-center justify-between gap-2 sm:gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-[10px] sm:text-xs md:text-sm font-medium text-slate-600 dark:text-slate-400 mb-0.5 sm:mb-1 truncate">
                  {t('totalMaterials')}
                </p>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-slate-900 dark:text-slate-100 truncate cursor-help">
                        {formatCompactNumber(stats.total)}
                      </p>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="font-mono">{stats.total.toLocaleString()} {t('materials')}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <div className="flex-shrink-0 p-1.5 sm:p-2 md:p-2.5 lg:p-3 rounded-lg sm:rounded-xl bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-cyan-950 dark:to-blue-950">
                <Package2 className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 lg:h-7 lg:w-7 text-cyan-600 dark:text-cyan-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Cartons Stat - NEW */}
        <Card className="border-slate-200 dark:border-slate-800 hover:shadow-lg transition-shadow">
          <CardContent className="p-3 sm:p-4 md:p-6">
            <div className="flex items-center justify-between gap-2 sm:gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-[10px] sm:text-xs md:text-sm font-medium text-slate-600 dark:text-slate-400 mb-0.5 sm:mb-1 truncate">
                  {t('cartons')}
                </p>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-blue-600 dark:text-blue-400 truncate cursor-help">
                        {formatCompactNumber(stats.cartons)}
                      </p>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="font-mono">{stats.cartons.toLocaleString()} {t('unit')}s</p>
                      {stats.cartonsLow > 0 && (
                        <p className="text-amber-500">{stats.cartonsLow} {t('lowStock')}</p>
                      )}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <div className="flex-shrink-0 p-1.5 sm:p-2 md:p-2.5 lg:p-3 rounded-lg sm:rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950">
                <Box className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 lg:h-7 lg:w-7 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Low Stock */}
        <Card className="border-slate-200 dark:border-slate-800 hover:shadow-lg transition-shadow">
          <CardContent className="p-3 sm:p-4 md:p-6">
            <div className="flex items-center justify-between gap-2 sm:gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-[10px] sm:text-xs md:text-sm font-medium text-slate-600 dark:text-slate-400 mb-0.5 sm:mb-1 truncate">
                  {t('lowStock')}
                </p>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-amber-600 dark:text-amber-400 truncate cursor-help">
                        {formatCompactNumber(stats.lowStock)}
                      </p>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="font-mono">{stats.lowStock.toLocaleString()} {t('needsRestocking')}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <div className="flex-shrink-0 p-1.5 sm:p-2 md:p-2.5 lg:p-3 rounded-lg sm:rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950 dark:to-orange-950">
                <Archive className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 lg:h-7 lg:w-7 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Categories */}
        <Card className="border-slate-200 dark:border-slate-800 hover:shadow-lg transition-shadow">
          <CardContent className="p-3 sm:p-4 md:p-6">
            <div className="flex items-center justify-between gap-2 sm:gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-[10px] sm:text-xs md:text-sm font-medium text-slate-600 dark:text-slate-400 mb-0.5 sm:mb-1 truncate">
                  {t('category')}
                </p>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-slate-900 dark:text-slate-100 truncate cursor-help">
                        {formatCompactNumber(stats.categories)}
                      </p>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="font-mono">{stats.categories.toLocaleString()} {t('uniqueCategories')}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <div className="flex-shrink-0 p-1.5 sm:p-2 md:p-2.5 lg:p-3 rounded-lg sm:rounded-xl bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-950 dark:to-indigo-950">
                <Layers className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 lg:h-7 lg:w-7 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Total Value */}
        <Card className="border-slate-200 dark:border-slate-800 hover:shadow-lg transition-shadow col-span-2 sm:col-span-1">
          <CardContent className="p-3 sm:p-4 md:p-6">
            <div className="flex items-center justify-between gap-2 sm:gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-[10px] sm:text-xs md:text-sm font-medium text-slate-600 dark:text-slate-400 mb-0.5 sm:mb-1 truncate">
                  {t('totalValue')}
                </p>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-slate-900 dark:text-slate-100 truncate cursor-help">
                        {formatCompactNumber(stats.totalValue)}
                      </p>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="font-mono">{formatCurrency(stats.totalValue, 'EUR')}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <div className="flex-shrink-0 p-1.5 sm:p-2 md:p-2.5 lg:p-3 rounded-lg sm:rounded-xl bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-950 dark:to-green-950">
                <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 lg:h-7 lg:w-7 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters Section */}
      <Card className="border-slate-200 dark:border-slate-800">
        <CardHeader className="p-3 sm:p-4 md:p-6 pb-2 sm:pb-3 md:pb-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 sm:pointer-events-none"
            >
              <Filter className="h-4 w-4 sm:h-5 sm:w-5 text-slate-600 dark:text-slate-400" />
              <CardTitle className="text-base sm:text-lg">{t('searchMaterials')}</CardTitle>
              {activeFiltersCount > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                  {activeFiltersCount}
                </Badge>
              )}
              <ChevronDown className={`h-4 w-4 text-slate-400 sm:hidden transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </button>
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
        <CardContent className={`p-3 sm:p-4 md:p-6 pt-0 space-y-3 ${!showFilters && isMobile ? 'hidden' : ''} sm:block`}>
          {/* Filters - Stack vertically on mobile */}
          <div className="flex flex-col sm:grid sm:grid-cols-3 gap-2 sm:gap-3">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder={t('searchMaterials')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-11 sm:h-10 focus:border-cyan-500"
                data-testid="input-search"
              />
            </div>
            
            {/* Category Filter with Icons */}
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="h-11 sm:h-10 focus:border-cyan-500" data-testid="select-category">
                <SelectValue placeholder={t('filterByCategory')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  <div className="flex items-center gap-2">
                    <Package2 className="h-4 w-4 text-slate-400" />
                    {t('allCategories')}
                  </div>
                </SelectItem>
                <SelectItem value="cartons">
                  <div className="flex items-center gap-2">
                    <Box className="h-4 w-4 text-blue-500" />
                    {t('categoryCartons')}
                  </div>
                </SelectItem>
                <SelectItem value="filling">
                  <div className="flex items-center gap-2">
                    <PackageOpen className="h-4 w-4 text-amber-500" />
                    {t('categoryFilling')}
                  </div>
                </SelectItem>
                <SelectItem value="protective">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-green-500" />
                    {t('categoryProtective')}
                  </div>
                </SelectItem>
                <SelectItem value="supplies">
                  <div className="flex items-center gap-2">
                    <Wrench className="h-4 w-4 text-purple-500" />
                    {t('categorySupplies')}
                  </div>
                </SelectItem>
                <SelectItem value="packaging">
                  <div className="flex items-center gap-2">
                    <Boxes className="h-4 w-4 text-cyan-500" />
                    {t('categoryPackaging')}
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            
            {/* Supplier Filter */}
            <Select value={supplierFilter} onValueChange={setSupplierFilter}>
              <SelectTrigger className="h-11 sm:h-10 focus:border-cyan-500" data-testid="select-supplier">
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
          
          {/* Active Filter Pills - Touch-friendly */}
          {(categoryFilter !== 'all' || supplierFilter !== 'all') && (
            <div className="flex flex-wrap gap-2 pt-1">
              {categoryFilter !== 'all' && (
                <Badge
                  variant="secondary"
                  className="h-8 px-3 text-sm flex items-center gap-1.5 cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95 transition-all"
                  onClick={() => setCategoryFilter('all')}
                >
                  {(() => {
                    const Icon = getCategoryIcon(categoryFilter);
                    return <Icon className="h-3.5 w-3.5" />;
                  })()}
                  {getCategoryLabel(categoryFilter)}
                  <span className="text-slate-500 ml-1">×</span>
                </Badge>
              )}
              {supplierFilter !== 'all' && (
                <Badge
                  variant="secondary"
                  className="h-8 px-3 text-sm flex items-center gap-1.5 cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95 transition-all"
                  onClick={() => setSupplierFilter('all')}
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  {supplierFilter}
                  <span className="text-slate-500 ml-1">×</span>
                </Badge>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                onClick={() => {
                  setCategoryFilter('all');
                  setSupplierFilter('all');
                }}
              >
                {t('clearAll')}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Materials List */}
      <Card className="border-slate-200 dark:border-slate-800">
        <CardContent className="p-0">
          {/* Mobile Card View */}
          <div className="sm:hidden divide-y divide-slate-100 dark:divide-slate-800">
            {materials.length === 0 ? (
              <div className="p-6 text-center">
                <Package2 className="h-12 w-12 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
                <p className="text-slate-500 dark:text-slate-400">{t('noMaterialsFound')}</p>
              </div>
            ) : (
              materials.map((material) => {
                const stockQty = material.stockQuantity || 0;
                const minStock = material.minStockLevel || 10;
                const isLowStock = stockQty <= minStock;
                const urlInfo = getDisplayUrl(material.supplier);
                const isCarton = material.category === 'cartons';
                const Icon = getCategoryIcon(material.category);

                return (
                  <div 
                    key={material.id} 
                    className="p-3 sm:p-4 bg-white dark:bg-slate-900 active:bg-slate-50 dark:active:bg-slate-800 transition-colors"
                    data-testid={`card-material-${material.id}`}
                  >
                    <div className="space-y-3">
                      {/* Top Row - Image, Name, Stock Status */}
                      <div className="flex items-start gap-3">
                        <div className="w-14 h-14 bg-slate-50 dark:bg-slate-800 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0">
                          {material.imageUrl ? (
                            <img 
                              src={material.imageUrl} 
                              alt={material.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Package2 className="h-7 w-7 text-muted-foreground" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <p className="font-semibold text-gray-900 dark:text-gray-100 leading-tight line-clamp-2">
                                {material.name}
                              </p>
                              <div className="flex items-center gap-2 mt-1 flex-wrap">
                                {material.code && (
                                  <span className="text-xs text-gray-500 dark:text-gray-400">
                                    {material.code}
                                  </span>
                                )}
                                <Badge variant="outline" className="h-5 text-[10px] flex items-center gap-1">
                                  <Icon className="h-2.5 w-2.5" />
                                  {getCategoryLabel(material.category)}
                                </Badge>
                              </div>
                            </div>
                            {isLowStock ? (
                              <Badge className="bg-red-100 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-800 flex-shrink-0 h-6 text-[10px]">
                                {t('lowStock')}
                              </Badge>
                            ) : (
                              <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800 flex-shrink-0 h-6 text-[10px]">
                                {t('inStock')}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {/* Info Grid - Compact layout */}
                      <div className={`grid ${isCarton ? 'grid-cols-3' : 'grid-cols-2'} gap-3 text-sm`}>
                        <div>
                          <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('quantity')}</p>
                          <p className="font-semibold text-gray-900 dark:text-gray-100">
                            {stockQty.toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('unitCost')}</p>
                          <p className="font-semibold text-gray-900 dark:text-gray-100">
                            {material.cost ? formatCurrency(parseFloat(material.cost), 'EUR') : '-'}
                          </p>
                        </div>
                        {/* Show dimensions prominently for cartons */}
                        {isCarton && (
                          <div>
                            <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1">
                              <Ruler className="h-2.5 w-2.5" />
                              {t('dimensions')}
                            </p>
                            <p className="font-semibold text-gray-900 dark:text-gray-100 text-xs">
                              {formatDimensionsCompact(material.dimensions)}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Supplier Row */}
                      {urlInfo && (
                        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                          <ExternalLink className="h-3 w-3" />
                          <a 
                            href={urlInfo.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 dark:text-blue-400 hover:underline truncate"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {urlInfo.display}
                          </a>
                        </div>
                      )}
                      
                      {/* Action Buttons - Full width, swipe-friendly */}
                      <div className="flex gap-2 pt-1">
                        {urlInfo && (
                          <a 
                            href={urlInfo.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Button 
                              className="w-full h-10 bg-blue-600 hover:bg-blue-700 active:bg-blue-800"
                              data-testid={`button-purchase-${material.id}`}
                            >
                              <ShoppingCart className="h-4 w-4 mr-2" />
                              {t('purchase')}
                            </Button>
                          </a>
                        )}
                        <Link href={`/packing-materials/edit/${material.id}`} className={urlInfo ? '' : 'flex-1'}>
                          <Button 
                            variant="outline" 
                            className={`h-10 ${urlInfo ? '' : 'w-full'}`}
                            data-testid={`button-edit-${material.id}`}
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            {t('edit')}
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
          
          {/* Desktop Table View */}
          <div className="hidden sm:block p-4 md:p-6">
            <DataTable
              columns={columns}
              data={materials}
              getRowKey={(material: PackingMaterial) => material.id}
              bulkActions={bulkActions}
            />
          </div>
        </CardContent>
      </Card>

      {/* Purchase from Same Supplier FAB for Carton category */}
      {categoryFilter === 'cartons' && supplierFilter !== 'all' && isMobile && (
        <div className="fixed bottom-20 right-4 z-40">
          <Button
            className="h-14 rounded-full shadow-lg bg-blue-600 hover:bg-blue-700 active:bg-blue-800 px-5"
            onClick={() => handlePurchaseFromSameSupplier(materials.find(m => {
              const info = getDisplayUrl(m.supplier);
              return info?.display === supplierFilter;
            })?.supplier || '')}
            data-testid="button-purchase-same-supplier"
          >
            <ShoppingCart className="h-5 w-5 mr-2" />
            {t('purchaseFromSupplier')}
          </Button>
        </div>
      )}
    </div>
  );
}
