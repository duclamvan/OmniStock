import { useState, useEffect, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useIsMobile } from "@/hooks/use-mobile";
import { useSettings } from "@/contexts/SettingsContext";
import { Plus, Minus, Package, AlertCircle, Barcode, ScanLine } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ProductLocation {
  id: string;
  productId: string;
  locationCode: string;
  quantity: number;
  isPrimary: boolean;
  notes?: string;
}

interface StockAdjustmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productId: string;
  productName: string;
  location: ProductLocation | null;
  onSuccess?: () => void;
  initialValues?: {
    type: 'add' | 'remove';
    quantity: number;
    reason: string;
  };
  onValuesChange?: (values: { type: 'add' | 'remove'; quantity: number; reason: string }) => void;
}

export default function StockAdjustmentDialog({
  open,
  onOpenChange,
  productId,
  productName,
  location,
  onSuccess,
  initialValues,
  onValuesChange,
}: StockAdjustmentDialogProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const { inventorySettings } = useSettings();
  const approvalRequired = inventorySettings.stockAdjustmentApprovalRequired ?? true;
  const [adjustmentType, setAdjustmentType] = useState<"set" | "increment" | "decrement">("set");
  const [newQuantity, setNewQuantity] = useState(0);
  const [adjustmentAmount, setAdjustmentAmount] = useState(0);
  const [notes, setNotes] = useState("");
  const [barcodeScanMode, setBarcodeScanMode] = useState(false);
  const [barcodeInput, setBarcodeInput] = useState("");
  const [scanCount, setScanCount] = useState(0);
  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const notesInputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open && location) {
      setNewQuantity(location.quantity);
      setBarcodeScanMode(false);
      setBarcodeInput("");
      setScanCount(0);
      
      // Use initial values if provided
      if (initialValues) {
        if (initialValues.type === 'add') {
          setAdjustmentType("increment");
          setAdjustmentAmount(initialValues.quantity);
        } else {
          setAdjustmentType("decrement");
          setAdjustmentAmount(initialValues.quantity);
        }
        setNotes(initialValues.reason);
      } else {
        setAdjustmentAmount(0);
        setAdjustmentType("set");
        setNotes("");
      }
    }
  }, [open, location, initialValues]);

  // Auto-focus barcode input when scan mode is enabled
  useEffect(() => {
    if (barcodeScanMode && barcodeInputRef.current) {
      barcodeInputRef.current.focus();
    }
  }, [barcodeScanMode]);

  // Auto-focus notes textarea when dialog opens
  useEffect(() => {
    if (open && !barcodeScanMode && notesInputRef.current) {
      // Small delay to ensure the dialog is fully rendered
      const timer = setTimeout(() => {
        notesInputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [open, barcodeScanMode]);

  const createRequestMutation = useMutation({
    mutationFn: async (data: { 
      productId: string;
      locationId: string;
      requestedBy: string;
      adjustmentType: 'add' | 'remove' | 'set';
      currentQuantity: number;
      requestedQuantity: number;
      reason: string;
    }) => {
      return await apiRequest(
        'POST',
        '/api/stock-adjustment-requests',
        data
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/products/${productId}/locations`] });
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stock-adjustment-requests'] });
      toast({
        title: t('warehouse:requestSubmitted'),
        description: t('warehouse:requestSubmittedDesc'),
      });
      onOpenChange(false);
      setNewQuantity(0);
      setAdjustmentAmount(0);
      setNotes("");
      onSuccess?.();
    },
    onError: (error: any) => {
      toast({
        title: t('common:error'),
        description: error.message || t('warehouse:failedToCreateRequest'),
        variant: "destructive",
      });
    },
  });

  const directAdjustmentMutation = useMutation({
    mutationFn: async (data: {
      productId: string;
      locationId: string;
      adjustmentType: 'add' | 'remove' | 'set';
      quantity: number;
      reason: string;
    }) => {
      return await apiRequest(
        'POST',
        '/api/stock/direct-adjustment',
        data
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/products/${productId}/locations`] });
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stock-adjustment-requests'] });
      toast({
        title: t('warehouse:stockUpdated'),
        description: t('warehouse:stockUpdatedDesc'),
      });
      onOpenChange(false);
      setNewQuantity(0);
      setAdjustmentAmount(0);
      setNotes("");
      onSuccess?.();
    },
    onError: (error: any) => {
      toast({
        title: t('common:error'),
        description: error.message || t('warehouse:failedToAdjustStock'),
        variant: "destructive",
      });
    },
  });

  const handleAdjustStock = () => {
    if (!location) {
      toast({
        title: t('common:error'),
        description: t('warehouse:noLocationSelected'),
        variant: "destructive",
      });
      return;
    }

    if (!notes || notes.trim() === "") {
      toast({
        title: t('common:error'),
        description: t('warehouse:pleaseProvideReason'),
        variant: "destructive",
      });
      return;
    }

    let finalQuantity = 0;
    let backendAdjustmentType: 'add' | 'remove' | 'set' = 'set';

    switch (adjustmentType) {
      case "set":
        finalQuantity = newQuantity;
        backendAdjustmentType = 'set';
        break;
      case "increment":
        finalQuantity = adjustmentAmount;
        backendAdjustmentType = 'add';
        break;
      case "decrement":
        finalQuantity = adjustmentAmount;
        backendAdjustmentType = 'remove';
        break;
    }

    const calculatedFinalQuantity = calculateFinalQuantity();
    if (calculatedFinalQuantity < 0) {
      toast({
        title: t('common:error'),
        description: t('warehouse:quantityCannotBeNegative'),
        variant: "destructive",
      });
      return;
    }

    // Save the adjustment values for next time
    if (onValuesChange && (backendAdjustmentType === 'add' || backendAdjustmentType === 'remove')) {
      onValuesChange({
        type: backendAdjustmentType,
        quantity: finalQuantity,
        reason: notes,
      });
    }

    // Use direct adjustment if approval is not required
    if (!approvalRequired) {
      directAdjustmentMutation.mutate({
        productId,
        locationId: location.id,
        adjustmentType: backendAdjustmentType,
        quantity: finalQuantity,
        reason: notes,
      });
    } else {
      // Backend will automatically set requestedBy from authenticated user
      createRequestMutation.mutate({
        productId,
        locationId: location.id,
        adjustmentType: backendAdjustmentType,
        currentQuantity: location.quantity,
        requestedQuantity: finalQuantity,
        reason: notes,
      });
    }
  };

  const calculateFinalQuantity = () => {
    if (!location) return 0;

    switch (adjustmentType) {
      case "set":
        return newQuantity;
      case "increment":
        return location.quantity + adjustmentAmount;
      case "decrement":
        return location.quantity - adjustmentAmount;
      default:
        return location.quantity;
    }
  };

  const handleBarcodeScan = () => {
    if (!barcodeInput.trim()) return;
    
    // Increment the count and adjustment amount
    setScanCount(prev => prev + 1);
    setAdjustmentAmount(prev => prev + 1);
    setBarcodeInput(""); // Clear for next scan
    
    // Show success feedback
    toast({
      title: t('warehouse:itemScanned'),
      description: t('warehouse:totalItems', { count: scanCount + 1 }),
      duration: 1000,
    });
    
    // Refocus the barcode input
    setTimeout(() => {
      barcodeInputRef.current?.focus();
    }, 50);
  };

  const handleBarcodeKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleBarcodeScan();
    }
  };

  const finalQuantity = calculateFinalQuantity();
  const isValid = finalQuantity >= 0;

  const content = (
    <div className="space-y-4 py-4">
      {location && (
        <>
          <div className="space-y-2">
            <Label className="text-xs text-gray-600 dark:text-gray-400">
              {t('warehouse:location')}
            </Label>
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
              <p className="text-sm font-medium text-gray-900 dark:text-white font-mono">
                {location.locationCode}
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                {t('warehouse:currentStockUnits', { quantity: location.quantity })}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="adjustment-type" className="text-xs">
              {t('warehouse:adjustmentTypeRequired')}
            </Label>
            <Select
              value={adjustmentType}
              onValueChange={(value: any) => setAdjustmentType(value)}
              disabled={createRequestMutation.isPending}
            >
              <SelectTrigger id="adjustment-type" data-testid="select-adjustment-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="set" data-testid="option-set">
                  <div className="flex items-center gap-2">
                    <Package className="h-3 w-3" />
                    <span>{t('warehouse:setQuantity')}</span>
                  </div>
                </SelectItem>
                <SelectItem value="increment" data-testid="option-increment">
                  <div className="flex items-center gap-2">
                    <Plus className="h-3 w-3" />
                    <span>{t('warehouse:addStock')}</span>
                  </div>
                </SelectItem>
                <SelectItem value="decrement" data-testid="option-decrement">
                  <div className="flex items-center gap-2">
                    <Minus className="h-3 w-3" />
                    <span>{t('warehouse:reduceStock')}</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {adjustmentType === "set" && (
            <div className="space-y-2">
              <Label htmlFor="new-quantity" className="text-xs">
                {t('warehouse:newQuantityRequired')}
              </Label>
              <Input
                id="new-quantity"
                type="number"
                min={0}
                value={newQuantity}
                onChange={(e) => setNewQuantity(parseInt(e.target.value) || 0)}
                disabled={createRequestMutation.isPending}
                data-testid="input-new-quantity"
              />
            </div>
          )}

          {(adjustmentType === "increment" || adjustmentType === "decrement") && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="adjustment-amount" className="text-xs">
                  {adjustmentType === "increment" ? t('warehouse:amountToAdd') : t('warehouse:amountToReduce')} *
                </Label>
                {adjustmentType === "increment" && (
                  <Button
                    type="button"
                    variant={barcodeScanMode ? "default" : "outline"}
                    size="sm"
                    onClick={() => setBarcodeScanMode(!barcodeScanMode)}
                    className="h-7 text-xs"
                    data-testid="button-toggle-barcode-scan"
                  >
                    <Barcode className="h-3.5 w-3.5 mr-1" />
                    {barcodeScanMode ? t('warehouse:scanning') : t('warehouse:scan')}
                  </Button>
                )}
              </div>
              
              {barcodeScanMode ? (
                <div className="space-y-2">
                  <div className="relative">
                    <ScanLine className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-blue-600 dark:text-blue-400" />
                    <Input
                      ref={barcodeInputRef}
                      type="text"
                      placeholder={t('warehouse:scanBarcodeOrEnter')}
                      value={barcodeInput}
                      onChange={(e) => setBarcodeInput(e.target.value)}
                      onKeyPress={handleBarcodeKeyPress}
                      disabled={createRequestMutation.isPending}
                      className="pl-10 border-blue-300 focus:border-blue-500 dark:border-blue-700 dark:focus:border-blue-500"
                      data-testid="input-barcode-scan-adjust"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400">
                      <div className="h-2 w-2 rounded-full bg-blue-600 dark:bg-blue-400 animate-pulse"></div>
                      <span>{t('warehouse:readyToScan')}</span>
                    </div>
                    <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                      {scanCount} {t('warehouse:scans')}
                    </Badge>
                  </div>
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-600 dark:text-gray-400">{t('warehouse:totalItemsToAdd')}</span>
                      <span className="text-sm font-bold text-blue-600 dark:text-blue-400">{adjustmentAmount}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <Input
                  id="adjustment-amount"
                  type="number"
                  min={0}
                  value={adjustmentAmount}
                  onChange={(e) => setAdjustmentAmount(parseInt(e.target.value) || 0)}
                  disabled={createRequestMutation.isPending}
                  data-testid="input-adjustment-amount"
                />
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="adjustment-notes" className="text-xs">
              {t('warehouse:reasonForAdjustmentRequired')}
            </Label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {[
                { key: 'move', label: t('warehouse:adjustmentReasonMove'), icon: '📦' },
                { key: 'missing', label: t('warehouse:adjustmentReasonMissing'), icon: '❓' },
                { key: 'damaged', label: t('warehouse:adjustmentReasonDamaged'), icon: '💔' },
                { key: 'found', label: t('warehouse:adjustmentReasonFound'), icon: '✅' },
                { key: 'correction', label: t('warehouse:adjustmentReasonCorrection'), icon: '🔧' },
              ].map((preset) => (
                <Button
                  key={preset.key}
                  type="button"
                  variant={notes.toLowerCase().includes(preset.key) ? "default" : "outline"}
                  size="sm"
                  className="h-7 text-xs px-2"
                  onClick={() => setNotes(preset.label)}
                  disabled={createRequestMutation.isPending}
                  data-testid={`button-reason-${preset.key}`}
                >
                  <span className="mr-1">{preset.icon}</span>
                  {preset.label}
                </Button>
              ))}
            </div>
            <Textarea
              ref={notesInputRef}
              id="adjustment-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t('warehouse:reasonPlaceholder')}
              disabled={createRequestMutation.isPending}
              data-testid="input-adjustment-notes"
              className="h-16"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {t('warehouse:requestWillBeSentForApproval')}
            </p>
          </div>

          <div className={`rounded-lg p-3 space-y-1 ${isValid ? 'bg-blue-50 dark:bg-blue-900/20' : 'bg-red-50 dark:bg-red-900/20'}`}>
            <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
              <Package className="h-3 w-3" />
              <span>{t('warehouse:productLabel', { name: productName })}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-600 dark:text-gray-400">
                {t('warehouse:currentLabel', { quantity: location.quantity })}
              </span>
              <span className={`text-sm font-semibold ${isValid ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400'}`}>
                {t('warehouse:newLabel', { quantity: finalQuantity })}
              </span>
            </div>
            {!isValid && (
              <div className="flex items-center gap-2 text-xs text-red-600 dark:text-red-400 mt-2">
                <AlertCircle className="h-3 w-3" />
                <span>{t('warehouse:quantityCannotBeNegative')}</span>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );

  const footer = (
    <>
      <Button
        variant="outline"
        onClick={() => onOpenChange(false)}
        disabled={createRequestMutation.isPending}
        data-testid="button-cancel-adjust"
      >
        {t('common:cancel')}
      </Button>
      <Button
        onClick={handleAdjustStock}
        disabled={!isValid || createRequestMutation.isPending || !notes.trim()}
        data-testid="button-confirm-adjust"
      >
        {createRequestMutation.isPending ? t('warehouse:submitting') : t('warehouse:submitRequest')}
      </Button>
    </>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>{t('warehouse:requestStockAdjustment')}</DrawerTitle>
            <DrawerDescription>
              {t('warehouse:requestStockAdjustmentDesc')}
            </DrawerDescription>
          </DrawerHeader>
          <div className="px-4">{content}</div>
          <DrawerFooter className="flex-row gap-2">{footer}</DrawerFooter>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('warehouse:requestStockAdjustment')}</DialogTitle>
          <DialogDescription>
            {t('warehouse:requestStockAdjustmentDesc')}
          </DialogDescription>
        </DialogHeader>
        {content}
        <DialogFooter>{footer}</DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
