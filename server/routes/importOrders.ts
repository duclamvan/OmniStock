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
    
    // Mock data for testing - matches the Kanban view orders
    const mockOrders: any = {
      'imp-001': {
        id: 'imp-001',
        orderNumber: "IMP-2025-001",
        supplier: "Shenzhen Electronics Co",
        supplierCountry: "China",
        destination: "USA Warehouse",
        status: "pending",
        priority: "high",
        totalItems: 500,
        totalValue: 25000,
        currency: "USD",
        estimatedArrival: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString(),
        createdDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        lastUpdated: new Date().toISOString(),
        assignee: "Sarah Chen",
        tags: ["Electronics", "Urgent"],
        progress: 0,
        documents: 3,
        trackingNumber: "CN2025SHIP001",
        shippingMethod: "Sea Freight",
        shippingCost: 1500,
        customsDuty: 2500,
        taxes: 2000,
        totalLandedCost: 31000,
        items: [
          { id: "1", name: "USB-C Cables", quantity: 200, sku: "USB-C-001", unitPrice: 50, totalPrice: 10000 },
          { id: "2", name: "Wireless Chargers", quantity: 150, sku: "WC-002", unitPrice: 66.67, totalPrice: 10000 },
          { id: "3", name: "Phone Cases", quantity: 100, sku: "PC-003", unitPrice: 40, totalPrice: 4000 },
          { id: "4", name: "Screen Protectors", quantity: 50, sku: "SP-004", unitPrice: 20, totalPrice: 1000 }
        ]
      },
      'imp-002': {
        id: 'imp-002',
        orderNumber: "IMP-2025-002",
        supplier: "Vietnam Textiles Ltd",
        supplierCountry: "Vietnam",
        destination: "USA Warehouse",
        status: "processing",
        priority: "medium",
        totalItems: 1200,
        totalValue: 18000,
        currency: "USD",
        estimatedArrival: new Date(Date.now() + 9 * 24 * 60 * 60 * 1000).toISOString(),
        createdDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        lastUpdated: new Date().toISOString(),
        assignee: "Mike Johnson",
        tags: ["Textiles", "Spring Collection"],
        progress: 25,
        documents: 2,
        trackingNumber: "VN2025SHIP002",
        shippingMethod: "Air Freight",
        shippingCost: 2200,
        customsDuty: 1800,
        taxes: 1500,
        totalLandedCost: 23500,
        items: [
          { id: "1", name: "Cotton T-Shirts", quantity: 500, sku: "TS-001", unitPrice: 15, totalPrice: 7500 },
          { id: "2", name: "Denim Jeans", quantity: 300, sku: "DJ-002", unitPrice: 25, totalPrice: 7500 },
          { id: "3", name: "Summer Dresses", quantity: 200, sku: "SD-003", unitPrice: 10, totalPrice: 2000 },
          { id: "4", name: "Linen Shirts", quantity: 100, sku: "LS-004", unitPrice: 5, totalPrice: 500 },
          { id: "5", name: "Cotton Shorts", quantity: 100, sku: "CS-005", unitPrice: 5, totalPrice: 500 }
        ]
      },
      'imp-003': {
        id: 'imp-003',
        orderNumber: "IMP-2025-003",
        supplier: "Shanghai Manufacturing",
        supplierCountry: "China",
        destination: "China Warehouse",
        status: "in_transit",
        priority: "high",
        totalItems: 800,
        totalValue: 45000,
        currency: "USD",
        estimatedArrival: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        createdDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        lastUpdated: new Date().toISOString(),
        assignee: "Li Wang",
        tags: ["Electronics", "CPUs", "Urgent"],
        progress: 60,
        documents: 5,
        trackingNumber: "CN2025SHIP003",
        shippingMethod: "Express Rail",
        shippingCost: 3000,
        customsDuty: 4500,
        taxes: 3500,
        totalLandedCost: 56000,
        items: [
          { id: "1", name: "CPU Processors", quantity: 200, sku: "CPU-001", unitPrice: 150, totalPrice: 30000 },
          { id: "2", name: "RAM Modules 16GB", quantity: 300, sku: "RAM-002", unitPrice: 40, totalPrice: 12000 },
          { id: "3", name: "SSD 1TB", quantity: 300, sku: "SSD-003", unitPrice: 10, totalPrice: 3000 }
        ]
      },
      'imp-004': {
        id: 'imp-004',
        orderNumber: "IMP-2025-004",
        supplier: "Ho Chi Minh Supplies",
        supplierCountry: "Vietnam",
        destination: "Vietnam Warehouse",
        status: "in_transit",
        priority: "medium",
        totalItems: 350,
        totalValue: 12000,
        currency: "USD",
        estimatedArrival: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
        createdDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        lastUpdated: new Date().toISOString(),
        assignee: "Nguyen Tran",
        tags: ["Bamboo", "Eco-friendly"],
        progress: 75,
        documents: 2,
        trackingNumber: "VN2025SHIP004",
        shippingMethod: "Sea Freight",
        shippingCost: 800,
        customsDuty: 1200,
        taxes: 1000,
        totalLandedCost: 15000,
        items: [
          { id: "1", name: "Bamboo Fabric Rolls", quantity: 100, sku: "BF-001", unitPrice: 60, totalPrice: 6000 },
          { id: "2", name: "Organic Cotton", quantity: 150, sku: "OC-002", unitPrice: 30, totalPrice: 4500 },
          { id: "3", name: "Hemp Material", quantity: 100, sku: "HM-003", unitPrice: 15, totalPrice: 1500 }
        ]
      },
      'imp-005': {
        id: 'imp-005',
        orderNumber: "IMP-2025-005",
        supplier: "Beijing Tech Solutions",
        supplierCountry: "China",
        destination: "USA Warehouse", 
        status: "delivered",
        priority: "low",
        totalItems: 150,
        totalValue: 8500,
        currency: "USD",
        estimatedArrival: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        createdDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
        lastUpdated: new Date().toISOString(),
        assignee: "John Smith",
        tags: ["Completed", "Smart Home"],
        progress: 100,
        documents: 4,
        trackingNumber: "CN2025SHIP005",
        shippingMethod: "Air Freight",
        shippingCost: 500,
        customsDuty: 850,
        taxes: 650,
        totalLandedCost: 10500,
        items: [
          { id: "1", name: "Smart Watches", quantity: 50, sku: "SW-001", unitPrice: 100, totalPrice: 5000 },
          { id: "2", name: "Bluetooth Earbuds", quantity: 75, sku: "BE-002", unitPrice: 40, totalPrice: 3000 },
          { id: "3", name: "Fitness Trackers", quantity: 25, sku: "FT-003", unitPrice: 20, totalPrice: 500 }
        ]
      }
    };
    
    // Return mock data if available
    if (mockOrders[id]) {
      return res.json(mockOrders[id]);
    }
    
    // Try to fetch from database (if implemented)
    const order = await storage.getImportOrderById?.(id);
    
    if (!order) {
      return res.status(404).json({ error: "Import order not found" });
    }

    const items = await storage.getImportOrderItems?.(id) || [];
    const calculation = await storage.getLatestCalculation?.(id) || null;
    
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