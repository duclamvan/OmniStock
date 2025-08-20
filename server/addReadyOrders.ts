import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { nanoid } from 'nanoid';
import * as schema from '../shared/schema.js';

const { orders, orderItems, customers } = schema;

// Initialize database connection
const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });

async function addReadyOrders() {
  console.log('Adding additional ready orders...');
  
  try {
    // Get current date string
    const getCurrentDateString = () => {
      const now = new Date();
      return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    };
    
    // Add more ready orders
    const readyOrders = [
      {
        id: 'ord-ready-5',
        orderId: `ORD-${getCurrentDateString()}-PD004`,
        customerId: 'cust-1',
        currency: 'CZK',
        orderStatus: 'ready_to_ship',
        paymentStatus: 'paid',
        priority: 'high',
        subtotal: '12500',
        taxRate: '21',
        taxAmount: '2625',
        shippingMethod: 'PPL',
        paymentMethod: 'Cash',
        shippingCost: '200',
        grandTotal: '15325',
        notes: 'Personal delivery to Brno - customer will pick up',
        pickStatus: 'completed',
        packStatus: 'completed',
        pickedBy: 'Employee #003',
        packedBy: 'Employee #002',
        pickStartTime: new Date(Date.now() - 8 * 60 * 60 * 1000),
        pickEndTime: new Date(Date.now() - 7 * 60 * 60 * 1000),
        packStartTime: new Date(Date.now() - 6 * 60 * 60 * 1000),
        packEndTime: new Date(Date.now() - 5 * 60 * 60 * 1000),
        createdAt: new Date(Date.now() - 10 * 60 * 60 * 1000)
      },
      {
        id: 'ord-ready-6',
        orderId: `ORD-${getCurrentDateString()}-015`,
        customerId: 'cust-2',
        currency: 'EUR',
        orderStatus: 'ready_to_ship',
        paymentStatus: 'paid',
        priority: 'medium',
        subtotal: '350',
        taxRate: '21',
        taxAmount: '73.50',
        shippingMethod: 'DHL',
        paymentMethod: 'PayPal',
        shippingCost: '12',
        grandTotal: '435.50',
        notes: 'Express delivery requested',
        pickStatus: 'completed',
        packStatus: 'completed',
        pickedBy: 'Employee #001',
        packedBy: 'Employee #004',
        pickStartTime: new Date(Date.now() - 4 * 60 * 60 * 1000),
        pickEndTime: new Date(Date.now() - 3.5 * 60 * 60 * 1000),
        packStartTime: new Date(Date.now() - 3 * 60 * 60 * 1000),
        packEndTime: new Date(Date.now() - 2.5 * 60 * 60 * 1000),
        createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000)
      },
      {
        id: 'ord-ready-7',
        orderId: `ORD-${getCurrentDateString()}-PU005`,
        customerId: 'cust-3',
        currency: 'USD',
        orderStatus: 'ready_to_ship',
        paymentStatus: 'pay_later',
        priority: 'low',
        subtotal: '89.99',
        taxRate: '21',
        taxAmount: '18.90',
        shippingMethod: 'DPD',
        paymentMethod: 'COD',
        shippingCost: '0',
        grandTotal: '108.89',
        notes: 'Customer pickup - will collect today',
        pickStatus: 'completed',
        packStatus: 'completed',
        pickedBy: 'Employee #002',
        packedBy: 'Employee #001',
        pickStartTime: new Date(Date.now() - 2 * 60 * 60 * 1000),
        pickEndTime: new Date(Date.now() - 1.5 * 60 * 60 * 1000),
        packStartTime: new Date(Date.now() - 1 * 60 * 60 * 1000),
        packEndTime: new Date(Date.now() - 0.5 * 60 * 60 * 1000),
        createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000)
      }
    ];
    
    // Insert the ready orders
    for (const order of readyOrders) {
      await db.insert(orders).values(order as any);
      console.log(`✓ Added ready order: ${order.orderId}`);
    }
    
    // Add order items for these ready orders
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
    
    console.log('\n✅ Successfully added additional ready orders!');
    console.log('Total ready orders added: 3');
    console.log('Total order items added: 8');
    
  } catch (error) {
    console.error('Error adding ready orders:', error);
    throw error;
  }
}

// Run the script
addReadyOrders()
  .then(() => {
    console.log('Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });