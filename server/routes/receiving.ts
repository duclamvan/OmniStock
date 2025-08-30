import { Router } from 'express';
import { eq, and, like, or, inArray } from 'drizzle-orm';
import { db } from '../db.js';
import { 
  importPurchases, 
  purchaseItems,
  deliveryReceipts,
  deliveryReceiptLines,
  deliveryInstructions,
  parcelScans,
  landedCostBatches,
  insertDeliveryReceiptSchema,
  insertDeliveryReceiptLineSchema,
  insertParcelScanSchema,
  insertLandedCostBatchSchema
} from '@shared/schema';
import { z } from 'zod';

const router = Router();

// 1) Search incoming by carrier + parcels
router.get('/search', async (req, res) => {
  try {
    const { carrier, parcels } = req.query;
    
    // Find import purchases that might match the criteria
    const purchases = await db
      .select()
      .from(importPurchases)
      .where(
        and(
          eq(importPurchases.status, 'at_warehouse'),
          carrier ? like(importPurchases.trackingNumber, `%${carrier}%`) : undefined
        )
      );
    
    // Get items count for each purchase
    const purchasesWithItems = await Promise.all(
      purchases.map(async (purchase) => {
        const items = await db
          .select()
          .from(purchaseItems)
          .where(eq(purchaseItems.purchaseId, purchase.id));
        
        return {
          ...purchase,
          itemCount: items.length,
          totalItems: items.reduce((sum, item) => sum + item.quantity, 0),
          probableMatch: parcels ? 
            Math.abs(items.length - parseInt(parcels as string)) <= 2 : 
            false
        };
      })
    );
    
    // Sort by probable match if parcels provided
    if (parcels) {
      purchasesWithItems.sort((a, b) => {
        if (a.probableMatch && !b.probableMatch) return -1;
        if (!a.probableMatch && b.probableMatch) return 1;
        return 0;
      });
    }
    
    res.json(purchasesWithItems);
  } catch (error) {
    console.error('Error searching receipts:', error);
    res.status(500).json({ error: 'Failed to search receipts' });
  }
});

// 2) Start receipt - creates receipt and preloads lines from purchase items
router.post('/receipts', async (req, res) => {
  try {
    const { importPurchaseId, carrier, claimedParcels, claimedCartons, dockCode } = req.body;
    
    // Get current user (simplified for now - in production would get from session)
    const employeeId = 1; // Default to test user
    
    // Create delivery receipt
    const [receipt] = await db
      .insert(deliveryReceipts)
      .values({
        importPurchaseId,
        carrier,
        claimedParcels: claimedParcels || 0,
        claimedCartons: claimedCartons || 0,
        dockCode,
        employeeId,
        status: 'draft'
      })
      .returning();
    
    // Get purchase items and create receipt lines
    const items = await db
      .select()
      .from(purchaseItems)
      .where(eq(purchaseItems.purchaseId, importPurchaseId));
    
    if (items.length > 0) {
      const lines = await db
        .insert(deliveryReceiptLines)
        .values(
          items.map(item => ({
            receiptId: receipt.id,
            purchaseItemId: item.id,
            skuCode: item.sku || undefined,
            name: item.name,
            expectedQty: item.quantity,
            receivedQty: 0,
            damagedQty: 0,
            primaryLocation: item.warehouseLocation || undefined
          }))
        )
        .returning();
      
      // Get any delivery instructions
      const instructions = await db
        .select()
        .from(deliveryInstructions)
        .where(inArray(deliveryInstructions.purchaseItemId, items.map(i => i.id)));
      
      res.json({
        receipt,
        lines,
        instructions
      });
    } else {
      res.json({
        receipt,
        lines: [],
        instructions: []
      });
    }
  } catch (error) {
    console.error('Error creating receipt:', error);
    res.status(500).json({ error: 'Failed to create receipt' });
  }
});

// 3) Scan / Count
router.post('/receipts/:id/scan', async (req, res) => {
  try {
    const receiptId = parseInt(req.params.id);
    const { code } = req.body;
    const userId = 1; // Default to test user
    
    // Classify the code
    let kind: 'PARCEL' | 'CARTON' | 'SKU' | 'OTHER' = 'OTHER';
    
    // Check if it's an 18-digit SSCC code (parcel)
    if (/^\d{18}$/.test(code)) {
      kind = 'PARCEL';
    }
    // Check if it matches a SKU in our lines
    else {
      const lines = await db
        .select()
        .from(deliveryReceiptLines)
        .where(eq(deliveryReceiptLines.receiptId, receiptId));
      
      const matchingSku = lines.find(line => line.skuCode === code);
      if (matchingSku) {
        kind = 'SKU';
        
        // Increment received quantity for matching SKU
        await db
          .update(deliveryReceiptLines)
          .set({ receivedQty: matchingSku.receivedQty + 1 })
          .where(eq(deliveryReceiptLines.id, matchingSku.id));
      }
    }
    
    // Record the scan
    await db
      .insert(parcelScans)
      .values({
        receiptId,
        code,
        kind,
        byUser: userId
      });
    
    // If it's a parcel/carton, increment the counter
    if (kind === 'PARCEL') {
      const [receipt] = await db
        .select()
        .from(deliveryReceipts)
        .where(eq(deliveryReceipts.id, receiptId));
      
      await db
        .update(deliveryReceipts)
        .set({ claimedCartons: receipt.claimedCartons + 1 })
        .where(eq(deliveryReceipts.id, receiptId));
    }
    
    // Return updated receipt snapshot
    const receipt = await getReceiptSnapshot(receiptId);
    res.json(receipt);
  } catch (error) {
    console.error('Error processing scan:', error);
    res.status(500).json({ error: 'Failed to process scan' });
  }
});

// Update receipt line
router.patch('/receipts/:id/lines/:lineId', async (req, res) => {
  try {
    const lineId = parseInt(req.params.lineId);
    const { receivedQty, damagedQty, note, extraLocation } = req.body;
    
    const updateData: any = {};
    if (receivedQty !== undefined) updateData.receivedQty = receivedQty;
    if (damagedQty !== undefined) updateData.damagedQty = damagedQty;
    if (note !== undefined) updateData.note = note;
    if (extraLocation !== undefined) updateData.extraLocation = extraLocation;
    
    const [updatedLine] = await db
      .update(deliveryReceiptLines)
      .set(updateData)
      .where(eq(deliveryReceiptLines.id, lineId))
      .returning();
    
    res.json(updatedLine);
  } catch (error) {
    console.error('Error updating line:', error);
    res.status(500).json({ error: 'Failed to update line' });
  }
});

// 4) Employee submit (hand off to founder)
router.post('/receipts/:id/submit', async (req, res) => {
  try {
    const receiptId = parseInt(req.params.id);
    
    const [updatedReceipt] = await db
      .update(deliveryReceipts)
      .set({ 
        status: 'employee_submitted',
        submittedAt: new Date()
      })
      .where(eq(deliveryReceipts.id, receiptId))
      .returning();
    
    res.json(updatedReceipt);
  } catch (error) {
    console.error('Error submitting receipt:', error);
    res.status(500).json({ error: 'Failed to submit receipt' });
  }
});

// 5) Founder confirmation + landed cost selection
router.post('/receipts/:id/confirm', async (req, res) => {
  try {
    const receiptId = parseInt(req.params.id);
    const { method, totalCostNative, nativeCurrency, czkRate, notes } = req.body;
    const founderId = 1; // Default to test user (would be from session)
    
    // Update receipt status
    const [updatedReceipt] = await db
      .update(deliveryReceipts)
      .set({ 
        status: 'founder_confirmed',
        founderId,
        confirmedAt: new Date()
      })
      .where(eq(deliveryReceipts.id, receiptId))
      .returning();
    
    // Create landed cost batch
    const [landedCostBatch] = await db
      .insert(landedCostBatches)
      .values({
        receiptId,
        method,
        totalCostNative,
        nativeCurrency,
        czkRate,
        notes
      })
      .returning();
    
    // Calculate and store per-line landed cost allocation
    const lines = await db
      .select()
      .from(deliveryReceiptLines)
      .where(eq(deliveryReceiptLines.receiptId, receiptId));
    
    const allocation = allocateLandedCost({
      lines: lines.map(line => ({
        id: line.id.toString(),
        qty: line.receivedQty - line.damagedQty,
        unitWeight: 1, // Default values for now
        unitVolume: 1,
        unitValue: 1,
        group: 'count' as 'count'
      })),
      totalCost: parseFloat(totalCostNative) * parseFloat(czkRate),
      method
    });
    
    // Update lines with landed cost shares
    for (const { lineId, costShare } of allocation) {
      await db
        .update(deliveryReceiptLines)
        .set({ landedCostShare: costShare.toString() })
        .where(eq(deliveryReceiptLines.id, parseInt(lineId)));
    }
    
    res.json({
      receipt: updatedReceipt,
      landedCostBatch,
      allocation
    });
  } catch (error) {
    console.error('Error confirming receipt:', error);
    res.status(500).json({ error: 'Failed to confirm receipt' });
  }
});

// 6) Post to inventory (final)
router.post('/receipts/:id/post', async (req, res) => {
  try {
    const receiptId = parseInt(req.params.id);
    
    // Check status
    const [receipt] = await db
      .select()
      .from(deliveryReceipts)
      .where(eq(deliveryReceipts.id, receiptId));
    
    if (receipt.status !== 'founder_confirmed') {
      return res.status(400).json({ error: 'Receipt must be confirmed by founder first' });
    }
    
    // Get all lines
    const lines = await db
      .select()
      .from(deliveryReceiptLines)
      .where(eq(deliveryReceiptLines.receiptId, receiptId));
    
    // TODO: Create stock movements and update inventory
    // This would integrate with your existing inventory system
    // For now, just update the status
    
    const [updatedReceipt] = await db
      .update(deliveryReceipts)
      .set({ status: 'posted_to_inventory' })
      .where(eq(deliveryReceipts.id, receiptId))
      .returning();
    
    res.json(updatedReceipt);
  } catch (error) {
    console.error('Error posting to inventory:', error);
    res.status(500).json({ error: 'Failed to post to inventory' });
  }
});

// Get receipt by ID with all related data
router.get('/receipts/:id', async (req, res) => {
  try {
    const receiptId = parseInt(req.params.id);
    const receipt = await getReceiptSnapshot(receiptId);
    res.json(receipt);
  } catch (error) {
    console.error('Error fetching receipt:', error);
    res.status(500).json({ error: 'Failed to fetch receipt' });
  }
});

// List receipts
router.get('/receipts', async (req, res) => {
  try {
    const { status } = req.query;
    
    const receipts = status 
      ? await db
          .select()
          .from(deliveryReceipts)
          .where(eq(deliveryReceipts.status, status as any))
      : await db
          .select()
          .from(deliveryReceipts);
    res.json(receipts);
  } catch (error) {
    console.error('Error listing receipts:', error);
    res.status(500).json({ error: 'Failed to list receipts' });
  }
});

// Helper function to get complete receipt snapshot
async function getReceiptSnapshot(receiptId: number) {
  const [receipt] = await db
    .select()
    .from(deliveryReceipts)
    .where(eq(deliveryReceipts.id, receiptId));
  
  const lines = await db
    .select()
    .from(deliveryReceiptLines)
    .where(eq(deliveryReceiptLines.receiptId, receiptId));
  
  const scans = await db
    .select()
    .from(parcelScans)
    .where(eq(parcelScans.receiptId, receiptId));
  
  const [landedCostBatch] = await db
    .select()
    .from(landedCostBatches)
    .where(eq(landedCostBatches.receiptId, receiptId));
  
  return {
    receipt,
    lines,
    scans,
    landedCostBatch
  };
}

// Landed cost allocation function
function allocateLandedCost({ lines, totalCost, method }: {
  lines: Array<{
    id: string;
    qty: number;
    unitWeight?: number;
    unitVolume?: number;
    unitValue?: number;
    group?: 'weight' | 'value' | 'count';
  }>;
  totalCost: number;
  method: 'by_weight' | 'by_volume' | 'by_value' | 'by_count' | 'mixed_rules';
}) {
  const weights = lines.map(l => {
    const qty = Math.max(0, l.qty);
    switch (method) {
      case 'by_weight': return (l.unitWeight ?? 0) * qty;
      case 'by_volume': return (l.unitVolume ?? 0) * qty;
      case 'by_value': return (l.unitValue ?? 0) * qty;
      case 'by_count': return qty;
      case 'mixed_rules':
        if (l.group === 'weight') return (l.unitWeight ?? 0) * qty;
        if (l.group === 'value') return (l.unitValue ?? 0) * qty;
        return qty; // count
    }
  });
  
  const sum = weights.reduce((a, b) => a + (b || 0), 0);
  
  return lines.map((l, i) => {
    const share = sum > 0 ? (weights[i] || 0) / sum : 0;
    const cost = +(totalCost * share).toFixed(4);
    return { lineId: l.id, costShare: cost };
  });
}

export default router;
    