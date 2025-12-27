import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Camera, X, RefreshCw, Loader2 } from "lucide-react";
import { useEffect, useRef, useState, useCallback } from "react";
import { BrowserMultiFormatReader, NotFoundException, BarcodeFormat, DecodeHintType } from "@zxing/library";
import { useTranslation } from "react-i18next";

interface CameraScannerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onScan: (code: string, format: string) => void;
  title?: string;
}

export function CameraScannerDialog({
  open,
  onOpenChange,
  onScan,
  title
}: CameraScannerDialogProps) {
  const { t } = useTranslation('orders');
  const videoRef = useRef<HTMLVideoElement>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastScannedCode, setLastScannedCode] = useState<string | null>(null);
  const scanCooldownRef = useRef<NodeJS.Timeout | null>(null);

  const initializeScanner = useCallback(async () => {
    if (!open || !videoRef.current) return;

    setIsLoading(true);
    setError(null);

    try {
      const hints = new Map();
      hints.set(DecodeHintType.POSSIBLE_FORMATS, [
        BarcodeFormat.QR_CODE,
        BarcodeFormat.EAN_13,
        BarcodeFormat.EAN_8,
        BarcodeFormat.CODE_128,
        BarcodeFormat.CODE_39,
        BarcodeFormat.UPC_A,
        BarcodeFormat.UPC_E,
        BarcodeFormat.DATA_MATRIX
      ]);
      hints.set(DecodeHintType.TRY_HARDER, true);

      const reader = new BrowserMultiFormatReader(hints);
      readerRef.current = reader;

      const constraints = {
        video: {
          facingMode: "environment",
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      };

      await reader.decodeFromConstraints(
        constraints,
        videoRef.current,
        (result, err) => {
          if (result) {
            const code = result.getText();
            const format = result.getBarcodeFormat().toString();

            if (code !== lastScannedCode) {
              setLastScannedCode(code);
              
              if (scanCooldownRef.current) {
                clearTimeout(scanCooldownRef.current);
              }

              onScan(code, format);
              onOpenChange(false);
            }
          }
          if (err && !(err instanceof NotFoundException)) {
            console.debug('Scanner error:', err);
          }
        }
      );

      setIsLoading(false);
    } catch (err: any) {
      console.error('Camera initialization error:', err);
      
      if (err.name === 'NotAllowedError') {
        setError(t('cameraPermissionDenied') || 'Camera permission denied. Please allow camera access.');
      } else if (err.name === 'NotFoundError') {
        setError(t('noCameraFound') || 'No camera found on this device.');
      } else if (err.name === 'NotReadableError') {
        setError(t('cameraInUse') || 'Camera is already in use.');
      } else {
        setError(err.message || t('cameraError') || 'Failed to start camera');
      }
      
      setIsLoading(false);
    }
  }, [open, onScan, onOpenChange, lastScannedCode, t]);

  const stopScanner = useCallback(() => {
    if (readerRef.current) {
      readerRef.current.reset();
      readerRef.current = null;
    }
    if (scanCooldownRef.current) {
      clearTimeout(scanCooldownRef.current);
    }
    setLastScannedCode(null);
  }, []);

  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => {
        initializeScanner();
      }, 100);
      return () => clearTimeout(timer);
    } else {
      stopScanner();
    }
  }, [open, initializeScanner, stopScanner]);

  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, [stopScanner]);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) {
        stopScanner();
      }
      onOpenChange(isOpen);
    }}>
      <DialogContent className="max-w-lg sm:max-w-xl p-0 overflow-hidden">
        <DialogHeader className="p-4 border-b">
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            {title || t('scanBarcode') || 'Scan Barcode'}
          </DialogTitle>
        </DialogHeader>
        
        <div className="relative bg-black aspect-video">
          {isLoading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900 text-white">
              <Loader2 className="h-8 w-8 animate-spin mb-2" />
              <p className="text-sm">{t('startingCamera') || 'Starting camera...'}</p>
            </div>
          )}
          
          {error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900 text-white p-6">
              <X className="h-12 w-12 text-red-400 mb-3" />
              <p className="text-center text-sm mb-4">{error}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={initializeScanner}
                className="bg-white/10 border-white/20 text-white hover:bg-white/20"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                {t('retry') || 'Retry'}
              </Button>
            </div>
          )}
          
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            playsInline
            muted
            data-testid="camera-scanner-video"
          />
          
          {!isLoading && !error && (
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-64 h-48 border-2 border-white/50 rounded-lg relative">
                  <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-green-400 rounded-tl-lg" />
                  <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-green-400 rounded-tr-lg" />
                  <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-green-400 rounded-bl-lg" />
                  <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-green-400 rounded-br-lg" />
                </div>
              </div>
              <div className="absolute bottom-4 left-0 right-0 text-center">
                <p className="text-white text-sm bg-black/50 inline-block px-3 py-1 rounded-full">
                  {t('positionBarcodeInFrame') || 'Position barcode in frame'}
                </p>
              </div>
            </div>
          )}
        </div>
        
        <div className="p-4 border-t bg-gray-50 dark:bg-gray-800">
          <div className="flex justify-between items-center">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {t('scannerSupportedFormats') || 'Supports: QR, EAN-13, EAN-8, Code 128, Code 39'}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              data-testid="button-close-camera-scanner"
            >
              {t('cancel') || 'Cancel'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
