import React, { useState, useEffect } from "react";
import { Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { 
  Package, Search, Plus, Calendar, DollarSign, Truck, Clock,
  AlertCircle, CheckCircle, Globe, Ship, Plane, Filter,
  MoreVertical, MapPin, Hash, Building2, Activity, Timer,
  ChevronRight, ChevronDown, Grip, Eye, Edit, Trash2,
  RefreshCw, Download, FileText, LayoutGrid, X, Zap,
  BoxSelect, Copy, ArrowRight, TrendingUp, Users,
  ShoppingCart, Warehouse, Target
} from "lucide-react";
import { format, differenceInDays } from "date-fns";

// Comprehensive type definitions
interface PurchaseItem {
  id: number;
  purchaseId: number;
  name: string;
  sku: string | null;
  quantity: number;
  unitPrice: string | null;
  weight: string | null;
  dimensions: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Purchase {
  id: number;
  supplier: string;
  trackingNumber: string | null;
  estimatedArrival: string | null;
  notes: string | null;
  shippingCost: string;
  totalCost: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  items: PurchaseItem[];
}

interface CustomItem {
  id: number;
  name: string;
  source: string;
  orderNumber: string | null;
  quantity: number;
  unitPrice: string;
  weight: string;
  dimensions: string | null;
  trackingNumber: string | null;
  notes: string | null;
  customerName: string | null;
  customerEmail: string | null;
  status: string;
  createdAt: string;
}

interface Consolidation {
  id: number;
  name: string;
  shippingMethod: string;
  warehouse: string;
  notes: string | null;
  targetWeight: string | null;
  maxItems: number | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  items: any[];
}

interface Shipment {
  id: number;
  consolidationId: number | null;
  carrier: string;
  trackingNumber: string;
  origin: string;
  destination: string;
  status: string;
  shippingCost: string;
  insuranceValue: string;
  estimatedDelivery: string | null;
  deliveredAt: string | null;
  currentLocation: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

interface KanbanColumn {
  id: string;
  title: string;
  color: string;
  icon: React.ReactNode;
  count: number;
  value?: number;
}

const shippingMethodColors: Record<string, string> = {
  'air_express': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 border-red-300',
  'air_standard': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200 border-orange-300',
  'sea_express': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 border-blue-300',
  'sea_standard': 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200 border-cyan-300',
  'ground': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 border-green-300'
};

const shippingMethodIcons: Record<string, any> = {
  'air_express': Zap,
  'air_standard': Plane,
  'sea_express': Ship,
  'sea_standard': Ship,
  'ground': Truck
};

export default function ImportKanbanDashboard() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterWarehouse, setFilterWarehouse] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [draggedItem, setDraggedItem] = useState<any>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all data
  const { data: purchases = [], isLoading: purchasesLoading } = useQuery({
    queryKey: ['/api/imports/purchases'],
    queryFn: async () => {
      const response = await apiRequest('/api/imports/purchases');
      return response.json() as Promise<Purchase[]>;
    }
  });

  const { data: customItems = [], isLoading: customItemsLoading } = useQuery({
    queryKey: ['/api/imports/custom-items'],
    queryFn: async () => {
      const response = await apiRequest('/api/imports/custom-items');
      return response.json() as Promise<CustomItem[]>;
    }
  });

  const { data: consolidations = [], isLoading: consolidationsLoading } = useQuery({
    queryKey: ['/api/imports/consolidations'],
    queryFn: async () => {
      const response = await apiRequest('/api/imports/consolidations');
      return response.json() as Promise<Consolidation[]>;
    }
  });

  const { data: shipments = [], isLoading: shipmentsLoading } = useQuery({
    queryKey: ['/api/imports/shipments'],
    queryFn: async () => {
      const response = await apiRequest('/api/imports/shipments');
      return response.json() as Promise<Shipment[]>;
    }
  });

  // Update purchase status mutation
  const updatePurchaseStatusMutation = useMutation({
    mutationFn: async ({ purchaseId, status }: { purchaseId: number; status: string }) => {
      const response = await apiRequest(`/api/imports/purchases/${purchaseId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
        headers: { 'Content-Type': 'application/json' }
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/imports/purchases'] });
      toast({ title: "Success", description: "Purchase status updated" });
    }
  });

  // Define columns with dynamic data
  const columns: KanbanColumn[] = [
    {
      id: 'processing',
      title: 'Supplier Processing',
      color: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200',
      icon: <Package className="h-5 w-5 text-yellow-600" />,
      count: purchases.filter(p => p.status === 'pending' || p.status === 'processing').length,
      value: purchases
        .filter(p => p.status === 'pending' || p.status === 'processing')
        .reduce((sum, p) => sum + parseFloat(p.totalCost), 0)
    },
    {
      id: 'at_warehouse',
      title: 'At Warehouse',
      color: 'bg-purple-50 dark:bg-purple-900/20 border-purple-200',
      icon: <Warehouse className="h-5 w-5 text-purple-600" />,
      count: consolidations.filter(c => c.status === 'preparing').length + customItems.filter(i => i.status === 'available').length,
      value: consolidations
        .filter(c => c.status === 'preparing')
        .reduce((sum, c) => sum + c.items.length * 100, 0) // Estimated value
    },
    {
      id: 'international',
      title: 'International Transit',
      color: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200',
      icon: <Globe className="h-5 w-5 text-blue-600" />,
      count: shipments.filter(s => s.status !== 'delivered').length,
      value: shipments
        .filter(s => s.status !== 'delivered')
        .reduce((sum, s) => sum + parseFloat(s.shippingCost) + parseFloat(s.insuranceValue), 0)
    },
    {
      id: 'delivered',
      title: 'Delivered',
      color: 'bg-green-50 dark:bg-green-900/20 border-green-200',
      icon: <CheckCircle className="h-5 w-5 text-green-600" />,
      count: shipments.filter(s => s.status === 'delivered').length,
      value: shipments
        .filter(s => s.status === 'delivered')
        .reduce((sum, s) => sum + parseFloat(s.shippingCost) + parseFloat(s.insuranceValue), 0)
    }
  ];

  // Handle drag and drop
  const handleDragStart = (e: React.DragEvent, item: any, type: string) => {
    setDraggedItem({ ...item, type });
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverColumn(columnId);
  };

  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  const handleDrop = (e: React.DragEvent, targetColumn: string) => {
    e.preventDefault();
    setDragOverColumn(null);
    
    if (!draggedItem) return;
    
    // Handle status updates based on target column
    if (draggedItem.type === 'purchase' && targetColumn === 'at_warehouse') {
      updatePurchaseStatusMutation.mutate({
        purchaseId: draggedItem.id,
        status: 'at_warehouse'
      });
    }
    
    setDraggedItem(null);
  };

  const formatCurrency = (value: number | string) => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(num);
  };

  const getDaysUntil = (date: string | null) => {
    if (!date) return 'No ETA';
    const days = differenceInDays(new Date(date), new Date());
    if (days < 0) return `${Math.abs(days)} days overdue`;
    if (days === 0) return 'Today';
    if (days === 1) return 'Tomorrow';
    return `${days} days`;
  };

  const isLoading = purchasesLoading || customItemsLoading || consolidationsLoading || shipmentsLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Import Kanban Dashboard</h1>
          <p className="text-muted-foreground">Drag and drop to manage import workflow</p>
        </div>
        <div className="flex gap-2">
          <Link href="/imports/supplier-processing">
            <Button variant="outline" data-testid="button-supplier-processing">
              <Plus className="h-4 w-4 mr-2" />
              New Purchase
            </Button>
          </Link>
          <Link href="/imports/at-warehouse">
            <Button variant="outline" data-testid="button-at-warehouse">
              <Package className="h-4 w-4 mr-2" />
              Custom Item
            </Button>
          </Link>
          <Link href="/imports/international-transit">
            <Button data-testid="button-create-shipment">
              <Plane className="h-4 w-4 mr-2" />
              New Shipment
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {columns.map((column) => (
          <Card key={column.id} className={`${column.color} border-2`}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">{column.title}</CardTitle>
                {column.icon}
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid={`stat-${column.id}`}>
                {column.count}
              </div>
              {column.value !== undefined && (
                <p className="text-xs text-muted-foreground mt-1">
                  {formatCurrency(column.value)}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by order, supplier, tracking..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="input-search"
              />
            </div>
            <Select value={filterWarehouse} onValueChange={setFilterWarehouse}>
              <SelectTrigger className="w-[180px]" data-testid="select-warehouse">
                <SelectValue placeholder="All Warehouses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Warehouses</SelectItem>
                <SelectItem value="usa">USA Warehouse</SelectItem>
                <SelectItem value="china">China Warehouse</SelectItem>
                <SelectItem value="vietnam">Vietnam Warehouse</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[180px]" data-testid="select-status">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="shipped">Shipped</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" data-testid="button-refresh">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {columns.map((column) => (
          <div
            key={column.id}
            className={`rounded-lg border-2 ${column.color} p-4 min-h-[600px] ${
              dragOverColumn === column.id ? 'ring-2 ring-primary ring-offset-2' : ''
            }`}
            onDragOver={(e) => handleDragOver(e, column.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, column.id)}
            data-testid={`column-${column.id}`}
          >
            {/* Column Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                {column.icon}
                <h3 className="font-semibold">{column.title}</h3>
              </div>
              <Badge variant="secondary" className="font-bold">
                {column.count}
              </Badge>
            </div>

            <Separator className="mb-4" />

            {/* Column Content */}
            <ScrollArea className="h-[500px]">
              <div className="space-y-3">
                {/* Processing Column - Show Purchases */}
                {column.id === 'processing' && (
                  <>
                    {purchases
                      .filter(p => p.status === 'pending' || p.status === 'processing')
                      .filter(p => searchQuery === '' || 
                        p.supplier.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        (p.trackingNumber && p.trackingNumber.toLowerCase().includes(searchQuery.toLowerCase()))
                      )
                      .map((purchase) => (
                        <Card
                          key={purchase.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, purchase, 'purchase')}
                          className="cursor-move hover:shadow-md transition-all"
                          data-testid={`purchase-${purchase.id}`}
                        >
                          <CardContent className="p-3">
                            <div className="flex items-center justify-between mb-2">
                              <Badge variant="outline" className="text-xs">
                                {purchase.status}
                              </Badge>
                              <span className="text-sm font-semibold">
                                {formatCurrency(purchase.totalCost)}
                              </span>
                            </div>
                            <h4 className="font-medium text-sm mb-1">{purchase.supplier}</h4>
                            {purchase.trackingNumber && (
                              <p className="text-xs text-muted-foreground mb-1">
                                <Truck className="h-3 w-3 inline mr-1" />
                                {purchase.trackingNumber}
                              </p>
                            )}
                            <div className="flex items-center justify-between mt-2">
                              <span className="text-xs text-muted-foreground">
                                {purchase.items.length} items
                              </span>
                              {purchase.estimatedArrival && (
                                <span className="text-xs font-medium">
                                  {getDaysUntil(purchase.estimatedArrival)}
                                </span>
                              )}
                            </div>
                            <Progress 
                              value={purchase.status === 'processing' ? 50 : 25} 
                              className="h-1 mt-2"
                            />
                          </CardContent>
                        </Card>
                      ))}
                  </>
                )}

                {/* At Warehouse Column - Show Consolidations and Custom Items */}
                {column.id === 'at_warehouse' && (
                  <>
                    {/* Custom Items */}
                    {customItems
                      .filter(item => item.status === 'available')
                      .filter(item => searchQuery === '' || 
                        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        (item.orderNumber && item.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()))
                      )
                      .map((item) => (
                        <Card
                          key={`custom-${item.id}`}
                          draggable
                          onDragStart={(e) => handleDragStart(e, item, 'custom')}
                          className="cursor-move hover:shadow-md transition-all border-dashed"
                          data-testid={`custom-${item.id}`}
                        >
                          <CardContent className="p-3">
                            <div className="flex items-center justify-between mb-2">
                              <Badge className="text-xs bg-indigo-100 text-indigo-800">
                                {item.source}
                              </Badge>
                              <span className="text-sm font-semibold">
                                {formatCurrency(parseFloat(item.unitPrice) * item.quantity)}
                              </span>
                            </div>
                            <h4 className="font-medium text-sm mb-1">{item.name}</h4>
                            <p className="text-xs text-muted-foreground">
                              Qty: {item.quantity} • {item.weight}kg
                            </p>
                            {item.customerName && (
                              <p className="text-xs mt-1">
                                <Users className="h-3 w-3 inline mr-1" />
                                {item.customerName}
                              </p>
                            )}
                          </CardContent>
                        </Card>
                      ))}

                    {/* Consolidations */}
                    {consolidations
                      .filter(c => c.status === 'preparing')
                      .map((consolidation) => {
                        const Icon = shippingMethodIcons[consolidation.shippingMethod] || Package;
                        const colorClass = shippingMethodColors[consolidation.shippingMethod] || 'bg-gray-100';
                        
                        return (
                          <Card
                            key={`consol-${consolidation.id}`}
                            draggable
                            onDragStart={(e) => handleDragStart(e, consolidation, 'consolidation')}
                            className={`cursor-move hover:shadow-md transition-all border-2 ${colorClass}`}
                            data-testid={`consolidation-${consolidation.id}`}
                          >
                            <CardContent className="p-3">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <Icon className="h-4 w-4" />
                                  <Badge variant="outline" className="text-xs font-bold">
                                    {consolidation.name}
                                  </Badge>
                                </div>
                                <Badge className="text-xs">
                                  {consolidation.items.length} items
                                </Badge>
                              </div>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Building2 className="h-3 w-3" />
                                <span>{consolidation.warehouse}</span>
                              </div>
                              <div className="flex items-center gap-2 text-xs mt-1">
                                <Target className="h-3 w-3" />
                                <span>{consolidation.shippingMethod.replace('_', ' ')}</span>
                              </div>
                              {consolidation.targetWeight && (
                                <Progress 
                                  value={Math.min((consolidation.items.length * 2) / parseFloat(consolidation.targetWeight) * 100, 100)} 
                                  className="h-1 mt-2"
                                />
                              )}
                            </CardContent>
                          </Card>
                        );
                      })}
                  </>
                )}

                {/* International Transit Column - Show Shipments */}
                {column.id === 'international' && (
                  <>
                    {shipments
                      .filter(s => s.status !== 'delivered')
                      .filter(s => searchQuery === '' || 
                        s.trackingNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        s.carrier.toLowerCase().includes(searchQuery.toLowerCase())
                      )
                      .map((shipment) => (
                        <Card
                          key={shipment.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, shipment, 'shipment')}
                          className="cursor-move hover:shadow-md transition-all"
                          data-testid={`shipment-${shipment.id}`}
                        >
                          <CardContent className="p-3">
                            <div className="flex items-center justify-between mb-2">
                              <Badge variant="outline" className="text-xs">
                                {shipment.status}
                              </Badge>
                              <span className="text-xs font-semibold">
                                {shipment.carrier}
                              </span>
                            </div>
                            <h4 className="font-medium text-sm mb-1">
                              {shipment.trackingNumber}
                            </h4>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                              <MapPin className="h-3 w-3" />
                              <span>{shipment.origin}</span>
                              <ArrowRight className="h-3 w-3" />
                              <span>{shipment.destination}</span>
                            </div>
                            {shipment.currentLocation && (
                              <p className="text-xs">
                                <Globe className="h-3 w-3 inline mr-1" />
                                {shipment.currentLocation}
                              </p>
                            )}
                            {shipment.estimatedDelivery && (
                              <div className="mt-2">
                                <span className="text-xs font-medium">
                                  ETA: {getDaysUntil(shipment.estimatedDelivery)}
                                </span>
                                <Progress 
                                  value={shipment.status === 'in_transit' ? 60 : 30} 
                                  className="h-1 mt-1"
                                />
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                  </>
                )}

                {/* Delivered Column - Show Delivered Shipments */}
                {column.id === 'delivered' && (
                  <>
                    {shipments
                      .filter(s => s.status === 'delivered')
                      .filter(s => searchQuery === '' || 
                        s.trackingNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        s.carrier.toLowerCase().includes(searchQuery.toLowerCase())
                      )
                      .map((shipment) => (
                        <Card
                          key={shipment.id}
                          className="opacity-75"
                          data-testid={`delivered-${shipment.id}`}
                        >
                          <CardContent className="p-3">
                            <div className="flex items-center justify-between mb-2">
                              <Badge className="text-xs bg-green-100 text-green-800">
                                Delivered
                              </Badge>
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            </div>
                            <h4 className="font-medium text-sm mb-1">
                              {shipment.trackingNumber}
                            </h4>
                            <p className="text-xs text-muted-foreground">
                              {shipment.carrier}
                            </p>
                            {shipment.deliveredAt && (
                              <p className="text-xs mt-2">
                                <Calendar className="h-3 w-3 inline mr-1" />
                                {format(new Date(shipment.deliveredAt), 'MMM dd, yyyy')}
                              </p>
                            )}
                            <div className="flex items-center justify-between mt-2">
                              <span className="text-xs text-muted-foreground">
                                {formatCurrency(parseFloat(shipment.shippingCost))}
                              </span>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2 text-xs"
                                data-testid={`button-view-${shipment.id}`}
                              >
                                <Eye className="h-3 w-3 mr-1" />
                                View
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                  </>
                )}
              </div>
            </ScrollArea>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link href="/imports/supplier-processing">
              <Button variant="outline" className="w-full" data-testid="button-quick-supplier">
                <Package className="h-4 w-4 mr-2" />
                Supplier Processing
              </Button>
            </Link>
            <Link href="/imports/at-warehouse">
              <Button variant="outline" className="w-full" data-testid="button-quick-warehouse">
                <Warehouse className="h-4 w-4 mr-2" />
                At Warehouse
              </Button>
            </Link>
            <Link href="/imports/international-transit">
              <Button variant="outline" className="w-full" data-testid="button-quick-transit">
                <Globe className="h-4 w-4 mr-2" />
                International Transit
              </Button>
            </Link>
            <Button variant="outline" className="w-full" data-testid="button-export">
              <Download className="h-4 w-4 mr-2" />
              Export Data
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}