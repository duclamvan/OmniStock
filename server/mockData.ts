import { DatabaseStorage } from "./storage";
import { nanoid } from "nanoid";

const storage = new DatabaseStorage();

export async function seedMockData() {
  console.log("Starting to seed mock data...");

  try {
    // Generate today's date at different times
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const lastWeek = new Date(today);
    lastWeek.setDate(lastWeek.getDate() - 7);
    const lastMonth = new Date(today);
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    // 1. Add more products with import costs
    const moreProducts = [
      {
        id: 'prod-7',
        name: 'Macbook Pro 16" M3',
        sku: 'MB-PRO-16-M3',
        category: 'electronics',
        warehouseId: 'wh-1',
        supplierId: 'supp-1',
        currency: 'EUR',
        retailPrice: '2899.00',
        wholesalePrice: '2600.00',
        importPrice: '2200.00', // Cost price
        currentStock: 15,
        minimumStock: 5,
        maximumStock: 30,
        weight: '2.2',
        dimensions: '35.5x24.5x1.6',
        imageUrl: null,
        status: 'active'
      },
      {
        id: 'prod-8',
        name: 'iPad Pro 12.9"',
        sku: 'IPAD-PRO-129',
        category: 'electronics',
        warehouseId: 'wh-2',
        supplierId: 'supp-1',
        currency: 'EUR',
        retailPrice: '1299.00',
        wholesalePrice: '1150.00',
        importPrice: '950.00',
        currentStock: 25,
        minimumStock: 10,
        maximumStock: 50,
        weight: '0.68',
        dimensions: '28.0x21.5x0.6',
        imageUrl: null,
        status: 'active'
      },
      {
        id: 'prod-9',
        name: 'Sony WH-1000XM5',
        sku: 'SONY-WH1000XM5',
        category: 'electronics',
        warehouseId: 'wh-1',
        supplierId: 'supp-2',
        currency: 'CZK',
        retailPrice: '9990.00',
        wholesalePrice: '8500.00',
        importPrice: '6500.00',
        currentStock: 40,
        minimumStock: 15,
        maximumStock: 80,
        weight: '0.25',
        dimensions: '22.7x20.1x4.8',
        imageUrl: null,
        status: 'active'
      },
      {
        id: 'prod-10',
        name: 'DJI Mini 3 Pro',
        sku: 'DJI-MINI3-PRO',
        category: 'electronics',
        warehouseId: 'wh-3',
        supplierId: 'supp-3',
        currency: 'EUR',
        retailPrice: '899.00',
        wholesalePrice: '750.00',
        importPrice: '600.00',
        currentStock: 12,
        minimumStock: 5,
        maximumStock: 25,
        weight: '0.249',
        dimensions: '14.5x8.9x6.2',
        imageUrl: null,
        status: 'active'
      }
    ];

    for (const product of moreProducts) {
      try {
        await storage.createProduct(product);
        console.log(`Created product: ${product.name}`);
      } catch (error) {
        console.log(`Product ${product.sku} may already exist, skipping...`);
      }
    }

    // 2. Add purchases for inventory
    const purchases = [
      {
        productName: 'iPhone 15 Pro Max 256GB',
        sku: 'IPH-15PM-256',
        quantity: 50,
        importPrice: '950.00',
        importCurrency: 'EUR',
        supplierName: 'Apple Distributor Europe',
        supplierUrl: 'https://apple-distributor.eu',
        status: 'received',
        shipmentId: 'SHIP-2025-001',
        description: 'Q1 2025 iPhone stock replenishment'
      },
      {
        productName: 'Samsung Galaxy S24 Ultra',
        sku: 'SAM-S24U-512',
        quantity: 30,
        importPrice: '850.00',
        importCurrency: 'EUR',
        supplierName: 'Samsung B2B Partners',
        supplierUrl: 'https://samsung-b2b.com',
        status: 'received',
        shipmentId: 'SHIP-2025-002',
        description: 'Samsung flagship phones for Q1'
      },
      {
        productName: 'Macbook Pro 16" M3',
        sku: 'MB-PRO-16-M3',
        quantity: 20,
        importPrice: '2200.00',
        importCurrency: 'EUR',
        supplierName: 'Apple Distributor Europe',
        supplierUrl: 'https://apple-distributor.eu',
        status: 'purchased',
        shipmentId: 'SHIP-2025-003',
        description: 'Macbook Pro stock for business customers'
      },
      {
        productName: 'Sony WH-1000XM5',
        sku: 'SONY-WH1000XM5',
        quantity: 80,
        importPrice: '6500.00',
        importCurrency: 'CZK',
        supplierName: 'Sony Czech Republic',
        supplierUrl: 'https://sony.cz/b2b',
        status: 'in_transit',
        shipmentId: 'SHIP-2025-004',
        description: 'Premium headphones batch order'
      },
      {
        productName: 'DJI Mini 3 Pro',
        sku: 'DJI-MINI3-PRO',
        quantity: 15,
        importPrice: '600.00',
        importCurrency: 'EUR',
        supplierName: 'DJI Europe B.V.',
        supplierUrl: 'https://dji-europe.com',
        status: 'received',
        shipmentId: 'SHIP-2025-005',
        description: 'Drone inventory for summer season'
      }
    ];

    for (const purchase of purchases) {
      try {
        await storage.createPurchase(purchase);
        console.log(`Created purchase: ${purchase.productName}`);
      } catch (error) {
        console.log(`Error creating purchase: ${error}`);
      }
    }

    // 3. Add expenses
    const expenses = [
      {
        expenseId: `EXP-${new Date().getFullYear()}-001`,
        name: 'Warehouse Rent - Prague',
        category: 'rent',
        amount: '3500.00',
        currency: 'EUR',
        recurring: 'monthly',
        paymentMethod: 'bank_transfer',
        status: 'paid',
        date: new Date('2025-08-01'),
        description: 'Monthly rent for Prague warehouse facility'
      },
      {
        expenseId: `EXP-${new Date().getFullYear()}-002`,
        name: 'Employee Salaries',
        category: 'salary',
        amount: '12500.00',
        currency: 'EUR',
        recurring: 'monthly',
        paymentMethod: 'bank_transfer',
        status: 'paid',
        date: new Date('2025-07-31'),
        description: 'July 2025 payroll for all employees'
      },
      {
        expenseId: `EXP-${new Date().getFullYear()}-003`,
        name: 'Electricity Bill - All Locations',
        category: 'utility',
        amount: '18500.00',
        currency: 'CZK',
        recurring: 'monthly',
        paymentMethod: 'direct_debit',
        status: 'paid',
        date: new Date('2025-08-01'),
        description: 'Electricity for warehouses and offices'
      },
      {
        expenseId: `EXP-${new Date().getFullYear()}-004`,
        name: 'DHL Shipping Services',
        category: 'shipping',
        amount: '2850.00',
        currency: 'EUR',
        recurring: 'none',
        paymentMethod: 'credit_card',
        status: 'paid',
        date: new Date('2025-07-28'),
        description: 'Monthly shipping costs for customer orders'
      },
      {
        expenseId: `EXP-${new Date().getFullYear()}-005`,
        name: 'Office Supplies',
        category: 'other',
        amount: '5600.00',
        currency: 'CZK',
        recurring: 'none',
        paymentMethod: 'credit_card',
        status: 'pending',
        date: new Date('2025-08-02'),
        description: 'Stationery, printer supplies, and office equipment'
      },
      {
        expenseId: `EXP-${new Date().getFullYear()}-006`,
        name: 'Marketing Campaign - Google Ads',
        category: 'marketing',
        amount: '1500.00',
        currency: 'EUR',
        recurring: 'monthly',
        paymentMethod: 'credit_card',
        status: 'paid',
        date: new Date('2025-07-15'),
        description: 'Google Ads campaign for Q3 2025'
      }
    ];

    for (const expense of expenses) {
      try {
        await storage.createExpense(expense);
        console.log(`Created expense: ${expense.name}`);
      } catch (error) {
        console.log(`Error creating expense: ${error}`);
      }
    }

    // 4. Add more customers
    const moreCustomers = [
      {
        id: 'cust-5',
        name: 'Tech Solutions s.r.o.',
        email: 'info@techsolutions.cz',
        phone: '+420 222 333 444',
        address: 'Wenceslas Square 15, Prague',
        city: 'Prague',
        country: 'Czech Republic',
        postalCode: '110 00',
        type: 'business',
        notes: 'B2B partner - volume discounts apply'
      },
      {
        id: 'cust-6',
        name: 'Marie Svobodová',
        email: 'marie.svobodova@email.cz',
        phone: '+420 777 888 999',
        address: 'Náměstí Míru 5',
        city: 'Brno',
        country: 'Czech Republic',
        postalCode: '602 00',
        type: 'vip',
        notes: 'VIP customer - priority shipping'
      },
      {
        id: 'cust-7',
        name: 'Electronics Hub GmbH',
        email: 'purchasing@electronichub.de',
        phone: '+49 30 12345678',
        address: 'Alexanderplatz 1',
        city: 'Berlin',
        country: 'Germany',
        postalCode: '10178',
        type: 'business',
        notes: 'International B2B client'
      },
      {
        id: 'cust-8',
        name: 'Jan Dvořák',
        email: 'jan.dvorak@gmail.com',
        phone: '+420 606 707 808',
        address: 'Masarykova 25',
        city: 'Plzeň',
        country: 'Czech Republic', 
        postalCode: '301 00',
        type: 'regular',
        notes: 'Prefers weekend delivery'
      }
    ];

    for (const customer of moreCustomers) {
      try {
        await storage.createCustomer(customer);
        console.log(`Created customer: ${customer.name}`);
      } catch (error) {
        console.log(`Customer ${customer.id} may already exist, skipping...`);
      }
    }

    // 5. Add more warehouses
    const moreWarehouses = [
      {
        id: 'wh-4',
        name: 'Berlin Distribution Center',
        address: 'Industriestraße 50',
        city: 'Berlin',
        country: 'Germany',
        postalCode: '12459',
        phone: '+49 30 98765432',
        email: 'berlin@warehouse.com',
        manager: 'Klaus Schmidt',
        capacity: 8000,
        type: 'distribution',
        status: 'active'
      },
      {
        id: 'wh-5',
        name: 'Vienna Storage Facility',
        address: 'Lagerstraße 15',
        city: 'Vienna',
        country: 'Austria',
        postalCode: '1220',
        phone: '+43 1 234567',
        email: 'vienna@warehouse.com',
        manager: 'Anna Müller',
        capacity: 3500,
        type: 'cold_storage',
        status: 'active'
      }
    ];

    for (const warehouse of moreWarehouses) {
      try {
        await storage.createWarehouse(warehouse);
        console.log(`Created warehouse: ${warehouse.name}`);
      } catch (error) {
        console.log(`Warehouse ${warehouse.id} may already exist, skipping...`);
      }
    }

    // 6. Add more sales/discounts
    const moreSales = [
      {
        name: 'Back to School 2025',
        description: 'Special discount for students on electronics',
        code: 'SCHOOL2025',
        type: 'percentage',
        value: '15.00',
        currency: 'EUR',
        startDate: new Date('2025-08-15'),
        endDate: new Date('2025-09-15'),
        minimumAmount: '500.00',
        maximumDiscount: '200.00',
        status: 'active'
      },
      {
        name: 'VIP Member Discount',
        description: 'Exclusive discount for VIP customers',
        code: 'VIP20',
        type: 'percentage',
        value: '20.00',
        currency: 'EUR',
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-12-31'),
        minimumAmount: '1000.00',
        maximumDiscount: '500.00',
        status: 'active'
      },
      {
        name: 'Free Shipping',
        description: 'Free shipping on orders over 2000 CZK',
        code: 'FREESHIP',
        type: 'fixed',
        value: '200.00',
        currency: 'CZK',
        startDate: new Date('2025-07-01'),
        endDate: new Date('2025-08-31'),
        minimumAmount: '2000.00',
        status: 'active'
      }
    ];

    for (const sale of moreSales) {
      try {
        await storage.createSale(sale);
        console.log(`Created sale: ${sale.name}`);
      } catch (error) {
        console.log(`Error creating sale: ${error}`);
      }
    }

    // 7. Update existing products with import prices
    const productUpdates = [
      { id: 'prod-1', importPrice: '950.00' },
      { id: 'prod-2', importPrice: '850.00' },
      { id: 'prod-3', importPrice: '15.00' },
      { id: 'prod-4', importPrice: '8.00' },
      { id: 'prod-5', importPrice: '280.00' },
      { id: 'prod-6', importPrice: '320.00' }
    ];

    for (const update of productUpdates) {
      try {
        await storage.updateProduct(update.id, { importPrice: update.importPrice });
        console.log(`Updated product ${update.id} with import price`);
      } catch (error) {
        console.log(`Error updating product ${update.id}: ${error}`);
      }
    }

    // 8. Add more orders with various statuses and dates
    const moreOrders = [
      {
        id: 'order-7',
        orderId: await storage.generateOrderId(),
        customerId: 'cust-5',
        currency: 'EUR',
        orderStatus: 'shipped',
        paymentStatus: 'paid',
        priority: 'high',
        subtotal: '5500.00',
        taxRate: '21.00',
        taxAmount: '1155.00',
        shippingCost: '50.00',
        grandTotal: '6705.00',
        notes: 'Bulk order - Tech Solutions',
        createdAt: today,
        shippedAt: today
      },
      {
        id: 'order-8', 
        orderId: await storage.generateOrderId(),
        customerId: 'cust-6',
        currency: 'CZK',
        orderStatus: 'shipped',
        paymentStatus: 'paid',
        priority: 'medium',
        subtotal: '45000.00',
        taxRate: '21.00',
        taxAmount: '9450.00',
        shippingCost: '0.00',
        grandTotal: '54450.00',
        notes: 'VIP customer - free shipping',
        createdAt: yesterday,
        shippedAt: today
      },
      {
        id: 'order-9',
        orderId: await storage.generateOrderId(),
        customerId: 'cust-7',
        currency: 'EUR',
        orderStatus: 'processing',
        paymentStatus: 'paid',
        priority: 'low',
        subtotal: '2300.00',
        taxRate: '19.00',
        taxAmount: '437.00',
        shippingCost: '30.00',
        grandTotal: '2767.00',
        notes: 'International order - Germany',
        createdAt: today
      },
      {
        id: 'order-10',
        orderId: await storage.generateOrderId(),
        customerId: 'cust-8',
        currency: 'CZK',
        orderStatus: 'delivered',
        paymentStatus: 'paid',
        priority: 'medium',
        subtotal: '15800.00',
        taxRate: '21.00',
        taxAmount: '3318.00',
        shippingCost: '150.00',
        grandTotal: '19268.00',
        notes: 'Weekend delivery completed',
        createdAt: lastWeek,
        shippedAt: lastWeek
      },
      {
        id: 'order-11',
        orderId: await storage.generateOrderId(),
        customerId: 'cust-1',
        currency: 'EUR',
        orderStatus: 'shipped',
        paymentStatus: 'paid',
        priority: 'high',
        subtotal: '8900.00',
        taxRate: '21.00',
        taxAmount: '1869.00',
        shippingCost: '0.00',
        grandTotal: '10769.00',
        notes: 'Repeat customer - loyalty discount applied',
        createdAt: lastMonth,
        shippedAt: lastMonth
      }
    ];

    for (const order of moreOrders) {
      try {
        await storage.createOrder(order);
        console.log(`Created order: ${order.orderId}`);
        
        // Add order items based on the order
        const orderItems = getOrderItemsForOrder(order.id);
        for (const item of orderItems) {
          await storage.createOrderItem(item);
        }
      } catch (error) {
        console.log(`Error creating order: ${error}`);
      }
    }

    // 9. Add more expenses for realistic profit calculation
    const moreExpenses = [
      {
        expenseId: `EXP-${new Date().getFullYear()}-007`,
        name: 'Insurance Premium - Q3',
        category: 'insurance',
        amount: '4500.00',
        currency: 'EUR',
        recurring: 'quarterly',
        paymentMethod: 'bank_transfer',
        status: 'paid',
        date: lastMonth,
        description: 'Business insurance for all locations'
      },
      {
        expenseId: `EXP-${new Date().getFullYear()}-008`,
        name: 'Fuel Costs - Company Vehicles',
        category: 'transport',
        amount: '12000.00',
        currency: 'CZK',
        recurring: 'monthly',
        paymentMethod: 'credit_card',
        status: 'paid',
        date: lastMonth,
        description: 'Fuel for delivery vehicles'
      }
    ];

    for (const expense of moreExpenses) {
      try {
        await storage.createExpense(expense);
        console.log(`Created expense: ${expense.name}`);
      } catch (error) {
        console.log(`Error creating expense: ${error}`);
      }
    }

    console.log("Mock data seeding completed!");
  } catch (error) {
    console.error("Error seeding mock data:", error);
  }
}

// Helper function to generate order items with product names
function getOrderItemsForOrder(orderId: string): any[] {
  const productNames: Record<string, string> = {
    'prod-1': 'MacBook Pro 16" M3',
    'prod-2': 'iPad Pro 12.9"',
    'prod-3': 'Sony WH-1000XM5',
    'prod-4': 'Samsung Frame TV 65"',
    'prod-5': 'DJI Mini 3 Pro',
    'prod-6': 'Dyson V15 Detect',
    'prod-7': 'iPhone 15 Pro Max',
    'prod-8': 'Apple Watch Series 9',
    'prod-9': 'AirPods Pro (2nd Gen)'
  };
  
  const itemsMap: Record<string, any[]> = {
    'order-7': [
      { orderId: 'order-7', productId: 'prod-7', productName: productNames['prod-7'], quantity: 2, price: '2600.00', total: '5200.00' },
      { orderId: 'order-7', productId: 'prod-9', productName: productNames['prod-9'], quantity: 1, price: '300.00', total: '300.00' }
    ],
    'order-8': [
      { orderId: 'order-8', productId: 'prod-1', productName: productNames['prod-1'], quantity: 1, price: '32500.00', total: '32500.00' },
      { orderId: 'order-8', productId: 'prod-9', productName: productNames['prod-9'], quantity: 2, price: '6250.00', total: '12500.00' }
    ],
    'order-9': [
      { orderId: 'order-9', productId: 'prod-8', productName: productNames['prod-8'], quantity: 2, price: '1150.00', total: '2300.00' }
    ],
    'order-10': [
      { orderId: 'order-10', productId: 'prod-5', productName: productNames['prod-5'], quantity: 2, price: '7900.00', total: '15800.00' }
    ],
    'order-11': [
      { orderId: 'order-11', productId: 'prod-7', productName: productNames['prod-7'], quantity: 3, price: '2600.00', total: '7800.00' },
      { orderId: 'order-11', productId: 'prod-8', productName: productNames['prod-8'], quantity: 1, price: '1100.00', total: '1100.00' }
    ]
  };
  
  return itemsMap[orderId] || [];
}