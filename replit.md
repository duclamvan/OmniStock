# Overview
Davie Supply is a full-stack web application designed for comprehensive warehouse and order management, aiming to optimize supply chain operations. It manages the entire order lifecycle, inventory, CRM, and multi-currency financial reporting. Key capabilities include complete bilingual internationalization (Vietnamese/English), real-time Vietnamese diacritics search, customer-specific pricing, external shipping API integrations, extensive settings management, and professional PDF packing list generation. The system features enterprise-grade security with comprehensive RBAC and 100% route coverage. Future ambitions include advanced warehouse mapping and AI-powered optimization for enhanced efficiency.

# User Preferences
Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend
The frontend is a React and TypeScript application built with Vite, utilizing Shadcn/ui, Tailwind CSS, TanStack Query, Wouter, and React Hook Form with Zod. It features a mobile-first, card-based, responsive design with an interactive Pick & Pack interface, 2D warehouse mapping, and unified form components. It supports complete bilingual internationalization (Vietnamese/English) using `react-i18next`. PWA capabilities include offline functionality, asset caching, background sync, and IndexedDB for local storage with an offline queue manager.

## Backend
The backend is an Express.js application written in TypeScript (ESM modules), providing RESTful API endpoints with consistent error handling.

## Authentication System
The system uses username/password authentication with `passport-local` and Enterprise-Grade Role-Based Access Control (RBAC). Passwords are hashed with `bcryptjs`. Session management uses PostgreSQL-backed sessions with HTTP-only cookies. The system supports dynamic role creation and management with granular section/page-based permissions. Comprehensive security features include 100% route protection, rate limiting, account lockout, strong password enforcement, CSRF protection, security headers (Helmet.js), and protected static file routes.

## Database Design
The project uses PostgreSQL with Neon serverless driver and Drizzle ORM. The schema supports a full e-commerce workflow with entities for users, products, orders, customers, warehouses, suppliers, returns, inventory, multi-currency financial tracking, and an audit trail. All new tables must use `VARCHAR` with `UUID` for primary keys and foreign keys.

## Core Features
- **Product & Order Management**: Comprehensive CRUD, pricing, location tracking, barcode scanning, grouped packing, tiered pricing, multi-purpose images, variant support, custom order IDs, auto shipping cost, enhanced product search with fuzzy matching and Vietnamese diacritics, and automated packing list PDF generation.
- **Inventory & Warehouse Management**: Full inventory tracking, variant operations, category management, location codes, barcode scanning, quantity tracking, interactive 2D warehouse map with real inventory data, multi-zone support, and inventory allocation warnings. It includes robust receiving workflows, variant-aware import, and bulletproof quantity tracking using `productLocations.notes` for reconciliation. Automatic import cost calculation uses weighted averages across multiple currencies, leveraging dynamic exchange rates.
- **Customer Management**: Enhanced tables with order statistics, address lookup, "Pay Later," Facebook integration, AI-powered Smart Paste for address parsing, and auto-generating/editable shipping labels.
- **Financial & Discount Management**: Advanced discount system, customer-specific pricing, multi-currency support (CZK/EUR/USD/VND/CNY) with automatic exchange rate conversion, landing cost engine, expense tracking, and automatic weighted average landed cost calculation upon receiving. EUR is used as the base currency for all conversions.
- **Profit Calculation**: Order profit is calculated as `grandTotal - totalCost`. The `totalCost` is computed at order creation by summing `landingCost × quantity` for all items. **CRITICAL**: Cost capture uses currency-tagged `landingCost{Currency}` fields (e.g., `landingCostCzk`, `landingCostEur`) which are populated during the receiving workflow. The system fetches live exchange rates from Frankfurter API at order creation and converts from any available currency to the order's currency. Priority: 1) Direct currency match, 2) Convert from any other currency via EUR as base. Product variants now store landed costs in all currencies (EUR, CZK, USD, VND, CNY) for accurate multi-currency profit tracking.
- **High-Performance Order Processing**: Order creation and editing are optimized for 200-1000+ items using batch operations. Storage methods `getProductVariantsByIds()`, `getProductsByIds()`, and `createOrderItemsBulk()` enable parallel data fetching and single-query bulk inserts, reducing O(n) database calls to O(1). Target performance: ~100-250ms for 500 items, ~250-500ms for 1000 items.
- **Fulfillment & Logistics**: AI-powered carton packing optimization, automatic shipping cost estimation, country-to-ISO mapping, real-time packing plan visualization, separate fulfillment sub-status tracking, returns management, and packing materials management.
- **Bill of Materials (BOM) & Manufacturing**: Dual-structure BOM system with `billOfMaterials` junction table for manufacturing calculations and direct `parentProductId` field on products for UI hierarchy. Features include: parent-child product relationships, automatic sync between BOM entries and product metadata, visual hierarchy in inventory list (indentation, icons, filter by parent/child), enhanced Production Planner with component visualization, and ability to create child products directly from parent product page. The system supports recipe ingredients with quantities and `yieldQuantity` for conversion ratios (e.g., 1 bucket yields 17 jars). **Simple Manufacturing/Conversion**: Warehouse staff can convert raw materials to finished products via a large-font, touch-friendly UI at `/manufacturing/simple-conversion`. The workflow displays component requirements with available stock, adjusts inventory on completion (decreases components, increases finished product), logs to `manufacturingRuns` table for audit trail, and notifies admins via `manufacturingNotifications`. Manufacturing history with archive functionality is included.
- **Point of Sale (POS)**: Full-featured system with thermal printer support, multi-currency, real-time cart, VAT calculation, and receipt generation.
- **QZ Tray Direct Printing**: Desktop printing integration via QZ Tray for direct label and document printing without browser dialogs. Supports 8 printer contexts (PPL labels, POS receipts, packing lists, invoices, etc.) with automatic browser fallback when QZ Tray is unavailable. Configuration available in Settings → Printers tab. Uses the `usePrinter` hook for React integration.
- **System Utilities**: Files management, automatic lossless image compression to WebP, robust fuzzy search with diacritics normalization, a generic DataTable component, reporting, and a comprehensive settings management system.
- **Maintenance Mode**: System-wide safety switch allowing administrators access during updates while blocking other users.
- **Employee Performance & Gamification**: Gamified performance tracking for warehouse staff with point system (10 base points per order, 1 per item, speed bonuses), 11 badge types (volume, speed, streak, level), leaderboard with daily/weekly/monthly/all-time periods, and XP-based leveling (100 XP per level). Integrated into pick/pack workflow for automatic tracking.

# External Dependencies

## Database Services
- **Neon PostgreSQL**
- **Drizzle Kit**

## AI Services
- **DeepSeek AI**: For AI address parsing, ticket subject generation, professional shipment name generation, and carton packing optimization.
- **OpenAI API**: For AI-powered product weight and dimension inference in carton packing optimization.

## Shipping & Logistics APIs
- **PPL CZ CPL API**: For automated shipping label generation for PPL courier service.
- **GLS Germany Manual Shipping**: For manual label workflow for German domestic shipping.

## Other APIs
- **OpenStreetMap Nominatim API**: For address geocoding and auto-correction.
- **ExchangeRate-API (open.er-api.com)**: For real-time currency exchange rates.
- **Twilio Verify API**: For SMS notifications.