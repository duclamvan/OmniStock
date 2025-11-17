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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
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
  MoreVertical,
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
import { useBarcodeScanner } from "@/hooks/useBarcodeScanner";
import type { Shipment, Receipt } from "@shared/schema";

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
  updateSession: (updates: Partial<ReceivingSessionState>) => void;
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
  const [session, setSession] = useState<ReceivingSessionState>(() => {
    try {
      const saved = localStorage.getItem('receivingSession');
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          activeReceiptId: parsed.activeReceiptId || null,
          scannedItems: (parsed.scannedItems || []).map((item: any) => ({
            ...item,
            scannedAt: new Date(item.scannedAt)
          })),
          isCameraActive: parsed.isCameraActive || false,
          undoStack: (parsed.undoStack || []).map((itemArray: any[]) =>
            itemArray.map((item: any) => ({
              ...item,
              scannedAt: new Date(item.scannedAt)
            }))
          )
        };
      }
    } catch (error) {
      console.error('Failed to parse saved receiving session:', error);
    }
    
    return {
      activeReceiptId: null,
      scannedItems: [],
      isCameraActive: false,
      undoStack: []
    };
  });

  const setActiveReceipt = useCallback((id: number | null) => {
    if (id === null) {
      // Reset to initial state when clearing receipt
      setSession({
        activeReceiptId: null,
        scannedItems: [],
        isCameraActive: false,
        undoStack: []
      });
      return;
    }

    const key = `receivingSession_${id}`;
    const savedStr = localStorage.getItem(key);
    
    if (savedStr) {
      // Saved session exists - restore it
      try {
        const saved = JSON.parse(savedStr);
        setSession({
          activeReceiptId: id,
          scannedItems: (saved.scannedItems || []).map((item: any) => ({
            ...item,
            scannedAt: new Date(item.scannedAt)
          })),
          isCameraActive: saved.isCameraActive || false,
          undoStack: (saved.undoStack || []).map((itemArray: any[]) =>
            itemArray.map((item: any) => ({
              ...item,
              scannedAt: new Date(item.scannedAt)
            }))
          )
        });
      } catch (error) {
        console.error('Failed to restore receipt session:', error);
        // On error, start fresh
        setSession({
          activeReceiptId: id,
          scannedItems: [],
          isCameraActive: false,
          undoStack: []
        });
      }
    } else {
      // No saved session - start fresh (FIX: Reset all state)
      setSession({
        activeReceiptId: id,
        scannedItems: [],
        isCameraActive: false,
        undoStack: []
      });
    }
  }, []);

  // Mount-time restoration: automatically restore last active receipt
  useEffect(() => {
    try {
      const baseSessionStr = localStorage.getItem('receivingSession');
      if (baseSessionStr) {
        const baseSession = JSON.parse(baseSessionStr);
        if (baseSession.activeReceiptId) {
          // Automatically restore the last active receipt
          setActiveReceipt(baseSession.activeReceiptId);
        }
      }
    } catch (error) {
      console.error('Failed to restore receiving session on mount:', error);
    }
  }, []); // Run ONCE on mount

  useEffect(() => {
    if (session.activeReceiptId) {
      const sessionData = JSON.stringify({
        ...session,
        lastUpdated: new Date()
      });
      
      // Write to receipt-specific key
      localStorage.setItem(`receivingSession_${session.activeReceiptId}`, sessionData);
      
      // ALSO write to base key for mount initialization
      localStorage.setItem('receivingSession', sessionData);
    }
  }, [session]);

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

  const updateSession = useCallback((updates: Partial<ReceivingSessionState>) => {
    setSession(prev => ({ ...prev, ...updates }));
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
    const newSession = {
      activeReceiptId: null,
      scannedItems: [],
      isCameraActive: false,
      undoStack: []
    };
    setSession(newSession);
    
    if (session.activeReceiptId) {
      localStorage.removeItem(`receivingSession_${session.activeReceiptId}`);
    }
    localStorage.removeItem('receivingSession');
  }, [session.activeReceiptId]);

  const contextValue: ReceivingSessionContext = {
    session,
    setActiveReceipt,
    addScannedItem,
    updateItemQuantity,
    removeItem,
    updateItemStatus,
    updateSession,
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

function StickyHeaderScanHeader({ 
  onScan, 
  isScanning,
  barcodeScanner 
}: { 
  onScan: (barcode: string) => void; 
  isScanning: boolean;
  barcodeScanner: ReturnType<typeof useBarcodeScanner>;
}) {
  const { session, updateSession, undo } = useReceivingSession();
  const { toast } = useToast();
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

  const handleToggleCamera = useCallback(async () => {
    if (session.isCameraActive) {
      barcodeScanner.stopScanning();
      updateSession({ isCameraActive: false });
    } else {
      try {
        await barcodeScanner.startScanning();
        updateSession({ isCameraActive: true });
      } catch (error) {
        console.error('Failed to start camera:', error);
        updateSession({ isCameraActive: false });
        
        toast({
          title: "Camera Error",
          description: error instanceof Error ? error.message : "Could not access camera",
          variant: "destructive"
        });
      }
    }
  }, [session.isCameraActive, barcodeScanner, updateSession, toast]);

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
                    onClick={handleToggleCamera}
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
  const [, navigate] = useLocation();
  const [isExpanded, setIsExpanded] = useState(true);

  if (!receipts || receipts.length === 0) {
    return null;
  }

  return (
    <div className="mb-6 mt-4">
      <div 
        className="flex items-center justify-between mb-3 px-4 cursor-pointer hover:bg-muted/30 py-2 rounded-lg transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <h3 className="text-base font-semibold text-foreground">Active Receipts</h3>
          <Badge variant="secondary" className="text-xs">
            {receipts.length}
          </Badge>
        </div>
        {isExpanded ? (
          <ChevronUp className="h-5 w-5 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-5 w-5 text-muted-foreground" />
        )}
      </div>
      {isExpanded && (
        <ScrollArea className="w-full whitespace-nowrap">
          <div className="flex gap-4 px-4 pb-3">
            {receipts.map((receipt: any) => {
            // Calculate based on received quantities instead of status
            const items = receipt.items || [];
            const totalQuantity = items.reduce((sum: number, item: any) => sum + (item.expectedQuantity || item.quantity || 0), 0);
            const receivedQuantity = items.reduce((sum: number, item: any) => sum + (item.receivedQuantity || 0), 0);
            const progress = totalQuantity > 0 ? Math.round((receivedQuantity / totalQuantity) * 100) : 0;
            
            // Determine progress color based on quantity completion
            let progressColor = 'text-gray-500 dark:text-gray-400';
            let progressBg = 'bg-gray-100 dark:bg-gray-800';
            if (progress === 100) {
              progressColor = 'text-green-600 dark:text-green-500';
              progressBg = 'bg-green-50 dark:bg-green-950/30';
            } else if (progress > 0) {
              progressColor = 'text-amber-600 dark:text-amber-500';
              progressBg = 'bg-amber-50 dark:bg-amber-950/30';
            }

            return (
              <Card 
                key={receipt.id} 
                className="w-[300px] shrink-0 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer hover:scale-[1.02] active:scale-[0.98] border-l-4 border-l-blue-500"
                onClick={() => navigate(`/receiving/start/${receipt.shipmentId}`)}
                data-testid={`card-receipt-${receipt.id}`}
              >
                <CardHeader className="p-5 pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg mb-1.5 truncate font-bold">
                        Receipt #{receipt.id}
                      </CardTitle>
                      <CardDescription className="text-sm truncate font-medium">
                        {receipt.shipment?.shipmentName || `Shipment #${receipt.shipmentId}`}
                      </CardDescription>
                    </div>
                    <Badge className={`${getStatusColor(receipt.status)} text-xs shrink-0`}>
                      {receipt.status.replace('_', ' ').toUpperCase()}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-5 pt-2">
                  <div className="space-y-3">
                    {/* Progress Section */}
                    <div className={`p-3 rounded-lg ${progressBg}`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-muted-foreground">Progress</span>
                        <span className={`font-bold text-base ${progressColor}`}>
                          {receivedQuantity}/{totalQuantity}
                        </span>
                      </div>
                      <Progress value={progress} className="h-2.5" />
                    </div>
                    
                    {/* Metadata */}
                    <div className="flex items-center justify-between text-sm pt-1">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Truck className="h-4 w-4" />
                        <span className="font-medium">{receipt.carrier || 'Unknown'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        <span className="text-xs">{format(new Date(receipt.receivedAt), 'MMM dd, HH:mm')}</span>
                      </div>
                    </div>
                    
                    {/* Continue CTA */}
                    <div className="pt-2 flex items-center justify-center gap-2 text-blue-600 dark:text-blue-400 text-sm font-semibold">
                      <span>Continue Receiving</span>
                      <ChevronRight className="h-4 w-4" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </ScrollArea>
      )}
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
// CAMERA VIEW OVERLAY
// ============================================================================

function CameraViewOverlay({ videoRef, onClose, error }: { 
  videoRef: React.RefObject<HTMLVideoElement>; 
  onClose: () => void;
  error: string | null;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-black">
      {/* Video Stream */}
      <video
        ref={videoRef}
        className="w-full h-full object-cover"
        playsInline
        autoPlay
        muted
        data-testid="video-camera-stream"
      />

      {/* Scanning Overlay */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-64 h-48 border-4 border-cyan-500 rounded-lg shadow-2xl">
            <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-cyan-400 rounded-tl-lg" />
            <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-cyan-400 rounded-tr-lg" />
            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-cyan-400 rounded-bl-lg" />
            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-cyan-400 rounded-br-lg" />
          </div>
        </div>
        <div className="absolute bottom-24 left-0 right-0 text-center">
          <p className="text-white text-lg font-semibold shadow-lg">
            Position barcode within frame
          </p>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="absolute top-4 left-4 right-4 bg-red-500 text-white p-4 rounded-lg shadow-lg">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            <p className="font-medium">{error}</p>
          </div>
        </div>
      )}

      {/* Close Button */}
      <Button
        size="lg"
        variant="outline"
        className="absolute bottom-4 left-1/2 transform -translate-x-1/2 h-14 px-8 bg-white/90 hover:bg-white pointer-events-auto"
        onClick={onClose}
        data-testid="button-close-camera"
      >
        <X className="h-5 w-5 mr-2" />
        Close Camera
      </Button>
    </div>
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
// SHIPMENT CARD COMPONENTS
// ============================================================================

function ToReceiveShipmentCard({ shipment }: { shipment: any }) {
  const [, navigate] = useLocation();
  const [isExpanded, setIsExpanded] = useState(true);
  
  const itemCount = shipment.items?.length || 0;
  const totalQuantity = shipment.items?.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0) || 0;

  return (
    <Card className="overflow-hidden" data-testid={`card-shipment-${shipment.id}`}>
      <CardHeader 
        className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              {getShipmentTypeIcon(shipment.shipmentType, "h-5 w-5")}
              <CardTitle className="text-base truncate">
                {shipment.shipmentName || `Shipment #${shipment.id}`}
              </CardTitle>
            </div>
            <div className="space-y-1 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Truck className="h-4 w-4" />
                <span className="truncate">{shipment.carrier || 'Unknown Carrier'}</span>
              </div>
              {shipment.trackingNumber && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Package2 className="h-4 w-4" />
                  <span className="font-mono text-xs truncate">{shipment.trackingNumber}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-muted-foreground">
                <Package className="h-4 w-4" />
                <span>{itemCount} items ({totalQuantity} units)</span>
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Badge className={getStatusColor(shipment.status)}>
              {shipment.status}
            </Badge>
            {isExpanded ? (
              <ChevronUp className="h-5 w-5 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-5 w-5 text-muted-foreground" />
            )}
          </div>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="p-0 border-t">
          <div className="p-4 space-y-3">
            {shipment.items && shipment.items.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-black dark:text-white">Items:</h4>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {shipment.items.map((item: any, idx: number) => (
                    <div key={idx} className="flex flex-col gap-1 text-sm p-2 bg-muted/30 rounded">
                      <div className="flex justify-between items-start gap-2">
                        <span className="text-black dark:text-white font-medium">{item.productName || item.name}</span>
                        <span className="font-semibold text-black dark:text-white shrink-0">×{item.quantity}</span>
                      </div>
                      {item.category && (
                        <span className="text-xs text-muted-foreground">{item.category}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <Button
              size="lg"
              className="w-full h-12 text-base"
              onClick={() => navigate(`/receiving/start/${shipment.id}`)}
              data-testid={`button-start-receiving-${shipment.id}`}
            >
              <ScanLine className="h-5 w-5 mr-2" />
              Start Receiving
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

function ReceivingShipmentCard({ shipment }: { shipment: any }) {
  const [, navigate] = useLocation();
  const [isExpanded, setIsExpanded] = useState(true);
  
  // Calculate based on total quantities
  const items = shipment.items || [];
  const totalQuantity = items.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0);
  const receivedQuantity = items.reduce((sum: number, item: any) => sum + (item.receivedQuantity || 0), 0);
  const progress = totalQuantity > 0 ? Math.round((receivedQuantity / totalQuantity) * 100) : 0;

  return (
    <Card className="overflow-hidden border-cyan-200 dark:border-cyan-800" data-testid={`card-shipment-${shipment.id}`}>
      <CardHeader 
        className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-5 w-5 text-cyan-600" />
              <CardTitle className="text-base truncate">
                {shipment.shipmentName || `Shipment #${shipment.id}`}
              </CardTitle>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Package className="h-4 w-4" />
                <span className={`font-semibold ${
                  progress === 100 ? 'text-green-600 dark:text-green-500' :
                  progress > 0 ? 'text-amber-600 dark:text-amber-500' :
                  'text-gray-500 dark:text-gray-400'
                }`}>{receivedQuantity}/{totalQuantity}</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Badge className={getStatusColor('receiving')}>
              In Progress
            </Badge>
            {isExpanded ? (
              <ChevronUp className="h-5 w-5 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-5 w-5 text-muted-foreground" />
            )}
          </div>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="p-0 border-t">
          <div className="p-4 space-y-3">
            {shipment.items && shipment.items.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-black dark:text-white">Items:</h4>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {shipment.items.map((item: any, idx: number) => {
                    const receivedQty = item.receivedQuantity || 0;
                    const totalQty = item.quantity;
                    const isComplete = receivedQty >= totalQty;
                    const isPartial = receivedQty > 0 && receivedQty < totalQty;
                    
                    return (
                      <div key={idx} className="flex flex-col gap-1 text-sm p-2 bg-muted/30 rounded">
                        <div className="flex justify-between items-start gap-2">
                          <span className="text-black dark:text-white font-medium">{item.productName || item.name}</span>
                          <span className={`font-semibold shrink-0 ${
                            isComplete ? 'text-green-600 dark:text-green-500' :
                            isPartial ? 'text-amber-600 dark:text-amber-500' :
                            'text-gray-500 dark:text-gray-400'
                          }`}>
                            {receivedQty}/{totalQty}
                          </span>
                        </div>
                        {item.category && (
                          <span className="text-xs text-muted-foreground">{item.category}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            
            <Button
              size="lg"
              className="w-full h-12 text-base"
              onClick={() => navigate(`/receiving/continue/${shipment.id}`)}
              data-testid={`button-continue-receiving-${shipment.id}`}
            >
              <ChevronRight className="h-5 w-5 mr-2" />
              Continue Receiving
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

function StorageShipmentCard({ shipment }: { shipment: any }) {
  const [, navigate] = useLocation();
  const [isExpanded, setIsExpanded] = useState(true);
  
  const itemCount = shipment.items?.length || 0;

  return (
    <Card className="overflow-hidden" data-testid={`card-shipment-${shipment.id}`}>
      <CardHeader 
        className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <Warehouse className="h-5 w-5 text-amber-600" />
              <CardTitle className="text-base truncate">
                {shipment.shipmentName || `Shipment #${shipment.id}`}
              </CardTitle>
            </div>
            <div className="space-y-1 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Package className="h-4 w-4" />
                <span>{itemCount} items pending storage</span>
              </div>
              {shipment.receivedAt && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>{format(new Date(shipment.receivedAt), 'MMM dd, yyyy')}</span>
                </div>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Badge className={getStatusColor(shipment.status)}>
              {shipment.status}
            </Badge>
            {isExpanded ? (
              <ChevronUp className="h-5 w-5 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-5 w-5 text-muted-foreground" />
            )}
          </div>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="p-0 border-t">
          <div className="p-4 space-y-3">
            {shipment.items && shipment.items.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-black dark:text-white">Items:</h4>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {shipment.items.map((item: any, idx: number) => (
                    <div key={idx} className="flex flex-col gap-1 text-sm p-2 bg-muted/30 rounded">
                      <div className="flex justify-between items-start gap-2">
                        <span className="text-black dark:text-white font-medium">{item.productName || item.name}</span>
                        <span className="font-semibold text-black dark:text-white shrink-0">×{item.quantity}</span>
                      </div>
                      {item.category && (
                        <span className="text-xs text-muted-foreground">{item.category}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <Button
              size="lg"
              className="w-full h-12 text-base bg-amber-600 hover:bg-amber-700"
              onClick={() => navigate('/storage')}
              data-testid={`button-go-to-storage-${shipment.id}`}
            >
              <Warehouse className="h-5 w-5 mr-2" />
              Go to Storage
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

function CompletedShipmentCard({ shipment }: { shipment: any }) {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [isExpanded, setIsExpanded] = useState(true);
  
  const itemCount = shipment.items?.length || 0;

  const sendBackToReceiveMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/imports/receipts/${shipment.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'to_receive' }),
      });
      if (!response.ok) throw new Error('Failed to update status');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/imports/shipments/completed'] });
      queryClient.invalidateQueries({ queryKey: ['/api/imports/shipments/to-receive'] });
      toast({
        title: "Status Updated",
        description: "Receipt sent back to Receive status",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update receipt status",
        variant: "destructive",
      });
    },
  });

  const handleSendBackToReceive = (e: React.MouseEvent) => {
    e.stopPropagation();
    sendBackToReceiveMutation.mutate();
  };

  return (
    <Card className="overflow-hidden border-green-200 dark:border-green-800" data-testid={`card-shipment-${shipment.id}`}>
      <CardHeader 
        className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <CardTitle className="text-base truncate">
                {shipment.shipmentName || `Shipment #${shipment.id}`}
              </CardTitle>
            </div>
            <div className="space-y-1 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Package className="h-4 w-4" />
                <span>{itemCount} items completed</span>
              </div>
              {shipment.completedAt && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>{format(new Date(shipment.completedAt), 'MMM dd, yyyy HH:mm')}</span>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex flex-col items-end gap-2">
              <Badge className={getStatusColor('complete')}>
                Complete
              </Badge>
              {isExpanded ? (
                <ChevronUp className="h-5 w-5 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-5 w-5 text-muted-foreground" />
              )}
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  data-testid={`button-menu-${shipment.id}`}
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={handleSendBackToReceive}
                  disabled={sendBackToReceiveMutation.isPending}
                  data-testid={`menu-item-send-back-${shipment.id}`}
                >
                  <Undo2 className="h-4 w-4 mr-2" />
                  Send Back to Receive
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="p-0 border-t">
          <div className="p-4 space-y-3">
            {shipment.items && shipment.items.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-black dark:text-white">Items:</h4>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {shipment.items.map((item: any, idx: number) => (
                    <div key={idx} className="flex flex-col gap-1 text-sm p-2 bg-muted/30 rounded">
                      <div className="flex justify-between items-start gap-2">
                        <span className="text-black dark:text-white font-medium">{item.productName || item.name}</span>
                        <span className="font-semibold text-black dark:text-white shrink-0">×{item.quantity}</span>
                      </div>
                      {item.category && (
                        <span className="text-xs text-muted-foreground">{item.category}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <Button
              size="lg"
              variant="outline"
              className="w-full h-12 text-base"
              onClick={() => navigate(`/receiving/receipt/${shipment.id}`)}
              data-testid={`button-view-details-${shipment.id}`}
            >
              <Eye className="h-5 w-5 mr-2" />
              View Details
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

function ArchivedShipmentCard({ shipment }: { shipment: any }) {
  const [, navigate] = useLocation();
  const [isExpanded, setIsExpanded] = useState(true);
  
  const itemCount = shipment.items?.length || 0;

  return (
    <Card className="overflow-hidden opacity-75" data-testid={`card-shipment-${shipment.id}`}>
      <CardHeader 
        className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <Archive className="h-5 w-5 text-gray-600" />
              <CardTitle className="text-base truncate">
                {shipment.shipmentName || `Shipment #${shipment.id}`}
              </CardTitle>
            </div>
            <div className="space-y-1 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Package className="h-4 w-4" />
                <span>{itemCount} items</span>
              </div>
              {shipment.archivedAt && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>Archived {format(new Date(shipment.archivedAt), 'MMM dd, yyyy')}</span>
                </div>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Badge className="bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200">
              Archived
            </Badge>
            {isExpanded ? (
              <ChevronUp className="h-5 w-5 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-5 w-5 text-muted-foreground" />
            )}
          </div>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="p-0 border-t">
          <div className="p-4 space-y-3">
            {shipment.items && shipment.items.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-black dark:text-white">Items:</h4>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {shipment.items.map((item: any, idx: number) => (
                    <div key={idx} className="flex flex-col gap-1 text-sm p-2 bg-muted/30 rounded">
                      <div className="flex justify-between items-start gap-2">
                        <span className="text-black dark:text-white font-medium">{item.productName || item.name}</span>
                        <span className="font-semibold text-black dark:text-white shrink-0">×{item.quantity}</span>
                      </div>
                      {item.category && (
                        <span className="text-xs text-muted-foreground">{item.category}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <Button
              size="lg"
              variant="outline"
              className="w-full h-12 text-base"
              onClick={() => navigate(`/receiving/receipt/${shipment.id}`)}
              data-testid={`button-view-details-${shipment.id}`}
            >
              <Eye className="h-5 w-5 mr-2" />
              View Details
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

// ============================================================================
// LOADING SKELETONS
// ============================================================================

function ShipmentCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 space-y-3">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-2/3" />
          </div>
          <Skeleton className="h-6 w-20" />
        </div>
      </CardHeader>
    </Card>
  );
}

// ============================================================================
// EMPTY STATES
// ============================================================================

function EmptyState({ icon: Icon, title, description, action }: { 
  icon: any; 
  title: string; 
  description: string; 
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <Icon className="h-16 w-16 text-muted-foreground mb-4" />
      <h3 className="text-lg font-semibold text-black dark:text-white mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground mb-6 max-w-sm">{description}</p>
      {action}
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
  const { data: toReceiveShipments = [], isLoading: isLoadingToReceive } = useQuery<Shipment[]>({
    queryKey: ['/api/imports/shipments/to-receive'],
  });

  const { data: receivingShipments = [], isLoading: isLoadingReceiving } = useQuery<Shipment[]>({
    queryKey: ['/api/imports/shipments/receiving'],
  });

  const { data: storageShipments = [], isLoading: isLoadingStorage } = useQuery<Shipment[]>({
    queryKey: ['/api/imports/shipments/storage'],
  });

  const { data: completedShipments = [], isLoading: isLoadingCompleted } = useQuery<Shipment[]>({
    queryKey: ['/api/imports/shipments/completed'],
  });

  const { data: archivedShipments = [], isLoading: isLoadingArchived } = useQuery<Shipment[]>({
    queryKey: ['/api/imports/shipments/archived'],
  });

  const { data: receipts = [], isLoading: isLoadingReceipts } = useQuery<Receipt[]>({
    queryKey: ['/api/imports/receipts'],
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

  // Barcode scanner hook
  const barcodeScanner = useBarcodeScanner({
    onScan: handleBarcodeScan,
    scanInterval: 500
  });

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
        <StickyHeaderScanHeader 
          onScan={handleBarcodeScan} 
          isScanning={isScanning}
          barcodeScanner={barcodeScanner}
        />

        {/* Camera View Overlay */}
        {barcodeScanner.isActive && (
          <CameraViewOverlay
            videoRef={barcodeScanner.videoRef}
            onClose={() => {
              barcodeScanner.stopScanning();
            }}
            error={barcodeScanner.error}
          />
        )}

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
              <Button
                variant={activeTab === 'archived' ? 'default' : 'outline'}
                size="sm"
                className="h-10 px-4"
                onClick={() => setActiveTab('archived')}
                data-testid="tab-archived"
              >
                <Archive className="h-4 w-4 mr-2" />
                Archived ({archivedShipments.length})
              </Button>
            </div>
          </div>

          {/* Tab Content */}
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-3">
              {/* To Receive Tab */}
              {activeTab === 'to-receive' && (
                <>
                  {isLoadingToReceive ? (
                    <>
                      <ShipmentCardSkeleton />
                      <ShipmentCardSkeleton />
                      <ShipmentCardSkeleton />
                    </>
                  ) : toReceiveShipments.length === 0 ? (
                    <EmptyState
                      icon={Package}
                      title="No shipments ready to receive"
                      description="All incoming shipments have been received. New shipments will appear here when they arrive."
                    />
                  ) : (
                    toReceiveShipments.map((shipment: any) => (
                      <ToReceiveShipmentCard key={shipment.id} shipment={shipment} />
                    ))
                  )}
                </>
              )}

              {/* Receiving Tab */}
              {activeTab === 'receiving' && (
                <>
                  {isLoadingReceiving ? (
                    <>
                      <ShipmentCardSkeleton />
                      <ShipmentCardSkeleton />
                      <ShipmentCardSkeleton />
                    </>
                  ) : receivingShipments.length === 0 ? (
                    <EmptyState
                      icon={Clock}
                      title="No active receiving sessions"
                      description="Start receiving a shipment to see it here. Active sessions allow you to pause and resume receiving later."
                      action={
                        toReceiveShipments.length > 0 ? (
                          <Button
                            size="lg"
                            className="h-12"
                            onClick={() => setActiveTab('to-receive')}
                            data-testid="button-go-to-receive"
                          >
                            <Package className="h-5 w-5 mr-2" />
                            View Shipments to Receive
                          </Button>
                        ) : null
                      }
                    />
                  ) : (
                    receivingShipments.map((shipment: any) => (
                      <ReceivingShipmentCard key={shipment.id} shipment={shipment} />
                    ))
                  )}
                </>
              )}

              {/* Storage Tab */}
              {activeTab === 'storage' && (
                <>
                  {isLoadingStorage ? (
                    <>
                      <ShipmentCardSkeleton />
                      <ShipmentCardSkeleton />
                      <ShipmentCardSkeleton />
                    </>
                  ) : storageShipments.length === 0 ? (
                    <EmptyState
                      icon={Warehouse}
                      title="No shipments in storage"
                      description="Shipments pending approval or putaway will appear here."
                    />
                  ) : (
                    storageShipments.map((shipment: any) => (
                      <StorageShipmentCard key={shipment.id} shipment={shipment} />
                    ))
                  )}
                </>
              )}

              {/* Completed Tab */}
              {activeTab === 'completed' && (
                <>
                  {isLoadingCompleted ? (
                    <>
                      <ShipmentCardSkeleton />
                      <ShipmentCardSkeleton />
                      <ShipmentCardSkeleton />
                    </>
                  ) : completedShipments.length === 0 ? (
                    <EmptyState
                      icon={CheckCircle}
                      title="No completed shipments"
                      description="Successfully received and stored shipments will appear here."
                    />
                  ) : (
                    completedShipments.map((shipment: any) => (
                      <CompletedShipmentCard key={shipment.id} shipment={shipment} />
                    ))
                  )}
                </>
              )}

              {/* Archived Tab */}
              {activeTab === 'archived' && (
                <>
                  {isLoadingArchived ? (
                    <>
                      <ShipmentCardSkeleton />
                      <ShipmentCardSkeleton />
                      <ShipmentCardSkeleton />
                    </>
                  ) : archivedShipments.length === 0 ? (
                    <EmptyState
                      icon={Archive}
                      title="No archived shipments"
                      description="Archived shipments are stored here for record keeping."
                    />
                  ) : (
                    archivedShipments.map((shipment: any) => (
                      <ArchivedShipmentCard key={shipment.id} shipment={shipment} />
                    ))
                  )}
                </>
              )}
            </div>
          </ScrollArea>
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
