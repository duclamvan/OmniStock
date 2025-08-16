import { storage } from './storage.js';

async function fixOrderStatuses() {
  console.log('Fixing order statuses...');
  
  const orderIds = ['ord-pick-1', 'ord-pick-2', 'ord-picking-1'];
  
  for (const orderId of orderIds) {
    try {
      const order = await storage.updateOrder(orderId, {
        pickStatus: 'completed',
        packStatus: 'in_progress',
        pickEndTime: new Date(),
        packStartTime: new Date()
      });
      console.log(`Updated order ${orderId}:`, order.orderId, order.pickStatus, order.packStatus);
    } catch (error) {
      console.error(`Failed to update order ${orderId}:`, error);
    }
  }
  
  console.log('Done!');
  process.exit(0);
}

fixOrderStatuses();