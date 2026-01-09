import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Lock, Eye, Users } from "lucide-react";
import { useTranslation } from "react-i18next";

interface RealTimeViewer {
  userId: string;
  userName: string;
  userAvatar?: string;
  socketId: string;
  joinedAt: string;
}

interface LockInfo {
  lockedByUserId: string;
  lockedByUserName: string;
  lockedByUserAvatar?: string;
  lockedAt: string;
  lockType: 'view' | 'edit';
}

interface RealTimeViewersProps {
  viewers: RealTimeViewer[];
  lockInfo?: LockInfo | null;
  currentUserId?: string;
  showCount?: boolean;
  maxVisible?: number;
  size?: 'sm' | 'md' | 'lg';
}

export function RealTimeViewers({
  viewers,
  lockInfo,
  currentUserId,
  showCount = true,
  maxVisible = 3,
  size = 'sm'
}: RealTimeViewersProps) {
  const { t } = useTranslation();
  
  if (viewers.length === 0 && !lockInfo) return null;
  
  const otherViewers = viewers.filter(v => v.userId !== currentUserId);
  const visibleViewers = otherViewers.slice(0, maxVisible);
  const remainingCount = otherViewers.length - maxVisible;
  
  const sizeClasses = {
    sm: 'h-6 w-6 text-xs',
    md: 'h-8 w-8 text-sm',
    lg: 'h-10 w-10 text-base'
  };
  
  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };
  
  return (
    <TooltipProvider>
      <div className="flex items-center gap-1.5" data-testid="realtime-viewers">
        {lockInfo && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className={`flex items-center gap-1 px-2 py-1 rounded-full ${
                lockInfo.lockType === 'edit' 
                  ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' 
                  : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
              }`}>
                <Lock className="h-3 w-3" />
                <span className="text-xs font-medium truncate max-w-20">
                  {lockInfo.lockedByUserName.split(' ')[0]}
                </span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p className="font-medium">
                {lockInfo.lockType === 'edit' ? 'Editing' : 'Viewing'}: {lockInfo.lockedByUserName}
              </p>
              <p className="text-xs text-muted-foreground">
                Since {new Date(lockInfo.lockedAt).toLocaleTimeString()}
              </p>
            </TooltipContent>
          </Tooltip>
        )}
        
        {visibleViewers.length > 0 && (
          <div className="flex -space-x-2">
            {visibleViewers.map((viewer) => (
              <Tooltip key={viewer.socketId}>
                <TooltipTrigger asChild>
                  <Avatar className={`${sizeClasses[size]} border-2 border-background ring-2 ring-green-400`}>
                    {viewer.userAvatar ? (
                      <AvatarImage src={viewer.userAvatar} alt={viewer.userName} />
                    ) : null}
                    <AvatarFallback className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                      {getInitials(viewer.userName)}
                    </AvatarFallback>
                  </Avatar>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="font-medium flex items-center gap-1">
                    <Eye className="h-3 w-3" />
                    {viewer.userName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Viewing since {new Date(viewer.joinedAt).toLocaleTimeString()}
                  </p>
                </TooltipContent>
              </Tooltip>
            ))}
            
            {remainingCount > 0 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className={`${sizeClasses[size]} rounded-full bg-muted flex items-center justify-center border-2 border-background`}>
                    <span className="text-xs font-medium">+{remainingCount}</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="font-medium">{remainingCount} more viewers</p>
                  {otherViewers.slice(maxVisible).map(v => (
                    <p key={v.socketId} className="text-xs">{v.userName}</p>
                  ))}
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        )}
        
        {showCount && otherViewers.length > 0 && (
          <Badge variant="secondary" className="gap-1 text-xs">
            <Users className="h-3 w-3" />
            {otherViewers.length}
          </Badge>
        )}
      </div>
    </TooltipProvider>
  );
}

interface LockOverlayProps {
  lockInfo: LockInfo;
  onRequestAccess?: () => void;
}

export function LockOverlay({ lockInfo, onRequestAccess }: LockOverlayProps) {
  const { t } = useTranslation();
  
  return (
    <div 
      className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center"
      data-testid="lock-overlay"
    >
      <div className="bg-card border rounded-lg shadow-lg p-6 max-w-md mx-4 text-center">
        <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-4">
          <Lock className="h-8 w-8 text-red-600 dark:text-red-400" />
        </div>
        <h3 className="text-lg font-semibold mb-2">
          {lockInfo.lockType === 'edit' ? 'Currently Being Edited' : 'Currently Being Viewed'}
        </h3>
        <p className="text-muted-foreground mb-4">
          <span className="font-medium">{lockInfo.lockedByUserName}</span> is currently {lockInfo.lockType === 'edit' ? 'editing' : 'viewing'} this {lockInfo.lockType === 'edit' ? 'item' : 'page'}. 
          You can view in read-only mode.
        </p>
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Eye className="h-4 w-4" />
          <span>Read-only mode active</span>
        </div>
      </div>
    </div>
  );
}

interface ViewerBadgeProps {
  viewers: RealTimeViewer[];
  currentUserId?: string;
}

export function ViewerBadge({ viewers, currentUserId }: ViewerBadgeProps) {
  const otherViewers = viewers.filter(v => v.userId !== currentUserId);
  
  if (otherViewers.length === 0) return null;
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            variant="outline" 
            className="gap-1 bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800"
          >
            <Eye className="h-3 w-3" />
            {otherViewers.length} viewing
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <div className="space-y-1">
            {otherViewers.map(v => (
              <p key={v.socketId} className="text-sm">{v.userName}</p>
            ))}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
