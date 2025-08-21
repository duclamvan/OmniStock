import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable, DataTableColumn } from "@/components/ui/data-table";
import { formatCurrency } from "@/lib/currencyUtils";
import { 
  Plus, 
  Search, 
  Package, 
  Truck, 
  Calculator,
  DollarSign,
  CheckCircle,
  Clock,
  AlertCircle,
  ArrowRight,
  Globe,
  Ship,
  FileText
} from "lucide-react";
import { format } from "date-fns";

export default function AllImports() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Fetch import orders
  const { data: importOrders = [], isLoading } = useQuery({
    queryKey: ['/api/import-orders'],
    queryFn: async () => {
      const response = await fetch('/api/import-orders');
      if (!response.ok) throw new Error('Failed to fetch import orders');
      return response.json();
    }
  });

  // Filter orders
  const filteredOrders = importOrders.filter((order: any) => {
    const matchesSearch = 
      order.orderNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.trackingNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.region?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || order.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Calculate stats
  const stats = {
    total: importOrders.length,
    pending: importOrders.filter((o: any) => o.status === 'pending').length,
    inTransit: importOrders.filter((o: any) => ['ordered', 'shipped'].includes(o.status)).length,
    delivered: importOrders.filter((o: any) => o.status === 'delivered').length,
    received: importOrders.filter((o: any) => o.status === 'received').length,
    totalValue: importOrders.reduce((sum: number, o: any) => 
      sum + parseFloat(o.totalLandedCost || o.productValue || '0'), 0
    )
  };

  // Define table columns
  const columns: DataTableColumn<any>[] = [
    {
      key: "orderNumber",
      header: "Order #",
      sortable: true,
      cell: (order) => (
        <Link href={`/imports/orders/${order.id}`}>
          <span className="font-medium text-blue-600 hover:text-blue-800 cursor-pointer">
            {order.orderNumber}
          </span>
        </Link>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      cell: (order) => {
        const statusColors: Record<string, string> = {
          pending: 'bg-gray-100 text-gray-800',
          ordered: 'bg-blue-100 text-blue-800',
          shipped: 'bg-purple-100 text-purple-800',
          delivered: 'bg-green-100 text-green-800',
          received: 'bg-teal-100 text-teal-800',
          cancelled: 'bg-red-100 text-red-800'
        };
        
        const statusIcons: Record<string, any> = {
          pending: Clock,
          ordered: FileText,
          shipped: Ship,
          delivered: Truck,
          received: CheckCircle,
          cancelled: AlertCircle
        };
        
        const Icon = statusIcons[order.status] || Clock;
        
        return (
          <Badge className={`${statusColors[order.status]} flex items-center gap-1`}>
            <Icon className="h-3 w-3" />
            {order.status}
          </Badge>
        );
      },
    },
    {
      key: "supplier",
      header: "Supplier",
      cell: (order) => order.supplier?.name || '-',
    },
    {
      key: "region",
      header: "Region",
      cell: (order) => (
        <div className="flex items-center gap-1">
          <Globe className="h-3 w-3 text-gray-400" />
          {order.region || '-'}
        </div>
      ),
    },
    {
      key: "productValue",
      header: "Product Value",
      sortable: true,
      cell: (order) => formatCurrency(
        parseFloat(order.productValue || '0'),
        order.currency
      ),
      className: "text-right",
    },
    {
      key: "shippingCost",
      header: "Shipping",
      sortable: true,
      cell: (order) => formatCurrency(
        parseFloat(order.shippingCost || '0'),
        order.currency
      ),
      className: "text-right",
    },
    {
      key: "totalLandedCost",
      header: "Landed Cost",
      sortable: true,
      cell: (order) => (
        <div className="text-right">
          <div className="font-semibold">
            {formatCurrency(
              parseFloat(order.totalLandedCost || '0'),
              order.currency
            )}
          </div>
          {order.calculationType && (
            <div className="text-xs text-gray-500">
              {order.calculationType.replace('_', ' ')}
            </div>
          )}
        </div>
      ),
    },
    {
      key: "estimatedArrival",
      header: "ETA",
      sortable: true,
      cell: (order) => order.estimatedArrival ? (
        <div>
          <div>{format(new Date(order.estimatedArrival), 'MMM dd')}</div>
          <div className="text-xs text-gray-500">
            {format(new Date(order.estimatedArrival), 'yyyy')}
          </div>
        </div>
      ) : '-',
    },
    {
      key: "actions",
      header: "",
      cell: (order) => (
        <div className="flex items-center gap-1">
          {order.status === 'delivered' && (
            <Link href={`/imports/orders/${order.id}/receive`}>
              <Button size="sm" variant="outline">
                <CheckCircle className="h-4 w-4 mr-1" />
                Receive
              </Button>
            </Link>
          )}
          <Link href={`/imports/orders/${order.id}`}>
            <Button size="sm" variant="ghost">
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold">Import Orders</h1>
        <Link href="/imports/orders/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Import Order
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Orders</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Package className="h-8 w-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Pending</p>
                <p className="text-2xl font-bold">{stats.pending}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">In Transit</p>
                <p className="text-2xl font-bold">{stats.inTransit}</p>
              </div>
              <Ship className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Delivered</p>
                <p className="text-2xl font-bold">{stats.delivered}</p>
              </div>
              <Truck className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Received</p>
                <p className="text-2xl font-bold">{stats.received}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-teal-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Value</p>
                <p className="text-xl font-bold">
                  ${stats.totalValue.toLocaleString()}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search by order #, tracking #, or region..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="ordered">Ordered</SelectItem>
                <SelectItem value="shipped">Shipped</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
                <SelectItem value="received">Received</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Orders Table */}
      <Card>
        <CardHeader>
          <CardTitle>Import Orders</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            data={filteredOrders}
            columns={columns}
            getRowKey={(order) => order.id}
            itemsPerPageOptions={[10, 20, 50, 100]}
            defaultItemsPerPage={20}
          />
        </CardContent>
      </Card>
    </div>
  );
}