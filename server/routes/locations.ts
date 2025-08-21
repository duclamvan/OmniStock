import express from "express";
import { storage } from "../storage";
// import { insertWarehouseLocationSchema, insertInventoryBalanceSchema } from "@shared/schema";
import { z } from "zod";

export const locationsRouter = express.Router();

// Get warehouse locations
locationsRouter.get("/warehouses/:code/locations", async (req, res) => {
  try {
    const { code } = req.params;
    const { type, q } = req.query;
    
    // First, get the warehouse by code
    const warehouses = await storage.getWarehouses();
    const warehouse = warehouses.find(w => w.code === code || w.id === code);
    
    if (!warehouse) {
      return res.status(404).json({ error: "Warehouse not found" });
    }
    
    const locations = await storage.getWarehouseLocations(
      warehouse.id,
      type as string | undefined,
      q as string | undefined
    );
    
    res.json(locations);
  } catch (error) {
    console.error("Error fetching warehouse locations:", error);
    res.status(500).json({ error: "Failed to fetch warehouse locations" });
  }
});

// Get location by ID
locationsRouter.get("/locations/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const location = await storage.getWarehouseLocationById(id);
    
    if (!location) {
      return res.status(404).json({ error: "Location not found" });
    }
    
    res.json(location);
  } catch (error) {
    console.error("Error fetching location:", error);
    res.status(500).json({ error: "Failed to fetch location" });
  }
});

// Get location children
locationsRouter.get("/locations/:id/children", async (req, res) => {
  try {
    const { id } = req.params;
    const children = await storage.getLocationChildren(id);
    res.json(children);
  } catch (error) {
    console.error("Error fetching location children:", error);
    res.status(500).json({ error: "Failed to fetch location children" });
  }
});

// Create single location
locationsRouter.post("/locations", async (req, res) => {
  try {
    const location = insertWarehouseLocationSchema.parse(req.body);
    const newLocation = await storage.createWarehouseLocation(location);
    res.status(201).json(newLocation);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid location data", details: error.errors });
    }
    console.error("Error creating location:", error);
    res.status(500).json({ error: "Failed to create location" });
  }
});

// Bulk create locations
locationsRouter.post("/warehouses/:code/locations/bulk", async (req, res) => {
  try {
    const { code } = req.params;
    const { locations, clearExisting = true } = req.body;
    
    if (!Array.isArray(locations)) {
      return res.status(400).json({ error: "Locations must be an array" });
    }
    
    // Get warehouse
    const warehouses = await storage.getWarehouses();
    const warehouse = warehouses.find(w => w.code === code || w.id === code);
    
    if (!warehouse) {
      return res.status(404).json({ error: "Warehouse not found" });
    }
    
    // Clear existing locations if requested
    if (clearExisting) {
      await storage.clearWarehouseLocations(warehouse.id);
    }
    
    // Add warehouse ID to each location
    const locationsWithWarehouse = locations.map(loc => ({
      ...loc,
      warehouseId: warehouse.id
    }));
    
    // Validate all locations
    const validatedLocations = locationsWithWarehouse.map(loc => 
      insertWarehouseLocationSchema.parse(loc)
    );
    
    const newLocations = await storage.createWarehouseLocationsBulk(validatedLocations);
    res.status(201).json(newLocations);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid location data", details: error.errors });
    }
    console.error("Error creating locations:", error);
    res.status(500).json({ error: "Failed to create locations" });
  }
});

// Update location
locationsRouter.put("/locations/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const updatedLocation = await storage.updateWarehouseLocation(id, updates);
    res.json(updatedLocation);
  } catch (error) {
    console.error("Error updating location:", error);
    res.status(500).json({ error: "Failed to update location" });
  }
});

// Delete location
locationsRouter.delete("/locations/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await storage.deleteWarehouseLocation(id);
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting location:", error);
    res.status(500).json({ error: "Failed to delete location" });
  }
});

// Get inventory balances for a location
locationsRouter.get("/locations/:id/balances", async (req, res) => {
  try {
    const { id } = req.params;
    const balances = await storage.getInventoryBalances(id);
    res.json(balances);
  } catch (error) {
    console.error("Error fetching inventory balances:", error);
    res.status(500).json({ error: "Failed to fetch inventory balances" });
  }
});

// Create inventory balance
locationsRouter.post("/inventory-balances", async (req, res) => {
  try {
    const balance = insertInventoryBalanceSchema.parse(req.body);
    const newBalance = await storage.createInventoryBalance(balance);
    res.status(201).json(newBalance);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid balance data", details: error.errors });
    }
    console.error("Error creating inventory balance:", error);
    res.status(500).json({ error: "Failed to create inventory balance" });
  }
});

// Update inventory balance
locationsRouter.put("/inventory-balances/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const updatedBalance = await storage.updateInventoryBalance(id, updates);
    res.json(updatedBalance);
  } catch (error) {
    console.error("Error updating inventory balance:", error);
    res.status(500).json({ error: "Failed to update inventory balance" });
  }
});

// Delete inventory balance
locationsRouter.delete("/inventory-balances/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await storage.deleteInventoryBalance(id);
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting inventory balance:", error);
    res.status(500).json({ error: "Failed to delete inventory balance" });
  }
});