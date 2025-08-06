import { useState, useEffect, useMemo, memo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
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
import { Plus, Search, Filter, Download, FileText, Edit, Trash2, Package, Eye } from "lucide-react";
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
  const [location, navigate] = useLocation();
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
    refetchInterval: 10000, // Refetch every 10 seconds
    refetchOnWindowFocus: true, // Refetch when user returns to the tab
    staleTime: 5000, // Consider data stale after 5 seconds
    gcTime: 300000, // Keep in cache for 5 minutes (formerly cacheTime)
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

  // Filter orders based on search query (memoized for performance)
  const filteredOrders = useMemo(() => {
    if (!orders) return [];
    if (!searchQuery) return orders;
    
    const matcher = createVietnameseSearchMatcher(searchQuery);
    return orders.filter((order: any) => 
      matcher(order.orderId || '') ||
      matcher(order.customer?.name || '') ||
      matcher(order.customer?.facebookName || '')
    );
  }, [orders, searchQuery]);

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

  // Calculate profit for each order
  const calculateOrderProfit = (order: any) => {
    // Calculate total cost from order items
    let totalCost = 0;
    if (order.items && Array.isArray(order.items)) {
      order.items.forEach((item: any) => {
        // Get product cost based on currency
        let itemCost = 0;
        if (order.currency === 'CZK' && item.product?.importCostCzk) {
          itemCost = parseFloat(item.product.importCostCzk) * item.quantity;
        } else if (order.currency === 'EUR' && item.product?.importCostEur) {
          itemCost = parseFloat(item.product.importCostEur) * item.quantity;
        } else if (order.currency === 'USD' && item.product?.importCostUsd) {
          itemCost = parseFloat(item.product.importCostUsd) * item.quantity;
        }
        totalCost += itemCost;
      });
    }
    
    const revenue = parseFloat(order.grandTotal || '0');
    const profit = revenue - totalCost;
    return profit;
  };

  // Define table columns
  const columns: DataTableColumn<any>[] = [
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
      key: "profit",
      header: "Total Profit",
      sortable: true,
      cell: (order) => {
        const profit = calculateOrderProfit(order);
        return (
          <span className={profit >= 0 ? 'text-green-600' : 'text-red-600'}>
            {formatCurrency(profit, order.currency)}
          </span>
        );
      },
      className: "text-right",
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
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-mobile-2xl font-bold text-slate-900">{getPageTitle()}</h1>
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <Button variant="outline" size="sm" className="flex-1 sm:flex-none touch-target">
            <Download className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Export XLS</span>
            <span className="sm:hidden">XLS</span>
          </Button>
          <Button variant="outline" size="sm" className="flex-1 sm:flex-none touch-target">
            <FileText className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Export PDF</span>
            <span className="sm:hidden">PDF</span>
          </Button>
          <Link href="/orders/add" className="flex-1 sm:flex-none">
            <Button className="w-full touch-target">
              <Plus className="mr-2 h-4 w-4" />
              Add Order
            </Button>
          </Link>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col gap-3 sm:gap-4 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search orders..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 touch-target"
              />
            </div>
            {!filter && (
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-48 touch-target">
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
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-mobile-lg">Orders ({filteredOrders?.length || 0})</CardTitle>
        </CardHeader>
        <CardContent className="p-0 sm:p-6">
          {/* Mobile Card View */}
          <div className="sm:hidden space-y-3 p-3">
            {filteredOrders?.map((order: any) => (
              <div 
                key={order.id} 
                className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => navigate(`/orders/${order.id}`)}
              >
                <div className="space-y-3">
                  {/* Top Row - Customer, Status, Edit */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <Avatar className="h-10 w-10 flex-shrink-0">
                        <AvatarImage src={order.customer?.profileImageUrl} />
                        <AvatarFallback className="text-sm bg-gray-100">{order.customer?.name?.charAt(0) || 'C'}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-gray-900 truncate">{order.customer?.name || 'N/A'}</p>
                        <p className="text-xs text-gray-500 truncate">FB: {order.customer?.facebookName || 'N/A'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {getStatusBadge(order.orderStatus)}
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        className="h-8 w-8"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/orders/${order.id}/edit`);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  {/* Middle Row - Order Info */}
                  <div className="flex items-center justify-between text-sm text-gray-600">
                    <span>Order ID: <span className="font-medium text-gray-900">{order.orderId}</span></span>
                    <span>{new Date(order.createdAt).toLocaleDateString('vi-VN')}</span>
                  </div>
                  
                  {/* Items Summary */}
                  {order.items && order.items.length > 0 && (
                    <div className="bg-gray-50 rounded-md p-2 text-xs">
                      <p className="font-medium text-gray-700 mb-1">Items ({order.items.length}):</p>
                      <div className="space-y-1">
                        {order.items.slice(0, 2).map((item: any, index: number) => (
                          <p key={index} className="text-gray-600">
                            {item.productName} × {item.quantity}
                          </p>
                        ))}
                        {order.items.length > 2 && (
                          <p className="text-gray-500 italic">+{order.items.length - 2} more items</p>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {/* Bottom Row - Financial */}
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Total / Profit</p>
                      <p className="text-lg font-bold text-gray-900">
                        {formatCurrency(parseFloat(order.grandTotal || '0'), order.currency)}
                      </p>
                      <p className={`text-sm font-medium ${calculateOrderProfit(order) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(calculateOrderProfit(order), order.currency)}
                      </p>
                    </div>
                    {getPaymentStatusBadge(order.paymentStatus)}
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {/* Desktop Table View */}
          <div className="hidden sm:block">
            <DataTable
              data={filteredOrders}
              columns={columns}
              bulkActions={bulkActions}
              getRowKey={(order) => order.id}
              itemsPerPageOptions={[10, 20, 50, 100]}
              defaultItemsPerPage={20}
              onRowClick={(order) => {
                // Store the current path before navigating
                sessionStorage.setItem('orderDetailsReferrer', location);
                navigate(`/orders/${order.id}`);
              }}
              expandable={{
                render: (order) => (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                        <Package className="h-4 w-4" />
                        Order Items ({order.items?.length || 0})
                      </h4>
                      <Link href={`/orders/${order.id}`}>
                        <Button size="sm" variant="outline">
                          <Eye className="mr-2 h-4 w-4" />
                          View Details
                        </Button>
                      </Link>
                    </div>
                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-slate-50">
                            <TableHead className="text-xs">Product</TableHead>
                            <TableHead className="text-xs text-center">Qty</TableHead>
                            <TableHead className="text-xs text-right">Unit Price</TableHead>
                            <TableHead className="text-xs text-right">Total</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {order.items?.map((item: any, index: number) => (
                            <TableRow key={item.id || index} className="text-sm">
                              <TableCell className="font-medium">
                                {item.productName}
                                <div className="text-xs text-slate-500">SKU: {item.sku}</div>
                              </TableCell>
                              <TableCell className="text-center">{item.quantity}</TableCell>
                              <TableCell className="text-right">
                                {formatCurrency(item.price || 0, order.currency || 'EUR')}
                              </TableCell>
                              <TableCell className="text-right font-medium">
                                {formatCurrency(item.total || 0, order.currency || 'EUR')}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
                      <div className="text-sm">
                        <p className="text-slate-500">Subtotal</p>
                        <p className="font-medium">{formatCurrency(order.subtotal || 0, order.currency || 'EUR')}</p>
                      </div>
                      {order.discountValue > 0 && (
                        <div className="text-sm">
                          <p className="text-slate-500">Discount</p>
                          <p className="font-medium text-green-600">
                            -{formatCurrency(
                              order.discountType === 'rate' 
                                ? (order.subtotal * order.discountValue / 100) 
                                : order.discountValue || 0, 
                              order.currency || 'EUR'
                            )}
                          </p>
                        </div>
                      )}
                      {order.shippingCost > 0 && (
                        <div className="text-sm">
                          <p className="text-slate-500">Shipping</p>
                          <p className="font-medium">{formatCurrency(order.shippingCost || 0, order.currency || 'EUR')}</p>
                        </div>
                      )}
                      <div className="text-sm">
                        <p className="text-slate-500">Grand Total</p>
                        <p className="font-bold text-lg">{formatCurrency(order.grandTotal || 0, order.currency || 'EUR')}</p>
                      </div>
                    </div>
                  </div>
                ),
              }}
            />
          </div>
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
