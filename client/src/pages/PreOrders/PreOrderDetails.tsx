import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  ArrowLeft, 
  Edit, 
  Trash2, 
  Calendar, 
  User,
  Package,
  Clock,
  FileText,
  MoreVertical,
  CheckCircle2,
  XCircle,
  Clock3,
  TrendingUp
} from "lucide-react";
import { format } from "date-fns";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";
import { useState } from "react";

const statusConfig = {
  pending: {
    label: "Pending",
    className: "bg-amber-100 text-amber-800 border-amber-200",
    icon: Clock3,
  },
  partially_arrived: {
    label: "Partially Arrived",
    className: "bg-blue-100 text-blue-800 border-blue-200",
    icon: TrendingUp,
  },
  fully_arrived: {
    label: "Fully Arrived",
    className: "bg-green-100 text-green-800 border-green-200",
    icon: CheckCircle2,
  },
  cancelled: {
    label: "Cancelled",
    className: "bg-red-100 text-red-800 border-red-200",
    icon: XCircle,
  },
};

export default function PreOrderDetails() {
  const [, navigate] = useLocation();
  const { id } = useParams();
  const { toast } = useToast();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const { data: preOrder, isLoading, error } = useQuery<any>({
    queryKey: [`/api/pre-orders/${id}`],
    enabled: !!id,
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('DELETE', `/api/pre-orders/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/pre-orders'] });
      toast({
        title: "Success",
        description: "Pre-order deleted successfully",
      });
      navigate('/orders/pre-orders');
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete pre-order",
        variant: "destructive",
      });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async (newStatus: string) => {
      return await apiRequest('PATCH', `/api/pre-orders/${id}`, { status: newStatus });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/pre-orders/${id}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/pre-orders'] });
      toast({
        title: "Success",
        description: "Pre-order status updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update pre-order status",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64" data-testid="loading-state">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || !preOrder) {
    return null;
  }

  const config = statusConfig[preOrder.status as keyof typeof statusConfig] || statusConfig.pending;
  const StatusIcon = config.icon;

  const calculateProgress = (item: any) => {
    if (!item.quantity) return 0;
    return Math.round((item.arrivedQuantity / item.quantity) * 100);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "—";
    try {
      return format(new Date(dateString), "PPP");
    } catch {
      return "—";
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => window.history.back()}
            data-testid="button-back"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold" data-testid="heading-pre-order-details">
              Pre-Order Details
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {preOrder.customer?.name || "Unknown Customer"}
            </p>
          </div>
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" data-testid="button-actions">
              <MoreVertical className="h-4 w-4 mr-2" />
              Actions
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem
              onClick={() => navigate(`/orders/pre-orders/edit/${id}`)}
              data-testid="action-edit"
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => updateStatusMutation.mutate('partially_arrived')}
              disabled={updateStatusMutation.isPending || preOrder.status === 'partially_arrived'}
              data-testid="action-mark-partially-arrived"
            >
              <TrendingUp className="h-4 w-4 mr-2" />
              Mark as Partially Arrived
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => updateStatusMutation.mutate('fully_arrived')}
              disabled={updateStatusMutation.isPending || preOrder.status === 'fully_arrived'}
              data-testid="action-mark-fully-arrived"
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Mark as Fully Arrived
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => updateStatusMutation.mutate('cancelled')}
              disabled={updateStatusMutation.isPending || preOrder.status === 'cancelled'}
              className="text-red-600 focus:text-red-600"
              data-testid="action-cancel-pre-order"
            >
              <XCircle className="h-4 w-4 mr-2" />
              Cancel Pre-Order
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => setShowDeleteDialog(true)}
              className="text-red-600 focus:text-red-600"
              data-testid="action-delete"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Header Card */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <CardTitle className="text-xl md:text-2xl">Pre-Order Information</CardTitle>
            <Badge 
              variant="outline" 
              className={`${config.className} px-3 py-1 text-sm font-medium border`}
              data-testid="badge-status"
            >
              <StatusIcon className="h-4 w-4 mr-2" />
              {config.label}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex items-start gap-3">
              <User className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Customer</p>
                <p className="font-medium text-base" data-testid="text-customer-name">
                  {preOrder.customer?.name || "Unknown Customer"}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Expected Arrival Date</p>
                <p className="font-medium text-base" data-testid="text-expected-date">
                  {formatDate(preOrder.expectedDate)}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Created Date</p>
                <p className="font-medium text-base" data-testid="text-created-date">
                  {formatDate(preOrder.createdAt)}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Package className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Total Items</p>
                <p className="font-medium text-base" data-testid="text-total-items">
                  {preOrder.items?.length || 0} {preOrder.items?.length === 1 ? "item" : "items"}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Items Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Pre-Order Items
          </CardTitle>
        </CardHeader>
        <CardContent>
          {preOrder.items && preOrder.items.length > 0 ? (
            <div className="space-y-4">
              {preOrder.items.map((item: any, index: number) => {
                const progress = calculateProgress(item);
                const isFullyArrived = item.arrivedQuantity >= item.quantity;
                const isPartiallyArrived = item.arrivedQuantity > 0 && item.arrivedQuantity < item.quantity;

                return (
                  <div
                    key={item.id}
                    className="p-4 border rounded-lg bg-slate-50 dark:bg-slate-900 space-y-3"
                    data-testid={`item-${item.id}`}
                  >
                    <div className="flex flex-col sm:flex-row justify-between items-start gap-3">
                      <div className="flex-1">
                        <h3 className="font-semibold text-base" data-testid={`text-item-name-${item.id}`}>
                          {item.name || item.itemName}
                        </h3>
                        {(item.description || item.itemDescription) && (
                          <p className="text-sm text-muted-foreground mt-1" data-testid={`text-item-description-${item.id}`}>
                            {item.description || item.itemDescription}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className={
                            isFullyArrived
                              ? "bg-green-100 text-green-800 border-green-200"
                              : isPartiallyArrived
                              ? "bg-blue-100 text-blue-800 border-blue-200"
                              : "bg-gray-100 text-gray-800 border-gray-200"
                          }
                          data-testid={`badge-item-status-${item.id}`}
                        >
                          {item.arrivedQuantity} / {item.quantity} arrived
                        </Badge>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>Arrival Progress</span>
                        <span data-testid={`text-progress-${item.id}`}>{progress}%</span>
                      </div>
                      <Progress 
                        value={progress} 
                        className="h-2"
                        data-testid={`progress-bar-${item.id}`}
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t text-sm">
                      <div>
                        <p className="text-muted-foreground">Ordered Quantity</p>
                        <p className="font-medium" data-testid={`text-quantity-${item.id}`}>
                          {item.quantity}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Arrived Quantity</p>
                        <p className="font-medium" data-testid={`text-arrived-quantity-${item.id}`}>
                          {item.arrivedQuantity || 0}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12">
              <Package className="h-12 w-12 text-gray-400 mb-4" />
              <p className="text-gray-500 text-center" data-testid="text-no-items">
                No items in this pre-order
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notes Card (only show if notes exist) */}
      {preOrder.notes && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Notes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap" data-testid="text-notes">
              {preOrder.notes}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Pre-Order</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this pre-order? This action cannot be undone
              and will also delete all associated items.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate()}
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
