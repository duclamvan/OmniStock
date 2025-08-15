import { db } from "./db";
import { 
  products, 
  productVariants, 
  productBundles, 
  bundleItems, 
  customers, 
  orders, 
  orderItems,
  categories,
  warehouses,
  suppliers
} from "@shared/schema";
import { nanoid } from "nanoid";

async function seedPickPackData() {
  console.log("🌱 Seeding Pick & Pack test data...");

  try {
    // Create categories
    const electronicsCategory = await db.insert(categories).values({
      id: 'cat-electronics',
      name: 'Electronics',
      description: 'Electronic devices and accessories'
    }).returning().then(rows => rows[0]);

    const clothingCategory = await db.insert(categories).values({
      id: 'cat-clothing',
      name: 'Clothing',
      description: 'Apparel and fashion items'
    }).returning().then(rows => rows[0]);

    const homeCategory = await db.insert(categories).values({
      id: 'cat-home',
      name: 'Home & Garden',
      description: 'Home decor and garden items'
    }).returning().then(rows => rows[0]);

    // Create warehouses with all fields
    const mainWarehouse = await db.insert(warehouses).values({
      id: 'wh-main',
      code: 'WH-MAIN',
      name: 'Main Distribution Center',
      location: 'Prague Central',
      address: '123 Warehouse Street',
      city: 'Prague',
      country: 'Czech Republic',
      zipCode: '11000',
      phone: '+420 123 456 789',
      email: 'main@warehouse.cz',
      manager: 'John Smith',
      capacity: 10000,
      floorArea: '5000.00',
      type: 'main',
      status: 'active',
      contact: 'John Smith - Manager',
      notes: 'Primary distribution center with automated sorting'
    }).returning().then(rows => rows[0]);

    const secondaryWarehouse = await db.insert(warehouses).values({
      id: 'wh-secondary',
      code: 'WH-SEC',
      name: 'Secondary Storage',
      location: 'Brno',
      address: '456 Storage Road',
      city: 'Brno',
      country: 'Czech Republic',
      zipCode: '60200',
      phone: '+420 234 567 890',
      email: 'secondary@warehouse.cz',
      manager: 'Jane Doe',
      capacity: 5000,
      floorArea: '2500.00',
      type: 'branch',
      status: 'active'
    }).returning().then(rows => rows[0]);

    // Create suppliers
    const techSupplier = await db.insert(suppliers).values({
      id: 'sup-tech',
      name: 'TechWorld Imports',
      contactPerson: 'Michael Chen',
      email: 'orders@techworld.com',
      phone: '+86 123 456 7890',
      address: 'Shenzhen Technology Park',
      country: 'China',
      website: 'www.techworld.com',
      supplierLink: 'https://techworld.com/supplier-portal',
      totalPurchased: '150000.00',
      notes: 'Reliable electronics supplier, 30-day payment terms'
    }).returning().then(rows => rows[0]);

    const clothingSupplier = await db.insert(suppliers).values({
      id: 'sup-clothing',
      name: 'Fashion Direct',
      contactPerson: 'Maria Garcia',
      email: 'wholesale@fashiondirect.com',
      phone: '+84 909 123 456',
      address: 'Ho Chi Minh City, District 7',
      country: 'Vietnam',
      website: 'www.fashiondirect.vn',
      notes: 'Quality clothing manufacturer'
    }).returning().then(rows => rows[0]);

    // Create diverse products with all fields
    const productsData = [
      // Electronics with variants
      {
        id: 'prod-laptop-001',
        name: 'ProBook Laptop 15"',
        englishName: 'ProBook Laptop 15 inch',
        sku: 'LAP-PRO-15',
        categoryId: electronicsCategory.id,
        warehouseId: mainWarehouse.id,
        warehouseLocation: 'A1-01-03',
        supplierId: techSupplier.id,
        description: 'High-performance laptop with 16GB RAM, 512GB SSD',
        quantity: 25,
        lowStockAlert: 5,
        priceCzk: '25000.00',
        priceEur: '1000.00',
        importCostUsd: '700.00',
        importCostCzk: '15000.00',
        importCostEur: '650.00',
        supplierLink: 'https://techworld.com/probook-15',
        barcode: '8901234567890',
        length: '35.5',
        width: '25.0',
        height: '2.2',
        weight: '1.8',
        isActive: true
      },
      {
        id: 'prod-phone-001',
        name: 'SmartPhone X12',
        englishName: 'SmartPhone X12',
        sku: 'PHN-X12',
        categoryId: electronicsCategory.id,
        warehouseId: mainWarehouse.id,
        warehouseLocation: 'A1-02-05',
        supplierId: techSupplier.id,
        description: '5G smartphone with 128GB storage',
        quantity: 50,
        lowStockAlert: 10,
        priceCzk: '15000.00',
        priceEur: '600.00',
        importCostUsd: '350.00',
        importCostCzk: '8000.00',
        importCostEur: '320.00',
        barcode: '8901234567891',
        length: '15.0',
        width: '7.5',
        height: '0.8',
        weight: '0.18'
      },
      {
        id: 'prod-headphones-001',
        name: 'Wireless Headphones Pro',
        englishName: 'Wireless Headphones Pro',
        sku: 'HP-PRO-WL',
        categoryId: electronicsCategory.id,
        warehouseId: mainWarehouse.id,
        warehouseLocation: 'A1-03-02',
        supplierId: techSupplier.id,
        description: 'Noise-cancelling wireless headphones',
        quantity: 100,
        lowStockAlert: 20,
        priceCzk: '3500.00',
        priceEur: '140.00',
        importCostUsd: '60.00',
        importCostCzk: '1500.00',
        importCostEur: '55.00',
        barcode: '8901234567892',
        length: '20.0',
        width: '18.0',
        height: '8.0',
        weight: '0.25'
      },
      // Clothing items
      {
        id: 'prod-tshirt-001',
        name: 'Cotton T-Shirt',
        englishName: 'Cotton T-Shirt',
        sku: 'TSH-COT-M',
        categoryId: clothingCategory.id,
        warehouseId: secondaryWarehouse.id,
        warehouseLocation: 'B2-01-10',
        supplierId: clothingSupplier.id,
        description: '100% organic cotton t-shirt',
        quantity: 200,
        lowStockAlert: 30,
        priceCzk: '500.00',
        priceEur: '20.00',
        importCostUsd: '5.00',
        importCostCzk: '120.00',
        importCostEur: '4.50',
        barcode: '8901234567893',
        weight: '0.15'
      },
      {
        id: 'prod-jeans-001',
        name: 'Denim Jeans',
        englishName: 'Denim Jeans',
        sku: 'JNS-DEN-32',
        categoryId: clothingCategory.id,
        warehouseId: secondaryWarehouse.id,
        warehouseLocation: 'B2-02-05',
        supplierId: clothingSupplier.id,
        description: 'Premium denim jeans, regular fit',
        quantity: 75,
        lowStockAlert: 15,
        priceCzk: '1500.00',
        priceEur: '60.00',
        importCostUsd: '20.00',
        importCostCzk: '450.00',
        importCostEur: '18.00',
        barcode: '8901234567894',
        weight: '0.50'
      },
      // Home items
      {
        id: 'prod-lamp-001',
        name: 'LED Desk Lamp',
        englishName: 'LED Desk Lamp',
        sku: 'LMP-LED-01',
        categoryId: homeCategory.id,
        warehouseId: mainWarehouse.id,
        warehouseLocation: 'C3-01-01',
        supplierId: techSupplier.id,
        description: 'Adjustable LED desk lamp with USB charging',
        quantity: 40,
        lowStockAlert: 8,
        priceCzk: '800.00',
        priceEur: '32.00',
        importCostUsd: '12.00',
        importCostCzk: '280.00',
        importCostEur: '11.00',
        barcode: '8901234567895',
        length: '40.0',
        width: '15.0',
        height: '45.0',
        weight: '1.2'
      },
      {
        id: 'prod-cushion-001',
        name: 'Decorative Cushion',
        englishName: 'Decorative Cushion',
        sku: 'CSH-DEC-01',
        categoryId: homeCategory.id,
        warehouseId: secondaryWarehouse.id,
        warehouseLocation: 'C3-02-08',
        description: 'Soft decorative cushion 45x45cm',
        quantity: 150,
        lowStockAlert: 25,
        priceCzk: '300.00',
        priceEur: '12.00',
        importCostUsd: '3.00',
        importCostCzk: '70.00',
        importCostEur: '2.80',
        barcode: '8901234567896',
        length: '45.0',
        width: '45.0',
        height: '15.0',
        weight: '0.35'
      }
    ];

    const createdProducts = await db.insert(products).values(productsData).returning();

    // Create product variants for some products
    const phoneVariants = [
      {
        id: 'var-phone-black',
        productId: 'prod-phone-001',
        name: 'Black - 128GB',
        barcode: '8901234567897',
        quantity: 20,
        importCostUsd: '350.00',
        importCostCzk: '8000.00',
        importCostEur: '320.00'
      },
      {
        id: 'var-phone-white',
        productId: 'prod-phone-001',
        name: 'White - 128GB',
        barcode: '8901234567898',
        quantity: 15,
        importCostUsd: '350.00',
        importCostCzk: '8000.00',
        importCostEur: '320.00'
      },
      {
        id: 'var-phone-blue',
        productId: 'prod-phone-001',
        name: 'Blue - 256GB',
        barcode: '8901234567899',
        quantity: 15,
        importCostUsd: '400.00',
        importCostCzk: '9000.00',
        importCostEur: '360.00'
      }
    ];

    const tshirtVariants = [
      {
        id: 'var-tshirt-s',
        productId: 'prod-tshirt-001',
        name: 'Size S - White',
        barcode: '8901234567900',
        quantity: 50
      },
      {
        id: 'var-tshirt-m',
        productId: 'prod-tshirt-001',
        name: 'Size M - White',
        barcode: '8901234567901',
        quantity: 75
      },
      {
        id: 'var-tshirt-l',
        productId: 'prod-tshirt-001',
        name: 'Size L - White',
        barcode: '8901234567902',
        quantity: 75
      }
    ];

    await db.insert(productVariants).values([...phoneVariants, ...tshirtVariants]);

    // Create product bundles
    const techBundle = await db.insert(productBundles).values({
      id: 'bundle-tech-001',
      bundleId: 'BDL-TECH-001',
      name: 'Complete Home Office Bundle',
      description: 'Everything you need for a productive home office',
      sku: 'BDL-HOME-OFF',
      isActive: true,
      priceCzk: '42000.00',
      priceEur: '1680.00',
      discountPercentage: '10.00',
      notes: 'Popular bundle for remote workers'
    }).returning().then(rows => rows[0]);

    const fashionBundle = await db.insert(productBundles).values({
      id: 'bundle-fashion-001',
      bundleId: 'BDL-FASH-001',
      name: 'Summer Essentials Pack',
      description: 'Complete summer wardrobe essentials',
      sku: 'BDL-SUM-ESS',
      isActive: true,
      priceCzk: '1800.00',
      priceEur: '72.00',
      discountPercentage: '15.00'
    }).returning().then(rows => rows[0]);

    // Add items to bundles
    await db.insert(bundleItems).values([
      {
        bundleId: techBundle.id,
        productId: 'prod-laptop-001',
        quantity: 1,
        notes: 'Main item'
      },
      {
        bundleId: techBundle.id,
        productId: 'prod-headphones-001',
        quantity: 1
      },
      {
        bundleId: techBundle.id,
        productId: 'prod-lamp-001',
        quantity: 1
      },
      {
        bundleId: fashionBundle.id,
        productId: 'prod-tshirt-001',
        variantId: 'var-tshirt-m',
        quantity: 3,
        notes: 'Mixed colors available'
      },
      {
        bundleId: fashionBundle.id,
        productId: 'prod-jeans-001',
        quantity: 1
      }
    ]);

    // Create diverse customers
    const customersData = [
      {
        id: 'cust-vip-001',
        name: 'Tech Solutions Inc.',
        email: 'orders@techsolutions.cz',
        phone: '+420 777 123 456',
        address: 'Wenceslas Square 123',
        city: 'Prague',
        state: 'Prague',
        zipCode: '11000',
        country: 'Czech Republic',
        type: 'vip',
        notes: 'VIP customer - priority shipping'
      },
      {
        id: 'cust-regular-001',
        name: 'Marie Novakova',
        facebookName: 'Marie Nov',
        facebookId: 'fb_marie_123',
        email: 'marie.n@email.cz',
        phone: '+420 606 789 012',
        address: 'Masarykova 456',
        city: 'Brno',
        zipCode: '60200',
        country: 'Czech Republic',
        type: 'regular'
      },
      {
        id: 'cust-wholesale-001',
        name: 'Fashion Retail Group',
        email: 'purchasing@fashionretail.eu',
        phone: '+420 222 333 444',
        address: 'Industrial Zone B',
        city: 'Ostrava',
        country: 'Czech Republic',
        type: 'wholesale',
        notes: 'Wholesale buyer - net 30 payment terms'
      },
      {
        id: 'cust-walkin-001',
        name: 'Walk-in Customer',
        type: 'regular',
        notes: 'POS sale customer'
      }
    ];

    await db.insert(customers).values(customersData);

    // Create diverse orders with all statuses
    const ordersData = [
      // Ready to pick orders
      {
        id: 'ord-pick-001',
        orderId: 'ORD-2025-001',
        customerId: 'cust-vip-001',
        currency: 'CZK' as const,
        orderStatus: 'to_fulfill' as const,
        paymentStatus: 'paid' as const,
        priority: 'high' as const,
        subtotal: '43300.00',
        taxRate: '21.00',
        taxAmount: '9093.00',
        shippingMethod: 'DHL' as const,
        paymentMethod: 'Bank Transfer' as const,
        shippingCost: '150.00',
        grandTotal: '52543.00',
        notes: 'VIP customer - handle with care',
        pickStatus: 'not_started',
        packStatus: 'not_started'
      },
      {
        id: 'ord-pick-002',
        orderId: 'ORD-2025-002',
        customerId: 'cust-regular-001',
        currency: 'EUR' as const,
        orderStatus: 'to_fulfill' as const,
        paymentStatus: 'paid' as const,
        priority: 'medium' as const,
        subtotal: '152.00',
        taxRate: '21.00',
        taxAmount: '31.92',
        shippingMethod: 'PPL' as const,
        paymentMethod: 'PayPal' as const,
        shippingCost: '8.00',
        grandTotal: '191.92',
        pickStatus: 'not_started',
        packStatus: 'not_started'
      },
      // Currently picking
      {
        id: 'ord-picking-001',
        orderId: 'ORD-2025-003',
        customerId: 'cust-wholesale-001',
        currency: 'CZK' as const,
        orderStatus: 'to_fulfill' as const,
        paymentStatus: 'pay_later' as const,
        priority: 'low' as const,
        subtotal: '7500.00',
        discountType: 'rate' as const,
        discountValue: '750.00',
        taxRate: '21.00',
        taxAmount: '1417.50',
        shippingMethod: 'GLS' as const,
        paymentMethod: 'Bank Transfer' as const,
        shippingCost: '200.00',
        grandTotal: '8367.50',
        notes: 'Wholesale order - bulk discount applied',
        pickStatus: 'in_progress',
        packStatus: 'not_started',
        pickedBy: 'John Picker',
        pickStartTime: new Date(Date.now() - 15 * 60000) // Started 15 minutes ago
      },
      // Currently packing
      {
        id: 'ord-packing-001',
        orderId: 'ORD-2025-004',
        customerId: 'cust-vip-001',
        currency: 'EUR' as const,
        orderStatus: 'to_fulfill' as const,
        paymentStatus: 'paid' as const,
        priority: 'high' as const,
        subtotal: '1840.00',
        taxRate: '21.00',
        taxAmount: '386.40',
        shippingMethod: 'DHL' as const,
        paymentMethod: 'Cash' as const,
        shippingCost: '12.00',
        grandTotal: '2238.40',
        pickStatus: 'completed',
        packStatus: 'in_progress',
        pickedBy: 'Jane Picker',
        packedBy: 'Mike Packer',
        pickStartTime: new Date(Date.now() - 45 * 60000),
        pickEndTime: new Date(Date.now() - 20 * 60000),
        packStartTime: new Date(Date.now() - 10 * 60000)
      },
      // Bundle order
      {
        id: 'ord-bundle-001',
        orderId: 'ORD-2025-005',
        customerId: 'cust-regular-001',
        currency: 'CZK' as const,
        orderStatus: 'to_fulfill' as const,
        paymentStatus: 'paid' as const,
        priority: 'medium' as const,
        subtotal: '43800.00',
        discountType: 'flat' as const,
        discountValue: '4380.00', // 10% bundle discount
        taxRate: '21.00',
        taxAmount: '8278.20',
        shippingMethod: 'PPL' as const,
        paymentMethod: 'COD' as const,
        shippingCost: '100.00',
        grandTotal: '47798.20',
        notes: 'Bundle order - check all items included',
        pickStatus: 'not_started',
        packStatus: 'not_started'
      },
      // Ready to ship
      {
        id: 'ord-ready-001',
        orderId: 'ORD-2025-006',
        customerId: 'cust-walkin-001',
        currency: 'CZK' as const,
        orderStatus: 'to_fulfill' as const,
        paymentStatus: 'paid' as const,
        priority: 'low' as const,
        subtotal: '1100.00',
        taxRate: '21.00',
        taxAmount: '231.00',
        shippingMethod: 'DPD' as const,
        paymentMethod: 'Cash' as const,
        shippingCost: '0.00',
        grandTotal: '1331.00',
        notes: 'POS sale - packed and ready',
        pickStatus: 'completed',
        packStatus: 'completed',
        pickedBy: 'POS System',
        packedBy: 'POS System',
        pickStartTime: new Date(Date.now() - 60 * 60000),
        pickEndTime: new Date(Date.now() - 50 * 60000),
        packStartTime: new Date(Date.now() - 50 * 60000),
        packEndTime: new Date(Date.now() - 40 * 60000)
      }
    ];

    const createdOrders = await db.insert(orders).values(ordersData).returning();

    // Create order items for each order
    const orderItemsData = [
      // Items for ord-pick-001 (VIP order)
      {
        orderId: 'ord-pick-001',
        productId: 'prod-laptop-001',
        productName: 'ProBook Laptop 15"',
        sku: 'LAP-PRO-15',
        quantity: 1,
        price: '25000.00',
        unitPrice: '25000.00',
        appliedPrice: '25000.00',
        currency: 'CZK' as const,
        total: '25000.00',
        pickedQuantity: 0,
        packedQuantity: 0,
        warehouseLocation: 'A1-01-03',
        barcode: '8901234567890'
      },
      {
        orderId: 'ord-pick-001',
        productId: 'prod-phone-001',
        variantId: 'var-phone-black',
        productName: 'SmartPhone X12 - Black',
        sku: 'PHN-X12-BLK',
        quantity: 1,
        price: '15000.00',
        unitPrice: '15000.00',
        appliedPrice: '15000.00',
        currency: 'CZK' as const,
        total: '15000.00',
        pickedQuantity: 0,
        packedQuantity: 0,
        warehouseLocation: 'A1-02-05',
        barcode: '8901234567897'
      },
      {
        orderId: 'ord-pick-001',
        productId: 'prod-headphones-001',
        productName: 'Wireless Headphones Pro',
        sku: 'HP-PRO-WL',
        quantity: 2,
        price: '3500.00',
        unitPrice: '3500.00',
        appliedPrice: '3300.00', // Customer discount
        currency: 'CZK' as const,
        discount: '200.00',
        total: '6600.00',
        pickedQuantity: 0,
        packedQuantity: 0,
        warehouseLocation: 'A1-03-02',
        barcode: '8901234567892'
      },
      // Items for ord-pick-002 (Regular order)
      {
        orderId: 'ord-pick-002',
        productId: 'prod-headphones-001',
        productName: 'Wireless Headphones Pro',
        sku: 'HP-PRO-WL',
        quantity: 1,
        price: '140.00',
        unitPrice: '140.00',
        appliedPrice: '140.00',
        currency: 'EUR' as const,
        total: '140.00',
        pickedQuantity: 0,
        packedQuantity: 0,
        warehouseLocation: 'A1-03-02',
        barcode: '8901234567892'
      },
      {
        orderId: 'ord-pick-002',
        productId: 'prod-cushion-001',
        productName: 'Decorative Cushion',
        sku: 'CSH-DEC-01',
        quantity: 1,
        price: '12.00',
        unitPrice: '12.00',
        appliedPrice: '12.00',
        currency: 'EUR' as const,
        total: '12.00',
        pickedQuantity: 0,
        packedQuantity: 0,
        warehouseLocation: 'C3-02-08',
        barcode: '8901234567896'
      },
      // Items for ord-picking-001 (Currently picking)
      {
        orderId: 'ord-picking-001',
        productId: 'prod-tshirt-001',
        variantId: 'var-tshirt-m',
        productName: 'Cotton T-Shirt - Size M',
        sku: 'TSH-COT-M',
        quantity: 10,
        price: '500.00',
        unitPrice: '500.00',
        appliedPrice: '450.00', // Wholesale price
        currency: 'CZK' as const,
        total: '4500.00',
        pickedQuantity: 7, // Partially picked
        packedQuantity: 0,
        warehouseLocation: 'B2-01-10',
        barcode: '8901234567901'
      },
      {
        orderId: 'ord-picking-001',
        productId: 'prod-jeans-001',
        productName: 'Denim Jeans',
        sku: 'JNS-DEN-32',
        quantity: 2,
        price: '1500.00',
        unitPrice: '1500.00',
        appliedPrice: '1500.00',
        currency: 'CZK' as const,
        total: '3000.00',
        pickedQuantity: 2, // Fully picked
        packedQuantity: 0,
        warehouseLocation: 'B2-02-05',
        barcode: '8901234567894'
      },
      // Items for ord-packing-001 (Currently packing)
      {
        orderId: 'ord-packing-001',
        productId: 'prod-laptop-001',
        productName: 'ProBook Laptop 15"',
        sku: 'LAP-PRO-15',
        quantity: 1,
        price: '1000.00',
        unitPrice: '1000.00',
        appliedPrice: '1000.00',
        currency: 'EUR' as const,
        total: '1000.00',
        pickedQuantity: 1,
        packedQuantity: 1, // Already packed
        warehouseLocation: 'A1-01-03',
        barcode: '8901234567890'
      },
      {
        orderId: 'ord-packing-001',
        productId: 'prod-phone-001',
        variantId: 'var-phone-white',
        productName: 'SmartPhone X12 - White',
        sku: 'PHN-X12-WHT',
        quantity: 1,
        price: '600.00',
        unitPrice: '600.00',
        appliedPrice: '600.00',
        currency: 'EUR' as const,
        total: '600.00',
        pickedQuantity: 1,
        packedQuantity: 0, // Not yet packed
        warehouseLocation: 'A1-02-05',
        barcode: '8901234567898'
      },
      {
        orderId: 'ord-packing-001',
        productId: 'prod-lamp-001',
        productName: 'LED Desk Lamp',
        sku: 'LMP-LED-01',
        quantity: 2,
        price: '32.00',
        unitPrice: '32.00',
        appliedPrice: '30.00',
        currency: 'EUR' as const,
        discount: '2.00',
        total: '60.00',
        pickedQuantity: 2,
        packedQuantity: 0, // Not yet packed
        warehouseLocation: 'C3-01-01',
        barcode: '8901234567895'
      },
      // Items for bundle order
      {
        orderId: 'ord-bundle-001',
        productId: 'prod-laptop-001',
        productName: '[Bundle] ProBook Laptop 15"',
        sku: 'BDL-HOME-OFF-LAP',
        quantity: 1,
        price: '25000.00',
        unitPrice: '25000.00',
        appliedPrice: '22500.00', // Bundle discount
        currency: 'CZK' as const,
        total: '22500.00',
        pickedQuantity: 0,
        packedQuantity: 0,
        warehouseLocation: 'A1-01-03',
        barcode: '8901234567890'
      },
      {
        orderId: 'ord-bundle-001',
        productId: 'prod-headphones-001',
        productName: '[Bundle] Wireless Headphones Pro',
        sku: 'BDL-HOME-OFF-HP',
        quantity: 1,
        price: '3500.00',
        unitPrice: '3500.00',
        appliedPrice: '3150.00', // Bundle discount
        currency: 'CZK' as const,
        total: '3150.00',
        pickedQuantity: 0,
        packedQuantity: 0,
        warehouseLocation: 'A1-03-02',
        barcode: '8901234567892'
      },
      {
        orderId: 'ord-bundle-001',
        productId: 'prod-lamp-001',
        productName: '[Bundle] LED Desk Lamp',
        sku: 'BDL-HOME-OFF-LMP',
        quantity: 1,
        price: '800.00',
        unitPrice: '800.00',
        appliedPrice: '720.00', // Bundle discount
        currency: 'CZK' as const,
        total: '720.00',
        pickedQuantity: 0,
        packedQuantity: 0,
        warehouseLocation: 'C3-01-01',
        barcode: '8901234567895'
      },
      {
        orderId: 'ord-bundle-001',
        productId: 'prod-tshirt-001',
        variantId: 'var-tshirt-s',
        productName: '[Fashion Bundle] T-Shirt Size S',
        sku: 'BDL-SUM-TSH-S',
        quantity: 3,
        price: '500.00',
        unitPrice: '500.00',
        appliedPrice: '425.00', // Bundle discount
        currency: 'CZK' as const,
        total: '1275.00',
        pickedQuantity: 0,
        packedQuantity: 0,
        warehouseLocation: 'B2-01-10',
        barcode: '8901234567900'
      },
      {
        orderId: 'ord-bundle-001',
        productId: 'prod-jeans-001',
        productName: '[Fashion Bundle] Denim Jeans',
        sku: 'BDL-SUM-JNS',
        quantity: 1,
        price: '1500.00',
        unitPrice: '1500.00',
        appliedPrice: '1275.00', // Bundle discount
        currency: 'CZK' as const,
        total: '1275.00',
        pickedQuantity: 0,
        packedQuantity: 0,
        warehouseLocation: 'B2-02-05',
        barcode: '8901234567894'
      },
      // Items for ready to ship order
      {
        orderId: 'ord-ready-001',
        productId: 'prod-cushion-001',
        productName: 'Decorative Cushion',
        sku: 'CSH-DEC-01',
        quantity: 2,
        price: '300.00',
        unitPrice: '300.00',
        appliedPrice: '300.00',
        currency: 'CZK' as const,
        total: '600.00',
        pickedQuantity: 2,
        packedQuantity: 2,
        warehouseLocation: 'C3-02-08',
        barcode: '8901234567896'
      },
      {
        orderId: 'ord-ready-001',
        productId: 'prod-tshirt-001',
        variantId: 'var-tshirt-l',
        productName: 'Cotton T-Shirt - Size L',
        sku: 'TSH-COT-L',
        quantity: 1,
        price: '500.00',
        unitPrice: '500.00',
        appliedPrice: '500.00',
        currency: 'CZK' as const,
        total: '500.00',
        pickedQuantity: 1,
        packedQuantity: 1,
        warehouseLocation: 'B2-01-10',
        barcode: '8901234567902'
      }
    ];

    await db.insert(orderItems).values(orderItemsData);

    console.log("✅ Pick & Pack test data seeded successfully!");
    console.log(`
    Created:
    - 3 Categories
    - 2 Warehouses
    - 2 Suppliers
    - 7 Products with variants
    - 2 Product Bundles
    - 4 Customers
    - 6 Orders with various statuses:
      * 2 Ready to pick (to_fulfill, not_started)
      * 1 Currently picking (in_progress)
      * 1 Currently packing (pick completed, pack in_progress)
      * 1 Bundle order
      * 1 Ready to ship (fully picked and packed)
    `);

  } catch (error) {
    console.error("❌ Error seeding data:", error);
    throw error;
  }
}

// Run the seed function
if (import.meta.url === `file://${process.argv[1]}`) {
  seedPickPackData()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

export { seedPickPackData };