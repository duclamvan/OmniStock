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
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
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
  Circle,
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
  Image as ImageIcon,
  ClipboardList,
  Clipboard,
  Barcode,
  RotateCcw,
  Trash2,
  RefreshCw
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { handleDecimalKeyDown, parseDecimal } from "@/lib/utils";
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
// COMPACT STATS TAB COMPONENT (Clickable, links to tabs)
// ============================================================================

function CompactStatTab({ 
  icon: Icon, 
  label, 
  value, 
  isActive = false,
  color = "blue",
  onClick
}: { 
  icon: any; 
  label: string; 
  value: number;
  isActive?: boolean;
  color?: "blue" | "cyan" | "amber" | "green" | "purple";
  onClick?: () => void;
}) {
  const colorClasses = {
    blue: {
      active: "bg-blue-600 text-white dark:bg-blue-500",
      inactive: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/50"
    },
    cyan: {
      active: "bg-cyan-600 text-white dark:bg-cyan-500",
      inactive: "bg-cyan-50 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-300 hover:bg-cyan-100 dark:hover:bg-cyan-900/50"
    },
    amber: {
      active: "bg-amber-600 text-white dark:bg-amber-500",
      inactive: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/50"
    },
    green: {
      active: "bg-green-600 text-white dark:bg-green-500",
      inactive: "bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-900/50"
    },
    purple: {
      active: "bg-purple-600 text-white dark:bg-purple-500",
      inactive: "bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/50"
    }
  };

  return (
    <button
      onClick={onClick}
      className={`flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200 cursor-pointer ${
        isActive ? colorClasses[color].active : colorClasses[color].inactive
      }`}
    >
      <Icon className="h-4 w-4" />
      <span className="text-xs font-medium whitespace-nowrap">{label}</span>
      <span className={`text-sm font-bold ${isActive ? '' : ''}`}>{value}</span>
    </button>
  );
}

// ============================================================================
// FLOATING SCAN BUTTON WITH BULK SCANNING
// ============================================================================

interface TrackingLookupResult {
  trackingNumber: string;
  matched: boolean;
  orderId: string | null;
  orderDisplayId: string | null;
  source: 'carton' | 'label' | null;
  cartonNumber?: number;
  carrier?: string;
}

interface OrderCount {
  count: number;
  orderId: string;
  orderDisplayId: string;
}

interface BulkScanState {
  scannedNumbers: string[];
  results: TrackingLookupResult[];
  orderCounts: OrderCount[];
  totalScanned: number;
  matched: number;
  unmatched: number;
  isLookingUp: boolean;
}

function FloatingScanButton({ 
  onScan, 
  isScanning,
  barcodeScanner 
}: { 
  onScan: (barcode: string) => void; 
  isScanning: boolean;
  barcodeScanner: ReturnType<typeof useBarcodeScanner>;
}) {
  const { t } = useTranslation(['imports', 'common']);
  const { session, updateSession } = useReceivingSession();
  const { toast } = useToast();
  const [showScanDialog, setShowScanDialog] = useState(false);
  const [scanMode, setScanMode] = useState<'single' | 'bulk'>('bulk');
  const [manualBarcode, setManualBarcode] = useState("");
  const [bulkInput, setBulkInput] = useState("");
  const scanInputRef = useRef<HTMLInputElement>(null);
  const bulkInputRef = useRef<HTMLTextAreaElement>(null);
  const rapidScanInputRef = useRef<HTMLInputElement>(null);
  
  // Bulk scan state
  const [bulkScanState, setBulkScanState] = useState<BulkScanState>({
    scannedNumbers: [],
    results: [],
    orderCounts: [],
    totalScanned: 0,
    matched: 0,
    unmatched: 0,
    isLookingUp: false
  });

  // Reset state when dialog closes
  useEffect(() => {
    if (!showScanDialog) {
      setBulkScanState({
        scannedNumbers: [],
        results: [],
        orderCounts: [],
        totalScanned: 0,
        matched: 0,
        unmatched: 0,
        isLookingUp: false
      });
      setBulkInput("");
      setManualBarcode("");
    }
  }, [showScanDialog]);

  // Focus input when dialog opens
  useEffect(() => {
    if (showScanDialog) {
      setTimeout(() => {
        if (scanMode === 'bulk') {
          rapidScanInputRef.current?.focus();
        } else {
          scanInputRef.current?.focus();
        }
      }, 100);
    }
  }, [showScanDialog, scanMode]);

  // Look up tracking numbers via API
  const lookupTrackingNumbers = useCallback(async (numbers: string[]) => {
    if (numbers.length === 0) return;

    setBulkScanState(prev => ({ ...prev, isLookingUp: true }));

    try {
      const response = await fetch('/api/receiving/lookup-tracking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ trackingNumbers: numbers })
      });

      if (!response.ok) {
        throw new Error('Failed to lookup tracking numbers');
      }

      const data = await response.json();

      setBulkScanState({
        scannedNumbers: numbers,
        results: data.results || [],
        orderCounts: data.summary?.orderCounts || [],
        totalScanned: data.summary?.totalScanned || 0,
        matched: data.summary?.matched || 0,
        unmatched: data.summary?.unmatched || 0,
        isLookingUp: false
      });

      // Play sound based on results
      if (data.summary?.matched > 0) {
        await soundEffects.playSuccessBeep();
      } else if (data.summary?.unmatched > 0) {
        await soundEffects.playErrorBeep();
      }
    } catch (error) {
      console.error('Error looking up tracking numbers:', error);
      setBulkScanState(prev => ({ ...prev, isLookingUp: false }));
      toast({
        title: t('common:error'),
        description: t('failedToLookupTracking'),
        variant: "destructive"
      });
    }
  }, [toast, t]);

  // Handle rapid scan input (for hardware scanners)
  const handleRapidScanKeyDown = useCallback(async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const value = (e.target as HTMLInputElement).value.trim();
      if (value) {
        // Add to existing scanned numbers and look up
        const newNumbers = [...bulkScanState.scannedNumbers, value];
        (e.target as HTMLInputElement).value = '';
        await lookupTrackingNumbers(newNumbers);
      }
    }
  }, [bulkScanState.scannedNumbers, lookupTrackingNumbers]);

  // Handle bulk paste/input
  const handleBulkProcess = useCallback(async () => {
    if (!bulkInput.trim()) return;

    // Parse input - split by newlines, commas, spaces, tabs
    const numbers = bulkInput
      .split(/[\n,\s\t]+/)
      .map(n => n.trim())
      .filter(n => n.length > 0);

    if (numbers.length === 0) return;

    // Combine with existing scanned numbers (deduplicate)
    const allNumbers = Array.from(new Set([...bulkScanState.scannedNumbers, ...numbers]));
    setBulkInput("");
    await lookupTrackingNumbers(allNumbers);
  }, [bulkInput, bulkScanState.scannedNumbers, lookupTrackingNumbers]);

  // Handle single barcode scan
  const handleManualScan = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (manualBarcode.trim()) {
      onScan(manualBarcode.trim());
      setManualBarcode("");
      setShowScanDialog(false);
    }
  }, [manualBarcode, onScan]);

  // Handle camera toggle
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
  }, [session.isCameraActive, barcodeScanner, updateSession, toast, t]);

  // Clear all scanned items
  const handleClearAll = useCallback(() => {
    setBulkScanState({
      scannedNumbers: [],
      results: [],
      orderCounts: [],
      totalScanned: 0,
      matched: 0,
      unmatched: 0,
      isLookingUp: false
    });
    setBulkInput("");
  }, []);

  // Remove a single tracking number
  const handleRemoveNumber = useCallback(async (trackingNumber: string) => {
    const newNumbers = bulkScanState.scannedNumbers.filter(n => n.toUpperCase() !== trackingNumber.toUpperCase());
    if (newNumbers.length > 0) {
      await lookupTrackingNumbers(newNumbers);
    } else {
      handleClearAll();
    }
  }, [bulkScanState.scannedNumbers, lookupTrackingNumbers, handleClearAll]);

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

      {/* Enhanced Scan Dialog */}
      <Dialog open={showScanDialog} onOpenChange={setShowScanDialog}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ScanLine className="h-5 w-5" />
              {t('scanParcels')}
            </DialogTitle>
            <DialogDescription>
              {t('scanMultipleParcelsAtOnce')}
            </DialogDescription>
          </DialogHeader>

          {/* Mode Toggle */}
          <div className="flex gap-2 mb-4">
            <Button
              variant={scanMode === 'bulk' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setScanMode('bulk')}
              className="flex-1"
              data-testid="button-mode-bulk"
            >
              <Layers className="h-4 w-4 mr-2" />
              {t('bulkScan')}
            </Button>
            <Button
              variant={scanMode === 'single' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setScanMode('single')}
              className="flex-1"
              data-testid="button-mode-single"
            >
              <QrCode className="h-4 w-4 mr-2" />
              {t('singleScan')}
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-4">
            {scanMode === 'bulk' ? (
              <>
                {/* Rapid Scan Input (for hardware scanners) */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">{t('rapidScanInput')}</Label>
                  <Input
                    ref={rapidScanInputRef}
                    type="text"
                    placeholder={t('scanOrTypeTrackingNumber')}
                    onKeyDown={handleRapidScanKeyDown}
                    className="h-12 text-base font-mono"
                    data-testid="input-rapid-scan"
                    autoFocus
                  />
                  <p className="text-xs text-muted-foreground">{t('pressEnterAfterEachScan')}</p>
                </div>

                {/* Bulk Paste Area */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">{t('bulkPasteArea')}</Label>
                  <div className="flex gap-2">
                    <textarea
                      ref={bulkInputRef}
                      value={bulkInput}
                      onChange={(e) => setBulkInput(e.target.value)}
                      placeholder={t('pasteMultipleTrackingNumbers')}
                      className="flex-1 min-h-[80px] p-3 text-sm font-mono border rounded-md resize-none bg-background"
                      data-testid="textarea-bulk-input"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={handleBulkProcess}
                      disabled={!bulkInput.trim() || bulkScanState.isLookingUp}
                      className="flex-1"
                      data-testid="button-process-bulk"
                    >
                      {bulkScanState.isLookingUp ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Search className="h-4 w-4 mr-2" />
                      )}
                      {t('processTracking')}
                    </Button>
                    {bulkScanState.totalScanned > 0 && (
                      <Button
                        variant="outline"
                        onClick={handleClearAll}
                        data-testid="button-clear-all"
                      >
                        <X className="h-4 w-4 mr-2" />
                        {t('common:clear')}
                      </Button>
                    )}
                  </div>
                </div>

                {/* Real-time Results Summary */}
                {bulkScanState.totalScanned > 0 && (
                  <div className="space-y-3">
                    {/* Summary Stats */}
                    <div className="grid grid-cols-3 gap-1 sm:gap-2">
                      <div className="p-2 sm:p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 text-center">
                        <div className="text-xl sm:text-2xl font-bold text-blue-600 dark:text-blue-400">
                          {bulkScanState.totalScanned}
                        </div>
                        <div className="text-[10px] sm:text-xs text-blue-600/80 dark:text-blue-400/80">{t('totalScanned')}</div>
                      </div>
                      <div className="p-2 sm:p-3 rounded-lg bg-green-50 dark:bg-green-950/30 text-center">
                        <div className="text-xl sm:text-2xl font-bold text-green-600 dark:text-green-400">
                          {bulkScanState.matched}
                        </div>
                        <div className="text-[10px] sm:text-xs text-green-600/80 dark:text-green-400/80">{t('matched')}</div>
                      </div>
                      <div className="p-2 sm:p-3 rounded-lg bg-red-50 dark:bg-red-950/30 text-center">
                        <div className="text-xl sm:text-2xl font-bold text-red-600 dark:text-red-400">
                          {bulkScanState.unmatched}
                        </div>
                        <div className="text-[10px] sm:text-xs text-red-600/80 dark:text-red-400/80">{t('unmatched')}</div>
                      </div>
                    </div>

                    {/* Order Counts */}
                    {bulkScanState.orderCounts.length > 0 && (
                      <div className="space-y-2">
                        <Label className="text-sm font-medium flex items-center gap-2">
                          <Package className="h-4 w-4" />
                          {t('parcelsByOrder')}
                        </Label>
                        <div className="grid gap-2 max-h-[150px] overflow-y-auto">
                          {bulkScanState.orderCounts.map((order) => (
                            <div 
                              key={order.orderId}
                              className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                            >
                              <div className="flex items-center gap-2">
                                <Package className="h-4 w-4 text-muted-foreground" />
                                <span className="font-mono font-medium">{order.orderDisplayId}</span>
                              </div>
                              <Badge variant="secondary" className="font-bold">
                                {order.count} {order.count === 1 ? t('parcel') : t('parcels')}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Unmatched Tracking Numbers */}
                    {bulkScanState.unmatched > 0 && (
                      <div className="space-y-2">
                        <Label className="text-sm font-medium flex items-center gap-2 text-red-600 dark:text-red-400">
                          <AlertCircle className="h-4 w-4" />
                          {t('unmatchedTrackingNumbers')}
                        </Label>
                        <div className="flex flex-wrap gap-2 max-h-[100px] overflow-y-auto">
                          {bulkScanState.results
                            .filter(r => !r.matched)
                            .map((result, idx) => (
                              <Badge 
                                key={idx} 
                                variant="outline" 
                                className="font-mono text-xs border-red-300 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-950/30 cursor-pointer"
                                onClick={() => handleRemoveNumber(result.trackingNumber)}
                              >
                                {result.trackingNumber}
                                <X className="h-3 w-3 ml-1" />
                              </Badge>
                            ))
                          }
                        </div>
                      </div>
                    )}

                    {/* All Scanned List (collapsible) */}
                    <details className="group">
                      <summary className="text-sm font-medium cursor-pointer hover:text-primary flex items-center gap-2">
                        <ChevronRight className="h-4 w-4 transition-transform group-open:rotate-90" />
                        {t('viewAllScanned')} ({bulkScanState.totalScanned})
                      </summary>
                      <div className="mt-2 max-h-[150px] overflow-y-auto border rounded-md p-2">
                        {bulkScanState.results.map((result, idx) => (
                          <div 
                            key={idx}
                            className="flex items-center justify-between py-1 px-2 text-sm hover:bg-muted/50 rounded"
                          >
                            <span className="font-mono text-xs">{result.trackingNumber}</span>
                            <div className="flex items-center gap-2">
                              {result.matched ? (
                                <Badge variant="outline" className="text-xs bg-green-50 dark:bg-green-950/30 border-green-300 dark:border-green-800">
                                  {result.orderDisplayId}
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-xs bg-red-50 dark:bg-red-950/30 border-red-300 dark:border-red-800">
                                  {t('trackingNotFound')}
                                </Badge>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={() => handleRemoveNumber(result.trackingNumber)}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </details>
                  </div>
                )}
              </>
            ) : (
              <>
                {/* Single Scan Mode */}
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
              </>
            )}
          </div>

          {/* Footer with close button */}
          <div className="pt-4 border-t mt-4">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setShowScanDialog(false)}
              data-testid="button-close-dialog"
            >
              {t('common:close')}
            </Button>
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
                  <div className="flex flex-col gap-2">
                    <CardTitle className="text-lg font-bold">
                      {t('receiptNumber', { number: receipt.id })}
                    </CardTitle>
                    <CardDescription className="text-sm font-medium">
                      {receipt.shipment?.shipmentName || t('shipmentNumber', { number: receipt.shipmentId })}
                    </CardDescription>
                    <Badge className={`${getStatusColor(receipt.status)} text-xs w-fit`}>
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
  const { session, updateItemStatus, clearSession } = useReceivingSession();
  const { toast } = useToast();

  const handleMarkAllComplete = () => {
    session.scannedItems.forEach(item => {
      updateItemStatus(item.id, 'complete');
    });
    toast({
      title: t('batchUpdate'),
      description: t('allItemsMarkedAsComplete'),
    });
    onClose();
  };

  const handleFlagIssues = () => {
    const incompleteItems = session.scannedItems.filter(
      item => item.status !== 'complete' && item.status !== 'damaged'
    );
    incompleteItems.forEach(item => {
      updateItemStatus(item.id, 'partial');
    });
    toast({
      title: t('batchUpdate'),
      description: t('itemsFlaggedForReview', { count: incompleteItems.length }),
    });
    onClose();
  };

  const handleSubmitDiscrepancies = () => {
    const discrepancyItems = session.scannedItems.filter(
      item => item.status === 'partial' || item.status === 'damaged' || item.status === 'missing'
    );
    toast({
      title: t('discrepanciesSubmitted'),
      description: t('discrepanciesSubmittedDescription', { count: discrepancyItems.length }),
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
            onClick={handleFlagIssues}
            data-testid="button-flag-issues"
          >
            <AlertTriangle className="h-5 w-5 mr-2" />
            Flag Issues
          </Button>
          <Button 
            size="lg" 
            variant="outline" 
            className="w-full h-14 text-base"
            onClick={handleSubmitDiscrepancies}
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

function ToReceiveShipmentCard({ shipment, isAdministrator }: { shipment: any; isAdministrator: boolean }) {
  const { t } = useTranslation(['imports']);
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [isExpanded, setIsExpanded] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  const itemCount = shipment.items?.length || 0;
  const totalQuantity = shipment.items?.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0) || 0;
  
  // Get effective ETA: For direct PO shipments, prioritize tracking ETA if available,
  // otherwise fall back to manually set estimatedDelivery from International Transit
  const getEffectiveEta = (): { date: Date | null; source: 'tracking' | 'manual' | null } => {
    // For direct PO shipments or consolidated shipments with tracking
    // Priority: easypostEstDelivery (if tracking successful) > estimatedDelivery (manual)
    if (shipment.easypostEstDelivery && shipment.easypostStatus && 
        !['Unknown', 'Error', 'Failure'].includes(shipment.easypostStatus)) {
      return { date: new Date(shipment.easypostEstDelivery), source: 'tracking' };
    }
    
    // Fall back to manually set ETA from International Transit
    if (shipment.estimatedDelivery) {
      return { date: new Date(shipment.estimatedDelivery), source: 'manual' };
    }
    
    return { date: null, source: null };
  };
  
  const getEtaCountdown = () => {
    const { date: eta, source } = getEffectiveEta();
    if (!eta) return null;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const etaDate = new Date(eta);
    etaDate.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((etaDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      const absDays = Math.abs(diffDays);
      return { text: absDays === 1 ? t('overdueDay', { days: absDays }) : t('overdue', { days: absDays }), color: 'text-red-600 dark:text-red-400', source };
    } else if (diffDays === 0) {
      return { text: t('arrivalToday'), color: 'text-green-600 dark:text-green-400', source };
    } else {
      return { text: diffDays === 1 ? t('dayRemaining', { days: diffDays }) : t('daysRemaining', { days: diffDays }), color: 'text-amber-600 dark:text-amber-400', source };
    }
  };
  
  const etaInfo = getEtaCountdown();

  const deleteShipmentMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/imports/shipments/${shipment.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/imports/shipments/to-receive'] });
      queryClient.invalidateQueries({ queryKey: ['/api/imports/receipts'] });
      toast({
        title: t('common:deleted'),
        description: t('shipmentDeleted'),
      });
      setShowDeleteConfirm(false);
    },
    onError: (error: Error) => {
      toast({
        title: t('common:error'),
        description: error.message || t('failedToDeleteShipment'),
        variant: "destructive",
      });
    },
  });

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
                <span className="truncate">{shipment.endCarrier || shipment.carrier || t('unknownCarrier')}</span>
              </div>
              {(shipment.endTrackingNumber || (shipment.endTrackingNumbers && shipment.endTrackingNumbers.length > 0)) && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Package2 className="h-4 w-4" />
                  <span className="font-mono text-xs truncate">
                    {shipment.endTrackingNumbers?.[0] || shipment.endTrackingNumber}
                    {shipment.endTrackingNumbers && shipment.endTrackingNumbers.length > 1 && (
                      <span className="text-muted-foreground/70 ml-1">+{shipment.endTrackingNumbers.length - 1}</span>
                    )}
                  </span>
                </div>
              )}
              <div className="flex items-center gap-2 text-muted-foreground">
                <Package className="h-4 w-4" />
                <span>{itemCount} {t('items')} ({totalQuantity} {t('units')})</span>
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-1">
              {shipment.isDirectPO && shipment.status === 'in transit' && (
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800 text-xs">
                  <Plane className="h-3 w-3 mr-1" />
                  {t('incoming')}
                </Badge>
              )}
              <Badge className={getStatusColor(shipment.status)}>
                {shipment.status}
              </Badge>
            </div>
            {etaInfo && (
              <span className={`text-xs font-medium ${etaInfo.color}`}>
                {etaInfo.text}
              </span>
            )}
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
                className="flex-1 h-12 text-base"
                onClick={() => navigate(`/receiving/start/${shipment.id}`)}
                data-testid={`button-start-receiving-${shipment.id}`}
              >
                <ScanLine className="h-5 w-5 mr-2" />
                {t('startReceiving')}
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
                  {isAdministrator && (
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowDeleteConfirm(true);
                      }}
                      disabled={deleteShipmentMutation.isPending}
                      className="text-red-600 dark:text-red-400"
                      data-testid={`menu-item-delete-${shipment.id}`}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      {t('common:delete')}
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardContent>
      )}
      
      {isAdministrator && (
        <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('confirmDeleteTitle')}</AlertDialogTitle>
              <AlertDialogDescription>
                {t('confirmDeleteDescription')}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
              <AlertDialogCancel disabled={deleteShipmentMutation.isPending} className="w-full sm:w-auto">
                {t('common:cancel')}
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteShipmentMutation.mutate()}
                disabled={deleteShipmentMutation.isPending}
                className="bg-red-600 hover:bg-red-700 w-full sm:w-auto"
              >
                {deleteShipmentMutation.isPending ? t('common:processing') : t('common:delete')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </Card>
  );
}

function ReceivingShipmentCard({ shipment, isAdministrator }: { shipment: any; isAdministrator: boolean }) {
  const { t } = useTranslation(['imports']);
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [isExpanded, setIsExpanded] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  // Calculate based on total quantities
  const items = shipment.items || [];
  const totalQuantity = items.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0);
  const receivedQuantity = items.reduce((sum: number, item: any) => sum + (item.receivedQuantity || 0), 0);
  const progress = totalQuantity > 0 ? Math.round((receivedQuantity / totalQuantity) * 100) : 0;

  const deleteShipmentMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/imports/shipments/${shipment.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/imports/shipments/receiving'] });
      queryClient.invalidateQueries({ queryKey: ['/api/imports/receipts'] });
      toast({
        title: t('common:deleted'),
        description: t('shipmentDeleted'),
      });
      setShowDeleteConfirm(false);
    },
    onError: (error: Error) => {
      toast({
        title: t('common:error'),
        description: error.message || t('failedToDeleteShipment'),
        variant: "destructive",
      });
    },
  });
  
  // Mutation to move shipment back to "To Receive" status (from receiving status)
  const moveToReceiveMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('POST', `/api/imports/shipments/${shipment.id}/move-back-to-receive`);
    },
    onSuccess: () => {
      toast({
        title: t('movedToReceive'),
        description: t('shipmentMovedToReceiveDesc'),
      });
      // Invalidate all receiving-related queries
      queryClient.invalidateQueries({ queryKey: ['/api/imports/shipments/receivable'] });
      queryClient.invalidateQueries({ queryKey: ['/api/imports/shipments/to-receive'] });
      queryClient.invalidateQueries({ queryKey: ['/api/imports/shipments/receiving'] });
      queryClient.invalidateQueries({ queryKey: ['/api/imports/shipments/storage'] });
      queryClient.invalidateQueries({ queryKey: [`/api/imports/shipments/${shipment.id}`] });
    },
    onError: (error: any) => {
      toast({
        title: t('common:error'),
        description: error.message || t('failedToMoveShipment'),
        variant: 'destructive',
      });
    },
  });

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
            <div className="flex items-center gap-1">
              <Badge className={getStatusColor('receiving')}>
                {t('inProgress')}
              </Badge>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-8 w-8 p-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreVertical className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      moveToReceiveMutation.mutate();
                    }}
                    disabled={moveToReceiveMutation.isPending}
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    {t('moveBackToReceive')}
                  </DropdownMenuItem>
                  {isAdministrator && (
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowDeleteConfirm(true);
                      }}
                      disabled={deleteShipmentMutation.isPending}
                      className="text-red-600 dark:text-red-400"
                      data-testid={`menu-item-delete-${shipment.id}`}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      {t('common:delete')}
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
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
      
      {isAdministrator && (
        <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('confirmDeleteTitle')}</AlertDialogTitle>
              <AlertDialogDescription>
                {t('confirmDeleteDescription')}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
              <AlertDialogCancel disabled={deleteShipmentMutation.isPending} className="w-full sm:w-auto">
                {t('common:cancel')}
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteShipmentMutation.mutate()}
                disabled={deleteShipmentMutation.isPending}
                className="bg-red-600 hover:bg-red-700 w-full sm:w-auto"
              >
                {deleteShipmentMutation.isPending ? t('common:processing') : t('common:delete')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
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
  variantId?: string; // For variant-specific location tracking
  variantName?: string; // Display name for variant
  sku?: string; // SKU for variant matching (primary identifier)
}

// Variant allocation for products with variants
interface VariantAllocation {
  variantId: string;
  variantName: string;
  quantity: number;
  unitPrice?: number;
  unitPriceCurrency?: string; // Currency of the unitPrice, defaults to parent's paymentCurrency
  sku?: string; // SKU as primary identifier
  barcode?: string; // Barcode for variant
}

// Order item from unpacked PO package
interface OrderItem {
  name: string;
  sku?: string;
  quantity: number;
  unitPrice?: number;
  imageUrl?: string;
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
  // DRAFT: Pending allocations not yet saved (local only)
  locations: LocationAssignment[];
  // REFERENCE: Current inventory locations (read-only, for display/autofill reference)
  // These are NOT modified by receiving operations - purely informational
  referenceInventory: LocationAssignment[];
  // RECEIPT: Locations saved specifically for THIS receipt (tagged with RI:{receiptItemId}:)
  receiptLocations: LocationAssignment[];
  // Track pending additions to existing locations: { locationCode: quantity }
  pendingExistingAdds: Record<string, number>;
  // Variant allocations for products with variants
  variantAllocations?: VariantAllocation[];
  // Order items from unpacked PO package
  orderItems?: OrderItem[];
  // PO number for unpacked packages
  orderNumber?: string;
}

// Enhanced location suggestion with quantity info
interface LocationSuggestion {
  locationCode: string;
  currentQuantity: number;
  isPrimary: boolean;
  source: 'existing' | 'ai' | 'heuristic';
  reasoning?: string;
}

// Helper function to extract the quantity stored for a specific receipt item from the notes field
// Notes format: "RI:{receiptItemId}:Q{qty}" e.g., "RI:123:Q30"
function getReceivingQtyFromNotes(notes: string | undefined, receiptItemId: number | string): number {
  if (!notes) return 0;
  const pattern = new RegExp(`RI:${receiptItemId}:Q(\\d+)`);
  const match = notes.match(pattern);
  return match ? parseInt(match[1], 10) : 0;
}

// Helper function to calculate total quantity stored for this receiving session
// Uses receiptLocations (locations tagged with RI:{receiptItemId}:) instead of existingLocations
function calculateStoredQtyForReceiving(receiptLocations: LocationAssignment[], receiptItemId: number | string): number {
  return (receiptLocations || []).reduce((sum, loc) => {
    // receiptLocations already filtered to only contain this receipt's items
    // Extract quantity from notes tag for precise per-receipt tracking
    const hasThisTag = loc.notes?.includes(`RI:${receiptItemId}:`);
    if (hasThisTag) {
      return sum + getReceivingQtyFromNotes(loc.notes, receiptItemId);
    }
    // Fallback: use location quantity if no tag (shouldn't happen for receiptLocations)
    return sum + (loc.quantity || 0);
  }, 0);
}

// Helper function to build all location suggestions with quantities
// Uses referenceInventory for display/autofill reference (read-only current inventory)
function buildLocationSuggestions(
  item: StorageItem,
  aiSuggestions: Map<string | number, { location: string; reasoning: string; zone: string; accessibility: string }>
): LocationSuggestion[] {
  const suggestions: LocationSuggestion[] = [];
  
  // First, add all reference inventory locations sorted by priority (primary first, then by quantity)
  // referenceInventory is read-only current inventory - used for autofill suggestions
  if (item.referenceInventory && item.referenceInventory.length > 0) {
    const sorted = [...item.referenceInventory].sort((a, b) => {
      if (a.isPrimary && !b.isPrimary) return -1;
      if (!a.isPrimary && b.isPrimary) return 1;
      return b.quantity - a.quantity;
    });
    
    for (const loc of sorted) {
      suggestions.push({
        locationCode: loc.locationCode,
        currentQuantity: loc.quantity,
        isPrimary: loc.isPrimary,
        source: 'existing'
      });
    }
  }
  
  // If no reference inventory locations, add AI or heuristic suggestion
  if (suggestions.length === 0) {
    const key = item.productId || item.sku || item.productName;
    if (aiSuggestions.has(key)) {
      const aiSugg = aiSuggestions.get(key)!;
      suggestions.push({
        locationCode: aiSugg.location,
        currentQuantity: 0,
        isPrimary: true,
        source: 'ai',
        reasoning: aiSugg.reasoning
      });
    } else {
      // Fallback heuristic
      suggestions.push({
        locationCode: generateSuggestedLocationWithAI(item, aiSuggestions),
        currentQuantity: 0,
        isPrimary: true,
        source: 'heuristic'
      });
    }
  }
  
  return suggestions;
}

// Helper function to get suggested location from reference inventory (read-only current inventory)
function getSuggestedLocation(item: StorageItem): string | null {
  if (item.referenceInventory && item.referenceInventory.length > 0) {
    const primaryLoc = item.referenceInventory.find(loc => loc.isPrimary);
    if (primaryLoc) return primaryLoc.locationCode;
    const sortedByQty = [...item.referenceInventory].sort((a, b) => b.quantity - a.quantity);
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

// Format location code with automatic dashing (e.g., wh1a01 → WH1-A01)
// Accepts short formats like WH1-A1 (without leading zeros)
function formatLocationCode(input: string): string {
  const cleaned = input.toUpperCase().replace(/[^A-Z0-9-]/g, '');
  // Allow manual dashes - split by dash first, then format each segment
  const parts = cleaned.split('-').filter(Boolean);
  const segments: string[] = [];
  
  for (const part of parts) {
    // Match letter(s) followed by optional number(s) within each dash-separated part
    const matches = part.match(/[A-Z]+\d*/g) || [];
    segments.push(...matches);
  }
  
  return segments.join('-');
}

// Get the next expected section hint based on current location code input
// Minimum valid: WH1-A1 (2 segments). Optional: R and L sections
function getLocationHint(input: string): { hint: string; complete: boolean; displayInput: string } {
  const segments = input.split('-').filter(Boolean);
  const segmentCount = segments.length;
  
  // Check if current segment is complete (has letters and at least one number)
  const lastSegment = segments[segmentCount - 1] || '';
  const hasNumber = /\d/.test(lastSegment);
  const hasLetters = /[A-Z]/.test(lastSegment);
  
  if (segmentCount === 0 || !input) {
    return { hint: 'WH_', complete: false, displayInput: '' };
  }
  
  // If current segment doesn't have a number yet, hint to add number
  if (hasLetters && !hasNumber) {
    return { hint: '_', complete: false, displayInput: input };
  }
  
  // Current segment is complete - mark as valid if at least WH-A (2 segments)
  // Show optional hints for additional sections
  if (segmentCount === 1) {
    return { hint: '-A_', complete: false, displayInput: input };
  } else if (segmentCount === 2) {
    return { hint: '-R_', complete: true, displayInput: input };
  } else if (segmentCount === 3) {
    return { hint: '-L_', complete: true, displayInput: input };
  } else if (segmentCount >= 4) {
    return { hint: '', complete: true, displayInput: input };
  }
  
  return { hint: '', complete: true, displayInput: input };
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
  const [isBatchSaving, setIsBatchSaving] = useState(false);
  const [isUndoingAll, setIsUndoingAll] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [showProductDetails, setShowProductDetails] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<Map<string | number, { location: string; reasoning: string; zone: string; accessibility: string }>>(new Map());
  const [inventoryLocations, setInventoryLocations] = useState<Map<string, any[]>>(new Map());
  
  // Bulk allocation state - per-aisle configuration for practical warehouse layouts
  interface AisleConfig {
    id: string;
    aisle: number;
    rackStart: number;
    rackEnd: number;
    levels: number;
    binsPerLevel: number;
  }
  
  interface BulkAllocationSettings {
    warehouse: string;
    aisleConfigs: AisleConfig[];
    itemsPerLocation: number;
    fillDirection: 'bottom-up' | 'top-down';
    lastItemsLevel: number | null;
  }
  
  const [showBulkAllocation, setShowBulkAllocation] = useState(false);
  const [bulkWarehouse, setBulkWarehouse] = useState("WH1");
  const [bulkAisleConfigs, setBulkAisleConfigs] = useState<AisleConfig[]>([
    { id: '1', aisle: 1, rackStart: 1, rackEnd: 10, levels: 4, binsPerLevel: 0 }
  ]);
  const [bulkItemsPerLocation, setBulkItemsPerLocation] = useState(50);
  const [bulkFillDirection, setBulkFillDirection] = useState<'bottom-up' | 'top-down'>('bottom-up');
  const [bulkLastItemsLevel, setBulkLastItemsLevel] = useState<number | null>(null);
  
  // Cache for bulk allocation settings per item (persists across modal opens/closes)
  const bulkSettingsCache = useRef<Map<string | number, BulkAllocationSettings>>(new Map());
  
  // Get current item key for bulk allocation caching
  const bulkItemKey = items[selectedItemIndex]?.receiptItemId;
  
  // Restore bulk allocation settings when modal opens
  useEffect(() => {
    if (showBulkAllocation && bulkItemKey) {
      const cached = bulkSettingsCache.current.get(bulkItemKey);
      if (cached) {
        setBulkWarehouse(cached.warehouse);
        setBulkAisleConfigs(cached.aisleConfigs);
        setBulkItemsPerLocation(cached.itemsPerLocation);
        setBulkFillDirection(cached.fillDirection);
        setBulkLastItemsLevel(cached.lastItemsLevel);
      } else {
        // Auto-fill Items/Location with average variant quantity
        const currentStorageItem = items[selectedItemIndex];
        if (currentStorageItem?.variantAllocations && currentStorageItem.variantAllocations.length > 0) {
          const totalItems = currentStorageItem.variantAllocations.reduce((sum, v) => sum + (v.quantity || 0), 0);
          const avgPerVariant = Math.round(totalItems / currentStorageItem.variantAllocations.length);
          if (avgPerVariant > 0) {
            setBulkItemsPerLocation(avgPerVariant);
          }
        }
      }
    }
  }, [showBulkAllocation, bulkItemKey, items, selectedItemIndex]);
  
  // Save bulk allocation settings when they change (while modal is open)
  useEffect(() => {
    if (showBulkAllocation && bulkItemKey) {
      bulkSettingsCache.current.set(bulkItemKey, {
        warehouse: bulkWarehouse,
        aisleConfigs: bulkAisleConfigs,
        itemsPerLocation: bulkItemsPerLocation,
        fillDirection: bulkFillDirection,
        lastItemsLevel: bulkLastItemsLevel
      });
    }
  }, [showBulkAllocation, bulkItemKey, bulkWarehouse, bulkAisleConfigs, bulkItemsPerLocation, bulkFillDirection, bulkLastItemsLevel]);
  
  // Helper to add new aisle config (copies from last aisle)
  const addAisleConfig = () => {
    const lastConfig = bulkAisleConfigs[bulkAisleConfigs.length - 1];
    const newAisle = lastConfig ? lastConfig.aisle + 1 : 1;
    setBulkAisleConfigs([...bulkAisleConfigs, {
      id: Date.now().toString(),
      aisle: newAisle,
      rackStart: lastConfig?.rackStart || 1,
      rackEnd: lastConfig?.rackEnd || 10,
      levels: lastConfig?.levels || 4,
      binsPerLevel: lastConfig?.binsPerLevel || 0
    }]);
  };
  
  // Helper to remove aisle config
  const removeAisleConfig = (id: string) => {
    if (bulkAisleConfigs.length > 1) {
      setBulkAisleConfigs(bulkAisleConfigs.filter(c => c.id !== id));
    }
  };
  
  // Helper to update aisle config
  const updateAisleConfig = (id: string, updates: Partial<AisleConfig>) => {
    setBulkAisleConfigs(bulkAisleConfigs.map(c => c.id === id ? { ...c, ...updates } : c));
  };
  
  // Helper to paste/detect scheme from reference inventory (current warehouse locations)
  const pasteSchemeFromLocations = () => {
    const currentItem = items[selectedItemIndex];
    if (!currentItem?.referenceInventory || currentItem.referenceInventory.length === 0) {
      toast({
        title: t('imports:noLocationsFound', 'No Existing Locations'),
        description: t('imports:noLocationsToAnalyze', 'No existing locations found to analyze scheme from'),
        variant: 'destructive'
      });
      return;
    }
    
    // Parse location codes: WH1-A1-R01-L1 or WH1-A1-R01-L1-B2
    // Format: {warehouse}-A{aisle}-R{rack}-L{level}[-B{bin}]
    const parsedLocations: Array<{ warehouse: string; aisle: number; rack: number; level: number; bin?: number }> = [];
    
    for (const loc of currentItem.referenceInventory) {
      const code = loc.locationCode || '';
      // Match pattern: WH1-A1-R01-L1 or WH1-A1-R1-L1-B2
      const match = code.match(/^([A-Z0-9]+)-A(\d+)-R(\d+)-L(\d+)(?:-B(\d+))?$/i);
      if (match) {
        parsedLocations.push({
          warehouse: match[1].toUpperCase(),
          aisle: parseInt(match[2]),
          rack: parseInt(match[3]),
          level: parseInt(match[4]),
          bin: match[5] ? parseInt(match[5]) : undefined
        });
      }
    }
    
    if (parsedLocations.length === 0) {
      toast({
        title: t('imports:unrecognizedFormat', 'Unrecognized Format'),
        description: t('imports:locationFormatNotRecognized', 'Could not parse location codes. Expected format: WH1-A1-R01-L1'),
        variant: 'destructive'
      });
      return;
    }
    
    // Extract warehouse (use most common)
    const warehouseCounts = new Map<string, number>();
    parsedLocations.forEach(loc => {
      warehouseCounts.set(loc.warehouse, (warehouseCounts.get(loc.warehouse) || 0) + 1);
    });
    const detectedWarehouse = Array.from(warehouseCounts.entries()).sort((a, b) => b[1] - a[1])[0][0];
    setBulkWarehouse(detectedWarehouse);
    
    // Group by aisle and find rack/level ranges
    const aisleMap = new Map<number, { racks: Set<number>; levels: Set<number>; bins: Set<number> }>();
    
    for (const loc of parsedLocations) {
      if (!aisleMap.has(loc.aisle)) {
        aisleMap.set(loc.aisle, { racks: new Set(), levels: new Set(), bins: new Set() });
      }
      const aisleData = aisleMap.get(loc.aisle)!;
      aisleData.racks.add(loc.rack);
      aisleData.levels.add(loc.level);
      if (loc.bin !== undefined) aisleData.bins.add(loc.bin);
    }
    
    // Build aisle configs
    const newConfigs: AisleConfig[] = [];
    const sortedAisles = Array.from(aisleMap.keys()).sort((a, b) => a - b);
    
    for (const aisleNum of sortedAisles) {
      const data = aisleMap.get(aisleNum)!;
      const racks = Array.from(data.racks).sort((a, b) => a - b);
      const levels = Array.from(data.levels).sort((a, b) => a - b);
      const bins = Array.from(data.bins).sort((a, b) => a - b);
      
      newConfigs.push({
        id: Date.now().toString() + aisleNum,
        aisle: aisleNum,
        rackStart: racks[0] || 1,
        rackEnd: racks[racks.length - 1] || 10,
        levels: levels.length > 0 ? Math.max(...levels) : 4,
        binsPerLevel: bins.length > 0 ? Math.max(...bins) : 0
      });
    }
    
    if (newConfigs.length > 0) {
      setBulkAisleConfigs(newConfigs);
      toast({
        title: t('imports:schemeDetected', 'Scheme Detected'),
        description: t('imports:schemeApplied', '{{count}} aisle(s) detected from {{total}} locations', { 
          count: newConfigs.length, 
          total: parsedLocations.length 
        }),
        duration: 3000
      });
    }
  };
  
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
    
    // Validate location format - accepts 2-4 segments (WH1-A1, WH1-A1-R1, WH1-A1-R1-L1)
    if (!/^[A-Z0-9]+-[A-Z]\d+(-R\d+)?(-L\d+)?$/.test(uppercaseValue)) {
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
      const storageItems: StorageItem[] = receiptItems.map((item: any) => {
        // Parse variantAllocations if it's a string
        let variantAllocations: VariantAllocation[] | undefined;
        if (item.variantAllocations) {
          try {
            variantAllocations = typeof item.variantAllocations === 'string'
              ? JSON.parse(item.variantAllocations)
              : item.variantAllocations;
          } catch (e) {
            console.warn('Failed to parse variantAllocations:', e);
          }
        }
        
        // Parse orderItems if it's a string
        let orderItems: OrderItem[] | undefined;
        if (item.orderItems) {
          try {
            orderItems = typeof item.orderItems === 'string'
              ? JSON.parse(item.orderItems)
              : item.orderItems;
          } catch (e) {
            console.warn('Failed to parse orderItems:', e);
          }
        }
        
        // Get orderNumber from customItem if available
        const orderNumber = item.customItem?.orderNumber || item.orderNumber;
        
        // Enhance existing locations with variantName from variantAllocations
        // Try multiple matching strategies: variantId, SKU, or existing variantName
        const rawLocations = item.receiptLocations || item.product?.locations || [];
        const enhancedLocations = rawLocations.map((loc: any) => {
          // If location already has variantName, keep it
          if (loc.variantName) {
            return loc;
          }
          
          let variantName = '';
          let matchedSku = loc.sku || '';
          
          if (variantAllocations && variantAllocations.length > 0) {
            // Try matching by variantId first
            if (loc.variantId) {
              const variantById = variantAllocations.find((v: VariantAllocation) => v.variantId === loc.variantId);
              if (variantById) {
                variantName = variantById.variantName || '';
                matchedSku = (variantById as any).sku || variantName;
              }
            }
            
            // If no match by ID, try matching by SKU
            if (!variantName && loc.sku) {
              const variantBySku = variantAllocations.find((v: any) => 
                v.sku && loc.sku && v.sku === loc.sku
              );
              if (variantBySku) {
                variantName = variantBySku.variantName || '';
              }
            }
          }
          
          return {
            ...loc,
            variantName,
            sku: matchedSku || loc.sku
          };
        });
        
        // For multi-variant items, calculate total quantity from variant allocations if receivedQuantity is 0
        let receivedQuantity = item.receivedQuantity || item.quantity || 0;
        if (receivedQuantity === 0 && variantAllocations && variantAllocations.length > 0) {
          receivedQuantity = variantAllocations.reduce((sum: number, v: VariantAllocation) => sum + (v.quantity || 0), 0);
        }
        
        return {
          receiptItemId: item.id,
          productId: item.productId,
          productName: item.productName || item.description || `Item #${item.id}`,
          sku: item.sku,
          barcode: item.barcode,
          imageUrl: item.imageUrl || item.product?.imageUrl,
          description: item.description,
          receivedQuantity,
          assignedQuantity: item.assignedQuantity || 0,
          locations: item.locations || [],
          // THREE-TIER ALLOCATION MODEL:
          // referenceInventory: Read-only current inventory (populated by separate fetch)
          referenceInventory: [],
          // receiptLocations: Locations saved for THIS receipt (populated by fetch, tagged with RI:{receiptItemId}:)
          receiptLocations: [],
          pendingExistingAdds: {}, // Initialize empty pending adds
          variantAllocations,
          orderItems,
          orderNumber
        };
      });
      setItems(storageItems);
    }
  }, [receiptData]);
  
  // Fetch inventory locations for all products that have productId
  // Also fetch variants to populate variantName on locations
  useEffect(() => {
    const fetchInventoryLocations = async () => {
      // Filter items with productId that we haven't fetched yet
      const productIdsToFetch = items
        .filter(item => item.productId && !inventoryLocations.has(String(item.productId)))
        .map(item => String(item.productId));
      
      // Remove duplicates
      const uniqueProductIds = Array.from(new Set(productIdsToFetch));
      
      if (uniqueProductIds.length === 0) {
        console.log('[Storage] No new product IDs to fetch locations for');
        return;
      }
      
      console.log('[Storage] Fetching inventory locations for products:', uniqueProductIds);
      
      for (const productId of uniqueProductIds) {
        try {
          // Fetch locations first, then try to get variants for products that have them
          const locResponse = await fetch(`/api/products/${productId}/locations`, { credentials: 'include' });
          
          // Try to fetch variants (may 404 for products without variants, that's OK)
          let variantResponse: Response | null = null;
          try {
            variantResponse = await fetch(`/api/products/${productId}/variants`, { credentials: 'include' });
          } catch (e) {
            // Ignore variant fetch errors
          }
          
          if (locResponse.ok) {
            const locations = await locResponse.json();
            
            // Build variant lookup map if variants were fetched successfully
            const variantMap = new Map<string, { sku: string; name: string }>();
            if (variantResponse && variantResponse.ok) {
              try {
                const variants = await variantResponse.json();
                for (const v of variants) {
                  variantMap.set(v.id, { sku: v.sku || '', name: v.name || '' });
                }
              } catch (e) {
                // Ignore JSON parse errors for variant response
              }
            }
            
            // Enhanced locations will be stored in inventoryLocations Map
            // Note: We store locations with API variant info; item-specific fallback is applied separately
            const enhancedLocations = locations.map((loc: any) => {
              let variantName = loc.variantName || '';
              let sku = loc.sku || '';
              if (loc.variantId && variantMap.has(loc.variantId)) {
                const variantInfo = variantMap.get(loc.variantId);
                if (variantInfo) {
                  variantName = variantInfo.name;
                  sku = variantInfo.sku;
                }
              }
              return { ...loc, variantName, sku };
            });
            
            console.log(`[Storage] Fetched ${enhancedLocations.length} locations for product ${productId}`);
            setInventoryLocations(prev => {
              const newMap = new Map(prev);
              newMap.set(productId, enhancedLocations);
              return newMap;
            });
            
            // Update items with THREE-TIER ALLOCATION MODEL:
            // - referenceInventory: ALL locations for this product (read-only reference)
            // - receiptLocations: Only locations with notes containing RI:{receiptItemId}:
            setItems(prevItems => {
              return prevItems.map(item => {
                if (String(item.productId) !== productId) return item;
                
                // Build fallback map from variantAllocations 
                const allocationMap = new Map<string, { sku: string; name: string }>();
                if (item.variantAllocations && item.variantAllocations.length > 0) {
                  for (const va of item.variantAllocations) {
                    if (va.variantId) {
                      allocationMap.set(va.variantId, { 
                        sku: (va as any).sku || va.variantName || '', 
                        name: va.variantName || '' 
                      });
                    }
                  }
                }
                
                // Also build a SKU-based lookup from variantAllocations
                const allocationBySkuMap = new Map<string, { sku: string; name: string }>();
                if (item.variantAllocations && item.variantAllocations.length > 0) {
                  for (const va of item.variantAllocations) {
                    const vaSku = (va as any).sku || va.variantName;
                    if (vaSku) {
                      allocationBySkuMap.set(vaSku, { 
                        sku: vaSku, 
                        name: va.variantName || '' 
                      });
                    }
                  }
                }
                
                // Enhance ALL locations with variant info - apply variant info from all sources
                const enhanceLocation = (loc: any) => {
                  // Skip if already has a variantName populated
                  if (loc.variantName) return loc;
                  
                  // Try API variant map first (by variantId)
                  if (loc.variantId && variantMap.has(loc.variantId)) {
                    const variantInfo = variantMap.get(loc.variantId);
                    return {
                      ...loc,
                      variantName: variantInfo?.name || '',
                      sku: variantInfo?.sku || loc.sku || ''
                    };
                  }
                  
                  // Fallback to variantAllocations by variantId
                  if (loc.variantId && allocationMap.has(loc.variantId)) {
                    const variantInfo = allocationMap.get(loc.variantId);
                    return {
                      ...loc,
                      variantName: variantInfo?.name || '',
                      sku: variantInfo?.sku || loc.sku || ''
                    };
                  }
                  
                  // Fallback to variantAllocations by SKU
                  if (loc.sku && allocationBySkuMap.has(loc.sku)) {
                    const variantInfo = allocationBySkuMap.get(loc.sku);
                    return {
                      ...loc,
                      variantName: variantInfo?.name || '',
                      sku: variantInfo?.sku || loc.sku || ''
                    };
                  }
                  
                  return loc;
                };
                
                // referenceInventory: ALL enhanced locations (for display/autofill reference)
                // Deep copy to prevent mutations from affecting this read-only list
                const updatedReferenceInventory = enhancedLocations.map(enhanceLocation).map(loc => ({ ...loc }));
                
                // receiptLocations: Only locations with notes containing RI:{receiptItemId}:
                // These are locations specifically saved for THIS receipt
                // Deep copy to ensure edits don't affect referenceInventory
                const receiptTag = `RI:${item.receiptItemId}:`;
                const updatedReceiptLocations = enhancedLocations
                  .filter((loc: any) => loc.notes?.includes(receiptTag))
                  .map(enhanceLocation)
                  .map(loc => ({ ...loc })); // Deep copy for isolation
                
                console.log(`[Storage] Product ${productId}: referenceInventory=${updatedReferenceInventory.length}, receiptLocations=${updatedReceiptLocations.length}`);
                
                return { 
                  ...item, 
                  referenceInventory: updatedReferenceInventory,
                  receiptLocations: updatedReceiptLocations
                };
              });
            });
          } else {
            console.error(`[Storage] Failed to fetch locations for product ${productId}: ${locResponse.status}`);
          }
        } catch (error) {
          console.error(`[Storage] Error fetching locations for product ${productId}:`, error);
        }
      }
    };
    
    if (items.length > 0 && open) {
      fetchInventoryLocations();
    }
  }, [items, open]); // Use items array directly to trigger on any item change
  
  // Fetch AI suggestions for items without reference inventory locations (with batching and caching)
  useEffect(() => {
    const fetchAISuggestions = async () => {
      // Filter items that need suggestions, using cache to prevent re-fetching
      const itemsNeedingSuggestions = items.filter(item => {
        const key = String(item.productId || item.sku || item.productName);
        // Skip if: has reference inventory locations, already cached, already fetched, or currently fetching
        if (item.referenceInventory && item.referenceInventory.length > 0) return false;
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
    mutationFn: async ({ productId, locationCode, locationType, quantity, isPrimary, receiptItemId, variantId }: {
      productId: string;
      locationCode: string;
      locationType: string;
      quantity: number;
      isPrimary: boolean;
      receiptItemId?: number | string;
      variantId?: string; // For variant-specific location tracking
    }) => {
      return apiRequest('POST', `/api/products/${productId}/locations`, { locationCode, locationType, quantity, isPrimary, receiptItemId, variantId });
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
        description: t('unitsStoredAtLocation', { quantity: variables.quantity, location: variables.locationCode }),
        duration: 2000
      });
    },
    onError: (error) => {
      toast({
        title: t('common:error'),
        description: error instanceof Error ? error.message : t('failedToSaveStorageLocation'),
        variant: "destructive",
      });
    }
  });

  // Update existing location mutation
  const updateLocationMutation = useMutation({
    mutationFn: async ({ productId, locationId, quantity, receiptItemId }: {
      productId: string;
      locationId: string;
      quantity: number;
      receiptItemId?: string;
    }) => {
      return apiRequest('PATCH', `/api/products/${productId}/locations/${locationId}`, { quantity, receiptItemId });
    },
    onSuccess: (data, variables) => {
      queryClient.refetchQueries({ queryKey: [`/api/imports/receipts/by-shipment/${shipment.id}`] });
      queryClient.refetchQueries({ queryKey: ['/api/imports/shipments/storage'] });
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      queryClient.invalidateQueries({ queryKey: [`/api/products/${variables.productId}/locations`] });
    },
    onError: (error) => {
      toast({
        title: t('common:error'),
        description: error instanceof Error ? error.message : t('failedToUpdateLocation'),
        variant: "destructive",
      });
    }
  });

  // Delete existing location mutation
  const deleteLocationMutation = useMutation({
    mutationFn: async ({ productId, locationId, receiptItemId }: {
      productId: string;
      locationId: string;
      receiptItemId?: string;
    }) => {
      return apiRequest('DELETE', `/api/products/${productId}/locations/${locationId}`, { receiptItemId });
    },
    onSuccess: (data, variables) => {
      queryClient.refetchQueries({ queryKey: [`/api/imports/receipts/by-shipment/${shipment.id}`] });
      queryClient.refetchQueries({ queryKey: ['/api/imports/shipments/storage'] });
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      queryClient.invalidateQueries({ queryKey: [`/api/products/${variables.productId}/locations`] });
      toast({
        title: t('locationDeleted'),
        duration: 2000
      });
    },
    onError: (error) => {
      toast({
        title: t('common:error'),
        description: error instanceof Error ? error.message : t('failedToDeleteLocation'),
        variant: "destructive",
      });
    }
  });
  
  // Complete receiving mutation - updates shipment status to completed
  // Optimistically moves card to Completed tab immediately for swift visual feedback
  const completeReceivingMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('PATCH', `/api/imports/shipments/${shipment.id}/receiving-status`, { 
        receivingStatus: 'completed' 
      });
    },
    onMutate: async () => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['/api/imports/shipments/storage'] });
      await queryClient.cancelQueries({ queryKey: ['/api/imports/shipments/completed'] });
      
      // Snapshot the previous value for potential rollback
      const previousStorage = queryClient.getQueryData(['/api/imports/shipments/storage']);
      const previousCompleted = queryClient.getQueryData(['/api/imports/shipments/completed']);
      
      // Optimistically update: remove from storage list
      queryClient.setQueryData(['/api/imports/shipments/storage'], (old: any) => {
        if (!old) return old;
        return old.filter((s: any) => s.id !== shipment.id);
      });
      
      // Optimistically update: add to completed list with updated status
      queryClient.setQueryData(['/api/imports/shipments/completed'], (old: any) => {
        if (!old) return [{ ...shipment, receivingStatus: 'completed', completedAt: new Date().toISOString() }];
        return [{ ...shipment, receivingStatus: 'completed', completedAt: new Date().toISOString() }, ...old];
      });
      
      // Close dialog and show processing toast
      soundEffects.playCompletionSound();
      toast({
        title: t('storageComplete'),
        description: t('processingInBackground', 'Inventory and costs are being updated...'),
        duration: 5000
      });
      onOpenChange(false);
      
      // Return context with previous values for rollback
      return { previousStorage, previousCompleted };
    },
    onSuccess: () => {
      // Immediately invalidate storage query to ensure fresh data when navigating back
      queryClient.invalidateQueries({ queryKey: ['/api/imports/shipments/storage'] });
      queryClient.invalidateQueries({ queryKey: ['/api/imports/shipments/completed'] });
      queryClient.invalidateQueries({ queryKey: ['/api/imports/shipments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
    },
    onError: (error, _, context) => {
      // Rollback to previous state if mutation fails
      if (context?.previousStorage) {
        queryClient.setQueryData(['/api/imports/shipments/storage'], context.previousStorage);
      }
      if (context?.previousCompleted) {
        queryClient.setQueryData(['/api/imports/shipments/completed'], context.previousCompleted);
      }
      
      // Notify user of failure
      toast({
        title: t('common:error'),
        description: error instanceof Error ? error.message : t('failedToCompleteReceiving'),
        variant: "destructive",
        duration: 5000
      });
    }
  });
  
  // Calculate progress using quantities stored for THIS receiving session only (from notes tags)
  // Also include pending additions that haven't been saved yet (for visual progress only)
  const totalItems = items.length;
  const completedItemsVisual = items.filter(item => {
    const storedQty = calculateStoredQtyForReceiving(item.receiptLocations, item.receiptItemId);
    const pendingExisting = Object.values(item.pendingExistingAdds || {}).reduce((sum, qty) => sum + (qty || 0), 0);
    const pendingNew = item.locations.reduce((sum, loc) => sum + (loc.quantity || 0), 0);
    return storedQty + pendingExisting + pendingNew >= item.receivedQuantity;
  }).length;
  const progress = totalItems > 0 ? (completedItemsVisual / totalItems) * 100 : 0;
  
  // For UI display of completed items count (includes pending)
  const completedItems = completedItemsVisual;
  
  // Check if all items are fully stored - ONLY based on SAVED assignedQuantity
  // The backend validates assignedQuantity >= receivedQuantity, so we must match that check
  // This prevents showing "Complete Receiving" button before pending allocations are saved
  const allItemsSavedCount = items.filter(item => {
    return (item.assignedQuantity || 0) >= (item.receivedQuantity || 0);
  }).length;
  const allItemsStored = totalItems > 0 && allItemsSavedCount === totalItems;
  
  // Show warning if items appear complete visually but not saved
  const hasPendingUnsaved = completedItemsVisual > allItemsSavedCount;
  
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
    // Accepts 2-4 segments: WH1-A1, WH1-A1-R1, WH1-A1-R1-L1 (with optional 5th segment)
    const locationPattern = /^[A-Z0-9]+-[A-Z]\d+(-R\d+)?(-L\d+)?(-[A-Z0-9]+)?$/;
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
    
    // Calculate remaining quantity for auto-fill - include BOTH receipt-saved and pending locations
    const isFirstLocation = (currentItem?.locations.length === 0) && (currentItem?.receiptLocations?.length === 0);
    const existingQty = currentItem?.receiptLocations?.reduce((sum: number, loc: any) => sum + (loc.quantity || 0), 0) || 0;
    const pendingQty = currentItem?.locations.reduce((sum, loc) => sum + (loc.quantity || 0), 0) || 0;
    const currentRemaining = currentItem ? 
      Math.max(0, currentItem.receivedQuantity - existingQty - pendingQty) : 0;
    
    const updatedItems = [...items];
    
    // Check if this is a multi-variant item
    const hasMultipleVariants = currentItem?.variantAllocations && currentItem.variantAllocations.length > 1;
    
    if (hasMultipleVariants && currentItem.variantAllocations) {
      // For multi-variant items, create a separate location entry for each variant
      // Only add entries for variants with remaining quantity (subtract stored + pending)
      let addedFirst = false;
      currentItem.variantAllocations.forEach((variant) => {
        // Calculate remaining for this specific variant (use receiptLocations for this receipt's saved data)
        const existingForVariant = currentItem?.receiptLocations?.reduce((sum: number, loc: any) => {
          return sum + (loc.variantId === variant.variantId ? (loc.quantity || 0) : 0);
        }, 0) || 0;
        const pendingForVariant = currentItem?.locations.reduce((sum, loc) => {
          return sum + (loc.variantId === variant.variantId ? (loc.quantity || 0) : 0);
        }, 0) || 0;
        const variantRemaining = Math.max(0, variant.quantity - existingForVariant - pendingForVariant);
        
        // Only add if there's remaining quantity for this variant
        if (variantRemaining > 0) {
          const newLocation: LocationAssignment = {
            id: `new-${Date.now()}-${variant.variantId}`,
            locationCode: trimmedValue,
            locationType,
            quantity: variantRemaining,
            isPrimary: !addedFirst && isFirstLocation, // First variant in first location is primary
            variantId: variant.variantId,
            variantName: variant.variantName
          };
          updatedItems[selectedItemIndex].locations.push(newLocation);
          addedFirst = true;
        }
      });
    } else {
      // Single variant or no variants - use original logic
      const newLocation: LocationAssignment = {
        id: `new-${Date.now()}`,
        locationCode: trimmedValue,
        locationType,
        quantity: currentRemaining > 0 ? currentRemaining : 0,
        isPrimary: isFirstLocation,
        // Include single variant ID if exists
        variantId: currentItem?.variantAllocations?.[0]?.variantId,
        variantName: currentItem?.variantAllocations?.[0]?.variantName
      };
      updatedItems[selectedItemIndex].locations.push(newLocation);
    }
    
    setItems(updatedItems);
    
    // Play success sound and show feedback
    await soundEffects.playSuccessBeep();
    const feedbackMsg = currentRemaining > 0
      ? `Location scanned: ${trimmedValue} (${currentRemaining} units assigned)`
      : `Location scanned: ${trimmedValue}`;
    setScanFeedback({ type: 'success', message: feedbackMsg });
    setTimeout(() => setScanFeedback({ type: null, message: '' }), 2000);
    
    // Keep the input value so user can quickly modify and add another similar location
    // setLocationInput(""); - Removed to allow faster multi-location entry
  };
  
  // Generate all location codes based on per-aisle configurations (rack-first ordering)
  const generateBulkLocations = useCallback(() => {
    const locations: string[] = [];
    
    if (!bulkWarehouse || bulkAisleConfigs.length === 0) return locations;
    
    // Process each aisle configuration
    for (const config of bulkAisleConfigs) {
      const rackStart = Math.min(config.rackStart, config.rackEnd);
      const rackEnd = Math.max(config.rackStart, config.rackEnd);
      const levels = Math.max(1, config.levels);
      const bins = config.binsPerLevel > 0 ? config.binsPerLevel : 0;
      
      // Determine level order based on fill direction
      const levelOrder = bulkFillDirection === 'top-down' 
        ? Array.from({ length: levels }, (_, i) => levels - i) // Top first: 5,4,3,2,1
        : Array.from({ length: levels }, (_, i) => i + 1);     // Bottom first: 1,2,3,4,5
      
      // Correct ordering: Racks → Levels → Bins
      // This fills all bins in a level, then moves to next level, then next rack
      for (let rack = rackStart; rack <= rackEnd; rack++) {
        for (const level of levelOrder) {
          if (bins > 0) {
            for (let bin = 1; bin <= bins; bin++) {
              locations.push(`${bulkWarehouse}-A${config.aisle}-R${rack}-L${level}-B${bin}`);
            }
          } else {
            locations.push(`${bulkWarehouse}-A${config.aisle}-R${rack}-L${level}`);
          }
        }
      }
    }
    
    return locations;
  }, [bulkWarehouse, bulkAisleConfigs, bulkFillDirection]);
  
  // Get max levels from all aisle configs
  const getMaxLevels = useCallback(() => {
    return Math.max(...bulkAisleConfigs.map(c => c.levels), 1);
  }, [bulkAisleConfigs]);
  
  // Handle bulk allocation for multi-variant items (e.g., 300-500 gel polishes across racks)
  const handleBulkAllocation = async () => {
    if (!currentItem) return;
    
    const hasVariants = currentItem.variantAllocations && currentItem.variantAllocations.length > 0;
    if (!hasVariants) {
      toast({
        title: t('common:error'),
        description: 'Bulk allocation is only for items with variants',
        variant: "destructive",
      });
      return;
    }
    
    // Validate inputs
    if (!bulkWarehouse || bulkItemsPerLocation < 1) {
      toast({
        title: t('common:error'),
        description: 'Please enter valid warehouse and items per location',
        variant: "destructive",
      });
      return;
    }
    
    const allLocations = generateBulkLocations();
    if (allLocations.length === 0) {
      toast({
        title: t('common:error'),
        description: 'No locations to allocate. Check your range settings.',
        variant: "destructive",
      });
      return;
    }
    
    const updatedItems = [...items];
    let locationIndex = 0;
    let currentLocationCount = 0;
    const locationAllocations: { code: string; variants: { name: string; qty: number }[] }[] = [];
    let currentLocationVariants: { name: string; qty: number }[] = [];
    
    // Helper to match variant by SKU first, then variantId, then variantName
    const matchVariantBulk = (loc: any, variant: VariantAllocation) => {
      const variantSku = (variant as any).sku || variant.variantName;
      if (loc.sku && variantSku && loc.sku === variantSku) return true;
      if (loc.variantId && variant.variantId && loc.variantId === variant.variantId) return true;
      if (loc.variantName && variant.variantName && loc.variantName === variant.variantName) return true;
      return false;
    };
    
    // Distribute variants across locations
    currentItem.variantAllocations!.forEach((variant) => {
      // Calculate remaining for this variant using SKU-based matching (use receiptLocations for this receipt)
      const existingForVariant = currentItem?.receiptLocations?.reduce((sum: number, loc: any) => {
        return sum + (matchVariantBulk(loc, variant) ? (loc.quantity || 0) : 0);
      }, 0) || 0;
      const pendingForVariant = currentItem?.locations.reduce((sum, loc) => {
        return sum + (matchVariantBulk(loc, variant) ? (loc.quantity || 0) : 0);
      }, 0) || 0;
      const variantRemaining = Math.max(0, variant.quantity - existingForVariant - pendingForVariant);
      
      if (variantRemaining <= 0) return;
      
      let remainingToAllocate = variantRemaining;
      
      while (remainingToAllocate > 0 && locationIndex < allLocations.length) {
        const spaceInLocation = bulkItemsPerLocation - currentLocationCount;
        const allocateNow = Math.min(remainingToAllocate, spaceInLocation);
        
        if (allocateNow > 0) {
          const locationCode = allLocations[locationIndex];
          
          // Use SKU as primary identifier, fall back to variantName if no SKU
          const variantSku = (variant as any).sku || variant.variantName;
          
          // Add location assignment
          const newLocation: LocationAssignment = {
            id: `bulk-${Date.now()}-${variant.variantId}-${locationIndex}`,
            locationCode,
            locationType: 'warehouse',
            quantity: allocateNow,
            isPrimary: locationIndex === 0 && currentLocationCount === 0,
            variantId: variant.variantId,
            variantName: variant.variantName,
            sku: variantSku
          };
          updatedItems[selectedItemIndex].locations.push(newLocation);
          
          currentLocationCount += allocateNow;
          remainingToAllocate -= allocateNow;
          currentLocationVariants.push({ name: variant.variantName || 'Unknown', qty: allocateNow });
        }
        
        // Move to next location if current is full
        if (currentLocationCount >= bulkItemsPerLocation) {
          locationAllocations.push({ code: allLocations[locationIndex], variants: [...currentLocationVariants] });
          locationIndex++;
          currentLocationCount = 0;
          currentLocationVariants = [];
        }
      }
    });
    
    // Save last location if it has items
    if (currentLocationVariants.length > 0 && locationIndex < allLocations.length) {
      locationAllocations.push({ code: allLocations[locationIndex], variants: currentLocationVariants });
    }
    
    setItems(updatedItems);
    setShowBulkAllocation(false);
    
    // AUTO-SAVE: Save all bulk allocations immediately
    // This prevents the "pending unsaved" issue where Complete Receiving appears but fails
    const allLocationsToSave = updatedItems[selectedItemIndex].locations
      .filter(loc => loc.quantity > 0)
      .map(loc => ({
        locationCode: loc.locationCode,
        locationType: loc.locationType,
        quantity: loc.quantity,
        isPrimary: loc.isPrimary,
        variantId: loc.variantId || undefined,
        sku: loc.sku || loc.variantName || undefined,
        variantName: loc.variantName || undefined
      }));
    
    if (allLocationsToSave.length > 0 && currentItem.productId) {
      setIsBatchSaving(true);
      try {
        // Single batch API call to save all locations
        await apiRequest('POST', `/api/products/${currentItem.productId}/locations/batch`, {
          locations: allLocationsToSave,
          receiptItemId: currentItem.receiptItemId
        });
        
        // Refetch product locations from server
        const locResponse = await fetch(`/api/products/${currentItem.productId}/locations`, { credentials: 'include' });
        if (locResponse.ok) {
          const serverLocations = await locResponse.json();
          const relevantLocations = serverLocations.filter((loc: any) => 
            loc.notes?.includes(`RI:${currentItem.receiptItemId}:`) || 
            !loc.notes?.includes('RI:')
          );
          
          // Fetch product variants for name mapping
          let variantMap = new Map<string, { sku: string; name: string }>();
          try {
            const variantResponse = await fetch(`/api/products/${currentItem.productId}/variants`, { credentials: 'include' });
            if (variantResponse.ok) {
              const variants = await variantResponse.json();
              for (const v of variants) {
                variantMap.set(v.id, { sku: v.sku || '', name: v.name || '' });
              }
            }
          } catch (e) {
            console.warn('Failed to fetch variants for name lookup:', e);
          }
          
          // Update state with saved locations (receiptLocations for this receipt)
          setItems(prevItems => {
            const updated = [...prevItems];
            updated[selectedItemIndex].receiptLocations = relevantLocations.map((loc: any) => {
              let variantName = '';
              let sku = '';
              if (loc.variantId) {
                const variantInfo = variantMap.get(loc.variantId);
                if (variantInfo) {
                  variantName = variantInfo.name;
                  sku = variantInfo.sku;
                }
              }
              return {
                id: loc.id,
                locationCode: loc.locationCode,
                locationType: loc.locationType,
                quantity: loc.quantity,
                isPrimary: loc.isPrimary,
                notes: loc.notes,
                variantId: loc.variantId,
                variantName,
                sku
              };
            });
            updated[selectedItemIndex].locations = [];
            updated[selectedItemIndex].pendingExistingAdds = {};
            // Update assignedQuantity to reflect saved state
            const totalSaved = allLocationsToSave.reduce((sum, loc) => sum + loc.quantity, 0);
            updated[selectedItemIndex].assignedQuantity = (updated[selectedItemIndex].assignedQuantity || 0) + totalSaved;
            return updated;
          });
        }
        
        await soundEffects.playCompletionSound();
        const totalLocations = locationAllocations.length;
        const totalItems = allLocationsToSave.reduce((sum, loc) => sum + loc.quantity, 0);
        toast({
          title: t('common:success'),
          description: `${totalLocations} ${t('locationsLabel', 'locations')}, ${totalItems.toLocaleString()} ${t('common:items')} ${t('common:saved')}`,
        });
        
        queryClient.invalidateQueries({ queryKey: [`/api/products/${currentItem.productId}/locations`] });
        queryClient.invalidateQueries({ queryKey: [`/api/imports/receipts/by-shipment/${shipment.id}`] });
      } catch (error) {
        console.error('Failed to auto-save bulk allocations:', error);
        toast({
          title: t('common:error'),
          description: t('failedToSaveLocations', 'Failed to save locations'),
          variant: 'destructive'
        });
        // Locations remain as pending in the UI for manual save
      } finally {
        setIsBatchSaving(false);
      }
    } else {
      await soundEffects.playSuccessBeep();
      const totalLocations = locationAllocations.length;
      const fullLocations = locationAllocations.filter(l => l.variants.reduce((sum, v) => sum + v.qty, 0) >= bulkItemsPerLocation).length;
      toast({
        title: t('common:success'),
        description: `Allocated to ${totalLocations} locations (${fullLocations} full, ${totalLocations - fullLocations} partial)`,
      });
    }
  };
  
  // Calculate bulk allocation preview
  const getBulkAllocationPreview = () => {
    if (!currentItem?.variantAllocations) return { locations: [], totalItems: 0, totalLocations: 0, availableLocations: 0 };
    
    const allLocations = generateBulkLocations();
    const locations: { code: string; items: number; isFull: boolean; variants: string[] }[] = [];
    let locationIndex = 0;
    let currentLocationCount = 0;
    let currentLocationVariants: string[] = [];
    let totalItems = 0;
    
    // Helper to match variant by SKU first, then variantId, then variantName
    const matchVariantPreview = (loc: any, variant: VariantAllocation) => {
      const variantSku = (variant as any).sku || variant.variantName;
      if (loc.sku && variantSku && loc.sku === variantSku) return true;
      if (loc.variantId && variant.variantId && loc.variantId === variant.variantId) return true;
      if (loc.variantName && variant.variantName && loc.variantName === variant.variantName) return true;
      return false;
    };
    
    currentItem.variantAllocations.forEach((variant) => {
      const existingForVariant = currentItem?.receiptLocations?.reduce((sum: number, loc: any) => {
        return sum + (matchVariantPreview(loc, variant) ? (loc.quantity || 0) : 0);
      }, 0) || 0;
      const pendingForVariant = currentItem?.locations.reduce((sum, loc) => {
        return sum + (matchVariantPreview(loc, variant) ? (loc.quantity || 0) : 0);
      }, 0) || 0;
      const variantRemaining = Math.max(0, variant.quantity - existingForVariant - pendingForVariant);
      
      if (variantRemaining <= 0) return;
      
      let remainingToAllocate = variantRemaining;
      totalItems += variantRemaining;
      
      while (remainingToAllocate > 0 && locationIndex < allLocations.length) {
        const spaceInLocation = bulkItemsPerLocation - currentLocationCount;
        const allocateNow = Math.min(remainingToAllocate, spaceInLocation);
        
        if (allocateNow > 0) {
          currentLocationCount += allocateNow;
          remainingToAllocate -= allocateNow;
          if (!currentLocationVariants.includes(variant.variantName || 'Unknown')) {
            currentLocationVariants.push(variant.variantName || 'Unknown');
          }
        }
        
        if (currentLocationCount >= bulkItemsPerLocation) {
          locations.push({
            code: allLocations[locationIndex],
            items: currentLocationCount,
            isFull: true,
            variants: [...currentLocationVariants]
          });
          locationIndex++;
          currentLocationCount = 0;
          currentLocationVariants = [];
        }
      }
    });
    
    if (currentLocationCount > 0 && locationIndex < allLocations.length) {
      locations.push({
        code: allLocations[locationIndex],
        items: currentLocationCount,
        isFull: false,
        variants: currentLocationVariants
      });
    }
    
    return { locations, totalItems, totalLocations: locations.length, availableLocations: allLocations.length };
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
    // Accepts 2-4 segments: WH1-A1, WH1-A1-R1, WH1-A1-R1-L1 (with optional 5th segment)
    if (!location.locationCode || !/^[A-Z0-9]+-[A-Z]\d+(-R\d+)?(-L\d+)?(-[A-Z0-9]+)?$/.test(location.locationCode)) {
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
          productId: String(currentItem.productId),
          locationCode: location.locationCode,
          locationType: location.locationType,
          quantity: assignedQty,
          isPrimary: location.isPrimary,
          variantId: location.variantId
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
      description: t('itemsStoredProgress', { completed: completedItems, total: totalItems }),
    });
    onOpenChange(false);
  };
  
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent 
        side="bottom" 
        className="h-screen p-0 flex flex-col [&>button]:hidden"
        data-testid="sheet-quick-storage"
      >
        {/* Full-screen Header with Progress */}
        <div className="px-4 pt-3 pb-2 border-b dark:border-gray-800 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              {/* Custom Close Button */}
              <button
                onClick={() => onOpenChange(false)}
                className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                data-testid="button-close-quick-storage"
              >
                <X className="h-4 w-4 text-gray-600 dark:text-gray-400" />
              </button>
              <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center">
                <Warehouse className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <SheetTitle className="text-sm font-semibold">{t('quickStorage')}</SheetTitle>
                <SheetDescription className="text-xs truncate max-w-[200px]">
                  {shipment.shipmentName || t('shipmentNumber', { number: shipment.id })}
                </SheetDescription>
              </div>
            </div>
            {/* Progress Circle */}
            <div className="flex items-center gap-2">
              <div className="relative w-12 h-12">
                <svg className="w-12 h-12 transform -rotate-90">
                  <circle cx="24" cy="24" r="20" fill="none" stroke="currentColor" strokeWidth="4" className="text-gray-200 dark:text-gray-700" />
                  <circle cx="24" cy="24" r="20" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" 
                    strokeDasharray={`${progress * 1.256} 125.6`} 
                    className="text-amber-500 dark:text-amber-400 transition-all duration-300" />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-xs font-bold">{Math.round(progress)}%</span>
              </div>
            </div>
          </div>
          {/* Items counter bar */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <CheckCircle className="h-3 w-3 text-green-500" />
            <span>{completedItems}/{totalItems} {t('itemsCompleted')}</span>
          </div>
        </div>
        
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className={`flex-1 flex flex-col overflow-hidden ${allItemsStored ? 'pb-40' : 'pb-20'}`}>
            
            {/* Item Cards with Animation */}
            {items.length > 0 && (
              <ScrollArea className="flex-1">
                <div className="p-3 space-y-2">
                  <AnimatePresence mode="wait">
                    {items.map((item, index) => {
                      const isSelected = index === selectedItemIndex;
                      // Calculate from quantities stored for THIS receiving session only (from notes tags)
                      const storedQtyForReceiving = calculateStoredQtyForReceiving(item.receiptLocations, item.receiptItemId);
                      // Sum pending additions to existing locations
                      const pendingExistingQty = Object.values(item.pendingExistingAdds || {}).reduce((sum, qty) => sum + (qty || 0), 0);
                      // Sum pending new locations
                      const pendingLocationQty = item.locations.reduce((sum, loc) => sum + (loc.quantity || 0), 0);
                      // Total pending = pending existing + pending new
                      const totalPendingQty = pendingExistingQty + pendingLocationQty;
                      const itemRemainingQty = Math.max(0, item.receivedQuantity - storedQtyForReceiving - totalPendingQty);
                      const isFullyStored = storedQtyForReceiving + totalPendingQty >= item.receivedQuantity;

                      return (
                        <motion.div
                          key={item.receiptItemId}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          transition={{ duration: 0.15 }}
                          onClick={() => setSelectedItemIndex(isSelected ? -1 : index)}
                          className={`bg-white dark:bg-gray-950 rounded-lg border overflow-hidden transition-all cursor-pointer active:scale-[0.99] ${
                            isFullyStored
                              ? 'border-green-500 dark:border-green-600'
                              : isSelected 
                                ? 'border-amber-500 dark:border-amber-500 shadow-sm' 
                                : 'border-gray-200 dark:border-gray-700'
                          }`}
                        >
                          {/* Item Header - Compact */}
                          <div className="p-3">
                            <div className="flex items-center gap-2.5">
                              {/* Product Image - Smaller */}
                              <div className="relative flex-shrink-0">
                                {item.imageUrl ? (
                                  <img 
                                    src={item.imageUrl} 
                                    alt={item.productName}
                                    className={`w-12 h-12 rounded-lg object-contain border bg-slate-50 dark:bg-slate-900 ${
                                      isFullyStored ? 'border-green-500' : 'border-gray-200 dark:border-gray-700'
                                    }`}
                                  />
                                ) : (
                                  <div className={`w-12 h-12 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center ${
                                    isFullyStored ? 'border border-green-500' : ''
                                  }`}>
                                    <Package className="h-6 w-6 text-gray-400" />
                                  </div>
                                )}
                                {isFullyStored && (
                                  <div className="absolute -top-1 -right-1 bg-green-500 rounded-full p-0.5">
                                    <Check className="h-2.5 w-2.5 text-white" />
                                  </div>
                                )}
                              </div>

                              {/* Product Info - Compact */}
                              <div className="flex-1 min-w-0">
                                <h3 className="font-semibold text-sm line-clamp-1">{item.productName}</h3>
                                <div className="flex items-center gap-2 mt-1 flex-wrap">
                                  {item.sku && (
                                    <span className="text-[10px] text-muted-foreground font-mono">
                                      {item.sku}
                                    </span>
                                  )}
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 font-medium">
                                    {t('qty')} {item.receivedQuantity}
                                  </span>
                                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                                    itemRemainingQty === 0 
                                      ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' 
                                      : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
                                  }`}>
                                    {itemRemainingQty === 0 ? '✓' : `${itemRemainingQty} left`}
                                  </span>
                                  {/* Variants/Package indicator */}
                                  {item.variantAllocations && item.variantAllocations.length > 0 && (
                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 font-medium flex items-center gap-0.5">
                                      <Layers className="h-2.5 w-2.5" />
                                      {item.variantAllocations.length}
                                    </span>
                                  )}
                                  {item.orderItems && item.orderItems.length > 0 && (
                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium flex items-center gap-0.5">
                                      <Package className="h-2.5 w-2.5" />
                                      {item.orderItems.length}
                                    </span>
                                  )}
                                </div>
                                
                                {/* Warehouse Locations - Inline compact */}
                                {(item.receiptLocations?.length > 0 || item.locations.length > 0) && (
                                  <div className="flex flex-wrap gap-1 mt-1.5">
                                    {item.receiptLocations?.slice(0, 2).map((loc, idx) => (
                                      <span key={`saved-${idx}`} className="text-[10px] font-mono px-1 py-0.5 rounded bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400">
                                        {loc.locationCode}
                                      </span>
                                    ))}
                                    {item.locations.slice(0, 2).map((loc, idx) => (
                                      <span key={`new-${idx}`} className="text-[10px] font-mono px-1 py-0.5 rounded bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-700">
                                        {loc.locationCode}
                                      </span>
                                    ))}
                                    {((item.receiptLocations?.length || 0) + item.locations.length) > 2 && (
                                      <span className="text-[10px] text-muted-foreground">
                                        +{((item.receiptLocations?.length || 0) + item.locations.length) - 2}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>

                              {/* Expand Icon */}
                              <ChevronDown className={`h-4 w-4 flex-shrink-0 transition-transform duration-200 ${
                                isFullyStored 
                                  ? 'text-green-500' 
                                  : isSelected 
                                    ? 'text-amber-500'
                                    : 'text-gray-400'
                              } ${isSelected ? 'rotate-180' : ''}`} />
                            </div>
                          </div>

                          {/* Expanded Actions - Only show for selected item */}
                          {isSelected && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.15 }}
                              className={`border-t bg-gray-50 dark:bg-gray-900 ${
                                isFullyStored 
                                  ? 'border-green-500' 
                                  : 'border-amber-400'
                              }`}
                              onClick={(e) => e.stopPropagation()}
                            >
                              {/* Mobile-optimized layout */}
                              <div className="p-3 space-y-3">
                                
                                {/* Scan feedback */}
                                {scanFeedback.type && (
                                  <ScanFeedback type={scanFeedback.type} message={scanFeedback.message} />
                                )}

                                {/* Progress bar - Compact */}
                                <div className="bg-white dark:bg-gray-950 rounded-lg p-3 border dark:border-gray-800">
                                  <div className="flex items-center justify-between mb-1.5">
                                    <span className="text-sm font-medium">{t('remaining')}</span>
                                    <span className={`text-xl font-bold ${itemRemainingQty === 0 ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'}`}>
                                      {itemRemainingQty}
                                    </span>
                                  </div>
                                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                    <div 
                                      className="bg-green-500 h-2 rounded-full transition-all"
                                      style={{ width: `${((item.receivedQuantity - itemRemainingQty) / item.receivedQuantity) * 100}%` }}
                                    />
                                  </div>
                                  <p className="text-xs text-muted-foreground mt-1.5 text-center">
                                    {storedQtyForReceiving + totalPendingQty} / {item.receivedQuantity} {t('stored')}
                                  </p>
                                </div>

                                {/* Unallocated Variants Alert - Priority display for underallocation */}
                                {item.variantAllocations && item.variantAllocations.length > 0 && (() => {
                                  // Helper to match variant by SKU first, then variantId, then variantName
                                  const matchVariant = (loc: any, variant: VariantAllocation) => {
                                    const variantSku = (variant as any).sku || variant.variantName;
                                    // Match by SKU (primary), then variantId, then variantName
                                    if (loc.sku && variantSku && loc.sku === variantSku) return true;
                                    if (loc.variantId && variant.variantId && loc.variantId === variant.variantId) return true;
                                    if (loc.variantName && variant.variantName && loc.variantName === variant.variantName) return true;
                                    return false;
                                  };
                                  
                                  // Calculate total stored vs required (use receiptLocations for this receipt's saved data)
                                  const totalRequired = item.variantAllocations.reduce((sum, v) => sum + (v.quantity || 0), 0);
                                  const totalExisting = item.receiptLocations?.reduce((sum: number, loc: any) => sum + (loc.quantity || 0), 0) || 0;
                                  const totalPending = item.locations?.reduce((sum, loc) => sum + (loc.quantity || 0), 0) || 0;
                                  const totalStored = totalExisting + totalPending;
                                  
                                  // If total stored >= total required, all variants are allocated (even if per-variant matching fails)
                                  if (totalStored >= totalRequired) return null;
                                  
                                  const unallocatedVariants = item.variantAllocations.filter(variant => {
                                    const existingQty = item.receiptLocations?.reduce((sum: number, loc: any) => {
                                      return sum + (matchVariant(loc, variant) ? (loc.quantity || 0) : 0);
                                    }, 0) || 0;
                                    const pendingQty = item.locations?.reduce((sum, loc) => {
                                      return sum + (matchVariant(loc, variant) ? (loc.quantity || 0) : 0);
                                    }, 0) || 0;
                                    return variant.quantity - existingQty - pendingQty > 0;
                                  });
                                  
                                  if (unallocatedVariants.length === 0) return null;
                                  
                                  // Show alert only if some locations already assigned (partial allocation)
                                  const hasAnyAllocations = item.locations.length > 0 || (item.receiptLocations && item.receiptLocations.length > 0);
                                  if (!hasAnyAllocations) return null;
                                  
                                  return (
                                    <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-700 rounded-lg p-3">
                                      <div className="flex items-center gap-2 mb-2">
                                        <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                                        <span className="text-sm font-semibold text-amber-700 dark:text-amber-300">
                                          {unallocatedVariants.length} {t('imports:variantsNeedLocation', 'variants still need location')}
                                        </span>
                                      </div>
                                      <div className="space-y-1 max-h-32 overflow-y-auto">
                                        {unallocatedVariants.slice(0, 5).map((variant, idx) => {
                                          const existingQty = item.receiptLocations?.reduce((sum: number, loc: any) => {
                                            return sum + (matchVariant(loc, variant) ? (loc.quantity || 0) : 0);
                                          }, 0) || 0;
                                          const pendingQty = item.locations?.reduce((sum, loc) => {
                                            return sum + (matchVariant(loc, variant) ? (loc.quantity || 0) : 0);
                                          }, 0) || 0;
                                          const remaining = variant.quantity - existingQty - pendingQty;
                                          return (
                                            <div key={idx} className="flex items-center justify-between text-sm py-1 px-2 bg-white dark:bg-gray-900 rounded border border-amber-200 dark:border-amber-800">
                                              <span className="font-medium truncate">{variant.variantName}</span>
                                              <Badge className="bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 text-xs ml-2 flex-shrink-0">
                                                {remaining} pcs
                                              </Badge>
                                            </div>
                                          );
                                        })}
                                        {unallocatedVariants.length > 5 && (
                                          <p className="text-xs text-amber-600 dark:text-amber-400 text-center">
                                            +{unallocatedVariants.length - 5} {t('common:more')}
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })()}
                                
                                {/* PRODUCT DETAILS - Collapsible section for variants and order items */}
                                {((item.variantAllocations && item.variantAllocations.length > 0) || 
                                  (item.orderItems && item.orderItems.length > 0)) && (
                                  <details open className="rounded-lg border dark:border-gray-800 overflow-hidden group">
                                    <summary className="bg-purple-50 dark:bg-purple-950/30 px-3 py-2 cursor-pointer hover:bg-purple-100 dark:hover:bg-purple-950/50 transition-colors flex items-center gap-2">
                                      <ChevronRight className="h-4 w-4 text-purple-600 dark:text-purple-400 transition-transform group-open:rotate-90" />
                                      <Layers className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                                      <span className="font-medium text-sm text-purple-700 dark:text-purple-300">
                                        {t('common:productDetails')}
                                      </span>
                                      {item.variantAllocations && item.variantAllocations.length > 0 && (
                                        <Badge variant="secondary" className="ml-auto text-[10px] bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300">
                                          {item.variantAllocations.length} {t('common:variants')}
                                        </Badge>
                                      )}
                                      {item.orderItems && item.orderItems.length > 0 && (
                                        <Badge variant="secondary" className="ml-auto text-[10px] bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300">
                                          {item.orderNumber ? `PO ${item.orderNumber.slice(-8)}` : `${item.orderItems.length} items`}
                                        </Badge>
                                      )}
                                    </summary>
                                    
                                    <div className="p-3 space-y-3 bg-white dark:bg-gray-950">
                                      {/* Variant Allocations - with remaining calculation and priority sorting */}
                                      {item.variantAllocations && item.variantAllocations.length > 0 && (() => {
                                        // Helper to match variant by SKU first, then variantId, then variantName
                                        const matchVariantForDetails = (loc: any, variant: VariantAllocation) => {
                                          const variantSku = (variant as any).sku || variant.variantName;
                                          if (loc.sku && variantSku && loc.sku === variantSku) return true;
                                          if (loc.variantId && variant.variantId && loc.variantId === variant.variantId) return true;
                                          if (loc.variantName && variant.variantName && loc.variantName === variant.variantName) return true;
                                          return false;
                                        };
                                        
                                        // Calculate total stored vs required for fallback check (use receiptLocations)
                                        const totalRequired = item.variantAllocations.reduce((sum, v) => sum + (v.quantity || 0), 0);
                                        const totalExisting = item.receiptLocations?.reduce((sum: number, loc: any) => sum + (loc.quantity || 0), 0) || 0;
                                        const totalPending = item.locations?.reduce((sum, loc) => sum + (loc.quantity || 0), 0) || 0;
                                        const totalStored = totalExisting + totalPending;
                                        const isFullyAllocatedByTotal = totalStored >= totalRequired;
                                        
                                        // Calculate remaining for each variant
                                        const variantsWithRemaining = item.variantAllocations.map(variant => {
                                          // If fully allocated by total, set remaining to 0 for all
                                          if (isFullyAllocatedByTotal) {
                                            return { ...variant, remaining: 0, existingQty: variant.quantity, pendingQty: 0 };
                                          }
                                          
                                          const existingQty = item.receiptLocations?.reduce((sum: number, loc: any) => {
                                            return sum + (matchVariantForDetails(loc, variant) ? (loc.quantity || 0) : 0);
                                          }, 0) || 0;
                                          const pendingQty = item.locations?.reduce((sum, loc) => {
                                            return sum + (matchVariantForDetails(loc, variant) ? (loc.quantity || 0) : 0);
                                          }, 0) || 0;
                                          const remaining = Math.max(0, variant.quantity - existingQty - pendingQty);
                                          return { ...variant, remaining, existingQty, pendingQty };
                                        });
                                        
                                        // Sort: unallocated first (with remaining > 0)
                                        const sortedVariants = [...variantsWithRemaining].sort((a, b) => {
                                          if (a.remaining > 0 && b.remaining === 0) return -1;
                                          if (a.remaining === 0 && b.remaining > 0) return 1;
                                          return 0;
                                        });
                                        
                                        const unallocatedCount = sortedVariants.filter(v => v.remaining > 0).length;
                                        
                                        return (
                                          <div className="space-y-2">
                                            <div className="flex items-center gap-2 text-xs font-medium text-purple-600 dark:text-purple-400">
                                              <Tag className="h-3 w-3" />
                                              <span>{t('common:variants')} ({item.variantAllocations.length})</span>
                                              {unallocatedCount > 0 && (
                                                <Badge className="ml-auto bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 text-[10px]">
                                                  {unallocatedCount} {t('imports:needsAllocation', 'need allocation')}
                                                </Badge>
                                              )}
                                            </div>
                                            <div className="space-y-1.5">
                                              {sortedVariants.map((variant, vIdx) => (
                                                <div 
                                                  key={vIdx}
                                                  className={`flex items-center justify-between py-1.5 px-2 rounded-lg border ${
                                                    variant.remaining > 0 
                                                      ? 'bg-amber-50 dark:bg-amber-950/20 border-amber-300 dark:border-amber-700' 
                                                      : 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800'
                                                  }`}
                                                >
                                                  <div className="flex items-center gap-2 min-w-0">
                                                    {variant.remaining > 0 ? (
                                                      <AlertCircle className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
                                                    ) : (
                                                      <CheckCircle className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
                                                    )}
                                                    <span className="text-sm font-medium truncate">{variant.variantName}</span>
                                                  </div>
                                                  <div className="flex items-center gap-1.5 flex-shrink-0">
                                                    {variant.remaining > 0 ? (
                                                      <>
                                                        <Badge className="bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 text-xs">
                                                          {variant.remaining} left
                                                        </Badge>
                                                        <span className="text-[10px] text-muted-foreground">/{variant.quantity}</span>
                                                      </>
                                                    ) : (
                                                      <Badge className="bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 text-xs">
                                                        ✓ {variant.quantity}
                                                      </Badge>
                                                    )}
                                                  </div>
                                                </div>
                                              ))}
                                            </div>
                                          </div>
                                        );
                                      })()}
                                      
                                      {/* Order Items from Unpacked PO */}
                                      {item.orderItems && item.orderItems.length > 0 && (
                                        <div className="space-y-2">
                                          <div className="flex items-center gap-2 text-xs font-medium text-blue-600 dark:text-blue-400">
                                            <Package className="h-3 w-3" />
                                            <span>{t('imports:packageContents')} ({item.orderItems.length})</span>
                                            {item.orderNumber && (
                                              <Badge variant="outline" className="text-[10px] ml-auto">
                                                {item.orderNumber}
                                              </Badge>
                                            )}
                                          </div>
                                          <div className="space-y-1.5 max-h-48 overflow-y-auto">
                                            {item.orderItems.map((orderItem, oIdx) => (
                                              <div 
                                                key={oIdx}
                                                className="flex items-center gap-2 py-1.5 px-2 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800"
                                              >
                                                {orderItem.imageUrl ? (
                                                  <img 
                                                    src={orderItem.imageUrl} 
                                                    alt={orderItem.name}
                                                    className="w-8 h-8 rounded object-contain bg-white dark:bg-gray-900 flex-shrink-0"
                                                  />
                                                ) : (
                                                  <div className="w-8 h-8 rounded bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                                                    <Package className="h-4 w-4 text-blue-400" />
                                                  </div>
                                                )}
                                                <div className="flex-1 min-w-0">
                                                  <p className="text-sm font-medium truncate">{orderItem.name}</p>
                                                  {orderItem.sku && (
                                                    <p className="text-[10px] text-muted-foreground font-mono">{orderItem.sku}</p>
                                                  )}
                                                </div>
                                                <Badge className="bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-xs flex-shrink-0">
                                                  x{orderItem.quantity}
                                                </Badge>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </details>
                                )}

                                {/* ADD LOCATION - Simplified for mobile */}
                                {itemRemainingQty > 0 && (
                                  <div className="bg-blue-50 dark:bg-blue-950/30 rounded-xl p-3 border border-blue-200 dark:border-blue-800">
                                    {/* Autofill from Existing Locations - for products that already have variant locations */}
                                    {item.variantAllocations && item.variantAllocations.length > 0 && item.productId && (
                                      <Button
                                        variant="outline"
                                        onClick={async (e) => {
                                          e.stopPropagation();
                                          if (!item.productId) return;
                                          
                                          try {
                                            // Fetch all existing locations for this product
                                            const locResponse = await fetch(`/api/products/${item.productId}/locations`, { credentials: 'include' });
                                            if (!locResponse.ok) throw new Error('Failed to fetch locations');
                                            const allProductLocations = await locResponse.json();
                                            
                                            // Fetch variants to build SKU/name → location mapping
                                            const variantResponse = await fetch(`/api/products/${item.productId}/variants`, { credentials: 'include' });
                                            if (!variantResponse.ok) throw new Error('Failed to fetch variants');
                                            const productVariants = await variantResponse.json();
                                            
                                            // Build variantId → locationCode mapping (prefer primary locations)
                                            const variantLocationMap = new Map<string, { locationCode: string; locationType: string; variantId: string; variantName: string; sku: string }>();
                                            const skuToVariantId = new Map<string, string>();
                                            const nameToVariantId = new Map<string, string>();
                                            
                                            for (const v of productVariants) {
                                              if (v.sku) skuToVariantId.set(v.sku.toLowerCase(), v.id);
                                              if (v.name) nameToVariantId.set(v.name.toLowerCase(), v.id);
                                            }
                                            
                                            // For each location, map to its variant
                                            for (const loc of allProductLocations) {
                                              if (loc.variantId) {
                                                const variant = productVariants.find((v: any) => v.id === loc.variantId);
                                                if (variant) {
                                                  // Only add if not already mapped or this is primary
                                                  const existing = variantLocationMap.get(loc.variantId);
                                                  if (!existing || loc.isPrimary) {
                                                    variantLocationMap.set(loc.variantId, {
                                                      locationCode: loc.locationCode,
                                                      locationType: loc.locationType || 'bin',
                                                      variantId: loc.variantId,
                                                      variantName: variant.name || '',
                                                      sku: variant.sku || ''
                                                    });
                                                  }
                                                }
                                              }
                                            }
                                            
                                            if (variantLocationMap.size === 0) {
                                              toast({
                                                title: t('imports:noVariantLocationsFound', 'No Existing Locations'),
                                                description: t('imports:noVariantLocationsDesc', 'No variant-specific locations found. Use Bulk Allocate instead.'),
                                                variant: 'destructive'
                                              });
                                              return;
                                            }
                                            
                                            // Match variant allocations to their locations
                                            const newLocations: LocationAssignment[] = [];
                                            let matchedCount = 0;
                                            let unmatchedCount = 0;
                                            
                                            for (const va of item.variantAllocations) {
                                              const vaSku = ((va as any).sku || va.variantName || '').toLowerCase();
                                              const vaName = (va.variantName || '').toLowerCase();
                                              
                                              // Find matching variantId by SKU or name
                                              let variantId = skuToVariantId.get(vaSku) || nameToVariantId.get(vaName);
                                              
                                              if (variantId && variantLocationMap.has(variantId)) {
                                                const locInfo = variantLocationMap.get(variantId)!;
                                                newLocations.push({
                                                  id: `autofill-${Date.now()}-${matchedCount}`,
                                                  locationCode: locInfo.locationCode,
                                                  locationType: locInfo.locationType,
                                                  quantity: va.quantity || 0,
                                                  isPrimary: false,
                                                  variantId: variantId,
                                                  variantName: va.variantName || locInfo.variantName,
                                                  sku: (va as any).sku || locInfo.sku
                                                });
                                                matchedCount++;
                                              } else {
                                                unmatchedCount++;
                                              }
                                            }
                                            
                                            if (newLocations.length === 0) {
                                              toast({
                                                title: t('imports:noMatchingLocations', 'No Matches Found'),
                                                description: t('imports:variantsNotMatchedDesc', 'Could not match variants to existing locations'),
                                                variant: 'destructive'
                                              });
                                              return;
                                            }
                                            
                                            // Update state - APPEND to existing draft locations, don't replace
                                            setItems(prevItems => {
                                              const updated = [...prevItems];
                                              // Merge with existing draft locations, avoiding duplicates by locationCode+variantId
                                              const existingDrafts = updated[index].locations || [];
                                              const existingKeys = new Set(existingDrafts.map(l => `${l.locationCode}:${l.variantId || ''}`));
                                              const newNonDuplicates = newLocations.filter(l => 
                                                !existingKeys.has(`${l.locationCode}:${l.variantId || ''}`)
                                              );
                                              updated[index].locations = [...existingDrafts, ...newNonDuplicates];
                                              return updated;
                                            });
                                            
                                            toast({
                                              title: t('imports:autofillComplete', 'Autofill Complete'),
                                              description: `${matchedCount} ${t('imports:variantsMatched', 'variants matched')}${unmatchedCount > 0 ? `, ${unmatchedCount} ${t('imports:unmatched', 'unmatched')}` : ''}`,
                                              duration: 3000
                                            });
                                          } catch (error) {
                                            console.error('Autofill error:', error);
                                            toast({
                                              title: t('common:error'),
                                              description: t('imports:autofillFailed', 'Failed to autofill locations'),
                                              variant: 'destructive'
                                            });
                                          }
                                        }}
                                        className="w-full mb-2 h-10 bg-gradient-to-r from-green-500 to-teal-500 hover:from-green-600 hover:to-teal-600 text-white border-0 font-medium"
                                        data-testid="button-autofill-locations"
                                      >
                                        <Zap className="h-4 w-4 mr-2" />
                                        {t('imports:autofillFromExisting', 'Autofill from Existing')} ({item.variantAllocations.length} variants)
                                      </Button>
                                    )}
                                    
                                    {/* Bulk Allocate Button for multi-variant items */}
                                    {item.variantAllocations && item.variantAllocations.length > 1 && (
                                      <Button
                                        variant="outline"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setShowBulkAllocation(true);
                                        }}
                                        className="w-full mb-2 h-10 bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white border-0 font-medium"
                                        data-testid="button-bulk-allocate"
                                      >
                                        <Layers className="h-4 w-4 mr-2" />
                                        {t('imports:bulkAllocate', 'Bulk Allocate to Racks')} ({item.variantAllocations.length} variants)
                                      </Button>
                                    )}
                                    
                                    <div className="flex gap-2 mb-1">
                                      <Input
                                        ref={locationInputRef}
                                        value={locationInput}
                                        onChange={(e) => setLocationInput(formatLocationCode(e.target.value))}
                                        onKeyDown={(e) => {
                                          e.stopPropagation();
                                          if (e.key === 'Enter') {
                                            e.preventDefault();
                                            handleLocationScan();
                                          }
                                        }}
                                        onClick={(e) => e.stopPropagation()}
                                        placeholder="WH1-A1-R1-L1"
                                        className="flex-1 h-12 text-base font-mono font-bold text-center border-2 rounded-lg bg-white dark:bg-gray-950"
                                        data-testid="input-location-manual"
                                      />
                                      <Button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleLocationScan();
                                        }}
                                        disabled={!locationInput}
                                        className="h-12 w-12 rounded-lg p-0"
                                        size="lg"
                                      >
                                        <Plus className="h-5 w-5" />
                                      </Button>
                                      {/* Camera Scanner Button */}
                                      {barcodeScanner.scanningEnabled && (
                                        <Button
                                          variant={barcodeScanner.isActive ? "destructive" : "outline"}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            if (barcodeScanner.isActive) {
                                              barcodeScanner.stopScanning();
                                            } else {
                                              barcodeScanner.startScanning();
                                            }
                                          }}
                                          className="h-12 w-12 rounded-lg p-0"
                                        >
                                          {barcodeScanner.isActive ? <CameraOff className="h-5 w-5" /> : <Camera className="h-5 w-5" />}
                                        </Button>
                                      )}
                                    </div>
                                    
                                    {/* Location Format Guide */}
                                    {locationInput && (
                                      <div className="mb-2 text-center">
                                        {(() => {
                                          const { hint, displayInput } = getLocationHint(locationInput);
                                          return (
                                            <span className="text-xs text-muted-foreground font-mono">
                                              <span className="text-foreground">{displayInput}</span>
                                              <span className="text-blue-500 dark:text-blue-400 animate-pulse">{hint}</span>
                                              <span className="ml-2 text-[10px] text-muted-foreground/60">
                                                (WH→A→R→L)
                                              </span>
                                            </span>
                                          );
                                        })()}
                                      </div>
                                    )}
                                    
                                    {/* Camera Preview - Compact */}
                                    {barcodeScanner.scanningEnabled && barcodeScanner.isActive && (
                                      <div className="relative rounded-lg overflow-hidden bg-black">
                                        <video
                                          ref={barcodeScanner.videoRef}
                                          className="w-full h-32 object-cover"
                                          playsInline
                                          muted
                                        />
                                        <Badge className="absolute top-1 right-1 bg-green-500 text-white text-xs px-1.5 py-0.5">
                                          <Camera className="h-2.5 w-2.5 mr-0.5" />
                                          {t('scanning')}
                                        </Badge>
                                      </div>
                                    )}
                                  </div>
                                )}

                                {/* THIS RECEIPT - Allocations for this receiving session */}
                                <div className="rounded-lg border dark:border-gray-800 overflow-hidden">
                                  <div className="bg-green-100 dark:bg-green-900/30 px-3 py-2 border-b dark:border-gray-700 flex items-center justify-between">
                                    <p className="font-medium text-sm flex items-center gap-1.5">
                                      <MapPin className="h-4 w-4 text-green-600 dark:text-green-400" />
                                      {t('imports:thisReceipt', 'This Receipt')} ({(item.receiptLocations?.length || 0) + item.locations.length})
                                    </p>
                                    {/* Undo All - clears receiptLocations + pending locations (ONLY for this receipt, preserves existing inventory) */}
                                    {(item.receiptLocations && item.receiptLocations.length > 0) || item.locations.length > 0 ? (
                                      <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            disabled={isUndoingAll}
                                            className="h-7 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                                            data-testid="button-undo-all-locations"
                                          >
                                            {isUndoingAll ? (
                                              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                            ) : (
                                              <RotateCcw className="h-3 w-3 mr-1" />
                                            )}
                                            {isUndoingAll ? t('common:loading') : t('imports:undoAll', 'Undo All')}
                                          </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                          <AlertDialogHeader>
                                            <AlertDialogTitle>{t('imports:undoAllLocations', 'Undo All Locations?')}</AlertDialogTitle>
                                            <AlertDialogDescription>
                                              {t('imports:undoAllDescription', 'This will undo all locations added during THIS receiving session. Pre-existing inventory will be restored to its original state.')}
                                            </AlertDialogDescription>
                                          </AlertDialogHeader>
                                          <AlertDialogFooter>
                                            <AlertDialogCancel>{t('common:cancel')}</AlertDialogCancel>
                                            <AlertDialogAction
                                              onClick={async () => {
                                                if (!item.productId || isUndoingAll) return;
                                                
                                                setIsUndoingAll(true);
                                                const totalLocations = (item.receiptLocations?.length || 0) + item.locations.length;
                                                const totalQty = (item.receiptLocations?.reduce((sum: number, loc: any) => sum + (loc.quantity || 0), 0) || 0) +
                                                  item.locations.reduce((sum, loc) => sum + (loc.quantity || 0), 0);
                                                
                                                try {
                                                  // Use batch delete endpoint for saved receiptLocations
                                                  // SAFETY: Backend only processes locations tagged with RI:{receiptItemId}:
                                                  if (item.receiptLocations && item.receiptLocations.length > 0) {
                                                    await apiRequest('DELETE', `/api/products/${item.productId}/locations/batch`, {
                                                      receiptItemId: item.receiptItemId
                                                    });
                                                  }
                                                  
                                                  // Update local state - clear both receiptLocations and pending locations
                                                  setItems(prevItems => {
                                                    const updated = [...prevItems];
                                                    updated[index].receiptLocations = [];
                                                    updated[index].locations = [];
                                                    updated[index].pendingExistingAdds = {};
                                                    updated[index].assignedQuantity = 0;
                                                    return updated;
                                                  });
                                                  
                                                  toast({
                                                    title: t('imports:locationsCleared', 'Locations Cleared'),
                                                    description: `${totalLocations} ${t('locationsLabel', 'locations')}, ${totalQty} ${t('common:items')} ${t('imports:removed', 'removed')}`,
                                                    duration: 3000
                                                  });
                                                  
                                                  queryClient.invalidateQueries({ queryKey: [`/api/products/${item.productId}/locations`] });
                                                } catch (error) {
                                                  console.error('Failed to undo locations:', error);
                                                  toast({
                                                    title: t('common:error'),
                                                    description: t('imports:failedToUndoLocations', 'Failed to undo locations'),
                                                    variant: 'destructive'
                                                  });
                                                } finally {
                                                  setIsUndoingAll(false);
                                                }
                                              }}
                                              className="bg-red-600 hover:bg-red-700"
                                            >
                                              {t('imports:undoAll', 'Undo All')}
                                            </AlertDialogAction>
                                          </AlertDialogFooter>
                                        </AlertDialogContent>
                                      </AlertDialog>
                                    ) : null}
                                  </div>
                                  
                                  <div className="divide-y dark:divide-gray-800 max-h-48 overflow-y-auto">
                                    {/* Fill All Receipt Locations Button */}
                                    {item.receiptLocations && item.receiptLocations.length > 0 && itemRemainingQty > 0 && (
                                      <div className="p-2 bg-blue-50 dark:bg-blue-950/30 border-b dark:border-gray-800">
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          className="w-full h-9 bg-blue-100 dark:bg-blue-900/40 hover:bg-blue-200 dark:hover:bg-blue-900/60 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 font-medium"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            // Distribute remaining quantity evenly across receipt locations
                                            const locCount = item.receiptLocations.length;
                                            const perLoc = Math.floor(itemRemainingQty / locCount);
                                            const remainder = itemRemainingQty % locCount;
                                            
                                            setItems(prevItems => {
                                              const updated = [...prevItems];
                                              const newPendingAdds: Record<string, number> = {};
                                              item.receiptLocations.forEach((loc: any, idx: number) => {
                                                const locId = String(loc.id || idx);
                                                newPendingAdds[locId] = perLoc + (idx === 0 ? remainder : 0);
                                              });
                                              updated[index].pendingExistingAdds = newPendingAdds;
                                              return updated;
                                            });
                                            
                                            toast({
                                              title: t('imports:quantityDistributed', 'Quantity Distributed'),
                                              description: `${itemRemainingQty} ${t('common:items')} → ${locCount} ${t('locationsLabel', 'locations')}`,
                                              duration: 2000
                                            });
                                          }}
                                          data-testid="button-fill-all-existing"
                                        >
                                          <Layers className="h-4 w-4 mr-2" />
                                          {t('imports:fillAllLocations', 'Fill All')} (+{itemRemainingQty})
                                        </Button>
                                      </div>
                                    )}
                                    
                                    {/* SAVED RECEIPT LOCATIONS - Compact rows with editable "Add more" input */}
                                    {item.receiptLocations?.map((loc: any, locIdx: number) => {
                                      const locId = String(loc.id || locIdx);
                                      const pendingAdd = item.pendingExistingAdds?.[locId] || 0;
                                      
                                      // Extract receiving-specific quantity from notes tag
                                      const receivingQty = getReceivingQtyFromNotes(loc.notes, item.receiptItemId) || loc.quantity || 0;
                                      
                                      return (
                                        <div 
                                          key={`saved-${locId}`}
                                          className="p-2.5 bg-green-50 dark:bg-green-950/20"
                                        >
                                          <div className="flex items-center gap-2 flex-wrap">
                                            <div className="flex items-center gap-1.5 min-w-0">
                                              <Check className="h-4 w-4 text-green-600 dark:text-green-400 flex-shrink-0" />
                                              <span className="font-mono text-xs font-medium break-all">{loc.locationCode}</span>
                                            </div>
                                            {loc.variantName && (
                                              <Badge variant="secondary" className="text-[10px] bg-purple-100 dark:bg-purple-800/50 text-purple-700 dark:text-purple-200 flex-shrink-0">
                                                {loc.variantName}
                                              </Badge>
                                            )}
                                            <div className="flex-1" />
                                            
                                            {/* Show current stored quantity */}
                                            <div className="w-14 h-9 flex items-center justify-center bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 rounded-lg font-bold text-sm">
                                              {receivingQty}
                                            </div>
                                            
                                            {/* Add more input - only show if remaining qty > 0 */}
                                            {itemRemainingQty > 0 && (
                                              <div className="flex items-center gap-1">
                                                <span className="text-xs text-muted-foreground">+</span>
                                                <Input
                                                  type="number"
                                                  value={pendingAdd || ''}
                                                  onChange={(e) => {
                                                    e.stopPropagation();
                                                    const newQty = parseInt(e.target.value) || 0;
                                                    setItems(prevItems => {
                                                      const updated = [...prevItems];
                                                      const currentItem = updated[index];
                                                      // Calculate max allowed for this specific location
                                                      const otherPendingAdds = Object.entries(currentItem.pendingExistingAdds || {})
                                                        .filter(([k]) => k !== locId)
                                                        .reduce((sum, [, qty]) => sum + (qty || 0), 0);
                                                      const pendingNewLocs = currentItem.locations.reduce((sum, l) => sum + (l.quantity || 0), 0);
                                                      const storedQty = calculateStoredQtyForReceiving(currentItem.receiptLocations, currentItem.receiptItemId);
                                                      const availableForThisLoc = currentItem.receivedQuantity - storedQty - otherPendingAdds - pendingNewLocs;
                                                      
                                                      updated[index].pendingExistingAdds = {
                                                        ...currentItem.pendingExistingAdds,
                                                        [locId]: Math.min(Math.max(0, newQty), availableForThisLoc)
                                                      };
                                                      return updated;
                                                    });
                                                  }}
                                                  onClick={(e) => e.stopPropagation()}
                                                  className="w-16 h-9 text-center text-sm font-bold rounded-lg border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/30"
                                                  min="0"
                                                  placeholder="0"
                                                  data-testid={`input-add-existing-${locIdx}`}
                                                />
                                              </div>
                                            )}
                                            
                                            <DropdownMenu>
                                              <DropdownMenuTrigger asChild>
                                                <Button
                                                  variant="ghost"
                                                  size="sm"
                                                  onClick={(e) => e.stopPropagation()}
                                                  className="h-8 w-8 p-0 text-muted-foreground hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
                                                >
                                                  <MoreVertical className="h-4 w-4" />
                                                </Button>
                                              </DropdownMenuTrigger>
                                              <DropdownMenuContent align="end" className="w-40">
                                                {/* Fill this location option */}
                                                {itemRemainingQty > 0 && (
                                                  <DropdownMenuItem
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      setItems(prevItems => {
                                                        const updated = [...prevItems];
                                                        const currentItem = updated[index];
                                                        const otherPendingAdds = Object.entries(currentItem.pendingExistingAdds || {})
                                                          .filter(([k]) => k !== locId)
                                                          .reduce((sum, [, qty]) => sum + (qty || 0), 0);
                                                        const pendingNewLocs = currentItem.locations.reduce((sum, l) => sum + (l.quantity || 0), 0);
                                                        const storedQty = calculateStoredQtyForReceiving(currentItem.receiptLocations, currentItem.receiptItemId);
                                                        const availableQty = currentItem.receivedQuantity - storedQty - otherPendingAdds - pendingNewLocs;
                                                        
                                                        updated[index].pendingExistingAdds = {
                                                          ...currentItem.pendingExistingAdds,
                                                          [locId]: availableQty
                                                        };
                                                        return updated;
                                                      });
                                                    }}
                                                  >
                                                    <Plus className="h-4 w-4 mr-2" />
                                                    {t('imports:fillHere', 'Fill Here')} (+{itemRemainingQty})
                                                  </DropdownMenuItem>
                                                )}
                                                <DropdownMenuItem
                                                  onClick={async (e) => {
                                                    e.stopPropagation();
                                                    if (!item.productId || !loc.id) return;
                                                    
                                                    try {
                                                      await deleteLocationMutation.mutateAsync({
                                                        productId: String(item.productId),
                                                        locationId: String(loc.id),
                                                        receiptItemId: String(item.receiptItemId)
                                                      });
                                                      
                                                      setItems(prevItems => {
                                                        const updated = [...prevItems];
                                                        // Use receiving-specific quantity from notes tag
                                                        const deletedQty = receivingQty;
                                                        updated[index].receiptLocations = updated[index].receiptLocations.filter(
                                                          (_: any, i: number) => i !== locIdx
                                                        );
                                                        updated[index].assignedQuantity -= deletedQty;
                                                        delete updated[index].pendingExistingAdds[locId];
                                                        return updated;
                                                      });
                                                    } catch (error) {
                                                      console.error('Failed to delete location:', error);
                                                    }
                                                  }}
                                                  disabled={deleteLocationMutation.isPending}
                                                  className="text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950/30"
                                                >
                                                  <Trash2 className="h-4 w-4 mr-2" />
                                                  {t('common:delete')}
                                                </DropdownMenuItem>
                                              </DropdownMenuContent>
                                            </DropdownMenu>
                                          </div>
                                        </div>
                                      );
                                    })}
                                    
                                    {/* PENDING LOCATIONS - Compact rows */}
                                    {item.locations.map((loc, locIndex) => (
                                      <div 
                                        key={loc.id}
                                        className="p-2.5 bg-amber-50 dark:bg-amber-950/20"
                                      >
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <div className="flex items-center gap-1.5 min-w-0">
                                            <MapPin className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                                            <span className="font-mono text-xs font-medium break-all">{loc.locationCode}</span>
                                          </div>
                                          {loc.variantName && (
                                            <Badge variant="secondary" className="text-[10px] bg-purple-100 dark:bg-purple-800/50 text-purple-700 dark:text-purple-200 flex-shrink-0">
                                              {loc.variantName}
                                            </Badge>
                                          )}
                                          <div className="flex-1" />
                                          <Input
                                            type="number"
                                            value={loc.quantity || ''}
                                            onChange={(e) => {
                                              e.stopPropagation();
                                              const newQty = parseInt(e.target.value) || 0;
                                              setItems(prevItems => {
                                                const updated = [...prevItems];
                                                const currentItem = updated[index];
                                                // Use receiving-specific quantity from notes tags
                                                const freshStoredQty = calculateStoredQtyForReceiving(currentItem.receiptLocations, currentItem.receiptItemId);
                                                const freshPendingExisting = Object.values(currentItem.pendingExistingAdds || {}).reduce((sum, qty) => sum + (qty || 0), 0);
                                                const freshPendingNew = currentItem.locations
                                                  .reduce((sum, l, i) => sum + (i === locIndex ? 0 : (l.quantity || 0)), 0);
                                                const freshRemaining = currentItem.receivedQuantity - freshStoredQty - freshPendingExisting - freshPendingNew;
                                                const maxAllowed = Math.max(0, freshRemaining);
                                                updated[index].locations[locIndex].quantity = Math.min(newQty, maxAllowed);
                                                return updated;
                                              });
                                            }}
                                            onClick={(e) => e.stopPropagation()}
                                            className="w-20 h-9 text-center text-base font-bold rounded-lg"
                                            min="0"
                                            placeholder="0"
                                            data-testid={`input-qty-${locIndex}`}
                                          />
                                          <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                              <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={(e) => e.stopPropagation()}
                                                className="h-8 w-8 p-0 text-muted-foreground hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
                                              >
                                                <MoreVertical className="h-4 w-4" />
                                              </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="w-40">
                                              <DropdownMenuItem
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  handleRemoveLocation(locIndex);
                                                }}
                                                className="text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950/30"
                                              >
                                                <X className="h-4 w-4 mr-2" />
                                                {t('common:remove')}
                                              </DropdownMenuItem>
                                            </DropdownMenuContent>
                                          </DropdownMenu>
                                        </div>
                                      </div>
                                    ))}
                                    
                                    {/* Empty state - Compact */}
                                    {(!item.receiptLocations || item.receiptLocations.length === 0) && item.locations.length === 0 && (
                                      <div className="p-4 text-center text-muted-foreground text-sm">
                                        <MapPin className="h-6 w-6 mx-auto mb-1 opacity-30" />
                                        <p>{t('noLocationsYet')}</p>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* CURRENT INVENTORY (REFERENCE) - Read-only display of existing warehouse inventory */}
                                {item.referenceInventory && item.referenceInventory.length > 0 && (
                                  <div className="rounded-lg border dark:border-gray-800 overflow-hidden">
                                    <div className="bg-blue-50 dark:bg-blue-900/30 px-3 py-2 border-b dark:border-gray-700 flex items-center gap-2">
                                      <MapPin className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                      <p className="font-medium text-sm text-blue-700 dark:text-blue-300">
                                        {t('imports:currentInventory', 'Current Inventory')}
                                      </p>
                                      <Badge variant="outline" className="text-[10px] border-blue-300 dark:border-blue-700 text-blue-600 dark:text-blue-400">
                                        {t('imports:reference', 'Reference')}
                                      </Badge>
                                      <span className="text-xs text-muted-foreground ml-auto">
                                        ({item.referenceInventory.length})
                                      </span>
                                    </div>
                                    
                                    <div className="divide-y dark:divide-gray-800 max-h-32 overflow-y-auto bg-blue-50/50 dark:bg-blue-950/10">
                                      {item.referenceInventory.map((loc: any, locIdx: number) => (
                                        <div 
                                          key={`ref-${locIdx}`}
                                          className="p-2 flex items-center gap-2 cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            // Calculate remaining quantity for this item
                                            const storedQty = calculateStoredQtyForReceiving(item.receiptLocations, item.receiptItemId);
                                            const pendingExistingQty = Object.values(item.pendingExistingAdds || {}).reduce((sum, qty) => sum + (qty || 0), 0);
                                            const pendingNewQty = item.locations.reduce((sum, l) => sum + (l.quantity || 0), 0);
                                            const remaining = Math.max(0, item.receivedQuantity - storedQty - pendingExistingQty - pendingNewQty);
                                            
                                            if (remaining <= 0) {
                                              toast({
                                                title: t('allQuantityAssigned', 'All Assigned'),
                                                description: t('noRemainingQuantity', 'No remaining quantity to assign'),
                                                duration: 2000
                                              });
                                              return;
                                            }
                                            
                                            // Add this location with all remaining quantity
                                            setItems(prevItems => {
                                              const updated = [...prevItems];
                                              const currentItem = updated[index];
                                              
                                              // Check if location already exists in pending locations
                                              const existingLocIdx = currentItem.locations.findIndex(
                                                l => l.locationCode === loc.locationCode && 
                                                     (l.variantId === loc.variantId || l.variantName === loc.variantName)
                                              );
                                              
                                              if (existingLocIdx >= 0) {
                                                // Add remaining to existing pending location
                                                currentItem.locations[existingLocIdx].quantity += remaining;
                                              } else {
                                                // Add new pending location with all remaining quantity
                                                currentItem.locations.push({
                                                  locationCode: loc.locationCode,
                                                  locationType: loc.locationType || 'warehouse',
                                                  quantity: remaining,
                                                  isPrimary: loc.isPrimary || false,
                                                  variantId: loc.variantId,
                                                  variantName: loc.variantName,
                                                  sku: loc.sku
                                                });
                                              }
                                              
                                              return updated;
                                            });
                                            
                                            toast({
                                              title: loc.locationCode,
                                              description: `+${remaining} ${t('common:items')}`,
                                              duration: 1500
                                            });
                                          }}
                                          data-testid={`ref-location-${locIdx}`}
                                        >
                                          <MapPin className="h-3.5 w-3.5 text-blue-500 dark:text-blue-400 flex-shrink-0" />
                                          <span className="font-mono text-xs text-blue-700 dark:text-blue-300">{loc.locationCode}</span>
                                          {loc.variantName && (
                                            <Badge variant="secondary" className="text-[10px] bg-purple-100 dark:bg-purple-800/50 text-purple-700 dark:text-purple-200 flex-shrink-0">
                                              {loc.variantName}
                                            </Badge>
                                          )}
                                          <div className="flex-1" />
                                          <Plus className="h-3 w-3 text-blue-400 dark:text-blue-500" />
                                          <Badge variant="secondary" className="text-[10px] bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300">
                                            {loc.quantity}
                                          </Badge>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* ACTION BUTTONS - Show when there are pending quantities to save */}
                                {(() => {
                                  const hasPendingNew = item.locations.some(loc => (loc.quantity || 0) > 0);
                                  const hasPendingExisting = Object.values(item.pendingExistingAdds || {}).some(qty => (qty || 0) > 0);
                                  const showButtons = hasPendingNew || hasPendingExisting || item.locations.length > 0;
                                  
                                  if (!showButtons) return null;
                                  
                                  return (
                                    <div className="flex gap-2">
                                      {itemRemainingQty > 0 && item.locations.length > 0 && (
                                        <Button
                                          variant="outline"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setItems(prevItems => {
                                              const updated = [...prevItems];
                                              const currentItem = updated[index];
                                              const lastIndex = currentItem.locations.length - 1;
                                              const freshStoredQty = calculateStoredQtyForReceiving(currentItem.receiptLocations, currentItem.receiptItemId);
                                              const freshPendingExisting = Object.values(currentItem.pendingExistingAdds || {}).reduce((sum, qty) => sum + (qty || 0), 0);
                                              const freshPendingNew = currentItem.locations
                                                .reduce((sum, l, i) => sum + (i === lastIndex ? 0 : (l.quantity || 0)), 0);
                                              const freshRemaining = Math.max(0, currentItem.receivedQuantity - freshStoredQty - freshPendingExisting - freshPendingNew);
                                              updated[index].locations[lastIndex].quantity = freshRemaining;
                                              return updated;
                                            });
                                          }}
                                          className="flex-1 h-10 rounded-lg text-sm"
                                        >
                                          <Plus className="h-4 w-4 mr-1" />
                                          {t('fillAll')} ({itemRemainingQty})
                                        </Button>
                                      )}
                                      
                                      {(hasPendingNew || hasPendingExisting) && (
                                        <Button
                                          className="flex-1 h-10 bg-green-600 hover:bg-green-700 rounded-lg text-sm"
                                          disabled={isBatchSaving}
                                          onClick={async (e) => {
                                            e.stopPropagation();
                                            
                                            if (!item.productId || isBatchSaving) return;
                                            
                                            setIsBatchSaving(true);
                                            
                                            // Collect ALL locations to save in one batch
                                            const allLocationsToSave: Array<{
                                              locationCode: string;
                                              locationType: string;
                                              quantity: number;
                                              isPrimary: boolean;
                                              variantId?: string;
                                              sku?: string;
                                              variantName?: string;
                                            }> = [];
                                            
                                            // Add pending new locations
                                            const locationsToSave = item.locations.filter(loc => (loc.quantity || 0) > 0);
                                            for (const loc of locationsToSave) {
                                              if (loc.quantity > 0) {
                                                // Include SKU and variantName for variant matching
                                                // SKU is the primary identifier; variantId as secondary
                                                allLocationsToSave.push({
                                                  locationCode: loc.locationCode,
                                                  locationType: loc.locationType,
                                                  quantity: loc.quantity,
                                                  isPrimary: loc.isPrimary,
                                                  variantId: loc.variantId || undefined,
                                                  sku: loc.sku || loc.variantName || undefined,
                                                  variantName: loc.variantName || undefined
                                                });
                                              }
                                            }
                                            
                                            // Add pending additions to existing locations (as updates)
                                            const pendingAdds = Object.entries(item.pendingExistingAdds || {});
                                            for (const [locId, addQty] of pendingAdds) {
                                              if (addQty > 0) {
                                                const existingLoc = item.receiptLocations.find((l: any) => String(l.id) === locId);
                                                if (existingLoc) {
                                                  // For existing locations, we add to the batch with just the delta qty
                                                  // The batch endpoint will add to existing
                                                  // Include SKU and variantName for proper variant matching
                                                  allLocationsToSave.push({
                                                    locationCode: existingLoc.locationCode,
                                                    locationType: existingLoc.locationType,
                                                    quantity: addQty,
                                                    isPrimary: existingLoc.isPrimary,
                                                    variantId: existingLoc.variantId || undefined,
                                                    sku: existingLoc.sku || existingLoc.variantName || undefined,
                                                    variantName: existingLoc.variantName || undefined
                                                  });
                                                }
                                              }
                                            }
                                            
                                            if (allLocationsToSave.length === 0) return;
                                            
                                            const totalSavedQty = allLocationsToSave.reduce((sum, loc) => sum + loc.quantity, 0);
                                            
                                            try {
                                              // Single batch API call
                                              const response = await apiRequest('POST', `/api/products/${item.productId}/locations/batch`, {
                                                locations: allLocationsToSave,
                                                receiptItemId: item.receiptItemId
                                              });
                                              
                                              // Refetch product locations from server
                                              const locResponse = await fetch(`/api/products/${item.productId}/locations`, { credentials: 'include' });
                                              if (locResponse.ok) {
                                                const serverLocations = await locResponse.json();
                                                // Filter for locations relevant to THIS receipt (or no RI tag = general inventory)
                                                const relevantLocations = serverLocations.filter((loc: any) => {
                                                  if (!loc.notes) return true; // No notes = include
                                                  if (loc.notes.includes(`RI:${item.receiptItemId}:`)) return true; // This receipt
                                                  if (!loc.notes.includes('RI:')) return true; // No RI tag at all
                                                  return false; // Has RI tag for different receipt
                                                });
                                                
                                                // Fetch product variants to get SKU/name mapping
                                                let variantMap = new Map<string, { sku: string; name: string }>();
                                                // Also build a reverse map: real variantId -> original allocation info
                                                let variantIdToAllocationMap = new Map<string, VariantAllocation>();
                                                
                                                try {
                                                  const variantResponse = await fetch(`/api/products/${item.productId}/variants`, { credentials: 'include' });
                                                  if (variantResponse.ok) {
                                                    const variants = await variantResponse.json();
                                                    for (const v of variants) {
                                                      variantMap.set(v.id, { sku: v.sku || '', name: v.name || '' });
                                                    }
                                                    
                                                    // Match each variantAllocation to a real variant by SKU or name (fallback only)
                                                    const variantAllocations = item.variantAllocations || [];
                                                    for (const va of variantAllocations) {
                                                      const vaSku = (va as any).sku || va.variantName;
                                                      for (const v of variants) {
                                                        if ((v.sku && vaSku && v.sku === vaSku) || 
                                                            (v.name && va.variantName && v.name === va.variantName)) {
                                                          variantIdToAllocationMap.set(v.id, va);
                                                          break;
                                                        }
                                                      }
                                                    }
                                                  }
                                                } catch (e) {
                                                  console.warn('Failed to fetch variants for name lookup:', e);
                                                }
                                                
                                                setItems(prevItems => {
                                                  const updated = [...prevItems];
                                                  updated[index].receiptLocations = relevantLocations.map((loc: any) => {
                                                    // Look up variant info - prioritize direct variantMap lookup
                                                    // (variantMap is built from product variants, always available)
                                                    let variantName = '';
                                                    let sku = '';
                                                    if (loc.variantId) {
                                                      // Primary: Use variantMap (product variants) - always reliable
                                                      const variantInfo = variantMap.get(loc.variantId);
                                                      if (variantInfo) {
                                                        variantName = variantInfo.name;
                                                        sku = variantInfo.sku;
                                                      }
                                                      // Fallback: Try allocation map for original allocation names (may be stale after undo)
                                                      if (!variantName) {
                                                        const originalAllocation = variantIdToAllocationMap.get(loc.variantId);
                                                        if (originalAllocation) {
                                                          variantName = originalAllocation.variantName;
                                                          sku = (originalAllocation as any).sku || originalAllocation.variantName;
                                                        }
                                                      }
                                                    }
                                                    return {
                                                      id: loc.id,
                                                      locationCode: loc.locationCode,
                                                      locationType: loc.locationType,
                                                      quantity: loc.quantity,
                                                      isPrimary: loc.isPrimary,
                                                      notes: loc.notes,
                                                      variantId: loc.variantId,
                                                      variantName,
                                                      sku
                                                    };
                                                  });
                                                  // Update assignedQuantity locally - add the saved quantity to current
                                                  // We know totalSavedQty was just saved, so add it to existing
                                                  updated[index].assignedQuantity = Math.min(
                                                    (updated[index].assignedQuantity || 0) + totalSavedQty,
                                                    updated[index].receivedQuantity
                                                  );
                                                  updated[index].locations = [];
                                                  updated[index].pendingExistingAdds = {};
                                                  return updated;
                                                });
                                              }
                                              
                                              // Check if fully stored
                                              const currentStoredQty = calculateStoredQtyForReceiving(item.receiptLocations, item.receiptItemId);
                                              const isFullyAssigned = currentStoredQty + totalSavedQty >= item.receivedQuantity;
                                              
                                              if (isFullyAssigned) {
                                                if (index < items.length - 1) {
                                                  setSelectedItemIndex(index + 1);
                                                }
                                                await soundEffects.playCompletionSound();
                                              } else {
                                                await soundEffects.playSuccessBeep();
                                              }
                                              
                                              // Single toast for the entire batch
                                              toast({
                                                title: t('locationUpdated'),
                                                description: `${allLocationsToSave.length} ${t('locationsLabel', 'locations')}, ${totalSavedQty} ${t('common:items')}`,
                                                duration: 2000
                                              });
                                              
                                              queryClient.invalidateQueries({ queryKey: [`/api/products/${item.productId}/locations`] });
                                              // Note: Do NOT invalidate by-shipment query here as it would reset local state
                                              // The local state is already updated with the saved quantities
                                            } catch (error) {
                                              console.error('Failed to batch save locations:', error);
                                              toast({
                                                title: t('common:error'),
                                                description: t('failedToSaveLocations', 'Failed to save locations'),
                                                variant: 'destructive'
                                              });
                                            } finally {
                                              setIsBatchSaving(false);
                                            }
                                            
                                            setTimeout(() => locationInputRef.current?.focus(), 100);
                                          }}
                                        >
                                          {isBatchSaving ? (
                                            <>
                                              <Loader2 className="h-4 w-4 animate-spin mr-1" />
                                              {t('common:saving', 'Saving...')}
                                            </>
                                          ) : (
                                            <>
                                              <Check className="h-4 w-4 mr-1" />
                                              {t('saveLocations')} ({pendingExistingQty + pendingLocationQty})
                                            </>
                                          )}
                                        </Button>
                                      )}
                                    </div>
                                  );
                                })()}
                                
                                {/* Reset Locations Button */}
                                {(() => {
                                  const hasPendingNew = item.locations.some(loc => (loc.quantity || 0) > 0);
                                  const hasPendingExisting = Object.values(item.pendingExistingAdds || {}).some(qty => qty > 0);
                                  
                                  if (hasPendingNew || hasPendingExisting) {
                                    return (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="w-full h-8 text-xs text-muted-foreground hover:text-red-600 hover:border-red-300"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setItems(prevItems => {
                                            const updated = [...prevItems];
                                            updated[index].locations = [];
                                            updated[index].pendingExistingAdds = {};
                                            return updated;
                                          });
                                          toast({
                                            title: t('locationsReset', 'Locations Reset'),
                                            description: t('pendingLocationsCleared', 'All pending locations have been cleared'),
                                            duration: 2000
                                          });
                                        }}
                                        data-testid="button-reset-locations"
                                      >
                                        <RotateCcw className="h-3 w-3 mr-1" />
                                        {t('resetLocations', 'Reset Locations')}
                                      </Button>
                                    );
                                  }
                                  return null;
                                })()}

                                {/* Product Details - Inline link */}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setShowProductDetails(true);
                                  }}
                                  className="w-full py-2 text-xs text-muted-foreground hover:text-foreground flex items-center justify-center gap-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                                  data-testid="button-item-details"
                                >
                                  <Eye className="h-3.5 w-3.5" />
                                  {t('common:productDetails')}
                                </button>
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
        
        {/* Bottom Navigation - Compact */}
        <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-950 border-t dark:border-gray-800 shadow-lg z-40 safe-area-pb">
          {/* Complete Receiving Button - Shows when all items are stored */}
          {allItemsStored && (
            <div className="px-3 pt-3 pb-1">
              <button
                onClick={() => completeReceivingMutation.mutate()}
                disabled={completeReceivingMutation.isPending}
                className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white rounded-xl py-3 flex items-center justify-center gap-2 font-semibold text-sm shadow-lg"
                data-testid="button-complete-receiving"
              >
                {completeReceivingMutation.isPending ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    {t('common:loading')}
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-5 w-5" />
                    {t('completeReceiving')}
                  </>
                )}
              </button>
            </div>
          )}
          
          <div className={`px-3 py-2 flex gap-2 ${allItemsStored ? 'pt-1' : ''}`}>
            {/* Item Navigation */}
            <div className="flex gap-1">
              <button
                onClick={() => {
                  if (selectedItemIndex > 0) {
                    setSelectedItemIndex(selectedItemIndex - 1);
                  }
                }}
                disabled={selectedItemIndex === 0}
                className={`p-2.5 rounded-lg border dark:border-gray-800 ${
                  selectedItemIndex === 0 
                    ? 'bg-gray-50 dark:bg-gray-900 text-gray-300 dark:text-gray-600' 
                    : 'bg-white dark:bg-gray-950 text-gray-700 dark:text-gray-300 active:bg-gray-100'
                }`}
              >
                <ArrowUp className="h-4 w-4" />
              </button>
              <button
                onClick={() => {
                  if (selectedItemIndex < items.length - 1) {
                    setSelectedItemIndex(selectedItemIndex + 1);
                  }
                }}
                disabled={selectedItemIndex === items.length - 1}
                className={`p-2.5 rounded-lg border dark:border-gray-800 ${
                  selectedItemIndex === items.length - 1
                    ? 'bg-gray-50 dark:bg-gray-900 text-gray-300 dark:text-gray-600' 
                    : 'bg-white dark:bg-gray-950 text-gray-700 dark:text-gray-300 active:bg-gray-100'
                }`}
              >
                <ArrowDown className="h-4 w-4" />
              </button>
            </div>
            
            {/* Item counter */}
            <div className="flex items-center px-2 text-xs text-muted-foreground">
              {selectedItemIndex >= 0 ? selectedItemIndex + 1 : 0}/{items.length}
            </div>
            
            {/* Quick Scan Button */}
            <button
              onClick={() => setShowScanner(true)}
              disabled={!currentItem || allItemsStored}
              className={`flex-1 rounded-xl py-2.5 flex items-center justify-center gap-2 font-medium text-sm ${
                allItemsStored 
                  ? 'bg-gray-200 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                  : 'bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white'
              }`}
            >
              <ScanLine className="h-4 w-4" />
              {allItemsStored ? t('allStored') : t('quickScan')}
            </button>
          </div>
        </div>
        
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
                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                  <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-2 sm:p-3 text-center">
                    <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">{t('received')}</p>
                    <p className="text-lg sm:text-xl font-bold text-blue-700 dark:text-blue-300">{currentItem.receivedQuantity}</p>
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
                
                {/* Current Inventory (Reference) - Read-only display */}
                {currentItem.referenceInventory && currentItem.referenceInventory.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">{t('currentLocations')} ({t('imports:reference', 'Reference')})</p>
                    <div className="space-y-1.5">
                      {currentItem.referenceInventory.map((loc: any, idx: number) => (
                        <div 
                          key={idx} 
                          className="flex items-center gap-2 p-2.5 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg"
                        >
                          <MapPin className="h-4 w-4 text-green-600 dark:text-green-400" />
                          <span className="font-mono text-sm font-medium">{loc.locationCode}</span>
                          {loc.variantName && (
                            <Badge variant="secondary" className="text-[10px] bg-purple-100 dark:bg-purple-800/50 text-purple-700 dark:text-purple-200 flex-shrink-0">
                              {loc.variantName}
                            </Badge>
                          )}
                          <div className="flex-1" />
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

        {/* Bulk Allocation Dialog - Per-Aisle Configuration */}
        <Dialog open={showBulkAllocation} onOpenChange={setShowBulkAllocation}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" data-testid="dialog-bulk-allocation">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Layers className="h-5 w-5 text-purple-600" />
                {t('imports:bulkAllocate', 'Bulk Allocate to Locations')}
              </DialogTitle>
              <DialogDescription>
                {t('imports:bulkAllocateDesc', 'Automatically distribute {{count}} variants across warehouse locations', { count: items[selectedItemIndex]?.variantAllocations?.length || 0 })}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Global Settings */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="bulk-warehouse" className="text-xs">{t('imports:warehouse', 'Warehouse')}</Label>
                  <Input
                    id="bulk-warehouse"
                    value={bulkWarehouse}
                    onChange={(e) => setBulkWarehouse(e.target.value.toUpperCase())}
                    placeholder="WH1"
                    className="font-mono h-9"
                    data-testid="input-bulk-warehouse"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="bulk-per-location" className="text-xs">{t('imports:itemsPerLocation', 'Items/Location')}</Label>
                  <Input
                    id="bulk-per-location"
                    type="number"
                    min={1}
                    max={500}
                    value={bulkItemsPerLocation}
                    onChange={(e) => setBulkItemsPerLocation(parseInt(e.target.value) || 50)}
                    className="font-mono h-9"
                    data-testid="input-bulk-per-location"
                  />
                </div>
              </div>

              {/* Aisle Configurations */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">{t('imports:aisleConfigurations', 'Aisle Configuration')}</Label>
                  <div className="flex gap-1">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={pasteSchemeFromLocations}
                      className="h-7 text-xs"
                      title={t('imports:pasteSchemeTooltip', 'Detect aisle scheme from existing locations')}
                      data-testid="button-paste-scheme"
                    >
                      <Clipboard className="h-3 w-3 mr-1" />
                      {t('imports:pasteScheme', 'Paste Scheme')}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={addAisleConfig}
                      className="h-7 text-xs"
                      data-testid="button-add-aisle"
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      {t('imports:addAisle', 'Add Aisle')}
                    </Button>
                  </div>
                </div>
                
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {bulkAisleConfigs.map((config, idx) => (
                    <div 
                      key={config.id} 
                      className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 border border-gray-200 dark:border-gray-700"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-purple-600 dark:text-purple-400">
                          {t('imports:aisleLabel', 'Aisle {{num}}', { num: config.aisle })}
                        </span>
                        {bulkAisleConfigs.length > 1 && (
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => removeAisleConfig(config.id)}
                            className="h-6 w-6 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
                            data-testid={`button-remove-aisle-${idx}`}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-5 gap-2">
                        {/* Aisle Number */}
                        <div className="space-y-1">
                          <Label className="text-[10px] text-muted-foreground">{t('imports:aisle', 'Aisle')}</Label>
                          <Input
                            type="number"
                            min={1}
                            value={config.aisle}
                            onChange={(e) => updateAisleConfig(config.id, { aisle: parseInt(e.target.value) || 1 })}
                            className="font-mono h-8 text-xs"
                            data-testid={`input-aisle-num-${idx}`}
                          />
                        </div>
                        
                        {/* Rack Start */}
                        <div className="space-y-1">
                          <Label className="text-[10px] text-muted-foreground">{t('imports:rackFrom', 'Rack')}</Label>
                          <Input
                            type="number"
                            min={1}
                            value={config.rackStart}
                            onChange={(e) => updateAisleConfig(config.id, { rackStart: parseInt(e.target.value) || 1 })}
                            className="font-mono h-8 text-xs"
                            data-testid={`input-rack-start-${idx}`}
                          />
                        </div>
                        
                        {/* Rack End */}
                        <div className="space-y-1">
                          <Label className="text-[10px] text-muted-foreground">{t('imports:to', 'To')}</Label>
                          <Input
                            type="number"
                            min={1}
                            value={config.rackEnd}
                            onChange={(e) => updateAisleConfig(config.id, { rackEnd: parseInt(e.target.value) || 1 })}
                            className="font-mono h-8 text-xs"
                            data-testid={`input-rack-end-${idx}`}
                          />
                        </div>
                        
                        {/* Levels */}
                        <div className="space-y-1">
                          <Label className="text-[10px] text-muted-foreground">{t('imports:levels', 'Levels')}</Label>
                          <Input
                            type="number"
                            min={1}
                            max={10}
                            value={config.levels}
                            onChange={(e) => updateAisleConfig(config.id, { levels: parseInt(e.target.value) || 1 })}
                            className="font-mono h-8 text-xs"
                            data-testid={`input-levels-${idx}`}
                          />
                        </div>
                        
                        {/* Bins */}
                        <div className="space-y-1">
                          <Label className="text-[10px] text-muted-foreground">{t('imports:bins', 'Bins')}</Label>
                          <Input
                            type="number"
                            min={0}
                            max={20}
                            value={config.binsPerLevel}
                            onChange={(e) => updateAisleConfig(config.id, { binsPerLevel: parseInt(e.target.value) || 0 })}
                            className="font-mono h-8 text-xs"
                            data-testid={`input-bins-${idx}`}
                          />
                        </div>
                      </div>
                      
                      {/* Per-aisle capacity info */}
                      {(() => {
                        const racks = Math.abs(config.rackEnd - config.rackStart) + 1;
                        const locs = racks * config.levels * (config.binsPerLevel > 0 ? config.binsPerLevel : 1);
                        return (
                          <p className="text-[10px] text-muted-foreground mt-1">
                            {racks} {t('imports:racks', 'racks')} × {config.levels} {t('imports:levels', 'levels')}{config.binsPerLevel > 0 ? ` × ${config.binsPerLevel} bins` : ''} = {locs} {t('imports:locations', 'locations')}
                          </p>
                        );
                      })()}
                    </div>
                  ))}
                </div>
                
              </div>
              
              {/* Fill Direction & Last Level Options */}
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                <div className="grid grid-cols-2 gap-3">
                  {/* Fill Direction */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium flex items-center gap-1">
                      {bulkFillDirection === 'bottom-up' ? (
                        <ArrowUp className="h-3 w-3 text-blue-500" />
                      ) : (
                        <ArrowDown className="h-3 w-3 text-orange-500" />
                      )}
                      {t('imports:fillDirection', 'Fill Direction')}
                    </Label>
                    <div className="flex gap-1">
                      <Button
                        type="button"
                        size="sm"
                        variant={bulkFillDirection === 'bottom-up' ? 'default' : 'outline'}
                        onClick={() => setBulkFillDirection('bottom-up')}
                        className={`flex-1 h-7 text-[10px] ${bulkFillDirection === 'bottom-up' ? 'bg-blue-500 hover:bg-blue-600' : ''}`}
                        data-testid="button-fill-bottom-up"
                      >
                        <ArrowUp className="h-3 w-3 mr-0.5" />
                        L1→L{getMaxLevels()}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant={bulkFillDirection === 'top-down' ? 'default' : 'outline'}
                        onClick={() => setBulkFillDirection('top-down')}
                        className={`flex-1 h-7 text-[10px] ${bulkFillDirection === 'top-down' ? 'bg-orange-500 hover:bg-orange-600' : ''}`}
                        data-testid="button-fill-top-down"
                      >
                        <ArrowDown className="h-3 w-3 mr-0.5" />
                        L{getMaxLevels()}→L1
                      </Button>
                    </div>
                  </div>
                  
                  {/* Last Items Level */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">{t('imports:lastItemsLevel', 'Last Items Level')}</Label>
                    <Select
                      value={bulkLastItemsLevel?.toString() || 'auto'}
                      onValueChange={(val) => setBulkLastItemsLevel(val === 'auto' ? null : parseInt(val))}
                    >
                      <SelectTrigger className="h-7 text-xs" data-testid="select-last-level">
                        <SelectValue placeholder="Auto" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="auto">
                          <span className="flex items-center gap-1">
                            <Layers className="h-3 w-3" />
                            {t('imports:autoLevel', 'Auto (sequential)')}
                          </span>
                        </SelectItem>
                        {Array.from({ length: getMaxLevels() }, (_, i) => i + 1).map(level => (
                          <SelectItem key={level} value={level.toString()}>
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {t('imports:levelN', 'Level {{n}}', { n: level })}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground mt-2">
                  {bulkFillDirection === 'bottom-up' 
                    ? t('imports:bottomUpHint', 'Fills racks on L1 first, then L2, etc. (forklift-friendly)')
                    : t('imports:topDownHint', 'Fills racks on top level first, then down (gravity flow)')
                  }
                </p>
              </div>

              {/* Preview - Clean Summary */}
              <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                <p className="text-xs font-medium text-muted-foreground mb-2">{t('imports:allocationPreview', 'Allocation Preview')}</p>
                
                {(() => {
                  const preview = getBulkAllocationPreview();
                  const locs = preview.locations;
                  const total = locs.length;
                  const totalVariants = currentItem?.variantAllocations?.length || 0;
                  const totalItemsToAllocate = preview.totalItems;
                  const itemsWillBeAllocated = preview.locations.reduce((sum, loc) => sum + loc.items, 0);
                  const totalLocations = generateBulkLocations().length;
                  const totalCapacity = totalLocations * bulkItemsPerLocation;
                  const shortfall = Math.max(0, totalItemsToAllocate - totalCapacity);
                  const additionalBinsNeeded = shortfall > 0 ? Math.ceil(shortfall / bulkItemsPerLocation) : 0;
                  const allocationComplete = shortfall <= 0 && totalItemsToAllocate > 0;
                  
                  if (total === 0) {
                    return (
                      <p className="text-center text-muted-foreground py-3 text-sm">
                        {t('imports:noLocationsGenerated', 'No locations to preview')}
                      </p>
                    );
                  }
                  
                  return (
                    <div className="space-y-3">
                      {/* Location Range */}
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-mono text-foreground">{locs[0]?.code}</span>
                        <span className="text-muted-foreground px-2">→</span>
                        <span className="font-mono text-foreground">{locs[locs.length - 1]?.code}</span>
                      </div>
                      
                      {/* Key Stats - 2 rows, clean */}
                      <div className="grid grid-cols-3 gap-2 text-center text-xs">
                        <div>
                          <p className="font-semibold text-foreground">{totalVariants}</p>
                          <p className="text-muted-foreground">{t('imports:variants', 'variants')}</p>
                        </div>
                        <div>
                          <p className="font-semibold text-foreground">{total}</p>
                          <p className="text-muted-foreground">{t('imports:bins', 'bins')}</p>
                        </div>
                        <div>
                          <p className="font-semibold text-foreground">{bulkItemsPerLocation}/bin</p>
                          <p className="text-muted-foreground">{t('imports:capacity', 'capacity')}</p>
                        </div>
                      </div>
                      
                      {/* Allocation Status */}
                      <div className="border-t border-gray-200 dark:border-gray-700 pt-2 space-y-2">
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-muted-foreground">{t('imports:itemsToStore', 'Items')}</span>
                          <span className="font-mono font-medium">
                            {totalItemsToAllocate.toLocaleString()} / <span className="text-blue-600 dark:text-blue-400">{totalCapacity.toLocaleString()}</span>
                          </span>
                        </div>
                        
                        {/* Progress Bar */}
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full transition-all ${
                              shortfall > 0 ? 'bg-red-500' : 'bg-green-500'
                            }`}
                            style={{ width: `${Math.min(100, totalCapacity > 0 ? (itemsWillBeAllocated / totalItemsToAllocate) * 100 : 0)}%` }}
                          />
                        </div>
                        
                        {/* Status Message */}
                        {allocationComplete ? (
                          <div className="flex items-center gap-1.5 text-sm text-green-600 dark:text-green-500">
                            <CheckCircle className="h-4 w-4" />
                            <span>{t('imports:allItemsAllocated', 'All items will be allocated')}</span>
                          </div>
                        ) : shortfall > 0 ? (
                          <div className="flex items-center gap-1.5 text-sm text-red-600 dark:text-red-400">
                            <AlertTriangle className="h-4 w-4 shrink-0" />
                            <span>{t('imports:needMoreBins', 'Need +{{count}} bins for {{items}} items', { count: additionalBinsNeeded, items: shortfall.toLocaleString() })}</span>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => setShowBulkAllocation(false)}
                data-testid="button-cancel-bulk"
              >
                {t('common:cancel')}
              </Button>
              <Button
                onClick={handleBulkAllocation}
                disabled={
                  !bulkWarehouse || 
                  bulkItemsPerLocation < 1 || 
                  isSubmitting || 
                  !items[selectedItemIndex]?.variantAllocations || 
                  items[selectedItemIndex]?.variantAllocations.length < 2 ||
                  generateBulkLocations().length === 0
                }
                className="bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600"
                data-testid="button-apply-bulk"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {t('common:applying')}
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    {t('imports:applyBulkAllocation', 'Apply Allocation')}
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </SheetContent>
    </Sheet>
  );
}

function StorageShipmentCard({ shipment, isAdministrator }: { shipment: any; isAdministrator: boolean }) {
  const { t } = useTranslation(['imports']);
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [isExpanded, setIsExpanded] = useState(true);
  const [showQuickStorage, setShowQuickStorage] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  // Check if shipment is being processed in background
  const isProcessing = shipment.isProcessing || shipment.processingStatus === 'in_progress' || shipment.status === 'processing';
  const isFinalizing = shipment.status === 'finalizing' || shipment.receivingStatus === 'finalizing';
  
  const deleteShipmentMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/imports/shipments/${shipment.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });
      // Treat 404 as success (already deleted)
      if (response.status === 404) {
        return { alreadyDeleted: true };
      }
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/imports/shipments/storage'] });
      queryClient.invalidateQueries({ queryKey: ['/api/imports/shipments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/imports/receipts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      toast({
        title: t('common:deleted'),
        description: t('shipmentDeleted'),
      });
      setShowDeleteConfirm(false);
    },
    onError: (error: any) => {
      // If 404, treat as already deleted
      if (error?.message?.includes('404') || error?.message?.includes('not found')) {
        queryClient.invalidateQueries({ queryKey: ['/api/imports/shipments/storage'] });
        queryClient.invalidateQueries({ queryKey: ['/api/imports/shipments'] });
        toast({
          title: t('common:deleted'),
          description: t('shipmentDeleted'),
        });
        setShowDeleteConfirm(false);
        return;
      }
      toast({
        title: t('common:error'),
        description: error.message || t('failedToDeleteShipment'),
        variant: "destructive",
      });
      setShowDeleteConfirm(false);
    },
  });
  
  // Mutation to move shipment back to "To Receive" status
  const moveToReceiveMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('POST', `/api/imports/shipments/${shipment.id}/move-to-receive`);
    },
    onSuccess: () => {
      toast({
        title: t('movedToReceive'),
        description: t('shipmentMovedToReceiveDesc'),
      });
      // Invalidate all receiving-related queries including to-receive
      queryClient.invalidateQueries({ queryKey: ['/api/imports/shipments/receivable'] });
      queryClient.invalidateQueries({ queryKey: ['/api/imports/shipments/to-receive'] });
      queryClient.invalidateQueries({ queryKey: ['/api/imports/shipments/receiving'] });
      queryClient.invalidateQueries({ queryKey: ['/api/imports/shipments/storage'] });
      queryClient.invalidateQueries({ queryKey: ['/api/imports/shipments/by-status/storage'] });
      queryClient.invalidateQueries({ queryKey: ['/api/imports/shipments/by-status/receiving'] });
      queryClient.invalidateQueries({ queryKey: [`/api/imports/shipments/${shipment.id}`] });
    },
    onError: (error: any) => {
      toast({
        title: t('common:error'),
        description: error.message || t('failedToMoveShipment'),
        variant: 'destructive',
      });
    },
  });
  
  const itemCount = shipment.items?.length || 0;
  const isPartiallyReceived = shipment.isPartiallyReceived || shipment.receivingStatus === 'receiving';

  return (
    <Card 
      className={`overflow-hidden relative ${
        isProcessing || isFinalizing 
          ? 'ring-2 ring-blue-400 dark:ring-blue-500 animate-pulse' 
          : ''
      }`} 
      data-testid={`card-shipment-${shipment.id}`}
    >
      {/* Processing Overlay */}
      {(isProcessing || isFinalizing) && (
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-blue-500/10 animate-shimmer z-10 pointer-events-none" />
      )}
      
      <CardHeader 
        className="p-3 md:p-4 cursor-pointer hover:bg-muted/50 transition-colors relative z-20"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              {isProcessing || isFinalizing ? (
                <Loader2 className="h-5 w-5 text-blue-600 dark:text-blue-400 animate-spin" />
              ) : (
                <Warehouse className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              )}
              <CardTitle className="text-base truncate">
                {shipment.shipmentName || t('shipmentNumber', { number: shipment.id })}
              </CardTitle>
              {(isProcessing || isFinalizing) && (
                <Badge variant="outline" className="bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800 text-xs animate-pulse">
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  {t('processing', 'Processing...')}
                </Badge>
              )}
              {isPartiallyReceived && !isProcessing && !isFinalizing && (
                <Badge variant="outline" className="bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800 text-xs">
                  <Clock className="h-3 w-3 mr-1" />
                  {t('partiallyReceived')}
                </Badge>
              )}
            </div>
            
            {/* Processing Progress Indicator */}
            {(isProcessing || isFinalizing) && (
              <div className="mb-2 p-2 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="flex items-center gap-2 text-sm text-blue-700 dark:text-blue-300">
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                    <span className="text-xs">{t('validating', 'Validating')}</span>
                  </div>
                  <ChevronRight className="h-3 w-3" />
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
                    <span className="text-xs font-medium">{t('processingInventory', 'Processing Inventory')}</span>
                  </div>
                  <ChevronRight className="h-3 w-3" />
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-gray-300 dark:bg-gray-600"></div>
                    <span className="text-xs text-muted-foreground">{t('completing', 'Completing')}</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {t('processingHint', 'Refresh page to see completion status')}
                </p>
              </div>
            )}
            
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
            <Badge className={isProcessing || isFinalizing ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' : getStatusColor(shipment.status)}>
              {isProcessing || isFinalizing ? t('processing', 'Processing') : shipment.status}
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
            
            <div className="flex gap-2">
              <Button
                size="lg"
                className="flex-1 h-12 text-base bg-amber-600 hover:bg-amber-700"
                onClick={() => setShowQuickStorage(true)}
                data-testid={`button-go-to-storage-${shipment.id}`}
              >
                <Warehouse className="h-5 w-5 mr-2" />
                {t('quickStorage')}
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="lg"
                    variant="outline"
                    className="h-12 px-3"
                    data-testid={`button-more-options-${shipment.id}`}
                  >
                    <MoreVertical className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      moveToReceiveMutation.mutate();
                    }}
                    disabled={moveToReceiveMutation.isPending}
                    data-testid={`button-move-to-receive-${shipment.id}`}
                  >
                    <Undo2 className="h-4 w-4 mr-2" />
                    {moveToReceiveMutation.isPending ? t('common:loading') : t('moveToReceive')}
                  </DropdownMenuItem>
                  {isAdministrator && (
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowDeleteConfirm(true);
                      }}
                      disabled={deleteShipmentMutation.isPending}
                      className="text-red-600 dark:text-red-400"
                      data-testid={`menu-item-delete-${shipment.id}`}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      {t('common:delete')}
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardContent>
      )}
      
      <QuickStorageSheet
        shipment={shipment}
        open={showQuickStorage}
        onOpenChange={setShowQuickStorage}
      />
      
      {isAdministrator && (
        <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('confirmDeleteTitle')}</AlertDialogTitle>
              <AlertDialogDescription>
                {t('confirmDeleteDescription')}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
              <AlertDialogCancel disabled={deleteShipmentMutation.isPending} className="w-full sm:w-auto">
                {t('common:cancel')}
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteShipmentMutation.mutate()}
                disabled={deleteShipmentMutation.isPending}
                className="bg-red-600 hover:bg-red-700 w-full sm:w-auto"
              >
                {deleteShipmentMutation.isPending ? t('common:processing') : t('common:delete')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
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
  const { toast } = useToast();
  const [selectedItemsForLabels, setSelectedItemsForLabels] = useState<Set<string>>(new Set());
  const [showLabelsSection, setShowLabelsSection] = useState(false);
  const [expandedLocations, setExpandedLocations] = useState<Set<string>>(new Set());
  const printRef = useRef<HTMLDivElement>(null);
  
  const toggleLocationExpand = (itemId: string) => {
    setExpandedLocations(prev => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  };
  
  const LOCATION_PREVIEW_COUNT = 3; // Show first 3 locations by default
  
  const { data: reportData, isLoading } = useQuery<ShipmentReportData>({
    queryKey: [`/api/imports/shipments/${shipmentId}/report`],
    enabled: open && !!shipmentId,
  });
  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ok':
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 shrink-0"><CheckCircle className="h-3 w-3 mr-1" /> OK</Badge>;
      case 'damaged':
        return <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 shrink-0"><AlertTriangle className="h-3 w-3 mr-1" /> {t('damaged')}</Badge>;
      case 'missing':
        return <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400 shrink-0"><XCircle className="h-3 w-3 mr-1" /> {t('missing')}</Badge>;
      case 'partial':
        return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 shrink-0"><AlertCircle className="h-3 w-3 mr-1" /> {t('partial')}</Badge>;
      default:
        return <Badge variant="secondary" className="shrink-0">{status}</Badge>;
    }
  };
  
  const formatPrice = (price: string | null | undefined, currency: string) => {
    if (!price) return '-';
    const num = parseDecimal(price);
    if (isNaN(num) || num === 0) return '-';
    return `${num.toFixed(2)} ${currency}`;
  };
  
  const shouldShowNote = (note: string | null | undefined) => {
    if (!note) return false;
    const lowerNote = note.toLowerCase();
    if (lowerNote.includes('auto-generated') || lowerNote.includes('auto generated') || lowerNote.includes('autogenerated')) {
      return false;
    }
    return true;
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
    
    const printWindow = window.open('', '_blank', 'width=600,height=800');
    if (!printWindow) {
      toast({
        title: t('common:error'),
        description: t('popupBlocked'),
        variant: 'destructive',
      });
      return;
    }
    
    const selectedItems = reportData?.items.filter(item => 
      selectedItemsForLabels.has(String(item.receiptItemId))
    ) || [];
    
    // Generate labels in the same format as /stock warehouse labels
    const labelsHtml = selectedItems.map(item => {
      const productCode = item.sku || item.productId || '-';
      const vietnameseName = (item as any).vietnameseName || item.productName;
      const priceEur = item.prices?.priceEur ? Number(item.prices.priceEur) : null;
      const priceCzk = item.prices?.priceCzk ? Number(item.prices.priceCzk) : null;
      
      return `
        <div class="label-container">
          <div class="qr-section">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45" width="90" height="90">
              <rect width="45" height="45" fill="white"/>
              <text x="22.5" y="22.5" text-anchor="middle" dominant-baseline="middle" font-size="6">QR</text>
              <text x="22.5" y="30" text-anchor="middle" font-size="4">${productCode}</text>
            </svg>
          </div>
          <div class="name-section">
            <div class="vn-name">${vietnameseName}</div>
            <div class="en-name">${item.productName}</div>
            ${item.sku ? `<div class="sku">${item.sku}</div>` : ''}
          </div>
          <div class="price-section">
            ${priceEur !== null ? `<div class="price-eur-row"><span class="price-eur">€${priceEur.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>` : ''}
            ${priceCzk !== null ? `<div class="price-czk-row"><span class="price-czk">${priceCzk.toLocaleString('cs-CZ')} Kč</span></div>` : ''}
            ${priceEur === null && priceCzk === null ? `<div class="price-czk-row"><span class="price-na">N/A</span></div>` : ''}
          </div>
        </div>
      `;
    }).join('');
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>${t('warehouseLabels')}</title>
        <style>
          @page {
            size: 100mm 30mm;
            margin: 0;
          }
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: Arial, Helvetica, sans-serif;
          }
          .label-container {
            width: 100mm;
            height: 30mm;
            display: flex;
            flex-direction: row;
            align-items: stretch;
            background: white;
            color: black;
            overflow: hidden;
            border: 2pt solid black;
            page-break-after: always;
          }
          .label-container:last-child {
            page-break-after: auto;
          }
          .qr-section {
            flex-shrink: 0;
            width: 22mm;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 1.5mm;
            background: white;
            border-right: 2pt solid black;
          }
          .qr-section svg {
            width: 19mm;
            height: 19mm;
          }
          .name-section {
            flex: 1;
            padding: 1.5mm 2mm;
            display: flex;
            flex-direction: column;
            justify-content: center;
            overflow: hidden;
            min-width: 0;
            background: white;
          }
          .vn-name {
            font-weight: 900;
            font-size: 10pt;
            line-height: 1.2;
            text-transform: uppercase;
            word-break: break-word;
            letter-spacing: -0.3pt;
          }
          .en-name {
            font-size: 9pt;
            font-weight: 500;
            line-height: 1.2;
            color: #1f2937;
            margin-top: 1mm;
            word-break: break-word;
          }
          .sku {
            font-size: 8pt;
            line-height: 1.1;
            color: black;
            margin-top: 1mm;
            font-family: monospace;
            font-weight: bold;
            background: #f3f4f6;
            padding: 0.5mm 1mm;
            display: inline-block;
          }
          .price-section {
            flex-shrink: 0;
            width: 26mm;
            display: flex;
            flex-direction: column;
            border-left: 2pt solid black;
          }
          .price-eur-row {
            flex: 1;
            display: flex;
            align-items: center;
            justify-content: center;
            background: black;
          }
          .price-czk-row {
            flex: 1;
            display: flex;
            align-items: center;
            justify-content: center;
            background: white;
            border-top: 1pt solid black;
          }
          .price-eur {
            font-weight: 900;
            font-size: 14pt;
            line-height: 1;
            color: white;
            letter-spacing: -0.3pt;
          }
          .price-czk {
            font-weight: bold;
            font-size: 12pt;
            line-height: 1;
            color: black;
            letter-spacing: -0.3pt;
          }
          .price-na {
            font-size: 10pt;
            color: #6b7280;
            font-weight: 500;
          }
        </style>
      </head>
      <body>
        ${labelsHtml}
      </body>
      </html>
    `);
    
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.print();
    };
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-0">
        {/* Fixed Header */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b bg-background sticky top-0 z-10">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 flex items-center justify-center shrink-0">
                <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 dark:text-green-400" />
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-base sm:text-lg font-semibold truncate">
                  {t('shipmentReport')}
                </DialogTitle>
                <DialogDescription className="text-xs sm:text-sm truncate">
                  {reportData?.shipment?.shipmentName || `${t('shipmentNumber', { number: shipmentId })}`}
                </DialogDescription>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {reportData && (
                <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  <span className="hidden sm:inline">{t('completed')}</span>
                </Badge>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full"
                onClick={() => onOpenChange(false)}
                data-testid="button-close-report"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
        
        {/* Scrollable Content - Single scroll for all sections on mobile */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : reportData ? (
            <div className="px-4 sm:px-6 py-4 space-y-4">
              {/* Summary Stats - Clean horizontal bar */}
              <div className="flex items-center justify-between bg-muted/30 rounded-lg p-3 border">
                <div className="flex items-center gap-4 sm:gap-6">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                      <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <div className="text-xl font-bold text-green-600 dark:text-green-400">{reportData.summary.totalReceived}</div>
                      <div className="text-[10px] text-muted-foreground uppercase tracking-wide">{t('received')}</div>
                    </div>
                  </div>
                  {reportData.summary.totalDamaged > 0 && (
                    <div className="flex items-center gap-2 border-l pl-4 sm:pl-6">
                      <div className="text-lg font-bold text-red-600 dark:text-red-400">{reportData.summary.totalDamaged}</div>
                      <div className="text-[10px] text-red-600 dark:text-red-400 uppercase">{t('damaged')}</div>
                    </div>
                  )}
                  {reportData.summary.totalMissing > 0 && (
                    <div className="flex items-center gap-2 border-l pl-4 sm:pl-6">
                      <div className="text-lg font-bold text-orange-600 dark:text-orange-400">{reportData.summary.totalMissing}</div>
                      <div className="text-[10px] text-orange-600 dark:text-orange-400 uppercase">{t('missing')}</div>
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold">{reportData.summary.totalItems}</div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wide">{t('totalItems')}</div>
                </div>
              </div>
              
              {/* Items Section - Clean table-like layout */}
              <div className="border rounded-lg overflow-hidden">
                <div className="bg-muted/50 px-3 py-2 border-b flex items-center justify-between">
                  <span className="text-sm font-medium">{t('items')} ({reportData.items.length})</span>
                </div>
                <div className="divide-y divide-border">
                  {reportData.items.map((item) => (
                    <div key={item.receiptItemId} className="p-3 hover:bg-muted/20 transition-colors">
                      <div className="flex items-start gap-3">
                        {/* Product Image - Smaller */}
                        <div className="w-10 h-10 rounded bg-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0 overflow-hidden">
                          {item.imageUrl ? (
                            <img src={item.imageUrl} alt={item.productName} className="w-full h-full object-contain" />
                          ) : (
                            <Package className="h-5 w-5 text-gray-400" />
                          )}
                        </div>
                        
                        {/* Product Info - Streamlined */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <h4 className="font-medium text-sm text-foreground line-clamp-1">
                                {item.productName || t('unknownProduct')}
                              </h4>
                              <p className="text-xs text-muted-foreground font-mono">{item.sku || '-'}</p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              {getStatusBadge(item.status)}
                            </div>
                          </div>
                          
                          {/* Compact info row */}
                          <div className="flex items-center flex-wrap gap-x-4 gap-y-1 mt-2 text-xs">
                            <span className="text-muted-foreground">
                              {t('expected')}: <span className="font-medium text-foreground">{item.expectedQuantity}</span>
                            </span>
                            <span className="text-green-600 dark:text-green-400">
                              {t('received')}: <span className="font-semibold">{item.receivedQuantity}</span>
                            </span>
                            {item.prices?.priceCzk && (
                              <span className="text-muted-foreground font-medium">
                                {formatPrice(item.prices.priceCzk, 'CZK')}
                              </span>
                            )}
                            {item.prices?.priceEur && (
                              <span className="text-muted-foreground font-medium">
                                {formatPrice(item.prices.priceEur, 'EUR')}
                              </span>
                            )}
                          </div>
                          
                          {/* Locations - Collapsible */}
                          {item.locations.length > 0 && (
                            <div className="mt-1.5">
                              {item.locations.length <= LOCATION_PREVIEW_COUNT ? (
                                <div className="flex flex-wrap gap-1">
                                  {item.locations.map((loc, idx) => (
                                    <span 
                                      key={idx} 
                                      className="inline-flex items-center text-[11px] font-mono bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded"
                                    >
                                      {loc.locationCode}×{loc.quantity}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <>
                                  <div className="flex flex-wrap gap-1">
                                    {(expandedLocations.has(String(item.receiptItemId)) 
                                      ? item.locations 
                                      : item.locations.slice(0, LOCATION_PREVIEW_COUNT)
                                    ).map((loc, idx) => (
                                      <span 
                                        key={idx} 
                                        className="inline-flex items-center text-[11px] font-mono bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded"
                                      >
                                        {loc.locationCode}×{loc.quantity}
                                      </span>
                                    ))}
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        toggleLocationExpand(String(item.receiptItemId));
                                      }}
                                      className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 px-1.5 py-0.5 rounded hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
                                    >
                                      {expandedLocations.has(String(item.receiptItemId)) ? (
                                        <>
                                          <ChevronUp className="h-3 w-3" />
                                          {t('common:hide')}
                                        </>
                                      ) : (
                                        <>
                                          <ChevronDown className="h-3 w-3" />
                                          +{item.locations.length - LOCATION_PREVIEW_COUNT} {t('more')}
                                        </>
                                      )}
                                    </button>
                                  </div>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Photos Section */}
              {reportData.receipt.photos && reportData.receipt.photos.length > 0 && (
                <Card>
                  <CardHeader className="pb-2 sm:pb-3">
                    <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                      <ImageIcon className="h-4 w-4" />
                      {t('photos')} ({reportData.receipt.photos.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {reportData.receipt.photos.map((photo, idx) => (
                        <div key={idx} className="aspect-square rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800">
                          <img src={photo} alt={`Photo ${idx + 1}`} className="w-full h-full object-cover" />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
              
              {/* Receipt Details Section - Compact grid */}
              <div className="border rounded-lg overflow-hidden">
                <div className="bg-muted/50 px-3 py-2 border-b">
                  <span className="text-sm font-medium">{t('receiptDetails')}</span>
                </div>
                <div className="p-3">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2 text-sm">
                    <div>
                      <span className="text-xs text-muted-foreground">{t('receiptNumber')}</span>
                      <div className="font-medium">{reportData.receipt.receiptNumber || '-'}</div>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground">{t('status')}</span>
                      <div>
                        <Badge variant="outline" className="bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300 text-xs mt-0.5">
                          {t('completeStatus')}
                        </Badge>
                      </div>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground">{t('receivedBy')}</span>
                      <div className="font-medium">{reportData.receipt.receivedBy || '-'}</div>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground">{t('receivedAt')}</span>
                      <div className="font-medium">{reportData.receipt.receivedAt ? format(new Date(reportData.receipt.receivedAt), 'dd MMM yyyy HH:mm') : '-'}</div>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground">{t('carrier')}</span>
                      <div className="font-medium">{reportData.receipt.carrier || '-'}</div>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground">{t('parcels')}</span>
                      <div className="font-medium">{reportData.receipt.parcelCount || 0}</div>
                    </div>
                  </div>
                  {reportData.receipt.notes && shouldShowNote(reportData.receipt.notes) && (
                    <div className="mt-3 pt-3 border-t text-sm">
                      <span className="text-xs text-muted-foreground">{t('notes')}</span>
                      <p className="mt-0.5">{reportData.receipt.notes}</p>
                    </div>
                  )}
                  {reportData.receipt.damageNotes && (
                    <div className="mt-3 p-2 rounded bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 text-sm">
                      <span className="text-xs text-red-600 dark:text-red-400 font-medium">{t('damageNotes')}</span>
                      <p className="text-red-700 dark:text-red-300 mt-0.5">{reportData.receipt.damageNotes}</p>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Scanned Parcels Section - Compact inline */}
              {reportData.receipt.scannedParcels && reportData.receipt.scannedParcels.length > 0 && (
                <div className="border rounded-lg overflow-hidden">
                  <div className="bg-muted/50 px-3 py-2 border-b flex items-center gap-2">
                    <Barcode className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{t('scannedParcels')} ({reportData.receipt.scannedParcels.length})</span>
                  </div>
                  <div className="p-3 flex flex-wrap gap-1.5">
                    {reportData.receipt.scannedParcels.map((parcel, idx) => (
                      <Badge key={idx} variant="secondary" className="font-mono text-xs">
                        {parcel}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Labels Section - Collapsible with cleaner design */}
              {reportData.items.filter(i => i.locations.length > 0).length > 0 && (
                <div className="border rounded-lg">
                  <div 
                    className="bg-muted/50 px-3 py-2 border-b flex items-center justify-between cursor-pointer hover:bg-muted/70 transition-colors"
                    onClick={() => setShowLabelsSection(!showLabelsSection)}
                  >
                    <div className="flex items-center gap-2">
                      <Tag className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">{t('warehouseLabels')}</span>
                    </div>
                    {showLabelsSection ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                  {showLabelsSection && (
                    <div className="p-3 space-y-3">
                      {/* Actions - Inline with explicit pointer events */}
                      <div className="flex items-center justify-between gap-2 relative" style={{ zIndex: 9999, pointerEvents: 'auto' }}>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onMouseDown={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            selectAllForLabels();
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                          }}
                          className="h-8 text-xs pointer-events-auto"
                          style={{ pointerEvents: 'auto' }}
                        >
                          <CheckSquare className="h-3.5 w-3.5 mr-1" />
                          {t('selectAll')}
                        </Button>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">
                            {selectedItemsForLabels.size} {t('selected')}
                          </span>
                          <Button 
                            size="sm"
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              if (selectedItemsForLabels.size > 0) {
                                printLabels();
                              }
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                            }}
                            disabled={selectedItemsForLabels.size === 0}
                            className="h-8 pointer-events-auto"
                            style={{ pointerEvents: 'auto', zIndex: 9999 }}
                          >
                            <Printer className="h-3.5 w-3.5 mr-1" />
                            {t('printLabels')}
                          </Button>
                        </div>
                      </div>
                      
                      {/* Items list - Compact */}
                      <div className="space-y-1">
                        {reportData.items
                          .filter(item => item.locations.length > 0)
                          .map((item) => (
                            <div 
                              key={item.receiptItemId} 
                              className={`p-2 rounded cursor-pointer transition-all flex items-center gap-2 ${
                                selectedItemsForLabels.has(String(item.receiptItemId))
                                  ? 'bg-green-50 dark:bg-green-900/20 ring-1 ring-green-500'
                                  : 'hover:bg-muted/50'
                              }`}
                              onClick={() => toggleItemForLabel(String(item.receiptItemId))}
                            >
                              <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                                selectedItemsForLabels.has(String(item.receiptItemId))
                                  ? 'bg-green-500 border-green-500'
                                  : 'border-gray-300 dark:border-gray-600'
                              }`}>
                                {selectedItemsForLabels.has(String(item.receiptItemId)) && (
                                  <Check className="h-2.5 w-2.5 text-white" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <span className="text-sm truncate block">{item.productName}</span>
                                <span className="text-[10px] text-muted-foreground font-mono">{item.sku || '-'}</span>
                              </div>
                              <div className="text-right shrink-0 text-xs">
                                <div className="font-semibold">{formatPrice(item.prices?.priceCzk, 'CZK')}</div>
                                <div className="text-muted-foreground">{formatPrice(item.prices?.priceEur, 'EUR')}</div>
                              </div>
                              <div className="flex flex-wrap gap-0.5 shrink-0 max-w-28">
                                {item.locations.map((loc, idx) => (
                                  <span key={idx} className="text-[10px] font-mono bg-muted px-1 py-0.5 rounded">
                                    {loc.locationCode}
                                  </span>
                                ))}
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center py-12">
              <p className="text-muted-foreground">{t('noDataAvailable')}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CompletedShipmentCard({ shipment, isAdministrator }: { shipment: any; isAdministrator: boolean }) {
  const { t } = useTranslation(['imports']);
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [isExpanded, setIsExpanded] = useState(true);
  const [showReport, setShowReport] = useState(false);
  const [showRevertConfirm, setShowRevertConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  const itemCount = shipment.items?.length || 0;

  const deleteShipmentMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/imports/shipments/${shipment.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/imports/shipments/completed'] });
      queryClient.invalidateQueries({ queryKey: ['/api/imports/shipments/archived'] });
      queryClient.invalidateQueries({ queryKey: ['/api/imports/receipts'] });
      toast({
        title: t('common:deleted'),
        description: t('shipmentDeleted'),
      });
      setShowDeleteConfirm(false);
    },
    onError: (error: Error) => {
      toast({
        title: t('common:error'),
        description: error.message || t('failedToDeleteShipment'),
        variant: "destructive",
      });
    },
  });

  const revertToReceiveMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/imports/shipments/${shipment.id}/revert-to-receiving`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to revert');
      }
      return response.json();
    },
    onSuccess: (data: any) => {
      // Invalidate all relevant queries for UI refresh
      queryClient.invalidateQueries({ queryKey: ['/api/imports/shipments/completed'] });
      queryClient.invalidateQueries({ queryKey: ['/api/imports/shipments/storage'] });
      queryClient.invalidateQueries({ queryKey: ['/api/imports/shipments/receiving'] });
      queryClient.invalidateQueries({ queryKey: ['/api/imports/receipts/storage'] });
      queryClient.invalidateQueries({ queryKey: ['/api/imports/shipments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      queryClient.invalidateQueries({ queryKey: ['/api/product-locations'] });
      
      // Show detailed toast about inventory revert
      const inv = data.inventoryReverted;
      const inventoryMsg = inv && inv.totalQuantity > 0
        ? t('inventoryRevertedDetails', { 
            quantity: inv.totalQuantity, 
            products: inv.productsAffected,
            locations: inv.locationsReverted 
          })
        : t('shipmentRevertedToReceiving');
      
      toast({
        title: t('statusUpdated'),
        description: inventoryMsg,
      });
      setShowRevertConfirm(false);
    },
    onError: (error: Error) => {
      toast({
        title: t('common:error'),
        description: error.message || t('failedToRevertShipment'),
        variant: "destructive",
      });
    },
  });

  const retryInventoryMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/imports/shipments/${shipment.id}/retry-inventory`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to retry inventory processing');
      }
      return response.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      queryClient.invalidateQueries({ queryKey: ['/api/product-locations'] });
      queryClient.invalidateQueries({ queryKey: ['/api/imports/shipments/completed'] });
      
      toast({
        title: t('common:success'),
        description: `Inventory reprocessed: ${data.inventoryUpdates?.length || 0} products updated`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: t('common:error'),
        description: error.message || 'Failed to retry inventory processing',
        variant: "destructive",
      });
    },
  });

  const handleRevertClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowRevertConfirm(true);
  };
  
  const handleConfirmRevert = () => {
    revertToReceiveMutation.mutate();
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
                  <span className="text-xs bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
                    {(() => {
                      const completedDate = new Date(shipment.completedAt);
                      const archiveDate = new Date(completedDate);
                      archiveDate.setDate(archiveDate.getDate() + 2);
                      const now = new Date();
                      const hoursRemaining = Math.max(0, Math.floor((archiveDate.getTime() - now.getTime()) / (1000 * 60 * 60)));
                      if (hoursRemaining <= 0) return t('archivingSoon');
                      if (hoursRemaining < 24) return `${hoursRemaining}h`;
                      return `${Math.floor(hoursRemaining / 24)}d`;
                    })()}
                  </span>
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
            
            {/* Processing Status Indicators - Administrator Only */}
            {isAdministrator && (
              <div className="flex flex-wrap items-center gap-2 py-2 border-y border-muted" data-testid={`status-indicators-${shipment.id}`}>
                <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${
                  shipment.inventoryAddedAt 
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                    : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                }`}>
                  {shipment.inventoryAddedAt ? (
                    <CheckCircle className="h-3.5 w-3.5" />
                  ) : (
                    <Clock className="h-3.5 w-3.5" />
                  )}
                  <span>{t('inventoryAdded')}</span>
                </div>
                <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${
                  shipment.landedCostCalculatedAt 
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                    : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                }`}>
                  {shipment.landedCostCalculatedAt ? (
                    <CheckCircle className="h-3.5 w-3.5" />
                  ) : (
                    <Circle className="h-3.5 w-3.5" />
                  )}
                  <span>{t('landedCostCalculated')}</span>
                </div>
                <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${
                  shipment.costsAllocatedAt && shipment.allVariantsCostApplied
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                    : shipment.costsAllocatedAt && !shipment.allVariantsCostApplied
                    ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                    : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                }`}>
                  {shipment.costsAllocatedAt && shipment.allVariantsCostApplied ? (
                    <CheckCircle className="h-3.5 w-3.5" />
                  ) : shipment.costsAllocatedAt && !shipment.allVariantsCostApplied ? (
                    <Clock className="h-3.5 w-3.5" />
                  ) : (
                    <Circle className="h-3.5 w-3.5" />
                  )}
                  <span>{t('avgLandedCostApplied')}</span>
                </div>
                <DebugLogsDropdown />
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
                  {isAdministrator && (
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        retryInventoryMutation.mutate();
                      }}
                      disabled={retryInventoryMutation.isPending}
                      className="text-blue-600 dark:text-blue-400"
                      data-testid={`menu-item-retry-inventory-${shipment.id}`}
                    >
                      <RefreshCw className={`h-4 w-4 mr-2 ${retryInventoryMutation.isPending ? 'animate-spin' : ''}`} />
                      {retryInventoryMutation.isPending ? t('common:processing') : t('retryInventory')}
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem
                    onClick={handleRevertClick}
                    disabled={revertToReceiveMutation.isPending}
                    data-testid={`menu-item-send-back-${shipment.id}`}
                  >
                    <Undo2 className="h-4 w-4 mr-2" />
                    {t('sendBackToReceive')}
                  </DropdownMenuItem>
                  {isAdministrator && (
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowDeleteConfirm(true);
                      }}
                      disabled={deleteShipmentMutation.isPending}
                      className="text-red-600 dark:text-red-400"
                      data-testid={`menu-item-delete-${shipment.id}`}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      {t('common:delete')}
                    </DropdownMenuItem>
                  )}
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
      
      {isAdministrator && (
        <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('confirmDeleteTitle')}</AlertDialogTitle>
              <AlertDialogDescription>
                {t('confirmDeleteDescription')}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
              <AlertDialogCancel disabled={deleteShipmentMutation.isPending} className="w-full sm:w-auto">
                {t('common:cancel')}
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteShipmentMutation.mutate()}
                disabled={deleteShipmentMutation.isPending}
                className="bg-red-600 hover:bg-red-700 w-full sm:w-auto"
              >
                {deleteShipmentMutation.isPending ? t('common:processing') : t('common:delete')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
      
      <AlertDialog open={showRevertConfirm} onOpenChange={setShowRevertConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('confirmRevertTitle')}</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>{t('confirmRevertDescription')}</p>
              <ul className="list-disc list-inside text-sm space-y-1 mt-2">
                <li>{t('revertWarningInventory')}</li>
                <li>{t('revertWarningCosts')}</li>
                <li>{t('revertWarningPurchaseOrders')}</li>
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
            <AlertDialogCancel disabled={revertToReceiveMutation.isPending} className="w-full sm:w-auto">
              {t('common:cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmRevert}
              disabled={revertToReceiveMutation.isPending}
              className="bg-orange-600 hover:bg-orange-700 w-full sm:w-auto"
            >
              {revertToReceiveMutation.isPending ? t('common:processing') : t('confirmRevert')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

function ArchivedShipmentCard({ shipment, isAdministrator }: { shipment: any; isAdministrator: boolean }) {
  const { t } = useTranslation(['imports']);
  const { toast } = useToast();
  const [isExpanded, setIsExpanded] = useState(true);
  const [showReport, setShowReport] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  const itemCount = shipment.items?.length || 0;

  const deleteShipmentMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/imports/shipments/${shipment.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/imports/shipments/archived'] });
      queryClient.invalidateQueries({ queryKey: ['/api/imports/receipts'] });
      toast({
        title: t('common:deleted'),
        description: t('shipmentDeleted'),
      });
      setShowDeleteConfirm(false);
    },
    onError: (error: Error) => {
      toast({
        title: t('common:error'),
        description: error.message || t('failedToDeleteShipment'),
        variant: "destructive",
      });
    },
  });

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
              {shipment.completedAt && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>{t('archived')} {format(new Date(shipment.completedAt), 'MMM dd, yyyy')}</span>
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
                  {isAdministrator && (
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowDeleteConfirm(true);
                      }}
                      disabled={deleteShipmentMutation.isPending}
                      className="text-red-600 dark:text-red-400"
                      data-testid={`menu-item-delete-${shipment.id}`}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      {t('common:delete')}
                    </DropdownMenuItem>
                  )}
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
      
      {isAdministrator && (
        <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('confirmDeleteTitle')}</AlertDialogTitle>
              <AlertDialogDescription>
                {t('confirmDeleteDescription')}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
              <AlertDialogCancel disabled={deleteShipmentMutation.isPending} className="w-full sm:w-auto">
                {t('common:cancel')}
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteShipmentMutation.mutate()}
                disabled={deleteShipmentMutation.isPending}
                className="bg-red-600 hover:bg-red-700 w-full sm:w-auto"
              >
                {deleteShipmentMutation.isPending ? t('common:processing') : t('common:delete')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </Card>
  );
}

// ============================================================================
// DEBUG LOGS DROPDOWN
// ============================================================================

function DebugLogsDropdown() {
  const { t } = useTranslation(['imports']);
  const [isOpen, setIsOpen] = useState(false);
  
  const { data: debugLogs, refetch } = useQuery<{
    count: number;
    total: number;
    logs: Array<{
      timestamp: string;
      level: 'info' | 'warn' | 'error';
      message: string;
      context?: any;
    }>;
  }>({
    queryKey: ['/api/imports/debug-logs?limit=50'],
    enabled: isOpen,
    refetchInterval: isOpen ? 3000 : false,
  });
  
  const errorCount = debugLogs?.logs?.filter(l => l.level === 'error').length || 0;
  const warnCount = debugLogs?.logs?.filter(l => l.level === 'warn').length || 0;
  
  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <button 
          className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium transition-colors ${
            errorCount > 0 
              ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50' 
              : warnCount > 0 
              ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 hover:bg-amber-200 dark:hover:bg-amber-900/50'
              : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
          }`}
          data-testid="button-debug-logs-dropdown"
        >
          <AlertTriangle className="h-3.5 w-3.5" />
          <span>{t('logs', 'Logs')}</span>
          {(errorCount > 0 || warnCount > 0) && (
            <span className="ml-0.5 bg-white/50 dark:bg-black/30 px-1.5 rounded-full text-[10px]">
              {errorCount > 0 ? errorCount : warnCount}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 max-h-[400px] overflow-hidden flex flex-col">
        <div className="px-3 py-2 border-b flex items-center justify-between">
          <span className="font-semibold text-sm">{t('processingLogs', 'Processing Logs')}</span>
          <div className="flex gap-1">
            {errorCount > 0 && (
              <Badge variant="destructive" className="text-xs">{errorCount} errors</Badge>
            )}
            {warnCount > 0 && (
              <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-400 text-xs">{warnCount} warnings</Badge>
            )}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto max-h-[300px]">
          {!debugLogs?.logs?.length ? (
            <div className="p-4 text-center text-muted-foreground text-sm">
              <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>{t('noLogs', 'No processing logs')}</p>
            </div>
          ) : (
            <div className="p-2 space-y-1.5">
              {debugLogs.logs.slice(0, 20).map((log, idx) => (
                <div
                  key={idx}
                  className={`p-2 rounded text-xs ${
                    log.level === 'error' ? 'bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800' :
                    log.level === 'warn' ? 'bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800' :
                    'bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`font-semibold uppercase text-[10px] ${
                      log.level === 'error' ? 'text-red-600 dark:text-red-400' :
                      log.level === 'warn' ? 'text-amber-600 dark:text-amber-400' :
                      'text-gray-500'
                    }`}>
                      {log.level}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-xs break-words text-foreground">{log.message}</p>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="px-2 py-2 border-t flex gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="flex-1 h-7 text-xs"
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            {t('common:refresh', 'Refresh')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              await fetch('/api/imports/debug-logs', { method: 'DELETE', credentials: 'include' });
              refetch();
            }}
            className="h-7 text-xs text-red-600 hover:text-red-700 border-red-200"
          >
            {t('common:clear', 'Clear')}
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
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
  const [location, navigate] = useLocation();
  const { toast } = useToast();
  const { isAdministrator } = useAuth();
  
  // Parse URL parameters for tab selection
  const urlParams = new URLSearchParams(window.location.search);
  const tabFromUrl = urlParams.get('tab');
  
  const [activeTab, setActiveTab] = useState(() => {
    // Check for tab parameter in URL
    if (tabFromUrl && ['to-receive', 'receiving', 'storage', 'completed', 'archived'].includes(tabFromUrl)) {
      return tabFromUrl;
    }
    return "to-receive";
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [showUnmatchedDialog, setShowUnmatchedDialog] = useState(false);
  const [unmatchedBarcode, setUnmatchedBarcode] = useState("");
  const [filter, setFilter] = useState("all");
  const [processingShipmentIds, setProcessingShipmentIds] = useState<Set<number>>(new Set());
  const [showDebugPanel, setShowDebugPanel] = useState(false);
  const [debugLogLevel, setDebugLogLevel] = useState<'all' | 'info' | 'warn' | 'error'>('all');
  
  // Update tab when URL parameter changes
  useEffect(() => {
    if (tabFromUrl && ['to-receive', 'receiving', 'storage', 'completed', 'archived'].includes(tabFromUrl)) {
      setActiveTab(tabFromUrl);
    }
  }, [tabFromUrl]);
  
  // Ref for tabs container to enable auto-centering
  const tabsListRef = useRef<HTMLDivElement>(null);

  // Fetch shipments data - always refresh on mount for current data
  const { data: toReceiveShipments = [], isLoading: isLoadingToReceive } = useQuery<Shipment[]>({
    queryKey: ['/api/imports/shipments/to-receive'],
    staleTime: 0,
    refetchOnMount: 'always',
  });

  const { data: receivingShipments = [], isLoading: isLoadingReceiving } = useQuery<Shipment[]>({
    queryKey: ['/api/imports/shipments/receiving'],
    staleTime: 0,
    refetchOnMount: 'always',
  });

  const { data: storageShipments = [], isLoading: isLoadingStorage } = useQuery<Shipment[]>({
    queryKey: ['/api/imports/shipments/storage'],
    staleTime: 0,
    refetchOnMount: 'always',
  });

  const { data: completedShipments = [], isLoading: isLoadingCompleted } = useQuery<Shipment[]>({
    queryKey: ['/api/imports/shipments/completed'],
    staleTime: 0,
    refetchOnMount: 'always',
  });

  const { data: archivedShipments = [], isLoading: isLoadingArchived } = useQuery<Shipment[]>({
    queryKey: ['/api/imports/shipments/archived'],
    staleTime: 0,
    refetchOnMount: 'always',
  });

  // Fetch all shipments to find in-transit ones with tracking issues
  const { data: allShipments = [], isLoading: isLoadingAllShipments } = useQuery<Shipment[]>({
    queryKey: ['/api/imports/shipments'],
    staleTime: 0,
    refetchOnMount: 'always',
  });

  // Filter for in-transit shipments with tracking issues (no tracking, failed, or unknown status)
  // Excludes direct PO shipments which now appear in the main To Receive section
  const inTransitWithIssues = useMemo(() => {
    return allShipments.filter((s: any) => {
      // Only in-transit shipments
      if (s.status !== 'in transit') return false;
      
      // Exclude direct PO shipments - they appear in main To Receive section with countdown
      const isDirectPO = !s.consolidationId && s.notes?.includes('Auto-created from Purchase Order');
      if (isDirectPO) return false;
      
      // Check for tracking issues:
      // 1. No end tracking number
      const hasNoEndTracking = !s.endTrackingNumber && (!s.endTrackingNumbers || s.endTrackingNumbers.length === 0);
      
      // 2. Failed/unknown tracking status from EasyPost or 17Track
      const failedTrackingStatus = ['NotFound', 'Unknown', 'Expired', 'error', 'failure'].includes(s.easypostStatus || '') ||
                                   ['NotFound', 'Unknown', 'Expired', 'error'].includes(s.track17Status || '');
      
      // 3. No internal tracking number
      const hasNoInternalTracking = !s.trackingNumber;
      
      return hasNoEndTracking || failedTrackingStatus || hasNoInternalTracking;
    });
  }, [allShipments]);

  const { data: receipts = [], isLoading: isLoadingReceipts } = useQuery<Receipt[]>({
    queryKey: ['/api/imports/receipts'],
  });

  // Fetch recently approved receipts (last 7 days)
  const { data: recentReceipts = [] } = useQuery<Receipt[]>({
    queryKey: ['/api/imports/receipts/recent'],
  });

  // Fetch debug logs when panel is open - uses default fetcher with query params
  const debugLogUrl = debugLogLevel === 'all' 
    ? '/api/imports/debug-logs' 
    : `/api/imports/debug-logs?level=${debugLogLevel}`;
  const { data: debugLogsData, refetch: refetchDebugLogs } = useQuery<{
    count: number;
    total: number;
    filteredTotal: number;
    logs: Array<{
      timestamp: string;
      level: 'info' | 'warn' | 'error';
      message: string;
      context?: any;
    }>;
  }>({
    queryKey: [debugLogUrl],
    enabled: showDebugPanel,
    refetchInterval: showDebugPanel ? 2000 : false,
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

  // Handle clicking on compact stat tabs - switch tab and scroll to content
  const handleStatTabClick = useCallback((tabValue: string) => {
    setActiveTab(tabValue);
    // Scroll to tab content after a brief delay to let the DOM update
    setTimeout(() => {
      if (tabsListRef.current) {
        tabsListRef.current.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }
    }, 100);
  }, []);

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
          description: t('addedProduct', { name: product.name }),
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
          description: t('barcodeNotFoundInDatabase', { barcode }),
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

  const isLoading = isLoadingToReceive || isLoadingReceiving || isLoadingStorage || isLoadingCompleted || isLoadingReceipts;

  // Calculate stats
  const totalItems = useMemo(() => {
    return toReceiveShipments.reduce((sum: number, s: any) => 
      sum + (s.items?.reduce((itemSum: number, item: any) => itemSum + (item.quantity || 0), 0) || 0), 0) +
      receivingShipments.reduce((sum: number, s: any) => 
      sum + (s.items?.reduce((itemSum: number, item: any) => itemSum + (item.quantity || 0), 0) || 0), 0);
  }, [toReceiveShipments, receivingShipments]);

  // Filter active receipts - only show truly in-progress receipts
  // Exclude completed, archived, and receipts where all items are fully received
  const activeReceipts = useMemo(() => 
    receipts.filter((r: any) => {
      // Only include receiving or pending_verification status
      if (r.status !== 'pending_verification' && r.status !== 'receiving') {
        return false;
      }
      
      // Check if all items have been fully received (progress = 100%)
      const items = r.items || [];
      if (items.length === 0) return true; // Show if no items yet
      
      const totalQuantity = items.reduce((sum: number, item: any) => 
        sum + (item.expectedQuantity || item.quantity || 0), 0);
      const receivedQuantity = items.reduce((sum: number, item: any) => 
        sum + (item.receivedQuantity || 0), 0);
      
      // Hide if 100% received - these should be in archived/completed
      if (totalQuantity > 0 && receivedQuantity >= totalQuantity) {
        return false;
      }
      
      return true;
    }),
    [receipts]
  );

  return (
    <ReceivingSessionProvider>
      <div className="flex flex-col min-h-screen overflow-x-hidden">
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

            {/* Quick Stats Navigation Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              <button 
                onClick={() => handleStatTabClick('to-receive')}
                className={`group relative bg-blue-50 dark:bg-blue-950/40 rounded-xl p-4 text-center transition-colors ${
                  activeTab === 'to-receive' 
                    ? 'border-2 border-blue-500 dark:border-blue-400' 
                    : 'border border-blue-200 dark:border-blue-800 hover:border-blue-400'
                }`}
                data-testid="stat-to-receive"
              >
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Package className="h-5 w-5 text-blue-500 dark:text-blue-400" />
                  <span className="text-xs font-medium text-blue-600 dark:text-blue-300 uppercase tracking-wide">{t('toReceive')}</span>
                </div>
                <div className="text-4xl sm:text-5xl font-black text-blue-600 dark:text-blue-400 tabular-nums">
                  {isLoadingToReceive ? <Skeleton className="h-12 w-16 mx-auto bg-blue-200 dark:bg-blue-700" /> : toReceiveShipments.length}
                </div>
                <div className="mt-2 flex items-center justify-center gap-1 text-xs text-blue-500 dark:text-blue-400">
                  <span>{t('common:viewAll', 'View')}</span>
                  <ChevronRight className="h-3 w-3" />
                </div>
              </button>
              <button 
                onClick={() => handleStatTabClick('receiving')}
                className={`group relative bg-cyan-50 dark:bg-cyan-950/40 rounded-xl p-4 text-center transition-colors ${
                  activeTab === 'receiving' 
                    ? 'border-2 border-cyan-500 dark:border-cyan-400' 
                    : 'border border-cyan-200 dark:border-cyan-800 hover:border-cyan-400'
                }`}
                data-testid="stat-receiving"
              >
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Clock className="h-5 w-5 text-cyan-500 dark:text-cyan-400" />
                  <span className="text-xs font-medium text-cyan-600 dark:text-cyan-300 uppercase tracking-wide">{t('inProgressReceiving')}</span>
                </div>
                <div className="text-4xl sm:text-5xl font-black text-cyan-600 dark:text-cyan-400 tabular-nums">
                  {isLoadingReceiving ? <Skeleton className="h-12 w-16 mx-auto bg-cyan-200 dark:bg-cyan-700" /> : receivingShipments.length}
                </div>
                <div className="mt-2 flex items-center justify-center gap-1 text-xs text-cyan-500 dark:text-cyan-400">
                  <span>{t('common:viewAll', 'View')}</span>
                  <ChevronRight className="h-3 w-3" />
                </div>
              </button>
              <button 
                onClick={() => handleStatTabClick('storage')}
                className={`group relative bg-amber-50 dark:bg-amber-950/40 rounded-xl p-4 text-center transition-colors ${
                  activeTab === 'storage' 
                    ? 'border-2 border-amber-500 dark:border-amber-400' 
                    : 'border border-amber-200 dark:border-amber-800 hover:border-amber-400'
                }`}
                data-testid="stat-storage"
              >
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Warehouse className="h-5 w-5 text-amber-500 dark:text-amber-400" />
                  <span className="text-xs font-medium text-amber-600 dark:text-amber-300 uppercase tracking-wide">{t('storage')}</span>
                </div>
                <div className="text-4xl sm:text-5xl font-black text-amber-600 dark:text-amber-400 tabular-nums">
                  {isLoadingStorage ? <Skeleton className="h-12 w-16 mx-auto bg-amber-200 dark:bg-amber-700" /> : storageShipments.length}
                </div>
                <div className="mt-2 flex items-center justify-center gap-1 text-xs text-amber-500 dark:text-amber-400">
                  <span>{t('common:viewAll', 'View')}</span>
                  <ChevronRight className="h-3 w-3" />
                </div>
              </button>
              <button 
                onClick={() => handleStatTabClick('completed')}
                className={`group relative bg-green-50 dark:bg-green-950/40 rounded-xl p-4 text-center transition-colors ${
                  activeTab === 'completed' 
                    ? 'border-2 border-green-500 dark:border-green-400' 
                    : 'border border-green-200 dark:border-green-800 hover:border-green-400'
                }`}
                data-testid="stat-completed"
              >
                <div className="flex items-center justify-center gap-2 mb-2">
                  <CheckCircle className="h-5 w-5 text-green-500 dark:text-green-400" />
                  <span className="text-xs font-medium text-green-600 dark:text-green-300 uppercase tracking-wide">{t('completed')}</span>
                </div>
                <div className="text-4xl sm:text-5xl font-black text-green-600 dark:text-green-400 tabular-nums">
                  {isLoadingCompleted ? <Skeleton className="h-12 w-16 mx-auto bg-green-200 dark:bg-green-700" /> : completedShipments.length}
                </div>
                <div className="mt-2 flex items-center justify-center gap-1 text-xs text-green-500 dark:text-green-400">
                  <span>{t('common:viewAll', 'View')}</span>
                  <ChevronRight className="h-3 w-3" />
                </div>
              </button>
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
                      <Badge variant="secondary" className="ml-2 bg-background/20 min-w-[24px] justify-center">
                        {isLoadingToReceive ? <Loader2 className="h-3 w-3 animate-spin" /> : toReceiveShipments.length}
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
                      <Badge variant="secondary" className="ml-2 bg-background/20 min-w-[24px] justify-center">
                        {isLoadingReceiving ? <Loader2 className="h-3 w-3 animate-spin" /> : receivingShipments.length}
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
                      <Badge variant="secondary" className="ml-2 bg-background/20 min-w-[24px] justify-center">
                        {isLoadingStorage ? <Loader2 className="h-3 w-3 animate-spin" /> : storageShipments.length}
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
                      <Badge variant="secondary" className="ml-2 bg-background/20 min-w-[24px] justify-center">
                        {isLoadingCompleted ? <Loader2 className="h-3 w-3 animate-spin" /> : completedShipments.length}
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
                      <Badge variant="secondary" className="ml-2 bg-background/20 min-w-[24px] justify-center">
                        {isLoadingArchived ? <Loader2 className="h-3 w-3 animate-spin" /> : (archivedShipments as any[]).reduce((sum, group) => sum + (group.count || group.shipments?.length || 0), 0)}
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
                        <ToReceiveShipmentCard key={shipment.id} shipment={shipment} isAdministrator={isAdministrator} />
                      ))
                    )}
                    
                    {/* In Transit Shipments with Tracking Issues */}
                    {inTransitWithIssues.length > 0 && (
                      <div className="mt-6 pt-6 border-t">
                        <div className="flex items-center gap-2 mb-4">
                          <AlertTriangle className="h-5 w-5 text-amber-500" />
                          <h3 className="text-sm font-semibold text-amber-600 dark:text-amber-400">
                            {t('inTransitTrackingIssues')} ({inTransitWithIssues.length})
                          </h3>
                        </div>
                        <p className="text-xs text-muted-foreground mb-4">{t('inTransitTrackingIssuesDesc')}</p>
                        <div className="space-y-3">
                          {inTransitWithIssues.map((shipment: any) => {
                            const itemCount = shipment.items?.length || 0;
                            const totalQuantity = shipment.items?.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0) || 0;
                            const hasNoEndTracking = !shipment.endTrackingNumber && (!shipment.endTrackingNumbers || shipment.endTrackingNumbers.length === 0);
                            const hasNoInternalTracking = !shipment.trackingNumber;
                            
                            return (
                              <Card key={shipment.id} className="border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20">
                                <CardContent className="p-3">
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 mb-1">
                                        <Truck className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                                        <span className="font-medium text-sm truncate">
                                          {shipment.shipmentName || t('shipmentNumber', { number: shipment.id })}
                                        </span>
                                      </div>
                                      <div className="space-y-1 text-xs text-muted-foreground">
                                        <div className="flex items-center gap-2">
                                          <Package className="h-3 w-3" />
                                          <span>{itemCount} {t('items')} ({totalQuantity} {t('units')})</span>
                                        </div>
                                        {shipment.endCarrier && (
                                          <div className="flex items-center gap-2">
                                            <Truck className="h-3 w-3" />
                                            <span>{shipment.endCarrier}</span>
                                          </div>
                                        )}
                                        {(shipment.endTrackingNumber || shipment.endTrackingNumbers?.[0]) && (
                                          <div className="flex items-center gap-2">
                                            <Package2 className="h-3 w-3" />
                                            <span className="font-mono">{shipment.endTrackingNumbers?.[0] || shipment.endTrackingNumber}</span>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                    <div className="flex flex-col items-end gap-2">
                                      <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-100/50 text-xs">
                                        {hasNoEndTracking && hasNoInternalTracking 
                                          ? t('noTrackingInfo')
                                          : t('trackingFailed')
                                        }
                                      </Badge>
                                      {processingShipmentIds.has(shipment.id) ? (
                                        <Badge variant="outline" className="text-blue-600 border-blue-300 bg-blue-100/50 text-xs animate-pulse">
                                          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                          {t('receiving')}...
                                        </Badge>
                                      ) : (
                                        <Button
                                          size="sm"
                                          className="h-7 text-xs bg-green-600 hover:bg-green-700 text-white"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setProcessingShipmentIds(prev => new Set(prev).add(shipment.id));
                                            navigate(`/receiving/start/${shipment.id}`);
                                          }}
                                          data-testid={`button-receive-now-${shipment.id}`}
                                        >
                                          <ScanLine className="h-3 w-3 mr-1" />
                                          {t('receiveNow')}
                                        </Button>
                                      )}
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            );
                          })}
                        </div>
                      </div>
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
                        <ReceivingShipmentCard key={shipment.id} shipment={shipment} isAdministrator={isAdministrator} />
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
                        <StorageShipmentCard key={shipment.id} shipment={shipment} isAdministrator={isAdministrator} />
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
                        <CompletedShipmentCard key={shipment.id} shipment={shipment} isAdministrator={isAdministrator} />
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
                      (archivedShipments as any[]).map((weekGroup: any) => (
                        <div key={weekGroup.week} className="space-y-3">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground px-1">
                            <Calendar className="h-4 w-4" />
                            <span className="font-medium">{weekGroup.week}</span>
                            <span>({weekGroup.count || weekGroup.shipments?.length || 0} {t('shipments')})</span>
                          </div>
                          {weekGroup.shipments?.map((shipment: any) => (
                            <ArchivedShipmentCard key={shipment.id} shipment={shipment} isAdministrator={isAdministrator} />
                          ))}
                        </div>
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
            <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setShowUnmatchedDialog(false)} className="w-full sm:w-auto">
                Cancel
              </Button>
              <Button onClick={() => setShowUnmatchedDialog(false)} className="w-full sm:w-auto">
                Match Product
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Debug Panel Button - Fixed bottom-right */}
        {isAdministrator && (
          <Button
            variant="outline"
            size="icon"
            className="fixed bottom-20 right-4 z-50 h-10 w-10 rounded-full bg-gray-900 text-white border-gray-700 hover:bg-gray-800 shadow-lg"
            onClick={() => setShowDebugPanel(true)}
            data-testid="button-debug-panel"
          >
            <AlertTriangle className="h-4 w-4" />
          </Button>
        )}

        {/* Debug Panel Sheet */}
        <Sheet open={showDebugPanel} onOpenChange={setShowDebugPanel}>
          <SheetContent side="bottom" className="h-[70vh] overflow-hidden flex flex-col">
            <SheetHeader className="pb-4 border-b">
              <SheetTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                Debug Logs - Receiving Operations
                {debugLogsData && (
                  <Badge variant="outline" className="ml-auto">
                    {debugLogsData.count} / {debugLogsData.total} logs
                  </Badge>
                )}
              </SheetTitle>
            </SheetHeader>
            
            {/* Log Level Filter */}
            <div className="flex gap-1 py-3 border-b">
              {(['all', 'error', 'warn', 'info'] as const).map((level) => (
                <Button
                  key={level}
                  variant={debugLogLevel === level ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setDebugLogLevel(level)}
                  className={`text-xs ${
                    level === 'error' ? 'border-red-200 hover:border-red-400' :
                    level === 'warn' ? 'border-amber-200 hover:border-amber-400' :
                    level === 'info' ? 'border-blue-200 hover:border-blue-400' : ''
                  } ${debugLogLevel === level && level === 'error' ? 'bg-red-600 hover:bg-red-700' : ''} ${debugLogLevel === level && level === 'warn' ? 'bg-amber-600 hover:bg-amber-700' : ''} ${debugLogLevel === level && level === 'info' ? 'bg-blue-600 hover:bg-blue-700' : ''}`}
                >
                  {level === 'all' ? 'All' : level.charAt(0).toUpperCase() + level.slice(1)}
                </Button>
              ))}
            </div>
            
            <div className="flex-1 overflow-y-auto mt-4 space-y-2">
              {!debugLogsData?.logs?.length ? (
                <div className="text-center py-8 text-muted-foreground">
                  <AlertTriangle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No debug logs available</p>
                  <p className="text-xs">Logs will appear here during receiving operations</p>
                </div>
              ) : (
                debugLogsData.logs.map((log, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-lg text-sm font-mono ${
                      log.level === 'error' ? 'bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800' :
                      log.level === 'warn' ? 'bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800' :
                      'bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <span className={`text-xs font-semibold uppercase ${
                        log.level === 'error' ? 'text-red-600 dark:text-red-400' :
                        log.level === 'warn' ? 'text-amber-600 dark:text-amber-400' :
                        'text-gray-600 dark:text-gray-400'
                      }`}>
                        {log.level}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="mt-1 text-xs break-all">{log.message}</div>
                    {log.context && (
                      <details className="mt-2">
                        <summary className="text-xs text-muted-foreground cursor-pointer">Context</summary>
                        <pre className="mt-1 text-xs overflow-x-auto bg-black/5 dark:bg-white/5 p-2 rounded">
                          {JSON.stringify(log.context, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                ))
              )}
            </div>
            
            <div className="pt-4 border-t flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetchDebugLogs()}
                className="flex-1"
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                Refresh
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  await fetch('/api/imports/debug-logs', { method: 'DELETE', credentials: 'include' });
                  refetchDebugLogs();
                }}
                className="text-red-600 hover:text-red-700 border-red-200 hover:border-red-300"
              >
                Clear Logs
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={() => setShowDebugPanel(false)}
              >
                Close
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </ReceivingSessionProvider>
  );
}
