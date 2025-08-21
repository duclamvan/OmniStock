import { pgTable, text, integer, timestamp, decimal, boolean, jsonb, varchar, serial, date } from 'drizzle-orm/pg-core';
import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';
import { relations } from 'drizzle-orm';

// Users table
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  username: text('username').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: text('role').notNull().default('user'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
});

// Import Purchases (formerly orders from suppliers)
export const importPurchases = pgTable('import_purchases', {
  id: serial('id').primaryKey(),
  purchaseNumber: text('purchase_number').notNull().unique(),
  supplier: text('supplier').notNull(),
  supplierCountry: text('supplier_country').notNull(),
  status: text('status').notNull().default('processing'), // processing, at_warehouse, shipped, delivered
  totalAmount: decimal('total_amount', { precision: 10, scale: 2 }),
  currency: text('currency').default('USD'),
  orderDate: timestamp('order_date').notNull().defaultNow(),
  estimatedArrival: date('estimated_arrival'),
  notes: text('notes'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
});

// Purchase Items (items within a purchase)
export const purchaseItems = pgTable('purchase_items', {
  id: serial('id').primaryKey(),
  purchaseId: integer('purchase_id').notNull().references(() => importPurchases.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  sku: text('sku'),
  quantity: integer('quantity').notNull(),
  unitPrice: decimal('unit_price', { precision: 10, scale: 2 }),
  totalPrice: decimal('total_price', { precision: 10, scale: 2 }),
  weight: decimal('weight', { precision: 10, scale: 3 }), // in kg
  dimensions: jsonb('dimensions'), // {length, width, height}
  status: text('status').notNull().default('ordered'),
  trackingNumber: text('tracking_number'),
  warehouseLocation: text('warehouse_location'),
  consolidationId: integer('consolidation_id').references(() => consolidations.id),
  imageUrl: text('image_url'),
  notes: text('notes'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
});

// Consolidations (grouping items at warehouse)
export const consolidations = pgTable('consolidations', {
  id: serial('id').primaryKey(),
  consolidationNumber: text('consolidation_number').notNull().unique(),
  warehouseLocation: text('warehouse_location').notNull(),
  status: text('status').notNull().default('pending'), // pending, ready, shipped
  shippingType: text('shipping_type'), // air, sea, express
  estimatedWeight: decimal('estimated_weight', { precision: 10, scale: 3 }),
  actualWeight: decimal('actual_weight', { precision: 10, scale: 3 }),
  dimensions: jsonb('dimensions'),
  shipmentId: integer('shipment_id').references(() => shipments.id),
  notes: text('notes'),
  color: text('color'), // for visual grouping
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
});

// Shipments (international transit)
export const shipments = pgTable('shipments', {
  id: serial('id').primaryKey(),
  shipmentNumber: text('shipment_number').notNull().unique(),
  carrier: text('carrier').notNull(),
  trackingNumber: text('tracking_number').notNull(),
  origin: text('origin').notNull(),
  destination: text('destination').notNull(),
  status: text('status').notNull().default('in_transit'), // preparing, in_transit, customs, delivered
  shippingMethod: text('shipping_method').notNull(), // air, sea, express
  departureDate: timestamp('departure_date'),
  estimatedArrival: timestamp('estimated_arrival'),
  actualArrival: timestamp('actual_arrival'),
  totalWeight: decimal('total_weight', { precision: 10, scale: 3 }),
  totalCost: decimal('total_cost', { precision: 10, scale: 2 }),
  currency: text('currency').default('USD'),
  trackingEvents: jsonb('tracking_events'), // Array of tracking events
  customsInfo: jsonb('customs_info'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
});

// Delivery History (for AI predictions)
export const deliveryHistory = pgTable('delivery_history', {
  id: serial('id').primaryKey(),
  shipmentId: integer('shipment_id').references(() => shipments.id),
  carrier: text('carrier').notNull(),
  origin: text('origin').notNull(),
  destination: text('destination').notNull(),
  shippingMethod: text('shipping_method').notNull(),
  season: text('season').notNull(), // spring, summer, fall, winter
  month: integer('month').notNull(),
  year: integer('year').notNull(),
  estimatedDays: integer('estimated_days'),
  actualDays: integer('actual_days').notNull(),
  delayDays: integer('delay_days'),
  weatherImpact: boolean('weather_impact').default(false),
  holidayImpact: boolean('holiday_impact').default(false),
  createdAt: timestamp('created_at').notNull().defaultNow()
});

// Custom Items (Taobao, Pinduoduo, etc.)
export const customItems = pgTable('custom_items', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  platform: text('platform').notNull(), // taobao, pinduoduo, 1688, etc.
  orderNumber: text('order_number'),
  quantity: integer('quantity').notNull().default(1),
  price: decimal('price', { precision: 10, scale: 2 }),
  currency: text('currency').default('CNY'),
  weight: decimal('weight', { precision: 10, scale: 3 }),
  dimensions: jsonb('dimensions'),
  warehouseLocation: text('warehouse_location'),
  consolidationId: integer('consolidation_id').references(() => consolidations.id),
  status: text('status').notNull().default('pending'),
  imageUrl: text('image_url'),
  trackingNumber: text('tracking_number'),
  notes: text('notes'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
});

// Relations
export const importPurchasesRelations = relations(importPurchases, ({ many }) => ({
  items: many(purchaseItems)
}));

export const purchaseItemsRelations = relations(purchaseItems, ({ one }) => ({
  purchase: one(importPurchases, {
    fields: [purchaseItems.purchaseId],
    references: [importPurchases.id]
  }),
  consolidation: one(consolidations, {
    fields: [purchaseItems.consolidationId],
    references: [consolidations.id]
  })
}));

export const consolidationsRelations = relations(consolidations, ({ many, one }) => ({
  purchaseItems: many(purchaseItems),
  customItems: many(customItems),
  shipment: one(shipments, {
    fields: [consolidations.shipmentId],
    references: [shipments.id]
  })
}));

export const shipmentsRelations = relations(shipments, ({ many }) => ({
  consolidations: many(consolidations),
  deliveryHistory: many(deliveryHistory)
}));

// Export schemas
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true, updatedAt: true });
export const insertImportPurchaseSchema = createInsertSchema(importPurchases).omit({ id: true, createdAt: true, updatedAt: true });
export const insertPurchaseItemSchema = createInsertSchema(purchaseItems).omit({ id: true, createdAt: true, updatedAt: true });
export const insertConsolidationSchema = createInsertSchema(consolidations).omit({ id: true, createdAt: true, updatedAt: true });
export const insertShipmentSchema = createInsertSchema(shipments).omit({ id: true, createdAt: true, updatedAt: true });
export const insertCustomItemSchema = createInsertSchema(customItems).omit({ id: true, createdAt: true, updatedAt: true });
export const insertDeliveryHistorySchema = createInsertSchema(deliveryHistory).omit({ id: true, createdAt: true });

// Export types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type ImportPurchase = typeof importPurchases.$inferSelect;
export type InsertImportPurchase = z.infer<typeof insertImportPurchaseSchema>;
export type PurchaseItem = typeof purchaseItems.$inferSelect;
export type InsertPurchaseItem = z.infer<typeof insertPurchaseItemSchema>;
export type Consolidation = typeof consolidations.$inferSelect;
export type InsertConsolidation = z.infer<typeof insertConsolidationSchema>;
export type Shipment = typeof shipments.$inferSelect;
export type InsertShipment = z.infer<typeof insertShipmentSchema>;
export type CustomItem = typeof customItems.$inferSelect;
export type InsertCustomItem = z.infer<typeof insertCustomItemSchema>;
export type DeliveryHistory = typeof deliveryHistory.$inferSelect;
export type InsertDeliveryHistory = z.infer<typeof insertDeliveryHistorySchema>;