import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Plus, Eye, Edit, Trash2, MoreVertical, ShoppingCart } from "lucide-react";
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
} from "@/components/ui/dropdown-menu";
import { format } from "date-fns";

interface PreOrder {
  id: string;
  customerId: string;
  status: string;
  notes: string | null;
  expectedDate: string | null;
  createdAt: string;
  updatedAt: string;
  customer: {
    id: string;
    name: string;
  } | null;
  itemsCount: number;
}

const statusConfig = {
  pending: {
    label: "Pending",
    className: "bg-amber-100 text-amber-800 border-amber-200",
  },
  partially_arrived: {
    label: "Partially Arrived",
    className: "bg-blue-100 text-blue-800 border-blue-200",
  },
  fully_arrived: {
    label: "Fully Arrived",
    className: "bg-green-100 text-green-800 border-green-200",
  },
  cancelled: {
    label: "Cancelled",
    className: "bg-red-100 text-red-800 border-red-200",
  },
};

export default function AllPreOrders() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [deletePreOrderId, setDeletePreOrderId] = useState<string | null>(null);

  const { data: preOrders, isLoading } = useQuery<PreOrder[]>({
    queryKey: ['/api/pre-orders'],
  });

  const deletePreOrderMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest('DELETE', `/api/pre-orders/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/pre-orders'] });
      setDeletePreOrderId(null);
      toast({
        title: "Success",
        description: "Pre-order deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete pre-order",
        variant: "destructive",
      });
    },
  });

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "—";
    try {
      return format(new Date(dateString), "MMM d, yyyy");
    } catch {
      return "—";
    }
  };

  const columns: DataTableColumn<PreOrder>[] = [
    {
      key: "customerName",
      header: "Customer Name",
      sortable: true,
      sortKey: "customer.name",
      cell: (preOrder) => (
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
            <ShoppingCart className="h-4 w-4 text-primary" />
          </div>
          <span className="font-medium" data-testid={`text-customer-name-${preOrder.id}`}>
            {preOrder.customer?.name || "Unknown Customer"}
          </span>
        </div>
      ),
    },
    {
      key: "itemsCount",
      header: "Items Count",
      sortable: true,
      cell: (preOrder) => (
        <Badge variant="outline" className="font-medium" data-testid={`text-items-count-${preOrder.id}`}>
          {preOrder.itemsCount} {preOrder.itemsCount === 1 ? "item" : "items"}
        </Badge>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      cell: (preOrder) => {
        const config = statusConfig[preOrder.status as keyof typeof statusConfig] || statusConfig.pending;
        return (
          <Badge 
            variant="outline" 
            className={config.className}
            data-testid={`badge-status-${preOrder.id}`}
          >
            {config.label}
          </Badge>
        );
      },
    },
    {
      key: "expectedDate",
      header: "Expected Date",
      sortable: true,
      cell: (preOrder) => (
        <span className="text-sm text-gray-600" data-testid={`text-expected-date-${preOrder.id}`}>
          {formatDate(preOrder.expectedDate)}
        </span>
      ),
    },
    {
      key: "createdAt",
      header: "Created Date",
      sortable: true,
      cell: (preOrder) => (
        <span className="text-sm text-gray-600" data-testid={`text-created-date-${preOrder.id}`}>
          {formatDate(preOrder.createdAt)}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      cell: (preOrder) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon"
              data-testid={`button-actions-${preOrder.id}`}
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() => setLocation(`/orders/pre-orders/${preOrder.id}`)}
              data-testid={`action-view-${preOrder.id}`}
            >
              <Eye className="h-4 w-4 mr-2" />
              View Details
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setLocation(`/orders/pre-orders/edit/${preOrder.id}`)}
              data-testid={`action-edit-${preOrder.id}`}
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setDeletePreOrderId(preOrder.id)}
              className="text-red-600 focus:text-red-600"
              data-testid={`action-delete-${preOrder.id}`}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900" data-testid="heading-pre-orders">
            Pre-Orders
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage customer pre-orders and track their arrival status
          </p>
        </div>
        <Button 
          onClick={() => setLocation('/orders/pre-orders/add')}
          data-testid="button-add-pre-order"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Pre-Order
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Pre-Orders</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-1/4" />
                    <Skeleton className="h-3 w-1/3" />
                  </div>
                  <Skeleton className="h-8 w-24" />
                  <Skeleton className="h-8 w-32" />
                </div>
              ))}
            </div>
          ) : !preOrders || preOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <ShoppingCart className="h-12 w-12 text-gray-400 mb-4" />
              <p className="text-gray-500 text-center" data-testid="text-no-pre-orders">
                No pre-orders yet. Click "Add Pre-Order" to create one.
              </p>
            </div>
          ) : (
            <DataTable
              data={preOrders}
              columns={columns}
              getRowKey={(preOrder) => preOrder.id}
              showPagination={true}
              defaultItemsPerPage={20}
              itemsPerPageOptions={[10, 20, 50, 100]}
            />
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!deletePreOrderId} onOpenChange={() => setDeletePreOrderId(null)}>
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
              onClick={() => deletePreOrderId && deletePreOrderMutation.mutate(deletePreOrderId)}
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
