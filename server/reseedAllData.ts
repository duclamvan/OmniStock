import { DatabaseStorage } from './storage';
import { nanoid } from 'nanoid';
import { db } from './db';
import { 
  orderItems, 
  returnItems, 
  returns, 
  orders, 
  expenses, 
  purchases, 
  sales, 
  productVariants, 
  products, 
  customers, 
  suppliers, 
  warehouses, 
  categories 
} from '@shared/schema';

const storage = new DatabaseStorage();

export async function reseedAllData() {
  console.log("Starting comprehensive data reseed...");

  try {
    // Clear existing data in reverse dependency order
    console.log("Clearing existing data...");
    
    // Clear order items first
    await db.delete(orderItems);
    
    // Clear returns and return items
    await db.delete(returnItems);
    await db.delete(returns);
    
    // Clear orders
    await db.delete(orders);
    
    // Clear expenses
    await db.delete(expenses);
    
    // Clear purchases
    await db.delete(purchases);
    
    // Clear discounts
    await db.delete(sales);
    
    // Clear product variants
    await db.delete(productVariants);
    
    // First, null out foreign key references in products to avoid FK constraints
    await db.update(products).set({ supplierId: null, warehouseId: null, categoryId: null });
    
    // Clear products (hard delete for reseed)
    await db.delete(products);
    
    // Clear customers
    await db.delete(customers);
    
    // Clear suppliers (after nulling product references)
    await db.delete(suppliers);
    
    // Clear warehouses
    await db.delete(warehouses);
    
    // Clear categories
    await db.delete(categories);

    console.log("Existing data cleared. Starting to seed new data...");

    // 1. Create Categories
    const categoriesData = [
      { id: 'cat-electronics', name: 'Electronics', description: 'Electronic devices and accessories' },
      { id: 'cat-fashion', name: 'Fashion & Apparel', description: 'Clothing, shoes, and accessories' },
      { id: 'cat-home', name: 'Home & Garden', description: 'Home appliances and garden supplies' },
      { id: 'cat-sports', name: 'Sports & Outdoor', description: 'Sports equipment and outdoor gear' },
      { id: 'cat-beauty', name: 'Beauty & Personal Care', description: 'Cosmetics and personal care products' },
      { id: 'cat-toys', name: 'Toys & Games', description: 'Children toys and games' },
      { id: 'cat-books', name: 'Books & Media', description: 'Books, magazines, and digital media' },
      { id: 'cat-food', name: 'Food & Beverages', description: 'Food items and beverages' },
    ];

    for (const category of categoriesData) {
      await storage.createCategory(category);
      console.log(`Created category: ${category.name}`);
    }

    // 2. Create Warehouses
    const warehousesData = [
      {
        id: 'wh-prague-main',
        name: 'Prague Main Warehouse',
        code: 'PRG-001',
        address: 'Průmyslová 15',
        city: 'Prague',
        zipCode: '110 00',
        country: 'Czech Republic',
        contactPerson: 'Pavel Novák',
        phone: '+420 224 123 456',
        email: 'pavel.novak@davie.cz',
        isActive: true,
        capacity: 10000,
        currentOccupancy: 7500,
      },
      {
        id: 'wh-brno-secondary',
        name: 'Brno Secondary Hub',
        code: 'BRN-002',
        address: 'Technická 28',
        city: 'Brno',
        zipCode: '616 00',
        country: 'Czech Republic',
        contactPerson: 'Jana Svobodová',
        phone: '+420 541 234 567',
        email: 'jana.svobodova@davie.cz',
        isActive: true,
        capacity: 5000,
        currentOccupancy: 3200,
      },
      {
        id: 'wh-berlin-eu',
        name: 'Berlin EU Distribution',
        code: 'BER-003',
        address: 'Industriestraße 42',
        city: 'Berlin',
        zipCode: '13409',
        country: 'Germany',
        contactPerson: 'Hans Mueller',
        phone: '+49 30 12345678',
        email: 'hans.mueller@davie.de',
        isActive: true,
        capacity: 8000,
        currentOccupancy: 4500,
      },
    ];

    for (const warehouse of warehousesData) {
      await storage.createWarehouse(warehouse);
      console.log(`Created warehouse: ${warehouse.name}`);
    }

    // 3. Create Suppliers
    const suppliersData = [
      {
        id: 'sup-apple',
        name: 'Apple Czech Republic',
        contactPerson: 'Milan Kroupa',
        email: 'milan.kroupa@apple.com',
        phone: '+420 225 588 000',
        address: 'Karlovo náměstí 10',
        city: 'Prague',
        zipCode: '120 00',
        country: 'Czech Republic',
        website: 'https://www.apple.com/cz',
        paymentTerms: '30 days',
        notes: 'Premium electronics supplier',
        isActive: true,
      },
      {
        id: 'sup-samsung',
        name: 'Samsung Europe B.V.',
        contactPerson: 'Jakub Říha',
        email: 'jakub.riha@samsung.com',
        phone: '+420 800 726 786',
        address: 'Vyskočilova 1461/2a',
        city: 'Prague',
        zipCode: '140 00',
        country: 'Czech Republic',
        website: 'https://www.samsung.com/cz',
        paymentTerms: '45 days',
        notes: 'Electronics and appliances',
        isActive: true,
      },
      {
        id: 'sup-nike',
        name: 'Nike EMEA B.V.',
        contactPerson: 'Petra Svobodová',
        email: 'petra.svobodova@nike.com',
        phone: '+31 20 347 7000',
        address: 'Colosseum 1',
        city: 'Amsterdam',
        zipCode: '1213 NL',
        country: 'Netherlands',
        website: 'https://www.nike.com',
        paymentTerms: '60 days',
        notes: 'Sports apparel and footwear',
        isActive: true,
      },
      {
        id: 'sup-loreal',
        name: "L'Oréal Česká republika",
        contactPerson: 'Markéta Horáková',
        email: 'marketa.horakova@loreal.com',
        phone: '+420 234 767 111',
        address: 'Rohanské nábřeží 678/29',
        city: 'Prague',
        zipCode: '186 00',
        country: 'Czech Republic',
        website: 'https://www.loreal.cz',
        paymentTerms: '45 days',
        notes: 'Beauty and cosmetics',
        isActive: true,
      },
    ];

    for (const supplier of suppliersData) {
      await storage.createSupplier(supplier);
      console.log(`Created supplier: ${supplier.name}`);
    }

    // 4. Create Products
    const productsData = [
      // Electronics
      {
        id: 'prod-iphone-15',
        name: 'iPhone 15 Pro Max 256GB',
        sku: 'APPLE-IP15PM-256',
        categoryId: 'cat-electronics',
        supplierId: 'sup-apple',
        warehouseId: 'wh-prague-main',
        description: 'Latest iPhone with A17 Pro chip, 256GB storage',
        importCost: '28000.00',
        sellingPrice: '32000.00',
        currency: 'CZK',
        stockQuantity: 45,
        lowStockThreshold: 10,
        barcode: '194253394051',
        weight: 0.221,
        dimensions: '159.9x76.7x8.25',
        isActive: true,
      },
      {
        id: 'prod-macbook-m3',
        name: 'MacBook Pro 16" M3',
        sku: 'APPLE-MBP16-M3-512',
        categoryId: 'cat-electronics',
        supplierId: 'sup-apple',
        warehouseId: 'wh-prague-main',
        description: 'MacBook Pro with M3 chip, 16GB RAM, 512GB SSD',
        importCost: '65000.00',
        sellingPrice: '72000.00',
        currency: 'CZK',
        stockQuantity: 12,
        lowStockThreshold: 5,
        barcode: '194253564789',
        weight: 2.14,
        dimensions: '355.7x248.1x16.8',
        isActive: true,
      },
      {
        id: 'prod-samsung-tv',
        name: 'Samsung QLED 65" 4K Smart TV',
        sku: 'SAMSUNG-Q80C-65',
        categoryId: 'cat-electronics',
        supplierId: 'sup-samsung',
        warehouseId: 'wh-berlin-eu',
        description: 'QLED 4K Smart TV with Quantum Processor',
        importCost: '850.00',
        sellingPrice: '1299.00',
        currency: 'EUR',
        stockQuantity: 8,
        lowStockThreshold: 3,
        barcode: '887276543210',
        weight: 25.5,
        dimensions: '1450.5x831.9x25.7',
        isActive: true,
      },
      // Fashion
      {
        id: 'prod-nike-air-max',
        name: 'Nike Air Max 270',
        sku: 'NIKE-AM270-BLK-42',
        categoryId: 'cat-fashion',
        supplierId: 'sup-nike',
        warehouseId: 'wh-prague-main',
        description: 'Iconic Air Max sneakers, Black, Size 42',
        importCost: '2200.00',
        sellingPrice: '3500.00',
        currency: 'CZK',
        stockQuantity: 25,
        lowStockThreshold: 8,
        barcode: '826215631842',
        weight: 0.35,
        dimensions: '32x22x12',
        isActive: true,
      },
      // Beauty
      {
        id: 'prod-loreal-serum',
        name: "L'Oréal Revitalift Serum",
        sku: 'LOREAL-REVIT-30ML',
        categoryId: 'cat-beauty',
        supplierId: 'sup-loreal',
        warehouseId: 'wh-brno-secondary',
        description: 'Anti-aging serum with Hyaluronic Acid, 30ml',
        importCost: '450.00',
        sellingPrice: '750.00',
        currency: 'CZK',
        stockQuantity: 60,
        lowStockThreshold: 20,
        barcode: '3600523959655',
        weight: 0.08,
        dimensions: '4x4x12',
        isActive: true,
      },
    ];

    for (const product of productsData) {
      await storage.createProduct(product);
      console.log(`Created product: ${product.name}`);
    }

    // 5. Create Customers
    const customersData = [
      {
        id: 'cust-pavel-novak',
        name: 'Pavel Novák',
        facebookName: 'Pavel N.',
        facebookId: 'pavel.novak.123',
        email: 'pavel.novak@gmail.com',
        phone: '+420 777 123 456',
        address: 'Wenceslas Square 14',
        city: 'Prague',
        zipCode: '110 00',
        country: 'Czech Republic',
        type: 'vip' as const,
        notes: 'VIP customer - prefers premium products, expedited shipping',
      },
      {
        id: 'cust-tech-solutions',
        name: 'Tech Solutions s.r.o.',
        email: 'orders@techsolutions.cz',
        phone: '+420 234 567 890',
        address: 'Palackého třída 123',
        city: 'Brno',
        zipCode: '602 00',
        country: 'Czech Republic',
        type: 'business' as const,
        notes: 'B2B customer - bulk orders, 30-day payment terms',
      },
      {
        id: 'cust-anna-svoboda',
        name: 'Anna Svobodová',
        facebookName: 'Anna Svobodová',
        facebookId: 'anna.svoboda.456',
        email: 'anna.svoboda@email.cz',
        phone: '+420 603 456 789',
        address: 'Národní třída 28',
        city: 'Prague',
        zipCode: '110 00',
        country: 'Czech Republic',
        type: 'regular' as const,
        notes: 'Fashion enthusiast, frequent online shopper',
      },
    ];

    for (const customer of customersData) {
      await storage.createCustomer(customer);
      console.log(`Created customer: ${customer.name}`);
    }

    // 6. Create Expenses
    const expensesData = [
      {
        id: nanoid(),
        expenseId: `EXP-${new Date().getFullYear()}-001`,
        name: 'Prague Property Management',
        category: 'Rent',
        amount: '3500.00',
        currency: 'EUR' as const,
        date: new Date('2025-08-01'),
        paymentMethod: 'Bank Transfer',
        status: 'paid' as const,
        recurring: 'monthly' as const,
        description: 'Monthly rent for Prague warehouse facility',
      },
      {
        id: nanoid(),
        expenseId: `EXP-${new Date().getFullYear()}-002`,
        name: 'Davie Professional HR',
        category: 'Salaries',
        amount: '12500.00',
        currency: 'EUR' as const,
        date: new Date('2025-07-31'),
        paymentMethod: 'Bank Transfer',
        status: 'paid' as const,
        recurring: 'monthly' as const,
        description: 'August 2025 payroll for all employees',
      },
      {
        id: nanoid(),
        expenseId: `EXP-${new Date().getFullYear()}-003`,
        name: 'ČEZ Energy',
        category: 'Utilities',
        amount: '18500.00',
        currency: 'CZK' as const,
        date: new Date('2025-08-01'),
        paymentMethod: 'Direct Debit',
        status: 'pending' as const,
        recurring: 'monthly' as const,
        description: 'Electricity for warehouses and offices',
      },
      {
        id: nanoid(),
        expenseId: `EXP-${new Date().getFullYear()}-004`,
        name: 'DHL Express',
        category: 'Transportation',
        amount: '2850.00',
        currency: 'EUR' as const,
        date: new Date('2025-07-28'),
        paymentMethod: 'Credit Card',
        status: 'paid' as const,
        description: 'Monthly shipping costs for customer orders',
      },
      {
        id: nanoid(),
        expenseId: `EXP-${new Date().getFullYear()}-005`,
        name: 'Office Depot CZ',
        category: 'Supplies',
        amount: '5600.00',
        currency: 'CZK' as const,
        date: new Date('2025-08-02'),
        paymentMethod: 'Credit Card',
        status: 'pending' as const,
        description: 'Office supplies and stationery',
      },
    ];

    for (const expense of expensesData) {
      await storage.createExpense(expense);
      console.log(`Created expense: ${expense.name}`);
    }

    // 7. Create Purchases
    const purchasesData = [
      {
        id: nanoid(),
        purchaseId: `PUR-${new Date().getFullYear()}-001`,
        productName: 'iPhone 15 Pro Max 256GB',
        sku: 'APPLE-IP15PM-256',
        quantity: 50,
        importPrice: '28000.00',
        importCurrency: 'CZK' as const,
        supplierName: 'Apple Czech Republic',
        supplierUrl: 'https://www.apple.com/cz',
        status: 'delivered' as const,
        shipmentId: 'SHIP-2025-001',
        description: 'Q3 2025 iPhone stock replenishment',
        purchaseDate: new Date('2025-07-15'),
      },
      {
        id: nanoid(),
        purchaseId: `PUR-${new Date().getFullYear()}-002`,
        productName: 'Samsung QLED 65" 4K Smart TV',
        sku: 'SAMSUNG-Q80C-65',
        quantity: 15,
        importPrice: '850.00',
        importCurrency: 'EUR' as const,
        supplierName: 'Samsung Europe B.V.',
        supplierUrl: 'https://www.samsung.com/cz',
        status: 'shipped' as const,
        shipmentId: 'SHIP-2025-002',
        description: 'TV inventory for summer sales',
        purchaseDate: new Date('2025-07-28'),
      },
    ];

    for (const purchase of purchasesData) {
      await storage.createPurchase(purchase);
      console.log(`Created purchase: ${purchase.productName}`);
    }

    // 8. Create Discounts
    const discounts = [
      {
        id: nanoid(),
        discountId: `#${new Date().getFullYear()}SUMMER`,
        name: 'Summer Sale 2025',
        description: 'Special summer discount on all electronics',
        percentage: 15,
        value: '15.00',
        status: 'active' as const,
        startDate: new Date('2025-07-01'),
        endDate: new Date('2025-08-31'),
        applicationScope: 'specific_category' as const,
        categoryId: 'cat-electronics',
      },
      {
        id: nanoid(),
        discountId: `#${new Date().getFullYear()}VIP`,
        name: 'VIP Customer Discount',
        description: 'Exclusive discount for VIP customers',
        percentage: 20,
        value: '20.00',
        status: 'active' as const,
        startDate: new Date('2025-08-01'),
        endDate: new Date('2025-12-31'),
        applicationScope: 'all_products' as const,
      },
      {
        id: nanoid(),
        discountId: `#${new Date().getFullYear()}CLEARANCE`,
        name: 'Beauty Clearance',
        description: 'Clearance sale on beauty products',
        percentage: 30,
        value: '30.00',
        status: 'active' as const,
        startDate: new Date('2025-08-01'),
        endDate: new Date('2025-08-15'),
        applicationScope: 'specific_category' as const,
        categoryId: 'cat-beauty',
      },
    ];

    for (const discount of discounts) {
      await storage.createSale(discount);
      console.log(`Created discount: ${discount.name}`);
    }

    // 9. Create Orders
    const ordersData = [
      {
        id: nanoid(),
        orderId: `ORD-${new Date().getFullYear()}080001`,
        customerId: 'cust-pavel-novak',
        currency: 'CZK' as const,
        orderStatus: 'to_fulfill' as const,
        paymentStatus: 'paid' as const,
        priority: 'high' as const,
        subtotal: '32000.00',
        discountType: 'rate' as const,
        discountValue: '15.00',
        taxRate: '21.00',
        taxAmount: '5712.00',
        shippingCost: '0.00',
        grandTotal: '32912.00',
        notes: 'VIP customer - expedited shipping requested',
        shippingMethod: 'DHL',
        paymentMethod: 'Credit Card',
        createdAt: new Date('2025-08-04T10:00:00Z'),
        items: [
          {
            id: nanoid(),
            productName: 'iPhone 15 Pro Max 256GB',
            sku: 'APPLE-IP15PM-256',
            quantity: 1,
            price: '32000.00',
            discount: '4800.00',
            tax: '5712.00',
            total: '27200.00',
          },
        ],
      },
      {
        id: nanoid(),
        orderId: `ORD-${new Date().getFullYear()}080002`,
        customerId: 'cust-tech-solutions',
        currency: 'EUR' as const,
        orderStatus: 'shipped' as const,
        paymentStatus: 'paid' as const,
        priority: 'normal' as const,
        subtotal: '3897.00',
        taxRate: '21.00',
        taxAmount: '818.37',
        shippingCost: '50.00',
        grandTotal: '4765.37',
        notes: 'B2B order - 30 day payment terms',
        shippingMethod: 'GLS',
        paymentMethod: 'Bank Transfer',
        createdAt: new Date('2025-08-02T14:30:00Z'),
        shippedAt: new Date('2025-08-03T09:00:00Z'),
        items: [
          {
            id: nanoid(),
            productName: 'Samsung QLED 65" 4K Smart TV',
            sku: 'SAMSUNG-Q80C-65',
            quantity: 3,
            price: '1299.00',
            discount: '0.00',
            tax: '818.37',
            total: '3897.00',
          },
        ],
      },
      {
        id: nanoid(),
        orderId: `ORD-${new Date().getFullYear()}080003`,
        customerId: 'cust-anna-svoboda',
        currency: 'CZK' as const,
        orderStatus: 'to_fulfill' as const,
        paymentStatus: 'pay_later' as const,
        priority: 'low' as const,
        subtotal: '3500.00',
        discountType: 'rate' as const,
        discountValue: '20.00',
        taxRate: '21.00',
        taxAmount: '588.00',
        shippingCost: '99.00',
        grandTotal: '3487.00',
        notes: 'Customer prefers weekend delivery',
        shippingMethod: 'PPL',
        paymentMethod: 'Cash on Delivery',
        createdAt: new Date('2025-08-04T16:45:00Z'),
        items: [
          {
            id: nanoid(),
            productName: 'Nike Air Max 270',
            sku: 'NIKE-AM270-BLK-42',
            quantity: 1,
            price: '3500.00',
            discount: '700.00',
            tax: '588.00',
            total: '2800.00',
          },
        ],
      },
    ];

    for (const order of ordersData) {
      const { items, ...orderData } = order;
      const createdOrder = await storage.createOrder(orderData);
      
      for (const item of items) {
        await storage.createOrderItem({ ...item, orderId: createdOrder.id });
      }
      
      console.log(`Created order: ${order.orderId}`);
    }

    // 10. Create Returns
    const returnsData = [
      {
        id: nanoid(),
        returnId: `RET-${new Date().getFullYear()}080001`,
        orderId: ordersData[1].id, // Return from shipped order
        customerId: 'cust-tech-solutions',
        status: 'pending' as const,
        reason: 'Defective product - dead pixels on screen',
        notes: 'Customer reported multiple dead pixels on one TV unit',
        refundAmount: '1299.00',
        refundCurrency: 'EUR' as const,
        createdAt: new Date('2025-08-04T11:00:00Z'),
        items: [
          {
            id: nanoid(),
            productName: 'Samsung QLED 65" 4K Smart TV',
            sku: 'SAMSUNG-Q80C-65',
            quantity: 1,
            reason: 'Defective',
            condition: 'damaged' as const,
          },
        ],
      },
    ];

    for (const returnData of returnsData) {
      const { items, ...returnInfo } = returnData;
      const createdReturn = await storage.createReturn(returnInfo);
      
      for (const item of items) {
        await storage.createReturnItem({ ...item, returnId: createdReturn.id });
      }
      
      console.log(`Created return: ${returnData.returnId}`);
    }

    console.log("✅ Data reseed completed successfully!");
    
    return {
      categories: categoriesData.length,
      warehouses: warehousesData.length,
      suppliers: suppliersData.length,
      products: productsData.length,
      customers: customersData.length,
      expenses: expensesData.length,
      purchases: purchasesData.length,
      discounts: discounts.length,
      orders: ordersData.length,
      returns: returnsData.length,
    };
  } catch (error) {
    console.error("Error during data reseed:", error);
    throw error;
  }
}