# Overview
Davie Supply is a full-stack web application designed for comprehensive warehouse and order management. It aims to streamline supply chain operations by managing the entire order lifecycle, tracking inventory, customer management, and providing multi-currency financial reporting. Key capabilities include real-time Vietnamese diacritics search, customer-specific pricing, and integration with external shipping APIs. The project's ambition is to offer a robust and efficient platform for supply chain management, incorporating advanced warehouse mapping and a comprehensive Pick & Pack workflow.

# Recent Changes (October 2025)

## Invoice-Style Order Details UI (Completed)
- **Combined Layout**: Merged Order Items and Pricing Breakdown into single "Invoice" card for cleaner appearance
- **Professional Design**: Items listed at top, pricing breakdown at bottom with separator, creating traditional invoice flow
- **Enhanced Readability**: Larger, bolder grand total for emphasis and easier scanning

## Edit Order Storage Fix (Completed)
- **Fixed Update Order**: Added missing `deleteOrderItems()` method to properly update order items
- **Fixed Pick/Pack Logs**: Added `getPickPackLogs()` method to retrieve activity logs
- **Proper Item Replacement**: Order updates now correctly delete old items before adding new ones

## Pick & Pack Completion Button Fix (Completed)
- **Fixed Missing Storage Methods**: Added `createPickPackLog`, `updateOrderItemPickedQuantity`, and `updateOrderItemPackedQuantity` methods to storage implementation
- **Activity Logging**: Pick/pack activities now properly log to userActivities table for audit trail
- **Button Functionality**: "Complete Order - Ready for Shipping" button now works when all packing checklist items are completed
- **Database Status Mapping**: Fixed database enum mismatch by properly mapping pick/pack statuses to valid orderStatus enum values (pending, to_fulfill, ready_to_ship, shipped)

## POS Invoice Modification (Completed)
- **Recall Last Sale**: Added ability to recall and modify the most recent POS order after payment completion
- **Edit Mode Indicators**: Visual "Editing" badge and button text changes ("Update Order" instead of "Checkout")
- **Bundle/Variant Preservation**: Fixed critical bug where recalling orders with bundles or variants would convert them to plain products
- **Audit Trail**: Updated orders include "[Modified after completion]" note for tracking
- **Persistent Warehouse**: POS warehouse location persists using localStorage

## Order Status Update Bug Fix (Completed)
- Fixed critical bug where order status changes via dropdown in OrderDetails page were not persisting to database
- Root cause: DatabaseStorage.updateOrder() method was a stub that returned data without database update
- Solution: Implemented proper database update using Drizzle ORM with `db.update()` and `.returning()` pattern
- Also fixed DatabaseStorage.deleteOrder() to properly cascade delete order items before deleting order

## Order Delete Double Refresh Bug Fix (Completed)
- Fixed UI issue where deleting orders caused table to refresh/re-render twice, closing expanded rows
- Root cause: React Query invalidation triggered two state updates (isFetching change + data change)
- Solution: Implemented optimistic updates with onMutate to instantly remove deleted orders from cache, then sync with server in background
- Result: Smooth single-update deletion that preserves expanded row states

## Pick & Pack Orders Display Fix (Completed)
- Fixed critical bug where "To Fulfill" status orders were not appearing in Pick & Pack page
- Root cause: DatabaseStorage.getPickPackOrders() method was returning empty array and had invalid database enum values
- Solution: Implemented proper database query using valid orderStatus values and separate pickStatus/packStatus columns
- Method now properly filters orders by their fulfillment status and maps database values to frontend display

## DataTable UI Improvements (Completed)
- Implemented inline bulk actions across all pages (Orders, Inventory, Suppliers, Customers, Discounts, Warehouses, Expenses, Returns)
- Bulk action controls now appear inline next to page titles instead of underneath (prevents table shift when selecting items)
- Reduced top spacing on all tables using consistent padding pattern (px-4 sm:px-0 pb-3)
- Selection count badge and action buttons display next to title when items are selected
- Consistent design pattern applied across all 8 pages with DataTable components

# User Preferences
Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend
The client-side is built with React and TypeScript using Vite, following a component-based architecture. It utilizes Shadcn/ui (Radix UI primitives) for UI components, Tailwind CSS for styling, TanStack Query for state management, Wouter for routing, and React Hook Form with Zod for form handling. UI/UX design prioritizes mobile-first responsiveness, card-based layouts, sticky navigation, and clear visual separation. Features include an interactive Pick & Pack page optimized for handheld devices, and advanced warehouse mapping with an interactive 2D floor plan and a CAD-like layout designer.

## Backend
The server-side is implemented with Express.js and TypeScript (ESM modules), offering RESTful API endpoints with consistent error handling.

## Authentication System
Authentication uses Replit's OpenID Connect (OIDC), with PostgreSQL-backed sessions secured by HTTP-only cookies.

## Database Design
The database schema, managed with PostgreSQL, Neon serverless driver, and Drizzle ORM, supports a comprehensive e-commerce workflow. It includes core entities for users, products, orders, customers, warehouses, suppliers, and returns. The design facilitates complete order lifecycle management, inventory tracking (including variants and stock), multi-currency financial tracking, and an audit trail for user activities.

## Core Features
- **Product Management**: Comprehensive product details, pricing, location tracking, barcode scanning, document management (SDS, CPNP, etc.), and packing instructions.
- **Order Management**: Creation, shipping/payment selection, automatic shipping cost calculation, CRUD operations, detailed views, and real-time synchronization.
- **Inventory Management**: Soft product deletion, bulk variant operations, detailed UI, and comprehensive category management.
- **Customer Management**: Enhanced tables with order statistics, forms with address lookup, and "Pay Later" functionality.
- **Discount Management**: Advanced system supporting various types (percentage, fixed, Buy X Get Y) with flexible scopes.
- **Customer-Specific Pricing**: Custom pricing per customer-product with validity periods and bulk import.
- **Supplier Management**: CRUD operations, file upload, and purchase history.
- **Warehouse Management**: Comprehensive management with file management and location code tracking. Includes professional barcode scanning for warehouse locations, primary location designation, and quantity tracking per item.
- **Returns Management**: Complete system with listing, forms, details, and integration from order details.
- **Expenses Management**: Modern UI, enhanced stats, and streamlined forms.
- **Product Bundles**: Comprehensive system with variant support, multiple pricing modes, and detailed views.
- **Point of Sale (POS)**: Full-featured system for walk-in customers with thermal printer support, multi-currency, real-time cart, VAT calculation, receipt generation, and mobile optimization.
- **AI-Powered Packing System**: Advanced carton selection algorithm based on dimensions, weight, and fragility; visual carton representations; packing workflow with checklists; automatic weight calculation; and shipping label integration.
- **Files Management System**: Comprehensive document management for product-related files with categorization, linking, tagging, and quick access.
- **Image Compression System**: Automatic lossless image compression to WebP using Sharp, with thumbnail generation and batch processing.
- **Multi-Currency Support**: Supports five currencies (CZK, EUR, USD, VND, CNY) with simplified exchange rate conversion.
- **Search Functionality**: Real-time Vietnamese diacritics search with custom character normalization.
- **Reusable Components**: Generic DataTable with bulk selection, sorting, pagination, and actions.
- **Reporting**: Comprehensive sales, inventory, customer, and financial reports with filtering.
- **Landing Cost Engine**: Tracks import costs (CIF, customs duty) with volumetric weight calculations, multi-currency support, and FX rate management.
- **Smart Barcode Scanning**: Automatic shipment matching by tracking numbers with audio/visual feedback.

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