import { useState, useEffect, useMemo, useCallback, useRef, createContext, useContext } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Square,
  Star,
  Save,
  ArrowUp,
  ArrowDown,
  QrCode,
  Check,
  Printer,
  FileText,
  DollarSign,
  Tag,
  XCircle,
  Image as ImageIcon
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { soundEffects } from "@/utils/soundEffects";
import { useBarcodeScanner } from "@/hooks/useBarcodeScanner";
import { ScanFeedback } from "@/components/ScanFeedback";
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
// STATS CARD COMPONENT
// ============================================================================

function StatsCard({ 
  icon: Icon, 
  title, 
  value, 
  color = "blue" 
}: { 
  icon: any; 
  title: string; 
  value: number; 
  color?: "blue" | "cyan" | "green" | "purple";
}) {
  const colorClasses = {
    blue: "bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400",
    cyan: "bg-cyan-50 text-cyan-600 dark:bg-cyan-950/30 dark:text-cyan-400",
    green: "bg-green-50 text-green-600 dark:bg-green-950/30 dark:text-green-400",
    purple: "bg-purple-50 text-purple-600 dark:bg-purple-950/30 dark:text-purple-400"
  };

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4 md:p-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-muted-foreground mb-1">{title}</p>
            <p className="text-2xl md:text-3xl font-bold">{value}</p>
          </div>
          <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// FLOATING SCAN BUTTON
// ============================================================================

function FloatingScanButton({ 
  onScan, 
  isScanning,
  barcodeScanner 
}: { 
  onScan: (barcode: string) => void; 
  isScanning: boolean;
  barcodeScanner: ReturnType<typeof useBarcodeScanner>;
}) {
  const { t } = useTranslation(['imports']);
  const { session, updateSession } = useReceivingSession();
  const { toast } = useToast();
  const [showScanDialog, setShowScanDialog] = useState(false);
  const [manualBarcode, setManualBarcode] = useState("");
  const scanInputRef = useRef<HTMLInputElement>(null);

  const handleManualScan = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (manualBarcode.trim()) {
      onScan(manualBarcode.trim());
      setManualBarcode("");
      setShowScanDialog(false);
    }
  }, [manualBarcode, onScan]);

  const handleToggleCamera = useCallback(async () => {
    if (session.isCameraActive) {
      barcodeScanner.stopScanning();
      updateSession({ isCameraActive: false });
      setShowScanDialog(false);
    } else {
      try {
        await barcodeScanner.startScanning();
        updateSession({ isCameraActive: true });
        setShowScanDialog(false);
      } catch (error) {
        console.error('Failed to start camera:', error);
        updateSession({ isCameraActive: false });
        
        toast({
          title: t('cameraError'),
          description: error instanceof Error ? error.message : t('couldNotAccessCamera'),
          variant: "destructive"
        });
      }
    }
  }, [session.isCameraActive, barcodeScanner, updateSession, toast]);

  return (
    <>
      {/* Floating Action Button */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="lg"
              className="fixed bottom-20 md:bottom-6 left-1/2 md:left-auto md:right-6 transform -translate-x-1/2 md:translate-x-0 h-14 w-14 rounded-full shadow-lg hover:shadow-xl z-40"
              onClick={() => setShowScanDialog(true)}
              data-testid="button-floating-scan"
            >
              <ScanLine className="h-6 w-6" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{t('scanBarcode')}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Scan Dialog */}
      <Dialog open={showScanDialog} onOpenChange={setShowScanDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ScanLine className="h-5 w-5" />
              {t('scanBarcode')}
            </DialogTitle>
            <DialogDescription>
              {t('scanOrEnterBarcodeManually')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Manual Input */}
            <form onSubmit={handleManualScan} className="space-y-3">
              <Input
                ref={scanInputRef}
                type="text"
                placeholder={t('enterBarcode')}
                value={manualBarcode}
                onChange={(e) => setManualBarcode(e.target.value)}
                className="h-12 text-base"
                data-testid="input-barcode"
                autoFocus
              />
              <Button 
                type="submit" 
                size="lg" 
                className="w-full h-12 text-base"
                disabled={!manualBarcode.trim()}
                data-testid="button-scan"
              >
                <ScanLine className="h-5 w-5 mr-2" />
                {t('scan')}
              </Button>
            </form>

            {/* Camera Toggle */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  {t('or')}
                </span>
              </div>
            </div>

            <Button
              variant="outline"
              size="lg"
              className="w-full h-12 text-base"
              onClick={handleToggleCamera}
              data-testid="button-toggle-camera"
            >
              <Camera className="h-5 w-5 mr-2" />
              {t('useCameraScanner')}
            </Button>

            {isScanning && (
              <div className="flex items-center gap-2 text-sm text-cyan-600 dark:text-cyan-400 justify-center">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>{t('processingScan')}</span>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ============================================================================
// RECEIPT PROGRESS CAROUSEL
// ============================================================================

function ReceiptProgressCarousel({ receipts }: { receipts: any[] }) {
  const { t } = useTranslation(['imports']);
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
          <h3 className="text-base font-semibold text-foreground">{t('activeReceipts')}</h3>
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
                        {t('receiptNumber', { number: receipt.id })}
                      </CardTitle>
                      <CardDescription className="text-sm truncate font-medium">
                        {receipt.shipment?.shipmentName || t('shipmentNumber', { number: receipt.shipmentId })}
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
                        <span className="font-medium">{receipt.carrier || t('unknownCarrier')}</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        <span className="text-xs">{format(new Date(receipt.receivedAt), 'MMM dd, HH:mm')}</span>
                      </div>
                    </div>
                    
                    {/* Continue CTA */}
                    <div className="pt-2 flex items-center justify-center gap-2 text-blue-600 dark:text-blue-400 text-sm font-semibold">
                      <span>{t('continueReceiving')}</span>
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
  const { t } = useTranslation(['imports']);
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
        <p className="text-sm font-medium text-muted-foreground">{t('noScannedItems')}</p>
        <p className="text-xs text-muted-foreground mt-1">{t('startScanningBarcodes')}</p>
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
                    <p className="text-xs text-muted-foreground font-mono">{t('sku')}: {item.sku}</p>
                  )}
                  <p className="text-xs text-muted-foreground">{t('barcode')}: {item.barcode}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-10 w-10 p-0 text-muted-foreground hover:text-destructive"
                  onClick={() => removeItem(item.id)}
                  aria-label={t('removeItem')}
                  data-testid={`button-remove-${item.id}`}
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>

              {/* Quantity Stepper - Large touch targets */}
              <div className="flex items-center justify-between px-4 pb-3">
                <span className="text-sm font-medium">{t('quantityLabel')}:</span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="lg"
                    className="h-12 w-12 p-0"
                    onClick={() => updateItemQuantity(item.id, -1)}
                    disabled={item.quantity <= 0}
                    aria-label={t('decreaseQuantity')}
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
                    aria-label={t('increaseQuantity')}
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
                  {t('completeStatus')}
                </Button>
                <Button
                  size="sm"
                  variant={item.status === 'partial' ? 'default' : 'outline'}
                  className="h-10 px-4"
                  onClick={() => updateItemStatus(item.id, 'partial')}
                  data-testid={`button-status-partial-${item.id}`}
                >
                  <AlertCircle className="h-4 w-4 mr-2" />
                  {t('partialStatus')}
                </Button>
                <Button
                  size="sm"
                  variant={item.status === 'damaged' ? 'default' : 'outline'}
                  className="h-10 px-4"
                  onClick={() => updateItemStatus(item.id, 'damaged')}
                  data-testid={`button-status-damaged-${item.id}`}
                >
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  {t('damagedStatus')}
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
  const { t } = useTranslation(['imports']);
  const { session, clearSession } = useReceivingSession();
  const { toast } = useToast();

  const handleMarkAllComplete = () => {
    session.scannedItems.forEach(item => {
      // Mark as complete via API
    });
    toast({
      title: t('batchUpdate'),
      description: t('allItemsMarkedAsComplete'),
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
  const { t } = useTranslation(['imports']);
  
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
        className="absolute bottom-4 left-1/2 transform -translate-x-1/2 h-14 px-8 bg-white/90 dark:bg-slate-800/90 hover:bg-white dark:hover:bg-slate-800 pointer-events-auto"
        onClick={onClose}
        data-testid="button-close-camera"
      >
        <X className="h-5 w-5 mr-2" />
        {t('closeCamera')}
      </Button>
    </div>
  );
}

// ============================================================================
// SESSION FOOTER
// ============================================================================

function SessionFooter({ onComplete, onCancel }: { onComplete: () => void; onCancel: () => void }) {
  const { t } = useTranslation(['imports']);
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
          {t('cancel')}
        </Button>
        <Button
          size="lg"
          className="flex-1 h-14 text-base bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800"
          onClick={onComplete}
          disabled={!hasItems}
          data-testid="button-complete"
        >
          <CheckCircle className="h-5 w-5 mr-2" />
          {t('completeReceipt')}
        </Button>
      </div>
    </div>
  );
}

// ============================================================================
// SHIPMENT CARD COMPONENTS
// ============================================================================

function ToReceiveShipmentCard({ shipment }: { shipment: any }) {
  const { t } = useTranslation(['imports']);
  const [, navigate] = useLocation();
  const [isExpanded, setIsExpanded] = useState(true);
  
  const itemCount = shipment.items?.length || 0;
  const totalQuantity = shipment.items?.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0) || 0;

  return (
    <Card className="overflow-hidden" data-testid={`card-shipment-${shipment.id}`}>
      <CardHeader 
        className="p-3 md:p-4 cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              {getShipmentTypeIcon(shipment.shipmentType, "h-5 w-5")}
              <CardTitle className="text-base truncate">
                {shipment.shipmentName || t('shipmentNumber', { number: shipment.id })}
              </CardTitle>
            </div>
            <div className="space-y-1 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Truck className="h-4 w-4" />
                <span className="truncate">{shipment.carrier || t('unknownCarrier')}</span>
              </div>
              {shipment.trackingNumber && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Package2 className="h-4 w-4" />
                  <span className="font-mono text-xs truncate">{shipment.trackingNumber}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-muted-foreground">
                <Package className="h-4 w-4" />
                <span>{itemCount} {t('items')} ({totalQuantity} {t('units')})</span>
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
          <div className="p-3 md:p-4 space-y-3">
            {shipment.items && shipment.items.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-foreground">{t('items')}:</h4>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {shipment.items.map((item: any, idx: number) => (
                    <div key={idx} className="flex flex-col gap-1 text-sm p-2 bg-muted/30 rounded">
                      <div className="flex justify-between items-start gap-2">
                        <span className="text-foreground font-medium">{item.productName || item.name}</span>
                        <span className="font-semibold text-foreground shrink-0">×{item.quantity}</span>
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
              {t('startReceiving')}
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

function ReceivingShipmentCard({ shipment }: { shipment: any }) {
  const { t } = useTranslation(['imports']);
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
        className="p-3 md:p-4 cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
              <CardTitle className="text-base truncate">
                {shipment.shipmentName || t('shipmentNumber', { number: shipment.id })}
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
              {t('inProgress')}
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
          <div className="p-3 md:p-4 space-y-3">
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
              {t('continueReceiving')}
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

// ============================================================================
// QUICK STORAGE SHEET COMPONENT
// ============================================================================

interface LocationAssignment {
  id: string;
  locationCode: string;
  locationType: 'display' | 'warehouse' | 'pallet' | 'other';
  quantity: number;
  isPrimary: boolean;
  notes?: string;
  isNew?: boolean;
}

interface StorageItem {
  receiptItemId: number;
  productId?: number | string;
  productName: string;
  sku?: string;
  barcode?: string;
  imageUrl?: string;
  description?: string;
  receivedQuantity: number;
  assignedQuantity: number;
  locations: LocationAssignment[];
  existingLocations: LocationAssignment[];
}

// Helper function to get suggested location from existing inventory
function getSuggestedLocation(item: StorageItem): string | null {
  if (item.existingLocations && item.existingLocations.length > 0) {
    const primaryLoc = item.existingLocations.find(loc => loc.isPrimary);
    if (primaryLoc) return primaryLoc.locationCode;
    const sortedByQty = [...item.existingLocations].sort((a, b) => b.quantity - a.quantity);
    if (sortedByQty.length > 0) return sortedByQty[0].locationCode;
  }
  return null;
}

// Generate AI location suggestion with fallback heuristics
function generateSuggestedLocationWithAI(
  item: StorageItem, 
  aiSuggestions: Map<string | number, { location: string; reasoning: string; zone: string; accessibility: string }>
): string {
  const key = item.productId || item.sku || item.productName;
  if (aiSuggestions.has(key)) {
    return aiSuggestions.get(key)!.location;
  }
  
  // Fallback to heuristic-based suggestion
  const seed = item.productId?.toString() || item.sku || item.productName || 'default';
  const hash = seed.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  
  const productNameLower = item.productName?.toLowerCase() || '';
  
  let aisleNumber = (hash % 6) + 1;
  
  if (productNameLower.includes('mask') || productNameLower.includes('medical')) {
    aisleNumber = 20 + (hash % 3);
  } else if (productNameLower.includes('electronic') || productNameLower.includes('phone')) {
    aisleNumber = 15 + (hash % 3);
  } else if (productNameLower.includes('clothing') || productNameLower.includes('shirt')) {
    aisleNumber = 10 + (hash % 3);
  } else if (productNameLower.includes('food') || productNameLower.includes('snack')) {
    aisleNumber = 25 + (hash % 3);
  } else if (productNameLower.includes('toy') || productNameLower.includes('game')) {
    aisleNumber = 5 + (hash % 3);
  } else if (productNameLower.includes('book') || productNameLower.includes('paper')) {
    aisleNumber = 28 + (hash % 2);
  }
  
  const aisle = `A${String(aisleNumber).padStart(2, '0')}`;
  const rack = `R${String((hash % 8) + 1).padStart(2, '0')}`;
  const level = `L${String((hash % 4) + 1).padStart(2, '0')}`;
  const bin = `B${(hash % 5) + 1}`;
  
  return `WH1-${aisle}-${rack}-${level}-${bin}`;
}

// Get AI reasoning for suggested location
function getAIReasoning(
  item: StorageItem, 
  aiSuggestions: Map<string | number, { location: string; reasoning: string; zone: string; accessibility: string }>
): string | null {
  const key = item.productId || item.sku || item.productName;
  return aiSuggestions.has(key) ? aiSuggestions.get(key)!.reasoning : null;
}

function QuickStorageSheet({ 
  shipment, 
  open, 
  onOpenChange 
}: { 
  shipment: any; 
  open: boolean; 
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useTranslation(['imports', 'warehouse', 'common']);
  const { toast } = useToast();
  
  // State
  const [items, setItems] = useState<StorageItem[]>([]);
  const [selectedItemIndex, setSelectedItemIndex] = useState(0);
  const [locationInput, setLocationInput] = useState("");
  const [quantityInput, setQuantityInput] = useState("");
  const [scanFeedback, setScanFeedback] = useState<{ type: 'success' | 'error' | 'duplicate' | null; message: string }>({ type: null, message: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [showProductDetails, setShowProductDetails] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<Map<string | number, { location: string; reasoning: string; zone: string; accessibility: string }>>(new Map());
  
  // Refs
  const locationInputRef = useRef<HTMLInputElement>(null);
  const quantityInputRef = useRef<HTMLInputElement>(null);
  
  // AI suggestion caching refs to prevent re-fetching on re-open
  const aiSuggestionCache = useRef<Map<string, { location: string; reasoning: string; zone: string; accessibility: string }>>(new Map());
  const aiSuggestionInflight = useRef<Set<string>>(new Set());
  const aiSuggestionFetched = useRef<Set<string>>(new Set());
  
  // Barcode Scanner Integration
  const handleBarcodeScan = useCallback(async (scannedValue: string) => {
    const uppercaseValue = scannedValue.toUpperCase();
    setLocationInput(uppercaseValue);
    
    // Validate location format directly (no synthetic keyboard events)
    if (!/^[A-Z0-9]+-[A-Z0-9]+-[A-Z0-9]+-[A-Z0-9]+$/.test(uppercaseValue)) {
      await soundEffects.playErrorBeep();
      setScanFeedback({ type: 'error', message: t('invalidLocationFormat') });
      setTimeout(() => setScanFeedback({ type: null, message: '' }), 2000);
      toast({
        title: t('invalidLocationFormat'),
        variant: "destructive",
      });
      setLocationInput("");
      return;
    }
    
    // Check for duplicates
    const currentItem = items[selectedItemIndex];
    if (currentItem?.locations.some(loc => loc.locationCode === uppercaseValue)) {
      await soundEffects.playDuplicateBeep();
      setScanFeedback({ type: 'duplicate', message: t('duplicateLocation') });
      setTimeout(() => setScanFeedback({ type: null, message: '' }), 2000);
      toast({
        title: t('duplicateLocation'),
        variant: "destructive",
      });
      setLocationInput("");
      return;
    }
    
    // Determine location type based on prefix
    let locationType: LocationAssignment['locationType'] = 'warehouse';
    if (uppercaseValue.startsWith('DS')) locationType = 'display';
    else if (uppercaseValue.startsWith('PL')) locationType = 'pallet';
    
    // Add new location to current item
    const newLocation: LocationAssignment = {
      id: `new-${Date.now()}`,
      locationCode: uppercaseValue,
      locationType,
      quantity: 0,
      isPrimary: currentItem?.locations.length === 0
    };
    
    const updatedItems = [...items];
    updatedItems[selectedItemIndex].locations.push(newLocation);
    setItems(updatedItems);
    
    // Play success sound and show feedback
    await soundEffects.playSuccessBeep();
    setScanFeedback({ type: 'success', message: `Location scanned: ${uppercaseValue}` });
    setTimeout(() => setScanFeedback({ type: null, message: '' }), 2000);
    
    setLocationInput("");
    
    // Auto-focus on quantity input
    setTimeout(() => quantityInputRef.current?.focus(), 100);
  }, [items, selectedItemIndex, toast, t]);
  
  const barcodeScanner = useBarcodeScanner({
    onScan: handleBarcodeScan,
    scanInterval: 500
  });
  
  // Effect to manage barcode scanner lifecycle
  useEffect(() => {
    if (open && !isSubmitting && barcodeScanner.scanningEnabled) {
      // Auto-start scanner when sheet opens (optional - user can manually start)
      // barcodeScanner.startScanning();
    }
    
    return () => {
      // Stop scanner when sheet closes
      if (barcodeScanner.isActive) {
        barcodeScanner.stopScanning();
      }
    };
  }, [open, isSubmitting, barcodeScanner]);
  
  // Fetch storage items data - use by-shipment endpoint to get receipt with items
  const { data: receiptData, isLoading } = useQuery<any>({
    queryKey: [`/api/imports/receipts/by-shipment/${shipment.id}`],
    enabled: !!shipment.id && open
  });
  
  // Initialize items from receipt data - PRESERVE existing assignedQuantity and locations
  useEffect(() => {
    const receiptItems = receiptData?.shipment?.items || receiptData?.items;
    if (receiptItems) {
      const storageItems: StorageItem[] = receiptItems.map((item: any) => ({
        receiptItemId: item.id,
        productId: item.productId,
        productName: item.productName || item.description || `Item #${item.id}`,
        sku: item.sku,
        barcode: item.barcode,
        imageUrl: item.imageUrl || item.product?.imageUrl,
        description: item.description,
        receivedQuantity: item.receivedQuantity || item.quantity || 0,
        assignedQuantity: item.assignedQuantity || 0,
        locations: item.locations || [],
        existingLocations: item.existingLocations || item.product?.locations || []
      }));
      setItems(storageItems);
    }
  }, [receiptData]);
  
  // Fetch AI suggestions for items without existing locations (with batching and caching)
  useEffect(() => {
    const fetchAISuggestions = async () => {
      // Filter items that need suggestions, using cache to prevent re-fetching
      const itemsNeedingSuggestions = items.filter(item => {
        const key = String(item.productId || item.sku || item.productName);
        // Skip if: has existing locations, already cached, already fetched, or currently fetching
        if (item.existingLocations && item.existingLocations.length > 0) return false;
        if (aiSuggestionCache.current.has(key)) return false;
        if (aiSuggestionFetched.current.has(key)) return false;
        if (aiSuggestionInflight.current.has(key)) return false;
        return true;
      });

      if (itemsNeedingSuggestions.length === 0) {
        // Sync state from cache if needed
        const cacheSize = aiSuggestionCache.current.size;
        if (cacheSize > 0 && aiSuggestions.size < cacheSize) {
          setAiSuggestions(new Map(aiSuggestionCache.current));
        }
        return;
      }

      // Fetch AI suggestions in parallel batches of 3 to avoid API rate limits
      const batchSize = 3;
      for (let i = 0; i < itemsNeedingSuggestions.length; i += batchSize) {
        const batch = itemsNeedingSuggestions.slice(i, i + batchSize);
        
        await Promise.all(
          batch.map(async (item) => {
            const key = String(item.productId || item.sku || item.productName);
            
            // Mark as inflight to prevent duplicate requests
            aiSuggestionInflight.current.add(key);
            
            try {
              const response = await fetch('/api/imports/suggest-storage-location', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  productId: item.productId,
                  productName: item.productName,
                  category: item.description || ''
                })
              });

              if (response.ok) {
                const data = await response.json();
                const suggestion = {
                  location: data.suggestedLocation,
                  reasoning: data.reasoning,
                  zone: data.zone,
                  accessibility: data.accessibility
                };
                
                // Store in cache and mark as fetched
                aiSuggestionCache.current.set(key, suggestion);
                aiSuggestionFetched.current.add(key);
                
                setAiSuggestions(prev => {
                  const newMap = new Map(prev);
                  newMap.set(key, suggestion);
                  return newMap;
                });
              }
            } catch (error) {
              console.error(`Failed to fetch AI suggestion for ${item.productName}:`, error);
              // Mark as fetched even on error to prevent retries
              aiSuggestionFetched.current.add(key);
            } finally {
              aiSuggestionInflight.current.delete(key);
            }
          })
        );

        // Small delay between batches to be respectful of API
        if (i + batchSize < itemsNeedingSuggestions.length) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
    };

    if (items.length > 0 && open) {
      fetchAISuggestions();
    }
  }, [items.length, open]);
  
  // Store location mutation
  const storeLocationMutation = useMutation({
    mutationFn: async ({ productId, locationCode, locationType, quantity, isPrimary }: {
      productId: number;
      locationCode: string;
      locationType: string;
      quantity: number;
      isPrimary: boolean;
    }) => {
      return apiRequest('POST', `/api/products/${productId}/locations`, { locationCode, locationType, quantity, isPrimary });
    },
    onSuccess: (data, variables) => {
      // Force immediate refetch to sync cache and UI
      queryClient.refetchQueries({ queryKey: [`/api/imports/receipts/by-shipment/${shipment.id}`] });
      queryClient.refetchQueries({ queryKey: ['/api/imports/shipments/storage'] });
      // Also invalidate inventory/products queries for real-time stock updates
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      queryClient.invalidateQueries({ queryKey: ['/api/inventory'] });
      queryClient.invalidateQueries({ queryKey: [`/api/products/${variables.productId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/products/${variables.productId}/locations`] });
      
      toast({
        title: t('storedSuccessfully'),
        description: `${variables.quantity} units stored at ${variables.locationCode}`,
        duration: 2000
      });
    },
    onError: (error) => {
      toast({
        title: t('common:error'),
        description: error instanceof Error ? error.message : 'Failed to save storage location',
        variant: "destructive",
      });
    }
  });
  
  // Calculate progress
  const totalItems = items.length;
  const completedItems = items.filter(item => 
    item.assignedQuantity >= item.receivedQuantity
  ).length;
  const progress = totalItems > 0 ? (completedItems / totalItems) * 100 : 0;
  
  const currentItem = items[selectedItemIndex];
  // Calculate remaining quantity including pending location quantities (not yet saved)
  const pendingLocationQuantity = currentItem ? 
    currentItem.locations.reduce((sum, loc) => sum + (loc.quantity || 0), 0) : 0;
  const remainingQuantity = currentItem ? 
    currentItem.receivedQuantity - currentItem.assignedQuantity - pendingLocationQuantity : 0;
  
  // Pre-fill location input with AI suggestion when scanner sheet opens
  useEffect(() => {
    if (showScanner && currentItem) {
      // Get suggested location from existing locations or AI suggestion
      const suggested = getSuggestedLocation(currentItem) || generateSuggestedLocationWithAI(currentItem, aiSuggestions);
      if (suggested && !locationInput) {
        setLocationInput(suggested);
      }
    }
  }, [showScanner, currentItem, aiSuggestions]);
  
  // Handle location scan
  const handleLocationScan = async () => {
    const trimmedValue = locationInput.trim().toUpperCase();
    
    if (!trimmedValue) return;
    
    // Validate location code format (e.g., WH1-A01-R02-L03 or WH1-A01-R02-L03-B3)
    // Accepts 4 parts (warehouse-aisle-rack-level) or 5 parts (with optional bin)
    const locationPattern = /^[A-Z0-9]+-[A-Z0-9]+-[A-Z0-9]+-[A-Z0-9]+(-[A-Z0-9]+)?$/;
    if (!locationPattern.test(trimmedValue)) {
      await soundEffects.playErrorBeep();
      setScanFeedback({ type: 'error', message: t('invalidLocationFormat') });
      setTimeout(() => setScanFeedback({ type: null, message: '' }), 2000);
      toast({
        title: t('common:error'),
        description: t('invalidLocationFormat'),
        variant: "destructive",
        duration: 3000
      });
      setLocationInput("");
      return;
    }
    
    // Check if location already added for this item
    if (currentItem?.locations.some(loc => loc.locationCode === trimmedValue)) {
      await soundEffects.playDuplicateBeep();
      setScanFeedback({ type: 'duplicate', message: `Location already added: ${trimmedValue}` });
      setTimeout(() => setScanFeedback({ type: null, message: '' }), 2000);
      setLocationInput("");
      return;
    }
    
    // Determine location type based on prefix
    let locationType: LocationAssignment['locationType'] = 'warehouse';
    if (trimmedValue.startsWith('DS')) locationType = 'display';
    else if (trimmedValue.startsWith('PL')) locationType = 'pallet';
    
    // Calculate remaining quantity for auto-fill
    const isFirstLocation = currentItem?.locations.length === 0;
    const currentRemaining = currentItem ? 
      currentItem.receivedQuantity - currentItem.assignedQuantity - 
      currentItem.locations.reduce((sum, loc) => sum + (loc.quantity || 0), 0) : 0;
    
    // Add new location to current item - auto-fill quantity for first location
    const newLocation: LocationAssignment = {
      id: `new-${Date.now()}`,
      locationCode: trimmedValue,
      locationType,
      quantity: isFirstLocation ? currentRemaining : 0,
      isPrimary: isFirstLocation
    };
    
    const updatedItems = [...items];
    updatedItems[selectedItemIndex].locations.push(newLocation);
    setItems(updatedItems);
    
    // Play success sound and show feedback
    await soundEffects.playSuccessBeep();
    const feedbackMsg = isFirstLocation && currentRemaining > 0
      ? `Location scanned: ${trimmedValue} (${currentRemaining} units assigned)`
      : `Location scanned: ${trimmedValue}`;
    setScanFeedback({ type: 'success', message: feedbackMsg });
    setTimeout(() => setScanFeedback({ type: null, message: '' }), 2000);
    
    setLocationInput("");
    
    // Auto-focus on quantity input only if not auto-filled
    if (!isFirstLocation) {
      setTimeout(() => quantityInputRef.current?.focus(), 100);
    }
  };
  
  // Handle quantity assignment
  const handleQuantityAssign = async (locationIndex: number) => {
    if (!currentItem) return;
    
    // Harden quantity validation - trim and check for empty
    const trimmedQuantity = quantityInput.trim();
    if (!trimmedQuantity) {
      await soundEffects.playErrorBeep();
      toast({
        title: t('common:error'),
        description: t('pleaseEnterValidQuantity'),
        variant: "destructive",
      });
      return;
    }
    
    const qty = parseInt(trimmedQuantity);
    if (isNaN(qty) || qty <= 0) {
      await soundEffects.playErrorBeep();
      toast({
        title: t('common:error'),
        description: t('pleaseEnterValidQuantity'),
        variant: "destructive",
      });
      return;
    }
    
    const location = currentItem.locations[locationIndex];
    
    // Validate location format (4 or 5 parts with optional bin)
    if (!location.locationCode || !/^[A-Z0-9]+-[A-Z0-9]+-[A-Z0-9]+-[A-Z0-9]+(-[A-Z0-9]+)?$/.test(location.locationCode)) {
      await soundEffects.playErrorBeep();
      toast({
        title: t('invalidLocationFormat'),
        variant: "destructive",
      });
      return;
    }
    
    const maxQuantity = currentItem.receivedQuantity - currentItem.assignedQuantity;
    
    // Validate quantity doesn't exceed remaining
    if (qty > maxQuantity) {
      await soundEffects.playErrorBeep();
      toast({
        title: t('common:error'),
        description: t('quantityExceedsRemaining', { max: maxQuantity }),
        variant: "destructive",
      });
      return;
    }
    
    const assignedQty = qty;
    
    // Call mutation FIRST, update state only on success
    if (currentItem.productId) {
      try {
        await storeLocationMutation.mutateAsync({
          productId: Number(currentItem.productId),
          locationCode: location.locationCode,
          locationType: location.locationType,
          quantity: assignedQty,
          isPrimary: location.isPrimary
        });
        
        // Only update local state after successful mutation
        const updatedItems = [...items];
        updatedItems[selectedItemIndex].locations[locationIndex].quantity = assignedQty;
        updatedItems[selectedItemIndex].assignedQuantity += assignedQty;
        setItems(updatedItems);
        
        await soundEffects.playSuccessBeep();
        
        // Auto-advance to next item if current item is complete
        if (updatedItems[selectedItemIndex].assignedQuantity >= updatedItems[selectedItemIndex].receivedQuantity) {
          if (selectedItemIndex < items.length - 1) {
            setSelectedItemIndex(selectedItemIndex + 1);
          }
        }
        
        setQuantityInput("");
        locationInputRef.current?.focus();
      } catch (error) {
        await soundEffects.playErrorBeep();
        // State never changed, so no rollback needed
        // Error toast is handled by mutation's onError
      }
    }
  };
  
  // Handle remove location
  const handleRemoveLocation = (locationIndex: number) => {
    const updatedItems = [...items];
    const location = updatedItems[selectedItemIndex].locations[locationIndex];
    
    updatedItems[selectedItemIndex].assignedQuantity -= location.quantity;
    updatedItems[selectedItemIndex].locations.splice(locationIndex, 1);
    
    // If removed primary, make first location primary
    if (location.isPrimary && updatedItems[selectedItemIndex].locations.length > 0) {
      updatedItems[selectedItemIndex].locations[0].isPrimary = true;
    }
    
    setItems(updatedItems);
  };
  
  // Handle complete
  const handleComplete = () => {
    toast({
      title: t('storageComplete'),
      description: `${completedItems}/${totalItems} items stored`,
    });
    onOpenChange(false);
  };
  
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent 
        side="bottom" 
        className="h-[95vh] p-0 flex flex-col"
        data-testid="sheet-quick-storage"
      >
        <SheetHeader className="p-4 border-b dark:border-gray-800">
          <SheetTitle className="flex items-center gap-2">
            <Warehouse className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            {t('quickStorage')}
          </SheetTitle>
          <SheetDescription>
            {shipment.shipmentName || t('shipmentNumber', { number: shipment.id })}
          </SheetDescription>
        </SheetHeader>
        
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="flex-1 flex flex-col overflow-hidden pb-20">
            {/* Progress bar */}
            <div className="p-4 border-b dark:border-gray-800 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">
                  {completedItems}/{totalItems} {t('itemsCompleted')}
                </span>
                <span className="text-muted-foreground">
                  {Math.round(progress)}%
                </span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
            
            {/* Item Cards with Animation */}
            {items.length > 0 && (
              <ScrollArea className="flex-1">
                <div className="p-4 space-y-3">
                  <AnimatePresence mode="wait">
                    {items.map((item, index) => {
                      const isSelected = index === selectedItemIndex;
                      const isComplete = item.locations.length > 0 || item.existingLocations?.length > 0;
                      const itemRemainingQty = item.receivedQuantity - item.assignedQuantity;

                      return (
                        <motion.div
                          key={item.receiptItemId}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -20 }}
                          transition={{ duration: 0.2 }}
                          onClick={() => setSelectedItemIndex(index)}
                          className={`bg-white dark:bg-gray-950 rounded-xl border-2 overflow-hidden transition-all cursor-pointer ${
                            isSelected 
                              ? 'border-amber-600 dark:border-amber-500 shadow-lg' 
                              : 'border-gray-200 dark:border-gray-700 shadow-sm hover:border-amber-300 dark:hover:border-amber-700'
                          }`}
                        >
                          {/* Item Header */}
                          <div className="p-4">
                            <div className="flex items-start gap-3">
                              {/* Product Image */}
                              <div className="relative">
                                {item.imageUrl ? (
                                  <img 
                                    src={item.imageUrl} 
                                    alt={item.productName}
                                    className="w-16 h-16 rounded-lg object-contain border bg-slate-50 dark:bg-slate-900"
                                  />
                                ) : (
                                  <div className="w-16 h-16 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                                    <Package className="h-8 w-8 text-gray-400 dark:text-gray-300" />
                                  </div>
                                )}
                                {isComplete && (
                                  <div className="absolute -top-1 -right-1 bg-green-500 dark:bg-green-600 rounded-full p-1">
                                    <Check className="h-3 w-3 text-white" />
                                  </div>
                                )}
                              </div>

                              {/* Product Info */}
                              <div className="flex-1 min-w-0">
                                <h3 className="font-semibold text-sm line-clamp-1">{item.productName}</h3>
                                {item.description && item.description !== item.productName && (
                                  <p className="text-xs text-muted-foreground line-clamp-1">{item.description}</p>
                                )}
                                <div className="flex items-center gap-3 mt-2 flex-wrap">
                                  {item.sku && (
                                    <span className="text-xs text-muted-foreground font-mono">
                                      {item.sku}
                                    </span>
                                  )}
                                  <Badge variant="outline" className="text-xs">
                                    {t('qty')} {item.receivedQuantity}
                                  </Badge>
                                </div>
                                
                                {/* Warehouse Locations - Always visible in collapsed state */}
                                {(item.existingLocations?.length > 0 || item.locations.length > 0) && (
                                  <div className="flex flex-wrap gap-1 mt-2">
                                    {/* Show existing locations first */}
                                    {item.existingLocations?.slice(0, 3).map((loc, idx) => (
                                      <Badge 
                                        key={`existing-${idx}`} 
                                        variant="secondary" 
                                        className="text-xs font-mono bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300"
                                      >
                                        <MapPin className="h-3 w-3 mr-1" />
                                        {loc.locationCode}
                                        {loc.isPrimary && <Star className="h-3 w-3 ml-1" fill="currentColor" />}
                                      </Badge>
                                    ))}
                                    {/* Show new locations */}
                                    {item.locations.slice(0, 3).map((loc, idx) => (
                                      <Badge 
                                        key={`new-${idx}`} 
                                        variant="outline" 
                                        className="text-xs font-mono border-green-500 text-green-600 dark:text-green-400"
                                      >
                                        <MapPin className="h-3 w-3 mr-1" />
                                        {loc.locationCode}
                                        {loc.quantity > 0 && <span className="ml-1">×{loc.quantity}</span>}
                                      </Badge>
                                    ))}
                                    {/* Show overflow count */}
                                    {((item.existingLocations?.length || 0) + item.locations.length) > 3 && (
                                      <Badge variant="secondary" className="text-xs">
                                        +{((item.existingLocations?.length || 0) + item.locations.length) - 3}
                                      </Badge>
                                    )}
                                  </div>
                                )}
                              </div>

                              {/* Expand Icon */}
                              <ChevronRight className={`h-5 w-5 text-gray-400 dark:text-gray-500 transition-transform ${
                                isSelected ? 'rotate-90' : ''
                              }`} />
                            </div>
                          </div>

                          {/* Expanded Actions - Only show for selected item */}
                          {isSelected && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="border-t dark:border-gray-800 bg-gray-50 dark:bg-gray-900"
                            >
                              <div className="p-4 space-y-3">
                                {/* Scan feedback */}
                                {scanFeedback.type && (
                                  <ScanFeedback type={scanFeedback.type} message={scanFeedback.message} />
                                )}

                                {/* Prominent Location Display */}
                                <div className="bg-amber-50 dark:bg-amber-950/20 rounded-lg p-3 border border-amber-200 dark:border-amber-800">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <MapPin className="h-5 w-5 text-amber-700 dark:text-amber-400" />
                                    <span className="text-2xl font-mono font-bold text-amber-700 dark:text-amber-400">
                                      {getSuggestedLocation(item) || generateSuggestedLocationWithAI(item, aiSuggestions)}
                                    </span>
                                    {item.existingLocations?.some(loc => loc.isPrimary) && (
                                      <Badge className="ml-2 bg-yellow-500 dark:bg-yellow-600 text-white">
                                        <Star className="h-3 w-3 mr-1" fill="currentColor" />
                                        {t('primary')}
                                      </Badge>
                                    )}
                                  </div>
                                  {/* AI Reasoning */}
                                  {getAIReasoning(item, aiSuggestions) && (
                                    <div className="mt-2 text-xs text-amber-700 dark:text-amber-400 italic">
                                      <span className="font-semibold">AI:</span> {getAIReasoning(item, aiSuggestions)}
                                    </div>
                                  )}
                                </div>

                                {/* Quick Stats */}
                                <div className="grid grid-cols-2 gap-3">
                                  <div className="bg-white dark:bg-gray-950 rounded-lg p-3 border dark:border-gray-800">
                                    <p className="text-xs text-muted-foreground">{t('received')}</p>
                                    <p className="text-lg font-bold">{item.receivedQuantity}</p>
                                  </div>
                                  <div className="bg-white dark:bg-gray-950 rounded-lg p-3 border dark:border-gray-800">
                                    <p className="text-xs text-muted-foreground">{t('remaining')}</p>
                                    <p className="text-lg font-bold text-amber-700 dark:text-amber-400">{itemRemainingQty}</p>
                                  </div>
                                </div>

                                {/* Existing Locations */}
                                {item.existingLocations && item.existingLocations.length > 0 && (
                                  <div className="bg-white dark:bg-gray-950 rounded-lg p-3 border dark:border-gray-800">
                                    <p className="text-xs font-medium text-muted-foreground mb-2">{t('currentLocations')}</p>
                                    {item.existingLocations.map(loc => (
                                      <div key={loc.id} className="flex items-center gap-2 py-1">
                                        <MapPin className="h-3 w-3 text-gray-400 dark:text-gray-300" />
                                        <span className="text-sm font-mono">{loc.locationCode}</span>
                                        {loc.isPrimary && (
                                          <Star className="h-3 w-3 text-yellow-500" fill="currentColor" />
                                        )}
                                        <Badge variant="secondary" className="text-xs ml-auto">
                                          {loc.quantity}
                                        </Badge>
                                      </div>
                                    ))}
                                  </div>
                                )}

                                {/* New Locations */}
                                {item.locations.length > 0 && (
                                  <div className="space-y-2">
                                    <p className="text-xs font-medium text-muted-foreground">{t('newLocations')}</p>
                                    {item.locations.map((loc, locIndex) => (
                                      <div key={loc.id} className="bg-white dark:bg-gray-950 rounded-lg p-3 border dark:border-gray-800 flex items-center gap-2">
                                        <MapPin className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                                        <span className="font-mono text-sm font-medium">{loc.locationCode}</span>
                                        {loc.quantity === 0 ? (
                                          <>
                                            <Input
                                              ref={locIndex === item.locations.length - 1 ? quantityInputRef : undefined}
                                              type="number"
                                              value={quantityInput}
                                              onChange={(e) => setQuantityInput(e.target.value)}
                                              onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                  handleQuantityAssign(locIndex);
                                                }
                                              }}
                                              placeholder="Qty"
                                              className="w-16 px-2 py-1 text-sm border rounded ml-auto h-8"
                                              min="0"
                                              max={itemRemainingQty}
                                            />
                                            <Button
                                              size="sm"
                                              onClick={() => handleQuantityAssign(locIndex)}
                                              disabled={!quantityInput || parseInt(quantityInput) <= 0}
                                              className="h-8"
                                            >
                                              <Save className="h-4 w-4" />
                                            </Button>
                                          </>
                                        ) : (
                                          <Badge variant="secondary" className="ml-auto">{loc.quantity}</Badge>
                                        )}
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleRemoveLocation(locIndex);
                                          }}
                                          className="p-1 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 rounded"
                                        >
                                          <X className="h-4 w-4" />
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                )}

                                {/* Action Buttons */}
                                <div className="flex gap-2">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setShowScanner(true);
                                    }}
                                    className="flex-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg py-3 flex items-center justify-center gap-2"
                                    data-testid="button-scan-location"
                                  >
                                    <QrCode className="h-5 w-5" />
                                    <span className="font-medium">{t('scanLocation')}</span>
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setShowProductDetails(true);
                                    }}
                                    className="p-3 bg-white dark:bg-gray-950 border dark:border-gray-800 rounded-lg"
                                    data-testid="button-item-details"
                                  >
                                    <Eye className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                                  </button>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              </ScrollArea>
            )}
          </div>
        )}
        
        {/* Bottom Navigation */}
        <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-950 border-t dark:border-gray-800 shadow-lg z-40">
          <div className="p-4 flex gap-2">
            <button
              onClick={() => {
                if (selectedItemIndex > 0) {
                  setSelectedItemIndex(selectedItemIndex - 1);
                }
              }}
              disabled={selectedItemIndex === 0}
              className={`p-3 rounded-lg border dark:border-gray-800 ${
                selectedItemIndex === 0 
                  ? 'bg-gray-50 dark:bg-gray-900 text-gray-300 dark:text-gray-600' 
                  : 'bg-white dark:bg-gray-950 text-gray-700 dark:text-gray-300'
              }`}
            >
              <ArrowUp className="h-5 w-5" />
            </button>
            <button
              onClick={() => {
                if (selectedItemIndex < items.length - 1) {
                  setSelectedItemIndex(selectedItemIndex + 1);
                }
              }}
              disabled={selectedItemIndex === items.length - 1}
              className={`p-3 rounded-lg border dark:border-gray-800 ${
                selectedItemIndex === items.length - 1
                  ? 'bg-gray-50 dark:bg-gray-900 text-gray-300 dark:text-gray-600' 
                  : 'bg-white dark:bg-gray-950 text-gray-700 dark:text-gray-300'
              }`}
            >
              <ArrowDown className="h-5 w-5" />
            </button>
            <button
              onClick={() => setShowScanner(true)}
              disabled={!currentItem}
              className="flex-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg py-3 flex items-center justify-center gap-2 font-medium"
            >
              <ScanLine className="h-5 w-5" />
              {t('quickScan')}
            </button>
          </div>
        </div>
        
        {/* Scanner Sheet */}
        <Sheet open={showScanner} onOpenChange={setShowScanner}>
          <SheetContent side="bottom" className="h-auto max-h-[90vh] overflow-y-auto pb-6">
            <SheetHeader className="pb-2">
              <SheetTitle className="text-base font-semibold">{t('addLocation')}</SheetTitle>
              {currentItem && (
                <div className="mt-2 space-y-2">
                  <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-2.5">
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 rounded-lg overflow-hidden bg-white dark:bg-gray-950 border dark:border-gray-800 flex-shrink-0">
                        {currentItem.imageUrl ? (
                          <img 
                            src={currentItem.imageUrl} 
                            alt={currentItem.productName}
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="h-6 w-6 text-gray-400 dark:text-gray-300" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{currentItem.productName}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {t('received')}: {currentItem.receivedQuantity}
                          </Badge>
                          <Badge 
                            variant={remainingQuantity > 0 ? "secondary" : "default"} 
                            className={`text-xs ${remainingQuantity === 0 ? 'bg-green-500 text-white' : ''}`}
                          >
                            {t('notStored')}: {remainingQuantity}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </SheetHeader>
            
            <div className="space-y-4 mt-4">
              {/* Camera scanner */}
              {barcodeScanner.scanningEnabled && barcodeScanner.isActive && (
                <div className="relative rounded-lg overflow-hidden bg-black">
                  <video
                    ref={barcodeScanner.videoRef}
                    className="w-full h-48 object-cover"
                    playsInline
                    muted
                  />
                  <div className="absolute top-2 right-2">
                    <Badge className="bg-green-500 text-white">
                      <Camera className="h-3 w-3 mr-1" />
                      {t('scanning')}
                    </Badge>
                  </div>
                </div>
              )}
              
              {barcodeScanner.scanningEnabled && (
                <Button
                  variant={barcodeScanner.isActive ? "destructive" : "secondary"}
                  size="sm"
                  onClick={() => {
                    if (barcodeScanner.isActive) {
                      barcodeScanner.stopScanning();
                    } else {
                      barcodeScanner.startScanning();
                    }
                  }}
                  className="w-full"
                  disabled={remainingQuantity === 0}
                >
                  {barcodeScanner.isActive ? (
                    <>
                      <CameraOff className="h-4 w-4 mr-2" />
                      {t('stopCamera')}
                    </>
                  ) : (
                    <>
                      <Camera className="h-4 w-4 mr-2" />
                      {t('startCamera')}
                    </>
                  )}
                </Button>
              )}
              
              {/* Saved Locations Section - Read-only display from database */}
              {currentItem && currentItem.existingLocations && currentItem.existingLocations.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                    {t('savedLocationsInDb')} ({currentItem.existingLocations.length})
                  </Label>
                  <div className="space-y-1.5 max-h-32 overflow-y-auto">
                    {currentItem.existingLocations.map((loc: any, idx: number) => (
                      <div 
                        key={`existing-${loc.id || idx}`} 
                        className="flex items-center gap-2 p-2.5 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg"
                      >
                        <MapPin className="h-4 w-4 text-green-600 dark:text-green-400 flex-shrink-0" />
                        <span className="font-mono text-sm font-medium flex-1">{loc.locationCode}</span>
                        {loc.isPrimary && (
                          <Star className="h-4 w-4 text-yellow-500 fill-current" />
                        )}
                        <Badge variant="secondary" className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
                          {loc.quantity} {t('unitsAtLocation')}
                        </Badge>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground bg-gray-50 dark:bg-gray-900 rounded p-2">
                    <span>{t('totalSaved')}:</span>
                    <span className="font-semibold text-green-600 dark:text-green-400">
                      {currentItem.existingLocations.reduce((sum: number, loc: any) => sum + (loc.quantity || 0), 0)} {t('unitsAtLocation')}
                    </span>
                  </div>
                </div>
              )}
              
              {/* Add Location - Scan or Manual Entry */}
              <div className="space-y-2">
                <Label htmlFor="scanner-location-input" className="text-sm font-medium flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  {t('addLocationManually')}
                  <span className="text-xs text-muted-foreground font-normal">({t('orScanBarcode')})</span>
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="scanner-location-input"
                    ref={locationInputRef}
                    value={locationInput}
                    onChange={(e) => setLocationInput(e.target.value.toUpperCase())}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleLocationScan();
                      }
                    }}
                    placeholder="WH1-A01-R02-L03 or WH1-A01-R02-L03-B3"
                    className="flex-1 h-12 text-base font-mono"
                    autoFocus
                    data-testid="input-location-scan"
                  />
                  <Button
                    size="lg"
                    onClick={handleLocationScan}
                    disabled={!locationInput}
                    className="h-12 px-6"
                  >
                    <Plus className="h-5 w-5" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  {t('locationFormatHint')}
                </p>
              </div>
              
              {/* Pending Locations - New locations with quantity inputs */}
              {currentItem && currentItem.locations.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    {t('pendingLocations')} ({currentItem.locations.length})
                  </Label>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {currentItem.locations.map((loc, locIndex) => (
                      <div 
                        key={loc.id} 
                        className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg"
                      >
                        <MapPin className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                        <span className="font-mono text-sm font-medium min-w-[100px]">{loc.locationCode}</span>
                        
                        {/* Quantity Input */}
                        <div className="flex items-center gap-1 ml-auto">
                          <Input
                            type="number"
                            value={loc.quantity || ''}
                            onChange={(e) => {
                              const newQty = parseInt(e.target.value) || 0;
                              const updatedItems = [...items];
                              const maxAllowed = remainingQuantity + (loc.quantity || 0);
                              updatedItems[selectedItemIndex].locations[locIndex].quantity = Math.min(newQty, maxAllowed);
                              setItems(updatedItems);
                            }}
                            className="w-20 h-9 text-center font-medium"
                            min="0"
                            placeholder="0"
                            data-testid={`input-quantity-${locIndex}`}
                          />
                        </div>
                        
                        {/* Primary Toggle */}
                        <Button
                          variant={loc.isPrimary ? "default" : "outline"}
                          size="sm"
                          onClick={() => {
                            const updatedItems = [...items];
                            updatedItems[selectedItemIndex].locations.forEach(l => l.isPrimary = false);
                            updatedItems[selectedItemIndex].locations[locIndex].isPrimary = true;
                            setItems(updatedItems);
                          }}
                          className="h-9 px-2"
                          title={t('primary')}
                        >
                          <Star className={`h-4 w-4 ${loc.isPrimary ? 'fill-current' : ''}`} />
                        </Button>
                        
                        {/* Delete Button */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveLocation(locIndex)}
                          className="h-9 px-2 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                  
                  {/* Quick Action: Assign All Remaining */}
                  {remainingQuantity > 0 && currentItem.locations.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const lastIndex = currentItem.locations.length - 1;
                        const updatedItems = [...items];
                        updatedItems[selectedItemIndex].locations[lastIndex].quantity = 
                          (updatedItems[selectedItemIndex].locations[lastIndex].quantity || 0) + remainingQuantity;
                        setItems(updatedItems);
                      }}
                      className="w-full"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      {t('assignAllToLast')} ({remainingQuantity})
                    </Button>
                  )}
                </div>
              )}
              
              {/* Empty state when no locations at all */}
              {currentItem && (!currentItem.existingLocations || currentItem.existingLocations.length === 0) && currentItem.locations.length === 0 && (
                <div className="text-center py-6 bg-gray-50 dark:bg-gray-900 rounded-lg">
                  <MapPin className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">{t('noSavedLocationsYet')}</p>
                  <p className="text-xs text-muted-foreground mt-1">{t('locationFormatHint')}</p>
                </div>
              )}
              
              {/* Save & Close Button */}
              <div className="flex gap-2 pt-2">
                {currentItem && currentItem.locations.some(loc => (loc.quantity || 0) > 0) && (
                  <Button
                    size="lg"
                    className="flex-1 h-12 bg-green-600 hover:bg-green-700"
                    onClick={async () => {
                      // Save all locations with quantity > 0
                      const locationsToSave = currentItem.locations.filter(loc => (loc.quantity || 0) > 0);
                      if (locationsToSave.length === 0) return;
                      
                      for (const loc of locationsToSave) {
                        if (currentItem.productId && loc.quantity > 0) {
                          try {
                            await storeLocationMutation.mutateAsync({
                              productId: Number(currentItem.productId),
                              locationCode: loc.locationCode,
                              locationType: loc.locationType,
                              quantity: loc.quantity,
                              isPrimary: loc.isPrimary
                            });
                          } catch (error) {
                            console.error('Failed to save location:', error);
                          }
                        }
                      }
                      
                      // Update assigned quantity
                      const totalAssigned = locationsToSave.reduce((sum, loc) => sum + (loc.quantity || 0), 0);
                      const updatedItems = [...items];
                      updatedItems[selectedItemIndex].assignedQuantity += totalAssigned;
                      
                      // Clear saved locations (they're now persisted)
                      updatedItems[selectedItemIndex].locations = updatedItems[selectedItemIndex].locations.filter(
                        loc => !locationsToSave.includes(loc)
                      );
                      setItems(updatedItems);
                      
                      // Auto-advance if complete
                      if (updatedItems[selectedItemIndex].assignedQuantity >= updatedItems[selectedItemIndex].receivedQuantity) {
                        if (selectedItemIndex < items.length - 1) {
                          setSelectedItemIndex(selectedItemIndex + 1);
                        }
                      }
                      
                      setShowScanner(false);
                      await soundEffects.playSuccessBeep();
                    }}
                    disabled={storeLocationMutation.isPending}
                  >
                    {storeLocationMutation.isPending ? (
                      <Loader2 className="h-5 w-5 animate-spin mr-2" />
                    ) : (
                      <Check className="h-5 w-5 mr-2" />
                    )}
                    {t('saveLocations')}
                  </Button>
                )}
                <Button
                  size="lg"
                  variant="outline"
                  className={`h-12 ${currentItem && currentItem.locations.some(loc => (loc.quantity || 0) > 0) ? '' : 'flex-1'}`}
                  onClick={() => setShowScanner(false)}
                >
                  {t('common:done')}
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
        
        {/* Product Details Sheet */}
        <Sheet open={showProductDetails} onOpenChange={setShowProductDetails}>
          <SheetContent side="bottom" className="h-auto max-h-[80vh] overflow-y-auto pb-6">
            <SheetHeader className="pb-4">
              <SheetTitle className="text-base font-semibold">{t('common:productDetails')}</SheetTitle>
            </SheetHeader>
            
            {currentItem && (
              <div className="space-y-4">
                {/* Large Product Image */}
                <div className="flex justify-center">
                  <div className="w-48 h-48 rounded-xl overflow-hidden bg-gray-50 dark:bg-gray-900 border dark:border-gray-800 flex items-center justify-center">
                    {currentItem.imageUrl ? (
                      <img 
                        src={currentItem.imageUrl} 
                        alt={currentItem.productName}
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <Package className="h-16 w-16 text-gray-300 dark:text-gray-600" />
                    )}
                  </div>
                </div>
                
                {/* Product Name */}
                <div className="text-center">
                  <h3 className="font-semibold text-lg">{currentItem.productName}</h3>
                  {currentItem.sku && (
                    <p className="text-sm text-muted-foreground font-mono mt-1">{currentItem.sku}</p>
                  )}
                </div>
                
                {/* Product Description */}
                {currentItem.description && currentItem.description !== currentItem.productName && (
                  <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                    <p className="text-xs font-medium text-muted-foreground mb-2">{t('common:description')}</p>
                    <p className="text-sm text-foreground leading-relaxed">{currentItem.description}</p>
                  </div>
                )}
                
                {/* Quantity Info */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-3 text-center">
                    <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">{t('received')}</p>
                    <p className="text-xl font-bold text-blue-700 dark:text-blue-300">{currentItem.receivedQuantity}</p>
                  </div>
                  <div className={`rounded-lg p-3 text-center ${
                    remainingQuantity === 0 
                      ? 'bg-green-50 dark:bg-green-950/20' 
                      : 'bg-amber-50 dark:bg-amber-950/20'
                  }`}>
                    <p className={`text-xs font-medium ${
                      remainingQuantity === 0 
                        ? 'text-green-600 dark:text-green-400' 
                        : 'text-amber-600 dark:text-amber-400'
                    }`}>{t('remaining')}</p>
                    <p className={`text-xl font-bold ${
                      remainingQuantity === 0 
                        ? 'text-green-700 dark:text-green-300' 
                        : 'text-amber-700 dark:text-amber-300'
                    }`}>{remainingQuantity}</p>
                  </div>
                </div>
                
                {/* Existing Locations */}
                {currentItem.existingLocations && currentItem.existingLocations.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">{t('currentLocations')}</p>
                    <div className="space-y-1.5">
                      {currentItem.existingLocations.map((loc: any, idx: number) => (
                        <div 
                          key={idx} 
                          className="flex items-center gap-2 p-2.5 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg"
                        >
                          <MapPin className="h-4 w-4 text-green-600 dark:text-green-400" />
                          <span className="font-mono text-sm font-medium flex-1">{loc.locationCode}</span>
                          {loc.isPrimary && (
                            <Star className="h-4 w-4 text-yellow-500 fill-current" />
                          )}
                          <Badge variant="secondary" className="text-xs">{loc.quantity}</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Close Button */}
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full h-12"
                  onClick={() => setShowProductDetails(false)}
                >
                  {t('common:close')}
                </Button>
              </div>
            )}
          </SheetContent>
        </Sheet>
      </SheetContent>
    </Sheet>
  );
}

function StorageShipmentCard({ shipment }: { shipment: any }) {
  const { t } = useTranslation(['imports']);
  const [, navigate] = useLocation();
  const [isExpanded, setIsExpanded] = useState(true);
  const [showQuickStorage, setShowQuickStorage] = useState(false);
  
  const itemCount = shipment.items?.length || 0;

  return (
    <Card className="overflow-hidden" data-testid={`card-shipment-${shipment.id}`}>
      <CardHeader 
        className="p-3 md:p-4 cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <Warehouse className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              <CardTitle className="text-base truncate">
                {shipment.shipmentName || t('shipmentNumber', { number: shipment.id })}
              </CardTitle>
            </div>
            <div className="space-y-1 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Package className="h-4 w-4" />
                <span>{itemCount} {t('itemsPendingStorage')}</span>
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
          <div className="p-3 md:p-4 space-y-3">
            {shipment.items && shipment.items.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-foreground">{t('items')}:</h4>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {shipment.items.map((item: any, idx: number) => (
                    <div key={idx} className="flex flex-col gap-1 text-sm p-2 bg-muted/30 rounded">
                      <div className="flex justify-between items-start gap-2">
                        <span className="text-foreground font-medium">{item.productName || item.name}</span>
                        <span className="font-semibold text-foreground shrink-0">×{item.quantity}</span>
                      </div>
                      {item.category && (
                        <span className="text-xs text-muted-foreground">{item.category}</span>
                      )}
                      {item.locations && item.locations.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {item.locations.map((loc: any, locIdx: number) => (
                            <Badge 
                              key={locIdx} 
                              variant="outline" 
                              className="text-xs font-mono bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800"
                            >
                              <MapPin className="h-3 w-3 mr-1" />
                              {loc.locationCode}: {loc.quantity}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <Button
              size="lg"
              className="w-full h-12 text-base bg-amber-600 hover:bg-amber-700"
              onClick={() => setShowQuickStorage(true)}
              data-testid={`button-go-to-storage-${shipment.id}`}
            >
              <Warehouse className="h-5 w-5 mr-2" />
              {t('quickStorage')}
            </Button>
          </div>
        </CardContent>
      )}
      
      <QuickStorageSheet
        shipment={shipment}
        open={showQuickStorage}
        onOpenChange={setShowQuickStorage}
      />
    </Card>
  );
}

// ============================================================================
// SHIPMENT REPORT DIALOG
// ============================================================================

interface ShipmentReportItem {
  receiptItemId: number;
  itemId: number;
  itemType: string;
  expectedQuantity: number;
  receivedQuantity: number;
  damagedQuantity: number;
  missingQuantity: number;
  status: string;
  condition: string;
  notes: string;
  barcode: string;
  warehouseLocation: string;
  productId: string | null;
  productName: string;
  sku: string | null;
  imageUrl: string | null;
  prices: {
    priceCzk: string | null;
    priceEur: string | null;
    priceUsd: string | null;
  } | null;
  locations: Array<{
    id: string;
    locationCode: string;
    locationType: string;
    quantity: number;
    isPrimary: boolean;
    notes: string;
  }>;
}

interface ShipmentReportData {
  receipt: {
    id: number;
    receiptNumber: string;
    status: string;
    receivedAt: string;
    completedAt: string;
    approvedAt: string;
    receivedBy: string;
    verifiedBy: string;
    approvedBy: string;
    carrier: string;
    parcelCount: number;
    notes: string;
    damageNotes: string;
    photos: string[];
    scannedParcels: string[];
  };
  shipment: {
    id: number;
    shipmentName: string;
    trackingNumber: string;
    carrier: string;
    status: string;
    estimatedArrival: string;
    actualArrival: string;
  } | null;
  items: ShipmentReportItem[];
  summary: {
    totalItems: number;
    totalExpected: number;
    totalReceived: number;
    totalDamaged: number;
    totalMissing: number;
    okItems: number;
    damagedItems: number;
    missingItems: number;
    partialItems: number;
  };
}

function ShipmentReportDialog({ 
  shipmentId, 
  open, 
  onOpenChange 
}: { 
  shipmentId: number; 
  open: boolean; 
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useTranslation(['imports', 'common']);
  const [selectedTab, setSelectedTab] = useState('overview');
  const [selectedItemsForLabels, setSelectedItemsForLabels] = useState<Set<string>>(new Set());
  const printRef = useRef<HTMLDivElement>(null);
  
  const { data: reportData, isLoading } = useQuery<ShipmentReportData>({
    queryKey: [`/api/imports/shipments/${shipmentId}/report`],
    enabled: open && !!shipmentId,
  });
  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ok':
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"><CheckCircle className="h-3 w-3 mr-1" /> OK</Badge>;
      case 'damaged':
        return <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"><AlertTriangle className="h-3 w-3 mr-1" /> {t('damaged')}</Badge>;
      case 'missing':
        return <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400"><XCircle className="h-3 w-3 mr-1" /> {t('missing')}</Badge>;
      case 'partial':
        return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"><AlertCircle className="h-3 w-3 mr-1" /> {t('partial')}</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };
  
  const formatPrice = (price: string | null | undefined, currency: string) => {
    if (!price) return '-';
    const num = parseFloat(price);
    if (isNaN(num)) return '-';
    return `${num.toFixed(2)} ${currency}`;
  };
  
  const toggleItemForLabel = (itemId: string) => {
    setSelectedItemsForLabels(prev => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  };
  
  const selectAllForLabels = () => {
    if (!reportData) return;
    const allIds = reportData.items
      .filter(item => item.locations.length > 0)
      .map(item => String(item.receiptItemId));
    setSelectedItemsForLabels(new Set(allIds));
  };
  
  const printLabels = () => {
    if (!printRef.current) return;
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    const selectedItems = reportData?.items.filter(item => 
      selectedItemsForLabels.has(String(item.receiptItemId))
    ) || [];
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${t('warehouseLabels')}</title>
        <style>
          @page { size: 50mm 30mm; margin: 2mm; }
          body { font-family: Arial, sans-serif; margin: 0; padding: 0; }
          .label { 
            width: 46mm; 
            height: 26mm; 
            border: 1px solid #000; 
            padding: 2mm; 
            page-break-after: always;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
          }
          .label:last-child { page-break-after: auto; }
          .location { font-size: 14pt; font-weight: bold; text-align: center; margin-bottom: 1mm; }
          .product-name { font-size: 8pt; text-align: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
          .sku { font-size: 7pt; text-align: center; color: #666; }
          .prices { display: flex; justify-content: space-between; font-size: 9pt; font-weight: bold; margin-top: 1mm; }
          .price { text-align: center; flex: 1; }
          .currency { font-size: 6pt; color: #666; }
        </style>
      </head>
      <body>
        ${selectedItems.map(item => 
          item.locations.map(loc => `
            <div class="label">
              <div class="location">${loc.locationCode}</div>
              <div class="product-name">${item.productName}</div>
              <div class="sku">${item.sku || '-'}</div>
              <div class="prices">
                <div class="price">
                  <div>${item.prices?.priceCzk ? parseFloat(item.prices.priceCzk).toFixed(0) : '-'}</div>
                  <div class="currency">CZK</div>
                </div>
                <div class="price">
                  <div>${item.prices?.priceEur ? parseFloat(item.prices.priceEur).toFixed(2) : '-'}</div>
                  <div class="currency">EUR</div>
                </div>
              </div>
            </div>
          `).join('')
        ).join('')}
      </body>
      </html>
    `);
    
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 250);
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {t('shipmentReport')}
          </DialogTitle>
          <DialogDescription>
            {reportData?.shipment?.shipmentName || `${t('shipmentNumber', { number: shipmentId })}`}
          </DialogDescription>
        </DialogHeader>
        
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : reportData ? (
          <div className="flex-1 overflow-hidden flex flex-col">
            <Tabs value={selectedTab} onValueChange={setSelectedTab} className="flex-1 flex flex-col overflow-hidden">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview">{t('overview')}</TabsTrigger>
                <TabsTrigger value="items">{t('items')}</TabsTrigger>
                <TabsTrigger value="photos">{t('photos')}</TabsTrigger>
                <TabsTrigger value="labels">{t('labels')}</TabsTrigger>
              </TabsList>
              
              {/* Overview Tab */}
              <TabsContent value="overview" className="flex-1 overflow-y-auto mt-4 space-y-4">
                {/* Summary Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <Card className="p-3">
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">{reportData.summary.totalReceived}</div>
                    <div className="text-xs text-muted-foreground">{t('received')}</div>
                  </Card>
                  <Card className="p-3">
                    <div className="text-2xl font-bold text-red-600 dark:text-red-400">{reportData.summary.totalDamaged}</div>
                    <div className="text-xs text-muted-foreground">{t('damaged')}</div>
                  </Card>
                  <Card className="p-3">
                    <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{reportData.summary.totalMissing}</div>
                    <div className="text-xs text-muted-foreground">{t('missing')}</div>
                  </Card>
                  <Card className="p-3">
                    <div className="text-2xl font-bold">{reportData.summary.totalItems}</div>
                    <div className="text-xs text-muted-foreground">{t('totalItems')}</div>
                  </Card>
                </div>
                
                {/* Receipt Details */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">{t('receiptDetails')}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-muted-foreground">{t('receiptNumber')}:</span>
                        <span className="ml-2 font-medium">{reportData.receipt.receiptNumber || '-'}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">{t('status')}:</span>
                        <Badge className="ml-2" variant="outline">{reportData.receipt.status}</Badge>
                      </div>
                      <div>
                        <span className="text-muted-foreground">{t('receivedBy')}:</span>
                        <span className="ml-2">{reportData.receipt.receivedBy || '-'}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">{t('receivedAt')}:</span>
                        <span className="ml-2">{reportData.receipt.receivedAt ? format(new Date(reportData.receipt.receivedAt), 'dd MMM yyyy HH:mm') : '-'}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">{t('carrier')}:</span>
                        <span className="ml-2">{reportData.receipt.carrier || '-'}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">{t('parcels')}:</span>
                        <span className="ml-2">{reportData.receipt.parcelCount || 0}</span>
                      </div>
                    </div>
                    {reportData.receipt.notes && (
                      <div className="pt-2 border-t">
                        <span className="text-muted-foreground">{t('notes')}:</span>
                        <p className="mt-1">{reportData.receipt.notes}</p>
                      </div>
                    )}
                    {reportData.receipt.damageNotes && (
                      <div className="pt-2 border-t">
                        <span className="text-muted-foreground text-red-600">{t('damageNotes')}:</span>
                        <p className="mt-1 text-red-600">{reportData.receipt.damageNotes}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
                
                {/* Scanned Parcels */}
                {reportData.receipt.scannedParcels && reportData.receipt.scannedParcels.length > 0 && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Package className="h-4 w-4" />
                        {t('scannedParcels')} ({reportData.receipt.scannedParcels.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {reportData.receipt.scannedParcels.map((parcel, idx) => (
                          <Badge key={idx} variant="secondary" className="font-mono text-xs">
                            {parcel}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
              
              {/* Items Tab */}
              <TabsContent value="items" className="flex-1 overflow-y-auto mt-4">
                <div className="space-y-3">
                  {reportData.items.map((item) => (
                    <Card key={item.receiptItemId} className="overflow-hidden">
                      <div className="p-4">
                        <div className="flex items-start gap-3">
                          {/* Product Image */}
                          <div className="w-16 h-16 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0 overflow-hidden">
                            {item.imageUrl ? (
                              <img src={item.imageUrl} alt={item.productName} className="w-full h-full object-contain" />
                            ) : (
                              <Package className="h-8 w-8 text-gray-400" />
                            )}
                          </div>
                          
                          {/* Product Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <h4 className="font-semibold text-sm line-clamp-1">{item.productName}</h4>
                                {item.sku && (
                                  <p className="text-xs text-muted-foreground font-mono">{item.sku}</p>
                                )}
                              </div>
                              {getStatusBadge(item.status)}
                            </div>
                            
                            {/* Quantities */}
                            <div className="flex items-center gap-4 mt-2 text-sm">
                              <div className="flex items-center gap-1">
                                <span className="text-muted-foreground">{t('expected')}:</span>
                                <span className="font-medium">{item.expectedQuantity}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <span className="text-muted-foreground">{t('received')}:</span>
                                <span className="font-medium text-green-600 dark:text-green-400">{item.receivedQuantity}</span>
                              </div>
                              {item.damagedQuantity > 0 && (
                                <div className="flex items-center gap-1">
                                  <span className="text-muted-foreground">{t('damaged')}:</span>
                                  <span className="font-medium text-red-600 dark:text-red-400">{item.damagedQuantity}</span>
                                </div>
                              )}
                              {item.missingQuantity > 0 && (
                                <div className="flex items-center gap-1">
                                  <span className="text-muted-foreground">{t('missing')}:</span>
                                  <span className="font-medium text-orange-600 dark:text-orange-400">{item.missingQuantity}</span>
                                </div>
                              )}
                            </div>
                            
                            {/* Prices */}
                            {item.prices && (
                              <div className="flex items-center gap-4 mt-2 text-sm">
                                <div className="flex items-center gap-1">
                                  <DollarSign className="h-3 w-3 text-muted-foreground" />
                                  <span className="font-medium">{formatPrice(item.prices.priceCzk, 'CZK')}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <span className="font-medium">{formatPrice(item.prices.priceEur, 'EUR')}</span>
                                </div>
                              </div>
                            )}
                            
                            {/* Locations */}
                            {item.locations.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {item.locations.map((loc, idx) => (
                                  <Badge 
                                    key={idx} 
                                    variant={loc.isPrimary ? "default" : "outline"}
                                    className="text-xs font-mono"
                                  >
                                    <MapPin className="h-3 w-3 mr-1" />
                                    {loc.locationCode}
                                    <span className="ml-1 opacity-60">×{loc.quantity}</span>
                                  </Badge>
                                ))}
                              </div>
                            )}
                            
                            {item.notes && (
                              <p className="text-xs text-muted-foreground mt-2 italic">{item.notes}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </TabsContent>
              
              {/* Photos Tab */}
              <TabsContent value="photos" className="flex-1 overflow-y-auto mt-4">
                {reportData.receipt.photos && reportData.receipt.photos.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {reportData.receipt.photos.map((photo, idx) => (
                      <div key={idx} className="aspect-square rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800">
                        <img src={photo} alt={`Photo ${idx + 1}`} className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <ImageIcon className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">{t('noPhotos')}</p>
                  </div>
                )}
              </TabsContent>
              
              {/* Labels Tab */}
              <TabsContent value="labels" className="flex-1 overflow-y-auto mt-4">
                <div className="space-y-4">
                  {/* Actions */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={selectAllForLabels}
                        disabled={reportData.items.filter(i => i.locations.length > 0).length === 0}
                      >
                        <CheckSquare className="h-4 w-4 mr-2" />
                        {t('selectAll')}
                      </Button>
                      <span className="text-sm text-muted-foreground">
                        {selectedItemsForLabels.size} {t('selected')}
                      </span>
                    </div>
                    <Button 
                      onClick={printLabels}
                      disabled={selectedItemsForLabels.size === 0}
                    >
                      <Printer className="h-4 w-4 mr-2" />
                      {t('printLabels')}
                    </Button>
                  </div>
                  
                  {/* Items with locations */}
                  <div className="space-y-2">
                    {reportData.items
                      .filter(item => item.locations.length > 0)
                      .map((item) => (
                        <Card 
                          key={item.receiptItemId} 
                          className={`cursor-pointer transition-all ${
                            selectedItemsForLabels.has(String(item.receiptItemId))
                              ? 'ring-2 ring-amber-500 bg-amber-50 dark:bg-amber-900/10'
                              : 'hover:bg-muted/50'
                          }`}
                          onClick={() => toggleItemForLabel(String(item.receiptItemId))}
                        >
                          <div className="p-3 flex items-center gap-3">
                            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                              selectedItemsForLabels.has(String(item.receiptItemId))
                                ? 'bg-amber-500 border-amber-500'
                                : 'border-gray-300 dark:border-gray-600'
                            }`}>
                              {selectedItemsForLabels.has(String(item.receiptItemId)) && (
                                <Check className="h-3 w-3 text-white" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm line-clamp-1">{item.productName}</div>
                              <div className="text-xs text-muted-foreground font-mono">{item.sku || '-'}</div>
                            </div>
                            <div className="text-right shrink-0">
                              <div className="font-bold text-sm">{formatPrice(item.prices?.priceCzk, 'CZK')}</div>
                              <div className="text-xs text-muted-foreground">{formatPrice(item.prices?.priceEur, 'EUR')}</div>
                            </div>
                            <div className="flex flex-wrap gap-1 shrink-0 max-w-32">
                              {item.locations.slice(0, 2).map((loc, idx) => (
                                <Badge key={idx} variant="outline" className="text-xs font-mono">
                                  {loc.locationCode}
                                </Badge>
                              ))}
                              {item.locations.length > 2 && (
                                <Badge variant="secondary" className="text-xs">+{item.locations.length - 2}</Badge>
                              )}
                            </div>
                          </div>
                        </Card>
                      ))}
                    
                    {reportData.items.filter(i => i.locations.length > 0).length === 0 && (
                      <div className="flex flex-col items-center justify-center py-12 text-center">
                        <MapPin className="h-12 w-12 text-muted-foreground mb-4" />
                        <p className="text-muted-foreground">{t('noLocationsAssigned')}</p>
                        <p className="text-xs text-muted-foreground mt-1">{t('storeItemsFirst')}</p>
                      </div>
                    )}
                  </div>
                  
                  {/* Label Preview */}
                  {selectedItemsForLabels.size > 0 && (
                    <Card className="mt-4">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">{t('labelPreview')}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div ref={printRef} className="flex flex-wrap gap-3">
                          {reportData.items
                            .filter(item => selectedItemsForLabels.has(String(item.receiptItemId)))
                            .slice(0, 3)
                            .map((item) => 
                              item.locations.slice(0, 1).map((loc, idx) => (
                                <div key={`${item.receiptItemId}-${idx}`} className="w-48 p-3 border-2 border-dashed rounded-lg">
                                  <div className="text-center font-bold text-lg">{loc.locationCode}</div>
                                  <div className="text-center text-xs truncate mt-1">{item.productName}</div>
                                  <div className="text-center text-xs text-muted-foreground font-mono">{item.sku || '-'}</div>
                                  <div className="flex justify-between mt-2 text-sm font-bold">
                                    <span>{item.prices?.priceCzk ? parseFloat(item.prices.priceCzk).toFixed(0) : '-'} CZK</span>
                                    <span>{item.prices?.priceEur ? parseFloat(item.prices.priceEur).toFixed(2) : '-'} €</span>
                                  </div>
                                </div>
                              ))
                            )}
                        </div>
                        {selectedItemsForLabels.size > 3 && (
                          <p className="text-xs text-muted-foreground text-center mt-2">
                            +{selectedItemsForLabels.size - 3} {t('moreLabels')}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center py-12">
            <p className="text-muted-foreground">{t('noDataAvailable')}</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function CompletedShipmentCard({ shipment }: { shipment: any }) {
  const { t } = useTranslation(['imports']);
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [isExpanded, setIsExpanded] = useState(true);
  const [showReport, setShowReport] = useState(false);
  
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
        title: t('statusUpdated'),
        description: t('receiptSentBackToReceiveStatus'),
      });
    },
    onError: () => {
      toast({
        title: t('common:error'),
        description: t('failedToUpdateReceiptStatus'),
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
        className="p-3 md:p-4 cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
              <CardTitle className="text-base truncate">
                {shipment.shipmentName || t('shipmentNumber', { number: shipment.id })}
              </CardTitle>
            </div>
            <div className="space-y-1 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Package className="h-4 w-4" />
                <span>{itemCount} {t('itemsCompleted')}</span>
              </div>
              {shipment.completedAt && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>{format(new Date(shipment.completedAt), 'MMM dd, yyyy HH:mm')}</span>
                </div>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Badge className={getStatusColor('complete')}>
              {t('completeStatus')}
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
          <div className="p-3 md:p-4 space-y-3">
            {shipment.items && shipment.items.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-foreground">{t('items')}:</h4>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {shipment.items.map((item: any, idx: number) => (
                    <div key={idx} className="flex flex-col gap-1 text-sm p-2 bg-muted/30 rounded">
                      <div className="flex justify-between items-start gap-2">
                        <span className="text-foreground font-medium">{item.productName || item.name}</span>
                        <span className="font-semibold text-foreground shrink-0">×{item.quantity}</span>
                      </div>
                      {item.category && (
                        <span className="text-xs text-muted-foreground">{item.category}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <div className="flex gap-2">
              <Button
                size="lg"
                variant="outline"
                className="flex-1 h-12 text-base"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowReport(true);
                }}
                data-testid={`button-view-details-${shipment.id}`}
              >
                <FileText className="h-5 w-5 mr-2" />
                {t('viewReport')}
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="lg"
                    className="h-12 px-3"
                    data-testid={`button-menu-${shipment.id}`}
                  >
                    <MoreVertical className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={handleSendBackToReceive}
                    disabled={sendBackToReceiveMutation.isPending}
                    data-testid={`menu-item-send-back-${shipment.id}`}
                  >
                    <Undo2 className="h-4 w-4 mr-2" />
                    {t('sendBackToReceive')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardContent>
      )}
      
      <ShipmentReportDialog
        shipmentId={shipment.id}
        open={showReport}
        onOpenChange={setShowReport}
      />
    </Card>
  );
}

function ArchivedShipmentCard({ shipment }: { shipment: any }) {
  const { t } = useTranslation(['imports']);
  const [, navigate] = useLocation();
  const [isExpanded, setIsExpanded] = useState(true);
  
  const itemCount = shipment.items?.length || 0;

  return (
    <Card className="overflow-hidden opacity-75" data-testid={`card-shipment-${shipment.id}`}>
      <CardHeader 
        className="p-3 md:p-4 cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <Archive className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              <CardTitle className="text-base truncate">
                {shipment.shipmentName || t('shipmentNumber', { number: shipment.id })}
              </CardTitle>
            </div>
            <div className="space-y-1 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Package className="h-4 w-4" />
                <span>{itemCount} {t('items')}</span>
              </div>
              {shipment.archivedAt && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>{t('archived')} {format(new Date(shipment.archivedAt), 'MMM dd, yyyy')}</span>
                </div>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Badge className="bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200">
              {t('archived')}
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
          <div className="p-3 md:p-4 space-y-3">
            {shipment.items && shipment.items.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-foreground">{t('items')}:</h4>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {shipment.items.map((item: any, idx: number) => (
                    <div key={idx} className="flex flex-col gap-1 text-sm p-2 bg-muted/30 rounded">
                      <div className="flex justify-between items-start gap-2">
                        <span className="text-foreground font-medium">{item.productName || item.name}</span>
                        <span className="font-semibold text-foreground shrink-0">×{item.quantity}</span>
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
  const { t } = useTranslation(['imports']);
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("to-receive");
  const [searchQuery, setSearchQuery] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [showUnmatchedDialog, setShowUnmatchedDialog] = useState(false);
  const [unmatchedBarcode, setUnmatchedBarcode] = useState("");
  const [filter, setFilter] = useState("all");
  
  // Ref for tabs container to enable auto-centering
  const tabsListRef = useRef<HTMLDivElement>(null);

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

  // Fetch recently approved receipts (last 7 days)
  const { data: recentReceipts = [] } = useQuery<Receipt[]>({
    queryKey: ['/api/imports/receipts/recent'],
  });

  // Auto-center active tab when it changes
  useEffect(() => {
    if (tabsListRef.current) {
      // Find the active tab button
      const activeButton = tabsListRef.current.querySelector(`[data-state="active"]`);
      if (activeButton) {
        // Scroll it into view with centering
        activeButton.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'center'
        });
      }
    }
  }, [activeTab]);

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
          title: t('itemScanned'),
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
          title: t('itemNotFound'),
          description: `${barcode} not found in database`,
          variant: "destructive",
        });
      }
    } catch (error) {
      await soundEffects.playErrorBeep();
      toast({
        title: t('common:error'),
        description: t('failedToProcessBarcode'),
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
      title: t('receiptApproved'),
      description: t('receivingComplete'),
    });
    // Clear session and navigate
    navigate('/receiving');
  }, [toast, navigate]);

  const isLoading = isLoadingToReceive || isLoadingReceiving || isLoadingStorage || isLoadingCompleted || isLoadingReceipts;

  // Calculate stats
  const totalItems = useMemo(() => {
    return toReceiveShipments.reduce((sum: number, s: any) => 
      sum + (s.items?.reduce((itemSum: number, item: any) => itemSum + (item.quantity || 0), 0) || 0), 0) +
      receivingShipments.reduce((sum: number, s: any) => 
      sum + (s.items?.reduce((itemSum: number, item: any) => itemSum + (item.quantity || 0), 0) || 0), 0);
  }, [toReceiveShipments, receivingShipments]);

  // Filter active receipts (receiving or pending_verification)
  const activeReceipts = useMemo(() => 
    receipts.filter((r: any) => r.status === 'pending_verification' || r.status === 'receiving'),
    [receipts]
  );

  return (
    <ReceivingSessionProvider>
      <div className="flex flex-col min-h-screen">
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

        {/* Header Section */}
        <div className="p-3 md:p-6 pb-4 bg-background border-b">
          <div className="max-w-7xl mx-auto">
            {/* Page Title */}
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
                <Package className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold">{t('receivingCenter')}</h1>
                <p className="text-sm text-muted-foreground mt-0.5">{t('manageIncomingShipmentsDesc')}</p>
              </div>
            </div>

            {/* Recently Received Goods Banner */}
            {recentReceipts.length > 0 && (
              <Card className="mb-6 border-green-200 dark:border-green-900/30 bg-green-50 dark:bg-green-950/20">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-100 dark:bg-green-900/40 rounded-lg">
                        <Zap className="h-5 w-5 text-green-600 dark:text-green-400" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-green-900 dark:text-green-100">
                          {t('receiving:recentArrivals', { count: recentReceipts.length })}
                        </h3>
                        <p className="text-sm text-green-700 dark:text-green-300">
                          {t('receiving:goodsApprovedInLast7Days')}
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" className="border-green-300 dark:border-green-800 text-green-700 dark:text-green-300 bg-white dark:bg-green-950/50">
                      {recentReceipts.length} {recentReceipts.length === 1 ? t('common:receipt') : t('common:receipts')}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
              <StatsCard
                icon={Package}
                title={t('toReceive')}
                value={toReceiveShipments.length}
                color="blue"
              />
              <StatsCard
                icon={Clock}
                title={t('inProgressReceiving')}
                value={receivingShipments.length}
                color="cyan"
              />
              <StatsCard
                icon={CheckCircle}
                title={t('completed')}
                value={completedShipments.length}
                color="green"
              />
              <StatsCard
                icon={Package2}
                title={t('totalItems')}
                value={totalItems}
                color="purple"
              />
            </div>
          </div>
        </div>

        {/* Active Receipts Progress - Only show when receipts exist */}
        {activeReceipts.length > 0 && (
          <div className="border-b bg-muted/30">
            <div className="max-w-7xl mx-auto">
              <ReceiptProgressCarousel receipts={activeReceipts} />
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="flex-1 overflow-hidden">
          <div className="max-w-7xl mx-auto h-full flex flex-col">
            {/* Tabs Navigation */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
              <div className="sticky top-0 z-30 bg-background border-b">
                <div className="px-3 md:px-6">
                  <TabsList ref={tabsListRef} className="w-full justify-start h-auto p-0 bg-transparent gap-2 overflow-x-auto flex-nowrap">
                    <TabsTrigger 
                      value="to-receive" 
                      className="h-12 px-4 min-w-fit data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                      data-testid="tab-to-receive"
                    >
                      <Package className="h-4 w-4 mr-2" />
                      <span className="hidden sm:inline">{t('toReceive')}</span>
                      <span className="sm:hidden">{t('toReceive')}</span>
                      <Badge variant="secondary" className="ml-2 bg-background/20">
                        {toReceiveShipments.length}
                      </Badge>
                    </TabsTrigger>
                    <TabsTrigger 
                      value="receiving" 
                      className="h-12 px-4 min-w-fit data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                      data-testid="tab-receiving"
                    >
                      <Clock className="h-4 w-4 mr-2" />
                      <span className="hidden sm:inline">{t('inProgressReceiving')}</span>
                      <span className="sm:hidden">{t('inProgressReceiving')}</span>
                      <Badge variant="secondary" className="ml-2 bg-background/20">
                        {receivingShipments.length}
                      </Badge>
                    </TabsTrigger>
                    <TabsTrigger 
                      value="storage" 
                      className="h-12 px-4 min-w-fit data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                      data-testid="tab-storage"
                    >
                      <Warehouse className="h-4 w-4 mr-2" />
                      <span className="hidden sm:inline">{t('storage')}</span>
                      <span className="sm:hidden">{t('storage')}</span>
                      <Badge variant="secondary" className="ml-2 bg-background/20">
                        {storageShipments.length}
                      </Badge>
                    </TabsTrigger>
                    <TabsTrigger 
                      value="completed" 
                      className="h-12 px-4 min-w-fit data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                      data-testid="tab-completed"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      <span className="hidden sm:inline">{t('completed')}</span>
                      <span className="sm:hidden">{t('completed')}</span>
                      <Badge variant="secondary" className="ml-2 bg-background/20">
                        {completedShipments.length}
                      </Badge>
                    </TabsTrigger>
                    <TabsTrigger 
                      value="archived" 
                      className="h-12 px-4 min-w-fit data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                      data-testid="tab-archived"
                    >
                      <Archive className="h-4 w-4 mr-2" />
                      <span className="hidden sm:inline">{t('archived')}</span>
                      <span className="sm:hidden">{t('archived')}</span>
                      <Badge variant="secondary" className="ml-2 bg-background/20">
                        {archivedShipments.length}
                      </Badge>
                    </TabsTrigger>
                  </TabsList>
                </div>
              </div>

              {/* Tab Content */}
              <div className="flex-1 overflow-y-auto">
                <div className="p-3 md:p-6">
                  {/* To Receive Tab */}
                  <TabsContent value="to-receive" className="mt-0 space-y-4">
                    {isLoadingToReceive ? (
                      <>
                        <ShipmentCardSkeleton />
                        <ShipmentCardSkeleton />
                        <ShipmentCardSkeleton />
                      </>
                    ) : toReceiveShipments.length === 0 ? (
                      <EmptyState
                        icon={Package}
                        title={t('noShipmentsReadyToReceive')}
                        description={t('allIncomingShipmentsReceived')}
                      />
                    ) : (
                      toReceiveShipments.map((shipment: any) => (
                        <ToReceiveShipmentCard key={shipment.id} shipment={shipment} />
                      ))
                    )}
                  </TabsContent>

                  {/* Receiving Tab */}
                  <TabsContent value="receiving" className="mt-0 space-y-4">
                    {isLoadingReceiving ? (
                      <>
                        <ShipmentCardSkeleton />
                        <ShipmentCardSkeleton />
                        <ShipmentCardSkeleton />
                      </>
                    ) : receivingShipments.length === 0 ? (
                      <EmptyState
                        icon={Clock}
                        title={t('noActiveReceivingSessions')}
                        description={t('startReceivingToSeeHere')}
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
                  </TabsContent>

                  {/* Storage Tab */}
                  <TabsContent value="storage" className="mt-0 space-y-4">
                    {isLoadingStorage ? (
                      <>
                        <ShipmentCardSkeleton />
                        <ShipmentCardSkeleton />
                        <ShipmentCardSkeleton />
                      </>
                    ) : storageShipments.length === 0 ? (
                      <EmptyState
                        icon={Warehouse}
                        title={t('noShipmentsInStorage')}
                        description={t('shipmentsPendingApprovalOrPutaway')}
                      />
                    ) : (
                      storageShipments.map((shipment: any) => (
                        <StorageShipmentCard key={shipment.id} shipment={shipment} />
                      ))
                    )}
                  </TabsContent>

                  {/* Completed Tab */}
                  <TabsContent value="completed" className="mt-0 space-y-4">
                    {isLoadingCompleted ? (
                      <>
                        <ShipmentCardSkeleton />
                        <ShipmentCardSkeleton />
                        <ShipmentCardSkeleton />
                      </>
                    ) : completedShipments.length === 0 ? (
                      <EmptyState
                        icon={CheckCircle}
                        title={t('noCompletedShipments')}
                        description={t('successfullyReceivedAndStoredShipments')}
                      />
                    ) : (
                      completedShipments.map((shipment: any) => (
                        <CompletedShipmentCard key={shipment.id} shipment={shipment} />
                      ))
                    )}
                  </TabsContent>

                  {/* Archived Tab */}
                  <TabsContent value="archived" className="mt-0 space-y-4">
                    {isLoadingArchived ? (
                      <>
                        <ShipmentCardSkeleton />
                        <ShipmentCardSkeleton />
                        <ShipmentCardSkeleton />
                      </>
                    ) : archivedShipments.length === 0 ? (
                      <EmptyState
                        icon={Archive}
                        title={t('noArchivedShipments')}
                        description={t('archivedShipmentsStoredHere')}
                      />
                    ) : (
                      archivedShipments.map((shipment: any) => (
                        <ArchivedShipmentCard key={shipment.id} shipment={shipment} />
                      ))
                    )}
                  </TabsContent>
                </div>
              </div>
            </Tabs>
          </div>
        </div>

        {/* Floating Scan Button */}
        <FloatingScanButton 
          onScan={handleBarcodeScan} 
          isScanning={isScanning}
          barcodeScanner={barcodeScanner}
        />

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
                placeholder={t('searchProducts')}
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
