import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable, DataTableColumn } from "@/components/ui/data-table";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { fuzzySearch } from "@/lib/fuzzySearch";
import { formatCurrency, formatCompactNumber } from "@/lib/currencyUtils";
import { isUnauthorizedError } from "@/lib/authUtils";
import { exportToXLSX, exportToPDF, type PDFColumn } from "@/lib/exportUtils";
import { Plus, Search, Edit, Trash2, Package, AlertTriangle, MoreVertical, Archive, SlidersHorizontal, X, FileDown, FileUp, ArrowLeft, Sparkles, TrendingUp, Filter, PackageX, DollarSign, Settings, Check, FileText } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import * as XLSX from 'xlsx';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function AllInventory() {
  const { t } = useTranslation(['inventory', 'common']);
  const { toast } = useToast();
  const { canAccessFinancialData } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  
  // Read category from URL parameter
  const urlParams = new URLSearchParams(window.location.search);
  const categoryParam = urlParams.get('category');
  const [categoryFilter, setCategoryFilter] = useState(categoryParam || "all");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<any[]>([]);
  const [orderCounts, setOrderCounts] = useState<{ [productId: string]: number }>({});
  const [showArchive, setShowArchive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showImportDialog, setShowImportDialog] = useState(false);

  // Column visibility state with localStorage persistence
  const [columnVisibility, setColumnVisibility] = useState<{ [key: string]: boolean }>(() => {
    const saved = localStorage.getItem('inventoryVisibleColumns');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return {};
      }
    }
    // Default visible columns
    return {
      name: true,
      categoryId: true,
      quantity: true,
      unitsSold: true,
      priceEur: true,
      status: true,
      actions: true,
      // Default hidden columns
      lowStockAlert: false,
      priceCzk: false,
      importCostUsd: false,
      importCostCzk: false,
      importCostEur: false,
      sku: true,
      barcode: false,
      supplierId: false,
      warehouseId: false,
    };
  });

  // Save to localStorage whenever visibility changes
  useEffect(() => {
    localStorage.setItem('inventoryVisibleColumns', JSON.stringify(columnVisibility));
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

  // Fetch order items to calculate units sold per product
  const { data: orderItems = [] } = useQuery({
    queryKey: ['/api/order-items/all'],
    queryFn: async () => {
      const response = await fetch('/api/order-items/all', {
        credentials: 'include',
      });
      if (!response.ok) {
        return [];
      }
      return response.json();
    },
  });

  // Fetch over-allocated items
  const { data: overAllocatedItems = [] } = useQuery<any[]>({
    queryKey: ['/api/over-allocated-items'],
    staleTime: 0,
    refetchInterval: 60000,
  });

  // Fetch under-allocated items
  const { data: underAllocatedItems = [] } = useQuery<any[]>({
    queryKey: ['/api/under-allocated-items'],
    staleTime: 0,
    refetchInterval: 60000,
  });

  // Calculate units sold per product
  const unitsSoldByProduct: { [productId: string]: number } = {};
  (orderItems as any[])?.forEach((item: any) => {
    const productId = item.productId;
    if (productId) {
      unitsSoldByProduct[productId] = (unitsSoldByProduct[productId] || 0) + (item.quantity || 0);
    }
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

  // Export to XLSX
  const handleExportXLSX = () => {
    if (!filteredProducts || filteredProducts.length === 0) {
      toast({
        title: "No data to export",
        description: "There are no products to export",
        variant: "destructive",
      });
      return;
    }

    try {
      // Prepare data for export
      const exportData = filteredProducts.map((product: any) => ({
        Name: product.name,
        SKU: product.sku,
        Category: (categories as any[])?.find((c: any) => String(c.id) === product.categoryId)?.name || '',
        Quantity: product.quantity,
        'Units Sold': unitsSoldByProduct[product.id] || 0,
        'Price (EUR)': formatCurrency(parseFloat(product.priceEur || '0'), 'EUR'),
        'Price (CZK)': formatCurrency(parseFloat(product.priceCzk || '0'), 'CZK'),
        Status: product.isActive ? 'Active' : 'Inactive',
      }));

      exportToXLSX(exportData, 'inventory', 'Products');

      toast({
        title: "Export successful",
        description: `Exported ${filteredProducts.length} products to XLSX`,
      });
    } catch (error: any) {
      console.error("Export error:", error);
      toast({
        title: "Export failed",
        description: error.message || "Failed to export to XLSX",
        variant: "destructive",
      });
    }
  };

  // Export to PDF
  const handleExportPDF = () => {
    if (!filteredProducts || filteredProducts.length === 0) {
      toast({
        title: "No data to export",
        description: "There are no products to export",
        variant: "destructive",
      });
      return;
    }

    try {
      // Prepare data for export
      const exportData = filteredProducts.map((product: any) => ({
        name: product.name,
        sku: product.sku,
        category: (categories as any[])?.find((c: any) => String(c.id) === product.categoryId)?.name || '',
        quantity: product.quantity,
        unitsSold: unitsSoldByProduct[product.id] || 0,
        priceEur: formatCurrency(parseFloat(product.priceEur || '0'), 'EUR'),
        priceCzk: formatCurrency(parseFloat(product.priceCzk || '0'), 'CZK'),
        status: product.isActive ? 'Active' : 'Inactive',
      }));

      // Define columns for PDF
      const columns: PDFColumn[] = [
        { key: 'name', header: 'Name' },
        { key: 'sku', header: 'SKU' },
        { key: 'category', header: 'Category' },
        { key: 'quantity', header: 'Quantity' },
        { key: 'unitsSold', header: 'Units Sold' },
        { key: 'priceEur', header: 'Price (EUR)' },
        { key: 'priceCzk', header: 'Price (CZK)' },
        { key: 'status', header: 'Status' },
      ];

      exportToPDF('Inventory Report', exportData, columns, 'inventory');

      toast({
        title: "Export successful",
        description: `Exported ${filteredProducts.length} products to PDF`,
      });
    } catch (error: any) {
      console.error("Export error:", error);
      toast({
        title: "Export failed",
        description: error.message || "Failed to export to PDF",
        variant: "destructive",
      });
    }
  };

  // Import from Excel
  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      if (jsonData.length === 0) {
        toast({
          title: "No data found",
          description: "The Excel file is empty",
          variant: "destructive",
        });
        return;
      }

      // Process and validate data
      let successCount = 0;
      let errorCount = 0;
      const errors: string[] = [];

      for (const row of jsonData as any[]) {
        try {
          // Map Excel columns to product data
          const productData: any = {
            name: row.Name || row.name,
            sku: row.SKU || row.sku,
            barcode: row.Barcode || row.barcode || null,
            quantity: Number(row.Quantity || row.quantity || 0),
            lowStockAlert: Number(row['Low Stock Alert'] || row.lowStockAlert || 0),
            priceEur: row['Price EUR'] || row.priceEur || '0',
            priceCzk: row['Price CZK'] || row.priceCzk || '0',
            importCostUsd: row['Import Cost USD'] || row.importCostUsd || null,
            importCostEur: row['Import Cost EUR'] || row.importCostEur || null,
            importCostCzk: row['Import Cost CZK'] || row.importCostCzk || null,
            description: row.Description || row.description || '',
          };

          // Validate required fields
          if (!productData.name || !productData.sku) {
            errors.push(`Row skipped: Missing name or SKU`);
            errorCount++;
            continue;
          }

          // Find category by name
          const categoryName = row.Category || row.category;
          if (categoryName) {
            const category = (categories as any[])?.find(
              (c: any) => c.name.toLowerCase() === categoryName.toLowerCase()
            );
            if (category) {
              productData.categoryId = String(category.id);
            }
          }

          // Find warehouse by name
          const warehouseName = row.Warehouse || row.warehouse;
          if (warehouseName) {
            const warehouse = (warehouses as any[])?.find(
              (w: any) => w.name.toLowerCase() === warehouseName.toLowerCase()
            );
            if (warehouse) {
              productData.warehouseId = warehouse.id;
            }
          }

          // Check if product exists by SKU
          const existingProduct = products.find((p: any) => p.sku === productData.sku);

          if (existingProduct) {
            // Update existing product
            await apiRequest('PATCH', `/api/products/${existingProduct.id}`, productData);
          } else {
            // Create new product
            await apiRequest('POST', '/api/products', productData);
          }

          successCount++;
        } catch (error: any) {
          errorCount++;
          errors.push(`${row.Name || row.name || 'Unknown'}: ${error.message}`);
        }
      }

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      // Close dialog
      setShowImportDialog(false);

      // Refresh products
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });

      // Show result
      if (errorCount > 0) {
        toast({
          title: "Import completed with errors",
          description: `${successCount} products imported, ${errorCount} errors. Check console for details.`,
          variant: "destructive",
        });
        console.error("Import errors:", errors);
      } else {
        toast({
          title: "Import successful",
          description: `Successfully imported ${successCount} products`,
        });
      }
    } catch (error: any) {
      console.error("Import error:", error);
      toast({
        title: "Import failed",
        description: error.message || "Failed to import Excel file",
        variant: "destructive",
      });
      
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

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
    if (categoryFilter !== "all" && String(product.categoryId) !== String(categoryFilter)) {
      return false;
    }

    // Search filter
    if (!searchQuery) return true;
    
    const results = fuzzySearch([product], searchQuery, {
      fields: ['name', 'sku', 'description'],
      threshold: 0.2,
      fuzzy: true,
      vietnameseNormalization: true,
    });
    return results.length > 0;
  });

  const getStockStatus = (quantity: number, lowStockAlert: number) => {
    if (quantity <= lowStockAlert) {
      return <Badge variant="destructive">Low Stock</Badge>;
    } else if (quantity <= lowStockAlert * 2) {
      return <Badge variant="outline" className="text-orange-600 dark:text-orange-400 border-orange-600 dark:border-orange-500">Warning</Badge>;
    } else {
      return <Badge className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300">In Stock</Badge>;
    }
  };

  // Helper function to determine product status badge
  const getProductStatusBadge = (product: any) => {
    if (!product.createdAt) return null;
    
    const now = new Date();
    const createdAt = new Date(product.createdAt);
    const updatedAt = product.updatedAt ? new Date(product.updatedAt) : createdAt;
    const daysSinceCreated = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
    const daysSinceUpdated = (now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60 * 24);
    
    // New product (created within last 7 days)
    if (daysSinceCreated <= 7) {
      return (
        <Badge variant="default" className="bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] px-1.5 py-0 h-4 ml-2">
          <Sparkles className="h-2.5 w-2.5 mr-0.5" />
          New
        </Badge>
      );
    }
    
    // Recently restocked (updated within last 7 days, but created more than 7 days ago)
    if (daysSinceUpdated <= 7 && daysSinceCreated > 7) {
      return (
        <Badge variant="outline" className="bg-blue-50 border-blue-300 text-blue-700 dark:bg-blue-950 dark:border-blue-700 dark:text-blue-300 text-[10px] px-1.5 py-0 h-4 ml-2">
          <TrendingUp className="h-2.5 w-2.5 mr-0.5" />
          Restocked
        </Badge>
      );
    }
    
    return null;
  };

  // Define table columns
  const columns: DataTableColumn<any>[] = [
    {
      key: "image",
      header: "",
      sortable: false,
      className: "w-[60px]",
      cell: (product) => (
        <div className="flex items-center justify-center">
          {product.imageUrl ? (
            <img 
              src={product.imageUrl} 
              alt={product.name} 
              className="w-10 h-10 object-contain rounded flex-shrink-0 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-gray-700"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          ) : (
            <div className="w-10 h-10 bg-gray-100 dark:bg-gray-800 rounded flex items-center justify-center flex-shrink-0">
              <Package className="h-5 w-5 text-gray-400 dark:text-gray-500" />
            </div>
          )}
        </div>
      ),
    },
    {
      key: "name",
      header: "Product",
      sortable: true,
      className: "min-w-[200px]",
      cell: (product) => (
        <div>
          <Link href={`/inventory/products/${product.id}`}>
            <span className={`font-medium cursor-pointer block ${product.isActive ? 'text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300' : 'text-gray-400 dark:text-gray-500 line-through'}`}>
              {product.name}
              {!product.isActive && <span className="text-amber-600 dark:text-amber-400 font-medium ml-2">(Inactive)</span>}
              {product.isActive && getProductStatusBadge(product)}
            </span>
          </Link>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">SKU: {product.sku}</p>
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
      key: "unitsSold",
      header: "Units Sold",
      sortable: true,
      className: "text-right w-[100px]",
      cell: (product) => {
        const sold = unitsSoldByProduct[product.id] || 0;
        return (
          <div className="flex items-center justify-end gap-1.5">
            <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
            <span className="font-semibold text-emerald-700">{sold.toLocaleString()}</span>
          </div>
        );
      },
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
                    <div className="space-y-2 text-sm text-gray-500 dark:text-gray-400 mt-4">
                      <div className="text-amber-600 dark:text-amber-400 font-medium">
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
              className="text-green-600 dark:text-green-400 border-green-600 dark:border-green-500 hover:bg-green-50 dark:hover:bg-green-900/20"
              onClick={() => restoreProductMutation.mutate(product.id)}
            >
              Restore
            </Button>
          )}
        </div>
      ),
    },
  ];

  // Filter columns based on visibility and financial data access
  const visibleColumns = columns.filter(col => {
    // Hide financial columns for users without access
    if (!canAccessFinancialData && ['importCostUsd', 'importCostCzk', 'importCostEur'].includes(col.key)) {
      return false;
    }
    return columnVisibility[col.key] !== false;
  });

  // Toggle column visibility
  const toggleColumnVisibility = (key: string) => {
    // Prevent hiding Image, Product and Actions columns
    if (key === 'image' || key === 'name' || key === 'actions') {
      return;
    }
    setColumnVisibility(prev => {
      // Get current value (if undefined or true, column is shown)
      const currentValue = prev[key] !== false;
      return {
        ...prev,
        [key]: !currentValue // Toggle it
      };
    });
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[600px]">
        <div className="text-center">
          <div className="relative w-16 h-16 mx-auto mb-6">
            <div className="absolute inset-0 border-4 border-cyan-200 dark:border-cyan-800 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-cyan-600 dark:border-cyan-400 rounded-full border-t-transparent animate-spin"></div>
          </div>
          <p className="text-slate-600 dark:text-slate-400 font-medium">Loading inventory...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {showArchive && (
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setShowArchive(false)}
              className="h-9 w-9"
              data-testid="button-back-to-inventory"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
              {showArchive ? "Archived Products" : "Inventory"}
            </h1>
            {!showArchive && (
              <p className="text-slate-600 dark:text-slate-400 mt-1">
                Manage your product catalog and inventory levels
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2 w-full sm:w-auto">
          {/* Archive dropdown - always visible */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-9 px-2 sm:px-3">
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
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleImport}
                className="hidden"
                data-testid="input-file-import"
              />
              <Button 
                variant="outline" 
                size="sm" 
                className="flex-1 sm:flex-none h-9 px-2 sm:px-3 min-w-0"
                onClick={() => setShowImportDialog(true)}
                data-testid="button-import-xls"
              >
                <FileUp className="h-4 w-4 sm:mr-1.5 flex-shrink-0" />
                <span className="hidden xs:inline truncate">Import</span>
                <span className="hidden sm:inline ml-0.5">XLS</span>
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1 sm:flex-none h-9 px-2 sm:px-3 min-w-0"
                    data-testid="button-export"
                  >
                    <FileDown className="h-4 w-4 sm:mr-1.5 flex-shrink-0" />
                    <span className="hidden xs:inline truncate">Export</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Export Format</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={handleExportXLSX}
                    data-testid="menuitem-export-xlsx"
                  >
                    <FileDown className="mr-2 h-4 w-4" />
                    Export as XLSX
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={handleExportPDF}
                    data-testid="menuitem-export-pdf"
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    Export as PDF
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Link href="/inventory/add" className="flex-1 sm:flex-none">
                <Button className="w-full h-9 px-2 sm:px-4 min-w-0">
                  <Plus className="h-4 w-4 sm:mr-1.5 flex-shrink-0" />
                  <span className="hidden xs:inline truncate">Add</span>
                  <span className="hidden sm:inline ml-0.5">Product</span>
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Over-Allocated Items Warning */}
      {!showArchive && overAllocatedItems.length > 0 && (
        <Card className="bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-950/20 dark:to-orange-950/20 border-red-300 dark:border-red-700">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-red-100 dark:bg-red-900/50 rounded-lg">
                  <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-red-900 dark:text-red-100 mb-1">
                    Over-Allocated Inventory
                  </h3>
                  <p className="text-sm text-red-800 dark:text-red-200 mb-3">
                    <span className="font-bold">{overAllocatedItems.length}</span> {overAllocatedItems.length === 1 ? 'item has' : 'items have'} more quantity ordered than available in stock
                  </p>
                  <Link href="/stock/over-allocated">
                    <Button 
                      size="sm" 
                      className="bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800 text-white"
                      data-testid="button-view-over-allocated"
                    >
                      View & Resolve Issues
                    </Button>
                  </Link>
                </div>
              </div>
              <Badge variant="destructive" className="text-sm font-bold flex-shrink-0">
                {overAllocatedItems.length}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Under-Allocated Items Warning */}
      {!showArchive && underAllocatedItems.length > 0 && (
        <Card className="bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-950/20 dark:to-amber-950/20 border-yellow-300 dark:border-yellow-700">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-yellow-100 dark:bg-yellow-900/50 rounded-lg">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-yellow-900 dark:text-yellow-100 mb-1">
                    Under-Allocated Inventory
                  </h3>
                  <p className="text-sm text-yellow-800 dark:text-yellow-200 mb-3">
                    <span className="font-bold">{underAllocatedItems.length}</span> {underAllocatedItems.length === 1 ? 'item has' : 'items have'} more quantity in record than in stock locations
                  </p>
                  <Link href="/stock/under-allocated">
                    <Button 
                      size="sm" 
                      className="bg-yellow-600 hover:bg-yellow-700 dark:bg-yellow-700 dark:hover:bg-yellow-800 text-white"
                      data-testid="button-view-under-allocated"
                    >
                      View & Resolve Issues
                    </Button>
                  </Link>
                </div>
              </div>
              <Badge className="bg-yellow-600 text-white text-sm font-bold flex-shrink-0">
                {underAllocatedItems.length}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      {!showArchive && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
          {/* Total Products */}
          <Card className="border-slate-200 dark:border-slate-800 hover:shadow-lg transition-shadow">
            <CardContent className="p-3 sm:p-4 md:p-6">
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Total Products
                  </p>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <p className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-900 dark:text-slate-100 truncate cursor-help">
                          {formatCompactNumber(filteredProducts?.length || 0)}
                        </p>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="font-mono">{(filteredProducts?.length || 0).toLocaleString()} products</p>
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

          {/* Low Stock */}
          <Card className="border-slate-200 dark:border-slate-800 hover:shadow-lg transition-shadow">
            <CardContent className="p-3 sm:p-4 md:p-6">
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Low Stock
                  </p>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <p className="text-xl sm:text-2xl md:text-3xl font-bold text-amber-600 dark:text-amber-400 truncate cursor-help">
                          {formatCompactNumber(filteredProducts?.filter((p: any) => p.quantity > 0 && p.quantity <= p.lowStockAlert).length || 0)}
                        </p>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="font-mono">{(filteredProducts?.filter((p: any) => p.quantity > 0 && p.quantity <= p.lowStockAlert).length || 0).toLocaleString()} items</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <div className="flex-shrink-0 p-2 sm:p-2.5 md:p-3 rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950 dark:to-orange-950">
                  <AlertTriangle className="h-5 w-5 sm:h-6 sm:w-6 md:h-7 md:w-7 text-amber-600 dark:text-amber-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Out of Stock */}
          <Card className="border-slate-200 dark:border-slate-800 hover:shadow-lg transition-shadow">
            <CardContent className="p-3 sm:p-4 md:p-6">
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Out of Stock
                  </p>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <p className="text-xl sm:text-2xl md:text-3xl font-bold text-red-600 dark:text-red-400 truncate cursor-help">
                          {formatCompactNumber(filteredProducts?.filter((p: any) => p.quantity === 0).length || 0)}
                        </p>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="font-mono">{(filteredProducts?.filter((p: any) => p.quantity === 0).length || 0).toLocaleString()} items</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <div className="flex-shrink-0 p-2 sm:p-2.5 md:p-3 rounded-xl bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-950 dark:to-rose-950">
                  <PackageX className="h-5 w-5 sm:h-6 sm:w-6 md:h-7 md:w-7 text-red-600 dark:text-red-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Total Value */}
          <Card className="border-slate-200 dark:border-slate-800 hover:shadow-lg transition-shadow">
            <CardContent className="p-3 sm:p-4 md:p-6">
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Total Value
                  </p>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <p className="text-lg sm:text-xl md:text-2xl font-bold text-purple-600 dark:text-purple-400 truncate cursor-help">
                          {formatCurrency(
                            filteredProducts?.reduce((sum: number, p: any) => 
                              sum + (parseFloat(p.priceEur || '0') * p.quantity), 0) || 0, 
                            'EUR'
                          )}
                        </p>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="font-mono">
                          {formatCurrency(
                            filteredProducts?.reduce((sum: number, p: any) => 
                              sum + (parseFloat(p.priceEur || '0') * p.quantity), 0) || 0, 
                            'EUR'
                          )}
                        </p>
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
      )}

      {/* Filters & Search */}
      <Card className="border-slate-200 dark:border-slate-800">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-slate-600 dark:text-slate-400" />
            <CardTitle className="text-lg">Filters & Search</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div className="md:col-span-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-10 border-slate-300 dark:border-slate-700 focus:border-cyan-500 dark:focus:border-cyan-500"
                  data-testid="input-search-products"
                />
              </div>
            </div>

            {/* Category Filter */}
            <div className="flex gap-2">
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="h-10 border-slate-300 dark:border-slate-700" data-testid="select-category-filter">
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
                  className="h-10 w-10"
                  data-testid="button-clear-category-filter"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            
            {/* Column Visibility Settings */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="h-10 border-slate-300 dark:border-slate-700" data-testid="button-columns-selector">
                  <Settings className="mr-2 h-4 w-4" />
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
                      className="cursor-pointer"
                      onClick={(e) => {
                        e.preventDefault();
                        if (col.key !== 'name') {
                          toggleColumnVisibility(col.key);
                        }
                      }}
                      data-testid={`menuitem-column-${col.key}`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span>{col.label}</span>
                        {columnVisibility[col.key] !== false && col.key !== 'name' && (
                          <Check className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
                        )}
                      </div>
                    </DropdownMenuItem>
                  ))}
                  
                  <DropdownMenuSeparator />
                  
                  {/* Stock */}
                  <div className="px-2 py-1 text-xs font-semibold text-muted-foreground">Stock</div>
                  {[
                    { key: 'quantity', label: 'Qty' },
                    { key: 'unitsSold', label: 'Units Sold' },
                    { key: 'lowStockAlert', label: 'Low Stock Alert' },
                    { key: 'status', label: 'Status' },
                    { key: 'warehouseId', label: 'Warehouse' },
                  ].map(col => (
                    <DropdownMenuItem
                      key={col.key}
                      className="cursor-pointer"
                      onClick={(e) => {
                        e.preventDefault();
                        toggleColumnVisibility(col.key);
                      }}
                      data-testid={`menuitem-column-${col.key}`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span>{col.label}</span>
                        {columnVisibility[col.key] !== false && (
                          <Check className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
                        )}
                      </div>
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
                      className="cursor-pointer"
                      onClick={(e) => {
                        e.preventDefault();
                        toggleColumnVisibility(col.key);
                      }}
                      data-testid={`menuitem-column-${col.key}`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span>{col.label}</span>
                        {columnVisibility[col.key] !== false && (
                          <Check className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
                        )}
                      </div>
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
                      className="cursor-pointer"
                      onClick={(e) => {
                        e.preventDefault();
                        if (col.key !== 'actions') {
                          toggleColumnVisibility(col.key);
                        }
                      }}
                      data-testid={`menuitem-column-${col.key}`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span>{col.label}</span>
                        {columnVisibility[col.key] !== false && col.key !== 'actions' && (
                          <Check className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
                        )}
                      </div>
                    </DropdownMenuItem>
                  ))}
                </ScrollArea>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardContent>
      </Card>

      {/* Products Table */}
      <Card className="border-slate-200 dark:border-slate-800">
        <CardContent className="p-0 md:p-6">
          {/* Mobile Card View */}
          <div className="md:hidden space-y-3 p-3">
            {filteredProducts?.map((product: any) => {
              const warehouse = (warehouses as any[])?.find((w: any) => w.id === product.warehouseId);
              const unitsSold = unitsSoldByProduct[product.id] || 0;
              
              return (
                <div key={product.id} className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-gray-100 dark:border-slate-800 p-4">
                  <div className="space-y-3">
                    {/* Top Row - Product, Stock Status, Actions */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <Avatar className="h-12 w-12 flex-shrink-0">
                          <AvatarImage src={product.imageUrl} />
                          <AvatarFallback className="text-sm bg-gray-100 dark:bg-gray-800 dark:text-gray-300">{product.name?.charAt(0) || 'P'}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <Link href={`/inventory/products/${product.id}`}>
                            <p className={`font-semibold truncate cursor-pointer ${product.isActive ? 'text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400' : 'text-gray-400 dark:text-gray-500 line-through'}`}>
                              {product.name}
                              {product.isActive && getProductStatusBadge(product)}
                            </p>
                          </Link>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            SKU: {product.sku}
                            {!product.isActive && <span className="text-amber-600 font-medium ml-2">(Inactive)</span>}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {getStockStatus(product.quantity, product.lowStockAlert)}
                      </div>
                    </div>
                    
                    {/* Middle Row - Key Details */}
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500 dark:text-gray-400">Category</p>
                        <p className="font-medium text-gray-900 dark:text-gray-100">
                          {(categories as any[])?.find((c: any) => String(c.id) === product.categoryId)?.name || 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500 dark:text-gray-400">Quantity</p>
                        <p className="font-medium text-gray-900 dark:text-gray-100">{product.quantity} units</p>
                      </div>
                      <div>
                        <p className="text-gray-500 dark:text-gray-400">Location</p>
                        <p className="font-medium text-gray-900 dark:text-gray-100">
                          {warehouse?.name || 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500 dark:text-gray-400">Units Sold</p>
                        <div className="flex items-center gap-1.5">
                          <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
                          <p className="font-semibold text-emerald-700">{unitsSold.toLocaleString()}</p>
                        </div>
                      </div>
                    </div>
                    
                    {/* Pricing Section */}
                    <div className="grid grid-cols-2 gap-4 text-sm pt-2 border-t border-gray-100 dark:border-gray-800">
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Sell Price</p>
                        <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                          {formatCurrency(parseFloat(product.priceEur || '0'), 'EUR')}
                        </p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          {formatCurrency(parseFloat(product.priceCzk || '0'), 'CZK')}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Import Cost</p>
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {formatCurrency(parseFloat(product.importCostEur || '0'), 'EUR')}
                        </p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          {formatCurrency(parseFloat(product.importCostCzk || '0'), 'CZK')}
                        </p>
                      </div>
                    </div>
                    
                    {/* Action Buttons - Full Width, Touch-Friendly */}
                    <div className="flex items-center gap-2 pt-2">
                      {product.isActive ? (
                        <>
                          <Link href={`/inventory/products/${product.id}`} className="flex-1">
                            <Button variant="outline" className="w-full h-11 touch-target" data-testid="button-view-details">
                              <Package className="h-4 w-4 mr-2" />
                              View Details
                            </Button>
                          </Link>
                          <Link href={`/inventory/${product.id}/edit`} className="flex-1">
                            <Button variant="outline" className="w-full h-11 touch-target" data-testid="button-edit">
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </Button>
                          </Link>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="icon" variant="ghost" className="h-11 w-11 touch-target text-red-600 hover:text-red-700 flex-shrink-0" data-testid="button-delete">
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
                          variant="outline" 
                          className="w-full h-11 touch-target text-green-600 border-green-600 hover:bg-green-50"
                          onClick={() => restoreProductMutation.mutate(product.id)}
                          data-testid="button-restore"
                        >
                          Restore
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* Desktop Table View */}
          <div className="hidden md:block">
            <DataTable
              key={visibleColumns.map(col => col.key).join(',')}
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

      {/* Import Dialog */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Import Inventory from Excel</DialogTitle>
            <DialogDescription>
              Upload an Excel file to create or update products in bulk
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
              <h4 className="font-semibold text-sm mb-2">Important Notes:</h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• Products with existing SKU will be <strong>updated</strong></li>
                <li>• Products with new SKU will be <strong>created</strong></li>
                <li>• Name and SKU are required for each row</li>
                <li>• Categories and Warehouses must match existing names (case-insensitive)</li>
              </ul>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-lg">
              <h4 className="font-semibold text-sm mb-3">Required Excel Format:</h4>
              
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium mb-1">Required Columns:</p>
                  <div className="flex flex-wrap gap-2">
                    <code className="text-xs bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-2 py-1 rounded">Name</code>
                    <code className="text-xs bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-2 py-1 rounded">SKU</code>
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium mb-1">Optional Columns:</p>
                  <div className="flex flex-wrap gap-2">
                    <code className="text-xs bg-slate-200 dark:bg-slate-800 px-2 py-1 rounded">Barcode</code>
                    <code className="text-xs bg-slate-200 dark:bg-slate-800 px-2 py-1 rounded">Category</code>
                    <code className="text-xs bg-slate-200 dark:bg-slate-800 px-2 py-1 rounded">Quantity</code>
                    <code className="text-xs bg-slate-200 dark:bg-slate-800 px-2 py-1 rounded">Low Stock Alert</code>
                    <code className="text-xs bg-slate-200 dark:bg-slate-800 px-2 py-1 rounded">Price EUR</code>
                    <code className="text-xs bg-slate-200 dark:bg-slate-800 px-2 py-1 rounded">Price CZK</code>
                    <code className="text-xs bg-slate-200 dark:bg-slate-800 px-2 py-1 rounded">Import Cost USD</code>
                    <code className="text-xs bg-slate-200 dark:bg-slate-800 px-2 py-1 rounded">Import Cost EUR</code>
                    <code className="text-xs bg-slate-200 dark:bg-slate-800 px-2 py-1 rounded">Import Cost CZK</code>
                    <code className="text-xs bg-slate-200 dark:bg-slate-800 px-2 py-1 rounded">Warehouse</code>
                    <code className="text-xs bg-slate-200 dark:bg-slate-800 px-2 py-1 rounded">Description</code>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <h4 className="font-semibold text-sm mb-2">Example Row:</h4>
              <div className="overflow-x-auto">
                <table className="text-xs w-full border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Name</th>
                      <th className="text-left p-2">SKU</th>
                      <th className="text-left p-2">Category</th>
                      <th className="text-left p-2">Quantity</th>
                      <th className="text-left p-2">Price EUR</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b">
                      <td className="p-2">Gel Polish Red</td>
                      <td className="p-2">GP-RED-001</td>
                      <td className="p-2">Gel Polish</td>
                      <td className="p-2">50</td>
                      <td className="p-2">8.50</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="space-y-2">
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => fileInputRef.current?.click()}
                data-testid="button-select-import-file"
              >
                <FileUp className="mr-2 h-4 w-4" />
                Select Excel File (.xlsx, .xls)
              </Button>
              <p className="text-xs text-center text-muted-foreground">
                Tip: Export your current inventory first to get the correct format
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowImportDialog(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
