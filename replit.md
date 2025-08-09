# Overview
Davie Supply is a comprehensive warehouse and order management system designed as a full-stack web application. Its primary purpose is to manage the complete order lifecycle from creation to fulfillment, track inventory, manage customers, and provide financial reporting with multi-currency support. Key capabilities include real-time Vietnamese diacritics search, customer-specific pricing system, and integration with external shipping APIs for order tracking. The business vision is to provide a robust, efficient platform for streamlined supply chain operations.

## Recent Updates (Jan 9, 2025)
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
- **Product Bundles**: Comprehensive bundle management system with standalone creation page, robust product variant support, multiple pricing modes (percentage discount, fixed amount, per-item discount, set price per item, manual pricing), advanced variant selection (search, range selection, custom input), expandable variant display with individual delete capabilities, detailed bundle view page with pricing breakdown and statistics, duplicate/activate/deactivate functionality, expandable color variant view for bundle items showing all product variations, and simplified card-based UI for managing bundled product offerings.
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