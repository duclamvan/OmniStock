-- Migration: Add shipping address columns to customers table
-- Run this on your production database

-- Add shipping address columns
ALTER TABLE customers ADD COLUMN IF NOT EXISTS shipping_first_name VARCHAR;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS shipping_last_name VARCHAR;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS shipping_company VARCHAR;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS shipping_email VARCHAR;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS shipping_tel VARCHAR;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS shipping_street TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS shipping_street_number VARCHAR;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS shipping_city VARCHAR;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS shipping_zip_code VARCHAR;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS shipping_country VARCHAR;

-- Copy billing data to shipping columns (only where shipping is empty)
UPDATE customers SET
  shipping_first_name = billing_first_name,
  shipping_last_name = billing_last_name,
  shipping_company = billing_company
WHERE shipping_first_name IS NULL 
  AND shipping_last_name IS NULL 
  AND shipping_company IS NULL;

-- Verify migration
SELECT 
  COUNT(*) as total_customers,
  COUNT(shipping_first_name) as with_shipping_first_name,
  COUNT(shipping_last_name) as with_shipping_last_name,
  COUNT(shipping_company) as with_shipping_company
FROM customers;
