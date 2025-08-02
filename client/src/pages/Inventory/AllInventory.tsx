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
import { Plus, Search, Edit, Trash2, Package, AlertTriangle } from "lucide-react";
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

export default function AllInventory() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<any[]>([]);

  const { data: products = [], isLoading, error } = useQuery({
    queryKey: searchQuery ? ['/api/products', searchQuery] : ['/api/products'],
  });

  const { data: categories } = useQuery({
    queryKey: ['/api/categories'],
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
        description: "Product deleted successfully",
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

  // Filter products based on search query and category
  const filteredProducts = products?.filter((product: any) => {
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
      cell: (product) => (
        <div className="flex items-center gap-2">
          {product.imageUrl ? (
            <img 
              src={product.imageUrl} 
              alt={product.name} 
              className="w-10 h-10 object-cover rounded"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          ) : (
            <div className="w-10 h-10 bg-gray-100 rounded flex items-center justify-center">
              <Package className="h-5 w-5 text-gray-400" />
            </div>
          )}
          <div>
            <Link href={`/inventory/${product.id}/edit`}>
              <span className="font-medium text-blue-600 hover:text-blue-800 cursor-pointer">
                {product.name}
              </span>
            </Link>
            <div className="text-xs text-gray-500">{product.description?.slice(0, 50)}...</div>
          </div>
        </div>
      ),
    },
    {
      key: "sku",
      header: "SKU",
      sortable: true,
    },
    {
      key: "categoryId",
      header: "Category",
      sortable: true,
      cell: (product) => {
        const category = categories?.find((c: any) => c.id === product.categoryId);
        return category?.name || '-';
      },
    },
    {
      key: "quantity",
      header: "Quantity",
      sortable: true,
      className: "text-right",
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
      key: "status",
      header: "Status",
      cell: (product) => getStockStatus(product.quantity, product.lowStockAlert),
    },
    {
      key: "actions",
      header: "Actions",
      cell: (product) => (
        <div className="flex items-center gap-1">
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
                  Are you sure you want to delete "{product.name}"? This action cannot be undone.
                </AlertDialogDescription>
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
        </div>
      ),
    },
  ];

  // Bulk actions
  const bulkActions = [
    {
      label: "Update Stock",
      action: (products: any[]) => {
        toast({
          title: "Bulk Update",
          description: `Updating stock for ${products.length} products...`,
        });
      },
    },
    {
      label: "Delete",
      variant: "destructive" as const,
      action: (products: any[]) => {
        setSelectedProducts(products);
        setShowDeleteDialog(true);
      },
    },
    {
      label: "Export",
      action: (products: any[]) => {
        toast({
          title: "Export",
          description: `Exporting ${products.length} products...`,
        });
      },
    },
  ];

  const handleDeleteConfirm = () => {
    Promise.all(selectedProducts.map(product => 
      deleteProductMutation.mutateAsync(product.id)
    )).then(() => {
      setSelectedProducts([]);
      setShowDeleteDialog(false);
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-slate-600">Loading inventory...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Inventory</h1>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm">
            Import from XLS
          </Button>
          <Link href="/inventory/add">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Product
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Package className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-slate-600">Total Products</p>
                <p className="text-2xl font-bold text-slate-900">{products?.length || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <AlertTriangle className="h-8 w-8 text-orange-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-slate-600">Low Stock Items</p>
                <p className="text-2xl font-bold text-slate-900">
                  {products?.filter((p: any) => p.quantity <= p.lowStockAlert).length || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Package className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-slate-600">Categories</p>
                <p className="text-2xl font-bold text-slate-900">{categories?.length || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Package className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-slate-600">Total Value</p>
                <p className="text-2xl font-bold text-slate-900">
                  {formatCurrency(
                    products?.reduce((sum: number, p: any) => 
                      sum + (parseFloat(p.priceEur || '0') * p.quantity), 0) || 0, 
                    'EUR'
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search products by name, SKU, or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories?.map((category: any) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Products Table */}
      <Card>
        <CardHeader>
          <CardTitle>Products ({filteredProducts?.length || 0})</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            data={filteredProducts}
            columns={columns}
            bulkActions={bulkActions}
            getRowKey={(product) => product.id}
            itemsPerPageOptions={[10, 20, 50, 100]}
            defaultItemsPerPage={20}
          />
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Products</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedProducts.length} product(s)? This action cannot be undone.
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
