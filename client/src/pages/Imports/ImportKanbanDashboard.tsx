import { useState, useMemo } from "react";
import { Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { 
  Package, Search, Plus, Truck, Globe, CheckCircle,
  ArrowRight, MapPin, Hash, Building2, ChevronDown, ChevronUp,
  RefreshCw, Warehouse, BoxSelect, Ship, Plane, Zap
} from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { fuzzySearch } from "@/lib/fuzzySearch";

// Type definitions
interface PurchaseItem {
  id: number;
  name: string;
  quantity: number;
}

interface Purchase {
  id: number;
  supplier: string;
  trackingNumber: string | null;
  estimatedArrival: string | null;
  totalCost: string;
  status: string;
  items: PurchaseItem[];
}

interface CustomItem {
  id: number;
  name: string;
  source: string;
  quantity: number;
  weight: string;
  customerName: string | null;
  status: string;
}

interface ConsolidationItem {
  id: number;
  name: string;
  quantity: number;
  weight: string;
}

interface Consolidation {
  id: number;
  name: string;
  shippingMethod: string;
  warehouse: string;
  status: string;
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
  estimatedDelivery: string | null;
  deliveredAt: string | null;
  currentLocation: string | null;
  createdAt: string;
}

const shippingMethodIcons: Record<string, any> = {
  'air_express': Zap,
  'air_standard': Plane,
  'sea_express': Ship,
  'sea_standard': Ship,
  'ground': Truck
};

// Compact Purchase Card
function PurchaseCard({ 
  purchase, 
  onDragStart 
}: { 
  purchase: Purchase; 
  onDragStart: (e: React.DragEvent, item: any, type: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const displayItems = expanded ? purchase.items : purchase.items.slice(0, 3);
  const hasMore = purchase.items.length > 3;

  return (
    <Card
      draggable
      onDragStart={(e) => onDragStart(e, purchase, 'purchase')}
      className="cursor-move hover:shadow-lg hover:border-cyan-300 dark:hover:border-cyan-700 transition-all duration-300 border-slate-200 dark:border-slate-700"
      data-testid={`purchase-${purchase.id}`}
    >
      <CardContent className="p-3 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <h4 className="font-semibold text-sm truncate">{purchase.supplier}</h4>
          <Badge variant="outline" className="text-xs">{purchase.status}</Badge>
        </div>

        {purchase.trackingNumber && (
          <div className="flex items-center text-xs text-slate-600 dark:text-slate-400">
            <Hash className="h-3 w-3 mr-1" />
            <span className="truncate">{purchase.trackingNumber}</span>
          </div>
        )}

        {purchase.items.length > 0 && (
          <div className="space-y-1 pt-1 border-t border-slate-100 dark:border-slate-800">
            {displayItems.map((item, idx) => (
              <div key={item.id} className="flex items-center justify-between text-xs">
                <span className="text-slate-600 dark:text-slate-400 truncate">
                  {idx + 1}. {item.name}
                </span>
                <span className="text-slate-500 dark:text-slate-500 ml-2">×{item.quantity}</span>
              </div>
            ))}
          </div>
        )}

        {hasMore && (
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(!expanded);
            }}
            className="w-full h-6 text-xs"
          >
            {expanded ? (
              <><ChevronUp className="h-3 w-3 mr-1" />Show Less</>
            ) : (
              <><ChevronDown className="h-3 w-3 mr-1" />+{purchase.items.length - 3} More</>
            )}
          </Button>
        )}

        <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800">
          <span className="text-sm font-semibold text-cyan-600 dark:text-cyan-400">
            ${parseFloat(purchase.totalCost).toFixed(0)}
          </span>
          {purchase.estimatedArrival && (
            <span className="text-xs text-slate-500">
              {differenceInDays(new Date(purchase.estimatedArrival), new Date())}d
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Compact Custom Item Card
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
      className="cursor-move hover:shadow-lg hover:border-purple-300 dark:hover:border-purple-700 transition-all duration-300 border-slate-200 dark:border-slate-700"
      data-testid={`custom-${item.id}`}
    >
      <CardContent className="p-3 space-y-2">
        <h4 className="font-semibold text-sm truncate">{item.name}</h4>
        
        <div className="flex items-center justify-between gap-2">
          <Badge variant="secondary" className="text-xs truncate">{item.source}</Badge>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
          <span>Qty: {item.quantity}</span>
          <span>•</span>
          <span>{item.weight}kg</span>
        </div>

        {item.customerName && (
          <div className="text-xs text-slate-500 truncate">
            {item.customerName}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Compact Consolidation Card
function ConsolidationCard({ 
  consolidation, 
  onDragStart 
}: { 
  consolidation: Consolidation; 
  onDragStart: (e: React.DragEvent, item: any, type: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const displayItems = expanded ? consolidation.items : consolidation.items.slice(0, 3);
  const hasMore = consolidation.items.length > 3;
  const Icon = shippingMethodIcons[consolidation.shippingMethod] || Package;

  return (
    <Card
      draggable
      onDragStart={(e) => onDragStart(e, consolidation, 'consolidation')}
      className="cursor-move hover:shadow-lg hover:border-purple-300 dark:hover:border-purple-700 transition-all duration-300 border-l-4 border-l-purple-500 dark:border-l-purple-400"
      data-testid={`consolidation-${consolidation.id}`}
    >
      <CardContent className="p-3 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Icon className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            <h4 className="font-semibold text-sm truncate">{consolidation.name}</h4>
          </div>
          <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 text-xs">
            {consolidation.items.length}
          </Badge>
        </div>

        <div className="flex items-center text-xs text-slate-600 dark:text-slate-400">
          <Building2 className="h-3 w-3 mr-1" />
          <span className="truncate">{consolidation.warehouse}</span>
        </div>

        {consolidation.items.length > 0 && (
          <div className="space-y-1 pt-1 border-t border-slate-100 dark:border-slate-800">
            {displayItems.map((item, idx) => (
              <div key={item.id} className="flex items-center justify-between text-xs">
                <span className="text-slate-600 dark:text-slate-400 truncate">
                  {idx + 1}. {item.name}
                </span>
                <span className="text-slate-500 dark:text-slate-500 ml-2">×{item.quantity}</span>
              </div>
            ))}
          </div>
        )}

        {hasMore && (
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(!expanded);
            }}
            className="w-full h-6 text-xs"
          >
            {expanded ? (
              <><ChevronUp className="h-3 w-3 mr-1" />Show Less</>
            ) : (
              <><ChevronDown className="h-3 w-3 mr-1" />+{consolidation.items.length - 3} More</>
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

// Compact Shipment Card with Items
function ShipmentCard({ 
  shipment, 
  consolidation,
  isDelivered = false,
  onDragStart 
}: { 
  shipment: Shipment;
  consolidation?: Consolidation;
  isDelivered?: boolean;
  onDragStart?: (e: React.DragEvent, item: any, type: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const items = consolidation?.items || [];
  const displayItems = expanded ? items : items.slice(0, 3);
  const hasMore = items.length > 3;
  
  const getDaysUntil = (date: string | null) => {
    if (!date) return null;
    const days = differenceInDays(new Date(date), new Date());
    if (days < 0) return `${Math.abs(days)}d ago`;
    if (days === 0) return 'Today';
    if (days === 1) return 'Tomorrow';
    return `${days}d`;
  };

  const statusColor = isDelivered 
    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200'
    : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';

  return (
    <Card
      draggable={!isDelivered}
      onDragStart={onDragStart && !isDelivered ? (e) => onDragStart(e, shipment, 'shipment') : undefined}
      className={`${!isDelivered ? 'cursor-move hover:border-blue-300 dark:hover:border-blue-700' : ''} hover:shadow-lg transition-all duration-300 border-slate-200 dark:border-slate-700`}
      data-testid={`shipment-${shipment.id}`}
    >
      <CardContent className="p-3 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <Badge className={`text-xs ${statusColor}`}>
            {isDelivered ? 'Delivered' : shipment.status}
          </Badge>
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate">
            {shipment.carrier}
          </span>
        </div>

        <h4 className="font-semibold text-sm truncate">{shipment.trackingNumber}</h4>

        <div className="flex items-center text-xs text-slate-600 dark:text-slate-400 gap-1">
          <span className="truncate max-w-[40%]">{shipment.origin}</span>
          <ArrowRight className="h-3 w-3" />
          <span className="truncate max-w-[40%]">{shipment.destination}</span>
        </div>

        {shipment.currentLocation && !isDelivered && (
          <div className="flex items-center text-xs text-slate-500 dark:text-slate-400">
            <MapPin className="h-3 w-3 mr-1" />
            <span className="truncate">{shipment.currentLocation}</span>
          </div>
        )}

        {/* Shipment Items */}
        {items.length > 0 && (
          <div className="space-y-1 pt-1 border-t border-slate-100 dark:border-slate-800">
            <div className="text-xs font-medium text-slate-600 dark:text-slate-400">
              Contents ({items.length} items)
            </div>
            {displayItems.map((item, idx) => (
              <div key={item.id} className="flex items-center justify-between text-xs">
                <span className="text-slate-600 dark:text-slate-400 truncate">
                  {idx + 1}. {item.name}
                </span>
                <span className="text-slate-500 dark:text-slate-500 ml-2">×{item.quantity}</span>
              </div>
            ))}
          </div>
        )}

        {hasMore && (
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(!expanded);
            }}
            className="w-full h-6 text-xs"
          >
            {expanded ? (
              <><ChevronUp className="h-3 w-3 mr-1" />Show Less</>
            ) : (
              <><ChevronDown className="h-3 w-3 mr-1" />+{items.length - 3} More</>
            )}
          </Button>
        )}

        <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800">
          {isDelivered && shipment.deliveredAt ? (
            <span className="text-xs text-slate-500">
              {format(new Date(shipment.deliveredAt), 'MMM d, yyyy')}
            </span>
          ) : (
            <>
              <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                ${parseFloat(shipment.shippingCost).toFixed(0)}
              </span>
              {shipment.estimatedDelivery && (
                <span className="text-xs text-slate-500">
                  {getDaysUntil(shipment.estimatedDelivery)}
                </span>
              )}
            </>
          )}
        </div>
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

  // Fetch data
  const { data: purchases = [], isLoading: purchasesLoading } = useQuery<Purchase[]>({
    queryKey: ['/api/imports/purchases'],
  });

  const { data: customItems = [], isLoading: customItemsLoading } = useQuery<CustomItem[]>({
    queryKey: ['/api/imports/custom-items'],
  });

  const { data: consolidations = [], isLoading: consolidationsLoading } = useQuery<Consolidation[]>({
    queryKey: ['/api/imports/consolidations'],
  });

  const { data: shipments = [], isLoading: shipmentsLoading } = useQuery<Shipment[]>({
    queryKey: ['/api/imports/shipments'],
  });

  // Mutations
  const updatePurchaseStatusMutation = useMutation({
    mutationFn: async ({ purchaseId, status }: { purchaseId: number; status: string }) => {
      return apiRequest('PATCH', `/api/imports/purchases/${purchaseId}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/imports/purchases'] });
      toast({ title: "Success", description: "Purchase status updated" });
    }
  });

  // Drag handlers
  const handleDragStart = (e: React.DragEvent, item: any, type: string) => {
    setDraggedItem({ ...item, type });
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    setDragOverColumn(columnId);
  };

  const handleDragLeave = () => setDragOverColumn(null);

  const handleDrop = (e: React.DragEvent, targetColumn: string) => {
    e.preventDefault();
    setDragOverColumn(null);
    
    if (!draggedItem) return;
    
    if (draggedItem.type === 'purchase' && targetColumn === 'at_warehouse') {
      updatePurchaseStatusMutation.mutate({
        purchaseId: draggedItem.id,
        status: 'at_warehouse'
      });
    }
    
    setDraggedItem(null);
  };

  // Deep search helper - searches within nested items
  const deepSearchPurchases = (purchase: Purchase, query: string): boolean => {
    const { calculateSearchScore } = require('@/lib/fuzzySearch');
    const threshold = 20; // 0.2 * 100
    
    // Search in main fields
    if (calculateSearchScore(purchase.supplier, query) >= threshold) return true;
    if (purchase.trackingNumber && calculateSearchScore(purchase.trackingNumber, query) >= threshold) return true;
    if (calculateSearchScore(purchase.status, query) >= threshold) return true;
    
    // Deep search in items
    for (const item of purchase.items) {
      if (calculateSearchScore(item.name, query) >= threshold) return true;
      if (calculateSearchScore(item.quantity.toString(), query) >= threshold) return true;
    }
    
    return false;
  };

  const deepSearchCustomItem = (item: CustomItem, query: string): boolean => {
    const { calculateSearchScore } = require('@/lib/fuzzySearch');
    const threshold = 20;
    
    if (calculateSearchScore(item.name, query) >= threshold) return true;
    if (calculateSearchScore(item.source, query) >= threshold) return true;
    if (item.customerName && calculateSearchScore(item.customerName, query) >= threshold) return true;
    if (calculateSearchScore(item.status, query) >= threshold) return true;
    
    return false;
  };

  const deepSearchConsolidation = (consolidation: Consolidation, query: string): boolean => {
    const { calculateSearchScore } = require('@/lib/fuzzySearch');
    const threshold = 20;
    
    if (calculateSearchScore(consolidation.name, query) >= threshold) return true;
    if (calculateSearchScore(consolidation.shippingMethod, query) >= threshold) return true;
    if (calculateSearchScore(consolidation.warehouse, query) >= threshold) return true;
    if (calculateSearchScore(consolidation.status, query) >= threshold) return true;
    
    // Deep search in consolidation items
    for (const item of consolidation.items) {
      if (calculateSearchScore(item.name, query) >= threshold) return true;
      if (calculateSearchScore(item.quantity.toString(), query) >= threshold) return true;
    }
    
    return false;
  };

  const deepSearchShipment = (shipment: Shipment, query: string): boolean => {
    const { calculateSearchScore } = require('@/lib/fuzzySearch');
    const threshold = 20;
    
    if (calculateSearchScore(shipment.trackingNumber, query) >= threshold) return true;
    if (calculateSearchScore(shipment.carrier, query) >= threshold) return true;
    if (calculateSearchScore(shipment.origin, query) >= threshold) return true;
    if (calculateSearchScore(shipment.destination, query) >= threshold) return true;
    if (shipment.currentLocation && calculateSearchScore(shipment.currentLocation, query) >= threshold) return true;
    if (calculateSearchScore(shipment.status, query) >= threshold) return true;
    
    // Search in linked consolidation if available
    if (shipment.consolidationId) {
      const linkedConsolidation = consolidations.find(c => c.id === shipment.consolidationId);
      if (linkedConsolidation && deepSearchConsolidation(linkedConsolidation, query)) {
        return true;
      }
    }
    
    return false;
  };

  // Filter data with deep fuzzy search and Vietnamese support
  const filteredPurchases = useMemo(() => {
    const pending = purchases.filter(p => 
      p.status === 'pending' || p.status === 'processing'
    );
    if (!searchQuery.trim()) return pending;
    
    // Real-time deep filtering
    return pending.filter(purchase => deepSearchPurchases(purchase, searchQuery));
  }, [purchases, searchQuery]);

  const filteredCustomItems = useMemo(() => {
    const available = customItems.filter(item => item.status === 'available');
    if (!searchQuery.trim()) return available;
    
    return available.filter(item => deepSearchCustomItem(item, searchQuery));
  }, [customItems, searchQuery]);

  const filteredConsolidations = useMemo(() => {
    let filtered = consolidations.filter(c => c.status === 'preparing');
    if (filterWarehouse !== 'all') {
      filtered = filtered.filter(c => 
        c.warehouse.toLowerCase().includes(filterWarehouse.toLowerCase())
      );
    }
    
    if (!searchQuery.trim()) return filtered;
    return filtered.filter(consolidation => deepSearchConsolidation(consolidation, searchQuery));
  }, [consolidations, filterWarehouse, searchQuery]);

  const activeShipments = useMemo(() => {
    const active = shipments.filter(s => s.status !== 'delivered');
    if (!searchQuery.trim()) return active;
    
    return active.filter(shipment => deepSearchShipment(shipment, searchQuery));
  }, [shipments, searchQuery, consolidations]);

  const deliveredShipments = useMemo(() => {
    const delivered = shipments.filter(s => s.status === 'delivered');
    if (!searchQuery.trim()) return delivered;
    
    return delivered.filter(shipment => deepSearchShipment(shipment, searchQuery));
  }, [shipments, searchQuery, consolidations]);

  const isLoading = purchasesLoading || customItemsLoading || consolidationsLoading || shipmentsLoading;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-96" />)}
        </div>
      </div>
    );
  }

  const columns = [
    {
      id: 'processing',
      title: 'Purchase Orders',
      icon: <Package className="h-4 w-4" />,
      count: filteredPurchases.length,
      gradient: 'from-yellow-500 to-orange-500',
      bgLight: 'bg-yellow-50 dark:bg-yellow-950/20',
      link: '/purchase-orders',
    },
    {
      id: 'at_warehouse',
      title: 'Consolidation',
      icon: <Warehouse className="h-4 w-4" />,
      count: filteredCustomItems.length + filteredConsolidations.length,
      gradient: 'from-purple-500 to-pink-500',
      bgLight: 'bg-purple-50 dark:bg-purple-950/20',
      link: '/consolidation',
    },
    {
      id: 'international',
      title: 'International Transit',
      icon: <Globe className="h-4 w-4" />,
      count: activeShipments.length,
      gradient: 'from-blue-500 to-cyan-500',
      bgLight: 'bg-blue-50 dark:bg-blue-950/20',
      link: '/imports/international-transit',
    },
    {
      id: 'delivered',
      title: 'Delivered',
      icon: <CheckCircle className="h-4 w-4" />,
      count: deliveredShipments.length,
      gradient: 'from-emerald-500 to-green-500',
      bgLight: 'bg-emerald-50 dark:bg-emerald-950/20',
      link: '/imports/international-transit',
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Import Kanban</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Drag and drop to manage import workflow
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/purchase-orders">
            <Button variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              New Purchase
            </Button>
          </Link>
          <Link href="/consolidation">
            <Button size="sm">
              <BoxSelect className="h-4 w-4 mr-2" />
              Consolidate
            </Button>
          </Link>
        </div>
      </div>

      {/* Search and Filters */}
      <Card className="border-slate-200 dark:border-slate-800">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search supplier, tracking, items, location... (Vietnamese supported)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="input-search-kanban"
              />
            </div>
            <Select value={filterWarehouse} onValueChange={setFilterWarehouse}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="All Warehouses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Warehouses</SelectItem>
                <SelectItem value="china">China</SelectItem>
                <SelectItem value="vietnam">Vietnam</SelectItem>
                <SelectItem value="usa">USA</SelectItem>
              </SelectContent>
            </Select>
            <Button 
              variant="outline" 
              size="icon"
              onClick={() => {
                queryClient.invalidateQueries();
                toast({ title: "Refreshed", description: "Data updated" });
              }}
              data-testid="button-refresh"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {columns.map((column) => (
          <div
            key={column.id}
            className={`rounded-lg border-2 transition-all duration-300 ${
              dragOverColumn === column.id 
                ? 'ring-2 ring-cyan-500 ring-offset-2 border-cyan-400 dark:border-cyan-600' 
                : 'border-slate-200 dark:border-slate-700'
            }`}
            onDragOver={(e) => handleDragOver(e, column.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, column.id)}
            data-testid={`column-${column.id}`}
          >
            {/* Column Header */}
            <Link href={column.link}>
              <div className="p-4 border-b border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`p-2 rounded-lg bg-gradient-to-r ${column.gradient} text-white`}>
                      {column.icon}
                    </div>
                    <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                      {column.title}
                    </h3>
                  </div>
                  <Badge variant="secondary" className="font-semibold">
                    {column.count}
                  </Badge>
                </div>
              </div>
            </Link>

            {/* Column Content */}
            <div className="h-[600px] overflow-y-auto overflow-x-hidden">
              <div className="space-y-3 p-3">
                {column.id === 'processing' && filteredPurchases.map(purchase => (
                  <PurchaseCard 
                    key={purchase.id} 
                    purchase={purchase} 
                    onDragStart={handleDragStart}
                  />
                ))}

                {column.id === 'at_warehouse' && (
                  <>
                    {filteredCustomItems.map(item => (
                      <CustomItemCard 
                        key={`custom-${item.id}`} 
                        item={item} 
                        onDragStart={handleDragStart}
                      />
                    ))}
                    {filteredConsolidations.map(consolidation => (
                      <ConsolidationCard 
                        key={`consol-${consolidation.id}`} 
                        consolidation={consolidation} 
                        onDragStart={handleDragStart}
                      />
                    ))}
                  </>
                )}

                {column.id === 'international' && activeShipments.map(shipment => (
                  <ShipmentCard 
                    key={shipment.id} 
                    shipment={shipment}
                    consolidation={consolidations.find(c => c.id === shipment.consolidationId)}
                    onDragStart={handleDragStart}
                  />
                ))}

                {column.id === 'delivered' && deliveredShipments.map(shipment => (
                  <ShipmentCard 
                    key={shipment.id} 
                    shipment={shipment}
                    consolidation={consolidations.find(c => c.id === shipment.consolidationId)}
                    isDelivered={true}
                  />
                ))}

                {/* Empty State */}
                {column.count === 0 && (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    {column.icon}
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                      No items
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
