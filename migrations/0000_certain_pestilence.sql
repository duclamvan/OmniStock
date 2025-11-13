CREATE TABLE "app_settings" (
	"key" varchar PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL,
	"category" varchar DEFAULT 'general',
	"description" text,
	"updated_at" timestamp DEFAULT now(),
	"updated_by" varchar
);
--> statement-breakpoint
CREATE TABLE "bundle_items" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bundle_id" varchar NOT NULL,
	"product_id" varchar,
	"variant_id" varchar,
	"quantity" integer DEFAULT 1 NOT NULL,
	"product_name" varchar,
	"variant_name" varchar,
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"name_en" text,
	"name_cz" text,
	"name_vn" text,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "consolidation_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"consolidation_id" integer NOT NULL,
	"item_id" integer NOT NULL,
	"item_type" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "consolidations" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"location" text NOT NULL,
	"shipping_method" text NOT NULL,
	"warehouse" text NOT NULL,
	"notes" text,
	"target_weight" numeric(10, 3),
	"max_items" integer,
	"status" text DEFAULT 'preparing' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cost_allocations" (
	"id" serial PRIMARY KEY NOT NULL,
	"shipment_id" integer NOT NULL,
	"custom_item_id" integer NOT NULL,
	"cost_type" text NOT NULL,
	"basis" text NOT NULL,
	"amount_allocated_base" numeric(12, 4) NOT NULL,
	"details_json" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "custom_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"source" text NOT NULL,
	"order_number" text,
	"quantity" integer DEFAULT 1 NOT NULL,
	"unit_price" numeric(10, 2) DEFAULT '0',
	"weight" numeric(10, 3) DEFAULT '0',
	"dimensions" text,
	"tracking_number" text,
	"notes" text,
	"customer_name" text,
	"customer_email" text,
	"status" text DEFAULT 'available' NOT NULL,
	"classification" text DEFAULT 'general',
	"purchase_order_id" integer,
	"order_items" json,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "customer_billing_addresses" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" varchar NOT NULL,
	"first_name" varchar,
	"last_name" varchar,
	"company" varchar,
	"email" varchar,
	"tel" varchar,
	"street" varchar,
	"street_number" varchar,
	"city" varchar,
	"zip_code" varchar,
	"country" varchar,
	"vat_id" varchar,
	"ico" varchar,
	"is_primary" boolean DEFAULT false,
	"label" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "customer_shipping_addresses" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" varchar NOT NULL,
	"first_name" varchar NOT NULL,
	"last_name" varchar NOT NULL,
	"company" varchar,
	"email" varchar,
	"tel" varchar,
	"street" varchar NOT NULL,
	"street_number" varchar,
	"city" varchar NOT NULL,
	"zip_code" varchar NOT NULL,
	"country" varchar NOT NULL,
	"is_primary" boolean DEFAULT false,
	"label" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar NOT NULL,
	"facebook_name" varchar,
	"facebook_url" varchar,
	"facebook_id" varchar,
	"email" varchar,
	"phone" varchar,
	"address" text,
	"city" varchar,
	"zip_code" varchar,
	"country" varchar,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"type" varchar DEFAULT 'regular',
	"vat_id" varchar,
	"tax_id" varchar,
	"first_order_date" timestamp,
	"last_order_date" timestamp,
	"total_orders" integer DEFAULT 0,
	"total_spent" numeric DEFAULT '0',
	"average_order_value" numeric DEFAULT '0',
	"customer_rank" varchar,
	"last_contact_date" timestamp,
	"preferred_language" varchar DEFAULT 'cs',
	"preferred_currency" varchar DEFAULT 'EUR',
	"billing_first_name" varchar,
	"billing_last_name" varchar,
	"billing_company" varchar,
	"billing_email" varchar,
	"billing_tel" varchar,
	"billing_street" varchar,
	"billing_street_number" varchar,
	"billing_city" varchar,
	"billing_zip_code" varchar,
	"billing_country" varchar,
	"ico" varchar,
	"dic" varchar,
	"vat_number" varchar,
	"vat_valid" boolean,
	"vat_checked_at" timestamp,
	"vat_company_name" varchar,
	"vat_company_address" text,
	"profile_picture_url" varchar
);
--> statement-breakpoint
CREATE TABLE "daily_sequences" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_type" varchar NOT NULL,
	"date" date NOT NULL,
	"current_sequence" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "delivery_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"shipment_id" integer,
	"carrier" text NOT NULL,
	"origin" text NOT NULL,
	"destination" text NOT NULL,
	"shipping_method" text NOT NULL,
	"dispatched_at" timestamp NOT NULL,
	"delivered_at" timestamp NOT NULL,
	"estimated_days" integer,
	"actual_days" integer NOT NULL,
	"seasonal_factor" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "discounts" (
	"id" serial PRIMARY KEY NOT NULL,
	"discount_id" text NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"percentage" numeric(5, 2),
	"value" numeric(10, 2),
	"min_order_amount" numeric(10, 2),
	"status" text DEFAULT 'active',
	"start_date" date,
	"end_date" date,
	"application_scope" text DEFAULT 'order',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "discounts_discount_id_unique" UNIQUE("discount_id")
);
--> statement-breakpoint
CREATE TABLE "expenses" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"expense_id" varchar NOT NULL,
	"name" varchar NOT NULL,
	"category" varchar,
	"amount" numeric NOT NULL,
	"currency" varchar DEFAULT 'CZK',
	"payment_method" varchar,
	"status" varchar DEFAULT 'pending',
	"date" timestamp NOT NULL,
	"description" text,
	"notes" text,
	"is_recurring" boolean DEFAULT false,
	"recurring_type" varchar,
	"recurring_interval" integer DEFAULT 1,
	"recurring_day_of_week" integer,
	"recurring_day_of_month" integer,
	"recurring_month" integer,
	"recurring_day" integer,
	"recurring_start_date" timestamp,
	"recurring_end_date" timestamp,
	"parent_expense_id" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "import_purchases" (
	"id" serial PRIMARY KEY NOT NULL,
	"supplier" text NOT NULL,
	"location" text DEFAULT 'China' NOT NULL,
	"tracking_number" text,
	"estimated_arrival" timestamp,
	"notes" text,
	"shipping_cost" numeric(10, 2) DEFAULT '0',
	"shipping_currency" text DEFAULT 'USD',
	"consolidation" text DEFAULT 'No',
	"total_cost" numeric(10, 2) DEFAULT '0',
	"payment_currency" text DEFAULT 'USD',
	"total_paid" numeric(10, 2) DEFAULT '0',
	"purchase_currency" text DEFAULT 'USD',
	"purchase_total" numeric(10, 2) DEFAULT '0',
	"exchange_rate" numeric(10, 6) DEFAULT '1',
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "landed_costs" (
	"id" serial PRIMARY KEY NOT NULL,
	"receipt_id" integer NOT NULL,
	"calculation_method" text NOT NULL,
	"base_cost" numeric(10, 2) NOT NULL,
	"shipping_cost" numeric(10, 2) NOT NULL,
	"customs_duty" numeric(10, 2) DEFAULT '0',
	"taxes" numeric(10, 2) DEFAULT '0',
	"handling_fees" numeric(10, 2) DEFAULT '0',
	"insurance_cost" numeric(10, 2) DEFAULT '0',
	"total_landed_cost" numeric(10, 2) NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"exchange_rates" jsonb,
	"notes" text,
	"approved_by" text,
	"approved_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "layout_bins" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"layout_id" varchar NOT NULL,
	"code" text NOT NULL,
	"row" text NOT NULL,
	"column" integer NOT NULL,
	"x" numeric(10, 2) NOT NULL,
	"y" numeric(10, 2) NOT NULL,
	"width" numeric(10, 2) NOT NULL,
	"height" numeric(10, 2) NOT NULL,
	"capacity" integer DEFAULT 100 NOT NULL,
	"type" text DEFAULT 'standard' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_carton_items" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plan_id" varchar NOT NULL,
	"carton_number" integer NOT NULL,
	"carton_id" varchar,
	"order_item_id" varchar,
	"product_id" varchar,
	"quantity" integer NOT NULL,
	"item_weight_kg" numeric(10, 2) NOT NULL,
	"ai_estimated" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_carton_plans" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" varchar NOT NULL,
	"total_cartons" integer NOT NULL,
	"total_weight_kg" numeric(10, 2) NOT NULL,
	"avg_utilization" numeric(5, 2),
	"suggestions" jsonb,
	"total_shipping_cost" numeric(10, 2),
	"shipping_currency" varchar,
	"ai_confidence_score" numeric(3, 2),
	"status" varchar DEFAULT 'draft' NOT NULL,
	"checksum" varchar,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_cartons" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" varchar NOT NULL,
	"carton_number" integer NOT NULL,
	"carton_type" varchar NOT NULL,
	"carton_id" varchar,
	"weight" numeric(10, 3),
	"payload_weight_kg" numeric(10, 3),
	"inner_length_cm" numeric(10, 2),
	"inner_width_cm" numeric(10, 2),
	"inner_height_cm" numeric(10, 2),
	"label_url" text,
	"label_printed" boolean DEFAULT false,
	"tracking_number" text,
	"ai_weight_calculation" jsonb,
	"ai_plan_id" varchar,
	"source" varchar DEFAULT 'manual',
	"item_allocations" jsonb,
	"volume_utilization" numeric(5, 2),
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_files" (
	"id" text PRIMARY KEY NOT NULL,
	"order_id" text,
	"file_name" text NOT NULL,
	"file_url" text NOT NULL,
	"file_size" integer,
	"mime_type" text,
	"uploaded_by" text,
	"uploaded_at" timestamp NOT NULL,
	"is_active" boolean DEFAULT true
);
--> statement-breakpoint
CREATE TABLE "order_fulfillment_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" varchar NOT NULL,
	"user_id" varchar NOT NULL,
	"activity_type" varchar NOT NULL,
	"started_at" timestamp NOT NULL,
	"completed_at" timestamp,
	"item_count" integer DEFAULT 0 NOT NULL,
	"total_quantity" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_items" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" varchar NOT NULL,
	"product_id" varchar,
	"service_id" varchar,
	"bundle_id" varchar,
	"product_name" varchar,
	"sku" varchar,
	"quantity" integer NOT NULL,
	"price" numeric(10, 2),
	"discount" numeric(10, 2),
	"tax" numeric(10, 2),
	"total" numeric(10, 2),
	"variant_id" varchar,
	"unit_price" numeric(10, 2),
	"applied_price" numeric(10, 2),
	"currency" varchar,
	"customer_price_id" varchar,
	"picked_quantity" integer,
	"packed_quantity" integer,
	"warehouse_location" varchar,
	"barcode" varchar,
	"image" varchar,
	"pick_start_time" timestamp,
	"pick_end_time" timestamp,
	"pack_start_time" timestamp,
	"pack_end_time" timestamp,
	"notes" text,
	"landing_cost" numeric(10, 4),
	"variant_name" varchar
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" varchar NOT NULL,
	"customer_id" varchar,
	"shipping_address_id" varchar,
	"biller_id" varchar,
	"currency" varchar DEFAULT 'CZK',
	"order_status" varchar DEFAULT 'pending',
	"payment_status" varchar DEFAULT 'pending',
	"priority" varchar DEFAULT 'medium',
	"subtotal" numeric DEFAULT '0',
	"discount_type" varchar,
	"discount_value" numeric DEFAULT '0',
	"tax_rate" numeric DEFAULT '0',
	"tax_amount" numeric DEFAULT '0',
	"shipping_method" varchar,
	"payment_method" varchar,
	"shipping_cost" numeric DEFAULT '0',
	"actual_shipping_cost" numeric DEFAULT '0',
	"adjustment" numeric DEFAULT '0',
	"grand_total" numeric NOT NULL,
	"notes" text,
	"attachment_url" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"shipped_at" timestamp,
	"pick_status" varchar DEFAULT 'not_started',
	"pack_status" varchar DEFAULT 'not_started',
	"picked_by" varchar,
	"packed_by" varchar,
	"pick_start_time" timestamp,
	"pick_end_time" timestamp,
	"pack_start_time" timestamp,
	"pack_end_time" timestamp,
	"final_weight" numeric,
	"carton_used" varchar,
	"modified_after_packing" boolean DEFAULT false,
	"modification_notes" text,
	"last_modified_at" timestamp,
	"previous_pack_status" varchar,
	"selected_document_ids" text[],
	"tracking_number" text,
	"order_type" varchar DEFAULT 'ord' NOT NULL,
	"included_documents" jsonb,
	"fulfillment_stage" varchar,
	"picking_started_at" timestamp,
	"packing_started_at" timestamp,
	"ppl_batch_id" text,
	"ppl_shipment_numbers" text[],
	"ppl_label_data" jsonb,
	"ppl_status" varchar,
	"cod_amount" numeric(10, 2),
	"cod_currency" varchar
);
--> statement-breakpoint
CREATE TABLE "packing_cartons" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar NOT NULL,
	"inner_length_cm" numeric(10, 2) NOT NULL,
	"inner_width_cm" numeric(10, 2) NOT NULL,
	"inner_height_cm" numeric(10, 2) NOT NULL,
	"max_weight_kg" numeric(10, 2) NOT NULL,
	"tare_weight_kg" numeric(10, 2) NOT NULL,
	"carrier_code" varchar,
	"cost_currency" varchar,
	"cost_amount" numeric(10, 2),
	"usage_count" integer DEFAULT 0 NOT NULL,
	"last_used_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "packing_material_usage" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" varchar NOT NULL,
	"material_id" varchar NOT NULL,
	"quantity" integer NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "packing_materials" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"code" varchar NOT NULL,
	"category" varchar NOT NULL,
	"type" varchar NOT NULL,
	"size" varchar,
	"dimensions" text,
	"weight" text,
	"stock_quantity" integer DEFAULT 0 NOT NULL,
	"min_stock_level" integer DEFAULT 10 NOT NULL,
	"cost" text,
	"currency" varchar DEFAULT 'EUR',
	"supplier" text,
	"image_url" text,
	"description" text,
	"is_fragile" boolean DEFAULT false,
	"is_reusable" boolean DEFAULT false,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "packing_materials_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "pm_suppliers" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"contact_person" text,
	"email" text,
	"phone" text,
	"address" text,
	"website" text,
	"notes" text,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "pm_suppliers_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "pre_order_items" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pre_order_id" varchar NOT NULL,
	"product_id" varchar,
	"item_name" varchar NOT NULL,
	"item_description" text,
	"quantity" integer NOT NULL,
	"arrived_quantity" integer DEFAULT 0 NOT NULL,
	"purchase_item_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pre_orders" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" varchar NOT NULL,
	"status" varchar DEFAULT 'pending' NOT NULL,
	"notes" text,
	"expected_date" date,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_bundles" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bundle_id" varchar NOT NULL,
	"name" varchar NOT NULL,
	"description" text,
	"sku" varchar,
	"price_czk" numeric(10, 2),
	"price_eur" numeric(10, 2),
	"discount_percentage" numeric(5, 2) DEFAULT '0',
	"notes" text,
	"image_url" varchar,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "product_bundles_bundle_id_unique" UNIQUE("bundle_id")
);
--> statement-breakpoint
CREATE TABLE "product_cost_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id" varchar NOT NULL,
	"custom_item_id" integer,
	"landing_cost_unit_base" numeric(12, 4) NOT NULL,
	"method" text NOT NULL,
	"computed_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_files" (
	"id" text PRIMARY KEY NOT NULL,
	"product_id" text,
	"file_name" text NOT NULL,
	"file_type" text NOT NULL,
	"file_url" text NOT NULL,
	"file_size" integer,
	"mime_type" text,
	"description" text,
	"language" text,
	"uploaded_by" text,
	"uploaded_at" timestamp NOT NULL,
	"is_active" boolean,
	"tags" text[]
);
--> statement-breakpoint
CREATE TABLE "product_locations" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" varchar NOT NULL,
	"location_type" text DEFAULT 'warehouse' NOT NULL,
	"location_code" varchar NOT NULL,
	"quantity" integer DEFAULT 0 NOT NULL,
	"is_primary" boolean DEFAULT false,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_tiered_pricing" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" varchar NOT NULL,
	"min_quantity" integer NOT NULL,
	"max_quantity" integer,
	"price_czk" numeric(10, 2),
	"price_eur" numeric(10, 2),
	"price_usd" numeric(10, 2),
	"price_vnd" numeric(10, 2),
	"price_cny" numeric(10, 2),
	"price_type" varchar DEFAULT 'tiered' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "product_variants" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" varchar NOT NULL,
	"name" varchar NOT NULL,
	"barcode" varchar,
	"quantity" integer DEFAULT 0,
	"import_cost_usd" numeric(10, 2),
	"import_cost_czk" numeric(10, 2),
	"import_cost_eur" numeric(10, 2),
	"image_url" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar NOT NULL,
	"vietnamese_name" varchar,
	"sku" varchar NOT NULL,
	"category_id" varchar,
	"warehouse_id" varchar,
	"supplier_id" varchar,
	"description" text,
	"quantity" integer DEFAULT 0,
	"low_stock_alert" integer DEFAULT 5,
	"price_czk" numeric,
	"price_eur" numeric,
	"price_usd" numeric,
	"price_vnd" numeric,
	"price_cny" numeric,
	"import_cost_usd" numeric,
	"import_cost_czk" numeric,
	"import_cost_eur" numeric,
	"image_url" varchar,
	"images" jsonb,
	"barcode" varchar,
	"length" numeric,
	"width" numeric,
	"height" numeric,
	"weight" numeric,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"warehouse_location" varchar,
	"shipment_notes" text,
	"packing_material_id" varchar,
	"packing_materials" jsonb,
	"packing_instructions_text" text,
	"packing_instructions_image" text,
	"packing_instructions_images" jsonb,
	"packing_instructions_texts" jsonb,
	"latest_landing_cost" numeric(12, 4),
	"unit_weight_kg" numeric(10, 3),
	"unit_length_cm" numeric(10, 2),
	"unit_width_cm" numeric(10, 2),
	"unit_height_cm" numeric(10, 2),
	"packaging_requirement" text DEFAULT 'carton'
);
--> statement-breakpoint
CREATE TABLE "purchase_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"purchase_id" integer NOT NULL,
	"name" text NOT NULL,
	"sku" text,
	"quantity" integer NOT NULL,
	"unit_price" numeric(10, 2),
	"total_price" numeric(10, 2),
	"weight" numeric(10, 3),
	"dimensions" jsonb,
	"status" text DEFAULT 'ordered' NOT NULL,
	"tracking_number" text,
	"warehouse_location" text,
	"consolidation_id" integer,
	"image_url" text,
	"notes" text,
	"processing_time_days" integer,
	"hs_code" text,
	"duty_rate_percent" numeric(5, 2),
	"unit_gross_weight_kg" numeric(10, 3),
	"unit_length_cm" numeric(10, 2),
	"unit_width_cm" numeric(10, 2),
	"unit_height_cm" numeric(10, 2),
	"landing_cost_unit_base" numeric(12, 4),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "receipt_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"receipt_id" integer NOT NULL,
	"item_id" integer NOT NULL,
	"item_type" text NOT NULL,
	"product_id" text,
	"sku" text,
	"status" text DEFAULT 'ok',
	"expected_quantity" integer NOT NULL,
	"received_quantity" integer NOT NULL,
	"damaged_quantity" integer DEFAULT 0,
	"missing_quantity" integer DEFAULT 0,
	"barcode" text,
	"warehouse_location" text,
	"additional_location" text,
	"storage_instructions" text,
	"condition" text DEFAULT 'good',
	"notes" text,
	"photos" jsonb,
	"verified_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "receipts" (
	"id" serial PRIMARY KEY NOT NULL,
	"shipment_id" integer NOT NULL,
	"consolidation_id" integer,
	"received_by" text NOT NULL,
	"received_at" timestamp DEFAULT now() NOT NULL,
	"parcel_count" integer NOT NULL,
	"received_parcels" integer DEFAULT 0 NOT NULL,
	"carrier" text NOT NULL,
	"tracking_numbers" jsonb,
	"status" text DEFAULT 'pending_verification' NOT NULL,
	"notes" text,
	"damage_notes" text,
	"photos" jsonb,
	"verified_by" text,
	"verified_at" timestamp,
	"approved_by" text,
	"approved_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "service_items" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"service_id" varchar NOT NULL,
	"product_id" varchar NOT NULL,
	"product_name" varchar NOT NULL,
	"sku" varchar,
	"quantity" integer NOT NULL,
	"unit_price" numeric(10, 2) NOT NULL,
	"total_price" numeric(10, 2) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "services" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" varchar,
	"order_id" varchar,
	"name" varchar NOT NULL,
	"description" text,
	"service_date" date,
	"service_cost" numeric(10, 2) DEFAULT '0',
	"parts_cost" numeric(10, 2) DEFAULT '0',
	"total_cost" numeric(10, 2) DEFAULT '0',
	"currency" varchar DEFAULT 'EUR',
	"status" varchar DEFAULT 'pending' NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shipment_cartons" (
	"id" serial PRIMARY KEY NOT NULL,
	"shipment_id" integer NOT NULL,
	"custom_item_id" integer NOT NULL,
	"qty_in_carton" integer NOT NULL,
	"length_cm" numeric(10, 2),
	"width_cm" numeric(10, 2),
	"height_cm" numeric(10, 2),
	"gross_weight_kg" numeric(10, 3),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shipment_costs" (
	"id" serial PRIMARY KEY NOT NULL,
	"shipment_id" integer NOT NULL,
	"type" text NOT NULL,
	"mode" text,
	"volumetric_divisor" integer,
	"amount_original" numeric(12, 4) NOT NULL,
	"currency" text NOT NULL,
	"fx_rate_used" numeric(12, 6),
	"amount_base" numeric(12, 4) NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shipment_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"shipment_id" integer NOT NULL,
	"consolidation_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shipment_labels" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" varchar,
	"carrier" varchar NOT NULL,
	"tracking_numbers" text[],
	"batch_id" varchar,
	"label_data" jsonb,
	"label_base64" text,
	"shipment_count" integer DEFAULT 1,
	"status" varchar DEFAULT 'active' NOT NULL,
	"cancelled_at" timestamp,
	"cancel_reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shipments" (
	"id" serial PRIMARY KEY NOT NULL,
	"consolidation_id" integer,
	"carrier" text NOT NULL,
	"tracking_number" text NOT NULL,
	"end_carrier" text,
	"end_tracking_number" text,
	"end_tracking_numbers" text[],
	"shipment_name" text,
	"shipment_type" text,
	"origin" text NOT NULL,
	"destination" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"receiving_status" text,
	"shipping_cost" numeric(10, 2) DEFAULT '0',
	"shipping_cost_currency" text DEFAULT 'USD',
	"insurance_value" numeric(10, 2) DEFAULT '0',
	"total_weight" numeric(10, 3),
	"total_units" integer,
	"unit_type" text DEFAULT 'items',
	"estimated_delivery" timestamp,
	"delivered_at" timestamp,
	"current_location" text,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stock_adjustment_requests" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" varchar NOT NULL,
	"location_id" varchar NOT NULL,
	"requested_by" varchar NOT NULL,
	"adjustment_type" text NOT NULL,
	"current_quantity" integer NOT NULL,
	"requested_quantity" integer NOT NULL,
	"reason" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"approved_by" varchar,
	"approved_at" timestamp,
	"rejection_reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "suppliers" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar NOT NULL,
	"contact_person" varchar,
	"email" varchar,
	"phone" varchar,
	"address" text,
	"country" varchar,
	"website" varchar,
	"supplier_link" text,
	"last_purchase_date" timestamp,
	"total_purchased" numeric DEFAULT '0',
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ticket_comments" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ticket_id" varchar NOT NULL,
	"content" text NOT NULL,
	"is_internal" boolean DEFAULT false,
	"created_by" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "tickets" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ticket_id" varchar NOT NULL,
	"customer_id" varchar,
	"order_id" varchar,
	"title" varchar NOT NULL,
	"description" text,
	"category" varchar NOT NULL,
	"status" varchar DEFAULT 'open' NOT NULL,
	"priority" varchar DEFAULT 'medium' NOT NULL,
	"assigned_to" varchar,
	"created_by" varchar,
	"resolved_at" timestamp,
	"due_date" timestamp,
	"tags" text[],
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "tickets_ticket_id_unique" UNIQUE("ticket_id")
);
--> statement-breakpoint
CREATE TABLE "user_activities" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY NOT NULL,
	"email" varchar,
	"first_name" varchar,
	"last_name" varchar,
	"profile_image_url" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "warehouse_files" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"warehouse_id" text NOT NULL,
	"file_name" text NOT NULL,
	"file_type" text NOT NULL,
	"file_url" text NOT NULL,
	"file_size" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "warehouse_financial_contracts" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"warehouse_id" text NOT NULL,
	"contract_name" text NOT NULL,
	"contract_type" text DEFAULT 'rental' NOT NULL,
	"price" numeric(10, 2) DEFAULT '0' NOT NULL,
	"currency" text DEFAULT 'CZK' NOT NULL,
	"billing_period" text DEFAULT 'monthly' NOT NULL,
	"custom_billing_days" integer,
	"rental_due_date" date,
	"start_date" date,
	"end_date" date,
	"status" text DEFAULT 'active',
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "warehouse_layouts" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"warehouse_id" text NOT NULL,
	"name" text NOT NULL,
	"width" numeric(10, 2) NOT NULL,
	"length" numeric(10, 2) NOT NULL,
	"coordinate_system" text DEFAULT 'grid' NOT NULL,
	"generated_at" timestamp DEFAULT now() NOT NULL,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "warehouses" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"location" text NOT NULL,
	"address" text,
	"city" text,
	"country" text,
	"zip_code" text,
	"phone" text,
	"email" text,
	"manager" text,
	"capacity" integer,
	"type" text DEFAULT 'fulfillment',
	"status" text DEFAULT 'active',
	"rented_from_date" date,
	"expense_id" integer,
	"contact" text,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"floor_area" numeric(10, 2),
	"total_aisles" integer DEFAULT 6,
	"max_racks" integer DEFAULT 10,
	"max_levels" integer DEFAULT 5,
	"max_bins" integer DEFAULT 5,
	"aisle_configs" jsonb
);
--> statement-breakpoint
ALTER TABLE "app_settings" ADD CONSTRAINT "app_settings_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bundle_items" ADD CONSTRAINT "bundle_items_bundle_id_product_bundles_id_fk" FOREIGN KEY ("bundle_id") REFERENCES "public"."product_bundles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bundle_items" ADD CONSTRAINT "bundle_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consolidation_items" ADD CONSTRAINT "consolidation_items_consolidation_id_consolidations_id_fk" FOREIGN KEY ("consolidation_id") REFERENCES "public"."consolidations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cost_allocations" ADD CONSTRAINT "cost_allocations_shipment_id_shipments_id_fk" FOREIGN KEY ("shipment_id") REFERENCES "public"."shipments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cost_allocations" ADD CONSTRAINT "cost_allocations_custom_item_id_custom_items_id_fk" FOREIGN KEY ("custom_item_id") REFERENCES "public"."custom_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_billing_addresses" ADD CONSTRAINT "customer_billing_addresses_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_shipping_addresses" ADD CONSTRAINT "customer_shipping_addresses_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delivery_history" ADD CONSTRAINT "delivery_history_shipment_id_shipments_id_fk" FOREIGN KEY ("shipment_id") REFERENCES "public"."shipments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "landed_costs" ADD CONSTRAINT "landed_costs_receipt_id_receipts_id_fk" FOREIGN KEY ("receipt_id") REFERENCES "public"."receipts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "layout_bins" ADD CONSTRAINT "layout_bins_layout_id_warehouse_layouts_id_fk" FOREIGN KEY ("layout_id") REFERENCES "public"."warehouse_layouts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_carton_items" ADD CONSTRAINT "order_carton_items_plan_id_order_carton_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."order_carton_plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_carton_items" ADD CONSTRAINT "order_carton_items_carton_id_packing_cartons_id_fk" FOREIGN KEY ("carton_id") REFERENCES "public"."packing_cartons"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_carton_items" ADD CONSTRAINT "order_carton_items_order_item_id_order_items_id_fk" FOREIGN KEY ("order_item_id") REFERENCES "public"."order_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_carton_items" ADD CONSTRAINT "order_carton_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_carton_plans" ADD CONSTRAINT "order_carton_plans_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_cartons" ADD CONSTRAINT "order_cartons_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_cartons" ADD CONSTRAINT "order_cartons_carton_id_packing_cartons_id_fk" FOREIGN KEY ("carton_id") REFERENCES "public"."packing_cartons"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_cartons" ADD CONSTRAINT "order_cartons_ai_plan_id_order_carton_plans_id_fk" FOREIGN KEY ("ai_plan_id") REFERENCES "public"."order_carton_plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_files" ADD CONSTRAINT "order_files_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_fulfillment_logs" ADD CONSTRAINT "order_fulfillment_logs_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_fulfillment_logs" ADD CONSTRAINT "order_fulfillment_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_bundle_id_product_bundles_id_fk" FOREIGN KEY ("bundle_id") REFERENCES "public"."product_bundles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_shipping_address_id_customer_shipping_addresses_id_fk" FOREIGN KEY ("shipping_address_id") REFERENCES "public"."customer_shipping_addresses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_biller_id_users_id_fk" FOREIGN KEY ("biller_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "packing_material_usage" ADD CONSTRAINT "packing_material_usage_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "packing_material_usage" ADD CONSTRAINT "packing_material_usage_material_id_packing_materials_id_fk" FOREIGN KEY ("material_id") REFERENCES "public"."packing_materials"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pre_order_items" ADD CONSTRAINT "pre_order_items_pre_order_id_pre_orders_id_fk" FOREIGN KEY ("pre_order_id") REFERENCES "public"."pre_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pre_order_items" ADD CONSTRAINT "pre_order_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pre_order_items" ADD CONSTRAINT "pre_order_items_purchase_item_id_purchase_items_id_fk" FOREIGN KEY ("purchase_item_id") REFERENCES "public"."purchase_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pre_orders" ADD CONSTRAINT "pre_orders_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_cost_history" ADD CONSTRAINT "product_cost_history_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_cost_history" ADD CONSTRAINT "product_cost_history_custom_item_id_custom_items_id_fk" FOREIGN KEY ("custom_item_id") REFERENCES "public"."custom_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_files" ADD CONSTRAINT "product_files_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_locations" ADD CONSTRAINT "product_locations_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_tiered_pricing" ADD CONSTRAINT "product_tiered_pricing_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_items" ADD CONSTRAINT "purchase_items_purchase_id_import_purchases_id_fk" FOREIGN KEY ("purchase_id") REFERENCES "public"."import_purchases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_items" ADD CONSTRAINT "purchase_items_consolidation_id_consolidations_id_fk" FOREIGN KEY ("consolidation_id") REFERENCES "public"."consolidations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receipt_items" ADD CONSTRAINT "receipt_items_receipt_id_receipts_id_fk" FOREIGN KEY ("receipt_id") REFERENCES "public"."receipts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_shipment_id_shipments_id_fk" FOREIGN KEY ("shipment_id") REFERENCES "public"."shipments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_consolidation_id_consolidations_id_fk" FOREIGN KEY ("consolidation_id") REFERENCES "public"."consolidations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_items" ADD CONSTRAINT "service_items_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_items" ADD CONSTRAINT "service_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "services" ADD CONSTRAINT "services_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "services" ADD CONSTRAINT "services_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipment_cartons" ADD CONSTRAINT "shipment_cartons_shipment_id_shipments_id_fk" FOREIGN KEY ("shipment_id") REFERENCES "public"."shipments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipment_cartons" ADD CONSTRAINT "shipment_cartons_custom_item_id_custom_items_id_fk" FOREIGN KEY ("custom_item_id") REFERENCES "public"."custom_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipment_costs" ADD CONSTRAINT "shipment_costs_shipment_id_shipments_id_fk" FOREIGN KEY ("shipment_id") REFERENCES "public"."shipments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipment_items" ADD CONSTRAINT "shipment_items_shipment_id_shipments_id_fk" FOREIGN KEY ("shipment_id") REFERENCES "public"."shipments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipment_items" ADD CONSTRAINT "shipment_items_consolidation_id_consolidations_id_fk" FOREIGN KEY ("consolidation_id") REFERENCES "public"."consolidations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipment_labels" ADD CONSTRAINT "shipment_labels_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_consolidation_id_consolidations_id_fk" FOREIGN KEY ("consolidation_id") REFERENCES "public"."consolidations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_adjustment_requests" ADD CONSTRAINT "stock_adjustment_requests_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_adjustment_requests" ADD CONSTRAINT "stock_adjustment_requests_location_id_product_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."product_locations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_adjustment_requests" ADD CONSTRAINT "stock_adjustment_requests_requested_by_users_id_fk" FOREIGN KEY ("requested_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_adjustment_requests" ADD CONSTRAINT "stock_adjustment_requests_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_comments" ADD CONSTRAINT "ticket_comments_ticket_id_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_comments" ADD CONSTRAINT "ticket_comments_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warehouse_files" ADD CONSTRAINT "warehouse_files_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warehouse_financial_contracts" ADD CONSTRAINT "warehouse_financial_contracts_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warehouse_layouts" ADD CONSTRAINT "warehouse_layouts_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE cascade ON UPDATE no action;