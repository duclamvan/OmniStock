import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
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
  ChevronUp,
  ChevronsUpDown,
  Grip,
  Eye,
  Edit,
  Trash2,
  RefreshCw,
  Download,
  FileText,
  LayoutGrid,
  TableIcon,
  Columns
} from "lucide-react";

interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  sku?: string;
  orderId: string;
  orderNumber: string;
  supplier: string;
  supplierCountry: string;
  status: string;
  consolidationId?: string;
  warehouseLocation?: string;
  localTrackingNumber?: string;
  internationalTrackingNumber?: string;
  estimatedArrival?: string;
  value?: number;
  currency?: string;
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
  localTrackingNumber?: string; // Tracking from supplier to warehouse
  internationalTrackingNumber?: string; // Tracking from warehouse to final destination
  shippingMethod?: string;
  items: OrderItem[];
  consolidationId?: string; // ID to group orders for consolidation
  warehouseLocation?: string; // Which consolidation warehouse
  consolidatedWith?: string[]; // Other order IDs consolidated together
  stage?: 'supplier_processing' | 'to_warehouse' | 'at_warehouse' | 'consolidating' | 'international_transit' | 'customs' | 'final_delivery';
}

interface KanbanColumn {
  id: string;
  title: string;
  color: string;
  icon: React.ReactNode;
  items: OrderItem[];
  isConsolidationArea?: boolean;
}

export default function ImportKanbanView() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterWarehouse, setFilterWarehouse] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");
  const [viewMode, setViewMode] = useState<"kanban" | "table" | "timeline">("kanban");
  const [draggedItem, setDraggedItem] = useState<OrderItem | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  const [dragOverItem, setDragOverItem] = useState<string | null>(null);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);
  const [, navigate] = useLocation();
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Mock data for import orders
  const mockOrders: ImportOrder[] = [
    {
      id: "imp-001",
      orderNumber: "IMP-2025-001",
      supplier: "Shenzhen Electronics Co",
      supplierCountry: "China",
      destination: "USA Warehouse",
      status: "processing",
      stage: "supplier_processing",
      priority: "high",
      totalItems: 500,
      totalValue: 25000,
      currency: "USD",
      estimatedArrival: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      createdDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      lastUpdated: new Date().toISOString(),
      assignee: "John Doe",
      tags: ["Electronics", "Urgent"],
      progress: 15,
      documents: 3,
      comments: 2,
      warehouseLocation: "Shenzhen Consolidation Center",
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
      supplier: "Guangzhou Fashion Co",
      supplierCountry: "China",
      destination: "USA Warehouse",
      status: "to_warehouse",
      stage: "to_warehouse",
      priority: "medium",
      totalItems: 1200,
      totalValue: 18000,
      currency: "USD",
      estimatedArrival: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
      createdDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      lastUpdated: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      assignee: "Jane Smith",
      tags: ["Textiles"],
      progress: 30,
      documents: 5,
      comments: 4,
      localTrackingNumber: "SF2025LOCAL001",
      warehouseLocation: "Guangzhou Consolidation Hub",
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
      destination: "USA Warehouse",
      status: "at_warehouse",
      stage: "at_warehouse",
      priority: "high",
      totalItems: 800,
      totalValue: 45000,
      currency: "USD",
      estimatedArrival: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      createdDate: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
      lastUpdated: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      tags: ["Components", "Priority", "Ready to Consolidate"],
      progress: 45,
      documents: 8,
      comments: 6,
      localTrackingNumber: "YTO2025LOCAL445",
      warehouseLocation: "Shanghai Consolidation Center",
      consolidationId: "CONSOL-2025-001",
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
      supplier: "Beijing Tech Ltd",
      supplierCountry: "China",
      destination: "USA Warehouse",
      status: "consolidating",
      stage: "consolidating",
      priority: "medium",
      totalItems: 350,
      totalValue: 12000,
      currency: "USD",
      estimatedArrival: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
      createdDate: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
      lastUpdated: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
      assignee: "Mike Chen",
      tags: ["Materials", "Being Packed"],
      progress: 60,
      documents: 10,
      comments: 8,
      localTrackingNumber: "ZTO2025LOCAL889",
      warehouseLocation: "Beijing Consolidation Hub",
      consolidationId: "CONSOL-2025-001",
      consolidatedWith: ["imp-003", "imp-006"],
      items: [
        { id: "15", name: "Laptop Batteries", quantity: 100, sku: "BAT-001" },
        { id: "16", name: "Keyboard Switches", quantity: 150, sku: "KS-002" },
        { id: "17", name: "LED Panels", quantity: 100, sku: "LED-003" }
      ]
    },
    {
      id: "imp-005",
      orderNumber: "IMP-2025-005",
      supplier: "Dongguan Electronics",
      supplierCountry: "China",
      destination: "USA Warehouse",
      status: "international",
      stage: "international_transit",
      priority: "low",
      totalItems: 150,
      totalValue: 8500,
      currency: "USD",
      estimatedArrival: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
      createdDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
      lastUpdated: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      assignee: "Sarah Lee",
      tags: ["In Transit", "Express"],
      progress: 75,
      documents: 12,
      comments: 10,
      internationalTrackingNumber: "DHL2025INT112",
      trackingNumber: "DHL2025INT112",
      shippingMethod: "DHL Express",
      consolidationId: "CONSOL-2025-002",
      items: [
        { id: "18", name: "Smart Watches", quantity: 50, sku: "SW-001" },
        { id: "19", name: "Bluetooth Earbuds", quantity: 75, sku: "BE-002" },
        { id: "20", name: "Power Banks", quantity: 25, sku: "PB-003" }
      ]
    },
    {
      id: "imp-006",
      orderNumber: "IMP-2025-006",
      supplier: "Hangzhou Fashion",
      supplierCountry: "China",
      destination: "USA Warehouse",
      status: "delivered",
      stage: "final_delivery",
      priority: "high",
      totalItems: 450,
      totalValue: 22000,
      currency: "USD",
      estimatedArrival: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      createdDate: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
      lastUpdated: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      assignee: "John Doe",
      tags: ["Completed", "Received"],
      progress: 100,
      documents: 15,
      comments: 12,
      localTrackingNumber: "YTO2025LOCAL999",
      internationalTrackingNumber: "FEDEX2025INT888",
      trackingNumber: "FEDEX2025INT888",
      shippingMethod: "FedEx Priority",
      consolidationId: "CONSOL-2025-003",
      warehouseLocation: "Hangzhou Consolidation Center",
      items: [
        { id: "21", name: "Winter Jackets", quantity: 200, sku: "WJ-001" },
        { id: "22", name: "Scarves", quantity: 150, sku: "SC-002" },
        { id: "23", name: "Gloves", quantity: 100, sku: "GL-003" }
      ]
    }
  ];

  const [columns, setColumns] = useState<KanbanColumn[]>([
    {
      id: "processing",
      title: "Supplier Processing",
      color: "bg-yellow-50 dark:bg-yellow-900/20",
      icon: <Activity className="h-3.5 w-3.5" />,
      items: []
    },
    {
      id: "at_warehouse",
      title: "At Warehouse",
      color: "bg-indigo-50 dark:bg-indigo-900/20",
      icon: <Building2 className="h-3.5 w-3.5" />,
      items: []
    },
    {
      id: "international",
      title: "International Transit",
      color: "bg-orange-50 dark:bg-orange-900/20",
      icon: <Plane className="h-3.5 w-3.5" />,
      items: []
    },
    {
      id: "delivered",
      title: "Delivered",
      color: "bg-green-50 dark:bg-green-900/20",
      icon: <CheckCircle className="h-3.5 w-3.5" />,
      items: []
    }
  ]);
  
  const [consolidationGroups, setConsolidationGroups] = useState<{ [key: string]: OrderItem[] }>({});

  // Transform orders to items and initialize columns
  const getAllItems = (): OrderItem[] => {
    const allItems: OrderItem[] = [];
    mockOrders.forEach(order => {
      order.items.forEach((item, index) => {
        allItems.push({
          ...item,
          id: `${order.id}-${item.id}-${index}`, // Ensure unique ID
          orderId: order.id,
          orderNumber: order.orderNumber,
          supplier: order.supplier,
          supplierCountry: order.supplierCountry,
          status: order.status,
          consolidationId: order.consolidationId,
          warehouseLocation: order.warehouseLocation,
          localTrackingNumber: order.localTrackingNumber,
          internationalTrackingNumber: order.internationalTrackingNumber,
          estimatedArrival: order.estimatedArrival,
          value: (order.totalValue / order.totalItems) * item.quantity,
          currency: order.currency
        });
      });
    });
    return allItems;
  };

  // Initialize columns with items
  useEffect(() => {
    const items = getAllItems();
    const newColumns = columns.map(col => ({
      ...col,
      items: items.filter(item => {
        // Map order status to column id
        if (col.id === 'processing' && ['processing', 'to_warehouse'].includes(item.status)) return true;
        if (col.id === 'at_warehouse' && ['at_warehouse', 'consolidating'].includes(item.status)) return true;
        if (col.id === 'international' && ['international'].includes(item.status)) return true;
        if (col.id === 'delivered' && ['delivered'].includes(item.status)) return true;
        return false;
      })
    }));
    setColumns(newColumns);
    
    // Initialize consolidation groups
    const groups: { [key: string]: OrderItem[] } = {};
    items.forEach(item => {
      if (item.consolidationId) {
        if (!groups[item.consolidationId]) {
          groups[item.consolidationId] = [];
        }
        groups[item.consolidationId].push(item);
      }
    });
    setConsolidationGroups(groups);
  }, []);

  // Filter items based on search and filters
  const filterItems = (items: OrderItem[]) => {
    if (!items) return [];
    return items.filter(item => {
      const matchesSearch = searchQuery === "" || 
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.supplier.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.sku && item.sku.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesWarehouse = filterWarehouse === "all" || 
        (item.warehouseLocation && item.warehouseLocation.toLowerCase().includes(filterWarehouse.toLowerCase()));
      
      return matchesSearch && matchesWarehouse;
    });
  };

  // Enhanced Drag and Drop Handlers
  const handleDragStart = (e: React.DragEvent, item: OrderItem) => {
    setDraggedItem(item);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", item.id); // For better browser support
  };

  const handleDragOver = (e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverColumn(columnId);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // Only clear if leaving the column entirely
    if (e.currentTarget === e.target) {
      setDragOverColumn(null);
    }
  };

  const handleDrop = (e: React.DragEvent, targetColumnId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverColumn(null);
    
    if (!draggedItem) return;
    
    // Map column IDs to proper status values
    const statusMap: { [key: string]: string } = {
      'processing': 'processing',
      'at_warehouse': 'at_warehouse',
      'international': 'international',
      'delivered': 'delivered'
    };
    
    // Update the item status
    const updatedItem = { ...draggedItem, status: statusMap[targetColumnId] || targetColumnId };
    
    // Update columns
    const newColumns = columns.map(col => {
      // Find source column
      const sourceCol = columns.find(c => 
        c.items.some(i => i.id === draggedItem.id)
      );
      
      if (col.id === sourceCol?.id) {
        // Remove from old column
        return {
          ...col,
          items: col.items.filter(i => i.id !== draggedItem.id)
        };
      }
      if (col.id === targetColumnId) {
        // Add to new column
        return {
          ...col,
          items: [...col.items, updatedItem]
        };
      }
      return col;
    });
    
    setColumns(newColumns);
    setDraggedItem(null);
  };

  // Handle drag over item (for consolidation)
  const handleDragOverItem = (e: React.DragEvent, itemId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverItem(itemId);
  };

  const handleDropOnItem = (e: React.DragEvent, targetItem: OrderItem) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverItem(null);
    
    if (!draggedItem || draggedItem.id === targetItem.id) return;
    
    // Create or update consolidation group
    const consolidationId = targetItem.consolidationId || `CONSOL-${Date.now()}`;
    
    // Update both items to have the same consolidation ID
    const newColumns = columns.map(col => ({
      ...col,
      items: col.items.map(item => {
        if (item.id === draggedItem.id || item.id === targetItem.id) {
          return { ...item, consolidationId };
        }
        return item;
      })
    }));
    
    setColumns(newColumns);
    setDraggedItem(null);
    
    // Update consolidation groups
    const updatedGroups = { ...consolidationGroups };
    if (!updatedGroups[consolidationId]) {
      updatedGroups[consolidationId] = [];
    }
    updatedGroups[consolidationId].push(draggedItem, targetItem);
    setConsolidationGroups(updatedGroups);
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

  const toggleGroupExpanded = (groupId: string) => {
    setExpandedGroups(prev => 
      prev.includes(groupId) 
        ? prev.filter(id => id !== groupId)
        : [...prev, groupId]
    );
  };

  // Compact Item Card Component
  const ItemCard = ({ item, isDragging = false }: { item: OrderItem; isDragging?: boolean }) => {
    const isConsolidated = !!item.consolidationId;
    
    return (
      <div 
        draggable
        onDragStart={(e) => handleDragStart(e, item)}
        className={`
          group relative bg-white dark:bg-gray-800 border rounded-md p-1.5 cursor-move
          transition-all duration-200 hover:shadow-md hover:scale-[1.02] hover:z-10
          ${isDragging ? 'opacity-50 scale-95' : ''}
          ${isConsolidated ? 'border-purple-300 bg-purple-50/50 dark:bg-purple-900/20' : 'border-gray-200'}
        `}
      >
        {/* Drag Handle Indicator */}
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-gray-400 to-gray-300 rounded-l-md opacity-0 group-hover:opacity-100 transition-opacity" />
        
        {/* Main Content - Single Row Layout */}
        <div className="flex items-center gap-1.5 text-[10px]">
          {/* Quantity Badge */}
          <Badge variant="secondary" className="h-4 px-1 text-[9px] font-bold">
            {item.quantity}
          </Badge>
          
          {/* Item Name */}
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{item.name}</p>
            <div className="flex items-center gap-1 text-[9px] text-muted-foreground">
              <span className="truncate">{item.sku || item.orderNumber}</span>
              {item.consolidationId && (
                <Badge variant="outline" className="h-3 px-0.5 text-[8px] border-purple-400">
                  C-{item.consolidationId.slice(-3)}
                </Badge>
              )}
            </div>
          </div>
          
          {/* Country Flag */}
          <span className="text-xs">{getCountryFlag(item.supplierCountry)}</span>
        </div>
      </div>
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'processing': return 'bg-yellow-100 text-yellow-800';
      case 'to_warehouse': return 'bg-blue-100 text-blue-800';
      case 'at_warehouse': return 'bg-indigo-100 text-indigo-800';
      case 'consolidating': return 'bg-purple-100 text-purple-800';
      case 'international': return 'bg-orange-100 text-orange-800';
      case 'delivered': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const allItems = getAllItems();
  const filteredAllItems = filterItems(allItems);

  // Sorting function
  const sortData = (data: ImportOrder[]) => {
    if (!sortColumn) return data;
    
    return [...data].sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortColumn) {
        case 'order':
          aValue = a.orderNumber;
          bValue = b.orderNumber;
          break;
        case 'supplier':
          aValue = a.supplier;
          bValue = b.supplier;
          break;
        case 'status':
          aValue = a.status;
          bValue = b.status;
          break;
        case 'priority':
          const priorityOrder = { high: 0, medium: 1, low: 2 };
          aValue = priorityOrder[a.priority as keyof typeof priorityOrder];
          bValue = priorityOrder[b.priority as keyof typeof priorityOrder];
          break;
        case 'items':
          aValue = a.totalItems;
          bValue = b.totalItems;
          break;
        case 'value':
          aValue = a.totalValue;
          bValue = b.totalValue;
          break;
        case 'progress':
          aValue = a.progress;
          bValue = b.progress;
          break;
        case 'eta':
          aValue = new Date(a.estimatedArrival).getTime();
          bValue = new Date(b.estimatedArrival).getTime();
          break;
        default:
          return 0;
      }
      
      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  };

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const sortedOrders = sortData(mockOrders); // Temporarily using mockOrders for table view

  const SortableHeader = ({ column, children, align = 'left' }: { column: string; children: React.ReactNode; align?: 'left' | 'right' | 'center' }) => {
    const isActive = sortColumn === column;
    
    return (
      <TableHead 
        className={`font-semibold cursor-pointer hover:bg-muted/50 select-none ${align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : ''}`}
        onClick={() => handleSort(column)}
      >
        <div className={`flex items-center gap-1 ${align === 'right' ? 'justify-end' : align === 'center' ? 'justify-center' : ''}`}>
          {children}
          <div className="flex flex-col">
            {isActive ? (
              sortDirection === 'asc' ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )
            ) : (
              <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        </div>
      </TableHead>
    );
  };

  const OrderCard = ({ order }: { order: ImportOrder }) => {
    const isExpanded = expandedItems.includes(order.id);
    const [, navigate] = useLocation();
    const displayItems = isExpanded ? order.items : order.items.slice(0, 5);
    const hasMoreItems = order.items.length > 5;
    
    return (
      <Card 
        draggable
        onDragStart={(e) => handleDragStart(e, order)}
        onClick={() => navigate(`/imports/orders/${order.id}`)}
        className="cursor-move hover:shadow-md transition-all mb-1.5 group"
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
            <span className="text-xs font-semibold">{formatCurrency(order.totalValue, order.currency)}</span>
          </div>

          {/* Supplier & Warehouse */}
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-[11px]">
              <span>{getCountryFlag(order.supplierCountry)}</span>
              <span className="truncate">{order.supplier}</span>
            </div>
            {order.warehouseLocation && (
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <Building2 className="h-3 w-3" />
                <span className="truncate">{order.warehouseLocation}</span>
              </div>
            )}
          </div>

          {/* Tracking Numbers */}
          {(order.localTrackingNumber || order.internationalTrackingNumber || order.consolidationId) && (
            <div className="flex flex-wrap gap-0.5">
              {order.localTrackingNumber && (
                <Badge variant="secondary" className="h-3.5 px-1 text-[9px]">
                  <Truck className="h-2.5 w-2.5 mr-0.5" />
                  Local: {order.localTrackingNumber.slice(-6)}
                </Badge>
              )}
              {order.internationalTrackingNumber && (
                <Badge variant="secondary" className="h-3.5 px-1 text-[9px]">
                  <Plane className="h-2.5 w-2.5 mr-0.5" />
                  Int'l: {order.internationalTrackingNumber.slice(-6)}
                </Badge>
              )}
              {order.consolidationId && (
                <Badge variant="outline" className="h-3.5 px-1 text-[9px] bg-purple-50">
                  <Package className="h-2.5 w-2.5 mr-0.5" />
                  {order.consolidationId.slice(-3)}
                </Badge>
              )}
            </div>
          )}

          {/* Progress */}
          <div className="w-full h-1 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-green-500 transition-all"
              style={{ width: `${order.progress}%` }}
            />
          </div>

          {/* Items List */}
          <div className="bg-gray-50 dark:bg-gray-900/30 rounded p-1.5 space-y-0.5">
            <div className="text-[11px] font-medium mb-0.5">
              {order.items.length} items ({order.totalItems} total)
            </div>
            {displayItems.map((item) => (
              <div key={item.id} className="flex justify-between items-center text-[10px]">
                <span className="truncate flex-1 text-muted-foreground">{item.name}</span>
                <span className="font-medium ml-1">{item.quantity}</span>
              </div>
            ))}
            
            {/* Expand/Collapse button only if more than 5 items */}
            {hasMoreItems && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleItemsExpanded(order.id);
                }}
                className="flex items-center justify-center w-full hover:bg-gray-100 dark:hover:bg-gray-800/50 rounded px-1 py-0.5 mt-1 transition-colors"
              >
                <ChevronDown 
                  className={`h-3 w-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
                />
                <span className="text-[10px] text-muted-foreground ml-1">
                  {isExpanded ? 'Show less' : `+${order.items.length - 5} more`}
                </span>
              </button>
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
              <h1 className="text-lg md:text-2xl font-semibold">Import Order Workflow</h1>
              <p className="text-xs md:text-sm text-muted-foreground">
                Track orders from supplier → warehouse → consolidation → delivery
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as any)}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="kanban">Workflow</TabsTrigger>
                <TabsTrigger value="table">Table</TabsTrigger>
                <TabsTrigger value="timeline">Timeline</TabsTrigger>
              </TabsList>
            </Tabs>
            <Button variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 md:mr-2" />
              <span className="hidden md:inline">Refresh</span>
            </Button>
            <Link href="/imports/consolidate">
              <Button variant="outline" size="sm">
                <Package className="h-4 w-4 md:mr-2" />
                <span className="hidden md:inline">Consolidate</span>
              </Button>
            </Link>
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
              const filteredItems = filterItems(column.items || []);
              return (
                <div
                  key={column.id}
                  className="flex-shrink-0 w-64"
                  onDragOver={(e) => handleDragOver(e, column.id)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, column.id)}
                >
                  <Card className={`
                    h-full overflow-hidden transition-all duration-200
                    ${dragOverColumn === column.id ? 'ring-2 ring-blue-500 shadow-lg scale-[1.01]' : ''}
                  `}>
                    <CardHeader className={`${column.color} py-2 px-2.5`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          {column.icon}
                          <CardTitle className="text-xs font-medium">{column.title}</CardTitle>
                        </div>
                        <div className="flex items-center gap-1">
                          {column.id === 'at_warehouse' && (
                            <Badge variant="outline" className="text-[8px] h-3 px-0.5 border-purple-400">
                              <Package className="h-2 w-2" />
                              {Object.keys(consolidationGroups).length} groups
                            </Badge>
                          )}
                          <Badge variant="secondary" className="text-[10px] h-4 px-1">
                            {filteredItems.length} items
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-1">
                      {/* Special Consolidation Zone for Warehouse */}
                      {column.id === 'at_warehouse' && (
                        <div 
                          className={`
                            mb-2 p-2 border-2 border-dashed rounded-md transition-all
                            ${dragOverColumn === 'consolidation-zone' ? 
                              'border-purple-500 bg-purple-50 dark:bg-purple-900/20' : 
                              'border-gray-300 bg-gray-50/50 dark:bg-gray-800/50'}
                          `}
                          onDragOver={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setDragOverColumn('consolidation-zone');
                          }}
                          onDragLeave={() => setDragOverColumn(null)}
                          onDrop={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (draggedItem) {
                              // Create new consolidation group
                              const newConsolId = `CONSOL-${Date.now().toString(36).toUpperCase()}`;
                              const updatedItem = { ...draggedItem, consolidationId: newConsolId };
                              
                              // Update columns
                              const newColumns = columns.map(col => {
                                if (col.items.some(i => i.id === draggedItem.id)) {
                                  return {
                                    ...col,
                                    items: col.items.map(i => 
                                      i.id === draggedItem.id ? updatedItem : i
                                    )
                                  };
                                }
                                return col;
                              });
                              
                              setColumns(newColumns);
                              setDraggedItem(null);
                              setDragOverColumn(null);
                            }
                          }}
                        >
                          <div className="flex items-center justify-center gap-1">
                            <Package className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-[10px] font-medium text-muted-foreground">
                              {dragOverColumn === 'consolidation-zone' ? 
                                'Drop to create consolidation' : 
                                'Drag items here to consolidate'}
                            </span>
                          </div>
                        </div>
                      )}
                      
                      <ScrollArea className="h-[calc(100vh-22rem)]">
                        {filteredItems.length === 0 ? (
                          <div className={`
                            flex flex-col items-center justify-center py-8 text-center rounded-md
                            ${dragOverColumn === column.id ? 'bg-blue-50 dark:bg-blue-900/20 border-2 border-dashed border-blue-300' : ''}
                          `}>
                            <Package className="h-6 w-6 text-muted-foreground mb-1" />
                            <p className="text-xs text-muted-foreground">
                              {dragOverColumn === column.id ? 'Drop here' : 'No items'}
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-0.5">
                            {/* Group items by consolidation ID */}
                            {(() => {
                              const groups: { [key: string]: OrderItem[] } = {};
                              const standalone: OrderItem[] = [];
                              
                              filteredItems.forEach(item => {
                                if (item.consolidationId) {
                                  if (!groups[item.consolidationId]) {
                                    groups[item.consolidationId] = [];
                                  }
                                  groups[item.consolidationId].push(item);
                                } else {
                                  standalone.push(item);
                                }
                              });
                              
                              return (
                                <>
                                  {/* Render consolidated groups */}
                                  {Object.entries(groups).map(([consolId, items]) => (
                                    <div 
                                      key={consolId}
                                      className="border border-purple-300 bg-purple-50/30 dark:bg-purple-900/10 rounded-md p-1 space-y-0.5"
                                    >
                                      <div className="flex items-center justify-between mb-0.5">
                                        <Badge variant="outline" className="text-[8px] px-0.5 h-3 border-purple-400">
                                          <Package className="h-2 w-2 mr-0.5" />
                                          Consolidated ({items.length})
                                        </Badge>
                                      </div>
                                      {items.map(item => (
                                        <ItemCard 
                                          key={item.id} 
                                          item={item}
                                          isDragging={draggedItem?.id === item.id}
                                        />
                                      ))}
                                    </div>
                                  ))}
                                  
                                  {/* Render standalone items */}
                                  {standalone.map(item => (
                                    <div
                                      key={item.id}
                                      onDragOver={(e) => handleDragOverItem(e, item.id)}
                                      onDragLeave={() => setDragOverItem(null)}
                                      onDrop={(e) => handleDropOnItem(e, item)}
                                      className={`
                                        transition-all duration-200
                                        ${dragOverItem === item.id && draggedItem?.id !== item.id ? 
                                          'ring-2 ring-purple-400 rounded-md p-0.5 bg-purple-50/50' : ''}
                                      `}
                                    >
                                      <ItemCard 
                                        item={item}
                                        isDragging={draggedItem?.id === item.id}
                                      />
                                    </div>
                                  ))}
                                </>
                              );
                            })()}
                          </div>
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
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-8"></TableHead>
                    <TableHead className="w-12">
                      <Checkbox 
                        checked={selectedOrders.length === sortedOrders.length && sortedOrders.length > 0}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedOrders(sortedOrders.map(o => o.id));
                          } else {
                            setSelectedOrders([]);
                          }
                        }}
                      />
                    </TableHead>
                    <SortableHeader column="order">Order</SortableHeader>
                    <SortableHeader column="supplier">Supplier</SortableHeader>
                    <SortableHeader column="status">Status</SortableHeader>
                    <SortableHeader column="priority">Priority</SortableHeader>
                    <SortableHeader column="items" align="right">Items</SortableHeader>
                    <SortableHeader column="value" align="right">Value</SortableHeader>
                    <SortableHeader column="progress">Progress</SortableHeader>
                    <SortableHeader column="eta">ETA</SortableHeader>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedOrders.map((order) => (
                    <React.Fragment key={order.id}>
                      <TableRow 
                        key={order.id}
                        className="group hover:bg-muted/50 cursor-pointer"
                        onClick={() => navigate(`/imports/orders/${order.id}`)}
                      >
                        <TableCell className="px-2" onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => toggleItemsExpanded(order.id)}
                          >
                            <ChevronDown 
                              className={`h-3.5 w-3.5 transition-transform ${
                                expandedItems.includes(order.id) ? 'rotate-180' : ''
                              }`}
                            />
                          </Button>
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Checkbox 
                            checked={selectedOrders.includes(order.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedOrders([...selectedOrders, order.id]);
                              } else {
                                setSelectedOrders(selectedOrders.filter(id => id !== order.id));
                              }
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{order.orderNumber}</div>
                            <div className="text-xs text-muted-foreground">
                              {order.destination}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{getCountryFlag(order.supplierCountry)}</span>
                            <span className="truncate max-w-[150px]">{order.supplier}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(order.status)} variant="secondary">
                            {order.status.replace('_', ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            className="font-semibold"
                            style={{
                              backgroundColor: 
                                order.priority === 'high' ? '#ef4444' : 
                                order.priority === 'medium' ? '#f59e0b' : 
                                '#10b981',
                              color: 'white'
                            }}
                          >
                            {order.priority}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {order.totalItems.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatCurrency(order.totalValue, order.currency)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress value={order.progress} className="h-1.5 w-16" />
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
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => navigate(`/imports/orders/${order.id}`)}>
                                <Eye className="h-4 w-4 mr-2" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => navigate(`/imports/orders/${order.id}/edit`)}>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit Order
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => navigate(`/imports/orders/${order.id}/receive`)}>
                                <Package className="h-4 w-4 mr-2" />
                                Receive Items
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-red-600">
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete Order
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                      {/* Expandable Items Row */}
                      {expandedItems.includes(order.id) && (
                        <TableRow>
                          <TableCell colSpan={11} className="bg-muted/30 p-0">
                            <div className="px-8 py-4">
                              <div className="mb-2 text-sm font-medium text-muted-foreground">
                                Order Items ({order.items.length})
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                                {order.items.map((item) => (
                                  <div 
                                    key={item.id} 
                                    className="flex items-center justify-between p-2 bg-background rounded-md border"
                                  >
                                    <div className="flex-1">
                                      <p className="text-sm font-medium">{item.name}</p>
                                      {item.sku && (
                                        <p className="text-xs text-muted-foreground">SKU: {item.sku}</p>
                                      )}
                                    </div>
                                    <Badge variant="secondary" className="ml-2">
                                      {item.quantity}
                                    </Badge>
                                  </div>
                                ))}
                              </div>
                              {order.trackingNumber && (
                                <div className="mt-3 pt-3 border-t flex items-center gap-4 text-sm">
                                  <div className="flex items-center gap-2">
                                    <Truck className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-muted-foreground">Tracking:</span>
                                    <span className="font-medium">{order.trackingNumber}</span>
                                  </div>
                                  {order.shippingMethod && (
                                    <div className="flex items-center gap-2">
                                      <Ship className="h-4 w-4 text-muted-foreground" />
                                      <span className="font-medium">{order.shippingMethod}</span>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  ))}
                </TableBody>
              </Table>
              {sortedOrders.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12">
                  <Package className="h-12 w-12 text-muted-foreground mb-3" />
                  <p className="text-lg font-medium">No import orders found</p>
                  <p className="text-sm text-muted-foreground">Try adjusting your filters or create a new order</p>
                </div>
              )}
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