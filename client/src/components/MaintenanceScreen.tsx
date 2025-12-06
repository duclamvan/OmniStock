import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Wrench, RefreshCw, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { setMaintenanceMode } from '@/lib/queryClient';

interface MaintenanceScreenProps {
  onSystemOnline?: () => void;
}

export function MaintenanceScreen({ onSystemOnline }: MaintenanceScreenProps) {
  const { t } = useTranslation('common');
  const [isChecking, setIsChecking] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const checkSystemStatus = useCallback(async () => {
    setIsChecking(true);
    try {
      const response = await fetch('/api/auth/user', {
        credentials: 'include',
      });
      
      if (response.ok) {
        setMaintenanceMode(false);
        onSystemOnline?.();
        window.location.reload();
      } else if (response.status !== 503) {
        setMaintenanceMode(false);
        onSystemOnline?.();
        window.location.reload();
      }
    } catch (error) {
      console.log('System still in maintenance mode');
    } finally {
      setIsChecking(false);
      setLastChecked(new Date());
    }
  }, [onSystemOnline]);

  useEffect(() => {
    const interval = setInterval(() => {
      checkSystemStatus();
    }, 30000);

    return () => clearInterval(interval);
  }, [checkSystemStatus]);

  return (
    <div 
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background"
      data-testid="maintenance-screen"
    >
      <div className="flex flex-col items-center max-w-md px-6 text-center">
        <div className="relative mb-8">
          <div className="flex items-center justify-center w-24 h-24 rounded-full bg-primary/10">
            <Wrench className="w-12 h-12 text-primary animate-pulse" />
          </div>
          <div className="absolute -bottom-2 -right-2 flex items-center justify-center w-10 h-10 rounded-full bg-orange-500/20">
            <RefreshCw className="w-5 h-5 text-orange-500 animate-spin" />
          </div>
        </div>

        <h1 
          className="text-3xl font-bold text-foreground mb-4"
          data-testid="maintenance-title"
        >
          {t('maintenance.title')}
        </h1>
        
        <p 
          className="text-lg text-muted-foreground mb-8"
          data-testid="maintenance-message"
        >
          {t('maintenance.message')}
        </p>

        <div className="flex flex-col items-center gap-4 w-full">
          <Button
            variant="outline"
            size="lg"
            onClick={checkSystemStatus}
            disabled={isChecking}
            className="min-w-[200px]"
            data-testid="button-check-now"
          >
            {isChecking ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {t('maintenance.checking')}
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                {t('maintenance.checkNow')}
              </>
            )}
          </Button>

          {lastChecked && (
            <p className="text-sm text-muted-foreground">
              {t('maintenance.lastChecked', { time: lastChecked.toLocaleTimeString() })}
            </p>
          )}
        </div>

        <div className="mt-12 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>{t('maintenance.autoRefresh')}</span>
        </div>
      </div>
    </div>
  );
}

export default MaintenanceScreen;
