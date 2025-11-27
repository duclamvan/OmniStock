import webpush from 'web-push';
import { db } from '../db';
import { pushSubscriptions, users } from '@shared/schema';
import { eq, and, inArray } from 'drizzle-orm';

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    'mailto:admin@daviesupply.com',
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
  );
  console.log('[Push Notifications] VAPID configured successfully');
} else {
  console.warn('[Push Notifications] VAPID keys not found, push notifications disabled');
}

export interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  url?: string;
  tag?: string;
  actions?: { action: string; title: string }[];
  requireInteraction?: boolean;
}

export async function sendPushNotification(
  userId: string,
  payload: PushPayload,
  notificationType: string = 'new_order'
): Promise<{ success: number; failed: number }> {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    console.warn('[Push] VAPID not configured, skipping push notification');
    return { success: 0, failed: 0 };
  }

  try {
    const subscriptions = await db
      .select()
      .from(pushSubscriptions)
      .where(and(
        eq(pushSubscriptions.userId, userId),
        eq(pushSubscriptions.isActive, true)
      ));

    const relevantSubs = subscriptions.filter(sub => 
      sub.notificationTypes.includes(notificationType)
    );

    if (relevantSubs.length === 0) {
      console.log(`[Push] No active subscriptions for user ${userId} with type ${notificationType}`);
      return { success: 0, failed: 0 };
    }

    let success = 0;
    let failed = 0;

    for (const sub of relevantSubs) {
      try {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth
          }
        };

        await webpush.sendNotification(
          pushSubscription,
          JSON.stringify(payload),
          { TTL: 60 * 60 * 24 }
        );

        await db
          .update(pushSubscriptions)
          .set({ lastUsedAt: new Date() })
          .where(eq(pushSubscriptions.id, sub.id));

        success++;
        console.log(`[Push] Sent to subscription ${sub.id} for user ${userId}`);
      } catch (error: any) {
        failed++;
        console.error(`[Push] Failed to send to subscription ${sub.id}:`, error.message);
        
        if (error.statusCode === 410 || error.statusCode === 404) {
          await db
            .update(pushSubscriptions)
            .set({ isActive: false })
            .where(eq(pushSubscriptions.id, sub.id));
          console.log(`[Push] Marked subscription ${sub.id} as inactive (expired)`);
        }
      }
    }

    return { success, failed };
  } catch (error) {
    console.error('[Push] Error sending push notifications:', error);
    return { success: 0, failed: 0 };
  }
}

export async function sendPushToRole(
  role: string,
  payload: PushPayload,
  notificationType: string = 'new_order'
): Promise<{ success: number; failed: number }> {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    console.warn('[Push] VAPID not configured, skipping push notification');
    return { success: 0, failed: 0 };
  }

  try {
    const usersWithRole = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.role, role));

    if (usersWithRole.length === 0) {
      console.log(`[Push] No users found with role ${role}`);
      return { success: 0, failed: 0 };
    }

    const userIds = usersWithRole.map(u => u.id);

    const subscriptions = await db
      .select()
      .from(pushSubscriptions)
      .where(and(
        inArray(pushSubscriptions.userId, userIds),
        eq(pushSubscriptions.isActive, true)
      ));

    const relevantSubs = subscriptions.filter(sub => 
      sub.notificationTypes.includes(notificationType)
    );

    if (relevantSubs.length === 0) {
      console.log(`[Push] No active subscriptions for role ${role} with type ${notificationType}`);
      return { success: 0, failed: 0 };
    }

    console.log(`[Push] Sending to ${relevantSubs.length} subscriptions for role ${role}`);

    let success = 0;
    let failed = 0;

    for (const sub of relevantSubs) {
      try {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth
          }
        };

        await webpush.sendNotification(
          pushSubscription,
          JSON.stringify(payload),
          { TTL: 60 * 60 * 24 }
        );

        await db
          .update(pushSubscriptions)
          .set({ lastUsedAt: new Date() })
          .where(eq(pushSubscriptions.id, sub.id));

        success++;
      } catch (error: any) {
        failed++;
        console.error(`[Push] Failed to send to subscription ${sub.id}:`, error.message);
        
        if (error.statusCode === 410 || error.statusCode === 404) {
          await db
            .update(pushSubscriptions)
            .set({ isActive: false })
            .where(eq(pushSubscriptions.id, sub.id));
        }
      }
    }

    console.log(`[Push] Sent ${success} notifications, ${failed} failed for role ${role}`);
    return { success, failed };
  } catch (error) {
    console.error('[Push] Error sending push notifications to role:', error);
    return { success: 0, failed: 0 };
  }
}

export async function sendPushToAllWarehouseOperators(
  payload: PushPayload,
  notificationType: string = 'new_order'
): Promise<{ success: number; failed: number }> {
  const adminResult = await sendPushToRole('administrator', payload, notificationType);
  const operatorResult = await sendPushToRole('warehouse_operator', payload, notificationType);
  
  return {
    success: adminResult.success + operatorResult.success,
    failed: adminResult.failed + operatorResult.failed
  };
}

export function getVapidPublicKey(): string | null {
  return VAPID_PUBLIC_KEY || null;
}
