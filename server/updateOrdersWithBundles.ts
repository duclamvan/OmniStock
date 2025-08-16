import { nanoid } from 'nanoid';
import { db } from './db';
import { orderItems } from '@shared/schema';
import { eq } from 'drizzle-orm';

async function updateOrdersWithBundles() {
  console.log('Updating orders to include bundle products...');
  
  try {
    // Update order items to mark some as bundles by changing their product names
    const updates = [
      // Order 1 - Make first item a Tech bundle
      {
        orderId: 'ord-pick-1',
        oldProductName: 'Dell XPS 15 Laptop',
        newProductName: 'Tech Professional Starter Kit',
        sku: 'BUNDLE-TECH-START',
        isBundle: true
      },
      // Order 2 - Make the lipstick items a beauty bundle
      {
        orderId: 'ord-pick-2',
        oldProductName: 'Luxury Matte Lipstick - Classic Red #001',
        newProductName: 'Complete Beauty Collection - Classic Red #001',
        sku: 'BUNDLE-BEAUTY-RED',
        isBundle: true
      },
      // Order 3 - Make LEGO item a Kids bundle
      {
        orderId: 'ord-picking-1',
        oldProductName: 'LEGO City Police Station',
        newProductName: 'Kids Entertainment Bundle',
        sku: 'BUNDLE-KIDS-PLAY',
        isBundle: true
      },
      // Order 5 - Mark vase item as part of Tech bundle
      {
        orderId: 'ord-packing-2',
        oldProductName: 'Crystal Glass Vase',
        newProductName: 'Tech Professional Starter Kit',
        sku: 'BUNDLE-TECH-START',
        isBundle: true
      }
    ];
    
    for (const update of updates) {
      console.log(`Updating ${update.oldProductName} to ${update.newProductName} in order ${update.orderId}`);
      
      // Find and update the order item
      const items = await db.select()
        .from(orderItems)
        .where(eq(orderItems.orderId, update.orderId));
      
      const itemToUpdate = items.find(item => 
        item.productName === update.oldProductName || 
        item.productName?.includes(update.oldProductName.split(' - ')[0])
      );
      
      if (itemToUpdate) {
        await db.update(orderItems)
          .set({
            productName: update.newProductName,
            sku: update.sku
          })
          .where(eq(orderItems.id, itemToUpdate.id));
        console.log(`✓ Updated item ${itemToUpdate.id}`);
      } else {
        console.log(`✗ Item not found for ${update.oldProductName} in order ${update.orderId}`);
      }
    }
    
    console.log('✅ Orders updated with bundle products!');
  } catch (error) {
    console.error('Error updating orders:', error);
    throw error;
  }
}

// Execute the update function
if (import.meta.url === `file://${process.argv[1]}`) {
  updateOrdersWithBundles()
    .then(() => {
      console.log('Update completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Failed to update orders:', error);
      process.exit(1);
    });
}