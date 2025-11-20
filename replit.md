# Overview
Davie Supply is a full-stack web application designed for comprehensive warehouse and order management, aiming to optimize supply chain operations. It covers the entire order lifecycle, inventory tracking, customer relationship management (CRM), and multi-currency financial reporting. Key capabilities include real-time Vietnamese diacritics search, customer-specific pricing, external shipping API integrations, extensive settings management, and professional PDF packing list generation. The project's vision includes advanced warehouse mapping, a comprehensive Pick & Pack workflow, and AI-powered optimization to enhance efficiency and accuracy in supply chain logistics.

# Recent Changes (November 20, 2025)

## Critical Bug Fixes
1. **User Deletion System** - Fixed foreign key constraint violation when deleting users:
   - Changed `stock_adjustment_requests.requested_by` schema to allow NULL (preserves audit trail)
   - Applied SQL migration: `ALTER TABLE stock_adjustment_requests ALTER COLUMN requested_by DROP NOT NULL`
   - Updated `deleteUser` method to properly handle all foreign key relationships
   - Strategy: Sets user references to NULL (preserves history) instead of cascading deletes
   - Only notifications are deleted (not historically important)

2. **Authentication Duplicate Key Error** - Fixed server crash on login with existing email:
   - Updated `upsertUser` to check for existing users by both ID and email
   - Previously only checked by ID, causing duplicate key violations on email unique constraint
   - Now properly handles cases where user exists with same email but different ID
   - Maintains correct default role: `null` for new users (security requirement)

3. **Employee Management System** - Completed implementation with:
   - Admin-only access control via `requireRole(['administrator'])`
   - Recursive navigation filtering in sidebar to hide admin-only links from non-admins
   - Memoized filtering for performance optimization
   - Created 6 sample employees for testing with complete payroll data

# User Preferences
Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend
A React and TypeScript application built with Vite, utilizing Shadcn/ui (Radix UI primitives), Tailwind CSS for styling, TanStack Query for state management, Wouter for routing, and React Hook Form with Zod for validation. It features a mobile-first, card-based responsive design, interactive Pick & Pack interface, advanced warehouse mapping with a 2D floor plan, and unified form components for creation and editing. It also includes PWA capabilities for offline functionality, asset caching, and background sync, using IndexedDB for local storage of cached data and an offline queue manager for mutations. **AI Carton Packing** is synchronized across EditOrder, AddOrder, and PickPack pages using shared hooks and components.

## Backend
An Express.js application written in TypeScript (ESM modules), providing RESTful API endpoints with consistent error handling.

## Authentication System
**Replit Auth** with optional **Twilio SMS Two-Factor Authentication (2FA)** and **Strict Role-Based Access Control (RBAC)**. Primary authentication uses Replit's OpenID Connect supporting Google, GitHub, X (Twitter), Apple, and email/password login. Session management via HTTP-only cookies with automatic token refresh. Optional 2FA adds SMS verification layer: users can enable 2FA in User Settings by providing phone number (E.164 format), receiving 6-digit SMS codes via Twilio Verify API. When enabled, users complete Replit Auth first, then verify SMS code before accessing the application. Database tracks 2FA status (`twoFactorEnabled`, `twoFactorVerified`, `phoneNumber` fields in users table).

**Role-Based Access Control**: Strict security model where new user registrations have **NULL role by default** and cannot access anything until an administrator assigns a role. Frontend (ProtectedRoute) shows "Pending Approval" screen for users without roles. Backend middleware (requireRole) blocks all API access with 403 Forbidden for null-role users. Only administrators can assign roles via Settings → Roles page. Available roles: `administrator` (full access) and `warehouse_operator` (operational access). Database pool configured with 10-second timeouts and keepAlive for Neon serverless compatibility.

## Database Design
Utilizes PostgreSQL with Neon serverless driver and Drizzle ORM. The schema supports a full e-commerce workflow, including users, products, orders, customers, warehouses, suppliers, returns, inventory tracking (variants, stock), multi-currency financial tracking, and an audit trail.

## Core Features
- **Product & Order Management**: Comprehensive CRUD for products and orders, including detailed info, pricing, location tracking, barcode scanning, grouped packing instructions, tiered pricing, multi-purpose images, variant support, custom order IDs, auto shipping cost, and enhanced product search with smart fuzzy matching and Vietnamese diacritics. Automated packing list PDF generation with company branding and professional layout.
- **Inventory & Warehouse Management**: Full inventory tracking with variant operations, category management, location codes, barcode scanning, quantity tracking, professional column visibility, interactive 2D warehouse map with real inventory data and multi-zone support (Shelves A, Pallets B, Bulk C with visual differentiation via border styles), zone filtering, and rapid barcode scanning for stock additions. Includes inventory allocation warnings and intelligent product packaging classification (carton, outer_carton, nylon_wrap).
- **Customer Management**: Enhanced tables with order statistics, address lookup, "Pay Later," Facebook integration, AI-powered Smart Paste for address parsing, and auto-generating/editable shipping labels.
- **Financial & Discount Management**: Advanced discount system, customer-specific pricing, multi-currency support (CZK/EUR/USD) with automatic exchange rate conversion, landing cost engine with volumetric weight and automatic cost allocation, and expense tracking.
- **Fulfillment & Logistics**: **Synchronized AI-powered carton packing optimization** across all order pages (EditOrder, AddOrder, PickPack) using shared `usePackingOptimization` hook and `AICartonPackingPanel` component. Uses DeepSeek AI for weight/dimension inference and best-fit algorithms, automatic shipping cost estimation, comprehensive country-to-ISO mapping (50+ country name variants), and real-time packing plan visualization. Separate fulfillment sub-status tracking (`fulfillmentStage`), and performance analytics with precise time predictions. Returns management system with auto-selection and barcode scanning. Packing materials management with dynamic, product-specific checklists. Automated carton creation and pre-population based on AI recommendations. **Carton & Label state persistence**: Database is the primary source of truth - all changes save to database first, then localStorage is updated only after successful database save. This ensures data integrity when connection is good, with localStorage serving as offline backup. Labels are stored in `shipment_labels` table and load automatically when returning to packing mode.
- **Point of Sale (POS)**: Full-featured system with thermal printer support, multi-currency, real-time cart, VAT calculation, and receipt generation.
- **System Utilities**: Comprehensive files management, automatic lossless image compression to WebP, robust fuzzy search with diacritics normalization, generic DataTable component, reporting, and **comprehensive settings management system** with 6 categories covering all configurable aspects:
  - **GeneralSettings** (28 fields): Company Information (10), Localization (5), Regional Settings (7), Notification Preferences (6)
  - **OrderSettings** (29 fields): Order Defaults (6), Fulfillment Settings (7), Order Validation (6), Automation (5), COD Settings (5)
  - **InventorySettings** (37 fields): Product Defaults (7), Stock Management (7), Warehouse Operations (7), Product Quality (5), Measurement Units (5), Catalog Settings (6)
  - **ShippingSettings**: Carrier Configuration, Label Generation, Tracking & Notifications, Shipping Rules
  - **FinancialSettings**: Pricing & Margins, Tax Configuration, Currency & Exchange, Invoicing & Billing, Accounting
  - **SystemSettings**: System Preferences, Data Management, Security, Integrations, Automation & AI
  - **Settings Persistence Architecture**: All settings persist via key-value pairs in `app_settings` table with category scoping. Database stores snake_case keys, SettingsProvider converts to camelCase for React consumption. Token-based conversion (via `caseConverters.ts`) handles all edge cases including normal camelCase, middle acronyms (defaultVATRate), trailing acronyms (defaultAPIURL, VATID), and preserves already snake_case keys. All 6 settings pages exclusively use SettingsProvider with form hydration via useEffect + form.reset() pattern. Mutations use deepCamelToSnake for nested object conversion before saving, ensuring complete round-trip integrity with falsy value preservation (0, false, null). Comprehensive Zod validation, mobile-responsive Card-based UI organization.

# External Dependencies

## Database Services
- **Neon PostgreSQL**
- **Drizzle Kit**

## AI Services
- **DeepSeek AI**: For AI address parsing, ticket subject generation, professional shipment name generation, and carton packing optimization.
- **OpenAI API**: Used for AI-powered product weight and dimension inference in carton packing optimization.

## Shipping & Logistics APIs
- **PPL CZ CPL API**: Automated shipping label generation for PPL courier service, using OAuth2 authentication. Uses PPL's `shipmentSet` structure for multi-carton orders where all cartons are part of ONE shipment set, with labels showing "1/2", "2/2", etc. Each carton receives its own tracking number. Batches are immutable once created. Includes full dobírka (cash on delivery) support with configurable COD amount and currency (CZK/EUR/USD) applied to the entire shipment set.
  - **Sender/Recipient Configuration**: Default sender address (your company) is configured in `/shipping` page and stored in `app_settings` (key: `ppl_default_sender_address`). Recipient address is automatically pulled from each order's shipping address. Recipient data includes full company name and contact person (name2 field) for proper label formatting.
  - **Proper Workflow**: Add all cartons to order FIRST (via AI recommendations or manually), then create PPL labels once. The system automatically creates a shipmentSet when multiple cartons exist.
  - **Label Display**: Multi-carton shipments show "1/N", "2/N" in corner of labels (one shipment set). Single carton shows "1/1" (standalone shipment).
  - **COD Handling**: When using shipmentSet, COD is applied to the entire shipment (not per carton), complying with PPL API restriction "nelze slučovat zásilky s dobírkou" (cannot merge shipments with COD).
  - **Label Retrieval**: Includes automatic retry logic (5 attempts, 2s intervals) to handle PPL API's delayed label processing after batch creation. Labels may return 404 initially and become available within seconds.
- **GLS Germany Manual Shipping**: Manual label workflow for German domestic shipping using GLS bookmarklet autofill technology. No API integration - users create labels on the GLS website and optionally enter tracking numbers in the app for record-keeping.
  - **Sender Configuration**: Default sender address configured in `/shipping` page (stored in `gls_default_sender_address` setting).
  - **Workflow**: Bookmarklet autofills GLS web form with order data. After creating labels on GLS website, users manually enter tracking numbers in PickPack.
  - **Autofill Technology**: One-time bookmarklet setup that injects order data (recipient, sender, package details) into GLS web form.
  - **Manual Tracking**: Per-carton tracking number input with auto-save to database. Numbers stored in `order_cartons.trackingNumber` field.
  - **Benefits**: No API complexity, affordable rates (from €3.29 within Germany), suitable for low-volume German domestic shipments.
- **OpenStreetMap Nominatim API**: For address geocoding and auto-correction.

## Other APIs
- **Frankfurter API** (https://frankfurter.dev/): Free, open-source currency exchange rate API for real-time and historical exchange rates. Provides reliable EUR-based conversion rates for multi-currency support across the application.
- **Twilio Verify API**: SMS verification service for two-factor authentication. Sends 6-digit codes to user phone numbers for additional security layer. Configured with TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_VERIFY_SERVICE_SID environment variables.