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
  Calendar,
  AlertCircle
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

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";

interface Category {
  id: number;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
  productCount?: number;
}

export default function Categories() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<number[]>([]);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<number | null>(null);

  // Fetch categories with better error handling
  const { data: categories = [], isLoading, error } = useQuery<Category[]>({
    queryKey: ['/api/categories'],
    retry: 2,
    retryDelay: 1000
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
    mutationFn: async (id: number) => {
      const response = await apiRequest('DELETE', `/api/categories/${id}`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete category');
      }
      return response;
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

  const handleDelete = (id: number) => {
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
          <span className="font-medium" data-testid={`category-name-${item.id}`}>
            {item.name}
          </span>
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
      key: "created_at",
      header: "Created",
      sortable: true,
      cell: (item) => (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <span className="text-sm">
            {format(new Date(item.created_at), 'MMM dd, yyyy')}
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
            <Button 
              size="sm" 
              variant="ghost"
              data-testid={`edit-category-${item.id}`}
            >
              <Edit className="h-4 w-4" />
            </Button>
          </Link>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleDelete(item.id)}
            disabled={(item.productCount ?? 0) > 0}
            data-testid={`delete-category-${item.id}`}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <div className="h-8 w-32 mb-2 bg-gray-200 rounded animate-pulse" />
            <div className="h-4 w-48 bg-gray-200 rounded animate-pulse" />
          </div>
          <div className="h-10 w-32 bg-gray-200 rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <Card key={i}>
              <CardHeader className="pb-3">
                <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
              </CardHeader>
              <CardContent>
                <div className="h-8 w-16 bg-gray-200 rounded animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="h-96 w-full bg-gray-200 rounded animate-pulse" />
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Categories</h1>
            <p className="text-muted-foreground">Manage product categories</p>
          </div>
          <Link href="/inventory/categories/add">
            <Button data-testid="button-add-category">
              <Plus className="mr-2 h-4 w-4" />
              Add Category
            </Button>
          </Link>
        </div>
        
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error loading categories</AlertTitle>
          <AlertDescription>
            Unable to load categories. Please try refreshing the page.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Categories</h1>
          <p className="text-muted-foreground">Manage product categories</p>
        </div>
        <Link href="/inventory/categories/add">
          <Button data-testid="button-add-category">
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
              Categories with Products
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {categoriesWithCount.filter(c => c.productCount > 0).length}
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

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <CardTitle>All Categories</CardTitle>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search categories..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
                data-testid="input-search-categories"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredCategories.length === 0 ? (
            <div className="text-center py-12">
              <FolderOpen className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No categories found</h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery 
                  ? "No categories match your search criteria."
                  : "Get started by creating your first category."}
              </p>
              {!searchQuery && (
                <Link href="/inventory/categories/add">
                  <Button data-testid="button-create-first-category">
                    <Plus className="mr-2 h-4 w-4" />
                    Create Category
                  </Button>
                </Link>
              )}
            </div>
          ) : (
            <DataTable
              data={filteredCategories}
              columns={columns}
              getRowKey={(row) => row.id.toString()}
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
              Are you sure you want to delete this category? This action cannot be undone.
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