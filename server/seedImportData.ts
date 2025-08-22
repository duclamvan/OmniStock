import { pool } from "./db";

async function seedImportData() {
  console.log("🌱 Seeding import data...");

  try {
    // Clear existing data
    await pool.query(`DELETE FROM shipment_items`);
    await pool.query(`DELETE FROM consolidation_items`);
    await pool.query(`DELETE FROM purchase_items`);
    await pool.query(`DELETE FROM shipments`);
    await pool.query(`DELETE FROM consolidations`);
    await pool.query(`DELETE FROM custom_items`);
    await pool.query(`DELETE FROM import_purchases`);

    // Seed Purchases (Supplier Processing)
    const purchases = [
      {
        supplier: "Shenzhen Electronics Co.",
        tracking_number: "SF2024012345",
        estimated_arrival: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        notes: "Premium electronics order",
        shipping_cost: 125.50,
        total_cost: 2450.00,
        status: "processing"
      },
      {
        supplier: "Guangzhou Fashion Ltd.",
        tracking_number: "GZ2024067890",
        estimated_arrival: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
        notes: "Spring collection items",
        shipping_cost: 85.00,
        total_cost: 1680.00,
        status: "pending"
      },
      {
        supplier: "Shanghai Tech Solutions",
        tracking_number: "SH2024054321",
        estimated_arrival: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
        notes: "Computer components bulk order",
        shipping_cost: 200.00,
        total_cost: 5200.00,
        status: "processing"
      },
      {
        supplier: "Vietnam Textiles",
        tracking_number: "VN2024098765",
        estimated_arrival: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        notes: "Fabric samples and materials",
        shipping_cost: 65.00,
        total_cost: 890.00,
        status: "pending"
      },
      {
        supplier: "Hong Kong Trading Co.",
        tracking_number: "HK2024011122",
        estimated_arrival: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString(),
        notes: "Mixed goods shipment",
        shipping_cost: 150.00,
        total_cost: 3200.00,
        status: "at_warehouse"
      }
    ];

    for (const purchase of purchases) {
      const result = await pool.query(
        `INSERT INTO import_purchases (supplier, tracking_number, estimated_arrival, notes, shipping_cost, total_cost, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
        [purchase.supplier, purchase.tracking_number, purchase.estimated_arrival, purchase.notes, 
         purchase.shipping_cost, purchase.total_cost, purchase.status]
      );
      
      const purchaseId = result.rows[0].id;

      // Add items for each purchase
      const items = [
        { name: "Product A", sku: `SKU-A-${purchaseId}`, quantity: 10, unit_price: 25.00, weight: 0.5 },
        { name: "Product B", sku: `SKU-B-${purchaseId}`, quantity: 5, unit_price: 50.00, weight: 1.2 },
        { name: "Product C", sku: `SKU-C-${purchaseId}`, quantity: 20, unit_price: 15.00, weight: 0.3 },
      ];

      for (const item of items) {
        await pool.query(
          `INSERT INTO purchase_items (purchase_id, name, sku, quantity, unit_price, weight)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [purchaseId, item.name, item.sku, item.quantity, item.unit_price, item.weight]
        );
      }
    }

    // Seed Custom Items (At Warehouse)
    const customItems = [
      {
        name: "Taobao Order - Electronics Bundle",
        source: "Taobao",
        order_number: "TB2024001234",
        quantity: 3,
        unit_price: 45.00,
        weight: 2.5,
        dimensions: "30x20x15cm",
        tracking_number: "YT2024567890",
        notes: "Customer requested special packaging",
        customer_name: "John Smith",
        customer_email: "john@example.com",
        status: "available"
      },
      {
        name: "Pinduoduo Fashion Items",
        source: "Pinduoduo",
        order_number: "PDD2024005678",
        quantity: 8,
        unit_price: 22.00,
        weight: 1.8,
        dimensions: "40x30x20cm",
        tracking_number: "SF2024111222",
        notes: "Fragile items, handle with care",
        customer_name: "Sarah Johnson",
        customer_email: "sarah@example.com",
        status: "available"
      },
      {
        name: "1688 Wholesale Order",
        source: "1688",
        order_number: "WS2024009876",
        quantity: 50,
        unit_price: 8.00,
        weight: 15.0,
        dimensions: "60x40x40cm",
        tracking_number: null,
        notes: "Bulk order for resale",
        customer_name: "Mike Chen",
        customer_email: "mike@example.com",
        status: "available"
      },
      {
        name: "JD.com Premium Gadgets",
        source: "JD.com",
        order_number: "JD2024003456",
        quantity: 5,
        unit_price: 120.00,
        weight: 3.5,
        dimensions: "35x25x18cm",
        tracking_number: "JD2024333444",
        notes: "Express delivery requested",
        customer_name: "Emily Davis",
        customer_email: "emily@example.com",
        status: "available"
      },
      {
        name: "Alibaba Industrial Parts",
        source: "Alibaba",
        order_number: "ALI2024007890",
        quantity: 15,
        unit_price: 35.00,
        weight: 8.0,
        dimensions: "50x35x25cm",
        tracking_number: "CN2024555666",
        notes: "Industrial equipment parts",
        customer_name: "Robert Wilson",
        customer_email: "robert@example.com",
        status: "consolidated"
      }
    ];

    for (const item of customItems) {
      await pool.query(
        `INSERT INTO custom_items (name, source, order_number, quantity, unit_price, weight, dimensions, 
         tracking_number, notes, customer_name, customer_email, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [item.name, item.source, item.order_number, item.quantity, item.unit_price, item.weight,
         item.dimensions, item.tracking_number, item.notes, item.customer_name, item.customer_email, item.status]
      );
    }

    // Seed Consolidations (At Warehouse)
    const consolidations = [
      {
        name: "CONSOL-001",
        shipping_method: "air_express",
        warehouse: "China, Guangzhou",
        notes: "Priority shipment for VIP customers",
        target_weight: 20.0,
        max_items: 10,
        status: "preparing"
      },
      {
        name: "CONSOL-002",
        shipping_method: "sea_standard",
        warehouse: "China, Shenzhen",
        notes: "Cost-effective bulk shipment",
        target_weight: 100.0,
        max_items: 50,
        status: "preparing"
      },
      {
        name: "CONSOL-003",
        shipping_method: "air_standard",
        warehouse: "Vietnam, Ho Chi Minh",
        notes: "Mixed goods consolidation",
        target_weight: 30.0,
        max_items: 20,
        status: "preparing"
      },
      {
        name: "CONSOL-004",
        shipping_method: "sea_express",
        warehouse: "China, Shanghai",
        notes: "Electronics and gadgets",
        target_weight: 50.0,
        max_items: 25,
        status: "shipped"
      }
    ];

    const consolidationIds = [];
    for (const consolidation of consolidations) {
      const result = await pool.query(
        `INSERT INTO consolidations (name, shipping_method, warehouse, notes, target_weight, max_items, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
        [consolidation.name, consolidation.shipping_method, consolidation.warehouse, consolidation.notes,
         consolidation.target_weight, consolidation.max_items, consolidation.status]
      );
      consolidationIds.push(result.rows[0].id);
    }

    // Seed Shipments (International Transit & Delivered)
    const shipments = [
      {
        consolidation_id: consolidationIds[3], // CONSOL-004
        carrier: "DHL",
        tracking_number: "DHL2024123456789",
        origin: "China, Shanghai",
        destination: "USA, California",
        status: "in_transit",
        shipping_cost: 450.00,
        insurance_value: 2000.00,
        estimated_delivery: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000).toISOString(),
        current_location: "Hong Kong Transit Hub",
        notes: "Express delivery with insurance"
      },
      {
        consolidation_id: null,
        carrier: "FedEx",
        tracking_number: "FDX2024987654321",
        origin: "China, Guangzhou",
        destination: "USA, New York",
        status: "customs",
        shipping_cost: 380.00,
        insurance_value: 1500.00,
        estimated_delivery: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
        current_location: "US Customs",
        notes: "Awaiting customs clearance"
      },
      {
        consolidation_id: null,
        carrier: "UPS",
        tracking_number: "UPS2024456789123",
        origin: "Vietnam, Ho Chi Minh",
        destination: "Canada, Toronto",
        status: "in_transit",
        shipping_cost: 320.00,
        insurance_value: 1000.00,
        estimated_delivery: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
        current_location: "Singapore Transit",
        notes: "Standard international shipping"
      },
      {
        consolidation_id: null,
        carrier: "China Post",
        tracking_number: "CP2024111222333",
        origin: "China, Shenzhen",
        destination: "UK, London",
        status: "delivered",
        shipping_cost: 180.00,
        insurance_value: 500.00,
        estimated_delivery: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        delivered_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        current_location: "Delivered",
        notes: "Successfully delivered to customer"
      },
      {
        consolidation_id: null,
        carrier: "SF Express",
        tracking_number: "SF2024999888777",
        origin: "Hong Kong",
        destination: "Australia, Sydney",
        status: "delivered",
        shipping_cost: 280.00,
        insurance_value: 800.00,
        estimated_delivery: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        delivered_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
        current_location: "Delivered",
        notes: "Delivered ahead of schedule"
      },
      {
        consolidation_id: null,
        carrier: "USPS",
        tracking_number: "USPS2024555666777",
        origin: "China, Guangzhou",
        destination: "USA, Texas",
        status: "in_transit",
        shipping_cost: 220.00,
        insurance_value: 600.00,
        estimated_delivery: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString(),
        current_location: "Los Angeles Distribution Center",
        notes: "Final mile delivery"
      }
    ];

    for (const shipment of shipments) {
      await pool.query(
        `INSERT INTO shipments (consolidation_id, carrier, tracking_number, origin, destination, status, 
         shipping_cost, insurance_value, estimated_delivery, delivered_at, current_location, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [shipment.consolidation_id, shipment.carrier, shipment.tracking_number, shipment.origin,
         shipment.destination, shipment.status, shipment.shipping_cost, shipment.insurance_value,
         shipment.estimated_delivery, shipment.delivered_at || null, shipment.current_location, shipment.notes]
      );
    }

    console.log("✅ Import data seeded successfully!");
    console.log(`  - ${purchases.length} purchases created`);
    console.log(`  - ${customItems.length} custom items created`);
    console.log(`  - ${consolidations.length} consolidations created`);
    console.log(`  - ${shipments.length} shipments created`);

  } catch (error) {
    console.error("❌ Error seeding import data:", error);
    throw error;
  }
}

// Run the seed function
seedImportData()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });