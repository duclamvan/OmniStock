import { pgTable, text, integer, timestamp, decimal, boolean, jsonb, varchar, serial, date, json } from 'drizzle-orm/pg-core';
import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';
import { relations, sql } from 'drizzle-orm';

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
  // New landing cost fields
  hsCode: text('hs_code'),
  dutyRatePercent: decimal('duty_rate_percent', { precision: 5, scale: 2 }),
  unitGrossWeightKg: decimal('unit_gross_weight_kg', { precision: 10, scale: 3 }),
  unitLengthCm: decimal('unit_length_cm', { precision: 10, scale: 2 }),
  unitWidthCm: decimal('unit_width_cm', { precision: 10, scale: 2 }),
  unitHeightCm: decimal('unit_height_cm', { precision: 10, scale: 2 }),
  landingCostUnitBase: decimal('landing_cost_unit_base', { precision: 12, scale: 4 }),
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
  receivingStatus: text('receiving_status'), // null, receiving, pending_approval, completed
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

// Receiving workflow tables
export const receipts = pgTable('receipts', {
  id: serial('id').primaryKey(),
  shipmentId: integer('shipment_id').notNull().references(() => shipments.id),
  consolidationId: integer('consolidation_id').references(() => consolidations.id),
  receivedBy: text('received_by').notNull(), // Employee who received
  receivedAt: timestamp('received_at').notNull().defaultNow(),
  parcelCount: integer('parcel_count').notNull(),
  receivedParcels: integer('received_parcels').notNull().default(0), // Actually received/scanned parcels
  carrier: text('carrier').notNull(),
  trackingNumbers: jsonb('tracking_numbers'), // Array of tracking numbers
  status: text('status').notNull().default('pending_verification'), // pending_verification, verified, pending_approval, approved, rejected
  notes: text('notes'),
  damageNotes: text('damage_notes'),
  photos: jsonb('photos'), // Array of photo URLs
  verifiedBy: text('verified_by'), // Founder who verified
  verifiedAt: timestamp('verified_at'),
  approvedBy: text('approved_by'), // Founder who approved
  approvedAt: timestamp('approved_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
});

export const receiptItems = pgTable('receipt_items', {
  id: serial('id').primaryKey(),
  receiptId: integer('receipt_id').notNull().references(() => receipts.id, { onDelete: 'cascade' }),
  itemId: integer('item_id').notNull(), // References purchaseItems.id or customItems.id
  itemType: text('item_type').notNull(), // 'purchase' or 'custom'
  productId: text('product_id'), // Product ID for linking with products table
  sku: text('sku'), // SKU for the item
  status: text('status').default('ok'), // ok, damaged, partial
  expectedQuantity: integer('expected_quantity').notNull(),
  receivedQuantity: integer('received_quantity').notNull(),
  damagedQuantity: integer('damaged_quantity').default(0),
  missingQuantity: integer('missing_quantity').default(0),
  barcode: text('barcode'),
  warehouseLocation: text('warehouse_location'),
  additionalLocation: text('additional_location'), // If shelves are full
  storageInstructions: text('storage_instructions'),
  condition: text('condition').default('good'), // good, damaged, partial
  notes: text('notes'),
  photos: jsonb('photos'), // Array of photo URLs for damages
  verifiedAt: timestamp('verified_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
});

export const landedCosts = pgTable('landed_costs', {
  id: serial('id').primaryKey(),
  receiptId: integer('receipt_id').notNull().references(() => receipts.id),
  calculationMethod: text('calculation_method').notNull(), // weight, volume, price, average
  baseCost: decimal('base_cost', { precision: 10, scale: 2 }).notNull(),
  shippingCost: decimal('shipping_cost', { precision: 10, scale: 2 }).notNull(),
  customsDuty: decimal('customs_duty', { precision: 10, scale: 2 }).default('0'),
  taxes: decimal('taxes', { precision: 10, scale: 2 }).default('0'),
  handlingFees: decimal('handling_fees', { precision: 10, scale: 2 }).default('0'),
  insuranceCost: decimal('insurance_cost', { precision: 10, scale: 2 }).default('0'),
  totalLandedCost: decimal('total_landed_cost', { precision: 10, scale: 2 }).notNull(),
  currency: text('currency').notNull().default('USD'),
  exchangeRates: jsonb('exchange_rates'), // Store exchange rates at time of calculation
  notes: text('notes'),
  approvedBy: text('approved_by'),
  approvedAt: timestamp('approved_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
});

// Core business entities
export const customers = pgTable('customers', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  name: varchar('name').notNull(),
  facebookName: varchar('facebook_name'),
  facebookId: varchar('facebook_id'),
  email: varchar('email'),
  phone: varchar('phone'),
  address: text('address'),
  city: varchar('city'),
  zipCode: varchar('zip_code'),
  country: varchar('country'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  type: varchar('type').default('regular'),
  state: varchar('state'),
  vatId: varchar('vat_id'),
  taxId: varchar('tax_id'),
  firstOrderDate: timestamp('first_order_date'),
  lastOrderDate: timestamp('last_order_date'),
  totalOrders: integer('total_orders').default(0),
  totalSpent: decimal('total_spent').default('0'),
  averageOrderValue: decimal('average_order_value').default('0'),
  customerRank: varchar('customer_rank'),
  lastContactDate: timestamp('last_contact_date'),
  preferredLanguage: varchar('preferred_language').default('cs')
});

export const suppliers = pgTable('suppliers', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  name: varchar('name').notNull(),
  contactPerson: varchar('contact_person'),
  email: varchar('email'),
  phone: varchar('phone'),
  address: text('address'),
  country: varchar('country'),
  website: varchar('website'),
  supplierLink: text('supplier_link'),
  lastPurchaseDate: timestamp('last_purchase_date'),
  totalPurchased: decimal('total_purchased').default('0'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow()
});

export const warehouses = pgTable('warehouses', {
  id: text('id').primaryKey(), // WH-XX-YY format
  name: text('name').notNull(),
  location: text('location').notNull(),
  address: text('address'),
  city: text('city'),
  country: text('country'),
  zipCode: text('zip_code'),
  phone: text('phone'),
  email: text('email'),
  manager: text('manager'),
  capacity: integer('capacity'),
  type: text('type').default('fulfillment'), // fulfillment, storage, transit
  status: text('status').default('active'), // active, inactive, maintenance
  rentedFromDate: date('rented_from_date'),
  expenseId: integer('expense_id'),
  contact: text('contact'),
  notes: text('notes'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  floorArea: decimal('floor_area', { precision: 10, scale: 2 })
});

export const products = pgTable('products', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  name: varchar('name').notNull(),
  englishName: varchar('english_name'),
  sku: varchar('sku').notNull(),
  categoryId: varchar('category_id'),
  warehouseId: varchar('warehouse_id'),
  supplierId: varchar('supplier_id'),
  description: text('description'),
  quantity: integer('quantity').default(0),
  lowStockAlert: integer('low_stock_alert').default(5),
  priceCzk: decimal('price_czk'),
  priceEur: decimal('price_eur'),
  priceUsd: decimal('price_usd'),
  priceVnd: decimal('price_vnd'),
  priceCny: decimal('price_cny'),
  importCostUsd: decimal('import_cost_usd'),
  importCostCzk: decimal('import_cost_czk'),
  importCostEur: decimal('import_cost_eur'),
  supplierLink: text('supplier_link'),
  imageUrl: varchar('image_url'),
  barcode: varchar('barcode'),
  length: decimal('length'),
  width: decimal('width'),
  height: decimal('height'),
  weight: decimal('weight'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  warehouseLocation: varchar('warehouse_location'),
  shipmentNotes: text('shipment_notes'),
  packingMaterialId: varchar('packing_material_id'),
  // Packing instructions fields
  packingInstructionsText: text('packing_instructions_text'),
  packingInstructionsImage: text('packing_instructions_image'),
  // Latest landing cost tracking
  latestLandingCost: decimal('latest_landing_cost', { precision: 12, scale: 4 })
});

export const orders = pgTable('orders', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  orderId: varchar('order_id').notNull(),
  customerId: varchar('customer_id'),
  billerId: varchar('biller_id'),
  currency: varchar('currency').default('CZK'),
  orderStatus: varchar('order_status').default('pending'),
  paymentStatus: varchar('payment_status').default('pending'),
  priority: varchar('priority').default('medium'),
  subtotal: decimal('subtotal').default('0'),
  discountType: varchar('discount_type'),
  discountValue: decimal('discount_value').default('0'),
  taxRate: decimal('tax_rate').default('0'),
  taxAmount: decimal('tax_amount').default('0'),
  shippingMethod: varchar('shipping_method'),
  paymentMethod: varchar('payment_method'),
  shippingCost: decimal('shipping_cost').default('0'),
  actualShippingCost: decimal('actual_shipping_cost').default('0'),
  grandTotal: decimal('grand_total').notNull(),
  notes: text('notes'),
  attachmentUrl: varchar('attachment_url'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  shippedAt: timestamp('shipped_at'),
  pickStatus: varchar('pick_status').default('not_started'),
  packStatus: varchar('pack_status').default('not_started'),
  pickedBy: varchar('picked_by'),
  packedBy: varchar('packed_by'),
  pickStartTime: timestamp('pick_start_time'),
  pickEndTime: timestamp('pick_end_time'),
  packStartTime: timestamp('pack_start_time'),
  packEndTime: timestamp('pack_end_time'),
  finalWeight: decimal('final_weight'),
  cartonUsed: varchar('carton_used'),
  modifiedAfterPacking: boolean('modified_after_packing').default(false),
  modificationNotes: text('modification_notes'),
  lastModifiedAt: timestamp('last_modified_at'),
  previousPackStatus: varchar('previous_pack_status'),
  selectedDocumentIds: text('selected_document_ids').array() // Array of product_file IDs to print
});

// Product Files table for document management
export const productFiles = pgTable('product_files', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  productId: varchar('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  fileType: varchar('file_type').notNull(), // 'sds', 'cpnp', 'flyer', 'certificate', 'manual', 'other'
  fileName: text('file_name').notNull(),
  filePath: text('file_path').notNull(),
  language: varchar('language').notNull().default('en'), // 'en', 'cs', 'de', 'fr', 'es', 'zh'
  displayName: text('display_name').notNull(),
  uploadedAt: timestamp('uploaded_at').notNull().defaultNow(),
  fileSize: integer('file_size').notNull(),
  mimeType: varchar('mime_type').notNull()
});

export const orderItems = pgTable('order_items', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  orderId: varchar('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
  productId: varchar('product_id').notNull().references(() => products.id),
  quantity: integer('quantity').notNull(),
  unitPrice: decimal('unit_price', { precision: 10, scale: 2 }).notNull(),
  totalPrice: decimal('total_price', { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow()
});

// Product warehouse locations table
export const productLocations = pgTable('product_locations', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  productId: varchar('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  locationType: text('location_type').notNull().default('warehouse'), // display, warehouse, pallet, other
  locationCode: varchar('location_code').notNull(), // WH1-A01-R02-L03 format
  quantity: integer('quantity').notNull().default(0),
  isPrimary: boolean('is_primary').default(false), // main location for this product
  notes: text('notes'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
});

export const discounts = pgTable('discounts', {
  id: serial('id').primaryKey(),
  discountId: text('discount_id').notNull().unique(),
  name: text('name').notNull(),
  type: text('type').notNull(), // percentage, fixed, buy_x_get_y
  percentage: decimal('percentage', { precision: 5, scale: 2 }),
  value: decimal('value', { precision: 10, scale: 2 }),
  minOrderAmount: decimal('min_order_amount', { precision: 10, scale: 2 }),
  status: text('status').default('active'), // active, inactive, expired
  startDate: date('start_date'),
  endDate: date('end_date'),
  applicationScope: text('application_scope').default('order'), // order, product, customer
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
});

export const expenses = pgTable('expenses', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  expenseId: varchar('expense_id').notNull(),
  name: varchar('name').notNull(),
  category: varchar('category'),
  amount: decimal('amount').notNull(),
  currency: varchar('currency').default('CZK'),
  recurring: varchar('recurring'),
  paymentMethod: varchar('payment_method'),
  status: varchar('status').default('pending'),
  date: timestamp('date').notNull(),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

// User activities tracking
export const userActivities = pgTable('user_activities', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull(),
  action: text('action').notNull(), // created, updated, deleted, viewed
  entityType: text('entity_type').notNull(), // order, product, customer, etc.
  entityId: text('entity_id').notNull(),
  description: text('description'),
  createdAt: timestamp('created_at').notNull().defaultNow()
});

// Landing Cost Tracking Tables

// Shipment costs breakdown
export const shipmentCosts = pgTable('shipment_costs', {
  id: serial('id').primaryKey(),
  shipmentId: integer('shipment_id').notNull().references(() => shipments.id, { onDelete: 'cascade' }),
  type: text('type').notNull(), // FREIGHT, BROKERAGE, INSURANCE, PACKAGING, OTHER
  mode: text('mode'), // AIR, SEA, COURIER - optional, for freight only
  volumetricDivisor: integer('volumetric_divisor'), // e.g., 5000, 6000
  amountOriginal: decimal('amount_original', { precision: 12, scale: 4 }).notNull(),
  currency: text('currency').notNull(),
  fxRateUsed: decimal('fx_rate_used', { precision: 12, scale: 6 }),
  amountBase: decimal('amount_base', { precision: 12, scale: 4 }).notNull(), // converted to base currency
  notes: text('notes'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
});

// Shipment cartons tracking
export const shipmentCartons = pgTable('shipment_cartons', {
  id: serial('id').primaryKey(),
  shipmentId: integer('shipment_id').notNull().references(() => shipments.id, { onDelete: 'cascade' }),
  customItemId: integer('custom_item_id').notNull().references(() => customItems.id, { onDelete: 'cascade' }),
  qtyInCarton: integer('qty_in_carton').notNull(),
  lengthCm: decimal('length_cm', { precision: 10, scale: 2 }),
  widthCm: decimal('width_cm', { precision: 10, scale: 2 }),
  heightCm: decimal('height_cm', { precision: 10, scale: 2 }),
  grossWeightKg: decimal('gross_weight_kg', { precision: 10, scale: 3 }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
});

// Cost allocations to items
export const costAllocations = pgTable('cost_allocations', {
  id: serial('id').primaryKey(),
  shipmentId: integer('shipment_id').notNull().references(() => shipments.id, { onDelete: 'cascade' }),
  customItemId: integer('custom_item_id').notNull().references(() => customItems.id, { onDelete: 'cascade' }),
  costType: text('cost_type').notNull(), // FREIGHT, BROKERAGE, INSURANCE, PACKAGING, OTHER, DUTY
  basis: text('basis').notNull(), // CHARGEABLE_WEIGHT, UNITS, VALUE
  amountAllocatedBase: decimal('amount_allocated_base', { precision: 12, scale: 4 }).notNull(),
  detailsJson: jsonb('details_json'), // for audit trail
  createdAt: timestamp('created_at').notNull().defaultNow()
});

// Product cost history tracking
export const productCostHistory = pgTable('product_cost_history', {
  id: serial('id').primaryKey(),
  productId: varchar('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  customItemId: integer('custom_item_id').references(() => customItems.id),
  landingCostUnitBase: decimal('landing_cost_unit_base', { precision: 12, scale: 4 }).notNull(),
  method: text('method').notNull(), // e.g., "weighted_average", "fifo"
  computedAt: timestamp('computed_at').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow()
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

export const purchaseItemsRelations = relations(purchaseItems, ({ one, many }) => ({
  purchase: one(importPurchases, {
    fields: [purchaseItems.purchaseId],
    references: [importPurchases.id]
  }),
  consolidation: one(consolidations, {
    fields: [purchaseItems.consolidationId],
    references: [consolidations.id]
  }),
  cartons: many(shipmentCartons),
  costAllocations: many(costAllocations)
}));

export const consolidationsRelations = relations(consolidations, ({ many }) => ({
  purchaseItems: many(purchaseItems),
  customItems: many(customItems),
  shipments: many(shipments)
}));

export const shipmentsRelations = relations(shipments, ({ many, one }) => ({
  consolidation: one(consolidations, {
    fields: [shipments.consolidationId],
    references: [consolidations.id]
  }),
  deliveryHistory: many(deliveryHistory),
  receipts: many(receipts),
  costs: many(shipmentCosts),
  cartons: many(shipmentCartons),
  costAllocations: many(costAllocations)
}));

export const receiptsRelations = relations(receipts, ({ one, many }) => ({
  shipment: one(shipments, {
    fields: [receipts.shipmentId],
    references: [shipments.id]
  }),
  consolidation: one(consolidations, {
    fields: [receipts.consolidationId],
    references: [consolidations.id]
  }),
  items: many(receiptItems),
  landedCost: one(landedCosts)
}));

export const receiptItemsRelations = relations(receiptItems, ({ one }) => ({
  receipt: one(receipts, {
    fields: [receiptItems.receiptId],
    references: [receipts.id]
  })
}));

export const landedCostsRelations = relations(landedCosts, ({ one }) => ({
  receipt: one(receipts, {
    fields: [landedCosts.receiptId],
    references: [receipts.id]
  })
}));

// Core business relations
export const customersRelations = relations(customers, ({ many }) => ({
  orders: many(orders)
}));

export const suppliersRelations = relations(suppliers, ({ many }) => ({
  products: many(products)
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  category: one(categories, {
    fields: [products.categoryId],
    references: [categories.id]
  }),
  supplier: one(suppliers, {
    fields: [products.supplierId],
    references: [suppliers.id]
  }),
  warehouse: one(warehouses, {
    fields: [products.warehouseId],
    references: [warehouses.id]
  }),
  orderItems: many(orderItems),
  locations: many(productLocations),
  costHistory: many(productCostHistory)
}));

export const productLocationsRelations = relations(productLocations, ({ one }) => ({
  product: one(products, {
    fields: [productLocations.productId],
    references: [products.id]
  })
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  customer: one(customers, {
    fields: [orders.customerId],
    references: [customers.id]
  }),
  orderItems: many(orderItems)
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id]
  }),
  product: one(products, {
    fields: [orderItems.productId],
    references: [products.id]
  })
}));

export const warehousesRelations = relations(warehouses, ({ many }) => ({
  products: many(products)
}));

export const categoriesRelations = relations(categories, ({ many }) => ({
  products: many(products)
}));

// Landing Cost Tracking Relations
export const shipmentCostsRelations = relations(shipmentCosts, ({ one }) => ({
  shipment: one(shipments, {
    fields: [shipmentCosts.shipmentId],
    references: [shipments.id]
  })
}));

export const shipmentCartonsRelations = relations(shipmentCartons, ({ one }) => ({
  shipment: one(shipments, {
    fields: [shipmentCartons.shipmentId],
    references: [shipments.id]
  }),
  customItem: one(customItems, {
    fields: [shipmentCartons.customItemId],
    references: [customItems.id]
  })
}));

export const costAllocationsRelations = relations(costAllocations, ({ one }) => ({
  shipment: one(shipments, {
    fields: [costAllocations.shipmentId],
    references: [shipments.id]
  }),
  customItem: one(customItems, {
    fields: [costAllocations.customItemId],
    references: [customItems.id]
  })
}));

export const productCostHistoryRelations = relations(productCostHistory, ({ one }) => ({
  product: one(products, {
    fields: [productCostHistory.productId],
    references: [products.id]
  }),
  customItem: one(customItems, {
    fields: [productCostHistory.customItemId],
    references: [customItems.id]
  })
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
export const insertReceiptSchema = createInsertSchema(receipts).omit({ id: true, createdAt: true, updatedAt: true });
export const insertReceiptItemSchema = createInsertSchema(receiptItems).omit({ id: true, createdAt: true, updatedAt: true });
export const insertLandedCostSchema = createInsertSchema(landedCosts).omit({ id: true, createdAt: true, updatedAt: true });

// Core business schemas
export const insertCustomerSchema = createInsertSchema(customers).omit({ id: true, createdAt: true, updatedAt: true });
export const insertSupplierSchema = createInsertSchema(suppliers).omit({ id: true, createdAt: true, updatedAt: true });
export const insertWarehouseSchema = createInsertSchema(warehouses).omit({ createdAt: true });
export const insertProductSchema = createInsertSchema(products).omit({ id: true, createdAt: true, updatedAt: true });
export const insertProductFileSchema = createInsertSchema(productFiles).omit({ id: true, uploadedAt: true });
export const insertOrderSchema = createInsertSchema(orders).omit({ id: true, createdAt: true });
export const insertOrderItemSchema = createInsertSchema(orderItems).omit({ id: true, createdAt: true });
export const insertProductLocationSchema = createInsertSchema(productLocations)
  .omit({ id: true, createdAt: true, updatedAt: true })
  .extend({
    locationCode: z.string().regex(/^WH\d+-[A-Z]\d{2}-R\d{2}-L\d{2}$/, {
      message: 'Location code must be in format: WH1-A01-R02-L03'
    }),
    locationType: z.enum(['display', 'warehouse', 'pallet', 'other']),
    quantity: z.number().int().min(0, 'Quantity must be non-negative')
  });
export const insertDiscountSchema = createInsertSchema(discounts).omit({ id: true, createdAt: true, updatedAt: true });
export const insertExpenseSchema = createInsertSchema(expenses).omit({ id: true, createdAt: true, updatedAt: true });
export const insertUserActivitySchema = createInsertSchema(userActivities).omit({ id: true, createdAt: true });

// Landing Cost Tracking Schemas
export const insertShipmentCostSchema = createInsertSchema(shipmentCosts).omit({ id: true, createdAt: true, updatedAt: true });
export const insertShipmentCartonSchema = createInsertSchema(shipmentCartons).omit({ id: true, createdAt: true, updatedAt: true });
export const insertCostAllocationSchema = createInsertSchema(costAllocations).omit({ id: true, createdAt: true });
export const insertProductCostHistorySchema = createInsertSchema(productCostHistory).omit({ id: true, createdAt: true });

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
export type Receipt = typeof receipts.$inferSelect;
export type InsertReceipt = z.infer<typeof insertReceiptSchema>;
export type ReceiptItem = typeof receiptItems.$inferSelect;
export type InsertReceiptItem = z.infer<typeof insertReceiptItemSchema>;
export type LandedCost = typeof landedCosts.$inferSelect;
export type InsertLandedCost = z.infer<typeof insertLandedCostSchema>;

// Core business types
export type Customer = typeof customers.$inferSelect;
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;
export type Supplier = typeof suppliers.$inferSelect;
export type InsertSupplier = z.infer<typeof insertSupplierSchema>;
export type Warehouse = typeof warehouses.$inferSelect;
export type InsertWarehouse = z.infer<typeof insertWarehouseSchema>;
export type Product = typeof products.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type ProductFile = typeof productFiles.$inferSelect;
export type InsertProductFile = z.infer<typeof insertProductFileSchema>;
export type Order = typeof orders.$inferSelect;
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type OrderItem = typeof orderItems.$inferSelect;
export type InsertOrderItem = z.infer<typeof insertOrderItemSchema>;
export type ProductLocation = typeof productLocations.$inferSelect;
export type InsertProductLocation = z.infer<typeof insertProductLocationSchema>;
export type Discount = typeof discounts.$inferSelect;
export type InsertDiscount = z.infer<typeof insertDiscountSchema>;
export type Expense = typeof expenses.$inferSelect;
export type InsertExpense = z.infer<typeof insertExpenseSchema>;
export type UserActivity = typeof userActivities.$inferSelect;
export type InsertUserActivity = z.infer<typeof insertUserActivitySchema>;

// Landing Cost Tracking Types
export type ShipmentCost = typeof shipmentCosts.$inferSelect;
export type InsertShipmentCost = z.infer<typeof insertShipmentCostSchema>;
export type ShipmentCarton = typeof shipmentCartons.$inferSelect;
export type InsertShipmentCarton = z.infer<typeof insertShipmentCartonSchema>;
export type CostAllocation = typeof costAllocations.$inferSelect;
export type InsertCostAllocation = z.infer<typeof insertCostAllocationSchema>;
export type ProductCostHistory = typeof productCostHistory.$inferSelect;
export type InsertProductCostHistory = z.infer<typeof insertProductCostHistorySchema>;