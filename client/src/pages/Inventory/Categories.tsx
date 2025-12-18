import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Link, useLocation } from 'wouter';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { DataTable, DataTableColumn } from '@/components/ui/data-table';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Search,
  Package,
  FolderOpen,
  Calendar,
  AlertCircle,
  MoreVertical,
  Download,
  FileDown,
  Check,
  RefreshCw
} from 'lucide-react';
import { format } from 'date-fns';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { exportToXLSX } from '@/lib/exportUtils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

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
  const { t } = useTranslation('inventory');
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<number[]>([]);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<number | null>(null);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  // Fetch categories with better error handling
  const { data: categories = [], isLoading, error } = useQuery<Category[]>({
    queryKey: ['/api/categories'],
    retry: 2,
    retryDelay: 1000
  });

  // Fetch products for the total count in stats
  const { data: products = [] } = useQuery<any[]>({
    queryKey: ['/api/products']
  });

  // Use categories directly - productCount already comes from the API
  const categoriesWithCount = categories;

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
        throw new Error(error.message || t('categoryDeleteFailed'));
      }
      return response;
    },
    onSuccess: () => {
      toast({
        title: t('success'),
        description: t('categoryDeletedSuccess')
      });
      queryClient.invalidateQueries({ queryKey: ['/api/categories'] });
      setCategoryToDelete(null);
      setShowDeleteDialog(false);
    },
    onError: (error: any) => {
      toast({
        title: t('error'),
        description: error.message || t('categoryDeleteFailed'),
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

  // Handle row click to navigate to filtered products
  const handleRowClick = (category: Category) => {
    setLocation(`/inventory?category=${category.id}`);
  };

  // Export categories to Excel
  const handleExportXLSX = () => {
    if (!categories || categories.length === 0) {
      toast({
        title: t('error'),
        description: t('noCategoryDataToExport'),
        variant: 'destructive',
      });
      return;
    }

    try {
      const exportData = categories.map((category: any) => ({
        'Name (EN)': category.name || category.nameEn || '',
        'Name (CZ)': category.nameCz || '',
        'Name (VN)': category.nameVn || '',
        'Description': category.description || '',
        'Product Count': category.productCount || 0,
        'Created Date': category.created_at ? format(new Date(category.created_at), 'yyyy-MM-dd') : '',
        'Updated Date': category.updated_at ? format(new Date(category.updated_at), 'yyyy-MM-dd') : '',
      }));

      exportToXLSX(exportData, `Categories_${format(new Date(), 'yyyy-MM-dd')}`);

      toast({
        title: t('success'),
        description: t('categoryExportSuccess', { count: categories.length }),
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: t('error'),
        description: t('categoryExportFailed'),
        variant: 'destructive',
      });
    }
  };

  // Download category import template
  const handleDownloadTemplate = () => {
    try {
      const templateData = [
        {
          'Name (EN)': 'Electronics',
          'Name (CZ)': 'Elektronika',
          'Name (VN)': 'Điện tử',
          'Description': 'Electronic devices and accessories',
        },
        {
          'Name (EN)': 'Clothing',
          'Name (CZ)': 'Oblečení',
          'Name (VN)': 'Quần áo',
          'Description': 'Fashion and apparel items',
        },
      ];

      exportToXLSX(templateData, 'Categories_Import_Template');

      toast({
        title: t('success'),
        description: t('templateDownloaded'),
      });
    } catch (error) {
      console.error('Template download error:', error);
      toast({
        title: t('error'),
        description: t('templateDownloadFailed'),
        variant: 'destructive',
      });
    }
  };

  // Handle file selection for import
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImportFile(file);
    }
  };

  // Handle import
  const handleImport = async () => {
    if (!importFile) return;

    setIsImporting(true);
    try {
      const formData = new FormData();
      formData.append('file', importFile);

      const response = await fetch('/api/categories/import', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || t('categoryImportFailed'));
      }

      toast({
        title: t('success'),
        description: t('categoryImportSuccess', { count: result.importedCount }),
      });

      queryClient.invalidateQueries({ queryKey: ['/api/categories'] });
      setShowImportDialog(false);
      setImportFile(null);
    } catch (error: any) {
      console.error('Import error:', error);
      toast({
        title: t('error'),
        description: error.message || t('categoryImportFailed'),
        variant: 'destructive',
      });
    } finally {
      setIsImporting(false);
    }
  };

  const columns: DataTableColumn<Category>[] = [
    {
      key: "name",
      header: t('categoryName'),
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
      header: t('description'),
      cell: (item) => (
        <span className="text-muted-foreground">
          {item.description || t('noDescription')}
        </span>
      ),
    },
    {
      key: "productCount",
      header: t('products'),
      sortable: true,
      cell: (item) => {
        const count = item.productCount || 0;
        return (
          <div className="flex items-center gap-2">
            <Package className={`h-4 w-4 ${count > 0 ? 'text-green-500' : 'text-gray-400'}`} />
            <span className={`font-medium ${count > 0 ? 'text-gray-900 dark:text-gray-100' : 'text-gray-400'}`}>
              {count}
            </span>
            <span className="text-sm text-muted-foreground">
              {count === 1 ? t('product') : t('products')}
            </span>
          </div>
        );
      },
    },
    {
      key: "created_at",
      header: t('created'),
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
      header: t('actions'),
      cell: (item) => (
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
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
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(item.id);
            }}
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
            <div className="h-8 w-32 mb-2 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            <div className="h-4 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          </div>
          <div className="h-10 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
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
            <h1 className="text-2xl font-bold">{t('categories')}</h1>
            <p className="text-muted-foreground">{t('manageProductCategories')}</p>
          </div>
          <Link href="/inventory/categories/add">
            <Button data-testid="button-add-category">
              <Plus className="mr-2 h-4 w-4" />
              {t('addCategory')}
            </Button>
          </Link>
        </div>
        
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{t('errorLoadingCategories')}</AlertTitle>
          <AlertDescription>
            {t('unableToLoadCategories')}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6 overflow-x-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">{t('categories')}</h1>
          <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400">{t('manageProductCategories')}</p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {/* Import/Export Menu - LEFT of Add Category */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                data-testid="button-category-import-export-menu"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>{t('categoryImportExport')}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setShowImportDialog(true)} data-testid="menu-import-categories">
                <Download className="h-4 w-4 mr-2" />
                {t('importCategoriesFromExcel')}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleExportXLSX} data-testid="menu-export-categories">
                <FileDown className="h-4 w-4 mr-2" />
                {t('exportCategoriesToExcel')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Link href="/inventory/categories/add" className="flex-1 sm:flex-none">
            <Button data-testid="button-add-category" className="w-full sm:w-auto">
              <Plus className="mr-2 h-4 w-4" />
              {t('addCategory')}
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-4">
        <Card>
          <CardContent className="p-3 sm:p-4 md:pt-6">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs sm:text-sm font-medium text-muted-foreground truncate">
                  {t('totalCategories')}
                </p>
                <p className="text-xl sm:text-2xl md:text-3xl font-bold mt-1 sm:mt-2">{categories.length}</p>
              </div>
              <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-blue-100 dark:bg-blue-950 flex items-center justify-center flex-shrink-0">
                <FolderOpen className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4 md:pt-6">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs sm:text-sm font-medium text-muted-foreground truncate">
                  {t('withProducts')}
                </p>
                <p className="text-xl sm:text-2xl md:text-3xl font-bold mt-1 sm:mt-2">
                  {categoriesWithCount.filter(c => (c.productCount ?? 0) > 0).length}
                </p>
              </div>
              <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-green-100 dark:bg-green-950 flex items-center justify-center flex-shrink-0">
                <Package className="h-5 w-5 sm:h-6 sm:w-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="col-span-2 sm:col-span-1">
          <CardContent className="p-3 sm:p-4 md:pt-6">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs sm:text-sm font-medium text-muted-foreground truncate">
                  {t('totalProducts')}
                </p>
                <p className="text-xl sm:text-2xl md:text-3xl font-bold mt-1 sm:mt-2">{products.length}</p>
              </div>
              <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-purple-100 dark:bg-purple-950 flex items-center justify-center flex-shrink-0">
                <Package className="h-5 w-5 sm:h-6 sm:w-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <CardTitle>{t('allCategories')}</CardTitle>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('searchCategories')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
                data-testid="input-search-categories"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0 sm:p-6">
          {filteredCategories.length === 0 ? (
            <div className="text-center py-12 px-4">
              <FolderOpen className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">{t('noCategoriesFound')}</h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery 
                  ? t('noCategoriesMatchSearch')
                  : t('createFirstCategory')}
              </p>
              {!searchQuery && (
                <Link href="/inventory/categories/add">
                  <Button data-testid="button-create-first-category">
                    <Plus className="mr-2 h-4 w-4" />
                    {t('createCategory')}
                  </Button>
                </Link>
              )}
            </div>
          ) : (
            <>
              {/* Mobile Card View */}
              <div className="sm:hidden space-y-3 p-3">
                {filteredCategories.map((category) => {
                  const productCount = category.productCount || 0;
                  const hasProducts = productCount > 0;
                  
                  return (
                    <div 
                      key={category.id} 
                      className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-100 dark:border-slate-700 p-4"
                      onClick={() => handleRowClick(category)}
                    >
                      <div className="space-y-3">
                        {/* Top Row - Category Name, Icon, Actions */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-3 flex-1 min-w-0">
                            <div className="flex-shrink-0 h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-950 flex items-center justify-center">
                              <FolderOpen className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p 
                                className="font-semibold text-gray-900 dark:text-gray-100 truncate cursor-pointer hover:text-blue-600"
                                data-testid={`category-name-${category.id}`}
                              >
                                {category.name}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                                {category.description || t('noDescription')}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            {hasProducts ? (
                              <Badge className="bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300 text-xs">
                                {t('active')}
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-gray-500 text-xs">
                                {t('empty')}
                              </Badge>
                            )}
                          </div>
                        </div>
                        
                        {/* Middle Row - Key Details */}
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-gray-500 dark:text-gray-400 text-xs">{t('products')}</p>
                            <div className="flex items-center gap-1.5 mt-1">
                              <Package className={`h-4 w-4 ${hasProducts ? 'text-green-500' : 'text-gray-400'}`} />
                              <span className={`font-semibold ${hasProducts ? 'text-gray-900 dark:text-gray-100' : 'text-gray-400'}`}>
                                {productCount}
                              </span>
                            </div>
                          </div>
                          <div>
                            <p className="text-gray-500 dark:text-gray-400 text-xs">{t('created')}</p>
                            <div className="flex items-center gap-1.5 mt-1">
                              <Calendar className="h-4 w-4 text-gray-500" />
                              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                {format(new Date(category.created_at), 'MMM dd, yyyy')}
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        {/* Bottom Row - Actions */}
                        <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-slate-700">
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {t('updated')}: {format(new Date(category.updated_at), 'MMM dd, yyyy')}
                          </div>
                          <div className="flex items-center gap-1">
                            <Link href={`/inventory/categories/${category.id}/edit`}>
                              <Button 
                                size="sm" 
                                variant="ghost"
                                className="h-8 w-8 p-0"
                                onClick={(e) => e.stopPropagation()}
                                data-testid={`edit-category-${category.id}`}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            </Link>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 text-red-600 hover:text-red-700 disabled:opacity-30"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(category.id);
                              }}
                              disabled={productCount > 0}
                              data-testid={`delete-category-${category.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {/* Desktop Table View */}
              <div className="hidden sm:block">
                <DataTable
                  data={filteredCategories}
                  columns={columns}
                  getRowKey={(row) => row.id.toString()}
                  onRowClick={handleRowClick}
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('deleteCategory')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('deleteCategoryConfirmation')}
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

      {/* Import Categories Dialog */}
      <Dialog open={showImportDialog} onOpenChange={(open) => {
        setShowImportDialog(open);
        if (!open) {
          setImportFile(null);
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('importCategories')}</DialogTitle>
            <DialogDescription>
              {t('importCategoriesDescription')}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Template Download Section */}
            <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex items-start gap-3">
                <FileDown className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                    {t('downloadCategoryTemplateFirst')}
                  </p>
                  <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                    {t('categoryTemplateDescription')}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDownloadTemplate}
                    className="mt-3"
                    data-testid="button-download-category-template"
                  >
                    <FileDown className="h-4 w-4 mr-2" />
                    {t('downloadCategoryTemplate')}
                  </Button>
                </div>
              </div>
            </div>

            {/* File Upload Section */}
            <div className="space-y-2">
              <Label htmlFor="category-import-file">{t('selectCategoryFile')}</Label>
              <Input
                id="category-import-file"
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileSelect}
                className="cursor-pointer"
                data-testid="input-category-import-file"
              />
              {importFile && (
                <p className="text-sm text-green-600 dark:text-green-400 flex items-center gap-2">
                  <Check className="h-4 w-4" />
                  {importFile.name}
                </p>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => {
                setShowImportDialog(false);
                setImportFile(null);
              }}
              data-testid="button-cancel-category-import"
            >
              {t('cancel')}
            </Button>
            <Button
              onClick={handleImport}
              disabled={!importFile || isImporting}
              data-testid="button-confirm-category-import"
            >
              {isImporting ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  {t('importing')}
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  {t('importCategories')}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}