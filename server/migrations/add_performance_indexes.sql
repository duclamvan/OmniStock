-- Performance optimization indexes for critical queries
-- These indexes will significantly improve query performance

-- Orders table indexes
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_orders_order_status ON orders(order_status);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
-- Compound index for status and date queries
CREATE INDEX IF NOT EXISTS idx_orders_status_date ON orders(order_status, created_at DESC);

-- Products table indexes
CREATE INDEX IF NOT EXISTS idx_products_quantity ON products(quantity);
CREATE INDEX IF NOT EXISTS idx_products_low_stock_alert ON products(low_stock_alert);
-- Partial index for low stock products (most efficient for low stock queries)
CREATE INDEX IF NOT EXISTS idx_products_low_stock ON products(quantity, low_stock_alert) WHERE quantity <= low_stock_alert;
CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_warehouse_id ON products(warehouse_id);

-- Import purchases table indexes
CREATE INDEX IF NOT EXISTS idx_import_purchases_created_at ON import_purchases(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_import_purchases_status ON import_purchases(status);
CREATE INDEX IF NOT EXISTS idx_import_purchases_supplier ON import_purchases(supplier);

-- Purchase items table indexes
CREATE INDEX IF NOT EXISTS idx_purchase_items_purchase_id ON purchase_items(purchase_id);

-- Order items table indexes
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);

-- Custom items table indexes
CREATE INDEX IF NOT EXISTS idx_custom_items_status ON custom_items(status);
CREATE INDEX IF NOT EXISTS idx_custom_items_order_number ON custom_items(order_number);
CREATE INDEX IF NOT EXISTS idx_custom_items_created_at ON custom_items(created_at DESC);

-- Consolidations table indexes
CREATE INDEX IF NOT EXISTS idx_consolidations_status ON consolidations(status);
CREATE INDEX IF NOT EXISTS idx_consolidations_created_at ON consolidations(created_at DESC);

-- Shipments table indexes
CREATE INDEX IF NOT EXISTS idx_shipments_status ON shipments(status);
CREATE INDEX IF NOT EXISTS idx_shipments_consolidation_id ON shipments(consolidation_id);
CREATE INDEX IF NOT EXISTS idx_shipments_created_at ON shipments(created_at DESC);

-- Receipts table indexes
CREATE INDEX IF NOT EXISTS idx_receipts_shipment_id ON receipts(shipment_id);
CREATE INDEX IF NOT EXISTS idx_receipts_status ON receipts(status);
CREATE INDEX IF NOT EXISTS idx_receipts_created_at ON receipts(created_at DESC);

-- Receipt items table indexes
CREATE INDEX IF NOT EXISTS idx_receipt_items_receipt_id ON receipt_items(receipt_id);
CREATE INDEX IF NOT EXISTS idx_receipt_items_custom_item_id ON receipt_items(custom_item_id);