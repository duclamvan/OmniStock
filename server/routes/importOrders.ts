import { Router } from "express";
import { z } from "zod";
import { storage } from "../storage";
import { 
  insertImportOrderSchema, 
  insertImportOrderItemSchema,
  insertLandedCostCalculationSchema 
} from "@shared/schema";

const importOrdersRouter = Router();

// Get all import orders
importOrdersRouter.get("/import-orders", async (req, res) => {
  try {
    const orders = await storage.getImportOrders();
    res.json(orders);
  } catch (error) {
    console.error("Error fetching import orders:", error);
    res.status(500).json({ error: "Failed to fetch import orders" });
  }
});

// Get import order by ID with items
importOrdersRouter.get("/import-orders/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const order = await storage.getImportOrderById(id);
    
    if (!order) {
      return res.status(404).json({ error: "Import order not found" });
    }

    const items = await storage.getImportOrderItems(id);
    const calculation = await storage.getLatestCalculation(id);
    
    res.json({ ...order, items, calculation });
  } catch (error) {
    console.error("Error fetching import order:", error);
    res.status(500).json({ error: "Failed to fetch import order" });
  }
});

// Create import order
importOrdersRouter.post("/import-orders", async (req, res) => {
  try {
    const orderData = insertImportOrderSchema.parse(req.body);
    const newOrder = await storage.createImportOrder(orderData);
    res.status(201).json(newOrder);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid order data", details: error.errors });
    }
    console.error("Error creating import order:", error);
    res.status(500).json({ error: "Failed to create import order" });
  }
});

// Update import order
importOrdersRouter.patch("/import-orders/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const updatedOrder = await storage.updateImportOrder(id, updates);
    res.json(updatedOrder);
  } catch (error) {
    console.error("Error updating import order:", error);
    res.status(500).json({ error: "Failed to update import order" });
  }
});

// Delete import order
importOrdersRouter.delete("/import-orders/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await storage.deleteImportOrder(id);
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting import order:", error);
    res.status(500).json({ error: "Failed to delete import order" });
  }
});

// Get import order items
importOrdersRouter.get("/import-orders/:id/items", async (req, res) => {
  try {
    const { id } = req.params;
    const items = await storage.getImportOrderItems(id);
    res.json(items);
  } catch (error) {
    console.error("Error fetching import order items:", error);
    res.status(500).json({ error: "Failed to fetch import order items" });
  }
});

// Add item to import order
importOrdersRouter.post("/import-orders/:id/items", async (req, res) => {
  try {
    const { id } = req.params;
    const itemData = insertImportOrderItemSchema.parse({
      ...req.body,
      importOrderId: id
    });
    
    const newItem = await storage.createImportOrderItem(itemData);
    
    // Trigger recalculation
    await recalculateLandedCost(id);
    
    res.status(201).json(newItem);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid item data", details: error.errors });
    }
    console.error("Error adding item to import order:", error);
    res.status(500).json({ error: "Failed to add item" });
  }
});

// Update import order item
importOrdersRouter.patch("/import-order-items/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const updatedItem = await storage.updateImportOrderItem(id, updates);
    
    // Get the order ID and trigger recalculation
    if (updatedItem.importOrderId) {
      await recalculateLandedCost(updatedItem.importOrderId);
    }
    
    res.json(updatedItem);
  } catch (error) {
    console.error("Error updating import order item:", error);
    res.status(500).json({ error: "Failed to update item" });
  }
});

// Delete import order item
importOrdersRouter.delete("/import-order-items/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await storage.deleteImportOrderItem(id);
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting import order item:", error);
    res.status(500).json({ error: "Failed to delete item" });
  }
});

// Calculate landed cost
importOrdersRouter.post("/import-orders/:id/calculate", async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      calculationType = 'by_value',
      shippingCost = 0,
      customsDuty = 0,
      taxes = 0,
      otherFees = 0
    } = req.body;

    const order = await storage.getImportOrderById(id);
    const items = await storage.getImportOrderItems(id);
    
    if (!order) {
      return res.status(404).json({ error: "Import order not found" });
    }

    const calculation = await calculateLandedCost(
      order, 
      items, 
      calculationType,
      parseFloat(shippingCost),
      parseFloat(customsDuty),
      parseFloat(taxes),
      parseFloat(otherFees)
    );
    
    // Save calculation
    const savedCalculation = await storage.createLandedCostCalculation({
      importOrderId: id,
      ...calculation
    });
    
    // Update order with total landed cost
    await storage.updateImportOrder(id, {
      shippingCost: calculation.shippingCost,
      totalLandedCost: calculation.totalLandedCost,
      calculationType
    });
    
    // Update items with calculated unit costs
    for (const item of items) {
      const calculatedCost = calculation.calculationDetails.items.find(
        (i: any) => i.id === item.id
      )?.calculatedUnitCost;
      
      if (calculatedCost) {
        await storage.updateImportOrderItem(item.id, {
          calculatedUnitCost: calculatedCost
        });
      }
    }
    
    res.json(savedCalculation);
  } catch (error) {
    console.error("Error calculating landed cost:", error);
    res.status(500).json({ error: "Failed to calculate landed cost" });
  }
});

// Lock calculation
importOrdersRouter.post("/landed-cost-calculations/:id/lock", async (req, res) => {
  try {
    const { id } = req.params;
    await storage.lockCalculation(id);
    res.json({ success: true });
  } catch (error) {
    console.error("Error locking calculation:", error);
    res.status(500).json({ error: "Failed to lock calculation" });
  }
});

// Mark items as received
importOrdersRouter.post("/import-orders/:id/receive", async (req, res) => {
  try {
    const { id } = req.params;
    const { itemIds, receivedQuantities } = req.body;
    
    if (!Array.isArray(itemIds) || itemIds.length === 0) {
      return res.status(400).json({ error: "No items provided" });
    }
    
    await storage.markItemsReceived(itemIds, receivedQuantities);
    
    // Update order status if all items received
    const items = await storage.getImportOrderItems(id);
    const allReceived = items.every(item => item.status === 'received');
    
    if (allReceived) {
      await storage.updateImportOrder(id, { status: 'received' });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error("Error marking items as received:", error);
    res.status(500).json({ error: "Failed to mark items as received" });
  }
});

// Add items to inventory
importOrdersRouter.post("/import-orders/:id/add-to-inventory", async (req, res) => {
  try {
    const { id } = req.params;
    const { itemIds } = req.body;
    
    if (!Array.isArray(itemIds) || itemIds.length === 0) {
      return res.status(400).json({ error: "No items provided" });
    }
    
    await storage.addImportItemsToInventory(itemIds);
    
    res.json({ success: true, message: "Items added to inventory" });
  } catch (error) {
    console.error("Error adding items to inventory:", error);
    res.status(500).json({ error: "Failed to add items to inventory" });
  }
});

// Helper function to calculate landed cost
async function calculateLandedCost(
  order: any,
  items: any[],
  calculationType: string,
  shippingCost: number,
  customsDuty: number,
  taxes: number,
  otherFees: number
) {
  const productValue = items.reduce((sum, item) => 
    sum + (parseFloat(item.totalCost) || 0), 0
  );
  
  const totalAdditionalCosts = shippingCost + customsDuty + taxes + otherFees;
  const totalLandedCost = productValue + totalAdditionalCosts;
  
  // Calculate allocation per item based on calculation type
  let calculationDetails = { items: [] as any[] };
  
  for (const item of items) {
    let allocationFactor = 0;
    
    switch (calculationType) {
      case 'by_value':
        allocationFactor = parseFloat(item.totalCost) / productValue;
        break;
      case 'by_quantity':
        const totalQuantity = items.reduce((sum, i) => sum + i.quantity, 0);
        allocationFactor = item.quantity / totalQuantity;
        break;
      case 'by_weight':
        const totalWeight = items.reduce((sum, i) => 
          sum + (parseFloat(i.weight || '0') * i.quantity), 0
        );
        const itemWeight = parseFloat(item.weight || '0') * item.quantity;
        allocationFactor = totalWeight > 0 ? itemWeight / totalWeight : 0;
        break;
      case 'manual':
        // For manual, don't allocate automatically
        allocationFactor = 0;
        break;
    }
    
    const allocatedCost = totalAdditionalCosts * allocationFactor;
    const itemLandedCost = parseFloat(item.totalCost) + allocatedCost;
    const calculatedUnitCost = itemLandedCost / item.quantity;
    
    calculationDetails.items.push({
      id: item.id,
      productName: item.productName,
      quantity: item.quantity,
      originalCost: parseFloat(item.totalCost),
      allocatedCost: allocatedCost.toFixed(2),
      totalLandedCost: itemLandedCost.toFixed(2),
      calculatedUnitCost: calculatedUnitCost.toFixed(2)
    });
  }
  
  return {
    calculationType,
    productValue: productValue.toString(),
    shippingCost: shippingCost.toString(),
    customsDuty: customsDuty.toString(),
    taxes: taxes.toString(),
    otherFees: otherFees.toString(),
    totalLandedCost: totalLandedCost.toString(),
    calculationDetails
  };
}

// Helper function to recalculate landed cost when items change
async function recalculateLandedCost(orderId: string) {
  const order = await storage.getImportOrderById(orderId);
  const items = await storage.getImportOrderItems(orderId);
  const latestCalc = await storage.getLatestCalculation(orderId);
  
  if (!order || !latestCalc || latestCalc.isLocked) {
    return;
  }
  
  const calculation = await calculateLandedCost(
    order,
    items,
    latestCalc.calculationType,
    parseFloat(latestCalc.shippingCost),
    parseFloat(latestCalc.customsDuty || '0'),
    parseFloat(latestCalc.taxes || '0'),
    parseFloat(latestCalc.otherFees || '0')
  );
  
  await storage.updateLandedCostCalculation(latestCalc.id, calculation);
  await storage.updateImportOrder(orderId, {
    totalLandedCost: calculation.totalLandedCost
  });
}

export { importOrdersRouter };