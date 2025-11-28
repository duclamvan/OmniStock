import { useState, useEffect, useRef } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
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
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useIsMobile } from "@/hooks/use-mobile";
import { MoveRight, Package, AlertCircle, Scan, Keyboard, MapPin } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ProductLocation {
  id: string;
  productId: string;
  locationCode: string;
  quantity: number;
  isPrimary: boolean;
  notes?: string;
}

interface MoveInventoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productId: string;
  productName: string;
  fromLocation: ProductLocation | null;
  locations: ProductLocation[];
  onSuccess?: () => void;
}

export default function MoveInventoryDialog({
  open,
  onOpenChange,
  productId,
  productName,
  fromLocation,
  locations,
  onSuccess,
}: MoveInventoryDialogProps) {
  const { t } = useTranslation(['warehouse', 'common']);
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [moveToLocation, setMoveToLocation] = useState<string>("");
  const [moveQuantity, setMoveQuantity] = useState(0);
  const [locationInputMode, setLocationInputMode] = useState<"select" | "scan">("scan");
  const [locationCodeInput, setLocationCodeInput] = useState("");
  const [scanMode, setScanMode] = useState(false);
  const locationInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open && fromLocation) {
      setMoveQuantity(Math.min(1, fromLocation.quantity));
      setMoveToLocation("");
      setLocationCodeInput("");
      setLocationInputMode("scan");
    }
  }, [open, fromLocation]);

  useEffect(() => {
    if (open && locationInputMode === "scan" && locationInputRef.current) {
      const timer = setTimeout(() => {
        locationInputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [open, locationInputMode]);

  const handleLocationCodeChange = (value: string) => {
    const upperValue = value.toUpperCase();
    setLocationCodeInput(upperValue);
    
    const matchingLocation = locations.find(
      (loc) => loc.locationCode.toUpperCase() === upperValue && loc.id !== fromLocation?.id
    );
    
    if (matchingLocation) {
      setMoveToLocation(matchingLocation.id);
    } else {
      setMoveToLocation("");
    }
  };

  const handleLocationCodeKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const matchingLocation = locations.find(
        (loc) => loc.locationCode.toUpperCase() === locationCodeInput.toUpperCase() && loc.id !== fromLocation?.id
      );
      
      if (matchingLocation) {
        setMoveToLocation(matchingLocation.id);
        toast({
          title: t('warehouse:locationFound'),
          description: `${matchingLocation.locationCode} (${matchingLocation.quantity} ${t('warehouse:units')})`,
        });
      } else if (locationCodeInput.trim()) {
        toast({
          title: t('warehouse:locationNotFound'),
          description: t('warehouse:pleaseEnterValidLocationCode'),
          variant: "destructive",
        });
      }
    }
  };

  const matchedLocation = locations.find(
    (loc) => loc.locationCode.toUpperCase() === locationCodeInput.toUpperCase() && loc.id !== fromLocation?.id
  );

  const moveInventoryMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest('POST', `/api/products/${productId}/locations/move`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/products/${productId}/locations`] });
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      toast({
        title: t('common:success'),
        description: t('warehouse:inventoryMovedSuccessfully'),
      });
      onOpenChange(false);
      setMoveToLocation("");
      setMoveQuantity(0);
      onSuccess?.();
    },
    onError: (error: any) => {
      toast({
        title: t('common:error'),
        description: error.message || t('warehouse:failedToMoveInventory'),
        variant: "destructive",
      });
    },
  });

  const handleMoveInventory = () => {
    if (!fromLocation || !moveToLocation || moveQuantity <= 0) {
      toast({
        title: t('common:error'),
        description: t('common:fillAllRequiredFields'),
        variant: "destructive",
      });
      return;
    }

    if (moveQuantity > fromLocation.quantity) {
      toast({
        title: t('common:error'),
        description: t('warehouse:cannotMoveMoreThanAvailable'),
        variant: "destructive",
      });
      return;
    }

    moveInventoryMutation.mutate({
      productId,
      fromLocationId: fromLocation.id,
      toLocationId: moveToLocation,
      quantity: moveQuantity,
    });
  };

  const availableLocations = locations.filter(
    (loc) => loc.id !== fromLocation?.id
  );

  const content = (
    <div className="space-y-4 py-4">
      {fromLocation && (
        <>
          <div className="space-y-2">
            <Label className="text-xs text-gray-600 dark:text-gray-400">
              {t('warehouse:movingFrom')}
            </Label>
            <div className="flex items-center justify-between bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white font-mono">
                  {fromLocation.locationCode}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  {t('warehouse:available')}: {fromLocation.quantity} {t('warehouse:units')}
                </p>
              </div>
              <Badge variant="secondary">{fromLocation.quantity}</Badge>
            </div>
          </div>

          <div className="flex items-center justify-center">
            <MoveRight className="h-6 w-6 text-gray-400" />
          </div>

          <div className="space-y-2">
            <Label className="text-xs">
              {t('warehouse:moveToLocation')}
            </Label>
            <Tabs value={locationInputMode} onValueChange={(v) => setLocationInputMode(v as "select" | "scan")} className="w-full">
              <TabsList className="grid w-full grid-cols-2 h-8">
                <TabsTrigger value="scan" className="text-xs gap-1" data-testid="tab-scan-location">
                  <Scan className="h-3 w-3" />
                  {t('warehouse:scanOrType')}
                </TabsTrigger>
                <TabsTrigger value="select" className="text-xs gap-1" data-testid="tab-select-location">
                  <MapPin className="h-3 w-3" />
                  {t('warehouse:selectFromList')}
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="scan" className="mt-2 space-y-2">
                <div className="relative">
                  <Input
                    ref={locationInputRef}
                    id="location-code-input"
                    value={locationCodeInput}
                    onChange={(e) => handleLocationCodeChange(e.target.value)}
                    onKeyDown={handleLocationCodeKeyDown}
                    placeholder={t('warehouse:enterLocationCode')}
                    className="font-mono pr-10 uppercase"
                    disabled={moveInventoryMutation.isPending}
                    data-testid="input-location-code"
                  />
                  <Scan className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {t('warehouse:locationCodeFormat')}
                </p>
                {locationCodeInput && (
                  <div className={`rounded-lg p-2 ${matchedLocation ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' : 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800'}`}>
                    {matchedLocation ? (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                          <span className="text-sm font-mono font-medium text-green-700 dark:text-green-400">
                            {matchedLocation.locationCode}
                          </span>
                        </div>
                        <span className="text-xs text-green-600 dark:text-green-400">
                          {matchedLocation.quantity} {t('warehouse:units')}
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-yellow-700 dark:text-yellow-400">
                        <AlertCircle className="h-3 w-3" />
                        <span className="text-xs">{t('warehouse:locationNotRecognized')}</span>
                      </div>
                    )}
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="select" className="mt-2">
                <Select
                  value={moveToLocation}
                  onValueChange={(value) => {
                    setMoveToLocation(value);
                    const loc = locations.find(l => l.id === value);
                    if (loc) setLocationCodeInput(loc.locationCode);
                  }}
                  disabled={moveInventoryMutation.isPending}
                >
                  <SelectTrigger id="move-to-location" data-testid="select-move-to-location">
                    <SelectValue placeholder={t('warehouse:selectDestinationLocation')} />
                  </SelectTrigger>
                  <SelectContent>
                    {availableLocations.length === 0 ? (
                      <div className="p-3 text-center text-sm text-gray-500">
                        {t('warehouse:noOtherLocationsAvailable')}
                      </div>
                    ) : (
                      availableLocations.map((loc) => (
                        <SelectItem key={loc.id} value={loc.id} data-testid={`option-location-${loc.id}`}>
                          <div className="flex items-center justify-between w-full gap-2">
                            <span className="font-mono">{loc.locationCode}</span>
                            <span className="text-xs text-gray-500">
                              ({loc.quantity} {t('warehouse:units')})
                            </span>
                          </div>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </TabsContent>
            </Tabs>
          </div>

          <div className="space-y-2">
            <Label htmlFor="move-quantity" className="text-xs">
              {t('warehouse:quantityToMove')}
            </Label>
            <Input
              id="move-quantity"
              type="number"
              min={1}
              max={fromLocation.quantity}
              value={moveQuantity}
              onChange={(e) => setMoveQuantity(parseInt(e.target.value) || 0)}
              disabled={moveInventoryMutation.isPending}
              data-testid="input-move-quantity"
            />
            {moveQuantity > fromLocation.quantity && (
              <div className="flex items-center gap-2 text-xs text-red-600 dark:text-red-400">
                <AlertCircle className="h-3 w-3" />
                <span>{t('warehouse:cannotExceedAvailableQuantity')}</span>
              </div>
            )}
          </div>

          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 space-y-1">
            <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
              <Package className="h-3 w-3" />
              <span>{t('warehouse:product')}: {productName}</span>
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">
              {t('warehouse:afterMove')}: {fromLocation.quantity - moveQuantity} {t('warehouse:unitsRemaining')}
            </div>
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
        disabled={moveInventoryMutation.isPending}
        data-testid="button-cancel-move"
      >
        {t('common:cancel')}
      </Button>
      <Button
        onClick={handleMoveInventory}
        disabled={
          !moveToLocation ||
          moveQuantity <= 0 ||
          moveQuantity > (fromLocation?.quantity || 0) ||
          moveInventoryMutation.isPending
        }
        data-testid="button-confirm-move"
      >
        {moveInventoryMutation.isPending ? t('warehouse:moving') : t('warehouse:moveInventory')}
      </Button>
    </>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>{t('warehouse:moveInventory')}</DrawerTitle>
            <DrawerDescription>
              {t('warehouse:transferInventoryBetweenLocations')}
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
          <DialogTitle>{t('warehouse:moveInventory')}</DialogTitle>
          <DialogDescription>
            {t('warehouse:transferInventoryBetweenLocations')}
          </DialogDescription>
        </DialogHeader>
        {content}
        <DialogFooter>{footer}</DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
