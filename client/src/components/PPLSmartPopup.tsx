import { useState, useEffect, useCallback, useRef, memo } from "react";
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

type LoadStatus = 'loading' | 'loaded' | 'error' | 'timeout';

const LOAD_TIMEOUT_MS = 15000;
const PPL_MAP_BASE_URL = 'https://www.ppl.cz/mapa-vydejnich-mist';

function buildMapUrl(address?: string, city?: string, zipCode?: string): string {
  const parts: string[] = [];
  if (address) parts.push(address);
  if (city) parts.push(city);
  if (zipCode) parts.push(zipCode);
  
  const fullAddress = parts.join(', ').trim();
  
  if (fullAddress) {
    const params = new URLSearchParams();
    params.set('KTMAddress', fullAddress);
    return `${PPL_MAP_BASE_URL}?${params.toString()}`;
  }
  
  return PPL_MAP_BASE_URL;
}

const StableIframe = memo(({ 
  src, 
  onLoad, 
  onError,
  iframeKey 
}: { 
  src: string; 
  onLoad: () => void; 
  onError: () => void;
  iframeKey: number;
}) => {
  return (
    <iframe
      key={iframeKey}
      src={src}
      className="w-full h-full border-0"
      onLoad={onLoad}
      onError={onError}
      title="PPL Pickup Points"
      allow="geolocation"
      sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
      referrerPolicy="strict-origin-when-cross-origin"
    />
  );
});

StableIframe.displayName = 'StableIframe';

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
  const [status, setStatus] = useState<LoadStatus>('loading');
  const [retryCount, setRetryCount] = useState(0);
  const [iframeKey, setIframeKey] = useState(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  const widgetUrl = buildMapUrl(customerAddress, customerCity, customerZipCode);

  const clearTimeoutRef = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const startLoadTimeout = useCallback(() => {
    clearTimeoutRef();
    timeoutRef.current = setTimeout(() => {
      if (isMountedRef.current && status === 'loading') {
        setStatus('timeout');
      }
    }, LOAD_TIMEOUT_MS);
  }, [clearTimeoutRef, status]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      clearTimeoutRef();
    };
  }, [clearTimeoutRef]);

  useEffect(() => {
    if (open) {
      setStatus('loading');
      startLoadTimeout();

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
      return () => {
        window.removeEventListener('message', handleMessage);
        clearTimeoutRef();
      };
    }
  }, [open, onSelectPickupPoint, onOpenChange, startLoadTimeout, clearTimeoutRef]);

  const handleIframeLoad = useCallback(() => {
    clearTimeoutRef();
    if (isMountedRef.current) {
      setStatus('loaded');
    }
  }, [clearTimeoutRef]);

  const handleIframeError = useCallback(() => {
    clearTimeoutRef();
    if (isMountedRef.current) {
      setStatus('error');
    }
  }, [clearTimeoutRef]);

  const handleRetry = useCallback(() => {
    setStatus('loading');
    setRetryCount(prev => prev + 1);
    setIframeKey(prev => prev + 1);
    startLoadTimeout();
  }, [startLoadTimeout]);

  const handleOpenExternal = () => {
    window.open(widgetUrl, '_blank', 'width=900,height=700');
  };

  const showError = status === 'error' || status === 'timeout';

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
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRetry}
                className="gap-2"
                title={t("common:refresh", "Refresh")}
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
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

        <div className="flex-1 relative">
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

          {showError && (
            <div className="absolute inset-0 flex items-center justify-center bg-background z-10">
              <div className="flex flex-col items-center gap-4 text-center px-4">
                <AlertCircle className="h-12 w-12 text-orange-500" />
                <div>
                  <p className="font-medium text-lg">
                    {status === 'timeout' 
                      ? t("orders:loadingTooLong", "Loading took too long")
                      : t("orders:errorLoadingPickupPoints", "Failed to load pickup points")}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {t("orders:tryRefreshOrOpenExternal", "Try refreshing or open in a new window")}
                  </p>
                </div>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={handleRetry}
                    className="gap-2"
                  >
                    <RefreshCw className="h-4 w-4" />
                    {t("common:retry", "Retry")} {retryCount > 0 && `(${retryCount})`}
                  </Button>
                  <Button
                    onClick={handleOpenExternal}
                    className="gap-2 bg-orange-500 hover:bg-orange-600"
                  >
                    <ExternalLink className="h-4 w-4" />
                    {t("common:openInNewWindow", "Open in new window")}
                  </Button>
                </div>
              </div>
            </div>
          )}

          <StableIframe
            src={widgetUrl}
            onLoad={handleIframeLoad}
            onError={handleIframeError}
            iframeKey={iframeKey}
          />
        </div>

        <div className="border-t p-4 flex justify-end items-center flex-shrink-0 bg-muted/30">
          <div className="text-sm text-muted-foreground mr-auto flex items-center gap-2">
            {status === 'loaded' && (
              <>
                <span className="w-2 h-2 rounded-full bg-green-500"></span>
                {t("orders:selectPointFromMap", "Select a pickup point from the map above")}
              </>
            )}
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
