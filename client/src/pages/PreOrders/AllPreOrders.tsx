import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { formatCompactNumber } from "@/lib/currencyUtils";
import { fuzzySearch } from "@/lib/fuzzySearch";
import { Plus, Eye, Edit, Trash2, MoreVertical, ShoppingCart, Filter, Package, Clock, CheckCircle, Activity, Calendar, Search } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
    className: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-800",
  },
  partially_arrived: {
    label: "Partially Arrived",
    className: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-400 dark:border-blue-800",
  },
  fully_arrived: {
    label: "Fully Arrived",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800",
  },
  cancelled: {
    label: "Cancelled",
    className: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-800",
  },
};

export default function AllPreOrders() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [deletePreOrderId, setDeletePreOrderId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Column visibility state with localStorage persistence
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>(() => {
    const saved = localStorage.getItem('preOrdersVisibleColumns');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return {};
      }
    }
    return {
      customer: true,
      itemsCount: true,
      status: true,
      expectedDate: true,
      createdAt: true,
    };
  });

  // Toggle column visibility
  const toggleColumnVisibility = (columnKey: string) => {
    const newVisibility = { ...visibleColumns, [columnKey]: !visibleColumns[columnKey] };
    setVisibleColumns(newVisibility);
    localStorage.setItem('preOrdersVisibleColumns', JSON.stringify(newVisibility));
  };

  const { data: preOrders = [], isLoading } = useQuery<PreOrder[]>({
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

  // Filter pre-orders based on search query and filters
  let filteredPreOrders = preOrders || [];

  // Apply search filter
  if (searchQuery) {
    filteredPreOrders = fuzzySearch(filteredPreOrders, searchQuery, {
      fields: ['customer.name', 'notes'],
      threshold: 0.2,
      fuzzy: true,
      vietnameseNormalization: true,
    }).map(r => r.item);
  }

  // Apply status filter
  if (statusFilter !== "all") {
    filteredPreOrders = filteredPreOrders.filter(p => p.status === statusFilter);
  }

  // Calculate stats
  const totalPreOrders = preOrders.length;
  const activePreOrders = preOrders.filter(p => p.status === 'pending' || p.status === 'partially_arrived').length;
  const pendingArrival = preOrders.filter(p => p.status === 'pending').length;
  const totalItems = preOrders.reduce((sum: number, p: any) => sum + (p.itemsCount || 0), 0);

  const columns: DataTableColumn<PreOrder>[] = [
    {
      key: "customer",
      header: "Customer",
      sortable: true,
      sortKey: "customer.name",
      className: "min-w-[200px]",
      cell: (preOrder) => (
        <div className="flex items-center gap-3" onClick={() => setLocation(`/orders/pre-orders/${preOrder.id}`)} role="button" tabIndex={0}>
          <div className="p-2 rounded-lg bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-cyan-950 dark:to-blue-950">
            <ShoppingCart className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
          </div>
          <div>
            <div className="font-semibold text-slate-900 dark:text-slate-100" data-testid={`text-customer-name-${preOrder.id}`}>
              {preOrder.customer?.name || "Unknown Customer"}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              ID: {preOrder.id.slice(0, 8)}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: "itemsCount",
      header: "Items",
      sortable: true,
      className: "text-right",
      cell: (preOrder) => (
        <div className="flex items-center justify-end gap-2">
          <Package className="h-4 w-4 text-slate-400" />
          <span className="font-semibold text-slate-900 dark:text-slate-100" data-testid={`text-items-count-${preOrder.id}`}>
            {preOrder.itemsCount}
          </span>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      className: "text-center",
      cell: (preOrder) => {
        const config = statusConfig[preOrder.status as keyof typeof statusConfig] || statusConfig.pending;
        return (
          <Badge 
            variant="outline" 
            className={`${config.className} font-medium px-2.5 py-1`}
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
      className: "min-w-[120px]",
      cell: (preOrder) => (
        preOrder.expectedDate ? (
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-slate-400" />
            <span className="text-sm text-slate-700 dark:text-slate-300" data-testid={`text-expected-date-${preOrder.id}`}>
              {formatDate(preOrder.expectedDate)}
            </span>
          </div>
        ) : (
          <span className="text-sm text-slate-400">—</span>
        )
      ),
    },
    {
      key: "createdAt",
      header: "Created Date",
      sortable: true,
      className: "min-w-[120px]",
      cell: (preOrder) => (
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-slate-400" />
          <span className="text-sm text-slate-700 dark:text-slate-300" data-testid={`text-created-date-${preOrder.id}`}>
            {formatDate(preOrder.createdAt)}
          </span>
        </div>
      ),
    },
    {
      key: "actions",
      header: "",
      className: "w-16 text-center",
      cell: (preOrder) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon"
              className="h-8 w-8 hover:bg-cyan-50 dark:hover:bg-cyan-950"
              data-testid={`button-actions-${preOrder.id}`}
            >
              <MoreVertical className="h-4 w-4 text-slate-600 dark:text-slate-400" />
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
            <DropdownMenuSeparator />
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

  // Filter columns based on visibility
  const visibleColumnsFiltered = columns.filter(col => 
    col.key === 'actions' || visibleColumns[col.key] !== false
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[600px]">
        <div className="text-center">
          <div className="relative w-16 h-16 mx-auto mb-6">
            <div className="absolute inset-0 border-4 border-cyan-200 dark:border-cyan-800 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-cyan-600 dark:border-cyan-400 rounded-full border-t-transparent animate-spin"></div>
          </div>
          <p className="text-slate-600 dark:text-slate-400 font-medium">Loading pre-orders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight" data-testid="heading-pre-orders">
            Pre-Orders
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Manage customer pre-orders and advance bookings
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

      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Pre-Orders */}
        <Card className="border-slate-200 dark:border-slate-800 hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Total Pre-Orders
                </p>
                <p className="text-3xl font-bold text-slate-900 dark:text-slate-100 truncate">
                  {totalPreOrders}
                </p>
              </div>
              <div className="flex-shrink-0 p-3 rounded-xl bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-cyan-950 dark:to-blue-950">
                <ShoppingCart className="h-7 w-7 text-cyan-600 dark:text-cyan-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Active Pre-Orders */}
        <Card className="border-slate-200 dark:border-slate-800 hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Active
                </p>
                <p className="text-3xl font-bold text-blue-600 dark:text-blue-400 truncate">
                  {activePreOrders}
                </p>
              </div>
              <div className="flex-shrink-0 p-3 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950">
                <Activity className="h-7 w-7 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pending Arrival */}
        <Card className="border-slate-200 dark:border-slate-800 hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Pending Arrival
                </p>
                <p className="text-3xl font-bold text-amber-600 dark:text-amber-400 truncate">
                  {pendingArrival}
                </p>
              </div>
              <div className="flex-shrink-0 p-3 rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950 dark:to-orange-950">
                <Clock className="h-7 w-7 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Total Items */}
        <Card className="border-slate-200 dark:border-slate-800 hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Total Items
                </p>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <p className="text-3xl font-bold text-purple-600 dark:text-purple-400 cursor-help truncate">
                        {formatCompactNumber(totalItems)}
                      </p>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="font-mono">{totalItems.toLocaleString()} items</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <div className="flex-shrink-0 p-3 rounded-xl bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-950 dark:to-indigo-950">
                <Package className="h-7 w-7 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters & Search */}
      <Card className="border-slate-200 dark:border-slate-800">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-slate-600 dark:text-slate-400" />
            <CardTitle className="text-lg">Filters & Search</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Search */}
            <div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search pre-orders..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-10 border-slate-300 dark:border-slate-700 focus:border-cyan-500 dark:focus:border-cyan-500"
                  data-testid="input-search-pre-orders"
                />
              </div>
            </div>

            {/* Status Filter */}
            <div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-10 border-slate-300 dark:border-slate-700 focus:border-cyan-500 dark:focus:border-cyan-500">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="partially_arrived">Partially Arrived</SelectItem>
                  <SelectItem value="fully_arrived">Fully Arrived</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Active Filters Display */}
          {(searchQuery || statusFilter !== "all") && (
            <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
              <span className="text-sm text-slate-600 dark:text-slate-400">Active filters:</span>
              {searchQuery && (
                <Badge variant="secondary" className="text-xs">
                  Search: {searchQuery}
                </Badge>
              )}
              {statusFilter !== "all" && (
                <Badge variant="secondary" className="text-xs">
                  Status: {statusFilter}
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Data Table */}
      <Card className="border-slate-200 dark:border-slate-800">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>All Pre-Orders</CardTitle>
            <CardDescription className="mt-1">
              {filteredPreOrders.length} {filteredPreOrders.length === 1 ? 'pre-order' : 'pre-orders'} found
            </CardDescription>
          </div>
          {/* Column Visibility Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>Toggle Columns</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {[
                { key: 'customer', label: 'Customer' },
                { key: 'itemsCount', label: 'Items' },
                { key: 'status', label: 'Status' },
                { key: 'expectedDate', label: 'Expected Date' },
                { key: 'createdAt', label: 'Created Date' },
              ].map((col) => (
                <DropdownMenuItem
                  key={col.key}
                  onClick={() => toggleColumnVisibility(col.key)}
                  className="flex items-center justify-between"
                >
                  <span>{col.label}</span>
                  {visibleColumns[col.key] && (
                    <CheckCircle className="h-4 w-4 text-cyan-600" />
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </CardHeader>
        <CardContent>
          {!filteredPreOrders || filteredPreOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <ShoppingCart className="h-12 w-12 text-slate-400 mb-4" />
              <p className="text-slate-500 text-center" data-testid="text-no-pre-orders">
                {searchQuery || statusFilter !== "all" 
                  ? "No pre-orders match your filters" 
                  : "No pre-orders yet. Click \"Add Pre-Order\" to create one."}
              </p>
            </div>
          ) : (
            <DataTable
              data={filteredPreOrders}
              columns={visibleColumnsFiltered}
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
