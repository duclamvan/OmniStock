import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckCircle, XCircle, AlertTriangle, Info, ExternalLink } from 'lucide-react';
import { Link } from 'wouter';
import { formatDistanceToNow } from 'date-fns';
import type { Notification } from '@shared/schema';

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

export default function Notifications() {
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

  const markAsReadMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest('PATCH', `/api/notifications/${id}/read`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/unread-count'] });
    },
  });

  const handleMarkAsRead = (id: number) => {
    markAsReadMutation.mutate(id);
  };

  if (isLoading) {
    return (
      <div className="container max-w-4xl mx-auto px-4 py-6 space-y-4">
        <h1 className="text-2xl font-bold mb-6 text-gray-900 dark:text-gray-100">Notifications</h1>
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
    <div className="container max-w-4xl mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2 text-gray-900 dark:text-gray-100" data-testid="heading-notifications">Notifications</h1>
        <p className="text-muted-foreground dark:text-gray-400">View and manage your notifications</p>
      </div>

      <Tabs value={filter} onValueChange={(v) => setFilter(v as 'all' | 'unread')} className="mb-6">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="all" data-testid="tab-all">All</TabsTrigger>
          <TabsTrigger value="unread" data-testid="tab-unread">Unread</TabsTrigger>
        </TabsList>
      </Tabs>

      {notifications.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Info className="h-12 w-12 text-muted-foreground dark:text-gray-400 mb-4" />
            <p className="text-lg font-medium text-muted-foreground dark:text-gray-300" data-testid="text-empty-state">
              {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
            </p>
            <p className="text-sm text-muted-foreground dark:text-gray-400 mt-2">
              {filter === 'unread' 
                ? "You're all caught up!" 
                : 'Notifications will appear here when you receive them'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {notifications.map((notification) => {
            const Icon = ICON_MAP[notification.type as keyof typeof ICON_MAP] || Info;
            const iconColor = COLOR_MAP[notification.type as keyof typeof COLOR_MAP] || COLOR_MAP.info;
            const badgeVariant = BADGE_VARIANT_MAP[notification.type as keyof typeof BADGE_VARIANT_MAP] || 'outline';

            return (
              <Card 
                key={notification.id} 
                className={notification.isRead ? 'opacity-60 dark:opacity-50' : ''}
                data-testid={`notification-${notification.id}`}
              >
                <CardHeader>
                  <div className="flex items-start gap-4">
                    <Icon className={`h-6 w-6 flex-shrink-0 mt-1 ${iconColor}`} data-testid={`icon-${notification.type}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <CardTitle className="text-lg text-gray-900 dark:text-gray-100" data-testid={`title-${notification.id}`}>
                          {notification.title}
                        </CardTitle>
                        <Badge variant={badgeVariant} className="flex-shrink-0" data-testid={`badge-${notification.type}`}>
                          {notification.type}
                        </Badge>
                      </div>
                      {notification.description && (
                        <CardDescription className="text-sm text-gray-600 dark:text-gray-400" data-testid={`description-${notification.id}`}>
                          {notification.description}
                        </CardDescription>
                      )}
                      <div className="flex flex-wrap items-center gap-3 mt-4">
                        <span className="text-xs text-muted-foreground dark:text-gray-400" data-testid={`timestamp-${notification.id}`}>
                          {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                        </span>
                        {!notification.isRead && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleMarkAsRead(notification.id)}
                            disabled={markAsReadMutation.isPending}
                            data-testid={`button-mark-read-${notification.id}`}
                          >
                            Mark as read
                          </Button>
                        )}
                        {notification.actionUrl && notification.actionLabel && (
                          <Link href={notification.actionUrl}>
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="gap-1"
                              data-testid={`button-action-${notification.id}`}
                            >
                              {notification.actionLabel}
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
