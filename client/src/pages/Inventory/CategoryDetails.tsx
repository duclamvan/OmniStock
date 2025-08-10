import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useLocation, useParams, Link } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DataTable, DataTableColumn } from '@/components/ui/data-table';
import { 
  ArrowLeft, 
  Edit, 
  Trash2,
  Package,
  Calendar,
  FolderOpen,
  Loader2,
  Eye
} from 'lucide-react';
import { format } from 'date-fns';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
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

interface Category {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
}

interface Product {
  id: string;
  name: string;
  sku?: string;
  quantity: number;
  priceCzk: string;
  priceEur: string;
  categoryId: string;
}

export default function CategoryDetails() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const { id } = useParams<{ id: string }>();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Fetch category data
  const { data: category, isLoading: categoryLoading } = useQuery<Category>({
    queryKey: [`/api/categories/${id}`],
    enabled: !!id,
  });

  // Fetch products in this category
  const { data: allProducts = [], isLoading: productsLoading } = useQuery<Product[]>({
    queryKey: ['/api/products'],
  });

  const categoryProducts = allProducts.filter(p => p.categoryId === id);

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('DELETE', `/api/categories/${id}`);
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Category deleted successfully',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/categories'] });
      navigate('/inventory/categories');
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete category',
        variant: 'destructive',
      });
    },
  });

  const handleDelete = () => {
    if (categoryProducts.length > 0) {
      toast({
        title: 'Cannot Delete',
        description: 'Category has products. Please remove all products first.',
        variant: 'destructive',
      });
      return;
    }
    setShowDeleteDialog(true);
  };

  const confirmDelete = () => {
    deleteMutation.mutate();
    setShowDeleteDialog(false);
  };

  const productColumns: DataTableColumn<Product>[] = [
    {
      key: "name",
      header: "Product Name",
      sortable: true,
      cell: (item) => (
        <Link href={`/inventory/products/${item.id}`}>
          <span className="font-medium hover:underline cursor-pointer">
            {item.name}
          </span>
        </Link>
      ),
    },
    {
      key: "sku",
      header: "SKU",
      cell: (item) => (
        <span className="text-muted-foreground">
          {item.sku || 'N/A'}
        </span>
      ),
    },
    {
      key: "quantity",
      header: "Stock",
      sortable: true,
      cell: (item) => (
        <Badge variant={item.quantity > 0 ? 'default' : 'destructive'}>
          {item.quantity} units
        </Badge>
      ),
    },
    {
      key: "priceEur",
      header: "Price (EUR)",
      sortable: true,
      cell: (item) => (
        <span>€{parseFloat(item.priceEur).toFixed(2)}</span>
      ),
    },
    {
      key: "priceCzk",
      header: "Price (CZK)",
      sortable: true,
      cell: (item) => (
        <span>CZK {parseFloat(item.priceCzk).toFixed(2)}</span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      cell: (item) => (
        <div className="flex items-center gap-2">
          <Link href={`/inventory/products/${item.id}`}>
            <Button size="sm" variant="ghost">
              <Eye className="h-4 w-4" />
            </Button>
          </Link>
          <Link href={`/inventory/${item.id}/edit`}>
            <Button size="sm" variant="ghost">
              <Edit className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      ),
    },
  ];

  if (categoryLoading || productsLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!category) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold">Category not found</h2>
        <Button className="mt-4" onClick={() => navigate('/inventory/categories')}>
          Back to Categories
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/inventory/categories')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <FolderOpen className="h-6 w-6 text-muted-foreground" />
              <h1 className="text-2xl font-bold">{category.name}</h1>
            </div>
            {category.description && (
              <p className="text-muted-foreground mt-1">{category.description}</p>
            )}
          </div>
        </div>
        
        <div className="flex gap-2">
          <Link href={`/inventory/categories/${id}/edit`}>
            <Button variant="outline">
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </Button>
          </Link>
          <Button 
            variant="destructive"
            onClick={handleDelete}
            disabled={categoryProducts.length > 0}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </Button>
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Products
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-muted-foreground" />
              <span className="text-2xl font-bold">{categoryProducts.length}</span>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Stock Value
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              €{categoryProducts.reduce((sum, p) => 
                sum + (p.quantity * parseFloat(p.priceEur)), 0
              ).toFixed(2)}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Created
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <span className="text-lg">
                {format(new Date(category.createdAt), 'MMM dd, yyyy')}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Products Table */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Products in this Category</CardTitle>
            <Link href="/inventory/add">
              <Button size="sm">
                <Package className="mr-2 h-4 w-4" />
                Add Product
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {categoryProducts.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Package className="mx-auto h-12 w-12 mb-2" />
              <p>No products in this category yet</p>
              <Link href="/inventory/add">
                <Button className="mt-4" variant="outline">
                  Add First Product
                </Button>
              </Link>
            </div>
          ) : (
            <DataTable
              columns={productColumns}
              data={categoryProducts}
              getRowKey={(row) => row.id}
            />
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Category</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{category.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}