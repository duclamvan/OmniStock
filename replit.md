# Overview
Davie Supply is a full-stack web application designed for comprehensive warehouse and order management. Its primary goal is to optimize supply chain operations, encompassing the entire order lifecycle, inventory tracking, customer relationship management, and multi-currency financial reporting. The project includes features like real-time Vietnamese diacritics search, customer-specific pricing, external shipping API integrations, and extensive settings management. Key ambitions include advanced warehouse mapping, a comprehensive Pick & Pack workflow, and future AI-powered optimization.

# Recent Changes
**October 28, 2025**: Complete Removal of State/Region Fields for EU-Focused Address Management:
- Removed state/region fields from entire application (frontend forms, backend API, database schema) per EU addressing requirements
- Dropped state columns from customers, customerShippingAddresses, customerBillingAddresses tables via SQL migrations
- Enhanced Parse & Fill feature: excluded ID field from parsed data to prevent duplicate address errors
- Implemented comprehensive country normalization mapping both country codes (CZ→Czech Republic) and local names (Česko→Czech Republic) to English
- Enhanced address validation: made street, city, zipCode, and country required fields in both frontend Zod schemas and backend validation
- Fixed confidence indicator mapping in ShippingAddressModal to properly display field-level validation colors
- Address validation now uses React Hook Form + Zod resolver for all customer/address forms

**October 28, 2025**: Unified Customer Form Architecture and Enhanced Shipping Address Management:
- Confirmed AddCustomer.tsx handles both add and edit modes using a single unified component (isEditMode flag)
- Edit mode properly prefills all customer data: name, country, currency, Facebook info, billing details, tax/VAT info
- Automatically loads and displays existing shipping and billing addresses when editing
- Enhanced duplicate customer detection with detailed info card showing profile pic, contact details, and quick navigation
- Shipping address improvements: star toggle for primary addresses, copy button for formatted address text, and fixed delete functionality
- EditCustomer.tsx is legacy/unused code - all customer CRUD operations use AddCustomer.tsx for consistency

**October 28, 2025**: Fixed critical Edit Order page issues and simplified document management:
- Resolved form submission bug where Update Order buttons were outside the form element, preventing submission
- Fixed by adding `id="edit-order-form"` to the form and `form="edit-order-form"` attribute to all submit buttons  
- Simplified document management by removing Invoice/Custom checkboxes - now uses simple multi-file upload and management
- Unified document approach across Add Order and Edit Order pages for consistency
- Document management now only includes uploadedFiles in includedDocuments (removed invoicePrint and custom flags)

**October 27, 2025**: Implemented Option 1 architecture with separate fulfillment sub-status tracking and performance analytics:
- Added separate `fulfillmentStage` field (null → 'picking' → 'packing' → 'ready') to track pick/pack progress while keeping main `orderStatus` for system compatibility
- Main `orderStatus` remains 'to_fulfill' during pick/pack workflow, advances to 'ready_to_ship' only when fully packed
- Added timestamp tracking fields: `pickingStartedAt`, `packingStartedAt` for precise fulfillment stage timing
- Implemented comprehensive performance tracking system with `order_fulfillment_logs` table logging all pick/pack sessions
- Intelligent time predictions based on user-specific historical data (averages last 20 sessions, falls back to 6min/4min defaults)
- Enhanced guard clauses to prevent invalid state transitions and re-entry scenarios
- Frontend displays total item counts and AI-powered time estimates based on actual performance data

# User Preferences
Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend
The frontend is a React and TypeScript application, built with Vite. It uses Shadcn/ui (Radix UI primitives), Tailwind CSS for styling, TanStack Query for state management, Wouter for routing, and React Hook Form with Zod for form validation. The UI/UX emphasizes mobile-first responsiveness, card-based layouts, sticky navigation, and clear visual separation. It features an interactive Pick & Pack interface and advanced warehouse mapping with a 2D floor plan. The architecture promotes unified form components for both creation and editing, reducing code duplication.

**Key Architecture Patterns:**
- **Unified Form Components**: AddCustomer.tsx handles both add and edit modes via isEditMode flag. When editing, it loads existing data via useQuery and prefills all form fields automatically. This pattern ensures consistency and reduces maintenance burden.
- **Auto-fill in Edit Mode**: Edit pages automatically populate all available fields including customer info, Facebook details, billing addresses, tax/VAT info, and associated shipping/billing addresses.

## Backend
The backend is an Express.js application written in TypeScript (ESM modules), providing RESTful API endpoints with consistent error handling.

## Authentication System
Supports Facebook OAuth Login and traditional email/password authentication, with session management via HTTP-only cookies.

## Database Design
Utilizes PostgreSQL with Neon serverless driver and Drizzle ORM. The schema supports a full e-commerce workflow, including users, products, orders, customers, warehouses, suppliers, and returns, facilitating complete order lifecycle management, inventory tracking (variants, stock), multi-currency financial tracking, and an audit trail.

## Core Features
- **Product Management**: Detailed product information, pricing, location tracking, barcode scanning, document management, grouped packing instructions, tiered pricing, supplier integration, multi-purpose images with compression, and variant photo support.
- **Order Management**: Creation, shipping/payment selection, automatic shipping cost calculation, CRUD operations, custom order IDs, "Pay Later" option, editable priority, dual view modes (Normal/Super Compact), and enhanced product search with smart fuzzy matching (7-criteria scoring, Vietnamese diacritics).
- **Inventory Management**: Soft product deletion, bulk variant operations, and comprehensive category management.
- **Customer Management**: Enhanced tables with order statistics, address lookup, "Pay Later" functionality, Facebook integration (name sync, profile pics), AI-powered Smart Paste for address parsing (DeepSeek AI, Nominatim auto-correction), and auto-generating/editable shipping labels.
- **Discount Management**: Advanced system supporting various types (percentage, fixed, Buy X Get Y) with flexible scopes.
- **Customer-Specific Pricing**: Custom pricing per customer-product with validity periods.
- **Supplier Management**: CRUD operations, file upload, and purchase history.
- **Warehouse Management**: Location codes, barcode scanning, quantity tracking, professional column visibility, localStorage preference persistence, consistent pagination, and a defined location code format (Shelves, Pallets, Office zones). Includes smart field selection based on storage context, interactive 2D map with real inventory data, color-coded occupancy, detailed statistics, and rapid barcode scanning mode for quick stock additions with admin approval workflow.
- **Packing Materials Management**: Tracking inventory for cartons, filling, protective materials, and general supplies, with image upload, dimension/weight/cost tracking, and supplier integration.
- **Returns Management**: Professional processing system with auto-selection, order history display, real-time invoice totals, intelligent order/item auto-population, status tracking, and barcode scanning integration.
- **Services Management**: Tracks repair bills and service work, including customer tracking, cost tracking (parts, labor), status management, and integration with order creation.
- **Expenses Management**: Invoice-style tracking with sticky sidebar preview, multi-currency support, invoice number tracking, payment methods, status, notes, and recurring expense setup.
- **Product Bundles**: Comprehensive system with variant support, multiple pricing modes, and image upload.
- **Point of Sale (POS)**: Full-featured system with thermal printer support, multi-currency, real-time cart, VAT calculation, and receipt generation, optimized for mobile.
- **AI-Powered Carton Packing Optimization**: Intelligent carton size selection using AI weight/dimension inference, best-fit decreasing packing algorithm, automatic shipping cost estimation, and visual results.
- **Files Management System**: Comprehensive document management for product-related files.
- **Image Compression System**: Automatic lossless image compression to WebP with thumbnail generation.
- **Multi-Currency Support**: Sales in CZK/EUR; import costs in USD/CZK/EUR with automatic exchange rate conversion, tailored for European B2B markets.
- **Search Functionality**: Comprehensive fuzzy search with Vietnamese diacritics normalization, Levenshtein distance, multi-field support, configurable scoring, and intelligent ranking, implemented across multiple application pages.
- **Reusable Components**: Generic DataTable with bulk selection, sorting, pagination, and actions.
- **Reporting**: Comprehensive sales, inventory, customer, and financial reports.
- **Landing Cost Engine**: Tracks import costs with volumetric weight calculations, multi-currency, FX rate management, automatic cost allocation methods (AUTO, WEIGHT, VALUE, UNITS, HYBRID), and real-time previews.
- **Smart Barcode Scanning**: Automatic shipment matching with audio/visual feedback, and dedicated barcode scanning mode in Stock Lookup for rapid stock additions (scan barcode → auto-find product → quick adjustment request).
- **UI Enhancements**: Modernized invoice UI, clear order detail displays, optimized country/shipping flag selectors, and advanced localStorage-based sidebar state persistence with defensive guards.
- **Settings Management**: Comprehensive page with 6 categories (General, Display, Orders, Inventory, Notifications, Advanced) for system-wide configuration, including company info, regional settings, currency, theme, table preferences, order defaults, inventory settings, notifications, security, and API integrations.
- **Inventory Allocation Warnings**: Comprehensive system for detecting and resolving inventory discrepancies with two warning types: over-allocated items (ordered quantity exceeds available stock) and under-allocated items (recorded product quantity exceeds sum of stock location quantities). Features SQL-optimized detection with 60-second polling, warning banners on Dashboard, Stock Lookup, and Inventory pages, and dedicated resolution pages at /stock/over-allocated and /stock/under-allocated with detailed item information and action buttons.

# External Dependencies

## Database Services
- **Neon PostgreSQL**: Serverless PostgreSQL database.
- **Drizzle Kit**: Database migration and schema management.

## AI Services
- **DeepSeek AI**: Used for AI Address Parsing, ticket subject generation, and professional shipment name generation (via OpenAI-compatible API).
- **OpenAI API**: Used for AI-powered product weight and dimension inference in carton packing optimization.

## Other APIs
- **OpenStreetMap Nominatim API**: For address geocoding and auto-correction.
- **Fawaz Ahmed's free currency API**: For real-time exchange rates.
- **Facebook Graph API**: For fetching customer profile pictures and names.