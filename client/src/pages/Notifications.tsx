import { useState, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckCircle, XCircle, AlertTriangle, Info, ExternalLink, Package, Warehouse, Box, ShoppingCart, Truck, Users, Receipt, LayoutDashboard, ClipboardList, Settings, Archive, Tag, CreditCard, FileText, BarChart3 } from 'lucide-react';
import { Link } from 'wouter';
import { formatDistanceToNow } from 'date-fns';
import type { Notification } from '@shared/schema';
import { groupNotifications, type GroupedNotification } from '@/lib/notificationUtils';

const ICON_MAP = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};

const COLOR_MAP = {
  success: 'text-green-600 dark:text-green-400',
  error: 'text-red-600 dark:text-red-400',
  warning: 'text-yellow-600 dark:text-yellow-400',
  info: 'text-blue-600 dark:text-blue-400',
};

const BADGE_VARIANT_MAP = {
  success: 'default' as const,
  error: 'destructive' as const,
  warning: 'secondary' as const,
  info: 'outline' as const,
};

function getBackgroundIcon(actionUrl: string | null, type: string): React.ComponentType<{ className?: string }> {
  if (actionUrl) {
    if (actionUrl.includes('/receiving') || actionUrl.includes('/imports')) return Warehouse;
    if (actionUrl.includes('/order') || actionUrl.includes('/pick-pack')) return Package;
    if (actionUrl.includes('/inventory') || actionUrl.includes('/product')) return Box;
    if (actionUrl.includes('/customer')) return Users;
    if (actionUrl.includes('/shipping') || actionUrl.includes('/carrier')) return Truck;
    if (actionUrl.includes('/pos') || actionUrl.includes('/sale')) return ShoppingCart;
    if (actionUrl.includes('/invoice') || actionUrl.includes('/receipt')) return Receipt;
    if (actionUrl.includes('/dashboard')) return LayoutDashboard;
    if (actionUrl.includes('/task')) return ClipboardList;
    if (actionUrl.includes('/report')) return BarChart3;
    if (actionUrl.includes('/setting')) return Settings;
    if (actionUrl.includes('/return')) return Archive;
    if (actionUrl.includes('/discount') || actionUrl.includes('/price')) return Tag;
    if (actionUrl.includes('/payment')) return CreditCard;
    if (actionUrl.includes('/document') || actionUrl.includes('/file')) return FileText;
  }
  
  switch (type) {
    case 'success': return CheckCircle;
    case 'error': return XCircle;
    case 'warning': return AlertTriangle;
    case 'info':
    default: return Info;
  }
}

export default function Notifications() {
  const { t } = useTranslation(['system', 'common']);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const { data: notifications = [], isLoading } = useQuery<Notification[]>({
    queryKey: ['/api/notifications', filter],
    queryFn: async () => {
      const url = new URL('/api/notifications', window.location.origin);
      if (filter === 'unread') {
        url.searchParams.set('status', 'unread');
      }
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch notifications');
      return res.json();
    },
  });

  const groupedNotifications = useMemo(() => {
    return groupNotifications(notifications);
  }, [notifications]);

  const markAsReadMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      await Promise.all(ids.map(id => apiRequest('PATCH', `/api/notifications/${id}/read`, {})));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/unread-count'] });
    },
  });

  const handleMarkGroupAsRead = (group: GroupedNotification) => {
    const unreadIds = group.notifications.filter(n => !n.isRead).map(n => n.id);
    if (unreadIds.length > 0) {
      markAsReadMutation.mutate(unreadIds);
    }
  };

  if (isLoading) {
    return (
      <div className="container max-w-4xl mx-auto px-4 py-6 space-y-4">
        <h1 className="text-2xl font-bold mb-6 text-gray-900 dark:text-gray-100">{t('system:notifications')}</h1>
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-1/2 mt-2" />
            </CardHeader>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto px-2 sm:px-4 py-4 sm:py-6 overflow-x-hidden">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2 text-gray-900 dark:text-gray-100" data-testid="heading-notifications">{t('system:notifications')}</h1>
        <p className="text-muted-foreground dark:text-gray-400">{t('system:viewAndManageNotifications')}</p>
      </div>

      <Tabs value={filter} onValueChange={(v) => setFilter(v as 'all' | 'unread')} className="mb-6">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="all" data-testid="tab-all">{t('common:all')}</TabsTrigger>
          <TabsTrigger value="unread" data-testid="tab-unread">{t('system:unread')}</TabsTrigger>
        </TabsList>
      </Tabs>

      {groupedNotifications.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Info className="h-12 w-12 text-muted-foreground dark:text-gray-400 mb-4" />
            <p className="text-lg font-medium text-muted-foreground dark:text-gray-300" data-testid="text-empty-state">
              {filter === 'unread' ? t('system:noUnreadNotifications') : t('system:noNotificationsYet')}
            </p>
            <p className="text-sm text-muted-foreground dark:text-gray-400 mt-2">
              {filter === 'unread' 
                ? t('system:allCaughtUp')
                : t('system:notificationsWillAppear')}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {groupedNotifications.map((group) => {
            const Icon = ICON_MAP[group.type as keyof typeof ICON_MAP] || Info;
            const iconColor = COLOR_MAP[group.type as keyof typeof COLOR_MAP] || COLOR_MAP.info;
            const badgeVariant = BADGE_VARIANT_MAP[group.type as keyof typeof BADGE_VARIANT_MAP] || 'outline';
            const BackgroundIcon = getBackgroundIcon(group.actionUrl, group.type);

            return (
              <Card 
                key={group.key} 
                className={`relative overflow-hidden ${!group.hasUnread ? 'opacity-60 dark:opacity-50' : ''}`}
                data-testid={`notification-group-${group.latestNotificationId}`}
              >
                {/* Faded background icon */}
                <BackgroundIcon className="absolute -right-4 top-1/2 -translate-y-1/2 h-32 w-32 text-gray-100 dark:text-gray-800/40 pointer-events-none" />
                
                <CardHeader className="relative z-10">
                  <div className="flex items-start gap-4">
                    <Icon className={`h-6 w-6 flex-shrink-0 mt-1 ${iconColor}`} data-testid={`icon-${group.type}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-lg text-gray-900 dark:text-gray-100" data-testid={`title-${group.latestNotificationId}`}>
                            {group.title}
                          </CardTitle>
                          {group.count > 1 && (
                            <Badge 
                              variant="secondary" 
                              className="bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300"
                              data-testid={`count-${group.latestNotificationId}`}
                            >
                              ×{group.count}
                            </Badge>
                          )}
                        </div>
                        <Badge variant={badgeVariant} className="flex-shrink-0" data-testid={`badge-${group.type}`}>
                          {t(`system:${group.type}`)}
                        </Badge>
                      </div>
                      {group.description && (
                        <CardDescription className="text-sm text-gray-600 dark:text-gray-400" data-testid={`description-${group.latestNotificationId}`}>
                          {group.description}
                        </CardDescription>
                      )}
                      <div className="flex flex-wrap items-center gap-3 mt-4">
                        <span className="text-xs text-muted-foreground dark:text-gray-400" data-testid={`timestamp-${group.latestNotificationId}`}>
                          {formatDistanceToNow(group.latestCreatedAt, { addSuffix: true })}
                        </span>
                        {group.hasUnread && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleMarkGroupAsRead(group)}
                            disabled={markAsReadMutation.isPending}
                            data-testid={`button-mark-read-${group.latestNotificationId}`}
                          >
                            {group.count > 1 ? t('system:markAllAsRead') : t('system:markAsRead')}
                          </Button>
                        )}
                        {group.actionUrl && group.actionLabel && (
                          <Link href={group.actionUrl}>
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="gap-1"
                              data-testid={`button-action-${group.latestNotificationId}`}
                            >
                              {group.actionLabel}
                              <ExternalLink className="h-3 w-3" />
                            </Button>
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
