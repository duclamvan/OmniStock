import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { WifiOff, Wifi, CloudOff, RefreshCw } from "lucide-react";
import { offlineQueue } from "@/lib/offlineQueue";

export function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const updateOnlineStatus = (online: boolean) => {
      setIsOnline(online);
      updatePendingCount();
    };

    const unsubscribe = offlineQueue.addSyncListener(updateOnlineStatus);

    updatePendingCount();
    const interval = setInterval(updatePendingCount, 5000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  const updatePendingCount = async () => {
    const count = await offlineQueue.getPendingMutationsCount();
    setPendingCount(count);
  };

  if (isOnline && pendingCount === 0) {
    return null;
  }

  return (
    <Badge 
      variant={isOnline ? "default" : "destructive"}
      className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-3 py-1.5 text-xs shadow-lg ${
        isOnline 
          ? 'bg-blue-500 hover:bg-blue-600' 
          : 'bg-orange-500 hover:bg-orange-600'
      }`}
    >
      {isOnline ? (
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
  );
}
