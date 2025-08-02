import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable, DataTableColumn } from "@/components/ui/data-table";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { createVietnameseSearchMatcher } from "@/lib/vietnameseSearch";
import { formatCurrency } from "@/lib/currencyUtils";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Plus, Search, Filter, Download, FileText, Edit, Trash2 } from "lucide-react";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface AllOrdersProps {
  filter?: string;
}

export default function AllOrders({ filter }: AllOrdersProps) {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedOrders, setSelectedOrders] = useState<any[]>([]);

  const { data: orders = [], isLoading, error } = useQuery({
    queryKey: filter ? ['/api/orders', 'status', filter] : ['/api/orders'],
    queryFn: async () => {
      const url = filter ? `/api/orders?status=${filter}` : '/api/orders';
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch orders');
      return response.json();
    },
    retry: false,
  });

  // Error handling
  useEffect(() => {
    if (error) {
      toast({
        title: "Error",
        description: "Failed to load orders",
        variant: "destructive",
      });
    }
  }, [error, toast]);

  const updateOrderMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      await apiRequest('PATCH', `/api/orders/${id}`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      toast({
        title: "Success",
        description: "Order updated successfully",
      });
    },
    onError: (error) => {
      console.error("Order update error:", error);
      toast({
        title: "Error",
        description: "Failed to update order",
        variant: "destructive",
      });
    },
  });

  const deleteOrderMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      await Promise.all(ids.map(id => apiRequest('DELETE', `/api/orders/${id}`)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      toast({
        title: "Success",
        description: `Deleted ${selectedOrders.length} order(s) successfully`,
      });
      setSelectedOrders([]);
    },
    onError: (error: any) => {
      console.error("Order delete error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete orders",
        variant: "destructive",
      });
    },
  });

  // Filter orders based on search query
  const filteredOrders = orders?.filter((order: any) => {
    if (!searchQuery) return true;
    
    const matcher = createVietnameseSearchMatcher(searchQuery);
    return (
      matcher(order.orderId || '') ||
      matcher(order.customer?.name || '') ||
      matcher(order.customer?.facebookName || '')
    );
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>;
      case 'to_fulfill':
        return <Badge variant="default">To Fulfill</Badge>;
      case 'shipped':
        return <Badge className="bg-green-100 text-green-800">Shipped</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPaymentStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>;
      case 'paid':
        return <Badge className="bg-green-100 text-green-800">Paid</Badge>;
      case 'pay_later':
        return <Badge className="bg-blue-100 text-blue-800">Pay Later</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPageTitle = () => {
    switch (filter) {
      case 'to_fulfill':
        return 'Orders to Fulfill';
      case 'shipped':
        return 'Shipped Orders';
      case 'pay_later':
        return 'Pay Later Orders';
      default:
        return 'All Orders';
    }
  };

  // Define table columns
  const columns: DataTableColumn<any>[] = [
    {
      key: "orderId",
      header: "Order ID",
      sortable: true,
      cell: (order) => (
        <Link href={`/orders/${order.id}/edit`}>
          <span className="font-medium text-blue-600 hover:text-blue-800 cursor-pointer">
            {order.orderId || '#' + order.id.slice(0, 8)}
          </span>
        </Link>
      ),
    },
    {
      key: "customer",
      header: "Customer",
      sortable: true,
      cell: (order) => (
        <div className="flex items-center gap-2">
          <Avatar className="h-8 w-8">
            <AvatarImage src={order.customer?.profileImageUrl} />
            <AvatarFallback>{order.customer?.name?.charAt(0) || 'C'}</AvatarFallback>
          </Avatar>
          <div>
            <div className="font-medium">{order.customer?.name || 'N/A'}</div>
            {order.customer?.facebookName && (
              <div className="text-xs text-gray-500">FB: {order.customer.facebookName}</div>
            )}
          </div>
        </div>
      ),
    },
    {
      key: "createdAt",
      header: "Date",
      sortable: true,
      cell: (order) => new Date(order.createdAt).toLocaleDateString('vi-VN'),
    },
    {
      key: "total",
      header: "Total",
      sortable: true,
      cell: (order) => formatCurrency(parseFloat(order.grandTotal || '0'), order.currency),
      className: "text-right",
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      cell: (order) => getStatusBadge(order.orderStatus),
    },
    {
      key: "paymentStatus",
      header: "Payment",
      sortable: true,
      cell: (order) => getPaymentStatusBadge(order.paymentStatus),
    },
    {
      key: "actions",
      header: "Actions",
      cell: (order) => (
        <Link href={`/orders/edit/${order.id}`}>
          <Button size="sm" variant="ghost">
            <Edit className="h-4 w-4" />
          </Button>
        </Link>
      ),
    },
  ];

  // Bulk actions
  const bulkActions = [
    {
      label: "Update Status",
      action: (orders: any[]) => {
        // TODO: Implement bulk status update
        toast({
          title: "Bulk Update",
          description: `Updating ${orders.length} orders...`,
        });
      },
    },
    {
      label: "Delete",
      variant: "destructive" as const,
      action: (orders: any[]) => {
        setSelectedOrders(orders);
        setShowDeleteDialog(true);
      },
    },
    {
      label: "Export",
      action: (orders: any[]) => {
        // TODO: Implement export functionality
        toast({
          title: "Export",
          description: `Exporting ${orders.length} orders...`,
        });
      },
    },
  ];

  const handleDeleteConfirm = () => {
    deleteOrderMutation.mutate(selectedOrders.map(order => order.id));
    setShowDeleteDialog(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-slate-600">Loading orders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">{getPageTitle()}</h1>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Export XLS
          </Button>
          <Button variant="outline" size="sm">
            <FileText className="mr-2 h-4 w-4" />
            Export PDF
          </Button>
          <Link href="/orders/add">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Order
            </Button>
          </Link>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search orders by ID, customer name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            {!filter && (
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Orders</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="to_fulfill">To Fulfill</SelectItem>
                  <SelectItem value="shipped">Shipped</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Orders Table */}
      <Card>
        <CardHeader>
          <CardTitle>Orders ({filteredOrders?.length || 0})</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            data={filteredOrders}
            columns={columns}
            bulkActions={bulkActions}
            getRowKey={(order) => order.id}
            itemsPerPageOptions={[10, 20, 50, 100]}
            defaultItemsPerPage={20}
          />
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Orders</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedOrders.length} order(s)? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
