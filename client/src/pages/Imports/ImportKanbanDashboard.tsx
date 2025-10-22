import React, { useState } from "react";
import { Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  ShoppingCart, Warehouse, Target, ChevronUp
} from "lucide-react";
import { format, differenceInDays } from "date-fns";

// Type definitions
interface PurchaseItem {
  id: number;
  purchaseId: number;
  name: string;
  sku: string | null;
  quantity: number;
  unitPrice: string | null;
  weight: string | null;
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

interface ConsolidationItem {
  id: number;
  consolidationId: number;
  itemType: string;
  itemId: number;
  name: string;
  quantity: number;
  weight: string;
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
  items: ConsolidationItem[];
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
}

const shippingMethodColors: Record<string, string> = {
  'air_express': 'border-red-300',
  'air_standard': 'border-orange-300',
  'sea_express': 'border-blue-300',
  'sea_standard': 'border-cyan-300',
  'ground': 'border-green-300'
};

const shippingMethodIcons: Record<string, any> = {
  'air_express': Zap,
  'air_standard': Plane,
  'sea_express': Ship,
  'sea_standard': Ship,
  'ground': Truck
};

// Purchase Card Component
function PurchaseCard({ 
  purchase, 
  onDragStart 
}: { 
  purchase: Purchase; 
  onDragStart: (e: React.DragEvent, item: any, type: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const displayItems = expanded ? purchase.items : purchase.items.slice(0, 5);
  const hasMoreItems = purchase.items.length > 5;

  return (
    <Card
      draggable
      onDragStart={(e) => onDragStart(e, purchase, 'purchase')}
      className="cursor-move hover:shadow-md transition-all bg-white dark:bg-gray-800 overflow-hidden w-full"
      data-testid={`purchase-${purchase.id}`}
    >
      <CardContent className="p-1.5 sm:p-2 md:p-2.5 lg:p-3 space-y-1 md:space-y-1.5">
        {/* Header */}
        <div className="flex items-center justify-between gap-1 sm:gap-2 min-w-0">
          <h4 className="font-semibold text-[10px] sm:text-xs md:text-sm truncate min-w-0">
            {purchase.supplier}
          </h4>
          <Badge variant="outline" className="text-[9px] sm:text-[10px] md:text-xs flex-shrink-0 px-1 sm:px-1.5">
            {purchase.status}
          </Badge>
        </div>

        {/* Tracking Info */}
        {purchase.trackingNumber && (
          <div className="flex items-center text-[10px] md:text-xs text-muted-foreground min-w-0">
            <Hash className="h-2.5 w-2.5 md:h-3 md:w-3 mr-0.5 md:mr-1 flex-shrink-0" />
            <span className="truncate min-w-0">{purchase.trackingNumber}</span>
          </div>
        )}

        {/* Items List */}
        {purchase.items.length > 0 && (
          <div className="space-y-0.5 pt-1">
            {displayItems.map((item, idx) => (
              <div key={item.id} className="flex items-center justify-between text-xs gap-1 min-w-0">
                <span className="text-muted-foreground truncate min-w-0 text-[10px] md:text-[11px]">
                  {idx + 1}. {item.name}
                </span>
                <span className="text-muted-foreground flex-shrink-0 text-[10px] md:text-[11px]">
                  x{item.quantity}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Expand/Collapse Button */}
        {hasMoreItems && (
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(!expanded);
            }}
            className="w-full h-5 md:h-6 text-[10px] md:text-xs py-0"
          >
            {expanded ? (
              <>
                <ChevronUp className="h-2.5 w-2.5 md:h-3 md:w-3 mr-0.5" />
                Show Less
              </>
            ) : (
              <>
                <ChevronDown className="h-2.5 w-2.5 md:h-3 md:w-3 mr-0.5" />
                +{purchase.items.length - 5} More
              </>
            )}
          </Button>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-1 sm:pt-1.5 border-t mt-1 sm:mt-1.5">
          <span className="text-[9px] sm:text-[10px] md:text-xs font-semibold flex-shrink-0">
            ${parseFloat(purchase.totalCost).toFixed(1)}
          </span>
          {purchase.estimatedArrival && (
            <span className="text-[9px] sm:text-[10px] md:text-xs text-muted-foreground flex-shrink-0">
              {differenceInDays(new Date(purchase.estimatedArrival), new Date())}d
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Custom Item Card Component
function CustomItemCard({ 
  item, 
  onDragStart 
}: { 
  item: CustomItem; 
  onDragStart: (e: React.DragEvent, item: any, type: string) => void;
}) {
  return (
    <Card
      draggable
      onDragStart={(e) => onDragStart(e, item, 'custom')}
      className="cursor-move hover:shadow-md transition-all bg-white dark:bg-gray-800 overflow-hidden w-full"
      data-testid={`custom-${item.id}`}
    >
      <CardContent className="p-1.5 sm:p-2 md:p-2.5 lg:p-3 space-y-1 md:space-y-1.5">
        {/* Header */}
        <div className="flex items-center justify-between min-w-0">
          <h4 className="font-semibold text-[10px] sm:text-xs md:text-sm truncate min-w-0">
            {item.name}
          </h4>
        </div>

        {/* Source Info */}
        <div className="flex items-center justify-between gap-1 min-w-0">
          <Badge className="text-[10px] sm:text-[10px] md:text-xs truncate max-w-[50%] sm:max-w-[55%] md:max-w-[60%]" variant="secondary">
            {item.source}
          </Badge>
          {item.orderNumber && (
            <span className="text-[10px] sm:text-[10px] md:text-xs text-muted-foreground truncate max-w-[30%] sm:max-w-[35%] md:max-w-[40%]">
              #{item.orderNumber}
            </span>
          )}
        </div>

        {/* Quantity and Weight */}
        <div className="flex items-center gap-1 text-[10px] md:text-xs text-muted-foreground">
          <span className="flex-shrink-0">Qty: {item.quantity}</span>
          <span className="flex-shrink-0">•</span>
          <span className="flex-shrink-0">{item.weight}kg</span>
        </div>

        {/* Customer Info */}
        {item.customerName && (
          <div className="flex items-center text-[10px] md:text-xs min-w-0">
            <Users className="h-2.5 w-2.5 md:h-3 md:w-3 mr-0.5 md:mr-1 flex-shrink-0" />
            <span className="truncate min-w-0">{item.customerName}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Consolidation Card Component
function ConsolidationCard({ 
  consolidation, 
  onDragStart 
}: { 
  consolidation: Consolidation; 
  onDragStart: (e: React.DragEvent, item: any, type: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const displayItems = expanded ? consolidation.items : consolidation.items.slice(0, 5);
  const hasMoreItems = consolidation.items.length > 5;
  const Icon = shippingMethodIcons[consolidation.shippingMethod] || Package;
  const borderColor = shippingMethodColors[consolidation.shippingMethod] || 'border-gray-300';

  return (
    <Card
      draggable
      onDragStart={(e) => onDragStart(e, consolidation, 'consolidation')}
      className={`cursor-move hover:shadow-md transition-all bg-white dark:bg-gray-800 border-2 ${borderColor} overflow-hidden w-full`}
      data-testid={`consolidation-${consolidation.id}`}
    >
      <CardContent className="p-1.5 sm:p-2 md:p-2.5 lg:p-3 space-y-1 md:space-y-1.5">
        {/* Header */}
        <div className="flex items-center justify-between gap-1 sm:gap-2 min-w-0">
          <div className="flex items-center gap-0.5 sm:gap-1 md:gap-2 min-w-0">
            <Icon className="h-3 w-3 sm:h-3.5 sm:w-3.5 md:h-4 md:w-4 flex-shrink-0" />
            <h4 className="font-bold text-[10px] sm:text-xs md:text-sm truncate">{consolidation.name}</h4>
          </div>
          <Badge className="text-[9px] sm:text-[10px] md:text-xs bg-green-100 text-green-800 flex-shrink-0 px-1 sm:px-1.5">
            {consolidation.items.length} items
          </Badge>
        </div>

        {/* Warehouse Info */}
        <div className="flex items-center text-[10px] md:text-xs text-muted-foreground min-w-0">
          <Building2 className="h-2.5 w-2.5 md:h-3 md:w-3 mr-0.5 md:mr-1 flex-shrink-0" />
          <span className="truncate">{consolidation.warehouse}</span>
        </div>

        {/* Shipping Method */}
        <div className="flex items-center text-[10px] md:text-xs min-w-0">
          <Target className="h-2.5 w-2.5 md:h-3 md:w-3 mr-0.5 md:mr-1 flex-shrink-0" />
          <span className="truncate">{consolidation.shippingMethod.replace('_', ' ')}</span>
        </div>

        {/* Items List */}
        {consolidation.items.length > 0 && (
          <div className="space-y-0.5 pt-1 border-t">
            {displayItems.map((item, idx) => (
              <div key={item.id} className="flex items-center justify-between text-xs gap-1 min-w-0">
                <span className="text-muted-foreground truncate min-w-0 text-[10px] md:text-[11px]">
                  {idx + 1}. {item.name}
                </span>
                <span className="text-muted-foreground flex-shrink-0 text-[10px] md:text-[11px]">
                  x{item.quantity}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Expand/Collapse Button */}
        {hasMoreItems && (
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(!expanded);
            }}
            className="w-full h-5 md:h-6 text-[10px] md:text-xs py-0"
          >
            {expanded ? (
              <>
                <ChevronUp className="h-2.5 w-2.5 md:h-3 md:w-3 mr-0.5" />
                Show Less
              </>
            ) : (
              <>
                <ChevronDown className="h-2.5 w-2.5 md:h-3 md:w-3 mr-0.5" />
                +{consolidation.items.length - 5} More
              </>
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

// Shipment Card Component
function ShipmentCard({ 
  shipment, 
  isDelivered = false,
  onDragStart 
}: { 
  shipment: Shipment; 
  isDelivered?: boolean;
  onDragStart?: (e: React.DragEvent, item: any, type: string) => void;
}) {
  const getDaysUntil = (date: string | null) => {
    if (!date) return null;
    const days = differenceInDays(new Date(date), new Date());
    if (days < 0) return `${Math.abs(days)} days ago`;
    if (days === 0) return 'Today';
    if (days === 1) return 'Tomorrow';
    return `${days} days`;
  };

  return (
    <Card
      draggable={!isDelivered}
      onDragStart={onDragStart ? (e) => onDragStart(e, shipment, 'shipment') : undefined}
      className={`${!isDelivered ? 'cursor-move' : ''} hover:shadow-md transition-all bg-white dark:bg-gray-800 overflow-hidden w-full`}
      data-testid={`shipment-${shipment.id}`}
    >
      <CardContent className="p-1.5 sm:p-2 md:p-2.5 lg:p-3 space-y-1 md:space-y-1.5">
        {/* Header */}
        <div className="flex items-center justify-between gap-1 min-w-0">
          <Badge 
            variant={isDelivered ? "default" : "outline"} 
            className={`text-[10px] md:text-xs flex-shrink-0 ${isDelivered ? 'bg-green-100 text-green-800' : ''}`}
          >
            {isDelivered ? 'Delivered' : shipment.status}
          </Badge>
          <span className="text-[10px] md:text-xs font-bold truncate">{shipment.carrier}</span>
        </div>

        {/* Tracking Number */}
        <h4 className="font-semibold text-[10px] sm:text-xs md:text-sm truncate">{shipment.trackingNumber}</h4>

        {/* Route */}
        <div className="flex items-center text-[10px] md:text-xs text-muted-foreground gap-0.5 md:gap-1 min-w-0">
          <span className="truncate flex-1 max-w-[30%] sm:max-w-[35%] md:max-w-[40%]">{shipment.origin}</span>
          <ArrowRight className="h-2.5 w-2.5 md:h-3 md:w-3 flex-shrink-0" />
          <span className="truncate flex-1 max-w-[30%] sm:max-w-[35%] md:max-w-[40%]">{shipment.destination}</span>
        </div>

        {/* Current Location */}
        {shipment.currentLocation && !isDelivered && (
          <div className="flex items-center text-[10px] md:text-xs min-w-0">
            <MapPin className="h-2.5 w-2.5 md:h-3 md:w-3 mr-0.5 md:mr-1 flex-shrink-0" />
            <span className="truncate min-w-0">{shipment.currentLocation}</span>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-1 sm:pt-1.5 border-t mt-1 sm:mt-1.5">
          {isDelivered && shipment.deliveredAt ? (
            <>
              <span className="text-[10px] md:text-xs">
                <Calendar className="h-2.5 w-2.5 md:h-3 md:w-3 inline mr-0.5 md:mr-1" />
                {format(new Date(shipment.deliveredAt), 'MMM d, yyyy')}
              </span>
              <Button variant="ghost" size="sm" className="h-5 md:h-6 px-1 md:px-2 text-[10px] md:text-xs py-0">
                <Eye className="h-2.5 w-2.5 md:h-3 md:w-3 mr-0.5 md:mr-1" />
                View
              </Button>
            </>
          ) : (
            <>
              <span className="text-[9px] sm:text-[10px] md:text-xs font-semibold flex-shrink-0">
                ${parseFloat(shipment.shippingCost).toFixed(0)}
              </span>
              {shipment.estimatedDelivery && (
                <span className="text-[9px] sm:text-[10px] md:text-xs text-muted-foreground flex-shrink-0">
                  {getDaysUntil(shipment.estimatedDelivery)}
                </span>
              )}
            </>
          )}
        </div>

        {/* Progress bar for in-transit */}
        {!isDelivered && shipment.status === 'in_transit' && (
          <Progress value={60} className="h-0.5 mt-1" />
        )}
      </CardContent>
    </Card>
  );
}

export default function ImportKanbanDashboard() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterWarehouse, setFilterWarehouse] = useState("all");
  const [draggedItem, setDraggedItem] = useState<any>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all data
  const { data: purchases = [], isLoading: purchasesLoading } = useQuery({
    queryKey: ['/api/imports/purchases'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/imports/purchases');
      return response.json() as Promise<Purchase[]>;
    }
  });

  const { data: customItems = [], isLoading: customItemsLoading } = useQuery({
    queryKey: ['/api/imports/custom-items'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/imports/custom-items');
      return response.json() as Promise<CustomItem[]>;
    }
  });

  const { data: consolidations = [], isLoading: consolidationsLoading } = useQuery({
    queryKey: ['/api/imports/consolidations'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/imports/consolidations');
      return response.json() as Promise<Consolidation[]>;
    }
  });

  const { data: shipments = [], isLoading: shipmentsLoading } = useQuery({
    queryKey: ['/api/imports/shipments'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/imports/shipments');
      return response.json() as Promise<Shipment[]>;
    }
  });

  // Update status mutations
  const updatePurchaseStatusMutation = useMutation({
    mutationFn: async ({ purchaseId, status }: { purchaseId: number; status: string }) => {
      const response = await apiRequest('PATCH', `/api/imports/purchases/${purchaseId}/status`, { status });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/imports/purchases'] });
      toast({ title: "Success", description: "Purchase status updated" });
    }
  });

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

  const isLoading = purchasesLoading || customItemsLoading || consolidationsLoading || shipmentsLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Filter data
  const filteredPurchases = purchases.filter(p => 
    (p.status === 'pending' || p.status === 'processing') &&
    (searchQuery === '' || 
      p.supplier.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.trackingNumber && p.trackingNumber.toLowerCase().includes(searchQuery.toLowerCase()))
    )
  );

  const filteredCustomItems = customItems.filter(item => 
    item.status === 'available' &&
    (searchQuery === '' || 
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.orderNumber && item.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()))
    )
  );

  const filteredConsolidations = consolidations.filter(c => 
    c.status === 'preparing' &&
    (filterWarehouse === 'all' || c.warehouse.toLowerCase().includes(filterWarehouse))
  );

  const activeShipments = shipments.filter(s => 
    s.status !== 'delivered' &&
    (searchQuery === '' || 
      s.trackingNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.carrier.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const deliveredShipments = shipments.filter(s => 
    s.status === 'delivered' &&
    (searchQuery === '' || 
      s.trackingNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.carrier.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const columns = [
    {
      id: 'processing',
      title: 'Purchase Orders',
      icon: <Package className="h-4 w-4" />,
      count: filteredPurchases.length,
      bgColor: 'bg-yellow-50 dark:bg-yellow-900/10',
      borderColor: 'border-yellow-200 dark:border-yellow-800'
    },
    {
      id: 'at_warehouse',
      title: 'Consolidation',
      icon: <Warehouse className="h-4 w-4" />,
      count: filteredCustomItems.length + filteredConsolidations.length,
      bgColor: 'bg-purple-50 dark:bg-purple-900/10',
      borderColor: 'border-purple-200 dark:border-purple-800'
    },
    {
      id: 'international',
      title: 'International Transit',
      icon: <Globe className="h-4 w-4" />,
      count: activeShipments.length,
      bgColor: 'bg-blue-50 dark:bg-blue-900/10',
      borderColor: 'border-blue-200 dark:border-blue-800'
    },
    {
      id: 'delivered',
      title: 'Delivered',
      icon: <CheckCircle className="h-4 w-4" />,
      count: deliveredShipments.length,
      bgColor: 'bg-green-50 dark:bg-green-900/10',
      borderColor: 'border-green-200 dark:border-green-800'
    }
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Import Kanban Dashboard</h1>
          <p className="text-muted-foreground">Drag and drop to manage import workflow</p>
        </div>
        <div className="flex gap-2">
          <Link href="/purchase-orders">
            <Button variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              New Purchase
            </Button>
          </Link>
          <Link href="/consolidation">
            <Button variant="outline">
              <Package className="h-4 w-4 mr-2" />
              Custom Item
            </Button>
          </Link>
          <Link href="/imports/international-transit">
            <Button>
              <Plane className="h-4 w-4 mr-2" />
              New Shipment
            </Button>
          </Link>
        </div>
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
              />
            </div>
            <Select value={filterWarehouse} onValueChange={setFilterWarehouse}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Warehouses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Warehouses</SelectItem>
                <SelectItem value="china">China Warehouse</SelectItem>
                <SelectItem value="vietnam">Vietnam Warehouse</SelectItem>
                <SelectItem value="usa">USA Warehouse</SelectItem>
              </SelectContent>
            </Select>
            <Button 
              variant="outline" 
              size="icon"
              onClick={() => {
                queryClient.invalidateQueries();
                toast({ title: "Refreshed", description: "Data has been refreshed" });
              }}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-2 md:gap-3 lg:gap-4 w-full">
        {columns.map((column) => (
          <div
            key={column.id}
            className={`rounded-lg border-2 overflow-hidden min-w-0 ${column.bgColor} ${column.borderColor} ${
              dragOverColumn === column.id ? 'ring-2 ring-primary ring-offset-2' : ''
            }`}
            onDragOver={(e) => handleDragOver(e, column.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, column.id)}
          >
            {/* Column Header */}
            <div className="p-3 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  {column.icon}
                  <h3 className="font-semibold text-sm truncate">{column.title}</h3>
                </div>
                <Badge variant="secondary" className="text-xs font-bold flex-shrink-0">
                  {column.count}
                </Badge>
              </div>
            </div>

            {/* Column Content */}
            <div className="h-[400px] md:h-[500px] lg:h-[600px] overflow-y-auto overflow-x-hidden w-full">
              <div className="space-y-2 md:space-y-3 px-1.5 sm:px-2 md:px-2.5 lg:px-3 py-2 pr-2">
                {/* Purchase Orders Column */}
                {column.id === 'processing' && filteredPurchases.map((purchase) => (
                  <PurchaseCard 
                    key={purchase.id} 
                    purchase={purchase} 
                    onDragStart={handleDragStart}
                  />
                ))}

                {/* Consolidation Column */}
                {column.id === 'at_warehouse' && (
                  <>
                    {filteredCustomItems.map((item) => (
                      <CustomItemCard 
                        key={`custom-${item.id}`} 
                        item={item} 
                        onDragStart={handleDragStart}
                      />
                    ))}
                    {filteredConsolidations.map((consolidation) => (
                      <ConsolidationCard 
                        key={`consol-${consolidation.id}`} 
                        consolidation={consolidation} 
                        onDragStart={handleDragStart}
                      />
                    ))}
                  </>
                )}

                {/* International Transit Column */}
                {column.id === 'international' && activeShipments.map((shipment) => (
                  <ShipmentCard 
                    key={shipment.id} 
                    shipment={shipment} 
                    onDragStart={handleDragStart}
                  />
                ))}

                {/* Delivered Column */}
                {column.id === 'delivered' && deliveredShipments.map((shipment) => (
                  <ShipmentCard 
                    key={shipment.id} 
                    shipment={shipment} 
                    isDelivered={true}
                  />
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}