import { db } from './db';
import { orders, orderItems, products, customers } from '@shared/schema';
import { eq } from 'drizzle-orm';

async function seedReadyOrders() {
  console.log('Starting to seed Ready orders...');

  try {
    // Get some existing products
    const existingProducts = await db.select().from(products).limit(20);
    if (existingProducts.length === 0) {
      console.error('No products found in database. Please seed products first.');
      return;
    }

    // Get some existing customers
    const existingCustomers = await db.select().from(customers).limit(10);
    
    // If no customers exist, create some
    if (existingCustomers.length === 0) {
      const newCustomers = [
        { name: 'Czech Company s.r.o.', email: 'info@czechcompany.cz', phone: '+420123456789', address: 'Wenceslas Square 1, 110 00 Prague, Czech Republic' },
        { name: 'Slovak Business a.s.', email: 'contact@slovakbiz.sk', phone: '+421987654321', address: 'Hviezdoslavovo námestie 1, 811 02 Bratislava, Slovakia' },
        { name: 'German GmbH', email: 'info@german-gmbh.de', phone: '+49123456789', address: 'Alexanderplatz 1, 10178 Berlin, Germany' },
        { name: 'Austrian AG', email: 'office@austrian-ag.at', phone: '+43123456789', address: 'Stephansplatz 1, 1010 Vienna, Austria' },
        { name: 'Local Pickup Customer', email: 'pickup@local.com', phone: '+420777888999', address: 'Pickup Point - Main Warehouse' },
        { name: 'Personal Delivery Client', email: 'personal@client.cz', phone: '+420666555444', address: 'Direct Delivery - Arranged Separately' },
      ];

      for (const customer of newCustomers) {
        const [inserted] = await db.insert(customers).values(customer).returning();
        existingCustomers.push(inserted);
      }
    }

    // Helper function to generate order ID
    const generateOrderId = (prefix: string, index: number) => {
      const date = new Date();
      const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      return `ORD-${dateStr}-${prefix}${String(index).padStart(3, '0')}`;
    };

    // Helper function to get random products
    const getRandomProducts = (count: number) => {
      const shuffled = [...existingProducts].sort(() => 0.5 - Math.random());
      return shuffled.slice(0, Math.min(count, shuffled.length));
    };

    // Helper function to calculate total amount
    const calculateTotal = (items: any[]) => {
      return items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    };

    // Create orders for each section
    const sections = [
      {
        prefix: 'CZ',
        shippingMethods: ['DPD', 'PPL', 'GLS', 'DHL'],
        addresses: [
          'Náměstí Republiky 5, 110 00 Prague 1, Czech Republic',
          'Masarykova 18, 602 00 Brno, Czech Republic',
          'Pražská 12, 370 01 České Budějovice, Czech Republic',
          'Nám. Dr. E. Beneše 1, 301 00 Plzeň, Czech Republic',
          'Hlavní třída 45, 700 00 Ostrava, Czech Republic',
          'Slovenská 28, 080 01 Prešov, Slovakia',
          'Hlavná 15, 040 01 Košice, Slovakia',
          'Námestie SNP 1, 974 01 Banská Bystrica, Slovakia',
          'Štefánikova 10, 949 01 Nitra, Slovakia',
          'Hviezdoslavova 5, 917 01 Trnava, Slovakia'
        ],
        customerNames: [
          'Czech Tech Solutions s.r.o.',
          'Prague Industries a.s.',
          'Brno Manufacturing',
          'Bohemia Supplies',
          'Moravian Trade Co.',
          'Slovak Innovations',
          'Košice Enterprises',
          'Bratislava Holdings',
          'Tatra Business Group',
          'Danube Trading'
        ]
      },
      {
        prefix: 'DE',
        shippingMethods: ['DHL', 'GLS', 'DPD', 'PPL'],
        addresses: [
          'Kurfürstendamm 21, 10719 Berlin, Germany',
          'Marienplatz 1, 80331 Munich, Germany',
          'Königsallee 11, 40212 Düsseldorf, Germany',
          'Hauptstraße 5, 60313 Frankfurt, Germany',
          'Reeperbahn 1, 20359 Hamburg, Germany',
          'Ringstraße 1, 1010 Vienna, Austria',
          'Bahnhofstraße 10, 8001 Zurich, Switzerland',
          'Grand-Rue 7, 1204 Geneva, Switzerland',
          'Graben 21, 1010 Vienna, Austria',
          'Maximilianstraße 15, 80539 Munich, Germany'
        ],
        customerNames: [
          'German Tech GmbH',
          'Bavaria Industries AG',
          'Rhine Valley Trading',
          'Berlin Solutions',
          'Hamburg Logistics',
          'Austrian Imports',
          'Swiss Precision Co.',
          'Alpine Supplies',
          'European Distribution',
          'Continental Trading'
        ]
      },
      {
        prefix: 'PU',
        shippingMethods: [null], // No shipping method for pickup
        addresses: [
          'Main Warehouse - Gate A',
          'Main Warehouse - Gate B',
          'Distribution Center - Reception',
          'Office Building - Lobby',
          'Warehouse 2 - Customer Service',
          'Pickup Point 1',
          'Pickup Point 2',
          'Collection Center',
          'Will Call Desk',
          'Customer Pickup Area'
        ],
        customerNames: [
          'Local Retailer Ltd.',
          'City Shop s.r.o.',
          'Quick Pickup Customer',
          'Regular Buyer Co.',
          'Wholesale Partner',
          'Frequent Customer LLC',
          'Trade Partner s.r.o.',
          'Business Buyer Group',
          'Commercial Client',
          'Pickup Service User'
        ]
      },
      {
        prefix: 'PD',
        shippingMethods: [null], // No shipping method for personal delivery
        addresses: [
          'Arranged with John Smith - Mobile: +420777111222',
          'Delivery to Maria Johnson - Contact: +420777333444',
          'Hand delivery to Peter Brown - Tel: +420777555666',
          'Personal courier to Anna Davis - Phone: +420777777888',
          'Direct delivery to Michael Wilson - Cell: +420777999000',
          'Meeting point: Central Plaza - Contact: +420777123456',
          'Office delivery to Sarah Miller - Extension: 234',
          'Home delivery to Robert Taylor - Apt 5B',
          'Event venue: Conference Center - Room 101',
          'Special delivery to VIP Client - Concierge desk'
        ],
        customerNames: [
          'VIP Client Services',
          'Executive Solutions',
          'Premium Partners',
          'Priority Customer',
          'Special Delivery Co.',
          'Express Personal Service',
          'Direct Client Group',
          'Exclusive Buyers',
          'Personal Shopping Service',
          'Concierge Delivery Ltd.'
        ]
      }
    ];

    let totalOrdersCreated = 0;

    for (const section of sections) {
      console.log(`Creating orders for ${section.prefix} section...`);
      
      for (let i = 1; i <= 10; i++) {
        const orderId = generateOrderId(section.prefix, i);
        const shippingMethod = section.shippingMethods[Math.floor(Math.random() * section.shippingMethods.length)];
        const address = section.addresses[i - 1];
        const customerName = section.customerNames[i - 1];
        
        // Get random customer or create one
        let customerId;
        if (existingCustomers.length > 0 && Math.random() > 0.3) {
          customerId = existingCustomers[Math.floor(Math.random() * existingCustomers.length)].id;
        } else {
          const [newCustomer] = await db.insert(customers).values({
            name: customerName,
            email: `${customerName.toLowerCase().replace(/[^a-z0-9]/g, '')}@example.com`,
            phone: `+420${Math.floor(Math.random() * 900000000 + 100000000)}`,
            address: address
          }).returning();
          customerId = newCustomer.id;
        }

        // Create order
        const [order] = await db.insert(orders).values({
          orderId,
          customerId,
          currency: 'CZK',
          orderStatus: 'ready_to_ship',
          paymentStatus: 'paid',
          paymentMethod: ['Bank Transfer', 'PayPal', 'Cash'][Math.floor(Math.random() * 3)] as any,
          shippingMethod: section.prefix === 'PU' || section.prefix === 'PD' ? undefined : shippingMethod as any,
          shippingCost: Math.floor(Math.random() * 200 + 50),
          grandTotal: 0, // Will be updated after adding items
          priority: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)] as any,
          notes: `${address}\n\nReady for ${section.prefix === 'CZ' ? 'Czech/Slovak' : section.prefix === 'DE' ? 'German/EU' : section.prefix === 'PU' ? 'pickup' : 'personal'} delivery`,
          pickStatus: 'completed',
          packStatus: 'completed',
          pickedBy: 'Employee #001',
          packedBy: 'Employee #002',
          pickStartTime: new Date(Date.now() - 7200000), // 2 hours ago
          pickEndTime: new Date(Date.now() - 5400000), // 1.5 hours ago
          packStartTime: new Date(Date.now() - 5400000), // 1.5 hours ago
          packEndTime: new Date(Date.now() - 3600000), // 1 hour ago
          createdAt: new Date(Date.now() - 86400000), // 1 day ago
          updatedAt: new Date()
        }).returning();

        // Add order items
        const selectedProducts = getRandomProducts(Math.floor(Math.random() * 4) + 1);
        let totalAmount = 0;

        for (const product of selectedProducts) {
          const quantity = Math.floor(Math.random() * 3) + 1;
          const price = Number(product.priceCzk) || 100;
          totalAmount += price * quantity;

          await db.insert(orderItems).values({
            orderId: order.id,
            productId: product.id,
            productName: product.name,
            sku: product.sku,
            quantity,
            price,
            total: price * quantity,
            warehouseLocation: product.warehouseLocation || `${['A', 'B', 'C'][Math.floor(Math.random() * 3)]}${Math.floor(Math.random() * 10 + 1)}-${Math.floor(Math.random() * 100 + 1)}`
          });
        }

        // Update order with total amount
        await db.update(orders)
          .set({ 
            grandTotal: totalAmount + (order.shippingCost || 0),
            updatedAt: new Date()
          })
          .where(eq(orders.id, order.id));

        totalOrdersCreated++;
        console.log(`Created order ${orderId}`);
      }
    }

    console.log(`✅ Successfully created ${totalOrdersCreated} Ready orders!`);
    console.log('- 10 orders for Czech/Slovak delivery');
    console.log('- 10 orders for German/EU delivery');
    console.log('- 10 orders for Pickup');
    console.log('- 10 orders for Personal delivery');

  } catch (error) {
    console.error('Error seeding Ready orders:', error);
  } finally {
    process.exit(0);
  }
}

seedReadyOrders();