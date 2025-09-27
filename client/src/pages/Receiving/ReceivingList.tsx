import { useState, useEffect, useMemo, memo, useCallback, ReactNode, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { FixedSizeList as List, VariableSizeList } from "react-window";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  Package, 
  Search, 
  Plus, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  Truck,
  Calendar,
  MapPin,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Package2,
  FileText,
  AlertTriangle,
  ScanLine,
  Filter,
  Users,
  CheckSquare,
  Square,
  Zap,
  CreditCard,
  UserCheck,
  Plane,
  Ship,
  Train,
  Star,
  Container,
  Warehouse,
  Layers,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  CalendarDays,
  Weight,
  Hash,
  MoreHorizontal,
  Undo2,
  X,
  Loader2,
  Trash2,
  Eye,
  User
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { format, differenceInHours, differenceInDays, isToday, isYesterday, isThisWeek, isThisMonth } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

// Memoized status icon component to avoid recreating functions on every render
const StatusIcon = memo(({ status }: { status: string }): ReactNode => {
  switch(status) {
    case 'complete':
      return <CheckCircle className="h-3.5 w-3.5 text-green-600" />;
    case 'partial':
      return <AlertCircle className="h-3.5 w-3.5 text-amber-600" />;
    case 'damaged':
      return <AlertTriangle className="h-3.5 w-3.5 text-red-600" />;
    case 'missing':
      return <AlertCircle className="h-3.5 w-3.5 text-red-600" />;
    default:
      return <Clock className="h-3.5 w-3.5 text-gray-400" />;
  }
});
StatusIcon.displayName = 'StatusIcon';

// Memoized item row component for performance
const ReceiptItemRow = memo(({
  item,
  receiptItem,
  index
}: {
  item: any;
  receiptItem: any;
  index: number;
}) => {
  const receivedQty = receiptItem?.receivedQuantity || 0;
  const expectedQty = receiptItem?.expectedQuantity || item.quantity || 0;
  const status = receiptItem?.status || 'pending';
  const progressPercent = expectedQty > 0 ? Math.round((receivedQty / expectedQty) * 100) : 0;

  return (
    <tr 
      className={`border-b last:border-b-0 hover:bg-muted/30 transition-colors ${
        index % 2 === 0 ? 'bg-background' : 'bg-muted/10'
      }`}
    >
      <td className="px-2 py-1 max-w-[200px]">
        <span className="font-medium truncate block" title={item.name}>
          {item.name}
        </span>
      </td>
      <td className="px-2 py-1 text-center">
        <div className="flex items-center justify-center gap-1">
          <span className={`font-semibold ${
            receivedQty === expectedQty ? 'text-green-600' : 
            receivedQty > 0 ? 'text-amber-600' : 'text-muted-foreground'
          }`}>
            {receivedQty}
          </span>
          <span className="text-muted-foreground">/</span>
          <span className="text-muted-foreground">{expectedQty}</span>
        </div>
      </td>
      <td className="px-2 py-1">
        <div className="flex items-center gap-1.5">
          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all ${
                progressPercent === 100 ? 'bg-green-600' :
                progressPercent > 0 ? 'bg-amber-600' : 'bg-gray-300'
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <span className={`text-xs font-medium ${
            progressPercent === 100 ? 'text-green-600' :
            progressPercent > 0 ? 'text-amber-600' : 'text-muted-foreground'
          }`}>
            {progressPercent}%
          </span>
        </div>
      </td>
      <td className="px-2 py-1 text-center">
        <div className="flex items-center justify-center gap-1">
          <StatusIcon status={status} />
          <span className={`text-xs font-medium ${
            status === 'complete' ? 'text-green-600' :
            status === 'partial' ? 'text-amber-600' :
            status === 'damaged' || status === 'missing' ? 'text-red-600' :
            'text-muted-foreground'
          }`}>
            {status === 'complete' ? 'Complete' : 
             status === 'partial' ? 'Partial' : 
             status === 'damaged' ? 'Damaged' :
             status === 'missing' ? 'Missing' : 'Pending'}
          </span>
        </div>
      </td>
    </tr>
  );
});
ReceiptItemRow.displayName = 'ReceiptItemRow';

// Helper function to format shipment type display name
const formatShipmentType = (shipmentType: string) => {
  if (!shipmentType) return '';

  const isSensitive = shipmentType.includes('sensitive');
  const baseType = shipmentType.replace('_sensitive', '_general');

  const typeMap: { [key: string]: string } = {
    'air_ddp_general': 'Air DDP',
    'express_general': 'Express',
    'railway_general': 'Railway',
    'sea_general': 'Sea Freight'
  };

  const label = typeMap[baseType] || shipmentType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  return isSensitive ? `${label} (Sensitive)` : label;
};

// Helper function to get shipment type icon
const getShipmentTypeIcon = (shipmentType: string, className = "h-3 w-3") => {
  const isSensitive = shipmentType?.includes('sensitive');

  if (shipmentType?.includes('express')) {
    const iconColor = isSensitive ? 'text-orange-500' : 'text-red-500';
    return <Zap className={`${className} ${iconColor}`} />;
  } else if (shipmentType?.includes('air')) {
    const iconColor = isSensitive ? 'text-blue-600' : 'text-blue-500';
    return <Plane className={`${className} ${iconColor}`} />;
  } else if (shipmentType?.includes('railway') || shipmentType?.includes('rail')) {
    const iconColor = isSensitive ? 'text-purple-600' : 'text-purple-500';
    return <Train className={`${className} ${iconColor}`} />;
  } else if (shipmentType?.includes('sea')) {
    const iconColor = isSensitive ? 'text-indigo-500' : 'text-teal-500';
    return <Ship className={`${className} ${iconColor}`} />;
  }
  return <Package className={`${className} text-muted-foreground`} />;
};

// Helper function to get carrier logo/icon
const getCarrierLogo = (carrierName: string, className = "h-4 w-4") => {
  const carrier = carrierName?.toLowerCase() || '';

  // For now using text-based logos until actual carrier logos are implemented
  if (carrier.includes('dhl')) {
    return <span className={`${className.replace('h-4 w-4', '')} text-xs font-bold text-red-600 bg-yellow-100 dark:bg-yellow-900 px-1.5 py-0.5 rounded`}>DHL</span>;
  } else if (carrier.includes('fedex')) {
    return <span className={`${className.replace('h-4 w-4', '')} text-xs font-bold text-white bg-purple-600 px-1.5 py-0.5 rounded`}>FDX</span>;
  } else if (carrier.includes('ups')) {
    return <span className={`${className.replace('h-4 w-4', '')} text-xs font-bold text-white bg-amber-700 px-1.5 py-0.5 rounded`}>UPS</span>;
  } else if (carrier.includes('usps')) {
    return <span className={`${className.replace('h-4 w-4', '')} text-xs font-bold text-white bg-blue-600 px-1.5 py-0.5 rounded`}>USPS</span>;
  } else if (carrier.includes('post')) {
    return <span className={`${className.replace('h-4 w-4', '')} text-xs font-bold text-white bg-blue-500 px-1.5 py-0.5 rounded`}>POST</span>;
  } else if (carrier.includes('sf')) {
    return <span className={`${className.replace('h-4 w-4', '')} text-xs font-bold text-white bg-green-600 px-1.5 py-0.5 rounded`}>SF</span>;
  } else if (carrier.includes('ems')) {
    return <span className={`${className.replace('h-4 w-4', '')} text-xs font-bold text-white bg-red-600 px-1.5 py-0.5 rounded`}>EMS</span>;
  } else if (carrier.includes('dpd')) {
    return <span className={`${className.replace('h-4 w-4', '')} text-xs font-bold text-white bg-red-500 px-1.5 py-0.5 rounded`}>DPD</span>;
  } else if (carrier.includes('gls')) {
    return <span className={`${className.replace('h-4 w-4', '')} text-xs font-bold text-white bg-red-400 px-1.5 py-0.5 rounded`}>GLS</span>;
  } else if (carrier.includes('ppl')) {
    return <span className={`${className.replace('h-4 w-4', '')} text-xs font-bold text-white bg-orange-500 px-1.5 py-0.5 rounded`}>PPL</span>;
  } else if (carrier.includes('zásilkovna')) {
    return <span className={`${className.replace('h-4 w-4', '')} text-xs font-bold text-white bg-green-500 px-1.5 py-0.5 rounded`}>Z-BOX</span>;
  }
  return <Truck className={`${className} text-muted-foreground`} />;
};

// Helper function to get unit type icon
const getUnitTypeIcon = (unitType: string, className = "h-3 w-3") => {
  const unit = unitType?.toLowerCase() || '';

  if (unit.includes('pallet')) {
    return <Layers className={`${className} text-amber-600`} />;
  } else if (unit.includes('container')) {
    return <Container className={`${className} text-blue-600`} />;
  } else if (unit.includes('parcel') || unit.includes('package')) {
    return <Package2 className={`${className} text-green-600`} />;
  } else if (unit.includes('piece')) {
    return <Package className={`${className} text-purple-600`} />;
  }
  return <Package className={`${className} text-muted-foreground`} />;
};

// Memoized skeleton component for shipment cards
const ShipmentCardSkeleton = memo(() => (
  <Card className="border">
    <CardContent className="p-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 sm:gap-3 flex-1">
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-5 w-5" />
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-16" />
            </div>
            <Skeleton className="h-3 w-48" />
          </div>
        </div>
        <Skeleton className="h-9 w-32" />
      </div>
      <div className="flex items-center gap-6 text-sm mb-3 sm:pl-11">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-28" />
      </div>
    </CardContent>
  </Card>
));
ShipmentCardSkeleton.displayName = 'ShipmentCardSkeleton';

// Memoized shipment card component for virtualized list
const ShipmentCard = memo(({ 
  shipment, 
  isExpanded, 
  selectedShipments, 
  toggleShipmentSelection, 
  expandedShipments, 
  setExpandedShipments,
  getStatusColor 
}: any) => {
  const handleExpand = useCallback(() => {
    const newExpanded = new Set(expandedShipments);
    if (isExpanded) {
      newExpanded.delete(shipment.id);
    } else {
      newExpanded.add(shipment.id);
    }
    setExpandedShipments(newExpanded);
  }, [isExpanded, shipment.id, expandedShipments, setExpandedShipments]);

  return (
    <Card className="border hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        {/* Shipment Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
          <div className="flex items-center gap-2 sm:gap-3 flex-1">
            <Button
              variant="ghost"
              size="sm"
              className="p-1"
              onClick={handleExpand}
              data-testid={`button-toggle-${shipment.id}`}
            >
              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
            <Checkbox
              checked={selectedShipments.has(shipment.id)}
              onCheckedChange={() => toggleShipmentSelection(shipment.id)}
              data-testid={`checkbox-shipment-${shipment.id}`}
            />
            <div className="flex-1">
              {/* First Row: Title and Status */}
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-sm sm:text-base">
                  {shipment.shipmentName || `Shipment #${shipment.id}`}
                </h3>
                <Badge className={getStatusColor(shipment.status)}>
                  {shipment.status?.replace('_', ' ').toUpperCase()}
                </Badge>
              </div>

              {/* Second Row: Shipment Type, Carrier, Units */}
              <div className="flex flex-wrap items-center gap-2 text-sm font-medium text-foreground mt-2">
                {(shipment.shipmentType || shipment.shippingMethod || shipment.consolidation?.shippingMethod) && (
                  <>
                    <Badge variant="secondary" className="text-xs flex items-center gap-1">
                      {getShipmentTypeIcon(shipment.shipmentType || shipment.shippingMethod || shipment.consolidation?.shippingMethod || '')}
                      {formatShipmentType(shipment.shipmentType || shipment.shippingMethod || shipment.consolidation?.shippingMethod || '')}
                    </Badge>
                    <span className="text-muted-foreground">•</span>
                  </>
                )}
                <span className="font-semibold">
                  {shipment.endCarrier || shipment.carrier}
                </span>
                <span className="text-muted-foreground">•</span>
                <span className="flex items-center gap-1">
                  {getUnitTypeIcon(shipment.unitType || 'items')}
                  {shipment.totalUnits} {shipment.unitType || 'items'}
                </span>
              </div>

              {/* Third Row: Route and Tracking */}
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mt-1">
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {shipment.origin?.split(',')[0]} - {shipment.destination?.split(',')[0]}
                </span>
                <span>•</span>
                <span className="font-mono">Tracking: {shipment.trackingNumber}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <Link href={`/receiving/start/${shipment.id}`}>
              <Button 
                size="sm" 
                className="bg-sky-600 hover:bg-sky-700 text-white shadow-sm hover:shadow-md transition-all"
              >
                <Plus className="h-4 w-4 mr-1" />
                Start Receiving
              </Button>
            </Link>
          </div>
        </div>

        {/* Additional Info Bar */}
        <div className="flex flex-wrap items-center gap-3 sm:gap-6 text-xs sm:text-sm mb-3 sm:pl-11">
          {shipment.consolidation?.warehouse && (
            <div className="flex items-center gap-1">
              <Warehouse className="h-3 w-3 text-muted-foreground" />
              <span className="text-muted-foreground">
                {shipment.consolidation.warehouse}
              </span>
            </div>
          )}
          {shipment.estimatedDelivery && (
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3 text-muted-foreground" />
              <span className="text-muted-foreground">
                Est: {format(new Date(shipment.estimatedDelivery), 'MMM dd')}
              </span>
            </div>
          )}
          {shipment.actualWeight && (
            <div className="flex items-center gap-1">
              <Package2 className="h-3 w-3 text-muted-foreground" />
              <span className="font-semibold">
                Weight: {shipment.actualWeight} kg
              </span>
            </div>
          )}
        </div>

        {/* Items Table - Only visible when expanded */}
        {isExpanded && (
          <div className="sm:pl-11">
            {(!shipment.items || shipment.items.length === 0) ? (
              <div className="text-center py-6 bg-muted/30 rounded-lg">
                <p className="text-muted-foreground text-sm">No items details available</p>
              </div>
            ) : (
              <div className="rounded-lg border bg-card overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b bg-muted/50">
                    <tr>
                      <th className="p-2 text-left font-medium">Item</th>
                      <th className="p-2 text-left font-medium">SKU</th>
                      <th className="p-2 text-center font-medium">Quantity</th>
                      <th className="p-2 text-left font-medium">Category</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {shipment.items.map((item: any, index: number) => (
                      <tr key={index} className="hover:bg-muted/30">
                        <td className="p-2">{item.name}</td>
                        <td className="p-2 font-mono text-xs">{item.sku || '-'}</td>
                        <td className="p-2 text-center">{item.quantity}</td>
                        <td className="p-2">{item.category || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Notes */}
        {shipment.notes && isExpanded && (
          <div className="mt-3 sm:pl-11">
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Notes:</p>
              <p className="text-sm">{shipment.notes}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
});
ShipmentCard.displayName = 'ShipmentCard';

export default function ReceivingList() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("to-receive");
  const [selectedShipments, setSelectedShipments] = useState<Set<number>>(new Set());
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [barcodeScan, setBarcodeScan] = useState("");
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [expandedShipments, setExpandedShipments] = useState<Set<number>>(new Set());
  const [sortBy, setSortBy] = useState("deliveredAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [carrierFilter, setCarrierFilter] = useState("all");
  const [shipmentTypeFilter, setShipmentTypeFilter] = useState("all"); // Added shipmentTypeFilter
  const [cartonTypeFilter, setCartonTypeFilter] = useState("all"); // Packaging type filter (boxes/pallets/etc.)
  const [warehouseFilter, setWarehouseFilter] = useState("all"); // Warehouse filter
  const [expandAllReceiving, setExpandAllReceiving] = useState(true);
  const [receiptDataMap, setReceiptDataMap] = useState<Map<number, any>>(new Map());
  const [showFilters, setShowFilters] = useState(false);

  // Move back confirmation dialog state
  const [showMoveBackDialog, setShowMoveBackDialog] = useState(false);
  const [shipmentToMoveBack, setShipmentToMoveBack] = useState<number | null>(null);

  // Comprehensive barcode scanning state
  const [scannedTrackingNumbers, setScannedTrackingNumbers] = useState<Array<{ number: string; timestamp: Date }>>([]); 
  const [scanInput, setScanInput] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchMessage, setSearchMessage] = useState("");
  const [showShipmentSelectionDialog, setShowShipmentSelectionDialog] = useState(false);
  const [matchedShipments, setMatchedShipments] = useState<any[]>([]);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const scanInputRef = useRef<HTMLInputElement>(null);

  const { toast } = useToast();
  const [, navigate] = useLocation();

  // Mutation to move shipment back to receivable status
  const moveBackToReceiveMutation = useMutation({
    mutationFn: async ({ shipmentId, preserveData }: { shipmentId: number; preserveData: boolean }) => {
      const response = await fetch(`/api/imports/shipments/${shipmentId}/move-back-to-receive`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ preserveData })
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to move shipment back');
      }
      return response.json();
    },
    onSuccess: (data, { preserveData }) => {
      toast({
        title: "Shipment Moved",
        description: `Shipment moved back to 'To Receive' status${preserveData ? ' (data preserved)' : ' (data deleted)'} successfully`
      });
      // Invalidate both receiving and receivable queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/imports/shipments/by-status/receiving'] });
      queryClient.invalidateQueries({ queryKey: ['/api/imports/shipments/receivable'] });
      queryClient.invalidateQueries({ queryKey: ['/api/imports/receipts'] });
      setShowMoveBackDialog(false);
      setShipmentToMoveBack(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to move shipment back",
        variant: "destructive"
      });
    }
  });

  // Fetch shipments ready to receive with smart caching
  const { data: toReceiveShipments = [], isLoading: isLoadingToReceive } = useQuery({
    queryKey: ['/api/imports/shipments/receivable'],
    queryFn: async () => {
      const response = await fetch('/api/imports/shipments/receivable');
      if (!response.ok) throw new Error('Failed to fetch receivable shipments');
      return response.json();
    },
    staleTime: 30 * 1000, // 30 seconds - shipments don't change that frequently
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
    refetchOnWindowFocus: false, // Prevent refetch on window focus
    refetchOnMount: true // Only refetch if stale
  });

  // Fetch shipments currently being received with receipt data (optimized with parallel fetching)
  const { data: receivingShipments = [], isLoading: isLoadingReceiving, refetch: refetchReceiving } = useQuery({
    queryKey: ['/api/imports/shipments/by-status/receiving'],
    queryFn: async () => {
      const response = await fetch('/api/imports/shipments/by-status/receiving');
      if (!response.ok) throw new Error('Failed to fetch receiving shipments');
      const shipments = await response.json();

      // Parallel fetch receipt data for all shipments at once (much faster!)
      const receiptsPromises = shipments.map((shipment: any) => 
        fetch(`/api/imports/receipts/by-shipment/${shipment.id}`)
          .then(res => res.ok ? res.json() : null)
          .then(data => ({ shipmentId: shipment.id, receiptData: data }))
          .catch(error => {
            console.error(`Error fetching receipt for shipment ${shipment.id}:`, error);
            return { shipmentId: shipment.id, receiptData: null };
          })
      );

      // Wait for all promises to resolve in parallel
      const receipts = await Promise.all(receiptsPromises);

      // Build the receipt map more efficiently
      const newReceiptMap = new Map(
        receipts
          .filter(({ receiptData }) => receiptData !== null)
          .map(({ shipmentId, receiptData }) => [shipmentId, receiptData])
      );

      setReceiptDataMap(newReceiptMap);

      return shipments;
    },
    staleTime: 15 * 1000, // 15 seconds - receiving status changes more frequently
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
    refetchOnWindowFocus: false, // Prevent refetch on window focus
    refetchOnMount: true // Only refetch if stale
  });

  // Fetch shipments ready for storage with caching
  const { data: storageShipments = [], isLoading: isLoadingStorage } = useQuery({
    queryKey: ['/api/imports/shipments/by-status/pending_approval'],
    queryFn: async () => {
      const response = await fetch('/api/imports/shipments/by-status/pending_approval');
      if (!response.ok) throw new Error('Failed to fetch storage shipments');
      return response.json();
    },
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: true
  });

  // Fetch completed shipments with longer caching (they don't change)
  const { data: completedShipments = [], isLoading: isLoadingCompleted } = useQuery({
    queryKey: ['/api/imports/shipments/by-status/completed'],
    queryFn: async () => {
      const response = await fetch('/api/imports/shipments/by-status/completed');
      if (!response.ok) throw new Error('Failed to fetch completed shipments');
      return response.json();
    },
    staleTime: 60 * 1000, // 60 seconds - completed shipments rarely change
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: true
  });

  // Expand/Collapse All functions
  const expandAllShipments = () => {
    const allIds = new Set(sortedShipments.map((s: any) => s.id));
    setExpandedShipments(allIds);
  };

  const collapseAllShipments = () => {
    setExpandedShipments(new Set());
  };

  // Fetch all receipts with smart caching
  const { data: receipts = [], isLoading: isLoadingReceipts } = useQuery({
    queryKey: ['/api/imports/receipts'],
    queryFn: async () => {
      const response = await fetch('/api/imports/receipts');
      if (!response.ok) throw new Error('Failed to fetch receipts');
      return response.json();
    },
    staleTime: 30 * 1000, // 30 seconds - receipts list doesn't change frequently
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
    refetchOnWindowFocus: false, // Prevent refetch on window focus
    refetchOnMount: true // Only refetch if stale
  });

  // Helper function to determine if shipment is urgent (removed functionality)
  const isUrgent = useCallback((_shipment: any) => {
    return false; // Always false to remove urgent functionality
  }, []);

  // Get the current shipments based on active tab - wrapped in useMemo for consistent hook ordering
  const currentShipments = useMemo<any[]>(() => {
    switch (activeTab) {
      case 'to-receive':
        return toReceiveShipments || [];
      case 'receiving':
        return receivingShipments || [];
      case 'storage':
        return storageShipments || [];
      case 'completed':
        return completedShipments || [];
      default:
        return toReceiveShipments || [];
    }
  }, [activeTab, toReceiveShipments, receivingShipments, storageShipments, completedShipments]);

  // Get unique carriers from shipments - wrapped in useMemo for consistent hook ordering
  const uniqueCarriers = useMemo<string[]>(() => {
    return Array.from(new Set(
      currentShipments
        .map((s: any) => String(s.endCarrier || s.carrier || ''))
        .filter((carrier: string) => carrier.length > 0)
    )).sort();
  }, [currentShipments]);

  // Get unique shipment types from shipments - wrapped in useMemo for consistent hook ordering
  const uniqueShipmentTypes = useMemo<string[]>(() => {
    return Array.from(new Set(
      currentShipments
        .map((s: any) => String(s.shipmentType || 'N/A'))
        .filter((type: string) => type.length > 0)
    )).sort();
  }, [currentShipments]);

  // Get unique packaging types (unitType) from shipments - wrapped in useMemo for consistent hook ordering
  const uniqueCartonTypes = useMemo<string[]>(() => {
    return Array.from(new Set(
      currentShipments
        .map((s: any) => String(s.unitType || 'items'))
        .filter((type: string) => type.length > 0)
    )).sort();
  }, [currentShipments]);

  // Get unique warehouses from shipments - wrapped in useMemo for consistent hook ordering
  const uniqueWarehouses = useMemo<string[]>(() => {
    return Array.from(new Set(
      currentShipments
        .map((s: any) => s.consolidation?.warehouse)
        .filter((warehouse: string | undefined) => warehouse && warehouse.length > 0)
    )).sort() as string[];
  }, [currentShipments]);

  // Filter shipments based on all filters
  const filteredShipments = useMemo(() => {
    let shipmentsData = [];
    switch (activeTab) {
      case 'to-receive':
        shipmentsData = toReceiveShipments;
        break;
      case 'receiving':
        shipmentsData = receivingShipments;
        break;
      case 'storage':
        shipmentsData = storageShipments;
        break;
      case 'completed':
        shipmentsData = completedShipments;
        break;
      default:
        shipmentsData = toReceiveShipments;
    }

    if (!shipmentsData) return [];

    let filtered = shipmentsData.filter((shipment: any) => {
      // Type filter
      if (shipmentTypeFilter !== 'all' && shipment.shipmentType !== shipmentTypeFilter) {
        return false;
      }

      // Priority filter
      if (priorityFilter !== 'all') {
        const shipmentIsUrgent = isUrgent(shipment);

        if (priorityFilter === 'urgent' && !shipmentIsUrgent) return false;
        if (priorityFilter === 'normal' && shipmentIsUrgent) return false;
      }

      // Search filter
      if (searchQuery) {
        const searchLower = searchQuery.toLowerCase();
        return (
          shipment.shipmentName?.toLowerCase().includes(searchLower) ||
          shipment.trackingNumber?.toLowerCase().includes(searchLower) ||
          shipment.carrier?.toLowerCase().includes(searchLower) ||
          shipment.consolidation?.name?.toLowerCase().includes(searchLower)
        );
      }

      // Carrier filter
      if (carrierFilter !== 'all' && (shipment.endCarrier || shipment.carrier) !== carrierFilter) {
        return false;
      }

      // Packaging type filter (unitType)
      if (cartonTypeFilter !== 'all' && (shipment.unitType || 'items') !== cartonTypeFilter) {
        return false;
      }

      // Warehouse filter
      if (warehouseFilter !== 'all' && shipment.consolidation?.warehouse !== warehouseFilter) {
        return false;
      }

      return true;
    });

    return filtered;
  }, [
    activeTab, 
    toReceiveShipments, 
    receivingShipments, 
    storageShipments, 
    completedShipments, 
    searchQuery, 
    priorityFilter, 
    carrierFilter, 
    shipmentTypeFilter, 
    cartonTypeFilter,
    warehouseFilter,
    isUrgent
  ]);

  // Sort filtered shipments
  const sortedShipments = useMemo(() => {
    return [...filteredShipments].sort((a: any, b: any) => {
      let aValue, bValue;

      switch (sortBy) {
        case "deliveredAt":
          aValue = a.deliveredAt ? new Date(a.deliveredAt).getTime() : 0;
          bValue = b.deliveredAt ? new Date(b.deliveredAt).getTime() : 0;
          break;
        case "shipmentName":
          aValue = a.shipmentName || `Shipment #${a.id}`;
          bValue = b.shipmentName || `Shipment #${b.id}`;
          break;
        case "carrier":
          aValue = a.endCarrier || a.carrier || '';
          bValue = b.endCarrier || b.carrier || '';
          break;
        case "urgency":
          aValue = isUrgent(a) ? 1 : 0;
          bValue = isUrgent(b) ? 1 : 0;
          break;
        case "totalUnits":
          aValue = a.totalUnits || 0;
          bValue = b.totalUnits || 0;
          break;
        case "weight":
          aValue = a.actualWeight || 0;
          bValue = b.actualWeight || 0;
          break;
        case "estimatedDelivery":
          aValue = a.estimatedDelivery ? new Date(a.estimatedDelivery).getTime() : 0;
          bValue = b.estimatedDelivery ? new Date(b.estimatedDelivery).getTime() : 0;
          break;
        default:
          aValue = a.id;
          bValue = b.id;
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortOrder === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      return sortOrder === 'asc'
        ? (aValue > bValue ? 1 : -1)
        : (bValue > aValue ? 1 : -1);
    });
  }, [filteredShipments, sortBy, sortOrder, isUrgent]);

  // Barcode scanning functionality
  const handleBarcodeInput = useCallback((value: string) => {
    setScanInput(value);

    // Check if Enter was pressed (value ends with \n or we detect a complete barcode)
    if (value.length > 0 && (value.includes('\n') || value.length >= 10)) {
      const cleanedValue = value.trim().replace(/\n/g, '');

      if (cleanedValue) {
        // Check for duplicate
        const isDuplicate = scannedTrackingNumbers.some(scan => scan.number === cleanedValue);

        if (!isDuplicate) {
          // Add to scanned list
          const newScan = { number: cleanedValue, timestamp: new Date() };
          setScannedTrackingNumbers(prev => [...prev, newScan]);

          // Clear input
          setScanInput("");

          // Clear any existing timeout
          if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
          }

          // Set up debounced search
          setSearchMessage("Searching for matching shipments...");
          searchTimeoutRef.current = setTimeout(() => {
            searchForShipments([...scannedTrackingNumbers, newScan]);
          }, 400);
        } else {
          toast({
            title: "Duplicate Scan",
            description: `Tracking number ${cleanedValue} already scanned`,
            variant: "destructive"
          });
          setScanInput("");
        }
      }
    }
  }, [scannedTrackingNumbers, toast]);

  // Search for shipments by tracking numbers
  const searchForShipments = useCallback(async (scans: Array<{ number: string; timestamp: Date }>) => {
    if (scans.length === 0) return;

    setIsSearching(true);
    try {
      const trackingNumbers = scans.map(s => s.number);
      const response = await fetch('/api/imports/shipments/search-by-tracking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trackingNumbers })
      });

      if (!response.ok) {
        throw new Error('Failed to search shipments');
      }

      const shipments = await response.json();

      if (shipments.length === 0) {
        setSearchMessage("No matches yet, keep scanning");
      } else if (shipments.length === 1) {
        // Auto-navigate to continue receiving
        navigate(`/receiving/continue/${shipments[0].id}`, {
          state: {
            scannedTrackingNumbers: trackingNumbers,
            scannedParcels: trackingNumbers.length
          }
        });
      } else {
        // Show selection dialog
        setMatchedShipments(shipments);
        setShowShipmentSelectionDialog(true);
      }
    } catch (error) {
      console.error('Search error:', error);
      setSearchMessage("Error searching for shipments");
    } finally {
      setIsSearching(false);
    }
  }, [navigate]);

  // Remove a scanned tracking number
  const removeScannedTracking = useCallback((numberToRemove: string) => {
    setScannedTrackingNumbers(prev => prev.filter(scan => scan.number !== numberToRemove));
    // Clear search message if no more tracking numbers
    if (scannedTrackingNumbers.length === 1) {
      setSearchMessage("");
    }
  }, [scannedTrackingNumbers]);

  // Clear all scanned tracking numbers
  const clearAllScans = useCallback(() => {
    setScannedTrackingNumbers([]);
    setScanInput("");
    setSearchMessage("");
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
  }, []);

  // Handle shipment selection from dialog
  const handleShipmentSelection = useCallback((shipmentId: number) => {
    const trackingNumbers = scannedTrackingNumbers.map(s => s.number);
    navigate(`/receiving/continue/${shipmentId}`, {
      state: {
        scannedTrackingNumbers: trackingNumbers,
        scannedParcels: trackingNumbers.length
      }
    });
    setShowShipmentSelectionDialog(false);
  }, [scannedTrackingNumbers, navigate]);

  // Auto-focus scan input when component mounts
  useEffect(() => {
    if (scanInputRef.current) {
      scanInputRef.current.focus();
    }
  }, []);

  // Handle barcode scan from legacy barcode field
  useEffect(() => {
    if (barcodeScan) {
      handleBarcodeInput(barcodeScan + '\n');
      setBarcodeScan("");
    }
  }, [barcodeScan, handleBarcodeInput]);

  // Auto-expand all shipments in receiving tab
  useEffect(() => {
    if (receivingShipments && receivingShipments.length > 0 && expandAllReceiving) {
      const allReceivingIds = new Set<number>(receivingShipments.map((s: any) => s.id));
      setExpandedShipments(allReceivingIds);
    }
  }, [receivingShipments, expandAllReceiving]);

  // Auto-expand all shipments in to-receive tab by default
  useEffect(() => {
    if (activeTab === "to-receive" && sortedShipments && sortedShipments.length > 0) {
      const allToReceiveIds = new Set<number>(sortedShipments.map((s: any) => s.id));
      setExpandedShipments(prev => new Set<number>([...Array.from(prev), ...Array.from(allToReceiveIds)]));
    }
  }, [activeTab, sortedShipments]);

  // Toggle shipment selection
  const toggleShipmentSelection = (id: number) => {
    const newSelection = new Set(selectedShipments);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedShipments(newSelection);
    setShowBulkActions(newSelection.size > 0);
  };

  // Select all visible shipments
  const selectAllShipments = () => {
    const allIds = new Set<number>(sortedShipments.map((s: any) => s.id));
    setSelectedShipments(allIds);
    setShowBulkActions(allIds.size > 0);
  };

  // Clear selection
  const clearSelection = () => {
    setSelectedShipments(new Set());
    setShowBulkActions(false);
  };

  // Filter receipts based on search
  const filteredReceipts = receipts.filter((receipt: any) =>
    searchQuery === "" ||
    receipt.shipment?.shipmentName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    receipt.shipment?.trackingNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    receipt.carrier?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Group receipts by status
  const pendingVerification = receipts.filter((r: any) => r.status === 'pending_verification');
  const pendingApproval = receipts.filter((r: any) => r.status === 'pending_approval');
  const approved = receipts.filter((r: any) => r.status === 'approved');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'in transit':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'pending_verification':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'pending_approval':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      case 'approved':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const getReceiptStatusIcon = (status: string) => {
    switch (status) {
      case 'pending_verification':
        return <Clock className="h-4 w-4" />;
      case 'pending_approval':
        return <AlertCircle className="h-4 w-4" />;
      case 'approved':
        return <CheckCircle className="h-4 w-4" />;
      default:
        return <Package className="h-4 w-4" />;
    }
  };

  const ShipmentCard = ({ shipment, hasReceipt = false }: any) => {
    const urgent = isUrgent(shipment); // Use the isUrgent function

    return (
      <Card className={`hover:shadow-md transition-shadow ${urgent ? 'border-orange-300 bg-orange-50/50 dark:bg-orange-950/20' : ''}`}>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            {!hasReceipt && (
              <Checkbox
                checked={selectedShipments.has(shipment.id)}
                onCheckedChange={() => toggleShipmentSelection(shipment.id)}
                className="mt-1"
                data-testid={`checkbox-shipment-${shipment.id}`}
              />
            )}
            <div className="flex-1">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-lg">
                      {shipment.shipmentName || `Shipment #${shipment.id}`}
                    </h3>
                    {urgent && (
                      <Badge variant="destructive" className="animate-pulse">
                        <Zap className="h-3 w-3 mr-1" />
                        Urgent
                      </Badge>
                    )}
                    <Badge className={getStatusColor(shipment.status)}>
                      {shipment.status?.replace('_', ' ').toUpperCase()}
                    </Badge>
                    {hasReceipt && (
                      <Badge variant="outline" className="bg-blue-50 border-blue-300 text-blue-700">
                        <FileText className="h-3 w-3 mr-1" />
                        Receipt Started
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {shipment.trackingNumber} • {shipment.carrier || shipment.endCarrier}
                  </p>
                </div>
                <div className="text-right">
                  {shipment.estimatedDelivery && (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {format(new Date(shipment.estimatedDelivery), 'MMM dd')}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1">
                    <MapPin className="h-3 w-3 text-muted-foreground" />
                    <span>{shipment.origin}</span>
                  </div>
                  <ChevronRight className="h-3 w-3 text-muted-foreground" />
                  <div className="flex items-center gap-1">
                    <MapPin className="h-3 w-3 text-muted-foreground" />
                    <span>{shipment.destination}</span>
                  </div>
                </div>
              </div>

              {shipment.consolidation && (
                <div className="mt-3 p-2 bg-gray-50 dark:bg-gray-900 rounded">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <Package2 className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{shipment.consolidation.name}</span>
                      <Badge variant="secondary" className="text-xs">
                        {shipment.consolidation.shippingMethod?.replace(/_/g, ' ').toUpperCase()}
                      </Badge>
                    </div>
                    <span className="text-muted-foreground">
                      {shipment.totalUnits} {shipment.unitType || 'items'}
                    </span>
                  </div>
                </div>
              )}

              <div className="mt-3 flex gap-2">
                {!hasReceipt ? (
                  <Link href={`/receiving/start/${shipment.id}`}>
                    <Button size="sm" className="w-full">
                      <Plus className="h-4 w-4 mr-2" />
                      Start Receiving
                    </Button>
                  </Link>
                ) : (
                  <Link href={`/receiving/receipt/${shipment.receiptId}`}>
                    <Button size="sm" variant="outline" className="w-full">
                      <FileText className="h-4 w-4 mr-2" />
                      View Receipt
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const ReceiptCard = ({ receipt }: any) => (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold">
                Receipt #{receipt.id}
              </h3>
              <Badge className={getStatusColor(receipt.status)}>
                <span className="flex items-center gap-1">
                  {getReceiptStatusIcon(receipt.status)}
                  {receipt.status?.replace(/_/g, ' ').toUpperCase()}
                </span>
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {receipt.shipment?.shipmentName || `Shipment #${receipt.shipmentId}`}
            </p>
          </div>
          <div className="text-right text-sm text-muted-foreground">
            <div>{format(new Date(receipt.receivedAt), 'MMM dd, yyyy')}</div>
            <div>{format(new Date(receipt.receivedAt), 'HH:mm')}</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 text-sm mb-3">
          <div>
            <span className="text-muted-foreground">Parcels:</span>
            <span className="ml-2 font-medium">{receipt.parcelCount}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Carrier:</span>
            <span className="ml-2 font-medium">{receipt.carrier}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Received by:</span>
            <span className="ml-2 font-medium">{receipt.receivedBy}</span>
          </div>
          {receipt.verifiedBy && (
            <div>
              <span className="text-muted-foreground">Verified by:</span>
              <span className="ml-2 font-medium">{receipt.verifiedBy}</span>
            </div>
          )}
        </div>

        {receipt.damageNotes && (
          <div className="mb-3 p-2 bg-red-50 dark:bg-red-950 rounded">
            <div className="flex items-start gap-2 text-sm">
              <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5" />
              <span className="text-red-800 dark:text-red-200">{receipt.damageNotes}</span>
            </div>
          </div>
        )}

        <Link href={`/receiving/receipt/${receipt.id}`}>
          <Button size="sm" variant="outline" className="w-full">
            View Details
            <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        </Link>
      </CardContent>
    </Card>
  );

  const isLoading = isLoadingToReceive || isLoadingReceiving || isLoadingStorage || isLoadingCompleted || isLoadingReceipts;

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Receiving</h1>
        <p className="text-muted-foreground">
          Manage incoming shipments and verify received items
        </p>
      </div>

      {/* Comprehensive Barcode Scanning Panel - Sticky at top */}
      <Card className="mb-6 sticky top-0 z-10 shadow-lg bg-background">
        <CardContent className="p-4">
          <div className="space-y-4">
            {/* Scanning Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ScanLine className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">Barcode Scanner</h3>
                <Badge variant="secondary" data-testid="badge-scan-counter">
                  {scannedTrackingNumbers.length} tracking numbers scanned
                </Badge>
              </div>
              {scannedTrackingNumbers.length > 0 && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={clearAllScans}
                  data-testid="button-clear-all-scans"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Clear All
                </Button>
              )}
            </div>

            {/* Scan Input */}
            <div className="relative">
              <ScanLine className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                ref={scanInputRef}
                placeholder="Scan or enter tracking number"
                value={scanInput}
                onChange={(e) => handleBarcodeInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && scanInput) {
                    handleBarcodeInput(scanInput + '\n');
                  }
                }}
                className="pl-10 font-mono"
                data-testid="input-scan-barcode"
                autoFocus
              />
              {isSearching && (
                <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin text-primary" />
              )}
            </div>

            {/* Search Message */}
            {searchMessage && (
              <div className="text-sm text-muted-foreground flex items-center gap-2">
                {isSearching && <Loader2 className="h-3 w-3 animate-spin" />}
                {searchMessage}
              </div>
            )}

            {/* Scanned Tracking Numbers List */}
            {scannedTrackingNumbers.length > 0 && (
              <div className="max-h-32 overflow-y-auto space-y-2 border rounded-lg p-3 bg-muted/30">
                {scannedTrackingNumbers.map((scan) => (
                  <div 
                    key={scan.number} 
                    className="flex items-center justify-between p-2 bg-background rounded-md border"
                    data-testid={`scanned-tracking-${scan.number}`}
                  >
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="font-mono text-sm">{scan.number}</span>
                      <span className="text-xs text-muted-foreground">
                        {format(scan.timestamp, 'HH:mm:ss')}
                      </span>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => removeScannedTracking(scan.number)}
                      data-testid={`button-remove-${scan.number}`}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Search and Filters */}
      <Card className="mb-6">
        <CardContent className="p-3 sm:p-4 space-y-3">
          <div className="flex gap-2 items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search shipments..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="input-search-receiving"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 whitespace-nowrap"
              data-testid="button-toggle-filters"
            >
              <Filter className="h-4 w-4" />
              <span className="hidden sm:inline">Filters</span>
              {showFilters ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </Button>
          </div>

          {/* Collapsible Filters */}
          {showFilters && (
            <div className="animate-in slide-in-from-top-2 duration-200 space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                  <SelectTrigger className="w-full">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    <SelectValue placeholder="Priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Priorities</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={carrierFilter} onValueChange={setCarrierFilter}>
                  <SelectTrigger className="w-full">
                    <Truck className="h-3 w-3 mr-1" />
                    <SelectValue placeholder="Carrier" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Carriers</SelectItem>
                    {uniqueCarriers.map(carrier => (
                      <SelectItem key={carrier} value={carrier}>
                        {carrier}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={warehouseFilter} onValueChange={setWarehouseFilter}>
                  <SelectTrigger className="w-full">
                    <Warehouse className="h-3 w-3 mr-1" />
                    <SelectValue placeholder="Warehouse" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Warehouses</SelectItem>
                    {uniqueWarehouses.map(warehouse => (
                      <SelectItem key={warehouse} value={warehouse}>
                        {warehouse}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={shipmentTypeFilter} onValueChange={setShipmentTypeFilter}>
                  <SelectTrigger className="w-full">
                    <Package className="h-3 w-3 mr-1" />
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {uniqueShipmentTypes.map(type => (
                      <SelectItem key={type} value={type}>
                        <div className="flex items-center gap-2">
                          {getShipmentTypeIcon(type, 'h-4 w-4')}
                          {formatShipmentType(type)}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={cartonTypeFilter} onValueChange={setCartonTypeFilter}>
                  <SelectTrigger className="w-full">
                    <Package2 className="h-3 w-3 mr-1" />
                    <SelectValue placeholder="Packaging" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Packaging</SelectItem>
                    {uniqueCartonTypes.map(type => (
                      <SelectItem key={type} value={type}>
                        <div className="flex items-center gap-1">
                          {getUnitTypeIcon(type, 'h-4 w-4')}
                          <span className="capitalize">{type}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Sort Controls */}
              <div className="flex gap-2 items-center justify-between">
                <div className="flex gap-2 items-center">
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="w-[140px] sm:w-[180px]">
                      <ArrowUpDown className="h-3 w-3 mr-1" />
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="deliveredAt">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Delivery Date
                        </span>
                      </SelectItem>
                      <SelectItem value="urgency">
                        <span className="flex items-center gap-1">
                          <Zap className="h-3 w-3" />
                          Urgency
                        </span>
                      </SelectItem>
                      <SelectItem value="shipmentName">
                        <span className="flex items-center gap-1">
                          <Package className="h-3 w-3" />
                          Name
                        </span>
                      </SelectItem>
                      <SelectItem value="carrier">
                        <span className="flex items-center gap-1">
                          <Truck className="h-3 w-3" />
                          Carrier
                        </span>
                      </SelectItem>
                      <SelectItem value="totalUnits">
                        <span className="flex items-center gap-1">
                          <Hash className="h-3 w-3" />
                          Units
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>

                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                    className="h-10 w-10 shrink-0"
                    data-testid="button-sort-order"
                  >
                    {sortOrder === 'asc' ? (
                      <ArrowUp className="h-4 w-4" />
                    ) : (
                      <ArrowDown className="h-4 w-4" />
                    )}
                  </Button>
                </div>

                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={expandAllShipments}
                    className="h-8 text-xs px-2"
                    disabled={sortedShipments.length === 0}
                    title="Expand all shipment details"
                  >
                    <ChevronDown className="h-3 w-3" />
                    <span className="hidden sm:inline ml-1">Expand</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={collapseAllShipments}
                    className="h-8 text-xs px-2"
                    disabled={sortedShipments.length === 0}
                    title="Collapse all shipment details"
                  >
                    <ChevronUp className="h-3 w-3" />
                    <span className="hidden sm:inline ml-1">Collapse</span>
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Results count - always visible */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {sortedShipments.length} shipment{sortedShipments.length !== 1 ? 's' : ''} found
            </span>
            {selectedShipments.size > 0 && (
              <span className="text-blue-600 font-medium">
                {selectedShipments.size} selected
              </span>
            )}
          </div>

          {/* Bulk Actions Bar */}
          {showBulkActions && (
            <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
              <div className="flex items-center gap-2">
                <CheckSquare className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium">
                  {selectedShipments.size} shipment{selectedShipments.size !== 1 ? 's' : ''} selected
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={selectAllShipments}
                  className="text-xs"
                >
                  Select All ({sortedShipments.length})
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={clearSelection}
                  className="text-xs"
                >
                  Clear
                </Button>
              </div>
              <div className="flex gap-2">
                <Link href={`/receiving/bulk-start`}>
                  <Button
                    size="sm"
                    variant="secondary"
                    data-testid="button-bulk-receive"
                  >
                    <Users className="h-4 w-4 mr-2" />
                    Bulk Receive
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </CardContent>
      </Card>


      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex gap-2 flex-wrap mb-6">
          <button
            onClick={() => setActiveTab('to-receive')}
            className={`
              flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all
              ${activeTab === 'to-receive' 
                ? 'bg-sky-600 text-white shadow-lg shadow-sky-600/20' 
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
              }
            `}
            data-testid="tab-to-receive"
          >
            <Package className="h-4 w-4" />
            <span>To Receive</span>
            <span className={`${activeTab === 'to-receive' ? 'text-white/90' : 'text-gray-500'}`}>
              ({activeTab === 'to-receive' ? sortedShipments.length : toReceiveShipments?.length || 0})
            </span>
          </button>

          <button
            onClick={() => setActiveTab('receiving')}
            className={`
              flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all
              ${activeTab === 'receiving' 
                ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/20' 
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
              }
            `}
            data-testid="tab-receiving"
          >
            <Clock className="h-4 w-4" />
            <span>Receiving</span>
            <span className={`${activeTab === 'receiving' ? 'text-white/90' : 'text-gray-500'}`}>
              ({receivingShipments.length})
            </span>
          </button>

          <button
            onClick={() => setActiveTab('storage')}
            className={`
              flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all
              ${activeTab === 'storage' 
                ? 'bg-orange-600 text-white shadow-lg shadow-orange-600/20' 
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
              }
            `}
            data-testid="tab-storage"
          >
            <Warehouse className="h-4 w-4" />
            <span>Storage</span>
            <span className={`${activeTab === 'storage' ? 'text-white/90' : 'text-gray-500'}`}>
              ({storageShipments.length})
            </span>
          </button>

          <button
            onClick={() => setActiveTab('completed')}
            className={`
              flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all
              ${activeTab === 'completed' 
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20' 
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
              }
            `}
            data-testid="tab-completed"
          >
            <CheckCircle className="h-4 w-4" />
            <span>Completed</span>
            <span className={`${activeTab === 'completed' ? 'text-white/90' : 'text-gray-500'}`}>
              ({completedShipments.length})
            </span>
          </button>
        </div>

        <TabsContent value="to-receive" className="mt-6">
          {isLoadingToReceive ? (
            <div className="space-y-4 animate-in fade-in-50 duration-500">
              {[...Array(5)].map((_, i) => (
                <ShipmentCardSkeleton key={i} />
              ))}
            </div>
          ) : sortedShipments.length === 0 ? (
            <div className="text-center py-8">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground">No shipments ready for receiving</p>
            </div>
          ) : (
            <div className="space-y-4">
              {sortedShipments
                .map((shipment: any) => {
                  const isExpanded = expandedShipments.has(shipment.id);
                  
                  // Debug: Log shipment data to verify IDs are correct
                  if (!shipment || !shipment.id) {
                    console.error('Invalid shipment in sortedShipments:', shipment);
                  }

                  return (
                    <Card key={shipment.id} id={`shipment-${shipment.id}`} className="border hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        {/* Shipment Header */}
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
                          <div className="flex items-center gap-2 sm:gap-3 flex-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="p-1"
                              onClick={() => {
                                const newExpanded = new Set(expandedShipments);
                                if (isExpanded) {
                                  newExpanded.delete(shipment.id);
                                } else {
                                  newExpanded.add(shipment.id);
                                }
                                setExpandedShipments(newExpanded);
                              }}
                              data-testid={`button-toggle-${shipment.id}`}
                            >
                              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            </Button>
                            <Checkbox
                              checked={selectedShipments.has(shipment.id)}
                              onCheckedChange={() => toggleShipmentSelection(shipment.id)}
                              data-testid={`checkbox-shipment-${shipment.id}`}
                            />
                            <div className="flex-1">
                              {/* First Row: Title and Status */}
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="font-semibold text-sm sm:text-base">
                                  {shipment.shipmentName || `Shipment #${shipment.id}`}
                                </h3>
                                <Badge className={getStatusColor(shipment.status)}>
                                  {shipment.status?.replace('_', ' ').toUpperCase()}
                                </Badge>
                              </div>

                              {/* Second Row: Shipment Type, Carrier, Units */}
                              <div className="flex flex-wrap items-center gap-2 text-sm font-medium text-foreground mt-2">
                                {(shipment.shipmentType || shipment.shippingMethod || shipment.consolidation?.shippingMethod) && (
                                  <>
                                    <Badge variant="secondary" className="text-xs flex items-center gap-1">
                                      {getShipmentTypeIcon(shipment.shipmentType || shipment.shippingMethod || shipment.consolidation?.shippingMethod || '')}
                                      {formatShipmentType(shipment.shipmentType || shipment.shippingMethod || shipment.consolidation?.shippingMethod || '')}
                                    </Badge>
                                    <span className="text-muted-foreground">•</span>
                                  </>
                                )}
                                <span className="font-semibold">
                                  {shipment.endCarrier || shipment.carrier}
                                </span>
                                <span className="text-muted-foreground">•</span>
                                <span className="flex items-center gap-1">
                                  {getUnitTypeIcon(shipment.unitType || 'items')}
                                  {shipment.totalUnits} {shipment.unitType || 'items'}
                                </span>
                              </div>

                              {/* Third Row: Route and Tracking */}
                              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mt-1">
                                <span className="flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  {shipment.origin?.split(',')[0]} - {shipment.destination?.split(',')[0]}
                                </span>
                                <span>•</span>
                                <span className="font-mono">Tracking: {shipment.trackingNumber}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-wrap justify-end">
                            <Button 
                              size="sm" 
                              className="bg-sky-600 hover:bg-sky-700 text-white shadow-sm hover:shadow-md transition-all"
                              data-testid={`button-start-receiving-${shipment.id}`}
                              onClick={() => {
                                console.log(`Starting receiving for shipment ${shipment.id}: ${shipment.shipmentName}`);
                                navigate(`/receiving/start/${shipment.id}`);
                              }}
                            >
                              <Plus className="h-4 w-4 mr-1" />
                              Start Receiving
                            </Button>
                          </div>
                        </div>

                        {/* Additional Info Bar */}
                        <div className="flex flex-wrap items-center gap-3 sm:gap-6 text-xs sm:text-sm mb-3 sm:pl-11">
                          {shipment.consolidation?.warehouse && (
                            <div className="flex items-center gap-1">
                              <Warehouse className="h-3 w-3 text-muted-foreground" />
                              <span className="text-muted-foreground">
                                {shipment.consolidation.warehouse}
                              </span>
                            </div>
                          )}
                          {shipment.estimatedDelivery && (
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3 text-muted-foreground" />
                              <span className="text-muted-foreground">
                                Est: {format(new Date(shipment.estimatedDelivery), 'MMM dd')}
                              </span>
                            </div>
                          )}
                          {shipment.actualWeight && (
                            <div className="flex items-center gap-1">
                              <Package2 className="h-3 w-3 text-muted-foreground" />
                              <span className="font-semibold">
                                Weight: {shipment.actualWeight} kg
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Items Table - Only visible when expanded */}
                        {isExpanded && (
                          <div className="sm:pl-11">
                            {(!shipment.items || shipment.items.length === 0) ? (
                              <div className="text-center py-6 bg-muted/30 rounded-lg">
                                <p className="text-muted-foreground text-sm">No items details available</p>
                              </div>
                            ) : (
                              <div className="rounded-lg border bg-card overflow-x-auto">
                                <table className="w-full text-sm">
                                  <thead className="border-b bg-muted/50">
                                    <tr>
                                      <th className="p-2 text-left font-medium">Item</th>
                                      <th className="p-2 text-left font-medium">SKU</th>
                                      <th className="p-2 text-center font-medium">Quantity</th>
                                      <th className="p-2 text-left font-medium">Category</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y">
                                    {shipment.items.map((item: any, index: number) => (
                                      <tr key={index} className="hover:bg-muted/30">
                                        <td className="p-2">{item.name}</td>
                                        <td className="p-2 font-mono text-xs">{item.sku || '-'}</td>
                                        <td className="p-2 text-center">{item.quantity}</td>
                                        <td className="p-2">{item.category || '-'}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Notes */}
                        {shipment.notes && isExpanded && (
                          <div className="mt-3 sm:pl-11">
                            <div className="p-3 bg-muted/50 rounded-lg">
                              <p className="text-xs text-muted-foreground mb-1">Notes:</p>
                              <p className="text-sm">{shipment.notes}</p>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="receiving" className="mt-6">
          {isLoadingReceiving ? (
            <div className="space-y-4 animate-in fade-in-50 duration-500">
              {[...Array(3)].map((_, i) => (
                <ShipmentCardSkeleton key={i} />
              ))}
            </div>
          ) : receivingShipments.length === 0 ? (
            <div className="text-center py-8">
              <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground">No shipments currently being received</p>
            </div>
          ) : (
            <div className="space-y-4">

              {receivingShipments.map((shipment: any) => {
                const isExpanded = expandedShipments.has(shipment.id);
                const receiptData = receiptDataMap.get(shipment.id);
                const receiptItems = receiptData?.items || [];

                // Create O(1) lookup map for receipt items by itemId for performance
                // Note: Not using useMemo here to avoid hooks rules violation in map
                const receiptItemsMap = new Map();
                receiptItems.forEach((item: any) => {
                  // Handle both string and number IDs
                  receiptItemsMap.set(String(item.itemId), item);
                });

                return (
                  <Card key={shipment.id} className="border hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div className="flex items-center gap-3 flex-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="p-1"
                            onClick={() => {
                              const newExpanded = new Set(expandedShipments);
                              if (isExpanded) {
                                newExpanded.delete(shipment.id);
                              } else {
                                newExpanded.add(shipment.id);
                              }
                              setExpandedShipments(newExpanded);
                            }}
                          >
                            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </Button>
                          <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100">
                            Currently Receiving
                          </Badge>
                          <div className="flex-1">
                            <h3 className="font-semibold">{shipment.shipmentName || `Shipment #${shipment.id}`}</h3>
                            <p className="text-sm text-muted-foreground mt-1">
                              {shipment.trackingNumber} • {shipment.endCarrier || shipment.carrier}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Link href={`/receiving/continue/${shipment.id}`}>
                            <Button size="sm" variant="outline">
                              Continue Receiving
                            </Button>
                          </Link>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem 
                                onClick={() => {
                                  setShipmentToMoveBack(shipment.id);
                                  setShowMoveBackDialog(true);
                                }}
                                disabled={moveBackToReceiveMutation.isPending}
                                className="text-orange-600 hover:text-orange-700"
                              >
                                <Undo2 className="h-4 w-4 mr-2" />
                                Move back to To Receive
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>

                      {/* Expanded Items List */}
                      {isExpanded && (
                        <div className="mt-4 sm:pl-11">
                          {(!shipment.items || shipment.items.length === 0) ? (
                            <div className="text-center py-4 bg-muted/30 rounded-lg">
                              <p className="text-muted-foreground text-sm">No items details available</p>
                            </div>
                          ) : (
                            <div className="rounded-lg border bg-card overflow-hidden">
                              <div className="p-2 border-b bg-muted/30">
                                <h4 className="text-xs font-semibold text-muted-foreground">RECEIVED ITEMS ({shipment.items.length})</h4>
                              </div>
                              {/* Use virtualization for lists with more than 20 items */}
                              {shipment.items.length > 20 ? (
                                <div>
                                  {/* Table header */}
                                  <div className="border-b bg-muted/20">
                                    <div className="grid grid-cols-[1fr,100px,80px,100px] text-xs text-muted-foreground">
                                      <div className="text-left px-2 py-1.5 font-medium">Item</div>
                                      <div className="text-center px-2 py-1.5 font-medium">Qty</div>
                                      <div className="text-center px-2 py-1.5 font-medium">Progress</div>
                                      <div className="text-center px-2 py-1.5 font-medium">Status</div>
                                    </div>
                                  </div>
                                  {/* Virtualized list for performance */}
                                  <List
                                    height={400}
                                    itemCount={shipment.items.length}
                                    itemSize={40}
                                    width="100%"
                                  >
                                    {({ index, style }) => {
                                      const item = shipment.items[index];
                                      const receiptItem = receiptItemsMap.get(String(item.id));

                                      return (
                                        <div style={style}>
                                          <ReceiptItemRow
                                            item={item}
                                            receiptItem={receiptItem}
                                            index={index}
                                          />
                                        </div>
                                      );
                                    }}
                                  </List>
                                </div>
                              ) : (
                                /* Regular table for small lists */
                                <div className="overflow-x-auto">
                                  <table className="w-full text-sm">
                                    <thead className="border-b bg-muted/20">
                                      <tr className="text-xs text-muted-foreground">
                                        <th className="text-left px-2 py-1.5 font-medium">Item</th>
                                        <th className="text-center px-2 py-1.5 font-medium min-w-[100px]">Qty</th>
                                        <th className="text-center px-2 py-1.5 font-medium min-w-[80px]">Progress</th>
                                        <th className="text-center px-2 py-1.5 font-medium">Status</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {shipment.items.map((item: any, index: number) => {
                                        // O(1) lookup for receipt data using the pre-built map
                                        const receiptItem = receiptItemsMap.get(String(item.id));

                                        return (
                                          <ReceiptItemRow 
                                            key={item.id || index}
                                            item={item}
                                            receiptItem={receiptItem}
                                            index={index}
                                          />
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="storage" className="mt-6">
          {isLoadingStorage ? (
            <div className="text-center py-8">
              <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-2 animate-pulse" />
              <p className="text-muted-foreground">Loading shipments...</p>
            </div>
          ) : storageShipments.length === 0 ? (
            <div className="text-center py-8">
              <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground">No shipments ready for storage</p>
            </div>
          ) : (
            <div className="space-y-4">
              {storageShipments.map((shipment: any) => {
                const isExpanded = expandedShipments.has(shipment.id);
                const receiptData = receiptDataMap.get(shipment.id);
                const receiptItems = receiptData?.items || [];

                // Create O(1) lookup map for receipt items by itemId
                const receiptItemsMap = new Map();
                receiptItems.forEach((item: any) => {
                  receiptItemsMap.set(String(item.itemId), item);
                });

                return (
                  <Card key={shipment.id} className="border hover:shadow-md transition-shadow border-orange-300">
                    <CardContent className="p-4">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
                        <div className="flex items-center gap-2 sm:gap-3 flex-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="p-1"
                            onClick={() => {
                              const newExpanded = new Set(expandedShipments);
                              if (isExpanded) {
                                newExpanded.delete(shipment.id);
                              } else {
                                newExpanded.add(shipment.id);
                              }
                              setExpandedShipments(newExpanded);
                            }}
                            data-testid={`button-toggle-storage-${shipment.id}`}
                          >
                            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </Button>
                          <div className="flex-1">
                            {/* First Row: Title and Status */}
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-semibold text-sm sm:text-base">
                                {shipment.shipmentName || `Shipment #${shipment.id}`}
                              </h3>
                              <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100">
                                Ready for Storage
                              </Badge>
                            </div>

                            {/* Second Row: Shipment Type, Carrier, Units */}
                            <div className="flex flex-wrap items-center gap-2 text-sm font-medium text-foreground mt-2">
                              {(shipment.shipmentType || shipment.shippingMethod || shipment.consolidation?.shippingMethod) && (
                                <>
                                  <Badge variant="secondary" className="text-xs flex items-center gap-1">
                                    {getShipmentTypeIcon(shipment.shipmentType || shipment.shippingMethod || shipment.consolidation?.shippingMethod || '')}
                                    {formatShipmentType(shipment.shipmentType || shipment.shippingMethod || shipment.consolidation?.shippingMethod || '')}
                                  </Badge>
                                  <span className="text-muted-foreground">•</span>
                                </>
                              )}
                              <span className="font-semibold">
                                {shipment.endCarrier || shipment.carrier}
                              </span>
                              <span className="text-muted-foreground">•</span>
                              <span className="flex items-center gap-1">
                                {getUnitTypeIcon(shipment.unitType || 'items')}
                                {shipment.totalUnits} {shipment.unitType || 'items'}
                              </span>
                            </div>

                            {/* Third Row: Tracking */}
                            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mt-1">
                              <span className="font-mono">Tracking: {shipment.trackingNumber}</span>
                            </div>
                          </div>
                        </div>
                        <Link href="/receiving/items-to-store">
                          <Button 
                            size="sm" 
                            className="bg-orange-600 hover:bg-orange-700 text-white shadow-sm hover:shadow-md transition-all"
                            data-testid={`button-store-items-${shipment.id}`}
                          >
                            <Warehouse className="h-4 w-4 mr-1" />
                            Store Items
                          </Button>
                        </Link>
                      </div>

                      {/* Additional Info Bar - Always visible with database info */}
                      <div className="flex flex-wrap items-center gap-3 sm:gap-6 text-xs sm:text-sm mb-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                        <div className="flex items-center gap-1">
                          <Warehouse className="h-3 w-3 text-primary" />
                          <span className="text-foreground">
                            <span className="text-muted-foreground">Warehouse:</span> 
                            <span className="ml-1 font-medium">{shipment.receivingWarehouse || 'Not specified'}</span>
                          </span>
                        </div>
                        
                        {shipment.warehouseLocation && (
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3 text-primary" />
                            <span className="text-foreground">
                              <span className="text-muted-foreground">Location:</span> 
                              <span className="ml-1 font-medium">{shipment.warehouseLocation}</span>
                            </span>
                          </div>
                        )}
                        
                        <div className="flex items-center gap-1">
                          <Package className="h-3 w-3 text-primary" />
                          <span className="text-foreground">
                            <span className="text-muted-foreground">Consolidation:</span> 
                            <span className="ml-1 font-medium">{shipment.consolidationName || 'No consolidation'}</span>
                          </span>
                        </div>
                        
                        {shipment.deliveredAt && (
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3 text-primary" />
                            <span className="text-foreground">
                              <span className="text-muted-foreground">Received:</span> 
                              <span className="ml-1 font-medium">{format(new Date(shipment.deliveredAt), 'MMM dd, HH:mm')}</span>
                            </span>
                          </div>
                        )}
                        
                        {shipment.totalWeight && (
                          <div className="flex items-center gap-1">
                            <Package2 className="h-3 w-3 text-primary" />
                            <span className="text-foreground">
                              <span className="text-muted-foreground">Weight:</span> 
                              <span className="ml-1 font-medium">{shipment.totalWeight} kg</span>
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Expanded Items List */}
                      {isExpanded && (
                        <div className="mt-4 sm:pl-11">
                          {(!shipment.items || shipment.items.length === 0) ? (
                            <div className="text-center py-6 bg-muted/30 rounded-lg">
                              <p className="text-muted-foreground text-sm">No items details available</p>
                            </div>
                          ) : (
                            <div className="rounded-lg border bg-card overflow-hidden">
                              <div className="p-2 border-b bg-orange-50 dark:bg-orange-950/30">
                                <h4 className="text-xs font-semibold text-muted-foreground">ITEMS READY FOR STORAGE ({shipment.items.length})</h4>
                              </div>
                              {/* Use virtualization for lists with more than 20 items */}
                              {shipment.items.length > 20 ? (
                                <div>
                                  {/* Table header */}
                                  <div className="border-b bg-muted/20">
                                    <div className="grid grid-cols-[1fr,100px,80px,100px] text-xs text-muted-foreground">
                                      <div className="text-left px-2 py-1.5 font-medium">Item</div>
                                      <div className="text-center px-2 py-1.5 font-medium">Qty</div>
                                      <div className="text-center px-2 py-1.5 font-medium">Location</div>
                                      <div className="text-center px-2 py-1.5 font-medium">Status</div>
                                    </div>
                                  </div>
                                  {/* Virtualized list for performance */}
                                  <List
                                    height={400}
                                    itemCount={shipment.items.length}
                                    itemSize={40}
                                    width="100%"
                                  >
                                    {({ index, style }) => {
                                      const item = shipment.items[index];
                                      const receiptItem = receiptItemsMap.get(String(item.id));

                                      return (
                                        <div style={style}>
                                          <div className="grid grid-cols-[1fr,100px,80px,100px] text-sm items-center border-b hover:bg-muted/30">
                                            <div className="px-2 py-2 truncate">
                                              <span className="font-medium">{item.name}</span>
                                              {item.sku && (
                                                <span className="text-xs text-muted-foreground ml-2">({item.sku})</span>
                                              )}
                                            </div>
                                            <div className="px-2 py-2 text-center font-mono text-xs">
                                              {receiptItem?.receivedQuantity || item.quantity || 0}
                                            </div>
                                            <div className="px-2 py-2 text-center">
                                              <Badge variant="outline" className="text-xs">
                                                TBA
                                              </Badge>
                                            </div>
                                            <div className="px-2 py-2 text-center">
                                              <Badge className="bg-orange-100 text-orange-800 text-xs">
                                                Pending
                                              </Badge>
                                            </div>
                                          </div>
                                        </div>
                                      );
                                    }}
                                  </List>
                                </div>
                              ) : (
                                /* Regular table for small lists */
                                <div className="overflow-x-auto">
                                  <table className="w-full text-sm">
                                    <thead className="border-b bg-muted/20">
                                      <tr className="text-xs text-muted-foreground">
                                        <th className="text-left px-2 py-1.5 font-medium">Item</th>
                                        <th className="text-center px-2 py-1.5 font-medium min-w-[100px]">Qty</th>
                                        <th className="text-center px-2 py-1.5 font-medium min-w-[80px]">Location</th>
                                        <th className="text-center px-2 py-1.5 font-medium">Status</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {shipment.items.map((item: any, index: number) => {
                                        const receiptItem = receiptItemsMap.get(String(item.id));

                                        return (
                                          <tr key={item.id || index} className="hover:bg-muted/30 border-b">
                                            <td className="px-2 py-2">
                                              <span className="font-medium">{item.name}</span>
                                              {item.sku && (
                                                <span className="text-xs text-muted-foreground ml-2">({item.sku})</span>
                                              )}
                                            </td>
                                            <td className="px-2 py-2 text-center font-mono text-xs">
                                              {receiptItem?.receivedQuantity || item.quantity || 0}
                                            </td>
                                            <td className="px-2 py-2 text-center">
                                              <Badge variant="outline" className="text-xs">
                                                TBA
                                              </Badge>
                                            </td>
                                            <td className="px-2 py-2 text-center">
                                              <Badge className="bg-orange-100 text-orange-800 text-xs">
                                                Pending
                                              </Badge>
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Notes */}
                      {shipment.notes && isExpanded && (
                        <div className="mt-3 sm:pl-11">
                          <div className="p-3 bg-muted/50 rounded-lg">
                            <p className="text-xs text-muted-foreground mb-1">Notes:</p>
                            <p className="text-sm">{shipment.notes}</p>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="completed" className="mt-6">
          {isLoadingCompleted ? (
            <div className="text-center py-8">
              <CheckCircle className="h-12 w-12 text-muted-foreground mx-auto mb-2 animate-pulse" />
              <p className="text-muted-foreground">Loading shipments...</p>
            </div>
          ) : completedShipments.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground">No completed shipments</p>
            </div>
          ) : (
            <div className="space-y-4">
              {completedShipments.map((shipment: any) => {
                const isExpanded = expandedShipments.has(shipment.id);
                const receiptData = receiptDataMap.get(shipment.id);
                const receiptItems = receiptData?.items || [];

                // Create O(1) lookup map for receipt items by itemId
                const receiptItemsMap = new Map();
                receiptItems.forEach((item: any) => {
                  receiptItemsMap.set(String(item.itemId), item);
                });

                return (
                  <Card key={shipment.id} className="border hover:shadow-md transition-shadow border-green-300">
                    <CardContent className="p-4">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
                        <div className="flex items-center gap-2 sm:gap-3 flex-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="p-1"
                            onClick={() => {
                              const newExpanded = new Set(expandedShipments);
                              if (isExpanded) {
                                newExpanded.delete(shipment.id);
                              } else {
                                newExpanded.add(shipment.id);
                              }
                              setExpandedShipments(newExpanded);
                            }}
                            data-testid={`button-toggle-completed-${shipment.id}`}
                          >
                            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </Button>
                          <div className="flex-1">
                            {/* First Row: Title and Status */}
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-semibold text-sm sm:text-base">
                                {shipment.shipmentName || `Shipment #${shipment.id}`}
                              </h3>
                              <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-100">
                                Completed
                              </Badge>
                            </div>

                            {/* Second Row: Shipment Type, Carrier, Units */}
                            <div className="flex flex-wrap items-center gap-2 text-sm font-medium text-foreground mt-2">
                              {(shipment.shipmentType || shipment.shippingMethod || shipment.consolidation?.shippingMethod) && (
                                <>
                                  <Badge variant="secondary" className="text-xs flex items-center gap-1">
                                    {getShipmentTypeIcon(shipment.shipmentType || shipment.shippingMethod || shipment.consolidation?.shippingMethod || '')}
                                    {formatShipmentType(shipment.shipmentType || shipment.shippingMethod || shipment.consolidation?.shippingMethod || '')}
                                  </Badge>
                                  <span className="text-muted-foreground">•</span>
                                </>
                              )}
                              <span className="font-semibold">
                                {shipment.endCarrier || shipment.carrier}
                              </span>
                              <span className="text-muted-foreground">•</span>
                              <span className="flex items-center gap-1">
                                {getUnitTypeIcon(shipment.unitType || 'items')}
                                {shipment.totalUnits} {shipment.unitType || 'items'}
                              </span>
                            </div>

                            {/* Third Row: Tracking */}
                            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mt-1">
                              <span className="font-mono">Tracking: {shipment.trackingNumber}</span>
                            </div>
                          </div>
                        </div>
                        {shipment.receiptId ? (
                          <Link href={`/receiving/details/${shipment.receiptId}`}>
                            <Button size="sm" variant="outline" className="shadow-sm" data-testid={`button-view-details-${shipment.id}`}>
                              <Eye className="h-4 w-4 mr-1" />
                              View Receipt
                            </Button>
                          </Link>
                        ) : (
                          <Button size="sm" variant="outline" disabled data-testid={`button-no-receipt-${shipment.id}`}>
                            No Receipt
                          </Button>
                        )}
                      </div>

                      {/* Additional Info Bar - Always visible with database info */}
                      <div className="flex flex-wrap items-center gap-3 sm:gap-6 text-xs sm:text-sm mb-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                        <div className="flex items-center gap-1">
                          <Warehouse className="h-3 w-3 text-primary" />
                          <span className="text-foreground">
                            <span className="text-muted-foreground">Warehouse:</span> 
                            <span className="ml-1 font-medium">{shipment.receivingWarehouse || 'Not specified'}</span>
                          </span>
                        </div>
                        
                        {shipment.warehouseLocation && (
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3 text-primary" />
                            <span className="text-foreground">
                              <span className="text-muted-foreground">Location:</span> 
                              <span className="ml-1 font-medium">{shipment.warehouseLocation}</span>
                            </span>
                          </div>
                        )}
                        
                        <div className="flex items-center gap-1">
                          <Package className="h-3 w-3 text-primary" />
                          <span className="text-foreground">
                            <span className="text-muted-foreground">Consolidation:</span> 
                            <span className="ml-1 font-medium">{shipment.consolidationName || 'No consolidation'}</span>
                          </span>
                        </div>
                        
                        {shipment.deliveredAt && (
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3 text-primary" />
                            <span className="text-foreground">
                              <span className="text-muted-foreground">Completed:</span> 
                              <span className="ml-1 font-medium">{format(new Date(shipment.deliveredAt), 'MMM dd, HH:mm')}</span>
                            </span>
                          </div>
                        )}
                        
                        {shipment.totalWeight && (
                          <div className="flex items-center gap-1">
                            <Package2 className="h-3 w-3 text-primary" />
                            <span className="text-foreground">
                              <span className="text-muted-foreground">Weight:</span> 
                              <span className="ml-1 font-medium">{shipment.totalWeight} kg</span>
                            </span>
                          </div>
                        )}
                        
                        {receiptData && receiptData.receivedBy && (
                          <div className="flex items-center gap-1">
                            <User className="h-3 w-3 text-primary" />
                            <span className="text-foreground">
                              <span className="text-muted-foreground">Received by:</span> 
                              <span className="ml-1 font-medium">{receiptData.receivedBy}</span>
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Expanded Items List */}
                      {isExpanded && (
                        <div className="mt-4 sm:pl-11">
                          {(!shipment.items || shipment.items.length === 0) ? (
                            <div className="text-center py-6 bg-muted/30 rounded-lg">
                              <p className="text-muted-foreground text-sm">No items details available</p>
                            </div>
                          ) : (
                            <div className="rounded-lg border bg-card overflow-hidden">
                              <div className="p-2 border-b bg-emerald-50 dark:bg-emerald-950/30">
                                <h4 className="text-xs font-semibold text-muted-foreground">COMPLETED ITEMS ({shipment.items.length})</h4>
                              </div>
                              {/* Use virtualization for lists with more than 20 items */}
                              {shipment.items.length > 20 ? (
                                <div>
                                  {/* Table header */}
                                  <div className="border-b bg-muted/20">
                                    <div className="grid grid-cols-[1fr,100px,120px,100px] text-xs text-muted-foreground">
                                      <div className="text-left px-2 py-1.5 font-medium">Item</div>
                                      <div className="text-center px-2 py-1.5 font-medium">Qty</div>
                                      <div className="text-center px-2 py-1.5 font-medium">Location</div>
                                      <div className="text-center px-2 py-1.5 font-medium">Status</div>
                                    </div>
                                  </div>
                                  {/* Virtualized list for performance */}
                                  <List
                                    height={400}
                                    itemCount={shipment.items.length}
                                    itemSize={40}
                                    width="100%"
                                  >
                                    {({ index, style }) => {
                                      const item = shipment.items[index];
                                      const receiptItem = receiptItemsMap.get(String(item.id));

                                      return (
                                        <div style={style}>
                                          <div className="grid grid-cols-[1fr,100px,120px,100px] text-sm items-center border-b hover:bg-muted/30">
                                            <div className="px-2 py-2 truncate">
                                              <span className="font-medium">{item.name}</span>
                                              {item.sku && (
                                                <span className="text-xs text-muted-foreground ml-2">({item.sku})</span>
                                              )}
                                            </div>
                                            <div className="px-2 py-2 text-center font-mono text-xs">
                                              {receiptItem?.receivedQuantity || item.quantity || 0}
                                            </div>
                                            <div className="px-2 py-2 text-center">
                                              {receiptItem?.locationCode ? (
                                                <Badge variant="outline" className="text-xs font-mono">
                                                  {receiptItem.locationCode}
                                                </Badge>
                                              ) : (
                                                <Badge variant="secondary" className="text-xs">
                                                  Stored
                                                </Badge>
                                              )}
                                            </div>
                                            <div className="px-2 py-2 text-center">
                                              <Badge className="bg-emerald-100 text-emerald-800 text-xs">
                                                <CheckCircle className="h-3 w-3 mr-1" />
                                                Complete
                                              </Badge>
                                            </div>
                                          </div>
                                        </div>
                                      );
                                    }}
                                  </List>
                                </div>
                              ) : (
                                /* Regular table for small lists */
                                <div className="overflow-x-auto">
                                  <table className="w-full text-sm">
                                    <thead className="border-b bg-muted/20">
                                      <tr className="text-xs text-muted-foreground">
                                        <th className="text-left px-2 py-1.5 font-medium">Item</th>
                                        <th className="text-center px-2 py-1.5 font-medium min-w-[100px]">Qty</th>
                                        <th className="text-center px-2 py-1.5 font-medium min-w-[120px]">Location</th>
                                        <th className="text-center px-2 py-1.5 font-medium">Status</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {shipment.items.map((item: any, index: number) => {
                                        const receiptItem = receiptItemsMap.get(String(item.id));

                                        return (
                                          <tr key={item.id || index} className="hover:bg-muted/30 border-b">
                                            <td className="px-2 py-2">
                                              <span className="font-medium">{item.name}</span>
                                              {item.sku && (
                                                <span className="text-xs text-muted-foreground ml-2">({item.sku})</span>
                                              )}
                                            </td>
                                            <td className="px-2 py-2 text-center font-mono text-xs">
                                              {receiptItem?.receivedQuantity || item.quantity || 0}
                                            </td>
                                            <td className="px-2 py-2 text-center">
                                              {receiptItem?.locationCode ? (
                                                <Badge variant="outline" className="text-xs font-mono">
                                                  {receiptItem.locationCode}
                                                </Badge>
                                              ) : (
                                                <Badge variant="secondary" className="text-xs">
                                                  Stored
                                                </Badge>
                                              )}
                                            </td>
                                            <td className="px-2 py-2 text-center">
                                              <Badge className="bg-emerald-100 text-emerald-800 text-xs">
                                                <CheckCircle className="h-3 w-3 mr-1 inline" />
                                                Complete
                                              </Badge>
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Notes */}
                      {shipment.notes && isExpanded && (
                        <div className="mt-3 sm:pl-11">
                          <div className="p-3 bg-muted/50 rounded-lg">
                            <p className="text-xs text-muted-foreground mb-1">Notes:</p>
                            <p className="text-sm">{shipment.notes}</p>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Move Back Confirmation Dialog */}
      <AlertDialog open={showMoveBackDialog} onOpenChange={setShowMoveBackDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Move Shipment Back to To Receive</AlertDialogTitle>
            <AlertDialogDescription>
              Do you want to preserve the shipment received data or delete it when moving back?
              <br />
              <br />
              <strong>Preserve Data:</strong> Keep any receiving progress and parcel counts.<br />
              <strong>Delete Data:</strong> Remove all receiving progress and start fresh.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel 
              onClick={() => {
                setShowMoveBackDialog(false);
                setShipmentToMoveBack(null);
              }}
              data-testid="button-cancel-move-back"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (shipmentToMoveBack) {
                  moveBackToReceiveMutation.mutate({
                    shipmentId: shipmentToMoveBack,
                    preserveData: true
                  });
                }
              }}
              disabled={moveBackToReceiveMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700"
              data-testid="button-preserve-data"
            >
              Preserve Data
            </AlertDialogAction>
            <AlertDialogAction
              onClick={() => {
                if (shipmentToMoveBack) {
                  moveBackToReceiveMutation.mutate({
                    shipmentId: shipmentToMoveBack,
                    preserveData: false
                  });
                }
              }}
              disabled={moveBackToReceiveMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
              data-testid="button-delete-data"
            >
              Delete Data
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Shipment Selection Dialog */}
      <Dialog open={showShipmentSelectionDialog} onOpenChange={setShowShipmentSelectionDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Select Shipment</DialogTitle>
            <DialogDescription>
              Multiple shipments match your scanned tracking numbers. Select the correct shipment to continue receiving.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {matchedShipments.map((shipment) => (
              <Card 
                key={shipment.id} 
                className="cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => handleShipmentSelection(shipment.id)}
                data-testid={`shipment-option-${shipment.id}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-semibold">
                        {shipment.shipmentName || `Shipment #${shipment.id}`}
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        Tracking: {shipment.trackingNumber}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {shipment.carrier || shipment.endCarrier}
                        </Badge>
                        {shipment.totalUnits && (
                          <span className="text-xs text-muted-foreground">
                            {shipment.totalUnits} {shipment.unitType || 'items'}
                          </span>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}