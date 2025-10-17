import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  ArrowLeft, 
  Edit, 
  Trash2, 
  Calendar, 
  DollarSign, 
  FileText,
  User,
  Package,
  Wrench
} from "lucide-react";
import { formatCzechDate } from "@/lib/dateUtils";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useState } from "react";

interface ServiceItem {
  id: string;
  serviceId: string;
  productId: string;
  productName: string;
  sku: string | null;
  quantity: number;
  unitPrice: string;
  totalPrice: string;
  createdAt: string;
  updatedAt: string;
}

interface Service {
  id: string;
  customerId: string | null;
  customer?: {
    id: string;
    name: string;
  } | null;
  name: string;
  description: string | null;
  serviceDate: string | null;
  serviceCost: string;
  partsCost: string;
  totalCost: string;
  status: string;
  notes: string | null;
  items?: ServiceItem[];
  createdAt: string;
  updatedAt: string;
}

export default function ServiceDetails() {
  const [, navigate] = useLocation();
  const { id } = useParams();
  const { toast } = useToast();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const { data: service, isLoading, error } = useQuery<Service>({
    queryKey: [`/api/services/${id}`],
    enabled: !!id,
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('DELETE', `/api/services/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/services'] });
      toast({
        title: "Success",
        description: "Service deleted successfully",
      });
      navigate('/services');
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete service",
        variant: "destructive",
      });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async (newStatus: string) => {
      return await apiRequest('PATCH', `/api/services/${id}`, { status: newStatus });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/services/${id}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/services'] });
      toast({
        title: "Success",
        description: "Service status updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update service status",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64" data-testid="loading-spinner">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || !service) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4" data-testid="error-state">
        <Wrench className="h-12 w-12 text-gray-400" />
        <p className="text-gray-500">Service not found</p>
        <Button onClick={() => navigate('/services')} data-testid="button-back-to-services">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Services
        </Button>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800" data-testid="badge-status-pending">Pending</Badge>;
      case 'in_progress':
        return <Badge className="bg-blue-100 text-blue-800" data-testid="badge-status-in-progress">In Progress</Badge>;
      case 'completed':
        return <Badge className="bg-green-100 text-green-800" data-testid="badge-status-completed">Completed</Badge>;
      case 'cancelled':
        return <Badge className="bg-red-100 text-red-800" data-testid="badge-status-cancelled">Cancelled</Badge>;
      default:
        return <Badge variant="outline" data-testid={`badge-status-${status}`}>{status}</Badge>;
    }
  };

  const formatCurrency = (amount: string) => {
    const num = parseFloat(amount || '0');
    return `€${num.toFixed(2)}`;
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/services')}
            data-testid="button-back"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold" data-testid="text-page-title">Service Details</h1>
            <p className="text-muted-foreground text-sm" data-testid="text-service-name">{service.name}</p>
          </div>
        </div>
        <Button
          variant="outline"
          onClick={() => navigate(`/services/${id}/edit`)}
          data-testid="button-edit"
        >
          <Edit className="mr-2 h-4 w-4" />
          Edit
        </Button>
      </div>

      {/* Main Details Card */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start flex-wrap gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Wrench className="h-5 w-5" />
                Service Information
              </CardTitle>
              <CardDescription>
                Created on {formatCzechDate(service.createdAt)}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Select
                value={service.status}
                onValueChange={(value) => updateStatusMutation.mutate(value)}
                disabled={updateStatusMutation.isPending}
              >
                <SelectTrigger className="w-[140px]" data-testid="select-status">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending" data-testid="option-status-pending">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-yellow-500" />
                      Pending
                    </div>
                  </SelectItem>
                  <SelectItem value="in_progress" data-testid="option-status-in-progress">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-blue-500" />
                      In Progress
                    </div>
                  </SelectItem>
                  <SelectItem value="completed" data-testid="option-status-completed">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-500" />
                      Completed
                    </div>
                  </SelectItem>
                  <SelectItem value="cancelled" data-testid="option-status-cancelled">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-red-500" />
                      Cancelled
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              {updateStatusMutation.isPending && (
                <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Service Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Wrench className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Service Name</p>
                  <p className="font-medium" data-testid="text-service-name-detail">{service.name}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <User className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Customer</p>
                  <p className="font-medium" data-testid="text-customer-name">
                    {service.customer?.name || '—'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Service Date</p>
                  <p className="font-medium" data-testid="text-service-date">
                    {formatCzechDate(service.serviceDate)}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-5 w-5 flex items-center justify-center">
                  {getStatusBadge(service.status)}
                </div>
              </div>

              {service.description && (
                <div className="flex items-start gap-3">
                  <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Description</p>
                    <p className="text-sm whitespace-pre-wrap" data-testid="text-description">
                      {service.description}
                    </p>
                  </div>
                </div>
              )}

              {service.notes && (
                <div className="flex items-start gap-3">
                  <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Notes</p>
                    <p className="text-sm whitespace-pre-wrap" data-testid="text-notes">
                      {service.notes}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cost Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Cost Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Service Cost</p>
              <p className="text-2xl font-semibold" data-testid="text-service-cost">
                {formatCurrency(service.serviceCost)}
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Parts Cost</p>
              <p className="text-2xl font-semibold" data-testid="text-parts-cost">
                {formatCurrency(service.partsCost)}
              </p>
            </div>
            <div className="space-y-2 bg-slate-50 dark:bg-slate-900 p-4 rounded-lg">
              <p className="text-sm text-muted-foreground">Total Cost</p>
              <p className="text-3xl font-bold text-primary" data-testid="text-total-cost">
                {formatCurrency(service.totalCost)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Parts Used Table */}
      {service.items && service.items.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Parts Used
            </CardTitle>
            <CardDescription>
              List of parts and materials used in this service
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead data-testid="header-product-name">Product Name</TableHead>
                    <TableHead data-testid="header-sku">SKU</TableHead>
                    <TableHead className="text-center" data-testid="header-quantity">Quantity</TableHead>
                    <TableHead className="text-right" data-testid="header-unit-price">Unit Price</TableHead>
                    <TableHead className="text-right" data-testid="header-total-price">Total Price</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {service.items.map((item) => (
                    <TableRow key={item.id} data-testid={`row-item-${item.id}`}>
                      <TableCell className="font-medium" data-testid={`text-product-name-${item.id}`}>
                        {item.productName}
                      </TableCell>
                      <TableCell className="text-muted-foreground" data-testid={`text-sku-${item.id}`}>
                        {item.sku || '—'}
                      </TableCell>
                      <TableCell className="text-center" data-testid={`text-quantity-${item.id}`}>
                        {item.quantity}
                      </TableCell>
                      <TableCell className="text-right" data-testid={`text-unit-price-${item.id}`}>
                        {formatCurrency(item.unitPrice)}
                      </TableCell>
                      <TableCell className="text-right font-semibold" data-testid={`text-item-total-${item.id}`}>
                        {formatCurrency(item.totalPrice)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions and Audit Trail */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h3 className="font-medium text-sm mb-2">Audit Trail</h3>
              <div className="text-sm text-muted-foreground space-y-1">
                <p data-testid="text-created-at">Created: {formatCzechDate(service.createdAt)}</p>
                {service.updatedAt && service.updatedAt !== service.createdAt && (
                  <p data-testid="text-updated-at">Last Updated: {formatCzechDate(service.updatedAt)}</p>
                )}
              </div>
            </div>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setShowDeleteDialog(true)}
              data-testid="button-delete"
              className="w-full md:w-auto"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Service
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle data-testid="text-delete-dialog-title">Delete Service</AlertDialogTitle>
            <AlertDialogDescription data-testid="text-delete-dialog-description">
              Are you sure you want to delete this service? This action cannot be undone and will also delete all associated service items.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate()}
              className="bg-red-600 hover:bg-red-700"
              data-testid="button-confirm-delete"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
