-- Speed Optimization: Add indexes for receipt-related queries
-- These indexes will dramatically improve query performance

-- Index for receipts table
CREATE INDEX IF NOT EXISTS idx_receipts_shipment_id ON receipts(shipment_id);
CREATE INDEX IF NOT EXISTS idx_receipts_consolidation_id ON receipts(consolidation_id);
CREATE INDEX IF NOT EXISTS idx_receipts_status ON receipts(status);
CREATE INDEX IF NOT EXISTS idx_receipts_received_at ON receipts(received_at DESC);

-- Composite index for common receipt lookups
CREATE INDEX IF NOT EXISTS idx_receipts_shipment_status ON receipts(shipment_id, status);

-- Index for receipt_items table
CREATE INDEX IF NOT EXISTS idx_receipt_items_receipt_id ON receipt_items(receipt_id);
CREATE INDEX IF NOT EXISTS idx_receipt_items_item_id ON receipt_items(item_id);
CREATE INDEX IF NOT EXISTS idx_receipt_items_item_type ON receipt_items(item_type);

-- Composite index for receipt item lookups
CREATE INDEX IF NOT EXISTS idx_receipt_items_receipt_item ON receipt_items(receipt_id, item_id);
CREATE INDEX IF NOT EXISTS idx_receipt_items_receipt_type ON receipt_items(receipt_id, item_type);

-- Index for landed_costs table
CREATE INDEX IF NOT EXISTS idx_landed_costs_receipt_id ON landed_costs(receipt_id);

-- Index for shipments table (for faster joins)
CREATE INDEX IF NOT EXISTS idx_shipments_status ON shipments(status);
CREATE INDEX IF NOT EXISTS idx_shipments_consolidation_id ON shipments(consolidation_id);

-- Index for shipment_items table
CREATE INDEX IF NOT EXISTS idx_shipment_items_shipment_id ON shipment_items(shipment_id);
CREATE INDEX IF NOT EXISTS idx_shipment_items_product_id ON shipment_items(product_id);

-- Index for purchase_items table
CREATE INDEX IF NOT EXISTS idx_purchase_items_purchase_id ON purchase_items(purchase_id);
CREATE INDEX IF NOT EXISTS idx_purchase_items_product_id ON purchase_items(product_id);

-- Index for custom_items table
CREATE INDEX IF NOT EXISTS idx_custom_items_order_number ON custom_items(order_number);
CREATE INDEX IF NOT EXISTS idx_custom_items_status ON custom_items(status);

-- Index for consolidations table
CREATE INDEX IF NOT EXISTS idx_consolidations_status ON consolidations(status);
CREATE INDEX IF NOT EXISTS idx_consolidations_created_at ON consolidations(created_at DESC);