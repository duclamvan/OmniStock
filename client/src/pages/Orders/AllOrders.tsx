import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { createVietnameseSearchMatcher } from "@/lib/vietnameseSearch";
import { formatCurrency } from "@/lib/currencyUtils";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Plus, Search, Filter, Download, FileText } from "lucide-react";

interface AllOrdersProps {
  filter?: string;
}

export default function AllOrders({ filter }: AllOrdersProps) {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState(filter || "all");
  const [entriesPerPage, setEntriesPerPage] = useState(10);

  const { data: orders = [], isLoading, error } = useQuery({
    queryKey: statusFilter !== 'all' ? ['/api/orders', statusFilter] : ['/api/orders'],
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

  // Paginate orders
  const startIndex = 0;
  const endIndex = entriesPerPage;
  const paginatedOrders = filteredOrders?.slice(startIndex, endIndex);

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
            <Select value={String(entriesPerPage)} onValueChange={(value) => setEntriesPerPage(Number(value))}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10 entries</SelectItem>
                <SelectItem value="20">20 entries</SelectItem>
                <SelectItem value="50">50 entries</SelectItem>
                <SelectItem value="100">100 entries</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Orders Table */}
      <Card>
        <CardHeader>
          <CardTitle>Orders ({filteredOrders?.length || 0})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order ID</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedOrders?.length > 0 ? (
                  paginatedOrders.map((order: any) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">
                        #{order.orderId}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="text-xs">
                              {order.customer?.name?.[0] || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">{order.customer?.name || 'Guest'}</div>
                            <div className="text-sm text-slate-500">{order.customer?.email}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {new Date(order.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {formatCurrency(parseFloat(order.grandTotal), order.currency)}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(order.orderStatus)}
                      </TableCell>
                      <TableCell>
                        {getPaymentStatusBadge(order.paymentStatus)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Select
                            value={order.orderStatus}
                            onValueChange={(value) =>
                              updateOrderMutation.mutate({
                                id: order.id,
                                updates: { orderStatus: value },
                              })
                            }
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="to_fulfill">To Fulfill</SelectItem>
                              <SelectItem value="shipped">Shipped</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <div className="text-slate-500">
                        {searchQuery ? 'No orders found matching your search.' : 'No orders found.'}
                      </div>
                      <Link href="/orders/add">
                        <Button className="mt-4">
                          <Plus className="mr-2 h-4 w-4" />
                          Create First Order
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
