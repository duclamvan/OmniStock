# Overview
Davie Supply is a comprehensive warehouse and order management system designed as a full-stack web application. Its primary purpose is to manage the complete order lifecycle from creation to fulfillment, track inventory, manage customers, and provide financial reporting with multi-currency support. Key capabilities include real-time Vietnamese diacritics search, customer-specific pricing system, and integration with external shipping APIs for order tracking. The business vision is to provide a robust, efficient platform for streamlined supply chain operations.

## Recent Updates (Jan 14, 2025 - Latest)
- Created comprehensive Pick & Pack page for warehouse fulfillment operations:
  - Added new "Pick & Pack" menu item above "To Fulfill" in Orders section
  - Real-time order fetching from database with automatic transformation to pick/pack workflow format
  - Interactive picking dialog with item-level tracking and barcode scanning simulation
  - Progress bars showing both picking and packing progress for each order
  - Warehouse location display for each item (auto-generated for demo purposes)
  - Employee identification and audio feedback toggles (success/error/scan sounds)
  - Quick Actions section with buttons for Quick Pick, Pick Route optimization, Reports, and Issues
  - Status cards with color-coded borders showing pending, picking, packing, and ready orders
  - Tabbed interface with icons and counts for each fulfillment stage
  - Mobile-responsive design optimized for warehouse handheld devices
  - Start/Continue/Pause picking workflows with real-time status updates
  - Batch picking support placeholder for multi-order fulfillment
  - Empty state alerts for each tab when no orders are present
  - Sound on/off toggle for warehouse environment preferences

## Previous Updates (Jan 10, 2025)
- Enhanced sidebar navigation with collapsible functionality:
  - Desktop sidebar can now collapse to icon-only mode with toggle button
  - Collapsed state persists in localStorage for user preference
  - Icon tooltips show on hover when sidebar is collapsed
  - Dropdown menus for nested items work in collapsed mode
  - Smooth transition animations for sidebar width changes
- Refined all sidebar icons with more appropriate visual representations:
  - Dashboard: LayoutDashboard icon
  - Discounts: Tag icon
  - Suppliers: Truck icon
  - Returns: RotateCcw icon
  - Expenses: DollarSign icon
  - POS: Store icon
- Created comprehensive MockupWarehouseLayout component demonstrating warehouse mapping features:
  - Interactive 2D floor plan with distinct zones (receiving, storage, picking, shipping, returns, quarantine)
  - Zone utilization visualization with color-coded indicators
  - Utilization heatmap showing rack capacity across warehouse
  - Zone details panel with statistics and metrics
  - Sample data showing 388 locations, 76.5% utilization, 13,491 items
- Fixed Warehouses navigation to show as dropdown menu with Warehouse Map option

## Previous Updates (Jan 10, 2025)
- Enhanced Warehouse Mapping feature with subpage routing and advanced designer:
  - Warehouse mapping now accessible as both standalone page (Warehouse > Warehouse Map) and as subpage from individual warehouse details
  - Added "Warehouse Mapping" button on each warehouse details page for context-specific mapping
  - Created Advanced Layout Designer with professional CAD-like features:
    - Scalable shapes with 8-point resize handles
    - Multi-element selection and editing
    - Alignment tools (left, center, right, top, middle, bottom)
    - Undo/redo with 50-state history
    - Copy/paste/duplicate functionality
    - Lock/unlock and show/hide elements
    - Properties panel with detailed element configuration
    - Layers panel for element management
    - Metadata support (temperature zones, hazmat areas, weight limits)
    - Keyboard shortcuts (Ctrl+Z, Ctrl+C, Ctrl+V, Delete, etc.)
    - Professional toolbar with zoom controls (25% to 300%)
    - Grid snap and rulers for precise positioning
  - Interactive map view showing hierarchical warehouse structure (zones, aisles, racks, shelves, bins)
  - 3D warehouse visualization with rotation and zoom
  - Import/export functionality for warehouse layouts (JSON format)
  - Sample warehouse data with 20 locations demonstrating full hierarchy

## Previous Updates (Jan 10, 2025)
- Added Warehouse Location Code field to inventory management:
  - New field in Add Product page to specify exact location within warehouse
  - Supports location codes like "A1-B2-C3" or "RACK-01-SHELF-05"
  - Helps track precise product placement (aisle, rack, shelf, bin)
- Added barcode scanning capabilities to Add Product page:
  - Individual barcode scan button in Stock Information section
  - Bulk Scan feature for Product Variants to assign multiple barcodes at once
  - Barcodes are automatically assigned to variants without barcodes (first to last)
  - Real-time counter showing variants without barcodes and entered barcodes
- Enhanced Add Product Variants popup "Create Series" feature with quantity and import costs for bulk variant creation
- Added auto-conversion between USD/CZK/EUR for series import costs (enter one currency, others auto-calculate)
- Fixed navigation flow: "Add Product" button from Category Details page now pre-selects the current category
- Improved series creation UI with clearer labeling and better field organization

## Previous Updates
- Created comprehensive Categories management system under Inventory section
- Added full CRUD operations for product categories (list, add, edit, delete, details)
- Categories page shows total products per category and prevents deletion of non-empty categories
- Category Details page displays all products within a category with stock values
- Integrated Categories into navigation menu under Inventory section
- Created comprehensive POS system with thermal printer support (80mm tape width)
- Fixed returns functionality by converting Drizzle queries to raw SQL due to internal Drizzle ORM errors with the returns table
- Returns endpoints (/api/returns and /api/returns/:id) now working properly with complete data retrieval
- Added expand/collapse all switch button for Orders table with localStorage persistence
- Fixed customer price creation error by properly handling empty variant_id field
- Fixed missing getRowKey prop in CustomerPrices DataTable component
- Fixed Edit Order page product ID mapping issues and validation
- Fixed order detail page to show base prices correctly with discounts shown separately
- Database reseeded with proper pricing data (all products have priceCzk and priceEur)
- Made shipping status and payment status changeable on order detail page with dropdown menus
- Added real-time status update functionality with immediate UI feedback and toast notifications
- Implemented comprehensive Product Bundles feature with standalone creation page
- Added robust product variant support for bundles with dynamic loading
- Created simplified bundle management UI with card-based layout and navigation to dedicated pages
- Fixed Bundle Details page type conversion errors by using parseFloat() for string price values
- Corrected bundle item creation API to properly map productVariantId to variantId column
- Added expandable color variant view in Bundle Details with scrollable list display
- Created 144 test color variants for SORAH Gel Polish product as demonstration data
- Fixed Bundle Details back button navigation to redirect to Product Bundles instead of all Products
- Removed double percentage symbol in pricing section discount display
- Deleted Quick Actions section from Bundle Details page
- Updated Statistics section to show Total Sold, Total Revenue, Total Profit metrics
- Added stock availability indicator to bundle items (green when in stock, red when insufficient)
- Created Bundle Edit page that mirrors Create Bundle page with data prefilling from existing bundle
- Fixed stock availability to use Product.quantity instead of non-existent stock field
- Fixed variant display to show barcode instead of non-existent SKU field
- Added Profit Margin % and Net Profit calculations to Bundle Details statistics section using import costs
- Improved bundles list UI by removing redundant Bundle badges and displaying full bundle names
- Redesigned Bundle Details page with mobile-first responsive design:
  - Mobile-optimized header with responsive button sizes and icon-only display on small screens
  - Reordered mobile layout: Bundle Information → Bundle Items → Statistics → Pricing (as requested)
  - Responsive typography with appropriate text sizes for all screen sizes
  - Touch-friendly interface with larger tap targets on mobile devices
  - Improved card padding and spacing for better mobile readability
- Fixed Edit Bundle variant prefilling issue where variant names weren't displayed after loading
  - Updated loadVariants function to update variant names after fetching from API
  - Fixed variant loading to trigger for all products in bundle, not just those with pre-selected variants
  - Ensures variant selector shows available variants for all products when editing bundles

# User Preferences
Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend
The client-side uses React and TypeScript with Vite. It features a component-based architecture utilizing Shadcn/ui (Radix UI primitives) for the UI, Tailwind CSS for styling, TanStack Query for state management, Wouter for routing, and React Hook Form with Zod for form handling. UI/UX decisions include a mobile-first responsive design, card-based layouts, sticky elements for enhanced navigation, and visual separation for improved user experience.

## Backend
The server-side is built with Express.js and TypeScript (ESM modules), featuring RESTful API endpoints with consistent error handling.

## Authentication System
The application leverages Replit's OpenID Connect (OIDC) for user authentication, using PostgreSQL-backed sessions with HTTP-only cookies for security.

## Database Design
The schema supports a comprehensive e-commerce workflow, including core entities like users, products, orders, customers, warehouses, suppliers, and returns. It covers complete order lifecycle management, inventory tracking (product variants, stock), financial tracking (sales, expenses, purchases with multi-currency), and an audit trail for user activities. PostgreSQL with Neon serverless driver and Drizzle ORM are used for type-safe operations and migrations.

## Core Features
- **Product Management**: Comprehensive product details, pricing, and location tracking.
- **Order Management**: Enhanced order creation with shipping and payment method selection, automatic shipping cost calculation, full CRUD operations, and detailed order views with timelines and stats. Real-time sync for order data is implemented.
- **Inventory Management**: Soft delete for products, optimized bulk operations for product variants, and detailed inventory UI.
- **Customer Management**: Enhanced customer tables with order statistics, Messenger integration placeholders, and comprehensive add/edit/details forms with address lookup. Automatic "Pay Later" badge for qualifying customers.
- **Discount Management**: Advanced discount system supporting percentage, fixed amount, and "Buy X Get Y" types, with auto-generated IDs, flexible application scopes (product/category/all products), and smart UI for dynamic field display and bidirectional currency conversion. Price previews show actual product prices and calculated discounts when specific product is selected.
- **Customer-Specific Pricing**: Custom pricing per customer-product combination with date ranges for validity periods. Prices automatically apply when creating orders for specific customers. Includes bulk import capability and management interface in customer details page. Price snapshots are stored with orders for historical tracking.
- **Supplier Management**: Complete CRUD functionality for suppliers, including file upload/management using object storage, purchase history tracking, and improved form UX with searchable dropdowns.
- **Warehouse Management**: Comprehensive warehouse management with details, file management via object storage, and proper navigation.
- **Returns Management**: Complete returns management with listing, add/edit forms, details pages, and integration to create return tickets directly from order details.
- **Expenses Management**: Redesigned expenses page with modern card layout, enhanced stats, visual status indicators, and streamlined add/edit expense forms with auto-generated IDs and real-time previews.
- **Product Bundles**: Comprehensive bundle management system with standalone creation page, robust product variant support, multiple pricing modes (percentage discount, fixed amount, per-item discount, set price per item, manual pricing), advanced variant selection (search, range selection, custom input), expandable variant display with individual delete capabilities, detailed bundle view page with pricing breakdown and statistics, duplicate/activate/deactivate functionality, expandable color variant view for bundle items showing all product variations, simplified card-based UI for managing bundled product offerings, and Order History section showing recent orders containing the bundle.
- **Point of Sale (POS)**: Full-featured POS system for walk-in customers with thermal printer support (80mm tape width), favorites and categories tabs for quick product selection, multi-currency support (EUR default, CZK), automatic date setting, payment method selection (Cash default, Pay Later, Bank Transfer), real-time cart management with quantity adjustments, VAT calculation (21%), receipt generation and direct thermal printing, cash payment with change calculation, product and bundle support, and mobile-optimized interface.
- **Multi-Currency Support**: Supports five currencies (CZK, EUR, USD, VND, CNY) with simplified exchange rate conversion and utility functions.
- **Search Functionality**: Real-time Vietnamese diacritics search with custom character normalization.
- **Reusable Components**: Generic DataTable component with bulk selection, sorting, pagination, and bulk actions.
- **Address Autocomplete**: Integration with OpenStreetMap's Nominatim API for real address geocoding.
- **Image Upload**: Image upload functionality for products storing images locally.
- **Reporting**: Comprehensive sales, inventory, customer, and financial reports with filtering capabilities.

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

## Other APIs
- **OpenStreetMap Nominatim API**: For address geocoding.
- **Fawaz Ahmed's free currency API**: For real-time exchange rates.