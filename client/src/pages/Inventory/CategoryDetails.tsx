import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useLocation, useParams, Link } from 'wouter';
import { useTranslation } from 'react-i18next';
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
  Eye,
  MoveRight,
  Check,
  Sparkles,
  TrendingUp
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

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
  createdAt?: string;
  updatedAt?: string;
}

export default function CategoryDetails() {
  const { t } = useTranslation('inventory');
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const { id } = useParams<{ id: string }>();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showMoveDialog, setShowMoveDialog] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Don't render if ID is "add" (this is the add route)
  if (id === 'add') {
    return null;
  }

  // Fetch category data
  const { data: category, isLoading: categoryLoading } = useQuery<Category>({
    queryKey: [`/api/categories/${id}`],
    enabled: !!id && id !== 'add',
  });

  // Fetch products in this category
  const { data: allProducts = [], isLoading: productsLoading } = useQuery<Product[]>({
    queryKey: ['/api/products'],
  });

  const categoryProducts = allProducts.filter(p => p.categoryId === id);
  const otherProducts = allProducts.filter(p => p.categoryId !== id);

  // Filter products based on search
  const filteredOtherProducts = otherProducts.filter(product =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (product.sku && product.sku.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Move products mutation
  const moveProductsMutation = useMutation({
    mutationFn: async (productIds: string[]) => {
      const promises = productIds.map(productId =>
        apiRequest('PATCH', `/api/products/${productId}`, { categoryId: id })
      );
      return Promise.all(promises);
    },
    onSuccess: () => {
      toast({
        title: t('success'),
        description: t('productsMovedSuccess', { count: selectedProducts.length }),
      });
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      setShowMoveDialog(false);
      setSelectedProducts([]);
      setSearchQuery('');
    },
    onError: (error: any) => {
      toast({
        title: t('error'),
        description: error.message || t('productsMoveFailed'),
        variant: 'destructive',
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('DELETE', `/api/categories/${id}`);
    },
    onSuccess: () => {
      toast({
        title: t('success'),
        description: t('categoryDeletedSuccess'),
      });
      queryClient.invalidateQueries({ queryKey: ['/api/categories'] });
      navigate('/inventory/categories');
    },
    onError: (error: any) => {
      toast({
        title: t('error'),
        description: error.message || t('categoryDeleteFailed'),
        variant: 'destructive',
      });
    },
  });

  const handleDelete = () => {
    if (categoryProducts.length > 0) {
      toast({
        title: t('cannotDeleteCategory'),
        description: t('categoryHasProducts'),
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

  const handleMoveProducts = () => {
    if (selectedProducts.length === 0) {
      toast({
        title: t('noProductsSelected'),
        description: t('pleaseSelectProducts'),
        variant: 'destructive',
      });
      return;
    }
    moveProductsMutation.mutate(selectedProducts);
  };

  const toggleProductSelection = (productId: string) => {
    setSelectedProducts(prev =>
      prev.includes(productId)
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  const selectAllProducts = () => {
    if (selectedProducts.length === filteredOtherProducts.length) {
      setSelectedProducts([]);
    } else {
      setSelectedProducts(filteredOtherProducts.map(p => p.id));
    }
  };

  // Helper function to determine product status badge
  const getProductStatusBadge = (product: Product) => {
    if (!product.createdAt) return null;
    
    const now = new Date();
    const createdAt = new Date(product.createdAt);
    const updatedAt = product.updatedAt ? new Date(product.updatedAt) : createdAt;
    const daysSinceCreated = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
    const daysSinceUpdated = (now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60 * 24);
    
    // New product (created within last 7 days)
    if (daysSinceCreated <= 7) {
      return (
        <Badge variant="default" className="bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] px-1.5 py-0 h-4">
          <Sparkles className="h-2.5 w-2.5 mr-0.5" />
          {t('new')}
        </Badge>
      );
    }
    
    // Recently restocked (updated within last 7 days, but created more than 7 days ago)
    if (daysSinceUpdated <= 7 && daysSinceCreated > 7) {
      return (
        <Badge variant="outline" className="bg-blue-50 border-blue-300 text-blue-700 dark:bg-blue-950 dark:border-blue-700 dark:text-blue-300 text-[10px] px-1.5 py-0 h-4">
          <TrendingUp className="h-2.5 w-2.5 mr-0.5" />
          {t('restocked')}
        </Badge>
      );
    }
    
    return null;
  };

  const productColumns: DataTableColumn<Product>[] = [
    {
      key: "name",
      header: t('productName'),
      sortable: true,
      cell: (item) => (
        <div className="flex items-center gap-2">
          <Link href={`/inventory/products/${item.id}`}>
            <span className="font-medium hover:underline cursor-pointer">
              {item.name}
            </span>
          </Link>
          {getProductStatusBadge(item)}
        </div>
      ),
    },
    {
      key: "sku",
      header: t('sku'),
      cell: (item) => (
        <span className="text-gray-500 dark:text-gray-400">
          {item.sku || t('na')}
        </span>
      ),
    },
    {
      key: "quantity",
      header: t('stock'),
      sortable: true,
      cell: (item) => (
        <Badge variant={item.quantity > 0 ? 'default' : 'destructive'}>
          {item.quantity} {t('units')}
        </Badge>
      ),
    },
    {
      key: "priceEur",
      header: t('priceEur'),
      sortable: true,
      cell: (item) => (
        <span>€{parseFloat(item.priceEur).toFixed(2)}</span>
      ),
    },
    {
      key: "priceCzk",
      header: t('priceCzk'),
      sortable: true,
      cell: (item) => (
        <span>CZK {parseFloat(item.priceCzk).toFixed(2)}</span>
      ),
    },
    {
      key: "actions",
      header: t('actions'),
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

  // Remove loading state to prevent UI refresh indicators

  if (!category) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">{t('categoryNotFound')}</h2>
        <Button className="mt-4" onClick={() => window.history.back()}>
          {t('backToCategories')}
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
            onClick={() => window.history.back()}
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
          <Button 
            variant="outline"
            onClick={() => setShowMoveDialog(true)}
            disabled={otherProducts.length === 0}
          >
            <MoveRight className="mr-2 h-4 w-4" />
            {t('moveProductsHere')}
          </Button>
          <Link href={`/inventory/categories/${id}/edit`}>
            <Button variant="outline">
              <Edit className="mr-2 h-4 w-4" />
              {t('edit')}
            </Button>
          </Link>
          <Button 
            variant="destructive"
            onClick={handleDelete}
            disabled={categoryProducts.length > 0}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            {t('delete')}
          </Button>
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('totalProducts')}
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
              {t('totalStockValue')}
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
              {t('created')}
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
            <CardTitle>{t('productsInCategory')}</CardTitle>
            <Link href={`/inventory/add?categoryId=${id}`}>
              <Button size="sm">
                <Package className="mr-2 h-4 w-4" />
                {t('addProduct')}
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {categoryProducts.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Package className="mx-auto h-12 w-12 mb-2" />
              <p>{t('noProductsInCategoryYet')}</p>
              <Link href={`/inventory/add?categoryId=${id}`}>
                <Button className="mt-4" variant="outline">
                  {t('addFirstProduct')}
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
            <AlertDialogTitle>{t('deleteCategory')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('deleteCategoryWithName', { name: category.name })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>
              {t('delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Move Products Dialog */}
      <Dialog open={showMoveDialog} onOpenChange={setShowMoveDialog}>
        <DialogContent className="max-w-3xl h-[80vh] flex flex-col p-0">
          <div className="px-6 py-4 border-b">
            <DialogTitle>{t('moveProductsToCategory', { categoryName: category?.name })}</DialogTitle>
            <DialogDescription>
              {t('selectProductsToMove')}
            </DialogDescription>
          </div>
          
          <div className="flex-1 flex flex-col overflow-hidden px-6">
            {/* Search Input */}
            <div className="py-4">
              <Input
                placeholder={t('searchProducts')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full"
              />
            </div>
            
            {/* Select All Checkbox */}
            {filteredOtherProducts.length > 0 && (
              <div className="flex items-center gap-2 pb-3 border-b mb-3">
                <Checkbox
                  id="select-all"
                  checked={selectedProducts.length === filteredOtherProducts.length && filteredOtherProducts.length > 0}
                  onCheckedChange={selectAllProducts}
                />
                <label htmlFor="select-all" className="text-sm font-medium cursor-pointer">
                  {t('selectAll', { count: filteredOtherProducts.length })}
                </label>
              </div>
            )}
            
            {/* Products List - Fixed height scrollable area */}
            <div className="flex-1 overflow-y-auto mb-4" style={{ maxHeight: 'calc(100% - 120px)' }}>
              {filteredOtherProducts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {searchQuery ? t('noProductsFoundSearch') : t('noProductsToMove')}
                </div>
              ) : (
                <div className="space-y-2 pr-2">
                  {filteredOtherProducts.map((product) => (
                    <div
                      key={product.id}
                      className="flex items-start gap-3 p-4 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => toggleProductSelection(product.id)}
                    >
                      <div className="pt-0.5">
                        <Checkbox
                          checked={selectedProducts.includes(product.id)}
                          onCheckedChange={() => toggleProductSelection(product.id)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm">{product.name}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {t('sku')}: {product.sku || t('na')} | {t('stock')}: {product.quantity}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="font-semibold text-sm">€{parseFloat(product.priceEur).toFixed(2)}</div>
                        <div className="text-xs text-muted-foreground">
                          CZK {parseFloat(product.priceCzk).toFixed(2)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          
          <div className="border-t px-6 py-4 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowMoveDialog(false)}>
              {t('cancel')}
            </Button>
            <Button
              onClick={handleMoveProducts}
              disabled={selectedProducts.length === 0 || moveProductsMutation.isPending}
            >
              {moveProductsMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('moving')}
                </>
              ) : (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  {t('moveProducts', { count: selectedProducts.length, s: selectedProducts.length !== 1 ? 's' : '' })}
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}