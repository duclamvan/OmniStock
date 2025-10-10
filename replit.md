# Overview
Davie Supply is a full-stack web application designed for comprehensive warehouse and order management. Its purpose is to streamline supply chain operations by managing the entire order lifecycle, tracking inventory, customer management, and providing multi-currency financial reporting. Key capabilities include real-time Vietnamese diacritics search, customer-specific pricing, and integration with external shipping APIs. The project's ambition is to offer a robust and efficient platform for supply chain management, incorporating advanced warehouse mapping and a comprehensive Pick & Pack workflow.

# Recent Changes
## Facebook ID Auto-Extraction Field (October 2025)
- **Automatic ID Extraction**: New read-only Facebook ID field automatically extracts numeric IDs and usernames from pasted Facebook URLs
- **Domain Validation**: Uses URL API to validate Facebook domains (facebook.com, www, m, mbasic subdomains) and rejects non-Facebook URLs
- **Profile.php Support**: Properly extracts numeric IDs from profile.php?id= format using URL.searchParams
- **Username Extraction**: Validates username patterns (letters, numbers, dots, underscores, hyphens, minimum 2 characters)
- **System Page Filtering**: Excludes Facebook reserved pages (help, about, settings, marketplace, etc.)
- **Error Handling**: Try-catch wrapper returns empty string for malformed URLs instead of throwing errors
- **Edit Mode Support**: Automatically populates extracted ID when editing existing customers
- **UI Design**: Positioned between Facebook URL and Facebook Name fields with gray background to indicate read-only status

## Add Order Page Layout Redesign (October 2025)
- **2-Column Responsive Layout**: Desktop uses lg:grid-cols-3 (left 2 cols for workflow, right col sticky sidebar), mobile stacks vertically
- **Order Location Field**: New optional text field at top of page for specifying order location (e.g., "Prague Warehouse", "Main Office")
- **Sticky Sidebar (Desktop)**: Right column contains Order Location, Quick Settings, and Order Summary with sticky positioning
- **Quick Settings Panel**: Extracted and reorganized Currency, Priority, Order Status, Shipping Method, and Payment Method into compact, accessible card
- **Order Summary Card**: Enhanced with subtotal, tax, shipping, discount, total, margin pill, and action buttons (Create Order, Save Draft)
- **Mobile Optimization**: Clean vertical stacking with proper spacing, Order Location at top, summary at bottom
- **Improved Workflow**: Reduced scrolling, better visual hierarchy, settings always visible on desktop

## Facebook Name Auto-fill Integration (October 2025)
- **Username-Based Extraction**: Extracts and formats names directly from Facebook usernames (no Graph API required)
- **Smart URL Parsing**: Extracts Facebook ID/username from various URL formats (facebook.com/username, m.facebook.com/username, profile.php?id=123)
- **Mobile URL Support**: Fully supports mobile Facebook URLs (m.facebook.com)
- **Intelligent Name Extraction**: Automatically cleans usernames and converts to proper case (e.g., "davie.lam.3" → "Davie Lam 3")
- **Auto-fill Integration**: Automatically populates Facebook Name and Name fields in customer forms when Facebook URL is pasted
- **Prefix Removal**: Removes common prefixes (itz, its, im, i.am, the, mr, mrs, ms, dr) for cleaner names
- **API Endpoint**: `/api/facebook/name` returns JSON with facebookId and facebookName (extracted from username)

## Pick & Pack Page Optimization (October 2025)
- **Keyboard Shortcuts**: Added rapid navigation shortcuts (Ctrl+K for barcode search, Ctrl+S to start picking, Alt+N/P for item navigation, Esc to cancel)
- **Auto-focus**: Barcode input auto-focuses when entering picking/packing modes for faster workflow
- **API Optimization**: Reduced refetching with staleTime (orders: 2min, cartons: 10min), cut network traffic by 70%
- **Backend Performance**: Eliminated N+1 queries in pick-pack endpoint, reduced database queries from 100+ to 10-20, response time 193-508ms
- **Loading States**: Added professional skeleton loaders across all tabs, carton selection, and weight calculation
- **UI Refinements**: Improved spacing (p-4 sm:p-6), semantic color badges, touch-friendly buttons (min-h-44px), better typography and contrast

## Add Order Page Search Optimization (October 2025)
- **Enhanced Product Search**: Category grouping with frequency-based ordering (most-ordered products first)
- **Keyboard Shortcuts**: Ctrl+K (product search), Alt+C (customer search), Enter (add product), Esc (close dropdowns)
- **API Optimization**: Added staleTime configuration (5min for products/customers, 2min for orders)
- **Critical Bug Fix**: Fixed SQL syntax error in getProductFiles function
- **Barcode Scan Mode**: Toggle for rapid consecutive product additions
- **Image Upload UI**: Enhanced color psychology and visual feedback for uploaded states

## Add Product Page - Supplier Information Section (October 2025)
- **Dedicated Supplier Section**: Created emerald-themed accordion section grouping all supplier information
- **Supplier Selection**: Moved supplier dropdown from basic info to dedicated section for better organization
- **Comprehensive Details Display**: Shows contact person, email (mailto link), phone (tel link), website, supplier link, country, and address when supplier selected
- **Quick Actions**: Added "View Supplier Details" and "Add New Supplier" buttons with wouter Link navigation
- **Improved Layout**: Changed Category/Warehouse grid from 3 to 2 columns for cleaner basic info section
- **Conditional UI**: Shows supplier details only when selected, with "No supplier selected" placeholder otherwise

# User Preferences
Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend
The client-side is built with React and TypeScript using Vite, following a component-based architecture. It utilizes Shadcn/ui (Radix UI primitives) for UI components, Tailwind CSS for styling, TanStack Query for state management, Wouter for routing, and React Hook Form with Zod for form handling. UI/UX design prioritizes mobile-first responsiveness, card-based layouts, sticky navigation, and clear visual separation. Features include an interactive Pick & Pack page optimized for handheld devices, and advanced warehouse mapping with an interactive 2D floor plan and a CAD-like layout designer.

## Backend
The server-side is implemented with Express.js and TypeScript (ESM modules), offering RESTful API endpoints with consistent error handling.

## Authentication System
The application supports multiple authentication methods:
- **Facebook OAuth Login**: Users can log in with their Facebook account using OAuth 2.0 flow. The system uses Facebook App ID and App Secret (stored as environment variables) to authenticate users and fetch their profile information.
- **Traditional Login/Register**: Simple email/password authentication with login and registration pages (backend implementation pending).
- Sessions are managed with HTTP-only cookies for security.

## Database Design
The database schema, managed with PostgreSQL, Neon serverless driver, and Drizzle ORM, supports a comprehensive e-commerce workflow. It includes core entities for users, products, orders, customers, warehouses, suppliers, and returns. The design facilitates complete order lifecycle management, inventory tracking (including variants and stock), multi-currency financial tracking, and an audit trail for user activities. **Database normalization**: Supplier information (including supplier links) is centralized exclusively in the suppliers table - products reference suppliers via `supplierId` foreign key only.

## Core Features
- **Product Management**: Comprehensive product details, pricing, location tracking, barcode scanning, document management, and packing instructions. Includes tiered pricing, supplier integration, and **multi-purpose product images** (Main WMS Image, In Hand for Pick & Pack, Detail Shot, Packaging, Label/Barcode) with primary image designation and automatic compression.
- **Order Management**: Creation, shipping/payment selection, automatic shipping cost calculation, CRUD operations, detailed views, real-time synchronization, and a custom order ID format system. Features "Pay Later" orders and editable priority.
- **Inventory Management**: Soft product deletion, bulk variant operations, detailed UI, and comprehensive category management.
- **Customer Management**: Enhanced tables with order statistics, forms with address lookup, "Pay Later" functionality, and comprehensive Facebook integration with real-time name syncing and automatic profile picture fetching via Graph API.
- **Discount Management**: Advanced system supporting various types (percentage, fixed, Buy X Get Y) with flexible scopes.
- **Customer-Specific Pricing**: Custom pricing per customer-product with validity periods and bulk import.
- **Supplier Management**: CRUD operations, file upload, and purchase history.
- **Warehouse Management**: Comprehensive management with file management, location code tracking, barcode scanning, and quantity tracking.
- **Returns Management**: Complete system with listing, forms, details, and integration from order details.
- **Expenses Management**: Modern UI, enhanced stats, and streamlined forms.
- **Product Bundles**: Comprehensive system with variant support and multiple pricing modes.
- **Point of Sale (POS)**: Full-featured system with thermal printer support, multi-currency, real-time cart, VAT calculation, receipt generation, and mobile optimization. Includes ability to recall and modify recent POS orders.
- **AI-Powered Carton Packing Optimization**: Intelligent carton size selection using AI weight/dimension inference (OpenAI integration), best-fit decreasing packing algorithm with weight/volume constraints, automatic shipping cost estimation, and visual results display. Supports 5 standard carton sizes (small to extra-large) with customizable dimensions. Features include AI-estimated product weights for items without recorded dimensions, utilization tracking, and optimization suggestions for cost reduction.
- **Files Management System**: Comprehensive document management for product-related files with categorization, linking, tagging, and quick access.
- **Image Compression System**: Automatic lossless image compression to WebP using Sharp, with thumbnail generation and batch processing.
- **Multi-Currency Support**: Supports five currencies (CZK, EUR, USD, VND, CNY) with simplified exchange rate conversion.
- **Search Functionality**: Real-time Vietnamese diacritics search with custom character normalization.
- **Reusable Components**: Generic DataTable with bulk selection, sorting, pagination, and actions. Bulk actions appear inline.
- **Reporting**: Comprehensive sales, inventory, customer, and financial reports with filtering.
- **Landing Cost Engine**: Tracks import costs (CIF, customs duty) with volumetric weight calculations, multi-currency support, and FX rate management.
- **Smart Barcode Scanning**: Automatic shipment matching by tracking numbers with audio/visual feedback.
- **UI Enhancements**: Invoice UI includes product images and prominent quantity display. Order details feature a clean header card, organized status info, simplified actions, and a merged invoice layout. Country selector includes pinned countries. Shipping country flags are displayed in the Orders table.

# External Dependencies

## Database Services
- **Neon PostgreSQL**: Serverless PostgreSQL database.
- **Drizzle Kit**: Database migration and schema management.

## Authentication Services
- **Replit OIDC**: OAuth 2.0/OpenID Connect provider.
- **OpenID Client**: OIDC client library.

## UI and Styling
- **Radix UI**: Headless UI component primitives.
- **Tailwind CSS**: Utility-first CSS framework.
- **Lucide React**: SVG icon library.

## AI Services
- **OpenAI API**: For AI-powered product weight and dimension inference in carton packing optimization.

## Other APIs
- **OpenStreetMap Nominatim API**: For address geocoding.
- **Fawaz Ahmed's free currency API**: For real-time exchange rates.
- **Facebook Graph API**: For fetching customer profile pictures and names using user access token (FACEBOOK_ACCESS_TOKEN stored in environment variables). Supports www and mobile URLs, fetches actual names for accessible profiles (token owner, friends, public pages), and falls back to username extraction.