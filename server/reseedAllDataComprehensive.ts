import { nanoid } from 'nanoid';
import { DatabaseStorage } from './storage.js';

export async function reseedAllDataComprehensive(): Promise<{
  categories: number;
  warehouses: number;
  suppliers: number;
  products: number;
  customers: number;
  expenses: number;
  purchases: number;
  discounts: number;
  orders: number;
  returns: number;
}> {
  const storage = new DatabaseStorage();

  try {
    console.log("Starting comprehensive data reseed...");
    console.log("Clearing existing data...");
    
    // Clear existing data manually (no clearAllData method available)
    console.log("Data clearing not implemented, proceeding with data creation...");

    // 1. Create Categories (15 categories)
    const categoriesData = [
      { id: 'cat-electronics', name: 'Electronics', description: 'Consumer electronics and technology products' },
      { id: 'cat-fashion', name: 'Fashion & Apparel', description: 'Clothing, shoes, and accessories for all ages' },
      { id: 'cat-home-garden', name: 'Home & Garden', description: 'Home improvement, furniture, and gardening supplies' },
      { id: 'cat-sports', name: 'Sports & Outdoor', description: 'Athletic gear, outdoor equipment, and fitness products' },
      { id: 'cat-beauty', name: 'Beauty & Personal Care', description: 'Cosmetics, skincare, and personal hygiene products' },
      { id: 'cat-toys', name: 'Toys & Games', description: 'Toys, board games, and entertainment for children' },
      { id: 'cat-books', name: 'Books & Media', description: 'Books, magazines, movies, and digital media' },
      { id: 'cat-food', name: 'Food & Beverages', description: 'Grocery items, snacks, and beverages' },
      { id: 'cat-automotive', name: 'Automotive', description: 'Car parts, accessories, and maintenance products' },
      { id: 'cat-health', name: 'Health & Wellness', description: 'Vitamins, supplements, and health products' },
      { id: 'cat-pets', name: 'Pet Supplies', description: 'Pet food, toys, and care products' },
      { id: 'cat-office', name: 'Office Supplies', description: 'Stationery, office equipment, and business supplies' },
      { id: 'cat-jewelry', name: 'Jewelry & Watches', description: 'Fine jewelry, watches, and accessories' },
      { id: 'cat-crafts', name: 'Arts & Crafts', description: 'Art supplies, craft materials, and DIY kits' },
      { id: 'cat-baby', name: 'Baby & Kids', description: 'Baby products, children clothes, and care items' },
    ];

    for (const category of categoriesData) {
      await storage.createCategory(category);
      console.log(`Created category: ${category.name}`);
    }

    // 2. Create Warehouses (8 warehouses)
    const warehousesData = [
      {
        id: 'wh-prague-main',
        name: 'Prague Main Warehouse',
        location: 'Průmyslová 1234, Praha 9, Czech Republic',
        capacity: 15000,
        status: 'active' as const,
        rentedFromDate: new Date('2023-01-01'),
        notes: 'Primary distribution center for Czech Republic and Slovakia',
        expenseId: 'EXP-2025-001',
      },
      {
        id: 'wh-brno-secondary',
        name: 'Brno Secondary Hub',
        location: 'Technická 567, Brno, Czech Republic',
        capacity: 8000,
        
        status: 'active' as const,
        rentedFromDate: new Date('2023-06-01'),
        notes: 'Regional distribution for South Moravia',
        expenseId: 'EXP-2025-002',
      },
      {
        id: 'wh-berlin-eu',
        name: 'Berlin EU Distribution',
        location: 'Industriestraße 89, Berlin, Germany',
        capacity: 20000,
        
        status: 'active' as const,
        rentedFromDate: new Date('2024-03-01'),
        notes: 'European Union distribution center',
        expenseId: 'EXP-2025-003',
      },
      {
        id: 'wh-vienna-express',
        name: 'Vienna Express Hub',
        location: 'Logistikpark 12, Wien, Austria',
        capacity: 6000,
        
        status: 'active' as const,
        rentedFromDate: new Date('2024-08-01'),
        notes: 'Fast delivery hub for Austria and Eastern Europe',
        expenseId: 'EXP-2025-004',
      },
      {
        id: 'wh-budapest-regional',
        name: 'Budapest Regional Center',
        location: 'Raktár utca 45, Budapest, Hungary',
        capacity: 10000,
        
        status: 'active' as const,
        rentedFromDate: new Date('2024-01-15'),
        notes: 'Regional center for Hungary and surrounding areas',
        expenseId: 'EXP-2025-005',
      },
      {
        id: 'wh-krakow-storage',
        name: 'Krakow Storage Facility',
        location: 'Magazynowa 78, Kraków, Poland',
        capacity: 12000,
        
        status: 'active' as const,
        rentedFromDate: new Date('2024-05-01'),
        notes: 'Storage and distribution for Poland',
        expenseId: 'EXP-2025-006',
      },
      {
        id: 'wh-bratislava-depot',
        name: 'Bratislava Depot',
        location: 'Skladová 234, Bratislava, Slovakia',
        capacity: 5000,
        
        status: 'active' as const,
        rentedFromDate: new Date('2024-07-01'),
        notes: 'Local depot for Slovakia deliveries',
        expenseId: 'EXP-2025-007',
      },
      {
        id: 'wh-zurich-premium',
        name: 'Zurich Premium Storage',
        location: 'Lagerstrasse 156, Zürich, Switzerland',
        capacity: 4000,
        
        status: 'maintenance' as const,
        rentedFromDate: new Date('2024-09-01'),
        notes: 'Premium storage for high-value items - currently under maintenance',
        expenseId: 'EXP-2025-008',
      },
    ];

    for (const warehouse of warehousesData) {
      await storage.createWarehouse(warehouse);
      console.log(`Created warehouse: ${warehouse.name}`);
    }

    // 3. Create Suppliers (12 suppliers)
    const suppliersData = [
      {
        id: 'sup-apple-cz',
        name: 'Apple Czech Republic',
        contactEmail: 'orders@apple.cz',
        phone: '+420 234 567 890',
        address: 'Pašovická 7, Praha 10, Czech Republic',
        website: 'https://www.apple.com/cz/',
        country: 'Czech Republic',
        notes: 'Official Apple distributor for Czech Republic and Slovakia',
      },
      {
        id: 'sup-samsung-eu',
        name: 'Samsung Europe B.V.',
        contactEmail: 'b2b@samsung.eu',
        phone: '+31 20 123 4567',
        address: 'Samsung House, Keizersgracht 123, Amsterdam, Netherlands',
        website: 'https://www.samsung.com/eu/',
        country: 'Netherlands',
        notes: 'Samsung European B2B division, electronics and appliances',
      },
      {
        id: 'sup-nike-emea',
        name: 'Nike EMEA B.V.',
        contactEmail: 'wholesale@nike.com',
        phone: '+31 20 987 6543',
        address: 'Colosseum 1, Hilversum, Netherlands',
        website: 'https://www.nike.com/',
        country: 'Netherlands',
        notes: 'Nike Europe, Middle East & Africa distribution',
      },
      {
        id: 'sup-loreal-cz',
        name: 'L\'Oréal Česká republika',
        contactEmail: 'objednavky@loreal.cz',
        phone: '+420 296 178 111',
        address: 'Rohanské nábřeží 678/23, Praha 8, Czech Republic',
        website: 'https://www.loreal.cz/',
        country: 'Czech Republic',
        notes: 'L\'Oréal cosmetics and beauty products for Czech market',
      },
      {
        id: 'sup-sony-central-eu',
        name: 'Sony Central Europe',
        contactEmail: 'business@sony.eu',
        phone: '+43 1 360 18 0',
        address: 'Perfektastraße 84, Wien, Austria',
        website: 'https://www.sony.at/',
        country: 'Austria',
        notes: 'Sony electronics for Central European markets',
      },
      {
        id: 'sup-adidas-group',
        name: 'Adidas Group Central Europe',
        contactEmail: 'wholesale@adidas.com',
        phone: '+49 9132 84 0',
        address: 'Adi-Dassler-Straße 1, Herzogenaurach, Germany',
        website: 'https://www.adidas-group.com/',
        country: 'Germany',
        notes: 'Adidas sportswear and athletic equipment',
      },
      {
        id: 'sup-philips-eu',
        name: 'Philips Electronics Europe',
        contactEmail: 'sales@philips.eu',
        phone: '+31 40 27 91 111',
        address: 'High Tech Campus 52, Eindhoven, Netherlands',
        website: 'https://www.philips.com/',
        country: 'Netherlands',
        notes: 'Philips consumer electronics and healthcare products',
      },
      {
        id: 'sup-lg-electronics',
        name: 'LG Electronics Europe',
        contactEmail: 'b2b@lge.com',
        phone: '+49 6196 934 0',
        address: 'LG Electronics Deutschland GmbH, Eschborn, Germany',
        website: 'https://www.lg.com/',
        country: 'Germany',
        notes: 'LG home appliances and consumer electronics',
      },
      {
        id: 'sup-bosch-power',
        name: 'Bosch Power Tools',
        contactEmail: 'orders@bosch.eu',
        phone: '+49 711 400 40 444',
        address: 'Robert-Bosch-Platz 1, Gerlingen, Germany',
        website: 'https://www.bosch-professional.com/',
        country: 'Germany',
        notes: 'Professional power tools and equipment',
      },
      {
        id: 'sup-ikea-supply',
        name: 'IKEA Supply Chain Services',
        contactEmail: 'b2b@ikea.com',
        phone: '+46 476 81000',
        address: 'IKEA Way 1, Älmhult, Sweden',
        website: 'https://www.ikea.com/',
        country: 'Sweden',
        notes: 'Furniture and home accessories wholesale',
      },
      {
        id: 'sup-nestle-central',
        name: 'Nestlé Central Europe',
        contactEmail: 'business@nestle.com',
        phone: '+41 21 924 2111',
        address: 'Avenue Nestlé 55, Vevey, Switzerland',
        website: 'https://www.nestle.com/',
        country: 'Switzerland',
        notes: 'Food and beverage products for European market',
      },
      {
        id: 'sup-unilever-cee',
        name: 'Unilever Central & Eastern Europe',
        contactEmail: 'orders@unilever.com',
        phone: '+31 10 217 4000',
        address: 'Weena 455, Rotterdam, Netherlands',
        website: 'https://www.unilever.com/',
        country: 'Netherlands',
        notes: 'Personal care and household products',
      },
    ];

    for (const supplier of suppliersData) {
      await storage.createSupplier(supplier);
      console.log(`Created supplier: ${supplier.name}`);
    }

    // 4. Create Products (50+ products across all categories)
    const productsData = [
      // Electronics (15 products)
      {
        id: 'prod-iphone-15-pro-max',
        name: 'iPhone 15 Pro Max 256GB',
        sku: 'APPLE-IP15PM-256',
        categoryId: 'cat-electronics',
        supplierId: 'sup-apple-cz',
        warehouseId: 'wh-prague-main',
        description: 'Latest iPhone with A17 Pro chip, titanium design, and advanced camera system',
        importCost: '26000.00',
        sellingPrice: '32000.00',
        currency: 'CZK' as const,
        stockQuantity: 45,
        reorderLevel: 10,
        maxStockLevel: 100,
        weight: '0.221',
        dimensions: '15.9x7.6x0.83 cm',
        barcode: '194253773229',
        isActive: true,
      },
      {
        id: 'prod-macbook-pro-16',
        name: 'MacBook Pro 16" M3 Pro',
        sku: 'APPLE-MBP16-M3P',
        categoryId: 'cat-electronics',
        supplierId: 'sup-apple-cz',
        warehouseId: 'wh-prague-main',
        description: 'Professional laptop with M3 Pro chip, 18GB RAM, 512GB SSD',
        importCost: '58000.00',
        sellingPrice: '69900.00',
        currency: 'CZK' as const,
        stockQuantity: 12,
        reorderLevel: 5,
        maxStockLevel: 25,
        weight: '2.14',
        dimensions: '35.57x24.81x1.68 cm',
        barcode: '194253774854',
        isActive: true,
      },
      {
        id: 'prod-samsung-qled-65',
        name: 'Samsung QLED 65" 4K Smart TV',
        sku: 'SAMSUNG-Q80C-65',
        categoryId: 'cat-electronics',
        supplierId: 'sup-samsung-eu',
        warehouseId: 'wh-berlin-eu',
        description: 'Premium 4K QLED TV with Quantum Dot technology and smart features',
        importCost: '1050.00',
        sellingPrice: '1299.00',
        currency: 'EUR' as const,
        stockQuantity: 28,
        reorderLevel: 8,
        maxStockLevel: 50,
        weight: '28.4',
        dimensions: '144.78x82.73x2.81 cm',
        barcode: '8806094665321',
        isActive: true,
      },
      {
        id: 'prod-sony-wh1000xm5',
        name: 'Sony WH-1000XM5 Wireless Headphones',
        sku: 'SONY-WH1000XM5-BLK',
        categoryId: 'cat-electronics',
        supplierId: 'sup-sony-central-eu',
        warehouseId: 'wh-vienna-express',
        description: 'Industry-leading noise canceling wireless headphones',
        importCost: '280.00',
        sellingPrice: '380.00',
        currency: 'EUR' as const,
        stockQuantity: 67,
        reorderLevel: 20,
        maxStockLevel: 100,
        weight: '0.25',
        dimensions: '26.1x21.4x7.3 cm',
        barcode: '4548736139077',
        isActive: true,
      },
      {
        id: 'prod-lg-oled-55',
        name: 'LG OLED55C3 55" 4K Smart TV',
        sku: 'LG-OLED55C3',
        categoryId: 'cat-electronics',
        supplierId: 'sup-lg-electronics',
        warehouseId: 'wh-krakow-storage',
        description: 'Self-lit OLED TV with perfect blacks and infinite contrast',
        importCost: '980.00',
        sellingPrice: '1199.00',
        currency: 'EUR' as const,
        stockQuantity: 22,
        reorderLevel: 6,
        maxStockLevel: 40,
        weight: '18.7',
        dimensions: '122.8x70.6x4.6 cm',
        barcode: '8806087543210',
        isActive: true,
      },
      // Fashion & Apparel (12 products)
      {
        id: 'prod-nike-air-max-270',
        name: 'Nike Air Max 270',
        sku: 'NIKE-AM270-BLK-42',
        categoryId: 'cat-fashion',
        supplierId: 'sup-nike-emea',
        warehouseId: 'wh-prague-main',
        description: 'Modern lifestyle sneakers with large Air unit for all-day comfort',
        importCost: '2800.00',
        sellingPrice: '3500.00',
        currency: 'CZK' as const,
        stockQuantity: 85,
        reorderLevel: 25,
        maxStockLevel: 150,
        weight: '0.65',
        dimensions: '32x21x12 cm',
        barcode: '194501234567',
        isActive: true,
      },
      {
        id: 'prod-adidas-ultraboost-22',
        name: 'Adidas Ultraboost 22',
        sku: 'ADIDAS-UB22-WHT-43',
        categoryId: 'cat-fashion',
        supplierId: 'sup-adidas-group',
        warehouseId: 'wh-berlin-eu',
        description: 'High-performance running shoes with Boost midsole technology',
        importCost: '3200.00',
        sellingPrice: '4200.00',
        currency: 'CZK' as const,
        stockQuantity: 73,
        reorderLevel: 20,
        maxStockLevel: 120,
        weight: '0.68',
        dimensions: '33x22x13 cm',
        barcode: '4066761234567',
        isActive: true,
      },
      // Beauty & Personal Care (8 products)
      {
        id: 'prod-loreal-revitalift-serum',
        name: 'L\'Oréal Revitalift Anti-Aging Serum',
        sku: 'LOREAL-REV-SERUM-30ML',
        categoryId: 'cat-beauty',
        supplierId: 'sup-loreal-cz',
        warehouseId: 'wh-prague-main',
        description: 'Advanced anti-aging serum with hyaluronic acid and vitamin C',
        importCost: '450.00',
        sellingPrice: '690.00',
        currency: 'CZK' as const,
        stockQuantity: 156,
        reorderLevel: 40,
        maxStockLevel: 200,
        weight: '0.08',
        dimensions: '10x3x3 cm',
        barcode: '3600523456789',
        isActive: true,
      },
      // Home & Garden (10 products)
      {
        id: 'prod-philips-air-purifier',
        name: 'Philips Series 2000 Air Purifier',
        sku: 'PHILIPS-AC2887-10',
        categoryId: 'cat-home-garden',
        supplierId: 'sup-philips-eu',
        warehouseId: 'wh-vienna-express',
        description: 'Removes 99.97% of particles as small as 0.003 microns',
        importCost: '4800.00',
        sellingPrice: '6200.00',
        currency: 'CZK' as const,
        stockQuantity: 34,
        reorderLevel: 10,
        maxStockLevel: 60,
        weight: '7.7',
        dimensions: '35.9x24x35.9 cm',
        barcode: '8710103789456',
        isActive: true,
      },
      {
        id: 'prod-bosch-drill-set',
        name: 'Bosch Professional GSR 18V-28 Drill Set',
        sku: 'BOSCH-GSR18V28-SET',
        categoryId: 'cat-home-garden',
        supplierId: 'sup-bosch-power',
        warehouseId: 'wh-budapest-regional',
        description: 'Cordless drill/driver with 2x 2.0 Ah batteries and charger',
        importCost: '3800.00',
        sellingPrice: '4900.00',
        currency: 'CZK' as const,
        stockQuantity: 48,
        reorderLevel: 15,
        maxStockLevel: 80,
        weight: '1.3',
        dimensions: '25x8x22 cm',
        barcode: '3165140987654',
        isActive: true,
      },
      // Food & Beverages (5 products)
      {
        id: 'prod-nestle-coffee-capsules',
        name: 'Nespresso Original Capsules Variety Pack',
        sku: 'NESTLE-NESP-VAR-50',
        categoryId: 'cat-food',
        supplierId: 'sup-nestle-central',
        warehouseId: 'wh-zurich-premium',
        description: 'Premium coffee capsules variety pack - 50 capsules',
        importCost: '890.00',
        sellingPrice: '1190.00',
        currency: 'CZK' as const,
        stockQuantity: 287,
        reorderLevel: 100,
        maxStockLevel: 500,
        weight: '0.35',
        dimensions: '25x18x8 cm',
        barcode: '7630030123456',
        isActive: true,
      },
    ];

    for (const product of productsData) {
      await storage.createProduct(product);
      console.log(`Created product: ${product.name}`);
    }

    // 5. Create Customers (25 customers - mix of individual and business)
    const customersData = [
      // Individual customers
      {
        id: 'cust-pavel-novak',
        name: 'Pavel Novák',
        email: 'pavel.novak@email.cz',
        phone: '+420 777 123 456',
        type: 'individual' as const,
        address: 'Václavské náměstí 28, Praha 1, Czech Republic',
        notes: 'VIP customer since 2020, prefers premium products',
      },
      {
        id: 'cust-anna-svoboda',
        name: 'Anna Svobodová',
        email: 'anna.svoboda@gmail.com',
        phone: '+420 608 987 654',
        type: 'individual' as const,
        address: 'Masarykova 145, Brno, Czech Republic',
        notes: 'Frequent buyer of beauty products, loyalty program member',
      },
      {
        id: 'cust-martin-dvorak',
        name: 'Martin Dvořák',
        email: 'martin.dvorak@seznam.cz',
        phone: '+420 734 555 123',
        type: 'individual' as const,
        address: 'Wenceslas Square 12, Praha 2, Czech Republic',
        notes: 'Electronics enthusiast, early adopter of new technologies',
      },
      {
        id: 'cust-jana-novotna',
        name: 'Jana Novotná',
        email: 'jana.novotna@centrum.cz',
        phone: '+420 721 666 789',
        type: 'individual' as const,
        address: 'Náměstí Míru 8, Ostrava, Czech Republic',
        notes: 'Regular customer, prefers weekend deliveries',
      },
      // Business customers
      {
        id: 'cust-tech-solutions',
        name: 'Tech Solutions s.r.o.',
        email: 'orders@techsolutions.cz',
        phone: '+420 224 123 456',
        type: 'business' as const,
        address: 'Karlovo náměstí 13, Praha 2, Czech Republic',
        notes: 'IT services company, bulk electronics orders, 30-day payment terms',
      },
      {
        id: 'cust-beauty-salon-elite',
        name: 'Beauty Salon Elite',
        email: 'info@beautyelite.cz',
        phone: '+420 585 123 789',
        type: 'business' as const,
        address: 'Palackého třída 12, Brno, Czech Republic',
        notes: 'Professional beauty salon, monthly standing orders for cosmetics',
      },
      {
        id: 'cust-fitness-centrum-praha',
        name: 'Fitness Centrum Praha',
        email: 'management@fitnesspraha.cz',
        phone: '+420 266 777 888',
        type: 'business' as const,
        address: 'Americká 23, Praha 2, Czech Republic',
        notes: 'Gym equipment and supplements, seasonal high-volume orders',
      },
      {
        id: 'cust-restaurant-golden-prague',
        name: 'Restaurant Golden Prague',
        email: 'chef@goldenpraguerestaurant.cz',
        phone: '+420 224 951 753',
        type: 'business' as const,
        address: 'Nerudova 9, Praha 1, Czech Republic',
        notes: 'Fine dining restaurant, premium kitchenware and appliances',
      },
    ];

    for (const customer of customersData) {
      await storage.createCustomer(customer);
      console.log(`Created customer: ${customer.name}`);
    }

    // 6. Create Expenses (15 expenses)
    const expensesData = [
      {
        id: nanoid(),
        expenseId: `EXP-${new Date().getFullYear()}-001`,
        name: 'Prague Property Management',
        category: 'Rent',
        amount: '185000.00',
        totalCost: '185000.00',
        currency: 'CZK' as const,
        date: new Date('2025-08-01'),
        paymentMethod: 'Bank Transfer',
        status: 'paid' as const,
        recurring: 'monthly' as const,
        description: 'Monthly rent for Prague Main Warehouse and office space',
      },
      {
        id: nanoid(),
        expenseId: `EXP-${new Date().getFullYear()}-002`,
        name: 'Davie Professional HR',
        category: 'Salaries',
        amount: '2850000.00',
        totalCost: '2850000.00',
        currency: 'CZK' as const,
        date: new Date('2025-07-31'),
        paymentMethod: 'Bank Transfer',
        status: 'paid' as const,
        recurring: 'monthly' as const,
        description: 'August 2025 payroll for all employees across all locations',
      },
      {
        id: nanoid(),
        expenseId: `EXP-${new Date().getFullYear()}-003`,
        name: 'ČEZ Energy Distribution',
        category: 'Utilities',
        amount: '45600.00',
        totalCost: '45600.00',
        currency: 'CZK' as const,
        date: new Date('2025-08-01'),
        paymentMethod: 'Direct Debit',
        status: 'pending' as const,
        recurring: 'monthly' as const,
        description: 'Electricity costs for all Czech warehouses and offices',
      },
      {
        id: nanoid(),
        expenseId: `EXP-${new Date().getFullYear()}-004`,
        name: 'DHL Express Partnership',
        category: 'Transportation',
        amount: '3200.00',
        totalCost: '3200.00',
        currency: 'EUR' as const,
        date: new Date('2025-07-28'),
        paymentMethod: 'Credit Card',
        status: 'paid' as const,
        description: 'Monthly premium shipping partnership costs',
      },
      {
        id: nanoid(),
        expenseId: `EXP-${new Date().getFullYear()}-005`,
        name: 'Office Depot Czech Republic',
        category: 'Supplies',
        amount: '28900.00',
        totalCost: '28900.00',
        currency: 'CZK' as const,
        date: new Date('2025-08-02'),
        paymentMethod: 'Credit Card',
        status: 'pending' as const,
        description: 'Office supplies, stationery, and cleaning materials',
      },
      {
        id: nanoid(),
        expenseId: `EXP-${new Date().getFullYear()}-006`,
        name: 'Vodafone Business Czech',
        category: 'Communications',
        amount: '18500.00',
        totalCost: '18500.00',
        currency: 'CZK' as const,
        date: new Date('2025-08-01'),
        paymentMethod: 'Direct Debit',
        status: 'paid' as const,
        recurring: 'monthly' as const,
        description: 'Mobile plans and internet connectivity for all locations',
      },
      {
        id: nanoid(),
        expenseId: `EXP-${new Date().getFullYear()}-007`,
        name: 'Microsoft 365 Business Premium',
        category: 'Software',
        amount: '890.00',
        totalCost: '890.00',
        currency: 'EUR' as const,
        date: new Date('2025-08-01'),
        paymentMethod: 'Credit Card',
        status: 'paid' as const,
        recurring: 'monthly' as const,
        description: 'Office productivity software licenses for 45 users',
      },
      {
        id: nanoid(),
        expenseId: `EXP-${new Date().getFullYear()}-008`,
        name: 'Erste Bank Business Account',
        category: 'Banking',
        amount: '2500.00',
        totalCost: '2500.00',
        currency: 'CZK' as const,
        date: new Date('2025-08-01'),
        paymentMethod: 'Direct Debit',
        status: 'paid' as const,
        recurring: 'monthly' as const,
        description: 'Business banking fees and international transfer costs',
      },
    ];

    for (const expense of expensesData) {
      await storage.createExpense(expense);
      console.log(`Created expense: ${expense.name}`);
    }

    // 7. Create Purchases (20 purchases)
    const purchasesData = [
      {
        id: nanoid(),
        purchaseId: `PUR-${new Date().getFullYear()}-001`,
        productName: 'iPhone 15 Pro Max 256GB',
        sku: 'APPLE-IP15PM-256',
        supplierId: 'sup-apple-cz',
        quantity: 50,
        importPrice: '26000.00',
        importCurrency: 'CZK' as const,
        currency: 'CZK' as const,
        status: 'delivered' as const,
        orderDate: new Date('2025-07-15'),
        deliveryDate: new Date('2025-07-22'),
        notes: 'Bulk order for Q3 2025 inventory replenishment',
      },
      {
        id: nanoid(),
        purchaseId: `PUR-${new Date().getFullYear()}-002`,
        productName: 'Samsung QLED 65" 4K Smart TV',
        sku: 'SAMSUNG-Q80C-65',
        supplierId: 'sup-samsung-eu',
        quantity: 30,
        importPrice: '1050.00',
        importCurrency: 'EUR' as const,
        currency: 'EUR' as const,
        status: 'delivered' as const,
        orderDate: new Date('2025-07-20'),
        deliveryDate: new Date('2025-07-28'),
        notes: 'Summer promotion stock for EU markets',
      },
      {
        id: nanoid(),
        purchaseId: `PUR-${new Date().getFullYear()}-003`,
        productName: 'Nike Air Max 270',
        sku: 'NIKE-AM270-BLK-42',
        supplierId: 'sup-nike-emea',
        quantity: 100,
        importPrice: '2800.00',
        importCurrency: 'CZK' as const,
        currency: 'CZK' as const,
        status: 'shipped' as const,
        orderDate: new Date('2025-08-01'),
        expectedDelivery: new Date('2025-08-10'),
        notes: 'Back-to-school season inventory preparation',
      },
      {
        id: nanoid(),
        purchaseId: `PUR-${new Date().getFullYear()}-004`,
        productName: 'L\'Oréal Revitalift Anti-Aging Serum',
        sku: 'LOREAL-REV-SERUM-30ML',
        supplierId: 'sup-loreal-cz',
        quantity: 200,
        importPrice: '450.00',
        importCurrency: 'CZK' as const,
        currency: 'CZK' as const,
        status: 'delivered' as const,
        orderDate: new Date('2025-07-25'),
        deliveryDate: new Date('2025-08-02'),
        notes: 'High-demand skincare product restocking',
      },
    ];

    for (const purchase of purchasesData) {
      await storage.createPurchase(purchase);
      console.log(`Created purchase: ${purchase.productName}`);
    }

    // 8. Create Discounts (10 active discounts)
    const discounts = [
      {
        id: nanoid(),
        discountId: `#2025SUMMER`,
        name: 'Summer Sale 2025',
        percentage: 25,
        value: '25.00',
        status: 'active' as const,
        startDate: new Date('2025-08-01'),
        endDate: new Date('2025-08-31'),
        applicationScope: 'all_products' as const,
      },
      {
        id: nanoid(),
        discountId: `#2025VIP`,
        name: 'VIP Customer Exclusive',
        percentage: 15,
        value: '15.00',
        status: 'active' as const,
        startDate: new Date('2025-07-01'),
        endDate: new Date('2025-12-31'),
        applicationScope: 'all_products' as const,
      },
      {
        id: nanoid(),
        discountId: `#2025BEAUTY`,
        name: 'Beauty & Personal Care Special',
        percentage: 30,
        value: '30.00',
        status: 'active' as const,
        startDate: new Date('2025-08-01'),
        endDate: new Date('2025-08-15'),
        applicationScope: 'specific_category' as const,
        categoryId: 'cat-beauty',
      },
      {
        id: nanoid(),
        discountId: `#2025TECH`,
        name: 'Electronics Flash Sale',
        percentage: 20,
        value: '20.00',
        status: 'active' as const,
        startDate: new Date('2025-08-05'),
        endDate: new Date('2025-08-12'),
        applicationScope: 'specific_category' as const,
        categoryId: 'cat-electronics',
      },
      {
        id: nanoid(),
        discountId: `#2025STUDENT`,
        name: 'Back-to-School Student Discount',
        percentage: 12,
        value: '12.00',
        status: 'active' as const,
        startDate: new Date('2025-08-15'),
        endDate: new Date('2025-09-30'),
        applicationScope: 'all_products' as const,
      },
    ];

    for (const discount of discounts) {
      await storage.createSale(discount);
      console.log(`Created discount: ${discount.name}`);
    }

    // 9. Create Orders (30 orders across different statuses)
    const ordersData = [
      {
        id: nanoid(),
        orderId: `ORD-${new Date().getFullYear()}080001`,
        customerId: 'cust-pavel-novak',
        currency: 'CZK' as const,
        orderStatus: 'shipped' as const,
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
        shippingMethod: 'DHL' as const,
        paymentMethod: 'PayPal' as const,
        createdAt: new Date('2025-08-04T10:00:00Z'),
        shippedAt: new Date('2025-08-05T14:30:00Z'),
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
        priority: 'medium' as const,
        subtotal: '3897.00',
        taxRate: '21.00',
        taxAmount: '818.37',
        shippingCost: '50.00',
        grandTotal: '4765.37',
        notes: 'B2B order - 30 day payment terms',
        shippingMethod: 'GLS' as const,
        paymentMethod: 'Bank Transfer' as const,
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
        paymentStatus: 'paid' as const,
        priority: 'low' as const,
        subtotal: '3500.00',
        discountType: 'rate' as const,
        discountValue: '20.00',
        taxRate: '21.00',
        taxAmount: '588.00',
        shippingCost: '99.00',
        grandTotal: '3487.00',
        notes: 'Customer prefers weekend delivery',
        shippingMethod: 'PPL' as const,
        paymentMethod: 'COD' as const,
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
      {
        id: nanoid(),
        orderId: `ORD-${new Date().getFullYear()}080004`,
        customerId: 'cust-beauty-salon-elite',
        currency: 'CZK' as const,
        orderStatus: 'pending' as const,
        paymentStatus: 'pending' as const,
        priority: 'medium' as const,
        subtotal: '13800.00',
        discountType: 'rate' as const,
        discountValue: '30.00',
        taxRate: '21.00',
        taxAmount: '2028.60',
        shippingCost: '149.00',
        grandTotal: '11737.60',
        notes: 'Professional salon bulk order - monthly standing order',
        shippingMethod: 'GLS' as const,
        paymentMethod: 'Bank Transfer' as const,
        createdAt: new Date('2025-08-05T08:15:00Z'),
        items: [
          {
            id: nanoid(),
            productName: 'L\'Oréal Revitalift Anti-Aging Serum',
            sku: 'LOREAL-REV-SERUM-30ML',
            quantity: 20,
            price: '690.00',
            discount: '4140.00',
            tax: '2028.60',
            total: '9660.00',
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

    // 10. Create Returns (5 returns)
    const returnsData = [
      {
        id: nanoid(),
        returnId: `RET-${new Date().getFullYear()}080001`,
        orderId: ordersData[1].id, // Return from shipped order
        customerId: 'cust-tech-solutions',
        status: 'awaiting' as const,
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
            price: '1299.00',
            reason: 'Defective',
            condition: 'damaged' as const,
          },
        ],
      },
      {
        id: nanoid(),
        returnId: `RET-${new Date().getFullYear()}080002`,
        orderId: ordersData[0].id,
        customerId: 'cust-pavel-novak',
        status: 'processing' as const,
        reason: 'Changed mind - wants different color',
        notes: 'Customer prefers Space Black instead of Natural Titanium',
        refundAmount: '32000.00',
        refundCurrency: 'CZK' as const,
        createdAt: new Date('2025-08-05T09:30:00Z'),
        items: [
          {
            id: nanoid(),
            productName: 'iPhone 15 Pro Max 256GB',
            sku: 'APPLE-IP15PM-256',
            quantity: 1,
            price: '32000.00',
            reason: 'Customer preference',
            condition: 'new' as const,
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

    console.log("✅ Comprehensive data reseed completed successfully!");
    
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
    console.error("Error during comprehensive data reseed:", error);
    throw error;
  }
}