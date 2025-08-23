import {
  users,
  importPurchases,
  purchaseItems,
  consolidations,
  shipments,
  customItems,
  deliveryHistory,
  type User,
  type InsertUser,
  type ImportPurchase,
  type InsertImportPurchase,
  type PurchaseItem,
  type InsertPurchaseItem,
  type Consolidation,
  type InsertConsolidation,
  type Shipment,
  type InsertShipment,
  type CustomItem,
  type InsertCustomItem,
  type DeliveryHistory,
  type InsertDeliveryHistory
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, or, like, sql } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Import Purchases
  getImportPurchases(): Promise<ImportPurchase[]>;
  getImportPurchase(id: number): Promise<ImportPurchase | undefined>;
  createImportPurchase(purchase: InsertImportPurchase): Promise<ImportPurchase>;
  updateImportPurchase(id: number, purchase: Partial<InsertImportPurchase>): Promise<ImportPurchase | undefined>;
  deleteImportPurchase(id: number): Promise<boolean>;
  
  // Purchase Items
  getPurchaseItems(purchaseId: number): Promise<PurchaseItem[]>;
  createPurchaseItem(item: InsertPurchaseItem): Promise<PurchaseItem>;
  updatePurchaseItem(id: number, item: Partial<InsertPurchaseItem>): Promise<PurchaseItem | undefined>;
  
  // Consolidations
  getConsolidations(): Promise<Consolidation[]>;
  getConsolidation(id: number): Promise<Consolidation | undefined>;
  createConsolidation(consolidation: InsertConsolidation): Promise<Consolidation>;
  updateConsolidation(id: number, consolidation: Partial<InsertConsolidation>): Promise<Consolidation | undefined>;
  
  // Shipments
  getShipments(): Promise<Shipment[]>;
  getShipment(id: number): Promise<Shipment | undefined>;
  createShipment(shipment: InsertShipment): Promise<Shipment>;
  updateShipment(id: number, shipment: Partial<InsertShipment>): Promise<Shipment | undefined>;
  
  // Custom Items
  getCustomItems(): Promise<CustomItem[]>;
  createCustomItem(item: InsertCustomItem): Promise<CustomItem>;
  updateCustomItem(id: number, item: Partial<InsertCustomItem>): Promise<CustomItem | undefined>;
  
  // Delivery History
  createDeliveryHistory(history: InsertDeliveryHistory): Promise<DeliveryHistory>;
  getDeliveryHistory(filters?: Partial<DeliveryHistory>): Promise<DeliveryHistory[]>;
}

export class DatabaseStorage implements IStorage {
  // Users
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }
  
  // Import Purchases
  async getImportPurchases(): Promise<ImportPurchase[]> {
    return await db
      .select()
      .from(importPurchases)
      .orderBy(desc(importPurchases.createdAt));
  }

  async getImportPurchase(id: number): Promise<ImportPurchase | undefined> {
    const [purchase] = await db
      .select()
      .from(importPurchases)
      .where(eq(importPurchases.id, id));
    return purchase || undefined;
  }

  async createImportPurchase(purchase: InsertImportPurchase): Promise<ImportPurchase> {
    const [newPurchase] = await db
      .insert(importPurchases)
      .values(purchase)
      .returning();
    return newPurchase;
  }

  async updateImportPurchase(id: number, purchase: Partial<InsertImportPurchase>): Promise<ImportPurchase | undefined> {
    const [updated] = await db
      .update(importPurchases)
      .set({ ...purchase, updatedAt: new Date() })
      .where(eq(importPurchases.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteImportPurchase(id: number): Promise<boolean> {
    const result = await db
      .delete(importPurchases)
      .where(eq(importPurchases.id, id));
    return result.rowCount > 0;
  }
  
  // Purchase Items
  async getPurchaseItems(purchaseId: number): Promise<PurchaseItem[]> {
    return await db
      .select()
      .from(purchaseItems)
      .where(eq(purchaseItems.purchaseId, purchaseId));
  }

  async createPurchaseItem(item: InsertPurchaseItem): Promise<PurchaseItem> {
    const [newItem] = await db
      .insert(purchaseItems)
      .values(item)
      .returning();
    return newItem;
  }

  async updatePurchaseItem(id: number, item: Partial<InsertPurchaseItem>): Promise<PurchaseItem | undefined> {
    const [updated] = await db
      .update(purchaseItems)
      .set({ ...item, updatedAt: new Date() })
      .where(eq(purchaseItems.id, id))
      .returning();
    return updated || undefined;
  }
  
  // Consolidations
  async getConsolidations(): Promise<Consolidation[]> {
    return await db
      .select()
      .from(consolidations)
      .orderBy(desc(consolidations.createdAt));
  }

  async getConsolidation(id: number): Promise<Consolidation | undefined> {
    const [consolidation] = await db
      .select()
      .from(consolidations)
      .where(eq(consolidations.id, id));
    return consolidation || undefined;
  }

  async createConsolidation(consolidation: InsertConsolidation): Promise<Consolidation> {
    const [newConsolidation] = await db
      .insert(consolidations)
      .values(consolidation)
      .returning();
    return newConsolidation;
  }

  async updateConsolidation(id: number, consolidation: Partial<InsertConsolidation>): Promise<Consolidation | undefined> {
    const [updated] = await db
      .update(consolidations)
      .set({ ...consolidation, updatedAt: new Date() })
      .where(eq(consolidations.id, id))
      .returning();
    return updated || undefined;
  }
  
  // Shipments
  async getShipments(): Promise<Shipment[]> {
    return await db
      .select()
      .from(shipments)
      .orderBy(desc(shipments.createdAt));
  }

  async getShipment(id: number): Promise<Shipment | undefined> {
    const [shipment] = await db
      .select()
      .from(shipments)
      .where(eq(shipments.id, id));
    return shipment || undefined;
  }

  async createShipment(shipment: InsertShipment): Promise<Shipment> {
    const [newShipment] = await db
      .insert(shipments)
      .values(shipment)
      .returning();
    return newShipment;
  }

  async updateShipment(id: number, shipment: Partial<InsertShipment>): Promise<Shipment | undefined> {
    const [updated] = await db
      .update(shipments)
      .set({ ...shipment, updatedAt: new Date() })
      .where(eq(shipments.id, id))
      .returning();
    return updated || undefined;
  }
  
  // Custom Items
  async getCustomItems(): Promise<CustomItem[]> {
    return await db
      .select()
      .from(customItems)
      .orderBy(desc(customItems.createdAt));
  }

  async createCustomItem(item: InsertCustomItem): Promise<CustomItem> {
    const [newItem] = await db
      .insert(customItems)
      .values(item)
      .returning();
    return newItem;
  }

  async updateCustomItem(id: number, item: Partial<InsertCustomItem>): Promise<CustomItem | undefined> {
    const [updated] = await db
      .update(customItems)
      .set({ ...item, updatedAt: new Date() })
      .where(eq(customItems.id, id))
      .returning();
    return updated || undefined;
  }
  
  // Delivery History
  async createDeliveryHistory(history: InsertDeliveryHistory): Promise<DeliveryHistory> {
    const [newHistory] = await db
      .insert(deliveryHistory)
      .values(history)
      .returning();
    return newHistory;
  }

  async getDeliveryHistory(filters?: Partial<DeliveryHistory>): Promise<DeliveryHistory[]> {
    let query = db.select().from(deliveryHistory);
    
    if (filters) {
      const conditions = [];
      if (filters.carrier) conditions.push(eq(deliveryHistory.carrier, filters.carrier));
      if (filters.origin) conditions.push(eq(deliveryHistory.origin, filters.origin));
      if (filters.destination) conditions.push(eq(deliveryHistory.destination, filters.destination));
      if (filters.shippingMethod) conditions.push(eq(deliveryHistory.shippingMethod, filters.shippingMethod));
      if (filters.season) conditions.push(eq(deliveryHistory.season, filters.season));
      
      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }
    }
    
    return await query;
  }
}

export const storage = new DatabaseStorage();