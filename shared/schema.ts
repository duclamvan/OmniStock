import { pgTable, text, integer, timestamp, decimal, boolean, jsonb, varchar, serial, date, json, unique } from 'drizzle-orm/pg-core';
import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';
import { relations, sql } from 'drizzle-orm';

// Users table
export const users = pgTable('users', {
  id: varchar('id').primaryKey(),
  replitSub: varchar('replit_sub'), // Optional - only for Replit auth users
  email: varchar('email'),
  firstName: varchar('first_name'),
  lastName: varchar('last_name'),
  profileImageUrl: varchar('profile_image_url'),
  role: varchar('role'), // 'administrator' or 'warehouse_operator' - nullable for pending users
  // Authentication provider
  authProvider: varchar('auth_provider').notNull().default('replit'), // 'replit' | 'sms' | 'email'
  // Two-Factor Authentication fields
  phoneNumber: varchar('phone_number').unique(), // E.164 format: +420123456789
  phoneVerifiedAt: timestamp('phone_verified_at'), // When phone was verified
  twoFactorEnabled: boolean('two_factor_enabled').notNull().default(false),
  twoFactorVerified: boolean('two_factor_verified').notNull().default(false), // Track if they completed 2FA this session
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
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
  shippingCurrency: text('shipping_currency').default('USD'),
  consolidation: text('consolidation').default('No'), // Yes or No
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
  processingTimeDays: integer('processing_time_days'),
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
  endTrackingNumber: text('end_tracking_number'), // Legacy single tracking number (kept for backward compatibility)
  endTrackingNumbers: text('end_tracking_numbers').array(), // New array to support multiple tracking numbers
  shipmentName: text('shipment_name'),
  shipmentType: text('shipment_type'),
  origin: text('origin').notNull(),
  destination: text('destination').notNull(),
  status: text('status').notNull().default('pending'), // pending, in transit, delivered
  receivingStatus: text('receiving_status'), // null, receiving, pending_approval, completed, archived
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
  facebookUrl: varchar('facebook_url'),
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
  vatId: varchar('vat_id'),
  taxId: varchar('tax_id'),
  firstOrderDate: timestamp('first_order_date'),
  lastOrderDate: timestamp('last_order_date'),
  totalOrders: integer('total_orders').default(0),
  totalSpent: decimal('total_spent').default('0'),
  averageOrderValue: decimal('average_order_value').default('0'),
  customerRank: varchar('customer_rank'),
  lastContactDate: timestamp('last_contact_date'),
  preferredLanguage: varchar('preferred_language').default('cs'),
  preferredCurrency: varchar('preferred_currency').default('EUR'), // CZK or EUR for B2B
  
  // Billing address fields
  billingFirstName: varchar('billing_first_name'),
  billingLastName: varchar('billing_last_name'),
  billingCompany: varchar('billing_company'),
  billingEmail: varchar('billing_email'),
  billingTel: varchar('billing_tel'),
  billingStreet: varchar('billing_street'),
  billingStreetNumber: varchar('billing_street_number'),
  billingCity: varchar('billing_city'),
  billingZipCode: varchar('billing_zip_code'),
  billingCountry: varchar('billing_country'),
  
  // Tax information fields
  ico: varchar('ico'), // Czech company ID
  dic: varchar('dic'), // Czech tax ID (auto-filled from ARES)
  vatNumber: varchar('vat_number'), // EU VAT number
  vatValid: boolean('vat_valid'), // VAT validation status
  vatCheckedAt: timestamp('vat_checked_at'), // Last VAT validation check
  vatCompanyName: varchar('vat_company_name'), // Company name from VAT validation
  vatCompanyAddress: text('vat_company_address'), // Company address from VAT validation
  profilePictureUrl: varchar('profile_picture_url'), // Local path to downloaded Facebook profile picture
});

// Customer shipping addresses (multiple per customer)
export const customerShippingAddresses = pgTable('customer_shipping_addresses', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  customerId: varchar('customer_id').notNull().references(() => customers.id, { onDelete: 'cascade' }),
  firstName: varchar('first_name').notNull(),
  lastName: varchar('last_name').notNull(),
  company: varchar('company'),
  email: varchar('email'),
  tel: varchar('tel'),
  street: varchar('street').notNull(),
  streetNumber: varchar('street_number'),
  city: varchar('city').notNull(),
  zipCode: varchar('zip_code').notNull(),
  country: varchar('country').notNull(),
  isPrimary: boolean('is_primary').default(false), // Mark one as default
  label: varchar('label'), // e.g., "Home", "Office", "Warehouse"
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Customer billing addresses (multiple per customer)
export const customerBillingAddresses = pgTable('customer_billing_addresses', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  customerId: varchar('customer_id').notNull().references(() => customers.id, { onDelete: 'cascade' }),
  firstName: varchar('first_name'),
  lastName: varchar('last_name'),
  company: varchar('company'),
  email: varchar('email'),
  tel: varchar('tel'),
  street: varchar('street'),
  streetNumber: varchar('street_number'),
  city: varchar('city'),
  zipCode: varchar('zip_code'),
  country: varchar('country'),
  vatId: varchar('vat_id'), // VAT ID for all countries
  ico: varchar('ico'), // IČO for Czech Republic only
  isPrimary: boolean('is_primary').default(false), // Mark one as default
  label: varchar('label'), // e.g., "Main Office", "Secondary Office", "Accounting"
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const customerBadges = pgTable('customer_badges', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  customerId: varchar('customer_id').notNull().references(() => customers.id, { onDelete: 'cascade' }),
  orderId: varchar('order_id').references(() => orders.id, { onDelete: 'cascade' }),
  badgeType: varchar('badge_type').notNull(),
  scope: varchar('scope').notNull().default('customer'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  uniqueBadge: unique().on(table.customerId, table.badgeType, table.scope, table.orderId),
}));

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
  floorArea: decimal('floor_area', { precision: 10, scale: 2 }),
  // Warehouse map configuration
  totalAisles: integer('total_aisles').default(6),
  maxRacks: integer('max_racks').default(10),
  maxLevels: integer('max_levels').default(5),
  maxBins: integer('max_bins').default(5),
  // Per-aisle configuration: { "A01": { maxRacks: 10, maxLevels: 4, maxBins: 5 }, ... }
  aisleConfigs: jsonb('aisle_configs')
});

export const warehouseFiles = pgTable('warehouse_files', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  warehouseId: text('warehouse_id').notNull().references(() => warehouses.id, { onDelete: 'cascade' }),
  fileName: text('file_name').notNull(),
  fileType: text('file_type').notNull(),
  fileUrl: text('file_url').notNull(),
  fileSize: integer('file_size').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow()
});

export const warehouseFinancialContracts = pgTable('warehouse_financial_contracts', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  warehouseId: text('warehouse_id').notNull().references(() => warehouses.id, { onDelete: 'cascade' }),
  contractName: text('contract_name').notNull(),
  contractType: text('contract_type').notNull().default('rental'),
  price: decimal('price', { precision: 10, scale: 2 }).notNull().default('0'),
  currency: text('currency').notNull().default('CZK'),
  billingPeriod: text('billing_period').notNull().default('monthly'),
  customBillingDays: integer('custom_billing_days'),
  rentalDueDate: date('rental_due_date'),
  startDate: date('start_date'),
  endDate: date('end_date'),
  status: text('status').default('active'),
  notes: text('notes'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
});

export const warehouseLayouts = pgTable('warehouse_layouts', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  warehouseId: text('warehouse_id').notNull().references(() => warehouses.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  width: decimal('width', { precision: 10, scale: 2 }).notNull(),
  length: decimal('length', { precision: 10, scale: 2 }).notNull(),
  coordinateSystem: text('coordinate_system').notNull().default('grid'),
  generatedAt: timestamp('generated_at').notNull().defaultNow(),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
});

export const layoutBins = pgTable('layout_bins', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  layoutId: varchar('layout_id').notNull().references(() => warehouseLayouts.id, { onDelete: 'cascade' }),
  code: text('code').notNull(),
  row: text('row').notNull(),
  column: integer('column').notNull(),
  x: decimal('x', { precision: 10, scale: 2 }).notNull(),
  y: decimal('y', { precision: 10, scale: 2 }).notNull(),
  width: decimal('width', { precision: 10, scale: 2 }).notNull(),
  height: decimal('height', { precision: 10, scale: 2 }).notNull(),
  capacity: integer('capacity').notNull().default(100),
  type: text('type').notNull().default('standard'),
  status: text('status').notNull().default('active'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
});

export const products = pgTable('products', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  name: varchar('name').notNull(),
  vietnameseName: varchar('vietnamese_name'),
  sku: varchar('sku').notNull(),
  categoryId: varchar('category_id'),
  warehouseId: varchar('warehouse_id'),
  supplierId: varchar('supplier_id').references(() => suppliers.id),
  description: text('description'),
  quantity: integer('quantity').default(0),
  lowStockAlert: integer('low_stock_alert').default(5),
  reorderRate: integer('reorder_rate'),
  priceCzk: decimal('price_czk'),
  priceEur: decimal('price_eur'),
  priceUsd: decimal('price_usd'),
  priceVnd: decimal('price_vnd'),
  priceCny: decimal('price_cny'),
  importCostUsd: decimal('import_cost_usd'),
  importCostCzk: decimal('import_cost_czk'),
  importCostEur: decimal('import_cost_eur'),
  imageUrl: varchar('image_url'),
  images: jsonb('images'), // Array of {url: string, purpose: string, isPrimary: boolean}
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
  packingMaterials: jsonb('packing_materials'),
  // Packing instructions fields
  packingInstructionsText: text('packing_instructions_text'),
  packingInstructionsImage: text('packing_instructions_image'),
  packingInstructionsImages: jsonb('packing_instructions_images'),
  packingInstructionsTexts: jsonb('packing_instructions_texts'),
  // Latest landing cost tracking
  latestLandingCost: decimal('latest_landing_cost', { precision: 12, scale: 4 }),
  // AI-powered packing dimensions and weight
  unitWeightKg: decimal('unit_weight_kg', { precision: 10, scale: 3 }),
  unitLengthCm: decimal('unit_length_cm', { precision: 10, scale: 2 }),
  unitWidthCm: decimal('unit_width_cm', { precision: 10, scale: 2 }),
  unitHeightCm: decimal('unit_height_cm', { precision: 10, scale: 2 }),
  // Packaging requirement for intelligent carton packing
  packagingRequirement: text('packaging_requirement').default('carton') // 'carton', 'outer_carton', 'nylon_wrap'
});

// AI Location Suggestions table - stores one AI-generated warehouse location suggestion per product
export const aiLocationSuggestions = pgTable('ai_location_suggestions', {
  id: serial('id').primaryKey(),
  productId: varchar('product_id').references(() => products.id, { onDelete: 'cascade' }).unique(), // One suggestion per product
  customItemId: integer('custom_item_id').references(() => purchaseItems.id, { onDelete: 'cascade' }).unique(), // For items without product IDs
  locationCode: text('location_code').notNull(), // e.g., "WH1-A01-R01-L01-B1"
  zone: text('zone').notNull(), // e.g., "Shelves A", "Pallets B", "Office C"
  accessibilityLevel: text('accessibility_level').notNull(), // "High", "Medium", "Low"
  reasoning: text('reasoning').notNull(), // AI explanation for why this location was chosen
  metadata: jsonb('metadata'), // Optional additional data (sales frequency, turnover rate, etc.)
  generatedAt: timestamp('generated_at').notNull().defaultNow(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
});

// Product Variants table
export const productVariants = pgTable('product_variants', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  productId: varchar('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  name: varchar('name').notNull(),
  barcode: varchar('barcode'),
  quantity: integer('quantity').default(0),
  importCostUsd: decimal('import_cost_usd', { precision: 10, scale: 2 }),
  importCostCzk: decimal('import_cost_czk', { precision: 10, scale: 2 }),
  importCostEur: decimal('import_cost_eur', { precision: 10, scale: 2 }),
  imageUrl: varchar('image_url'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

// Product tiered pricing table
export const productTieredPricing = pgTable('product_tiered_pricing', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  productId: varchar('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  minQuantity: integer('min_quantity').notNull(),
  maxQuantity: integer('max_quantity'),
  priceCzk: decimal('price_czk', { precision: 10, scale: 2 }),
  priceEur: decimal('price_eur', { precision: 10, scale: 2 }),
  priceUsd: decimal('price_usd', { precision: 10, scale: 2 }),
  priceVnd: decimal('price_vnd', { precision: 10, scale: 2 }),
  priceCny: decimal('price_cny', { precision: 10, scale: 2 }),
  priceType: varchar('price_type').notNull().default('tiered'), // 'tiered' or 'wholesale'
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

// Product Bundles table
export const productBundles = pgTable('product_bundles', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  bundleId: varchar('bundle_id').notNull().unique(),
  name: varchar('name').notNull(),
  description: text('description'),
  sku: varchar('sku'),
  priceCzk: decimal('price_czk', { precision: 10, scale: 2 }),
  priceEur: decimal('price_eur', { precision: 10, scale: 2 }),
  discountPercentage: decimal('discount_percentage', { precision: 5, scale: 2 }).default('0'),
  notes: text('notes'),
  imageUrl: varchar('image_url'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

// Bundle Items table (junction table for bundles and products)
export const bundleItems = pgTable('bundle_items', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  bundleId: varchar('bundle_id').notNull().references(() => productBundles.id, { onDelete: 'cascade' }),
  productId: varchar('product_id').references(() => products.id, { onDelete: 'cascade' }),
  variantId: varchar('variant_id'), // Optional - can be null if no variant selected
  quantity: integer('quantity').notNull().default(1),
  productName: varchar('product_name'),
  variantName: varchar('variant_name'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow()
});

// Daily sequences table for order ID generation
export const dailySequences = pgTable('daily_sequences', {
  id: serial('id').primaryKey(),
  orderType: varchar('order_type').notNull(), // 'pos', 'ord', 'web', 'tel'
  date: date('date').notNull(), // Date in YYYY-MM-DD format
  currentSequence: integer('current_sequence').notNull(), // Current sequence number
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
});

export const orders = pgTable('orders', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  orderId: varchar('order_id').notNull(),
  customerId: varchar('customer_id'),
  shippingAddressId: varchar('shipping_address_id').references(() => customerShippingAddresses.id),
  billerId: varchar('biller_id').references(() => users.id),
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
  adjustment: decimal('adjustment').default('0'),
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
  selectedDocumentIds: text('selected_document_ids').array(), // Array of product_file IDs to print
  trackingNumber: text('tracking_number'),
  orderType: varchar('order_type').notNull().default('ord'), // 'pos', 'ord', 'web', 'tel'
  includedDocuments: jsonb('included_documents'), // {invoicePrint: boolean, custom: boolean, fileIds: string[], uploadedFiles: {name: string, url: string}[]}
  // Fulfillment stage tracking (Option 1: Separate sub-status field)
  fulfillmentStage: varchar('fulfillment_stage'), // null (pending), 'picking', 'packing', 'ready'
  pickingStartedAt: timestamp('picking_started_at'),
  packingStartedAt: timestamp('packing_started_at'),
  // PPL shipping integration
  pplBatchId: text('ppl_batch_id'),
  pplShipmentNumbers: text('ppl_shipment_numbers').array(), // Array of PPL shipment tracking numbers
  pplLabelData: jsonb('ppl_label_data'), // Stores label info: {batchId, shipmentNumbers, labelUrl, createdAt}
  pplStatus: varchar('ppl_status'), // 'pending', 'created', 'cancelled', 'error'
  // COD (Cash on Delivery) fields
  codAmount: decimal('cod_amount', { precision: 10, scale: 2 }),
  codCurrency: varchar('cod_currency')
});

// Product Files table for document management
export const productFiles = pgTable('product_files', {
  id: text('id').primaryKey(),
  productId: text('product_id').references(() => products.id, { onDelete: 'cascade' }),
  fileName: text('file_name').notNull(),
  fileType: text('file_type').notNull(), // 'sds', 'cpnp', 'flyer', 'certificate', 'manual', 'other'
  fileUrl: text('file_url').notNull(),
  fileSize: integer('file_size'),
  mimeType: text('mime_type'),
  description: text('description'),
  language: text('language'), // 'en', 'cs', 'de', 'fr', 'es', 'zh', 'vn'
  uploadedBy: text('uploaded_by'),
  uploadedAt: timestamp('uploaded_at').notNull(),
  isActive: boolean('is_active'),
  tags: text('tags').array()
});

// Order Files table for uploaded order documents
export const orderFiles = pgTable('order_files', {
  id: text('id').primaryKey(),
  orderId: text('order_id').references(() => orders.id, { onDelete: 'cascade' }),
  fileName: text('file_name').notNull(),
  fileUrl: text('file_url').notNull(),
  fileSize: integer('file_size'),
  mimeType: text('mime_type'),
  uploadedBy: text('uploaded_by'),
  uploadedAt: timestamp('uploaded_at').notNull(),
  isActive: boolean('is_active').default(true)
});

export const orderItems = pgTable('order_items', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  orderId: varchar('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
  productId: varchar('product_id').references(() => products.id),
  serviceId: varchar('service_id').references(() => services.id),
  bundleId: varchar('bundle_id').references(() => productBundles.id),
  productName: varchar('product_name'),
  sku: varchar('sku'),
  quantity: integer('quantity').notNull(),
  price: decimal('price', { precision: 10, scale: 2 }),
  discount: decimal('discount', { precision: 10, scale: 2 }),
  tax: decimal('tax', { precision: 10, scale: 2 }),
  total: decimal('total', { precision: 10, scale: 2 }),
  variantId: varchar('variant_id'),
  unitPrice: decimal('unit_price', { precision: 10, scale: 2 }),
  appliedPrice: decimal('applied_price', { precision: 10, scale: 2 }),
  currency: varchar('currency'),
  customerPriceId: varchar('customer_price_id'),
  pickedQuantity: integer('picked_quantity'),
  packedQuantity: integer('packed_quantity'),
  warehouseLocation: varchar('warehouse_location'),
  barcode: varchar('barcode'),
  image: varchar('image'),
  pickStartTime: timestamp('pick_start_time'),
  pickEndTime: timestamp('pick_end_time'),
  packStartTime: timestamp('pack_start_time'),
  packEndTime: timestamp('pack_end_time'),
  notes: text('notes'),
  landingCost: decimal('landing_cost', { precision: 10, scale: 4 }),
  variantName: varchar('variant_name')
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

// Stock adjustment requests table - for warehouse staff to request inventory changes
export const stockAdjustmentRequests = pgTable('stock_adjustment_requests', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  productId: varchar('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  locationId: varchar('location_id').notNull().references(() => productLocations.id, { onDelete: 'cascade' }),
  requestedBy: varchar('requested_by').notNull().references(() => users.id),
  adjustmentType: text('adjustment_type').notNull(), // 'add', 'remove', 'set'
  currentQuantity: integer('current_quantity').notNull(), // snapshot at time of request
  requestedQuantity: integer('requested_quantity').notNull(), // the new quantity value
  reason: text('reason').notNull(),
  status: text('status').notNull().default('pending'), // 'pending', 'approved', 'rejected'
  approvedBy: varchar('approved_by').references(() => users.id),
  approvedAt: timestamp('approved_at'),
  rejectionReason: text('rejection_reason'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
});

// AI-powered carton packing tables
export const packingCartons = pgTable('packing_cartons', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  name: varchar('name').notNull(),
  innerLengthCm: decimal('inner_length_cm', { precision: 10, scale: 2 }).notNull(),
  innerWidthCm: decimal('inner_width_cm', { precision: 10, scale: 2 }).notNull(),
  innerHeightCm: decimal('inner_height_cm', { precision: 10, scale: 2 }).notNull(),
  maxWeightKg: decimal('max_weight_kg', { precision: 10, scale: 2 }).notNull(),
  tareWeightKg: decimal('tare_weight_kg', { precision: 10, scale: 2 }).notNull(),
  carrierCode: varchar('carrier_code'),
  costCurrency: varchar('cost_currency'),
  costAmount: decimal('cost_amount', { precision: 10, scale: 2 }),
  usageCount: integer('usage_count').notNull().default(0),
  lastUsedAt: timestamp('last_used_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
});

export const orderCartonPlans = pgTable('order_carton_plans', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  orderId: varchar('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
  totalCartons: integer('total_cartons').notNull(),
  totalWeightKg: decimal('total_weight_kg', { precision: 10, scale: 2 }).notNull(),
  avgUtilization: decimal('avg_utilization', { precision: 5, scale: 2 }),
  suggestions: jsonb('suggestions'),
  totalShippingCost: decimal('total_shipping_cost', { precision: 10, scale: 2 }),
  shippingCurrency: varchar('shipping_currency'),
  aiConfidenceScore: decimal('ai_confidence_score', { precision: 3, scale: 2 }),
  status: varchar('status').notNull().default('draft'),
  checksum: varchar('checksum'), // Stable JSON hash for efficient change detection
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
});

export const orderCartonItems = pgTable('order_carton_items', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  planId: varchar('plan_id').notNull().references(() => orderCartonPlans.id, { onDelete: 'cascade' }),
  cartonNumber: integer('carton_number').notNull(),
  cartonId: varchar('carton_id').references(() => packingCartons.id),
  orderItemId: varchar('order_item_id').references(() => orderItems.id),
  productId: varchar('product_id').references(() => products.id),
  quantity: integer('quantity').notNull(),
  itemWeightKg: decimal('item_weight_kg', { precision: 10, scale: 2 }).notNull(),
  aiEstimated: boolean('ai_estimated').default(false),
  createdAt: timestamp('created_at').notNull().defaultNow()
});

// Actual cartons used during packing (for multi-carton orders)
export const orderCartons = pgTable('order_cartons', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  orderId: varchar('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
  cartonNumber: integer('carton_number').notNull(), // 1, 2, 3, etc. for tracking order
  cartonType: varchar('carton_type').notNull(), // 'company' or 'non-company'
  cartonId: varchar('carton_id').references(() => packingCartons.id), // null if non-company
  weight: decimal('weight', { precision: 10, scale: 3 }), // in kg (total weight including carton)
  payloadWeightKg: decimal('payload_weight_kg', { precision: 10, scale: 3 }), // weight of items only (without carton)
  innerLengthCm: decimal('inner_length_cm', { precision: 10, scale: 2 }), // dimensions of the carton used
  innerWidthCm: decimal('inner_width_cm', { precision: 10, scale: 2 }),
  innerHeightCm: decimal('inner_height_cm', { precision: 10, scale: 2 }),
  labelUrl: text('label_url'),
  labelPrinted: boolean('label_printed').default(false),
  trackingNumber: text('tracking_number'),
  aiWeightCalculation: jsonb('ai_weight_calculation'), // Store AI calculation result
  aiPlanId: varchar('ai_plan_id').references(() => orderCartonPlans.id), // Reference to AI plan that created this
  source: varchar('source').default('manual'), // 'ai' or 'manual'
  itemAllocations: jsonb('item_allocations'), // Which items are in this carton: {orderItemId, quantity, weightKg}[]
  volumeUtilization: decimal('volume_utilization', { precision: 5, scale: 2 }), // Volume utilization percentage (0-100)
  notes: text('notes'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
});

// Shipment Labels - Track all shipping labels (PPL, GLS, DHL, etc.)
export const shipmentLabels = pgTable('shipment_labels', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  orderId: varchar('order_id').references(() => orders.id, { onDelete: 'set null' }), // Allow null if order deleted
  carrier: varchar('carrier').notNull(), // PPL, GLS, DHL, etc.
  trackingNumbers: text('tracking_numbers').array(), // Array of tracking numbers
  batchId: varchar('batch_id'), // External batch ID from carrier API
  labelData: jsonb('label_data'), // Complete label data from carrier
  labelBase64: text('label_base64'), // PDF label in base64 format
  shipmentCount: integer('shipment_count').default(1), // Number of shipments/cartons
  status: varchar('status').notNull().default('active'), // active, cancelled
  cancelledAt: timestamp('cancelled_at'),
  cancelReason: text('cancel_reason'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
});

// Packing Materials for warehouse management
export const packingMaterials = pgTable('packing_materials', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  name: text('name').notNull(),
  code: varchar('code').notNull().unique(),
  category: varchar('category').notNull(), // cartons, filling, pallets, protective, tools, supplies
  type: varchar('type').notNull(),
  size: varchar('size'),
  dimensions: text('dimensions'),
  weight: text('weight'),
  stockQuantity: integer('stock_quantity').notNull().default(0),
  minStockLevel: integer('min_stock_level').notNull().default(10),
  cost: text('cost'),
  currency: varchar('currency').default('EUR'),
  supplier: text('supplier'),
  imageUrl: text('image_url'),
  description: text('description'),
  isFragile: boolean('is_fragile').default(false),
  isReusable: boolean('is_reusable').default(false),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
});

export const packingMaterialUsage = pgTable('packing_material_usage', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  orderId: varchar('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
  materialId: varchar('material_id').notNull().references(() => packingMaterials.id, { onDelete: 'cascade' }),
  quantity: integer('quantity').notNull(),
  notes: text('notes'),
  createdAt: timestamp('created_at').notNull().defaultNow()
});

// Packing Material Suppliers
export const pmSuppliers = pgTable('pm_suppliers', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  name: text('name').notNull().unique(),
  contactPerson: text('contact_person'),
  email: text('email'),
  phone: text('phone'),
  address: text('address'),
  website: text('website'),
  notes: text('notes'),
  isActive: boolean('is_active').default(true),
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
  paymentMethod: varchar('payment_method'),
  status: varchar('status').default('pending'),
  date: timestamp('date').notNull(),
  description: text('description'),
  notes: text('notes'),
  // Recurring expense fields
  isRecurring: boolean('is_recurring').default(false),
  recurringType: varchar('recurring_type'), // 'weekly', 'monthly', 'yearly'
  recurringInterval: integer('recurring_interval').default(1), // every X weeks/months/years
  recurringDayOfWeek: integer('recurring_day_of_week'), // 0-6 for weekly
  recurringDayOfMonth: integer('recurring_day_of_month'), // 1-31 for monthly
  recurringMonth: integer('recurring_month'), // 1-12 for yearly
  recurringDay: integer('recurring_day'), // 1-31 for yearly
  recurringStartDate: timestamp('recurring_start_date'),
  recurringEndDate: timestamp('recurring_end_date'),
  parentExpenseId: varchar('parent_expense_id'), // Reference to original expense if this is auto-generated
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

// Services table for service management (repairs, etc.)
export const services = pgTable('services', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  customerId: varchar('customer_id').references(() => customers.id),
  orderId: varchar('order_id').references(() => orders.id),
  name: varchar('name').notNull(),
  description: text('description'),
  serviceDate: date('service_date'),
  serviceCost: decimal('service_cost', { precision: 10, scale: 2 }).default('0'),
  partsCost: decimal('parts_cost', { precision: 10, scale: 2 }).default('0'),
  totalCost: decimal('total_cost', { precision: 10, scale: 2 }).default('0'),
  currency: varchar('currency').default('EUR'),
  status: varchar('status').notNull().default('pending'),
  notes: text('notes'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
});

// Service Items table for tracking parts used in services
export const serviceItems = pgTable('service_items', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  serviceId: varchar('service_id').notNull().references(() => services.id, { onDelete: 'cascade' }),
  productId: varchar('product_id').notNull().references(() => products.id),
  productName: varchar('product_name').notNull(),
  sku: varchar('sku'),
  quantity: integer('quantity').notNull(),
  unitPrice: decimal('unit_price', { precision: 10, scale: 2 }).notNull(),
  totalPrice: decimal('total_price', { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
});

// Pre-orders table for customer pre-order management
export const preOrders = pgTable('pre_orders', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  customerId: varchar('customer_id').notNull().references(() => customers.id),
  status: varchar('status').notNull().default('pending'), // pending, partially_arrived, fully_arrived, cancelled
  notes: text('notes'),
  expectedDate: date('expected_date'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
});

// Pre-order items
export const preOrderItems = pgTable('pre_order_items', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  preOrderId: varchar('pre_order_id').notNull().references(() => preOrders.id, { onDelete: 'cascade' }),
  productId: varchar('product_id').references(() => products.id), // nullable - can be new item
  itemName: varchar('item_name').notNull(),
  itemDescription: text('item_description'),
  quantity: integer('quantity').notNull(),
  arrivedQuantity: integer('arrived_quantity').notNull().default(0),
  purchaseItemId: integer('purchase_item_id').references(() => purchaseItems.id), // link to import items
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
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
  orders: many(orders),
  badges: many(customerBadges)
}));

export const customerBadgesRelations = relations(customerBadges, ({ one }) => ({
  customer: one(customers, {
    fields: [customerBadges.customerId],
    references: [customers.id]
  }),
  order: one(orders, {
    fields: [customerBadges.orderId],
    references: [orders.id]
  })
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
  products: many(products),
  financialContracts: many(warehouseFinancialContracts)
}));

export const warehouseFinancialContractsRelations = relations(warehouseFinancialContracts, ({ one }) => ({
  warehouse: one(warehouses, {
    fields: [warehouseFinancialContracts.warehouseId],
    references: [warehouses.id]
  })
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

export const servicesRelations = relations(services, ({ one, many }) => ({
  customer: one(customers, {
    fields: [services.customerId],
    references: [customers.id]
  }),
  items: many(serviceItems)
}));

export const serviceItemsRelations = relations(serviceItems, ({ one }) => ({
  service: one(services, {
    fields: [serviceItems.serviceId],
    references: [services.id]
  }),
  product: one(products, {
    fields: [serviceItems.productId],
    references: [products.id]
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
export const insertCustomerShippingAddressSchema = createInsertSchema(customerShippingAddresses).omit({ id: true, createdAt: true, updatedAt: true });
export const insertCustomerBillingAddressSchema = createInsertSchema(customerBillingAddresses).omit({ id: true, createdAt: true, updatedAt: true });
export const insertCustomerBadgeSchema = createInsertSchema(customerBadges).omit({ id: true, createdAt: true, updatedAt: true });
export const insertSupplierSchema = createInsertSchema(suppliers).omit({ id: true, createdAt: true });
export const insertWarehouseSchema = createInsertSchema(warehouses).omit({ createdAt: true });
export const insertWarehouseFileSchema = createInsertSchema(warehouseFiles).omit({ id: true, createdAt: true });
export const insertWarehouseFinancialContractSchema = createInsertSchema(warehouseFinancialContracts).omit({ id: true, createdAt: true, updatedAt: true });
export const insertWarehouseLayoutSchema = createInsertSchema(warehouseLayouts).omit({ id: true, generatedAt: true, createdAt: true, updatedAt: true });
export const insertLayoutBinSchema = createInsertSchema(layoutBins).omit({ id: true, createdAt: true, updatedAt: true });
export const insertProductSchema = createInsertSchema(products).omit({ id: true, createdAt: true, updatedAt: true });
export const insertProductVariantSchema = createInsertSchema(productVariants).omit({ id: true, createdAt: true, updatedAt: true });
export const insertProductTieredPricingSchema = createInsertSchema(productTieredPricing).omit({ id: true, createdAt: true, updatedAt: true });
export const insertProductBundleSchema = createInsertSchema(productBundles).omit({ id: true, bundleId: true, createdAt: true, updatedAt: true });
export const insertBundleItemSchema = createInsertSchema(bundleItems).omit({ id: true, createdAt: true });
export const insertProductFileSchema = createInsertSchema(productFiles).omit({ id: true, uploadedAt: true });
export const insertAiLocationSuggestionSchema = createInsertSchema(aiLocationSuggestions).omit({ id: true, generatedAt: true, createdAt: true, updatedAt: true });
export const insertOrderFileSchema = createInsertSchema(orderFiles).omit({ id: true, uploadedAt: true });
export const insertDailySequenceSchema = createInsertSchema(dailySequences).omit({ id: true, createdAt: true, updatedAt: true });
export const insertOrderSchema = createInsertSchema(orders).omit({ id: true, createdAt: true });
export const insertOrderItemSchema = createInsertSchema(orderItems).omit({ id: true });
export const insertProductLocationSchema = createInsertSchema(productLocations)
  .omit({ id: true, createdAt: true, updatedAt: true })
  .extend({
    locationCode: z.string().regex(/^WH\d+(-[A-Z])?-[A-Z]\d{2}-(R\d{2}-L\d{2}(-B\d{1,2})?|P\d{2})$/, {
      message: 'Location code must be in format: WH1-A06-R04-L04-B2 (shelves), WH1-B03-P05 (pallets), or legacy formats with area'
    }),
    locationType: z.enum(['display', 'warehouse', 'pallet', 'other']),
    quantity: z.number().int().min(0, 'Quantity must be non-negative')
  });

export const insertStockAdjustmentRequestSchema = createInsertSchema(stockAdjustmentRequests)
  .omit({ id: true, createdAt: true, updatedAt: true, approvedBy: true, approvedAt: true, rejectionReason: true })
  .extend({
    adjustmentType: z.enum(['add', 'remove', 'set']),
    currentQuantity: z.number().int().min(0),
    requestedQuantity: z.number().int().min(0),
    reason: z.string().min(3, 'Reason must be at least 3 characters')
  });

// AI-powered carton packing schemas
export const insertPackingCartonSchema = createInsertSchema(packingCartons).omit({ id: true, createdAt: true, updatedAt: true });
export const insertOrderCartonPlanSchema = createInsertSchema(orderCartonPlans).omit({ id: true, createdAt: true, updatedAt: true });
export const insertOrderCartonItemSchema = createInsertSchema(orderCartonItems).omit({ id: true, createdAt: true });
export const insertOrderCartonSchema = createInsertSchema(orderCartons).omit({ id: true, createdAt: true, updatedAt: true });
export const insertShipmentLabelSchema = createInsertSchema(shipmentLabels).omit({ id: true, createdAt: true, updatedAt: true });

// Packing Materials schemas
export const insertPackingMaterialSchema = createInsertSchema(packingMaterials).omit({ id: true, createdAt: true, updatedAt: true });
export const insertPackingMaterialUsageSchema = createInsertSchema(packingMaterialUsage).omit({ id: true, createdAt: true });
export const insertPmSupplierSchema = createInsertSchema(pmSuppliers).omit({ id: true, createdAt: true, updatedAt: true });

export const insertDiscountSchema = createInsertSchema(discounts).omit({ id: true, createdAt: true, updatedAt: true });
export const insertExpenseSchema = createInsertSchema(expenses).omit({ id: true, createdAt: true, updatedAt: true });
export const insertServiceSchema = createInsertSchema(services).omit({ id: true, createdAt: true, updatedAt: true });
export const insertServiceItemSchema = createInsertSchema(serviceItems).omit({ id: true, createdAt: true, updatedAt: true });
export const insertPreOrderSchema = createInsertSchema(preOrders).omit({ id: true, createdAt: true, updatedAt: true });
export const insertPreOrderItemSchema = createInsertSchema(preOrderItems).omit({ id: true, createdAt: true, updatedAt: true });
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
export type CustomerShippingAddress = typeof customerShippingAddresses.$inferSelect;
export type InsertCustomerShippingAddress = z.infer<typeof insertCustomerShippingAddressSchema>;
export type CustomerBillingAddress = typeof customerBillingAddresses.$inferSelect;
export type InsertCustomerBillingAddress = z.infer<typeof insertCustomerBillingAddressSchema>;
export type CustomerBadge = typeof customerBadges.$inferSelect;
export type InsertCustomerBadge = z.infer<typeof insertCustomerBadgeSchema>;
export type Supplier = typeof suppliers.$inferSelect;
export type InsertSupplier = z.infer<typeof insertSupplierSchema>;
export type Warehouse = typeof warehouses.$inferSelect;
export type InsertWarehouse = z.infer<typeof insertWarehouseSchema>;
export type WarehouseFile = typeof warehouseFiles.$inferSelect;
export type InsertWarehouseFile = z.infer<typeof insertWarehouseFileSchema>;
export type WarehouseFinancialContract = typeof warehouseFinancialContracts.$inferSelect;
export type InsertWarehouseFinancialContract = z.infer<typeof insertWarehouseFinancialContractSchema>;
export type WarehouseLayout = typeof warehouseLayouts.$inferSelect;
export type InsertWarehouseLayout = z.infer<typeof insertWarehouseLayoutSchema>;
export type LayoutBin = typeof layoutBins.$inferSelect;
export type InsertLayoutBin = z.infer<typeof insertLayoutBinSchema>;
export type Product = typeof products.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type AiLocationSuggestion = typeof aiLocationSuggestions.$inferSelect;
export type InsertAiLocationSuggestion = z.infer<typeof insertAiLocationSuggestionSchema>;
export type ProductVariant = typeof productVariants.$inferSelect;
export type InsertProductVariant = z.infer<typeof insertProductVariantSchema>;
export type ProductTieredPricing = typeof productTieredPricing.$inferSelect;
export type InsertProductTieredPricing = z.infer<typeof insertProductTieredPricingSchema>;
export type ProductBundle = typeof productBundles.$inferSelect;
export type InsertProductBundle = z.infer<typeof insertProductBundleSchema>;
export type BundleItem = typeof bundleItems.$inferSelect;
export type InsertBundleItem = z.infer<typeof insertBundleItemSchema>;
export type ProductFile = typeof productFiles.$inferSelect;
export type InsertProductFile = z.infer<typeof insertProductFileSchema>;
export type OrderFile = typeof orderFiles.$inferSelect;
export type InsertOrderFile = z.infer<typeof insertOrderFileSchema>;
export type DailySequence = typeof dailySequences.$inferSelect;
export type InsertDailySequence = z.infer<typeof insertDailySequenceSchema>;
export type Order = typeof orders.$inferSelect;
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type OrderItem = typeof orderItems.$inferSelect;
export type InsertOrderItem = z.infer<typeof insertOrderItemSchema>;
export type ProductLocation = typeof productLocations.$inferSelect;
export type InsertProductLocation = z.infer<typeof insertProductLocationSchema>;
export type StockAdjustmentRequest = typeof stockAdjustmentRequests.$inferSelect;
export type InsertStockAdjustmentRequest = z.infer<typeof insertStockAdjustmentRequestSchema>;

// Tickets (Customer Support System)
export const tickets = pgTable('tickets', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  ticketId: varchar('ticket_id').notNull().unique(), // e.g., TKT-20241018-001
  customerId: varchar('customer_id').references(() => customers.id),
  orderId: varchar('order_id').references(() => orders.id),
  title: varchar('title').notNull(),
  description: text('description'),
  category: varchar('category').notNull(), // shipping_issue, product_question, payment_problem, complaint, general
  status: varchar('status').notNull().default('open'), // open, in_progress, resolved, closed
  priority: varchar('priority').notNull().default('medium'), // low, medium, high, urgent
  assignedTo: varchar('assigned_to').references(() => users.id),
  createdBy: varchar('created_by').references(() => users.id),
  resolvedAt: timestamp('resolved_at'),
  dueDate: timestamp('due_date'),
  tags: text('tags').array(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

export const insertTicketSchema = createInsertSchema(tickets).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

// Ticket Comments (Follow-ups)
export const ticketComments = pgTable('ticket_comments', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  ticketId: varchar('ticket_id').notNull().references(() => tickets.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  isInternal: boolean('is_internal').default(false), // Internal notes not visible to customer
  createdBy: varchar('created_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

export const insertTicketCommentSchema = createInsertSchema(ticketComments).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

// Order Fulfillment Performance Tracking
export const orderFulfillmentLogs = pgTable('order_fulfillment_logs', {
  id: serial('id').primaryKey(),
  orderId: varchar('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
  userId: varchar('user_id').notNull().references(() => users.id),
  activityType: varchar('activity_type').notNull(), // 'pick' or 'pack'
  startedAt: timestamp('started_at').notNull(),
  completedAt: timestamp('completed_at'),
  itemCount: integer('item_count').notNull().default(0),
  totalQuantity: integer('total_quantity').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow()
});

export const insertOrderFulfillmentLogSchema = createInsertSchema(orderFulfillmentLogs).omit({
  id: true,
  createdAt: true
});

// AI-powered carton packing types
export type PackingCarton = typeof packingCartons.$inferSelect;
export type InsertPackingCarton = z.infer<typeof insertPackingCartonSchema>;
export type OrderCartonPlan = typeof orderCartonPlans.$inferSelect;
export type InsertOrderCartonPlan = z.infer<typeof insertOrderCartonPlanSchema>;
export type OrderCartonItem = typeof orderCartonItems.$inferSelect;
export type InsertOrderCartonItem = z.infer<typeof insertOrderCartonItemSchema>;
export type OrderCarton = typeof orderCartons.$inferSelect;
export type InsertOrderCarton = z.infer<typeof insertOrderCartonSchema>;
export type ShipmentLabel = typeof shipmentLabels.$inferSelect;
export type InsertShipmentLabel = z.infer<typeof insertShipmentLabelSchema>;

// Packing Materials types
export type PackingMaterial = typeof packingMaterials.$inferSelect;
export type InsertPackingMaterial = z.infer<typeof insertPackingMaterialSchema>;
export type PackingMaterialUsage = typeof packingMaterialUsage.$inferSelect;
export type InsertPackingMaterialUsage = z.infer<typeof insertPackingMaterialUsageSchema>;
export type PmSupplier = typeof pmSuppliers.$inferSelect;
export type InsertPmSupplier = z.infer<typeof insertPmSupplierSchema>;

export type Discount = typeof discounts.$inferSelect;
export type InsertDiscount = z.infer<typeof insertDiscountSchema>;
export type Expense = typeof expenses.$inferSelect;
export type InsertExpense = z.infer<typeof insertExpenseSchema>;
export type Service = typeof services.$inferSelect;
export type InsertService = z.infer<typeof insertServiceSchema>;
export type ServiceItem = typeof serviceItems.$inferSelect;
export type InsertServiceItem = z.infer<typeof insertServiceItemSchema>;
export type PreOrder = typeof preOrders.$inferSelect;
export type InsertPreOrder = z.infer<typeof insertPreOrderSchema>;
export type PreOrderItem = typeof preOrderItems.$inferSelect;
export type InsertPreOrderItem = z.infer<typeof insertPreOrderItemSchema>;
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

// Ticket types
export type Ticket = typeof tickets.$inferSelect;
export type InsertTicket = z.infer<typeof insertTicketSchema>;
export type TicketComment = typeof ticketComments.$inferSelect;
export type InsertTicketComment = z.infer<typeof insertTicketCommentSchema>;

// Order Fulfillment Performance types
export type OrderFulfillmentLog = typeof orderFulfillmentLogs.$inferSelect;
export type InsertOrderFulfillmentLog = z.infer<typeof insertOrderFulfillmentLogSchema>;

// Application Settings table - stores key-value pairs for system-wide settings
export const appSettings = pgTable('app_settings', {
  key: varchar('key').primaryKey(), // e.g., 'ppl_default_sender_address'
  value: jsonb('value').notNull(), // JSON value for flexibility
  category: varchar('category').default('general'), // general, shipping, billing, etc.
  description: text('description'),
  updatedAt: timestamp('updated_at').defaultNow(),
  updatedBy: varchar('updated_by').references(() => users.id)
});

export const insertAppSettingSchema = createInsertSchema(appSettings);
export type AppSetting = typeof appSettings.$inferSelect;
export type InsertAppSetting = z.infer<typeof insertAppSettingSchema>;

// Packing Plan Serializers - Convert between UI and DB formats
export interface UIPackingPlan {
  totalCartons: number;
  totalWeight: number;
  avgUtilization: number;
  estimatedShippingCost: number;
  suggestions: string[];
  cartons: Array<{
    cartonName: string;
    cartonId?: string;
    cartonNumber?: number;
    dimensions: string;
    weight: number;
    utilization: number;
    items: Array<{
      productId?: string;
      productName: string;
      name?: string;
      quantity: number;
      weight: number;
      isEstimated: boolean;
    }>;
    fillingWeight?: number;
    unusedVolume?: number;
  }>;
}

export function serializePackingPlanToDB(uiPlan: UIPackingPlan, orderId: string) {
  return {
    orderId,
    totalCartons: uiPlan.totalCartons,
    totalWeightKg: uiPlan.totalWeight.toString(),
    avgUtilization: uiPlan.avgUtilization.toString(),
    suggestions: uiPlan.suggestions,
    totalShippingCost: uiPlan.estimatedShippingCost.toString(),
    status: 'draft' as const,
  };
}

export function serializePackingPlanItems(uiPlan: UIPackingPlan, planId: string) {
  const items: Array<{
    planId: string;
    cartonNumber: number;
    cartonId: string | null;
    productId: string | null;
    quantity: number;
    itemWeightKg: string;
    aiEstimated: boolean;
  }> = [];

  uiPlan.cartons.forEach((carton, cartonIndex) => {
    carton.items.forEach((item) => {
      items.push({
        planId,
        cartonNumber: carton.cartonNumber ?? cartonIndex + 1,
        cartonId: carton.cartonId || null,
        productId: item.productId || null,
        quantity: item.quantity,
        itemWeightKg: item.weight.toString(),
        aiEstimated: item.isEstimated,
      });
    });
  });

  return items;
}

export function deserializePackingPlanFromDB(
  dbPlan: OrderCartonPlan,
  dbItems: Array<OrderCartonItem & { productName?: string; sku?: string }>,
  cartonDetails: Array<{ id: string; name: string; innerLengthCm: string; innerWidthCm: string; innerHeightCm: string; tareWeightKg: string }>
): UIPackingPlan {
  // Group items by carton number
  const cartonMap = new Map<number, typeof dbItems>();
  
  dbItems.forEach(item => {
    const cartonNum = item.cartonNumber;
    if (!cartonMap.has(cartonNum)) {
      cartonMap.set(cartonNum, []);
    }
    cartonMap.get(cartonNum)!.push(item);
  });

  // Build cartons with items explicitly attached
  const cartons = Array.from(cartonMap.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([cartonNumber, cartonItems]) => {
      // Find carton details
      const cartonDetail = cartonItems[0]?.cartonId 
        ? cartonDetails.find(c => c.id === cartonItems[0].cartonId)
        : null;

      // Calculate weights
      const totalWeight = cartonItems.reduce((sum, item) => sum + parseFloat(item.itemWeightKg || '0'), 0);
      const tareWeight = cartonDetail ? parseFloat(cartonDetail.tareWeightKg || '0') : 0;
      const fillingWeight = totalWeight + tareWeight;

      // Get dimensions
      const dimensions = cartonDetail
        ? `${cartonDetail.innerLengthCm}×${cartonDetail.innerWidthCm}×${cartonDetail.innerHeightCm} cm`
        : 'Unknown';

      // Calculate volume and utilization
      const cartonVolume = cartonDetail
        ? parseFloat(cartonDetail.innerLengthCm) * parseFloat(cartonDetail.innerWidthCm) * parseFloat(cartonDetail.innerHeightCm)
        : 0;

      const itemsVolume = cartonItems.reduce((sum, item) => sum + parseFloat(item.itemWeightKg || '0') * 1000, 0);
      const utilization = cartonVolume > 0 ? (itemsVolume / cartonVolume) * 100 : 0;

      // CRITICAL: Map all items for this carton - items MUST be included
      const mappedItems = cartonItems.map(item => ({
        productId: item.productId || undefined,
        productName: item.productName || 'Unknown Product',
        quantity: item.quantity,
        weight: parseFloat(item.itemWeightKg || '0'),
        isEstimated: item.aiEstimated || false,
      }));

      // Build and return carton with items explicitly included
      return {
        cartonName: cartonDetail?.name || `Carton ${cartonNumber}`,
        cartonId: cartonItems[0]?.cartonId || undefined,
        cartonNumber,
        dimensions,
        weight: totalWeight,
        utilization: Math.min(utilization, 100),
        items: mappedItems, // CRITICAL: Items are attached here
        fillingWeight,
        unusedVolume: cartonVolume > 0 ? cartonVolume - itemsVolume : undefined,
      };
    });

  // Return complete plan with cartons that include items
  return {
    totalCartons: dbPlan.totalCartons,
    totalWeight: parseFloat(dbPlan.totalWeightKg || '0'),
    avgUtilization: parseFloat(dbPlan.avgUtilization || '0'),
    estimatedShippingCost: parseFloat(dbPlan.totalShippingCost || '0'),
    suggestions: Array.isArray(dbPlan.suggestions) ? dbPlan.suggestions as string[] : [],
    cartons, // Cartons with items attached
  };
}

// Compute stable checksum for efficient change detection
export function computePlanChecksum(plan: UIPackingPlan): string {
  // Create normalized version for stable comparison
  const normalized = {
    totalCartons: plan.totalCartons,
    totalWeight: Number(plan.totalWeight.toFixed(2)),
    avgUtilization: Number(plan.avgUtilization.toFixed(2)),
    estimatedShippingCost: Number(plan.estimatedShippingCost.toFixed(2)),
    suggestions: [...plan.suggestions].sort(),
    cartons: [...plan.cartons]
      .sort((a, b) => (a.cartonNumber || 0) - (b.cartonNumber || 0))
      .map(carton => ({
        cartonId: carton.cartonId || null,
        cartonNumber: carton.cartonNumber || 0,
        cartonName: carton.cartonName,
        dimensions: carton.dimensions,
        weight: Number(carton.weight.toFixed(2)),
        utilization: Number(carton.utilization.toFixed(2)),
        items: [...carton.items]
          .sort((a, b) => (a.productId || '').localeCompare(b.productId || ''))
          .map(item => ({
            productId: item.productId || null,
            productName: item.productName,
            quantity: item.quantity,
            weight: Number(item.weight.toFixed(2)),
            isEstimated: item.isEstimated,
          }))
      }))
  };
  
  // Simple hash function using JSON stringify
  const jsonString = JSON.stringify(normalized);
  let hash = 0;
  for (let i = 0; i < jsonString.length; i++) {
    const char = jsonString.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash.toString(36);
}

// Shipment Tracking for PPL, GLS, DHL carriers
export interface TrackingCheckpoint {
  timestamp: string;
  location: string;
  status: string;
  description: string;
}

export const shipmentTracking = pgTable('shipment_tracking', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  orderId: varchar('order_id').references(() => orders.id, { onDelete: 'cascade' }).notNull(),
  cartonId: varchar('carton_id').references(() => orderCartons.id, { onDelete: 'cascade' }),
  carrier: varchar('carrier', { length: 50 }).notNull(), // 'ppl', 'gls', 'dhl'
  trackingNumber: varchar('tracking_number', { length: 100 }).notNull().unique(),
  statusCode: varchar('status_code', { length: 50 }), // normalized: created, in_transit, out_for_delivery, delivered, exception
  statusLabel: text('status_label'), // Human-readable status from carrier
  checkpoints: jsonb('checkpoints').$type<TrackingCheckpoint[]>(), // Array of tracking events
  estimatedDelivery: timestamp('estimated_delivery'),
  deliveredAt: timestamp('delivered_at'),
  lastEventAt: timestamp('last_event_at'),
  lastCheckedAt: timestamp('last_checked_at'),
  errorState: text('error_state'), // Store error message if tracking fetch fails
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const insertShipmentTrackingSchema = createInsertSchema(shipmentTracking).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});

export type ShipmentTracking = typeof shipmentTracking.$inferSelect;
export type InsertShipmentTracking = z.infer<typeof insertShipmentTrackingSchema>;

// Notifications table
export const notifications = pgTable('notifications', {
  id: serial('id').primaryKey(),
  userId: varchar('user_id').notNull().references(() => users.id),
  title: text('title').notNull(),
  description: text('description'),
  type: text('type').notNull().default('info'), // success, error, warning, info
  isRead: boolean('is_read').notNull().default(false),
  actionUrl: text('action_url'),
  actionLabel: text('action_label'),
  metadata: jsonb('metadata'), // Optional additional data
  createdAt: timestamp('created_at').notNull().defaultNow()
});

export const insertNotificationSchema = createInsertSchema(notifications, {
  type: z.enum(['success', 'error', 'warning', 'info']),
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  actionUrl: z.union([
    z.string().url(), // Absolute URLs
    z.string().regex(/^\//, 'Must be a relative path starting with /'), // Relative paths
    z.literal(''),
  ]).optional(),
  actionLabel: z.string().optional(),
  metadata: z.record(z.any()).optional(),
}).omit({
  id: true,
  createdAt: true,
});

export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notifications.$inferSelect;