import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { nanoid } from 'nanoid';
import * as schema from '../shared/schema.js';

const { orderItems } = schema;

// Initialize database connection
const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });

async function addOrderItems() {
  console.log('Adding order items for ready orders...');
  
  try {
    // Add order items for the existing ready orders
    const readyOrderItems = [
      // Items for ord-ready-5 (Personal Delivery to Brno)
      {
        id: nanoid(),
        orderId: 'ord-ready-5',
        productId: 'prod-lipstick',
        productName: 'Luxury Matte Lipstick',
        sku: 'LIP-MAT-001',
        quantity: 2,
        price: '4500',
        unitPrice: '4500',
        appliedPrice: '4500',
        currency: 'CZK',
        total: '9000',
        pickedQuantity: 2,
        packedQuantity: 2,
        warehouseLocation: 'B2-R3-S2',
        barcode: '8594567890123'
      },
      {
        id: nanoid(),
        orderId: 'ord-ready-5',
        productId: 'prod-tshirt',
        productName: 'Premium Cotton T-Shirt',
        sku: 'TSH-COT-M',
        quantity: 3,
        price: '1167',
        unitPrice: '1167',
        appliedPrice: '1167',
        currency: 'CZK',
        total: '3500',
        pickedQuantity: 3,
        packedQuantity: 3,
        warehouseLocation: 'B2-R3-S5',
        barcode: '8594678901234'
      },
      // Items for ord-ready-6 (Express EUR order)
      {
        id: nanoid(),
        orderId: 'ord-ready-6',
        productId: 'prod-headphones',
        productName: 'Sony WH-1000XM5 Headphones',
        sku: 'SONY-WH1000XM5',
        quantity: 1,
        price: '85',
        unitPrice: '85',
        appliedPrice: '85',
        currency: 'EUR',
        total: '85',
        pickedQuantity: 1,
        packedQuantity: 1,
        warehouseLocation: 'C1-R2-S3',
        barcode: '8594789012345'
      },
      {
        id: nanoid(),
        orderId: 'ord-ready-6',
        productId: 'prod-book',
        productName: 'The Great Gatsby - Hardcover',
        sku: 'BOOK-GATSBY-HC',
        quantity: 5,
        price: '25',
        unitPrice: '25',
        appliedPrice: '25',
        currency: 'EUR',
        total: '125',
        pickedQuantity: 5,
        packedQuantity: 5,
        warehouseLocation: 'C1-R2-S8',
        barcode: '8594890123456'
      },
      {
        id: nanoid(),
        orderId: 'ord-ready-6',
        productId: 'prod-lego',
        productName: 'LEGO City Police Station',
        sku: 'LEGO-CITY-60316',
        quantity: 2,
        price: '70',
        unitPrice: '70',
        appliedPrice: '70',
        currency: 'EUR',
        total: '140',
        pickedQuantity: 2,
        packedQuantity: 2,
        warehouseLocation: 'C1-R3-S1',
        barcode: '8594901234567'
      },
      // Items for ord-ready-7 (Pickup USD order)
      {
        id: nanoid(),
        orderId: 'ord-ready-7',
        productId: 'prod-fragile-vase',
        productName: 'Crystal Glass Vase',
        sku: 'VASE-CRYS-001',
        quantity: 1,
        price: '29.99',
        unitPrice: '29.99',
        appliedPrice: '29.99',
        currency: 'USD',
        total: '29.99',
        pickedQuantity: 1,
        packedQuantity: 1,
        warehouseLocation: 'D1-R1-S4',
        barcode: '8595012345678'
      },
      {
        id: nanoid(),
        orderId: 'ord-ready-7',
        productId: 'prod-laptop',
        productName: 'Dell XPS 15 Laptop',
        sku: 'DELL-XPS-15',
        quantity: 1,
        price: '45.00',
        unitPrice: '45.00',
        appliedPrice: '45.00',
        currency: 'USD',
        total: '45.00',
        pickedQuantity: 1,
        packedQuantity: 1,
        warehouseLocation: 'D1-R2-S2',
        barcode: '8595123456789'
      },
      {
        id: nanoid(),
        orderId: 'ord-ready-7',
        productId: 'prod-tshirt',
        productName: 'Premium Cotton T-Shirt',
        sku: 'TSH-COT-S',
        quantity: 1,
        price: '15.00',
        unitPrice: '15.00',
        appliedPrice: '15.00',
        currency: 'USD',
        total: '15.00',
        pickedQuantity: 1,
        packedQuantity: 1,
        warehouseLocation: 'D2-R1-S1',
        barcode: '8595234567890'
      }
    ];
    
    // Insert order items
    for (const item of readyOrderItems) {
      await db.insert(orderItems).values(item as any);
    }
    console.log(`✓ Added ${readyOrderItems.length} order items for ready orders`);
    
    console.log('\n✅ Successfully added order items for ready orders!');
    
  } catch (error) {
    console.error('Error adding order items:', error);
    throw error;
  }
}

// Run the script
addOrderItems()
  .then(() => {
    console.log('Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });