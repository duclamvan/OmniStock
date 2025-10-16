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
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { createVietnameseSearchMatcher } from "@/lib/vietnameseSearch";
import { formatCurrency, formatDate } from "@/lib/currencyUtils";
import { isUnauthorizedError } from "@/lib/authUtils";
import { getCountryFlag } from "@/lib/countries";
import { Plus, Search, Filter, Download, FileText, Edit, Trash2, Package, Eye, ChevronDown, ChevronUp, Settings, Check, List, AlignJustify } from "lucide-react";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface AllOrdersProps {
  filter?: string;
}

export default function AllOrders({ filter }: AllOrdersProps) {
  const { toast } = useToast();
  const [location, navigate] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [ordersToDelete, setOrdersToDelete] = useState<any[]>([]);
  
  // Load saved expand preference from localStorage
  const [expandAll, setExpandAll] = useState(() => {
    const saved = localStorage.getItem('ordersExpandAll');
    return saved === 'true';
  });

  // View mode state with localStorage persistence
  const [viewMode, setViewMode] = useState<'normal' | 'compact'>(() => {
    const saved = localStorage.getItem('ordersViewMode');
    return (saved === 'compact' ? 'compact' : 'normal') as 'normal' | 'compact';
  });

  // Column visibility state with localStorage persistence
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>(() => {
    const saved = localStorage.getItem('ordersVisibleColumns');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return {
          customer: true,
          createdAt: true,
          total: true,
          status: true,
          paymentStatus: true,
          profit: true,
          tracking: true,
        };
      }
    }
    return {
      customer: true,
      createdAt: true,
      total: true,
      status: true,
      paymentStatus: true,
      profit: true,
      tracking: true,
    };
  });
  
  // Save expand preference to localStorage
  const handleExpandAllChange = (checked: boolean) => {
    setExpandAll(checked);
    localStorage.setItem('ordersExpandAll', checked.toString());
  };

  // Toggle view mode and save to localStorage
  const handleViewModeChange = (mode: 'normal' | 'compact') => {
    setViewMode(mode);
    localStorage.setItem('ordersViewMode', mode);
  };

  // Toggle column visibility
  const toggleColumnVisibility = (columnKey: string) => {
    const updated = { ...visibleColumns, [columnKey]: !visibleColumns[columnKey] };
    setVisibleColumns(updated);
    localStorage.setItem('ordersVisibleColumns', JSON.stringify(updated));
  };

  const { data: orders = [], isLoading, error } = useQuery({
    queryKey: filter ? ['/api/orders', 'status', filter] : ['/api/orders'],
    queryFn: async () => {
      const url = filter ? `/api/orders?status=${filter}&includeItems=true` : '/api/orders?includeItems=true';
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
    onMutate: async (ids) => {
      // Predicate to match only list queries (not detail queries)
      const isListQuery = (query: any) => {
        return query.queryKey[0] === '/api/orders' && 
               query.queryKey.length <= 3 && // Matches ['/api/orders'] or ['/api/orders', 'status', filter]
               Array.isArray(query.state.data); // Only process array data
      };
      
      // Cancel ALL list query refetches
      await queryClient.cancelQueries({ predicate: isListQuery });
      
      // Snapshot ALL list queries for rollback
      const previousQueries = queryClient.getQueriesData({ predicate: isListQuery });
      
      // Optimistically update ALL list queries by removing deleted orders
      queryClient.setQueriesData(
        { predicate: isListQuery },
        (old: any[] | undefined) => {
          if (!old || !Array.isArray(old)) return old;
          return old.filter(order => !ids.includes(order.id));
        }
      );
      
      // Return context with previous data for rollback
      return { previousQueries };
    },
    onSuccess: (_, ids) => {
      toast({
        title: "Success",
        description: `Deleted ${ids.length} order(s) successfully`,
      });
    },
    onError: (error: any, _, context) => {
      // Rollback ALL queries to previous data on error
      if (context?.previousQueries) {
        context.previousQueries.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      console.error("Order delete error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete orders",
        variant: "destructive",
      });
    },
    // Only refetch on error (handled in onError), not on success
  });

  const bulkUpdateStatusMutation = useMutation({
    mutationFn: async ({ orderIds, status }: { orderIds: string[], status: string }) => {
      await Promise.all(orderIds.map(id => 
        apiRequest('PATCH', `/api/orders/${id}`, { orderStatus: status })
      ));
    },
    onMutate: async ({ orderIds, status }) => {
      // Predicate to match only list queries
      const isListQuery = (query: any) => {
        return query.queryKey[0] === '/api/orders' && 
               query.queryKey.length <= 3 &&
               Array.isArray(query.state.data);
      };
      
      // Cancel list query refetches
      await queryClient.cancelQueries({ predicate: isListQuery });
      
      // Snapshot list queries for rollback
      const previousQueries = queryClient.getQueriesData({ predicate: isListQuery });
      
      // Optimistically update ALL list queries
      queryClient.setQueriesData(
        { predicate: isListQuery },
        (old: any[] | undefined) => {
          if (!old || !Array.isArray(old)) return old;
          return old.map(order => 
            orderIds.includes(order.id) 
              ? { ...order, orderStatus: status }
              : order
          );
        }
      );
      
      return { previousQueries };
    },
    onSuccess: (_, { orderIds }) => {
      toast({
        title: "Success",
        description: `Updated ${orderIds.length} order(s) successfully`,
      });
    },
    onError: (error: any, _, context) => {
      // Rollback on error
      if (context?.previousQueries) {
        context.previousQueries.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      toast({
        title: "Error",
        description: error.message || "Failed to update orders",
        variant: "destructive",
      });
    },
  });

  const bulkUpdatePaymentMutation = useMutation({
    mutationFn: async ({ orderIds, paymentStatus }: { orderIds: string[], paymentStatus: string }) => {
      await Promise.all(orderIds.map(id => 
        apiRequest('PATCH', `/api/orders/${id}`, { paymentStatus })
      ));
    },
    onMutate: async ({ orderIds, paymentStatus }) => {
      // Predicate to match only list queries
      const isListQuery = (query: any) => {
        return query.queryKey[0] === '/api/orders' && 
               query.queryKey.length <= 3 &&
               Array.isArray(query.state.data);
      };
      
      // Cancel list query refetches
      await queryClient.cancelQueries({ predicate: isListQuery });
      
      // Snapshot list queries for rollback
      const previousQueries = queryClient.getQueriesData({ predicate: isListQuery });
      
      // Optimistically update ALL list queries
      queryClient.setQueriesData(
        { predicate: isListQuery },
        (old: any[] | undefined) => {
          if (!old || !Array.isArray(old)) return old;
          return old.map(order => 
            orderIds.includes(order.id) 
              ? { ...order, paymentStatus: paymentStatus }
              : order
          );
        }
      );
      
      return { previousQueries };
    },
    onSuccess: (_, { orderIds }) => {
      toast({
        title: "Success",
        description: `Updated payment status for ${orderIds.length} order(s)`,
      });
    },
    onError: (error: any, _, context) => {
      // Rollback on error
      if (context?.previousQueries) {
        context.previousQueries.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      toast({
        title: "Error",
        description: error.message || "Failed to update payment status",
        variant: "destructive",
      });
    },
  });

  // Filter orders based on search query and status (memoized for performance)
  const filteredOrders = useMemo(() => {
    if (!orders) return [];
    
    let filtered = orders;
    
    // Apply status filter
    if (statusFilter && statusFilter !== 'all') {
      filtered = filtered.filter((order: any) => order.orderStatus === statusFilter);
    }
    
    // Apply search filter
    if (searchQuery) {
      const matcher = createVietnameseSearchMatcher(searchQuery);
      filtered = filtered.filter((order: any) => 
        matcher(order.orderId || '') ||
        matcher(order.customer?.name || '') ||
        matcher(order.customer?.facebookName || '')
      );
    }
    
    return filtered;
  }, [orders, searchQuery, statusFilter]);

  // Color Psychology: Green=success, Amber=warning/pending, Blue=in-progress, Red=error/urgent
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-amber-100 text-amber-800">Pending</Badge>;
      case 'to_fulfill':
        return <Badge className="bg-blue-100 text-blue-800">To Fulfill</Badge>;
      case 'ready_to_ship':
        return <Badge className="bg-blue-100 text-blue-800">Ready to Ship</Badge>;
      case 'shipped':
        return <Badge className="bg-green-100 text-green-800">Shipped</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPaymentStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-amber-100 text-amber-800">Pending</Badge>;
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

  // Calculate statistics for the filtered orders (only show for to_fulfill filter)
  const statistics = useMemo(() => {
    if (filter !== 'to_fulfill' || !filteredOrders.length) return null;

    const totalOrders = filteredOrders.length;
    const totalRevenue = filteredOrders.reduce((sum, order) => sum + parseFloat(order.grandTotal || '0'), 0);
    const totalProfit = filteredOrders.reduce((sum, order) => sum + calculateOrderProfit(order), 0);

    // Calculate new vs returning customers
    const customerIds = new Set<string>();
    const customerOrderCounts = new Map<string, number>();
    
    // Count all orders for each customer (not just filtered ones)
    orders.forEach((order: any) => {
      if (order.customerId) {
        customerOrderCounts.set(
          order.customerId, 
          (customerOrderCounts.get(order.customerId) || 0) + 1
        );
      }
    });

    // Count new vs returning in filtered orders
    let newCustomers = 0;
    let returningCustomers = 0;
    
    filteredOrders.forEach((order: any) => {
      if (order.customerId && !customerIds.has(order.customerId)) {
        customerIds.add(order.customerId);
        const orderCount = customerOrderCounts.get(order.customerId) || 0;
        if (orderCount <= 1) {
          newCustomers++;
        } else {
          returningCustomers++;
        }
      }
    });

    // Determine the primary currency (most common in filtered orders)
    const currencyCounts = new Map<string, number>();
    filteredOrders.forEach((order: any) => {
      const currency = order.currency || 'EUR';
      currencyCounts.set(currency, (currencyCounts.get(currency) || 0) + 1);
    });
    const primaryCurrency = Array.from(currencyCounts.entries())
      .sort((a, b) => b[1] - a[1])[0]?.[0] || 'EUR';

    return {
      totalOrders,
      totalRevenue,
      totalProfit,
      newCustomers,
      returningCustomers,
      primaryCurrency,
    };
  }, [filter, filteredOrders, orders]);

  // Define table columns
  const columns: DataTableColumn<any>[] = [
    {
      key: "customer",
      header: "Customer",
      sortable: true,
      sortKey: "customer.name", // Sort by nested customer.name property
      cell: (order) => (
        <div className="flex items-center gap-2">
          <Avatar className="h-8 w-8">
            <AvatarImage src={order.customer?.profileImageUrl} />
            <AvatarFallback>{order.customer?.name?.charAt(0) || 'C'}</AvatarFallback>
          </Avatar>
          <div>
            <div className="font-medium flex items-center gap-1.5">
              {order.customer?.billingCountry && (
                <span className="text-base" title={order.customer.billingCountry}>
                  {getCountryFlag(order.customer.billingCountry)}
                </span>
              )}
              <span>{order.customer?.name || 'N/A'}</span>
            </div>
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
      cell: (order) => formatDate(order.createdAt),
    },
    {
      key: "total",
      header: "Total",
      sortable: true,
      sortKey: "grandTotal", // Sort by grandTotal property
      cell: (order) => formatCurrency(parseFloat(order.grandTotal || '0'), order.currency),
      className: "text-right",
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      sortKey: "orderStatus", // Sort by orderStatus property
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
      sortable: false, // Disable sorting for calculated values
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
    {
      key: "tracking",
      header: "Tracking",
      sortable: true,
      sortKey: "trackingNumber", // Sort by trackingNumber property
      cell: (order) => (
        <div className="text-sm">
          {order.trackingNumber ? (
            <span className="font-mono text-slate-700">{order.trackingNumber}</span>
          ) : (
            <span className="text-slate-400">—</span>
          )}
        </div>
      ),
    },
  ];

  // Filter columns based on visibility
  const visibleColumnsFiltered = columns.filter(col => visibleColumns[col.key] !== false);

  // Bulk actions for DataTable
  const bulkActions = [
    {
      type: "select" as const,
      label: "Order Status",
      placeholder: "Change status...",
      options: [
        { label: "Pending", value: "pending" },
        { label: "To Fulfill", value: "to_fulfill" },
        { label: "Ready to Ship", value: "ready_to_ship" },
        { label: "Shipped", value: "shipped" },
      ],
      action: (orders: any[], value: string) => {
        bulkUpdateStatusMutation.mutate({
          orderIds: orders.map(o => o.id),
          status: value
        });
      },
    },
    {
      type: "select" as const,
      label: "Payment Status",
      placeholder: "Change payment...",
      options: [
        { label: "Pending", value: "pending" },
        { label: "Paid", value: "paid" },
        { label: "Pay Later", value: "pay_later" },
      ],
      action: (orders: any[], value: string) => {
        bulkUpdatePaymentMutation.mutate({
          orderIds: orders.map(o => o.id),
          paymentStatus: value
        });
      },
    },
    {
      type: "button" as const,
      label: "Delete",
      variant: "destructive" as const,
      action: (orders: any[]) => {
        setOrdersToDelete(orders);
        setShowDeleteDialog(true);
      },
    },
  ];

  const handleDeleteConfirm = () => {
    deleteOrderMutation.mutate(ordersToDelete.map(order => order.id));
    setShowDeleteDialog(false);
    setOrdersToDelete([]);
  };

  // Remove loading state to prevent UI refresh indicators

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

      {/* Statistics (only show for to_fulfill) */}
      {statistics && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Total Orders</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">{statistics.totalOrders}</div>
              <p className="text-xs text-slate-500 mt-1">To fulfill</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Total Revenue</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">
                {formatCurrency(statistics.totalRevenue, statistics.primaryCurrency)}
              </div>
              <p className="text-xs text-slate-500 mt-1">Expected income</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Total Profit</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${statistics.totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(statistics.totalProfit, statistics.primaryCurrency)}
              </div>
              <p className="text-xs text-slate-500 mt-1">After costs</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Customers</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">{statistics.newCustomers + statistics.returningCustomers}</div>
              <p className="text-xs text-slate-500 mt-1">
                <span className="text-blue-600">{statistics.newCustomers} new</span>
                {' • '}
                <span className="text-slate-600">{statistics.returningCustomers} returning</span>
              </p>
            </CardContent>
          </Card>
        </div>
      )}

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
                  <SelectItem value="ready_to_ship">Ready to Ship</SelectItem>
                  <SelectItem value="shipped">Shipped</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Orders Table */}
      <Card>
        <CardContent className="p-0 sm:p-6">
          {/* Header with view toggle - always visible */}
          <div className="px-4 sm:px-0 pb-4 pt-4 sm:pt-0">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-mobile-lg font-semibold">Orders ({filteredOrders?.length || 0})</h2>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 border rounded-md">
                  <Button
                    variant={viewMode === 'normal' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => handleViewModeChange('normal')}
                    className="h-7 px-2 text-xs rounded-r-none"
                    data-testid="button-viewNormal"
                  >
                    <List className="h-3 w-3 mr-1" />
                    Normal
                  </Button>
                  <Button
                    variant={viewMode === 'compact' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => handleViewModeChange('compact')}
                    className="h-7 px-2 text-xs rounded-l-none"
                    data-testid="button-viewCompact"
                  >
                    <AlignJustify className="h-3 w-3 mr-1" />
                    Compact
                  </Button>
                </div>
                {viewMode === 'normal' && (
                  <>
                    <Label htmlFor="expand-all" className="text-sm text-slate-600 cursor-pointer">
                      {expandAll ? 'Collapse All' : 'Expand All'}
                    </Label>
                    <Switch
                      id="expand-all"
                      checked={expandAll}
                      onCheckedChange={handleExpandAllChange}
                      className="data-[state=checked]:bg-blue-600"
                    />
                  </>
                )}
                {viewMode === 'normal' && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Settings className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <div className="px-2 py-1.5 text-sm font-semibold">Show Columns</div>
                      {columns.map((column) => (
                        <DropdownMenuItem
                          key={column.key}
                          onClick={(e) => {
                            e.preventDefault();
                            toggleColumnVisibility(column.key);
                          }}
                          className="cursor-pointer"
                        >
                          <div className="flex items-center justify-between w-full">
                            <span>{column.header}</span>
                            {visibleColumns[column.key] !== false && (
                              <Check className="h-4 w-4 text-blue-600" />
                            )}
                          </div>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>
          </div>

          {viewMode === 'normal' ? (
            <DataTable
              data={filteredOrders}
              columns={visibleColumnsFiltered}
              bulkActions={bulkActions}
              tableId="all-orders"
              getRowKey={(order) => order.id}
              itemsPerPageOptions={[10, 20, 50, 100]}
              defaultItemsPerPage={20}
              defaultExpandAll={expandAll}
              compact={true}
              onRowClick={(order) => {
                sessionStorage.setItem('orderDetailsReferrer', location);
                navigate(`/orders/${order.id}`);
              }}
              renderBulkActions={({ selectedRows, selectedItems, bulkActions: actions }) => (
              selectedRows.size > 0 ? (
                <div className="px-4 sm:px-0 pb-6">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="secondary" className="text-xs h-6 px-2">
                      {selectedRows.size} selected
                    </Badge>
                    {actions.map((action, index) => {
                      if (action.type === "select") {
                        return (
                          <Select
                            key={index}
                            onValueChange={(value) => action.action(selectedItems, value)}
                          >
                            <SelectTrigger className="h-6 w-auto min-w-[100px] text-xs">
                              <SelectValue placeholder={action.placeholder || action.label} />
                            </SelectTrigger>
                            <SelectContent align="start">
                              {action.options.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        );
                      } else {
                        return (
                          <Button
                            key={index}
                            size="sm"
                            variant={action.variant || "ghost"}
                            onClick={() => action.action(selectedItems)}
                            className="h-6 px-2 text-xs"
                          >
                            {action.label}
                          </Button>
                        );
                      }
                    })}
                  </div>
                </div>
              ) : null
            )}
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
          ) : (
            <div className="space-y-1">
                {filteredOrders.map((order: any) => (
                  <div
                    key={order.id}
                    className="border-b border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors"
                    onClick={() => {
                      sessionStorage.setItem('orderDetailsReferrer', location);
                      navigate(`/orders/${order.id}`);
                    }}
                    data-testid={`compact-order-${order.id}`}
                  >
                    <div className="px-3 py-2">
                      <div className="flex items-start justify-between gap-3 mb-1">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            {(() => {
                              // Color based on order status
                              const statusColors: Record<string, string> = {
                                'to_fulfill': 'bg-blue-500',      // Blue - Action needed
                                'ready_to_ship': 'bg-amber-500',  // Amber - Ready to go
                                'shipped': 'bg-green-500',        // Green - Completed
                                'pending': 'bg-slate-400',        // Gray - Waiting
                                'cancelled': 'bg-red-500',        // Red - Cancelled
                              };
                              const bulletColor = statusColors[order.status] || 'bg-slate-500';
                              
                              return (
                                <div className="flex items-center gap-1.5">
                                  <div className={`w-2 h-2 rounded-full ${bulletColor}`} />
                                  <span className="font-semibold text-sm">{order.orderId}</span>
                                </div>
                              );
                            })()}
                            <Badge
                              variant={
                                order.status === 'to_fulfill' ? 'default' :
                                order.status === 'ready_to_ship' ? 'secondary' :
                                order.status === 'shipped' ? 'outline' : 'secondary'
                              }
                              className="text-xs h-5 px-1.5"
                            >
                              {order.status?.replace('_', ' ')}
                            </Badge>
                            <Badge
                              variant={order.paymentStatus === 'paid' ? 'default' : 'secondary'}
                              className="text-xs h-5 px-1.5"
                            >
                              {order.paymentStatus}
                            </Badge>
                          </div>
                          <div className="text-xs mt-0.5">
                            {(() => {
                              const customerName = order.customer?.name || 'N/A';
                              // Generate consistent color based on customer name hash
                              const hash = customerName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
                              const colors = [
                                'text-blue-600',
                                'text-emerald-600', 
                                'text-violet-600',
                                'text-rose-600',
                                'text-amber-600',
                                'text-cyan-600',
                                'text-pink-600',
                                'text-indigo-600',
                              ];
                              const colorClass = colors[hash % colors.length];
                              
                              return (
                                <>
                                  <span className={`font-medium ${colorClass}`}>{customerName}</span>
                                  <span className="text-slate-600"> • {formatDate(order.createdAt)}</span>
                                </>
                              );
                            })()}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-sm">{formatCurrency(order.grandTotal || 0, order.currency || 'EUR')}</div>
                        </div>
                      </div>
                      {order.items && order.items.length > 0 && (
                        <div className="mt-1 text-xs text-slate-700 space-y-0.5">
                          {order.items.map((item: any, idx: number) => (
                            <div key={idx} className="flex items-center justify-between">
                              <span className="truncate">
                                {item.quantity}× {item.productName}
                                {item.sku && <span className="text-slate-500"> ({item.sku})</span>}
                              </span>
                              <span className="ml-2 text-slate-600">
                                {formatCurrency(item.total || 0, order.currency || 'EUR')}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Orders</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {ordersToDelete.length} order(s)? This action cannot be undone.
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
