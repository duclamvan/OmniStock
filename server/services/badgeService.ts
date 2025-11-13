import { customers, orders, customerBadges } from '@shared/schema';
import { eq, and, sql } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';

export interface BadgeCalculationResult {
  badgeType: string;
  scope: 'customer' | 'order';
  orderId?: string;
  metadata: Record<string, any>;
}

/**
 * Calculate all badges for a customer
 */
export async function calculateCustomerBadges(
  customerId: string,
  database: NodePgDatabase<any>
): Promise<BadgeCalculationResult[]> {
  const badges: BadgeCalculationResult[] = [];

  try {
    const [customer] = await database
      .select()
      .from(customers)
      .where(eq(customers.id, customerId))
      .limit(1);

    if (!customer) {
      throw new Error(`Customer not found: ${customerId}`);
    }

    const totalSpent = parseFloat(customer.totalSpent || '0');
    const totalOrders = customer.totalOrders || 0;
    const avgOrderValue = parseFloat(customer.averageOrderValue || '0');
    const firstOrderDate = customer.firstOrderDate ? new Date(customer.firstOrderDate) : null;
    const lastOrderDate = customer.lastOrderDate ? new Date(customer.lastOrderDate) : null;
    const now = new Date();

    const daysSinceFirstOrder = firstOrderDate
      ? Math.floor((now.getTime() - firstOrderDate.getTime()) / (1000 * 60 * 60 * 24))
      : null;
    const daysSinceLastOrder = lastOrderDate
      ? Math.floor((now.getTime() - lastOrderDate.getTime()) / (1000 * 60 * 60 * 24))
      : null;

    // 1. VIP Badge
    if (customer.type === 'vip') {
      badges.push({
        badgeType: 'VIP',
        scope: 'customer',
        metadata: {
          manuallySet: true,
        },
      });
    }

    // 2. Spending Tier Badges
    if (totalSpent >= 100000) {
      badges.push({
        badgeType: 'Diamond',
        scope: 'customer',
        metadata: {
          amount: totalSpent,
          currency: 'EUR',
          threshold: 100000,
        },
      });
    } else if (totalSpent >= 50000) {
      badges.push({
        badgeType: 'Platinum',
        scope: 'customer',
        metadata: {
          amount: totalSpent,
          currency: 'EUR',
          threshold: 50000,
        },
      });
    } else if (totalSpent >= 25000) {
      badges.push({
        badgeType: 'Gold',
        scope: 'customer',
        metadata: {
          amount: totalSpent,
          currency: 'EUR',
          threshold: 25000,
        },
      });
    }

    // 3. Country Ranking Badges
    if (customer.customerRank === 'TOP10') {
      badges.push({
        badgeType: 'TOP10',
        scope: 'customer',
        metadata: {
          rank: 10,
          country: customer.country || 'Unknown',
        },
      });
    } else if (customer.customerRank === 'TOP50') {
      badges.push({
        badgeType: 'TOP50',
        scope: 'customer',
        metadata: {
          rank: 50,
          country: customer.country || 'Unknown',
        },
      });
    } else if (customer.customerRank === 'TOP100') {
      badges.push({
        badgeType: 'TOP100',
        scope: 'customer',
        metadata: {
          rank: 100,
          country: customer.country || 'Unknown',
        },
      });
    }

    // 4. Behavior Badges

    // New Customer (first order within 30 days)
    if (daysSinceFirstOrder !== null && daysSinceFirstOrder <= 30) {
      badges.push({
        badgeType: 'NewCustomer',
        scope: 'customer',
        metadata: {
          daysSinceFirstOrder,
          firstOrderDate: firstOrderDate?.toISOString(),
        },
      });
    }

    // First Timer (only 1 order)
    if (totalOrders === 1) {
      badges.push({
        badgeType: 'FirstTimer',
        scope: 'customer',
        metadata: {
          totalOrders: 1,
        },
      });
    }

    // Super Loyal (10+ orders)
    if (totalOrders >= 10) {
      badges.push({
        badgeType: 'SuperLoyal',
        scope: 'customer',
        metadata: {
          totalOrders,
        },
      });
    }
    // Loyal Customer (2-9 orders)
    else if (totalOrders > 1 && totalOrders < 10) {
      badges.push({
        badgeType: 'LoyalCustomer',
        scope: 'customer',
        metadata: {
          totalOrders,
        },
      });
    }

    // At Risk (no order in 90+ days, but has ordered before)
    if (daysSinceLastOrder !== null && daysSinceLastOrder > 90 && totalOrders > 0) {
      badges.push({
        badgeType: 'AtRisk',
        scope: 'customer',
        metadata: {
          daysSinceLastOrder,
          lastOrderDate: lastOrderDate?.toISOString(),
          totalOrders,
        },
      });
    }

    // High Value (avg order > 500)
    if (avgOrderValue > 500) {
      badges.push({
        badgeType: 'HighValue',
        scope: 'customer',
        metadata: {
          averageOrderValue: avgOrderValue,
          currency: customer.preferredCurrency || 'EUR',
        },
      });
    }

    return badges;
  } catch (error) {
    console.error(`Error calculating customer badges for ${customerId}:`, error);
    throw error;
  }
}

/**
 * Calculate badges for a specific order
 */
export async function calculateOrderBadges(
  orderId: string,
  database: NodePgDatabase<any>
): Promise<BadgeCalculationResult[]> {
  const badges: BadgeCalculationResult[] = [];

  try {
    const [order] = await database
      .select()
      .from(orders)
      .where(eq(orders.id, orderId))
      .limit(1);

    if (!order) {
      throw new Error(`Order not found: ${orderId}`);
    }

    // Pay Later Badge
    if (order.paymentStatus === 'pay_later') {
      badges.push({
        badgeType: 'PayLater',
        scope: 'order',
        orderId: order.id,
        metadata: {
          orderId: order.orderId,
          orderTotal: parseFloat(order.grandTotal || '0'),
          currency: order.currency || 'EUR',
        },
      });
    }

    return badges;
  } catch (error) {
    console.error(`Error calculating order badges for ${orderId}:`, error);
    throw error;
  }
}

/**
 * Refresh badges for a customer (delete old + insert new)
 * This handles both customer-scoped and order-scoped badges
 * Optimized to use set-based operations instead of per-order loops
 * Uses transaction to ensure atomic operation
 */
export async function refreshCustomerBadges(
  customerId: string,
  database: NodePgDatabase<any>
): Promise<void> {
  try {
    await database.transaction(async (tx) => {
      // 1. Calculate ALL badges FIRST (before deleting)
      const customerBadgeResults = await calculateCustomerBadges(customerId, tx);

      // Calculate order-level badges efficiently using set-based operations
      const payLaterOrders = await tx
        .select()
        .from(orders)
        .where(
          and(
            eq(orders.customerId, customerId),
            eq(orders.paymentStatus, 'pay_later')
          )
        );

      // Map pay_later orders directly to badge objects
      const orderBadgeResults: BadgeCalculationResult[] = payLaterOrders.map((order) => ({
        badgeType: 'PayLater',
        scope: 'order' as const,
        orderId: order.id,
        metadata: {
          orderId: order.orderId,
          orderTotal: parseFloat(order.grandTotal || '0'),
          currency: order.currency || 'EUR',
        },
      }));

      // Combine all badges
      const allBadges = [...customerBadgeResults, ...orderBadgeResults];

      // 2. Delete all existing badges for this customer
      await tx
        .delete(customerBadges)
        .where(eq(customerBadges.customerId, customerId));

      // 3. Bulk insert all new badges at once
      if (allBadges.length > 0) {
        const badgesToInsert = allBadges.map((badge) => ({
          customerId,
          orderId: badge.orderId || null,
          badgeType: badge.badgeType,
          scope: badge.scope,
          metadata: badge.metadata,
        }));

        await tx.insert(customerBadges).values(badgesToInsert);
      }
    });
  } catch (error) {
    console.error(`Error refreshing customer badges for ${customerId}:`, error);
    throw error;
  }
}

/**
 * Refresh badges for a specific order
 * This only updates order-scoped badges for the given order
 * Uses transaction to ensure atomic operation
 */
export async function refreshOrderBadges(
  orderId: string,
  database: NodePgDatabase<any>
): Promise<void> {
  try {
    await database.transaction(async (tx) => {
      // 1. Get the order to find the customer
      const [order] = await tx
        .select()
        .from(orders)
        .where(eq(orders.id, orderId))
        .limit(1);

      if (!order || !order.customerId) {
        throw new Error(`Order not found or has no customer: ${orderId}`);
      }

      // 2. Calculate order badges FIRST (before deleting)
      const orderBadgeResults = await calculateOrderBadges(orderId, tx);

      // 3. Delete existing order-scoped badges for this specific order
      await tx
        .delete(customerBadges)
        .where(
          and(
            eq(customerBadges.customerId, order.customerId),
            eq(customerBadges.scope, 'order'),
            eq(customerBadges.orderId, orderId)
          )
        );

      // 4. Insert new order badges if any exist
      if (orderBadgeResults.length > 0) {
        const badgesToInsert = orderBadgeResults.map((badge) => ({
          customerId: order.customerId!,
          orderId: badge.orderId || null,
          badgeType: badge.badgeType,
          scope: badge.scope,
          metadata: badge.metadata,
        }));

        await tx.insert(customerBadges).values(badgesToInsert);
      }
    });
  } catch (error) {
    console.error(`Error refreshing order badges for ${orderId}:`, error);
    throw error;
  }
}

/**
 * Bulk refresh badges for multiple customers
 * Useful for batch operations or scheduled jobs
 */
export async function bulkRefreshCustomerBadges(
  customerIds: string[],
  database: NodePgDatabase<any>
): Promise<{ success: string[]; failed: { id: string; error: string }[] }> {
  const success: string[] = [];
  const failed: { id: string; error: string }[] = [];

  for (const customerId of customerIds) {
    try {
      await refreshCustomerBadges(customerId, database);
      success.push(customerId);
    } catch (error) {
      failed.push({
        id: customerId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  return { success, failed };
}

/**
 * Get all badges for a customer (from database)
 */
export async function getCustomerBadges(
  customerId: string,
  database: NodePgDatabase<any>
): Promise<typeof customerBadges.$inferSelect[]> {
  return await database
    .select()
    .from(customerBadges)
    .where(eq(customerBadges.customerId, customerId));
}
