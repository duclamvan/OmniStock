import { sql } from 'drizzle-orm';
import { relations } from 'drizzle-orm';
import {
  pgTable,
  varchar,
  text,
  timestamp,
  integer,
  decimal,
  boolean,
  jsonb,
  index,
  pgEnum
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table for Replit Auth
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Enums
export const currencyEnum = pgEnum('currency', ['CZK', 'EUR', 'USD', 'VND', 'CNY']);
export const orderStatusEnum = pgEnum('order_status', ['pending', 'to_fulfill', 'ready_to_ship', 'shipped']);
export const paymentStatusEnum = pgEnum('payment_status', ['pending', 'paid', 'pay_later']);
export const orderPriorityEnum = pgEnum('order_priority', ['low', 'medium', 'high']);
export const discountTypeEnum = pgEnum('discount_type', ['flat', 'rate']);
export const purchaseStatusEnum = pgEnum('purchase_status', ['purchased', 'processing', 'ready_to_ship', 'shipped', 'delivered']);
export const returnStatusEnum = pgEnum('return_status', ['awaiting', 'processing', 'completed']);
export const expenseStatusEnum = pgEnum('expense_status', ['pending', 'overdue', 'paid']);
export const recurringEnum = pgEnum('recurring', ['daily', 'weekly', 'monthly', 'yearly']);
export const shippingMethodEnum = pgEnum('shipping_method', ['GLS', 'PPL', 'DHL', 'DPD']);
export const paymentMethodEnum = pgEnum('payment_method', ['Bank Transfer', 'PayPal', 'COD', 'Cash']);
export const warehouseStatusEnum = pgEnum('warehouse_status', ['active', 'inactive', 'maintenance', 'rented']);

// Categories
export const categories = pgTable("categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Warehouses
export const warehouses = pgTable("warehouses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: varchar("code", { length: 20 }).unique(), // e.g., WH1, WH2, etc.
  name: varchar("name", { length: 255 }).notNull(),
  location: varchar("location", { length: 255 }),
  address: text("address"),
  city: varchar("city", { length: 100 }),
  country: varchar("country", { length: 100 }).default("Czech Republic"),
  zipCode: varchar("zip_code", { length: 20 }),
  phone: varchar("phone", { length: 20 }),
  email: varchar("email", { length: 255 }),
  manager: varchar("manager", { length: 255 }),
  capacity: integer("capacity").default(0),
  floorArea: decimal("floor_area", { precision: 10, scale: 2 }), // in square meters
  type: varchar("type", { length: 50 }).default("branch"), // main, branch, temporary
  status: warehouseStatusEnum("status").default("active"),
  rentedFromDate: timestamp("rented_from_date"),
  expenseId: varchar("expense_id", { length: 255 }),
  contact: varchar("contact", { length: 255 }),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Warehouse Files
export const warehouseFiles = pgTable("warehouse_files", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  warehouseId: varchar("warehouse_id").references(() => warehouses.id, { onDelete: 'cascade' }).notNull(),
  fileName: varchar("file_name", { length: 255 }).notNull(),
  fileType: varchar("file_type", { length: 100 }).notNull(),
  fileUrl: text("file_url").notNull(),
  fileSize: integer("file_size"),
  uploadedBy: varchar("uploaded_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Location type enum
export const locationTypeEnum = pgEnum("location_type", [
  'ZONE',
  'AISLE', 
  'RACK',
  'SHELF',
  'BIN',
  'STAGE',
  'DOCK'
]);

// Temperature type enum
export const temperatureTypeEnum = pgEnum("temperature_type", [
  'ambient',
  'cool', 
  'warm'
]);

// Warehouse Locations (hierarchical)
export const warehouseLocations: any = pgTable("warehouse_locations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  warehouseId: varchar("warehouse_id").references(() => warehouses.id, { onDelete: 'cascade' }).notNull(),
  parentId: varchar("parent_id"),
  type: locationTypeEnum("type").notNull(),
  code: varchar("code", { length: 50 }).notNull(),
  address: varchar("address", { length: 255 }).notNull().unique(),
  pickable: boolean("pickable").default(true),
  putawayAllowed: boolean("putaway_allowed").default(true),
  sortKey: integer("sort_key").default(0),
  // Attributes stored as individual columns for better querying
  temperature: temperatureTypeEnum("temperature"),
  hazmat: boolean("hazmat").default(false),
  heightCm: integer("height_cm"),
  widthCm: integer("width_cm"),
  depthCm: integer("depth_cm"),
  maxWeight: integer("max_weight"), // in kg
  currentOccupancy: integer("current_occupancy").default(0), // percentage
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Inventory Balances (tracks what's in each location)
export const inventoryBalances = pgTable("inventory_balances", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  locationId: varchar("location_id").references(() => warehouseLocations.id, { onDelete: 'cascade' }).notNull(),
  productId: varchar("product_id").references(() => products.id),
  variantId: varchar("variant_id").references(() => productVariants.id),
  quantity: integer("quantity").notNull().default(0),
  lotNumber: varchar("lot_number", { length: 100 }),
  expiryDate: timestamp("expiry_date"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Suppliers
export const suppliers = pgTable("suppliers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(),
  contactPerson: varchar("contact_person", { length: 255 }),
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 20 }),
  address: text("address"),
  country: varchar("country", { length: 100 }),
  website: varchar("website", { length: 255 }),
  supplierLink: text("supplier_link"),
  lastPurchaseDate: timestamp("last_purchase_date"),
  totalPurchased: decimal("total_purchased", { precision: 12, scale: 2 }).default('0'),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Supplier Files
export const supplierFiles = pgTable("supplier_files", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  supplierId: varchar("supplier_id").references(() => suppliers.id, { onDelete: 'cascade' }).notNull(),
  fileName: varchar("file_name", { length: 255 }).notNull(),
  fileType: varchar("file_type", { length: 100 }).notNull(),
  fileUrl: text("file_url").notNull(),
  fileSize: integer("file_size"),
  uploadedBy: varchar("uploaded_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Products/Inventory
export const products = pgTable("products", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(),
  englishName: varchar("english_name", { length: 255 }),
  sku: varchar("sku", { length: 100 }).unique().notNull(),
  categoryId: varchar("category_id").references(() => categories.id),
  warehouseId: varchar("warehouse_id").references(() => warehouses.id),
  warehouseLocation: varchar("warehouse_location", { length: 100 }),
  supplierId: varchar("supplier_id").references(() => suppliers.id),
  description: text("description"),
  quantity: integer("quantity").default(0),
  lowStockAlert: integer("low_stock_alert").default(5),
  priceCzk: decimal("price_czk", { precision: 12, scale: 2 }),
  priceEur: decimal("price_eur", { precision: 12, scale: 2 }),
  importCostUsd: decimal("import_cost_usd", { precision: 12, scale: 2 }),
  importCostCzk: decimal("import_cost_czk", { precision: 12, scale: 2 }),
  importCostEur: decimal("import_cost_eur", { precision: 12, scale: 2 }),
  supplierLink: text("supplier_link"),
  imageUrl: varchar("image_url", { length: 500 }),
  barcode: varchar("barcode", { length: 50 }),
  // Dimensions and weight
  length: decimal("length", { precision: 10, scale: 2 }), // in cm
  width: decimal("width", { precision: 10, scale: 2 }), // in cm
  height: decimal("height", { precision: 10, scale: 2 }), // in cm
  weight: decimal("weight", { precision: 10, scale: 3 }), // in kg
  // Shipping and packing
  shipmentNotes: text("shipment_notes"),
  packingMaterialId: varchar("packing_material_id").references(() => packingMaterials.id),
  // Soft delete flag
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Product Variants
export const productVariants = pgTable("product_variants", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  productId: varchar("product_id").references(() => products.id, { onDelete: 'cascade' }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  barcode: varchar("barcode", { length: 50 }),
  quantity: integer("quantity").default(0),
  importCostUsd: decimal("import_cost_usd", { precision: 12, scale: 2 }),
  importCostCzk: decimal("import_cost_czk", { precision: 12, scale: 2 }),
  importCostEur: decimal("import_cost_eur", { precision: 12, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow(),
});

// Product Bundles
export const productBundles = pgTable("product_bundles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  bundleId: varchar("bundle_id", { length: 50 }).unique().notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  sku: varchar("sku", { length: 100 }).unique(),
  isActive: boolean("is_active").default(true),
  priceCzk: decimal("price_czk", { precision: 12, scale: 2 }),
  priceEur: decimal("price_eur", { precision: 12, scale: 2 }),
  discountPercentage: decimal("discount_percentage", { precision: 5, scale: 2 }).default('0'), // Discount from sum of components
  imageUrl: varchar("image_url", { length: 500 }),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Bundle Items (components of a bundle)
export const bundleItems = pgTable("bundle_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  bundleId: varchar("bundle_id").references(() => productBundles.id, { onDelete: 'cascade' }).notNull(),
  productId: varchar("product_id").references(() => products.id),
  variantId: varchar("variant_id").references(() => productVariants.id),
  quantity: integer("quantity").notNull().default(1),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Customers
export const customers = pgTable("customers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(),
  facebookName: varchar("facebook_name", { length: 255 }),
  facebookId: varchar("facebook_id", { length: 255 }),
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 20 }),
  address: text("address"),
  city: varchar("city", { length: 100 }),
  state: varchar("state", { length: 100 }),
  zipCode: varchar("zip_code", { length: 20 }),
  country: varchar("country", { length: 100 }),
  type: varchar("type", { length: 50 }).default("regular"), // regular, vip, wholesale
  notes: text("notes"),
  // Tax identification fields
  vatId: varchar("vat_id", { length: 50 }), // VAT ID for EU countries
  taxId: varchar("tax_id", { length: 50 }), // IČO for Czech Republic or other tax IDs
  // Customer relationship fields
  firstOrderDate: timestamp("first_order_date"),
  lastOrderDate: timestamp("last_order_date"),
  totalOrders: integer("total_orders").default(0),
  totalSpent: decimal("total_spent", { precision: 12, scale: 2 }).default('0'),
  averageOrderValue: decimal("average_order_value", { precision: 12, scale: 2 }).default('0'),
  customerRank: varchar("customer_rank", { length: 20 }), // TOP10, TOP50, TOP100, etc.
  lastContactDate: timestamp("last_contact_date"),
  preferredLanguage: varchar("preferred_language", { length: 10 }).default('cs'), // cs, de, en, etc.
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Customer-Specific Prices
export const customerPrices = pgTable("customer_prices", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  customerId: varchar("customer_id").references(() => customers.id, { onDelete: 'cascade' }).notNull(),
  productId: varchar("product_id").references(() => products.id, { onDelete: 'cascade' }),
  variantId: varchar("variant_id").references(() => productVariants.id, { onDelete: 'cascade' }),
  price: decimal("price", { precision: 12, scale: 2 }).notNull(),
  currency: currencyEnum("currency").notNull(),
  validFrom: timestamp("valid_from").notNull().defaultNow(),
  validTo: timestamp("valid_to"),
  isActive: boolean("is_active").default(true),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Orders
export const orders = pgTable("orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: varchar("order_id", { length: 50 }).unique().notNull(),
  customerId: varchar("customer_id").references(() => customers.id),
  billerId: varchar("biller_id").references(() => users.id),
  currency: currencyEnum("currency").notNull(),
  orderStatus: orderStatusEnum("order_status").default('pending'),
  paymentStatus: paymentStatusEnum("payment_status").default('pending'),
  priority: orderPriorityEnum("priority").default('medium'),
  subtotal: decimal("subtotal", { precision: 12, scale: 2 }).default('0'),
  discountType: discountTypeEnum("discount_type"),
  discountValue: decimal("discount_value", { precision: 12, scale: 2 }).default('0'),
  taxRate: decimal("tax_rate", { precision: 5, scale: 2 }).default('0'),
  taxAmount: decimal("tax_amount", { precision: 12, scale: 2 }).default('0'),
  shippingMethod: shippingMethodEnum("shipping_method"),
  paymentMethod: paymentMethodEnum("payment_method"),
  shippingCost: decimal("shipping_cost", { precision: 12, scale: 2 }).default('0'),
  actualShippingCost: decimal("actual_shipping_cost", { precision: 12, scale: 2 }).default('0'),
  grandTotal: decimal("grand_total", { precision: 12, scale: 2 }).notNull(),
  notes: text("notes"),
  attachmentUrl: varchar("attachment_url", { length: 500 }),
  // Pick & Pack fields
  pickStatus: varchar("pick_status", { length: 50 }).default('not_started'), // not_started, in_progress, completed
  packStatus: varchar("pack_status", { length: 50 }).default('not_started'), // not_started, in_progress, completed
  pickedBy: varchar("picked_by", { length: 255 }),
  packedBy: varchar("packed_by", { length: 255 }),
  pickStartTime: timestamp("pick_start_time"),
  pickEndTime: timestamp("pick_end_time"),
  packStartTime: timestamp("pack_start_time"),
  packEndTime: timestamp("pack_end_time"),
  // Packing details
  finalWeight: decimal("final_weight", { precision: 8, scale: 2 }),
  cartonUsed: varchar("carton_used", { length: 100 }),
  // Modification tracking
  modifiedAfterPacking: boolean("modified_after_packing").default(false),
  modificationNotes: text("modification_notes"),
  lastModifiedAt: timestamp("last_modified_at"),
  previousPackStatus: varchar("previous_pack_status", { length: 50 }), // Store previous pack status before modification
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  shippedAt: timestamp("shipped_at"),
});

// Order Items
export const orderItems = pgTable("order_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: varchar("order_id").references(() => orders.id, { onDelete: 'cascade' }).notNull(),
  productId: varchar("product_id").references(() => products.id),
  variantId: varchar("variant_id").references(() => productVariants.id),
  productName: varchar("product_name", { length: 255 }).notNull(),
  sku: varchar("sku", { length: 100 }),
  quantity: integer("quantity").notNull(),
  price: decimal("price", { precision: 12, scale: 2 }).notNull(), // Main price field (legacy)
  // Price snapshot fields
  unitPrice: decimal("unit_price", { precision: 12, scale: 2 }), // Original price at time of order
  appliedPrice: decimal("applied_price", { precision: 12, scale: 2 }), // Actual price used (customer price or default)
  currency: currencyEnum("currency"), // Currency of the price
  customerPriceId: varchar("customer_price_id").references(() => customerPrices.id), // Reference to customer price if used
  discount: decimal("discount", { precision: 12, scale: 2 }).default('0'),
  tax: decimal("tax", { precision: 12, scale: 2 }).default('0'),
  total: decimal("total", { precision: 12, scale: 2 }).notNull(),
  // Pick & Pack fields
  pickedQuantity: integer("picked_quantity").default(0),
  packedQuantity: integer("packed_quantity").default(0),
  warehouseLocation: varchar("warehouse_location", { length: 100 }),
  barcode: varchar("barcode", { length: 50 }),
  image: varchar("image", { length: 500 }),
  // Timestamps for individual item picking
  pickStartTime: timestamp("pick_start_time"),
  pickEndTime: timestamp("pick_end_time"),
  packStartTime: timestamp("pack_start_time"),
  packEndTime: timestamp("pack_end_time"),
});

// Pick & Pack Activity Logs
export const pickPackLogs = pgTable("pick_pack_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: varchar("order_id").references(() => orders.id, { onDelete: 'cascade' }).notNull(),
  orderItemId: varchar("order_item_id").references(() => orderItems.id, { onDelete: 'cascade' }),
  activityType: varchar("activity_type", { length: 50 }).notNull(), // picking_started, item_picked, picking_completed, packing_started, item_packed, packing_completed
  userId: varchar("user_id").references(() => users.id),
  userName: varchar("user_name", { length: 255 }),
  productName: varchar("product_name", { length: 255 }),
  sku: varchar("sku", { length: 100 }),
  quantity: integer("quantity"),
  location: varchar("location", { length: 100 }),
  notes: text("notes"),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Purchases
export const purchases = pgTable("purchases", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  productName: varchar("product_name", { length: 255 }).notNull(),
  sku: varchar("sku", { length: 100 }),
  quantity: integer("quantity").notNull(),
  importPrice: decimal("import_price", { precision: 12, scale: 2 }).notNull(),
  importCurrency: currencyEnum("import_currency").notNull(),
  supplierName: varchar("supplier_name", { length: 255 }),
  supplierUrl: text("supplier_url"),
  status: purchaseStatusEnum("status").default('purchased'),
  shipmentId: varchar("shipment_id", { length: 100 }),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Incoming Shipments
export const incomingShipments = pgTable("incoming_shipments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  shipmentId: varchar("shipment_id", { length: 100 }).unique().notNull(),
  shippingMethod: varchar("shipping_method", { length: 255 }),
  shippingCarrier: varchar("shipping_carrier", { length: 255 }),
  currency: currencyEnum("currency").notNull(),
  shippingCost: decimal("shipping_cost", { precision: 12, scale: 2 }).default('0'),
  dateShipped: timestamp("date_shipped"),
  dateDelivered: timestamp("date_delivered"),
  status: varchar("status", { length: 50 }).default('in_transit'),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Sales/Discounts
export const sales = pgTable("sales", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  discountId: varchar("discount_id", { length: 100 }).unique().notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  discountType: varchar("discount_type", { length: 20 }).notNull().default('percentage'), // percentage, fixed_amount, buy_x_get_y
  percentage: integer("percentage"), // For percentage discount (e.g., 20 for 20%)
  fixedAmount: decimal("fixed_amount", { precision: 12, scale: 2 }), // For fixed amount discount
  buyQuantity: integer("buy_quantity"), // For Buy X Get Y - how many to buy
  getQuantity: integer("get_quantity"), // For Buy X Get Y - how many free
  getProductType: varchar("get_product_type", { length: 20 }), // same_product, different_product
  getProductId: varchar("get_product_id").references(() => products.id), // For different_product in Buy X Get Y
  status: varchar("status", { length: 20 }).default('active'), // active, inactive, finished
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  applicationScope: varchar("application_scope", { length: 50 }).notNull(), // specific_product, all_products, specific_category, selected_products
  productId: varchar("product_id").references(() => products.id), // For specific_product scope
  categoryId: varchar("category_id").references(() => categories.id), // For specific_category scope
  selectedProductIds: text("selected_product_ids").array(), // For selected_products scope
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});


// Returns
export const returns = pgTable("returns", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  returnId: varchar("return_id", { length: 100 }).unique().notNull(),
  customerId: varchar("customer_id").references(() => customers.id),
  orderId: varchar("order_id").references(() => orders.id),
  returnDate: timestamp("return_date").defaultNow(),
  returnType: varchar("return_type", { length: 100 }),
  status: returnStatusEnum("status").default('awaiting'),
  shippingCarrier: varchar("shipping_carrier", { length: 255 }),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Return Items
export const returnItems = pgTable("return_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  returnId: varchar("return_id").references(() => returns.id, { onDelete: 'cascade' }).notNull(),
  productId: varchar("product_id").references(() => products.id),
  productName: varchar("product_name", { length: 255 }).notNull(),
  sku: varchar("sku", { length: 100 }),
  quantity: integer("quantity").notNull(),
  price: decimal("price", { precision: 12, scale: 2 }).notNull(),
});

// Expenses
export const expenses = pgTable("expenses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  expenseId: varchar("expense_id", { length: 100 }).unique().notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  category: varchar("category", { length: 100 }),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  currency: currencyEnum("currency").notNull(),
  recurring: recurringEnum("recurring"),
  paymentMethod: varchar("payment_method", { length: 100 }),
  status: expenseStatusEnum("status").default('pending'),
  date: timestamp("date").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Pre-Orders
export const preOrders = pgTable("pre_orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  customerName: varchar("customer_name", { length: 255 }).notNull(),
  facebookId: varchar("facebook_id", { length: 255 }),
  items: text("items").notNull(),
  date: timestamp("date").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

// User Activities
export const userActivities = pgTable("user_activities", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  action: varchar("action", { length: 255 }).notNull(),
  entityType: varchar("entity_type", { length: 100 }),
  entityId: varchar("entity_id", { length: 255 }),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Settings
export const settings = pgTable("settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  key: varchar("key", { length: 255 }).unique().notNull(),
  value: text("value"),
  category: varchar("category", { length: 100 }),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Packing Materials
export const packingMaterials = pgTable("packing_materials", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(),
  code: varchar("code", { length: 50 }).unique(),
  type: varchar("type", { length: 100 }), // box, bubble_wrap, foam, paper, tape, etc.
  size: varchar("size", { length: 100 }), // small, medium, large, or dimensions
  imageUrl: varchar("image_url", { length: 500 }),
  cost: decimal("cost", { precision: 12, scale: 2 }),
  currency: currencyEnum("currency").default('CZK'),
  supplier: varchar("supplier", { length: 255 }),
  stockQuantity: integer("stock_quantity").default(0),
  minStockLevel: integer("min_stock_level").default(10),
  description: text("description"),
  isFragileProtection: boolean("is_fragile_protection").default(false),
  weight: decimal("weight", { precision: 10, scale: 3 }), // in kg
  // Dimensions for cartons
  length: decimal("length", { precision: 10, scale: 2 }), // in cm
  width: decimal("width", { precision: 10, scale: 2 }), // in cm  
  height: decimal("height", { precision: 10, scale: 2 }), // in cm
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Product Files table for storing MSDS, CPNP certificates, leaflets, etc
export const productFiles = pgTable("product_files", {
  id: text("id").primaryKey().$defaultFn(() => `file-${Math.random().toString(36).substr(2, 9)}`),
  productId: text("product_id").references(() => products.id),
  fileName: text("file_name").notNull(),
  fileType: text("file_type").notNull(), // MSDS, CPNP, Leaflet, Manual, Certificate, Other
  fileUrl: text("file_url").notNull(),
  fileSize: integer("file_size"), // in bytes
  mimeType: text("mime_type"),
  description: text("description"),
  uploadedBy: text("uploaded_by"),
  uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
  isActive: boolean("is_active").default(true),
  tags: text("tags").array(), // Additional tags for categorization
});

// Relations
export const categoriesRelations = relations(categories, ({ many }) => ({
  products: many(products),
}));

export const warehousesRelations = relations(warehouses, ({ many }) => ({
  products: many(products),
}));

export const suppliersRelations = relations(suppliers, ({ many }) => ({
  products: many(products),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  category: one(categories, {
    fields: [products.categoryId],
    references: [categories.id],
  }),
  warehouse: one(warehouses, {
    fields: [products.warehouseId],
    references: [warehouses.id],
  }),
  supplier: one(suppliers, {
    fields: [products.supplierId],
    references: [suppliers.id],
  }),
  packingMaterial: one(packingMaterials, {
    fields: [products.packingMaterialId],
    references: [packingMaterials.id],
  }),
  variants: many(productVariants),
  orderItems: many(orderItems),
  files: many(productFiles),
}));

export const packingMaterialsRelations = relations(packingMaterials, ({ many }) => ({
  products: many(products),
}));

export const productFilesRelations = relations(productFiles, ({ one }) => ({
  product: one(products, {
    fields: [productFiles.productId],
    references: [products.id],
  }),
}));

export const productVariantsRelations = relations(productVariants, ({ one }) => ({
  product: one(products, {
    fields: [productVariants.productId],
    references: [products.id],
  }),
}));

export const customersRelations = relations(customers, ({ many }) => ({
  orders: many(orders),
  returns: many(returns),
  customerPrices: many(customerPrices),
}));

export const customerPricesRelations = relations(customerPrices, ({ one }) => ({
  customer: one(customers, {
    fields: [customerPrices.customerId],
    references: [customers.id],
  }),
  product: one(products, {
    fields: [customerPrices.productId],
    references: [products.id],
  }),
  variant: one(productVariants, {
    fields: [customerPrices.variantId],
    references: [productVariants.id],
  }),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  customer: one(customers, {
    fields: [orders.customerId],
    references: [customers.id],
  }),
  biller: one(users, {
    fields: [orders.billerId],
    references: [users.id],
  }),
  items: many(orderItems),
  returns: many(returns),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
  product: one(products, {
    fields: [orderItems.productId],
    references: [products.id],
  }),
  variant: one(productVariants, {
    fields: [orderItems.variantId],
    references: [productVariants.id],
  }),
  customerPrice: one(customerPrices, {
    fields: [orderItems.customerPriceId],
    references: [customerPrices.id],
  }),
}));

export const returnsRelations = relations(returns, ({ one, many }) => ({
  customer: one(customers, {
    fields: [returns.customerId],
    references: [customers.id],
  }),
  order: one(orders, {
    fields: [returns.orderId],
    references: [orders.id],
  }),
  items: many(returnItems),
}));

export const returnItemsRelations = relations(returnItems, ({ one }) => ({
  return: one(returns, {
    fields: [returnItems.returnId],
    references: [returns.id],
  }),
  product: one(products, {
    fields: [returnItems.productId],
    references: [products.id],
  }),
}));

export const salesRelations = relations(sales, ({ }) => ({}));

export const userActivitiesRelations = relations(userActivities, ({ one }) => ({
  user: one(users, {
    fields: [userActivities.userId],
    references: [users.id],
  }),
}));

// Insert schemas
export const insertCategorySchema = createInsertSchema(categories).omit({ id: true, createdAt: true });
export const insertWarehouseSchema = createInsertSchema(warehouses).omit({ id: true, createdAt: true });
export const insertWarehouseFileSchema = createInsertSchema(warehouseFiles).omit({ id: true, createdAt: true });
export const insertSupplierSchema = createInsertSchema(suppliers).omit({ id: true, createdAt: true });
export const insertSupplierFileSchema = createInsertSchema(supplierFiles).omit({ id: true, createdAt: true });
export const insertProductSchema = createInsertSchema(products).omit({ id: true, createdAt: true, updatedAt: true }).extend({
  quantity: z.coerce.number().min(0).optional(),
  lowStockAlert: z.coerce.number().min(0).optional(),
  priceCzk: z.coerce.string().optional(),
  priceEur: z.coerce.string().optional(),
  importCostUsd: z.coerce.string().optional(),
  importCostCzk: z.coerce.string().optional(),
  importCostEur: z.coerce.string().optional(),
  length: z.coerce.string().optional(),
  width: z.coerce.string().optional(),
  height: z.coerce.string().optional(),
  weight: z.coerce.string().optional(),
});
export const insertProductVariantSchema = createInsertSchema(productVariants).omit({ id: true, createdAt: true }).extend({
  quantity: z.coerce.number().min(0).optional(),
  importCostUsd: z.coerce.string().optional(),
  importCostCzk: z.coerce.string().optional(),
  importCostEur: z.coerce.string().optional(),
});
export const insertCustomerSchema = createInsertSchema(customers).omit({ id: true, createdAt: true, updatedAt: true });
export const insertCustomerPriceSchema = createInsertSchema(customerPrices).omit({ id: true, createdAt: true, updatedAt: true }).extend({
  price: z.coerce.string(),
  validFrom: z.string().or(z.date()),
  validTo: z.string().or(z.date()).optional(),
});
export const insertOrderSchema = createInsertSchema(orders).omit({ id: true, createdAt: true, updatedAt: true, shippedAt: true }).extend({
  totalAmount: z.coerce.string().optional(),
  shippingCost: z.coerce.string().optional(),
  discountAmount: z.coerce.string().optional(),
});
export const insertOrderItemSchema = createInsertSchema(orderItems).omit({ id: true }).extend({
  price: z.coerce.string(), // Main price field
  unitPrice: z.coerce.string().optional(),
  appliedPrice: z.coerce.string().optional(),
  discount: z.coerce.string().optional(),
  tax: z.coerce.string().optional(),
  total: z.coerce.string(),
  quantity: z.coerce.number().min(1),
});
export const insertPurchaseSchema = createInsertSchema(purchases).omit({ id: true, createdAt: true, updatedAt: true });
export const insertIncomingShipmentSchema = createInsertSchema(incomingShipments).omit({ id: true, createdAt: true, updatedAt: true });
export const insertSaleSchema = createInsertSchema(sales).omit({ id: true, discountId: true, createdAt: true, updatedAt: true }).extend({
  discountType: z.enum(['percentage', 'fixed_amount', 'buy_x_get_y']),
  percentage: z.coerce.number().min(1).max(100).optional(),
  fixedAmount: z.coerce.string().optional(),
  buyQuantity: z.coerce.number().min(1).optional(),
  getQuantity: z.coerce.number().min(1).optional(),
  getProductType: z.enum(['same_product', 'different_product']).optional(),
  getProductId: z.string().optional(),
  applicationScope: z.enum(['specific_product', 'all_products', 'specific_category', 'selected_products']),
  productId: z.string().optional(),
  categoryId: z.string().optional(),
  selectedProductIds: z.array(z.string()).optional(),
});
export const insertReturnSchema = createInsertSchema(returns).omit({ id: true, createdAt: true, updatedAt: true });
export const insertReturnItemSchema = createInsertSchema(returnItems).omit({ id: true });
export const insertExpenseSchema = createInsertSchema(expenses).omit({ id: true, createdAt: true, updatedAt: true }).extend({
  totalCost: z.coerce.string(),
});
export const insertProductBundleSchema = createInsertSchema(productBundles).omit({ id: true, createdAt: true, updatedAt: true });
export const insertBundleItemSchema = createInsertSchema(bundleItems).omit({ id: true, createdAt: true });
export const insertPreOrderSchema = createInsertSchema(preOrders).omit({ id: true, createdAt: true });
export const insertUserActivitySchema = createInsertSchema(userActivities).omit({ id: true, createdAt: true });
export const insertSettingSchema = createInsertSchema(settings).omit({ id: true, updatedAt: true });
export const insertPackingMaterialSchema = createInsertSchema(packingMaterials).omit({ id: true, createdAt: true, updatedAt: true });
export const insertPickPackLogSchema = createInsertSchema(pickPackLogs).omit({ id: true, timestamp: true, createdAt: true });

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type Warehouse = typeof warehouses.$inferSelect;
export type InsertWarehouse = z.infer<typeof insertWarehouseSchema>;
export type WarehouseFile = typeof warehouseFiles.$inferSelect;
export type InsertWarehouseFile = z.infer<typeof insertWarehouseFileSchema>;
export type Supplier = typeof suppliers.$inferSelect;
export type InsertSupplier = z.infer<typeof insertSupplierSchema>;
export type SupplierFile = typeof supplierFiles.$inferSelect;
export type InsertSupplierFile = z.infer<typeof insertSupplierFileSchema>;
export type Product = typeof products.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type ProductVariant = typeof productVariants.$inferSelect;
export type InsertProductVariant = z.infer<typeof insertProductVariantSchema>;
export type Customer = typeof customers.$inferSelect;
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;
export type CustomerPrice = typeof customerPrices.$inferSelect;
export type InsertCustomerPrice = z.infer<typeof insertCustomerPriceSchema>;
export type Order = typeof orders.$inferSelect;
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type OrderItem = typeof orderItems.$inferSelect;
export type InsertOrderItem = z.infer<typeof insertOrderItemSchema>;
export type Purchase = typeof purchases.$inferSelect;
export type InsertPurchase = z.infer<typeof insertPurchaseSchema>;
export type IncomingShipment = typeof incomingShipments.$inferSelect;
export type InsertIncomingShipment = z.infer<typeof insertIncomingShipmentSchema>;
export type Sale = typeof sales.$inferSelect;
export type InsertSale = z.infer<typeof insertSaleSchema>;
export type Return = typeof returns.$inferSelect;
export type InsertReturn = z.infer<typeof insertReturnSchema>;
export type ReturnItem = typeof returnItems.$inferSelect;
export type InsertReturnItem = z.infer<typeof insertReturnItemSchema>;
export type Expense = typeof expenses.$inferSelect;
export type InsertExpense = z.infer<typeof insertExpenseSchema>;
export type ProductBundle = typeof productBundles.$inferSelect;
export type InsertProductBundle = z.infer<typeof insertProductBundleSchema>;
export type BundleItem = typeof bundleItems.$inferSelect;
export type InsertBundleItem = z.infer<typeof insertBundleItemSchema>;
export type PreOrder = typeof preOrders.$inferSelect;
export type InsertPreOrder = z.infer<typeof insertPreOrderSchema>;
export type UserActivity = typeof userActivities.$inferSelect;
export type InsertUserActivity = z.infer<typeof insertUserActivitySchema>;
export type Setting = typeof settings.$inferSelect;
export type InsertSetting = z.infer<typeof insertSettingSchema>;

// Warehouse Location schemas
export const insertWarehouseLocationSchema = createInsertSchema(warehouseLocations).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});
export const insertInventoryBalanceSchema = createInsertSchema(inventoryBalances).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});

// Warehouse Location types
export type WarehouseLocation = typeof warehouseLocations.$inferSelect;
export type InsertWarehouseLocation = z.infer<typeof insertWarehouseLocationSchema>;
export type InventoryBalance = typeof inventoryBalances.$inferSelect;
export type InsertInventoryBalance = z.infer<typeof insertInventoryBalanceSchema>;
export type PackingMaterial = typeof packingMaterials.$inferSelect;
export type InsertPackingMaterial = z.infer<typeof insertPackingMaterialSchema>;
export type PickPackLog = typeof pickPackLogs.$inferSelect;
export type InsertPickPackLog = z.infer<typeof insertPickPackLogSchema>;
