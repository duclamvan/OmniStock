import { db } from './db';
import { orders } from '@shared/schema';
import { eq } from 'drizzle-orm';

async function fixReadyToShipOrders() {
  try {
    console.log('Starting to fix ready_to_ship orders...');
    
    // Find all orders with ready_to_ship status
    const readyToShipOrders = await db
      .select()
      .from(orders)
      .where(eq(orders.orderStatus, 'ready_to_ship'));
    
    console.log(`Found ${readyToShipOrders.length} orders with ready_to_ship status`);
    
    // Update each order back to to_fulfill with pending pick/pack status
    for (const order of readyToShipOrders) {
      console.log(`Updating order ${order.orderId} from ready_to_ship to to_fulfill...`);
      
      await db
        .update(orders)
        .set({
          orderStatus: 'to_fulfill',
          pickStatus: 'not_started',
          packStatus: 'not_started',
          pickStartTime: null,
          pickEndTime: null,
          packStartTime: null,
          packEndTime: null,
          pickedBy: null,
          packedBy: null,
          updatedAt: new Date()
        })
        .where(eq(orders.id, order.id));
      
      console.log(`✓ Updated order ${order.orderId}`);
    }
    
    console.log(`\n✅ Successfully updated ${readyToShipOrders.length} orders back to to_fulfill status`);
    process.exit(0);
  } catch (error) {
    console.error('Error fixing orders:', error);
    process.exit(1);
  }
}

// Run the fix
fixReadyToShipOrders();