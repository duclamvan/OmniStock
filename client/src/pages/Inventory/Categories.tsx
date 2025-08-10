import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Link } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { DataTable, DataTableColumn } from '@/components/ui/data-table';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Search,
  Package,
  FolderOpen,
  Calendar
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
  productCount?: number;
}

export default function Categories() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null);

  // Fetch categories
  const { data: categories = [], isLoading } = useQuery<Category[]>({
    queryKey: ['/api/categories']
  });

  // Fetch products to count products per category
  const { data: products = [] } = useQuery<any[]>({
    queryKey: ['/api/products']
  });

  // Count products per category
  const categoriesWithCount = categories.map(category => ({
    ...category,
    productCount: products.filter(p => p.categoryId === category.id).length
  }));

  // Filter categories based on search
  const filteredCategories = categoriesWithCount.filter(category => 
    category.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    category.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest('DELETE', `/api/categories/${id}`);
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Category deleted successfully'
      });
      queryClient.invalidateQueries({ queryKey: ['/api/categories'] });
      setCategoryToDelete(null);
      setShowDeleteDialog(false);
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete category',
        variant: 'destructive'
      });
    }
  });

  // Bulk delete mutation
  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      await Promise.all(ids.map(id => apiRequest('DELETE', `/api/categories/${id}`)));
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: `${selectedCategories.length} categories deleted successfully`
      });
      queryClient.invalidateQueries({ queryKey: ['/api/categories'] });
      setSelectedCategories([]);
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete categories',
        variant: 'destructive'
      });
    }
  });

  const handleDelete = (id: string) => {
    setCategoryToDelete(id);
    setShowDeleteDialog(true);
  };

  const confirmDelete = () => {
    if (categoryToDelete) {
      deleteMutation.mutate(categoryToDelete);
    }
  };

  const columns: DataTableColumn<Category>[] = [
    {
      key: "name",
      header: "Category Name",
      sortable: true,
      cell: (item) => (
        <div className="flex items-center gap-2">
          <FolderOpen className="h-4 w-4 text-muted-foreground" />
          <Link href={`/inventory/categories/${item.id}`}>
            <span className="font-medium hover:underline cursor-pointer">
              {item.name}
            </span>
          </Link>
        </div>
      ),
    },
    {
      key: "description",
      header: "Description",
      cell: (item) => (
        <span className="text-muted-foreground">
          {item.description || 'No description'}
        </span>
      ),
    },
    {
      key: "productCount",
      header: "Products",
      sortable: true,
      cell: (item) => (
        <div className="flex items-center gap-2">
          <Package className="h-4 w-4 text-muted-foreground" />
          <Badge variant="secondary">
            {item.productCount || 0} products
          </Badge>
        </div>
      ),
    },
    {
      key: "createdAt",
      header: "Created",
      sortable: true,
      cell: (item) => (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <span className="text-sm">
            {format(new Date(item.createdAt), 'MMM dd, yyyy')}
          </span>
        </div>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      cell: (item) => (
        <div className="flex items-center gap-2">
          <Link href={`/inventory/categories/${item.id}/edit`}>
            <Button size="sm" variant="ghost">
              <Edit className="h-4 w-4" />
            </Button>
          </Link>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleDelete(item.id)}
            disabled={item.productCount && item.productCount > 0}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Categories</h1>
          <p className="text-muted-foreground">Manage product categories</p>
        </div>
        <Link href="/inventory/categories/add">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Category
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Categories
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{categories.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Categories
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {categoriesWithCount.filter(c => c.productCount && c.productCount > 0).length}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Products
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{products.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search Bar */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search categories..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        
        {selectedCategories.length > 0 && (
          <Button
            variant="destructive"
            onClick={() => bulkDeleteMutation.mutate(selectedCategories)}
            disabled={bulkDeleteMutation.isPending}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete {selectedCategories.length} Selected
          </Button>
        )}
      </div>

      {/* Categories Table */}
      <Card>
        <CardContent className="p-0">
          <DataTable
            columns={columns}
            data={filteredCategories}
            getRowKey={(row) => row.id}
            bulkActions={selectedCategories.length > 0 ? [
              {
                label: `Delete (${selectedCategories.length})`,
                action: (items) => bulkDeleteMutation.mutate(items.map(i => i.id)),
                variant: 'destructive' as const
              }
            ] : undefined}
          />
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Category</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this category? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setCategoryToDelete(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}