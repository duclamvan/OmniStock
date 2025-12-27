import { Dialog, DialogContent } from "@/components/ui/dialog";
import { CheckCircle, XCircle, AlertTriangle, MapPin, Package } from "lucide-react";
import { useEffect } from "react";

export type ScanResultType = 'success' | 'error' | 'warning' | 'location_verified';

interface ScanFeedbackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: ScanResultType;
  title: string;
  message: string;
  autoCloseMs?: number;
}

export function ScanFeedbackDialog({
  open,
  onOpenChange,
  type,
  title,
  message,
  autoCloseMs = 1500
}: ScanFeedbackDialogProps) {
  useEffect(() => {
    if (open && autoCloseMs > 0) {
      const timer = setTimeout(() => {
        onOpenChange(false);
      }, autoCloseMs);
      return () => clearTimeout(timer);
    }
  }, [open, autoCloseMs, onOpenChange]);

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-16 w-16 text-green-500" />;
      case 'error':
        return <XCircle className="h-16 w-16 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="h-16 w-16 text-amber-500" />;
      case 'location_verified':
        return <MapPin className="h-16 w-16 text-blue-500" />;
      default:
        return <Package className="h-16 w-16 text-gray-500" />;
    }
  };

  const getBgColor = () => {
    switch (type) {
      case 'success':
        return 'bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-900/40 dark:to-emerald-900/40 border-green-300 dark:border-green-700';
      case 'error':
        return 'bg-gradient-to-br from-red-50 to-rose-100 dark:from-red-900/40 dark:to-rose-900/40 border-red-300 dark:border-red-700';
      case 'warning':
        return 'bg-gradient-to-br from-amber-50 to-yellow-100 dark:from-amber-900/40 dark:to-yellow-900/40 border-amber-300 dark:border-amber-700';
      case 'location_verified':
        return 'bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-900/40 dark:to-indigo-900/40 border-blue-300 dark:border-blue-700';
      default:
        return 'bg-white dark:bg-gray-800';
    }
  };

  const getTitleColor = () => {
    switch (type) {
      case 'success':
        return 'text-green-700 dark:text-green-300';
      case 'error':
        return 'text-red-700 dark:text-red-300';
      case 'warning':
        return 'text-amber-700 dark:text-amber-300';
      case 'location_verified':
        return 'text-blue-700 dark:text-blue-300';
      default:
        return 'text-gray-700 dark:text-gray-300';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className={`max-w-xs sm:max-w-sm p-6 border-2 ${getBgColor()} shadow-2xl`}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <div className="flex flex-col items-center justify-center text-center space-y-4">
          <div className="animate-bounce-once">
            {getIcon()}
          </div>
          <h2 className={`text-xl font-bold ${getTitleColor()}`}>
            {title}
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {message}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
