import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { WifiOff, Wifi, CloudOff, RefreshCw, AlertTriangle } from "lucide-react";
import { offlineQueue } from "@/lib/offlineQueue";

export function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);
  const [failedCount, setFailedCount] = useState(0);

  useEffect(() => {
    const updateOnlineStatus = (online: boolean) => {
      setIsOnline(online);
      updateCounts();
    };

    const unsubscribe = offlineQueue.addSyncListener(updateOnlineStatus);

    updateCounts();
    const interval = setInterval(updateCounts, 5000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  const updateCounts = async () => {
    const total = await offlineQueue.getTotalUnsynced();
    const failed = await offlineQueue.getFailedMutationsCount();
    setPendingCount(total);
    setFailedCount(failed);
  };

  const handleRetry = async () => {
    await offlineQueue.retryFailedMutations();
    updateCounts();
  };

  if (isOnline && pendingCount === 0 && failedCount === 0) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col items-end gap-2">
      <Badge 
        variant={isOnline ? (failedCount > 0 ? "destructive" : "default") : "destructive"}
        className={`flex items-center gap-2 px-3 py-1.5 text-xs shadow-lg ${
          failedCount > 0 
            ? 'bg-red-500 hover:bg-red-600' 
            : isOnline 
              ? 'bg-blue-500 hover:bg-blue-600' 
              : 'bg-orange-500 hover:bg-orange-600'
        }`}
      >
        {failedCount > 0 ? (
          <>
            <AlertTriangle className="h-3 w-3" />
            <span>{failedCount} failed sync(s)</span>
          </>
        ) : isOnline ? (
          <>
            {pendingCount > 0 ? (
              <>
                <RefreshCw className="h-3 w-3 animate-spin" />
                <span>Syncing {pendingCount} change(s)...</span>
              </>
            ) : (
              <>
                <Wifi className="h-3 w-3" />
                <span>Online</span>
              </>
            )}
          </>
        ) : (
          <>
            <CloudOff className="h-3 w-3" />
            <span>Offline Mode</span>
            {pendingCount > 0 && (
              <span className="ml-1 bg-white/20 rounded-full px-2 py-0.5">
                {pendingCount} pending
              </span>
            )}
          </>
        )}
      </Badge>
      
      {failedCount > 0 && isOnline && (
        <Button
          onClick={handleRetry}
          size="sm"
          variant="destructive"
          className="text-xs"
          data-testid="button-retry-failed-syncs"
        >
          <RefreshCw className="h-3 w-3 mr-1" />
          Retry Failed Syncs
        </Button>
      )}
    </div>
  );
}
