import { db } from "./db";
import { orderItems, orders } from "@shared/schema";
import { eq } from "drizzle-orm";

export async function addMissingOrderItems() {
  try {
    // Get all orders
    const allOrders = await db.select().from(orders);
    
    console.log(`Found ${allOrders.length} orders`);
    
    // Define order items data by orderId
    const orderItemsData: Record<string, any[]> = {
      '20250201001': [
        { productName: 'Samsung Frame TV 65"', quantity: 1, price: '25999.00', total: '25999.00' }
      ],
      '20250201002': [
        { productName: 'MacBook Pro 16" M3', quantity: 1, price: '75000.00', total: '75000.00' },
        { productName: 'iPad Pro 12.9"', quantity: 1, price: '24999.00', total: '24999.00' }
      ],
      '20250301001': [
        { productName: 'Sony WH-1000XM5', quantity: 2, price: '8999.00', total: '17998.00' }
      ],
      '20250301002': [
        { productName: 'DJI Mini 3 Pro', quantity: 1, price: '21999.00', total: '21999.00' }
      ],
      '20250401001': [
        { productName: 'iPhone 15 Pro Max', quantity: 1, price: '1299.00', total: '1299.00' },
        { productName: 'Apple Watch Series 9', quantity: 1, price: '499.00', total: '499.00' }
      ],
      '20250501001': [
        { productName: 'Dyson V15 Detect', quantity: 1, price: '15999.00', total: '15999.00' }
      ],
      '20250802001': [
        { productName: 'iPhone 15 Pro Max', quantity: 2, price: '2600.00', total: '5200.00' },
        { productName: 'AirPods Pro (2nd Gen)', quantity: 1, price: '300.00', total: '300.00' }
      ],
      '20250802002': [
        { productName: 'MacBook Pro 16" M3', quantity: 1, price: '32500.00', total: '32500.00' },
        { productName: 'AirPods Pro (2nd Gen)', quantity: 2, price: '6250.00', total: '12500.00' }
      ]
    };
    
    // Add items to each order
    for (const order of allOrders) {
      const items = orderItemsData[order.orderId];
      
      if (items && items.length > 0) {
        // Check if order already has items
        const existingItems = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));
        
        if (existingItems.length === 0) {
          console.log(`Adding ${items.length} items to order ${order.orderId}`);
          
          for (const item of items) {
            await db.insert(orderItems).values({
              orderId: order.id,
              productName: item.productName,
              quantity: item.quantity,
              price: item.price,
              total: item.total,
              discount: '0',
              tax: '0'
            });
          }
        } else {
          console.log(`Order ${order.orderId} already has ${existingItems.length} items`);
        }
      }
    }
    
    console.log("Order items fix completed!");
  } catch (error) {
    console.error("Error fixing order items:", error);
  }
}