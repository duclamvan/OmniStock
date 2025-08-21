import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCurrency } from "@/lib/currencyUtils";
import { format, differenceInDays } from "date-fns";
import { 
  Package,
  ArrowLeft,
  Search,
  Plus,
  Calendar,
  DollarSign,
  Truck,
  Clock,
  AlertCircle,
  CheckCircle,
  Globe,
  Ship,
  Plane,
  Filter,
  MoreVertical,
  User,
  MapPin,
  Hash,
  Building2,
  Archive,
  Activity,
  Timer,
  ChevronRight,
  Grip,
  Eye,
  Edit,
  Trash2,
  RefreshCw,
  Download,
  FileText
} from "lucide-react";

interface ImportOrder {
  id: string;
  orderNumber: string;
  supplier: string;
  supplierCountry: string;
  destination: string;
  status: string;
  priority: 'high' | 'medium' | 'low';
  totalItems: number;
  totalValue: number;
  currency: string;
  estimatedArrival: string;
  createdDate: string;
  lastUpdated: string;
  assignee?: string;
  tags: string[];
  progress: number;
  documents: number;
  comments: number;
  trackingNumber?: string;
  shippingMethod?: string;
}

interface KanbanColumn {
  id: string;
  title: string;
  color: string;
  icon: React.ReactNode;
  orders: ImportOrder[];
}

export default function ImportKanbanView() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterWarehouse, setFilterWarehouse] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");
  const [viewMode, setViewMode] = useState<"kanban" | "timeline">("kanban");
  const [draggedOrder, setDraggedOrder] = useState<ImportOrder | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

  // Mock data for import orders
  const mockOrders: ImportOrder[] = [
    {
      id: "imp-001",
      orderNumber: "IMP-2025-001",
      supplier: "Shenzhen Electronics Co",
      supplierCountry: "China",
      destination: "USA Warehouse",
      status: "pending",
      priority: "high",
      totalItems: 500,
      totalValue: 25000,
      currency: "USD",
      estimatedArrival: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      createdDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      lastUpdated: new Date().toISOString(),
      assignee: "John Doe",
      tags: ["Electronics", "Urgent"],
      progress: 0,
      documents: 3,
      comments: 2
    },
    {
      id: "imp-002",
      orderNumber: "IMP-2025-002",
      supplier: "Vietnam Textiles Ltd",
      supplierCountry: "Vietnam",
      destination: "USA Warehouse",
      status: "processing",
      priority: "medium",
      totalItems: 1200,
      totalValue: 18000,
      currency: "USD",
      estimatedArrival: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
      createdDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      lastUpdated: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      assignee: "Jane Smith",
      tags: ["Textiles"],
      progress: 25,
      documents: 5,
      comments: 4,
      trackingNumber: "VN2025TRACK001"
    },
    {
      id: "imp-003",
      orderNumber: "IMP-2025-003",
      supplier: "Shanghai Manufacturing",
      supplierCountry: "China",
      destination: "China Warehouse",
      status: "in_transit",
      priority: "high",
      totalItems: 800,
      totalValue: 45000,
      currency: "USD",
      estimatedArrival: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      createdDate: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
      lastUpdated: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      tags: ["Components", "Priority"],
      progress: 60,
      documents: 8,
      comments: 6,
      trackingNumber: "CN2025SHIP445",
      shippingMethod: "Sea Freight"
    },
    {
      id: "imp-004",
      orderNumber: "IMP-2025-004",
      supplier: "Ho Chi Minh Supplies",
      supplierCountry: "Vietnam",
      destination: "Vietnam Warehouse",
      status: "customs",
      priority: "medium",
      totalItems: 350,
      totalValue: 12000,
      currency: "USD",
      estimatedArrival: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
      createdDate: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
      lastUpdated: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
      assignee: "Mike Chen",
      tags: ["Materials"],
      progress: 75,
      documents: 10,
      comments: 8,
      trackingNumber: "VN2025CUS889"
    },
    {
      id: "imp-005",
      orderNumber: "IMP-2025-005",
      supplier: "Beijing Tech Solutions",
      supplierCountry: "China",
      destination: "USA Warehouse",
      status: "delivered",
      priority: "low",
      totalItems: 150,
      totalValue: 8500,
      currency: "USD",
      estimatedArrival: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      createdDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
      lastUpdated: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      assignee: "Sarah Lee",
      tags: ["Completed"],
      progress: 100,
      documents: 12,
      comments: 10,
      trackingNumber: "CN2025DEL112",
      shippingMethod: "Air Freight"
    }
  ];

  const [columns, setColumns] = useState<KanbanColumn[]>([
    {
      id: "pending",
      title: "Pending",
      color: "bg-gray-100",
      icon: <Clock className="h-4 w-4" />,
      orders: []
    },
    {
      id: "processing",
      title: "Processing",
      color: "bg-blue-100",
      icon: <Activity className="h-4 w-4" />,
      orders: []
    },
    {
      id: "in_transit",
      title: "In Transit",
      color: "bg-purple-100",
      icon: <Truck className="h-4 w-4" />,
      orders: []
    },
    {
      id: "customs",
      title: "Customs",
      color: "bg-orange-100",
      icon: <AlertCircle className="h-4 w-4" />,
      orders: []
    },
    {
      id: "delivered",
      title: "Delivered",
      color: "bg-green-100",
      icon: <CheckCircle className="h-4 w-4" />,
      orders: []
    }
  ]);

  // Initialize columns with orders
  useEffect(() => {
    const newColumns = columns.map(col => ({
      ...col,
      orders: mockOrders.filter(order => order.status === col.id)
    }));
    setColumns(newColumns);
  }, []);

  // Filter orders based on search and filters
  const filterOrders = (orders: ImportOrder[]) => {
    return orders.filter(order => {
      const matchesSearch = searchQuery === "" || 
        order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.supplier.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesWarehouse = filterWarehouse === "all" || 
        order.destination.toLowerCase().includes(filterWarehouse.toLowerCase());
      
      const matchesPriority = filterPriority === "all" || 
        order.priority === filterPriority;
      
      return matchesSearch && matchesWarehouse && matchesPriority;
    });
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, order: ImportOrder) => {
    setDraggedOrder(order);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverColumn(columnId);
  };

  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  const handleDrop = (e: React.DragEvent, targetColumnId: string) => {
    e.preventDefault();
    setDragOverColumn(null);
    
    if (!draggedOrder) return;
    
    // Update the order status
    const updatedOrder = { ...draggedOrder, status: targetColumnId };
    
    // Update columns
    const newColumns = columns.map(col => {
      if (col.id === draggedOrder.status) {
        // Remove from old column
        return {
          ...col,
          orders: col.orders.filter(o => o.id !== draggedOrder.id)
        };
      }
      if (col.id === targetColumnId) {
        // Add to new column
        return {
          ...col,
          orders: [...col.orders, updatedOrder]
        };
      }
      return col;
    });
    
    setColumns(newColumns);
    setDraggedOrder(null);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getCountryFlag = (country: string) => {
    switch (country) {
      case 'China': return '🇨🇳';
      case 'Vietnam': return '🇻🇳';
      case 'USA': return '🇺🇸';
      default: return '🌍';
    }
  };

  const getDaysUntilArrival = (arrivalDate: string) => {
    const days = differenceInDays(new Date(arrivalDate), new Date());
    if (days < 0) return `${Math.abs(days)} days ago`;
    if (days === 0) return 'Today';
    if (days === 1) return 'Tomorrow';
    return `${days} days`;
  };

  const OrderCard = ({ order }: { order: ImportOrder }) => (
    <Card 
      draggable
      onDragStart={(e) => handleDragStart(e, order)}
      className="cursor-move hover:shadow-md transition-shadow mb-3"
    >
      <CardContent className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{order.orderNumber}</span>
            <Badge className={getPriorityColor(order.priority)} variant="secondary">
              {order.priority}
            </Badge>
          </div>
          <Button variant="ghost" size="icon" className="h-6 w-6">
            <MoreVertical className="h-3 w-3" />
          </Button>
        </div>

        {/* Supplier Info */}
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm">
            <span>{getCountryFlag(order.supplierCountry)}</span>
            <span className="font-medium truncate">{order.supplier}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3" />
            <span>{order.destination}</span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium">{order.progress}%</span>
          </div>
          <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary transition-all"
              style={{ width: `${order.progress}%` }}
            />
          </div>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center gap-1">
            <Package className="h-3 w-3 text-muted-foreground" />
            <span>{order.totalItems.toLocaleString()} items</span>
          </div>
          <div className="flex items-center gap-1">
            <DollarSign className="h-3 w-3 text-muted-foreground" />
            <span>{formatCurrency(order.totalValue, order.currency)}</span>
          </div>
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3 text-muted-foreground" />
            <span>{getDaysUntilArrival(order.estimatedArrival)}</span>
          </div>
          <div className="flex items-center gap-1">
            <FileText className="h-3 w-3 text-muted-foreground" />
            <span>{order.documents} docs</span>
          </div>
        </div>

        {/* Tags */}
        {order.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {order.tags.map((tag, index) => (
              <Badge key={index} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t">
          {order.assignee ? (
            <div className="flex items-center gap-1">
              <Avatar className="h-5 w-5">
                <AvatarFallback className="text-xs">
                  {order.assignee.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              <span className="text-xs text-muted-foreground">{order.assignee}</span>
            </div>
          ) : (
            <span className="text-xs text-muted-foreground">Unassigned</span>
          )}
          <div className="flex items-center gap-2">
            <Link href={`/imports/orders/${order.id}`}>
              <Button variant="ghost" size="icon" className="h-6 w-6">
                <Eye className="h-3 w-3" />
              </Button>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-4 md:space-y-6 pb-20 md:pb-6">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b md:relative md:border-0">
        <div className="flex flex-col md:flex-row md:items-center justify-between p-4 md:p-0 gap-4">
          <div className="flex items-center gap-2 md:gap-4">
            <Link href="/imports">
              <Button variant="ghost" size="icon" className="md:hidden">
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="sm" className="hidden md:flex">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Imports
              </Button>
            </Link>
            <div>
              <h1 className="text-lg md:text-2xl font-semibold">Import Orders Kanban</h1>
              <p className="text-xs md:text-sm text-muted-foreground">
                Drag and drop to update order status
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as any)}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="kanban">Kanban</TabsTrigger>
                <TabsTrigger value="timeline">Timeline</TabsTrigger>
              </TabsList>
            </Tabs>
            <Button variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 md:mr-2" />
              <span className="hidden md:inline">Refresh</span>
            </Button>
            <Link href="/imports/orders/new">
              <Button size="sm">
                <Plus className="h-4 w-4 md:mr-2" />
                <span className="hidden md:inline">New Order</span>
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Filters */}
      <Card className="mx-4 md:mx-0">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search orders..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filterWarehouse} onValueChange={setFilterWarehouse}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="All Warehouses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Warehouses</SelectItem>
                <SelectItem value="usa">USA Warehouse</SelectItem>
                <SelectItem value="china">China Warehouse</SelectItem>
                <SelectItem value="vietnam">Vietnam Warehouse</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterPriority} onValueChange={setFilterPriority}>
              <SelectTrigger className="w-full md:w-36">
                <SelectValue placeholder="All Priorities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {viewMode === "kanban" ? (
        /* Kanban View */
        <ScrollArea className="w-full px-4 md:px-0">
          <div className="flex gap-4 pb-4">
            {columns.map((column) => {
              const filteredOrders = filterOrders(column.orders);
              return (
                <div
                  key={column.id}
                  className="flex-shrink-0 w-80"
                  onDragOver={(e) => handleDragOver(e, column.id)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, column.id)}
                >
                  <Card className={`h-full ${dragOverColumn === column.id ? 'ring-2 ring-primary' : ''}`}>
                    <CardHeader className={`${column.color} border-b`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {column.icon}
                          <CardTitle className="text-base">{column.title}</CardTitle>
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          {filteredOrders.length}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="p-3">
                      <ScrollArea className="h-[calc(100vh-24rem)]">
                        {filteredOrders.length === 0 ? (
                          <div className="flex flex-col items-center justify-center py-8 text-center">
                            <Package className="h-8 w-8 text-muted-foreground mb-2" />
                            <p className="text-sm text-muted-foreground">No orders</p>
                          </div>
                        ) : (
                          filteredOrders.map((order) => (
                            <OrderCard key={order.id} order={order} />
                          ))
                        )}
                      </ScrollArea>
                    </CardContent>
                  </Card>
                </div>
              );
            })}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      ) : (
        /* Timeline View */
        <Card className="mx-4 md:mx-0">
          <CardHeader>
            <CardTitle>Timeline View</CardTitle>
            <CardDescription>Visual timeline of import orders</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {mockOrders
                .filter(order => filterOrders([order]).length > 0)
                .sort((a, b) => new Date(a.estimatedArrival).getTime() - new Date(b.estimatedArrival).getTime())
                .map((order, index) => (
                  <div key={order.id} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className={`w-3 h-3 rounded-full ${
                        order.status === 'delivered' ? 'bg-green-500' :
                        order.status === 'in_transit' ? 'bg-blue-500' :
                        'bg-gray-400'
                      }`} />
                      {index < mockOrders.length - 1 && (
                        <div className="w-0.5 h-20 bg-gray-300" />
                      )}
                    </div>
                    <div className="flex-1 pb-8">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium">{order.orderNumber}</span>
                            <Badge className={getPriorityColor(order.priority)} variant="secondary">
                              {order.priority}
                            </Badge>
                            <Badge variant="outline">{order.status.replace('_', ' ')}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {order.supplier} • {order.totalItems} items • {formatCurrency(order.totalValue, order.currency)}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            ETA: {format(new Date(order.estimatedArrival), 'MMM d, yyyy')} ({getDaysUntilArrival(order.estimatedArrival)})
                          </p>
                        </div>
                        <Link href={`/imports/orders/${order.id}`}>
                          <Button variant="outline" size="sm">
                            View Details
                            <ChevronRight className="h-4 w-4 ml-1" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}