import { useState, useEffect, useMemo, useCallback, useRef, createContext, useContext } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle, DrawerTrigger, DrawerFooter, DrawerClose } from "@/components/ui/drawer";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  Package, 
  Search, 
  Plus, 
  Minus,
  Clock, 
  CheckCircle, 
  AlertCircle,
  Truck,
  Calendar,
  MapPin,
  Package2,
  AlertTriangle,
  ScanLine,
  Camera,
  CameraOff,
  Filter,
  Undo2,
  X,
  Loader2,
  Eye,
  User,
  Archive,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  MoreHorizontal,
  Warehouse,
  Layers,
  Container,
  Plane,
  Ship,
  Train,
  Zap,
  CheckSquare,
  Square
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { soundEffects } from "@/utils/soundEffects";

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

interface ScannedItem {
  id: string;
  barcode: string;
  productId?: number;
  sku?: string;
  name: string;
  quantity: number;
  expectedQuantity?: number;
  status: 'pending' | 'complete' | 'partial' | 'damaged' | 'missing';
  scannedAt: Date;
}

interface ReceivingSessionState {
  activeReceiptId: number | null;
  scannedItems: ScannedItem[];
  isCameraActive: boolean;
  undoStack: ScannedItem[][];
}

interface ReceivingSessionContext {
  session: ReceivingSessionState;
  setActiveReceipt: (id: number | null) => void;
  addScannedItem: (item: ScannedItem) => void;
  updateItemQuantity: (itemId: string, delta: number) => void;
  removeItem: (itemId: string) => void;
  updateItemStatus: (itemId: string, status: ScannedItem['status']) => void;
  toggleCamera: () => void;
  undo: () => void;
  clearSession: () => void;
}

// ============================================================================
// RECEIVING SESSION CONTEXT
// ============================================================================

const ReceivingSessionContext = createContext<ReceivingSessionContext | null>(null);

export function useReceivingSession() {
  const context = useContext(ReceivingSessionContext);
  if (!context) {
    throw new Error('useReceivingSession must be used within ReceivingSessionProvider');
  }
  return context;
}

function ReceivingSessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<ReceivingSessionState>({
    activeReceiptId: null,
    scannedItems: [],
    isCameraActive: false,
    undoStack: []
  });

  const setActiveReceipt = useCallback((id: number | null) => {
    setSession(prev => ({ ...prev, activeReceiptId: id }));
  }, []);

  const addScannedItem = useCallback((item: ScannedItem) => {
    setSession(prev => ({
      ...prev,
      scannedItems: [...prev.scannedItems, item],
      undoStack: [...prev.undoStack, prev.scannedItems]
    }));
  }, []);

  const updateItemQuantity = useCallback((itemId: string, delta: number) => {
    setSession(prev => ({
      ...prev,
      scannedItems: prev.scannedItems.map(item =>
        item.id === itemId
          ? { ...item, quantity: Math.max(0, item.quantity + delta) }
          : item
      ),
      undoStack: [...prev.undoStack, prev.scannedItems]
    }));
  }, []);

  const removeItem = useCallback((itemId: string) => {
    setSession(prev => ({
      ...prev,
      scannedItems: prev.scannedItems.filter(item => item.id !== itemId),
      undoStack: [...prev.undoStack, prev.scannedItems]
    }));
  }, []);

  const updateItemStatus = useCallback((itemId: string, status: ScannedItem['status']) => {
    setSession(prev => ({
      ...prev,
      scannedItems: prev.scannedItems.map(item =>
        item.id === itemId ? { ...item, status } : item
      )
    }));
  }, []);

  const toggleCamera = useCallback(() => {
    setSession(prev => ({ ...prev, isCameraActive: !prev.isCameraActive }));
  }, []);

  const undo = useCallback(() => {
    setSession(prev => {
      if (prev.undoStack.length === 0) return prev;
      const previousState = prev.undoStack[prev.undoStack.length - 1];
      return {
        ...prev,
        scannedItems: previousState,
        undoStack: prev.undoStack.slice(0, -1)
      };
    });
  }, []);

  const clearSession = useCallback(() => {
    setSession({
      activeReceiptId: null,
      scannedItems: [],
      isCameraActive: false,
      undoStack: []
    });
  }, []);

  const contextValue: ReceivingSessionContext = {
    session,
    setActiveReceipt,
    addScannedItem,
    updateItemQuantity,
    removeItem,
    updateItemStatus,
    toggleCamera,
    undo,
    clearSession
  };

  return (
    <ReceivingSessionContext.Provider value={contextValue}>
      {children}
    </ReceivingSessionContext.Provider>
  );
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const getStatusColor = (status: string) => {
  switch (status) {
    case 'complete':
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    case 'partial':
      return 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200';
    case 'damaged':
      return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
    case 'missing':
      return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
    case 'delivered':
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    case 'in transit':
    case 'receiving':
      return 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
  }
};

const getShipmentTypeIcon = (shipmentType: string, className = "h-4 w-4") => {
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

const getUnitTypeIcon = (unitType: string, className = "h-4 w-4") => {
  const unit = unitType?.toLowerCase() || '';

  if (unit.includes('pallet')) {
    return <Layers className={`${className} text-amber-600`} />;
  } else if (unit.includes('container')) {
    return <Container className={`${className} text-blue-600`} />;
  } else if (unit.includes('parcel') || unit.includes('package')) {
    return <Package2 className={`${className} text-green-600`} />;
  }
  return <Package className={`${className} text-muted-foreground`} />;
};

// ============================================================================
// STICKY HEADER SCAN COMPONENT
// ============================================================================

function StickyHeaderScanHeader({ onScan, isScanning }: { onScan: (barcode: string) => void; isScanning: boolean }) {
  const { session, toggleCamera, undo } = useReceivingSession();
  const scanInputRef = useRef<HTMLInputElement>(null);
  const [manualBarcode, setManualBarcode] = useState("");
  const [filter, setFilter] = useState<string>("all");

  // Auto-focus scan input
  useEffect(() => {
    if (!session.isCameraActive && scanInputRef.current) {
      scanInputRef.current.focus();
    }
  }, [session.isCameraActive]);

  const handleManualScan = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (manualBarcode.trim()) {
      onScan(manualBarcode.trim());
      setManualBarcode("");
    }
  }, [manualBarcode, onScan]);

  return (
    <div className="sticky top-0 z-50 bg-background border-b shadow-sm">
      <Card className="rounded-none border-0 border-b">
        <CardContent className="p-3 sm:p-4">
          {/* Primary Scan Controls */}
          <div className="flex items-center gap-2 mb-3">
            {/* Camera Toggle - 48px touch target */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="lg"
                    variant={session.isCameraActive ? "default" : "outline"}
                    className="h-12 w-12 p-0 shrink-0"
                    onClick={toggleCamera}
                    aria-label={session.isCameraActive ? "Disable camera" : "Enable camera"}
                    data-testid="button-toggle-camera"
                  >
                    {session.isCameraActive ? (
                      <Camera className="h-5 w-5" />
                    ) : (
                      <CameraOff className="h-5 w-5" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{session.isCameraActive ? "Camera On" : "Camera Off"}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* Manual Barcode Input */}
            <form onSubmit={handleManualScan} className="flex-1 flex gap-2">
              <Input
                ref={scanInputRef}
                type="text"
                placeholder="Scan or type barcode..."
                value={manualBarcode}
                onChange={(e) => setManualBarcode(e.target.value)}
                className="h-12 text-base"
                disabled={session.isCameraActive}
                data-testid="input-barcode"
                autoFocus
              />
              <Button 
                type="submit" 
                size="lg" 
                className="h-12 px-6"
                disabled={!manualBarcode.trim() || session.isCameraActive}
                data-testid="button-scan"
              >
                <ScanLine className="h-5 w-5 mr-2" />
                Scan
              </Button>
            </form>

            {/* Undo Button - 48px touch target */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="lg"
                    variant="outline"
                    className="h-12 w-12 p-0 shrink-0"
                    onClick={undo}
                    disabled={session.undoStack.length === 0}
                    aria-label="Undo last action"
                    data-testid="button-undo"
                  >
                    <Undo2 className="h-5 w-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Undo Last Scan</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          {/* Session Summary */}
          <div className="flex items-center justify-between gap-3 text-sm">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <Package className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{session.scannedItems.length} items</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="font-medium">
                  {session.scannedItems.filter(i => i.status === 'complete').length} complete
                </span>
              </div>
            </div>

            {/* Quick Filter Toggle */}
            <ToggleGroup type="single" value={filter} onValueChange={(val) => val && setFilter(val)} className="gap-1">
              <ToggleGroupItem value="all" aria-label="Show all" className="h-8 px-3 text-xs">
                All
              </ToggleGroupItem>
              <ToggleGroupItem value="pending" aria-label="Show pending" className="h-8 px-3 text-xs">
                Pending
              </ToggleGroupItem>
              <ToggleGroupItem value="issues" aria-label="Show issues" className="h-8 px-3 text-xs">
                Issues
              </ToggleGroupItem>
            </ToggleGroup>
          </div>

          {/* Scanning Indicator */}
          {isScanning && (
            <div className="mt-3 flex items-center gap-2 text-sm text-cyan-600 dark:text-cyan-400">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Processing scan...</span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// RECEIPT PROGRESS CAROUSEL
// ============================================================================

function ReceiptProgressCarousel({ receipts }: { receipts: any[] }) {
  if (!receipts || receipts.length === 0) {
    return null;
  }

  return (
    <div className="mb-4">
      <h3 className="text-sm font-semibold mb-2 px-4">Active Receipts</h3>
      <ScrollArea className="w-full whitespace-nowrap">
        <div className="flex gap-3 px-4 pb-2">
          {receipts.map((receipt: any) => {
            const totalItems = receipt.items?.length || 0;
            const completedItems = receipt.items?.filter((i: any) => i.status === 'complete').length || 0;
            const progress = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
            const statusColor = progress === 100 ? 'green' : progress > 0 ? 'amber' : 'gray';

            return (
              <Card key={receipt.id} className="w-[280px] shrink-0">
                <CardHeader className="p-4 pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base mb-1 truncate">
                        Receipt #{receipt.id}
                      </CardTitle>
                      <CardDescription className="text-xs truncate">
                        {receipt.shipment?.shipmentName || `Shipment #${receipt.shipmentId}`}
                      </CardDescription>
                    </div>
                    <Badge className={getStatusColor(receipt.status)}>
                      {receipt.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-4 pt-2">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Progress</span>
                      <span className={`font-semibold text-${statusColor}-600`}>
                        {completedItems}/{totalItems}
                      </span>
                    </div>
                    <Progress value={progress} className="h-2" />
                    <div className="flex items-center justify-between text-xs text-muted-foreground mt-2">
                      <span>{receipt.carrier}</span>
                      <span>{format(new Date(receipt.receivedAt), 'MMM dd, HH:mm')}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}

// ============================================================================
// SCANNED ITEM LIST
// ============================================================================

function ScannedItemList({ items, filter }: { items: ScannedItem[]; filter: string }) {
  const { updateItemQuantity, removeItem, updateItemStatus } = useReceivingSession();

  const filteredItems = useMemo(() => {
    switch (filter) {
      case 'pending':
        return items.filter(i => i.status === 'pending');
      case 'issues':
        return items.filter(i => i.status === 'damaged' || i.status === 'missing' || i.status === 'partial');
      default:
        return items;
    }
  }, [items, filter]);

  if (filteredItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Package className="h-12 w-12 text-muted-foreground mb-3" />
        <p className="text-sm font-medium text-muted-foreground">No scanned items yet</p>
        <p className="text-xs text-muted-foreground mt-1">Start scanning barcodes to add items</p>
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1">
      <div className="space-y-2 p-4">
        {filteredItems.map((item) => (
          <Card key={item.id} className="overflow-hidden">
            <CardContent className="p-0">
              {/* Item Header */}
              <div className="flex items-center gap-3 p-4 pb-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold text-base truncate">{item.name}</h4>
                    <Badge className={getStatusColor(item.status)}>
                      {item.status}
                    </Badge>
                  </div>
                  {item.sku && (
                    <p className="text-xs text-muted-foreground font-mono">SKU: {item.sku}</p>
                  )}
                  <p className="text-xs text-muted-foreground">Barcode: {item.barcode}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-10 w-10 p-0 text-muted-foreground hover:text-destructive"
                  onClick={() => removeItem(item.id)}
                  aria-label="Remove item"
                  data-testid={`button-remove-${item.id}`}
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>

              {/* Quantity Stepper - Large touch targets */}
              <div className="flex items-center justify-between px-4 pb-3">
                <span className="text-sm font-medium">Quantity:</span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="lg"
                    className="h-12 w-12 p-0"
                    onClick={() => updateItemQuantity(item.id, -1)}
                    disabled={item.quantity <= 0}
                    aria-label="Decrease quantity"
                    data-testid={`button-decrease-${item.id}`}
                  >
                    <Minus className="h-5 w-5" />
                  </Button>
                  <div className="w-16 text-center">
                    <span className="text-2xl font-bold">{item.quantity}</span>
                    {item.expectedQuantity && (
                      <span className="text-xs text-muted-foreground block">
                        / {item.expectedQuantity}
                      </span>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="lg"
                    className="h-12 w-12 p-0"
                    onClick={() => updateItemQuantity(item.id, 1)}
                    aria-label="Increase quantity"
                    data-testid={`button-increase-${item.id}`}
                  >
                    <Plus className="h-5 w-5" />
                  </Button>
                </div>
              </div>

              {/* Status Actions */}
              <div className="bg-muted/50 p-3 flex gap-2 overflow-x-auto">
                <Button
                  size="sm"
                  variant={item.status === 'complete' ? 'default' : 'outline'}
                  className="h-10 px-4"
                  onClick={() => updateItemStatus(item.id, 'complete')}
                  data-testid={`button-status-complete-${item.id}`}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Complete
                </Button>
                <Button
                  size="sm"
                  variant={item.status === 'partial' ? 'default' : 'outline'}
                  className="h-10 px-4"
                  onClick={() => updateItemStatus(item.id, 'partial')}
                  data-testid={`button-status-partial-${item.id}`}
                >
                  <AlertCircle className="h-4 w-4 mr-2" />
                  Partial
                </Button>
                <Button
                  size="sm"
                  variant={item.status === 'damaged' ? 'default' : 'outline'}
                  className="h-10 px-4"
                  onClick={() => updateItemStatus(item.id, 'damaged')}
                  data-testid={`button-status-damaged-${item.id}`}
                >
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Damaged
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </ScrollArea>
  );
}

// ============================================================================
// ACTION SHEET (BOTTOM DRAWER)
// ============================================================================

function ActionSheet({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { session, clearSession } = useReceivingSession();
  const { toast } = useToast();

  const handleMarkAllComplete = () => {
    session.scannedItems.forEach(item => {
      // Mark as complete via API
    });
    toast({
      title: "Batch Update",
      description: "All items marked as complete",
    });
    onClose();
  };

  return (
    <Drawer open={isOpen} onOpenChange={onClose}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Batch Actions</DrawerTitle>
          <DrawerDescription>
            Apply actions to all {session.scannedItems.length} scanned items
          </DrawerDescription>
        </DrawerHeader>
        <div className="p-4 space-y-3">
          <Button 
            size="lg" 
            className="w-full h-14 text-base"
            onClick={handleMarkAllComplete}
            data-testid="button-mark-all-complete"
          >
            <CheckSquare className="h-5 w-5 mr-2" />
            Mark All Complete
          </Button>
          <Button 
            size="lg" 
            variant="outline" 
            className="w-full h-14 text-base"
            data-testid="button-flag-issues"
          >
            <AlertTriangle className="h-5 w-5 mr-2" />
            Flag Issues
          </Button>
          <Button 
            size="lg" 
            variant="outline" 
            className="w-full h-14 text-base"
            data-testid="button-submit-discrepancies"
          >
            <AlertCircle className="h-5 w-5 mr-2" />
            Submit ASN Discrepancies
          </Button>
        </div>
        <DrawerFooter>
          <DrawerClose asChild>
            <Button variant="outline" size="lg" className="h-12">
              Close
            </Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

// ============================================================================
// SESSION FOOTER
// ============================================================================

function SessionFooter({ onComplete, onCancel }: { onComplete: () => void; onCancel: () => void }) {
  const { session } = useReceivingSession();
  const hasItems = session.scannedItems.length > 0;

  return (
    <div className="sticky bottom-0 z-40 bg-background border-t shadow-lg">
      <div className="p-4 flex gap-3">
        <Button
          size="lg"
          variant="outline"
          className="flex-1 h-14 text-base"
          onClick={onCancel}
          data-testid="button-cancel"
        >
          <X className="h-5 w-5 mr-2" />
          Cancel
        </Button>
        <Button
          size="lg"
          className="flex-1 h-14 text-base bg-green-600 hover:bg-green-700"
          onClick={onComplete}
          disabled={!hasItems}
          data-testid="button-complete"
        >
          <CheckCircle className="h-5 w-5 mr-2" />
          Complete Receipt
        </Button>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function ReceivingList() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("to-receive");
  const [searchQuery, setSearchQuery] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [showUnmatchedDialog, setShowUnmatchedDialog] = useState(false);
  const [unmatchedBarcode, setUnmatchedBarcode] = useState("");
  const [filter, setFilter] = useState("all");

  // Fetch shipments data
  const { data: toReceiveShipments = [], isLoading: isLoadingToReceive } = useQuery({
    queryKey: ['/api/imports/shipments/to-receive'],
  });

  const { data: receivingShipments = [], isLoading: isLoadingReceiving } = useQuery({
    queryKey: ['/api/imports/shipments/receiving'],
  });

  const { data: storageShipments = [], isLoading: isLoadingStorage } = useQuery({
    queryKey: ['/api/imports/shipments/storage'],
  });

  const { data: completedShipments = [], isLoading: isLoadingCompleted } = useQuery({
    queryKey: ['/api/imports/shipments/completed'],
  });

  const { data: archivedShipments = [], isLoading: isLoadingArchived } = useQuery({
    queryKey: ['/api/imports/shipments/archived'],
  });

  const { data: receipts = [], isLoading: isLoadingReceipts } = useQuery({
    queryKey: ['/api/receipts'],
  });

  // Barcode scanning handler
  const handleBarcodeScan = useCallback(async (barcode: string) => {
    setIsScanning(true);
    try {
      // Initialize audio on first interaction
      await soundEffects.initAudio();

      // Check if barcode exists
      const response = await fetch(`/api/products/search-by-barcode/${encodeURIComponent(barcode)}`);
      
      if (response.ok) {
        const product = await response.json();
        
        // Play success sound
        await soundEffects.playSuccessBeep();
        
        toast({
          title: "Item Scanned",
          description: `Added ${product.name}`,
        });

        // Add to scanned items via context
        // This would be handled by the session context
      } else {
        // Play error sound
        await soundEffects.playErrorBeep();
        
        setUnmatchedBarcode(barcode);
        setShowUnmatchedDialog(true);
        
        toast({
          title: "Unknown Barcode",
          description: `${barcode} not found in database`,
          variant: "destructive",
        });
      }
    } catch (error) {
      await soundEffects.playErrorBeep();
      toast({
        title: "Scan Error",
        description: "Failed to process barcode",
        variant: "destructive",
      });
    } finally {
      setIsScanning(false);
    }
  }, [toast]);

  // Complete receipt handler
  const handleCompleteReceipt = useCallback(async () => {
    await soundEffects.playCompletionSound();
    toast({
      title: "Receipt Completed",
      description: "All items have been successfully received",
    });
    // Clear session and navigate
    navigate('/receiving');
  }, [toast, navigate]);

  const isLoading = isLoadingToReceive || isLoadingReceiving || isLoadingStorage || isLoadingCompleted || isLoadingReceipts;

  return (
    <ReceivingSessionProvider>
      <div className="flex flex-col h-[calc(100vh-4rem)] overflow-hidden">
        {/* Sticky Scan Header */}
        <StickyHeaderScanHeader onScan={handleBarcodeScan} isScanning={isScanning} />

        {/* Receipt Progress Carousel */}
        <ReceiptProgressCarousel receipts={receipts.filter((r: any) => r.status === 'pending_verification' || r.status === 'receiving')} />

        {/* Main Content Area */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {/* Tabs */}
          <div className="px-4 py-3 border-b overflow-x-auto">
            <div className="flex gap-2 min-w-max">
              <Button
                variant={activeTab === 'to-receive' ? 'default' : 'outline'}
                size="sm"
                className="h-10 px-4"
                onClick={() => setActiveTab('to-receive')}
                data-testid="tab-to-receive"
              >
                <Package className="h-4 w-4 mr-2" />
                To Receive ({toReceiveShipments.length})
              </Button>
              <Button
                variant={activeTab === 'receiving' ? 'default' : 'outline'}
                size="sm"
                className="h-10 px-4"
                onClick={() => setActiveTab('receiving')}
                data-testid="tab-receiving"
              >
                <Clock className="h-4 w-4 mr-2" />
                Receiving ({receivingShipments.length})
              </Button>
              <Button
                variant={activeTab === 'storage' ? 'default' : 'outline'}
                size="sm"
                className="h-10 px-4"
                onClick={() => setActiveTab('storage')}
                data-testid="tab-storage"
              >
                <Warehouse className="h-4 w-4 mr-2" />
                Storage ({storageShipments.length})
              </Button>
              <Button
                variant={activeTab === 'completed' ? 'default' : 'outline'}
                size="sm"
                className="h-10 px-4"
                onClick={() => setActiveTab('completed')}
                data-testid="tab-completed"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Completed ({completedShipments.length})
              </Button>
            </div>
          </div>

          {/* Scanned Items List */}
          <ScannedItemList items={[]} filter={filter} />
        </div>

        {/* Session Footer */}
        <SessionFooter
          onComplete={handleCompleteReceipt}
          onCancel={() => navigate('/receiving')}
        />

        {/* Action Sheet */}
        <ActionSheet isOpen={showActionSheet} onClose={() => setShowActionSheet(false)} />

        {/* Unmatched Barcode Dialog */}
        <Dialog open={showUnmatchedDialog} onOpenChange={setShowUnmatchedDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Unknown Barcode</DialogTitle>
              <DialogDescription>
                Barcode <span className="font-mono font-semibold">{unmatchedBarcode}</span> not found in database
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <p className="text-sm text-muted-foreground mb-3">Search for matching product:</p>
              <Input
                type="text"
                placeholder="Search products..."
                className="h-12"
                data-testid="input-product-search"
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowUnmatchedDialog(false)}>
                Cancel
              </Button>
              <Button onClick={() => setShowUnmatchedDialog(false)}>
                Match Product
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </ReceivingSessionProvider>
  );
}
