import { Router } from 'express';
import { db } from '../db';
import { 
  importPurchases, 
  purchaseItems, 
  consolidations, 
  shipments,
  customItems,
  deliveryHistory,
  insertImportPurchaseSchema,
  insertPurchaseItemSchema,
  insertConsolidationSchema,
  insertShipmentSchema,
  insertCustomItemSchema
} from '@shared/schema';
import { eq, desc, and, gte, lte, sql } from 'drizzle-orm';

const router = Router();

// Import Purchases endpoints
router.get('/purchases', async (req, res) => {
  try {
    const purchases = await db
      .select()
      .from(importPurchases)
      .orderBy(desc(importPurchases.createdAt));
    
    // Get item counts for each purchase
    const purchasesWithCounts = await Promise.all(
      purchases.map(async (purchase) => {
        const items = await db
          .select({ count: sql<number>`count(*)` })
          .from(purchaseItems)
          .where(eq(purchaseItems.purchaseId, purchase.id));
        
        return {
          ...purchase,
          itemCount: items[0]?.count || 0
        };
      })
    );
    
    res.json(purchasesWithCounts);
  } catch (error) {
    console.error('Error fetching purchases:', error);
    res.status(500).json({ error: 'Failed to fetch purchases' });
  }
});

router.get('/purchases/:id', async (req, res) => {
  try {
    const purchaseId = parseInt(req.params.id);
    
    const [purchase] = await db
      .select()
      .from(importPurchases)
      .where(eq(importPurchases.id, purchaseId));
    
    if (!purchase) {
      return res.status(404).json({ error: 'Purchase not found' });
    }
    
    const items = await db
      .select()
      .from(purchaseItems)
      .where(eq(purchaseItems.purchaseId, purchaseId));
    
    res.json({ ...purchase, items });
  } catch (error) {
    console.error('Error fetching purchase:', error);
    res.status(500).json({ error: 'Failed to fetch purchase' });
  }
});

router.post('/purchases', async (req, res) => {
  try {
    const purchaseData = insertImportPurchaseSchema.parse(req.body.purchase);
    const itemsData = req.body.items?.map((item: any) => 
      insertPurchaseItemSchema.parse(item)
    ) || [];
    
    // Generate purchase number if not provided
    if (!purchaseData.purchaseNumber) {
      purchaseData.purchaseNumber = `PO-${Date.now().toString(36).toUpperCase()}`;
    }
    
    // Insert purchase
    const [newPurchase] = await db
      .insert(importPurchases)
      .values(purchaseData)
      .returning();
    
    // Insert items if provided
    if (itemsData.length > 0) {
      const itemsWithPurchaseId = itemsData.map((item: any) => ({
        ...item,
        purchaseId: newPurchase.id
      }));
      
      await db.insert(purchaseItems).values(itemsWithPurchaseId);
    }
    
    res.json(newPurchase);
  } catch (error) {
    console.error('Error creating purchase:', error);
    res.status(500).json({ error: 'Failed to create purchase' });
  }
});

// Purchase Items endpoints
router.get('/purchases/:purchaseId/items', async (req, res) => {
  try {
    const purchaseId = parseInt(req.params.purchaseId);
    
    const items = await db
      .select()
      .from(purchaseItems)
      .where(eq(purchaseItems.purchaseId, purchaseId));
    
    res.json(items);
  } catch (error) {
    console.error('Error fetching purchase items:', error);
    res.status(500).json({ error: 'Failed to fetch purchase items' });
  }
});

router.post('/purchases/:purchaseId/items', async (req, res) => {
  try {
    const purchaseId = parseInt(req.params.purchaseId);
    const itemData = insertPurchaseItemSchema.parse(req.body);
    
    const [newItem] = await db
      .insert(purchaseItems)
      .values({ ...itemData, purchaseId })
      .returning();
    
    res.json(newItem);
  } catch (error) {
    console.error('Error creating purchase item:', error);
    res.status(500).json({ error: 'Failed to create purchase item' });
  }
});

// Consolidations endpoints
router.get('/consolidations', async (req, res) => {
  try {
    const consolidationList = await db
      .select()
      .from(consolidations)
      .orderBy(desc(consolidations.createdAt));
    
    // Get items for each consolidation
    const consolidationsWithItems = await Promise.all(
      consolidationList.map(async (consolidation) => {
        const purchaseItemsList = await db
          .select()
          .from(purchaseItems)
          .where(eq(purchaseItems.consolidationId, consolidation.id));
        
        const customItemsList = await db
          .select()
          .from(customItems)
          .where(eq(customItems.consolidationId, consolidation.id));
        
        return {
          ...consolidation,
          purchaseItems: purchaseItemsList,
          customItems: customItemsList,
          totalItems: purchaseItemsList.length + customItemsList.length
        };
      })
    );
    
    res.json(consolidationsWithItems);
  } catch (error) {
    console.error('Error fetching consolidations:', error);
    res.status(500).json({ error: 'Failed to fetch consolidations' });
  }
});

router.post('/consolidations', async (req, res) => {
  try {
    const consolidationData = insertConsolidationSchema.parse(req.body);
    
    // Generate consolidation number if not provided
    if (!consolidationData.consolidationNumber) {
      consolidationData.consolidationNumber = `CONSOL-${Date.now().toString(36).toUpperCase()}`;
    }
    
    const [newConsolidation] = await db
      .insert(consolidations)
      .values(consolidationData)
      .returning();
    
    res.json(newConsolidation);
  } catch (error) {
    console.error('Error creating consolidation:', error);
    res.status(500).json({ error: 'Failed to create consolidation' });
  }
});

router.put('/consolidations/:id/add-items', async (req, res) => {
  try {
    const consolidationId = parseInt(req.params.id);
    const { purchaseItemIds, customItemIds } = req.body;
    
    // Update purchase items
    if (purchaseItemIds?.length > 0) {
      await db
        .update(purchaseItems)
        .set({ consolidationId })
        .where(sql`${purchaseItems.id} = ANY(${purchaseItemIds})`);
    }
    
    // Update custom items
    if (customItemIds?.length > 0) {
      await db
        .update(customItems)
        .set({ consolidationId })
        .where(sql`${customItems.id} = ANY(${customItemIds})`);
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error adding items to consolidation:', error);
    res.status(500).json({ error: 'Failed to add items to consolidation' });
  }
});

// Custom Items endpoints
router.get('/custom-items', async (req, res) => {
  try {
    const items = await db
      .select()
      .from(customItems)
      .orderBy(desc(customItems.createdAt));
    
    res.json(items);
  } catch (error) {
    console.error('Error fetching custom items:', error);
    res.status(500).json({ error: 'Failed to fetch custom items' });
  }
});

router.post('/custom-items', async (req, res) => {
  try {
    const itemData = insertCustomItemSchema.parse(req.body);
    
    const [newItem] = await db
      .insert(customItems)
      .values(itemData)
      .returning();
    
    res.json(newItem);
  } catch (error) {
    console.error('Error creating custom item:', error);
    res.status(500).json({ error: 'Failed to create custom item' });
  }
});

// Shipments endpoints
router.get('/shipments', async (req, res) => {
  try {
    const shipmentList = await db
      .select()
      .from(shipments)
      .orderBy(desc(shipments.createdAt));
    
    // Get consolidations for each shipment
    const shipmentsWithDetails = await Promise.all(
      shipmentList.map(async (shipment) => {
        const consolidationList = await db
          .select()
          .from(consolidations)
          .where(eq(consolidations.shipmentId, shipment.id));
        
        // Get all items from consolidations
        let allItems: any[] = [];
        for (const consolidation of consolidationList) {
          const purchaseItemsList = await db
            .select()
            .from(purchaseItems)
            .where(eq(purchaseItems.consolidationId, consolidation.id));
          
          const customItemsList = await db
            .select()
            .from(customItems)
            .where(eq(customItems.consolidationId, consolidation.id));
          
          allItems = [...allItems, ...purchaseItemsList, ...customItemsList];
        }
        
        return {
          ...shipment,
          consolidations: consolidationList,
          totalItems: allItems.length,
          items: allItems
        };
      })
    );
    
    res.json(shipmentsWithDetails);
  } catch (error) {
    console.error('Error fetching shipments:', error);
    res.status(500).json({ error: 'Failed to fetch shipments' });
  }
});

router.post('/shipments', async (req, res) => {
  try {
    const shipmentData = insertShipmentSchema.parse(req.body.shipment);
    const consolidationIds = req.body.consolidationIds || [];
    
    // Generate shipment number if not provided
    if (!shipmentData.shipmentNumber) {
      shipmentData.shipmentNumber = `SHIP-${Date.now().toString(36).toUpperCase()}`;
    }
    
    const [newShipment] = await db
      .insert(shipments)
      .values(shipmentData)
      .returning();
    
    // Update consolidations with shipment ID
    if (consolidationIds.length > 0) {
      await db
        .update(consolidations)
        .set({ shipmentId: newShipment.id })
        .where(sql`${consolidations.id} = ANY(${consolidationIds})`);
    }
    
    res.json(newShipment);
  } catch (error) {
    console.error('Error creating shipment:', error);
    res.status(500).json({ error: 'Failed to create shipment' });
  }
});

// AI Delivery Prediction endpoint
router.get('/shipments/:id/predict-delivery', async (req, res) => {
  try {
    const shipmentId = parseInt(req.params.id);
    
    const [shipment] = await db
      .select()
      .from(shipments)
      .where(eq(shipments.id, shipmentId));
    
    if (!shipment) {
      return res.status(404).json({ error: 'Shipment not found' });
    }
    
    // Get historical data for similar shipments
    const currentMonth = new Date().getMonth() + 1;
    const currentSeason = getSeason(currentMonth);
    
    const historicalData = await db
      .select({
        avgDays: sql<number>`AVG(actual_days)`,
        avgDelay: sql<number>`AVG(delay_days)`,
        count: sql<number>`COUNT(*)`
      })
      .from(deliveryHistory)
      .where(
        and(
          eq(deliveryHistory.carrier, shipment.carrier),
          eq(deliveryHistory.origin, shipment.origin),
          eq(deliveryHistory.destination, shipment.destination),
          eq(deliveryHistory.shippingMethod, shipment.shippingMethod),
          eq(deliveryHistory.season, currentSeason)
        )
      );
    
    const avgDays = historicalData[0]?.avgDays || getDefaultEstimate(shipment.shippingMethod);
    const avgDelay = historicalData[0]?.avgDelay || 0;
    const confidence = historicalData[0]?.count ? Math.min(historicalData[0].count / 10, 1) : 0.3;
    
    const estimatedDays = Math.round(avgDays + avgDelay * 0.5);
    const estimatedArrival = new Date();
    estimatedArrival.setDate(estimatedArrival.getDate() + estimatedDays);
    
    // Update shipment with prediction
    await db
      .update(shipments)
      .set({ estimatedArrival })
      .where(eq(shipments.id, shipmentId));
    
    res.json({
      estimatedDays,
      estimatedArrival,
      confidence,
      basedOnSamples: historicalData[0]?.count || 0
    });
  } catch (error) {
    console.error('Error predicting delivery:', error);
    res.status(500).json({ error: 'Failed to predict delivery' });
  }
});

// Helper functions
function getSeason(month: number): string {
  if (month >= 3 && month <= 5) return 'spring';
  if (month >= 6 && month <= 8) return 'summer';
  if (month >= 9 && month <= 11) return 'fall';
  return 'winter';
}

function getDefaultEstimate(shippingMethod: string): number {
  switch (shippingMethod) {
    case 'express': return 5;
    case 'air': return 10;
    case 'sea': return 30;
    default: return 15;
  }
}

export default router;