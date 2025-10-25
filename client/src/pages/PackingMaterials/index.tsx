import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
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
        title: "Copied to clipboard",
        description: `Copied ${selectedMaterials.length} material name(s)`,
      });
    } catch (error) {
      toast({
        title: "Failed to copy",
        description: "Could not copy to clipboard",
        variant: "destructive",
      });
    }
  };

  const handleBulkDelete = async (selectedMaterials: PackingMaterial[]) => {
    if (!confirm(`Are you sure you want to delete ${selectedMaterials.length} material(s)?`)) {
      return;
    }

    try {
      const ids = selectedMaterials.map(m => m.id);
      await apiRequest('POST', '/api/packing-materials/bulk-delete', { ids });

      toast({
        title: "Materials deleted",
        description: `Successfully deleted ${selectedMaterials.length} material(s)`,
      });

      queryClient.invalidateQueries({ queryKey: ['/api/packing-materials'] });
    } catch (error) {
      toast({
        title: "Failed to delete",
        description: "Could not delete materials",
        variant: "destructive",
      });
    }
  };

  const handleBulkUpdateCategory = async (selectedMaterials: PackingMaterial[], category: string) => {
    try {
      const ids = selectedMaterials.map(m => m.id);
      await apiRequest('POST', '/api/packing-materials/bulk-update-category', { ids, category });

      const categoryLabels: Record<string, string> = {
        cartons: "Cartons & Boxes",
        filling: "Filling Materials",
        protective: "Protective Materials",
        supplies: "General Supplies",
        packaging: "Product Packaging"
      };

      toast({
        title: "Category updated",
        description: `Updated ${selectedMaterials.length} material(s) to ${categoryLabels[category]}`,
      });

      queryClient.invalidateQueries({ queryKey: ['/api/packing-materials'] });
    } catch (error) {
      toast({
        title: "Failed to update",
        description: "Could not update category",
        variant: "destructive",
      });
    }
  };

  const bulkActions: BulkAction<PackingMaterial>[] = [
    {
      type: "button",
      label: "Copy Names",
      icon: Copy,
      variant: "ghost",
      action: handleCopyNames,
    },
    {
      type: "button",
      label: "Delete",
      icon: Trash2,
      variant: "ghost",
      action: handleBulkDelete,
    },
    {
      type: "select",
      label: "Change Category",
      icon: Tag,
      placeholder: "Change category...",
      options: [
        { value: "cartons", label: "Cartons & Boxes" },
        { value: "filling", label: "Filling Materials" },
        { value: "protective", label: "Protective Materials" },
        { value: "supplies", label: "General Supplies" },
        { value: "packaging", label: "Product Packaging" },
      ],
      action: handleBulkUpdateCategory,
    },
  ];

  const allColumns: DataTableColumn<PackingMaterial>[] = [
    {
      key: "imageUrl",
      header: "Image",
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
      header: "Name",
      sortable: true,
      cell: (material) => (
        <div className="min-w-[200px]">
          <div className="font-semibold text-base">{material.name}</div>
          {material.code && (
            <div className="text-sm text-muted-foreground mt-0.5">Code: {material.code}</div>
          )}
        </div>
      ),
    },
    {
      key: "category",
      header: "Category",
      sortable: true,
      className: "min-w-[140px]",
      cell: (material) => {
        const categoryLabels: Record<string, string> = {
          cartons: "Cartons & Boxes",
          filling: "Filling Materials",
          protective: "Protective Materials",
          supplies: "General Supplies",
          packaging: "Product Packaging"
        };
        
        return material.category ? (
          <Badge variant="outline" className="text-xs">
            {categoryLabels[material.category] || material.category}
          </Badge>
        ) : (
          <span className="text-muted-foreground text-sm">-</span>
        );
      },
    },
    {
      key: "quantity",
      header: "Stock Qty",
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
      header: "Unit Cost",
      sortable: true,
      className: "text-right",
      cell: (material) => (
        <span className="font-medium text-slate-900 dark:text-slate-100">
          {material.unitCost ? formatCurrency(material.unitCost, 'EUR') : '-'}
        </span>
      ),
    },
    {
      key: "supplier",
      header: "Supplier",
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
          <span className="text-muted-foreground text-sm">No supplier</span>
        );
      },
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      className: "text-center",
      cell: (material) => {
        const stockQty = material.stockQuantity || 0;
        const minStock = material.minStockLevel || 10;
        const isLowStock = stockQty <= minStock;
        
        return isLowStock ? (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-800">
            Low Stock
          </Badge>
        ) : (
          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800">
            In Stock
          </Badge>
        );
      },
    },
    {
      key: "actions",
      header: "Actions",
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
                  Purchase
                </Button>
              </a>
            )}
            <Link href={`/packing-materials/edit/${material.id}`}>
              <Button variant="outline" size="sm">
                <Edit className="h-4 w-4 mr-1" />
                Edit
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
    totalValue: materials.reduce((sum, m) => sum + ((m.unitCost || 0) * (m.stockQuantity || 0)), 0),
  };

  // Export handlers
  const handleExportXLSX = () => {
    try {
      const exportData = materials.map(material => ({
        'Name': material.name || '-',
        'Category': material.category === 'cartons' ? 'Cartons & Boxes'
          : material.category === 'filling' ? 'Filling Materials'
          : material.category === 'protective' ? 'Protective Materials'
          : material.category === 'supplies' ? 'General Supplies'
          : material.category === 'packaging' ? 'Product Packaging'
          : material.category || '-',
        'Dimensions': material.dimensions || '-',
        'Weight': material.weight ? `${material.weight} kg` : '-',
        'Unit Price': material.unitCost ? formatCurrency(material.unitCost, 'EUR') : '-',
        'Stock': material.stockQuantity ? material.stockQuantity.toLocaleString() : '-',
        'Supplier': material.supplier ? getDisplayUrl(material.supplier)?.display || material.supplier : '-',
        'Status': (material.stockQuantity || 0) <= (material.minStockLevel || 10) ? 'Low Stock' : 'In Stock',
      }));

      exportToXLSX(exportData, `Packing_Materials_${format(new Date(), 'yyyy-MM-dd')}`, 'Packing Materials');
      
      toast({
        title: "Export Successful",
        description: `Exported ${exportData.length} material(s) to XLSX`,
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Export Failed",
        description: "Failed to export packing materials to XLSX",
        variant: "destructive",
      });
    }
  };

  const handleExportPDF = () => {
    try {
      const exportData = materials.map(material => ({
        name: material.name || '-',
        category: material.category === 'cartons' ? 'Cartons & Boxes'
          : material.category === 'filling' ? 'Filling Materials'
          : material.category === 'protective' ? 'Protective Materials'
          : material.category === 'supplies' ? 'General Supplies'
          : material.category === 'packaging' ? 'Product Packaging'
          : material.category || '-',
        dimensions: material.dimensions || '-',
        weight: material.weight ? `${material.weight} kg` : '-',
        unitPrice: material.unitCost ? formatCurrency(material.unitCost, 'EUR') : '-',
        stock: material.stockQuantity ? material.stockQuantity.toLocaleString() : '-',
        supplier: material.supplier ? getDisplayUrl(material.supplier)?.display || material.supplier : '-',
        status: (material.stockQuantity || 0) <= (material.minStockLevel || 10) ? 'Low Stock' : 'In Stock',
      }));

      const columns: PDFColumn[] = [
        { key: 'name', header: 'Name' },
        { key: 'category', header: 'Category' },
        { key: 'dimensions', header: 'Dimensions' },
        { key: 'weight', header: 'Weight' },
        { key: 'unitPrice', header: 'Unit Price' },
        { key: 'stock', header: 'Stock' },
        { key: 'supplier', header: 'Supplier' },
        { key: 'status', header: 'Status' },
      ];

      exportToPDF('Packing Materials Report', exportData, columns, `Packing_Materials_${format(new Date(), 'yyyy-MM-dd')}`);
      
      toast({
        title: "Export Successful",
        description: `Exported ${exportData.length} material(s) to PDF`,
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Export Failed",
        description: "Failed to export packing materials to PDF",
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
          <p className="text-slate-600 dark:text-slate-400 font-medium">Loading packing materials...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            Packing Materials
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Manage packing materials inventory and suppliers
          </p>
        </div>
        <div className="flex gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" data-testid="button-export">
                <FileDown className="h-4 w-4 mr-2" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Export Options</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleExportXLSX} data-testid="button-export-xlsx">
                <FileDown className="h-4 w-4 mr-2" />
                Export as XLSX
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportPDF} data-testid="button-export-pdf">
                <FileText className="h-4 w-4 mr-2" />
                Export as PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Link href="/packing-materials/add">
            <Button data-testid="button-add-material">
              <Plus className="h-4 w-4 mr-2" />
              Add Material
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-slate-200 dark:border-slate-800 hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Total Materials
                </p>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <p className="text-3xl font-bold text-slate-900 dark:text-slate-100 truncate cursor-help">
                        {formatCompactNumber(stats.total)}
                      </p>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="font-mono">{stats.total.toLocaleString()} materials</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <div className="flex-shrink-0 p-3 rounded-xl bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-cyan-950 dark:to-blue-950">
                <Package2 className="h-7 w-7 text-cyan-600 dark:text-cyan-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 dark:border-slate-800 hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Low Stock
                </p>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <p className="text-3xl font-bold text-amber-600 dark:text-amber-400 truncate cursor-help">
                        {formatCompactNumber(stats.lowStock)}
                      </p>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="font-mono">{stats.lowStock.toLocaleString()} items need restocking</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <div className="flex-shrink-0 p-3 rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950 dark:to-orange-950">
                <Archive className="h-7 w-7 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 dark:border-slate-800 hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Categories
                </p>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <p className="text-3xl font-bold text-slate-900 dark:text-slate-100 truncate cursor-help">
                        {formatCompactNumber(stats.categories)}
                      </p>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="font-mono">{stats.categories.toLocaleString()} unique categories</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <div className="flex-shrink-0 p-3 rounded-xl bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-950 dark:to-indigo-950">
                <Layers className="h-7 w-7 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 dark:border-slate-800 hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Total Value
                </p>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <p className="text-3xl font-bold text-slate-900 dark:text-slate-100 truncate cursor-help">
                        {formatCompactNumber(stats.totalValue)}
                      </p>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="font-mono">{formatCurrency(stats.totalValue, 'EUR')}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <div className="flex-shrink-0 p-3 rounded-xl bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-950 dark:to-green-950">
                <DollarSign className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
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
              <CardTitle className="text-lg">Filters & Search</CardTitle>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>Column Visibility</DropdownMenuLabel>
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
                placeholder="Search materials..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-10 focus:border-cyan-500"
                data-testid="input-search"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="h-10 focus:border-cyan-500" data-testid="select-category">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="cartons">Cartons & Boxes</SelectItem>
                <SelectItem value="filling">Filling Materials</SelectItem>
                <SelectItem value="protective">Protective Materials</SelectItem>
                <SelectItem value="supplies">General Supplies</SelectItem>
                <SelectItem value="packaging">Product Packaging</SelectItem>
              </SelectContent>
            </Select>
            <Select value={supplierFilter} onValueChange={setSupplierFilter}>
              <SelectTrigger className="h-10 focus:border-cyan-500" data-testid="select-supplier">
                <SelectValue placeholder="Supplier" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Suppliers</SelectItem>
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

      <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
        <DataTable
          columns={columns}
          data={materials}
          getRowKey={(material: PackingMaterial) => material.id}
          bulkActions={bulkActions}
        />
      </div>
    </div>
  );
}
