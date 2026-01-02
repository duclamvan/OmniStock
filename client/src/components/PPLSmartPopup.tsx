import { useState, useEffect, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MapPin, Loader2, ExternalLink, RefreshCw, AlertCircle } from "lucide-react";

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

type LoadStatus = 'loading' | 'loaded' | 'error';

const PPL_MAP_URL = 'https://www.ppl.cz/mapa-vydejnich-mist';

export function PPLSmartPopup({
  open,
  onOpenChange,
  onSelectPickupPoint,
  customerAddress,
  customerCity,
  customerZipCode,
}: PPLSmartPopupProps) {
  const { t } = useTranslation(["orders", "common"]);
  const [status, setStatus] = useState<LoadStatus>('loading');
  const containerRef = useRef<HTMLDivElement>(null);
  const scriptLoadedRef = useRef(false);

  const handleOpenExternal = useCallback(() => {
    const parts: string[] = [];
    if (customerAddress) parts.push(customerAddress);
    if (customerCity) parts.push(customerCity);
    if (customerZipCode) parts.push(customerZipCode);
    
    const fullAddress = parts.join(', ').trim();
    let url = PPL_MAP_URL;
    
    if (fullAddress) {
      const params = new URLSearchParams();
      params.set('KTMAddress', fullAddress);
      url = `${PPL_MAP_URL}?${params.toString()}`;
    }
    
    window.open(url, '_blank', 'width=900,height=700');
  }, [customerAddress, customerCity, customerZipCode]);

  useEffect(() => {
    if (!open) return;

    const loadWidget = async () => {
      setStatus('loading');

      try {
        if (!document.getElementById('ppl-widget-css')) {
          const link = document.createElement('link');
          link.id = 'ppl-widget-css';
          link.rel = 'stylesheet';
          link.href = 'https://www.ppl.cz/sources/map/main.css';
          document.head.appendChild(link);
        }

        if (!scriptLoadedRef.current) {
          await new Promise<void>((resolve, reject) => {
            if (document.getElementById('ppl-widget-script')) {
              resolve();
              return;
            }
            
            const script = document.createElement('script');
            script.id = 'ppl-widget-script';
            script.src = 'https://www.ppl.cz/sources/map/main.js';
            script.async = true;
            script.onload = () => {
              scriptLoadedRef.current = true;
              resolve();
            };
            script.onerror = () => reject(new Error('Failed to load PPL widget script'));
            document.body.appendChild(script);
          });
        }

        setTimeout(() => {
          setStatus('loaded');
        }, 500);

      } catch (error) {
        console.error('Failed to load PPL widget:', error);
        setStatus('error');
      }
    };

    loadWidget();

    const handlePPLSelection = (event: Event) => {
      const customEvent = event as CustomEvent;
      const data = customEvent.detail;
      
      if (data) {
        const pickupPoint: PPLPickupPoint = {
          code: data.code || data.accessPointCode || data.id,
          name: data.name || data.title,
          street: data.street || data.address,
          city: data.city,
          zipCode: data.zipCode || data.zip || data.postalCode,
          address: `${data.street || ''}, ${data.city || ''} ${data.zipCode || data.zip || ''}`.trim(),
          type: data.type || data.accessPointType,
          lat: data.lat || data.latitude || data.gpsLatitude,
          lng: data.lng || data.longitude || data.gpsLongitude,
          accessPointType: data.accessPointType || data.type,
        };
        onSelectPickupPoint(pickupPoint);
        onOpenChange(false);
      }
    };

    document.addEventListener('ppl-parcelshop-map', handlePPLSelection);

    return () => {
      document.removeEventListener('ppl-parcelshop-map', handlePPLSelection);
    };
  }, [open, onSelectPickupPoint, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl w-[98vw] h-[95vh] max-h-[1200px] p-0 overflow-hidden flex flex-col">
        <DialogHeader className="px-4 pt-4 pb-2 border-b flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-orange-500" />
              <DialogTitle className="text-lg">
                {t("orders:selectPickupPoint", "Select Pickup Point")}
              </DialogTitle>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleOpenExternal}
                className="gap-2"
              >
                <ExternalLink className="h-4 w-4" />
                <span className="hidden sm:inline">{t("common:openInNewWindow", "Open in new window")}</span>
              </Button>
            </div>
          </div>
          <DialogDescription className="text-sm text-muted-foreground">
            {t("orders:pplPickupDescription", "Choose a PPL pickup point near your location")}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 relative overflow-hidden">
          {status === 'loading' && (
            <div className="absolute inset-0 flex items-center justify-center bg-background z-10">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
                <p className="text-sm text-muted-foreground">
                  {t("orders:loadingPickupPoints", "Loading pickup points...")}
                </p>
              </div>
            </div>
          )}

          {status === 'error' && (
            <div className="absolute inset-0 flex items-center justify-center bg-background z-10">
              <div className="flex flex-col items-center gap-4 text-center px-4">
                <AlertCircle className="h-12 w-12 text-orange-500" />
                <div>
                  <p className="font-medium text-lg">
                    {t("orders:errorLoadingPickupPoints", "Failed to load pickup points")}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {t("orders:tryOpenExternal", "Please use the 'Open in new window' button")}
                  </p>
                </div>
                <Button
                  onClick={handleOpenExternal}
                  className="gap-2 bg-orange-500 hover:bg-orange-600"
                >
                  <ExternalLink className="h-4 w-4" />
                  {t("common:openInNewWindow", "Open in new window")}
                </Button>
              </div>
            </div>
          )}

          <div 
            ref={containerRef}
            id="ppl-parcelshop-map" 
            className="w-full h-full"
            style={{ minHeight: '500px' }}
          />
        </div>

      </DialogContent>
    </Dialog>
  );
}

export default PPLSmartPopup;
