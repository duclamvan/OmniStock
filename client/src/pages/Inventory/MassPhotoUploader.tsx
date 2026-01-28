import { useState, useCallback, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { usePageTitle } from "@/hooks/use-page-title";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { normalizeVietnamese } from "@/lib/fuzzySearch";
import { ArrowLeft, Search, Loader2, X, Image, ImageOff, Upload, Trash2, SortAsc, SortDesc, RefreshCw, CheckCircle2, XCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface Product {
  id: string;
  name: string;
  vietnameseName: string | null;
  sku: string;
  barcode: string | null;
  categoryId: string | null;
  imageUrl: string | null;
  images: Array<{ url: string; purpose?: string; isPrimary?: boolean }> | null;
  isActive: boolean;
}

interface Category {
  id: string;
  name: string;
}

interface UploadingProduct {
  productId: string;
  status: 'uploading' | 'success' | 'error';
  progress?: number;
}

type SortField = 'name' | 'sku' | 'hasPhoto';
type SortOrder = 'asc' | 'desc';

export default function MassPhotoUploader() {
  usePageTitle('Mass Photo Uploader', 'Mass Photo Uploader');
  const { t } = useTranslation(['inventory', 'common']);
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [photoFilter, setPhotoFilter] = useState<string>("all"); // all, with-photo, without-photo
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [uploadingProducts, setUploadingProducts] = useState<Map<string, UploadingProduct>>(new Map());
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [productToDeletePhoto, setProductToDeletePhoto] = useState<string | null>(null);
  const [enlargedImage, setEnlargedImage] = useState<string | null>(null);
  const fileInputRefs = useRef<Map<string, HTMLInputElement>>(new Map());

  const { data: products, isLoading: productsLoading, refetch } = useQuery<Product[]>({
    queryKey: ['/api/products'],
    select: (data) => data.filter(p => p.isActive !== false),
  });

  const { data: categories } = useQuery<Category[]>({
    queryKey: ['/api/categories'],
  });

  const getProductImage = (product: Product): string | null => {
    if (product.images && product.images.length > 0) {
      const primaryImage = product.images.find(img => img.isPrimary);
      return primaryImage?.url || product.images[0]?.url || null;
    }
    return product.imageUrl || null;
  };

  const filteredProducts = products?.filter((product) => {
    // Search filter
    if (searchQuery) {
      const normalizedSearch = normalizeVietnamese(searchQuery.toLowerCase());
      const searchText = normalizeVietnamese([
        product.name,
        product.vietnameseName || '',
        product.sku,
        product.barcode || '',
      ].join(' ').toLowerCase());
      if (!searchText.includes(normalizedSearch)) return false;
    }
    
    // Category filter
    if (categoryFilter !== "all" && product.categoryId !== categoryFilter) {
      return false;
    }
    
    // Photo filter
    const hasPhoto = !!getProductImage(product);
    if (photoFilter === "with-photo" && !hasPhoto) return false;
    if (photoFilter === "without-photo" && hasPhoto) return false;
    
    return true;
  }) || [];

  // Sort products
  const sortedProducts = [...filteredProducts].sort((a, b) => {
    let comparison = 0;
    
    switch (sortField) {
      case 'name':
        comparison = (a.name || '').localeCompare(b.name || '');
        break;
      case 'sku':
        comparison = (a.sku || '').localeCompare(b.sku || '');
        break;
      case 'hasPhoto':
        const aHasPhoto = !!getProductImage(a);
        const bHasPhoto = !!getProductImage(b);
        comparison = aHasPhoto === bHasPhoto ? 0 : aHasPhoto ? -1 : 1;
        break;
    }
    
    return sortOrder === 'asc' ? comparison : -comparison;
  });

  const uploadImageMutation = useMutation({
    mutationFn: async ({ productId, file }: { productId: string; file: File }) => {
      // First upload the image
      const formData = new FormData();
      formData.append('image', file);
      
      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      
      if (!uploadResponse.ok) {
        throw new Error('Failed to upload image');
      }
      
      const uploadResult = await uploadResponse.json();
      
      // Then update the product with the new image
      const updateResponse = await apiRequest('PATCH', `/api/products/${productId}`, {
        imageUrl: uploadResult.imageUrl,
        images: [{ url: uploadResult.imageUrl, isPrimary: true }],
      });
      
      return { productId, imageUrl: uploadResult.imageUrl };
    },
    onMutate: ({ productId }) => {
      setUploadingProducts(prev => new Map(prev).set(productId, { 
        productId, 
        status: 'uploading' 
      }));
    },
    onSuccess: ({ productId }) => {
      setUploadingProducts(prev => {
        const newMap = new Map(prev);
        newMap.set(productId, { productId, status: 'success' });
        return newMap;
      });
      
      // Clear success status after 2 seconds
      setTimeout(() => {
        setUploadingProducts(prev => {
          const newMap = new Map(prev);
          newMap.delete(productId);
          return newMap;
        });
      }, 2000);
      
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
    },
    onError: (error, { productId }) => {
      setUploadingProducts(prev => {
        const newMap = new Map(prev);
        newMap.set(productId, { productId, status: 'error' });
        return newMap;
      });
      
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload image",
        variant: "destructive",
      });
      
      // Clear error status after 3 seconds
      setTimeout(() => {
        setUploadingProducts(prev => {
          const newMap = new Map(prev);
          newMap.delete(productId);
          return newMap;
        });
      }, 3000);
    },
  });

  const deleteImageMutation = useMutation({
    mutationFn: async (productId: string) => {
      await apiRequest('PATCH', `/api/products/${productId}`, {
        imageUrl: null,
        images: [],
      });
      return productId;
    },
    onSuccess: (productId) => {
      toast({
        title: "Photo removed",
        description: "Product photo has been removed",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
    },
    onError: (error) => {
      toast({
        title: "Delete failed",
        description: error instanceof Error ? error.message : "Failed to remove photo",
        variant: "destructive",
      });
    },
  });

  const bulkDeleteImagesMutation = useMutation({
    mutationFn: async (productIds: string[]) => {
      await Promise.all(
        productIds.map(id => 
          apiRequest('PATCH', `/api/products/${id}`, {
            imageUrl: null,
            images: [],
          })
        )
      );
      return productIds;
    },
    onSuccess: (productIds) => {
      toast({
        title: "Photos removed",
        description: `Removed photos from ${productIds.length} products`,
      });
      setSelectedProducts(new Set());
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
    },
    onError: (error) => {
      toast({
        title: "Bulk delete failed",
        description: error instanceof Error ? error.message : "Failed to remove some photos",
        variant: "destructive",
      });
    },
  });

  const handleDrop = useCallback((productId: string, e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (file.type.startsWith('image/')) {
        uploadImageMutation.mutate({ productId, file });
      } else {
        toast({
          title: "Invalid file",
          description: "Please drop an image file (JPG, PNG, WebP, etc.)",
          variant: "destructive",
        });
      }
    }
  }, [uploadImageMutation, toast]);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleFileSelect = useCallback((productId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      uploadImageMutation.mutate({ productId, file: files[0] });
    }
  }, [uploadImageMutation]);

  const handleDeletePhoto = (productId: string) => {
    setProductToDeletePhoto(productId);
    setShowDeleteConfirm(true);
  };

  const confirmDeletePhoto = () => {
    if (productToDeletePhoto) {
      deleteImageMutation.mutate(productToDeletePhoto);
    }
    setShowDeleteConfirm(false);
    setProductToDeletePhoto(null);
  };

  const handleBulkDelete = () => {
    const productsWithPhotos = Array.from(selectedProducts).filter(id => {
      const product = products?.find(p => p.id === id);
      return product && getProductImage(product);
    });
    
    if (productsWithPhotos.length > 0) {
      bulkDeleteImagesMutation.mutate(productsWithPhotos);
    }
  };

  const toggleSelectAll = () => {
    if (selectedProducts.size === sortedProducts.length) {
      setSelectedProducts(new Set());
    } else {
      setSelectedProducts(new Set(sortedProducts.map(p => p.id)));
    }
  };

  const toggleSelectProduct = (productId: string) => {
    const newSelected = new Set(selectedProducts);
    if (newSelected.has(productId)) {
      newSelected.delete(productId);
    } else {
      newSelected.add(productId);
    }
    setSelectedProducts(newSelected);
  };

  const getCategoryName = (categoryId: string | null) => {
    if (!categoryId) return '';
    return categories?.find(c => c.id === categoryId)?.name || '';
  };

  const productsWithPhotos = sortedProducts.filter(p => getProductImage(p)).length;
  const productsWithoutPhotos = sortedProducts.length - productsWithPhotos;
  const selectedWithPhotos = Array.from(selectedProducts).filter(id => {
    const product = products?.find(p => p.id === id);
    return product && getProductImage(product);
  }).length;

  if (productsLoading) {
    return (
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        <div className="flex items-center gap-4 mb-6">
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {Array.from({ length: 24 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <Link href="/inventory">
            <Button variant="ghost" size="icon" className="h-10 w-10">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
              Mass Photo Uploader
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Drag & drop images to products
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="gap-1.5"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
          
          {selectedProducts.size > 0 && selectedWithPhotos > 0 && (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleBulkDelete}
              disabled={bulkDeleteImagesMutation.isPending}
              className="gap-1.5"
            >
              <Trash2 className="h-4 w-4" />
              Delete {selectedWithPhotos} Photos
            </Button>
          )}
        </div>
      </div>

      {/* Filters and Stats */}
      <Card className="mb-4">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search by name, SKU, barcode..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
            
            {/* Category Filter */}
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[160px] h-9">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories?.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {/* Photo Filter */}
            <Select value={photoFilter} onValueChange={setPhotoFilter}>
              <SelectTrigger className="w-[160px] h-9">
                <SelectValue placeholder="Photo Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Products</SelectItem>
                <SelectItem value="without-photo">
                  <span className="flex items-center gap-2">
                    <ImageOff className="h-4 w-4 text-amber-500" />
                    Without Photo
                  </span>
                </SelectItem>
                <SelectItem value="with-photo">
                  <span className="flex items-center gap-2">
                    <Image className="h-4 w-4 text-green-500" />
                    With Photo
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
            
            {/* Sort */}
            <div className="flex items-center gap-1">
              <Select value={sortField} onValueChange={(v) => setSortField(v as SortField)}>
                <SelectTrigger className="w-[120px] h-9">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Name</SelectItem>
                  <SelectItem value="sku">SKU</SelectItem>
                  <SelectItem value="hasPhoto">Has Photo</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9"
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              >
                {sortOrder === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
              </Button>
            </div>
          </div>
          
          {/* Stats Bar */}
          <div className="flex items-center justify-between mt-3 pt-3 border-t">
            <div className="flex items-center gap-4 text-sm">
              <span className="text-slate-500 dark:text-slate-400">
                {sortedProducts.length} products
              </span>
              <Badge variant="outline" className="gap-1 text-green-600 border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-800">
                <Image className="h-3 w-3" />
                {productsWithPhotos} with photos
              </Badge>
              <Badge variant="outline" className="gap-1 text-amber-600 border-amber-200 bg-amber-50 dark:bg-amber-950 dark:border-amber-800">
                <ImageOff className="h-3 w-3" />
                {productsWithoutPhotos} without photos
              </Badge>
            </div>
            
            <div className="flex items-center gap-2">
              <Checkbox
                checked={selectedProducts.size === sortedProducts.length && sortedProducts.length > 0}
                onCheckedChange={toggleSelectAll}
                id="select-all"
              />
              <label htmlFor="select-all" className="text-sm text-slate-500 cursor-pointer">
                Select all ({selectedProducts.size})
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Product Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
        {sortedProducts.map((product) => {
          const imageUrl = getProductImage(product);
          const uploadStatus = uploadingProducts.get(product.id);
          const isSelected = selectedProducts.has(product.id);
          
          return (
            <Card 
              key={product.id}
              className={`relative overflow-hidden transition-all ${
                isSelected ? 'ring-2 ring-blue-500' : ''
              }`}
            >
              {/* Selection Checkbox */}
              <div className="absolute top-2 left-2 z-10">
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={() => toggleSelectProduct(product.id)}
                  className="bg-white/90 dark:bg-slate-800/90"
                />
              </div>
              
              {/* Image Area / Drop Zone */}
              <div
                className={`aspect-square relative cursor-pointer group ${
                  uploadStatus?.status === 'uploading' ? 'pointer-events-none' : ''
                }`}
                onDrop={(e) => handleDrop(product.id, e)}
                onDragOver={handleDragOver}
                onDragEnter={(e) => {
                  e.preventDefault();
                  e.currentTarget.classList.add('ring-2', 'ring-blue-500', 'ring-inset');
                }}
                onDragLeave={(e) => {
                  e.currentTarget.classList.remove('ring-2', 'ring-blue-500', 'ring-inset');
                }}
                onClick={() => {
                  if (imageUrl) {
                    setEnlargedImage(imageUrl);
                  } else {
                    fileInputRefs.current.get(product.id)?.click();
                  }
                }}
              >
                {imageUrl ? (
                  <>
                    <img
                      src={imageUrl}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                    {/* Overlay on hover */}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="secondary"
                              size="icon"
                              className="h-8 w-8"
                              onClick={(e) => {
                                e.stopPropagation();
                                fileInputRefs.current.get(product.id)?.click();
                              }}
                            >
                              <Upload className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Replace photo</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="destructive"
                              size="icon"
                              className="h-8 w-8"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeletePhoto(product.id);
                              }}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Remove photo</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </>
                ) : (
                  <div className="w-full h-full bg-slate-100 dark:bg-slate-800 flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 group-hover:bg-slate-200 dark:group-hover:bg-slate-700 transition-colors">
                    <Upload className="h-8 w-8 mb-1 opacity-50 group-hover:opacity-100" />
                    <span className="text-xs opacity-50 group-hover:opacity-100">Drop image</span>
                  </div>
                )}
                
                {/* Upload Status Overlay */}
                {uploadStatus && (
                  <div className={`absolute inset-0 flex items-center justify-center ${
                    uploadStatus.status === 'uploading' ? 'bg-white/80 dark:bg-slate-900/80' :
                    uploadStatus.status === 'success' ? 'bg-green-500/80' :
                    'bg-red-500/80'
                  }`}>
                    {uploadStatus.status === 'uploading' && (
                      <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                    )}
                    {uploadStatus.status === 'success' && (
                      <CheckCircle2 className="h-8 w-8 text-white" />
                    )}
                    {uploadStatus.status === 'error' && (
                      <XCircle className="h-8 w-8 text-white" />
                    )}
                  </div>
                )}
                
                {/* Hidden file input */}
                <input
                  ref={(el) => {
                    if (el) fileInputRefs.current.set(product.id, el);
                  }}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleFileSelect(product.id, e)}
                />
              </div>
              
              {/* Product Info */}
              <CardContent className="p-2">
                <p className="text-sm font-medium leading-tight line-clamp-2" title={product.name}>
                  {product.name}
                </p>
                {product.sku && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                    {product.sku}
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Empty State */}
      {sortedProducts.length === 0 && (
        <div className="text-center py-12">
          <ImageOff className="h-12 w-12 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
          <h3 className="text-lg font-medium text-slate-600 dark:text-slate-400 mb-1">
            No products found
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-500">
            Try adjusting your filters or search query
          </p>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Photo?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the photo from this product. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDeletePhoto}
              className="bg-red-600 hover:bg-red-700"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Image Enlargement Dialog */}
      {enlargedImage && (
        <div 
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setEnlargedImage(null)}
        >
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 text-white hover:bg-white/20"
            onClick={() => setEnlargedImage(null)}
          >
            <X className="h-6 w-6" />
          </Button>
          <img
            src={enlargedImage}
            alt="Enlarged product image"
            className="max-w-full max-h-full object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
