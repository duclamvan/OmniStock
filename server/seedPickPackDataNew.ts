import { nanoid } from 'nanoid';
import type { InsertProduct, InsertProductVariant, InsertProductBundle, InsertBundleItem, InsertOrder, InsertOrderItem, InsertCustomer, InsertWarehouse, InsertWarehouseLocation, InsertInventoryBalance } from '@shared/schema';
import { db } from './db';
import { 
  products, 
  productVariants, 
  productBundles, 
  bundleItems, 
  orders, 
  orderItems, 
  customers, 
  warehouses, 
  warehouseLocations,
  inventoryBalances,
  categories
} from '@shared/schema';
import { eq } from 'drizzle-orm';

export async function seedPickPackDataNew() {
  console.log('Starting comprehensive Pick & Pack data seeding with bundle orders...');
  
  try {
    // Clean existing data
    await db.delete(orderItems);
    await db.delete(orders);
    await db.delete(inventoryBalances);
    await db.delete(warehouseLocations);
    await db.delete(bundleItems);
    await db.delete(productBundles);
    await db.delete(productVariants);
    await db.delete(products);
    await db.delete(customers);
    await db.delete(warehouses);
    await db.delete(categories);
    
    // Create categories
    const categoryData = [
      { id: 'cat-electronics', name: 'Electronics', description: 'Electronic devices and accessories' },
      { id: 'cat-clothing', name: 'Clothing', description: 'Apparel and fashion items' },
      { id: 'cat-cosmetics', name: 'Cosmetics', description: 'Beauty and personal care products' },
      { id: 'cat-toys', name: 'Toys', description: 'Toys and games for all ages' },
      { id: 'cat-books', name: 'Books', description: 'Books and publications' },
    ];
    
    for (const cat of categoryData) {
      await db.insert(categories).values(cat);
    }
    
    // Create warehouses with full details
    const warehouseData = [
      {
        id: 'wh-main',
        code: 'WH-MAIN',
        name: 'Main Warehouse Prague',
        location: 'Prague Central',
        address: 'Wenceslas Square 15',
        city: 'Prague',
        country: 'Czech Republic',
        zipCode: '11000',
        phone: '+420 234 567 890',
        email: 'main@daviesupply.cz',
        manager: 'Jan Novak',
        capacity: 10000,
        floorArea: '2500',
        type: 'main',
        status: 'active',
        contact: 'Jan Novak',
        notes: 'Primary distribution center'
      },
      {
        id: 'wh-secondary',
        code: 'WH-BRNO',
        name: 'Brno Distribution Center',
        location: 'Brno South',
        address: 'Masaryk Street 45',
        city: 'Brno',
        country: 'Czech Republic',
        zipCode: '60200',
        phone: '+420 543 210 987',
        email: 'brno@daviesupply.cz',
        manager: 'Marie Svobodova',
        capacity: 5000,
        floorArea: '1200',
        type: 'branch',
        status: 'active',
        contact: 'Marie Svobodova',
        notes: 'Secondary distribution hub'
      }
    ];
    
    for (const warehouse of warehouseData) {
      await db.insert(warehouses).values(warehouse as any);
    }
    
    // Create warehouse locations (zones, aisles, racks, shelves, bins)
    const locationData = [
      // Main warehouse locations
      { id: 'loc-a1-r1-s1', warehouseId: 'wh-main', type: 'SHELF', code: 'A1-R1-S1', address: 'Zone A, Aisle 1, Rack 1, Shelf 1', pickable: true, putawayAllowed: true, temperature: 'ambient', hazmat: false, heightCm: 50, widthCm: 120, depthCm: 60, maxWeight: 100, currentOccupancy: 75 },
      { id: 'loc-a1-r1-s2', warehouseId: 'wh-main', type: 'SHELF', code: 'A1-R1-S2', address: 'Zone A, Aisle 1, Rack 1, Shelf 2', pickable: true, putawayAllowed: true, temperature: 'ambient', hazmat: false, heightCm: 50, widthCm: 120, depthCm: 60, maxWeight: 100, currentOccupancy: 60 },
      { id: 'loc-a2-r1-s1', warehouseId: 'wh-main', type: 'SHELF', code: 'A2-R1-S1', address: 'Zone A, Aisle 2, Rack 1, Shelf 1', pickable: true, putawayAllowed: true, temperature: 'ambient', hazmat: false, heightCm: 50, widthCm: 120, depthCm: 60, maxWeight: 100, currentOccupancy: 40 },
      { id: 'loc-b1-r1-s1', warehouseId: 'wh-main', type: 'SHELF', code: 'B1-R1-S1', address: 'Zone B, Aisle 1, Rack 1, Shelf 1', pickable: true, putawayAllowed: true, temperature: 'cool', hazmat: false, heightCm: 60, widthCm: 120, depthCm: 80, maxWeight: 150, currentOccupancy: 85 },
      { id: 'loc-b2-r2-s3', warehouseId: 'wh-main', type: 'SHELF', code: 'B2-R2-S3', address: 'Zone B, Aisle 2, Rack 2, Shelf 3', pickable: true, putawayAllowed: true, temperature: 'cool', hazmat: false, heightCm: 60, widthCm: 120, depthCm: 80, maxWeight: 150, currentOccupancy: 20 },
      { id: 'loc-c1-r1-s1', warehouseId: 'wh-main', type: 'SHELF', code: 'C1-R1-S1', address: 'Zone C, Aisle 1, Rack 1, Shelf 1', pickable: true, putawayAllowed: true, temperature: 'warm', hazmat: false, heightCm: 45, widthCm: 100, depthCm: 50, maxWeight: 80, currentOccupancy: 90 },
      // Secondary warehouse locations
      { id: 'loc-d1-r1-s1', warehouseId: 'wh-secondary', type: 'SHELF', code: 'D1-R1-S1', address: 'Zone D, Aisle 1, Rack 1, Shelf 1', pickable: true, putawayAllowed: true, temperature: 'ambient', hazmat: false, heightCm: 50, widthCm: 120, depthCm: 60, maxWeight: 100, currentOccupancy: 55 },
      { id: 'loc-d2-r1-s2', warehouseId: 'wh-secondary', type: 'SHELF', code: 'D2-R1-S2', address: 'Zone D, Aisle 2, Rack 1, Shelf 2', pickable: true, putawayAllowed: true, temperature: 'ambient', hazmat: false, heightCm: 50, widthCm: 120, depthCm: 60, maxWeight: 100, currentOccupancy: 70 },
    ];
    
    for (const location of locationData) {
      await db.insert(warehouseLocations).values(location);
    }
    
    // Create products with all fields including dimensions and fragility
    const productData = [
      {
        id: 'prod-laptop',
        name: 'Dell XPS 15 Laptop',
        vietnameseName: 'Dell XPS 15 Laptop',
        sku: 'DELL-XPS-15-2024',
        categoryId: 'cat-electronics',
        warehouseId: 'wh-main',
        warehouseLocation: 'A1-R1-S1',
        description: 'High-performance laptop with 15.6" display, Intel i7, 16GB RAM, 512GB SSD',
        quantity: 25,
        lowStockAlert: 5,
        priceCzk: '45000',
        priceEur: '1800',
        importCostUsd: '1200',
        importCostCzk: '28000',
        importCostEur: '1100',
        barcode: '8594123456789',
        length: '35.9',
        width: '23.0',
        height: '1.7',
        weight: '1.860',
        isActive: true
      },
      {
        id: 'prod-headphones',
        name: 'Sony WH-1000XM5 Headphones',
        vietnameseName: 'Sony WH-1000XM5 Headphones',
        sku: 'SONY-WH1000XM5',
        categoryId: 'cat-electronics',
        warehouseId: 'wh-main',
        warehouseLocation: 'A1-R1-S2',
        description: 'Premium noise-cancelling wireless headphones',
        quantity: 50,
        lowStockAlert: 10,
        priceCzk: '8500',
        priceEur: '340',
        importCostUsd: '200',
        importCostCzk: '4600',
        importCostEur: '185',
        barcode: '4548736134379',
        length: '25.0',
        width: '20.0',
        height: '8.0',
        weight: '0.250',
        isActive: true
      },
      {
        id: 'prod-tshirt',
        name: 'Premium Cotton T-Shirt',
        vietnameseName: 'Premium Cotton T-Shirt',
        sku: 'TSHIRT-COTTON-001',
        categoryId: 'cat-clothing',
        warehouseId: 'wh-main',
        warehouseLocation: 'B1-R1-S1',
        description: '100% organic cotton t-shirt, comfortable fit',
        quantity: 200,
        lowStockAlert: 30,
        priceCzk: '650',
        priceEur: '26',
        importCostUsd: '8',
        importCostCzk: '185',
        importCostEur: '7.5',
        barcode: '5901234567894',
        length: '30.0',
        width: '25.0',
        height: '2.0',
        weight: '0.150',
        isActive: true
      },
      {
        id: 'prod-lipstick',
        name: 'Luxury Matte Lipstick',
        vietnameseName: 'Luxury Matte Lipstick',
        sku: 'LIPS-MAT-001',
        categoryId: 'cat-cosmetics',
        warehouseId: 'wh-main',
        warehouseLocation: 'B2-R2-S3',
        description: 'Long-lasting matte lipstick with vitamin E',
        quantity: 150,
        lowStockAlert: 20,
        priceCzk: '450',
        priceEur: '18',
        importCostUsd: '5',
        importCostCzk: '115',
        importCostEur: '4.6',
        barcode: '3145891234567',
        length: '8.5',
        width: '2.5',
        height: '2.5',
        weight: '0.025',
        isActive: true
      },
      {
        id: 'prod-lego',
        name: 'LEGO City Police Station',
        vietnameseName: 'LEGO City Police Station',
        sku: 'LEGO-CITY-60316',
        categoryId: 'cat-toys',
        warehouseId: 'wh-main',
        warehouseLocation: 'C1-R1-S1',
        description: 'LEGO City Police Station building set, 668 pieces',
        quantity: 35,
        lowStockAlert: 8,
        priceCzk: '2200',
        priceEur: '88',
        importCostUsd: '45',
        importCostCzk: '1035',
        importCostEur: '41.5',
        barcode: '5702017161761',
        length: '48.0',
        width: '28.2',
        height: '7.4',
        weight: '1.200',
        isActive: true
      },
      {
        id: 'prod-book',
        name: 'The Great Gatsby - Hardcover',
        vietnameseName: 'The Great Gatsby - Hardcover',
        sku: 'BOOK-GATSBY-HC',
        categoryId: 'cat-books',
        warehouseId: 'wh-secondary',
        warehouseLocation: 'D1-R1-S1',
        description: 'Classic American novel by F. Scott Fitzgerald',
        quantity: 80,
        lowStockAlert: 15,
        priceCzk: '350',
        priceEur: '14',
        importCostUsd: '4',
        importCostCzk: '92',
        importCostEur: '3.7',
        barcode: '9780743273565',
        length: '21.0',
        width: '14.0',
        height: '2.5',
        weight: '0.300',
        isActive: true
      },
      {
        id: 'prod-fragile-vase',
        name: 'Crystal Glass Vase',
        vietnameseName: 'Crystal Glass Vase',
        sku: 'VASE-CRYSTAL-001',
        categoryId: 'cat-electronics',
        warehouseId: 'wh-main',
        warehouseLocation: 'A2-R1-S1',
        description: 'Elegant hand-blown crystal glass vase, 30cm height',
        quantity: 20,
        lowStockAlert: 5,
        priceCzk: '3500',
        priceEur: '140',
        importCostUsd: '60',
        importCostCzk: '1380',
        importCostEur: '55',
        barcode: '7501234567891',
        length: '15.0',
        width: '15.0',
        height: '30.0',
        weight: '1.500',
        isActive: true
      }
    ];
    
    for (const product of productData) {
      await db.insert(products).values(product);
    }
    
    // Create product variants with all fields
    const variantData = [
      // T-shirt variants (sizes)
      { id: 'var-tshirt-s', productId: 'prod-tshirt', name: 'Size S - White', barcode: '5901234567895', quantity: 50, importCostUsd: '8', importCostCzk: '185', importCostEur: '7.5' },
      { id: 'var-tshirt-m', productId: 'prod-tshirt', name: 'Size M - White', barcode: '5901234567896', quantity: 60, importCostUsd: '8', importCostCzk: '185', importCostEur: '7.5' },
      { id: 'var-tshirt-l', productId: 'prod-tshirt', name: 'Size L - White', barcode: '5901234567897', quantity: 45, importCostUsd: '8', importCostCzk: '185', importCostEur: '7.5' },
      { id: 'var-tshirt-xl', productId: 'prod-tshirt', name: 'Size XL - White', barcode: '5901234567898', quantity: 45, importCostUsd: '8', importCostCzk: '185', importCostEur: '7.5' },
      // Lipstick variants (colors)
      { id: 'var-lips-red', productId: 'prod-lipstick', name: 'Classic Red #001', barcode: '3145891234568', quantity: 40, importCostUsd: '5', importCostCzk: '115', importCostEur: '4.6' },
      { id: 'var-lips-pink', productId: 'prod-lipstick', name: 'Rose Pink #002', barcode: '3145891234569', quantity: 35, importCostUsd: '5', importCostCzk: '115', importCostEur: '4.6' },
      { id: 'var-lips-nude', productId: 'prod-lipstick', name: 'Natural Nude #003', barcode: '3145891234570', quantity: 40, importCostUsd: '5', importCostCzk: '115', importCostEur: '4.6' },
      { id: 'var-lips-berry', productId: 'prod-lipstick', name: 'Berry Blast #004', barcode: '3145891234571', quantity: 35, importCostUsd: '5', importCostCzk: '115', importCostEur: '4.6' },
    ];
    
    for (const variant of variantData) {
      await db.insert(productVariants).values(variant);
    }
    
    // Create product bundles with comprehensive details
    const bundleData = [
      {
        id: 'bundle-tech-starter',
        bundleId: 'BDL-TECH-001',
        name: 'Tech Professional Starter Kit',
        description: 'Complete tech setup for professionals - laptop, headphones, and accessories',
        sku: 'BUNDLE-TECH-START',
        isActive: true,
        priceCzk: '52000',
        priceEur: '2080',
        discountPercentage: '5',
        imageUrl: null,
        notes: 'Best seller bundle for remote workers'
      },
      {
        id: 'bundle-beauty-set',
        bundleId: 'BDL-BEAUTY-001',
        name: 'Complete Beauty Collection',
        description: 'Full makeup set with 4 premium lipstick shades',
        sku: 'BUNDLE-BEAUTY-COMP',
        isActive: true,
        priceCzk: '1600',
        priceEur: '64',
        discountPercentage: '10',
        imageUrl: null,
        notes: 'Popular gift set'
      },
      {
        id: 'bundle-kids-play',
        bundleId: 'BDL-KIDS-001',
        name: 'Kids Entertainment Bundle',
        description: 'LEGO set with story book for creative play',
        sku: 'BUNDLE-KIDS-PLAY',
        isActive: true,
        priceCzk: '2450',
        priceEur: '98',
        discountPercentage: '3',
        imageUrl: null,
        notes: 'Perfect for ages 8-12'
      }
    ];
    
    for (const bundle of bundleData) {
      await db.insert(productBundles).values(bundle);
    }
    
    // Create bundle items
    const bundleItemData = [
      // Tech bundle items
      { id: nanoid(), bundleId: 'bundle-tech-starter', productId: 'prod-laptop', variantId: null, quantity: 1, notes: 'Main component' },
      { id: nanoid(), bundleId: 'bundle-tech-starter', productId: 'prod-headphones', variantId: null, quantity: 1, notes: 'Audio accessory' },
      // Beauty bundle items (all lipstick variants)
      { id: nanoid(), bundleId: 'bundle-beauty-set', productId: 'prod-lipstick', variantId: 'var-lips-red', quantity: 1, notes: 'Classic Red shade' },
      { id: nanoid(), bundleId: 'bundle-beauty-set', productId: 'prod-lipstick', variantId: 'var-lips-pink', quantity: 1, notes: 'Rose Pink shade' },
      { id: nanoid(), bundleId: 'bundle-beauty-set', productId: 'prod-lipstick', variantId: 'var-lips-nude', quantity: 1, notes: 'Natural Nude shade' },
      { id: nanoid(), bundleId: 'bundle-beauty-set', productId: 'prod-lipstick', variantId: 'var-lips-berry', quantity: 1, notes: 'Berry Blast shade' },
      // Kids bundle items
      { id: nanoid(), bundleId: 'bundle-kids-play', productId: 'prod-lego', variantId: null, quantity: 1, notes: 'Building set' },
      { id: nanoid(), bundleId: 'bundle-kids-play', productId: 'prod-book', variantId: null, quantity: 1, notes: 'Reading material' },
    ];
    
    for (const item of bundleItemData) {
      await db.insert(bundleItems).values(item);
    }
    
    // Create inventory balances
    const inventoryData = [
      { id: nanoid(), locationId: 'loc-a1-r1-s1', productId: 'prod-laptop', variantId: null, quantity: 25, lotNumber: 'LOT-2024-001', expiryDate: null },
      { id: nanoid(), locationId: 'loc-a1-r1-s2', productId: 'prod-headphones', variantId: null, quantity: 50, lotNumber: 'LOT-2024-002', expiryDate: null },
      { id: nanoid(), locationId: 'loc-b1-r1-s1', productId: 'prod-tshirt', variantId: 'var-tshirt-s', quantity: 50, lotNumber: 'LOT-2024-003', expiryDate: null },
      { id: nanoid(), locationId: 'loc-b1-r1-s1', productId: 'prod-tshirt', variantId: 'var-tshirt-m', quantity: 60, lotNumber: 'LOT-2024-004', expiryDate: null },
      { id: nanoid(), locationId: 'loc-b1-r1-s1', productId: 'prod-tshirt', variantId: 'var-tshirt-l', quantity: 45, lotNumber: 'LOT-2024-005', expiryDate: null },
      { id: nanoid(), locationId: 'loc-b1-r1-s1', productId: 'prod-tshirt', variantId: 'var-tshirt-xl', quantity: 45, lotNumber: 'LOT-2024-006', expiryDate: null },
      { id: nanoid(), locationId: 'loc-b2-r2-s3', productId: 'prod-lipstick', variantId: 'var-lips-red', quantity: 40, lotNumber: 'LOT-2024-007', expiryDate: new Date('2026-12-31') },
      { id: nanoid(), locationId: 'loc-b2-r2-s3', productId: 'prod-lipstick', variantId: 'var-lips-pink', quantity: 35, lotNumber: 'LOT-2024-008', expiryDate: new Date('2026-12-31') },
      { id: nanoid(), locationId: 'loc-b2-r2-s3', productId: 'prod-lipstick', variantId: 'var-lips-nude', quantity: 40, lotNumber: 'LOT-2024-009', expiryDate: new Date('2026-12-31') },
      { id: nanoid(), locationId: 'loc-b2-r2-s3', productId: 'prod-lipstick', variantId: 'var-lips-berry', quantity: 35, lotNumber: 'LOT-2024-010', expiryDate: new Date('2026-12-31') },
      { id: nanoid(), locationId: 'loc-c1-r1-s1', productId: 'prod-lego', variantId: null, quantity: 35, lotNumber: 'LOT-2024-011', expiryDate: null },
      { id: nanoid(), locationId: 'loc-d1-r1-s1', productId: 'prod-book', variantId: null, quantity: 80, lotNumber: 'LOT-2024-012', expiryDate: null },
      { id: nanoid(), locationId: 'loc-a2-r1-s1', productId: 'prod-fragile-vase', variantId: null, quantity: 20, lotNumber: 'LOT-2024-013', expiryDate: null },
    ];
    
    for (const inventory of inventoryData) {
      await db.insert(inventoryBalances).values(inventory);
    }
    
    // Create customers
    const customerData = [
      {
        id: 'cust-1',
        name: 'John Smith',
        email: 'john.smith@email.com',
        phone: '+420 777 123 456',
        address: 'Narodni 15',
        city: 'Prague',
        state: 'Prague',
        zipCode: '11000',
        country: 'Czech Republic',
        type: 'regular',
        notes: 'Prefers morning deliveries'
      },
      {
        id: 'cust-2',
        name: 'Anna Dvorakova',
        email: 'anna.dvorak@email.cz',
        phone: '+420 608 234 567',
        address: 'Husova 25',
        city: 'Brno',
        state: 'South Moravian',
        zipCode: '60200',
        country: 'Czech Republic',
        type: 'vip',
        notes: 'VIP customer, priority shipping'
      },
      {
        id: 'cust-3',
        name: 'Tech Solutions s.r.o.',
        email: 'orders@techsolutions.cz',
        phone: '+420 222 333 444',
        address: 'Sokolovska 100',
        city: 'Prague',
        state: 'Prague',
        zipCode: '18600',
        country: 'Czech Republic',
        type: 'wholesale',
        notes: 'Corporate account, NET30 payment terms'
      }
    ];
    
    for (const customer of customerData) {
      await db.insert(customers).values(customer);
    }
    
    // Generate order ID
    const getCurrentDateString = () => {
      const now = new Date();
      return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    };
    
    let orderCounter = 10;
    
    // Create orders with various statuses for Pick & Pack
    const orderData = [
      // Order 1 - Tech bundle order ready for picking
      {
        id: 'ord-pick-1',
        orderId: `ORD-${getCurrentDateString()}-${String(orderCounter++).padStart(3, '0')}`,
        customerId: 'cust-1',
        currency: 'CZK',
        orderStatus: 'to_fulfill',
        paymentStatus: 'paid',
        priority: 'high',
        subtotal: '53300',
        taxRate: '21',
        taxAmount: '11193',
        shippingMethod: 'DHL',
        paymentMethod: 'Bank Transfer',
        shippingCost: '150',
        grandTotal: '64643',
        notes: 'URGENT: Tech bundle order - handle with care',
        pickStatus: 'not_started',
        packStatus: 'not_started',
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000)
      },
      // Order 2 - Beauty bundle order
      {
        id: 'ord-pick-2',
        orderId: `ORD-${getCurrentDateString()}-${String(orderCounter++).padStart(3, '0')}`,
        customerId: 'cust-2',
        currency: 'CZK',
        orderStatus: 'to_fulfill',
        paymentStatus: 'paid',
        priority: 'medium',
        subtotal: '10100',
        taxRate: '21',
        taxAmount: '2121',
        shippingMethod: 'PPL',
        paymentMethod: 'PayPal',
        shippingCost: '99',
        grandTotal: '12320',
        notes: 'Beauty bundle gift order',
        pickStatus: 'not_started',
        packStatus: 'not_started',
        createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000)
      },
      // Order 3 - Kids bundle in picking
      {
        id: 'ord-picking-1',
        orderId: `ORD-${getCurrentDateString()}-${String(orderCounter++).padStart(3, '0')}`,
        customerId: 'cust-3',
        currency: 'CZK',
        orderStatus: 'to_fulfill',
        paymentStatus: 'paid',
        priority: 'high',
        subtotal: '5950',
        taxRate: '21',
        taxAmount: '1249.50',
        shippingMethod: 'GLS',
        paymentMethod: 'Bank Transfer',
        shippingCost: '120',
        grandTotal: '7319.50',
        notes: 'Corporate order - Kids bundle',
        pickStatus: 'in_progress',
        packStatus: 'not_started',
        pickedBy: 'Employee #001',
        pickStartTime: new Date(Date.now() - 30 * 60 * 1000),
        createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000)
      },
      // Order 4 - Mixed bundle order ready for packing
      {
        id: 'ord-packing-1',
        orderId: `ORD-${getCurrentDateString()}-${String(orderCounter++).padStart(3, '0')}`,
        customerId: 'cust-1',
        currency: 'CZK',
        orderStatus: 'to_fulfill',
        paymentStatus: 'paid',
        priority: 'low',
        subtotal: '3850',
        taxRate: '21',
        taxAmount: '808.50',
        shippingMethod: 'DPD',
        paymentMethod: 'Cash',
        shippingCost: '89',
        grandTotal: '4747.50',
        notes: 'Mixed beauty bundle and t-shirt order',
        pickStatus: 'completed',
        packStatus: 'not_started',
        pickedBy: 'Employee #002',
        pickStartTime: new Date(Date.now() - 2 * 60 * 60 * 1000),
        pickEndTime: new Date(Date.now() - 1 * 60 * 60 * 1000),
        createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000)
      },
      // Order 5 - Tech bundle in packing
      {
        id: 'ord-packing-2',
        orderId: `ORD-${getCurrentDateString()}-${String(orderCounter++).padStart(3, '0')}`,
        customerId: 'cust-2',
        currency: 'CZK',
        orderStatus: 'to_fulfill',
        paymentStatus: 'paid',
        priority: 'medium',
        subtotal: '55500',
        taxRate: '21',
        taxAmount: '11655',
        shippingMethod: 'DHL',
        paymentMethod: 'PayPal',
        shippingCost: '200',
        grandTotal: '67355',
        notes: 'FRAGILE: Tech bundle with glass vase',
        pickStatus: 'completed',
        packStatus: 'in_progress',
        pickedBy: 'Employee #001',
        packedBy: 'Employee #003',
        pickStartTime: new Date(Date.now() - 3 * 60 * 60 * 1000),
        pickEndTime: new Date(Date.now() - 2 * 60 * 60 * 1000),
        packStartTime: new Date(Date.now() - 15 * 60 * 1000),
        createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000)
      },
      // Order 6 - Kids bundle ready to ship
      {
        id: 'ord-ready-1',
        orderId: `ORD-${getCurrentDateString()}-${String(orderCounter++).padStart(3, '0')}`,
        customerId: 'cust-3',
        currency: 'CZK',
        orderStatus: 'to_fulfill',
        paymentStatus: 'paid',
        priority: 'low',
        subtotal: '13400',
        taxRate: '21',
        taxAmount: '2814',
        shippingMethod: 'DHL',
        paymentMethod: 'PayPal',
        shippingCost: '150',
        grandTotal: '16364',
        notes: 'Two kids bundles and headphones - ready for shipping',
        pickStatus: 'completed',
        packStatus: 'completed',
        pickedBy: 'Employee #001',
        packedBy: 'Employee #002',
        pickStartTime: new Date(Date.now() - 5 * 60 * 60 * 1000),
        pickEndTime: new Date(Date.now() - 4 * 60 * 60 * 1000),
        packStartTime: new Date(Date.now() - 3 * 60 * 60 * 1000),
        packEndTime: new Date(Date.now() - 2 * 60 * 60 * 1000),
        createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000)
      }
    ];
    
    for (const order of orderData) {
      await db.insert(orders).values(order as any);
    }
    
    // Create order items - NOW WITH BUNDLE PRODUCTS
    const orderItemData = [
      // Order 1 - Tech bundle + extra item
      {
        id: nanoid(),
        orderId: 'ord-pick-1',
        productId: 'bundle-tech-starter',
        productName: 'Tech Professional Starter Kit',
        sku: 'BUNDLE-TECH-START',
        quantity: 1,
        price: '52000',
        unitPrice: '52000',
        appliedPrice: '52000',
        currency: 'CZK',
        total: '52000',
        pickedQuantity: 0,
        packedQuantity: 0,
        warehouseLocation: 'A1-R1-S1',
        barcode: 'BDL8594123456',
        isBundle: true
      },
      {
        id: nanoid(),
        orderId: 'ord-pick-1',
        productId: 'prod-tshirt',
        variantId: 'var-tshirt-l',
        productName: 'Premium Cotton T-Shirt - Size L',
        sku: 'TSHIRT-COTTON-001-L',
        quantity: 2,
        price: '650',
        unitPrice: '650',
        appliedPrice: '650',
        currency: 'CZK',
        total: '1300',
        pickedQuantity: 0,
        packedQuantity: 0,
        warehouseLocation: 'B1-R1-S1',
        barcode: '5901234567897'
      },
      // Order 2 - Beauty bundle + headphones
      {
        id: nanoid(),
        orderId: 'ord-pick-2',
        productId: 'bundle-beauty-set',
        productName: 'Complete Beauty Collection',
        sku: 'BUNDLE-BEAUTY-COMP',
        quantity: 1,
        price: '1600',
        unitPrice: '1600',
        appliedPrice: '1600',
        currency: 'CZK',
        total: '1600',
        pickedQuantity: 0,
        packedQuantity: 0,
        warehouseLocation: 'B2-R2-S3',
        barcode: 'BDL3145891234',
        isBundle: true
      },
      {
        id: nanoid(),
        orderId: 'ord-pick-2',
        productId: 'prod-headphones',
        productName: 'Sony WH-1000XM5 Headphones',
        sku: 'SONY-WH1000XM5',
        quantity: 1,
        price: '8500',
        unitPrice: '8500',
        appliedPrice: '8500',
        currency: 'CZK',
        total: '8500',
        pickedQuantity: 0,
        packedQuantity: 0,
        warehouseLocation: 'A1-R1-S2',
        barcode: '4548736134379'
      },
      // Order 3 - Kids bundle + vase
      {
        id: nanoid(),
        orderId: 'ord-picking-1',
        productId: 'bundle-kids-play',
        productName: 'Kids Entertainment Bundle',
        sku: 'BUNDLE-KIDS-PLAY',
        quantity: 1,
        price: '2450',
        unitPrice: '2450',
        appliedPrice: '2450',
        currency: 'CZK',
        total: '2450',
        pickedQuantity: 0,
        packedQuantity: 0,
        warehouseLocation: 'C1-R1-S1',
        barcode: 'BDL5702017161',
        isBundle: true
      },
      {
        id: nanoid(),
        orderId: 'ord-picking-1',
        productId: 'prod-fragile-vase',
        productName: 'Crystal Glass Vase',
        sku: 'VASE-CRYSTAL-001',
        quantity: 1,
        price: '3500',
        unitPrice: '3500',
        appliedPrice: '3500',
        currency: 'CZK',
        total: '3500',
        pickedQuantity: 0,
        packedQuantity: 0,
        warehouseLocation: 'A2-R1-S1',
        barcode: '7501234567891',
        isFragile: true
      },
      // Order 4 - Multiple beauty bundles + t-shirt
      {
        id: nanoid(),
        orderId: 'ord-packing-1',
        productId: 'bundle-beauty-set',
        productName: 'Complete Beauty Collection',
        sku: 'BUNDLE-BEAUTY-COMP',
        quantity: 2,
        price: '1600',
        unitPrice: '1600',
        appliedPrice: '1600',
        currency: 'CZK',
        total: '3200',
        pickedQuantity: 2,
        packedQuantity: 0,
        warehouseLocation: 'B2-R2-S3',
        barcode: 'BDL3145891234',
        isBundle: true
      },
      {
        id: nanoid(),
        orderId: 'ord-packing-1',
        productId: 'prod-tshirt',
        variantId: 'var-tshirt-m',
        productName: 'Premium Cotton T-Shirt - Size M',
        sku: 'TSHIRT-COTTON-001-M',
        quantity: 1,
        price: '650',
        unitPrice: '650',
        appliedPrice: '650',
        currency: 'CZK',
        total: '650',
        pickedQuantity: 1,
        packedQuantity: 0,
        warehouseLocation: 'B1-R1-S1',
        barcode: '5901234567896'
      },
      // Order 5 - Tech bundle + fragile vase
      {
        id: nanoid(),
        orderId: 'ord-packing-2',
        productId: 'bundle-tech-starter',
        productName: 'Tech Professional Starter Kit',
        sku: 'BUNDLE-TECH-START',
        quantity: 1,
        price: '52000',
        unitPrice: '52000',
        appliedPrice: '52000',
        currency: 'CZK',
        total: '52000',
        pickedQuantity: 1,
        packedQuantity: 0,
        warehouseLocation: 'A1-R1-S1',
        barcode: 'BDL8594123456',
        isBundle: true
      },
      {
        id: nanoid(),
        orderId: 'ord-packing-2',
        productId: 'prod-fragile-vase',
        productName: 'Crystal Glass Vase',
        sku: 'VASE-CRYSTAL-001',
        quantity: 1,
        price: '3500',
        unitPrice: '3500',
        appliedPrice: '3500',
        currency: 'CZK',
        total: '3500',
        pickedQuantity: 1,
        packedQuantity: 0,
        warehouseLocation: 'A2-R1-S1',
        barcode: '7501234567891',
        isFragile: true
      },
      // Order 6 - Multiple kids bundles + headphones
      {
        id: nanoid(),
        orderId: 'ord-ready-1',
        productId: 'bundle-kids-play',
        productName: 'Kids Entertainment Bundle',
        sku: 'BUNDLE-KIDS-PLAY',
        quantity: 2,
        price: '2450',
        unitPrice: '2450',
        appliedPrice: '2450',
        currency: 'CZK',
        total: '4900',
        pickedQuantity: 2,
        packedQuantity: 2,
        warehouseLocation: 'C1-R1-S1',
        barcode: 'BDL5702017161',
        isBundle: true
      },
      {
        id: nanoid(),
        orderId: 'ord-ready-1',
        productId: 'prod-headphones',
        productName: 'Sony WH-1000XM5 Headphones',
        sku: 'SONY-WH1000XM5',
        quantity: 1,
        price: '8500',
        unitPrice: '8500',
        appliedPrice: '8500',
        currency: 'CZK',
        total: '8500',
        pickedQuantity: 1,
        packedQuantity: 1,
        warehouseLocation: 'A1-R1-S2',
        barcode: '4548736134379'
      }
    ];
    
    for (const item of orderItemData) {
      await db.insert(orderItems).values(item as any);
    }
    
    console.log('✅ Pick & Pack data seeding with bundles completed successfully!');
    console.log('Created:');
    console.log('- 5 Categories');
    console.log('- 2 Warehouses');
    console.log('- 8 Warehouse Locations');
    console.log('- 7 Products with full details');
    console.log('- 8 Product Variants');
    console.log('- 3 Product Bundles');
    console.log('- 8 Bundle Items');
    console.log('- 13 Inventory Balance records');
    console.log('- 3 Customers');
    console.log('- 6 Orders in various pick/pack states');
    console.log('- 13 Order Items (including bundle products!)');
    
    return {
      categories: 5,
      warehouses: 2,
      locations: 8,
      products: 7,
      variants: 8,
      bundles: 3,
      bundleItems: 8,
      inventory: 13,
      customers: 3,
      orders: 6,
      orderItems: 13
    };
  } catch (error) {
    console.error('Error seeding pick & pack data:', error);
    throw error;
  }
}

// Execute the seeding function
if (import.meta.url === `file://${process.argv[1]}`) {
  seedPickPackDataNew()
    .then(() => {
      console.log('Pick & Pack data seeding completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Failed to seed data:', error);
      process.exit(1);
    });
}