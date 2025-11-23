import { useState, useEffect } from "react";
import { Bell, Search, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { normalizeVietnamese } from "@/lib/fuzzySearch";
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { useLocation } from 'wouter';
import { apiRequest, queryClient } from '@/lib/queryClient';

interface Notification {
  id: number;
  userId: string;
  title: string;
  description: string | null;
  type: string;
  isRead: boolean;
  actionUrl: string | null;
  actionLabel: string | null;
  metadata: any;
  createdAt: string;
  userName?: string;
}

export function TopBar() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");
  const [showNotifications, setShowNotifications] = useState(false);
  const [, setLocation] = useLocation();

  const isAdmin = user?.role === 'administrator';

  const { data: notifications = [], refetch: refetchNotifications } = useQuery<Notification[]>({
    queryKey: ['/api/notifications?limit=20'],
    staleTime: 30 * 1000,
    refetchInterval: 30 * 1000,
  });

  const { data: unreadData } = useQuery<{ count: number }>({
    queryKey: ['/api/notifications/unread-count'],
    staleTime: 30 * 1000,
    refetchInterval: 30 * 1000,
  });

  const unreadCount = unreadData?.count || 0;

  // Auto-mark notifications as read when dialog opens (1-second impression threshold)
  useEffect(() => {
    if (showNotifications && unreadCount > 0) {
      // Wait 1 second before marking as read (impression threshold)
      const timer = setTimeout(() => {
        markAllAsReadMutation.mutate();
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [showNotifications, unreadCount, markAllAsReadMutation]);

  // Mutation to mark a single notification as read
  const markAsReadMutation = useMutation({
    mutationFn: (notificationId: number) =>
      apiRequest('PATCH', `/api/notifications/${notificationId}/read`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications?limit=20'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/unread-count'] });
      refetchNotifications();
    },
  });

  // Mutation to mark all notifications as read
  const markAllAsReadMutation = useMutation({
    mutationFn: () =>
      apiRequest('POST', '/api/notifications/mark-all-read'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications?limit=20'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/unread-count'] });
      refetchNotifications();
    },
  });

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    
    // Real-time search with Vietnamese diacritics support
    const normalizedQuery = normalizeVietnamese(value.toLowerCase());
    // TODO: Implement search across all entities
    console.log('Searching for:', normalizedQuery);
  };

  const getTypeColor = (type: string): string => {
    const colors = {
      success: 'bg-green-50 dark:bg-green-950/20',
      error: 'bg-red-50 dark:bg-red-950/20',
      warning: 'bg-orange-50 dark:bg-orange-950/20',
      info: 'bg-blue-50 dark:bg-blue-950/20',
    };
    return colors[type as keyof typeof colors] || 'bg-slate-50 dark:bg-slate-950/20';
  };

  const handleNotificationClick = (notification: Notification) => {
    // Mark as read if unread and has an action URL
    if (notification.actionUrl && !notification.isRead) {
      markAsReadMutation.mutate(notification.id);
    }
    
    if (notification.actionUrl) {
      setShowNotifications(false);
      setLocation(notification.actionUrl);
    }
  };

  const handleMarkAsRead = (e: React.MouseEvent, notificationId: number) => {
    e.stopPropagation(); // Prevent notification click handler from firing
    markAsReadMutation.mutate(notificationId);
  };

  const handleMarkAllAsRead = () => {
    markAllAsReadMutation.mutate();
  };

  return (
    <>
      <header className="bg-white dark:bg-slate-800 shadow-sm border-b border-slate-200 dark:border-slate-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-200">{t('common:dashboard')}</h2>
            
            {/* Vietnamese Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400 dark:text-slate-500" />
              <Input
                type="text"
                placeholder={t('common:searchPlaceholder')}
                value={searchQuery}
                onChange={handleSearch}
                className="pl-10 w-80"
              />
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Notifications */}
            <Button
              variant="ghost"
              size="icon"
              className="relative"
              onClick={() => setShowNotifications(true)}
              data-testid="button-notifications"
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <Badge 
                  variant="destructive" 
                  className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
                >
                  {unreadCount}
                </Badge>
              )}
            </Button>
            
            {/* User Profile */}
            <div className="flex items-center space-x-2">
              <Avatar className="h-8 w-8">
                <AvatarImage 
                  src={user?.profileImageUrl} 
                  alt={user?.firstName || 'User'} 
                  className="object-contain bg-slate-50 dark:bg-slate-900"
                />
                <AvatarFallback>
                  {user?.firstName?.[0]}{user?.lastName?.[0]}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                {user?.firstName} {user?.lastName}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Notification Modal */}
      <Dialog open={showNotifications} onOpenChange={setShowNotifications}>
        <DialogContent className="sm:max-w-md bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="text-slate-900 dark:text-slate-100">
                {t('common:notifications')}
              </DialogTitle>
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleMarkAllAsRead}
                  disabled={markAllAsReadMutation.isPending}
                  data-testid="button-mark-all-read"
                  className="text-xs"
                >
                  {markAllAsReadMutation.isPending ? t('common:marking') : t('common:markAllAsRead')}
                </Button>
              )}
            </div>
          </DialogHeader>
          <div className="space-y-3 max-h-[60vh] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {t('common:noNotifications')}
                </p>
              </div>
            ) : (
              notifications.map((notif) => (
                <div 
                  key={notif.id}
                  className={`flex items-start space-x-3 p-3 rounded-lg transition-colors ${getTypeColor(notif.type)} ${
                    notif.actionUrl ? 'cursor-pointer hover:opacity-80' : ''
                  }`}
                  onClick={() => handleNotificationClick(notif)}
                  data-testid={`notification-${notif.id}`}
                >
                  {!notif.isRead && (
                    <div className="w-2 h-2 rounded-full bg-blue-600 dark:bg-blue-500 mt-1.5 flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${!notif.isRead ? 'font-semibold' : 'font-medium'} text-slate-900 dark:text-slate-100`}>
                      {notif.title}
                    </p>
                    {notif.description && (
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                        {notif.description}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-xs text-slate-500 dark:text-slate-500">
                        {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true })}
                      </p>
                      {isAdmin && notif.userName && (
                        <>
                          <span className="text-xs text-slate-400 dark:text-slate-600">•</span>
                          <span className="text-xs text-slate-500 dark:text-slate-500">
                            by {notif.userName}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  {!notif.isRead && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => handleMarkAsRead(e, notif.id)}
                      disabled={markAsReadMutation.isPending}
                      data-testid={`button-mark-read-${notif.id}`}
                      className="flex-shrink-0 h-7 px-2 text-xs hover:bg-slate-200 dark:hover:bg-slate-700"
                      title={t('common:markAsRead') || 'Mark as read'}
                    >
                      <Check className="h-3 w-3 mr-1" />
                      {t('common:markAsRead') || 'Mark as read'}
                    </Button>
                  )}
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
