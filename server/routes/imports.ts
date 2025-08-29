import { Router } from "express";
import { db } from "../db";
import { 
  importPurchases, 
  purchaseItems, 
  consolidations, 
  consolidationItems,
  customItems,
  shipments,
  shipmentItems,
  deliveryHistory
} from "@shared/schema";
import { eq, desc, sql, and, like, or } from "drizzle-orm";
import { addDays, differenceInDays } from "date-fns";
import multer from "multer";

// Configure multer for screenshot uploads
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp|avif/;
    const extname = allowedTypes.test(file.originalname.toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

const router = Router();

// Get frequent suppliers
router.get("/suppliers/frequent", async (req, res) => {
  try {
    // Get suppliers ordered by frequency of use
    const suppliers = await db
      .select({
        name: importPurchases.supplier,
        count: sql<number>`count(*)::int`,
        lastUsed: sql<Date>`max(${importPurchases.createdAt})`
      })
      .from(importPurchases)
      .groupBy(importPurchases.supplier)
      .orderBy(desc(sql`count(*)`))
      .limit(10);
    
    res.json(suppliers);
  } catch (error) {
    console.error("Error fetching frequent suppliers:", error);
    res.status(500).json({ message: "Failed to fetch frequent suppliers" });
  }
});

// Get all import purchases with items
router.get("/purchases", async (req, res) => {
  try {
    const purchaseList = await db.select().from(importPurchases).orderBy(desc(importPurchases.createdAt));
    
    // Get items for each purchase
    const purchasesWithItems = await Promise.all(
      purchaseList.map(async (purchase) => {
        const items = await db
          .select()
          .from(purchaseItems)
          .where(eq(purchaseItems.purchaseId, purchase.id));
        
        return {
          ...purchase,
          items,
          itemCount: items.length
        };
      })
    );
    
    res.json(purchasesWithItems);
  } catch (error) {
    console.error("Error fetching purchases:", error);
    res.status(500).json({ message: "Failed to fetch purchases" });
  }
});

// Get purchases at warehouse
router.get("/purchases/at-warehouse", async (req, res) => {
  try {
    const purchases = await db
      .select()
      .from(importPurchases)
      .where(eq(importPurchases.status, 'at_warehouse'))
      .orderBy(desc(importPurchases.createdAt));
    
    // Get items for each purchase
    const purchasesWithItems = await Promise.all(
      purchases.map(async (purchase) => {
        const items = await db
          .select()
          .from(purchaseItems)
          .where(eq(purchaseItems.purchaseId, purchase.id));
        
        return {
          ...purchase,
          items,
          itemCount: items.length
        };
      })
    );
    
    res.json(purchasesWithItems);
  } catch (error) {
    console.error("Error fetching at-warehouse purchases:", error);
    res.status(500).json({ message: "Failed to fetch at-warehouse purchases" });
  }
});

// Get unpacked items (custom items from unpacked purchase orders that are still available)
router.get("/unpacked-items", async (req, res) => {
  try {
    const unpackedItems = await db
      .select()
      .from(customItems)
      .where(and(
        like(customItems.orderNumber, 'PO-%'),
        eq(customItems.status, 'available')
      ))
      .orderBy(desc(customItems.createdAt));
    
    res.json(unpackedItems);
  } catch (error) {
    console.error("Error fetching unpacked items:", error);
    res.status(500).json({ message: "Failed to fetch unpacked items" });
  }
});

// AI Classification for items
router.post("/items/auto-classify", async (req, res) => {
  try {
    const { itemIds } = req.body;
    
    if (!itemIds || !Array.isArray(itemIds) || itemIds.length === 0) {
      return res.status(400).json({ message: "Item IDs array is required" });
    }
    
    // Fetch items to classify
    const items = await db
      .select()
      .from(customItems)
      .where(sql`${customItems.id} = ANY(${itemIds})`);
    
    // AI logic to determine classification based on:
    // - Product name patterns
    // - Historical data
    // - Product categories
    const classifications: { id: number, classification: string }[] = [];
    
    for (const item of items) {
      let classification = 'general'; // Default to general
      
      const name = item.name.toLowerCase();
      const notes = (item.notes || '').toLowerCase();
      const source = (item.source || '').toLowerCase();
      
      // Sensitive goods patterns
      const sensitivePatterns = [
        'battery', 'batteries', 'lithium', 'power bank', 'charger',
        'perfume', 'cosmetic', 'makeup', 'nail polish', 'aerosol',
        'liquid', 'cream', 'lotion', 'oil', 'gel', 'spray',
        'medicine', 'drug', 'pharmaceutical', 'vitamin', 'supplement',
        'chemical', 'flammable', 'explosive', 'hazardous', 'toxic',
        'weapon', 'knife', 'blade', 'sharp', 'gun',
        'alcohol', 'wine', 'beer', 'liquor', 'spirits',
        'magnet', 'magnetic', 'electronic', 'device',
        'compressed', 'gas', 'pressurized', 'canister',
        'paint', 'solvent', 'adhesive', 'glue', 'lighter'
      ];
      
      // Check for sensitive patterns
      for (const pattern of sensitivePatterns) {
        if (name.includes(pattern) || notes.includes(pattern)) {
          classification = 'sensitive';
          break;
        }
      }
      
      // Additional checks for specific suppliers known for sensitive goods
      if (source.includes('battery') || source.includes('electronic') || 
          source.includes('chemical') || source.includes('cosmetic')) {
        classification = 'sensitive';
      }
      
      // Check quantity and weight for bulk items that might be commercial
      if (!classification && item.quantity > 100 && parseFloat(item.weight || '0') > 50) {
        classification = 'sensitive'; // Large bulk items may need special handling
      }
      
      classifications.push({ id: item.id, classification });
    }
    
    // Update all items with their classifications
    for (const { id, classification } of classifications) {
      await db
        .update(customItems)
        .set({ 
          classification,
          updatedAt: new Date()
        })
        .where(eq(customItems.id, id));
    }
    
    res.json({ 
      message: `Successfully classified ${classifications.length} items`,
      classifications 
    });
  } catch (error) {
    console.error("Error in AI classification:", error);
    res.status(500).json({ message: "Failed to auto-classify items" });
  }
});

// Receive purchase order without unpacking (as a single package)
router.post("/purchases/receive", async (req, res) => {
  try {
    const { purchaseId } = req.body;
    
    if (!purchaseId) {
      return res.status(400).json({ message: "Purchase ID is required" });
    }
    
    // Fetch the purchase order with items
    const [purchase] = await db
      .select()
      .from(importPurchases)
      .where(eq(importPurchases.id, purchaseId));
    
    if (!purchase) {
      return res.status(404).json({ message: "Purchase order not found" });
    }
    
    // Fetch all items for this purchase
    const items = await db
      .select()
      .from(purchaseItems)
      .where(eq(purchaseItems.purchaseId, purchaseId));
    
    if (!items.length) {
      return res.status(400).json({ message: "No items found in purchase order" });
    }
    
    // Calculate total weight and create a package name
    const totalWeight = items.reduce((sum, item) => sum + (item.weight ? parseFloat(item.weight) : 0), 0);
    const packageName = `PO #${purchaseId} - ${purchase.supplier}`;
    
    // Create a single custom item representing the whole order
    const customItem = {
      name: packageName,
      source: 'supplier',
      orderNumber: purchase.trackingNumber,
      quantity: 1,
      unitPrice: purchase.totalPaid,
      weight: totalWeight.toString(),
      dimensions: null,
      trackingNumber: purchase.trackingNumber,
      notes: `Full package from ${purchase.supplier}. Contains ${items.length} items.`,
      customerName: null,
      customerEmail: null,
      status: 'available',
      classification: null, // Default to no classification
      purchaseOrderId: purchaseId,
      orderItems: items, // Store items as JSON
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    await db.insert(customItems).values(customItem);
    
    // Update purchase order status to received
    await db
      .update(importPurchases)
      .set({ 
        status: 'received',
        updatedAt: new Date()
      })
      .where(eq(importPurchases.id, purchaseId));
    
    res.json({ message: "Purchase order received as package successfully" });
  } catch (error) {
    console.error("Error receiving purchase order:", error);
    res.status(500).json({ message: "Failed to receive purchase order" });
  }
});

// Unpack purchase order
router.post("/purchases/unpack", async (req, res) => {
  try {
    const { purchaseId } = req.body;
    
    if (!purchaseId) {
      return res.status(400).json({ message: "Purchase ID is required" });
    }

    // Get the purchase order with items
    const [purchase] = await db
      .select()
      .from(importPurchases)
      .where(eq(importPurchases.id, purchaseId));
    
    if (!purchase) {
      return res.status(404).json({ message: "Purchase order not found" });
    }

    if (purchase.status === 'unpacked') {
      return res.status(400).json({ message: "Purchase order already unpacked" });
    }
    
    // Check if items from this purchase order already exist
    const existingItems = await db
      .select()
      .from(customItems)
      .where(eq(customItems.orderNumber, `PO-${purchase.id}`));
    
    if (existingItems.length > 0) {
      return res.status(400).json({ message: "Items from this purchase order have already been unpacked" });
    }

    const items = await db
      .select()
      .from(purchaseItems)
      .where(eq(purchaseItems.purchaseId, purchaseId));

    // Create custom items from purchase items
    const customItemsCreated = [];
    for (const item of items) {
      const customItem = {
        name: item.name,
        source: `Supplier: ${purchase.supplier}`,
        orderNumber: `PO-${purchase.id}`, // Fixed to match frontend pattern
        quantity: item.quantity,
        unitPrice: item.unitPrice || '0',
        weight: item.weight || '0',
        dimensions: item.dimensions ? JSON.stringify(item.dimensions) : null,
        trackingNumber: item.trackingNumber || purchase.trackingNumber,
        notes: `From Purchase Order #${purchase.id} - ${purchase.supplier}\n${item.notes || ''}`,
        customerName: null,
        customerEmail: null,
        status: 'available',
        createdAt: new Date()
      };

      const [created] = await db.insert(customItems).values(customItem).returning();
      customItemsCreated.push(created);
    }

    // Update purchase order status to 'unpacked'
    await db
      .update(importPurchases)
      .set({ 
        status: 'unpacked',
        updatedAt: new Date()
      })
      .where(eq(importPurchases.id, purchaseId));

    res.json({
      success: true,
      message: "Purchase order unpacked successfully",
      itemsCreated: customItemsCreated.length,
      customItems: customItemsCreated
    });
  } catch (error) {
    console.error("Error unpacking purchase order:", error);
    res.status(500).json({ message: "Failed to unpack purchase order" });
  }
});

// Get single purchase with items
router.get("/purchases/:id", async (req, res) => {
  try {
    const purchaseId = parseInt(req.params.id);
    
    const [purchase] = await db
      .select()
      .from(importPurchases)
      .where(eq(importPurchases.id, purchaseId));
    
    if (!purchase) {
      return res.status(404).json({ message: "Purchase not found" });
    }
    
    const items = await db
      .select()
      .from(purchaseItems)
      .where(eq(purchaseItems.purchaseId, purchaseId));
    
    res.json({ ...purchase, items });
  } catch (error) {
    console.error("Error fetching purchase:", error);
    res.status(500).json({ message: "Failed to fetch purchase" });
  }
});

// Create import purchase with items
router.post("/purchases", async (req, res) => {
  try {
    // Calculate total cost from items
    const items = req.body.items || [];
    const shippingCost = parseFloat(req.body.shippingCost) || 0;
    const subtotal = items.reduce((sum: number, item: any) => 
      sum + (parseFloat(item.unitPrice) || 0) * (parseInt(item.quantity) || 0), 0);
    const totalCost = subtotal + shippingCost;
    
    const purchaseData = {
      supplier: req.body.supplier,
      trackingNumber: req.body.trackingNumber || null,
      estimatedArrival: req.body.estimatedArrival ? new Date(req.body.estimatedArrival) : null,
      notes: req.body.notes || null,
      shippingCost: shippingCost.toString(),
      totalCost: totalCost.toString(),
      // New currency fields
      paymentCurrency: req.body.paymentCurrency || "USD",
      totalPaid: req.body.totalPaid?.toString() || totalCost.toString(),
      purchaseCurrency: req.body.purchaseCurrency || "USD",
      purchaseTotal: req.body.purchaseTotal?.toString() || totalCost.toString(),
      exchangeRate: req.body.exchangeRate?.toString() || "1",
      status: "pending",
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const [purchase] = await db.insert(importPurchases).values(purchaseData).returning();
    
    // Create purchase items
    if (items.length > 0) {
      const purchaseItemsData = items.map((item: any) => ({
        purchaseId: purchase.id,
        name: item.name,
        sku: item.sku || null,
        quantity: parseInt(item.quantity) || 1,
        unitPrice: (parseFloat(item.unitPrice) || 0).toString(),
        totalPrice: ((parseFloat(item.unitPrice) || 0) * (parseInt(item.quantity) || 1)).toString(),
        weight: item.weight ? parseFloat(item.weight).toString() : null,
        dimensions: item.dimensions || null,
        notes: item.notes || null,
        status: "ordered",
        createdAt: new Date(),
        updatedAt: new Date()
      }));
      
      await db.insert(purchaseItems).values(purchaseItemsData);
    }
    
    // Return purchase with items
    const createdItems = await db
      .select()
      .from(purchaseItems)
      .where(eq(purchaseItems.purchaseId, purchase.id));
    
    res.json({ ...purchase, items: createdItems });
  } catch (error) {
    console.error("Error creating purchase:", error);
    res.status(500).json({ message: "Failed to create purchase" });
  }
});

// Add item to purchase
router.post("/purchases/:id/items", async (req, res) => {
  try {
    const purchaseId = parseInt(req.params.id);
    const itemData = {
      purchaseId,
      name: req.body.name,
      sku: req.body.sku || null,
      quantity: req.body.quantity || 1,
      unitPrice: req.body.unitPrice || 0,
      weight: req.body.weight || 0,
      dimensions: req.body.dimensions || null,
      notes: req.body.notes || null,
      createdAt: new Date()
    };
    
    const [item] = await db.insert(purchaseItems).values(itemData).returning();
    res.json(item);
  } catch (error) {
    console.error("Error adding item:", error);
    res.status(500).json({ message: "Failed to add item" });
  }
});

// Update complete purchase
router.patch("/purchases/:id", async (req, res) => {
  try {
    const purchaseId = parseInt(req.params.id);
    
    // Update purchase data
    const purchaseUpdate: any = {
      updatedAt: new Date()
    };
    
    // Only update fields that are provided and exist in the database schema
    if (req.body.supplier !== undefined) purchaseUpdate.supplier = req.body.supplier;
    if (req.body.trackingNumber !== undefined) purchaseUpdate.trackingNumber = req.body.trackingNumber;
    if (req.body.estimatedArrival !== undefined) {
      purchaseUpdate.estimatedArrival = req.body.estimatedArrival ? new Date(req.body.estimatedArrival) : null;
    }
    if (req.body.notes !== undefined) purchaseUpdate.notes = req.body.notes;
    if (req.body.shippingCost !== undefined) purchaseUpdate.shippingCost = req.body.shippingCost;
    if (req.body.totalCost !== undefined) purchaseUpdate.totalCost = req.body.totalCost;
    if (req.body.purchaseCurrency !== undefined) purchaseUpdate.purchaseCurrency = req.body.purchaseCurrency;
    if (req.body.paymentCurrency !== undefined) purchaseUpdate.paymentCurrency = req.body.paymentCurrency;
    if (req.body.totalPaid !== undefined) purchaseUpdate.totalPaid = req.body.totalPaid;
    if (req.body.purchaseTotal !== undefined) purchaseUpdate.purchaseTotal = req.body.purchaseTotal;
    if (req.body.exchangeRate !== undefined) purchaseUpdate.exchangeRate = req.body.exchangeRate;
    if (req.body.status !== undefined) purchaseUpdate.status = req.body.status;
    
    // Handle purchaseDate if provided (should be stored in createdAt for existing records)
    // We don't update createdAt but can update estimatedArrival based on it
    
    const [updated] = await db
      .update(importPurchases)
      .set(purchaseUpdate)
      .where(eq(importPurchases.id, purchaseId))
      .returning();
    
    // Handle items update if provided
    if (req.body.items && Array.isArray(req.body.items)) {
      // Delete existing items
      await db.delete(purchaseItems).where(eq(purchaseItems.purchaseId, purchaseId));
      
      // Insert new items
      if (req.body.items.length > 0) {
        const itemsToInsert = req.body.items.map((item: any) => ({
          purchaseId,
          name: item.name,
          sku: item.sku || null,
          quantity: item.quantity || 1,
          unitPrice: item.unitPrice || 0,
          weight: item.weight || 0,
          dimensions: item.dimensions || null,
          notes: item.notes || null,
          createdAt: new Date(),
          updatedAt: new Date()
        }));
        
        await db.insert(purchaseItems).values(itemsToInsert);
      }
    }
    
    // Fetch updated purchase with items
    const updatedPurchase = await db.select().from(importPurchases).where(eq(importPurchases.id, purchaseId)).limit(1);
    const items = await db.select().from(purchaseItems).where(eq(purchaseItems.purchaseId, purchaseId));
    
    res.json({ ...updatedPurchase[0], items });
  } catch (error) {
    console.error("Error updating purchase:", error);
    res.status(500).json({ message: "Failed to update purchase" });
  }
});

// Update purchase status
router.patch("/purchases/:id/status", async (req, res) => {
  try {
    const purchaseId = parseInt(req.params.id);
    const { status } = req.body;
    
    const [updated] = await db
      .update(importPurchases)
      .set({ status, updatedAt: new Date() })
      .where(eq(importPurchases.id, purchaseId))
      .returning();
    
    res.json(updated);
  } catch (error) {
    console.error("Error updating purchase status:", error);
    res.status(500).json({ message: "Failed to update purchase status" });
  }
});

// Delete purchase
router.delete("/purchases/:id", async (req, res) => {
  try {
    const purchaseId = parseInt(req.params.id);
    
    // Delete associated items first
    await db.delete(purchaseItems).where(eq(purchaseItems.purchaseId, purchaseId));
    
    // Then delete the purchase
    await db.delete(importPurchases).where(eq(importPurchases.id, purchaseId));
    
    res.json({ message: "Purchase deleted successfully" });
  } catch (error) {
    console.error("Error deleting purchase:", error);
    res.status(500).json({ message: "Failed to delete purchase" });
  }
});

// Get all consolidations with items
router.get("/consolidations", async (req, res) => {
  try {
    const consolidationList = await db.select().from(consolidations).orderBy(desc(consolidations.createdAt));
    
    // Get items for each consolidation
    const consolidationsWithItems = await Promise.all(
      consolidationList.map(async (consolidation) => {
        const items = await db
          .select()
          .from(consolidationItems)
          .where(eq(consolidationItems.consolidationId, consolidation.id));
        
        return {
          ...consolidation,
          items,
          itemCount: items.length
        };
      })
    );
    
    res.json(consolidationsWithItems);
  } catch (error) {
    console.error("Error fetching consolidations:", error);
    res.status(500).json({ message: "Failed to fetch consolidations" });
  }
});

// Create consolidation
router.post("/consolidations", async (req, res) => {
  try {
    const consolidationData = {
      name: req.body.name,
      location: req.body.location,
      shippingMethod: req.body.shippingMethod,
      warehouse: req.body.warehouse,
      notes: req.body.notes || null,
      targetWeight: req.body.targetWeight || null,
      maxItems: req.body.maxItems || null,
      status: "preparing",
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const [consolidation] = await db.insert(consolidations).values(consolidationData).returning();
    
    // Add items to consolidation if provided
    if (req.body.itemIds && req.body.itemIds.length > 0) {
      const itemsToAdd = req.body.itemIds.map((itemId: number) => ({
        consolidationId: consolidation.id,
        itemId: itemId,
        createdAt: new Date()
      }));
      
      await db.insert(consolidationItems).values(itemsToAdd);
    }
    
    res.json(consolidation);
  } catch (error) {
    console.error("Error creating consolidation:", error);
    res.status(500).json({ message: "Failed to create consolidation" });
  }
});

// Add items to consolidation
router.post("/consolidations/:id/items", async (req, res) => {
  try {
    const consolidationId = parseInt(req.params.id);
    const { itemIds } = req.body;
    
    if (!itemIds || !Array.isArray(itemIds) || itemIds.length === 0) {
      return res.status(400).json({ message: "Invalid item IDs" });
    }
    
    // Add items to consolidation
    const itemsToAdd = itemIds.map((itemId: number) => ({
      consolidationId: consolidationId,
      itemId: itemId,
      itemType: 'custom',
      createdAt: new Date()
    }));
    
    await db.insert(consolidationItems).values(itemsToAdd);
    
    // Update item status to consolidated
    await db
      .update(customItems)
      .set({ status: 'consolidated' })
      .where(sql`id IN (${sql.join(itemIds.map(id => sql`${id}`), sql`, `)})`);
    
    res.json({ message: "Items added to consolidation successfully" });
  } catch (error) {
    console.error("Error adding items to consolidation:", error);
    res.status(500).json({ message: "Failed to add items to consolidation" });
  }
});

// Delete consolidation
router.delete("/consolidations/:id", async (req, res) => {
  try {
    const consolidationId = parseInt(req.params.id);
    
    // First, update status of items back to 'available'
    const itemsToRelease = await db
      .select({ itemId: consolidationItems.itemId })
      .from(consolidationItems)
      .where(eq(consolidationItems.consolidationId, consolidationId));
    
    if (itemsToRelease.length > 0) {
      const itemIds = itemsToRelease.map(i => i.itemId);
      await db
        .update(customItems)
        .set({ status: 'available' })
        .where(sql`id IN (${sql.join(itemIds.map(id => sql`${id}`), sql`, `)})`);
    }
    
    // Delete associated items first
    await db.delete(consolidationItems).where(eq(consolidationItems.consolidationId, consolidationId));
    
    // Then delete the consolidation
    await db.delete(consolidations).where(eq(consolidations.id, consolidationId));
    
    res.json({ message: "Consolidation deleted successfully" });
  } catch (error) {
    console.error("Error deleting consolidation:", error);
    res.status(500).json({ message: "Failed to delete consolidation" });
  }
});

// Remove item from consolidation
router.delete("/consolidations/:consolidationId/items/:itemId", async (req, res) => {
  try {
    const consolidationId = parseInt(req.params.consolidationId);
    const itemId = parseInt(req.params.itemId);
    
    // Remove item from consolidation
    await db
      .delete(consolidationItems)
      .where(
        and(
          eq(consolidationItems.consolidationId, consolidationId),
          eq(consolidationItems.itemId, itemId)
        )
      );
    
    // Update item status back to available
    await db
      .update(customItems)
      .set({ status: 'available' })
      .where(eq(customItems.id, itemId));
    
    res.json({ message: "Item removed from consolidation successfully" });
  } catch (error) {
    console.error("Error removing item from consolidation:", error);
    res.status(500).json({ message: "Failed to remove item from consolidation" });
  }
});

// Get consolidation items
router.get("/consolidations/:id/items", async (req, res) => {
  try {
    const consolidationId = parseInt(req.params.id);
    
    const items = await db
      .select({
        id: customItems.id,
        name: customItems.name,
        source: customItems.source,
        quantity: customItems.quantity,
        weight: customItems.weight,
        classification: customItems.classification,
        unitPrice: customItems.unitPrice,
        customerName: customItems.customerName,
        orderNumber: customItems.orderNumber,
        trackingNumber: customItems.trackingNumber, // Include tracking number
        addedAt: consolidationItems.createdAt,
      })
      .from(consolidationItems)
      .innerJoin(customItems, eq(consolidationItems.itemId, customItems.id))
      .where(eq(consolidationItems.consolidationId, consolidationId))
      .orderBy(consolidationItems.createdAt);
    
    res.json(items);
  } catch (error) {
    console.error("Error fetching consolidation items:", error);
    res.status(500).json({ message: "Failed to fetch consolidation items" });
  }
});

// Update consolidation
router.patch("/consolidations/:id", async (req, res) => {
  try {
    const consolidationId = parseInt(req.params.id);
    const { name, location, shippingMethod, notes, targetWeight } = req.body;
    
    await db
      .update(consolidations)
      .set({ 
        name,
        location,
        shippingMethod,
        notes,
        targetWeight,
        updatedAt: new Date()
      })
      .where(eq(consolidations.id, consolidationId));
    
    res.json({ success: true });
  } catch (error) {
    console.error("Failed to update consolidation:", error);
    res.status(500).json({ message: "Failed to update consolidation" });
  }
});

// Update consolidation status
router.patch("/consolidations/:id/status", async (req, res) => {
  try {
    const consolidationId = parseInt(req.params.id);
    const { status } = req.body;
    
    await db
      .update(consolidations)
      .set({ 
        status,
        updatedAt: new Date()
      })
      .where(eq(consolidations.id, consolidationId));
    
    res.json({ success: true });
  } catch (error) {
    console.error("Failed to update consolidation status:", error);
    res.status(500).json({ message: "Failed to update consolidation status" });
  }
});

// Ship consolidation
router.post("/consolidations/:id/ship", async (req, res) => {
  try {
    const consolidationId = parseInt(req.params.id);
    const { trackingNumber, carrier } = req.body;
    
    // Update consolidation status
    await db
      .update(consolidations)
      .set({ 
        status: 'shipped',
        updatedAt: new Date()
      })
      .where(eq(consolidations.id, consolidationId));
    
    // Update all items in consolidation to shipped
    const itemsToUpdate = await db
      .select({ itemId: consolidationItems.itemId })
      .from(consolidationItems)
      .where(eq(consolidationItems.consolidationId, consolidationId));
    
    if (itemsToUpdate.length > 0) {
      const itemIds = itemsToUpdate.map(i => i.itemId);
      await db
        .update(customItems)
        .set({ status: 'shipped' })
        .where(sql`id IN (${sql.join(itemIds.map(id => sql`${id}`), sql`, `)})`);
    }
    
    // Create shipment record if tracking provided
    if (trackingNumber) {
      await db.insert(shipments).values({
        consolidationId,
        trackingNumber,
        carrier: carrier || 'unknown',
        status: 'in_transit',
        origin: 'warehouse',
        destination: 'customer',
        createdAt: new Date()
      });
    }
    
    res.json({ message: "Consolidation shipped successfully" });
  } catch (error) {
    console.error("Error shipping consolidation:", error);
    res.status(500).json({ message: "Failed to ship consolidation" });
  }
});

// Get all available custom items (not in consolidations or shipped)
router.get("/custom-items", async (req, res) => {
  try {
    const result = await db
      .select()
      .from(customItems)
      .where(eq(customItems.status, 'available'))
      .orderBy(desc(customItems.createdAt));
    res.json(result);
  } catch (error) {
    console.error("Error fetching custom items:", error);
    res.status(500).json({ message: "Failed to fetch custom items" });
  }
});

// Create custom item
router.post("/custom-items", async (req, res) => {
  try {
    const itemData = {
      name: req.body.name,
      source: req.body.source,
      orderNumber: req.body.orderNumber || null,
      quantity: req.body.quantity || 1,
      unitPrice: req.body.unitPrice || 0,
      weight: req.body.weight || 0,
      dimensions: req.body.dimensions || null,
      trackingNumber: req.body.trackingNumber || null,
      notes: req.body.notes || null,
      customerName: req.body.customerName || null,
      customerEmail: req.body.customerEmail || null,
      status: "available",
      createdAt: new Date()
    };
    
    const [item] = await db.insert(customItems).values(itemData).returning();
    res.json(item);
  } catch (error) {
    console.error("Error creating custom item:", error);
    res.status(500).json({ message: "Failed to create custom item" });
  }
});

// Unpack custom item (for items that represent whole purchase orders)
router.post("/custom-items/:id/unpack", async (req, res) => {
  try {
    const itemId = parseInt(req.params.id);
    
    // Get the custom item
    const [customItem] = await db
      .select()
      .from(customItems)
      .where(eq(customItems.id, itemId));
    
    if (!customItem) {
      return res.status(404).json({ message: "Item not found" });
    }
    
    // Check if this item has orderItems (represents a whole PO)
    if (!customItem.orderItems || !Array.isArray(customItem.orderItems) || customItem.orderItems.length === 0) {
      return res.status(400).json({ message: "This item cannot be unpacked" });
    }
    
    // Create individual custom items from the orderItems
    const unpackedItems = [];
    for (const orderItem of customItem.orderItems) {
      const newItem = {
        name: orderItem.name,
        source: customItem.source,
        orderNumber: customItem.orderNumber,
        quantity: orderItem.quantity,
        unitPrice: orderItem.unitPrice || '0',
        weight: orderItem.weight || null,
        dimensions: orderItem.dimensions || null,
        trackingNumber: customItem.trackingNumber,
        notes: `Unpacked from: ${customItem.name}`,
        customerName: customItem.customerName,
        customerEmail: customItem.customerEmail,
        status: 'available',
        classification: customItem.classification,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const [created] = await db.insert(customItems).values(newItem).returning();
      unpackedItems.push(created);
    }
    
    // Delete the original packed item
    await db.delete(customItems).where(eq(customItems.id, itemId));
    
    res.json({
      success: true,
      message: "Item unpacked successfully",
      unpackedItems
    });
  } catch (error) {
    console.error("Error unpacking custom item:", error);
    res.status(500).json({ message: "Failed to unpack item" });
  }
});

// Update custom item
router.patch("/custom-items/:id", async (req, res) => {
  try {
    const itemId = parseInt(req.params.id);
    
    const updateData: any = {};
    if (req.body.name !== undefined) updateData.name = req.body.name;
    if (req.body.source !== undefined) updateData.source = req.body.source;
    if (req.body.orderNumber !== undefined) updateData.orderNumber = req.body.orderNumber;
    if (req.body.quantity !== undefined) updateData.quantity = req.body.quantity;
    if (req.body.unitPrice !== undefined) updateData.unitPrice = req.body.unitPrice;
    if (req.body.weight !== undefined) updateData.weight = req.body.weight;
    if (req.body.dimensions !== undefined) updateData.dimensions = req.body.dimensions;
    if (req.body.trackingNumber !== undefined) updateData.trackingNumber = req.body.trackingNumber;
    if (req.body.notes !== undefined) updateData.notes = req.body.notes;
    if (req.body.customerName !== undefined) updateData.customerName = req.body.customerName;
    if (req.body.customerEmail !== undefined) updateData.customerEmail = req.body.customerEmail;
    if (req.body.status !== undefined) updateData.status = req.body.status;
    if (req.body.classification !== undefined) updateData.classification = req.body.classification;
    
    // Always update the updatedAt timestamp
    updateData.updatedAt = new Date();
    
    const [updated] = await db
      .update(customItems)
      .set(updateData)
      .where(eq(customItems.id, itemId))
      .returning();
    
    if (!updated) {
      return res.status(404).json({ message: "Custom item not found" });
    }
    
    res.json(updated);
  } catch (error) {
    console.error("Error updating custom item:", error);
    res.status(500).json({ message: "Failed to update custom item" });
  }
});

// Delete custom item
router.delete("/custom-items/:id", async (req, res) => {
  try {
    const itemId = parseInt(req.params.id);
    
    const result = await db
      .delete(customItems)
      .where(eq(customItems.id, itemId));
    
    if ((result.rowCount ?? 0) === 0) {
      return res.status(404).json({ message: "Custom item not found" });
    }
    
    res.json({ message: "Custom item deleted successfully" });
  } catch (error) {
    console.error("Error deleting custom item:", error);
    res.status(500).json({ message: "Failed to delete custom item" });
  }
});

// Get pending shipments (shipped consolidations without full tracking or shipments with pending status)
router.get("/shipments/pending", async (req, res) => {
  try {
    // Get consolidations that are ready or shipped (without tracking)
    const shippedConsolidations = await db
      .select()
      .from(consolidations)
      .where(or(
        eq(consolidations.status, 'shipped'),
        eq(consolidations.status, 'ready')
      ))
      .orderBy(desc(consolidations.createdAt));
    
    // Get shipments that are marked as pending
    const pendingShipmentsList = await db
      .select()
      .from(shipments)
      .where(eq(shipments.status, 'pending'))
      .orderBy(desc(shipments.createdAt));
    
    // Process consolidations
    const pendingFromConsolidations = await Promise.all(
      shippedConsolidations.map(async (consolidation) => {
        // Check if there's a shipment for this consolidation
        const [existingShipment] = await db
          .select()
          .from(shipments)
          .where(eq(shipments.consolidationId, consolidation.id));
        
        // Get items for this consolidation
        const items = await db
          .select({
            id: customItems.id,
            name: customItems.name,
            quantity: customItems.quantity,
            weight: customItems.weight,
            unitPrice: customItems.unitPrice
          })
          .from(consolidationItems)
          .innerJoin(customItems, eq(consolidationItems.itemId, customItems.id))
          .where(eq(consolidationItems.consolidationId, consolidation.id));
        
        // Include if:
        // 1. No shipment exists, OR
        // 2. Shipment exists but is pending, OR
        // 3. Shipment exists but tracking is incomplete
        if (!existingShipment || existingShipment.status === 'pending' || !existingShipment.trackingNumber) {
          return {
            ...consolidation,
            existingShipment,
            items,
            itemCount: items.length,
            needsTracking: !existingShipment || !existingShipment.trackingNumber,
            trackingNumber: existingShipment?.trackingNumber || null,
            carrier: existingShipment?.carrier || null,
            origin: existingShipment?.origin || null,
            destination: existingShipment?.destination || null
          };
        }
        return null;
      })
    );
    
    // Filter out nulls and combine results
    const filteredPending = pendingFromConsolidations.filter(p => p !== null);
    
    res.json(filteredPending);
  } catch (error) {
    console.error("Error fetching pending shipments:", error);
    res.status(500).json({ message: "Failed to fetch pending shipments" });
  }
});

// Search shipments with filters
router.get("/shipments/search", async (req, res) => {
  try {
    const { query, status, carrier, origin, destination } = req.query;
    
    let shipmentList = await db.select().from(shipments).orderBy(desc(shipments.createdAt));
    
    // Apply filters
    if (status) {
      shipmentList = shipmentList.filter(s => s.status === status);
    }
    if (carrier) {
      shipmentList = shipmentList.filter(s => s.carrier.toLowerCase().includes(carrier.toString().toLowerCase()));
    }
    if (origin) {
      shipmentList = shipmentList.filter(s => s.origin.toLowerCase().includes(origin.toString().toLowerCase()));
    }
    if (destination) {
      shipmentList = shipmentList.filter(s => s.destination.toLowerCase().includes(destination.toString().toLowerCase()));
    }
    
    // Get items for each shipment and apply search query
    const shipmentsWithDetails = await Promise.all(
      shipmentList.map(async (shipment) => {
        let items: any[] = [];
        let itemCount = 0;
        
        // If shipment has a consolidation, get its items
        if (shipment.consolidationId) {
          const consolidationItemList = await db
            .select({
              id: customItems.id,
              name: customItems.name,
              quantity: customItems.quantity,
              weight: customItems.weight,
              trackingNumber: customItems.trackingNumber,
              unitPrice: customItems.unitPrice
            })
            .from(consolidationItems)
            .innerJoin(customItems, eq(consolidationItems.itemId, customItems.id))
            .where(eq(consolidationItems.consolidationId, shipment.consolidationId));
          
          items = consolidationItemList;
          itemCount = consolidationItemList.length;
        }
        
        // Apply text search if query provided
        if (query) {
          const searchQuery = query.toString().toLowerCase();
          
          // Check if shipment matches query
          const shipmentMatches = 
            shipment.trackingNumber.toLowerCase().includes(searchQuery) ||
            shipment.carrier.toLowerCase().includes(searchQuery) ||
            shipment.origin.toLowerCase().includes(searchQuery) ||
            shipment.destination.toLowerCase().includes(searchQuery) ||
            shipment.status.toLowerCase().includes(searchQuery);
          
          // Check if any items match query
          const itemsMatch = items.some((item: any) => 
            item.name?.toLowerCase().includes(searchQuery) ||
            item.trackingNumber?.toLowerCase().includes(searchQuery)
          );
          
          if (!shipmentMatches && !itemsMatch) {
            return null;
          }
        }
        
        return {
          ...shipment,
          items,
          itemCount
        };
      })
    );
    
    // Filter out nulls from search results
    const filteredResults = shipmentsWithDetails.filter(s => s !== null);
    
    res.json(filteredResults);
  } catch (error) {
    console.error("Error searching shipments:", error);
    res.status(500).json({ message: "Failed to search shipments" });
  }
});

// Get all shipments with details
router.get("/shipments", async (req, res) => {
  try {
    const shipmentList = await db.select().from(shipments).orderBy(desc(shipments.createdAt));
    
    // Get items for each shipment from consolidation
    const shipmentsWithDetails = await Promise.all(
      shipmentList.map(async (shipment) => {
        let items: any[] = [];
        let itemCount = 0;
        
        // If shipment has a consolidation, get its items
        if (shipment.consolidationId) {
          const consolidationItemList = await db
            .select({
              id: customItems.id,
              name: customItems.name,
              quantity: customItems.quantity,
              weight: customItems.weight,
              trackingNumber: customItems.trackingNumber,
              unitPrice: customItems.unitPrice
            })
            .from(consolidationItems)
            .innerJoin(customItems, eq(consolidationItems.itemId, customItems.id))
            .where(eq(consolidationItems.consolidationId, shipment.consolidationId));
          
          items = consolidationItemList;
          itemCount = consolidationItemList.length;
        }
        
        return {
          ...shipment,
          items,
          itemCount
        };
      })
    );
    
    res.json(shipmentsWithDetails);
  } catch (error) {
    console.error("Error fetching shipments:", error);
    res.status(500).json({ message: "Failed to fetch shipments" });
  }
});

// Helper function to generate AI shipment name
const generateAIShipmentName = async (consolidationId: number | null, shipmentType: string, items?: any[]) => {
  try {
    let itemsList = items || [];
    
    // If we have a consolidation ID but no items, fetch them
    if (consolidationId && itemsList.length === 0) {
      const fetchedItems = await db
        .select({
          name: customItems.name,
          quantity: customItems.quantity
        })
        .from(consolidationItems)
        .innerJoin(customItems, eq(consolidationItems.itemId, customItems.id))
        .where(eq(consolidationItems.consolidationId, consolidationId));
      
      itemsList = fetchedItems;
    }
    
    // Build shipment name based on shipping method and items
    const methodName = shipmentType?.includes('express') ? 'Express' : 
                      shipmentType?.includes('air') ? 'Air' : 
                      shipmentType?.includes('sea') ? 'Sea' : 
                      shipmentType?.includes('railway') ? 'Rail' : 'Standard';
    
    // Get first 2 items for the name
    const itemNames = itemsList.slice(0, 2)
      .map(item => item.name)
      .filter(Boolean)
      .join(', ');
    
    const moreItems = itemsList.length > 2 ? ` +${itemsList.length - 2} more` : '';
    const totalItems = itemsList.reduce((sum, item) => sum + (item.quantity || 1), 0);
    
    // Add sensitive label if applicable
    const sensitiveLabel = shipmentType?.includes('sensitive') ? ' (Sensitive)' : '';
    
    // Generate the final name
    const generatedName = itemNames 
      ? `${methodName}${sensitiveLabel} - ${itemNames}${moreItems} (${totalItems} items)`
      : `${methodName}${sensitiveLabel} Shipment - ${totalItems} items`;
    
    return generatedName;
  } catch (error) {
    console.error('Error generating AI shipment name:', error);
    return `${shipmentType?.replace(/_/g, ' ').toUpperCase() || 'STANDARD'} Shipment`;
  }
};

// Create shipment
router.post("/shipments", async (req, res) => {
  try {
    // Generate AI name if not provided
    let shipmentName = req.body.shipmentName;
    if (!shipmentName || shipmentName.trim() === '') {
      shipmentName = await generateAIShipmentName(
        req.body.consolidationId,
        req.body.shipmentType || req.body.shippingMethod,
        req.body.items
      );
    }
    
    const shipmentData = {
      consolidationId: req.body.consolidationId,
      carrier: req.body.carrier || 'Standard Carrier',
      trackingNumber: req.body.trackingNumber,
      endCarrier: req.body.endCarrier || null,
      endTrackingNumber: req.body.endTrackingNumber || null,
      shipmentName: shipmentName,
      shipmentType: req.body.shipmentType || req.body.shippingMethod || null,
      origin: req.body.origin,
      destination: req.body.destination,
      shippingCost: req.body.shippingCost || 0,
      shippingCostCurrency: req.body.shippingCostCurrency || 'USD',
      insuranceValue: req.body.insuranceValue || 0,
      notes: req.body.notes || null,
      status: "pending",
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const [shipment] = await db.insert(shipments).values(shipmentData).returning();
    
    // Update consolidation status to "shipped"
    if (req.body.consolidationId) {
      await db
        .update(consolidations)
        .set({ status: "shipped", updatedAt: new Date() })
        .where(eq(consolidations.id, req.body.consolidationId));
    }
    
    res.json(shipment);
  } catch (error) {
    console.error("Error creating shipment:", error);
    res.status(500).json({ message: "Failed to create shipment" });
  }
});

// Update shipment tracking
router.patch("/shipments/:id/tracking", async (req, res) => {
  try {
    const shipmentId = parseInt(req.params.id);
    const updateData: any = {
      updatedAt: new Date()
    };
    
    if (req.body.status) updateData.status = req.body.status;
    if (req.body.location) updateData.currentLocation = req.body.location;
    if (req.body.notes) updateData.notes = req.body.notes;
    if (req.body.estimatedDelivery) updateData.estimatedDelivery = new Date(req.body.estimatedDelivery);
    
    // If status is "delivered", set deliveredAt
    if (req.body.status === "delivered") {
      updateData.deliveredAt = new Date();
    }
    
    // If status is changed back to "pending", update consolidation status
    if (req.body.status === "pending") {
      // Get the shipment to find its consolidation
      const [shipment] = await db
        .select()
        .from(shipments)
        .where(eq(shipments.id, shipmentId));
      
      if (shipment && shipment.consolidationId) {
        // Update consolidation status back to "ready" 
        await db
          .update(consolidations)
          .set({ status: "ready", updatedAt: new Date() })
          .where(eq(consolidations.id, shipment.consolidationId));
      }
    }
    
    const [updated] = await db
      .update(shipments)
      .set(updateData)
      .where(eq(shipments.id, shipmentId))
      .returning();
    
    res.json(updated);
  } catch (error) {
    console.error("Error updating shipment tracking:", error);
    res.status(500).json({ message: "Failed to update shipment tracking" });
  }
});

// AI Delivery Prediction Endpoint
router.post("/shipments/predict-delivery", async (req, res) => {
  try {
    const { 
      shipmentId, 
      origin, 
      destination, 
      shippingMethod, 
      carrier, 
      dispatchDate 
    } = req.body;
    
    // Get historical delivery data for AI learning
    const historicalData = await db
      .select()
      .from(deliveryHistory)
      .where(
        and(
          eq(deliveryHistory.carrier, carrier),
          eq(deliveryHistory.origin, origin),
          eq(deliveryHistory.destination, destination)
        )
      )
      .orderBy(desc(deliveryHistory.deliveredAt))
      .limit(100);
    
    // Base delivery times by shipping method
    const baseDeliveryDays: { [key: string]: number } = {
      "air_express": 3,
      "air_standard": 7,
      "sea_freight": 30,
      "rail_freight": 20,
      "road_freight": 15,
      "priority": 2
    };
    
    // Carrier performance modifiers
    const carrierModifiers: { [key: string]: number } = {
      "DHL": -1,
      "FedEx": -1,
      "UPS": 0,
      "USPS": 2,
      "China Post": 3,
      "SF Express": 1
    };
    
    // Calculate base delivery time
    let estimatedDays = baseDeliveryDays[shippingMethod] || 10;
    
    // Apply carrier modifier
    estimatedDays += carrierModifiers[carrier] || 0;
    
    // AI learning from historical data
    if (historicalData.length > 0) {
      const avgHistoricalDays = historicalData.reduce((sum, record) => {
        const days = record.actualDays || estimatedDays;
        return sum + days;
      }, 0) / historicalData.length;
      
      // Blend historical average with base estimate (60% historical, 40% base)
      estimatedDays = Math.round((avgHistoricalDays * 0.6) + (estimatedDays * 0.4));
    }
    
    // Seasonal adjustments
    const currentMonth = new Date().getMonth();
    const seasonalDelay = currentMonth >= 9 && currentMonth <= 11; // Q4 holiday season
    if (seasonalDelay) {
      estimatedDays += 2;
    }
    
    // Weather/customs delays for international routes
    const isInternational = !origin.includes(destination.split(',').pop()?.trim() || '');
    const customsDelay = isInternational && (origin.includes("China") || destination.includes("USA"));
    if (customsDelay) {
      estimatedDays += 3;
    }
    
    // Calculate confidence based on historical data quality
    let confidence = 75; // Base confidence
    if (historicalData.length >= 10) {
      confidence = Math.min(95, 75 + (historicalData.length / 5));
    } else if (historicalData.length < 5) {
      confidence = Math.max(60, confidence - 10);
    }
    
    // Variance analysis for confidence adjustment
    if (historicalData.length >= 5) {
      const avgDays = historicalData.reduce((sum, r) => sum + (r.actualDays || 0), 0) / historicalData.length;
      const variance = historicalData.reduce((sum, r) => {
        const diff = (r.actualDays || 0) - avgDays;
        return sum + (diff * diff);
      }, 0) / historicalData.length;
      
      // Higher variance = lower confidence
      confidence -= Math.min(20, variance * 2);
    }
    
    // Calculate estimated delivery date
    const dispatchDateObj = new Date(dispatchDate || Date.now());
    const estimatedDelivery = addDays(dispatchDateObj, estimatedDays);
    
    const prediction = {
      estimatedDelivery: estimatedDelivery.toISOString(),
      estimatedDays,
      confidence: Math.round(Math.max(60, Math.min(95, confidence))),
      factors: {
        seasonalDelay,
        customsDelay,
        customsDays: customsDelay ? 3 : 0,
        fastRoute: shippingMethod === "air_express" || shippingMethod === "priority",
        weatherDelay: false, // Could be enhanced with weather API
        historicalAccuracy: historicalData.length >= 10
      },
      historicalAverage: historicalData.length > 0 ? Math.round(
        historicalData.reduce((sum, r) => sum + (r.actualDays || 0), 0) / historicalData.length
      ) : estimatedDays,
      historicalShipments: historicalData.length,
      lastUpdated: new Date().toISOString()
    };
    
    // Update shipment with AI prediction
    if (shipmentId) {
      await db
        .update(shipments)
        .set({ 
          estimatedDelivery,
          updatedAt: new Date()
        })
        .where(eq(shipments.id, shipmentId));
    }
    
    res.json(prediction);
  } catch (error) {
    console.error("Error predicting delivery:", error);
    res.status(500).json({ message: "Failed to predict delivery" });
  }
});

// Record actual delivery for AI learning
router.post("/shipments/:id/delivered", async (req, res) => {
  try {
    const shipmentId = parseInt(req.params.id);
    const deliveredAt = new Date();
    
    // Get shipment details
    const [shipment] = await db
      .select()
      .from(shipments)
      .where(eq(shipments.id, shipmentId));
    
    if (!shipment) {
      return res.status(404).json({ message: "Shipment not found" });
    }
    
    // Calculate actual delivery days
    const actualDays = differenceInDays(deliveredAt, new Date(shipment.createdAt));
    
    // Update shipment status
    await db
      .update(shipments)
      .set({ 
        status: "delivered",
        deliveredAt,
        updatedAt: new Date()
      })
      .where(eq(shipments.id, shipmentId));
    
    // Record in delivery history for AI learning
    await db.insert(deliveryHistory).values({
      shipmentId,
      carrier: shipment.carrier,
      origin: shipment.origin,
      destination: shipment.destination,
      shippingMethod: "unknown", // Would need to get from consolidation
      dispatchedAt: new Date(shipment.createdAt),
      deliveredAt,
      estimatedDays: shipment.estimatedDelivery ? 
        differenceInDays(new Date(shipment.estimatedDelivery), new Date(shipment.createdAt)) : null,
      actualDays,
      seasonalFactor: new Date().getMonth() >= 9 && new Date().getMonth() <= 11,
      createdAt: new Date()
    });
    
    res.json({ message: "Delivery recorded successfully", actualDays });
  } catch (error) {
    console.error("Error recording delivery:", error);
    res.status(500).json({ message: "Failed to record delivery" });
  }
});

// Extract order details from screenshot (AI Vision API)
router.post("/extract-from-screenshot", upload.single('screenshot'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No screenshot uploaded" });
    }

    // For now, return mock data since we don't have OpenAI API key configured
    // In production, this would use OpenAI Vision API to:
    // 1. Analyze the screenshot
    // 2. Extract Chinese text
    // 3. Translate to English
    // 4. Parse order details
    
    // Mock extracted items (simulating Pinduoduo/Taobao order extraction)
    const mockItems = [
      {
        name: "Wireless Bluetooth Earbuds", 
        source: "pinduoduo",
        orderNumber: "PDD" + Math.random().toString(36).substr(2, 9).toUpperCase(),
        quantity: 2,
        unitPrice: 15.99,
        classification: "general"
      },
      {
        name: "Phone Case with Stand",
        source: "pinduoduo", 
        orderNumber: "PDD" + Math.random().toString(36).substr(2, 9).toUpperCase(),
        quantity: 1,
        unitPrice: 8.50,
        classification: "general"
      }
    ];

    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    res.json({ 
      items: mockItems,
      message: "Successfully extracted items from screenshot (mock data - configure OpenAI API for real extraction)"
    });
  } catch (error) {
    console.error("Error processing screenshot:", error);
    res.status(500).json({ message: "Failed to process screenshot" });
  }
});

export default router;