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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
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
  ChevronDown,
  Grip,
  Eye,
  Edit,
  Trash2,
  RefreshCw,
  Download,
  FileText
} from "lucide-react";

interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  sku?: string;
}

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
  items: OrderItem[];
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
  const [viewMode, setViewMode] = useState<"kanban" | "table" | "timeline">("kanban");
  const [draggedOrder, setDraggedOrder] = useState<ImportOrder | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [expandedItems, setExpandedItems] = useState<string[]>([]);

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
      comments: 2,
      items: [
        { id: "1", name: "USB-C Cables", quantity: 200, sku: "USB-C-001" },
        { id: "2", name: "Wireless Chargers", quantity: 150, sku: "WC-002" },
        { id: "3", name: "Phone Cases", quantity: 100, sku: "PC-003" },
        { id: "4", name: "Screen Protectors", quantity: 50, sku: "SP-004" }
      ]
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
      trackingNumber: "VN2025TRACK001",
      items: [
        { id: "5", name: "Cotton T-Shirts", quantity: 500, sku: "CT-001" },
        { id: "6", name: "Denim Jeans", quantity: 300, sku: "DJ-002" },
        { id: "7", name: "Hoodies", quantity: 200, sku: "HD-003" },
        { id: "8", name: "Baseball Caps", quantity: 150, sku: "BC-004" },
        { id: "9", name: "Socks Pack", quantity: 50, sku: "SK-005" }
      ]
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
      shippingMethod: "Sea Freight",
      items: [
        { id: "10", name: "CPU Processors", quantity: 200, sku: "CPU-001" },
        { id: "11", name: "RAM Modules 16GB", quantity: 300, sku: "RAM-002" },
        { id: "12", name: "SSD Drives 512GB", quantity: 150, sku: "SSD-003" },
        { id: "13", name: "Graphics Cards", quantity: 100, sku: "GPU-004" },
        { id: "14", name: "Motherboards", quantity: 50, sku: "MB-005" }
      ]
    },
    {
      id: "imp-004",
      orderNumber: "IMP-2025-004",
      supplier: "Ho Chi Minh Supplies",
      supplierCountry: "Vietnam",
      destination: "Vietnam Warehouse",
      status: "in_transit",
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
      trackingNumber: "VN2025CUS889",
      items: [
        { id: "15", name: "Bamboo Fabric Rolls", quantity: 100, sku: "BF-001" },
        { id: "16", name: "Organic Cotton", quantity: 150, sku: "OC-002" },
        { id: "17", name: "Recycled Polyester", quantity: 100, sku: "RP-003" }
      ]
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
      shippingMethod: "Air Freight",
      items: [
        { id: "18", name: "Smart Watches", quantity: 50, sku: "SW-001" },
        { id: "19", name: "Bluetooth Earbuds", quantity: 75, sku: "BE-002" },
        { id: "20", name: "Power Banks", quantity: 25, sku: "PB-003" }
      ]
    }
  ];

  const [columns, setColumns] = useState<KanbanColumn[]>([
    {
      id: "pending",
      title: "Pending",
      color: "bg-gray-50 dark:bg-gray-900/50",
      icon: <Clock className="h-3.5 w-3.5" />,
      orders: []
    },
    {
      id: "processing",
      title: "Processing",
      color: "bg-blue-50 dark:bg-blue-900/20",
      icon: <Activity className="h-3.5 w-3.5" />,
      orders: []
    },
    {
      id: "in_transit",
      title: "In Transit",
      color: "bg-purple-50 dark:bg-purple-900/20",
      icon: <Truck className="h-3.5 w-3.5" />,
      orders: []
    },
    {
      id: "delivered",
      title: "Delivered",
      color: "bg-green-50 dark:bg-green-900/20",
      icon: <CheckCircle className="h-3.5 w-3.5" />,
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

  const toggleItemsExpanded = (orderId: string) => {
    setExpandedItems(prev => 
      prev.includes(orderId) 
        ? prev.filter(id => id !== orderId)
        : [...prev, orderId]
    );
  };

  const OrderCard = ({ order }: { order: ImportOrder }) => {
    const isExpanded = expandedItems.includes(order.id);
    
    return (
      <Card 
        draggable
        onDragStart={(e) => handleDragStart(e, order)}
        className="cursor-move hover:shadow-sm transition-all mb-1.5 group"
      >
        <CardContent className="p-2 space-y-1.5">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 flex-1 min-w-0">
              <Badge 
                className="h-4 px-1 text-[10px] font-bold"
                style={{
                  backgroundColor: 
                    order.priority === 'high' ? '#ef4444' : 
                    order.priority === 'medium' ? '#f59e0b' : 
                    '#10b981',
                  color: 'white'
                }}
              >
                {order.priority[0].toUpperCase()}
              </Badge>
              <span className="text-xs font-semibold truncate">{order.orderNumber}</span>
            </div>
            <Link href={`/imports/orders/${order.id}`}>
              <Eye className="h-3 w-3 text-muted-foreground hover:text-foreground" />
            </Link>
          </div>

          {/* Supplier & Value */}
          <div className="flex items-center justify-between text-[11px]">
            <div className="flex items-center gap-1 truncate">
              <span>{getCountryFlag(order.supplierCountry)}</span>
              <span className="truncate">{order.supplier}</span>
            </div>
            <span className="font-semibold">{formatCurrency(order.totalValue, order.currency)}</span>
          </div>

          {/* Progress */}
          <div className="w-full h-1 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-green-500 transition-all"
              style={{ width: `${order.progress}%` }}
            />
          </div>

          {/* Items List with Toggle */}
          <div className="bg-gray-50 dark:bg-gray-900/30 rounded p-1.5">
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleItemsExpanded(order.id);
              }}
              className="flex items-center justify-between w-full text-left hover:bg-gray-100 dark:hover:bg-gray-800/50 rounded px-1 py-0.5 transition-colors"
            >
              <div className="flex items-center gap-1">
                <ChevronDown 
                  className={`h-3 w-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
                />
                <span className="text-[11px] font-medium">
                  {order.items.length} items
                </span>
              </div>
              <span className="text-[10px] text-muted-foreground">
                {order.totalItems} total
              </span>
            </button>
            
            {isExpanded && (
              <div className="mt-1 space-y-0.5 px-1">
                {order.items.map((item) => (
                  <div key={item.id} className="flex justify-between items-center text-[10px]">
                    <span className="truncate flex-1 text-muted-foreground">{item.name}</span>
                    <span className="font-medium ml-1">{item.quantity}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer Info */}
          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
            <span>{getDaysUntilArrival(order.estimatedArrival)}</span>
            {order.assignee && (
              <span>{order.assignee.split(' ').map(n => n[0]).join('')}</span>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

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
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="kanban">Kanban</TabsTrigger>
                <TabsTrigger value="table">Table</TabsTrigger>
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
          <div className="flex gap-3 pb-4">
            {columns.map((column) => {
              const filteredOrders = filterOrders(column.orders);
              return (
                <div
                  key={column.id}
                  className="flex-shrink-0 w-64"
                  onDragOver={(e) => handleDragOver(e, column.id)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, column.id)}
                >
                  <Card className={`h-full ${dragOverColumn === column.id ? 'ring-2 ring-primary' : ''} overflow-hidden`}>
                    <CardHeader className={`${column.color} py-2.5 px-3`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          {column.icon}
                          <CardTitle className="text-sm font-medium">{column.title}</CardTitle>
                        </div>
                        <Badge variant="secondary" className="text-xs h-5 px-1.5">
                          {filteredOrders.length}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="p-1.5">
                      <ScrollArea className="h-[calc(100vh-20rem)]">
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
      ) : viewMode === "table" ? (
        /* Table View */
        <Card className="mx-4 md:mx-0">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <input
                        type="checkbox"
                        className="rounded border-gray-300"
                        checked={selectedOrders.length === mockOrders.length && mockOrders.length > 0}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedOrders(mockOrders.map(o => o.id));
                          } else {
                            setSelectedOrders([]);
                          }
                        }}
                      />
                    </TableHead>
                    <TableHead>Order #</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Destination</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead>ETA</TableHead>
                    <TableHead>Assignee</TableHead>
                    <TableHead className="w-20">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockOrders
                    .filter(order => filterOrders([order]).length > 0)
                    .map((order) => (
                      <TableRow key={order.id} className="hover:bg-muted/50">
                        <TableCell>
                          <input
                            type="checkbox"
                            className="rounded border-gray-300"
                            checked={selectedOrders.includes(order.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedOrders([...selectedOrders, order.id]);
                              } else {
                                setSelectedOrders(selectedOrders.filter(id => id !== order.id));
                              }
                            }}
                          />
                        </TableCell>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <span>{order.orderNumber}</span>
                            {order.trackingNumber && (
                              <Badge variant="outline" className="text-xs">
                                {order.trackingNumber}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span>{getCountryFlag(order.supplierCountry)}</span>
                            <span>{order.supplier}</span>
                          </div>
                        </TableCell>
                        <TableCell>{order.destination}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {order.status.replace('_', ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={getPriorityColor(order.priority)} variant="secondary">
                            {order.priority}
                          </Badge>
                        </TableCell>
                        <TableCell>{order.totalItems.toLocaleString()}</TableCell>
                        <TableCell>{formatCurrency(order.totalValue, order.currency)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-primary transition-all"
                                style={{ width: `${order.progress}%` }}
                              />
                            </div>
                            <span className="text-xs text-muted-foreground">{order.progress}%</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div>{format(new Date(order.estimatedArrival), 'MMM d')}</div>
                            <div className="text-xs text-muted-foreground">
                              {getDaysUntilArrival(order.estimatedArrival)}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {order.assignee ? (
                            <div className="flex items-center gap-1">
                              <Avatar className="h-6 w-6">
                                <AvatarFallback className="text-xs">
                                  {order.assignee.split(' ').map(n => n[0]).join('')}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-sm">{order.assignee}</span>
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Link href={`/imports/orders/${order.id}`}>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </Link>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>
            {selectedOrders.length > 0 && (
              <div className="flex items-center justify-between p-4 border-t bg-muted/50">
                <span className="text-sm font-medium">
                  {selectedOrders.length} order{selectedOrders.length > 1 ? 's' : ''} selected
                </span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                  <Button variant="outline" size="sm">
                    <Edit className="h-4 w-4 mr-2" />
                    Bulk Edit
                  </Button>
                  <Button variant="outline" size="sm">
                    <Archive className="h-4 w-4 mr-2" />
                    Archive
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
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