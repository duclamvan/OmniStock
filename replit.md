# Overview
Davie Supply is a full-stack web application for comprehensive warehouse and order management. Its core purpose is to streamline supply chain operations, covering the entire order lifecycle, inventory tracking, customer relationship management, and multi-currency financial reporting. Key capabilities include real-time Vietnamese diacritics search, customer-specific pricing, and integration with external shipping APIs. The project aims to provide a robust and efficient platform for supply chain management, incorporating advanced features like warehouse mapping and a comprehensive Pick & Pack workflow, with ambitions for AI-powered optimization.

# User Preferences
Preferred communication style: Simple, everyday language.

# Device Location Configuration
The application supports automatic order location prefilling based on device type:
- **Online Orders**: Automatically prefilled with "Online" (default for web browsers)
- **POS Devices**: Can be configured with custom location names by setting localStorage values:
  - `localStorage.setItem('deviceLocation', 'Prague POS Terminal')` - For specific device locations
  - `localStorage.setItem('warehouseName', 'Main Warehouse')` - For warehouse-based locations
- The order location field auto-fills on page load but remains editable for manual overrides

# System Architecture

## Frontend
The client-side is a React and TypeScript application built with Vite, following a component-based architecture. It uses Shadcn/ui (Radix UI primitives) for UI components, Tailwind CSS for styling, TanStack Query for state management, Wouter for routing, and React Hook Form with Zod for form validation. UI/UX design emphasizes mobile-first responsiveness, card-based layouts, sticky navigation, and clear visual separation. Key features include an interactive Pick & Pack interface optimized for handheld devices, and advanced warehouse mapping with an interactive 2D floor plan.

**Architecture Pattern**: The application uses unified form components that handle both create and edit modes (e.g., ProductForm for both adding and editing products). This ensures consistency and reduces code duplication - any changes to the form automatically apply to both add and edit workflows.

## Backend
The server-side is implemented with Express.js and TypeScript (ESM modules), providing RESTful API endpoints with consistent error handling.

## Authentication System
The application supports Facebook OAuth Login and traditional email/password authentication. Sessions are managed securely using HTTP-only cookies.

## Database Design
The application uses PostgreSQL with Neon serverless driver and Drizzle ORM. The schema supports a comprehensive e-commerce workflow, including users, products, orders, customers, warehouses, suppliers, and returns. It facilitates complete order lifecycle management, inventory tracking (including variants and stock), multi-currency financial tracking, and an audit trail. Supplier information is centralized and referenced via foreign keys for normalization.

## Core Features
- **Product Management**: Comprehensive product details, pricing, location tracking, barcode scanning, document management, and grouped packing instructions (each instruction combines visual image + written text as a step-by-step unit with reordering capability). Supports tiered pricing, supplier integration, multi-purpose product images, automatic image compression, and product variant photo support with smart fallback to main product images. Weight input precision supports 3 decimal places (0.001 kg) for accurate measurement of small items.
- **Order Management**: Creation, shipping/payment selection, automatic shipping cost calculation, CRUD operations, detailed views, real-time synchronization, and a custom order ID format. Includes "Pay Later" and editable priority. Features dual view modes: Normal (expandable DataTable) and Super Compact (minimal text-based list with inline items) with localStorage preference persistence. Enhanced product search with smart fuzzy matching (7-criteria scoring system including exact match, starts-with, contains, Vietnamese diacritics, multi-word bonus, and order frequency), compact dropdown (top 8 results, max-h-64), visual highlighting (best match with blue border and badge, keyboard-selected with ring), and comprehensive keyboard navigation (Arrow Up/Down with wrap-around, Enter/Tab to add, Escape to close).
- **Inventory Management**: Soft product deletion, bulk variant operations, and comprehensive category management.
- **Customer Management**: Enhanced tables with order statistics, forms with address lookup, "Pay Later" functionality, and comprehensive Facebook integration with real-time name syncing and profile picture fetching. Includes AI-powered Smart Paste for address parsing (available in both Add Customer and Add Order pages) with DeepSeek AI and Nominatim auto-correction. Shipping address labels auto-generate from form fields (company/name + street + city) and remain editable with smart regeneration on data changes. Add Order page's "New Customer Details" form features consistent slate color scheme, separate street/streetNumber fields for better address structure, and paste buttons for Facebook Name/URL fields. Additional customer details section includes First Name, Last Name, Pickup Point (for branch/pickup locations), and Email with default paste functionality (davienails999@gmail.com).
- **Discount Management**: Advanced system supporting various types (percentage, fixed, Buy X Get Y) with flexible scopes.
- **Customer-Specific Pricing**: Custom pricing per customer-product with validity periods.
- **Supplier Management**: CRUD operations, file upload, and purchase history, with centralized supplier information.
- **Warehouse Management**: Management with file handling, location codes, barcode scanning, and quantity tracking. Features professional column visibility settings with three-dot menu for customizing table display, localStorage persistence for user preferences, and consistent pagination (10/20/50/100 items per page). **Location Code Format**: Supports zone-based formats with storage-specific prefixes - Shelves use A-prefixed aisles: WH1-A{NN}-R{ROW}-L{LEVEL}-B{BIN} (e.g., WH1-A06-R04-L04-B2 where A01-A99), Pallets use B-prefixed zones: WH1-B{NN}-P{POSITION} (e.g., WH1-B03-P05 where B01-B99), Office uses C-prefixed zones: WH1-C{NN}-P{POSITION} (e.g., WH1-C01-P01 where C01-C99). Warehouse constant is WH1, selectable storage type (Shelves/Pallets/Office).
- **Packing Materials Management**: Complete system for tracking packing materials inventory including cartons, filling materials, protective materials, and general supplies. Features include image upload with compression, dimension and weight tracking, cost management, and PM supplier integration with autocomplete search and "add new" dialog functionality.
- **Returns Management**: Professional returns processing system with enhanced UX featuring auto-selection, order history display, and real-time invoice totals. Includes intelligent order auto-population (single-order customers), order item auto-import, live return total calculation, status tracking with visual indicators, and comprehensive order history sidebar. Integrated from order details with session-based pre-fill support. Features barcode scanning for quick product entry with audio/visual feedback, automatic quantity increment for duplicate scans, and loading state protection to prevent false errors.
- **Services Management**: Comprehensive system for tracking repair bills and service work. Includes service creation with customer tracking, service cost and parts cost tracking (using Electronic Parts category), automatic cost calculations, status tracking (pending/in_progress/completed/cancelled), service items management for parts used, and full integration with order creation. Service bills can be added as order items alongside regular products, with visual distinction and proper cost calculations.
- **Expenses Management**: Professional invoice-style expense tracking with sticky sidebar preview, Czech date formatting, multi-currency support, invoice number tracking, payment method selection, status management, and comprehensive notes. Features streamlined data entry form with real-time summary updates, safe amount validation (z.coerce.number().positive()), and formatCurrency helper for undefined/NaN handling. Includes 20 realistic sample expenses covering supplier payments, shipping, utilities, equipment, marketing, and professional services. **Recurring Expenses**: Expandable section for setting up automatic recurring expenses (weekly, monthly, yearly) with customizable intervals, specific day/date selection, start/end dates, and real-time summary preview.
- **Product Bundles**: Comprehensive system with variant support, multiple pricing modes, and image upload with visual card display.
- **Point of Sale (POS)**: Full-featured system with thermal printer support, multi-currency, real-time cart, VAT calculation, and receipt generation, optimized for mobile.
- **AI-Powered Carton Packing Optimization**: Intelligent carton size selection using AI weight/dimension inference, best-fit decreasing packing algorithm with weight/volume constraints, automatic shipping cost estimation, and visual results.
- **Files Management System**: Comprehensive document management for product-related files.
- **Image Compression System**: Automatic lossless image compression to WebP with thumbnail generation.
- **Multi-Currency Support**: Sales prices restricted to CZK and EUR only; import costs support USD, CZK, and EUR with automatic exchange rate conversion. This B2B-focused design aligns with European market operations (Czech and German markets).
- **Search Functionality**: Comprehensive fuzzy search system with Vietnamese diacritics normalization across all pages. Features Levenshtein distance-based fuzzy matching, multi-field search support (name, SKU, email, phone, etc.), configurable scoring threshold (0.2 default), acronym matching, and intelligent result ranking. Implemented consistently across 15+ pages including Orders, Customers, Inventory, POS, Suppliers, Warehouses, Returns, Tickets, Expenses, and Discounts with debounced queries and minimum 2-character search requirements for optimal performance.
- **Reusable Components**: Generic DataTable with bulk selection, sorting, pagination, and actions.
- **Reporting**: Comprehensive sales, inventory, customer, and financial reports.
- **Landing Cost Engine**: Tracks import costs with volumetric weight calculations, multi-currency, and FX rate management. Features automatic cost allocation with multiple methods (AUTO, WEIGHT, VALUE, UNITS, HYBRID) and real-time preview. Landing costs calculate automatically after any cost changes (add/edit/delete) with comprehensive error handling and user feedback via destructive toasts. Includes prominent gradient-styled "Add Cost" button and streamlined UX without manual recalculation steps.
- **Smart Barcode Scanning**: Automatic shipment matching with audio/visual feedback.
- **UI Enhancements**: Modernized invoice UI, clear order detail displays, and optimized country/shipping flag selectors. **Sidebar State Persistence**: Advanced localStorage-based state management with defensive guards that remember sidebar scroll position, expanded menu items, and collapse state across sessions. Features comprehensive runtime type validation, automatic cleanup of corrupted data, and graceful error recovery to prevent crashes from malformed localStorage values.

# External Dependencies

## Database Services
- **Neon PostgreSQL**: Serverless PostgreSQL database.
- **Drizzle Kit**: Database migration and schema management.

## AI Services
- **DeepSeek AI**: Used for AI Address Parsing, ticket subject generation, and professional shipment name generation (deepseek-chat model) via OpenAI-compatible API. Shipment names are automatically generated based on cargo contents using industry-standard logistics terminology for B2B operations.
- **OpenAI API**: Used for AI-powered product weight and dimension inference in carton packing optimization.

## Other APIs
- **OpenStreetMap Nominatim API**: For address geocoding and auto-correction.
- **Fawaz Ahmed's free currency API**: For real-time exchange rates.
- **Facebook Graph API**: For fetching customer profile pictures and names.