import { db } from "./db";
import { products, packingMaterials } from "@shared/schema";
import { eq } from "drizzle-orm";

async function seedPackingData() {
  console.log("Seeding packing materials...");
  
  // Create packing materials
  const materials = [
    {
      id: "mat-bubble-1",
      name: "Bubble Wrap - Small",
      code: "BW-S-001",
      type: "bubble_wrap",
      size: "small",
      imageUrl: "https://images.unsplash.com/photo-1607452358110-852bb629d7e3?w=400",
      cost: "2.50",
      currency: "CZK" as const,
      supplier: "Packaging Solutions Co.",
      stockQuantity: 150,
      minStockLevel: 20,
      description: "Small bubble wrap for fragile items",
      isFragileProtection: true,
      isActive: true
    },
    {
      id: "mat-box-1",
      name: "Corrugated Box - Medium",
      code: "CB-M-001",
      type: "box",
      size: "medium",
      imageUrl: "https://images.unsplash.com/photo-1612198188060-c7c2a3b66eae?w=400",
      cost: "15.00",
      currency: "CZK" as const,
      supplier: "BoxMart",
      stockQuantity: 200,
      minStockLevel: 30,
      description: "Standard medium shipping box",
      isFragileProtection: false,
      isActive: true
    },
    {
      id: "mat-foam-1",
      name: "Foam Inserts",
      code: "FI-001",
      type: "foam",
      size: "custom",
      imageUrl: "https://images.unsplash.com/photo-1515378960530-7c0da6231fb1?w=400",
      cost: "8.50",
      currency: "CZK" as const,
      supplier: "ProtectPack Inc.",
      stockQuantity: 100,
      minStockLevel: 15,
      description: "Custom foam inserts for electronics",
      isFragileProtection: true,
      isActive: true
    },
    {
      id: "mat-paper-1",
      name: "Kraft Paper Sheets",
      code: "KP-001",
      type: "paper",
      size: "large",
      imageUrl: "https://images.unsplash.com/photo-1614108831625-e9ff5ea2c450?w=400",
      cost: "1.20",
      currency: "CZK" as const,
      supplier: "EcoPack Supplies",
      stockQuantity: 500,
      minStockLevel: 50,
      description: "Eco-friendly kraft paper for void fill",
      isFragileProtection: false,
      isActive: true
    }
  ];

  // Insert packing materials
  for (const material of materials) {
    await db.insert(packingMaterials)
      .values(material)
      .onConflictDoUpdate({
        target: packingMaterials.id,
        set: material
      });
  }

  console.log("Updating products with shipping notes and packing materials...");

  // Update some existing products with shipping notes and packing material references
  const productUpdates = [
    {
      sku: "PROD001",
      shipmentNotes: "FRAGILE - Handle with care! Wrap in bubble wrap and place upright. Do not stack heavy items on top.",
      packingMaterialId: "mat-bubble-1"
    },
    {
      sku: "PROD002",
      shipmentNotes: "Temperature sensitive - Keep in cool, dry place. Use foam inserts for protection.",
      packingMaterialId: "mat-foam-1"
    },
    {
      sku: "PROD003",
      shipmentNotes: "Sharp edges - Wrap securely in kraft paper. Label box clearly with 'SHARP OBJECTS'.",
      packingMaterialId: "mat-paper-1"
    },
    {
      sku: "PROD004",
      shipmentNotes: "Glass product - EXTREMELY FRAGILE! Double wrap with bubble wrap. Mark box with fragile stickers on all sides.",
      packingMaterialId: "mat-bubble-1"
    },
    {
      sku: "PROD005",
      shipmentNotes: "Standard packing - Place in medium box with void fill. Can be stacked.",
      packingMaterialId: "mat-box-1"
    }
  ];

  for (const update of productUpdates) {
    const product = await db.select().from(products).where(eq(products.sku, update.sku)).limit(1);
    if (product.length > 0) {
      await db.update(products)
        .set({
          shipmentNotes: update.shipmentNotes,
          packingMaterialId: update.packingMaterialId
        })
        .where(eq(products.sku, update.sku));
      console.log(`Updated product ${update.sku} with shipping notes`);
    }
  }

  console.log("Packing data seeding completed!");
}

seedPackingData()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Error seeding packing data:", error);
    process.exit(1);
  });