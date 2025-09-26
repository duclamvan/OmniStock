import { useEffect, useState } from 'react';
import { CheckCircle2, XCircle, AlertCircle, ScanLine } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ScanFeedbackProps {
  type?: 'success' | 'error' | 'duplicate' | 'complete' | null;
  message?: string;
}

export function ScanFeedback({ type, message }: ScanFeedbackProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [currentType, setCurrentType] = useState<typeof type>(null);
  const [currentMessage, setCurrentMessage] = useState<string>('');

  useEffect(() => {
    if (type) {
      setCurrentType(type);
      setCurrentMessage(message || '');
      setIsVisible(true);
      
      // Auto-hide after animation
      const timer = setTimeout(() => {
        setIsVisible(false);
        setCurrentType(null);
        setCurrentMessage('');
      }, 2000);
      
      return () => clearTimeout(timer);
    } else {
      // Immediately hide when type is null
      setIsVisible(false);
      setCurrentType(null);
      setCurrentMessage('');
    }
  }, [type, message]);

  if (!isVisible || !currentType) return null;

  return (
    <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 pointer-events-none">
      <div
        className={cn(
          "px-6 py-4 rounded-lg shadow-2xl backdrop-blur-sm animate-in fade-in slide-in-from-top-4 duration-300",
          {
            'bg-green-500/90 text-white': currentType === 'success' || currentType === 'complete',
            'bg-red-500/90 text-white': currentType === 'error',
            'bg-amber-500/90 text-white': currentType === 'duplicate'
          }
        )}
      >
        <div className="flex items-center gap-3">
          {currentType === 'success' && <CheckCircle2 className="h-6 w-6 animate-in zoom-in duration-300" />}
          {currentType === 'complete' && <CheckCircle2 className="h-6 w-6 animate-pulse" />}
          {currentType === 'error' && <XCircle className="h-6 w-6 animate-in zoom-in duration-300" />}
          {currentType === 'duplicate' && <AlertCircle className="h-6 w-6 animate-in zoom-in duration-300" />}
          <span className="font-semibold text-lg whitespace-nowrap">{currentMessage}</span>
        </div>
      </div>
    </div>
  );
}

// Scan line animation component
export function ScanLineAnimation({ isActive }: { isActive: boolean }) {
  if (!isActive) return null;
  
  return (
    <div className="fixed inset-0 pointer-events-none z-40">
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-green-400 to-transparent animate-scan-line" />
    </div>
  );
}

// Visual pulse effect for scan input
export function ScanInputPulse({ children, isScanning }: { children: React.ReactNode; isScanning: boolean }) {
  return (
    <div className={cn(
      "relative",
      isScanning && "animate-pulse-ring"
    )}>
      {children}
      {isScanning && (
        <div className="absolute inset-0 rounded-md bg-blue-400 opacity-20 animate-ping pointer-events-none" />
      )}
    </div>
  );
}

// Success checkmark animation
export function SuccessCheckmark({ show }: { show: boolean }) {
  if (!show) return null;
  
  return (
    <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-none">
      <div className="bg-green-500 rounded-full p-8 animate-in zoom-in duration-500">
        <CheckCircle2 className="h-24 w-24 text-white animate-in fade-in slide-in-from-bottom-4 duration-700" />
      </div>
    </div>
  );
}