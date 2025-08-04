import { db } from './db';
import { returns, returnItems, orders, customers } from '../shared/schema';
import { randomUUID } from 'crypto';

export async function seedReturns() {
  console.log('Seeding returns data...');
  
  try {
    // Get some existing orders and customers
    const existingOrders = await db.select().from(orders).limit(5);
    const existingCustomers = await db.select().from(customers).limit(5);
    
    if (existingOrders.length === 0 || existingCustomers.length === 0) {
      console.log('No orders or customers found. Please seed orders and customers first.');
      return;
    }
    
    // Create returns
    const returnsData = [
      {
        id: randomUUID(),
        returnId: '#RET-20250105-01',
        orderId: existingOrders[0].id,
        customerId: existingOrders[0].customerId,
        reason: 'Product damaged during shipping. Package was mishandled and arrived with visible damage.',
        status: 'pending' as const,
        createdAt: new Date('2025-01-05T10:00:00Z'),
        updatedAt: new Date('2025-01-05T10:00:00Z'),
      },
      {
        id: randomUUID(),
        returnId: '#RET-20250104-01',
        orderId: existingOrders[1]?.id || existingOrders[0].id,
        customerId: existingOrders[1]?.customerId || existingOrders[0].customerId,
        reason: 'Wrong product received. Ordered blue variant but received red.',
        status: 'approved' as const,
        createdAt: new Date('2025-01-04T14:30:00Z'),
        updatedAt: new Date('2025-01-04T16:00:00Z'),
      },
      {
        id: randomUUID(),
        returnId: '#RET-20250103-01',
        orderId: existingOrders[2]?.id || existingOrders[0].id,
        customerId: existingOrders[2]?.customerId || existingOrders[0].customerId,
        reason: 'Changed mind about the purchase. Product not as expected.',
        status: 'rejected' as const,
        createdAt: new Date('2025-01-03T09:15:00Z'),
        updatedAt: new Date('2025-01-03T11:00:00Z'),
      },
      {
        id: randomUUID(),
        returnId: '#RET-20250103-02',
        orderId: existingOrders[3]?.id || existingOrders[0].id,
        customerId: existingOrders[3]?.customerId || existingOrders[0].customerId,
        reason: 'Product defective. Not working as described.',
        status: 'processing' as const,
        createdAt: new Date('2025-01-03T13:45:00Z'),
        updatedAt: new Date('2025-01-03T13:45:00Z'),
      },
      {
        id: randomUUID(),
        returnId: '#RET-20250102-01',
        orderId: existingOrders[4]?.id || existingOrders[0].id,
        customerId: existingOrders[4]?.customerId || existingOrders[0].customerId,
        reason: 'Size too small. Need to exchange for larger size.',
        status: 'refunded' as const,
        createdAt: new Date('2025-01-02T11:20:00Z'),
        updatedAt: new Date('2025-01-02T15:30:00Z'),
      },
    ];
    
    // Insert returns
    await db.insert(returns).values(returnsData);
    
    // Create return items (assuming each return has 1-2 items)
    const returnItemsData = [];
    
    for (const returnData of returnsData) {
      // Get order items for this return's order
      const order = existingOrders.find(o => o.id === returnData.orderId);
      if (order && order.items && order.items.length > 0) {
        // Add first item from order
        returnItemsData.push({
          id: randomUUID(),
          returnId: returnData.id,
          productId: order.items[0].productId,
          quantity: Math.min(order.items[0].quantity, 2),
          reason: 'Defective',
        });
        
        // Sometimes add second item
        if (order.items.length > 1 && Math.random() > 0.5) {
          returnItemsData.push({
            id: randomUUID(),
            returnId: returnData.id,
            productId: order.items[1].productId,
            quantity: 1,
            reason: 'Wrong item',
          });
        }
      }
    }
    
    if (returnItemsData.length > 0) {
      await db.insert(returnItems).values(returnItemsData);
    }
    
    console.log(`Seeded ${returnsData.length} returns with ${returnItemsData.length} items`);
  } catch (error) {
    console.error('Error seeding returns:', error);
    throw error;
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedReturns()
    .then(() => {
      console.log('Returns seeding completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Failed to seed returns:', error);
      process.exit(1);
    });
}