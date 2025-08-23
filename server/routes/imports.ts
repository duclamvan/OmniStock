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
import { eq, desc, sql, and } from "drizzle-orm";
import { addDays, differenceInDays } from "date-fns";

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

// Delete consolidation
router.delete("/consolidations/:id", async (req, res) => {
  try {
    const consolidationId = parseInt(req.params.id);
    
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

// Get all custom items
router.get("/custom-items", async (req, res) => {
  try {
    const result = await db.select().from(customItems).orderBy(desc(customItems.createdAt));
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

// Get all shipments with details
router.get("/shipments", async (req, res) => {
  try {
    const shipmentList = await db.select().from(shipments).orderBy(desc(shipments.createdAt));
    
    // Get items for each shipment
    const shipmentsWithDetails = await Promise.all(
      shipmentList.map(async (shipment) => {
        const items = await db
          .select()
          .from(shipmentItems)
          .where(eq(shipmentItems.shipmentId, shipment.id));
        
        return {
          ...shipment,
          items,
          itemCount: items.length
        };
      })
    );
    
    res.json(shipmentsWithDetails);
  } catch (error) {
    console.error("Error fetching shipments:", error);
    res.status(500).json({ message: "Failed to fetch shipments" });
  }
});

// Create shipment
router.post("/shipments", async (req, res) => {
  try {
    const shipmentData = {
      consolidationId: req.body.consolidationId,
      carrier: req.body.carrier,
      trackingNumber: req.body.trackingNumber,
      origin: req.body.origin,
      destination: req.body.destination,
      shippingCost: req.body.shippingCost || 0,
      insuranceValue: req.body.insuranceValue || 0,
      notes: req.body.notes || null,
      status: "dispatched",
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const [shipment] = await db.insert(shipments).values(shipmentData).returning();
    
    // Update consolidation status to "shipped"
    await db
      .update(consolidations)
      .set({ status: "shipped", updatedAt: new Date() })
      .where(eq(consolidations.id, req.body.consolidationId));
    
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

export default router;