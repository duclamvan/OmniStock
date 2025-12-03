import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable, DataTableColumn } from "@/components/ui/data-table";
import { formatCurrency, formatDate } from "@/lib/currencyUtils";
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
  FileText,
  BarChart3,
  Columns,
  Edit,
  Eye
} from "lucide-react";

export default function AllImports() {
  const { t } = useTranslation('imports');
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

  // Fetch import items to count items per order
  const { data: importItems = [] } = useQuery({
    queryKey: ['/api/import-items'],
    queryFn: async () => {
      const response = await fetch('/api/import-items');
      if (!response.ok) return [];
      return response.json();
    }
  });

  // Calculate item count per order
  const itemCountByOrder: { [orderId: string]: number } = {};
  (importItems as any[])?.forEach((item: any) => {
    const orderId = item.importOrderId;
    if (orderId) {
      itemCountByOrder[orderId] = (itemCountByOrder[orderId] || 0) + 1;
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

  // Helper function to get status badge
  const getStatusBadge = (order: any) => {
    const statusColors: Record<string, string> = {
      pending: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
      ordered: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      shipped: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200',
      delivered: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      received: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      cancelled: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
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
        {t(order.status)}
      </Badge>
    );
  };

  // Define table columns
  const columns: DataTableColumn<any>[] = [
    {
      key: "orderNumber",
      header: t('orderNumber'),
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
      header: t('status'),
      sortable: true,
      cell: (order) => getStatusBadge(order),
    },
    {
      key: "supplier",
      header: t('supplier'),
      cell: (order) => order.supplier?.name || '-',
    },
    {
      key: "region",
      header: t('region'),
      cell: (order) => (
        <div className="flex items-center gap-1">
          <Globe className="h-3 w-3 text-gray-400 dark:text-gray-500" />
          {order.region || '-'}
        </div>
      ),
    },
    {
      key: "productValue",
      header: t('productValue'),
      sortable: true,
      cell: (order) => formatCurrency(
        parseFloat(order.productValue || '0'),
        order.currency
      ),
      className: "text-right",
    },
    {
      key: "shippingCost",
      header: t('shipping'),
      sortable: true,
      cell: (order) => formatCurrency(
        parseFloat(order.shippingCost || '0'),
        order.currency
      ),
      className: "text-right",
    },
    {
      key: "totalLandedCost",
      header: t('landedCost'),
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
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {order.calculationType.replace('_', ' ')}
            </div>
          )}
        </div>
      ),
    },
    {
      key: "estimatedArrival",
      header: t('eta'),
      sortable: true,
      cell: (order) => order.estimatedArrival ? (
        <div>
          <div>{formatDate(order.estimatedArrival)}</div>
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
                {t('receive')}
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
        <h1 className="text-2xl font-semibold">{t('importOrders')}</h1>
        <Link href="/imports/orders/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            {t('newImportOrder')}
          </Button>
        </Link>
      </div>

      {/* Quick Actions */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        <Link href="/imports/kanban">
          <Button variant="outline" size="sm">
            <Columns className="h-4 w-4 mr-2" />
            {t('kanbanView')}
          </Button>
        </Link>
        <Link href="/imports/items">
          <Button variant="outline" size="sm">
            <Package className="h-4 w-4 mr-2" />
            {t('trackItems')}
          </Button>
        </Link>
        <Link href="/imports/consolidated">
          <Button variant="outline" size="sm">
            <BarChart3 className="h-4 w-4 mr-2" />
            {t('warehouseView')}
          </Button>
        </Link>
        <Link href="/imports/shipments">
          <Button variant="outline" size="sm">
            <Truck className="h-4 w-4 mr-2" />
            {t('trackShipments')}
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('totalOrders')}</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Package className="h-8 w-8 text-gray-400 dark:text-gray-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('pending')}</p>
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
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('inTransit')}</p>
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
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('delivered')}</p>
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
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('received')}</p>
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
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('totalValue')}</p>
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
          <CardTitle>{t('filters')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 h-4 w-4" />
                <Input
                  placeholder={t('searchPlaceholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder={t('allStatuses')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('allStatuses')}</SelectItem>
                <SelectItem value="pending">{t('pending')}</SelectItem>
                <SelectItem value="ordered">{t('ordered')}</SelectItem>
                <SelectItem value="shipped">{t('shipped')}</SelectItem>
                <SelectItem value="delivered">{t('delivered')}</SelectItem>
                <SelectItem value="received">{t('received')}</SelectItem>
                <SelectItem value="cancelled">{t('cancelled')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Orders Table */}
      <Card>
        <CardHeader>
          <CardTitle>{t('importOrders')}</CardTitle>
        </CardHeader>
        <CardContent className="p-0 sm:p-6">
          {/* Mobile Card View */}
          <div className="sm:hidden space-y-3 p-3">
            {filteredOrders?.map((order: any) => (
              <div key={order.id} className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-4">
                <div className="space-y-3">
                  {/* Top Row - Order Number, Status, Actions */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <Link href={`/imports/orders/${order.id}`}>
                        <p className="font-semibold text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer">
                          {order.orderNumber}
                        </p>
                      </Link>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {order.supplier?.name || '-'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {getStatusBadge(order)}
                    </div>
                  </div>
                  
                  {/* Middle Row - Key Details (2 columns) */}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500 dark:text-gray-400 text-xs">{t('common:date', 'Date')}</p>
                      <p className="font-medium text-gray-900 dark:text-gray-100">
                        {order.orderDate ? formatDate(order.orderDate) : formatDate(order.createdAt)}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500 dark:text-gray-400 text-xs">{t('items')}</p>
                      <p className="font-medium text-gray-900 dark:text-gray-100 flex items-center gap-1">
                        <Package className="h-3.5 w-3.5" />
                        {itemCountByOrder[order.id] || 0}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500 dark:text-gray-400 text-xs">{t('totalCost')}</p>
                      <p className="font-semibold text-gray-900 dark:text-gray-100">
                        {formatCurrency(
                          parseFloat(order.totalLandedCost || order.productValue || '0'),
                          order.currency
                        )}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500 dark:text-gray-400 text-xs">{t('region')}</p>
                      <p className="font-medium text-gray-900 dark:text-gray-100 flex items-center gap-1">
                        <Globe className="h-3.5 w-3.5" />
                        {order.region || '-'}
                      </p>
                    </div>
                  </div>
                  
                  {/* Expected Arrival / Tracking */}
                  {(order.estimatedArrival || order.trackingNumber) && (
                    <div className="grid grid-cols-2 gap-4 text-sm pt-2 border-t border-gray-100 dark:border-slate-700">
                      {order.estimatedArrival && (
                        <div>
                          <p className="text-gray-500 dark:text-gray-400 text-xs">{t('estimatedArrival')}</p>
                          <p className="font-medium text-gray-900 dark:text-gray-100 flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            {formatDate(order.estimatedArrival)}
                          </p>
                        </div>
                      )}
                      {order.trackingNumber && (
                        <div>
                          <p className="text-gray-500 dark:text-gray-400 text-xs">{t('trackingNo')}</p>
                          <p className="font-medium text-gray-900 dark:text-gray-100 text-xs truncate">
                            {order.trackingNumber}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Bottom Row - Action Buttons */}
                  <div className="flex items-center gap-2 pt-2 border-t border-gray-100 dark:border-slate-700">
                    <Link href={`/imports/orders/${order.id}`} className="flex-1">
                      <Button size="sm" variant="outline" className="w-full">
                        <Eye className="h-4 w-4 mr-1" />
                        {t('common:view', 'View')}
                      </Button>
                    </Link>
                    <Link href={`/imports/orders/${order.id}/edit`} className="flex-1">
                      <Button size="sm" variant="outline" className="w-full">
                        <Edit className="h-4 w-4 mr-1" />
                        {t('common:edit', 'Edit')}
                      </Button>
                    </Link>
                    {order.status === 'delivered' && (
                      <Link href={`/imports/orders/${order.id}/receive`} className="flex-1">
                        <Button size="sm" variant="default" className="w-full bg-green-600 hover:bg-green-700">
                          <CheckCircle className="h-4 w-4 mr-1" />
                          {t('receive')}
                        </Button>
                      </Link>
                    )}
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
              getRowKey={(order) => order.id}
              itemsPerPageOptions={[10, 20, 50, 100]}
              defaultItemsPerPage={20}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}