import express from "express";
import { storage } from "../storage";
import { z } from "zod";

export const putawayRouter = express.Router();

const putawaySuggestSchema = z.object({
  variantId: z.string(),
  quantity: z.number().positive()
});

// Suggest putaway locations
putawayRouter.post("/putaway/suggest", async (req, res) => {
  try {
    const { variantId, quantity } = putawaySuggestSchema.parse(req.body);
    
    const suggestions = await storage.suggestPutawayLocations(variantId, quantity);
    
    res.json({ suggestions });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid request data", details: error.errors });
    }
    console.error("Error suggesting putaway locations:", error);
    res.status(500).json({ error: "Failed to suggest putaway locations" });
  }
});

// Confirm putaway (create/update inventory balance)
putawayRouter.post("/putaway/confirm", async (req, res) => {
  try {
    const { locationId, variantId, quantity, lotNumber, expiryDate } = req.body;
    
    // Check if balance already exists for this variant in this location
    const existingBalances = await storage.getInventoryBalances(locationId);
    const existingBalance = existingBalances.find(b => b.variantId === variantId);
    
    if (existingBalance) {
      // Update existing balance
      const updatedBalance = await storage.updateInventoryBalance(existingBalance.id, {
        quantity: existingBalance.quantity + quantity,
        lotNumber,
        expiryDate
      });
      res.json(updatedBalance);
    } else {
      // Create new balance
      const newBalance = await storage.createInventoryBalance({
        locationId,
        variantId,
        quantity,
        lotNumber,
        expiryDate
      });
      res.status(201).json(newBalance);
    }
  } catch (error) {
    console.error("Error confirming putaway:", error);
    res.status(500).json({ error: "Failed to confirm putaway" });
  }
});