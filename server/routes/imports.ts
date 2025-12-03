import { Router } from "express";
import { z } from "zod";
import { db } from "../db";
import crypto from "crypto";
import { FINANCIAL_FIELDS } from "../routes";
import OpenAI from "openai";
import { 
  importPurchases, 
  purchaseItems, 
  consolidations, 
  consolidationItems,
  customItems,
  shipments,
  shipmentItems,
  deliveryHistory,
  receipts,
  receiptItems,
  landedCosts,
  products,
  productLocations,
  aiLocationSuggestions,
  shipmentCosts,
  shipmentCartons,
  costAllocations,
  productCostHistory,
  suppliers,
  orders,
  orderItems
} from "@shared/schema";
import { eq, desc, sql, and, like, or, isNull, inArray, ne, gte } from "drizzle-orm";
import { addDays, differenceInDays } from "date-fns";
import multer from "multer";
import { LandingCostService } from "../services/landingCostService";

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

// FINANCIAL_FIELDS is now imported from ../routes for consistency across all routers

// Deeply recursive middleware to filter financial data from responses for warehouse operators
function filterFinancialData(data: any, userRole: string): any {
  if (userRole === 'administrator') {
    return data; // Admins see everything
  }
  
  // Handle arrays recursively
  if (Array.isArray(data)) {
    return data.map(item => filterFinancialData(item, userRole));
  }
  
  // Handle objects recursively
  if (typeof data === 'object' && data !== null) {
    const filtered: any = {};
    
    for (const key in data) {
      // Skip financial fields completely
      if (FINANCIAL_FIELDS.includes(key)) {
        continue;
      }
      
      // Recursively filter nested objects and arrays
      filtered[key] = filterFinancialData(data[key], userRole);
    }
    
    return filtered;
  }
  
  // Return primitives as-is
  return data;
}

// ============================================================================
// LANDED COST CALCULATION HELPER
// ============================================================================
// This helper function calculates the proper weighted average landed cost
// when receiving inventory. It fetches actual cost allocations from the
// costAllocations table (for custom items) or purchaseItems.landingCostUnitBase
// (for purchase items) and calculates a proper weighted average.

interface LandedCostData {
  landingCostPerUnit: number;
  landingCostEur: number;
  landingCostUsd: number;
  landingCostCzk: number;
  source: 'cost_allocation' | 'purchase_item' | 'fallback';
}

/**
 * Fetch the landed cost per unit for a receipt item.
 * Priority:
 * 1. Cost allocations table (for custom items with calculated allocations)
 * 2. purchaseItems.landingCostUnitBase (for purchase items)
 * 3. Fall back to unit price * 1.15 (15% markup estimate)
 */
async function getLandedCostForItem(
  tx: any,
  itemType: string,
  itemId: number,
  shipmentId: number | null,
  quantity: number,
  unitPrice: number
): Promise<LandedCostData> {
  let landingCostPerUnit = 0;
  let source: 'cost_allocation' | 'purchase_item' | 'fallback' = 'fallback';
  
  // Priority 1: Check cost allocations table for this item
  if (shipmentId) {
    try {
      // For custom items, get allocated costs from costAllocations table
      if (itemType === 'custom') {
        const allocations = await tx
          .select({
            amountAllocatedBase: costAllocations.amountAllocatedBase,
            costType: costAllocations.costType
          })
          .from(costAllocations)
          .where(
            and(
              eq(costAllocations.shipmentId, shipmentId),
              eq(costAllocations.customItemId, itemId)
            )
          );
        
        if (allocations.length > 0) {
          // Sum all allocated costs (FREIGHT, BROKERAGE, INSURANCE, etc.)
          const totalAllocated = allocations.reduce((sum: number, alloc: any) => {
            return sum + parseFloat(alloc.amountAllocatedBase || '0');
          }, 0);
          
          // Get item unit price and add allocated costs
          const [customItem] = await tx
            .select({ unitPrice: customItems.unitPrice, quantity: customItems.quantity })
            .from(customItems)
            .where(eq(customItems.id, itemId));
          
          if (customItem) {
            const itemUnitPrice = parseFloat(customItem.unitPrice || '0');
            const itemQuantity = customItem.quantity || quantity;
            // Landed cost = unit price + (total allocated costs / quantity)
            landingCostPerUnit = itemUnitPrice + (totalAllocated / itemQuantity);
            source = 'cost_allocation';
          }
        }
      }
    } catch (error) {
      console.warn('Failed to fetch cost allocations:', error);
    }
  }
  
  // Priority 2: Check purchaseItems.landingCostUnitBase for purchase items
  if (source === 'fallback' && itemType === 'purchase') {
    try {
      const [purchaseItem] = await tx
        .select({ landingCostUnitBase: purchaseItems.landingCostUnitBase })
        .from(purchaseItems)
        .where(eq(purchaseItems.id, itemId));
      
      if (purchaseItem?.landingCostUnitBase) {
        landingCostPerUnit = parseFloat(purchaseItem.landingCostUnitBase);
        source = 'purchase_item';
      }
    } catch (error) {
      console.warn('Failed to fetch purchase item landing cost:', error);
    }
  }
  
  // Priority 3: Fall back to unit price * 1.15 (15% markup estimate)
  if (source === 'fallback') {
    landingCostPerUnit = unitPrice * 1.15;
  }
  
  // Calculate currency-specific landed costs
  // Base currency is EUR (from LandingCostService)
  const landingCostEur = landingCostPerUnit;
  const landingCostUsd = landingCostPerUnit * 1.08; // Approximate EUR to USD
  const landingCostCzk = landingCostPerUnit * 25.2; // Approximate EUR to CZK
  
  return {
    landingCostPerUnit,
    landingCostEur,
    landingCostUsd,
    landingCostCzk,
    source
  };
}

/**
 * Calculate weighted average landed cost when receiving inventory.
 * Uses the formula: (oldQty * oldCost + newQty * newCost) / totalQty
 */
function calculateWeightedAverageLandedCost(
  existingProduct: any,
  newQuantity: number,
  newLandedCost: LandedCostData
): {
  avgLandingCostEur: number;
  avgLandingCostUsd: number;
  avgLandingCostCzk: number;
  avgLatestLandingCost: number;
} {
  const oldQuantity = existingProduct?.quantity || 0;
  const totalQuantity = oldQuantity + newQuantity;
  
  if (totalQuantity <= 0) {
    return {
      avgLandingCostEur: newLandedCost.landingCostEur,
      avgLandingCostUsd: newLandedCost.landingCostUsd,
      avgLandingCostCzk: newLandedCost.landingCostCzk,
      avgLatestLandingCost: newLandedCost.landingCostPerUnit
    };
  }
  
  // Get existing landed costs (default to 0 if null)
  const oldLandingCostEur = parseFloat(existingProduct?.landingCostEur || existingProduct?.latestLandingCost || '0');
  const oldLandingCostUsd = parseFloat(existingProduct?.landingCostUsd || '0');
  const oldLandingCostCzk = parseFloat(existingProduct?.landingCostCzk || '0');
  const oldLatestLandingCost = parseFloat(existingProduct?.latestLandingCost || '0');
  
  // Calculate weighted averages
  const avgLandingCostEur = oldQuantity > 0 && oldLandingCostEur > 0
    ? ((oldQuantity * oldLandingCostEur) + (newQuantity * newLandedCost.landingCostEur)) / totalQuantity
    : newLandedCost.landingCostEur;
    
  const avgLandingCostUsd = oldQuantity > 0 && oldLandingCostUsd > 0
    ? ((oldQuantity * oldLandingCostUsd) + (newQuantity * newLandedCost.landingCostUsd)) / totalQuantity
    : newLandedCost.landingCostUsd;
    
  const avgLandingCostCzk = oldQuantity > 0 && oldLandingCostCzk > 0
    ? ((oldQuantity * oldLandingCostCzk) + (newQuantity * newLandedCost.landingCostCzk)) / totalQuantity
    : newLandedCost.landingCostCzk;
    
  const avgLatestLandingCost = oldQuantity > 0 && oldLatestLandingCost > 0
    ? ((oldQuantity * oldLatestLandingCost) + (newQuantity * newLandedCost.landingCostPerUnit)) / totalQuantity
    : newLandedCost.landingCostPerUnit;
  
  return {
    avgLandingCostEur,
    avgLandingCostUsd,
    avgLandingCostCzk,
    avgLatestLandingCost
  };
}

// Get frequent suppliers
router.get("/suppliers/frequent", async (req: any, res) => {
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
    
    // Filter financial data based on user role
    const userRole = req.user?.role || 'warehouse_operator';
    const filtered = filterFinancialData(suppliers, userRole);
    res.json(filtered);
  } catch (error) {
    console.error("Error fetching frequent suppliers:", error);
    res.status(500).json({ message: "Failed to fetch frequent suppliers" });
  }
});

// Get all import purchases with items (optimized with single query)
router.get("/purchases", async (req, res) => {
  try {
    const purchaseList = await db.select().from(importPurchases).orderBy(desc(importPurchases.createdAt));
    
    if (purchaseList.length === 0) {
      return res.json([]);
    }
    
    // Get all items for all purchases in a single query
    const purchaseIds = purchaseList.map(p => p.id);
    const allItems = await db
      .select()
      .from(purchaseItems)
      .where(inArray(purchaseItems.purchaseId, purchaseIds));
    
    // Group items by purchaseId in memory
    const itemsByPurchaseId: Record<number, typeof allItems> = {};
    for (const item of allItems) {
      if (!itemsByPurchaseId[item.purchaseId]) {
        itemsByPurchaseId[item.purchaseId] = [];
      }
      itemsByPurchaseId[item.purchaseId].push(item);
    }
    
    // Combine purchases with their items
    const purchasesWithItems = purchaseList.map(purchase => ({
      ...purchase,
      items: itemsByPurchaseId[purchase.id] || [],
      itemCount: (itemsByPurchaseId[purchase.id] || []).length
    }));
    
    // Filter financial data based on user role
    const userRole = (req as any).user?.role || 'warehouse_operator';
    const filtered = filterFinancialData(purchasesWithItems, userRole);
    res.json(filtered);
  } catch (error) {
    console.error("Error fetching purchases:", error);
    res.status(500).json({ message: "Failed to fetch purchases" });
  }
});

// Get purchases at warehouse (optimized with single query)
router.get("/purchases/at-warehouse", async (req, res) => {
  try {
    const purchases = await db
      .select()
      .from(importPurchases)
      .where(eq(importPurchases.status, 'at_warehouse'))
      .orderBy(desc(importPurchases.createdAt));
    
    if (purchases.length === 0) {
      return res.json([]);
    }
    
    // Get all items for all purchases in a single query
    const purchaseIds = purchases.map(p => p.id);
    const allItems = await db
      .select()
      .from(purchaseItems)
      .where(inArray(purchaseItems.purchaseId, purchaseIds));
    
    // Group items by purchaseId in memory
    const itemsByPurchaseId: Record<number, typeof allItems> = {};
    for (const item of allItems) {
      if (!itemsByPurchaseId[item.purchaseId]) {
        itemsByPurchaseId[item.purchaseId] = [];
      }
      itemsByPurchaseId[item.purchaseId].push(item);
    }
    
    // Combine purchases with their items
    const purchasesWithItems = purchases.map(purchase => ({
      ...purchase,
      items: itemsByPurchaseId[purchase.id] || [],
      itemCount: (itemsByPurchaseId[purchase.id] || []).length
    }));
    
    // Filter financial data based on user role
    const userRole = (req as any).user?.role || 'warehouse_operator';
    const filtered = filterFinancialData(purchasesWithItems, userRole);
    res.json(filtered);
  } catch (error) {
    console.error("Error fetching at-warehouse purchases:", error);
    res.status(500).json({ message: "Failed to fetch at-warehouse purchases" });
  }
});

// Get unpacked items (custom items from unpacked purchase orders that are still available)
router.get("/unpacked-items", async (req: any, res) => {
  try {
    const unpackedItems = await db
      .select()
      .from(customItems)
      .where(and(
        like(customItems.orderNumber, 'PO-%'),
        eq(customItems.status, 'available')
      ))
      .orderBy(desc(customItems.createdAt));
    
    // Filter financial data based on user role
    const userRole = req.user?.role || 'warehouse_operator';
    const filtered = filterFinancialData(unpackedItems, userRole);
    res.json(filtered);
  } catch (error) {
    console.error("Error fetching unpacked items:", error);
    res.status(500).json({ message: "Failed to fetch unpacked items" });
  }
});

// AI Classification for items using DeepSeek AI
router.post("/items/auto-classify", async (req, res) => {
  try {
    const { itemIds } = req.body;
    
    if (!itemIds || !Array.isArray(itemIds) || itemIds.length === 0) {
      return res.status(400).json({ message: "Item IDs array is required" });
    }
    
    // Fetch items from database
    const items = await db
      .select()
      .from(customItems)
      .where(inArray(customItems.id, itemIds));
    
    if (items.length === 0) {
      return res.status(404).json({ message: "No items found" });
    }
    
    // Use DeepSeek API to classify items
    const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
    if (!DEEPSEEK_API_KEY) {
      return res.status(500).json({ message: "DEEPSEEK_API_KEY not configured" });
    }
    
    // Prepare items for classification
    const itemDescriptions = items.map(item => ({
      id: item.id,
      name: item.name,
      notes: item.notes || '',
      source: item.source
    }));
    
    const prompt = `You are a shipping classification expert. Classify the following items as either "sensitive" or "general" for international shipping purposes.

Sensitive items include:
- Batteries, power banks, lithium batteries
- Liquids (perfumes, nail polish, cosmetics, oils)
- Flammable items, aerosols
- Magnets, magnetic items
- Electronics with built-in batteries
- Cosmetics with alcohol or chemicals
- Sharp objects, knives

General items include:
- Clothing, textiles
- Books, paper products
- Non-battery toys
- Home decorations
- Plastic items without batteries
- Wooden items
- Non-liquid cosmetics (powder, solid)

Items to classify:
${itemDescriptions.map((item, idx) => `${idx + 1}. ID: ${item.id}, Name: "${item.name}", Notes: "${item.notes}", Source: "${item.source}"`).join('\n')}

Respond with ONLY a JSON array where each object has "id" (number) and "classification" ("sensitive" or "general"). Example:
[{"id": 1, "classification": "sensitive"}, {"id": 2, "classification": "general"}]`;

    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 2000
      })
    });
    
    if (!response.ok) {
      throw new Error(`DeepSeek API error: ${response.statusText}`);
    }
    
    const data = await response.json();
    const aiResponse = data.choices[0]?.message?.content;
    
    if (!aiResponse) {
      throw new Error('No response from DeepSeek API');
    }
    
    // Parse AI response
    let classifications: Array<{ id: number; classification: string }>;
    try {
      // Extract JSON from response (in case AI adds explanation text)
      const jsonMatch = aiResponse.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error('No JSON array found in AI response');
      }
      classifications = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.error('Failed to parse AI response:', aiResponse);
      throw new Error('Failed to parse AI classification response');
    }
    
    // Update items in database
    let updatedCount = 0;
    for (const classif of classifications) {
      const itemId = classif.id;
      const classification = classif.classification === 'sensitive' ? 'sensitive' : 'general';
      
      await db
        .update(customItems)
        .set({ 
          classification,
          updatedAt: new Date()
        })
        .where(eq(customItems.id, itemId));
      
      updatedCount++;
    }
    
    res.json({
      message: `Successfully classified ${updatedCount} item(s)`,
      classified: updatedCount,
      classifications
    });
    
  } catch (error) {
    console.error("Error in AI classification:", error);
    res.status(500).json({ 
      message: "AI classification failed",
      error: error instanceof Error ? error.message : "Unknown error"
    });
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
router.get("/purchases/:id", async (req: any, res) => {
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
    
    const purchaseWithItems = { ...purchase, items };
    
    // Filter financial data based on user role
    const userRole = req.user?.role || 'warehouse_operator';
    const filtered = filterFinancialData(purchaseWithItems, userRole);
    res.json(filtered);
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
        unitType: item.unitType || 'selling',
        quantityInSellingUnits: parseInt(item.quantityInSellingUnits) || parseInt(item.quantity) || 1,
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
    
    // Get current purchase to check consolidation field
    const [currentPurchase] = await db
      .select()
      .from(importPurchases)
      .where(eq(importPurchases.id, purchaseId))
      .limit(1);
    
    if (!currentPurchase) {
      return res.status(404).json({ message: "Purchase not found" });
    }
    
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
          unitType: item.unitType || 'selling',
          quantityInSellingUnits: parseInt(item.quantityInSellingUnits) || parseInt(item.quantity) || 1,
          createdAt: new Date(),
          updatedAt: new Date()
        }));
        
        await db.insert(purchaseItems).values(itemsToInsert);
      }
    }
    
    // AUTO-CREATE SHIPMENT: If status changed to 'delivered' and consolidation is 'No'
    if (req.body.status === 'delivered' && currentPurchase.consolidation === 'No') {
      // Check if a shipment already exists for this purchase
      const existingShipments = await db
        .select()
        .from(shipments)
        .where(like(shipments.notes, `%PO #${purchaseId}%`))
        .limit(1);
      
      if (existingShipments.length === 0) {
        // Create a new shipment for this purchase
        const itemsList = await db
          .select()
          .from(purchaseItems)
          .where(eq(purchaseItems.purchaseId, purchaseId));
        
        const totalWeight = itemsList.reduce((sum, item) => sum + (parseFloat(item.weight) || 0), 0);
        const totalUnits = itemsList.reduce((sum, item) => sum + item.quantity, 0);
        
        await db.insert(shipments).values({
          consolidationId: null,
          carrier: 'Direct Supplier',
          trackingNumber: currentPurchase.trackingNumber || `PO-${purchaseId}`,
          origin: currentPurchase.location || 'Supplier',
          destination: 'Warehouse',
          status: 'delivered',
          receivingStatus: null,
          shippingCost: currentPurchase.shippingCost || '0',
          shippingCostCurrency: currentPurchase.purchaseCurrency || 'USD',
          totalWeight: totalWeight.toString(),
          totalUnits: totalUnits,
          estimatedDelivery: currentPurchase.estimatedArrival,
          deliveredAt: new Date(),
          notes: `Auto-created from Purchase Order PO #${purchaseId} - ${currentPurchase.supplier}`,
          createdAt: new Date(),
          updatedAt: new Date()
        });
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
    
    // Get current purchase to check consolidation field
    const [currentPurchase] = await db
      .select()
      .from(importPurchases)
      .where(eq(importPurchases.id, purchaseId))
      .limit(1);
    
    if (!currentPurchase) {
      return res.status(404).json({ message: "Purchase not found" });
    }
    
    const [updated] = await db
      .update(importPurchases)
      .set({ status, updatedAt: new Date() })
      .where(eq(importPurchases.id, purchaseId))
      .returning();
    
    // AUTO-CREATE SHIPMENT: If status changed to 'delivered' and consolidation is 'No'
    if (status === 'delivered' && currentPurchase.consolidation === 'No') {
      // Check if a shipment already exists for this purchase
      const existingShipments = await db
        .select()
        .from(shipments)
        .where(like(shipments.notes, `%PO #${purchaseId}%`))
        .limit(1);
      
      if (existingShipments.length === 0) {
        // Create a new shipment for this purchase
        const items = await db
          .select()
          .from(purchaseItems)
          .where(eq(purchaseItems.purchaseId, purchaseId));
        
        const totalWeight = items.reduce((sum, item) => sum + (parseFloat(item.weight) || 0), 0);
        const totalUnits = items.reduce((sum, item) => sum + item.quantity, 0);
        
        await db.insert(shipments).values({
          consolidationId: null,
          carrier: 'Direct Supplier',
          trackingNumber: currentPurchase.trackingNumber || `PO-${purchaseId}`,
          origin: currentPurchase.location || 'Supplier',
          destination: 'Warehouse',
          status: 'delivered',
          receivingStatus: null,
          shippingCost: currentPurchase.shippingCost || '0',
          shippingCostCurrency: currentPurchase.purchaseCurrency || 'USD',
          totalWeight: totalWeight.toString(),
          totalUnits: totalUnits,
          estimatedDelivery: currentPurchase.estimatedArrival,
          deliveredAt: new Date(),
          notes: `Auto-created from Purchase Order PO #${purchaseId} - ${currentPurchase.supplier}`,
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }
    }
    
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
    
    // Get items for each consolidation with full details
    const consolidationsWithItems = await Promise.all(
      consolidationList.map(async (consolidation) => {
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
            trackingNumber: customItems.trackingNumber,
            addedAt: consolidationItems.createdAt,
          })
          .from(consolidationItems)
          .innerJoin(customItems, eq(consolidationItems.itemId, customItems.id))
          .where(eq(consolidationItems.consolidationId, consolidation.id))
          .orderBy(consolidationItems.createdAt);
        
        return {
          ...consolidation,
          items,
          itemCount: items.length
        };
      })
    );
    
    // Filter financial data based on user role
    const userRole = (req as any).user?.role || 'warehouse_operator';
    const filtered = filterFinancialData(consolidationsWithItems, userRole);
    res.json(filtered);
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
    
    // Filter financial data based on user role
    const userRole = (req as any).user?.role || 'warehouse_operator';
    const filtered = filterFinancialData(items, userRole);
    res.json(filtered);
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
router.get("/custom-items", async (req: any, res) => {
  try {
    const result = await db
      .select()
      .from(customItems)
      .where(eq(customItems.status, 'available'))
      .orderBy(desc(customItems.createdAt));
    // Filter financial data based on user role
    const userRole = req.user?.role || 'warehouse_operator';
    const filtered = filterFinancialData(result, userRole);
    res.json(filtered);
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

// AI Auto-Classification using DeepSeek AI
// Classifies items as "general" or "sensitive" goods for China transport
// Sensitive goods require special handling (UPS, railway restrictions)
router.post("/items/auto-classify", async (req, res) => {
  try {
    const { itemIds } = req.body;
    
    if (!itemIds || !Array.isArray(itemIds) || itemIds.length === 0) {
      return res.status(400).json({ message: "Item IDs are required" });
    }
    
    // Get all items to classify
    const items = await db
      .select()
      .from(customItems)
      .where(inArray(customItems.id, itemIds));
    
    if (items.length === 0) {
      return res.status(404).json({ message: "No items found" });
    }
    
    // Check for DeepSeek API key
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ message: "DeepSeek API key not configured" });
    }
    
    // Initialize DeepSeek client (OpenAI-compatible API)
    const deepseek = new OpenAI({
      apiKey: apiKey,
      baseURL: "https://api.deepseek.com"
    });
    
    // Prepare items for classification
    const itemsForClassification = items.map(item => ({
      id: item.id,
      name: item.name,
      category: item.category || 'unknown',
      notes: item.notes || ''
    }));
    
    // Build the prompt for DeepSeek
    const prompt = `You are an expert in international shipping and customs regulations from China to Europe.

Classify each product as either "general" or "sensitive" goods for transport from China.

**SENSITIVE GOODS** (require special handling, restrictions on UPS/air freight):
- Liquids, gels, pastes, creams (nail polish, gel polish, adhesives, oils, lotions)
- Flammable or combustible materials
- Batteries and electronics with batteries
- Magnetic items
- Sharp objects (nail files, scissors, tools)
- Pressurized containers (aerosols, sprays)
- Chemicals, solvents, acetone-based products
- Powders in large quantities
- Items with strong odors
- UV/LED equipment with specific voltage requirements
- Any beauty products containing restricted chemicals

**GENERAL GOODS** (can ship via standard methods - UPS, railway, sea, parcel):
- Plastic/acrylic accessories and decorations
- Dry nail art supplies (rhinestones, stickers, decals, tips)
- Brushes and applicators without liquids
- Display stands and organizers
- Fabric and textile items
- Paper products
- Standard tools without sharp edges
- Packaging materials

For each item, analyze the name, category, and notes to determine classification.

Items to classify:
${JSON.stringify(itemsForClassification, null, 2)}

Return ONLY a valid JSON array with classifications:
[
  {"id": <item_id>, "classification": "general" | "sensitive", "reason": "<brief reason>", "shippingRecommendation": "<UPS/Railway/Sea/Parcel or special handling needed>"}
]`;

    const completion = await deepseek.chat.completions.create({
      model: 'deepseek-chat',
      messages: [
        {
          role: 'system',
          content: 'You are an expert logistics consultant specializing in China-to-Europe shipping. You classify goods accurately based on shipping regulations and customs requirements. Always respond with valid JSON only.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.2,
      max_tokens: 2000
    });
    
    const responseText = completion.choices[0]?.message?.content?.trim();
    if (!responseText) {
      throw new Error('No response from DeepSeek AI');
    }
    
    // Extract JSON from response
    const jsonMatch = responseText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.error('Invalid AI response format:', responseText);
      throw new Error('Invalid classification format from AI');
    }
    
    const classifications = JSON.parse(jsonMatch[0]);
    
    // Update items in database with classifications
    let updatedCount = 0;
    for (const classification of classifications) {
      if (classification.id && classification.classification) {
        await db
          .update(customItems)
          .set({ 
            classification: classification.classification,
            notes: items.find(i => i.id === classification.id)?.notes 
              ? `${items.find(i => i.id === classification.id)?.notes}\n[AI: ${classification.reason}]`
              : `[AI: ${classification.reason}]`,
            updatedAt: new Date()
          })
          .where(eq(customItems.id, classification.id));
        updatedCount++;
      }
    }
    
    res.json({
      success: true,
      message: `Successfully classified ${updatedCount} items using AI`,
      classifications: classifications,
      summary: {
        total: items.length,
        classified: updatedCount,
        general: classifications.filter((c: any) => c.classification === 'general').length,
        sensitive: classifications.filter((c: any) => c.classification === 'sensitive').length
      }
    });
    
  } catch (error: any) {
    console.error("Error in AI auto-classification:", error);
    res.status(500).json({ 
      message: error.message || "Failed to auto-classify items",
      error: process.env.NODE_ENV !== 'production' ? error.toString() : undefined
    });
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
    
    // Filter financial data based on user role
    const userRole = (req as any).user?.role || 'warehouse_operator';
    const filtered = filterFinancialData(filteredPending, userRole);
    res.json(filtered);
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
    
    // Filter financial data based on user role
    const userRole = (req as any).user?.role || 'warehouse_operator';
    const filtered = filterFinancialData(filteredResults, userRole);
    res.json(filtered);
  } catch (error) {
    console.error("Error searching shipments:", error);
    res.status(500).json({ message: "Failed to search shipments" });
  }
});

// Helper function to backfill endTrackingNumbers from legacy endTrackingNumber
const backfillTrackingNumbers = (shipment: any) => {
  // If endTrackingNumbers array is empty/null but legacy field has data, backfill it
  if ((!shipment.endTrackingNumbers || shipment.endTrackingNumbers.length === 0) && shipment.endTrackingNumber) {
    return {
      ...shipment,
      endTrackingNumbers: [shipment.endTrackingNumber]
    };
  }
  return shipment;
};

// NOTE: Specific routes like /shipments/receivable MUST come before parameterized /shipments/:id route

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
        
        // Backfill tracking numbers from legacy field
        const backfilledShipment = backfillTrackingNumbers(shipment);
        
        return {
          ...backfilledShipment,
          items,
          itemCount
        };
      })
    );
    
    // Filter financial data based on user role
    const userRole = (req as any).user?.role || 'warehouse_operator';
    const filtered = filterFinancialData(shipmentsWithDetails, userRole);
    res.json(filtered);
  } catch (error) {
    console.error("Error fetching shipments:", error);
    res.status(500).json({ message: "Failed to fetch shipments" });
  }
});

// Search shipments by tracking numbers
router.post("/shipments/search-by-tracking", async (req, res) => {
  try {
    // Define Zod schema for validation
    const searchSchema = z.object({
      trackingNumbers: z.array(z.string()).min(1).max(100)
    });
    
    // Validate request body
    const validationResult = searchSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ 
        message: "Invalid request body",
        errors: validationResult.error.errors 
      });
    }
    
    const { trackingNumbers } = validationResult.data;
    
    // Get all shipments with status 'at_warehouse'
    const warehouseShipments = await db
      .select()
      .from(shipments)
      .where(eq(shipments.status, 'at_warehouse'))
      .orderBy(desc(shipments.createdAt));
    
    if (warehouseShipments.length === 0) {
      return res.json([]);
    }
    
    // Create a set of tracking numbers for efficient lookup
    const trackingSet = new Set(trackingNumbers.map(t => t.trim().toLowerCase()));
    
    // Process each shipment to find matches
    const shipmentsWithMatches = await Promise.all(
      warehouseShipments.map(async (shipment) => {
        let matchCount = 0;
        const matchedTrackingNumbers = new Set<string>();
        
        // Check if main tracking number matches
        if (trackingSet.has(shipment.trackingNumber.toLowerCase())) {
          matchCount++;
          matchedTrackingNumbers.add(shipment.trackingNumber);
        }
        
        // Check if end tracking numbers match (if exists) - handle both array and legacy single value
        if (shipment.endTrackingNumbers && Array.isArray(shipment.endTrackingNumbers)) {
          for (const endTracking of shipment.endTrackingNumbers) {
            if (endTracking && trackingSet.has(endTracking.toLowerCase())) {
              matchCount++;
              matchedTrackingNumbers.add(endTracking);
            }
          }
        } else if (shipment.endTrackingNumber && trackingSet.has(shipment.endTrackingNumber.toLowerCase())) {
          // Legacy single tracking number support
          matchCount++;
          matchedTrackingNumbers.add(shipment.endTrackingNumber);
        }
        
        // Note: shipments table doesn't have a trackingNumbers JSONB field
        // Main tracking is in trackingNumber field, end tracking in endTrackingNumbers array
        
        // Get related items if consolidation exists
        let relatedItemMatches = 0;
        if (shipment.consolidationId) {
          // Get purchase items through consolidation
          const purchaseItemsWithTracking = await db
            .select({
              trackingNumber: purchaseItems.trackingNumber
            })
            .from(consolidationItems)
            .innerJoin(purchaseItems, eq(consolidationItems.itemId, purchaseItems.id))
            .where(and(
              eq(consolidationItems.consolidationId, shipment.consolidationId),
              eq(consolidationItems.itemType, 'purchase')
            ));
          
          // Get custom items through consolidation
          const customItemsWithTracking = await db
            .select({
              trackingNumber: customItems.trackingNumber
            })
            .from(consolidationItems)
            .innerJoin(customItems, eq(consolidationItems.itemId, customItems.id))
            .where(and(
              eq(consolidationItems.consolidationId, shipment.consolidationId),
              eq(consolidationItems.itemType, 'custom')
            ));
          
          // Check matches in related items
          const allRelatedItems = [...purchaseItemsWithTracking, ...customItemsWithTracking];
          for (const item of allRelatedItems) {
            if (item.trackingNumber && trackingSet.has(item.trackingNumber.toLowerCase())) {
              relatedItemMatches++;
              matchedTrackingNumbers.add(item.trackingNumber);
            }
          }
        }
        
        matchCount += relatedItemMatches;
        
        // Only include shipments with at least one match
        if (matchCount > 0) {
          return {
            id: shipment.id,
            status: shipment.status,
            carrier: shipment.carrier,
            trackingNumbers: shipment.endTrackingNumbers || [],
            mainTrackingNumber: shipment.trackingNumber,
            endTrackingNumber: shipment.endTrackingNumber, // Legacy field for backward compatibility
            endTrackingNumbers: shipment.endTrackingNumbers || [],
            matchCount,
            matchedTrackingNumbers: Array.from(matchedTrackingNumbers),
            consolidationId: shipment.consolidationId,
            origin: shipment.origin,
            destination: shipment.destination,
            shipmentName: shipment.shipmentName,
            estimatedDelivery: shipment.estimatedDelivery,
            createdAt: shipment.createdAt
          };
        }
        
        return null;
      })
    );
    
    // Filter out null results and sort by matchCount
    const matchingShipments = shipmentsWithMatches
      .filter(s => s !== null)
      .sort((a, b) => b!.matchCount - a!.matchCount);
    
    res.json(matchingShipments);
  } catch (error) {
    console.error("Error searching shipments by tracking:", error);
    res.status(500).json({ message: "Failed to search shipments by tracking numbers" });
  }
});

// Helper function to extract country code from origin string
const extractCountryCode = (origin: string): string => {
  const countryMap: Record<string, string> = {
    'china': 'CN',
    'usa': 'US',
    'united states': 'US',
    'uk': 'GB',
    'united kingdom': 'GB',
    'germany': 'DE',
    'czech republic': 'CZ',
    'france': 'FR',
    'italy': 'IT',
    'spain': 'ES',
    'poland': 'PL',
    'vietnam': 'VN',
    'japan': 'JP',
    'korea': 'KR',
    'taiwan': 'TW',
    'hong kong': 'HK'
  };
  
  const lowerOrigin = origin.toLowerCase();
  for (const [country, code] of Object.entries(countryMap)) {
    if (lowerOrigin.includes(country)) {
      return code;
    }
  }
  
  // Try to extract first word as country abbreviation
  const firstWord = origin.split(',')[0].trim().toUpperCase();
  if (firstWord.length === 2) {
    return firstWord;
  }
  
  return 'XX';
};

// Helper function to extract shipment type code
const extractShipmentTypeCode = (shipmentType: string): string => {
  const lowerType = shipmentType.toLowerCase();
  
  if (lowerType.includes('express')) return 'EXPRESS';
  if (lowerType.includes('air')) return 'AIR';
  if (lowerType.includes('sea')) return 'SEA';
  if (lowerType.includes('railway') || lowerType.includes('rail')) return 'RAIL';
  
  return 'GEN';
};

// Helper function to generate category word using AI
const generateCategoryWord = async (itemsList: any[]): Promise<string> => {
  if (itemsList.length === 0) {
    return 'MixedGoods';
  }
  
  // For single item, use simplified name
  if (itemsList.length === 1) {
    const itemName = itemsList[0].name || 'Item';
    // Convert to PascalCase single word
    return itemName
      .split(/[\s\-_]+/)
      .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join('')
      .replace(/[^a-zA-Z]/g, '')
      .substring(0, 20);
  }
  
  // For 2+ items, use DeepSeek AI to generate category word
  const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
  if (!DEEPSEEK_API_KEY) {
    console.warn('DEEPSEEK_API_KEY not configured, falling back to basic categorization');
    return 'MixedGoods';
  }
  
  try {
    // Prepare item list for AI
    const itemDescriptions = itemsList
      .slice(0, 20)
      .map(item => `${item.name} (Qty: ${item.quantity || 1})`)
      .join('\n');
    
    // Call DeepSeek API
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: 'You are a logistics categorization assistant. Generate a single concise category word (PascalCase, max 20 characters) that best describes the cargo. Use industry terms like: NailSupplies, Electronics, BeautyProducts, OfficeGoods, Textiles, Automotive, etc.'
          },
          {
            role: 'user',
            content: `Categorize these ${itemsList.length} items into ONE word (PascalCase):\n\n${itemDescriptions}\n\nProvide ONLY the category word, no explanation.`
          }
        ],
        temperature: 0.2,
        max_tokens: 10
      })
    });
    
    if (!response.ok) {
      throw new Error(`DeepSeek API error: ${response.status}`);
    }
    
    const data = await response.json();
    const categoryWord = data.choices?.[0]?.message?.content?.trim();
    
    if (categoryWord && categoryWord.length > 0) {
      // Clean and format the category word
      return categoryWord
        .replace(/^["']|["']$/g, '')
        .replace(/[^a-zA-Z]/g, '')
        .substring(0, 20);
    }
    
    return 'MixedGoods';
  } catch (error) {
    console.error('Error generating category word:', error);
    return 'MixedGoods';
  }
};

// Main function to generate structured shipment name
// Format: CN-AIR-NailSupplies-2025
const generateAIShipmentName = async (
  consolidationId: number | null, 
  items?: any[],
  origin?: string,
  shipmentType?: string
) => {
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
    
    // Extract components for structured name
    const countryCode = extractCountryCode(origin || 'Unknown');
    const typeCode = extractShipmentTypeCode(shipmentType || 'general');
    const categoryWord = await generateCategoryWord(itemsList);
    const year = new Date().getFullYear();
    
    // Build structured name: CN-AIR-NailSupplies-2025
    return `${countryCode}-${typeCode}-${categoryWord}-${year}`;
    
  } catch (error) {
    console.error('Error generating AI shipment name:', error);
    // Fallback naming
    const year = new Date().getFullYear();
    return `XX-GEN-Shipment-${year}`;
  }
};

// Create shipment (optimized for Quick Ship and regular creation)
router.post("/shipments", async (req, res) => {
  try {
    // Quick Ship optimization - generate tracking number if empty
    const isQuickShip = !req.body.trackingNumber || req.body.trackingNumber === '';
    const trackingNumber = isQuickShip 
      ? `QS-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`
      : req.body.trackingNumber;
    
    // Generate AI name if not provided (based on structured format)
    let shipmentName = req.body.shipmentName;
    if (!shipmentName || shipmentName.trim() === '') {
      shipmentName = await generateAIShipmentName(
        req.body.consolidationId,
        req.body.items,
        req.body.origin,
        req.body.shipmentType || req.body.shippingMethod
      );
    }
    
    // Handle both new array format and legacy single value for tracking numbers
    let endTrackingNumbers = req.body.endTrackingNumbers;
    if (!endTrackingNumbers && req.body.endTrackingNumber) {
      // Migrate legacy single value to array
      endTrackingNumbers = [req.body.endTrackingNumber];
    }
    
    const shipmentData = {
      consolidationId: req.body.consolidationId,
      carrier: req.body.carrier || 'Standard Carrier',
      trackingNumber: trackingNumber,
      endCarrier: req.body.endCarrier || null,
      endTrackingNumber: req.body.endTrackingNumber || null, // Keep legacy field for compatibility
      endTrackingNumbers: endTrackingNumbers || null,
      shipmentName: shipmentName,
      shipmentType: req.body.shipmentType || req.body.shippingMethod || null,
      origin: req.body.origin,
      destination: req.body.destination,
      shippingCost: req.body.shippingCost || 0,
      shippingCostCurrency: req.body.shippingCostCurrency || 'USD',
      insuranceValue: req.body.insuranceValue || 0,
      totalUnits: req.body.totalUnits || 1,
      unitType: req.body.unitType || 'packages',
      notes: isQuickShip ? 'Quick shipped - tracking can be updated later' : (req.body.notes || null),
      status: isQuickShip ? "in transit" : "pending", // Quick Ship goes directly to in transit
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    // Use transaction for atomicity and speed
    const result = await db.transaction(async (tx) => {
      const [shipment] = await tx.insert(shipments).values(shipmentData).returning();
      
      // Update consolidation status to "shipped" in the same transaction
      if (req.body.consolidationId) {
        await tx
          .update(consolidations)
          .set({ status: "shipped", updatedAt: new Date() })
          .where(eq(consolidations.id, req.body.consolidationId));
      }
      
      return shipment;
    });
    
    res.json(result);
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

// Update shipment (full update)
router.put("/shipments/:id", async (req, res) => {
  try {
    const shipmentId = parseInt(req.params.id);
    
    // Generate AI name if not provided
    let shipmentName = req.body.shipmentName;
    if (!shipmentName || shipmentName.trim() === '') {
      shipmentName = await generateAIShipmentName(
        req.body.consolidationId,
        req.body.items,
        req.body.origin,
        req.body.shipmentType || req.body.shippingMethod
      );
    }
    
    // Handle both new array format and legacy single value for tracking numbers
    let endTrackingNumbers = req.body.endTrackingNumbers;
    if (!endTrackingNumbers && req.body.endTrackingNumber) {
      // Migrate legacy single value to array
      endTrackingNumbers = [req.body.endTrackingNumber];
    }
    
    const updateData = {
      carrier: req.body.carrier || 'Standard Carrier',
      trackingNumber: req.body.trackingNumber,
      endCarrier: req.body.endCarrier || null,
      endTrackingNumber: req.body.endTrackingNumber || null, // Keep legacy field for compatibility
      endTrackingNumbers: endTrackingNumbers || null,
      shipmentName: shipmentName,
      shipmentType: req.body.shipmentType || req.body.shippingMethod,
      origin: req.body.origin,
      destination: req.body.destination,
      shippingCost: req.body.shippingCost?.toString() || '0',
      shippingCostCurrency: req.body.shippingCostCurrency || 'USD',
      shippingMethod: req.body.shippingMethod || req.body.shipmentType,
      notes: req.body.notes || null,
      totalWeight: req.body.totalWeight?.toString() || null,
      totalUnits: req.body.totalUnits || null,
      unitType: req.body.unitType || null,
      updatedAt: new Date()
    };
    
    const [updated] = await db
      .update(shipments)
      .set(updateData)
      .where(eq(shipments.id, shipmentId))
      .returning();
    
    if (!updated) {
      return res.status(404).json({ message: "Shipment not found" });
    }
    
    // Get items associated with the shipment's consolidation
    let items: Array<{
      id: number;
      name: string;
      quantity: number | null;
      weight: string | null;
      trackingNumber: string | null;
      unitPrice: string | null;
    }> = [];
    
    if (updated.consolidationId) {
      items = await db
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
        .where(eq(consolidationItems.consolidationId, updated.consolidationId));
    }
    
    res.json({ ...updated, items, itemCount: items.length });
  } catch (error) {
    console.error("Error updating shipment:", error);
    res.status(500).json({ message: "Failed to update shipment" });
  }
});

// Generate name for new shipment (used during creation)
router.post("/shipments/generate-name", async (req, res) => {
  try {
    const { consolidationId, origin, shipmentType } = req.body;
    
    if (!consolidationId) {
      return res.status(400).json({ message: "Consolidation ID required" });
    }
    
    // Fetch consolidation to get warehouse if origin not provided
    let finalOrigin = origin;
    if (!finalOrigin && consolidationId) {
      const [consolidation] = await db
        .select()
        .from(consolidations)
        .where(eq(consolidations.id, consolidationId));
      
      finalOrigin = consolidation?.warehouse || 'Unknown';
    }
    
    // Generate name based on consolidation items with structured format
    const name = await generateAIShipmentName(
      consolidationId,
      undefined,
      finalOrigin,
      shipmentType || 'general'
    );
    
    res.json({ name });
  } catch (error) {
    console.error("Error generating shipment name:", error);
    res.status(500).json({ message: "Failed to generate shipment name" });
  }
});

// Regenerate shipment name endpoint
router.post("/shipments/:id/regenerate-name", async (req, res) => {
  try {
    const shipmentId = parseInt(req.params.id);
    
    // Get the shipment's data including origin and shipmentType
    const [shipment] = await db
      .select()
      .from(shipments)
      .where(eq(shipments.id, shipmentId));
    
    if (!shipment) {
      return res.status(404).json({ message: "Shipment not found" });
    }
    
    // Generate new name based on items with structured format
    const newName = await generateAIShipmentName(
      shipment.consolidationId,
      undefined,
      shipment.origin,
      shipment.shipmentType || 'general'
    );
    
    // Update shipment with new name
    const [updated] = await db
      .update(shipments)
      .set({ 
        shipmentName: newName,
        updatedAt: new Date()
      })
      .where(eq(shipments.id, shipmentId))
      .returning();
    
    res.json(updated);
  } catch (error) {
    console.error("Error regenerating shipment name:", error);
    res.status(500).json({ message: "Failed to regenerate shipment name" });
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

// ================ RECEIVING WORKFLOW ROUTES ================

// Start receiving a shipment (move to receiving status)
router.post("/shipments/:id/start-receiving", async (req, res) => {
  try {
    const shipmentId = parseInt(req.params.id);
    
    // Update the shipment's receiving status
    const [updated] = await db
      .update(shipments)
      .set({ 
        receivingStatus: 'receiving',
        updatedAt: new Date()
      })
      .where(eq(shipments.id, shipmentId))
      .returning();
    
    if (!updated) {
      return res.status(404).json({ message: "Shipment not found" });
    }
    
    res.json({ 
      message: "Shipment moved to receiving status",
      shipment: updated
    });
  } catch (error) {
    console.error("Error starting receiving:", error);
    res.status(500).json({ message: "Failed to start receiving process" });
  }
});

// Move shipment back to receivable status
router.post("/shipments/:id/move-back-to-receive", async (req, res) => {
  try {
    const shipmentId = parseInt(req.params.id);
    const { preserveData = false } = req.body; // Extract preserveData option
    
    // Check if shipment exists and is currently in receiving status
    const [shipment] = await db
      .select()
      .from(shipments)
      .where(eq(shipments.id, shipmentId));
    
    if (!shipment) {
      return res.status(404).json({ message: "Shipment not found" });
    }
    
    if (shipment.receivingStatus !== 'receiving') {
      return res.status(400).json({ 
        message: "Shipment is not currently in receiving status" 
      });
    }
    
    // Check if there are any receipts for this shipment
    const [existingReceipt] = await db
      .select()
      .from(receipts)
      .where(eq(receipts.shipmentId, shipmentId));
    
    if (existingReceipt) {
      // Only prevent moving back if the receipt is in progress or completed
      // Allow moving back if receipt is still in pending_verification (early stage)
      if (existingReceipt.status !== 'pending_verification') {
        return res.status(400).json({ 
          message: "Cannot move back - receiving process is already in progress. Please complete the receiving process or contact an administrator." 
        });
      }
      
      // Handle receipt based on preserveData preference
      if (!preserveData) {
        // Delete the pending receipt since we're moving back to receivable status
        await db
          .delete(receipts)
          .where(eq(receipts.id, existingReceipt.id));
      }
      // If preserveData is true, keep the receipt but we still move shipment back to receivable
    }
    
    // Update the shipment's receiving status back to null/empty (receivable)
    const [updated] = await db
      .update(shipments)
      .set({ 
        receivingStatus: null,
        updatedAt: new Date()
      })
      .where(eq(shipments.id, shipmentId))
      .returning();
    
    res.json({ 
      message: "Shipment moved back to receivable status successfully",
      shipment: updated
    });
  } catch (error) {
    console.error("Error moving shipment back to receive:", error);
    res.status(500).json({ message: "Failed to move shipment back to receivable status" });
  }
});

// Get shipments by receiving status
router.get("/shipments/by-status/:status", async (req, res) => {
  try {
    const status = req.params.status; // receiving, pending_approval, completed
    
    // Get shipments with consolidations in a single query
    const shipmentsWithStatus = await db
      .select({
        shipment: shipments,
        consolidation: consolidations
      })
      .from(shipments)
      .leftJoin(consolidations, eq(shipments.consolidationId, consolidations.id))
      .where(eq(shipments.receivingStatus, status))
      .orderBy(desc(shipments.updatedAt))
      .limit(50); // Limit results to improve performance
    
    // Get all consolidation IDs to batch-fetch items
    const consolidationIds = shipmentsWithStatus
      .map(s => s.shipment.consolidationId)
      .filter(id => id !== null);
    
    // Batch-fetch all items for all consolidations at once
    let itemsByConsolidation: Record<number, any[]> = {};
    
    if (consolidationIds.length > 0) {
      // Get all consolidation items with their related purchase/custom items using JOINs
      const allItems = await db
        .select({
          consolidationItem: consolidationItems,
          purchaseItem: purchaseItems,
          customItem: customItems
        })
        .from(consolidationItems)
        .leftJoin(purchaseItems, and(
          eq(consolidationItems.itemType, 'purchase'),
          eq(consolidationItems.itemId, purchaseItems.id)
        ))
        .leftJoin(customItems, and(
          eq(consolidationItems.itemType, 'custom'),
          eq(consolidationItems.itemId, customItems.id)
        ))
        .where(inArray(consolidationItems.consolidationId, consolidationIds));
      
      // Group items by consolidation ID
      for (const row of allItems) {
        const consId = row.consolidationItem.consolidationId;
        if (!itemsByConsolidation[consId]) {
          itemsByConsolidation[consId] = [];
        }
        
        if (row.consolidationItem.itemType === 'purchase' && row.purchaseItem) {
          itemsByConsolidation[consId].push({
            ...row.purchaseItem,
            itemType: 'purchase',
            category: (row.purchaseItem as any).category || 'General'
          });
        } else if (row.consolidationItem.itemType === 'custom' && row.customItem) {
          itemsByConsolidation[consId].push({
            ...row.customItem,
            itemType: 'custom',
            category: row.customItem.classification || 'General'
          });
        }
      }
    }
    
    // Batch-fetch items for non-consolidated purchase orders
    let itemsByShipment: Record<number, any[]> = {};
    
    // Find shipments without consolidation that have purchase orders
    const purchaseOrderShipments = shipmentsWithStatus
      .filter(s => !s.shipment.consolidationId && s.shipment.notes && s.shipment.notes.includes('Auto-created from Purchase Order PO #'))
      .map(s => ({
        shipmentId: s.shipment.id,
        notes: s.shipment.notes
      }));
    
    if (purchaseOrderShipments.length > 0) {
      // Extract purchase IDs and batch-fetch their items
      const purchaseIds: number[] = [];
      const shipmentToPurchaseMap: Record<number, number> = {};
      
      for (const { shipmentId, notes } of purchaseOrderShipments) {
        const match = notes!.match(/PO #(\d+)/);
        if (match) {
          const purchaseId = parseInt(match[1]);
          purchaseIds.push(purchaseId);
          shipmentToPurchaseMap[shipmentId] = purchaseId;
        }
      }
      
      if (purchaseIds.length > 0) {
        const allPurchaseItems = await db
          .select()
          .from(purchaseItems)
          .where(inArray(purchaseItems.purchaseId, purchaseIds));
        
        // Group items by shipment ID
        for (const item of allPurchaseItems) {
          const shipmentId = Object.keys(shipmentToPurchaseMap).find(
            sid => shipmentToPurchaseMap[parseInt(sid)] === item.purchaseId
          );
          
          if (shipmentId) {
            const sid = parseInt(shipmentId);
            if (!itemsByShipment[sid]) {
              itemsByShipment[sid] = [];
            }
            itemsByShipment[sid].push({
              ...item,
              itemType: 'purchase',
              category: (item as any).category || 'General'
            });
          }
        }
      }
    }
    
    // If fetching completed shipments, also include receipt IDs
    let receiptMap: Record<number, number> = {};
    if (status === 'completed') {
      const shipmentIds = shipmentsWithStatus.map(s => s.shipment.id);
      if (shipmentIds.length > 0) {
        const receiptsList = await db
          .select({ id: receipts.id, shipmentId: receipts.shipmentId })
          .from(receipts)
          .where(inArray(receipts.shipmentId, shipmentIds));
        
        receiptMap = receiptsList.reduce((acc, receipt) => {
          acc[receipt.shipmentId] = receipt.id;
          return acc;
        }, {} as Record<number, number>);
      }
    }
    
    // Map results with enhanced details for frontend
    const formattedShipments = shipmentsWithStatus.map(({ shipment, consolidation }) => ({
      ...shipment,
      consolidation,
      items: shipment.consolidationId 
        ? (itemsByConsolidation[shipment.consolidationId] || [])
        : (itemsByShipment[shipment.id] || []),
      receiptId: receiptMap[shipment.id] || null,
      // Expose warehouse details directly for easier frontend access
      receivingWarehouse: consolidation?.warehouse || null,
      warehouseLocation: consolidation?.location || null,
      consolidationName: consolidation?.name || null,
      shippingMethod: consolidation?.shippingMethod || shipment.shipmentType || null,
      // Provide formatted timestamps
      formattedDeliveredAt: shipment.deliveredAt ? shipment.deliveredAt.toISOString() : null,
      formattedCreatedAt: shipment.createdAt ? shipment.createdAt.toISOString() : null,
      formattedUpdatedAt: shipment.updatedAt ? shipment.updatedAt.toISOString() : null
    }));
    
    // Filter financial data based on user role
    const userRole = (req as any).user?.role || 'warehouse_operator';
    const filtered = filterFinancialData(formattedShipments, userRole);
    res.json(filtered);
  } catch (error) {
    console.error("Error fetching shipments by status:", error);
    res.status(500).json({ message: "Failed to fetch shipments" });
  }
});

// Get shipments ready for receiving (delivered or about to be delivered, not yet in receiving process)
router.get("/shipments/receivable", async (req, res) => {
  try {
    // Get shipments that are delivered or will be delivered soon, but not already being received
    const receivableShipments = await db
      .select({
        shipment: shipments,
        consolidation: consolidations
      })
      .from(shipments)
      .leftJoin(consolidations, eq(shipments.consolidationId, consolidations.id))
      .where(and(
        or(
          eq(shipments.status, 'delivered'),
          and(
            eq(shipments.status, 'in transit'),
            sql`${shipments.estimatedDelivery} <= NOW() + INTERVAL '2 days'`
          )
        ),
        or(
          isNull(shipments.receivingStatus),
          eq(shipments.receivingStatus, '')
        )
      ))
      .orderBy(desc(shipments.updatedAt));

    // Get receipts for these shipments to check status
    const shipmentIds = receivableShipments.map(r => r.shipment.id);
    let existingReceipts: any[] = [];
    
    if (shipmentIds.length > 0) {
      existingReceipts = await db
        .select()
        .from(receipts)
        .where(sql`${receipts.shipmentId} = ANY(ARRAY[${sql.raw(shipmentIds.join(','))}]::int[])`);
    }

    // Map receipts by shipment ID
    const receiptsByShipment = existingReceipts.reduce((acc, receipt) => {
      acc[receipt.shipmentId] = receipt;
      return acc;
    }, {} as Record<number, any>);

    // Format response with receipt status and items
    let formattedShipments = await Promise.all(
      receivableShipments.map(async ({ shipment, consolidation }) => {
        // Get items for each shipment's consolidation or purchase order
        let items: any[] = [];
        
        if (shipment.consolidationId) {
          // Fetch items from consolidation
          const consolidationItemList = await db
            .select()
            .from(consolidationItems)
            .where(eq(consolidationItems.consolidationId, shipment.consolidationId));

          // Fetch actual items based on type
          for (const ci of consolidationItemList) {
            if (ci.itemType === 'purchase') {
              const [item] = await db
                .select()
                .from(purchaseItems)
                .where(eq(purchaseItems.id, ci.itemId));
              if (item) {
                items.push({
                  ...item,
                  itemType: 'purchase',
                  category: (item as any).category || 'General'
                });
              }
            } else if (ci.itemType === 'custom') {
              const [item] = await db
                .select()
                .from(customItems)
                .where(eq(customItems.id, ci.itemId));
              if (item) {
                items.push({
                  ...item,
                  itemType: 'custom',
                  category: item.classification || 'General'
                });
              }
            }
          }
        } else if (shipment.notes && shipment.notes.includes('Auto-created from Purchase Order PO #')) {
          // Fetch items from purchase order for non-consolidated purchases
          const match = shipment.notes.match(/PO #(\d+)/);
          if (match) {
            const purchaseId = parseInt(match[1]);
            const purchaseItemsList = await db
              .select()
              .from(purchaseItems)
              .where(eq(purchaseItems.purchaseId, purchaseId));
            
            items = purchaseItemsList.map(item => ({
              ...item,
              itemType: 'purchase',
              category: (item as any).category || 'General'
            }));
          }
        }

        return {
          ...shipment,
          consolidation,
          items,
          receipt: receiptsByShipment[shipment.id] || null,
          receiptStatus: receiptsByShipment[shipment.id]?.status || 'not_received'
        };
      })
    );

    // Don't add mock data - only return real shipments
    // Removed mock data to fix data inconsistency issue
    /* 
    if (formattedShipments.length === 0) {
      const mockReceivableShipments = [
        {
          id: 19,
          consolidationId: 3,
          shipmentName: "Electronics Batch Q1",
          trackingNumber: "LP00123456789CN",
          carrier: "China Post",
          endCarrier: "Czech Post",
          status: "delivered",
          origin: "Guangzhou, China",
          destination: "Prague, Czech Republic",
          estimatedDelivery: "2025-01-30T00:00:00.000Z",
          actualDelivery: null,
          totalUnits: 24,
          unitType: "pieces",
          consolidation: {
            id: 3,
            name: "CNS-2025-001",
            shippingMethod: "economy_air",
            status: "shipped",
            location: "China",
            warehouse: "Guangzhou Hub"
          },
          receipt: null,
          receiptStatus: 'not_received',
          receiptId: null,
          items: [
            { id: 1, name: "Wireless Headphones", sku: "WH-001", quantity: 10, category: "Electronics" },
            { id: 2, name: "USB Charging Cable", sku: "USB-C-02", quantity: 14, category: "Accessories" }
          ],
          createdAt: "2025-01-28T00:00:00.000Z",
          updatedAt: "2025-01-30T00:00:00.000Z"
        },
        {
          id: 20,
          consolidationId: 4,
          shipmentName: "Beauty Products Winter Collection",
          trackingNumber: "EE123456789CN",
          carrier: "EMS China",
          endCarrier: "DPD",
          status: "delivered",
          origin: "Shenzhen, China",
          destination: "Prague, Czech Republic",
          estimatedDelivery: "2025-01-29T00:00:00.000Z",
          actualDelivery: null,
          totalUnits: 156,
          unitType: "items",
          consolidation: {
            id: 4,
            name: "CNS-2025-002",
            shippingMethod: "express_air",
            status: "shipped",
            location: "China",
            warehouse: "Shenzhen Distribution Center"
          },
          receipt: null,
          receiptStatus: 'not_received',
          receiptId: null,
          items: [
            { id: 3, name: "Face Cream", sku: "FC-100", quantity: 50, category: "Beauty" },
            { id: 4, name: "Lip Balm Set", sku: "LB-200", quantity: 100, category: "Beauty" },
            { id: 5, name: "Eye Serum", sku: "ES-300", quantity: 6, category: "Beauty" }
          ],
          createdAt: "2025-01-26T00:00:00.000Z",
          updatedAt: "2025-01-29T00:00:00.000Z"
        },
        {
          id: 21,
          consolidationId: 5,
          shipmentName: "Urgent Medical Supplies",
          trackingNumber: "SF9876543210CN",
          carrier: "SF Express",
          endCarrier: "DHL Express",
          status: "delivered",
          origin: "Beijing, China",
          destination: "Prague, Czech Republic",
          estimatedDelivery: "2025-01-25T00:00:00.000Z", // 6 days ago - urgent
          actualDelivery: null,
          totalUnits: 8,
          unitType: "packages",
          consolidation: {
            id: 5,
            name: "CNS-2025-003",
            shippingMethod: "express_priority",
            status: "shipped",
            location: "China",
            warehouse: "Beijing Express Terminal"
          },
          receipt: null,
          receiptStatus: 'not_received',
          receiptId: null,
          items: [
            { id: 6, name: "N95 Masks", sku: "N95-001", quantity: 5, category: "Medical" },
            { id: 7, name: "Medical Gloves", sku: "MG-002", quantity: 3, category: "Medical" }
          ],
          createdAt: "2025-01-23T00:00:00.000Z",
          updatedAt: "2025-01-25T00:00:00.000Z"
        },
        {
          id: 22,
          consolidationId: 6,
          shipmentName: "Fashion Accessories Spring",
          trackingNumber: "CP123987456CN",
          carrier: "China Post",
          endCarrier: "PPL",
          status: "delivered",
          origin: "Dongguan, China",
          destination: "Prague, Czech Republic",
          estimatedDelivery: "2025-01-28T00:00:00.000Z",
          actualDelivery: null,
          totalUnits: 89,
          unitType: "pieces",
          consolidation: {
            id: 6,
            name: "CNS-2025-004",
            shippingMethod: "standard_air",
            status: "shipped",
            location: "China",
            warehouse: "Dongguan Consolidation Hub"
          },
          receipt: null,
          receiptStatus: 'not_received',
          receiptId: null,
          items: [
            { id: 8, name: "Fashion Sunglasses", sku: "SG-101", quantity: 25, category: "Accessories" },
            { id: 9, name: "Leather Wallet", sku: "LW-202", quantity: 30, category: "Accessories" },
            { id: 10, name: "Watch Bands", sku: "WB-303", quantity: 34, category: "Accessories" }
          ],
          createdAt: "2025-01-25T00:00:00.000Z",
          updatedAt: "2025-01-28T00:00:00.000Z"
        },
        {
          id: 23,
          consolidationId: 7,
          shipmentName: "Home & Garden Tools",
          trackingNumber: "YT5555444433CN",
          carrier: "YTO Express",
          endCarrier: "Zásilkovna",
          status: "delivered",
          origin: "Yiwu, China",
          destination: "Prague, Czech Republic",
          estimatedDelivery: "2025-01-26T00:00:00.000Z", // 5 days ago - urgent
          actualDelivery: null,
          totalUnits: 45,
          unitType: "items",
          consolidation: {
            id: 7,
            name: "CNS-2025-005",
            shippingMethod: "economy_sea",
            status: "shipped",
            location: "China",
            warehouse: "Yiwu International Logistics"
          },
          receipt: null,
          receiptStatus: 'not_received',
          receiptId: null,
          items: [
            { id: 11, name: "Garden Shears", sku: "GS-401", quantity: 15, category: "Tools" },
            { id: 12, name: "Plant Pots", sku: "PP-402", quantity: 20, category: "Garden" },
            { id: 13, name: "Watering Can", sku: "WC-403", quantity: 10, category: "Garden" }
          ],
          createdAt: "2025-01-24T00:00:00.000Z",
          updatedAt: "2025-01-26T00:00:00.000Z"
        },
        {
          id: 24,
          consolidationId: 8,
          shipmentName: "Tech Components Batch A",
          trackingNumber: "4PX987654321CN",
          carrier: "4PX Express",
          endCarrier: "GLS",
          status: "delivered",
          origin: "Hangzhou, China",
          destination: "Prague, Czech Republic",
          estimatedDelivery: "2025-01-31T00:00:00.000Z",
          actualDelivery: null,
          totalUnits: 67,
          unitType: "components",
          consolidation: {
            id: 8,
            name: "CNS-2025-006",
            shippingMethod: "express_air",
            status: "shipped",
            location: "China",
            warehouse: "Hangzhou Tech Center"
          },
          receipt: null,
          receiptStatus: 'not_received',
          receiptId: null,
          items: [
            { id: 14, name: "Arduino Boards", sku: "AB-501", quantity: 40, category: "Electronics" },
            { id: 15, name: "LED Strips", sku: "LED-502", quantity: 27, category: "Electronics" }
          ],
          createdAt: "2025-01-27T00:00:00.000Z",
          updatedAt: "2025-01-31T00:00:00.000Z"
        },
        {
          id: 25,
          consolidationId: 9,
          shipmentName: "Baby Care Products",
          trackingNumber: "ZTO123456789CN",
          carrier: "ZTO Express",
          endCarrier: "Czech Post",
          status: "delivered",
          origin: "Shanghai, China",
          destination: "Prague, Czech Republic",
          estimatedDelivery: "2025-01-24T00:00:00.000Z", // 7 days ago - very urgent
          actualDelivery: null,
          totalUnits: 112,
          unitType: "items",
          consolidation: {
            id: 9,
            name: "CNS-2025-007",
            shippingMethod: "standard_air",
            status: "shipped",
            location: "China",
            warehouse: "Shanghai Distribution Center"
          },
          receipt: null,
          receiptStatus: 'not_received',
          receiptId: null,
          items: [
            { id: 16, name: "Baby Bottles", sku: "BB-601", quantity: 60, category: "Baby" },
            { id: 17, name: "Pacifiers", sku: "PF-602", quantity: 40, category: "Baby" },
            { id: 18, name: "Baby Wipes", sku: "BW-603", quantity: 12, category: "Baby" }
          ],
          createdAt: "2025-01-22T00:00:00.000Z",
          updatedAt: "2025-01-24T00:00:00.000Z"
        },
        {
          id: 26,
          consolidationId: 10,
          shipmentName: "Sports Equipment Q1",
          trackingNumber: "JT368741259CN",
          carrier: "J&T Express",
          endCarrier: "DPD",
          status: "delivered",
          origin: "Qingdao, China",
          destination: "Prague, Czech Republic",
          estimatedDelivery: "2025-01-27T00:00:00.000Z",
          actualDelivery: null,
          totalUnits: 33,
          unitType: "pieces",
          consolidation: {
            id: 10,
            name: "CNS-2025-008",
            shippingMethod: "economy_air",
            status: "shipped",
            location: "China",
            warehouse: "Qingdao Sports Hub"
          },
          receipt: null,
          receiptStatus: 'not_received',
          receiptId: null,
          items: [
            { id: 19, name: "Yoga Mats", sku: "YM-701", quantity: 20, category: "Sports" },
            { id: 20, name: "Dumbbells", sku: "DB-702", quantity: 13, category: "Sports" }
          ],
          createdAt: "2025-01-25T00:00:00.000Z",
          updatedAt: "2025-01-27T00:00:00.000Z"
        }
      ];
      
      formattedShipments = mockReceivableShipments as any;
    }
    */

    // Filter financial data based on user role
    const userRole = (req as any).user?.role || 'warehouse_operator';
    const filtered = filterFinancialData(formattedShipments, userRole);
    res.json(filtered);
  } catch (error) {
    console.error("Error fetching receivable shipments:", error);
    res.status(500).json({ message: "Failed to fetch receivable shipments" });
  }
});

// ============================================================================
// RECEIVING PAGE ENDPOINTS (for ReceivingList.tsx)
// NOTE: These specific routes MUST be before /shipments/:id route
// ============================================================================

// Get shipments ready to receive (alias for receivable)
router.get("/shipments/to-receive", async (req, res) => {
  try {
    const receivableShipments = await db
      .select({
        shipment: shipments,
        consolidation: consolidations
      })
      .from(shipments)
      .leftJoin(consolidations, eq(shipments.consolidationId, consolidations.id))
      .where(and(
        or(
          eq(shipments.status, 'delivered'),
          and(
            eq(shipments.status, 'in transit'),
            sql`${shipments.estimatedDelivery} <= NOW() + INTERVAL '2 days'`
          )
        ),
        or(
          isNull(shipments.receivingStatus),
          eq(shipments.receivingStatus, '')
        )
      ))
      .orderBy(desc(shipments.updatedAt));

    let formattedShipments = receivableShipments.map(({ shipment, consolidation }) => ({
      ...shipment,
      consolidation,
      shippingMethod: consolidation?.shippingMethod || shipment.shipmentType || null,
    }));

    // Load consolidation items for each shipment
    if (formattedShipments.length > 0) {
      const consolidationIds = formattedShipments.map(s => s.consolidationId).filter(Boolean) as number[];
      
      if (consolidationIds.length > 0) {
        // Get all consolidation items
        const allConsolidationItems = await db
          .select()
          .from(consolidationItems)
          .where(inArray(consolidationItems.consolidationId, consolidationIds));
        
        // Get all custom and purchase items
        const customItemIds = allConsolidationItems
          .filter(ci => ci.itemType === 'custom')
          .map(ci => ci.itemId);
        const purchaseItemIds = allConsolidationItems
          .filter(ci => ci.itemType === 'purchase')
          .map(ci => ci.itemId);
        
        const [customItemsData, purchaseItemsData] = await Promise.all([
          customItemIds.length > 0
            ? db.select().from(customItems).where(inArray(customItems.id, customItemIds))
            : Promise.resolve([]),
          purchaseItemIds.length > 0
            ? db.select().from(purchaseItems).where(inArray(purchaseItems.id, purchaseItemIds))
            : Promise.resolve([])
        ]);
        
        // Create lookup maps
        const customItemsMap = new Map(customItemsData.map(item => [item.id, item]));
        const purchaseItemsMap = new Map(purchaseItemsData.map(item => [item.id, item]));
        
        // Group by consolidationId with full item details
        const itemsByConsolidationId: Record<number, any[]> = {};
        for (const ci of allConsolidationItems) {
          if (!itemsByConsolidationId[ci.consolidationId]) {
            itemsByConsolidationId[ci.consolidationId] = [];
          }
          
          const itemData = ci.itemType === 'custom'
            ? customItemsMap.get(ci.itemId)
            : purchaseItemsMap.get(ci.itemId);
          
          if (itemData) {
            itemsByConsolidationId[ci.consolidationId].push({
              ...itemData,
              itemType: ci.itemType,
              consolidationItemId: ci.id
            });
          }
        }
        
        // Attach items array to each shipment
        formattedShipments = formattedShipments.map(shipment => {
          const items = shipment.consolidationId ? (itemsByConsolidationId[shipment.consolidationId] || []) : [];
          const totalQuantity = items.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0);
          return {
            ...shipment,
            items,
            itemCount: items.length,
            totalQuantity
          };
        });
      }
    }

    // Filter financial data based on user role
    const userRole = (req as any).user?.role || 'warehouse_operator';
    const filtered = filterFinancialData(formattedShipments, userRole);
    res.json(filtered);
  } catch (error) {
    console.error("Error fetching to-receive shipments:", error);
    res.status(500).json({ message: "Failed to fetch to-receive shipments" });
  }
});

// Get shipments currently being received
router.get("/shipments/receiving", async (req, res) => {
  try {
    const shipmentsWithStatus = await db
      .select({
        shipment: shipments,
        consolidation: consolidations
      })
      .from(shipments)
      .leftJoin(consolidations, eq(shipments.consolidationId, consolidations.id))
      .where(eq(shipments.receivingStatus, 'receiving'))
      .orderBy(desc(shipments.updatedAt));

    let formattedShipments = shipmentsWithStatus.map(({ shipment, consolidation }) => ({
      ...shipment,
      consolidation,
      shippingMethod: consolidation?.shippingMethod || shipment.shipmentType || null,
    }));

    // Load consolidation items for each shipment
    if (formattedShipments.length > 0) {
      const consolidationIds = formattedShipments.map(s => s.consolidationId).filter(Boolean) as number[];
      const shipmentIds = formattedShipments.map(s => s.id);
      
      if (consolidationIds.length > 0) {
        // Get all consolidation items
        const allConsolidationItems = await db
          .select()
          .from(consolidationItems)
          .where(inArray(consolidationItems.consolidationId, consolidationIds));
        
        // Get all custom and purchase items
        const customItemIds = allConsolidationItems
          .filter(ci => ci.itemType === 'custom')
          .map(ci => ci.itemId);
        const purchaseItemIds = allConsolidationItems
          .filter(ci => ci.itemType === 'purchase')
          .map(ci => ci.itemId);
        
        // Get receiving items to track received quantities
        const allReceivingItems = await db
          .select()
          .from(receiptItems)
          .leftJoin(receipts, eq(receiptItems.receiptId, receipts.id))
          .where(inArray(receipts.shipmentId, shipmentIds));
        
        const [customItemsData, purchaseItemsData] = await Promise.all([
          customItemIds.length > 0
            ? db.select().from(customItems).where(inArray(customItems.id, customItemIds))
            : Promise.resolve([]),
          purchaseItemIds.length > 0
            ? db.select().from(purchaseItems).where(inArray(purchaseItems.id, purchaseItemIds))
            : Promise.resolve([])
        ]);
        
        // Create lookup maps
        const customItemsMap = new Map(customItemsData.map(item => [item.id, item]));
        const purchaseItemsMap = new Map(purchaseItemsData.map(item => [item.id, item]));
        
        // Create map of received quantities by shipmentId and itemId
        const receivedQuantitiesMap = new Map<string, number>();
        for (const { receipt_items: ri, receipts: receipt } of allReceivingItems) {
          if (ri && receipt) {
            const key = `${receipt.shipmentId}-${ri.itemType}-${ri.itemId}`;
            const current = receivedQuantitiesMap.get(key) || 0;
            receivedQuantitiesMap.set(key, current + (ri.receivedQuantity || 0));
          }
        }
        
        // Group by consolidationId with full item details
        const itemsByConsolidationId: Record<number, any[]> = {};
        for (const ci of allConsolidationItems) {
          if (!itemsByConsolidationId[ci.consolidationId]) {
            itemsByConsolidationId[ci.consolidationId] = [];
          }
          
          const itemData = ci.itemType === 'custom'
            ? customItemsMap.get(ci.itemId)
            : purchaseItemsMap.get(ci.itemId);
          
          if (itemData) {
            itemsByConsolidationId[ci.consolidationId].push({
              ...itemData,
              itemType: ci.itemType,
              consolidationItemId: ci.id
            });
          }
        }
        
        // Attach items array to each shipment with received quantities
        formattedShipments = formattedShipments.map(shipment => {
          const items = shipment.consolidationId ? (itemsByConsolidationId[shipment.consolidationId] || []) : [];
          const itemsWithProgress = items.map((item: any) => {
            const key = `${shipment.id}-${item.itemType}-${item.id}`;
            const receivedQuantity = receivedQuantitiesMap.get(key) || 0;
            return {
              ...item,
              receivedQuantity
            };
          });
          const totalQuantity = itemsWithProgress.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0);
          return {
            ...shipment,
            items: itemsWithProgress,
            itemCount: itemsWithProgress.length,
            totalQuantity
          };
        });
      }
    }

    // Filter financial data based on user role
    const userRole = (req as any).user?.role || 'warehouse_operator';
    const filtered = filterFinancialData(formattedShipments, userRole);
    res.json(filtered);
  } catch (error) {
    console.error("Error fetching receiving shipments:", error);
    res.status(500).json({ message: "Failed to fetch receiving shipments" });
  }
});

// Get shipments in storage (pending approval or partially received with items ready to store)
router.get("/shipments/storage", async (req, res) => {
  try {
    // Get shipments with pending_approval status OR receiving status (for partial receives)
    const shipmentsWithStatus = await db
      .select({
        shipment: shipments,
        consolidation: consolidations
      })
      .from(shipments)
      .leftJoin(consolidations, eq(shipments.consolidationId, consolidations.id))
      .where(or(
        eq(shipments.receivingStatus, 'pending_approval'),
        eq(shipments.receivingStatus, 'receiving')
      ))
      .orderBy(desc(shipments.updatedAt));
    
    // For receiving status shipments, we need to check if they have items ready to store
    // (items with receivedQuantity > 0 that haven't been assigned a warehouse location yet)
    const receivingShipmentIds = shipmentsWithStatus
      .filter(s => s.shipment.receivingStatus === 'receiving')
      .map(s => s.shipment.id);
    
    let shipmentsWithStorableItems = new Set<number>();
    
    if (receivingShipmentIds.length > 0) {
      // Check for receipts with items ready to store
      const receiptsForShipments = await db
        .select({ shipmentId: receipts.shipmentId })
        .from(receipts)
        .innerJoin(receiptItems, eq(receipts.id, receiptItems.receiptId))
        .where(and(
          inArray(receipts.shipmentId, receivingShipmentIds),
          isNull(receiptItems.warehouseLocation),
          sql`${receiptItems.receivedQuantity} > 0`
        ))
        .groupBy(receipts.shipmentId);
      
      shipmentsWithStorableItems = new Set(receiptsForShipments.map(r => r.shipmentId));
    }
    
    // Filter to only include shipments that are:
    // 1. pending_approval status, OR
    // 2. receiving status WITH storable items
    const filteredShipmentsWithStatus = shipmentsWithStatus.filter(s => 
      s.shipment.receivingStatus === 'pending_approval' || 
      shipmentsWithStorableItems.has(s.shipment.id)
    );

    let formattedShipments = filteredShipmentsWithStatus.map(({ shipment, consolidation }) => ({
      ...shipment,
      consolidation,
      shippingMethod: consolidation?.shippingMethod || shipment.shipmentType || null,
      isPartiallyReceived: shipment.receivingStatus === 'receiving',
    }));

    // Load consolidation items for each shipment
    if (formattedShipments.length > 0) {
      const consolidationIds = formattedShipments.map(s => s.consolidationId).filter(Boolean) as number[];
      
      if (consolidationIds.length > 0) {
        // Get all consolidation items
        const allConsolidationItems = await db
          .select()
          .from(consolidationItems)
          .where(inArray(consolidationItems.consolidationId, consolidationIds));
        
        // Get all custom and purchase items
        const customItemIds = allConsolidationItems
          .filter(ci => ci.itemType === 'custom')
          .map(ci => ci.itemId);
        const purchaseItemIds = allConsolidationItems
          .filter(ci => ci.itemType === 'purchase')
          .map(ci => ci.itemId);
        
        const [customItemsData, purchaseItemsData] = await Promise.all([
          customItemIds.length > 0
            ? db.select().from(customItems).where(inArray(customItems.id, customItemIds))
            : Promise.resolve([]),
          purchaseItemIds.length > 0
            ? db.select().from(purchaseItems).where(inArray(purchaseItems.id, purchaseItemIds))
            : Promise.resolve([])
        ]);
        
        // Create lookup maps
        const customItemsMap = new Map(customItemsData.map(item => [item.id, item]));
        const purchaseItemsMap = new Map(purchaseItemsData.map(item => [item.id, item]));
        
        // Group by consolidationId with full item details
        const itemsByConsolidationId: Record<number, any[]> = {};
        for (const ci of allConsolidationItems) {
          if (!itemsByConsolidationId[ci.consolidationId]) {
            itemsByConsolidationId[ci.consolidationId] = [];
          }
          
          const itemData = ci.itemType === 'custom'
            ? customItemsMap.get(ci.itemId)
            : purchaseItemsMap.get(ci.itemId);
          
          if (itemData) {
            itemsByConsolidationId[ci.consolidationId].push({
              ...itemData,
              itemType: ci.itemType,
              consolidationItemId: ci.id
            });
          }
        }
        
        // Attach items array to each shipment
        formattedShipments = formattedShipments.map(shipment => {
          const items = shipment.consolidationId ? (itemsByConsolidationId[shipment.consolidationId] || []) : [];
          const totalQuantity = items.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0);
          return {
            ...shipment,
            items,
            itemCount: items.length,
            totalQuantity
          };
        });
      }
    }

    // Filter financial data based on user role
    const userRole = (req as any).user?.role || 'warehouse_operator';
    const filtered = filterFinancialData(formattedShipments, userRole);
    res.json(filtered);
  } catch (error) {
    console.error("Error fetching storage shipments:", error);
    res.status(500).json({ message: "Failed to fetch storage shipments" });
  }
});

// Get completed shipments (completed within last 2 days)
router.get("/shipments/completed", async (req, res) => {
  try {
    // Calculate date 2 days ago
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    
    const shipmentsWithStatus = await db
      .select({
        shipment: shipments,
        consolidation: consolidations
      })
      .from(shipments)
      .leftJoin(consolidations, eq(shipments.consolidationId, consolidations.id))
      .where(
        and(
          eq(shipments.receivingStatus, 'completed'),
          gte(shipments.updatedAt, twoDaysAgo)
        )
      )
      .orderBy(desc(shipments.updatedAt))
      .limit(50);

    let formattedShipments = shipmentsWithStatus.map(({ shipment, consolidation }) => ({
      ...shipment,
      consolidation,
      shippingMethod: consolidation?.shippingMethod || shipment.shipmentType || null,
      // Use updatedAt as completedAt for countdown timer in UI
      completedAt: shipment.updatedAt
    }));

    // Load consolidation items for each shipment
    if (formattedShipments.length > 0) {
      const consolidationIds = formattedShipments.map(s => s.consolidationId).filter(Boolean) as number[];
      
      if (consolidationIds.length > 0) {
        // Get all consolidation items
        const allConsolidationItems = await db
          .select()
          .from(consolidationItems)
          .where(inArray(consolidationItems.consolidationId, consolidationIds));
        
        // Get all custom and purchase items
        const customItemIds = allConsolidationItems
          .filter(ci => ci.itemType === 'custom')
          .map(ci => ci.itemId);
        const purchaseItemIds = allConsolidationItems
          .filter(ci => ci.itemType === 'purchase')
          .map(ci => ci.itemId);
        
        const [customItemsData, purchaseItemsData] = await Promise.all([
          customItemIds.length > 0
            ? db.select().from(customItems).where(inArray(customItems.id, customItemIds))
            : Promise.resolve([]),
          purchaseItemIds.length > 0
            ? db.select().from(purchaseItems).where(inArray(purchaseItems.id, purchaseItemIds))
            : Promise.resolve([])
        ]);
        
        // Create lookup maps
        const customItemsMap = new Map(customItemsData.map(item => [item.id, item]));
        const purchaseItemsMap = new Map(purchaseItemsData.map(item => [item.id, item]));
        
        // Group by consolidationId with full item details
        const itemsByConsolidationId: Record<number, any[]> = {};
        for (const ci of allConsolidationItems) {
          if (!itemsByConsolidationId[ci.consolidationId]) {
            itemsByConsolidationId[ci.consolidationId] = [];
          }
          
          const itemData = ci.itemType === 'custom'
            ? customItemsMap.get(ci.itemId)
            : purchaseItemsMap.get(ci.itemId);
          
          if (itemData) {
            itemsByConsolidationId[ci.consolidationId].push({
              ...itemData,
              itemType: ci.itemType,
              consolidationItemId: ci.id
            });
          }
        }
        
        // Attach items array to each shipment
        formattedShipments = formattedShipments.map(shipment => {
          const items = shipment.consolidationId ? (itemsByConsolidationId[shipment.consolidationId] || []) : [];
          const totalQuantity = items.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0);
          return {
            ...shipment,
            items,
            itemCount: items.length,
            totalQuantity
          };
        });
      }
    }

    // Filter financial data based on user role
    const userRole = (req as any).user?.role || 'warehouse_operator';
    const filtered = filterFinancialData(formattedShipments, userRole);
    res.json(filtered);
  } catch (error) {
    console.error("Error fetching completed shipments:", error);
    res.status(500).json({ message: "Failed to fetch completed shipments" });
  }
});

// Get archived shipments (explicitly archived OR completed more than 2 days ago)
router.get("/shipments/archived", async (req, res) => {
  try {
    // Calculate date 2 days ago
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    
    const shipmentsWithStatus = await db
      .select({
        shipment: shipments,
        consolidation: consolidations
      })
      .from(shipments)
      .leftJoin(consolidations, eq(shipments.consolidationId, consolidations.id))
      .where(
        or(
          eq(shipments.receivingStatus, 'archived'),
          and(
            eq(shipments.receivingStatus, 'completed'),
            sql`${shipments.updatedAt} < ${twoDaysAgo.toISOString()}`
          )
        )
      )
      .orderBy(desc(shipments.updatedAt))
      .limit(50);

    let formattedShipments = shipmentsWithStatus.map(({ shipment, consolidation }) => ({
      ...shipment,
      consolidation,
      shippingMethod: consolidation?.shippingMethod || shipment.shipmentType || null,
      // Use updatedAt as completedAt for countdown timer in UI
      completedAt: shipment.updatedAt
    }));

    // Load consolidation items for each shipment
    if (formattedShipments.length > 0) {
      const consolidationIds = formattedShipments.map(s => s.consolidationId).filter(Boolean) as number[];
      
      if (consolidationIds.length > 0) {
        // Get all consolidation items
        const allConsolidationItems = await db
          .select()
          .from(consolidationItems)
          .where(inArray(consolidationItems.consolidationId, consolidationIds));
        
        // Get all custom and purchase items
        const customItemIds = allConsolidationItems
          .filter(ci => ci.itemType === 'custom')
          .map(ci => ci.itemId);
        const purchaseItemIds = allConsolidationItems
          .filter(ci => ci.itemType === 'purchase')
          .map(ci => ci.itemId);
        
        const [customItemsData, purchaseItemsData] = await Promise.all([
          customItemIds.length > 0
            ? db.select().from(customItems).where(inArray(customItems.id, customItemIds))
            : Promise.resolve([]),
          purchaseItemIds.length > 0
            ? db.select().from(purchaseItems).where(inArray(purchaseItems.id, purchaseItemIds))
            : Promise.resolve([])
        ]);
        
        // Create lookup maps
        const customItemsMap = new Map(customItemsData.map(item => [item.id, item]));
        const purchaseItemsMap = new Map(purchaseItemsData.map(item => [item.id, item]));
        
        // Group by consolidationId with full item details
        const itemsByConsolidationId: Record<number, any[]> = {};
        for (const ci of allConsolidationItems) {
          if (!itemsByConsolidationId[ci.consolidationId]) {
            itemsByConsolidationId[ci.consolidationId] = [];
          }
          
          const itemData = ci.itemType === 'custom'
            ? customItemsMap.get(ci.itemId)
            : purchaseItemsMap.get(ci.itemId);
          
          if (itemData) {
            itemsByConsolidationId[ci.consolidationId].push({
              ...itemData,
              itemType: ci.itemType,
              consolidationItemId: ci.id
            });
          }
        }
        
        // Attach items array to each shipment
        formattedShipments = formattedShipments.map(shipment => {
          const items = shipment.consolidationId ? (itemsByConsolidationId[shipment.consolidationId] || []) : [];
          const totalQuantity = items.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0);
          return {
            ...shipment,
            items,
            itemCount: items.length,
            totalQuantity
          };
        });
      }
    }

    // Filter financial data based on user role
    const userRole = (req as any).user?.role || 'warehouse_operator';
    const filtered = filterFinancialData(formattedShipments, userRole);
    res.json(filtered);
  } catch (error) {
    console.error("Error fetching archived shipments:", error);
    res.status(500).json({ message: "Failed to fetch archived shipments" });
  }
});

// Get single shipment by ID with details
router.get("/shipments/:id", async (req, res) => {
  try {
    console.log(`Fetching shipment with ID: ${req.params.id}`);
    const shipmentId = parseInt(req.params.id);
    if (isNaN(shipmentId)) {
      console.log("Invalid shipment ID");
      return res.status(400).json({ message: "Invalid shipment ID" });
    }

    console.log("Querying database for shipment...");
    const [shipment] = await db
      .select({
        shipment: shipments,
        consolidation: consolidations
      })
      .from(shipments)
      .leftJoin(consolidations, eq(shipments.consolidationId, consolidations.id))
      .where(eq(shipments.id, shipmentId));

    console.log("Shipment query result:", shipment ? "Found" : "Not found");
    
    if (!shipment) {
      return res.status(404).json({ message: "Shipment not found" });
    }

    // Get shipment items from consolidation with images
    let items: any[] = [];
    if (shipment.shipment.consolidationId) {
      // First get consolidation items
      const consolidationItemsList = await db
        .select()
        .from(consolidationItems)
        .where(eq(consolidationItems.consolidationId, shipment.shipment.consolidationId));
      
      // Process each item based on its type
      for (const consItem of consolidationItemsList) {
        if (consItem.itemType === 'custom') {
          // Get custom item details
          const [customItem] = await db
            .select({
              id: customItems.id,
              name: customItems.name,
              quantity: customItems.quantity,
              weight: customItems.weight,
              trackingNumber: customItems.trackingNumber,
              unitPrice: customItems.unitPrice,
              notes: customItems.notes,
              orderNumber: customItems.orderNumber
            })
            .from(customItems)
            .where(eq(customItems.id, consItem.itemId));
          
          if (customItem) {
            // Try to find a matching product by name or SKU
            let imageUrl = null;
            let sku = null;
            
            // Extract SKU from notes or orderNumber if available
            const skuMatch = (customItem.notes || '').match(/sku[:\s]*([A-Z0-9-]+)/i) || 
                           (customItem.orderNumber || '').match(/sku[:\s]*([A-Z0-9-]+)/i);
            if (skuMatch) {
              sku = skuMatch[1];
            }
            
            // Try to find product image by name or SKU
            if (sku) {
              const [product] = await db
                .select({ imageUrl: products.imageUrl, sku: products.sku })
                .from(products)
                .where(eq(products.sku, sku));
              
              if (product) {
                imageUrl = product.imageUrl;
                sku = product.sku;
              }
            } else {
              // Try fuzzy match by name
              const [product] = await db
                .select({ imageUrl: products.imageUrl, sku: products.sku })
                .from(products)
                .where(like(products.name, `%${customItem.name.substring(0, 20)}%`))
                .limit(1);
              
              if (product) {
                imageUrl = product.imageUrl;
                sku = product.sku;
              }
            }
            
            items.push({
              ...customItem,
              sku,
              imageUrl
            });
          }
        } else if (consItem.itemType === 'purchase') {
          // Get purchase item details with image
          const [purchaseItem] = await db
            .select({
              id: purchaseItems.id,
              name: purchaseItems.name,
              sku: purchaseItems.sku,
              quantity: purchaseItems.quantity,
              weight: purchaseItems.weight,
              trackingNumber: purchaseItems.trackingNumber,
              unitPrice: purchaseItems.unitPrice,
              imageUrl: purchaseItems.imageUrl,
              notes: purchaseItems.notes
            })
            .from(purchaseItems)
            .where(eq(purchaseItems.id, consItem.itemId));
          
          if (purchaseItem) {
            // If purchase item doesn't have image, try to find from products table
            let finalImageUrl = purchaseItem.imageUrl;
            
            if (!finalImageUrl && purchaseItem.sku) {
              const [product] = await db
                .select({ imageUrl: products.imageUrl })
                .from(products)
                .where(eq(products.sku, purchaseItem.sku));
              
              if (product) {
                finalImageUrl = product.imageUrl;
              }
            }
            
            items.push({
              ...purchaseItem,
              imageUrl: finalImageUrl
            });
          }
        }
      }
    } else {
      // Non-consolidated shipment - try to get items from purchase order
      const notes = shipment.shipment.notes || '';
      const poMatch = notes.match(/PO #(\d+)/);
      
      if (poMatch) {
        const purchaseId = parseInt(poMatch[1]);
        
        // Get items from purchaseItems table
        const purchaseItemsList = await db
          .select({
            id: purchaseItems.id,
            name: purchaseItems.name,
            sku: purchaseItems.sku,
            quantity: purchaseItems.quantity,
            weight: purchaseItems.weight,
            trackingNumber: purchaseItems.trackingNumber,
            unitPrice: purchaseItems.unitPrice,
            imageUrl: purchaseItems.imageUrl,
            notes: purchaseItems.notes
          })
          .from(purchaseItems)
          .where(eq(purchaseItems.purchaseId, purchaseId));
        
        // Add items with image fallback from products table
        for (const item of purchaseItemsList) {
          let finalImageUrl = item.imageUrl;
          
          if (!finalImageUrl && item.sku) {
            const [product] = await db
              .select({ imageUrl: products.imageUrl })
              .from(products)
              .where(eq(products.sku, item.sku));
            
            if (product) {
              finalImageUrl = product.imageUrl;
            }
          }
          
          items.push({
            ...item,
            imageUrl: finalImageUrl
          });
        }
      }
    }

    // Backfill tracking numbers from legacy field before returning
    const backfilledShipment = backfillTrackingNumbers(shipment.shipment);
    
    const shipmentWithDetails = {
      ...backfilledShipment,
      consolidation: shipment.consolidation,
      items,
      itemCount: items.length
    };

    console.log("Returning full shipment data with", items.length, "items");
    // Filter financial data based on user role
    const userRole = (req as any).user?.role || 'warehouse_operator';
    const filtered = filterFinancialData(shipmentWithDetails, userRole);
    res.json(filtered);
  } catch (error) {
    console.error("Error fetching shipment:", error);
    res.status(500).json({ message: "Failed to fetch shipment", error: error instanceof Error ? error.message : "Unknown error" });
  }
});

// Start receiving process for a shipment
router.post("/receipts", async (req, res) => {
  try {
    const { 
      shipmentId, 
      consolidationId, 
      parcelCount, 
      carrier, 
      trackingNumbers,
      notes,
      receivedBy
    } = req.body;

    if (!shipmentId || !parcelCount || !carrier || !receivedBy) {
      return res.status(400).json({ 
        message: "Missing required fields: shipmentId, parcelCount, carrier, receivedBy" 
      });
    }

    // Check if receipt already exists for this shipment
    const [existingReceipt] = await db
      .select()
      .from(receipts)
      .where(eq(receipts.shipmentId, shipmentId));

    if (existingReceipt) {
      // If receipt exists (from preserved data), ensure shipment is in receiving status
      await db
        .update(shipments)
        .set({ 
          receivingStatus: 'receiving',
          updatedAt: new Date()
        })
        .where(eq(shipments.id, shipmentId));
      
      return res.json({ 
        receipt: existingReceipt,
        message: "Using existing receipt (preserved data)"
      });
    }

    // Create receipt
    const [receipt] = await db.insert(receipts).values({
      shipmentId,
      consolidationId,
      receivedBy,
      parcelCount,
      carrier,
      trackingNumbers: trackingNumbers || [],
      status: 'pending_verification',
      notes,
      receivedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();

    // Update shipment receiving status to 'receiving'
    await db
      .update(shipments)
      .set({ 
        receivingStatus: 'receiving',
        updatedAt: new Date()
      })
      .where(eq(shipments.id, shipmentId));

    // Get consolidation items for this shipment
    let itemsToReceive = [];
    if (consolidationId) {
      const consolidationItemList = await db
        .select()
        .from(consolidationItems)
        .where(eq(consolidationItems.consolidationId, consolidationId));

      // Fetch actual items based on type
      for (const ci of consolidationItemList) {
        if (ci.itemType === 'purchase') {
          const [item] = await db
            .select()
            .from(purchaseItems)
            .where(eq(purchaseItems.id, ci.itemId));
          if (item) {
            itemsToReceive.push({ ...item, itemType: 'purchase' });
          }
        } else if (ci.itemType === 'custom') {
          const [item] = await db
            .select()
            .from(customItems)
            .where(eq(customItems.id, ci.itemId));
          if (item) {
            itemsToReceive.push({ ...item, itemType: 'custom' });
          }
        }
      }
    }

    // Create receipt items
    const receiptItemsData = itemsToReceive.map(item => ({
      receiptId: receipt.id,
      itemId: item.id,
      itemType: item.itemType,
      productId: (item as any).productId || null, // Link to products table if available
      sku: (item as any).sku || null, // Store SKU for easier product matching
      expectedQuantity: item.quantity || 1,
      receivedQuantity: 0, // Will be updated during verification
      damagedQuantity: 0,
      missingQuantity: 0,
      warehouseLocation: item.itemType === 'purchase' ? (item as any).warehouseLocation : null,
      condition: 'pending',
      createdAt: new Date(),
      updatedAt: new Date()
    }));

    if (receiptItemsData.length > 0) {
      await db.insert(receiptItems).values(receiptItemsData);
    }

    res.json({ 
      receipt,
      itemCount: receiptItemsData.length,
      message: "Receipt created successfully" 
    });
  } catch (error) {
    console.error("Error creating receipt:", error);
    res.status(500).json({ message: "Failed to create receipt" });
  }
});

// Get all items pending storage from all receipts - MUST BE BEFORE /:id ROUTE
router.get("/receipts/storage", async (req, res) => {
  try {
    // Get all receipts with pending_approval or receiving status (received but not stored)
    const pendingReceipts = await db
      .select({
        receipt: receipts,
        shipment: shipments
      })
      .from(receipts)
      .leftJoin(shipments, eq(receipts.shipmentId, shipments.id))
      .where(or(
        eq(receipts.status, 'pending_approval'),
        eq(receipts.status, 'receiving')
      ))
      .orderBy(desc(receipts.createdAt));
    
    if (pendingReceipts.length === 0) {
      return res.json({
        receipts: [],
        totalItems: 0,
        totalQuantity: 0
      });
    }
    
    // Get all items for these receipts with optimized database-level filtering
    const receiptIds = pendingReceipts.map(r => r.receipt.id);
    const filteredReceiptItems = receiptIds.length > 0 ? await db
      .select()
      .from(receiptItems)
      .where(and(
        inArray(receiptItems.receiptId, receiptIds),
        isNull(receiptItems.warehouseLocation),
        // receivedQuantity already represents GOOD units (damaged units are tracked separately)
        // Filter for items with good units received (receivedQuantity > 0)
        sql`${receiptItems.receivedQuantity} > 0`,
        // Exclude items marked as completely missing
        sql`${receiptItems.status} != 'missing'`
      ))
      .orderBy(receiptItems.receiptId, receiptItems.id) : [];
    
    // Get product information and existing locations for all items at once
    const productIds = filteredReceiptItems
      .filter(item => item.productId)
      .map(item => item.productId as string);
    
    let productsInfo: any[] = [];
    let productLocationsInfo: any[] = [];
    
    if (productIds.length > 0) {
      // Get product details
      productsInfo = await db
        .select()
        .from(products)
        .where(inArray(products.id, productIds));
      
      // Get existing warehouse locations
      productLocationsInfo = await db
        .select()
        .from(productLocations)
        .where(inArray(productLocations.productId, productIds));
    }
    
    // Create maps for quick lookup
    const productsMap = Object.fromEntries(
      productsInfo.map(p => [p.id, p])
    );
    
    const locationsMap: Record<string, any[]> = {};
    productLocationsInfo.forEach(loc => {
      if (!locationsMap[loc.productId]) {
        locationsMap[loc.productId] = [];
      }
      locationsMap[loc.productId].push(loc);
    });
    
    // Fetch original item details (purchaseItems or customItems)
    const purchaseItemIds = filteredReceiptItems
      .filter(item => item.itemType === 'purchase')
      .map(item => item.itemId);
    
    const customItemIds = filteredReceiptItems
      .filter(item => item.itemType === 'custom')
      .map(item => item.itemId);
    
    let originalPurchaseItems: any[] = [];
    let originalCustomItems: any[] = [];
    
    if (purchaseItemIds.length > 0) {
      originalPurchaseItems = await db
        .select()
        .from(purchaseItems)
        .where(inArray(purchaseItems.id, purchaseItemIds));
    }
    
    if (customItemIds.length > 0) {
      originalCustomItems = await db
        .select()
        .from(customItems)
        .where(inArray(customItems.id, customItemIds));
    }
    
    // Create maps for original items
    const purchaseItemsMap = Object.fromEntries(
      originalPurchaseItems.map(item => [item.id, item])
    );
    const customItemsMap = Object.fromEntries(
      originalCustomItems.map(item => [item.id, item])
    );
    
    // Group items by receipt
    const itemsByReceipt: Record<number, any[]> = {};
    filteredReceiptItems.forEach(item => {
      if (!itemsByReceipt[item.receiptId]) {
        itemsByReceipt[item.receiptId] = [];
      }
      
      // Get original item details
      let originalItem = null;
      if (item.itemType === 'purchase') {
        originalItem = purchaseItemsMap[item.itemId];
      } else if (item.itemType === 'custom') {
        originalItem = customItemsMap[item.itemId];
      }
      
      // Enhance item with product info and locations
      const product = item.productId ? productsMap[item.productId] : null;
      const existingLocations = item.productId ? (locationsMap[item.productId] || []) : [];
      
      // receivedQuantity already represents good units (not including damaged)
      itemsByReceipt[item.receiptId].push({
        ...item,
        productName: product?.name || originalItem?.name || `Item #${item.itemId}`,
        description: originalItem?.name || originalItem?.notes || item.notes,
        sku: product?.sku || originalItem?.sku || item.sku,
        barcode: product?.barcode || item.barcode,
        imageUrl: product?.imageUrl || null,
        landingCostUnitBase: originalItem?.landingCostUnitBase || null,
        hasCompleteLandingCost: originalItem?.hasCompleteLandingCost || false,
        purchaseItemId: item.itemType === 'purchase' ? item.itemId : null,
        existingLocations: existingLocations.map(loc => ({
          id: loc.id.toString(),
          locationCode: loc.locationCode,
          locationType: loc.locationType || 'warehouse',
          quantity: loc.quantity,
          isPrimary: loc.isPrimary || false
        }))
      });
    });
    
    // Combine receipts with their items, filtering out receipts with no items ready for storage
    const receiptsWithItems = pendingReceipts
      .map(r => ({
        receipt: r.receipt,
        shipment: r.shipment,
        items: itemsByReceipt[r.receipt.id] || []
      }))
      .filter(r => r.items.length > 0); // Only include receipts that have items ready for storage
    
    // Calculate totals (receivedQuantity already represents good units)
    const totalItems = filteredReceiptItems.length;
    const totalQuantity = filteredReceiptItems.reduce((sum, item) => 
      sum + (item.receivedQuantity || 0), 0
    );
    
    const responseData = {
      receipts: receiptsWithItems,
      totalItems,
      totalQuantity
    };
    
    // Filter financial data based on user role
    const userRole = (req as any).user?.role || 'warehouse_operator';
    const filtered = filterFinancialData(responseData, userRole);
    res.json(filtered);
  } catch (error) {
    console.error("Error fetching items to store:", error);
    res.status(500).json({ message: "Failed to fetch items to store" });
  }
});

// Get recently approved receipts (last 7 days)
router.get("/receipts/recent", async (req, res) => {
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentReceipts = await db
      .select({
        id: receipts.id,
        status: receipts.status,
        receivedAt: receipts.receivedAt,
        approvedAt: receipts.approvedAt,
        approvedBy: receipts.approvedBy,
        shipmentId: receipts.shipmentId,
        parcelCount: receipts.parcelCount,
        receivedParcels: receipts.receivedParcels,
        notes: receipts.notes,
        receivedBy: receipts.receivedBy
      })
      .from(receipts)
      .where(
        and(
          eq(receipts.status, 'approved'),
          gte(receipts.receivedAt, sevenDaysAgo)
        )
      )
      .orderBy(desc(receipts.receivedAt))
      .limit(50);

    // Filter financial data based on user role
    const userRole = (req as any).user?.role || 'warehouse_operator';
    const filtered = filterFinancialData(recentReceipts, userRole);
    res.json(filtered);
  } catch (error) {
    console.error("Error fetching recent receipts:", error);
    res.status(500).json({ message: "Failed to fetch recent receipts" });
  }
});

// Get receipt with items
router.get("/receipts/:id", async (req, res) => {
  try {
    const receiptId = parseInt(req.params.id);

    const [receipt] = await db
      .select()
      .from(receipts)
      .where(eq(receipts.id, receiptId));

    if (!receipt) {
      return res.status(404).json({ message: "Receipt not found" });
    }

    // Get receipt items with actual item details
    const items = await db
      .select()
      .from(receiptItems)
      .where(eq(receiptItems.receiptId, receiptId));

    // Fetch actual item details
    const itemsWithDetails = await Promise.all(items.map(async (ri) => {
      let itemDetails = null;
      if (ri.itemType === 'purchase') {
        const [item] = await db
          .select()
          .from(purchaseItems)
          .where(eq(purchaseItems.id, ri.itemId));
        itemDetails = item;
      } else if (ri.itemType === 'custom') {
        const [item] = await db
          .select()
          .from(customItems)
          .where(eq(customItems.id, ri.itemId));
        itemDetails = item;
      }
      return { ...ri, details: itemDetails };
    }));

    // Get shipment and consolidation details
    const [shipment] = await db
      .select()
      .from(shipments)
      .where(eq(shipments.id, receipt.shipmentId));

    let consolidation = null;
    if (receipt.consolidationId) {
      const [consol] = await db
        .select()
        .from(consolidations)
        .where(eq(consolidations.id, receipt.consolidationId));
      consolidation = consol;
    }

    // Get landed cost if exists
    const [landedCost] = await db
      .select()
      .from(landedCosts)
      .where(eq(landedCosts.receiptId, receiptId));

    // Fetch landing cost allocation per item if shipment has costs
    let itemsWithLandingCosts = itemsWithDetails;
    if (shipment) {
      try {
        // Get shipment costs
        const costs = await db
          .select()
          .from(shipmentCosts)
          .where(eq(shipmentCosts.shipmentId, shipment.id));
        
        if (costs.length > 0) {
          // Calculate total costs by type
          const costsByType = costs.reduce((acc, cost) => {
            if (!acc[cost.type]) {
              acc[cost.type] = 0;
            }
            acc[cost.type] += Number(cost.amountBase || 0);
            return acc;
          }, {} as Record<string, number>);

          // Get allocation breakdown
          const allocations = await getItemAllocationBreakdown(shipment.id, costsByType);
          
          // Map allocations to receipt items
          itemsWithLandingCosts = itemsWithDetails.map(item => {
            const allocation = allocations.find((a: any) => 
              (item.itemType === 'purchase' && a.purchaseItemId === item.itemId) ||
              (item.itemType === 'custom' && a.customItemId === item.itemId)
            );
            
            if (allocation && item.details) {
              return {
                ...item,
                details: {
                  ...item.details,
                  latestLandingCost: allocation.landingCostPerUnit.toFixed(4)
                }
              };
            }
            return item;
          });
        }
      } catch (error) {
        console.error('Error calculating landing costs for receipt items:', error);
        // Continue with original items if allocation fails
      }
    }

    const receiptWithDetails = {
      ...receipt,
      items: itemsWithLandingCosts,
      shipment,
      consolidation,
      landedCost,
      photos: receipt.photos || [] // Ensure photos are included in response
    };
    
    // Filter financial data based on user role
    const userRole = (req as any).user?.role || 'warehouse_operator';
    const filtered = filterFinancialData(receiptWithDetails, userRole);
    res.json(filtered);
  } catch (error) {
    console.error("Error fetching receipt:", error);
    res.status(500).json({ message: "Failed to fetch receipt" });
  }
});

// Update receipt
router.put("/receipts/:id", async (req, res) => {
  try {
    const receiptId = parseInt(req.params.id);
    const {
      receivedBy,
      carrier,
      parcelCount,
      notes,
      items
    } = req.body;

    // Update receipt details
    const [updatedReceipt] = await db
      .update(receipts)
      .set({
        receivedBy,
        carrier,
        parcelCount,
        notes,
        updatedAt: new Date()
      })
      .where(eq(receipts.id, receiptId))
      .returning();

    if (!updatedReceipt) {
      return res.status(404).json({ message: "Receipt not found" });
    }

    // Update receipt items if provided
    if (items && items.length > 0) {
      // Delete existing receipt items
      await db
        .delete(receiptItems)
        .where(eq(receiptItems.receiptId, receiptId));

      // Insert updated receipt items
      const itemsToInsert = items.map((item: any) => ({
        receiptId,
        itemId: parseInt(item.itemId) || item.itemId,
        itemType: 'purchase',
        expectedQuantity: item.expectedQuantity || 1,
        receivedQuantity: item.receivedQuantity || 0,
        damagedQuantity: item.damagedQuantity || 0,
        missingQuantity: item.missingQuantity || 0,
        status: item.status || 'pending',
        notes: item.notes || "",
        createdAt: new Date(),
        updatedAt: new Date()
      }));

      if (itemsToInsert.length > 0) {
        await db.insert(receiptItems).values(itemsToInsert);
      }
    }

    // Fetch and return updated receipt with items
    const updatedItems = await db
      .select()
      .from(receiptItems)
      .where(eq(receiptItems.receiptId, receiptId));

    res.json({
      receipt: updatedReceipt,
      items: updatedItems,
      message: "Receipt updated successfully"
    });
  } catch (error) {
    console.error("Error updating receipt:", error);
    res.status(500).json({ message: "Failed to update receipt" });
  }
});

// NOTE: Removed duplicate endpoint - using optimized version below

// Complete verification and send for approval
router.post("/receipts/:id/verify", async (req, res) => {
  try {
    const receiptId = parseInt(req.params.id);
    const { verifiedBy, damageNotes, photos } = req.body;

    if (!verifiedBy) {
      return res.status(400).json({ message: "verifiedBy is required" });
    }

    // Update receipt status
    const [updated] = await db
      .update(receipts)
      .set({
        status: 'pending_approval',
        verifiedBy,
        verifiedAt: new Date(),
        damageNotes,
        photos,
        updatedAt: new Date()
      })
      .where(eq(receipts.id, receiptId))
      .returning();

    res.json({ 
      receipt: updated,
      message: "Verification completed, pending founder approval" 
    });
  } catch (error) {
    console.error("Error verifying receipt:", error);
    res.status(500).json({ message: "Failed to verify receipt" });
  }
});

// Calculate and save landed costs
router.post("/receipts/:id/landed-costs", async (req, res) => {
  try {
    const receiptId = parseInt(req.params.id);
    const {
      calculationMethod,
      baseCost,
      shippingCost,
      customsDuty,
      taxes,
      handlingFees,
      insuranceCost,
      currency,
      exchangeRates,
      notes
    } = req.body;

    if (!calculationMethod || !baseCost || !shippingCost) {
      return res.status(400).json({ 
        message: "Missing required fields: calculationMethod, baseCost, shippingCost" 
      });
    }

    const totalLandedCost = 
      parseFloat(baseCost) + 
      parseFloat(shippingCost) + 
      parseFloat(customsDuty || 0) + 
      parseFloat(taxes || 0) + 
      parseFloat(handlingFees || 0) + 
      parseFloat(insuranceCost || 0);

    const [landedCost] = await db.insert(landedCosts).values({
      receiptId,
      calculationMethod,
      baseCost: baseCost.toString(),
      shippingCost: shippingCost.toString(),
      customsDuty: (customsDuty || 0).toString(),
      taxes: (taxes || 0).toString(),
      handlingFees: (handlingFees || 0).toString(),
      insuranceCost: (insuranceCost || 0).toString(),
      totalLandedCost: totalLandedCost.toString(),
      currency: currency || 'USD',
      exchangeRates,
      notes,
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();

    res.json(landedCost);
  } catch (error) {
    console.error("Error calculating landed costs:", error);
    res.status(500).json({ message: "Failed to calculate landed costs" });
  }
});

// Set selling prices for items in a receipt
router.post("/receipts/:receiptId/set-prices", async (req, res) => {
  try {
    const { receiptId } = req.params;
    const { items } = req.body;
    
    if (!items || !Array.isArray(items)) {
      return res.status(400).json({ message: "Items array is required" });
    }
    
    // Validate each item has required fields
    for (const item of items) {
      if (!item.sku && !item.productId) {
        return res.status(400).json({ message: "Each item must have either SKU or productId" });
      }
    }
    
    const updatedItems = [];
    const errors = [];
    
    for (const item of items) {
      try {
        // Find the product by SKU or productId
        let product;
        if (item.productId) {
          [product] = await db
            .select()
            .from(products)
            .where(eq(products.id, item.productId));
        } else if (item.sku) {
          [product] = await db
            .select()
            .from(products)
            .where(eq(products.sku, item.sku));
        }
        
        if (!product) {
          errors.push({
            item: item.sku || item.productId,
            error: "Product not found"
          });
          continue;
        }
        
        // Update the product with new prices
        const updateData: any = {};
        if (item.priceCzk !== undefined) updateData.priceCzk = item.priceCzk;
        if (item.priceEur !== undefined) updateData.priceEur = item.priceEur;
        if (item.priceUsd !== undefined) updateData.priceUsd = item.priceUsd;
        if (item.priceVnd !== undefined) updateData.priceVnd = item.priceVnd;
        if (item.priceCny !== undefined) updateData.priceCny = item.priceCny;
        updateData.updatedAt = new Date();
        
        await db
          .update(products)
          .set(updateData)
          .where(eq(products.id, product.id));
        
        updatedItems.push({
          productId: product.id,
          sku: product.sku,
          name: product.name,
          prices: {
            czk: item.priceCzk,
            eur: item.priceEur,
            usd: item.priceUsd,
            vnd: item.priceVnd,
            cny: item.priceCny
          }
        });
      } catch (error) {
        console.error(`Error updating product ${item.sku || item.productId}:`, error);
        errors.push({
          item: item.sku || item.productId,
          error: "Failed to update prices"
        });
      }
    }
    
    res.json({
      success: true,
      updatedCount: updatedItems.length,
      updated: updatedItems,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    console.error("Error setting prices:", error);
    res.status(500).json({ message: "Failed to set prices" });
  }
});

// Combined endpoint: Set prices and approve receipt in one atomic operation
router.post("/receipts/approve-with-prices/:id", async (req, res) => {
  try {
    const receiptId = parseInt(req.params.id);
    const { items: priceItems, approvedBy, notes } = req.body;

    // Validate receipt ID
    if (isNaN(receiptId)) {
      return res.status(400).json({ message: "Invalid receipt ID" });
    }

    if (!approvedBy) {
      return res.status(400).json({ message: "Approver name is required" });
    }

    if (!priceItems || !Array.isArray(priceItems)) {
      return res.status(400).json({ message: "Price items array is required" });
    }

    // Validate each item has required fields
    for (const item of priceItems) {
      if (!item.sku && !item.productId) {
        return res.status(400).json({ message: "Each item must have either SKU or productId" });
      }
    }

    // Check if receipt exists and is in correct status
    const [existingReceipt] = await db
      .select()
      .from(receipts)
      .where(eq(receipts.id, receiptId));

    if (!existingReceipt) {
      return res.status(404).json({ message: "Receipt not found" });
    }

    if (existingReceipt.status === 'approved') {
      return res.status(400).json({ message: "Receipt is already approved" });
    }

    if (existingReceipt.status !== 'pending_approval' && existingReceipt.status !== 'verified') {
      return res.status(400).json({ message: "Receipt must be in pending_approval or verified status to approve" });
    }

    // Perform all operations in a single transaction for atomicity
    const result = await db.transaction(async (tx) => {
      const priceUpdateResults = { updated: 0, created: 0, failed: 0 };
      const inventoryResults = { updated: 0, created: 0, failed: 0 };
      const priceErrors = [];

      // Step 1: Update/create product prices
      for (const item of priceItems) {
        try {
          // Find the product by SKU or productId
          let product;
          if (item.productId) {
            [product] = await tx
              .select()
              .from(products)
              .where(eq(products.id, item.productId));
          } else if (item.sku) {
            [product] = await tx
              .select()
              .from(products)
              .where(eq(products.sku, item.sku));
          }
          
          if (product) {
            // Update existing product prices
            const updateData: any = { updatedAt: new Date() };
            if (item.priceCzk !== undefined) updateData.priceCzk = item.priceCzk;
            if (item.priceEur !== undefined) updateData.priceEur = item.priceEur;
            if (item.priceUsd !== undefined) updateData.priceUsd = item.priceUsd;
            
            await tx
              .update(products)
              .set(updateData)
              .where(eq(products.id, product.id));
            
            priceUpdateResults.updated++;
          } else {
            // Product will be created later during inventory integration
            priceUpdateResults.created++;
          }
        } catch (error) {
          console.error(`Error updating prices for ${item.sku || item.productId}:`, error);
          priceUpdateResults.failed++;
          priceErrors.push({
            item: item.sku || item.productId,
            error: "Failed to update prices"
          });
        }
      }

      // Step 2: Update receipt status
      const existingNotes = existingReceipt.notes || '';
      const updatedNotes = notes 
        ? (existingNotes ? `${existingNotes}\n\nApproval Notes: ${notes}` : `Approval Notes: ${notes}`) 
        : existingNotes;

      const [receipt] = await tx
        .update(receipts)
        .set({
          status: 'approved',
          approvedBy: approvedBy,
          approvedAt: new Date(),
          notes: updatedNotes,
          updatedAt: new Date()
        })
        .where(eq(receipts.id, receiptId))
        .returning();

      // Step 3: Update shipment status to completed
      if (receipt.shipmentId) {
        await tx
          .update(shipments)
          .set({
            status: 'completed',
            receivingStatus: 'completed',
            updatedAt: new Date()
          })
          .where(eq(shipments.id, receipt.shipmentId));
      }

      // Step 4: Integrate with inventory system - with optimized bulk operations
      const items = await tx
        .select()
        .from(receiptItems)
        .where(eq(receiptItems.receiptId, receiptId));
      
      const inventoryItems = [];
      
      for (const item of items) {
        try {
          let originalItem: any = null;
          let unitCost = 0;
          let landingCostPerUnit = 0;
          
          // Get the original item details based on itemType
          if (item.itemType === 'purchase') {
            [originalItem] = await tx
              .select()
              .from(purchaseItems)
              .where(eq(purchaseItems.id, item.itemId));
            
            if (originalItem) {
              unitCost = parseFloat(originalItem.unitPrice || '0');
              landingCostPerUnit = parseFloat(originalItem.landingCostUnitBase || '0');
            }
          } else if (item.itemType === 'custom') {
            [originalItem] = await tx
              .select()
              .from(customItems)
              .where(eq(customItems.id, item.itemId));
            
            if (originalItem) {
              unitCost = parseFloat(originalItem.unitPrice || '0');
              landingCostPerUnit = unitCost * 1.15; // Default 15% markup for customs/shipping
            }
          }
          
          if (!originalItem) {
            console.error(`Original item not found for receipt item ${item.id}`);
            inventoryResults.failed++;
            continue;
          }
          
          // Check if product exists by SKU
          const sku = item.sku || originalItem.sku || `SKU-${item.itemId}`;
          const [existingProduct] = await tx
            .select()
            .from(products)
            .where(eq(products.sku, sku));
          
          // Find matching price item for this product
          const priceItem = priceItems.find(p => 
            p.sku === sku || p.productId === existingProduct?.id
          );
          
          if (existingProduct) {
            // Product exists - update quantity and calculate weighted average costs
            const oldQuantity = existingProduct.quantity || 0;
            const newQuantity = item.receivedQuantity;
            const totalQuantity = oldQuantity + newQuantity;
            
            // Calculate weighted average for costs
            const oldCostUsd = parseFloat(existingProduct.importCostUsd || '0');
            const oldCostCzk = parseFloat(existingProduct.importCostCzk || '0');
            const oldCostEur = parseFloat(existingProduct.importCostEur || '0');
            
            // Determine currency from purchase order if available
            let newCostUsd = unitCost;
            let newCostCzk = 0;
            let newCostEur = 0;
            
            // Get purchase order for currency info
            if (item.itemType === 'purchase' && originalItem.purchaseId) {
              const [purchase] = await tx
                .select()
                .from(importPurchases)
                .where(eq(importPurchases.id, originalItem.purchaseId));
              
              if (purchase) {
                const currency = purchase.paymentCurrency || purchase.purchaseCurrency || 'USD';
                
                if (currency === 'CZK') {
                  newCostCzk = unitCost;
                  newCostUsd = unitCost / 25; // Use standard rate
                } else if (currency === 'EUR') {
                  newCostEur = unitCost;
                  newCostUsd = unitCost * 1.1;
                } else {
                  newCostUsd = unitCost;
                }
              }
            }
            
            // Calculate weighted averages
            const avgCostUsd = totalQuantity > 0 
              ? ((oldQuantity * oldCostUsd) + (newQuantity * newCostUsd)) / totalQuantity 
              : newCostUsd;
            
            const avgCostCzk = (oldCostCzk > 0 || newCostCzk > 0) && totalQuantity > 0
              ? ((oldQuantity * oldCostCzk) + (newQuantity * newCostCzk)) / totalQuantity
              : newCostCzk || oldCostCzk;
            
            const avgCostEur = (oldCostEur > 0 || newCostEur > 0) && totalQuantity > 0
              ? ((oldQuantity * oldCostEur) + (newQuantity * newCostEur)) / totalQuantity
              : newCostEur || oldCostEur;
            
            // Update product with new quantities, costs, and prices
            const updateData: any = {
              quantity: totalQuantity,
              importCostUsd: avgCostUsd.toFixed(2),
              importCostCzk: avgCostCzk > 0 ? avgCostCzk.toFixed(2) : null,
              importCostEur: avgCostEur > 0 ? avgCostEur.toFixed(2) : null,
              latestLandingCost: landingCostPerUnit > 0 ? landingCostPerUnit.toFixed(4) : null,
              warehouseLocation: item.warehouseLocation || existingProduct.warehouseLocation,
              updatedAt: new Date()
            };

            // Add prices from price items if provided
            if (priceItem) {
              if (priceItem.priceCzk !== undefined) updateData.priceCzk = priceItem.priceCzk;
              if (priceItem.priceEur !== undefined) updateData.priceEur = priceItem.priceEur;
              if (priceItem.priceUsd !== undefined) updateData.priceUsd = priceItem.priceUsd;
            }
            
            const [updatedProduct] = await tx
              .update(products)
              .set(updateData)
              .where(eq(products.sku, sku))
              .returning();
            
            inventoryItems.push({
              action: 'updated',
              product: updatedProduct,
              oldQuantity,
              addedQuantity: newQuantity,
              newQuantity: totalQuantity
            });
            
            inventoryResults.updated++;
            
            // Record cost history
            await tx.insert(productCostHistory).values({
              productId: updatedProduct.id,
              customItemId: item.itemType === 'custom' ? item.itemId : null,
              landingCostUnitBase: (landingCostPerUnit > 0 ? landingCostPerUnit : avgCostUsd).toFixed(4),
              method: 'weighted_average',
              computedAt: new Date()
            });
            
          } else {
            // Product doesn't exist - create new
            const newProduct: any = {
              id: crypto.randomUUID(),
              sku: sku,
              name: originalItem.name,
              vietnameseName: originalItem.name,
              quantity: item.receivedQuantity,
              warehouseLocation: item.warehouseLocation,
              barcode: item.barcode,
              weight: originalItem.weight,
              importCostUsd: unitCost.toFixed(2),
              importCostCzk: null,
              importCostEur: null,
              latestLandingCost: landingCostPerUnit > 0 ? landingCostPerUnit.toFixed(4) : null,
              isActive: true,
              createdAt: new Date(),
              updatedAt: new Date(),
              supplierId: null,
              length: null,
              width: null,
              height: null
            };
            
            // Set currency-specific costs based on purchase currency
            if (item.itemType === 'purchase' && originalItem.purchaseId) {
              const [purchase] = await tx
                .select()
                .from(importPurchases)
                .where(eq(importPurchases.id, originalItem.purchaseId));
              
              if (purchase) {
                const currency = purchase.paymentCurrency || purchase.purchaseCurrency || 'USD';
                
                if (currency === 'CZK') {
                  newProduct.importCostCzk = unitCost.toFixed(2);
                  newProduct.importCostUsd = (unitCost / 25).toFixed(2);
                } else if (currency === 'EUR') {
                  newProduct.importCostEur = unitCost.toFixed(2);
                  newProduct.importCostUsd = (unitCost * 1.1).toFixed(2);
                }
                
                // Set supplier if available
                if (purchase.supplier) {
                  const [supplier] = await tx
                    .select()
                    .from(suppliers)
                    .where(eq(suppliers.name, purchase.supplier));
                  
                  if (supplier) {
                    newProduct.supplierId = supplier.id;
                  }
                }
              }
            }

            // Add prices from price items if provided
            if (priceItem) {
              if (priceItem.priceCzk !== undefined) newProduct.priceCzk = priceItem.priceCzk;
              if (priceItem.priceEur !== undefined) newProduct.priceEur = priceItem.priceEur;
              if (priceItem.priceUsd !== undefined) newProduct.priceUsd = priceItem.priceUsd;
            }
            
            // Handle dimensions if available
            if (originalItem.dimensions) {
              const dims = typeof originalItem.dimensions === 'string' 
                ? JSON.parse(originalItem.dimensions) 
                : originalItem.dimensions;
              
              newProduct.length = dims.length ? parseFloat(dims.length).toFixed(2) : null;
              newProduct.width = dims.width ? parseFloat(dims.width).toFixed(2) : null;
              newProduct.height = dims.height ? parseFloat(dims.height).toFixed(2) : null;
            }
            
            const [createdProduct] = await tx
              .insert(products)
              .values(newProduct)
              .returning();
            
            inventoryItems.push({
              action: 'created',
              product: createdProduct,
              oldQuantity: 0,
              addedQuantity: item.receivedQuantity,
              newQuantity: item.receivedQuantity
            });
            
            inventoryResults.created++;
            
            // Record initial cost history
            await tx.insert(productCostHistory).values({
              productId: createdProduct.id,
              customItemId: item.itemType === 'custom' ? item.itemId : null,
              landingCostUnitBase: (landingCostPerUnit > 0 ? landingCostPerUnit : parseFloat(newProduct.importCostUsd)).toFixed(4),
              method: 'initial_import',
              computedAt: new Date()
            });
          }
        } catch (error) {
          console.error(`Error processing inventory for item ${item.id}:`, error);
          inventoryResults.failed++;
        }
      }

      // Step 5: Apply landing cost allocations using the existing costAllocations table
      // For custom items, look up allocations directly; for purchase items, use their stored landingCostUnitBase
      if (receipt.shipmentId) {
        try {
          // Get existing cost allocations from the costAllocations table (populated by landing cost page)
          const existingAllocations = await tx
            .select()
            .from(costAllocations)
            .where(eq(costAllocations.shipmentId, receipt.shipmentId));
          
          if (existingAllocations.length > 0) {
            // Group allocations by customItemId and sum up all cost types
            const allocationsByCustomItemId = new Map<number, number>();
            for (const alloc of existingAllocations) {
              const current = allocationsByCustomItemId.get(alloc.customItemId) || 0;
              allocationsByCustomItemId.set(alloc.customItemId, current + parseFloat(alloc.amountAllocatedBase || '0'));
            }
            
            // Update product landing costs for items that have allocations
            // Track which SKUs have been updated to avoid double-counting
            const updatedSkus = new Set<string>();
            
            for (const item of items) {
              const sku = item.sku || `SKU-${item.itemId}`;
              
              // Skip if already updated this SKU
              if (updatedSkus.has(sku)) continue;
              
              let landingCostPerUnit = 0;
              
              if (item.itemType === 'custom' && item.itemId) {
                // For custom items, look up from costAllocations
                const totalAllocated = allocationsByCustomItemId.get(item.itemId) || 0;
                landingCostPerUnit = item.receivedQuantity > 0 ? totalAllocated / item.receivedQuantity : 0;
              } else if (item.itemType === 'purchase' && item.itemId) {
                // For purchase items, use the landingCostUnitBase from the purchaseItems table
                const [purchaseItem] = await tx
                  .select()
                  .from(purchaseItems)
                  .where(eq(purchaseItems.id, item.itemId));
                
                if (purchaseItem?.landingCostUnitBase) {
                  landingCostPerUnit = parseFloat(purchaseItem.landingCostUnitBase);
                }
              }
              
              if (landingCostPerUnit > 0) {
                await tx
                  .update(products)
                  .set({
                    latestLandingCost: landingCostPerUnit.toFixed(4),
                    updatedAt: new Date()
                  })
                  .where(eq(products.sku, sku));
                
                updatedSkus.add(sku);
              }
            }
          }
        } catch (allocationError) {
          console.error('Error applying landing cost allocations:', allocationError);
          // Continue with approval even if landing cost allocation fails
        }
      }

      // Step 6: Mark purchase items as delivered and update purchase order status
      const purchaseItemIds = items
        .filter(item => item.itemType === 'purchase' && item.itemId)
        .map(item => item.itemId);
      
      if (purchaseItemIds.length > 0) {
        // Mark all purchase items from this receipt as delivered
        await tx
          .update(purchaseItems)
          .set({
            status: 'delivered',
            updatedAt: new Date()
          })
          .where(inArray(purchaseItems.id, purchaseItemIds));
        
        // Get the unique purchase IDs to check if all items are delivered
        const purchaseItemsData = await tx
          .select()
          .from(purchaseItems)
          .where(inArray(purchaseItems.id, purchaseItemIds));
        
        const uniquePurchaseIds = [...new Set(purchaseItemsData.map(pi => pi.purchaseId))];
        
        // For each purchase order, check if all items are now delivered
        for (const purchaseId of uniquePurchaseIds) {
          const allPurchaseItems = await tx
            .select()
            .from(purchaseItems)
            .where(eq(purchaseItems.purchaseId, purchaseId));
          
          const allDelivered = allPurchaseItems.every(pi => pi.status === 'delivered');
          
          if (allDelivered) {
            // All items delivered - mark the purchase order as delivered
            await tx
              .update(importPurchases)
              .set({
                status: 'delivered',
                updatedAt: new Date()
              })
              .where(eq(importPurchases.id, purchaseId));
          }
        }
      }

      // Step 7: Update any in-transit shipments linked to this receipt's shipment
      if (receipt.shipmentId) {
        // Mark the shipment as delivered
        await tx
          .update(shipments)
          .set({
            status: 'delivered',
            receivingStatus: 'completed',
            deliveredAt: new Date(),
            updatedAt: new Date()
          })
          .where(eq(shipments.id, receipt.shipmentId));
        
        // Also update related consolidation if exists
        const [shipment] = await tx
          .select()
          .from(shipments)
          .where(eq(shipments.id, receipt.shipmentId));
        
        if (shipment?.consolidationId) {
          await tx
            .update(consolidations)
            .set({
              status: 'completed',
              updatedAt: new Date()
            })
            .where(eq(consolidations.id, shipment.consolidationId));
        }
      }

      return {
        receipt,
        inventoryItems,
        priceUpdateResults,
        inventoryResults,
        priceErrors: priceErrors.length > 0 ? priceErrors : undefined
      };
    });

    res.json({
      success: true,
      receipt: result.receipt,
      inventoryItems: result.inventoryItems,
      summary: {
        prices: result.priceUpdateResults,
        inventory: result.inventoryResults
      },
      priceErrors: result.priceErrors,
      message: `Receipt approved by ${approvedBy}. ${result.inventoryResults.created} products created, ${result.inventoryResults.updated} updated.`
    });
  } catch (error) {
    console.error("Error in approve-with-prices:", error);
    res.status(500).json({ message: "Failed to approve receipt with prices" });
  }
});

// Approve receipt and integrate with inventory
router.post("/receipts/approve/:id", async (req, res) => {
  try {
    const receiptId = parseInt(req.params.id);
    const { notes } = req.body;

    // Validate receipt ID
    if (isNaN(receiptId)) {
      return res.status(400).json({ message: "Invalid receipt ID" });
    }

    // First, check if receipt exists and is in pending_approval status
    const [existingReceipt] = await db
      .select()
      .from(receipts)
      .where(eq(receipts.id, receiptId));

    if (!existingReceipt) {
      return res.status(404).json({ message: "Receipt not found" });
    }

    if (existingReceipt.status === 'approved') {
      return res.status(400).json({ message: "Receipt is already approved" });
    }

    if (existingReceipt.status !== 'pending_approval' && existingReceipt.status !== 'verified') {
      return res.status(400).json({ message: "Receipt must be in pending_approval or verified status to approve" });
    }

    // Update receipt status with proper notes handling
    const existingNotes = existingReceipt.notes || '';
    const updatedNotes = notes 
      ? (existingNotes ? `${existingNotes}\n\nApproval Notes: ${notes}` : `Approval Notes: ${notes}`) 
      : existingNotes;

    const [receipt] = await db
      .update(receipts)
      .set({
        status: 'approved',
        approvedBy: 'Manager', // Default approver
        approvedAt: new Date(),
        notes: updatedNotes,
        updatedAt: new Date()
      })
      .where(eq(receipts.id, receiptId))
      .returning();

    // Update shipment status to completed
    if (receipt.shipmentId) {
      await db
        .update(shipments)
        .set({
          status: 'completed',
          receivingStatus: 'completed',
          updatedAt: new Date()
        })
        .where(eq(shipments.id, receipt.shipmentId));
    }

    // Integrate with inventory system - use transaction for atomicity
    const inventoryItems = await db.transaction(async (tx) => {
      // Fetch all receipt items
      const items = await tx
        .select()
        .from(receiptItems)
        .where(eq(receiptItems.receiptId, receiptId));
      
      const updatedInventory = [];
      
      for (const item of items) {
        let originalItem: any = null;
        let unitCost = 0;
        let landingCostPerUnit = 0;
        
        // Get the original item details based on itemType
        if (item.itemType === 'purchase') {
          [originalItem] = await tx
            .select()
            .from(purchaseItems)
            .where(eq(purchaseItems.id, item.itemId));
          
          if (originalItem) {
            unitCost = parseFloat(originalItem.unitPrice || '0');
            landingCostPerUnit = parseFloat(originalItem.landingCostUnitBase || '0');
          }
        } else if (item.itemType === 'custom') {
          [originalItem] = await tx
            .select()
            .from(customItems)
            .where(eq(customItems.id, item.itemId));
          
          if (originalItem) {
            unitCost = parseFloat(originalItem.unitPrice || '0');
            // Custom items may not have landing cost calculated
            landingCostPerUnit = unitCost * 1.15; // Default 15% markup for customs/shipping
          }
        }
        
        if (!originalItem) {
          console.error(`Original item not found for receipt item ${item.id}`);
          continue;
        }
        
        // Check if product exists by SKU
        const sku = item.sku || originalItem.sku || `SKU-${item.itemId}`;
        const [existingProduct] = await tx
          .select()
          .from(products)
          .where(eq(products.sku, sku));
        
        if (existingProduct) {
          // Product exists - update quantity and calculate weighted average costs
          const oldQuantity = existingProduct.quantity || 0;
          const newQuantity = item.receivedQuantity;
          const totalQuantity = oldQuantity + newQuantity;
          
          // Calculate weighted average for each currency
          // Default to USD if no currency is specified
          const oldCostUsd = parseFloat(existingProduct.importCostUsd || '0');
          const oldCostCzk = parseFloat(existingProduct.importCostCzk || '0');
          const oldCostEur = parseFloat(existingProduct.importCostEur || '0');
          
          // Determine currency from purchase order if available
          let newCostUsd = unitCost;
          let newCostCzk = 0;
          let newCostEur = 0;
          
          // Get purchase order for currency info
          if (item.itemType === 'purchase' && originalItem.purchaseId) {
            const [purchase] = await tx
              .select()
              .from(importPurchases)
              .where(eq(importPurchases.id, originalItem.purchaseId));
            
            if (purchase) {
              const currency = purchase.paymentCurrency || purchase.purchaseCurrency || 'USD';
              const exchangeRate = parseFloat(purchase.exchangeRate || '1');
              
              // Convert to USD base for calculations
              if (currency === 'CZK') {
                newCostCzk = unitCost;
                newCostUsd = unitCost / 23; // Approximate CZK to USD rate
              } else if (currency === 'EUR') {
                newCostEur = unitCost;
                newCostUsd = unitCost * 1.1; // Approximate EUR to USD rate
              } else {
                // Default to USD
                newCostUsd = unitCost;
              }
            }
          }
          
          // Calculate weighted averages
          const avgCostUsd = totalQuantity > 0 
            ? ((oldQuantity * oldCostUsd) + (newQuantity * newCostUsd)) / totalQuantity 
            : newCostUsd;
          
          const avgCostCzk = (oldCostCzk > 0 || newCostCzk > 0) && totalQuantity > 0
            ? ((oldQuantity * oldCostCzk) + (newQuantity * newCostCzk)) / totalQuantity
            : newCostCzk || oldCostCzk;
          
          const avgCostEur = (oldCostEur > 0 || newCostEur > 0) && totalQuantity > 0
            ? ((oldQuantity * oldCostEur) + (newQuantity * newCostEur)) / totalQuantity
            : newCostEur || oldCostEur;
          
          // Update product with new quantities and costs
          const [updatedProduct] = await tx
            .update(products)
            .set({
              quantity: totalQuantity,
              importCostUsd: avgCostUsd.toFixed(2),
              importCostCzk: avgCostCzk > 0 ? avgCostCzk.toFixed(2) : null,
              importCostEur: avgCostEur > 0 ? avgCostEur.toFixed(2) : null,
              latestLandingCost: landingCostPerUnit > 0 ? landingCostPerUnit.toFixed(4) : null,
              warehouseLocation: item.warehouseLocation || existingProduct.warehouseLocation,
              updatedAt: new Date()
            })
            .where(eq(products.sku, sku))
            .returning();
          
          updatedInventory.push({
            action: 'updated',
            product: updatedProduct,
            oldQuantity,
            addedQuantity: newQuantity,
            newQuantity: totalQuantity
          });
          
          // Record cost history
          await tx.insert(productCostHistory).values({
            productId: updatedProduct.id,
            customItemId: item.itemType === 'custom' ? item.itemId : null,
            landingCostUnitBase: (landingCostPerUnit > 0 ? landingCostPerUnit : avgCostUsd).toFixed(4),
            method: 'weighted_average',
            computedAt: new Date()
          });
          
        } else {
          // Product doesn't exist - create new
          const newProduct: any = {
            id: crypto.randomUUID(),
            sku: sku,
            name: originalItem.name,
            vietnameseName: originalItem.name,
            quantity: item.receivedQuantity,
            warehouseLocation: item.warehouseLocation,
            barcode: item.barcode,
            weight: originalItem.weight,
            importCostUsd: unitCost.toFixed(2),
            importCostCzk: null,
            importCostEur: null,
            latestLandingCost: landingCostPerUnit > 0 ? landingCostPerUnit.toFixed(4) : null,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
            // These will be set conditionally below
            supplierId: null,
            length: null,
            width: null,
            height: null
          };
          
          // Set currency-specific costs based on purchase currency
          if (item.itemType === 'purchase' && originalItem.purchaseId) {
            const [purchase] = await tx
              .select()
              .from(importPurchases)
              .where(eq(importPurchases.id, originalItem.purchaseId));
            
            if (purchase) {
              const currency = purchase.paymentCurrency || purchase.purchaseCurrency || 'USD';
              
              if (currency === 'CZK') {
                newProduct.importCostCzk = unitCost.toFixed(2);
                newProduct.importCostUsd = (unitCost / 23).toFixed(2); // Approximate conversion
              } else if (currency === 'EUR') {
                newProduct.importCostEur = unitCost.toFixed(2);
                newProduct.importCostUsd = (unitCost * 1.1).toFixed(2); // Approximate conversion
              }
              
              // Set supplier if available
              if (purchase.supplier) {
                // Try to find supplier by name
                const [supplier] = await tx
                  .select()
                  .from(suppliers)
                  .where(eq(suppliers.name, purchase.supplier));
                
                if (supplier) {
                  newProduct.supplierId = supplier.id;
                }
              }
            }
          }
          
          // Handle dimensions if available
          if (originalItem.dimensions) {
            const dims = typeof originalItem.dimensions === 'string' 
              ? JSON.parse(originalItem.dimensions) 
              : originalItem.dimensions;
            
            newProduct.length = dims.length ? parseFloat(dims.length).toFixed(2) : null;
            newProduct.width = dims.width ? parseFloat(dims.width).toFixed(2) : null;
            newProduct.height = dims.height ? parseFloat(dims.height).toFixed(2) : null;
          }
          
          const [createdProduct] = await tx
            .insert(products)
            .values(newProduct)
            .returning();
          
          updatedInventory.push({
            action: 'created',
            product: createdProduct,
            oldQuantity: 0,
            addedQuantity: item.receivedQuantity,
            newQuantity: item.receivedQuantity
          });
          
          // Record initial cost history
          await tx.insert(productCostHistory).values({
            productId: createdProduct.id,
            customItemId: item.itemType === 'custom' ? item.itemId : null,
            landingCostUnitBase: (landingCostPerUnit > 0 ? landingCostPerUnit : parseFloat(newProduct.importCostUsd)).toFixed(4),
            method: 'initial_import',
            computedAt: new Date()
          });
        }
      }
      
      // Apply landing cost allocations using the existing costAllocations table
      // For custom items, look up allocations directly; for purchase items, use their stored landingCostUnitBase
      if (receipt.shipmentId) {
        try {
          // Get existing cost allocations from the costAllocations table (populated by landing cost page)
          const existingAllocations = await tx
            .select()
            .from(costAllocations)
            .where(eq(costAllocations.shipmentId, receipt.shipmentId));
          
          if (existingAllocations.length > 0) {
            // Group allocations by customItemId and sum up all cost types
            const allocationsByCustomItemId = new Map<number, number>();
            for (const alloc of existingAllocations) {
              const current = allocationsByCustomItemId.get(alloc.customItemId) || 0;
              allocationsByCustomItemId.set(alloc.customItemId, current + parseFloat(alloc.amountAllocatedBase || '0'));
            }
            
            // Update product landing costs for items that have allocations
            // Track which SKUs have been updated to avoid double-counting
            const updatedSkus = new Set<string>();
            
            for (const item of items) {
              const sku = item.sku || `SKU-${item.itemId}`;
              
              // Skip if already updated this SKU
              if (updatedSkus.has(sku)) continue;
              
              let landingCostPerUnit = 0;
              
              if (item.itemType === 'custom' && item.itemId) {
                // For custom items, look up from costAllocations
                const totalAllocated = allocationsByCustomItemId.get(item.itemId) || 0;
                landingCostPerUnit = item.receivedQuantity > 0 ? totalAllocated / item.receivedQuantity : 0;
              } else if (item.itemType === 'purchase' && item.itemId) {
                // For purchase items, use the landingCostUnitBase from the purchaseItems table
                const [purchaseItem] = await tx
                  .select()
                  .from(purchaseItems)
                  .where(eq(purchaseItems.id, item.itemId));
                
                if (purchaseItem?.landingCostUnitBase) {
                  landingCostPerUnit = parseFloat(purchaseItem.landingCostUnitBase);
                }
              }
              
              if (landingCostPerUnit > 0) {
                await tx
                  .update(products)
                  .set({
                    latestLandingCost: landingCostPerUnit.toFixed(4),
                    updatedAt: new Date()
                  })
                  .where(eq(products.sku, sku));
                
                updatedSkus.add(sku);
              }
            }
          }
        } catch (allocationError) {
          console.error('Error applying landing cost allocations:', allocationError);
          // Continue with approval even if landing cost allocation fails
        }
      }
      
      // Mark purchase items as delivered and update purchase order status
      const purchaseItemIds = items
        .filter(item => item.itemType === 'purchase' && item.itemId)
        .map(item => item.itemId);
      
      if (purchaseItemIds.length > 0) {
        // Mark all purchase items from this receipt as delivered
        await tx
          .update(purchaseItems)
          .set({
            status: 'delivered',
            updatedAt: new Date()
          })
          .where(inArray(purchaseItems.id, purchaseItemIds));
        
        // Get the unique purchase IDs to check if all items are delivered
        const purchaseItemsData = await tx
          .select()
          .from(purchaseItems)
          .where(inArray(purchaseItems.id, purchaseItemIds));
        
        const uniquePurchaseIds = [...new Set(purchaseItemsData.map(pi => pi.purchaseId))];
        
        // For each purchase order, check if all items are now delivered
        for (const purchaseId of uniquePurchaseIds) {
          const allPurchaseItems = await tx
            .select()
            .from(purchaseItems)
            .where(eq(purchaseItems.purchaseId, purchaseId));
          
          const allDelivered = allPurchaseItems.every(pi => pi.status === 'delivered');
          
          if (allDelivered) {
            // All items delivered - mark the purchase order as delivered
            await tx
              .update(importPurchases)
              .set({
                status: 'delivered',
                updatedAt: new Date()
              })
              .where(eq(importPurchases.id, purchaseId));
          }
        }
      }

      // Update shipment and consolidation status
      if (receipt.shipmentId) {
        // Mark the shipment as delivered
        await tx
          .update(shipments)
          .set({
            status: 'delivered',
            receivingStatus: 'completed',
            deliveredAt: new Date(),
            updatedAt: new Date()
          })
          .where(eq(shipments.id, receipt.shipmentId));
        
        // Also update related consolidation if exists
        const [shipment] = await tx
          .select()
          .from(shipments)
          .where(eq(shipments.id, receipt.shipmentId));
        
        if (shipment?.consolidationId) {
          await tx
            .update(consolidations)
            .set({
              status: 'completed',
              updatedAt: new Date()
            })
            .where(eq(consolidations.id, shipment.consolidationId));
        }
      }
      
      return updatedInventory;
    });

    res.json({ 
      receipt,
      inventoryItems,
      message: `Receipt approved and ${inventoryItems.length} inventory items updated` 
    });
  } catch (error) {
    console.error("Error approving receipt:", error);
    res.status(500).json({ message: "Failed to approve receipt" });
  }
});

// Reject receipt and return to receiving status
router.post("/receipts/reject/:id", async (req, res) => {
  try {
    const receiptId = parseInt(req.params.id);
    const { reason } = req.body;

    // Validate receipt ID
    if (isNaN(receiptId)) {
      return res.status(400).json({ message: "Invalid receipt ID" });
    }

    if (!reason || reason.trim().length === 0) {
      return res.status(400).json({ message: "Rejection reason is required and cannot be empty" });
    }

    // First, check if receipt exists and is in the correct status
    const [existingReceipt] = await db
      .select()
      .from(receipts)
      .where(eq(receipts.id, receiptId));

    if (!existingReceipt) {
      return res.status(404).json({ message: "Receipt not found" });
    }

    if (existingReceipt.status === 'approved') {
      return res.status(400).json({ message: "Cannot reject an already approved receipt" });
    }

    if (existingReceipt.status !== 'pending_approval' && existingReceipt.status !== 'verified') {
      return res.status(400).json({ message: "Receipt must be in pending_approval or verified status to reject" });
    }

    // Update receipt status and add rejection reason to notes
    const existingNotes = existingReceipt.notes || '';
    const updatedNotes = existingNotes 
      ? `${existingNotes}\n\nREJECTED: ${reason}` 
      : `REJECTED: ${reason}`;

    const [receipt] = await db
      .update(receipts)
      .set({
        status: 'pending',
        verifiedBy: null,
        verifiedAt: null,
        approvedBy: null,
        approvedAt: null,
        notes: updatedNotes,
        updatedAt: new Date()
      })
      .where(eq(receipts.id, receiptId))
      .returning();

    // Update shipment status back to receiving
    if (receipt.shipmentId) {
      await db
        .update(shipments)
        .set({
          status: 'receiving',
          updatedAt: new Date()
        })
        .where(eq(shipments.id, receipt.shipmentId));
    }

    res.json({ 
      receipt,
      message: "Receipt rejected and returned to receiving status" 
    });
  } catch (error) {
    console.error("Error rejecting receipt:", error);
    res.status(500).json({ message: "Failed to reject receipt" });
  }
});

// Undo approval - revert inventory changes and set receipt back to pending_approval
router.post("/receipts/undo-approve/:id", async (req, res) => {
  try {
    const receiptId = parseInt(req.params.id);
    const { reason } = req.body;

    // Validate receipt ID
    if (isNaN(receiptId)) {
      return res.status(400).json({ message: "Invalid receipt ID" });
    }

    // First, check if receipt exists and is approved
    const [existingReceipt] = await db
      .select()
      .from(receipts)
      .where(eq(receipts.id, receiptId));

    if (!existingReceipt) {
      return res.status(404).json({ message: "Receipt not found" });
    }

    if (existingReceipt.status !== 'approved') {
      return res.status(400).json({ message: "Receipt must be approved to undo approval" });
    }

    // Revert inventory changes in transaction
    const revertedItems = await db.transaction(async (tx) => {
      // Fetch all receipt items
      const items = await tx
        .select()
        .from(receiptItems)
        .where(eq(receiptItems.receiptId, receiptId));
      
      const revertedInventory = [];
      
      for (const item of items) {
        let originalItem: any = null;
        
        // Get the original item details based on itemType
        if (item.itemType === 'purchase') {
          [originalItem] = await tx
            .select()
            .from(purchaseItems)
            .where(eq(purchaseItems.id, item.itemId));
        } else if (item.itemType === 'custom') {
          [originalItem] = await tx
            .select()
            .from(customItems)
            .where(eq(customItems.id, item.itemId));
        }
        
        if (!originalItem) {
          console.error(`Original item not found for receipt item ${item.id}`);
          continue;
        }
        
        // Find the product by SKU
        const sku = item.sku || originalItem.sku || `SKU-${item.itemId}`;
        const [existingProduct] = await tx
          .select()
          .from(products)
          .where(eq(products.sku, sku));
        
        if (existingProduct) {
          const oldQuantity = existingProduct.quantity || 0;
          const quantityToRemove = item.receivedQuantity;
          const newQuantity = Math.max(0, oldQuantity - quantityToRemove);
          
          if (newQuantity === 0) {
            // If quantity becomes 0, delete the product if it was created for this receipt
            // Check if this product has any cost history entries for this receipt
            const costHistoryEntries = await tx
              .select()
              .from(productCostHistory)
              .where(and(
                eq(productCostHistory.productId, existingProduct.id),
                eq(productCostHistory.method, 'initial_import')
              ));
            
            if (costHistoryEntries.length === 1) {
              // This product was likely created for this receipt, safe to delete
              await tx
                .delete(productCostHistory)
                .where(eq(productCostHistory.productId, existingProduct.id));
              
              await tx
                .delete(products)
                .where(eq(products.id, existingProduct.id));
              
              revertedInventory.push({
                action: 'deleted',
                product: existingProduct,
                oldQuantity,
                removedQuantity: quantityToRemove,
                newQuantity: 0
              });
            } else {
              // Product has other history, just set quantity to 0
              const [updatedProduct] = await tx
                .update(products)
                .set({
                  quantity: 0,
                  updatedAt: new Date()
                })
                .where(eq(products.sku, sku))
                .returning();
              
              revertedInventory.push({
                action: 'zeroed',
                product: updatedProduct,
                oldQuantity,
                removedQuantity: quantityToRemove,
                newQuantity: 0
              });
            }
          } else {
            // Product still has quantity, need to recalculate weighted average cost
            // For simplicity, we'll just subtract the quantity for now
            // In a more sophisticated system, we'd recalculate the weighted average
            const [updatedProduct] = await tx
              .update(products)
              .set({
                quantity: newQuantity,
                updatedAt: new Date()
              })
              .where(eq(products.sku, sku))
              .returning();
            
            revertedInventory.push({
              action: 'updated',
              product: updatedProduct,
              oldQuantity,
              removedQuantity: quantityToRemove,
              newQuantity
            });
          }
          
          // Remove cost history entries for this receipt
          await tx
            .delete(productCostHistory)
            .where(and(
              eq(productCostHistory.productId, existingProduct.id),
              or(
                eq(productCostHistory.method, 'initial_import'),
                eq(productCostHistory.method, 'weighted_average')
              )
            ));
        }
      }
      
      return revertedInventory;
    });

    // Update receipt status back to pending_approval
    const existingNotes = existingReceipt.notes || '';
    const undoReason = reason || 'Approval undone';
    const updatedNotes = existingNotes 
      ? `${existingNotes}\n\nUNDO APPROVAL: ${undoReason}` 
      : `UNDO APPROVAL: ${undoReason}`;

    const [receipt] = await db
      .update(receipts)
      .set({
        status: 'pending_approval',
        approvedBy: null,
        approvedAt: null,
        notes: updatedNotes,
        updatedAt: new Date()
      })
      .where(eq(receipts.id, receiptId))
      .returning();

    // Update shipment status back to receiving
    if (receipt.shipmentId) {
      await db
        .update(shipments)
        .set({
          status: 'receiving',
          receivingStatus: 'pending_approval',
          updatedAt: new Date()
        })
        .where(eq(shipments.id, receipt.shipmentId));
    }

    res.json({ 
      receipt,
      revertedItems,
      message: `Receipt approval undone and ${revertedItems.length} inventory items reverted` 
    });
  } catch (error) {
    console.error("Error undoing receipt approval:", error);
    res.status(500).json({ message: "Failed to undo receipt approval" });
  }
});

// Get all receipts
router.get("/receipts", async (req, res) => {
  try {
    const { status } = req.query;

    // Use a single query with LEFT JOIN to fetch receipts with shipments
    const baseQuery = db
      .select({
        receipt: receipts,
        shipment: shipments
      })
      .from(receipts)
      .leftJoin(shipments, eq(receipts.shipmentId, shipments.id));
    
    const receiptsWithShipments = await (status 
      ? baseQuery.where(eq(receipts.status, status as string))
      : baseQuery)
      .orderBy(desc(receipts.createdAt))
      .limit(100); // Limit to prevent loading too much data

    // Transform the results to match the expected format
    const transformedReceipts = receiptsWithShipments.map(row => ({
      ...row.receipt,
      shipment: row.shipment
    }));
    
    // Fetch receipt items for all receipts
    if (transformedReceipts.length > 0) {
      const receiptIds = transformedReceipts.map(r => r.id);
      const allReceiptItems = await db
        .select()
        .from(receiptItems)
        .where(inArray(receiptItems.receiptId, receiptIds));
      
      // Attach items to each receipt
      transformedReceipts.forEach(receipt => {
        receipt.items = allReceiptItems.filter(item => item.receiptId === receipt.id);
      });
    }

    // Add mock receipts if no real receipts exist to populate receipts section
    if (transformedReceipts.length === 0) {
      const mockReceipts = [
        {
          id: 1,
          shipmentId: 21,
          consolidationId: 5,
          receivedBy: "John Warehouse",
          verifiedBy: "Jane Supervisor", 
          approvedBy: "Tom Manager",
          parcelCount: 3,
          carrier: "DHL Express",
          trackingNumbers: ["SF9876543210CN"],
          status: "approved",
          notes: "All items received in good condition",
          damageNotes: null,
          receivedAt: "2025-01-30T08:30:00.000Z",
          verifiedAt: "2025-01-30T09:15:00.000Z",
          approvedAt: "2025-01-30T10:00:00.000Z",
          createdAt: "2025-01-30T08:30:00.000Z",
          updatedAt: "2025-01-30T10:00:00.000Z",
          shipment: {
            id: 21,
            shipmentName: "Urgent Medical Supplies",
            trackingNumber: "SF9876543210CN",
            carrier: "SF Express",
            endCarrier: "DHL Express",
            origin: "Beijing, China",
            destination: "Prague, Czech Republic"
          }
        },
        {
          id: 2,
          shipmentId: 23,
          consolidationId: 7,
          receivedBy: "Mike Handler",
          verifiedBy: null,
          approvedBy: null,
          parcelCount: 2,
          carrier: "Zásilkovna",
          trackingNumbers: ["YT5555444433CN"],
          status: "pending_verification",
          notes: "Packages slightly damaged externally",
          damageNotes: "Minor box damage on parcel 2, contents appear intact",
          receivedAt: "2025-01-30T14:20:00.000Z",
          verifiedAt: null,
          approvedAt: null,
          createdAt: "2025-01-30T14:20:00.000Z",
          updatedAt: "2025-01-30T14:20:00.000Z",
          shipment: {
            id: 23,
            shipmentName: "Home & Garden Tools",
            trackingNumber: "YT5555444433CN",
            carrier: "YTO Express",
            endCarrier: "Zásilkovna",
            origin: "Yiwu, China",
            destination: "Prague, Czech Republic"
          }
        },
        {
          id: 3,
          shipmentId: 22,
          consolidationId: 6,
          receivedBy: "Sarah Dock",
          verifiedBy: "Alex Lead",
          approvedBy: null,
          parcelCount: 4,
          carrier: "PPL",
          trackingNumbers: ["CP123987456CN"],
          status: "verified",
          notes: "All parcels received on time",
          damageNotes: null,
          receivedAt: "2025-01-29T16:45:00.000Z",
          verifiedAt: "2025-01-29T17:30:00.000Z",
          approvedAt: null,
          createdAt: "2025-01-29T16:45:00.000Z",
          updatedAt: "2025-01-29T17:30:00.000Z",
          shipment: {
            id: 22,
            shipmentName: "Fashion Accessories Spring",
            trackingNumber: "CP123987456CN",
            carrier: "China Post",
            endCarrier: "PPL",
            origin: "Dongguan, China",
            destination: "Prague, Czech Republic"
          }
        }
      ];
      
      // Filter financial data for mock receipts
      const userRole = (req as any).user?.role || 'warehouse_operator';
      const filteredMock = filterFinancialData(mockReceipts, userRole);
      return res.json(filteredMock);
    }

    // Filter financial data based on user role
    const userRole = (req as any).user?.role || 'warehouse_operator';
    const filtered = filterFinancialData(transformedReceipts, userRole);
    res.json(filtered);
  } catch (error) {
    console.error("Error fetching receipts:", error);
    res.status(500).json({ message: "Failed to fetch receipts" });
  }
});

// Get receipt by shipment ID
router.get("/receipts/by-shipment/:shipmentId", async (req, res) => {
  try {
    const shipmentId = parseInt(req.params.shipmentId);
    
    // Get the shipment details
    const [shipmentData] = await db
      .select({
        id: shipments.id,
        name: shipments.shipmentName,
        trackingNumber: shipments.trackingNumber,
        carrier: shipments.carrier,
        endCarrier: shipments.endCarrier,
        totalUnits: shipments.totalUnits,
        unitType: shipments.unitType,
        shipmentType: shipments.shipmentType,
        deliveredAt: shipments.deliveredAt,
        estimatedDelivery: shipments.estimatedDelivery,
        totalWeight: shipments.totalWeight,
        status: shipments.status,
        consolidationId: shipments.consolidationId
      })
      .from(shipments)
      .where(eq(shipments.id, shipmentId));
    
    if (!shipmentData) {
      return res.status(404).json({ message: "Shipment not found" });
    }
    
    // Get the receipt for this shipment
    const [receipt] = await db
      .select()
      .from(receipts)
      .where(eq(receipts.shipmentId, shipmentId));
    
    if (!receipt) {
      return res.status(404).json({ message: "No receipt found for this shipment" });
    }
    
    // Get receipt items with LEFT JOINs for purchase, custom, and consolidation items
    // This single query replaces the N+1 problem!
    const receiptItemsWithDetails = await db
      .select({
        receiptItem: receiptItems,
        purchaseItem: purchaseItems,
        customItem: customItems,
        consolidationItem: consolidationItems
      })
      .from(receiptItems)
      .leftJoin(purchaseItems, and(
        eq(receiptItems.itemType, 'purchase'),
        eq(receiptItems.itemId, purchaseItems.id)
      ))
      .leftJoin(customItems, and(
        eq(receiptItems.itemType, 'custom'),
        eq(receiptItems.itemId, customItems.id)
      ))
      .leftJoin(consolidationItems, and(
        eq(receiptItems.itemType, 'consolidation'),
        eq(receiptItems.itemId, consolidationItems.id)
      ))
      .where(eq(receiptItems.receiptId, receipt.id));
    
    // Collect all product IDs from purchase items to get product details
    const productIds = receiptItemsWithDetails
      .filter(row => row.purchaseItem?.productId)
      .map(row => row.purchaseItem!.productId as string);
    
    // Fetch product details and locations in parallel if we have product IDs
    let productsMap: Record<string, any> = {};
    let locationsMap: Record<string, any[]> = {};
    
    if (productIds.length > 0) {
      const [productsData, locationsData] = await Promise.all([
        db.select({
          id: products.id,
          name: products.name,
          sku: products.sku,
          imageUrl: products.imageUrl,
          category: products.category
        })
        .from(products)
        .where(inArray(products.id, productIds)),
        
        db.select({
          id: productLocations.id,
          productId: productLocations.productId,
          locationCode: productLocations.locationCode,
          locationType: productLocations.locationType,
          quantity: productLocations.quantity,
          isPrimary: productLocations.isPrimary,
          notes: productLocations.notes
        })
        .from(productLocations)
        .where(inArray(productLocations.productId, productIds))
      ]);
      
      // Build lookup maps
      productsData.forEach(p => { productsMap[p.id] = p; });
      locationsData.forEach(loc => {
        if (!locationsMap[loc.productId]) {
          locationsMap[loc.productId] = [];
        }
        locationsMap[loc.productId].push({
          id: loc.id.toString(),
          locationCode: loc.locationCode,
          locationType: loc.locationType || 'warehouse',
          quantity: loc.quantity || 0,
          isPrimary: loc.isPrimary || false,
          notes: loc.notes || ''
        });
      });
    }
    
    // Transform the results to match the expected format with product names and locations
    const itemsWithDetails = receiptItemsWithDetails.map(row => {
      const productId = row.purchaseItem?.productId;
      const product = productId ? productsMap[productId] : null;
      
      // Prefer product name from products table, fallback to purchase/custom/consolidation item name
      const productName = product?.name || row.purchaseItem?.name || row.customItem?.name || row.consolidationItem?.name || 'Unknown Item';
      const sku = product?.sku || row.purchaseItem?.sku || row.customItem?.sku || null;
      const imageUrl = product?.imageUrl || row.purchaseItem?.imageUrl || null;
      const existingLocations = productId ? (locationsMap[productId] || []) : [];
      
      return {
        ...row.receiptItem,
        productId,
        productName, // Use productName for frontend consistency
        name: productName, // Also include as name for backwards compatibility
        sku,
        imageUrl,
        existingLocations,
        purchaseItem: row.purchaseItem,
        customItem: row.customItem,
        consolidationItem: row.consolidationItem
      };
    });
    
    // Return shipment, receipt, and items with details
    const responseData = {
      shipment: shipmentData,
      receipt: receipt,
      items: itemsWithDetails
    };
    
    // Filter financial data based on user role
    const userRole = (req as any).user?.role || 'warehouse_operator';
    const filtered = filterFinancialData(responseData, userRole);
    res.json(filtered);
  } catch (error) {
    console.error("Error fetching receipt by shipment:", error);
    res.status(500).json({ message: "Failed to fetch receipt" });
  }
});

// Auto-save receiving progress (create or update receipt)
router.post("/receipts/auto-save", async (req, res) => {
  try {
    const { 
      shipmentId, 
      consolidationId,
      receivedBy,
      parcelCount,
      scannedParcels,
      carrier,
      notes,
      photos,
      items
    } = req.body;

    if (!shipmentId) {
      return res.status(400).json({ message: "shipmentId is required" });
    }
    
    // Debug log for photos
    if (photos && photos.length > 0) {
      console.log(`Auto-saving ${photos.length} photos for shipment ${shipmentId}`);
    }

    // Check if receipt already exists for this shipment
    const [existingReceipt] = await db
      .select()
      .from(receipts)
      .where(eq(receipts.shipmentId, shipmentId));

    let receipt: any;
    
    if (existingReceipt) {
      // Update existing receipt with scannedParcels stored in trackingNumbers JSON
      const trackingData = {
        ...(existingReceipt.trackingNumbers as any || {}),
        scannedParcels: scannedParcels !== undefined ? scannedParcels : (existingReceipt.trackingNumbers as any)?.scannedParcels
      };
      
      const [updatedReceipt] = await db
        .update(receipts)
        .set({
          receivedBy: receivedBy || existingReceipt.receivedBy,
          parcelCount: parcelCount || existingReceipt.parcelCount,
          carrier: carrier || existingReceipt.carrier,
          notes: notes || existingReceipt.notes,
          photos: photos || existingReceipt.photos,
          trackingNumbers: trackingData,
          updatedAt: new Date()
        })
        .where(eq(receipts.id, existingReceipt.id))
        .returning();
      
      receipt = updatedReceipt;
    } else {
      // Create new receipt for auto-save with scannedParcels stored in trackingNumbers JSON
      // Also pre-fill tracking numbers from shipment's endTrackingNumbers (with legacy fallback)
      const [shipmentData] = await db
        .select({ 
          endTrackingNumbers: shipments.endTrackingNumbers,
          endTrackingNumber: shipments.endTrackingNumber // Legacy field
        })
        .from(shipments)
        .where(eq(shipments.id, shipmentId));
      
      // Prefer new array field, but fall back to legacy single value if array is empty
      let prefilledNumbers: string[] = [];
      if (shipmentData?.endTrackingNumbers && shipmentData.endTrackingNumbers.length > 0) {
        prefilledNumbers = shipmentData.endTrackingNumbers;
      } else if (shipmentData?.endTrackingNumber) {
        prefilledNumbers = [shipmentData.endTrackingNumber]; // Migrate legacy value to array
      }
      
      const trackingData = {
        scannedParcels: scannedParcels || 0,
        numbers: prefilledNumbers // Pre-fill from shipment's tracking numbers
      };
      
      const [newReceipt] = await db.insert(receipts).values({
        shipmentId,
        consolidationId,
        receivedBy: receivedBy || "Employee #1",
        parcelCount: parcelCount || 1,
        carrier: carrier || "",
        status: 'pending_verification',
        notes: notes || "",
        photos: photos || [],
        trackingNumbers: trackingData,
        receivedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      }).returning();
      
      receipt = newReceipt;
      
      // Create receipt items for new receipts if not already provided
      if (!existingReceipt && (!items || items.length === 0)) {
        // Get consolidation items for this shipment
        let itemsToReceive = [];
        if (consolidationId) {
          const consolidationItemList = await db
            .select()
            .from(consolidationItems)
            .where(eq(consolidationItems.consolidationId, consolidationId));

          // Fetch actual items based on type
          for (const ci of consolidationItemList) {
            if (ci.itemType === 'purchase') {
              const [item] = await db
                .select()
                .from(purchaseItems)
                .where(eq(purchaseItems.id, ci.itemId));
              if (item) {
                itemsToReceive.push({ ...item, itemType: 'purchase' });
              }
            } else if (ci.itemType === 'custom') {
              const [item] = await db
                .select()
                .from(customItems)
                .where(eq(customItems.id, ci.itemId));
              if (item) {
                itemsToReceive.push({ ...item, itemType: 'custom' });
              }
            }
          }
        } else {
          // Handle non-consolidated shipments - extract PO from notes
          const [shipmentData] = await db
            .select({ notes: shipments.notes })
            .from(shipments)
            .where(eq(shipments.id, shipmentId));
          
          if (shipmentData?.notes) {
            const poMatch = shipmentData.notes.match(/PO #(\d+)/);
            if (poMatch) {
              const purchaseId = parseInt(poMatch[1]);
              
              // Get items from purchaseItems table
              const purchaseItemsList = await db
                .select()
                .from(purchaseItems)
                .where(eq(purchaseItems.purchaseId, purchaseId));
              
              for (const item of purchaseItemsList) {
                itemsToReceive.push({ ...item, itemType: 'purchase' });
              }
            }
          }
        }

        // Create receipt items for the new receipt
        const receiptItemsData = itemsToReceive.map(item => ({
          receiptId: receipt.id,
          itemId: item.id,
          itemType: item.itemType || 'purchase',
          expectedQuantity: item.quantity || 1,
          receivedQuantity: 0, // Will be updated during verification
          damagedQuantity: 0,
          missingQuantity: 0,
          warehouseLocation: item.itemType === 'purchase' ? (item as any).warehouseLocation : null,
          condition: 'pending',
          status: 'pending',
          createdAt: new Date(),
          updatedAt: new Date()
        }));

        if (receiptItemsData.length > 0) {
          await db.insert(receiptItems).values(receiptItemsData);
        }
      }
    }
    
    // Update shipment receiving status to 'receiving'
    await db
      .update(shipments)
      .set({ 
        receivingStatus: 'receiving',
        updatedAt: new Date()
      })
      .where(eq(shipments.id, shipmentId));

    // Update or create receipt items if explicitly provided
    if (items && items.length > 0) {
      // Get existing receipt items to preserve itemType and expectedQuantity
      const existingItems = await db
        .select()
        .from(receiptItems)
        .where(eq(receiptItems.receiptId, receipt.id));
      
      // Create maps for quick lookup - preserve both itemType AND expectedQuantity
      const itemTypeMap = new Map();
      const expectedQuantityMap = new Map();
      existingItems.forEach(item => {
        itemTypeMap.set(item.itemId, item.itemType);
        expectedQuantityMap.set(item.itemId, item.expectedQuantity);
      });
      
      // Delete existing receipt items for this receipt
      await db
        .delete(receiptItems)
        .where(eq(receiptItems.receiptId, receipt.id));
      
      // Insert updated receipt items
      const itemsToInsert = items.map((item: any) => {
        // Handle both integer and string itemIds
        const itemId = typeof (item.itemId || item.id) === 'string' 
          ? parseInt((item.itemId || item.id).toString()) 
          : (item.itemId || item.id);
        
        // Preserve the original itemType from the database, or default to 'custom'
        const itemType = itemTypeMap.get(itemId) || 'custom';
        
        // CRITICAL FIX: Preserve expectedQuantity from database if not provided
        // Ensure itemId is converted to number for map lookup
        // Priority: provided value → existing DB value → default to 1
        const existingExpectedQty = expectedQuantityMap.get(Number(itemId));
        const expectedQty = item.expectedQuantity || item.expectedQty || existingExpectedQty || 1;
        
        return {
          receiptId: receipt.id,
          itemId: itemId,
          itemType: itemType, // Use preserved itemType
          productId: item.productId || null, // Include productId
          sku: item.sku || null, // Include SKU
          expectedQuantity: expectedQty,
          receivedQuantity: item.receivedQuantity || item.receivedQty || 0,
          damagedQuantity: item.damagedQuantity || 0,
          missingQuantity: item.missingQuantity || 0,
          status: item.status || 'pending',
          notes: item.notes || "",
          createdAt: new Date(),
          updatedAt: new Date()
        };
      });
      
      if (itemsToInsert.length > 0) {
        await db.insert(receiptItems).values(itemsToInsert);
      }
    }

    res.json({ 
      receipt,
      message: "Progress auto-saved successfully"
    });
  } catch (error) {
    console.error("Error auto-saving receipt:", error);
    res.status(500).json({ message: "Failed to auto-save progress" });
  }
});

// ================ OPTIMIZED PATCH ENDPOINTS FOR MICRO-UPDATES ================

// PATCH endpoint for updating receipt meta fields only (receivedBy, carrier, parcelCount, notes)
router.patch("/receipts/:id/meta", async (req, res) => {
  try {
    const receiptId = parseInt(req.params.id);
    const { receivedBy, carrier, parcelCount, notes, scannedParcels } = req.body;
    
    // Build update object with only provided fields
    const updateData: any = { updatedAt: new Date() };
    if (receivedBy !== undefined) updateData.receivedBy = receivedBy;
    if (carrier !== undefined) updateData.carrier = carrier;
    if (parcelCount !== undefined) updateData.parcelCount = parcelCount;
    if (notes !== undefined) updateData.notes = notes;
    
    // Handle scannedParcels in trackingNumbers JSON field
    if (scannedParcels !== undefined) {
      const [currentReceipt] = await db
        .select({ trackingNumbers: receipts.trackingNumbers })
        .from(receipts)
        .where(eq(receipts.id, receiptId));
      
      updateData.trackingNumbers = {
        ...(currentReceipt?.trackingNumbers as any || {}),
        scannedParcels
      };
    }
    
    // Single efficient update query
    const [updated] = await db
      .update(receipts)
      .set(updateData)
      .where(eq(receipts.id, receiptId))
      .returning({ 
        id: receipts.id, 
        receivedBy: receipts.receivedBy,
        carrier: receipts.carrier,
        parcelCount: receipts.parcelCount,
        notes: receipts.notes,
        trackingNumbers: receipts.trackingNumbers
      });
    
    if (!updated) {
      return res.status(404).json({ success: false, message: "Receipt not found" });
    }
    
    res.json({ success: true, updated });
  } catch (error) {
    console.error("Error updating receipt meta:", error);
    res.status(500).json({ success: false, message: "Failed to update receipt meta" });
  }
});

// PATCH endpoint for updating a single receipt item
router.patch("/receipts/:id/items/:itemId", async (req, res) => {
  try {
    const receiptId = parseInt(req.params.id);
    const shipmentItemId = parseInt(req.params.itemId); // This is the shipment/purchase item ID
    const { 
      receivedQuantity, 
      damagedQuantity, 
      missingQuantity, 
      status, 
      condition,
      barcode,
      warehouseLocation,
      additionalLocation,
      storageInstructions,
      notes,
      verifiedAt
    } = req.body;
    
    // Check if receipt item exists
    const [existingItem] = await db
      .select()
      .from(receiptItems)
      .where(and(
        eq(receiptItems.receiptId, receiptId),
        eq(receiptItems.itemId, shipmentItemId)
      ));
    
    // If item doesn't exist, create it first
    if (!existingItem) {
      const [newItem] = await db
        .insert(receiptItems)
        .values({
          receiptId,
          itemId: shipmentItemId,
          itemType: 'custom', // Default, can be updated
          expectedQuantity: 1,
          receivedQuantity: receivedQuantity || 0,
          damagedQuantity: damagedQuantity || 0,
          missingQuantity: missingQuantity || 0,
          condition: condition || 'pending',
          barcode: barcode || null,
          warehouseLocation: warehouseLocation || null,
          additionalLocation: additionalLocation || null,
          storageInstructions: storageInstructions || null,
          notes: notes || null,
          verifiedAt: verifiedAt ? new Date(verifiedAt) : null,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning({
          id: receiptItems.id,
          receivedQuantity: receiptItems.receivedQuantity,
          damagedQuantity: receiptItems.damagedQuantity,
          missingQuantity: receiptItems.missingQuantity,
          condition: receiptItems.condition,
          barcode: receiptItems.barcode,
          warehouseLocation: receiptItems.warehouseLocation,
          additionalLocation: receiptItems.additionalLocation,
          storageInstructions: receiptItems.storageInstructions,
          notes: receiptItems.notes,
          verifiedAt: receiptItems.verifiedAt
        });
      
      return res.json({ success: true, updated: newItem });
    }
    
    // Build update object with only provided fields
    const updateData: any = { updatedAt: new Date() };
    if (receivedQuantity !== undefined) updateData.receivedQuantity = receivedQuantity;
    if (damagedQuantity !== undefined) updateData.damagedQuantity = damagedQuantity;
    if (missingQuantity !== undefined) updateData.missingQuantity = missingQuantity;
    if (status !== undefined) updateData.status = status;
    if (condition !== undefined) updateData.condition = condition;
    if (barcode !== undefined) updateData.barcode = barcode;
    if (warehouseLocation !== undefined) updateData.warehouseLocation = warehouseLocation;
    if (additionalLocation !== undefined) updateData.additionalLocation = additionalLocation;
    if (storageInstructions !== undefined) updateData.storageInstructions = storageInstructions;
    if (notes !== undefined) updateData.notes = notes;
    if (verifiedAt !== undefined) updateData.verifiedAt = verifiedAt ? new Date(verifiedAt) : null;
    
    // Update existing item
    const [updated] = await db
      .update(receiptItems)
      .set(updateData)
      .where(and(
        eq(receiptItems.receiptId, receiptId),
        eq(receiptItems.itemId, shipmentItemId)
      ))
      .returning({ 
        id: receiptItems.id,
        receivedQuantity: receiptItems.receivedQuantity,
        damagedQuantity: receiptItems.damagedQuantity,
        missingQuantity: receiptItems.missingQuantity,
        condition: receiptItems.condition,
        barcode: receiptItems.barcode,
        warehouseLocation: receiptItems.warehouseLocation,
        additionalLocation: receiptItems.additionalLocation,
        storageInstructions: receiptItems.storageInstructions,
        notes: receiptItems.notes,
        verifiedAt: receiptItems.verifiedAt
      });
    
    res.json({ success: true, updated });
  } catch (error) {
    console.error("Error updating receipt item:", error);
    res.status(500).json({ success: false, message: "Failed to update receipt item" });
  }
});

// PATCH endpoint for atomic increment/decrement of item quantity
router.patch("/receipts/:id/items/:itemId/increment", async (req, res) => {
  try {
    const receiptId = parseInt(req.params.id);
    const shipmentItemId = parseInt(req.params.itemId); // This is the shipment/purchase item ID
    const { delta } = req.body; // delta can be positive or negative
    
    if (delta === undefined || delta === 0) {
      return res.status(400).json({ success: false, message: "Delta value required" });
    }
    
    // Check if receipt item exists
    const [existingItem] = await db
      .select()
      .from(receiptItems)
      .where(and(
        eq(receiptItems.receiptId, receiptId),
        eq(receiptItems.itemId, shipmentItemId)
      ));
    
    // If item doesn't exist, create it first with the delta value
    if (!existingItem) {
      const initialQuantity = Math.max(0, delta);
      const [newItem] = await db
        .insert(receiptItems)
        .values({
          receiptId,
          itemId: shipmentItemId,
          itemType: 'custom', // Default, can be updated
          expectedQuantity: 1,
          receivedQuantity: initialQuantity,
          damagedQuantity: 0,
          missingQuantity: 0,
          condition: 'pending',
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning({
          id: receiptItems.id,
          receivedQuantity: receiptItems.receivedQuantity
        });
      
      return res.json({ success: true, updated: newItem });
    }
    
    // Atomic increment using SQL - look for receipt item by its item_id field
    const [updated] = await db
      .update(receiptItems)
      .set({ 
        receivedQuantity: sql`GREATEST(0, ${receiptItems.receivedQuantity} + ${delta})`,
        updatedAt: new Date()
      })
      .where(and(
        eq(receiptItems.receiptId, receiptId),
        eq(receiptItems.itemId, shipmentItemId)  // Use item_id to find the receipt item
      ))
      .returning({ 
        id: receiptItems.id,
        receivedQuantity: receiptItems.receivedQuantity
      });
    
    res.json({ success: true, updated });
  } catch (error) {
    console.error("Error incrementing item quantity:", error);
    res.status(500).json({ success: false, message: "Failed to increment quantity" });
  }
});

// PATCH endpoint for tracking numbers
router.patch("/receipts/:id/tracking", async (req, res) => {
  try {
    const receiptId = parseInt(req.params.id);
    const { action, trackingNumber } = req.body;
    
    if (!action || !trackingNumber) {
      return res.status(400).json({ success: false, message: "Action and tracking number required" });
    }
    
    // Validate tracking number (ensure it's a reasonable string)
    const trimmedTracking = trackingNumber.trim();
    if (trimmedTracking.length === 0 || trimmedTracking.length > 100) {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid tracking number length (must be 1-100 characters)" 
      });
    }
    
    // Get current tracking numbers
    const [receipt] = await db
      .select({ trackingNumbers: receipts.trackingNumbers })
      .from(receipts)
      .where(eq(receipts.id, receiptId));
    
    if (!receipt) {
      return res.status(404).json({ success: false, message: "Receipt not found" });
    }
    
    // Ensure proper structure for tracking data
    const trackingData = receipt.trackingNumbers as any || { numbers: [], scannedParcels: 0 };
    if (!Array.isArray(trackingData.numbers)) {
      trackingData.numbers = [];
    }
    
    // Handle add/remove actions
    if (action === 'add') {
      // Check for duplicate (case-insensitive)
      const exists = trackingData.numbers.some((num: string) => 
        num.toLowerCase() === trimmedTracking.toLowerCase()
      );
      
      if (!exists) {
        trackingData.numbers.push(trimmedTracking);
        // Auto-increment scannedParcels when adding tracking numbers
        if (typeof trackingData.scannedParcels === 'number') {
          trackingData.scannedParcels = Math.min(
            trackingData.scannedParcels + 1, 
            trackingData.numbers.length
          );
        } else {
          trackingData.scannedParcels = trackingData.numbers.length;
        }
      } else {
        return res.status(400).json({ 
          success: false, 
          message: "Tracking number already exists" 
        });
      }
    } else if (action === 'remove') {
      const index = trackingData.numbers.findIndex((num: string) => 
        num.toLowerCase() === trimmedTracking.toLowerCase()
      );
      
      if (index > -1) {
        trackingData.numbers.splice(index, 1);
        // Auto-decrement scannedParcels when removing tracking numbers
        if (typeof trackingData.scannedParcels === 'number' && trackingData.scannedParcels > 0) {
          trackingData.scannedParcels = Math.max(0, trackingData.scannedParcels - 1);
        }
      }
    } else {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid action. Use 'add' or 'remove'" 
      });
    }
    
    // Ensure scannedParcels doesn't exceed the number of tracking numbers
    trackingData.scannedParcels = Math.min(
      trackingData.scannedParcels || 0, 
      trackingData.numbers.length
    );
    
    // Update with modified tracking numbers
    const [updated] = await db
      .update(receipts)
      .set({ 
        trackingNumbers: trackingData,
        updatedAt: new Date()
      })
      .where(eq(receipts.id, receiptId))
      .returning({ 
        id: receipts.id,
        trackingNumbers: receipts.trackingNumbers
      });
    
    res.json({ success: true, updated, trackingData });
  } catch (error) {
    console.error("Error updating tracking numbers:", error);
    res.status(500).json({ success: false, message: "Failed to update tracking numbers" });
  }
});

// PATCH endpoint for photos (optimized)
router.patch("/receipts/:id/photos", async (req, res) => {
  try {
    const receiptId = parseInt(req.params.id);
    const { photos } = req.body;
    
    if (!Array.isArray(photos)) {
      return res.status(400).json({ success: false, message: "Photos must be an array" });
    }
    
    // Single efficient update for photos
    const [updated] = await db
      .update(receipts)
      .set({ 
        photos,
        updatedAt: new Date()
      })
      .where(eq(receipts.id, receiptId))
      .returning({ 
        id: receipts.id,
        photos: receipts.photos
      });
    
    if (!updated) {
      return res.status(404).json({ success: false, message: "Receipt not found" });
    }
    
    res.json({ success: true, updated });
  } catch (error) {
    console.error("Error updating photos:", error);
    res.status(500).json({ success: false, message: "Failed to update photos" });
  }
});

// PATCH endpoint for status changes (restricted to specific transitions for safety)
router.patch("/receipts/:id/status", async (req: any, res) => {
  try {
    const receiptId = parseInt(req.params.id);
    let { status } = req.body;
    
    if (!status) {
      return res.status(400).json({ success: false, message: "Status is required" });
    }
    
    // Normalize status: trim whitespace and convert to lowercase
    status = status.trim().toLowerCase();
    
    // Get current receipt to validate status transition
    const [currentReceipt] = await db
      .select()
      .from(receipts)
      .where(eq(receipts.id, receiptId))
      .limit(1);
    
    if (!currentReceipt) {
      return res.status(404).json({ success: false, message: "Receipt not found" });
    }
    
    // Define allowed status transitions
    const allowedTransitions: Record<string, string[]> = {
      'completed': ['to_receive'], // Only allow sending completed receipts back to receive
      'pending_approval': ['receiving'], // Allow sending back to receiving for corrections
      // Add other safe transitions as needed
    };
    
    const currentStatus = currentReceipt.status;
    const allowedNext = allowedTransitions[currentStatus] || [];
    
    // Audit logging for status change attempts
    const userId = req.user?.id || 'unknown';
    const userName = req.user?.username || 'unknown';
    const timestamp = new Date().toISOString();
    
    console.log(`[AUDIT] Status change attempt - Receipt: ${receiptId}, User: ${userName} (${userId}), From: ${currentStatus}, To: ${status}, Time: ${timestamp}`);
    
    if (!allowedNext.includes(status)) {
      // Log failed attempt
      console.log(`[AUDIT] Status change DENIED - Receipt: ${receiptId}, User: ${userName}, Reason: Transition not allowed`);
      
      // Return 403 for disallowed transitions (not 400)
      // Don't expose internal state in error message
      return res.status(403).json({ 
        success: false, 
        message: "This status transition is not allowed" 
      });
    }
    
    const [updated] = await db
      .update(receipts)
      .set({ 
        status,
        updatedAt: new Date()
      })
      .where(eq(receipts.id, receiptId))
      .returning();
    
    // Log successful status change
    console.log(`[AUDIT] Status change SUCCESS - Receipt: ${receiptId}, User: ${userName}, From: ${currentStatus}, To: ${status}`);
    
    res.json({ success: true, receipt: updated });
  } catch (error) {
    console.error("Error updating receipt status:", error);
    res.status(500).json({ success: false, message: "Failed to update status" });
  }
});

// DELETE endpoint for single photo removal (ID-based for concurrent safety)
router.delete("/receipts/:receiptId/photos/:photoId", async (req, res) => {
  try {
    const receiptId = parseInt(req.params.receiptId);
    const photoId = req.params.photoId;
    
    if (isNaN(receiptId) || !photoId) {
      return res.status(400).json({ success: false, message: "Invalid receipt ID or photo ID" });
    }
    
    // Use a transaction for atomic update with row-level locking
    const result = await db.transaction(async (tx) => {
      // First, get the current photos array with lock
      const [currentReceipt] = await tx
        .select({ photos: receipts.photos })
        .from(receipts)
        .where(eq(receipts.id, receiptId))
        .limit(1)
        .for('update'); // Add row-level lock to prevent concurrent modifications
      
      if (!currentReceipt) {
        throw new Error("Receipt not found");
      }
      
      const photos = currentReceipt.photos || [];
      
      // Find the photo with the given ID
      const photoIndex = photos.findIndex((photo: any) => {
        // Handle both string (legacy) and object formats
        if (typeof photo === 'string') {
          // For legacy strings, use hash of the string as ID
          const legacyId = crypto.createHash('sha256').update(photo).digest('hex').substring(0, 10);
          return legacyId === photoId;
        }
        // For new format with ID
        return photo.id === photoId;
      });
      
      if (photoIndex === -1) {
        throw new Error("Photo not found");
      }
      
      // Store the original position for response
      const originalPosition = photoIndex;
      
      // Remove the photo with the matching ID
      const updatedPhotos = photos.filter((photo: any, index: number) => index !== photoIndex);
      
      // Update only the photos field (fast operation)
      await tx
        .update(receipts)
        .set({ 
          photos: updatedPhotos,
          updatedAt: new Date()
        })
        .where(eq(receipts.id, receiptId));
      
      return { originalPosition, remainingCount: updatedPhotos.length };
    });
    
    // Quick response with additional info for debugging
    res.json({ 
      success: true, 
      message: "Photo deleted successfully",
      originalPosition: result.originalPosition,
      remainingPhotos: result.remainingCount
    });
  } catch (error) {
    console.error("Error deleting photo:", error);
    const message = error instanceof Error ? error.message : "Failed to delete photo";
    res.status(
      error instanceof Error && error.message === "Receipt not found" ? 404 : 
      error instanceof Error && error.message === "Photo not found" ? 404 : 500
    ).json({ success: false, message });
  }
});

// Complete receiving process for a shipment
router.post("/receipts/complete/:receiptId", async (req, res) => {
  try {
    const receiptId = parseInt(req.params.receiptId);
    
    // Fetch the receipt with validation
    const [receipt] = await db
      .select()
      .from(receipts)
      .where(eq(receipts.id, receiptId));
    
    if (!receipt) {
      return res.status(404).json({ message: "Receipt not found" });
    }
    
    // Check if receipt is already completed
    if (receipt.status === 'verified' || receipt.status === 'approved') {
      return res.status(400).json({ 
        message: "Receipt has already been completed" 
      });
    }
    
    // Get the shipment
    const [shipment] = await db
      .select()
      .from(shipments)
      .where(eq(shipments.id, receipt.shipmentId));
    
    if (!shipment) {
      return res.status(404).json({ message: "Shipment not found" });
    }
    
    // Check if shipment is in receiving status
    if (shipment.receivingStatus !== 'receiving') {
      return res.status(400).json({ 
        message: "Shipment is not in receiving status" 
      });
    }
    
    // Get all receipt items to validate they are processed
    const receiptItemsList = await db
      .select()
      .from(receiptItems)
      .where(eq(receiptItems.receiptId, receiptId));
    
    // Check if there are any items
    if (receiptItemsList.length === 0) {
      return res.status(400).json({ 
        message: "No items found in receipt" 
      });
    }
    
    // Helper function to calculate item status
    const getItemStatus = (item: typeof receiptItemsList[0]) => {
      const expectedQty = item.expectedQuantity || 0;
      const receivedQty = item.receivedQuantity || 0;
      const damagedQty = item.damagedQuantity || 0;
      const missingQty = item.missingQuantity || 0;
      
      if (receivedQty === expectedQty && damagedQty === 0 && missingQty === 0) {
        return 'complete';
      } else if (damagedQty > 0 && receivedQty === 0) {
        return 'damaged';
      } else if (damagedQty > 0) {
        return 'partial_damaged';
      } else if (missingQty > 0 && receivedQty === 0) {
        return 'missing';
      } else if (missingQty > 0) {
        return 'partial_missing';
      } else if (receivedQty > 0 && receivedQty < expectedQty) {
        return 'partial';
      } else if (receivedQty === 0) {
        return 'pending';
      }
      return 'pending';
    };
    
    // Check if all items have been processed (not pending)
    const pendingItems = receiptItemsList.filter(item => 
      getItemStatus(item) === 'pending'
    );
    
    if (pendingItems.length > 0) {
      return res.status(400).json({ 
        message: `Cannot complete receiving: ${pendingItems.length} items are still pending`,
        pendingCount: pendingItems.length
      });
    }
    
    // Calculate statistics for the receipt
    const totalItems = receiptItemsList.length;
    const completeItems = receiptItemsList.filter(item => getItemStatus(item) === 'complete').length;
    const damagedItems = receiptItemsList.filter(item => {
      const status = getItemStatus(item);
      return status === 'damaged' || status === 'partial_damaged';
    }).length;
    const missingItems = receiptItemsList.filter(item => {
      const status = getItemStatus(item);
      return status === 'missing' || status === 'partial_missing';
    }).length;
    const partialItems = receiptItemsList.filter(item => getItemStatus(item) === 'partial').length;
    
    // Begin transaction to update both receipt and shipment
    await db.transaction(async (tx) => {
      // Update receipt status to pending_approval and set completedAt
      await tx
        .update(receipts)
        .set({
          status: 'pending_approval',
          // Store completion timestamp in trackingNumbers JSON field
          trackingNumbers: {
            ...(receipt.trackingNumbers as any || {}),
            completedAt: new Date().toISOString(),
            completionStats: {
              totalItems,
              completeItems,
              damagedItems,
              missingItems,
              partialItems
            }
          },
          updatedAt: new Date()
        })
        .where(eq(receipts.id, receiptId));
      
      // Update shipment receiving status to pending_approval
      await tx
        .update(shipments)
        .set({
          receivingStatus: 'pending_approval',
          updatedAt: new Date()
        })
        .where(eq(shipments.id, receipt.shipmentId));
    });
    
    // Fetch updated data to return
    const [updatedReceipt] = await db
      .select()
      .from(receipts)
      .where(eq(receipts.id, receiptId));
    
    const [updatedShipment] = await db
      .select()
      .from(shipments)
      .where(eq(shipments.id, receipt.shipmentId));
    
    res.json({
      success: true,
      message: "Receiving completed successfully",
      receipt: updatedReceipt,
      shipment: updatedShipment,
      stats: {
        totalItems,
        completeItems,
        damagedItems,
        missingItems,
        partialItems
      }
    });
  } catch (error) {
    console.error("Error completing receipt:", error);
    res.status(500).json({ 
      message: "Failed to complete receiving",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

// Get storage items for a receipt (items ready to be placed in warehouse)
router.get('/receipts/:id/storage-items', async (req, res) => {
  try {
    const receiptId = parseInt(req.params.id);
    
    // Get receipt with shipment and items
    const [receipt] = await db
      .select()
      .from(receipts)
      .where(eq(receipts.id, receiptId));
    
    if (!receipt) {
      return res.status(404).json({ message: "Receipt not found" });
    }
    
    // Get receipt items with product information
    const receiptItemsList = await db
      .select({
        id: receiptItems.id,
        itemId: receiptItems.itemId,
        itemType: receiptItems.itemType,
        expectedQuantity: receiptItems.expectedQuantity,
        receivedQuantity: receiptItems.receivedQuantity,
        damagedQuantity: receiptItems.damagedQuantity,
        missingQuantity: receiptItems.missingQuantity,
        barcode: receiptItems.barcode,
        warehouseLocation: receiptItems.warehouseLocation,
        additionalLocation: receiptItems.additionalLocation,
        notes: receiptItems.notes,
        condition: receiptItems.condition
      })
      .from(receiptItems)
      .where(eq(receiptItems.receiptId, receiptId));
    
    // For each item, get product details and existing locations
    const itemsWithDetails = await Promise.all(receiptItemsList.map(async (item) => {
      let productInfo = null;
      let existingLocations: any[] = [];
      
      if (item.itemType === 'purchase') {
        // Get purchase item details
        const [purchaseItem] = await db
          .select()
          .from(purchaseItems)
          .where(eq(purchaseItems.id, item.itemId));
        
        if (purchaseItem) {
          // Try to find matching product by SKU or barcode
          const [product] = await db
            .select()
            .from(products)
            .where(
              or(
                eq(products.sku, purchaseItem.sku || ''),
                eq(products.barcode, item.barcode || '')
              )
            )
            .limit(1);
          
          if (product) {
            productInfo = {
              productId: product.id,
              productName: product.name,
              sku: product.sku,
              barcode: product.barcode
            };
            
            // Get existing locations for this product
            existingLocations = await db
              .select({
                id: productLocations.id,
                locationCode: productLocations.locationCode,
                locationType: productLocations.locationType,
                quantity: productLocations.quantity,
                isPrimary: productLocations.isPrimary,
                notes: productLocations.notes
              })
              .from(productLocations)
              .where(eq(productLocations.productId, product.id));
          } else {
            // No matching product found, use purchase item details
            productInfo = {
              productId: null,
              productName: purchaseItem.name || `Item #${item.itemId}`,
              sku: purchaseItem.sku,
              barcode: item.barcode
            };
          }
        }
      } else if (item.itemType === 'custom') {
        // Get custom item details from the customItems table (not consolidationItems)
        const [customItemData] = await db
          .select()
          .from(customItems)
          .where(eq(customItems.id, item.itemId));
        
        if (customItemData) {
          productInfo = {
            productId: null,
            productName: customItemData.name || `Custom Item #${item.itemId}`,
            sku: customItemData.sku || null,
            barcode: customItemData.barcode || item.barcode
          };
        }
      }
      
      return {
        ...item,
        ...productInfo,
        existingLocations
      };
    }));
    
    // Get shipment details
    const [shipment] = await db
      .select({
        id: shipments.id,
        consolidationId: shipments.consolidationId,
        trackingNumber: shipments.trackingNumber,
        shipmentName: shipments.shipmentName,
        status: shipments.status
      })
      .from(shipments)
      .where(eq(shipments.id, receipt.shipmentId));
    
    const responseData = {
      receipt: {
        id: receipt.id,
        shipmentId: receipt.shipmentId,
        shipmentName: shipment?.shipmentName || `Shipment #${receipt.shipmentId}`,
        status: receipt.status
      },
      items: itemsWithDetails
    };
    
    // Filter financial data based on user role
    const userRole = (req as any).user?.role || 'warehouse_operator';
    const filtered = filterFinancialData(responseData, userRole);
    res.json(filtered);
  } catch (error) {
    console.error("Error fetching storage items:", error);
    res.status(500).json({ 
      message: "Failed to fetch storage items",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

// Get comprehensive shipment report with product prices and locations
router.get('/receipts/:id/report', async (req, res) => {
  try {
    const receiptId = parseInt(req.params.id);
    
    // Get receipt with all details
    const [receipt] = await db
      .select()
      .from(receipts)
      .where(eq(receipts.id, receiptId));
    
    if (!receipt) {
      return res.status(404).json({ message: "Receipt not found" });
    }
    
    // Get shipment details
    const [shipment] = await db
      .select()
      .from(shipments)
      .where(eq(shipments.id, receipt.shipmentId));
    
    // Get receipt items
    const receiptItemsList = await db
      .select()
      .from(receiptItems)
      .where(eq(receiptItems.receiptId, receiptId));
    
    // For each item, get product details including prices and locations
    const itemsWithDetails = await Promise.all(receiptItemsList.map(async (item) => {
      // Initialize with defaults - always have a product name fallback
      let productInfo: any = {
        productId: null,
        productName: item.sku || `Item #${item.id}`,
        sku: item.sku,
        barcode: item.barcode,
        imageUrl: null
      };
      let productPrices: any = null;
      let warehouseLocations: any[] = [];
      let resolvedItemType = item.itemType;
      
      // ALWAYS try to find purchase item first, regardless of itemType
      // (itemType may be incorrectly set to 'custom' even for purchase-backed items)
      const [purchaseItem] = await db
        .select()
        .from(purchaseItems)
        .where(eq(purchaseItems.id, item.itemId));
      
      if (purchaseItem) {
        // Found purchase item - use its name as the primary source
        resolvedItemType = 'purchase';
        productInfo = {
          productId: null,
          productName: purchaseItem.name,
          sku: purchaseItem.sku || item.sku,
          barcode: item.barcode,
          imageUrl: purchaseItem.imageUrl || null
        };
        
        // Try to find matching product by SKU or barcode for prices and locations
        const [product] = await db
          .select()
          .from(products)
          .where(
            or(
              eq(products.sku, purchaseItem.sku || ''),
              eq(products.barcode, item.barcode || '')
            )
          )
          .limit(1);
        
        if (product) {
          productInfo = {
            productId: product.id,
            productName: product.name,
            sku: product.sku,
            barcode: product.barcode,
            imageUrl: product.imageUrl
          };
          
          productPrices = {
            priceCzk: product.priceCzk,
            priceEur: product.priceEur,
            priceUsd: product.priceUsd
          };
          
          // Get all warehouse locations for this product
          warehouseLocations = await db
            .select({
              id: productLocations.id,
              locationCode: productLocations.locationCode,
              locationType: productLocations.locationType,
              quantity: productLocations.quantity,
              isPrimary: productLocations.isPrimary,
              notes: productLocations.notes
            })
            .from(productLocations)
            .where(eq(productLocations.productId, product.id));
        }
      } else if (item.itemType === 'custom') {
        // Only treat as custom if no purchase item was found AND itemType says custom
        // Query the customItems table (not consolidationItems) to get the actual name
        const [customItemData] = await db
          .select()
          .from(customItems)
          .where(eq(customItems.id, item.itemId));
        
        productInfo = {
          productId: null,
          productName: customItemData?.name || item.sku || `Custom Item #${item.itemId}`,
          sku: customItemData?.sku || item.sku,
          barcode: customItemData?.barcode || item.barcode,
          imageUrl: null
        };
        
        // Also try to find matching product by SKU for prices/locations
        if (customItemData?.sku) {
          const [matchingProduct] = await db
            .select()
            .from(products)
            .where(eq(products.sku, customItemData.sku))
            .limit(1);
          
          if (matchingProduct) {
            productInfo = {
              productId: matchingProduct.id,
              productName: matchingProduct.name,
              sku: matchingProduct.sku,
              barcode: matchingProduct.barcode,
              imageUrl: matchingProduct.imageUrl
            };
            
            productPrices = {
              priceCzk: matchingProduct.priceCzk,
              priceEur: matchingProduct.priceEur,
              priceUsd: matchingProduct.priceUsd
            };
            
            warehouseLocations = await db
              .select({
                id: productLocations.id,
                locationCode: productLocations.locationCode,
                locationType: productLocations.locationType,
                quantity: productLocations.quantity,
                isPrimary: productLocations.isPrimary,
                notes: productLocations.notes
              })
              .from(productLocations)
              .where(eq(productLocations.productId, matchingProduct.id));
          }
        }
      }
      
      // Calculate status based on quantities
      let itemStatus = 'ok';
      if (item.damagedQuantity && item.damagedQuantity > 0) {
        itemStatus = 'damaged';
      } else if (item.missingQuantity && item.missingQuantity > 0) {
        itemStatus = 'missing';
      } else if (item.receivedQuantity < item.expectedQuantity) {
        itemStatus = 'partial';
      }
      
      return {
        receiptItemId: item.id,
        itemId: item.itemId,
        itemType: resolvedItemType,
        expectedQuantity: item.expectedQuantity,
        receivedQuantity: item.receivedQuantity,
        damagedQuantity: item.damagedQuantity || 0,
        missingQuantity: item.missingQuantity || 0,
        status: itemStatus,
        condition: item.condition,
        notes: item.notes,
        barcode: item.barcode,
        warehouseLocation: item.warehouseLocation,
        ...productInfo,
        prices: productPrices,
        locations: warehouseLocations
      };
    }));
    
    // Calculate summary statistics
    const summary = {
      totalItems: itemsWithDetails.length,
      totalExpected: itemsWithDetails.reduce((sum, i) => sum + i.expectedQuantity, 0),
      totalReceived: itemsWithDetails.reduce((sum, i) => sum + i.receivedQuantity, 0),
      totalDamaged: itemsWithDetails.reduce((sum, i) => sum + i.damagedQuantity, 0),
      totalMissing: itemsWithDetails.reduce((sum, i) => sum + i.missingQuantity, 0),
      okItems: itemsWithDetails.filter(i => i.status === 'ok').length,
      damagedItems: itemsWithDetails.filter(i => i.status === 'damaged').length,
      missingItems: itemsWithDetails.filter(i => i.status === 'missing').length,
      partialItems: itemsWithDetails.filter(i => i.status === 'partial').length
    };
    
    const reportData = {
      receipt: {
        id: receipt.id,
        receiptNumber: receipt.receiptNumber,
        status: receipt.status,
        receivedAt: receipt.receivedAt,
        completedAt: receipt.completedAt,
        approvedAt: receipt.approvedAt,
        receivedBy: receipt.receivedBy,
        verifiedBy: receipt.verifiedBy,
        approvedBy: receipt.approvedBy,
        carrier: receipt.carrier,
        parcelCount: receipt.parcelCount,
        notes: receipt.notes,
        damageNotes: receipt.damageNotes,
        photos: receipt.photos || [],
        scannedParcels: receipt.scannedParcels || []
      },
      shipment: shipment ? {
        id: shipment.id,
        shipmentName: shipment.shipmentName,
        trackingNumber: shipment.trackingNumber,
        carrier: shipment.carrier,
        status: shipment.status,
        estimatedArrival: shipment.estimatedArrival,
        actualArrival: shipment.actualArrival
      } : null,
      items: itemsWithDetails,
      summary
    };
    
    // Note: We intentionally don't filter financial data for this endpoint
    // Warehouse operators need to see prices on printed warehouse labels
    res.json(reportData);
  } catch (error) {
    console.error("Error fetching shipment report:", error);
    res.status(500).json({ 
      message: "Failed to fetch shipment report",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

// Get comprehensive report by SHIPMENT ID (not receipt ID)
router.get('/shipments/:id/report', async (req, res) => {
  try {
    const shipmentId = parseInt(req.params.id);
    
    // Get shipment details
    const [shipment] = await db
      .select()
      .from(shipments)
      .where(eq(shipments.id, shipmentId));
    
    if (!shipment) {
      return res.status(404).json({ message: "Shipment not found" });
    }
    
    // Get receipt for this shipment
    const [receipt] = await db
      .select()
      .from(receipts)
      .where(eq(receipts.shipmentId, shipmentId));
    
    if (!receipt) {
      return res.status(404).json({ message: "No receipt found for this shipment" });
    }
    
    // Get receipt items
    const receiptItemsList = await db
      .select()
      .from(receiptItems)
      .where(eq(receiptItems.receiptId, receipt.id));
    
    // For each item, get product details including prices and locations
    const itemsWithDetails = await Promise.all(receiptItemsList.map(async (item) => {
      // Initialize with defaults - always have a product name fallback
      let productInfo: any = {
        productId: null,
        productName: item.sku || `Item #${item.id}`,
        sku: item.sku,
        barcode: item.barcode,
        imageUrl: null
      };
      let productPrices: any = null;
      let warehouseLocations: any[] = [];
      let resolvedItemType = item.itemType;
      
      // ALWAYS try to find purchase item first, regardless of itemType
      // (itemType may be incorrectly set to 'custom' even for purchase-backed items)
      const [purchaseItem] = await db
        .select()
        .from(purchaseItems)
        .where(eq(purchaseItems.id, item.itemId));
      
      if (purchaseItem) {
        // Found purchase item - use its name as the primary source
        resolvedItemType = 'purchase';
        productInfo = {
          productId: null,
          productName: purchaseItem.name,
          sku: purchaseItem.sku || item.sku,
          barcode: item.barcode,
          imageUrl: purchaseItem.imageUrl || null
        };
        
        // Try to find matching product by SKU or barcode for prices and locations
        const [product] = await db
          .select()
          .from(products)
          .where(
            or(
              eq(products.sku, purchaseItem.sku || ''),
              eq(products.barcode, item.barcode || '')
            )
          )
          .limit(1);
        
        if (product) {
          productInfo = {
            productId: product.id,
            productName: product.name,
            sku: product.sku,
            barcode: product.barcode,
            imageUrl: product.imageUrl
          };
          
          productPrices = {
            priceCzk: product.priceCzk,
            priceEur: product.priceEur,
            priceUsd: product.priceUsd
          };
          
          // Get all warehouse locations for this product
          warehouseLocations = await db
            .select({
              id: productLocations.id,
              locationCode: productLocations.locationCode,
              locationType: productLocations.locationType,
              quantity: productLocations.quantity,
              isPrimary: productLocations.isPrimary,
              notes: productLocations.notes
            })
            .from(productLocations)
            .where(eq(productLocations.productId, product.id));
        }
      } else if (item.itemType === 'custom') {
        // Only treat as custom if no purchase item was found AND itemType says custom
        // Query the customItems table (not consolidationItems) to get the actual name
        const [customItemData] = await db
          .select()
          .from(customItems)
          .where(eq(customItems.id, item.itemId));
        
        productInfo = {
          productId: null,
          productName: customItemData?.name || item.sku || `Custom Item #${item.itemId}`,
          sku: customItemData?.sku || item.sku,
          barcode: customItemData?.barcode || item.barcode,
          imageUrl: null
        };
        
        // Also try to find matching product by SKU for prices/locations
        if (customItemData?.sku) {
          const [matchingProduct] = await db
            .select()
            .from(products)
            .where(eq(products.sku, customItemData.sku))
            .limit(1);
          
          if (matchingProduct) {
            productInfo = {
              productId: matchingProduct.id,
              productName: matchingProduct.name,
              sku: matchingProduct.sku,
              barcode: matchingProduct.barcode,
              imageUrl: matchingProduct.imageUrl
            };
            
            productPrices = {
              priceCzk: matchingProduct.priceCzk,
              priceEur: matchingProduct.priceEur,
              priceUsd: matchingProduct.priceUsd
            };
            
            warehouseLocations = await db
              .select({
                id: productLocations.id,
                locationCode: productLocations.locationCode,
                locationType: productLocations.locationType,
                quantity: productLocations.quantity,
                isPrimary: productLocations.isPrimary,
                notes: productLocations.notes
              })
              .from(productLocations)
              .where(eq(productLocations.productId, matchingProduct.id));
          }
        }
      }
      
      // Calculate status based on quantities
      let itemStatus = 'ok';
      if (item.damagedQuantity && item.damagedQuantity > 0) {
        itemStatus = 'damaged';
      } else if (item.missingQuantity && item.missingQuantity > 0) {
        itemStatus = 'missing';
      } else if (item.receivedQuantity < item.expectedQuantity) {
        itemStatus = 'partial';
      }
      
      return {
        receiptItemId: item.id,
        itemId: item.itemId,
        itemType: resolvedItemType,
        expectedQuantity: item.expectedQuantity,
        receivedQuantity: item.receivedQuantity,
        damagedQuantity: item.damagedQuantity || 0,
        missingQuantity: item.missingQuantity || 0,
        status: itemStatus,
        condition: item.condition,
        notes: item.notes,
        barcode: item.barcode,
        warehouseLocation: item.warehouseLocation,
        ...productInfo,
        prices: productPrices,
        locations: warehouseLocations
      };
    }));
    
    // Calculate summary statistics
    const summary = {
      totalItems: itemsWithDetails.length,
      totalExpected: itemsWithDetails.reduce((sum, i) => sum + i.expectedQuantity, 0),
      totalReceived: itemsWithDetails.reduce((sum, i) => sum + i.receivedQuantity, 0),
      totalDamaged: itemsWithDetails.reduce((sum, i) => sum + i.damagedQuantity, 0),
      totalMissing: itemsWithDetails.reduce((sum, i) => sum + i.missingQuantity, 0),
      okItems: itemsWithDetails.filter(i => i.status === 'ok').length,
      damagedItems: itemsWithDetails.filter(i => i.status === 'damaged').length,
      missingItems: itemsWithDetails.filter(i => i.status === 'missing').length,
      partialItems: itemsWithDetails.filter(i => i.status === 'partial').length
    };
    
    const reportData = {
      receipt: {
        id: receipt.id,
        receiptNumber: receipt.receiptNumber,
        status: receipt.status,
        receivedAt: receipt.receivedAt,
        completedAt: receipt.completedAt,
        approvedAt: receipt.approvedAt,
        receivedBy: receipt.receivedBy,
        verifiedBy: receipt.verifiedBy,
        approvedBy: receipt.approvedBy,
        carrier: receipt.carrier,
        parcelCount: receipt.parcelCount,
        notes: receipt.notes,
        damageNotes: receipt.damageNotes,
        photos: receipt.photos || [],
        scannedParcels: receipt.scannedParcels || []
      },
      shipment: {
        id: shipment.id,
        shipmentName: shipment.shipmentName,
        trackingNumber: shipment.trackingNumber,
        carrier: shipment.carrier,
        status: shipment.status,
        estimatedArrival: shipment.estimatedArrival,
        actualArrival: shipment.actualArrival
      },
      items: itemsWithDetails,
      summary
    };
    
    // Note: We intentionally don't filter financial data for this endpoint
    // Warehouse operators need to see prices on printed warehouse labels
    res.json(reportData);
  } catch (error) {
    console.error("Error fetching shipment report by shipment ID:", error);
    res.status(500).json({ 
      message: "Failed to fetch shipment report",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

// Store items in warehouse locations
router.post('/receipts/:id/store-items', async (req, res) => {
  try {
    const receiptId = parseInt(req.params.id);
    const { locations } = req.body;
    
    if (!locations || !Array.isArray(locations)) {
      return res.status(400).json({ message: "Locations array is required" });
    }
    
    // Verify receipt exists
    const [receipt] = await db
      .select()
      .from(receipts)
      .where(eq(receipts.id, receiptId));
    
    if (!receipt) {
      return res.status(404).json({ message: "Receipt not found" });
    }
    
    // Process each location assignment
    const results = await db.transaction(async (tx) => {
      const processedLocations = [];
      
      // Handle nested structure from frontend
      for (const assignment of locations) {
        const { receiptItemId, productId, locations: itemLocations } = assignment;
        
        // Process each location for this item
        for (const loc of (itemLocations || [])) {
          const { locationCode, locationType, quantity, isPrimary, notes } = loc;
          
          // Update receipt item with warehouse location
          await tx
            .update(receiptItems)
            .set({
              warehouseLocation: locationCode,
              storageInstructions: notes,
              updatedAt: new Date()
            })
            .where(eq(receiptItems.id, receiptItemId));
          
          // If product exists, update or create product location
          if (productId) {
          // Check if location already exists for this product
          const [existingLocation] = await tx
            .select()
            .from(productLocations)
            .where(
              and(
                eq(productLocations.productId, productId),
                eq(productLocations.locationCode, locationCode)
              )
            );
          
          if (existingLocation) {
            // Update existing location - add to quantity
            const [updatedLocation] = await tx
              .update(productLocations)
              .set({
                quantity: existingLocation.quantity + quantity,
                isPrimary: isPrimary || existingLocation.isPrimary,
                notes: notes || existingLocation.notes,
                updatedAt: new Date()
              })
              .where(eq(productLocations.id, existingLocation.id))
              .returning();
            
            processedLocations.push(updatedLocation);
          } else {
            // Create new location
            const [newLocation] = await tx
              .insert(productLocations)
              .values({
                productId,
                locationCode,
                locationType: locationType || 'warehouse',
                quantity,
                isPrimary,
                notes
              })
              .returning();
            
            processedLocations.push(newLocation);
          }
          
          // If this is set as primary, unset other locations as primary
          if (isPrimary) {
            await tx
              .update(productLocations)
              .set({ isPrimary: false })
              .where(
                and(
                  eq(productLocations.productId, productId),
                  ne(productLocations.locationCode, locationCode)
                )
              );
          }
          
          // Update product stock levels
          const totalStock = await tx
            .select({
              total: sql<number>`COALESCE(SUM(${productLocations.quantity}), 0)`
            })
            .from(productLocations)
            .where(eq(productLocations.productId, productId));
          
          await tx
            .update(products)
            .set({
              updatedAt: new Date()
            })
            .where(eq(products.id, productId));
          }
        }
      }
      
      // Update receipt status to stored if all items have been stored
      const unstored = await tx
        .select({ count: sql<number>`COUNT(*)` })
        .from(receiptItems)
        .where(
          and(
            eq(receiptItems.receiptId, receiptId),
            isNull(receiptItems.warehouseLocation)
          )
        );
      
      // Convert to number to ensure proper comparison (SQL COUNT returns string)
      const unstoredCount = Number(unstored[0]?.count || 0);
      
      if (unstoredCount === 0) {
        // Mark receipt as stored
        await tx
          .update(receipts)
          .set({
            status: 'stored',
            updatedAt: new Date()
          })
          .where(eq(receipts.id, receiptId));
        
        // Mark shipment as completed since all items have been stored
        await tx
          .update(shipments)
          .set({
            receivingStatus: 'completed',
            status: 'delivered',
            deliveredAt: new Date(),
            updatedAt: new Date()
          })
          .where(eq(shipments.id, receipt.shipmentId));
      }
      
      return processedLocations;
    });
    
    res.json({
      success: true,
      message: `Successfully stored ${results.length} items in warehouse locations`,
      locations: results
    });
  } catch (error) {
    console.error("Error storing items:", error);
    res.status(500).json({ 
      message: "Failed to store items",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

// ===== LANDING COST MANAGEMENT ENDPOINTS =====
// Initialize landing cost service
const landingCostService = new LandingCostService();

// Validation schemas for landing cost endpoints
const addCostSchema = z.object({
  type: z.enum(['FREIGHT', 'INSURANCE', 'BROKERAGE', 'PACKAGING', 'DUTY', 'OTHER']),
  mode: z.enum(['AIR', 'SEA', 'COURIER']).optional(),
  volumetricDivisor: z.number().positive().optional(),
  amountOriginal: z.number().positive(),
  currency: z.string().length(3),
  notes: z.string().optional(),
  fxRateUsed: z.number().positive().optional()
});

const updateCostSchema = z.object({
  type: z.enum(['FREIGHT', 'INSURANCE', 'BROKERAGE', 'PACKAGING', 'DUTY', 'OTHER']).optional(),
  mode: z.enum(['AIR', 'SEA', 'COURIER']).optional(),
  volumetricDivisor: z.number().positive().optional(),
  amountOriginal: z.number().positive().optional(),
  currency: z.string().length(3).optional(),
  notes: z.string().optional(),
  fxRateUsed: z.number().positive().optional()
});

const cartonSchema = z.object({
  customItemId: z.number().positive(),
  qtyInCarton: z.number().positive().int(),
  lengthCm: z.number().positive(),
  widthCm: z.number().positive(),
  heightCm: z.number().positive(),
  grossWeightKg: z.number().positive(),
  notes: z.string().optional()
});

// 1. GET /api/imports/shipments/:id/costs - Get all costs for a shipment
router.get("/shipments/:id/costs", async (req, res) => {
  try {
    const shipmentId = parseInt(req.params.id);
    
    // Verify shipment exists
    const [shipment] = await db
      .select()
      .from(shipments)
      .where(eq(shipments.id, shipmentId));
    
    if (!shipment) {
      return res.status(404).json({ message: "Shipment not found" });
    }
    
    // Fetch all costs for this shipment
    const costs = await db
      .select()
      .from(shipmentCosts)
      .where(eq(shipmentCosts.shipmentId, shipmentId))
      .orderBy(shipmentCosts.type);
    
    // Group costs by type
    const groupedCosts = costs.reduce((acc, cost) => {
      if (!acc[cost.type]) {
        acc[cost.type] = [];
      }
      acc[cost.type].push({
        id: cost.id,
        mode: cost.mode,
        volumetricDivisor: cost.volumetricDivisor,
        amountOriginal: Number(cost.amountOriginal),
        currency: cost.currency,
        amountBase: Number(cost.amountBase),
        fxRateUsed: Number(cost.fxRateUsed || 1),
        notes: cost.notes,
        createdAt: cost.createdAt,
        updatedAt: cost.updatedAt
      });
      return acc;
    }, {} as Record<string, any[]>);
    
    // Calculate totals
    const totals = {
      originalAmounts: {} as Record<string, number>,
      baseAmount: costs.reduce((sum, cost) => sum + Number(cost.amountBase || 0), 0)
    };
    
    // Sum original amounts by currency
    costs.forEach(cost => {
      if (!totals.originalAmounts[cost.currency]) {
        totals.originalAmounts[cost.currency] = 0;
      }
      totals.originalAmounts[cost.currency] += Number(cost.amountOriginal);
    });
    
    const responseData = {
      shipmentId,
      costs: groupedCosts,
      totals,
      baseCurrency: 'EUR'
    };
    
    // Filter financial data based on user role
    const userRole = (req as any).user?.role || 'warehouse_operator';
    const filtered = filterFinancialData(responseData, userRole);
    res.json(filtered);
  } catch (error) {
    console.error("Error fetching shipment costs:", error);
    res.status(500).json({ message: "Failed to fetch shipment costs" });
  }
});

// 2. POST /api/imports/shipments/:id/costs - Add a cost line to a shipment
router.post("/shipments/:id/costs", async (req, res) => {
  try {
    const shipmentId = parseInt(req.params.id);
    
    // Validate request body
    const validationResult = addCostSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ 
        message: "Invalid request body",
        errors: validationResult.error.errors 
      });
    }
    
    const costData = validationResult.data;
    
    // Verify shipment exists
    const [shipment] = await db
      .select()
      .from(shipments)
      .where(eq(shipments.id, shipmentId));
    
    if (!shipment) {
      return res.status(404).json({ message: "Shipment not found" });
    }
    
    // If FX rate not provided and currency is not EUR, fetch current rate
    let fxRate = costData.fxRateUsed || 1;
    if (costData.currency !== 'EUR' && !costData.fxRateUsed) {
      try {
        // In production, fetch from API - for now use a placeholder
        // const response = await fetch(`https://api.exchangerate-api.com/v4/latest/${costData.currency}`);
        // const data = await response.json();
        // fxRate = data.rates.EUR || 1;
        
        // Placeholder rates for common currencies
        const placeholderRates: Record<string, number> = {
          'USD': 0.92,
          'GBP': 1.16,
          'CNY': 0.13,
          'JPY': 0.0061,
          'AUD': 0.60,
          'CAD': 0.68
        };
        fxRate = placeholderRates[costData.currency] || 1;
      } catch (error) {
        console.error("Error fetching FX rate:", error);
        // Continue with rate of 1 if API fails
      }
    }
    
    // Calculate base amount
    const amountBase = landingCostService.convertToBaseCurrency(
      costData.amountOriginal,
      costData.currency,
      fxRate
    );
    
    // Insert cost record
    const [newCost] = await db.insert(shipmentCosts).values({
      shipmentId,
      type: costData.type,
      mode: costData.mode || null,
      volumetricDivisor: costData.volumetricDivisor?.toString() || null,
      amountOriginal: costData.amountOriginal.toString(),
      currency: costData.currency,
      amountBase: amountBase.toString(),
      fxRateUsed: fxRate.toString(),
      notes: costData.notes || null,
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();
    
    // Trigger landing cost recalculation
    try {
      await landingCostService.calculateLandingCosts(shipmentId);
    } catch (calcError) {
      console.error("Error recalculating landing costs:", calcError);
      // Don't fail the request if recalculation fails
    }
    
    res.status(201).json({
      message: "Cost added successfully",
      cost: newCost
    });
  } catch (error) {
    console.error("Error adding shipment cost:", error);
    res.status(500).json({ message: "Failed to add shipment cost" });
  }
});

// 3. PUT /api/imports/shipments/:id/costs/:costId - Edit a cost line
router.put("/shipments/:id/costs/:costId", async (req, res) => {
  try {
    const shipmentId = parseInt(req.params.id);
    const costId = parseInt(req.params.costId);
    
    // Validate request body
    const validationResult = updateCostSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ 
        message: "Invalid request body",
        errors: validationResult.error.errors 
      });
    }
    
    const updateData = validationResult.data;
    
    // Verify cost exists and belongs to shipment
    const [existingCost] = await db
      .select()
      .from(shipmentCosts)
      .where(and(
        eq(shipmentCosts.id, costId),
        eq(shipmentCosts.shipmentId, shipmentId)
      ));
    
    if (!existingCost) {
      return res.status(404).json({ message: "Cost not found" });
    }
    
    // Prepare update object
    const updates: any = {
      updatedAt: new Date()
    };
    
    // Update fields if provided
    if (updateData.type !== undefined) updates.type = updateData.type;
    if (updateData.mode !== undefined) updates.mode = updateData.mode;
    if (updateData.volumetricDivisor !== undefined) updates.volumetricDivisor = updateData.volumetricDivisor.toString();
    if (updateData.notes !== undefined) updates.notes = updateData.notes;
    
    // Handle amount and currency updates
    if (updateData.amountOriginal !== undefined || updateData.currency !== undefined) {
      const newAmount = updateData.amountOriginal ?? Number(existingCost.amountOriginal);
      const newCurrency = updateData.currency ?? existingCost.currency;
      
      // Use provided FX rate or existing one
      let fxRate = updateData.fxRateUsed ?? Number(existingCost.fxRateUsed || 1);
      
      // If currency changed and no FX rate provided, fetch new rate
      if (updateData.currency && !updateData.fxRateUsed && newCurrency !== 'EUR') {
        // Placeholder rates for common currencies
        const placeholderRates: Record<string, number> = {
          'USD': 0.92,
          'GBP': 1.16,
          'CNY': 0.13,
          'JPY': 0.0061,
          'AUD': 0.60,
          'CAD': 0.68
        };
        fxRate = placeholderRates[newCurrency] || 1;
      }
      
      // Calculate new base amount
      const amountBase = landingCostService.convertToBaseCurrency(
        newAmount,
        newCurrency,
        fxRate
      );
      
      updates.amountOriginal = newAmount.toString();
      updates.currency = newCurrency;
      updates.amountBase = amountBase.toString();
      updates.fxRateUsed = fxRate.toString();
    }
    
    // Update the cost
    const [updatedCost] = await db
      .update(shipmentCosts)
      .set(updates)
      .where(eq(shipmentCosts.id, costId))
      .returning();
    
    // Trigger landing cost recalculation
    try {
      await landingCostService.calculateLandingCosts(shipmentId);
    } catch (calcError) {
      console.error("Error recalculating landing costs:", calcError);
      // Don't fail the request if recalculation fails
    }
    
    res.json({
      message: "Cost updated successfully",
      cost: updatedCost
    });
  } catch (error) {
    console.error("Error updating shipment cost:", error);
    res.status(500).json({ message: "Failed to update shipment cost" });
  }
});

// 4. DELETE /api/imports/shipments/:id/costs/:costId - Remove a cost line
router.delete("/shipments/:id/costs/:costId", async (req, res) => {
  try {
    const shipmentId = parseInt(req.params.id);
    const costId = parseInt(req.params.costId);
    
    // Verify cost exists and belongs to shipment
    const [existingCost] = await db
      .select()
      .from(shipmentCosts)
      .where(and(
        eq(shipmentCosts.id, costId),
        eq(shipmentCosts.shipmentId, shipmentId)
      ));
    
    if (!existingCost) {
      return res.status(404).json({ message: "Cost not found" });
    }
    
    // Delete the cost
    await db.delete(shipmentCosts).where(eq(shipmentCosts.id, costId));
    
    // Trigger landing cost recalculation
    try {
      await landingCostService.calculateLandingCosts(shipmentId);
    } catch (calcError) {
      console.error("Error recalculating landing costs:", calcError);
      // Don't fail the request if recalculation fails
    }
    
    res.json({ message: "Cost deleted successfully" });
  } catch (error) {
    console.error("Error deleting shipment cost:", error);
    res.status(500).json({ message: "Failed to delete shipment cost" });
  }
});

// 5. POST /api/imports/shipments/:id/cartons - Add/update carton dimensions
router.post("/shipments/:id/cartons", async (req, res) => {
  try {
    const shipmentId = parseInt(req.params.id);
    
    // Validate request body - should be an array of cartons
    const cartonsSchema = z.array(cartonSchema);
    const validationResult = cartonsSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      return res.status(400).json({ 
        message: "Invalid request body",
        errors: validationResult.error.errors 
      });
    }
    
    const cartons = validationResult.data;
    
    // Verify shipment exists
    const [shipment] = await db
      .select()
      .from(shipments)
      .where(eq(shipments.id, shipmentId));
    
    if (!shipment) {
      return res.status(404).json({ message: "Shipment not found" });
    }
    
    // Use transaction to ensure consistency
    const result = await db.transaction(async (tx) => {
      // Delete existing cartons for this shipment
      await tx.delete(shipmentCartons)
        .where(eq(shipmentCartons.shipmentId, shipmentId));
      
      // Insert new cartons
      const insertedCartons = [];
      for (const carton of cartons) {
        const [inserted] = await tx.insert(shipmentCartons).values({
          shipmentId,
          customItemId: carton.customItemId,
          qtyInCarton: carton.qtyInCarton,
          lengthCm: carton.lengthCm.toString(),
          widthCm: carton.widthCm.toString(),
          heightCm: carton.heightCm.toString(),
          grossWeightKg: carton.grossWeightKg.toString(),
          createdAt: new Date(),
          updatedAt: new Date()
        }).returning();
        insertedCartons.push(inserted);
      }
      
      return insertedCartons;
    });
    
    res.status(201).json({
      message: "Cartons updated successfully",
      cartons: result
    });
  } catch (error) {
    console.error("Error updating cartons:", error);
    res.status(500).json({ message: "Failed to update cartons" });
  }
});

// 6. GET /api/imports/shipments/:id/cartons - Get carton details
router.get("/shipments/:id/cartons", async (req, res) => {
  try {
    const shipmentId = parseInt(req.params.id);
    
    // Verify shipment exists
    const [shipment] = await db
      .select()
      .from(shipments)
      .where(eq(shipments.id, shipmentId));
    
    if (!shipment) {
      return res.status(404).json({ message: "Shipment not found" });
    }
    
    // Fetch cartons - simplified query
    const cartonsList = await db
      .select()
      .from(shipmentCartons)
      .where(eq(shipmentCartons.shipmentId, shipmentId));
    
    // Fetch item details separately if needed
    const itemIds = Array.from(new Set(cartonsList.map(c => c.customItemId).filter(id => id !== null)));
    let itemMap: Record<number, any> = {};
    
    if (itemIds.length > 0) {
      const items = await db
        .select()
        .from(customItems)
        .where(inArray(customItems.id, itemIds));
      
      itemMap = items.reduce((acc, item) => {
        acc[item.id] = item;
        return acc;
      }, {} as Record<number, any>);
    }
    
    // Combine cartons with item info
    const cartons = cartonsList.map(carton => ({
      id: carton.id,
      shipmentId: carton.shipmentId,
      customItemId: carton.customItemId,
      qtyInCarton: carton.qtyInCarton,
      lengthCm: carton.lengthCm,
      widthCm: carton.widthCm,
      heightCm: carton.heightCm,
      grossWeightKg: carton.grossWeightKg,
      item: carton.customItemId ? itemMap[carton.customItemId] : null
    }));
    
    // Calculate volumetric weights
    const cartonsWithMetrics = cartons.map(carton => {
      const volumetricWeight = landingCostService.calculateVolumetricWeight(
        Number(carton.lengthCm),
        Number(carton.widthCm),
        Number(carton.heightCm)
      );
      
      const chargeableWeight = landingCostService.calculateChargeableWeight(
        Number(carton.grossWeightKg),
        volumetricWeight
      );
      
      return {
        ...carton,
        volumetricWeight,
        chargeableWeight
      };
    });
    
    const responseData = {
      shipmentId,
      cartons: cartonsWithMetrics,
      totals: {
        totalCartons: cartons.length,
        totalGrossWeight: cartons.reduce((sum, c) => sum + Number(c.grossWeightKg), 0),
        totalVolumetricWeight: cartonsWithMetrics.reduce((sum, c) => sum + c.volumetricWeight, 0),
        totalChargeableWeight: cartonsWithMetrics.reduce((sum, c) => sum + c.chargeableWeight, 0)
      }
    };
    
    // Filter financial data based on user role
    const userRole = (req as any).user?.role || 'warehouse_operator';
    const filtered = filterFinancialData(responseData, userRole);
    res.json(filtered);
  } catch (error) {
    console.error("Error fetching cartons:", error);
    res.status(500).json({ message: "Failed to fetch cartons" });
  }
});

// 7. POST /api/imports/shipments/:id/calculate-landing-costs - Trigger calculation
router.post("/shipments/:id/calculate-landing-costs", async (req, res) => {
  try {
    const shipmentId = parseInt(req.params.id);
    
    // Verify shipment exists
    const [shipment] = await db
      .select()
      .from(shipments)
      .where(eq(shipments.id, shipmentId));
    
    if (!shipment) {
      return res.status(404).json({ message: "Shipment not found" });
    }
    
    // Call the landing cost service to calculate costs
    const result = await landingCostService.calculateLandingCosts(shipmentId);
    
    res.json({
      message: "Landing costs calculated successfully",
      breakdown: result
    });
  } catch (error) {
    console.error("Error calculating landing costs:", error);
    res.status(500).json({ 
      message: "Failed to calculate landing costs",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

// 8. GET /api/imports/shipments/:id/landing-cost-preview - Preview allocations
router.get("/shipments/:id/landing-cost-preview", async (req, res) => {
  try {
    const shipmentId = parseInt(req.params.id);
    
    // Verify shipment exists
    const [shipment] = await db
      .select()
      .from(shipments)
      .where(eq(shipments.id, shipmentId));
    
    if (!shipment) {
      return res.status(404).json({ message: "Shipment not found" });
    }
    
    // Get shipment metrics for preview
    const metrics = await landingCostService.getShipmentMetrics(shipmentId);
    
    // Fetch costs for preview
    const costs = await db
      .select()
      .from(shipmentCosts)
      .where(eq(shipmentCosts.shipmentId, shipmentId));
    
    // Calculate total costs by type
    const costsByType = costs.reduce((acc, cost) => {
      if (!acc[cost.type]) {
        acc[cost.type] = 0;
      }
      acc[cost.type] += Number(cost.amountBase || 0);
      return acc;
    }, {} as Record<string, number>);

    // Get item allocation breakdown
    const items = await getItemAllocationBreakdown(shipmentId, costsByType);
    
    const responseData = {
      shipmentId,
      metrics,
      costsByType,
      totalCost: Object.values(costsByType).reduce((sum, val) => sum + val, 0),
      baseCurrency: 'EUR',
      autoSelectedMethod: 'CHARGEABLE_WEIGHT', // Default auto-selection uses weight-based allocation
      // Structure expected by AllocationPreview component
      items,
      totalItems: metrics.itemCount,
      totalUnits: metrics.totalUnits,
      totalActualWeight: metrics.totalWeight,
      totalVolumetricWeight: metrics.totalVolumetricWeight,
      totalChargeableWeight: metrics.totalChargeableWeight,
      totalCosts: {
        freight: costsByType['FREIGHT'] || 0,
        duty: costsByType['DUTY'] || 0,
        brokerage: costsByType['BROKERAGE'] || 0,
        insurance: costsByType['INSURANCE'] || 0,
        packaging: costsByType['PACKAGING'] || 0,
        other: costsByType['OTHER'] || 0,
        total: Object.values(costsByType).reduce((sum, val) => sum + val, 0)
      },
      message: "This is a preview using auto-selected weight-based allocation. Use /calculate-landing-costs to save allocations."
    };
    
    // Filter financial data based on user role
    const userRole = (req as any).user?.role || 'warehouse_operator';
    const filtered = filterFinancialData(responseData, userRole);
    res.json(filtered);
  } catch (error) {
    console.error("Error generating landing cost preview:", error);
    res.status(500).json({ message: "Failed to generate landing cost preview" });
  }
});

// Method-specific landing cost preview route
router.get("/shipments/:id/landing-cost-preview/:method", async (req, res) => {
  try {
    const shipmentId = parseInt(req.params.id);
    const method = req.params.method.toUpperCase();
    
    // Validate allocation method
    const validMethods = ['WEIGHT', 'VALUE', 'UNITS', 'HYBRID', 'VOLUME', 'PER_UNIT'];
    if (!validMethods.includes(method)) {
      return res.status(400).json({ 
        message: `Invalid allocation method. Must be one of: ${validMethods.join(', ')}` 
      });
    }
    
    // Verify shipment exists
    const [shipment] = await db
      .select()
      .from(shipments)
      .where(eq(shipments.id, shipmentId));
    
    if (!shipment) {
      return res.status(404).json({ message: "Shipment not found" });
    }
    
    // Get shipment metrics for preview
    const metrics = await landingCostService.getShipmentMetrics(shipmentId);
    
    // Fetch costs for preview
    const costs = await db
      .select()
      .from(shipmentCosts)
      .where(eq(shipmentCosts.shipmentId, shipmentId));
    
    // Calculate total costs by type
    const costsByType = costs.reduce((acc, cost) => {
      if (!acc[cost.type]) {
        acc[cost.type] = 0;
      }
      acc[cost.type] += Number(cost.amountBase || 0);
      return acc;
    }, {} as Record<string, number>);

    // Get item allocation breakdown using specified method
    const items = await getItemAllocationBreakdownWithMethod(shipmentId, costsByType, method);
    
    const responseData = {
      shipmentId,
      metrics,
      costsByType,
      totalCost: Object.values(costsByType).reduce((sum, val) => sum + val, 0),
      baseCurrency: 'EUR',
      allocationMethod: method,
      // Structure expected by AllocationPreview component
      items,
      totalItems: metrics.itemCount,
      totalUnits: metrics.totalUnits,
      totalActualWeight: metrics.totalWeight,
      totalVolumetricWeight: metrics.totalVolumetricWeight,
      totalChargeableWeight: metrics.totalChargeableWeight,
      totalCosts: {
        freight: costsByType['FREIGHT'] || 0,
        duty: costsByType['DUTY'] || 0,
        brokerage: costsByType['BROKERAGE'] || 0,
        insurance: costsByType['INSURANCE'] || 0,
        packaging: costsByType['PACKAGING'] || 0,
        other: costsByType['OTHER'] || 0,
        total: Object.values(costsByType).reduce((sum, val) => sum + val, 0)
      },
      message: `Preview using ${method} allocation method. Use /calculate-landing-costs to save allocations.`
    };
    
    // Filter financial data based on user role
    const userRole = (req as any).user?.role || 'warehouse_operator';
    const filtered = filterFinancialData(responseData, userRole);
    res.json(filtered);
  } catch (error) {
    console.error("Error generating method-specific landing cost preview:", error);
    res.status(500).json({ 
      message: "Failed to generate landing cost preview",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

// Helper function to get detailed allocation breakdown per item
async function getItemAllocationBreakdown(shipmentId: number, costsByType: Record<string, number>): Promise<any[]> {
  try {
    // Get consolidation ID
    const [shipment] = await db
      .select()
      .from(shipments)
      .where(eq(shipments.id, shipmentId))
      .limit(1);

    if (!shipment?.consolidationId) {
      return [];
    }

    // Get shipment items through consolidation items (correct relationship)
    const itemsWithCartons = await db
      .select({
        item: customItems,
        carton: shipmentCartons
      })
      .from(consolidationItems)
      .innerJoin(customItems, eq(consolidationItems.itemId, customItems.id))
      .leftJoin(shipmentCartons, and(
        eq(shipmentCartons.customItemId, customItems.id),
        eq(shipmentCartons.shipmentId, shipmentId)
      ))
      .where(eq(consolidationItems.consolidationId, shipment.consolidationId));

    const items: any[] = [];
    
    // Calculate total chargeable weight for allocation
    const totalChargeableWeight = itemsWithCartons.reduce((sum, row) => {
      const carton = row.carton;
      const item = row.item;
      
      let actualWeight: number;
      let volumetricWeight: number;
      
      if (carton) {
        // Use carton data if available
        actualWeight = parseFloat(carton.grossWeightKg || '0');
        volumetricWeight = landingCostService.calculateVolumetricWeight(
          parseFloat(carton.lengthCm || '0'),
          parseFloat(carton.widthCm || '0'),
          parseFloat(carton.heightCm || '0')
        );
      } else {
        // Fallback to item weight data
        actualWeight = parseFloat(item.weight || '0') * item.quantity;
        // Estimate volumetric weight - assume standard ratios for common products
        volumetricWeight = actualWeight * 0.8; // Conservative estimate
      }
      
      const chargeableWeight = landingCostService.calculateChargeableWeight(actualWeight, volumetricWeight);
      return sum + chargeableWeight;
    }, 0);
    
    for (const row of itemsWithCartons) {
      const item = row.item;
      const carton = row.carton;

      // Calculate weights with fallback to item data
      let actualWeight: number;
      let volumetricWeight: number;
      
      if (carton) {
        // Use carton data if available
        actualWeight = parseFloat(carton.grossWeightKg || '0');
        volumetricWeight = landingCostService.calculateVolumetricWeight(
          parseFloat(carton.lengthCm || '0'),
          parseFloat(carton.widthCm || '0'),
          parseFloat(carton.heightCm || '0')
        );
      } else {
        // Fallback to item weight data
        actualWeight = parseFloat(item.weight || '0') * item.quantity;
        // Estimate volumetric weight - assume standard ratios for common products
        volumetricWeight = actualWeight * 0.8; // Conservative estimate
      }
      
      const chargeableWeight = landingCostService.calculateChargeableWeight(actualWeight, volumetricWeight);

      // Allocate costs (weight-based allocation)
      const weightRatio = totalChargeableWeight > 0 ? chargeableWeight / totalChargeableWeight : 0;

      const freightAllocated = (costsByType['FREIGHT'] || 0) * weightRatio;
      const dutyAllocated = (costsByType['DUTY'] || 0) * weightRatio;
      const brokerageAllocated = (costsByType['BROKERAGE'] || 0) * weightRatio;
      const insuranceAllocated = (costsByType['INSURANCE'] || 0) * weightRatio;
      const packagingAllocated = (costsByType['PACKAGING'] || 0) * weightRatio;
      const otherAllocated = (costsByType['OTHER'] || 0) * weightRatio;

      const totalAllocated = freightAllocated + dutyAllocated + brokerageAllocated + insuranceAllocated + packagingAllocated + otherAllocated;
      const landingCostPerUnit = item.quantity > 0 ? totalAllocated / item.quantity : 0;

      const unitPrice = parseFloat(item.unitPrice || '0');
      const totalValue = unitPrice * item.quantity;

      items.push({
        purchaseItemId: item.id,  // Frontend expects purchaseItemId
        customItemId: item.id,
        name: item.name,
        quantity: item.quantity,
        unitPrice,  // Add unit price for purchase price column
        totalValue,
        actualWeightKg: actualWeight,
        volumetricWeightKg: volumetricWeight,
        chargeableWeightKg: chargeableWeight,
        freightAllocated,
        dutyAllocated,
        brokerageAllocated,
        insuranceAllocated,
        packagingAllocated,
        otherAllocated,
        totalAllocated,
        landingCostPerUnit,
        warnings: []
      });
    }

    return items;
  } catch (error) {
    console.error('Error getting item allocation breakdown:', error);
    return [];
  }
}

// Enhanced helper function that uses specific allocation methods from LandingCostService
async function getItemAllocationBreakdownWithMethod(
  shipmentId: number, 
  costsByType: Record<string, number>, 
  method: string
): Promise<any[]> {
  try {
    // Get consolidation ID
    const [shipment] = await db
      .select()
      .from(shipments)
      .where(eq(shipments.id, shipmentId))
      .limit(1);

    if (!shipment?.consolidationId) {
      return [];
    }

    // Get shipment items through consolidation items (same as original)
    const itemsWithCartons = await db
      .select({
        item: customItems,
        carton: shipmentCartons
      })
      .from(consolidationItems)
      .innerJoin(customItems, eq(consolidationItems.itemId, customItems.id))
      .leftJoin(shipmentCartons, and(
        eq(shipmentCartons.customItemId, customItems.id),
        eq(shipmentCartons.shipmentId, shipmentId)
      ))
      .where(eq(consolidationItems.consolidationId, shipment.consolidationId));

    if (itemsWithCartons.length === 0) {
      return [];
    }

    // Prepare items in the format expected by LandingCostService
    const itemAllocations: any[] = itemsWithCartons.map(row => {
      const item = row.item;
      const carton = row.carton;

      // Calculate weights (same logic as original)
      let actualWeight: number;
      let volumetricWeight: number;

      if (carton) {
        actualWeight = parseFloat(carton.grossWeightKg || '0');
        volumetricWeight = landingCostService.calculateVolumetricWeight(
          parseFloat(carton.lengthCm || '0'),
          parseFloat(carton.widthCm || '0'),
          parseFloat(carton.heightCm || '0')
        );
      } else {
        actualWeight = parseFloat(item.weight || '0') * item.quantity;
        volumetricWeight = actualWeight * 0.8; // Conservative estimate
      }

      const chargeableWeight = landingCostService.calculateChargeableWeight(actualWeight, volumetricWeight);
      const unitPrice = parseFloat(item.unitPrice || '0');
      const totalValue = unitPrice * item.quantity;

      return {
        customItemId: item.id,
        chargeableWeight,
        actualWeight,
        volumetricWeight,
        unitPrice,
        quantity: item.quantity,
        totalValue,
        item,
        carton
      };
    });

    // Map allocation method to LandingCostService function
    const { Decimal } = await import('decimal.js');

    const getAllocationFunction = (method: string) => {
      switch (method) {
        case 'WEIGHT':
          return (items: any[], totalCost: any) => landingCostService.allocateByChargeableWeight(items, totalCost);
        case 'VALUE':
          return (items: any[], totalCost: any) => landingCostService.allocateByValue(items, totalCost);
        case 'UNITS':
          return (items: any[], totalCost: any) => landingCostService.allocateByUnits(items, totalCost);
        case 'PER_UNIT':
          return (items: any[], totalCost: any) => landingCostService.allocatePerUnit(items, totalCost);
        case 'HYBRID':
          return (items: any[], totalCost: any) => landingCostService.allocateByHybrid(items, totalCost);
        case 'VOLUME':
          return (items: any[], totalCost: any) => landingCostService.allocateByVolume(items, totalCost);
        default:
          throw new Error(`Unsupported allocation method: ${method}`);
      }
    };

    const allocateFunction = getAllocationFunction(method);

    // Calculate allocations for each cost type using the specified method
    const results: any[] = [];

    for (const itemAllocation of itemAllocations) {
      const item = itemAllocation.item;
      
      // Calculate allocations for each cost type
      let freightAllocated = 0;
      let dutyAllocated = 0;
      let brokerageAllocated = 0;
      let insuranceAllocated = 0;
      let packagingAllocated = 0;
      let otherAllocated = 0;

      // Apply allocation method to each cost type
      const costTypes = ['FREIGHT', 'DUTY', 'BROKERAGE', 'INSURANCE', 'PACKAGING', 'OTHER'];
      
      for (const costType of costTypes) {
        const costAmount = costsByType[costType] || 0;
        if (costAmount > 0) {
          const totalCostDecimal = new Decimal(costAmount);
          const allocations = allocateFunction(itemAllocations, totalCostDecimal);
          
          // Find allocation for this specific item
          const itemAllocationResult = allocations.find(alloc => alloc.customItemId === item.id);
          const allocatedAmount = itemAllocationResult ? parseFloat(itemAllocationResult.amount.toString()) : 0;
          
          switch (costType) {
            case 'FREIGHT':
              freightAllocated = allocatedAmount;
              break;
            case 'DUTY':
              dutyAllocated = allocatedAmount;
              break;
            case 'BROKERAGE':
              brokerageAllocated = allocatedAmount;
              break;
            case 'INSURANCE':
              insuranceAllocated = allocatedAmount;
              break;
            case 'PACKAGING':
              packagingAllocated = allocatedAmount;
              break;
            case 'OTHER':
              otherAllocated = allocatedAmount;
              break;
          }
        }
      }

      const totalAllocated = freightAllocated + dutyAllocated + brokerageAllocated + insuranceAllocated + packagingAllocated + otherAllocated;
      const landingCostPerUnit = item.quantity > 0 ? totalAllocated / item.quantity : 0;

      results.push({
        purchaseItemId: item.id,  // Frontend expects purchaseItemId
        customItemId: item.id,
        name: item.name,
        quantity: item.quantity,
        unitPrice: itemAllocation.unitPrice,  // Changed from unitValue to unitPrice for consistency
        totalValue: itemAllocation.totalValue,
        actualWeightKg: itemAllocation.actualWeight,
        volumetricWeightKg: itemAllocation.volumetricWeight,
        chargeableWeightKg: itemAllocation.chargeableWeight,
        freightAllocated,
        dutyAllocated,
        brokerageAllocated,
        insuranceAllocated,
        packagingAllocated,
        otherAllocated,
        totalAllocated,
        landingCostPerUnit,
        allocationMethod: method,
        warnings: []
      });
    }

    return results;
  } catch (error) {
    console.error(`Error getting item allocation breakdown with method ${method}:`, error);
    return [];
  }
}

// 9. GET /api/imports/shipments/:id/landing-cost-summary - Get summary
router.get("/shipments/:id/landing-cost-summary", async (req, res) => {
  try {
    const shipmentId = parseInt(req.params.id);
    
    // Verify shipment exists
    const [shipment] = await db
      .select()
      .from(shipments)
      .where(eq(shipments.id, shipmentId));
    
    if (!shipment) {
      return res.status(404).json({ message: "Shipment not found" });
    }
    
    // Get cost allocations to check if calculations exist
    const allocations = await db
      .select()
      .from(costAllocations)
      .where(eq(costAllocations.shipmentId, shipmentId));
    
    if (allocations.length === 0) {
      return res.json({
        shipmentId,
        items: [],
        totals: {},
        grandTotal: 0,
        baseCurrency: 'EUR',
        hasAllocations: false,
        lastCalculated: null,
        message: "No landing costs calculated yet. Add costs and calculate to see allocations."
      });
    }
    
    // Get the actual calculated data using the landing cost service
    try {
      const summary: any = await landingCostService.getLandingCostSummary(shipmentId);
      
      const responseData = {
        shipmentId,
        items: summary?.items || [],
        totals: summary?.totals || {},
        grandTotal: summary?.grandTotal || 0,
        baseCurrency: summary?.baseCurrency || 'EUR',
        hasAllocations: true,
        lastCalculated: allocations[0]?.createdAt || new Date(),
        status: 'calculated',
        itemCount: summary?.items?.length || 0
      };
      
      // Filter financial data based on user role
      const userRole = (req as any).user?.role || 'warehouse_operator';
      const filtered = filterFinancialData(responseData, userRole);
      res.json(filtered);
    } catch (summaryError) {
      console.error("Error getting landing cost summary:", summaryError);
      const fallbackData = {
        shipmentId,
        items: [],
        totals: {},
        grandTotal: 0,
        baseCurrency: 'EUR',
        hasAllocations: false,
        lastCalculated: null,
        message: "Landing costs calculation in progress or failed. Please recalculate."
      };
      
      // Filter financial data based on user role
      const userRole = (req as any).user?.role || 'warehouse_operator';
      const filtered = filterFinancialData(fallbackData, userRole);
      res.json(filtered);
    }
  } catch (error) {
    console.error("Error fetching landing cost summary:", error);
    res.status(500).json({ message: "Failed to fetch landing cost summary" });
  }
});

// 10. GET /api/imports/exchange-rates - Get current FX rates
router.get("/exchange-rates", async (req, res) => {
  try {
    const { base = 'EUR', currencies = 'USD,GBP,CNY,JPY,AUD,CAD' } = req.query;
    
    // Parse currencies into array
    const currencyList = (currencies as string).split(',').map(c => c.trim().toUpperCase());
    
    try {
      // Fetch from Frankfurter API
      const targetCurrencies = currencyList.join(',');
      const response = await fetch(`https://api.frankfurter.app/latest?from=${base}&to=${targetCurrencies}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch exchange rates');
      }
      
      const data = await response.json();
      
      const responseData = {
        base: data.base || base,
        date: data.date || new Date().toISOString().split('T')[0],
        rates: data.rates || {}
      };
      
      // Filter financial data based on user role
      const userRole = (req as any).user?.role || 'warehouse_operator';
      const filtered = filterFinancialData(responseData, userRole);
      res.json(filtered);
    } catch (apiError) {
      // Fallback to placeholder rates if API fails
      console.error("Error fetching exchange rates from API:", apiError);
      
      const placeholderRates: Record<string, Record<string, number>> = {
        'EUR': {
          'USD': 1.09,
          'GBP': 0.86,
          'CNY': 7.85,
          'JPY': 164.50,
          'AUD': 1.66,
          'CAD': 1.47
        },
        'USD': {
          'EUR': 0.92,
          'GBP': 0.79,
          'CNY': 7.20,
          'JPY': 151.00,
          'AUD': 1.52,
          'CAD': 1.35
        }
      };
      
      const baseRates = placeholderRates[base as string] || placeholderRates['EUR'];
      const filteredRates: Record<string, number> = {};
      
      for (const currency of currencyList) {
        if (currency === base) {
          filteredRates[currency] = 1;
        } else if (baseRates[currency]) {
          filteredRates[currency] = baseRates[currency];
        }
      }
      
      const fallbackData = {
        base,
        date: new Date().toISOString().split('T')[0],
        rates: filteredRates,
        source: 'placeholder'
      };
      
      // Filter financial data based on user role
      const userRole = (req as any).user?.role || 'warehouse_operator';
      const filtered = filterFinancialData(fallbackData, userRole);
      res.json(filtered);
    }
  } catch (error) {
    console.error("Error in exchange rates endpoint:", error);
    res.status(500).json({ message: "Failed to fetch exchange rates" });
  }
});

// Archive shipment (move from completed to archived status)
router.patch("/shipments/:id/archive", async (req, res) => {
  try {
    const shipmentId = parseInt(req.params.id);
    
    // Check if shipment exists and is completed
    const [shipment] = await db
      .select()
      .from(shipments)
      .where(eq(shipments.id, shipmentId));
    
    if (!shipment) {
      return res.status(404).json({ message: "Shipment not found" });
    }
    
    if (shipment.receivingStatus !== 'completed') {
      return res.status(400).json({ message: "Only completed shipments can be archived" });
    }
    
    // Update shipment receiving status to archived
    const [updatedShipment] = await db
      .update(shipments)
      .set({ 
        receivingStatus: 'archived',
        updatedAt: new Date()
      })
      .where(eq(shipments.id, shipmentId))
      .returning();
    
    res.json({ 
      message: "Shipment archived successfully",
      shipment: updatedShipment
    });
  } catch (error) {
    console.error("Error archiving shipment:", error);
    res.status(500).json({ message: "Failed to archive shipment" });
  }
});

// AI-powered storage location suggestion
router.post("/suggest-storage-location", async (req, res) => {
  try {
    const { productId, productName, category } = req.body;
    
    if (!productName) {
      return res.status(400).json({ message: "Product name is required" });
    }
    
    // Check if we already have a cached AI suggestion for this product
    if (productId) {
      const [cachedSuggestion] = await db
        .select()
        .from(aiLocationSuggestions)
        .where(eq(aiLocationSuggestions.productId, productId))
        .limit(1);
      
      if (cachedSuggestion) {
        return res.json({
          suggestedLocation: cachedSuggestion.locationCode,
          reasoning: cachedSuggestion.reasoning,
          zone: cachedSuggestion.zone,
          accessibility: cachedSuggestion.accessibilityLevel,
          cached: true,
          generatedAt: cachedSuggestion.generatedAt
        });
      }
    }
    
    const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
    if (!DEEPSEEK_API_KEY) {
      return res.status(500).json({ message: "DEEPSEEK_API_KEY not configured" });
    }
    
    // Gather warehouse intelligence data
    let existingLocations: any[] = [];
    let salesFrequency = 0;
    let avgInventoryAge = 0;
    let totalStock = 0;
    
    if (productId) {
      // Get current warehouse locations for this product
      existingLocations = await db
        .select()
        .from(productLocations)
        .where(eq(productLocations.productId, productId));
      
      totalStock = existingLocations.reduce((sum, loc) => sum + (loc.quantity || 0), 0);
      
      // Calculate sales frequency (last 90 days)
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
      
      const salesData = await db
        .select({
          totalOrders: sql<number>`count(distinct ${orderItems.orderId})::int`,
          totalQuantity: sql<number>`sum(${orderItems.quantity})::int`,
          firstOrder: sql<Date>`min(${orders.createdAt})`,
          lastOrder: sql<Date>`max(${orders.createdAt})`
        })
        .from(orderItems)
        .leftJoin(orders, eq(orderItems.orderId, orders.id))
        .where(and(
          eq(orderItems.productId, productId),
          gte(orders.createdAt, ninetyDaysAgo)
        ));
      
      if (salesData.length > 0 && salesData[0].totalOrders) {
        salesFrequency = salesData[0].totalOrders;
        
        // Estimate inventory age (simple heuristic)
        if (salesData[0].totalQuantity && salesData[0].totalQuantity > 0) {
          const daysSinceFirst = salesData[0].firstOrder 
            ? differenceInDays(new Date(), salesData[0].firstOrder) 
            : 90;
          avgInventoryAge = Math.max(1, daysSinceFirst / Math.max(1, salesData[0].totalQuantity / totalStock));
        }
      }
    }
    
    // Build analysis for AI
    const locationSummary = existingLocations.length > 0
      ? existingLocations.map(loc => `${loc.locationCode} (${loc.quantity} units)`).join(', ')
      : 'No existing locations';
    
    const salesProfile = salesFrequency > 20 
      ? 'HIGH (fast-moving, frequent sales)' 
      : salesFrequency > 5 
      ? 'MEDIUM (moderate sales)' 
      : salesFrequency > 0
      ? 'LOW (slow-moving)' 
      : 'NONE (new product or no recent sales)';
    
    const ageProfile = avgInventoryAge > 60 
      ? 'SLOW (items sit >60 days)' 
      : avgInventoryAge > 30 
      ? 'MODERATE (30-60 days turnover)' 
      : avgInventoryAge > 0
      ? 'FAST (quick turnover <30 days)'
      : 'NEW PRODUCT';
    
    const prompt = `You are a warehouse optimization expert. Suggest the optimal storage location for this product based on warehouse analytics.

**PRODUCT DETAILS:**
- Name: ${productName}
- Category: ${category || 'General'}
- Current Stock: ${totalStock} units
- Existing Locations: ${locationSummary}

**SALES & INVENTORY ANALYTICS:**
- Sales Frequency (90 days): ${salesFrequency} orders - ${salesProfile}
- Inventory Turnover: ${ageProfile}
- Average Age in Warehouse: ${avgInventoryAge > 0 ? Math.round(avgInventoryAge) + ' days' : 'N/A'}

**WAREHOUSE ZONE STRUCTURE:**
- **Shelves (A zones)**: A01-A99 for general storage
  - A01-A06: General/High-volume
  - A05-A07: Toys
  - A10-A12: Clothing/Textiles
  - A15-A17: Electronics
  - A20-A22: Medical/Health
  - A25-A27: Food/Consumables
  - A28-A29: Books/Media
- **Pallets (B zones)**: B01-B99 for bulk/heavy items
- **Office (C zones)**: C01-C99 for small valuable items

**OPTIMIZATION RULES:**
1. Fast-moving items (high sales) → Easy-access lower levels (L01-L02) near entrance (A01-A06)
2. Medium-moving → Mid-range zones based on category
3. Slow-moving → Higher levels (L03-L05) or back zones
4. New products → Category-appropriate zone, accessible location to monitor performance
5. Heavy/Bulk items → Pallet zones (B-prefix)
6. Small valuable items → Office zones (C-prefix)

**FORMAT:** WH1-{ZONE}-R{ROW}-L{LEVEL}-B{BIN}
Example: WH1-A06-R04-L02-B3

Respond with ONLY a JSON object with this structure:
{
  "suggestedLocation": "WH1-A06-R04-L02-B3",
  "reasoning": "Brief 1-sentence explanation of why this location is optimal",
  "zone": "Shelves|Pallets|Office",
  "accessibility": "High|Medium|Low"
}`;

    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 500
      })
    });
    
    if (!response.ok) {
      throw new Error(`DeepSeek API error: ${response.statusText}`);
    }
    
    const data = await response.json();
    const aiResponse = data.choices[0]?.message?.content;
    
    if (!aiResponse) {
      throw new Error('No response from DeepSeek AI');
    }
    
    // Parse AI response
    let suggestion: {
      suggestedLocation: string;
      reasoning: string;
      zone: string;
      accessibility: string;
    };
    
    try {
      // Extract JSON from response
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in AI response');
      }
      suggestion = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.error('Failed to parse AI response:', aiResponse);
      throw new Error('Failed to parse AI suggestion');
    }
    
    // Save AI suggestion to database for future use (one-time generation per product)
    // Use onConflictDoNothing to handle race conditions where multiple requests generate for same product
    if (productId) {
      try {
        await db.insert(aiLocationSuggestions)
          .values({
            productId,
            customItemId: null,
            locationCode: suggestion.suggestedLocation,
            zone: suggestion.zone,
            accessibilityLevel: suggestion.accessibility,
            reasoning: suggestion.reasoning,
            metadata: {
              salesFrequency,
              salesProfile,
              avgInventoryAge: Math.round(avgInventoryAge),
              ageProfile,
              totalStock,
              category: category || 'General'
            }
          })
          .onConflictDoNothing({ target: aiLocationSuggestions.productId });
      } catch (dbError) {
        // Log error but don't fail the request - suggestion is still valid
        console.error('Failed to save AI suggestion to database:', dbError);
      }
    }
    
    res.json({
      ...suggestion,
      cached: false,
      analytics: {
        salesFrequency,
        salesProfile,
        avgInventoryAge: Math.round(avgInventoryAge),
        ageProfile,
        totalStock,
        existingLocationCount: existingLocations.length
      }
    });
  } catch (error) {
    console.error("Error suggesting storage location:", error);
    res.status(500).json({ message: "Failed to suggest storage location" });
  }
});

export default router;