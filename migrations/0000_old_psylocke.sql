CREATE TYPE "public"."currency" AS ENUM('CZK', 'EUR', 'USD', 'VND', 'CNY');--> statement-breakpoint
CREATE TYPE "public"."discount_type" AS ENUM('flat', 'rate');--> statement-breakpoint
CREATE TYPE "public"."expense_status" AS ENUM('pending', 'overdue', 'paid');--> statement-breakpoint
CREATE TYPE "public"."location_type" AS ENUM('ZONE', 'AISLE', 'RACK', 'SHELF', 'BIN', 'STAGE', 'DOCK');--> statement-breakpoint
CREATE TYPE "public"."order_priority" AS ENUM('low', 'medium', 'high');--> statement-breakpoint
CREATE TYPE "public"."order_status" AS ENUM('pending', 'to_fulfill', 'shipped');--> statement-breakpoint
CREATE TYPE "public"."payment_method" AS ENUM('Bank Transfer', 'PayPal', 'COD', 'Cash');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('pending', 'paid', 'pay_later');--> statement-breakpoint
CREATE TYPE "public"."purchase_status" AS ENUM('purchased', 'processing', 'ready_to_ship', 'shipped', 'delivered');--> statement-breakpoint
CREATE TYPE "public"."recurring" AS ENUM('daily', 'weekly', 'monthly', 'yearly');--> statement-breakpoint
CREATE TYPE "public"."return_status" AS ENUM('awaiting', 'processing', 'completed');--> statement-breakpoint
CREATE TYPE "public"."shipping_method" AS ENUM('GLS', 'PPL', 'DHL', 'DPD');--> statement-breakpoint
CREATE TYPE "public"."temperature_type" AS ENUM('ambient', 'cool', 'warm');--> statement-breakpoint
CREATE TYPE "public"."warehouse_status" AS ENUM('active', 'inactive', 'maintenance', 'rented');--> statement-breakpoint
CREATE TABLE "bundle_items" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bundle_id" varchar NOT NULL,
	"product_id" varchar,
	"variant_id" varchar,
	"quantity" integer DEFAULT 1 NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "customer_prices" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" varchar NOT NULL,
	"product_id" varchar,
	"variant_id" varchar,
	"price" numeric(12, 2) NOT NULL,
	"currency" "currency" NOT NULL,
	"valid_from" timestamp DEFAULT now() NOT NULL,
	"valid_to" timestamp,
	"is_active" boolean DEFAULT true,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"facebook_name" varchar(255),
	"facebook_id" varchar(255),
	"email" varchar(255),
	"phone" varchar(20),
	"address" text,
	"city" varchar(100),
	"state" varchar(100),
	"zip_code" varchar(20),
	"country" varchar(100),
	"type" varchar(50) DEFAULT 'regular',
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "expenses" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"expense_id" varchar(100) NOT NULL,
	"name" varchar(255) NOT NULL,
	"category" varchar(100),
	"amount" numeric(12, 2) NOT NULL,
	"currency" "currency" NOT NULL,
	"recurring" "recurring",
	"payment_method" varchar(100),
	"status" "expense_status" DEFAULT 'pending',
	"date" timestamp NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "expenses_expense_id_unique" UNIQUE("expense_id")
);
--> statement-breakpoint
CREATE TABLE "incoming_shipments" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shipment_id" varchar(100) NOT NULL,
	"shipping_method" varchar(255),
	"shipping_carrier" varchar(255),
	"currency" "currency" NOT NULL,
	"shipping_cost" numeric(12, 2) DEFAULT '0',
	"date_shipped" timestamp,
	"date_delivered" timestamp,
	"status" varchar(50) DEFAULT 'in_transit',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "incoming_shipments_shipment_id_unique" UNIQUE("shipment_id")
);
--> statement-breakpoint
CREATE TABLE "inventory_balances" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"location_id" varchar NOT NULL,
	"product_id" varchar,
	"variant_id" varchar,
	"quantity" integer DEFAULT 0 NOT NULL,
	"lot_number" varchar(100),
	"expiry_date" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "order_item_bundle_components" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_item_id" varchar NOT NULL,
	"component_name" varchar(255) NOT NULL,
	"color_number" varchar(50),
	"quantity" integer DEFAULT 1 NOT NULL,
	"picked" boolean DEFAULT false,
	"location" varchar(100),
	"barcode" varchar(50),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "order_items" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" varchar NOT NULL,
	"product_id" varchar,
	"variant_id" varchar,
	"product_name" varchar(255) NOT NULL,
	"sku" varchar(100),
	"quantity" integer NOT NULL,
	"price" numeric(12, 2) NOT NULL,
	"unit_price" numeric(12, 2),
	"applied_price" numeric(12, 2),
	"currency" "currency",
	"customer_price_id" varchar,
	"discount" numeric(12, 2) DEFAULT '0',
	"tax" numeric(12, 2) DEFAULT '0',
	"total" numeric(12, 2) NOT NULL,
	"picked_quantity" integer DEFAULT 0,
	"packed_quantity" integer DEFAULT 0,
	"warehouse_location" varchar(100),
	"barcode" varchar(50),
	"image" varchar(500),
	"is_bundle" boolean DEFAULT false,
	"bundle_id" varchar,
	"length" numeric(10, 2),
	"width" numeric(10, 2),
	"height" numeric(10, 2),
	"weight" numeric(10, 3),
	"is_fragile" boolean DEFAULT false,
	"is_hazardous" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" varchar(50) NOT NULL,
	"customer_id" varchar,
	"biller_id" varchar,
	"currency" "currency" NOT NULL,
	"order_status" "order_status" DEFAULT 'pending',
	"payment_status" "payment_status" DEFAULT 'pending',
	"priority" "order_priority" DEFAULT 'medium',
	"subtotal" numeric(12, 2) DEFAULT '0',
	"discount_type" "discount_type",
	"discount_value" numeric(12, 2) DEFAULT '0',
	"tax_rate" numeric(5, 2) DEFAULT '0',
	"tax_amount" numeric(12, 2) DEFAULT '0',
	"shipping_method" "shipping_method",
	"payment_method" "payment_method",
	"shipping_cost" numeric(12, 2) DEFAULT '0',
	"actual_shipping_cost" numeric(12, 2) DEFAULT '0',
	"grand_total" numeric(12, 2) NOT NULL,
	"notes" text,
	"attachment_url" varchar(500),
	"pick_status" varchar(50) DEFAULT 'not_started',
	"pack_status" varchar(50) DEFAULT 'not_started',
	"picked_by" varchar(255),
	"packed_by" varchar(255),
	"pick_start_time" timestamp,
	"pick_end_time" timestamp,
	"pack_start_time" timestamp,
	"pack_end_time" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"shipped_at" timestamp,
	CONSTRAINT "orders_order_id_unique" UNIQUE("order_id")
);
--> statement-breakpoint
CREATE TABLE "pre_orders" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_name" varchar(255) NOT NULL,
	"facebook_id" varchar(255),
	"items" text NOT NULL,
	"date" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "product_bundles" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bundle_id" varchar(50) NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"sku" varchar(100),
	"is_active" boolean DEFAULT true,
	"price_czk" numeric(12, 2),
	"price_eur" numeric(12, 2),
	"discount_percentage" numeric(5, 2) DEFAULT '0',
	"image_url" varchar(500),
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "product_bundles_bundle_id_unique" UNIQUE("bundle_id"),
	CONSTRAINT "product_bundles_sku_unique" UNIQUE("sku")
);
--> statement-breakpoint
CREATE TABLE "product_variants" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" varchar NOT NULL,
	"name" varchar(255) NOT NULL,
	"barcode" varchar(50),
	"quantity" integer DEFAULT 0,
	"import_cost_usd" numeric(12, 2),
	"import_cost_czk" numeric(12, 2),
	"import_cost_eur" numeric(12, 2),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"english_name" varchar(255),
	"sku" varchar(100) NOT NULL,
	"category_id" varchar,
	"warehouse_id" varchar,
	"warehouse_location" varchar(100),
	"supplier_id" varchar,
	"description" text,
	"quantity" integer DEFAULT 0,
	"low_stock_alert" integer DEFAULT 5,
	"price_czk" numeric(12, 2),
	"price_eur" numeric(12, 2),
	"import_cost_usd" numeric(12, 2),
	"import_cost_czk" numeric(12, 2),
	"import_cost_eur" numeric(12, 2),
	"supplier_link" text,
	"image_url" varchar(500),
	"barcode" varchar(50),
	"length" numeric(10, 2),
	"width" numeric(10, 2),
	"height" numeric(10, 2),
	"weight" numeric(10, 3),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "products_sku_unique" UNIQUE("sku")
);
--> statement-breakpoint
CREATE TABLE "purchases" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_name" varchar(255) NOT NULL,
	"sku" varchar(100),
	"quantity" integer NOT NULL,
	"import_price" numeric(12, 2) NOT NULL,
	"import_currency" "currency" NOT NULL,
	"supplier_name" varchar(255),
	"supplier_url" text,
	"status" "purchase_status" DEFAULT 'purchased',
	"shipment_id" varchar(100),
	"description" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "return_items" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"return_id" varchar NOT NULL,
	"product_id" varchar,
	"product_name" varchar(255) NOT NULL,
	"sku" varchar(100),
	"quantity" integer NOT NULL,
	"price" numeric(12, 2) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "returns" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"return_id" varchar(100) NOT NULL,
	"customer_id" varchar,
	"order_id" varchar,
	"return_date" timestamp DEFAULT now(),
	"return_type" varchar(100),
	"status" "return_status" DEFAULT 'awaiting',
	"shipping_carrier" varchar(255),
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "returns_return_id_unique" UNIQUE("return_id")
);
--> statement-breakpoint
CREATE TABLE "sales" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"discount_id" varchar(100) NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"discount_type" varchar(20) DEFAULT 'percentage' NOT NULL,
	"percentage" integer,
	"fixed_amount" numeric(12, 2),
	"buy_quantity" integer,
	"get_quantity" integer,
	"get_product_type" varchar(20),
	"get_product_id" varchar,
	"status" varchar(20) DEFAULT 'active',
	"start_date" timestamp NOT NULL,
	"end_date" timestamp NOT NULL,
	"application_scope" varchar(50) NOT NULL,
	"product_id" varchar,
	"category_id" varchar,
	"selected_product_ids" text[],
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "sales_discount_id_unique" UNIQUE("discount_id")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"sid" varchar PRIMARY KEY NOT NULL,
	"sess" jsonb NOT NULL,
	"expire" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" varchar(255) NOT NULL,
	"value" text,
	"category" varchar(100),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "settings_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "supplier_files" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"supplier_id" varchar NOT NULL,
	"file_name" varchar(255) NOT NULL,
	"file_type" varchar(100) NOT NULL,
	"file_url" text NOT NULL,
	"file_size" integer,
	"uploaded_by" varchar,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "suppliers" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"contact_person" varchar(255),
	"email" varchar(255),
	"phone" varchar(20),
	"address" text,
	"country" varchar(100),
	"website" varchar(255),
	"supplier_link" text,
	"last_purchase_date" timestamp,
	"total_purchased" numeric(12, 2) DEFAULT '0',
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_activities" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar,
	"action" varchar(255) NOT NULL,
	"entity_type" varchar(100),
	"entity_id" varchar(255),
	"description" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar,
	"first_name" varchar,
	"last_name" varchar,
	"profile_image_url" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "warehouse_files" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"warehouse_id" varchar NOT NULL,
	"file_name" varchar(255) NOT NULL,
	"file_type" varchar(100) NOT NULL,
	"file_url" text NOT NULL,
	"file_size" integer,
	"uploaded_by" varchar,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "warehouse_locations" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"warehouse_id" varchar NOT NULL,
	"parent_id" varchar,
	"type" "location_type" NOT NULL,
	"code" varchar(50) NOT NULL,
	"address" varchar(255) NOT NULL,
	"pickable" boolean DEFAULT true,
	"putaway_allowed" boolean DEFAULT true,
	"sort_key" integer DEFAULT 0,
	"temperature" "temperature_type",
	"hazmat" boolean DEFAULT false,
	"height_cm" integer,
	"width_cm" integer,
	"depth_cm" integer,
	"max_weight" integer,
	"current_occupancy" integer DEFAULT 0,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "warehouse_locations_address_unique" UNIQUE("address")
);
--> statement-breakpoint
CREATE TABLE "warehouses" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(20),
	"name" varchar(255) NOT NULL,
	"location" varchar(255),
	"address" text,
	"city" varchar(100),
	"country" varchar(100) DEFAULT 'Czech Republic',
	"zip_code" varchar(20),
	"phone" varchar(20),
	"email" varchar(255),
	"manager" varchar(255),
	"capacity" integer DEFAULT 0,
	"floor_area" numeric(10, 2),
	"type" varchar(50) DEFAULT 'branch',
	"status" "warehouse_status" DEFAULT 'active',
	"rented_from_date" timestamp,
	"expense_id" varchar(255),
	"contact" varchar(255),
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "warehouses_code_unique" UNIQUE("code")
);
--> statement-breakpoint
ALTER TABLE "bundle_items" ADD CONSTRAINT "bundle_items_bundle_id_product_bundles_id_fk" FOREIGN KEY ("bundle_id") REFERENCES "public"."product_bundles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bundle_items" ADD CONSTRAINT "bundle_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bundle_items" ADD CONSTRAINT "bundle_items_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_prices" ADD CONSTRAINT "customer_prices_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_prices" ADD CONSTRAINT "customer_prices_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_prices" ADD CONSTRAINT "customer_prices_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_balances" ADD CONSTRAINT "inventory_balances_location_id_warehouse_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."warehouse_locations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_balances" ADD CONSTRAINT "inventory_balances_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_balances" ADD CONSTRAINT "inventory_balances_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_item_bundle_components" ADD CONSTRAINT "order_item_bundle_components_order_item_id_order_items_id_fk" FOREIGN KEY ("order_item_id") REFERENCES "public"."order_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_customer_price_id_customer_prices_id_fk" FOREIGN KEY ("customer_price_id") REFERENCES "public"."customer_prices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_bundle_id_product_bundles_id_fk" FOREIGN KEY ("bundle_id") REFERENCES "public"."product_bundles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_biller_id_users_id_fk" FOREIGN KEY ("biller_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "return_items" ADD CONSTRAINT "return_items_return_id_returns_id_fk" FOREIGN KEY ("return_id") REFERENCES "public"."returns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "return_items" ADD CONSTRAINT "return_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "returns" ADD CONSTRAINT "returns_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "returns" ADD CONSTRAINT "returns_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_get_product_id_products_id_fk" FOREIGN KEY ("get_product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_files" ADD CONSTRAINT "supplier_files_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_files" ADD CONSTRAINT "supplier_files_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_activities" ADD CONSTRAINT "user_activities_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warehouse_files" ADD CONSTRAINT "warehouse_files_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warehouse_files" ADD CONSTRAINT "warehouse_files_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warehouse_locations" ADD CONSTRAINT "warehouse_locations_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "IDX_session_expire" ON "sessions" USING btree ("expire");