import { useState, useMemo } from "react";
import { useParams, useLocation, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  ArrowLeft,
  Edit,
  Warehouse as WarehouseIcon,
  MapPin,
  Phone,
  Mail,
  User,
  Package,
  Box,
  FileText,
  Building,
  Upload,
  Download,
  Trash2,
  Search,
  Grid3x3,
  Activity,
  TrendingUp,
  Barcode,
  MoveRight,
  ExternalLink,
  FileImage,
  FileSpreadsheet,
  File as FileGeneric,
  UploadCloud,
  DollarSign,
} from "lucide-react";
import { formatDate, formatCurrency } from "@/lib/currencyUtils";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Warehouse, WarehouseFile, WarehouseFinancialContract } from "@shared/schema";
import { ObjectUploader } from "@/components/ObjectUploader";
import { fuzzySearch } from "@/lib/fuzzySearch";

export default function WarehouseDetails() {
  const { id } = useParams();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  
  // State management
  const [searchQuery, setSearchQuery] = useState("");
  const [showMoveDialog, setShowMoveDialog] = useState(false);
  const [productToMove, setProductToMove] = useState<any | null>(null);
  const [targetWarehouseId, setTargetWarehouseId] = useState("");
  const [showDeleteFileDialog, setShowDeleteFileDialog] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<WarehouseFile | null>(null);

  // API Queries
  const { data: warehouse, isLoading: warehouseLoading } = useQuery<Warehouse>({
    queryKey: [`/api/warehouses/${id}`],
    enabled: !!id,
  });

  const { data: warehouseProducts = [], isLoading: productsLoading } = useQuery<any[]>({
    queryKey: [`/api/warehouses/${id}/products`],
    enabled: !!id,
  });

  const { data: files = [], isLoading: filesLoading } = useQuery<WarehouseFile[]>({
    queryKey: [`/api/warehouses/${id}/files`],
    enabled: !!id,
  });

  const { data: financialContracts = [], isLoading: contractsLoading } = useQuery<WarehouseFinancialContract[]>({
    queryKey: ['/api/warehouses', id, 'financial-contracts'],
    enabled: !!id,
  });

  const { data: allWarehouses = [] } = useQuery<Warehouse[]>({
    queryKey: ['/api/warehouses'],
  });

  // Mutations
  const moveProductMutation = useMutation({
    mutationFn: async ({ productId, targetWarehouseId }: { productId: string; targetWarehouseId: string }) => {
      return apiRequest('POST', `/api/products/${productId}/move-warehouse`, { targetWarehouseId });
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: [`/api/warehouses/${id}/products`] });
      queryClient.invalidateQueries({ queryKey: ['/api/products', productToMove?.id] });
      
      toast({
        title: "Success",
        description: `Product moved to ${allWarehouses.find(w => w.id === targetWarehouseId)?.name}`,
      });
      
      setShowMoveDialog(false);
      setProductToMove(null);
      setTargetWarehouseId('');
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to move product",
        variant: "destructive",
      });
    },
  });

  const deleteFileMutation = useMutation({
    mutationFn: (fileId: string) => apiRequest('DELETE', `/api/warehouse-files/${fileId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/warehouses/${id}/files`] });
      toast({
        title: "Success",
        description: "File deleted successfully",
      });
      setShowDeleteFileDialog(false);
      setFileToDelete(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete file",
        variant: "destructive",
      });
    },
  });

  // File upload handlers
  const handleGetUploadParameters = async () => {
    const response = await apiRequest('POST', '/api/objects/upload');
    return {
      method: 'PUT' as const,
      url: response.uploadURL,
    };
  };

  const handleFileUploadComplete = async (result: any) => {
    if (result.successful && result.successful.length > 0) {
      const uploadedFile = result.successful[0];
      
      try {
        await apiRequest('POST', `/api/warehouses/${id}/files`, {
          fileName: uploadedFile.name,
          fileType: uploadedFile.type || 'application/octet-stream',
          fileUrl: uploadedFile.response?.uploadURL || uploadedFile.uploadURL,
          fileSize: uploadedFile.size,
        });
        
        queryClient.invalidateQueries({ queryKey: [`/api/warehouses/${id}/files`] });
        toast({
          title: "Success",
          description: "File uploaded successfully",
        });
      } catch (error: any) {
        toast({
          title: "Error",
          description: error.message || "Failed to save file",
          variant: "destructive",
        });
      }
    }
  };

  // Computed values
  const totalProducts = warehouseProducts.length;
  const totalQuantity = warehouseProducts.reduce((sum, p) => sum + (p.quantity || 0), 0);
  const activeContracts = financialContracts.filter(c => c.status === 'active').length;

  // Filtered products using fuzzy search
  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return warehouseProducts;
    
    return fuzzySearch(warehouseProducts, searchQuery, {
      keys: ['name', 'sku', 'barcode', 'primaryLocation'],
      threshold: 0.2,
      fuzzy: true,
      vietnameseNormalization: true,
    });
  }, [warehouseProducts, searchQuery]);

  // Utility functions
  const getStatusBadge = (status: string) => {
    const config = {
      active: { label: 'Active', className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200' },
      inactive: { label: 'Inactive', className: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200' },
      maintenance: { label: 'Maintenance', className: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200' },
    }[status as keyof typeof config] || { label: 'Active', className: 'bg-emerald-100 text-emerald-800' };
    
    return <Badge className={config.className} data-testid={`badge-status-${status}`}>{config.label}</Badge>;
  };

  const getTypeBadge = (type: string) => {
    const config = {
      fulfillment: { label: 'Fulfillment', className: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' },
      storage: { label: 'Storage', className: 'bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-200' },
      transit: { label: 'Transit', className: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' },
    }[type as keyof typeof config] || { label: 'Fulfillment', className: 'bg-blue-100 text-blue-800' };
    
    return <Badge className={config.className} data-testid={`badge-type-${type}`}>{config.label}</Badge>;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext || '')) {
      return <FileImage className="h-4 w-4 text-blue-500" />;
    }
    if (['xlsx', 'xls', 'csv'].includes(ext || '')) {
      return <FileSpreadsheet className="h-4 w-4 text-green-500" />;
    }
    if (['pdf'].includes(ext || '')) {
      return <FileText className="h-4 w-4 text-red-500" />;
    }
    return <FileGeneric className="h-4 w-4 text-slate-500" />;
  };

  // Loading state
  if (warehouseLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  // Not found state
  if (!warehouse) {
    return null;
  }

  return (
    <div className="space-y-4 md:space-y-6 p-4 md:p-0">
      {/* Header */}
      <div className="flex flex-col gap-3 md:gap-4">
        <div className="flex items-center gap-2 md:gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.history.back()}
            data-testid="button-back"
            className="shrink-0"
          >
            <ArrowLeft className="h-4 w-4 md:mr-2" />
            <span className="hidden md:inline">Back</span>
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl md:text-3xl font-bold text-slate-900 dark:text-slate-100 truncate" data-testid="text-warehouse-name">
              {warehouse.name}
            </h1>
            <p className="text-xs md:text-sm text-slate-600 dark:text-slate-400 mt-1">
              Warehouse Management & Operations
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Link href={`/warehouses/${warehouse.id}/mapping`} className="flex-1 sm:flex-initial">
            <Button variant="outline" size="sm" data-testid="button-warehouse-mapping" className="w-full sm:w-auto">
              <MapPin className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Mapping</span>
            </Button>
          </Link>
          <Link href={`/warehouses/${warehouse.id}/edit`} className="flex-1 sm:flex-initial">
            <Button size="sm" data-testid="button-edit" className="w-full sm:w-auto">
              <Edit className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Edit</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
        <Card className="border-slate-200 dark:border-slate-800 hover:shadow-lg transition-shadow">
          <CardContent className="p-3 sm:p-4 md:p-6">
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Status</p>
                {getStatusBadge(warehouse.status || 'active')}
              </div>
              <div className="flex-shrink-0 p-2 sm:p-2.5 md:p-3 rounded-xl bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-950 dark:to-green-950">
                <Activity className="h-5 w-5 sm:h-6 sm:w-6 md:h-7 md:w-7 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 dark:border-slate-800 hover:shadow-lg transition-shadow">
          <CardContent className="p-3 sm:p-4 md:p-6">
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Type</p>
                {getTypeBadge(warehouse.type || 'fulfillment')}
              </div>
              <div className="flex-shrink-0 p-2 sm:p-2.5 md:p-3 rounded-xl bg-gradient-to-br from-blue-50 to-sky-50 dark:from-blue-950 dark:to-sky-950">
                <WarehouseIcon className="h-5 w-5 sm:h-6 sm:w-6 md:h-7 md:w-7 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 dark:border-slate-800 hover:shadow-lg transition-shadow">
          <CardContent className="p-3 sm:p-4 md:p-6">
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Total Products</p>
                <p className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-900 dark:text-slate-100 truncate" data-testid="text-total-products">
                  {totalProducts.toLocaleString()}
                </p>
              </div>
              <div className="flex-shrink-0 p-2 sm:p-2.5 md:p-3 rounded-xl bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-950 dark:to-indigo-950">
                <Package className="h-5 w-5 sm:h-6 sm:w-6 md:h-7 md:w-7 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 dark:border-slate-800 hover:shadow-lg transition-shadow">
          <CardContent className="p-3 sm:p-4 md:p-6">
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Total Units</p>
                <p className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-900 dark:text-slate-100 truncate" data-testid="text-total-quantity">
                  {totalQuantity.toLocaleString()}
                </p>
              </div>
              <div className="flex-shrink-0 p-2 sm:p-2.5 md:p-3 rounded-xl bg-gradient-to-br from-cyan-50 to-teal-50 dark:from-cyan-950 dark:to-teal-950">
                <Box className="h-5 w-5 sm:h-6 sm:w-6 md:h-7 md:w-7 text-cyan-600 dark:text-cyan-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="details" className="w-full">
        <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
          <TabsList className="inline-flex w-auto min-w-full md:min-w-0">
            <TabsTrigger value="details" data-testid="tab-details" className="flex-1 md:flex-initial">
              <span className="text-xs md:text-sm">Details</span>
            </TabsTrigger>
            <TabsTrigger value="inventory" data-testid="tab-inventory" className="flex-1 md:flex-initial">
              <span className="text-xs md:text-sm">Inventory</span>
              <Badge variant="secondary" className="ml-1 md:ml-2 text-xs">{totalProducts}</Badge>
            </TabsTrigger>
            <TabsTrigger value="files" data-testid="tab-files" className="flex-1 md:flex-initial">
              <span className="text-xs md:text-sm">Files</span>
              <Badge variant="secondary" className="ml-1 md:ml-2 text-xs">{files.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="contracts" data-testid="tab-contracts" className="flex-1 md:flex-initial">
              <span className="text-xs md:text-sm">Contracts</span>
              <Badge variant="secondary" className="ml-1 md:ml-2 text-xs">{financialContracts.length}</Badge>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Details Tab */}
        <TabsContent value="details" className="space-y-4 mt-4 md:mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-4">
            {/* Basic Information */}
            <Card className="border-slate-200 dark:border-slate-800">
              <CardHeader className="border-b border-slate-100 dark:border-slate-800 p-4 md:p-6">
                <CardTitle className="text-base md:text-lg flex items-center gap-2">
                  <Building className="h-4 w-4 md:h-5 md:w-5 text-cyan-600 dark:text-cyan-400" />
                  Basic Information
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 md:p-6 space-y-3 md:space-y-4">
                <div className="grid grid-cols-2 gap-3 md:gap-4">
                  <div>
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Warehouse ID</p>
                    <p className="text-sm font-mono text-slate-900 dark:text-slate-100" data-testid="text-warehouse-id">{warehouse.id}</p>
                  </div>
                  {warehouse.code && (
                    <div>
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Code</p>
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100" data-testid="text-warehouse-code">{warehouse.code}</p>
                    </div>
                  )}
                </div>
                
                {warehouse.floorArea && (
                  <div>
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Floor Area</p>
                    <p className="text-sm text-slate-900 dark:text-slate-100" data-testid="text-floor-area">
                      {warehouse.floorArea.toLocaleString()} m²
                    </p>
                  </div>
                )}
                
                {warehouse.capacity && (
                  <div>
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Capacity</p>
                    <p className="text-sm text-slate-900 dark:text-slate-100" data-testid="text-capacity">
                      {warehouse.capacity.toLocaleString()} units
                    </p>
                  </div>
                )}

                {warehouse.description && (
                  <div>
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Description</p>
                    <p className="text-sm text-slate-700 dark:text-slate-300" data-testid="text-description">{warehouse.description}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Contact Information */}
            <Card className="border-slate-200 dark:border-slate-800">
              <CardHeader className="border-b border-slate-100 dark:border-slate-800 p-4 md:p-6">
                <CardTitle className="text-base md:text-lg flex items-center gap-2">
                  <MapPin className="h-4 w-4 md:h-5 md:w-5 text-cyan-600 dark:text-cyan-400" />
                  Contact & Location
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 md:p-6 space-y-3 md:space-y-4">
                {warehouse.address && (
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-slate-500 mt-0.5" />
                    <div>
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Address</p>
                      <p className="text-sm text-slate-900 dark:text-slate-100" data-testid="text-address">{warehouse.address}</p>
                    </div>
                  </div>
                )}
                
                {warehouse.phone && (
                  <div className="flex items-start gap-2">
                    <Phone className="h-4 w-4 text-slate-500 mt-0.5" />
                    <div>
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Phone</p>
                      <p className="text-sm text-slate-900 dark:text-slate-100" data-testid="text-phone">{warehouse.phone}</p>
                    </div>
                  </div>
                )}
                
                {warehouse.email && (
                  <div className="flex items-start gap-2">
                    <Mail className="h-4 w-4 text-slate-500 mt-0.5" />
                    <div>
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Email</p>
                      <p className="text-sm text-slate-900 dark:text-slate-100" data-testid="text-email">{warehouse.email}</p>
                    </div>
                  </div>
                )}
                
                {warehouse.managerName && (
                  <div className="flex items-start gap-2">
                    <User className="h-4 w-4 text-slate-500 mt-0.5" />
                    <div>
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Manager</p>
                      <p className="text-sm text-slate-900 dark:text-slate-100" data-testid="text-manager">{warehouse.managerName}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Inventory Tab */}
        <TabsContent value="inventory" className="space-y-4 mt-4 md:mt-6">
          <Card className="border-slate-200 dark:border-slate-800">
            <CardHeader className="border-b border-slate-100 dark:border-slate-800 p-4 md:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <CardTitle className="text-base md:text-lg flex items-center gap-2">
                  <Box className="h-4 w-4 md:h-5 md:w-5 text-cyan-600 dark:text-cyan-400" />
                  Warehouse Inventory
                </CardTitle>
                <Badge variant="outline" className="font-mono text-xs w-fit">{filteredProducts.length} items</Badge>
              </div>
            </CardHeader>
            <CardContent className="p-4 md:p-6">
              {/* Search */}
              <div className="mb-3 md:mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Search products by name, SKU, barcode, or location..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                    data-testid="input-search-inventory"
                  />
                </div>
              </div>

              {/* Products List */}
              {productsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-20" />)}
                </div>
              ) : filteredProducts.length > 0 ? (
                <div className="space-y-2 max-h-[500px] overflow-y-auto">
                  {filteredProducts.map((product) => (
                    <div
                      key={product.id}
                      className="flex items-center justify-between p-3 md:p-4 border border-slate-200 dark:border-slate-700 rounded-lg hover:border-cyan-300 dark:hover:border-cyan-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all group touch-manipulation"
                      data-testid={`product-item-${product.id}`}
                    >
                      <div className="flex items-center gap-2 md:gap-4 flex-1 min-w-0">
                        {product.imageUrl ? (
                          <img 
                            src={product.imageUrl} 
                            alt={product.name}
                            className="w-10 h-10 md:w-12 md:h-12 object-cover rounded border border-slate-200 dark:border-slate-700 shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-10 md:w-12 md:h-12 bg-slate-100 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0">
                            <Package className="h-5 w-5 md:h-6 md:w-6 text-slate-400" />
                          </div>
                        )}
                        
                        <div className="flex-1 min-w-0">
                          <Link href={`/products/${product.id}`}>
                            <h4 className="font-semibold text-sm md:text-base text-slate-900 dark:text-white group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors truncate" data-testid={`text-product-name-${product.id}`}>
                              {product.name}
                            </h4>
                          </Link>
                          <div className="flex items-center gap-3 mt-1 text-xs text-slate-600 dark:text-slate-400">
                            {product.sku && (
                              <span className="flex items-center gap-1">
                                <Barcode className="h-3 w-3" />
                                {product.sku}
                              </span>
                            )}
                            {product.primaryLocation && (
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {product.primaryLocation}
                              </span>
                            )}
                            <span className="font-medium">Qty: {product.quantity || 0}</span>
                          </div>
                        </div>
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setProductToMove(product);
                          setShowMoveDialog(true);
                        }}
                        data-testid={`button-move-${product.id}`}
                      >
                        <MoveRight className="h-4 w-4 mr-2" />
                        Move
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Box className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-600 dark:text-slate-400">
                    {searchQuery ? 'No products found' : 'No products in this warehouse'}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Files Tab */}
        <TabsContent value="files" className="space-y-4 mt-6">
          <Card className="border-slate-200 dark:border-slate-800">
            <CardHeader className="border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
                  Documents & Files
                </CardTitle>
                <ObjectUploader
                  onGetUploadParameters={handleGetUploadParameters}
                  onUploadComplete={handleFileUploadComplete}
                  trigger={
                    <Button size="sm" data-testid="button-upload-file">
                      <Upload className="h-4 w-4 mr-2" />
                      Upload
                    </Button>
                  }
                />
              </div>
            </CardHeader>
            <CardContent className="p-6">
              {filesLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-16" />)}
                </div>
              ) : files.length > 0 ? (
                <div className="space-y-2">
                  {files.map((file) => (
                    <div
                      key={file.id}
                      className="flex items-center justify-between p-3 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all"
                      data-testid={`file-item-${file.id}`}
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {getFileIcon(file.fileName)}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate" data-testid={`text-file-name-${file.id}`}>
                            {file.fileName}
                          </p>
                          <p className="text-xs text-slate-500">
                            {formatFileSize(file.fileSize)} • {formatDate(file.createdAt)}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          asChild
                          data-testid={`button-download-${file.id}`}
                        >
                          <a href={file.fileUrl} target="_blank" rel="noopener noreferrer">
                            <Download className="h-4 w-4" />
                          </a>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setFileToDelete(file);
                            setShowDeleteFileDialog(true);
                          }}
                          data-testid={`button-delete-${file.id}`}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <UploadCloud className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-600 dark:text-slate-400 mb-4">No files uploaded yet</p>
                  <ObjectUploader
                    onGetUploadParameters={handleGetUploadParameters}
                    onUploadComplete={handleFileUploadComplete}
                    trigger={
                      <Button variant="outline" size="sm">
                        <Upload className="h-4 w-4 mr-2" />
                        Upload First File
                      </Button>
                    }
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Contracts Tab */}
        <TabsContent value="contracts" className="space-y-4 mt-6">
          <Card className="border-slate-200 dark:border-slate-800">
            <CardHeader className="border-b border-slate-100 dark:border-slate-800">
              <CardTitle className="text-lg flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
                Financial Contracts
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {contractsLoading ? (
                <div className="space-y-3">
                  {[1, 2].map(i => <Skeleton key={i} className="h-24" />)}
                </div>
              ) : financialContracts.length > 0 ? (
                <div className="space-y-3">
                  {financialContracts.map((contract) => (
                    <div
                      key={contract.id}
                      className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all"
                      data-testid={`contract-item-${contract.id}`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="font-semibold text-slate-900 dark:text-slate-100" data-testid={`text-contract-type-${contract.id}`}>
                            {contract.contractType}
                          </h4>
                          <p className="text-xs text-slate-500 mt-1">
                            {formatDate(contract.startDate)} - {formatDate(contract.endDate)}
                          </p>
                        </div>
                        <Badge 
                          variant={contract.status === 'active' ? 'default' : 'secondary'}
                          data-testid={`badge-contract-status-${contract.id}`}
                        >
                          {contract.status}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-xs text-slate-500 dark:text-slate-400">Monthly Cost</p>
                          <p className="font-semibold text-slate-900 dark:text-slate-100" data-testid={`text-contract-cost-${contract.id}`}>
                            {formatCurrency(contract.monthlyCost, contract.currency)}
                          </p>
                        </div>
                        {contract.notes && (
                          <div className="col-span-2">
                            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Notes</p>
                            <p className="text-sm text-slate-700 dark:text-slate-300">{contract.notes}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <DollarSign className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-600 dark:text-slate-400">No financial contracts</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Move Product Dialog */}
      <Dialog open={showMoveDialog} onOpenChange={setShowMoveDialog}>
        <DialogContent data-testid="dialog-move-product">
          <DialogHeader>
            <DialogTitle>Move Product to Another Warehouse</DialogTitle>
            <DialogDescription>
              Select the destination warehouse for {productToMove?.name}
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <Select value={targetWarehouseId} onValueChange={setTargetWarehouseId}>
              <SelectTrigger data-testid="select-target-warehouse">
                <SelectValue placeholder="Select warehouse" />
              </SelectTrigger>
              <SelectContent>
                {allWarehouses
                  .filter(w => w.id !== id && w.status === 'active')
                  .map((warehouse) => (
                    <SelectItem key={warehouse.id} value={warehouse.id}>
                      {warehouse.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowMoveDialog(false);
                setProductToMove(null);
                setTargetWarehouseId('');
              }}
              data-testid="button-cancel-move"
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (productToMove && targetWarehouseId) {
                  moveProductMutation.mutate({
                    productId: productToMove.id,
                    targetWarehouseId: targetWarehouseId,
                  });
                }
              }}
              disabled={!targetWarehouseId || moveProductMutation.isPending}
              data-testid="button-confirm-move"
            >
              {moveProductMutation.isPending ? 'Moving...' : 'Move Product'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete File Dialog */}
      <AlertDialog open={showDeleteFileDialog} onOpenChange={setShowDeleteFileDialog}>
        <AlertDialogContent data-testid="dialog-delete-file">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete File</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{fileToDelete?.fileName}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => fileToDelete && deleteFileMutation.mutate(fileToDelete.id)}
              className="bg-red-600 hover:bg-red-700"
              data-testid="button-confirm-delete"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
