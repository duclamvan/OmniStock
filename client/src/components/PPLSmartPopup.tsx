import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MapPin, Loader2, ExternalLink } from "lucide-react";

interface PPLPickupPoint {
  code: string;
  name: string;
  street?: string;
  city?: string;
  zipCode?: string;
  address?: string;
  type?: string;
  lat?: number;
  lng?: number;
  openingHours?: Record<string, string>;
  services?: string[];
  accessPointType?: string;
}

interface PPLSmartPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectPickupPoint: (pickupPoint: PPLPickupPoint) => void;
  customerAddress?: string;
  customerCity?: string;
  customerZipCode?: string;
  language?: "cs" | "en";
}

export function PPLSmartPopup({
  open,
  onOpenChange,
  onSelectPickupPoint,
  customerCity,
  customerZipCode,
  language = "cs",
}: PPLSmartPopupProps) {
  const { t } = useTranslation(["orders", "common"]);
  const [isLoading, setIsLoading] = useState(true);

  const widgetUrl = `https://www.ppl.cz/mapa-ppl-parcelshops`;

  useEffect(() => {
    if (open) {
      setIsLoading(true);
      const handleMessage = (event: MessageEvent) => {
        if (event.origin.includes('ppl.cz')) {
          try {
            const data = event.data;
            if (data && data.code) {
              const pickupPoint: PPLPickupPoint = {
                code: data.code || data.accessPointCode,
                name: data.name || data.title,
                street: data.street || data.address,
                city: data.city,
                zipCode: data.zipCode || data.zip,
                address: `${data.street || ''}, ${data.city || ''} ${data.zipCode || ''}`.trim(),
                type: data.type || data.accessPointType,
                lat: data.lat || data.latitude,
                lng: data.lng || data.longitude,
              };
              onSelectPickupPoint(pickupPoint);
              onOpenChange(false);
            }
          } catch (e) {
            console.error('Error parsing PPL widget message:', e);
          }
        }
      };

      window.addEventListener('message', handleMessage);
      return () => window.removeEventListener('message', handleMessage);
    }
  }, [open, onSelectPickupPoint, onOpenChange]);

  const handleIframeLoad = useCallback(() => {
    setIsLoading(false);
  }, []);

  const handleOpenExternal = () => {
    window.open(widgetUrl, '_blank', 'width=800,height=600');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-[95vw] h-[85vh] max-h-[900px] p-0 overflow-hidden flex flex-col">
        <DialogHeader className="px-4 pt-4 pb-2 border-b flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-orange-500" />
              <DialogTitle className="text-lg">
                {t("orders:selectPickupPoint", "Select Pickup Point")}
              </DialogTitle>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleOpenExternal}
              className="gap-2"
            >
              <ExternalLink className="h-4 w-4" />
              {t("common:openInNewWindow", "Open in new window")}
            </Button>
          </div>
          <DialogDescription className="text-sm text-muted-foreground">
            {t("orders:pplPickupDescription", "Choose a PPL pickup point near your location")}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 relative">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background z-10">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
                <p className="text-sm text-muted-foreground">
                  {t("orders:loadingPickupPoints", "Loading pickup points...")}
                </p>
              </div>
            </div>
          )}
          <iframe
            src={widgetUrl}
            className="w-full h-full border-0"
            onLoad={handleIframeLoad}
            title="PPL Pickup Points"
            allow="geolocation"
          />
        </div>

        <div className="border-t p-4 flex justify-end items-center flex-shrink-0 bg-muted/30">
          <div className="text-sm text-muted-foreground mr-auto">
            {t("orders:selectPointFromMap", "Select a pickup point from the map above")}
          </div>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            data-testid="button-cancel-pickup"
          >
            {t("common:close", "Close")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default PPLSmartPopup;
