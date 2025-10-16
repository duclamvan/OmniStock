import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Link } from "wouter";
import { 
  ArrowLeft, 
  Edit, 
  Warehouse as WarehouseIcon, 
  MapPin,
  Phone,
  Mail,
  User,
  Calendar,
  Package,
  Hash,
  FileText,
  Building,
  Upload,
  Download,
  Trash2,
  FileIcon,
  FileImage,
  FileSpreadsheet,
  File as FileGeneric,
  ArrowUpDown,
  UploadCloud
} from "lucide-react";
import { formatDate } from "@/lib/currencyUtils";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Warehouse, WarehouseFile } from "@shared/schema";
import { ObjectUploader } from "@/components/ObjectUploader";
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

type SortField = 'name' | 'date' | 'size';
type SortOrder = 'asc' | 'desc';

export default function WarehouseDetails() {
  const { id } = useParams();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [showDeleteFileDialog, setShowDeleteFileDialog] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<WarehouseFile | null>(null);
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  const { data: warehouse, isLoading: warehouseLoading } = useQuery<Warehouse>({
    queryKey: [`/api/warehouses/${id}`],
    enabled: !!id,
  });

  const { data: files = [], isLoading: filesLoading, refetch: refetchFiles } = useQuery<WarehouseFile[]>({
    queryKey: [`/api/warehouses/${id}/files`],
    enabled: !!id,
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
      const fileName = uploadedFile.name;
      const fileSize = uploadedFile.size;
      const fileType = uploadedFile.type || 'application/octet-stream';
      
      try {
        await apiRequest('POST', `/api/warehouses/${id}/files`, {
          fileName,
          fileType,
          fileUrl: uploadedFile.response?.uploadURL || uploadedFile.uploadURL,
          fileSize,
        });
        
        refetchFiles();
        toast({
          title: "Success",
          description: "File uploaded successfully",
        });
      } catch (error: any) {
        toast({
          title: "Error",
          description: error.message || "Failed to save file information",
          variant: "destructive",
        });
      }
    }
  };

  const handleDeleteFile = (file: WarehouseFile) => {
    setFileToDelete(file);
    setShowDeleteFileDialog(true);
  };

  const confirmDeleteFile = () => {
    if (fileToDelete) {
      deleteFileMutation.mutate(fileToDelete.id);
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      'active': { label: 'Active', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200' },
      'inactive': { label: 'Inactive', color: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200' },
      'maintenance': { label: 'Maintenance', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200' },
    };
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.active;
    return <Badge className={config.color} data-testid={`badge-status-${status}`}>{config.label}</Badge>;
  };

  const getTypeBadge = (type: string) => {
    const typeConfig = {
      'fulfillment': { label: 'Fulfillment', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' },
      'storage': { label: 'Storage', color: 'bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-200' },
      'transit': { label: 'Transit', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' },
    };
    const config = typeConfig[type as keyof typeof typeConfig] || typeConfig.fulfillment;
    return <Badge className={config.color} data-testid={`badge-type-${type}`}>{config.label}</Badge>;
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
      return <FileImage className="h-5 w-5 text-blue-500" />;
    }
    if (['xlsx', 'xls', 'csv'].includes(ext || '')) {
      return <FileSpreadsheet className="h-5 w-5 text-green-500" />;
    }
    if (['pdf'].includes(ext || '')) {
      return <FileText className="h-5 w-5 text-red-500" />;
    }
    return <FileGeneric className="h-5 w-5 text-slate-500" />;
  };

  const sortedFiles = [...files].sort((a, b) => {
    let comparison = 0;
    if (sortField === 'name') {
      comparison = a.fileName.localeCompare(b.fileName);
    } else if (sortField === 'date') {
      comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    } else if (sortField === 'size') {
      comparison = a.fileSize - b.fileSize;
    }
    return sortOrder === 'asc' ? comparison : -comparison;
  });

  if (warehouseLoading) {
    return (
      <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-96 lg:col-span-2" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  if (!warehouse) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-6">
        <WarehouseIcon className="h-16 w-16 text-slate-300 mb-4" />
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">Warehouse Not Found</h2>
        <p className="text-slate-600 dark:text-slate-400 mb-4">The warehouse you're looking for doesn't exist.</p>
        <Link href="/warehouses">
          <Button variant="outline" data-testid="button-back-to-warehouses">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Warehouses
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/warehouses")}
            data-testid="button-back"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900">
              <WarehouseIcon className="h-6 w-6 text-blue-600 dark:text-blue-300" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100" data-testid="text-warehouse-name">
                {warehouse.name}
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-400" data-testid="text-warehouse-id">{warehouse.id}</p>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/warehouses/${warehouse.id}/mapping`}>
            <Button variant="outline" size="sm" data-testid="button-warehouse-mapping">
              <MapPin className="h-4 w-4 mr-2" />
              Warehouse Mapping
            </Button>
          </Link>
          <Link href={`/warehouses/${warehouse.id}/edit`}>
            <Button size="sm" data-testid="button-edit-warehouse">
              <Edit className="h-4 w-4 mr-2" />
              Edit Warehouse
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="hover:shadow-md transition-shadow" data-testid="card-status">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Status</p>
                {getStatusBadge(warehouse.status || 'active')}
              </div>
              <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20">
                <Building className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="hover:shadow-md transition-shadow" data-testid="card-type">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Type</p>
                {getTypeBadge(warehouse.type || 'fulfillment')}
              </div>
              <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                <WarehouseIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow" data-testid="card-floor-area">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Floor Area</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100" data-testid="text-floor-area">
                  {warehouse.floorArea ? `${warehouse.floorArea} m²` : '-'}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-violet-50 dark:bg-violet-900/20">
                <Package className="h-6 w-6 text-violet-600 dark:text-violet-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow" data-testid="card-capacity">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Capacity</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100" data-testid="text-capacity">
                  {warehouse.capacity || '-'}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20">
                <Hash className="h-6 w-6 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Warehouse Information */}
        <div className="lg:col-span-2 space-y-6">
          <Card data-testid="card-warehouse-info">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <WarehouseIcon className="h-5 w-5" />
                Warehouse Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Location</p>
                  <p className="text-slate-900 dark:text-slate-100" data-testid="text-location">{warehouse.location}</p>
                </div>
                {warehouse.manager && (
                  <div>
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Manager</p>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-slate-400" />
                      <p className="text-slate-900 dark:text-slate-100" data-testid="text-manager">{warehouse.manager}</p>
                    </div>
                  </div>
                )}
              </div>

              {warehouse.address && (
                <div>
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">Address</p>
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800">
                    <MapPin className="h-5 w-5 text-slate-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-slate-900 dark:text-slate-100" data-testid="text-address">{warehouse.address}</p>
                      {(warehouse.city || warehouse.country) && (
                        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1" data-testid="text-city-country">
                          {[warehouse.city, warehouse.zipCode, warehouse.country].filter(Boolean).join(', ')}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {warehouse.phone && (
                  <div>
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Phone</p>
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-slate-400" />
                      <p className="text-slate-900 dark:text-slate-100" data-testid="text-phone">{warehouse.phone}</p>
                    </div>
                  </div>
                )}
                {warehouse.email && (
                  <div>
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Email</p>
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-slate-400" />
                      <p className="text-slate-900 dark:text-slate-100" data-testid="text-email">{warehouse.email}</p>
                    </div>
                  </div>
                )}
              </div>

              {warehouse.rentedFromDate && (
                <div>
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Rented From Date</p>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-slate-400" />
                    <p className="text-slate-900 dark:text-slate-100" data-testid="text-rented-date">
                      {formatDate(warehouse.rentedFromDate)}
                    </p>
                  </div>
                </div>
              )}

              {warehouse.notes && (
                <div>
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">Notes</p>
                  <p className="text-slate-900 dark:text-slate-100 whitespace-pre-wrap p-3 rounded-lg bg-slate-50 dark:bg-slate-800" data-testid="text-notes">
                    {warehouse.notes}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Files Section */}
        <div className="space-y-6">
          <Card data-testid="card-files">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Files
                </span>
                <Badge variant="secondary" data-testid="badge-file-count">{files.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Upload Section */}
              <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-lg p-4 sm:p-6 hover:border-blue-400 dark:hover:border-blue-500 transition-colors" data-testid="section-upload">
                <ObjectUploader
                  maxNumberOfFiles={10}
                  maxFileSize={50 * 1024 * 1024}
                  onGetUploadParameters={handleGetUploadParameters}
                  onComplete={handleFileUploadComplete}
                  buttonClassName="w-full"
                >
                  <div className="flex flex-col items-center gap-2 sm:gap-3 py-3 sm:py-4">
                    <div className="p-2 sm:p-3 rounded-full bg-blue-50 dark:bg-blue-900/20">
                      <UploadCloud className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="text-center max-w-xs px-2">
                      <p className="font-medium text-sm sm:text-base text-slate-900 dark:text-slate-100">Upload Files</p>
                      <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1">
                        Drag & drop or click to browse
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                        Max 50MB per file
                      </p>
                    </div>
                  </div>
                </ObjectUploader>
              </div>

              {/* Files List */}
              {filesLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-16" />)}
                </div>
              ) : files.length > 0 ? (
                <>
                  {/* Sort Controls */}
                  <div className="flex items-center justify-between py-2">
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Uploaded Files</p>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSort('name')}
                        data-testid="button-sort-name"
                      >
                        Name
                        {sortField === 'name' && <ArrowUpDown className="h-3 w-3 ml-1" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSort('date')}
                        data-testid="button-sort-date"
                      >
                        Date
                        {sortField === 'date' && <ArrowUpDown className="h-3 w-3 ml-1" />}
                      </Button>
                    </div>
                  </div>
                  <Separator />
                  <div className="space-y-2 max-h-[500px] overflow-y-auto">
                    {sortedFiles.map((file) => (
                      <div
                        key={file.id}
                        className="flex items-center gap-3 p-3 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors group"
                        data-testid={`file-item-${file.id}`}
                      >
                        <div className="flex-shrink-0">
                          {getFileIcon(file.fileName)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm text-slate-900 dark:text-slate-100 truncate" data-testid={`text-filename-${file.id}`}>
                            {file.fileName}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 mt-1">
                            <span data-testid={`text-filesize-${file.id}`}>{formatFileSize(file.fileSize)}</span>
                            <span>•</span>
                            <span data-testid={`text-filedate-${file.id}`}>{formatDate(file.createdAt)}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => window.open(file.fileUrl, '_blank')}
                            data-testid={`button-download-${file.id}`}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteFile(file)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                            data-testid={`button-delete-${file.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="text-center py-12" data-testid="empty-state-files">
                  <div className="inline-flex p-4 rounded-full bg-slate-100 dark:bg-slate-800 mb-4">
                    <FileIcon className="h-8 w-8 text-slate-400" />
                  </div>
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100 mb-1">No files uploaded</p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Upload files to keep important documents organized
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
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
              onClick={confirmDeleteFile}
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
