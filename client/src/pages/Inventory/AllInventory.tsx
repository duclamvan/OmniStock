import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable, DataTableColumn } from "@/components/ui/data-table";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { createVietnameseSearchMatcher } from "@/lib/vietnameseSearch";
import { formatCurrency } from "@/lib/currencyUtils";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Plus, Search, Edit, Trash2, Package, AlertTriangle, MoreVertical, Archive, SlidersHorizontal, X } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function AllInventory() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  
  // Read category from URL parameter
  const urlParams = new URLSearchParams(window.location.search);
  const categoryParam = urlParams.get('category');
  const [categoryFilter, setCategoryFilter] = useState(categoryParam || "all");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<any[]>([]);
  const [orderCounts, setOrderCounts] = useState<{ [productId: string]: number }>({});
  const [showArchive, setShowArchive] = useState(false);

  // Column visibility state with localStorage
  const [columnVisibility, setColumnVisibility] = useState<{ [key: string]: boolean }>(() => {
    const saved = localStorage.getItem('inventory-visible-columns');
    if (saved) {
      return JSON.parse(saved);
    }
    // Default visible columns
    return {
      name: true,
      categoryId: true,
      quantity: true,
      priceEur: true,
      status: true,
      actions: true,
      // Default hidden columns
      lowStockAlert: false,
      priceCzk: false,
      importCostUsd: false,
      importCostCzk: false,
      importCostEur: false,
      sku: false,
      barcode: false,
      supplierId: false,
      warehouseId: false,
    };
  });

  // Save to localStorage whenever visibility changes
  useEffect(() => {
    localStorage.setItem('inventory-visible-columns', JSON.stringify(columnVisibility));
  }, [columnVisibility]);

  const { data: products = [], isLoading, error } = useQuery({
    queryKey: showArchive ? ['/api/products', 'archive'] : ['/api/products'],
    queryFn: async () => {
      const url = showArchive ? '/api/products?includeInactive=true' : '/api/products';
      const response = await fetch(url, {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to fetch products');
      }
      return response.json();
    },
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['/api/categories'],
  });

  const { data: warehouses = [] } = useQuery({
    queryKey: ['/api/warehouses'],
  });



  // Error handling
  useEffect(() => {
    if (error) {
      toast({
        title: "Error",
        description: "Failed to load products",
        variant: "destructive",
      });
    }
  }, [error, toast]);

  const updateProductMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      await apiRequest('PATCH', `/api/products/${id}`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      toast({
        title: "Success",
        description: "Product updated successfully",
      });
    },
    onError: (error) => {
      console.error("Product update error:", error);
      toast({
        title: "Error",
        description: "Failed to update product",
        variant: "destructive",
      });
    },
  });

  const deleteProductMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest('DELETE', `/api/products/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      toast({
        title: "Success",
        description: "Product marked as inactive",
      });
    },
    onError: (error: any) => {
      console.error("Product delete error:", error);
      const errorMessage = error.message || "Failed to delete product";
      toast({
        title: "Error",
        description: errorMessage.includes('referenced') || errorMessage.includes('constraint')
          ? "Cannot delete product - it's being used in existing orders" 
          : errorMessage,
        variant: "destructive",
      });
    },
  });

  const restoreProductMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest('PATCH', `/api/products/${id}`, { isActive: true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      toast({
        title: "Success",
        description: "Product restored successfully",
      });
    },
    onError: (error) => {
      console.error("Product restore error:", error);
      toast({
        title: "Error",
        description: "Failed to restore product",
        variant: "destructive",
      });
    },
  });

  const archiveProductMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest('PATCH', `/api/products/${id}`, { isActive: false });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      toast({
        title: "Success",
        description: "Product moved to archive",
      });
    },
    onError: (error) => {
      console.error("Product archive error:", error);
      toast({
        title: "Error",
        description: "Failed to archive product",
        variant: "destructive",
      });
    },
  });

  // Filter products based on search query, category, and archive status
  const filteredProducts = products?.filter((product: any) => {
    // Archive filter - only show inactive products in archive mode
    if (showArchive && product.isActive) {
      return false;
    }
    if (!showArchive && !product.isActive) {
      return false;
    }

    // Category filter
    if (categoryFilter !== "all" && product.categoryId !== categoryFilter) {
      return false;
    }

    // Search filter
    if (!searchQuery) return true;
    
    const matcher = createVietnameseSearchMatcher(searchQuery);
    return (
      matcher(product.name || '') ||
      matcher(product.sku || '') ||
      matcher(product.description || '')
    );
  });

  const getStockStatus = (quantity: number, lowStockAlert: number) => {
    if (quantity <= lowStockAlert) {
      return <Badge variant="destructive">Low Stock</Badge>;
    } else if (quantity <= lowStockAlert * 2) {
      return <Badge variant="outline" className="text-orange-600 border-orange-600">Warning</Badge>;
    } else {
      return <Badge className="bg-green-100 text-green-800">In Stock</Badge>;
    }
  };

  // Define table columns
  const columns: DataTableColumn<any>[] = [
    {
      key: "name",
      header: "Product",
      sortable: true,
      className: "min-w-[250px]",
      cell: (product) => (
        <div className="flex items-center gap-3">
          {product.imageUrl ? (
            <img 
              src={product.imageUrl} 
              alt={product.name} 
              className="w-10 h-10 object-cover rounded flex-shrink-0"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          ) : (
            <div className="w-10 h-10 bg-gray-100 rounded flex items-center justify-center flex-shrink-0">
              <Package className="h-5 w-5 text-gray-400" />
            </div>
          )}
          <div className="flex-1">
            <Link href={`/inventory/products/${product.id}`}>
              <span className={`font-medium cursor-pointer block ${product.isActive ? 'text-blue-600 hover:text-blue-800' : 'text-gray-400 line-through'}`}>
                {product.name}
                {!product.isActive && <span className="text-amber-600 font-medium ml-2">(Inactive)</span>}
              </span>
            </Link>
            <p className="text-xs text-gray-500 mt-0.5">SKU: {product.sku}</p>
          </div>
        </div>
      ),
    },
    {
      key: "categoryId",
      header: "Category",
      sortable: true,
      cell: (product) => {
        const category = (categories as any[])?.find((c: any) => String(c.id) === product.categoryId);
        return category?.name || '-';
      },
    },
    {
      key: "quantity",
      header: "Qty",
      sortable: true,
      className: "text-right w-[80px]",
    },
    {
      key: "lowStockAlert",
      header: "Low Stock Alert",
      sortable: true,
      className: "text-right",
    },
    {
      key: "priceEur",
      header: "Price EUR",
      sortable: true,
      cell: (product) => formatCurrency(parseFloat(product.priceEur || '0'), 'EUR'),
      className: "text-right",
    },
    {
      key: "priceCzk",
      header: "Price CZK",
      sortable: true,
      cell: (product) => formatCurrency(parseFloat(product.priceCzk || '0'), 'CZK'),
      className: "text-right",
    },
    {
      key: "importCostUsd",
      header: "Import Cost USD",
      sortable: true,
      cell: (product) => formatCurrency(parseFloat(product.importCostUsd || '0'), 'USD'),
      className: "text-right",
    },
    {
      key: "importCostCzk",
      header: "Import Cost CZK",
      sortable: true,
      cell: (product) => formatCurrency(parseFloat(product.importCostCzk || '0'), 'CZK'),
      className: "text-right",
    },
    {
      key: "importCostEur",
      header: "Import Cost EUR",
      sortable: true,
      cell: (product) => formatCurrency(parseFloat(product.importCostEur || '0'), 'EUR'),
      className: "text-right",
    },
    {
      key: "sku",
      header: "SKU",
      sortable: true,
      cell: (product) => product.sku || '-',
    },
    {
      key: "barcode",
      header: "Barcode",
      sortable: true,
      cell: (product) => product.barcode || '-',
    },
    {
      key: "supplierId",
      header: "Supplier",
      sortable: true,
      cell: (product) => product.supplier?.name || '-',
    },
    {
      key: "warehouseId",
      header: "Warehouse",
      sortable: true,
      cell: (product) => {
        const warehouse = (warehouses as any[])?.find((w: any) => w.id === product.warehouseId);
        return warehouse?.name || '-';
      },
    },
    {
      key: "status",
      header: "Status",
      cell: (product) => getStockStatus(product.quantity, product.lowStockAlert),
    },
    {
      key: "actions",
      header: "Actions",
      cell: (product) => (
        <div className="flex items-center gap-1">
          {product.isActive ? (
            <>
              <Link href={`/inventory/${product.id}/edit`}>
                <Button size="sm" variant="ghost">
                  <Edit className="h-4 w-4" />
                </Button>
              </Link>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button size="sm" variant="ghost" className="text-red-600 hover:text-red-700">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Product</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete "{product.name}"?
                    </AlertDialogDescription>
                    <div className="space-y-2 text-sm text-muted-foreground mt-4">
                      <div className="text-amber-600 font-medium">
                        ℹ️ Product will be marked as inactive and hidden from inventory.
                      </div>
                      <div>This preserves order history while removing the product from active use.</div>
                    </div>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={() => deleteProductMutation.mutate(product.id)}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          ) : (
            <Button 
              size="sm" 
              variant="outline" 
              className="text-green-600 border-green-600 hover:bg-green-50"
              onClick={() => restoreProductMutation.mutate(product.id)}
            >
              Restore
            </Button>
          )}
        </div>
      ),
    },
  ];

  // Filter columns based on visibility
  const visibleColumns = columns.filter(col => columnVisibility[col.key] !== false);

  // Toggle column visibility
  const toggleColumnVisibility = (key: string) => {
    // Prevent hiding Product and Actions columns
    if (key === 'name' || key === 'actions') {
      return;
    }
    setColumnVisibility(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  // Bulk actions
  const bulkActions = showArchive ? [
    {
      type: "button" as const,
      label: "Restore Selected",
      action: async (products: any[]) => {
        const results = await Promise.allSettled(
          products.map(product => 
            restoreProductMutation.mutateAsync(product.id)
          )
        );
        
        const succeeded = results.filter(r => r.status === 'fulfilled').length;
        const failed = results.filter(r => r.status === 'rejected').length;
        
        if (failed > 0) {
          toast({
            title: "Partial Success",
            description: `${succeeded} products restored. ${failed} products could not be restored.`,
            variant: succeeded > 0 ? "default" : "destructive",
          });
        } else {
          toast({
            title: "Success",
            description: `All ${succeeded} products have been restored.`,
          });
        }
      },
    },
    {
      type: "button" as const,
      label: "Export",
      action: (products: any[]) => {
        toast({
          title: "Export",
          description: `Exporting ${products.length} archived products...`,
        });
      },
    },
  ] : [
    {
      type: "button" as const,
      label: "Update Stock",
      action: (products: any[]) => {
        toast({
          title: "Bulk Update",
          description: `Updating stock for ${products.length} products...`,
        });
      },
    },
    {
      type: "button" as const,
      label: "Move to Archive",
      variant: "outline" as const,
      action: async (products: any[]) => {
        const results = await Promise.allSettled(
          products.map(product => 
            archiveProductMutation.mutateAsync(product.id)
          )
        );
        
        const succeeded = results.filter(r => r.status === 'fulfilled').length;
        const failed = results.filter(r => r.status === 'rejected').length;
        
        if (failed > 0) {
          toast({
            title: "Partial Success",
            description: `${succeeded} products moved to archive. ${failed} products could not be archived.`,
            variant: succeeded > 0 ? "default" : "destructive",
          });
        } else {
          toast({
            title: "Success",
            description: `All ${succeeded} products have been moved to archive.`,
          });
        }
      },
    },
    {
      type: "button" as const,
      label: "Delete",
      variant: "destructive" as const,
      action: async (products: any[]) => {
        setSelectedProducts(products);
        
        // Fetch order counts for selected products
        try {
          const productIds = products.map(p => p.id);
          const response = await apiRequest('POST', '/api/products/order-counts', { productIds }) as unknown as { [productId: string]: number };
          setOrderCounts(response);
        } catch (error) {
          console.error("Failed to fetch order counts:", error);
          setOrderCounts({});
        }
        
        setShowDeleteDialog(true);
      },
    },
    {
      type: "button" as const,
      label: "Export",
      action: (products: any[]) => {
        toast({
          title: "Export",
          description: `Exporting ${products.length} products...`,
        });
      },
    },
  ];

  const handleDeleteConfirm = async () => {
    const results = await Promise.allSettled(
      selectedProducts.map(product => 
        deleteProductMutation.mutateAsync(product.id)
      )
    );
    
    const succeeded = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;
    
    if (failed > 0) {
      toast({
        title: "Partial Success",
        description: `${succeeded} products marked as inactive. ${failed} products could not be processed.`,
        variant: succeeded > 0 ? "default" : "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: `All ${succeeded} products have been marked as inactive.`,
      });
    }
    
    setSelectedProducts([]);
    setShowDeleteDialog(false);
  };

  // Remove loading state to prevent UI refresh indicators

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-mobile-2xl font-bold text-slate-900">
            {showArchive ? "Archive" : "Inventory"}
          </h1>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {/* Archive dropdown - always visible */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-9 px-3">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem 
                onClick={() => {
                  setShowArchive(!showArchive);
                }}
              >
                <Archive className="mr-2 h-4 w-4" />
                {showArchive ? "View Active Products" : "View Archive"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          {!showArchive && (
            <>
              <Button variant="outline" size="sm" className="flex-1 sm:flex-none touch-target">
                Import XLS
              </Button>
              <Link href="/inventory/add" className="flex-1 sm:flex-none">
                <Button className="w-full touch-target">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Product
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      {!showArchive && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center">
                <Package className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600" />
                <div className="ml-3 sm:ml-4">
                  <p className="text-mobile-sm font-medium text-slate-600">Total Products</p>
                  <p className="text-mobile-xl font-bold text-slate-900">{filteredProducts?.length || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center">
                <AlertTriangle className="h-6 w-6 sm:h-8 sm:w-8 text-orange-600" />
                <div className="ml-3 sm:ml-4">
                  <p className="text-mobile-sm font-medium text-slate-600">Low Stock</p>
                  <p className="text-mobile-xl font-bold text-slate-900">
                    {filteredProducts?.filter((p: any) => p.quantity <= p.lowStockAlert).length || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center">
                <Package className="h-6 w-6 sm:h-8 sm:w-8 text-green-600" />
                <div className="ml-3 sm:ml-4">
                  <p className="text-mobile-sm font-medium text-slate-600">Categories</p>
                  <p className="text-mobile-xl font-bold text-slate-900">{(categories as any[])?.length || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center">
                <Package className="h-6 w-6 sm:h-8 sm:w-8 text-purple-600" />
                <div className="ml-3 sm:ml-4">
                  <p className="text-mobile-sm font-medium text-slate-600">Total Value</p>
                  <p className="text-mobile-lg font-bold text-slate-900 break-all">
                    {formatCurrency(
                      filteredProducts?.reduce((sum: number, p: any) => 
                        sum + (parseFloat(p.priceEur || '0') * p.quantity), 0) || 0, 
                      'EUR'
                    )}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col gap-3 sm:gap-4 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 touch-target"
                data-testid="input-search-products"
              />
            </div>
            <div className="flex gap-2">
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-full sm:w-48 touch-target" data-testid="select-category-filter">
                  <SelectValue placeholder="Filter by category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {(categories as any[])?.map((category: any) => (
                    <SelectItem key={category.id} value={String(category.id)}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {categoryFilter !== "all" && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setCategoryFilter("all")}
                  className="touch-target"
                  data-testid="button-clear-category-filter"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            
            {/* Column Selector */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-full sm:w-auto touch-target" data-testid="button-columns-selector">
                  <SlidersHorizontal className="mr-2 h-4 w-4" />
                  Columns
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Toggle Columns</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <ScrollArea className="h-[400px]">
                  {/* Basic Info */}
                  <div className="px-2 py-1 text-xs font-semibold text-muted-foreground">Basic Info</div>
                  {[
                    { key: 'name', label: 'Product' },
                    { key: 'sku', label: 'SKU' },
                    { key: 'barcode', label: 'Barcode' },
                    { key: 'categoryId', label: 'Category' },
                  ].map(col => (
                    <DropdownMenuItem
                      key={col.key}
                      className="flex items-center gap-2 cursor-pointer"
                      onSelect={(e) => e.preventDefault()}
                      data-testid={`menuitem-column-${col.key}`}
                    >
                      <Checkbox
                        checked={columnVisibility[col.key] !== false}
                        onCheckedChange={() => toggleColumnVisibility(col.key)}
                        disabled={col.key === 'name'}
                        data-testid={`checkbox-column-${col.key}`}
                      />
                      <span className={col.key === 'name' ? 'text-muted-foreground' : ''}>{col.label}</span>
                    </DropdownMenuItem>
                  ))}
                  
                  <DropdownMenuSeparator />
                  
                  {/* Stock */}
                  <div className="px-2 py-1 text-xs font-semibold text-muted-foreground">Stock</div>
                  {[
                    { key: 'quantity', label: 'Qty' },
                    { key: 'lowStockAlert', label: 'Low Stock Alert' },
                    { key: 'status', label: 'Status' },
                    { key: 'warehouseId', label: 'Warehouse' },
                  ].map(col => (
                    <DropdownMenuItem
                      key={col.key}
                      className="flex items-center gap-2 cursor-pointer"
                      onSelect={(e) => e.preventDefault()}
                      data-testid={`menuitem-column-${col.key}`}
                    >
                      <Checkbox
                        checked={columnVisibility[col.key] !== false}
                        onCheckedChange={() => toggleColumnVisibility(col.key)}
                        data-testid={`checkbox-column-${col.key}`}
                      />
                      <span>{col.label}</span>
                    </DropdownMenuItem>
                  ))}
                  
                  <DropdownMenuSeparator />
                  
                  {/* Pricing */}
                  <div className="px-2 py-1 text-xs font-semibold text-muted-foreground">Pricing</div>
                  {[
                    { key: 'priceEur', label: 'Price EUR' },
                    { key: 'priceCzk', label: 'Price CZK' },
                    { key: 'importCostUsd', label: 'Import Cost USD' },
                    { key: 'importCostEur', label: 'Import Cost EUR' },
                    { key: 'importCostCzk', label: 'Import Cost CZK' },
                  ].map(col => (
                    <DropdownMenuItem
                      key={col.key}
                      className="flex items-center gap-2 cursor-pointer"
                      onSelect={(e) => e.preventDefault()}
                      data-testid={`menuitem-column-${col.key}`}
                    >
                      <Checkbox
                        checked={columnVisibility[col.key] !== false}
                        onCheckedChange={() => toggleColumnVisibility(col.key)}
                        data-testid={`checkbox-column-${col.key}`}
                      />
                      <span>{col.label}</span>
                    </DropdownMenuItem>
                  ))}
                  
                  <DropdownMenuSeparator />
                  
                  {/* Other */}
                  <div className="px-2 py-1 text-xs font-semibold text-muted-foreground">Other</div>
                  {[
                    { key: 'supplierId', label: 'Supplier' },
                    { key: 'actions', label: 'Actions' },
                  ].map(col => (
                    <DropdownMenuItem
                      key={col.key}
                      className="flex items-center gap-2 cursor-pointer"
                      onSelect={(e) => e.preventDefault()}
                      data-testid={`menuitem-column-${col.key}`}
                    >
                      <Checkbox
                        checked={columnVisibility[col.key] !== false}
                        onCheckedChange={() => toggleColumnVisibility(col.key)}
                        disabled={col.key === 'actions'}
                        data-testid={`checkbox-column-${col.key}`}
                      />
                      <span className={col.key === 'actions' ? 'text-muted-foreground' : ''}>{col.label}</span>
                    </DropdownMenuItem>
                  ))}
                </ScrollArea>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardContent>
      </Card>

      {/* Products Table */}
      <Card>
        <CardContent className="p-0 sm:p-6">
          {/* Mobile Card View */}
          <div className="sm:hidden space-y-3 p-3">
            {filteredProducts?.map((product: any) => (
              <div key={product.id} className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
                <div className="space-y-3">
                  {/* Top Row - Product, Stock Status, Actions */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <Avatar className="h-12 w-12 flex-shrink-0">
                        <AvatarImage src={product.imageUrl} />
                        <AvatarFallback className="text-sm bg-gray-100">{product.name?.charAt(0) || 'P'}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <Link href={`/inventory/products/${product.id}`}>
                          <p className={`font-semibold truncate cursor-pointer ${product.isActive ? 'text-gray-900 hover:text-blue-600' : 'text-gray-400 line-through'}`}>{product.name}</p>
                        </Link>
                        <p className="text-xs text-gray-500">
                          SKU: {product.sku}
                          {!product.isActive && <span className="text-amber-600 font-medium ml-2">(Inactive)</span>}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {product.isActive ? (
                        <>
                          {getStockStatus(product.quantity, product.lowStockAlert)}
                          <Link href={`/inventory/${product.id}/edit`}>
                            <Button size="icon" variant="ghost" className="h-8 w-8">
                              <Edit className="h-4 w-4" />
                            </Button>
                          </Link>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="icon" variant="ghost" className="h-8 w-8 text-red-600 hover:text-red-700">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Product</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete "{product.name}"?
                                </AlertDialogDescription>
                                <div className="space-y-2 text-sm text-muted-foreground mt-4">
                                  <div className="text-amber-600 font-medium">
                                    ℹ️ Product will be marked as inactive and hidden from inventory.
                                  </div>
                                  <div>This preserves order history while removing the product from active use.</div>
                                </div>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction 
                                  onClick={() => deleteProductMutation.mutate(product.id)}
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </>
                      ) : (
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="text-green-600 border-green-600 hover:bg-green-50"
                          onClick={() => restoreProductMutation.mutate(product.id)}
                        >
                          Restore
                        </Button>
                      )}
                    </div>
                  </div>
                  
                  {/* Middle Row - Key Details */}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">Category</p>
                      <p className="font-medium text-gray-900">
                        {(categories as any[])?.find((c: any) => String(c.id) === product.categoryId)?.name || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">Stock</p>
                      <p className="font-medium text-gray-900">{product.quantity} units</p>
                    </div>
                  </div>
                  
                  {/* Bottom Row - Pricing */}
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Sell Price / Import Cost</p>
                      <p className="text-lg font-bold text-gray-900">
                        {formatCurrency(parseFloat(product.priceEur || '0'), 'EUR')}
                      </p>
                      <p className="text-sm text-gray-600">
                        Cost: {formatCurrency(parseFloat(product.importCostEur || '0'), 'EUR')}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500">Supplier</p>
                      <p className="text-sm font-medium text-gray-900">{product.supplier?.name || 'N/A'}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {/* Desktop Table View */}
          <div className="hidden sm:block">
            <DataTable
              data={filteredProducts}
              columns={visibleColumns}
              bulkActions={bulkActions}
              getRowKey={(product) => product.id}
              itemsPerPageOptions={[10, 20, 50, 100]}
              defaultItemsPerPage={20}
              renderBulkActions={({ selectedRows, selectedItems, bulkActions: actions }) => (
                <div className="px-4 sm:px-0 pb-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h2 className="text-mobile-lg font-semibold">
                        {showArchive ? `Archived Products (${filteredProducts?.length || 0})` : `Products (${filteredProducts?.length || 0})`}
                      </h2>
                      {selectedRows.size > 0 && (
                        <>
                          <div className="h-6 w-px bg-gray-300" />
                          <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-950/20 px-3 py-1 rounded-md border border-blue-200 dark:border-blue-800">
                            <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">Selected</span>
                            <Badge variant="secondary" className="text-xs h-5 px-2 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">
                              {selectedRows.size}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-1">
                            {actions.map((action, index) => {
                              if (action.type === "button") {
                                return (
                                  <Button
                                    key={index}
                                    size="sm"
                                    variant={action.variant || "ghost"}
                                    onClick={() => action.action(selectedItems)}
                                    className="h-7 px-3 text-xs"
                                  >
                                    {action.label}
                                  </Button>
                                );
                              }
                              return null;
                            })}
                          </div>
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
            <AlertDialogTitle>Delete Products</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedProducts.length} product(s)?
            </AlertDialogDescription>
            <div className="space-y-3 text-sm text-muted-foreground mt-4">
              {selectedProducts.some(p => orderCounts[p.id] > 0) && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="font-medium text-amber-800 mb-2">⚠️ Products with order history:</div>
                  <div className="space-y-1">
                    {selectedProducts.filter(p => orderCounts[p.id] > 0).map(product => (
                      <div key={product.id} className="text-amber-700 text-xs">
                        • {product.name}: {orderCounts[product.id]} order(s)
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="text-amber-600 font-medium">
                ℹ️ Products will be marked as inactive and hidden from inventory.
              </div>
              <div>This preserves order history while removing products from active use.</div>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-red-600 hover:bg-red-700">
              Proceed with Deletion
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
