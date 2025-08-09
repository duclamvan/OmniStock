import { db } from './db.js';
import { products, productVariants, categories, warehouses, suppliers, customers, orders, orderItems, expenses, purchases, returns, returnItems, sales, userActivities } from '../shared/schema.js';
import { nanoid } from 'nanoid';

async function clearAllData() {
  console.log("Clearing all existing data...");
  
  // Delete in correct order to respect foreign key constraints
  await db.delete(userActivities);
  await db.delete(returnItems);
  await db.delete(returns);
  await db.delete(sales);
  await db.delete(orderItems);
  await db.delete(orders);
  await db.delete(purchases);
  await db.delete(expenses);
  await db.delete(productVariants);
  await db.delete(products);
  await db.delete(customers);
  await db.delete(suppliers);
  await db.delete(warehouses);
  await db.delete(categories);
  
  console.log("All data cleared successfully");
}

async function seedDatabase() {
  try {
    await clearAllData();
    
    console.log("Starting database seed with proper prices...");
    
    // 1. Create Categories
    const categoriesData = [
      { id: 'cat-electronics', name: 'Electronics', description: 'Consumer electronics and gadgets' },
      { id: 'cat-fashion', name: 'Fashion & Apparel', description: 'Clothing and accessories' },
      { id: 'cat-home', name: 'Home & Garden', description: 'Home improvement and gardening' },
      { id: 'cat-food', name: 'Food & Beverages', description: 'Grocery items and drinks' },
      { id: 'cat-beauty', name: 'Beauty & Personal Care', description: 'Cosmetics and hygiene products' },
      { id: 'cat-sports', name: 'Sports & Outdoor', description: 'Athletic gear and outdoor equipment' },
    ];
    
    for (const category of categoriesData) {
      await db.insert(categories).values(category);
    }
    console.log(`Created ${categoriesData.length} categories`);
    
    // 2. Create Warehouses
    const warehousesData = [
      {
        id: 'wh-prague-main',
        name: 'Prague Main Warehouse',
        location: 'Průmyslová 1234, Praha 9',
        capacity: 10000,
        status: 'active' as const,
      },
      {
        id: 'wh-brno-secondary',
        name: 'Brno Distribution Center',
        location: 'Technická 567, Brno',
        capacity: 5000,
        status: 'active' as const,
      },
    ];
    
    for (const warehouse of warehousesData) {
      await db.insert(warehouses).values(warehouse);
    }
    console.log(`Created ${warehousesData.length} warehouses`);
    
    // 3. Create Suppliers
    const suppliersData = [
      {
        id: 'sup-samsung',
        name: 'Samsung Electronics',
        contactPerson: 'John Kim',
        email: 'sales@samsung.com',
        phone: '+82 2 2053 3000',
        address: 'Samsung Digital City, Seoul, South Korea',
        country: 'South Korea',
        website: 'https://www.samsung.com',
      },
      {
        id: 'sup-apple',
        name: 'Apple Inc.',
        contactPerson: 'Tim Cook',
        email: 'business@apple.com',
        phone: '+1 408 996 1010',
        address: 'One Apple Park Way, Cupertino, CA',
        country: 'USA',
        website: 'https://www.apple.com',
      },
      {
        id: 'sup-nike',
        name: 'Nike Inc.',
        contactPerson: 'Phil Knight',
        email: 'wholesale@nike.com',
        phone: '+1 503 671 6453',
        address: 'One Bowerman Drive, Beaverton, OR',
        country: 'USA',
        website: 'https://www.nike.com',
      },
      {
        id: 'sup-nestle',
        name: 'Nestlé',
        contactPerson: 'Mark Schneider',
        email: 'business@nestle.com',
        phone: '+41 21 924 2111',
        address: 'Avenue Nestlé 55, Vevey',
        country: 'Switzerland',
        website: 'https://www.nestle.com',
      },
    ];
    
    for (const supplier of suppliersData) {
      await db.insert(suppliers).values(supplier);
    }
    console.log(`Created ${suppliersData.length} suppliers`);
    
    // 4. Create Products with proper pricing
    const productsData = [
      // Electronics
      {
        id: 'prod-samsung-tv-65',
        name: 'Samsung QLED 65" 4K Smart TV',
        sku: 'SAM-Q80C-65',
        categoryId: 'cat-electronics',
        warehouseId: 'wh-prague-main',
        supplierId: 'sup-samsung',
        description: '65-inch QLED 4K Smart TV with HDR10+',
        quantity: 25,
        lowStockAlert: 5,
        priceCzk: '32999',
        priceEur: '1350',
        importCostCzk: '25000',
        importCostEur: '1020',
        barcode: '8806094814965',
        weight: '25.5',
        isActive: true,
      },
      {
        id: 'prod-macbook-pro-16',
        name: 'MacBook Pro 16" M3 Max',
        sku: 'MBP-16-M3-MAX',
        categoryId: 'cat-electronics',
        warehouseId: 'wh-prague-main',
        supplierId: 'sup-apple',
        description: 'MacBook Pro 16-inch with M3 Max chip, 36GB RAM, 1TB SSD',
        quantity: 12,
        lowStockAlert: 3,
        priceCzk: '89999',
        priceEur: '3699',
        importCostCzk: '72000',
        importCostEur: '2950',
        barcode: '194253082194',
        weight: '2.16',
        isActive: true,
      },
      {
        id: 'prod-iphone-15-pro',
        name: 'iPhone 15 Pro Max 256GB',
        sku: 'IPH-15PM-256',
        categoryId: 'cat-electronics',
        warehouseId: 'wh-prague-main',
        supplierId: 'sup-apple',
        description: 'iPhone 15 Pro Max with 256GB storage, Titanium finish',
        quantity: 45,
        lowStockAlert: 10,
        priceCzk: '34999',
        priceEur: '1429',
        importCostCzk: '28000',
        importCostEur: '1145',
        barcode: '194253775461',
        weight: '0.221',
        isActive: true,
      },
      
      // Fashion
      {
        id: 'prod-nike-airmax',
        name: 'Nike Air Max 2024',
        sku: 'NIKE-AM24-42',
        categoryId: 'cat-fashion',
        warehouseId: 'wh-brno-secondary',
        supplierId: 'sup-nike',
        description: 'Nike Air Max 2024 running shoes, size 42',
        quantity: 60,
        lowStockAlert: 15,
        priceCzk: '3899',
        priceEur: '159',
        importCostCzk: '2800',
        importCostEur: '115',
        barcode: '195244862597',
        weight: '0.35',
        isActive: true,
      },
      {
        id: 'prod-nike-jacket',
        name: 'Nike Windrunner Jacket',
        sku: 'NIKE-WR-JKT-L',
        categoryId: 'cat-fashion',
        warehouseId: 'wh-brno-secondary',
        supplierId: 'sup-nike',
        description: 'Nike Windrunner jacket, waterproof, size L',
        quantity: 35,
        lowStockAlert: 8,
        priceCzk: '2499',
        priceEur: '99',
        importCostCzk: '1600',
        importCostEur: '65',
        barcode: '195244987654',
        weight: '0.28',
        isActive: true,
      },
      
      // Food & Beverages
      {
        id: 'prod-nespresso-capsules',
        name: 'Nespresso Original Capsules Pack',
        sku: 'NESP-ORIG-50',
        categoryId: 'cat-food',
        warehouseId: 'wh-prague-main',
        supplierId: 'sup-nestle',
        description: 'Nespresso original line capsules, 50 pack variety',
        quantity: 200,
        lowStockAlert: 50,
        priceCzk: '899',
        priceEur: '36',
        importCostCzk: '650',
        importCostEur: '26',
        barcode: '7630030721456',
        weight: '0.35',
        isActive: true,
      },
      {
        id: 'prod-kitkat-multipack',
        name: 'KitKat Multipack 24x41.5g',
        sku: 'KITKAT-MP-24',
        categoryId: 'cat-food',
        warehouseId: 'wh-prague-main',
        supplierId: 'sup-nestle',
        description: 'KitKat chocolate wafer bars, 24 pack',
        quantity: 150,
        lowStockAlert: 30,
        priceCzk: '249',
        priceEur: '9.99',
        importCostCzk: '160',
        importCostEur: '6.50',
        barcode: '7613035074439',
        weight: '1.0',
        isActive: true,
      },
      
      // Home & Garden
      {
        id: 'prod-samsung-washer',
        name: 'Samsung EcoBubble Washing Machine 9kg',
        sku: 'SAM-WW90-ECO',
        categoryId: 'cat-home',
        warehouseId: 'wh-prague-main',
        supplierId: 'sup-samsung',
        description: 'Samsung EcoBubble 9kg front-load washing machine',
        quantity: 8,
        lowStockAlert: 2,
        priceCzk: '14999',
        priceEur: '615',
        importCostCzk: '11000',
        importCostEur: '450',
        barcode: '8806090512346',
        weight: '62',
        isActive: true,
      },
      {
        id: 'prod-samsung-fridge',
        name: 'Samsung Side-by-Side Refrigerator',
        sku: 'SAM-RS68-SBS',
        categoryId: 'cat-home',
        warehouseId: 'wh-prague-main',
        supplierId: 'sup-samsung',
        description: 'Samsung 617L side-by-side refrigerator with ice maker',
        quantity: 5,
        lowStockAlert: 1,
        priceCzk: '39999',
        priceEur: '1639',
        importCostCzk: '31000',
        importCostEur: '1270',
        barcode: '8806090789123',
        weight: '115',
        isActive: true,
      },
    ];
    
    for (const product of productsData) {
      await db.insert(products).values(product);
    }
    console.log(`Created ${productsData.length} products with proper prices`);
    
    // 5. Create Product Variants with prices
    const variantsData = [
      {
        id: 'var-iphone-15-128',
        productId: 'prod-iphone-15-pro',
        name: 'iPhone 15 Pro Max 128GB',
        barcode: '194253775454',
        quantity: 20,
        importCostCzk: '26000',
        importCostEur: '1065',
      },
      {
        id: 'var-iphone-15-512',
        productId: 'prod-iphone-15-pro',
        name: 'iPhone 15 Pro Max 512GB',
        barcode: '194253775478',
        quantity: 10,
        importCostCzk: '32000',
        importCostEur: '1310',
      },
      {
        id: 'var-nike-airmax-44',
        productId: 'prod-nike-airmax',
        name: 'Nike Air Max 2024 Size 44',
        barcode: '195244862604',
        quantity: 40,
        importCostCzk: '2800',
        importCostEur: '115',
      },
    ];
    
    for (const variant of variantsData) {
      await db.insert(productVariants).values(variant);
    }
    console.log(`Created ${variantsData.length} product variants`);
    
    // 6. Create Customers
    const customersData = [
      {
        id: 'cust-restaurant-golden',
        name: 'Golden Prague Restaurant',
        email: 'orders@goldenpraguerestaurant.cz',
        phone: '+420 777 123 456',
        address: 'Václavské náměstí 28',
        city: 'Praha',
        country: 'Czech Republic',
        type: 'wholesale',
      },
      {
        id: 'cust-pavel-novak',
        name: 'Pavel Novák',
        email: 'pavel.novak@email.cz',
        phone: '+420 608 987 654',
        address: 'Masarykova 145',
        city: 'Brno',
        country: 'Czech Republic',
        type: 'regular',
      },
      {
        id: 'cust-tech-solutions',
        name: 'Tech Solutions s.r.o.',
        email: 'procurement@techsolutions.cz',
        phone: '+420 224 567 890',
        address: 'Wenceslas Square 12',
        city: 'Praha',
        country: 'Czech Republic',
        type: 'wholesale',
      },
    ];
    
    for (const customer of customersData) {
      await db.insert(customers).values(customer);
    }
    console.log(`Created ${customersData.length} customers`);
    
    // 7. Create Orders with items
    const ordersData = [
      {
        id: 'ord-' + nanoid(8),
        orderId: 'ORD-2025-001',
        customerId: 'cust-tech-solutions',
        billerId: 'test-user',
        currency: 'CZK' as const,
        orderStatus: 'to_fulfill' as const,
        paymentStatus: 'paid' as const,
        priority: 'high' as const,
        subtotal: '124996',
        discountType: 'flat' as const,
        discountValue: '5000',
        taxRate: '21',
        taxAmount: '25199.16',
        shippingMethod: 'DPD',
        paymentMethod: 'Bank Transfer',
        shippingCost: '299',
        grandTotal: '145494.16',
        notes: 'Urgent order for new office setup',
      },
      {
        id: 'ord-' + nanoid(8),
        orderId: 'ORD-2025-002',
        customerId: 'cust-pavel-novak',
        billerId: 'test-user',
        currency: 'EUR' as const,
        orderStatus: 'pending' as const,
        paymentStatus: 'pending' as const,
        priority: 'medium' as const,
        subtotal: '195',
        discountType: 'rate' as const,
        discountValue: '10',
        taxRate: '21',
        taxAmount: '36.86',
        shippingMethod: 'PPL',
        paymentMethod: 'COD',
        shippingCost: '4.99',
        grandTotal: '217.35',
        notes: 'Customer prefers morning delivery',
      },
    ];
    
    for (const order of ordersData) {
      await db.insert(orders).values(order);
      
      // Create order items
      if (order.orderId === 'ORD-2025-001') {
        await db.insert(orderItems).values([
          {
            orderId: order.id,
            productId: 'prod-iphone-15-pro',
            productName: 'iPhone 15 Pro Max 256GB',
            sku: 'IPH-15PM-256',
            quantity: 2,
            price: '34999',
            unitPrice: '34999',
            appliedPrice: '34999',
            currency: 'CZK',
            discount: '0',
            tax: '0',
            total: '69998',
          },
          {
            orderId: order.id,
            productId: 'prod-macbook-pro-16',
            productName: 'MacBook Pro 16" M3 Max',
            sku: 'MBP-16-M3-MAX',
            quantity: 1,
            price: '89999',
            unitPrice: '89999',
            appliedPrice: '84999',
            currency: 'CZK',
            discount: '5000',
            tax: '0',
            total: '84999',
          },
        ]);
      } else if (order.orderId === 'ORD-2025-002') {
        await db.insert(orderItems).values([
          {
            orderId: order.id,
            productId: 'prod-nike-airmax',
            productName: 'Nike Air Max 2024',
            sku: 'NIKE-AM24-42',
            quantity: 1,
            price: '159',
            unitPrice: '159',
            appliedPrice: '159',
            currency: 'EUR',
            discount: '0',
            tax: '0',
            total: '159',
          },
          {
            orderId: order.id,
            productId: 'prod-nespresso-capsules',
            productName: 'Nespresso Original Capsules Pack',
            sku: 'NESP-ORIG-50',
            quantity: 1,
            price: '36',
            unitPrice: '36',
            appliedPrice: '36',
            currency: 'EUR',
            discount: '0',
            tax: '0',
            total: '36',
          },
        ]);
      }
    }
    console.log(`Created ${ordersData.length} orders with items`);
    
    // 8. Create Expenses
    const expensesData = [
      {
        id: 'exp-' + nanoid(8),
        expenseId: 'EXP-2025-001',
        name: 'Monthly Warehouse Rent - Prague',
        category: 'Warehouse Rent',
        amount: '45000',
        currency: 'CZK' as const,
        date: new Date('2025-01-01'),
        description: 'Prague warehouse monthly rent',
        paymentMethod: 'Bank Transfer',
        status: 'paid' as const,
      },
      {
        id: 'exp-' + nanoid(8),
        expenseId: 'EXP-2025-002',
        name: 'January Utilities',
        category: 'Utilities',
        amount: '8500',
        currency: 'CZK' as const,
        date: new Date('2025-01-05'),
        description: 'Electricity and water bills',
        paymentMethod: 'Bank Transfer',
        status: 'paid' as const,
      },
    ];
    
    for (const expense of expensesData) {
      await db.insert(expenses).values(expense);
    }
    console.log(`Created ${expensesData.length} expenses`);
    
    // 9. Create Purchases
    const purchasesData = [
      {
        id: nanoid(),
        productName: 'Samsung QLED TV Bulk Order',
        sku: 'SAM-Q80C-65-BULK',
        quantity: 50,
        importPrice: '25000',
        importCurrency: 'CZK' as const,
        supplierName: 'Samsung Electronics',
        supplierUrl: 'https://www.samsung.com',
        status: 'delivered' as const,
        shipmentId: 'SHIP-2025-001',
        description: 'Bulk order of Samsung QLED TVs for Q1 2025',
      },
      {
        id: nanoid(),
        productName: 'Nike Sportswear Collection',
        sku: 'NIKE-SPORT-2025',
        quantity: 100,
        importPrice: '2200',
        importCurrency: 'CZK' as const,
        supplierName: 'Nike Inc.',
        supplierUrl: 'https://www.nike.com',
        status: 'purchased' as const,
        shipmentId: 'SHIP-2025-002',
        description: 'Nike sportswear collection for Spring 2025',
      },
    ];
    
    for (const purchase of purchasesData) {
      await db.insert(purchases).values(purchase);
    }
    console.log(`Created ${purchasesData.length} purchases`);
    
    console.log('\n✅ Database seeded successfully with all prices properly set!');
    console.log('All products now have priceCzk and priceEur values.');
    
  } catch (error) {
    console.error('Error seeding database:', error);
    throw error;
  }
}

// Run the seed
seedDatabase()
  .then(() => {
    console.log('Seed completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exit(1);
  });