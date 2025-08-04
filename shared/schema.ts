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
export const orderStatusEnum = pgEnum('order_status', ['pending', 'to_fulfill', 'shipped']);
export const paymentStatusEnum = pgEnum('payment_status', ['pending', 'paid', 'pay_later']);
export const orderPriorityEnum = pgEnum('order_priority', ['low', 'medium', 'high']);
export const discountTypeEnum = pgEnum('discount_type', ['flat', 'rate']);
export const purchaseStatusEnum = pgEnum('purchase_status', ['purchased', 'processing', 'ready_to_ship', 'shipped', 'delivered']);
export const returnStatusEnum = pgEnum('return_status', ['awaiting', 'processing', 'completed']);
export const expenseStatusEnum = pgEnum('expense_status', ['pending', 'overdue', 'paid']);
export const recurringEnum = pgEnum('recurring', ['daily', 'weekly', 'monthly', 'yearly']);
export const shippingMethodEnum = pgEnum('shipping_method', ['GLS', 'PPL', 'DHL', 'DPD']);
export const paymentMethodEnum = pgEnum('payment_method', ['Bank Transfer', 'PayPal', 'COD', 'Cash']);

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
  name: varchar("name", { length: 255 }).notNull(),
  address: text("address"),
  city: varchar("city", { length: 100 }),
  country: varchar("country", { length: 100 }).default("Czech Republic"),
  zipCode: varchar("zip_code", { length: 20 }),
  phone: varchar("phone", { length: 20 }),
  email: varchar("email", { length: 255 }),
  manager: varchar("manager", { length: 255 }),
  capacity: integer("capacity").default(0),
  type: varchar("type", { length: 50 }).default("branch"), // main, branch, temporary
  createdAt: timestamp("created_at").defaultNow(),
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
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  shippedAt: timestamp("shipped_at"),
});

// Order Items
export const orderItems = pgTable("order_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: varchar("order_id").references(() => orders.id, { onDelete: 'cascade' }).notNull(),
  productId: varchar("product_id").references(() => products.id),
  productName: varchar("product_name", { length: 255 }).notNull(),
  sku: varchar("sku", { length: 100 }),
  quantity: integer("quantity").notNull(),
  price: decimal("price", { precision: 12, scale: 2 }).notNull(),
  discount: decimal("discount", { precision: 12, scale: 2 }).default('0'),
  tax: decimal("tax", { precision: 12, scale: 2 }).default('0'),
  total: decimal("total", { precision: 12, scale: 2 }).notNull(),
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
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  code: varchar("code", { length: 100 }).unique(),
  type: varchar("type", { length: 20 }).default('percentage'), // percentage, fixed
  value: decimal("value", { precision: 12, scale: 2 }).notNull(),
  currency: currencyEnum("currency").default('EUR'),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  minimumAmount: decimal("minimum_amount", { precision: 12, scale: 2 }),
  maximumDiscount: decimal("maximum_discount", { precision: 12, scale: 2 }),
  status: varchar("status", { length: 20 }).default('active'),
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
  variants: many(productVariants),
  orderItems: many(orderItems),
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
export const insertOrderSchema = createInsertSchema(orders).omit({ id: true, createdAt: true, updatedAt: true, shippedAt: true }).extend({
  totalAmount: z.coerce.string().optional(),
  shippingCost: z.coerce.string().optional(),
  discountAmount: z.coerce.string().optional(),
});
export const insertOrderItemSchema = createInsertSchema(orderItems).omit({ id: true }).extend({
  unitPrice: z.coerce.string().optional(),
  totalPrice: z.coerce.string().optional(),
  quantity: z.coerce.number().min(1),
});
export const insertPurchaseSchema = createInsertSchema(purchases).omit({ id: true, createdAt: true, updatedAt: true });
export const insertIncomingShipmentSchema = createInsertSchema(incomingShipments).omit({ id: true, createdAt: true, updatedAt: true });
export const insertSaleSchema = createInsertSchema(sales).omit({ id: true, createdAt: true, updatedAt: true }).extend({
  value: z.coerce.string(),
  minimumAmount: z.coerce.string().optional(),
  maximumDiscount: z.coerce.string().optional(),
});
export const insertReturnSchema = createInsertSchema(returns).omit({ id: true, createdAt: true, updatedAt: true });
export const insertReturnItemSchema = createInsertSchema(returnItems).omit({ id: true });
export const insertExpenseSchema = createInsertSchema(expenses).omit({ id: true, createdAt: true, updatedAt: true }).extend({
  totalCost: z.coerce.string(),
});
export const insertPreOrderSchema = createInsertSchema(preOrders).omit({ id: true, createdAt: true });
export const insertUserActivitySchema = createInsertSchema(userActivities).omit({ id: true, createdAt: true });
export const insertSettingSchema = createInsertSchema(settings).omit({ id: true, updatedAt: true });

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type Warehouse = typeof warehouses.$inferSelect;
export type InsertWarehouse = z.infer<typeof insertWarehouseSchema>;
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
export type PreOrder = typeof preOrders.$inferSelect;
export type InsertPreOrder = z.infer<typeof insertPreOrderSchema>;
export type UserActivity = typeof userActivities.$inferSelect;
export type InsertUserActivity = z.infer<typeof insertUserActivitySchema>;
export type Setting = typeof settings.$inferSelect;
export type InsertSetting = z.infer<typeof insertSettingSchema>;
