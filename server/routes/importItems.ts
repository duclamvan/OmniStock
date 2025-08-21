import { Router } from "express";
import { z } from "zod";
import { storage } from "../storage";

const importItemsRouter = Router();

// Get all import items across all orders
importItemsRouter.get("/import-items", async (req, res) => {
  try {
    const items = await storage.getAllImportItems();
    res.json(items);
  } catch (error) {
    console.error("Error fetching import items:", error);
    res.status(500).json({ error: "Failed to fetch import items" });
  }
});

// Get consolidated import items
importItemsRouter.get("/import-items/consolidated", async (req, res) => {
  try {
    const consolidatedData = await storage.getConsolidatedImportItems();
    res.json(consolidatedData);
  } catch (error) {
    console.error("Error fetching consolidated data:", error);
    res.status(500).json({ error: "Failed to fetch consolidated data" });
  }
});

// Link import item to product
importItemsRouter.post("/import-items/:id/link-product", async (req, res) => {
  try {
    const { id } = req.params;
    const { productId } = req.body;
    
    if (!productId) {
      return res.status(400).json({ error: "Product ID is required" });
    }
    
    const updatedItem = await storage.linkImportItemToProduct(id, productId);
    res.json(updatedItem);
  } catch (error) {
    console.error("Error linking import item to product:", error);
    res.status(500).json({ error: "Failed to link item to product" });
  }
});

// Create new product and link to import item
importItemsRouter.post("/import-items/:id/create-and-link", async (req, res) => {
  try {
    const { id } = req.params;
    const { productData } = req.body;
    
    if (!productData) {
      return res.status(400).json({ error: "Product data is required" });
    }
    
    // Create product and link it
    const result = await storage.createProductAndLinkToImportItem(id, productData);
    res.json(result);
  } catch (error) {
    console.error("Error creating and linking product:", error);
    res.status(500).json({ error: "Failed to create and link product" });
  }
});

// Get import shipments
importItemsRouter.get("/import-shipments", async (req, res) => {
  try {
    const shipments = await storage.getImportShipments();
    res.json(shipments);
  } catch (error) {
    console.error("Error fetching shipments:", error);
    res.status(500).json({ error: "Failed to fetch shipments" });
  }
});

export default importItemsRouter;