import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
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
  Star
} from "lucide-react";
import { Link } from "wouter";
import { format, differenceInHours } from "date-fns";
import { useToast } from "@/hooks/use-toast";

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

// Helper function to get carrier icon
const getCarrierIcon = (carrierName: string, className = "h-3 w-3") => {
  const carrier = carrierName?.toLowerCase() || '';
  
  if (carrier.includes('dhl')) {
    return <Zap className={`${className} text-yellow-600`} />;
  } else if (carrier.includes('fedex')) {
    return <Plane className={`${className} text-purple-600`} />;
  } else if (carrier.includes('ups')) {
    return <Truck className={`${className} text-amber-700`} />;
  } else if (carrier.includes('usps') || carrier.includes('post')) {
    return <Package className={`${className} text-blue-600`} />;
  } else if (carrier.includes('sf') || carrier.includes('express')) {
    return <Star className={`${className} text-green-600`} />;
  } else if (carrier.includes('ems')) {
    return <Plane className={`${className} text-red-600`} />;
  } else if (carrier.includes('dpd') || carrier.includes('gls')) {
    return <Truck className={`${className} text-red-500`} />;
  } else if (carrier.includes('czech') || carrier.includes('ppl') || carrier.includes('zásilkovna')) {
    return <Package className={`${className} text-blue-500`} />;
  }
  return <Truck className={`${className} text-muted-foreground`} />;
};

export default function ReceivingList() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("receivable");
  const [selectedShipments, setSelectedShipments] = useState<Set<number>>(new Set());
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [barcodeScan, setBarcodeScan] = useState("");
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [expandedShipments, setExpandedShipments] = useState<Set<number>>(new Set());
  const { toast } = useToast();

  // Fetch receivable shipments
  const { data: receivableShipments = [], isLoading: isLoadingShipments } = useQuery({
    queryKey: ['/api/imports/shipments/receivable'],
    queryFn: async () => {
      const response = await fetch('/api/imports/shipments/receivable');
      if (!response.ok) throw new Error('Failed to fetch receivable shipments');
      return response.json();
    }
  });

  // Fetch all receipts
  const { data: receipts = [], isLoading: isLoadingReceipts } = useQuery({
    queryKey: ['/api/imports/receipts'],
    queryFn: async () => {
      const response = await fetch('/api/imports/receipts');
      if (!response.ok) throw new Error('Failed to fetch receipts');
      return response.json();
    }
  });

  // Filter shipments based on search and priority
  const filteredShipments = receivableShipments.filter((shipment: any) => {
    const matchesSearch = searchQuery === "" ||
      shipment.shipmentName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      shipment.trackingNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      shipment.carrier?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      shipment.consolidation?.name?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesPriority = priorityFilter === "all" || 
      (priorityFilter === "urgent" && isUrgent(shipment)) ||
      (priorityFilter === "normal" && !isUrgent(shipment));
    
    return matchesSearch && matchesPriority;
  });
  
  // Check if shipment is urgent (delivered more than 24 hours ago)
  const isUrgent = (shipment: any) => {
    if (shipment.deliveredAt) {
      const hoursAgo = differenceInHours(new Date(), new Date(shipment.deliveredAt));
      return hoursAgo > 24;
    }
    return false;
  };
  
  // Handle barcode scan
  useEffect(() => {
    if (barcodeScan) {
      setSearchQuery(barcodeScan);
      setBarcodeScan("");
    }
  }, [barcodeScan]);
  
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
    const allIds = new Set<number>(filteredShipments.map((s: any) => s.id));
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
  const pendingVerification = filteredReceipts.filter((r: any) => r.status === 'pending_verification');
  const pendingApproval = filteredReceipts.filter((r: any) => r.status === 'pending_approval');
  const approved = filteredReceipts.filter((r: any) => r.status === 'approved');

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
    const urgent = isUrgent(shipment);
    
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

  const isLoading = isLoadingShipments || isLoadingReceipts;

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Receiving</h1>
        <p className="text-muted-foreground">
          Manage incoming shipments and verify received items
        </p>
      </div>

      {/* Search and Filters */}
      <Card className="mb-6">
        <CardContent className="p-4 space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by shipment name, tracking number, carrier..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="input-search-receiving"
              />
            </div>
            <div className="relative">
              <ScanLine className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Scan barcode"
                value={barcodeScan}
                onChange={(e) => setBarcodeScan(e.target.value)}
                className="pl-10 w-48"
                data-testid="input-barcode-scan"
              />
            </div>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="urgent">
                  <span className="flex items-center gap-1">
                    <Zap className="h-3 w-3 text-orange-500" />
                    Urgent
                  </span>
                </SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
              </SelectContent>
            </Select>
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
            onClick={() => setActiveTab('receivable')}
            className={`
              flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all
              ${activeTab === 'receivable' 
                ? 'bg-sky-600 text-white shadow-lg shadow-sky-600/20' 
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
              }
            `}
            data-testid="tab-receivable"
          >
            <Package className="h-4 w-4" />
            <span>Ready to Receive</span>
            <span className={`${activeTab === 'receivable' ? 'text-white/90' : 'text-gray-500'}`}>
              ({receivableShipments.filter((s: any) => !s.receipt).length})
            </span>
          </button>
          
          <button
            onClick={() => setActiveTab('verification')}
            className={`
              flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all
              ${activeTab === 'verification' 
                ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/20' 
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
              }
            `}
            data-testid="tab-verification"
          >
            <Clock className="h-4 w-4" />
            <span>Verification</span>
            <span className={`${activeTab === 'verification' ? 'text-white/90' : 'text-gray-500'}`}>
              ({pendingVerification.length})
            </span>
          </button>
          
          <button
            onClick={() => setActiveTab('approval')}
            className={`
              flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all
              ${activeTab === 'approval' 
                ? 'bg-orange-600 text-white shadow-lg shadow-orange-600/20' 
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
              }
            `}
            data-testid="tab-approval"
          >
            <AlertCircle className="h-4 w-4" />
            <span>Approval</span>
            <span className={`${activeTab === 'approval' ? 'text-white/90' : 'text-gray-500'}`}>
              ({pendingApproval.length})
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
              ({approved.length})
            </span>
          </button>
        </div>

        <TabsContent value="receivable" className="mt-6">
          {isLoading ? (
            <div className="text-center py-8">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-2 animate-pulse" />
              <p className="text-muted-foreground">Loading shipments...</p>
            </div>
          ) : filteredShipments.filter((s: any) => !s.receipt).length === 0 ? (
            <div className="text-center py-8">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground">No shipments ready for receiving</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredShipments
                .filter((s: any) => !s.receipt)
                .map((shipment: any) => {
                  const urgent = isUrgent(shipment);
                  const isExpanded = expandedShipments.has(shipment.id);
                  
                  return (
                    <Card key={shipment.id} id={`shipment-${shipment.id}`} className={`border hover:shadow-md transition-shadow ${urgent ? 'border-orange-300 bg-orange-50/50 dark:bg-orange-950/20' : ''}`}>
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
                                {urgent && (
                                  <Badge variant="destructive" className="animate-pulse">
                                    <Zap className="h-3 w-3 mr-1" />
                                    Urgent
                                  </Badge>
                                )}
                              </div>
                              
                              {/* Second Row: More Visible Info - End-Carrier, Units, Tracking */}
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
                                <span className="font-semibold flex items-center gap-1">
                                  {getCarrierIcon(shipment.endCarrier || shipment.carrier)}
                                  {shipment.endCarrier || shipment.carrier}
                                </span>
                                <span className="text-muted-foreground">•</span>
                                <span>{shipment.totalUnits} {shipment.unitType || 'items'}</span>
                                <span className="text-muted-foreground">•</span>
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

                        {/* Shipment Info Bar */}
                        <div className="flex flex-wrap items-center gap-3 sm:gap-6 text-xs sm:text-sm mb-3 sm:pl-11">
                          <div className="flex items-center gap-1">
                            <Truck className="h-3 w-3 text-muted-foreground" />
                            <span className="text-muted-foreground">
                              {shipment.carrier}
                              {shipment.endCarrier && shipment.endCarrier !== shipment.carrier && (
                                <span> → {shipment.endCarrier}</span>
                              )}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3 text-muted-foreground" />
                            <span className="text-muted-foreground">
                              {shipment.origin?.split(',')[0]} → {shipment.destination?.split(',')[0]}
                            </span>
                          </div>
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

        <TabsContent value="verification" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pendingVerification.length === 0 ? (
              <div className="col-span-full text-center py-8">
                <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground">No receipts pending verification</p>
              </div>
            ) : (
              pendingVerification.map((receipt: any) => (
                <ReceiptCard key={receipt.id} receipt={receipt} />
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="approval" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pendingApproval.length === 0 ? (
              <div className="col-span-full text-center py-8">
                <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground">No receipts pending approval</p>
              </div>
            ) : (
              pendingApproval.map((receipt: any) => (
                <ReceiptCard key={receipt.id} receipt={receipt} />
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="completed" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {approved.length === 0 ? (
              <div className="col-span-full text-center py-8">
                <CheckCircle className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground">No completed receipts</p>
              </div>
            ) : (
              approved.map((receipt: any) => (
                <ReceiptCard key={receipt.id} receipt={receipt} />
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}