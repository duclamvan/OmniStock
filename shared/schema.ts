import { pgTable, text, integer, timestamp, decimal, boolean, jsonb, varchar, serial, date, json } from 'drizzle-orm/pg-core';
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

// Categories table
export const categories = pgTable('categories', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(), // Default display name
  nameEn: text('name_en'), // English name
  nameCz: text('name_cz'), // Czech name
  nameVn: text('name_vn'), // Vietnamese name
  description: text('description'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
});

// Import Purchases (formerly orders from suppliers)
export const importPurchases = pgTable('import_purchases', {
  id: serial('id').primaryKey(),
  supplier: text('supplier').notNull(),
  location: text('location').notNull().default('China'), // Europe, USA, China, Vietnam
  trackingNumber: text('tracking_number'),
  estimatedArrival: timestamp('estimated_arrival'),
  notes: text('notes'),
  shippingCost: decimal('shipping_cost', { precision: 10, scale: 2 }).default('0'),
  totalCost: decimal('total_cost', { precision: 10, scale: 2 }).default('0'),
  // Currency fields - payment currency is primary
  paymentCurrency: text('payment_currency').default('USD'),
  totalPaid: decimal('total_paid', { precision: 10, scale: 2 }).default('0'),
  purchaseCurrency: text('purchase_currency').default('USD'),
  purchaseTotal: decimal('purchase_total', { precision: 10, scale: 2 }).default('0'),
  exchangeRate: decimal('exchange_rate', { precision: 10, scale: 6 }).default('1'), // Rate from purchase to payment currency
  status: text('status').notNull().default('pending'), // pending, processing, at_warehouse, shipped, delivered
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
  name: text('name').notNull(),
  location: text('location').notNull(), // Country destination
  shippingMethod: text('shipping_method').notNull(), // general_air_ddp, sensitive_air_ddp, express_general, express_sensitive, railway_general, railway_sensitive, sea_general, sea_sensitive
  warehouse: text('warehouse').notNull(),
  notes: text('notes'),
  targetWeight: decimal('target_weight', { precision: 10, scale: 3 }),
  maxItems: integer('max_items'),
  status: text('status').notNull().default('preparing'), // preparing, ready, shipped
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
});

// Shipments (international transit)
export const shipments = pgTable('shipments', {
  id: serial('id').primaryKey(),
  consolidationId: integer('consolidation_id').references(() => consolidations.id),
  carrier: text('carrier').notNull(),
  trackingNumber: text('tracking_number').notNull(),
  endCarrier: text('end_carrier'),
  endTrackingNumber: text('end_tracking_number'),
  shipmentName: text('shipment_name'),
  shipmentType: text('shipment_type'),
  origin: text('origin').notNull(),
  destination: text('destination').notNull(),
  status: text('status').notNull().default('pending'), // pending, in transit, delivered
  shippingCost: decimal('shipping_cost', { precision: 10, scale: 2 }).default('0'),
  shippingCostCurrency: text('shipping_cost_currency').default('USD'),
  insuranceValue: decimal('insurance_value', { precision: 10, scale: 2 }).default('0'),
  totalWeight: decimal('total_weight', { precision: 10, scale: 3 }), // in kg
  totalUnits: integer('total_units'),
  unitType: text('unit_type').default('items'),
  estimatedDelivery: timestamp('estimated_delivery'),
  deliveredAt: timestamp('delivered_at'),
  currentLocation: text('current_location'),
  notes: text('notes'),
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
  dispatchedAt: timestamp('dispatched_at').notNull(),
  deliveredAt: timestamp('delivered_at').notNull(),
  estimatedDays: integer('estimated_days'),
  actualDays: integer('actual_days').notNull(),
  seasonalFactor: boolean('seasonal_factor').default(false),
  createdAt: timestamp('created_at').notNull().defaultNow()
});

// Custom Items (Taobao, Pinduoduo, etc.)
export const customItems = pgTable('custom_items', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  source: text('source').notNull(), // taobao, pinduoduo, 1688, etc.
  orderNumber: text('order_number'),
  quantity: integer('quantity').notNull().default(1),
  unitPrice: decimal('unit_price', { precision: 10, scale: 2 }).default('0'),
  weight: decimal('weight', { precision: 10, scale: 3 }).default('0'),
  dimensions: text('dimensions'),
  trackingNumber: text('tracking_number'),
  notes: text('notes'),
  customerName: text('customer_name'),
  customerEmail: text('customer_email'),
  status: text('status').notNull().default('available'), // available, assigned, shipped
  classification: text('classification').default('general'), // general, sensitive
  purchaseOrderId: integer('purchase_order_id'), // Reference to original PO for full packages
  orderItems: json('order_items'), // Store items when this is a full package
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at')
});

// Junction tables for many-to-many relationships
export const consolidationItems = pgTable('consolidation_items', {
  id: serial('id').primaryKey(),
  consolidationId: integer('consolidation_id').notNull().references(() => consolidations.id, { onDelete: 'cascade' }),
  itemId: integer('item_id').notNull(), // References either purchaseItems.id or customItems.id
  itemType: text('item_type').notNull(), // 'purchase' or 'custom'
  createdAt: timestamp('created_at').notNull().defaultNow()
});

export const shipmentItems = pgTable('shipment_items', {
  id: serial('id').primaryKey(),
  shipmentId: integer('shipment_id').notNull().references(() => shipments.id, { onDelete: 'cascade' }),
  consolidationId: integer('consolidation_id').notNull().references(() => consolidations.id),
  createdAt: timestamp('created_at').notNull().defaultNow()
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

export const consolidationsRelations = relations(consolidations, ({ many }) => ({
  purchaseItems: many(purchaseItems),
  customItems: many(customItems),
  shipments: many(shipments)
}));

export const shipmentsRelations = relations(shipments, ({ many }) => ({
  consolidations: many(consolidations),
  deliveryHistory: many(deliveryHistory)
}));

// Export schemas
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true, updatedAt: true });
export const insertCategorySchema = createInsertSchema(categories).omit({ id: true, createdAt: true, updatedAt: true });
export const insertImportPurchaseSchema = createInsertSchema(importPurchases).omit({ id: true, createdAt: true, updatedAt: true });
export const insertPurchaseItemSchema = createInsertSchema(purchaseItems).omit({ id: true, createdAt: true, updatedAt: true });
export const insertConsolidationSchema = createInsertSchema(consolidations).omit({ id: true, createdAt: true, updatedAt: true });
export const insertShipmentSchema = createInsertSchema(shipments).omit({ id: true, createdAt: true, updatedAt: true });
export const insertCustomItemSchema = createInsertSchema(customItems).omit({ id: true, createdAt: true });
export const insertDeliveryHistorySchema = createInsertSchema(deliveryHistory).omit({ id: true, createdAt: true });

// Export types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Category = typeof categories.$inferSelect;
export type InsertCategory = z.infer<typeof insertCategorySchema>;
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

// Delivery Receipts System Tables
export const deliveryReceipts = pgTable('delivery_receipts', {
  id: serial('id').primaryKey(),
  importPurchaseId: integer('import_purchase_id').notNull().references(() => importPurchases.id),
  carrier: text('carrier').notNull(), // e.g., GLS, PPL, Rail, DHL, Forwarder name
  claimedParcels: integer('claimed_parcels').notNull().default(0), // employee typed count
  claimedCartons: integer('claimed_cartons').notNull().default(0),
  dockCode: text('dock_code'),
  employeeId: integer('employee_id').notNull().references(() => users.id),
  founderId: integer('founder_id').references(() => users.id), // set when founder confirms
  status: text('status').$type<
    'draft' | 'employee_submitted' | 'founder_confirmed' | 'posted_to_inventory'
  >().notNull().default('draft'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  submittedAt: timestamp('submitted_at', { withTimezone: true }),
  confirmedAt: timestamp('confirmed_at', { withTimezone: true })
});

export const deliveryReceiptLines = pgTable('delivery_receipt_lines', {
  id: serial('id').primaryKey(),
  receiptId: integer('receipt_id').notNull().references(() => deliveryReceipts.id, { onDelete: 'cascade' }),
  purchaseItemId: integer('purchase_item_id').references(() => purchaseItems.id),
  skuId: integer('sku_id'), // nullable until matched
  skuCode: text('sku_code'), // fallback display
  name: text('name').notNull(),
  expectedQty: integer('expected_qty').notNull().default(0),
  receivedQty: integer('received_qty').notNull().default(0),
  damagedQty: integer('damaged_qty').notNull().default(0),
  note: text('note'),
  primaryLocation: text('primary_location'), // from SKU if exists
  extraLocation: text('extra_location'), // added when shelf full
  landedCostShare: decimal('landed_cost_share', { precision: 10, scale: 4 }) // per-unit landed cost
});

export const deliveryInstructions = pgTable('delivery_instructions', {
  id: serial('id').primaryKey(),
  purchaseItemId: integer('purchase_item_id').references(() => purchaseItems.id),
  text: text('text').notNull() // simple free text, e.g., "Store upright; keep away from heat."
});

export const parcelScans = pgTable('parcel_scans', {
  id: serial('id').primaryKey(),
  receiptId: integer('receipt_id').references(() => deliveryReceipts.id, { onDelete: 'cascade' }),
  code: text('code').notNull(), // SSCC, carton, SKU barcode, etc.
  kind: text('kind').$type<'PARCEL'|'CARTON'|'SKU'|'OTHER'>().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  byUser: integer('by_user').notNull().references(() => users.id)
});

export const landedCostBatches = pgTable('landed_cost_batches', {
  id: serial('id').primaryKey(),
  receiptId: integer('receipt_id').references(() => deliveryReceipts.id, { onDelete: 'cascade' }),
  method: text('method').$type<'by_weight'|'by_volume'|'by_value'|'by_count'|'mixed_rules'>().notNull(),
  totalCostNative: decimal('total_cost_native', { precision: 18, scale: 4 }).notNull(),
  nativeCurrency: text('native_currency').notNull(), // e.g., CNY
  czkRate: decimal('czk_rate', { precision: 18, scale: 6 }).notNull(), // from your FX service
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow()
});

// Relations for delivery receipts
export const deliveryReceiptsRelations = relations(deliveryReceipts, ({ one, many }) => ({
  importPurchase: one(importPurchases, {
    fields: [deliveryReceipts.importPurchaseId],
    references: [importPurchases.id]
  }),
  employee: one(users, {
    fields: [deliveryReceipts.employeeId],
    references: [users.id]
  }),
  founder: one(users, {
    fields: [deliveryReceipts.founderId],
    references: [users.id]
  }),
  lines: many(deliveryReceiptLines),
  scans: many(parcelScans),
  landedCostBatch: one(landedCostBatches)
}));

export const deliveryReceiptLinesRelations = relations(deliveryReceiptLines, ({ one }) => ({
  receipt: one(deliveryReceipts, {
    fields: [deliveryReceiptLines.receiptId],
    references: [deliveryReceipts.id]
  }),
  purchaseItem: one(purchaseItems, {
    fields: [deliveryReceiptLines.purchaseItemId],
    references: [purchaseItems.id]
  })
}));

// Export schemas for delivery receipts
export const insertDeliveryReceiptSchema = createInsertSchema(deliveryReceipts).omit({ id: true, createdAt: true });
export const insertDeliveryReceiptLineSchema = createInsertSchema(deliveryReceiptLines).omit({ id: true });
export const insertDeliveryInstructionSchema = createInsertSchema(deliveryInstructions).omit({ id: true });
export const insertParcelScanSchema = createInsertSchema(parcelScans).omit({ id: true, createdAt: true });
export const insertLandedCostBatchSchema = createInsertSchema(landedCostBatches).omit({ id: true, createdAt: true });

// Export types for delivery receipts
export type DeliveryReceipt = typeof deliveryReceipts.$inferSelect;
export type InsertDeliveryReceipt = z.infer<typeof insertDeliveryReceiptSchema>;
export type DeliveryReceiptLine = typeof deliveryReceiptLines.$inferSelect;
export type InsertDeliveryReceiptLine = z.infer<typeof insertDeliveryReceiptLineSchema>;
export type DeliveryInstruction = typeof deliveryInstructions.$inferSelect;
export type InsertDeliveryInstruction = z.infer<typeof insertDeliveryInstructionSchema>;
export type ParcelScan = typeof parcelScans.$inferSelect;
export type InsertParcelScan = z.infer<typeof insertParcelScanSchema>;
export type LandedCostBatch = typeof landedCostBatches.$inferSelect;
export type InsertLandedCostBatch = z.infer<typeof insertLandedCostBatchSchema>;