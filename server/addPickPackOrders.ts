import { db } from "./db";
import { 
  products, 
  customers, 
  orders, 
  orderItems
} from "@shared/schema";
import { eq } from "drizzle-orm";

async function addPickPackOrders() {
  console.log("🌱 Adding Pick & Pack orders with bundles...");

  try {
    // Check for existing products and customers
    const existingProducts = await db.select().from(products).limit(10);
    const existingCustomers = await db.select().from(customers).limit(5);
    
    if (existingProducts.length === 0 || existingCustomers.length === 0) {
      console.log("⚠️ No products or customers found. Please run the main seed script first.");
      return;
    }

    console.log(`Found ${existingProducts.length} products and ${existingCustomers.length} customers`);

    // Create diverse orders with different statuses for pick & pack
    const ordersData = [
      // Regular order ready to pick
      {
        id: 'ord-pp-001',
        orderId: `ORD-2025-PP-${Date.now()}-001`,
        customerId: existingCustomers[0].id,
        currency: 'CZK' as const,
        orderStatus: 'to_fulfill' as const,
        paymentStatus: 'paid' as const,
        priority: 'high' as const,
        subtotal: '5000.00',
        taxRate: '21.00',
        taxAmount: '1050.00',
        shippingMethod: 'DHL' as const,
        paymentMethod: 'Bank Transfer' as const,
        shippingCost: '150.00',
        grandTotal: '6200.00',
        notes: 'URGENT - Customer waiting in store',
        pickStatus: 'not_started',
        packStatus: 'not_started'
      },
      // Large order with multiple items
      {
        id: 'ord-pp-002',
        orderId: `ORD-2025-PP-${Date.now()}-002`,
        customerId: existingCustomers[1]?.id || existingCustomers[0].id,
        currency: 'EUR' as const,
        orderStatus: 'to_fulfill' as const,
        paymentStatus: 'paid' as const,
        priority: 'medium' as const,
        subtotal: '250.00',
        taxRate: '21.00',
        taxAmount: '52.50',
        shippingMethod: 'PPL' as const,
        paymentMethod: 'PayPal' as const,
        shippingCost: '8.00',
        grandTotal: '310.50',
        pickStatus: 'not_started',
        packStatus: 'not_started'
      },
      // Bundle order simulation
      {
        id: 'ord-pp-bundle',
        orderId: `ORD-2025-BUNDLE-${Date.now()}`,
        customerId: existingCustomers[0].id,
        currency: 'CZK' as const,
        orderStatus: 'to_fulfill' as const,
        paymentStatus: 'paid' as const,
        priority: 'high' as const,
        subtotal: '15000.00',
        discountType: 'rate' as const,
        discountValue: '1500.00', // 10% bundle discount
        taxRate: '21.00',
        taxAmount: '2835.00',
        shippingMethod: 'DHL' as const,
        paymentMethod: 'Cash' as const,
        shippingCost: '0.00',
        grandTotal: '16335.00',
        notes: '[BUNDLE] Home Office Setup - All items must be picked together',
        pickStatus: 'not_started',
        packStatus: 'not_started'
      },
      // Order currently being picked
      {
        id: 'ord-pp-picking',
        orderId: `ORD-2025-PICK-${Date.now()}`,
        customerId: existingCustomers[2]?.id || existingCustomers[0].id,
        currency: 'CZK' as const,
        orderStatus: 'to_fulfill' as const,
        paymentStatus: 'pay_later' as const,
        priority: 'low' as const,
        subtotal: '3500.00',
        taxRate: '21.00',
        taxAmount: '735.00',
        shippingMethod: 'GLS' as const,
        paymentMethod: 'Bank Transfer' as const,
        shippingCost: '100.00',
        grandTotal: '4335.00',
        notes: 'Regular customer - careful packing',
        pickStatus: 'in_progress',
        packStatus: 'not_started',
        pickedBy: 'Warehouse Team A',
        pickStartTime: new Date(Date.now() - 10 * 60000) // Started 10 minutes ago
      },
      // Order currently being packed
      {
        id: 'ord-pp-packing',
        orderId: `ORD-2025-PACK-${Date.now()}`,
        customerId: existingCustomers[0].id,
        currency: 'EUR' as const,
        orderStatus: 'to_fulfill' as const,
        paymentStatus: 'paid' as const,
        priority: 'high' as const,
        subtotal: '500.00',
        taxRate: '21.00',
        taxAmount: '105.00',
        shippingMethod: 'DPD' as const,
        paymentMethod: 'Cash' as const,
        shippingCost: '12.00',
        grandTotal: '617.00',
        pickStatus: 'completed',
        packStatus: 'in_progress',
        pickedBy: 'John Doe',
        packedBy: 'Jane Smith',
        pickStartTime: new Date(Date.now() - 30 * 60000),
        pickEndTime: new Date(Date.now() - 15 * 60000),
        packStartTime: new Date(Date.now() - 5 * 60000)
      },
      // Ready to ship order
      {
        id: 'ord-pp-ready',
        orderId: `ORD-2025-READY-${Date.now()}`,
        customerId: existingCustomers[0].id,
        currency: 'CZK' as const,
        orderStatus: 'to_fulfill' as const,
        paymentStatus: 'paid' as const,
        priority: 'medium' as const,
        subtotal: '2000.00',
        taxRate: '21.00',
        taxAmount: '420.00',
        shippingMethod: 'PPL' as const,
        paymentMethod: 'COD' as const,
        shippingCost: '80.00',
        grandTotal: '2500.00',
        notes: 'Ready for pickup',
        pickStatus: 'completed',
        packStatus: 'completed',
        pickedBy: 'System',
        packedBy: 'System',
        pickStartTime: new Date(Date.now() - 60 * 60000),
        pickEndTime: new Date(Date.now() - 45 * 60000),
        packStartTime: new Date(Date.now() - 45 * 60000),
        packEndTime: new Date(Date.now() - 30 * 60000)
      }
    ];

    // Delete existing test orders first to avoid conflicts
    for (const orderData of ordersData) {
      await db.delete(orders).where(eq(orders.id, orderData.id));
    }

    const createdOrders = await db.insert(orders).values(ordersData).returning();
    console.log(`✅ Created ${createdOrders.length} Pick & Pack orders`);

    // Create order items for each order
    const orderItemsData: any[] = [];
    
    // Add items to each order
    for (let i = 0; i < createdOrders.length; i++) {
      const order = createdOrders[i];
      const itemCount = i === 2 ? 4 : (i + 1); // Bundle has 4 items, others vary
      
      for (let j = 0; j < Math.min(itemCount, existingProducts.length); j++) {
        const product = existingProducts[j];
        const isBundle = order.id === 'ord-pp-bundle';
        const quantity = isBundle ? 1 : Math.ceil(Math.random() * 3);
        
        // Generate placeholder images based on product type
        const placeholderImages = [
          'https://via.placeholder.com/400x300/4F46E5/FFFFFF?text=Laptop',
          'https://via.placeholder.com/400x300/059669/FFFFFF?text=Phone',
          'https://via.placeholder.com/400x300/DC2626/FFFFFF?text=Headphones',
          'https://via.placeholder.com/400x300/7C3AED/FFFFFF?text=T-Shirt',
          'https://via.placeholder.com/400x300/2563EB/FFFFFF?text=Jeans',
          'https://via.placeholder.com/400x300/DB2777/FFFFFF?text=Lamp',
          'https://via.placeholder.com/400x300/EA580C/FFFFFF?text=Cushion',
          'https://via.placeholder.com/400x300/16A34A/FFFFFF?text=Product'
        ];
        
        orderItemsData.push({
          orderId: order.id,
          productId: product.id,
          productName: isBundle ? `[Bundle] ${product.name}` : product.name,
          sku: product.sku,
          quantity: quantity,
          price: product.priceCzk || '1000.00',
          unitPrice: product.priceCzk || '1000.00',
          appliedPrice: isBundle 
            ? String(parseFloat(product.priceCzk || '1000') * 0.9) // 10% bundle discount
            : product.priceCzk || '1000.00',
          currency: order.currency,
          discount: isBundle ? String(parseFloat(product.priceCzk || '1000') * 0.1) : '0.00',
          total: String(quantity * parseFloat(product.priceCzk || '1000')),
          pickedQuantity: order.pickStatus === 'completed' ? quantity : 
                          order.pickStatus === 'in_progress' ? Math.floor(quantity / 2) : 0,
          packedQuantity: order.packStatus === 'completed' ? quantity :
                         order.packStatus === 'in_progress' ? Math.floor(quantity / 3) : 0,
          warehouseLocation: product.warehouseLocation || `A${j+1}-0${j+1}`,
          barcode: product.barcode || `89012345678${90 + j}`,
          image: placeholderImages[j % placeholderImages.length]
        });
      }
    }

    await db.insert(orderItems).values(orderItemsData);
    console.log(`✅ Created ${orderItemsData.length} order items`);

    console.log(`
    Successfully added Pick & Pack test data:
    - ${createdOrders.length} orders with various statuses:
      * Ready to pick orders
      * Order currently being picked
      * Order currently being packed  
      * Bundle order with discounts
      * Ready to ship order
    - ${orderItemsData.length} order items with:
      * Warehouse locations
      * Barcodes
      * Pick/pack quantities
      * Bundle discounts
    `);

  } catch (error) {
    console.error("❌ Error adding Pick & Pack orders:", error);
    throw error;
  }
}

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
  addPickPackOrders()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

export { addPickPackOrders };