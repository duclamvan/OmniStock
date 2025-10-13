import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Plus, Search, Package2, Edit, Trash2, DollarSign, Layers, Archive, ExternalLink, Filter, ShoppingCart, Copy, Tag } from "lucide-react";
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
import type { PackingMaterial } from "@shared/schema";
import { formatCurrency } from "@/lib/currencyUtils";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

// Helper function to extract domain from URL
function getDisplayUrl(url: string | null): { display: string; href: string } | null {
  if (!url) return null;
  
  try {
    // Try to parse as URL
    const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`);
    return {
      display: urlObj.hostname.replace('www.', ''),
      href: urlObj.href
    };
  } catch {
    // If not a valid URL, treat as plain text
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

  // Get unique suppliers for filter
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

  // Filter materials by category and supplier
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

  // Bulk action handlers
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

  // Define bulk actions
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

  const columns: DataTableColumn<PackingMaterial>[] = [
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

  const stats = {
    total: materials.length,
    lowStock: materials.filter(m => (m.stockQuantity || 0) <= (m.minStockLevel || 10)).length,
    fragileProtection: materials.filter(m => m.isFragile).length,
    types: Array.from(new Set(materials.map(m => m.type).filter(Boolean))).length,
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Packing Materials</h1>
          <p className="text-muted-foreground">Manage your packing and shipping materials inventory</p>
        </div>
        <Link href="/packing-materials/add">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Material
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Materials</CardTitle>
            <Package2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock</CardTitle>
            <Archive className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.lowStock}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Fragile Protection</CardTitle>
            <Layers className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.fragileProtection}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Material Types</CardTitle>
            <Package2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.types}</div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search materials by name, code, or type..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground hidden sm:block" />
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
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
          </div>
          <Select value={supplierFilter} onValueChange={setSupplierFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
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
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-lg border">
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