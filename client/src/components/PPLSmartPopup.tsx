import { useState, useEffect, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MapPin, Loader2, ExternalLink, X } from "lucide-react";

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
  customerAddress,
  customerCity,
  customerZipCode,
  language = "cs",
}: PPLSmartPopupProps) {
  const { t } = useTranslation(["orders", "common"]);
  const [isLoading, setIsLoading] = useState(true);
  const [widgetError, setWidgetError] = useState<string | null>(null);
  const [retryCounter, setRetryCounter] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const scriptLoadedRef = useRef(false);
  const eventListenerAddedRef = useRef(false);

  const buildAddressString = useCallback(() => {
    const parts: string[] = [];
    if (customerCity) parts.push(customerCity);
    if (customerZipCode) parts.push(customerZipCode);
    if (customerAddress) parts.push(customerAddress);
    return parts.join(", ") || "Praha";
  }, [customerAddress, customerCity, customerZipCode]);

  const handlePickupPointSelected = useCallback(
    (event: CustomEvent) => {
      const detail = event.detail;
      if (detail) {
        const pickupPoint: PPLPickupPoint = {
          code: detail.code || detail.accessPointCode || "",
          name: detail.name || detail.accessPointName || "",
          street: detail.street || detail.addressStreet || "",
          city: detail.city || detail.addressCity || "",
          zipCode: detail.zipCode || detail.addressZipCode || detail.postalCode || "",
          address: detail.address || `${detail.street || ""}, ${detail.city || ""} ${detail.zipCode || ""}`.trim(),
          type: detail.type || detail.accessPointType || "ParcelShop",
          lat: detail.lat || detail.latitude,
          lng: detail.lng || detail.longitude,
          accessPointType: detail.type || detail.accessPointType,
        };
        onSelectPickupPoint(pickupPoint);
        onOpenChange(false);
      }
    },
    [onSelectPickupPoint, onOpenChange]
  );

  useEffect(() => {
    if (!open) {
      setIsLoading(true);
      setWidgetError(null);
      return;
    }

    const loadWidget = async () => {
      try {
        if (!document.getElementById("ppl-widget-css")) {
          const link = document.createElement("link");
          link.id = "ppl-widget-css";
          link.rel = "stylesheet";
          link.href = "https://www.ppl.cz/sources/map/main.css";
          document.head.appendChild(link);
        }

        if (!scriptLoadedRef.current) {
          await new Promise<void>((resolve, reject) => {
            if (document.getElementById("ppl-widget-script")) {
              scriptLoadedRef.current = true;
              resolve();
              return;
            }

            const script = document.createElement("script");
            script.id = "ppl-widget-script";
            script.src = "https://www.ppl.cz/sources/map/main.js";
            script.async = true;
            script.onload = () => {
              scriptLoadedRef.current = true;
              resolve();
            };
            script.onerror = () => reject(new Error("Failed to load PPL widget script"));
            document.body.appendChild(script);
          });
        }

        if (!eventListenerAddedRef.current) {
          document.addEventListener("ppl-parcelshop-map", handlePickupPointSelected as EventListener);
          eventListenerAddedRef.current = true;
        }

        setTimeout(() => {
          if (containerRef.current) {
            const addressString = buildAddressString();
            containerRef.current.innerHTML = "";
            
            const widgetDiv = document.createElement("div");
            widgetDiv.id = "ppl-parcelshop-map";
            widgetDiv.setAttribute("data-language", language);
            widgetDiv.setAttribute("data-mode", "default");
            widgetDiv.setAttribute("data-country", "cz");
            widgetDiv.setAttribute("data-countries", "cz,sk");
            widgetDiv.setAttribute("data-address", addressString);
            widgetDiv.style.height = "500px";
            widgetDiv.style.width = "100%";
            
            containerRef.current.appendChild(widgetDiv);
            
            const checkWidget = () => {
              if ((window as any).pplWidget || containerRef.current?.querySelector("iframe, .ppl-widget, .leaflet-container")) {
                setIsLoading(false);
              } else {
                setTimeout(checkWidget, 100);
              }
            };
            
            setTimeout(checkWidget, 500);
            setTimeout(() => setIsLoading(false), 3000);
          }
        }, 100);
      } catch (error) {
        console.error("Error loading PPL widget:", error);
        setWidgetError(t("orders:pplWidgetLoadError", "Failed to load pickup point map. Please try again."));
        setIsLoading(false);
      }
    };

    loadWidget();

    return () => {
      if (eventListenerAddedRef.current) {
        document.removeEventListener("ppl-parcelshop-map", handlePickupPointSelected as EventListener);
        eventListenerAddedRef.current = false;
      }
    };
  }, [open, language, buildAddressString, handlePickupPointSelected, t, retryCounter]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-[95vw] h-[85vh] max-h-[700px] p-0 overflow-hidden">
        <DialogHeader className="px-4 pt-4 pb-2 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-orange-500" />
              <DialogTitle className="text-lg">
                {t("orders:selectPickupPoint", "Select Pickup Point")}
              </DialogTitle>
            </div>
          </div>
          <DialogDescription className="text-sm text-muted-foreground">
            {t("orders:pplPickupDescription", "Choose a PPL ParcelShop or ParcelBox near your location")}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 relative overflow-hidden" style={{ height: "calc(100% - 80px)" }}>
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/80 dark:bg-gray-900/80 z-10">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
                <p className="text-sm text-muted-foreground">
                  {t("orders:loadingPickupPoints", "Loading pickup points map...")}
                </p>
              </div>
            </div>
          )}

          {widgetError && (
            <div className="absolute inset-0 flex items-center justify-center bg-white dark:bg-gray-900 z-10">
              <div className="flex flex-col items-center gap-4 p-6 text-center">
                <div className="h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                  <X className="h-6 w-6 text-red-600 dark:text-red-400" />
                </div>
                <p className="text-sm text-muted-foreground max-w-md">{widgetError}</p>
                <Button
                  variant="outline"
                  onClick={() => {
                    setWidgetError(null);
                    setIsLoading(true);
                    scriptLoadedRef.current = false;
                    setRetryCounter(prev => prev + 1);
                  }}
                  data-testid="button-retry-ppl-widget"
                >
                  {t("common:retry", "Retry")}
                </Button>
              </div>
            </div>
          )}

          <div
            ref={containerRef}
            className="w-full h-full"
            style={{ minHeight: "500px" }}
          />
        </div>

        <div className="px-4 py-3 border-t bg-muted/30 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <ExternalLink className="h-3.5 w-3.5" />
            <span>{t("orders:poweredByPPL", "Powered by PPL CZ")}</span>
          </div>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} data-testid="button-close-ppl-popup">
            {t("common:cancel", "Cancel")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default PPLSmartPopup;
