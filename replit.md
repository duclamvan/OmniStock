# Overview
Davie Supply is a full-stack web application designed for comprehensive warehouse and order management. Its primary goal is to optimize supply chain operations, encompassing the entire order lifecycle, inventory tracking, customer relationship management, and multi-currency financial reporting. The project includes features like real-time Vietnamese diacritics search, customer-specific pricing, external shipping API integrations, and extensive settings management. Key ambitions include advanced warehouse mapping, a comprehensive Pick & Pack workflow, and future AI-powered optimization.

# User Preferences
Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend
The frontend is a React and TypeScript application, built with Vite. It uses Shadcn/ui (Radix UI primitives), Tailwind CSS for styling, TanStack Query for state management, Wouter for routing, and React Hook Form with Zod for form validation. The UI/UX emphasizes mobile-first responsiveness, card-based layouts, sticky navigation, and clear visual separation. It features an interactive Pick & Pack interface and advanced warehouse mapping with a 2D floor plan. The architecture promotes unified form components for both creation and editing, reducing code duplication.

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