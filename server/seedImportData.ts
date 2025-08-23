import { db } from "./db";
import {
  importPurchases,
  purchaseItems,
  customItems,
  consolidations,
  shipments,
  consolidationItems,
  shipmentItems
} from "@shared/schema";

async function seedImportData() {
  console.log("🌱 Seeding import data...");

  try {
    // Clear existing data
    await db.delete(shipmentItems);
    await db.delete(consolidationItems);
    await db.delete(purchaseItems);
    await db.delete(shipments);
    await db.delete(consolidations);
    await db.delete(customItems);
    await db.delete(importPurchases);

    // Seed Purchases (Supplier Processing)
    const purchases = [
      {
        supplier: "Shenzhen Electronics Co.",
        trackingNumber: "SF2024012345",
        estimatedArrival: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        notes: "Premium electronics order",
        shippingCost: "125.50",
        totalCost: "2450.00",
        status: "processing"
      },
      {
        supplier: "Guangzhou Fashion Ltd.",
        trackingNumber: "GZ2024067890",
        estimatedArrival: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        notes: "Spring collection items",
        shippingCost: "85.00",
        totalCost: "1680.00",
        status: "pending"
      },
      {
        supplier: "Shanghai Tech Solutions",
        trackingNumber: "SH2024054321",
        estimatedArrival: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
        notes: "Computer components bulk order",
        shippingCost: "200.00",
        totalCost: "5200.00",
        status: "processing"
      },
      {
        supplier: "Vietnam Textiles",
        trackingNumber: "VN2024098765",
        estimatedArrival: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        notes: "Fabric samples and materials",
        shippingCost: "65.00",
        totalCost: "890.00",
        status: "pending"
      },
      {
        supplier: "Hong Kong Trading Co.",
        trackingNumber: "HK2024011122",
        estimatedArrival: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000),
        notes: "Mixed goods shipment",
        shippingCost: "150.00",
        totalCost: "3200.00",
        status: "at_warehouse"
      }
    ];

    for (const purchase of purchases) {
      const result = await db.insert(importPurchases)
        .values(purchase)
        .returning({ id: importPurchases.id });
      
      const purchaseId = result[0].id;

      // Add items for each purchase
      const items = [
        { name: "Product A", sku: `SKU-A-${purchaseId}`, quantity: 10, unitPrice: "25.00", weight: "0.5" },
        { name: "Product B", sku: `SKU-B-${purchaseId}`, quantity: 5, unitPrice: "50.00", weight: "1.2" },
        { name: "Product C", sku: `SKU-C-${purchaseId}`, quantity: 20, unitPrice: "15.00", weight: "0.3" },
      ];

      for (const item of items) {
        await db.insert(purchaseItems)
          .values({
            purchaseId,
            ...item
          });
      }
    }

    // Seed Custom Items (At Warehouse)
    const customItemsData = [
      {
        name: "Taobao Order - Electronics Bundle",
        source: "Taobao",
        orderNumber: "TB2024001234",
        quantity: 3,
        unitPrice: "45.00",
        weight: "2.5",
        dimensions: "30x20x15cm",
        trackingNumber: "YT2024567890",
        notes: "Customer requested special packaging",
        customerName: "John Smith",
        customerEmail: "john@example.com",
        status: "available"
      },
      {
        name: "Pinduoduo Fashion Items",
        source: "Pinduoduo",
        orderNumber: "PDD2024005678",
        quantity: 8,
        unitPrice: "22.00",
        weight: "1.8",
        dimensions: "40x30x20cm",
        trackingNumber: "SF2024111222",
        notes: "Fragile items, handle with care",
        customerName: "Sarah Johnson",
        customerEmail: "sarah@example.com",
        status: "available"
      },
      {
        name: "1688 Wholesale Order",
        source: "1688",
        orderNumber: "WS2024009876",
        quantity: 50,
        unitPrice: "8.00",
        weight: "15.0",
        dimensions: "60x40x40cm",
        trackingNumber: null,
        notes: "Bulk order for resale",
        customerName: "Mike Chen",
        customerEmail: "mike@example.com",
        status: "available"
      },
      {
        name: "JD.com Premium Gadgets",
        source: "JD.com",
        orderNumber: "JD2024003456",
        quantity: 5,
        unitPrice: "120.00",
        weight: "3.5",
        dimensions: "35x25x18cm",
        trackingNumber: "JD2024333444",
        notes: "Express delivery requested",
        customerName: "Emily Davis",
        customerEmail: "emily@example.com",
        status: "available"
      },
      {
        name: "Alibaba Industrial Parts",
        source: "Alibaba",
        orderNumber: "ALI2024007890",
        quantity: 15,
        unitPrice: "35.00",
        weight: "8.0",
        dimensions: "50x35x25cm",
        trackingNumber: "CN2024555666",
        notes: "Industrial equipment parts",
        customerName: "Robert Wilson",
        customerEmail: "robert@example.com",
        status: "consolidated"
      }
    ];

    await db.insert(customItems).values(customItemsData);

    // Seed Consolidations (At Warehouse)
    const consolidationsData = [
      {
        name: "CONSOL-001",
        shippingMethod: "air_express",
        warehouse: "China, Guangzhou",
        notes: "Priority shipment for VIP customers",
        targetWeight: "20.0",
        maxItems: 10,
        status: "preparing"
      },
      {
        name: "CONSOL-002",
        shippingMethod: "sea_standard",
        warehouse: "China, Shenzhen",
        notes: "Cost-effective bulk shipment",
        targetWeight: "100.0",
        maxItems: 50,
        status: "preparing"
      },
      {
        name: "CONSOL-003",
        shippingMethod: "air_standard",
        warehouse: "Vietnam, Ho Chi Minh",
        notes: "Mixed goods consolidation",
        targetWeight: "30.0",
        maxItems: 20,
        status: "preparing"
      },
      {
        name: "CONSOL-004",
        shippingMethod: "sea_express",
        warehouse: "China, Shanghai",
        notes: "Electronics and gadgets",
        targetWeight: "50.0",
        maxItems: 25,
        status: "shipped"
      }
    ];

    const consolidationResults = await db.insert(consolidations)
      .values(consolidationsData)
      .returning({ id: consolidations.id });
    
    const consolidationIds = consolidationResults.map(r => r.id);

    // Seed Shipments (International Transit & Delivered)
    const shipmentsData = [
      {
        consolidationId: consolidationIds[3], // CONSOL-004
        carrier: "DHL",
        trackingNumber: "DHL2024123456789",
        origin: "China, Shanghai",
        destination: "USA, California",
        status: "in_transit",
        shippingCost: "450.00",
        insuranceValue: "2000.00",
        estimatedDelivery: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000),
        currentLocation: "Hong Kong Transit Hub",
        notes: "Express delivery with insurance"
      },
      {
        consolidationId: null,
        carrier: "FedEx",
        trackingNumber: "FDX2024987654321",
        origin: "China, Guangzhou",
        destination: "USA, New York",
        status: "customs",
        shippingCost: "380.00",
        insuranceValue: "1500.00",
        estimatedDelivery: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
        currentLocation: "US Customs",
        notes: "Awaiting customs clearance"
      },
      {
        consolidationId: null,
        carrier: "UPS",
        trackingNumber: "UPS2024456789123",
        origin: "Vietnam, Ho Chi Minh",
        destination: "Canada, Toronto",
        status: "in_transit",
        shippingCost: "320.00",
        insuranceValue: "1000.00",
        estimatedDelivery: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
        currentLocation: "Singapore Transit",
        notes: "Standard international shipping"
      },
      {
        consolidationId: null,
        carrier: "China Post",
        trackingNumber: "CP2024111222333",
        origin: "China, Shenzhen",
        destination: "UK, London",
        status: "delivered",
        shippingCost: "180.00",
        insuranceValue: "500.00",
        estimatedDelivery: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        deliveredAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        currentLocation: "Delivered",
        notes: "Successfully delivered to customer"
      },
      {
        consolidationId: null,
        carrier: "SF Express",
        trackingNumber: "SF2024999888777",
        origin: "Hong Kong",
        destination: "Australia, Sydney",
        status: "delivered",
        shippingCost: "280.00",
        insuranceValue: "800.00",
        estimatedDelivery: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        deliveredAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
        currentLocation: "Delivered",
        notes: "Delivered ahead of schedule"
      },
      {
        consolidationId: null,
        carrier: "USPS",
        trackingNumber: "USPS2024555666777",
        origin: "China, Guangzhou",
        destination: "USA, Texas",
        status: "in_transit",
        shippingCost: "220.00",
        insuranceValue: "600.00",
        estimatedDelivery: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000),
        currentLocation: "Los Angeles Distribution Center",
        notes: "Final mile delivery"
      }
    ];

    await db.insert(shipments).values(shipmentsData);

    console.log("✅ Import data seeded successfully!");
    console.log(`  - ${purchases.length} purchases created`);
    console.log(`  - ${customItemsData.length} custom items created`);
    console.log(`  - ${consolidationsData.length} consolidations created`);
    console.log(`  - ${shipmentsData.length} shipments created`);

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