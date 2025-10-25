import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
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
import { Plus, Minus, Package, AlertCircle } from "lucide-react";
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
}

export default function StockAdjustmentDialog({
  open,
  onOpenChange,
  productId,
  productName,
  location,
  onSuccess,
}: StockAdjustmentDialogProps) {
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [adjustmentType, setAdjustmentType] = useState<"set" | "increment" | "decrement">("set");
  const [newQuantity, setNewQuantity] = useState(0);
  const [adjustmentAmount, setAdjustmentAmount] = useState(0);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (open && location) {
      setNewQuantity(location.quantity);
      setAdjustmentAmount(0);
      setAdjustmentType("set");
      setNotes("");
    }
  }, [open, location]);

  const updateLocationMutation = useMutation({
    mutationFn: async (data: { updates: any }) => {
      if (!location) throw new Error("No location selected");
      return await apiRequest(
        'PATCH',
        `/api/products/${productId}/locations/${location.id}`,
        data.updates
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/products/${productId}/locations`] });
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      toast({
        title: "Success",
        description: "Stock adjusted successfully",
      });
      onOpenChange(false);
      setNewQuantity(0);
      setAdjustmentAmount(0);
      setNotes("");
      onSuccess?.();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to adjust stock",
        variant: "destructive",
      });
    },
  });

  const handleAdjustStock = () => {
    if (!location) {
      toast({
        title: "Error",
        description: "No location selected",
        variant: "destructive",
      });
      return;
    }

    let finalQuantity = 0;

    switch (adjustmentType) {
      case "set":
        finalQuantity = newQuantity;
        break;
      case "increment":
        finalQuantity = location.quantity + adjustmentAmount;
        break;
      case "decrement":
        finalQuantity = location.quantity - adjustmentAmount;
        break;
    }

    if (finalQuantity < 0) {
      toast({
        title: "Error",
        description: "Quantity cannot be negative",
        variant: "destructive",
      });
      return;
    }

    updateLocationMutation.mutate({
      updates: {
        quantity: finalQuantity,
        notes: notes || location.notes,
      },
    });
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

  const finalQuantity = calculateFinalQuantity();
  const isValid = finalQuantity >= 0;

  const content = (
    <div className="space-y-4 py-4">
      {location && (
        <>
          <div className="space-y-2">
            <Label className="text-xs text-gray-600 dark:text-gray-400">
              Location
            </Label>
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
              <p className="text-sm font-medium text-gray-900 dark:text-white font-mono">
                {location.locationCode}
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                Current Stock: {location.quantity} units
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="adjustment-type" className="text-xs">
              Adjustment Type *
            </Label>
            <Select
              value={adjustmentType}
              onValueChange={(value: any) => setAdjustmentType(value)}
              disabled={updateLocationMutation.isPending}
            >
              <SelectTrigger id="adjustment-type" data-testid="select-adjustment-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="set" data-testid="option-set">
                  <div className="flex items-center gap-2">
                    <Package className="h-3 w-3" />
                    <span>Set Quantity</span>
                  </div>
                </SelectItem>
                <SelectItem value="increment" data-testid="option-increment">
                  <div className="flex items-center gap-2">
                    <Plus className="h-3 w-3" />
                    <span>Add Stock</span>
                  </div>
                </SelectItem>
                <SelectItem value="decrement" data-testid="option-decrement">
                  <div className="flex items-center gap-2">
                    <Minus className="h-3 w-3" />
                    <span>Reduce Stock</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {adjustmentType === "set" && (
            <div className="space-y-2">
              <Label htmlFor="new-quantity" className="text-xs">
                New Quantity *
              </Label>
              <Input
                id="new-quantity"
                type="number"
                min={0}
                value={newQuantity}
                onChange={(e) => setNewQuantity(parseInt(e.target.value) || 0)}
                disabled={updateLocationMutation.isPending}
                data-testid="input-new-quantity"
              />
            </div>
          )}

          {(adjustmentType === "increment" || adjustmentType === "decrement") && (
            <div className="space-y-2">
              <Label htmlFor="adjustment-amount" className="text-xs">
                {adjustmentType === "increment" ? "Amount to Add" : "Amount to Reduce"} *
              </Label>
              <Input
                id="adjustment-amount"
                type="number"
                min={0}
                value={adjustmentAmount}
                onChange={(e) => setAdjustmentAmount(parseInt(e.target.value) || 0)}
                disabled={updateLocationMutation.isPending}
                data-testid="input-adjustment-amount"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="adjustment-notes" className="text-xs">
              Notes (Optional)
            </Label>
            <Textarea
              id="adjustment-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Reason for adjustment..."
              disabled={updateLocationMutation.isPending}
              data-testid="input-adjustment-notes"
              className="h-20"
            />
          </div>

          <div className={`rounded-lg p-3 space-y-1 ${isValid ? 'bg-blue-50 dark:bg-blue-900/20' : 'bg-red-50 dark:bg-red-900/20'}`}>
            <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
              <Package className="h-3 w-3" />
              <span>Product: {productName}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-600 dark:text-gray-400">
                Current: {location.quantity} units
              </span>
              <span className={`text-sm font-semibold ${isValid ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400'}`}>
                New: {finalQuantity} units
              </span>
            </div>
            {!isValid && (
              <div className="flex items-center gap-2 text-xs text-red-600 dark:text-red-400 mt-2">
                <AlertCircle className="h-3 w-3" />
                <span>Quantity cannot be negative</span>
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
        disabled={updateLocationMutation.isPending}
        data-testid="button-cancel-adjust"
      >
        Cancel
      </Button>
      <Button
        onClick={handleAdjustStock}
        disabled={!isValid || updateLocationMutation.isPending}
        data-testid="button-confirm-adjust"
      >
        {updateLocationMutation.isPending ? "Updating..." : "Adjust Stock"}
      </Button>
    </>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Adjust Stock</DrawerTitle>
            <DrawerDescription>
              Update inventory quantity for this location
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
          <DialogTitle>Adjust Stock</DialogTitle>
          <DialogDescription>
            Update inventory quantity for this location
          </DialogDescription>
        </DialogHeader>
        {content}
        <DialogFooter>{footer}</DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
