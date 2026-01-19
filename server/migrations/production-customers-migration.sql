-- Production Migration Script for Customers Table
-- Date: 2026-01-19
-- Purpose: Correct country names, sync billing fields, set preferred currency
-- Target: davie_wms_prod database

-- ============================================
-- STEP 1: Correct country names to native locale
-- ============================================
UPDATE customers SET 
  country = CASE 
    WHEN LOWER(country) IN ('germany', 'de', 'ger', 'deu') THEN 'Deutschland'
    WHEN LOWER(country) IN ('czech republic', 'czechia', 'cz', 'czech') THEN 'Česko'
    WHEN LOWER(country) IN ('austria', 'at', 'aut') THEN 'Österreich'
    WHEN LOWER(country) IN ('slovakia', 'sk', 'svk') THEN 'Slovensko'
    WHEN LOWER(country) IN ('poland', 'pl', 'pol') THEN 'Polska'
    WHEN LOWER(country) IN ('netherlands', 'nl', 'nld', 'holland') THEN 'Nederland'
    WHEN LOWER(country) IN ('france', 'fr', 'fra') THEN 'France'
    WHEN LOWER(country) IN ('spain', 'es', 'esp') THEN 'España'
    WHEN LOWER(country) IN ('italy', 'it', 'ita') THEN 'Italia'
    WHEN LOWER(country) IN ('belgium', 'be', 'bel') THEN 'België'
    WHEN LOWER(country) IN ('switzerland', 'ch', 'che') THEN 'Schweiz'
    WHEN LOWER(country) IN ('hungary', 'hu', 'hun') THEN 'Magyarország'
    WHEN LOWER(country) IN ('romania', 'ro', 'rou') THEN 'România'
    WHEN LOWER(country) IN ('uk', 'united kingdom', 'gb', 'gbr', 'great britain', 'england') THEN 'United Kingdom'
    WHEN LOWER(country) IN ('usa', 'united states', 'us', 'america') THEN 'United States'
    WHEN country = 'HR' THEN 'Hrvatska'
    WHEN country = 'VN' THEN 'Việt Nam'
    WHEN country = 'SI' THEN 'Slovenija'
    WHEN country = 'ID' THEN 'Indonesia'
    WHEN country = 'TR' THEN 'Türkiye'
    WHEN country = 'RS' THEN 'Srbija'
    WHEN country = 'UZ' THEN 'Oʻzbekiston'
    WHEN country = 'EE' THEN 'Eesti'
    WHEN country = 'SE' THEN 'Sverige'
    WHEN country = 'FI' THEN 'Suomi'
    WHEN country = 'DK' THEN 'Danmark'
    WHEN country = 'NO' THEN 'Norge'
    WHEN country = 'PT' THEN 'Portugal'
    WHEN country = 'LT' THEN 'Lietuva'
    WHEN country = 'LV' THEN 'Latvija'
    ELSE country
  END
WHERE country IS NOT NULL AND country != '';

-- ============================================
-- STEP 2: Sync billing fields to match main address
-- ============================================
UPDATE customers SET 
  billing_country = country,
  billing_city = city
WHERE country IS NOT NULL AND country != '';

-- ============================================
-- STEP 3: Set preferred currency based on country
-- ============================================
-- Czech customers get CZK
UPDATE customers SET preferred_currency = 'CZK' WHERE country = 'Česko';

-- All other customers get EUR
UPDATE customers SET preferred_currency = 'EUR' WHERE country != 'Česko' AND country IS NOT NULL AND country != '';

-- ============================================
-- VERIFICATION QUERIES (run these to check results)
-- ============================================
-- Check country distribution:
-- SELECT country, COUNT(*) as count FROM customers WHERE country IS NOT NULL GROUP BY country ORDER BY count DESC;

-- Check currency distribution:
-- SELECT preferred_currency, COUNT(*) as count FROM customers GROUP BY preferred_currency;
