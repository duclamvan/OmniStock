import type { Notification } from '@shared/schema';

export interface GroupedNotification {
  key: string;
  title: string;
  description: string | null;
  type: string;
  count: number;
  hasUnread: boolean;
  latestCreatedAt: Date;
  latestNotificationId: number;
  actionUrl: string | null;
  actionLabel: string | null;
  notifications: Notification[];
}

export function groupNotifications(notifications: Notification[]): GroupedNotification[] {
  if (!notifications || notifications.length === 0) {
    return [];
  }

  const groups = new Map<string, GroupedNotification>();

  for (const notification of notifications) {
    const key = `${notification.title}|${notification.type}|${notification.description || ''}`;

    if (groups.has(key)) {
      const group = groups.get(key)!;
      group.count++;
      group.notifications.push(notification);
      if (!notification.isRead) {
        group.hasUnread = true;
      }
      const notifDate = new Date(notification.createdAt);
      if (notifDate > group.latestCreatedAt) {
        group.latestCreatedAt = notifDate;
        group.latestNotificationId = notification.id;
        if (notification.actionUrl) {
          group.actionUrl = notification.actionUrl;
          group.actionLabel = notification.actionLabel;
        }
      }
      if (!group.actionUrl && notification.actionUrl) {
        group.actionUrl = notification.actionUrl;
        group.actionLabel = notification.actionLabel;
      }
    } else {
      groups.set(key, {
        key,
        title: notification.title,
        description: notification.description,
        type: notification.type,
        count: 1,
        hasUnread: !notification.isRead,
        latestCreatedAt: new Date(notification.createdAt),
        latestNotificationId: notification.id,
        actionUrl: notification.actionUrl,
        actionLabel: notification.actionLabel,
        notifications: [notification],
      });
    }
  }

  return Array.from(groups.values()).sort(
    (a, b) => b.latestCreatedAt.getTime() - a.latestCreatedAt.getTime()
  );
}
