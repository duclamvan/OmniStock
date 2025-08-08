import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  AlertCircle,
  FileText,
  Building,
  FileUp,
  Download,
  Trash2,
  RefreshCw
} from "lucide-react";
import { format } from "date-fns";
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


export default function WarehouseDetails() {
  const { id } = useParams();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [showDeleteFileDialog, setShowDeleteFileDialog] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<WarehouseFile | null>(null);

  // Fetch warehouse data with real-time sync
  const { data: warehouse, isLoading, isFetching } = useQuery<Warehouse>({
    queryKey: [`/api/warehouses/${id}`],
    enabled: !!id,
    refetchInterval: 10000, // Refetch every 10 seconds
    refetchOnWindowFocus: true,
  });

  // Fetch warehouse files
  const { data: files = [], refetch: refetchFiles } = useQuery<WarehouseFile[]>({
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

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      'active': { label: 'Active', color: 'bg-green-100 text-green-800' },
      'inactive': { label: 'Inactive', color: 'bg-gray-100 text-gray-800' },
      'maintenance': { label: 'Maintenance', color: 'bg-yellow-100 text-yellow-800' },
      'rented': { label: 'Rented', color: 'bg-blue-100 text-blue-800' },
    };
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.active;
    return <Badge className={config.color}>{config.label}</Badge>;
  };

  const getTypeBadge = (type: string) => {
    const typeConfig = {
      'main': { label: 'Main', color: 'bg-blue-100 text-blue-800' },
      'branch': { label: 'Branch', color: 'bg-green-100 text-green-800' },
      'temporary': { label: 'Temporary', color: 'bg-yellow-100 text-yellow-800' },
    };
    const config = typeConfig[type as keyof typeof typeConfig] || typeConfig.branch;
    return <Badge className={config.color}>{config.label}</Badge>;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!warehouse) {
    return null;
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/warehouses")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div className="flex items-center gap-2">
            <WarehouseIcon className="h-6 w-6 text-blue-600" />
            <h1 className="text-2xl font-bold text-slate-900">{warehouse.name}</h1>
            {isFetching && <RefreshCw className="h-4 w-4 animate-spin text-blue-600" />}
          </div>
        </div>
        <Link href={`/warehouses/${warehouse.id}/edit`}>
          <Button>
            <Edit className="h-4 w-4 mr-2" />
            Edit Warehouse
          </Button>
        </Link>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-sm text-slate-600">Status</p>
              <div className="mt-1">
                {getStatusBadge(warehouse.status || 'active')}
              </div>
            </div>
            <Building className="h-8 w-8 text-blue-500 opacity-20" />
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-sm text-slate-600">Type</p>
              <div className="mt-1">
                {getTypeBadge(warehouse.type || 'branch')}
              </div>
            </div>
            <WarehouseIcon className="h-8 w-8 text-green-500 opacity-20" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-sm text-slate-600">Floor Area</p>
              <p className="text-2xl font-bold text-slate-900">
                {warehouse.floorArea ? `${warehouse.floorArea} m²` : '-'}
              </p>
            </div>
            <Package className="h-8 w-8 text-orange-500 opacity-20" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-sm text-slate-600">Capacity</p>
              <p className="text-2xl font-bold text-slate-900">
                {warehouse.capacity ? `${warehouse.capacity}` : '-'}
              </p>
            </div>
            <Hash className="h-8 w-8 text-purple-500 opacity-20" />
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Warehouse Information */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <WarehouseIcon className="h-5 w-5" />
                Warehouse Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-slate-600">Warehouse Name</p>
                  <p className="text-slate-900">{warehouse.name}</p>
                </div>
                {warehouse.location && (
                  <div>
                    <p className="text-sm font-medium text-slate-600">Location</p>
                    <p className="text-slate-900">{warehouse.location}</p>
                  </div>
                )}
              </div>

              {warehouse.address && (
                <div>
                  <p className="text-sm font-medium text-slate-600 mb-1">Address</p>
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-slate-400 mt-0.5" />
                    <div>
                      <p className="text-slate-900">{warehouse.address}</p>
                      {(warehouse.city || warehouse.country) && (
                        <p className="text-sm text-slate-600">
                          {[warehouse.city, warehouse.zipCode, warehouse.country].filter(Boolean).join(', ')}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {warehouse.manager && (
                  <div>
                    <p className="text-sm font-medium text-slate-600">Manager</p>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-slate-400" />
                      <p className="text-slate-900">{warehouse.manager}</p>
                    </div>
                  </div>
                )}
                {warehouse.contact && (
                  <div>
                    <p className="text-sm font-medium text-slate-600">Contact</p>
                    <p className="text-slate-900">{warehouse.contact}</p>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {warehouse.phone && (
                  <div>
                    <p className="text-sm font-medium text-slate-600">Phone</p>
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-slate-400" />
                      <p className="text-slate-900">{warehouse.phone}</p>
                    </div>
                  </div>
                )}
                {warehouse.email && (
                  <div>
                    <p className="text-sm font-medium text-slate-600">Email</p>
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-slate-400" />
                      <p className="text-slate-900">{warehouse.email}</p>
                    </div>
                  </div>
                )}
              </div>

              {warehouse.rentedFromDate && (
                <div>
                  <p className="text-sm font-medium text-slate-600">Rented From Date</p>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-slate-400" />
                    <p className="text-slate-900">{format(new Date(warehouse.rentedFromDate), 'MMM dd, yyyy')}</p>
                  </div>
                </div>
              )}

              {warehouse.expenseId && (
                <div>
                  <p className="text-sm font-medium text-slate-600">Expense ID</p>
                  <p className="text-slate-900">{warehouse.expenseId}</p>
                </div>
              )}

              {warehouse.notes && (
                <div>
                  <p className="text-sm font-medium text-slate-600">Notes</p>
                  <p className="text-slate-900 whitespace-pre-wrap">{warehouse.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>


        </div>

        {/* Right Column - Files */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Attachments ({files.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <ObjectUploader
                maxNumberOfFiles={5}
                maxFileSize={50 * 1024 * 1024} // 50MB
                onGetUploadParameters={handleGetUploadParameters}
                onComplete={handleFileUploadComplete}
                buttonClassName="w-full"
              >
                <div className="flex items-center gap-2">
                  <FileUp className="h-4 w-4" />
                  <span>Upload Files</span>
                </div>
              </ObjectUploader>

              {files.length > 0 && (
                <div className="space-y-2">
                  <Separator />
                  {files.map((file) => (
                    <div key={file.id} className="flex items-center justify-between p-2 border rounded-lg">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-slate-900 truncate">
                          {file.fileName}
                        </p>
                        <p className="text-xs text-slate-600">
                          {file.fileSize ? formatFileSize(file.fileSize) : 'Unknown size'} • {format(new Date(file.createdAt), 'MMM dd, yyyy')}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => window.open(file.fileUrl, '_blank')}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteFile(file)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Delete File Dialog */}
      <AlertDialog open={showDeleteFileDialog} onOpenChange={setShowDeleteFileDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete File</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{fileToDelete?.fileName}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDeleteFile}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      

    </div>
  );
}