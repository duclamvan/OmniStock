# Overview
Davie Supply is a comprehensive warehouse and order management system designed as a full-stack web application. Its primary purpose is to manage the complete order lifecycle from creation to fulfillment, track inventory, manage customers, and provide financial reporting with multi-currency support. Key capabilities include real-time Vietnamese diacritics search and integration with external shipping APIs for order tracking. The business vision is to provide a robust, efficient platform for streamlined supply chain operations.

## Recent Changes (August 4-5, 2025)
- **Performance Optimization**: Added bulk API endpoints for product variant operations to improve performance when creating series and deleting multiple variants
- **Fixed TypeScript Errors**: Resolved type annotations in AddProduct and EditProduct components
- **Query Optimization**: Added query configuration to prevent excessive re-fetching of product variants data
- **Bulk Delete Fix**: Changed bulk delete endpoint from DELETE to POST method to ensure request body is properly handled
- **Inventory UI Improvements**: Removed SKU column, made product names more visible with proper width constraints, and shortened quantity column header to "Qty"
- **Soft Delete Implementation**: Converted product deletion to soft delete by adding isActive flag, preserving referential integrity with existing orders while hiding inactive products from inventory views
- **Sales to Discounts Rename**: Renamed all "Sales" references to "Discounts" throughout the application including navigation, routes (/sales to /discounts), API endpoints (/api/sales to /api/discounts), and all UI components
- **Discounts Data Reset**: Added /api/reseed-discounts endpoint to clear and repopulate discount data with fresh examples
- **Discount System Overhaul**: Completely redesigned discount system removing "Code" field, implementing auto-generated discount IDs (#YEARNAME format), adding percentage-only discounts (integer field), dynamic application scopes (specific product, all products, specific category, selected products), and status management (active/inactive/finished)
- **Customers Page Update**: Enhanced customers table with order statistics (total orders, total sales, last purchase date) and added Messenger integration with blacklist functionality placeholder
- **Edit Customer Page**: Created comprehensive edit customer form with prefilled data, address lookup integration, organized sections for basic info, contact & address (combined), and notes
- **Customer Details Page**: Added dedicated customer details view showing customer type, total orders, total spent, contact & address info, notes, and complete order history with clickable order links
- **Order Details Page**: Created comprehensive order details page for viewing orders without editing functionality, with proper status formatting (e.g., "To Fulfill" instead of "to_fulfill") and color coding
- **Enhanced Order Details Page**: Added comprehensive features including quick stats cards, order timeline, pricing breakdown, customer information, and action buttons for print/share/export
- **Expandable Order Rows**: Modified DataTable component to support expandable rows and implemented expandable order rows in AllOrders table to quickly view order items, with click-to-view functionality for full order details
- **Enhanced UI Separation**: Improved visual separation between expanded order rows with blue left borders, light gray backgrounds, gradient fade effects, and thicker bottom borders for better user experience
- **Real-Time Sync Implementation**: Added automatic data refresh (5-second intervals for order details, 10-second intervals for order lists) with visual sync indicators showing when data is being updated
- **Shipping Status Enhancement**: Updated shipping status display to properly sync with order status changes, showing green checkmark when shipped and automatically setting shippedAt timestamp when order status changes to "shipped"
- **Suppliers Management**: Implemented complete Suppliers CRUD functionality with AllSuppliers table featuring Vietnamese search, AddSupplier/EditSupplier forms, comprehensive SupplierDetails page showing products and purchase history
- **Supplier Detail Enhancements**: Added purchase history section to supplier details with compact product rows for better visibility, purchase statistics including total purchases count, and proper TypeScript error handling for date fields
- **Purchase History API**: Added /api/purchases endpoint to server routes enabling frontend to fetch purchase history data for supplier details page
- **Supplier Form Updates**: Removed duplicate "Supplier Link" field from Add/Edit Supplier forms (redundant with Website field) and replaced Country text input with searchable dropdown using Command component for better UX
- **Supplier File Management**: Implemented complete file upload functionality for suppliers using object storage - added supplier_files table, ObjectUploader component with drag-and-drop support, file management APIs, and integrated file upload/display/delete features in both SupplierDetails and EditSupplier pages
- **Warehouse Management System**: Completed comprehensive warehouse management with AllWarehouses listing page, WarehouseDetails with file management, EditWarehouse form with all required fields (status, rented from date, expense ID, notes, attachments), database schema updates with warehouseFiles table, and proper navigation between warehouse pages
- **Warehouse File Management**: Integrated object storage for warehouse documents - added warehouse file upload/download/delete APIs, ObjectUploader integration for drag-and-drop file uploads, file display with size formatting and download links, and proper ACL permissions for warehouse files
- **Returns Management System**: Implemented complete returns management with AllReturns listing page featuring stats cards and Vietnamese search, AddReturn form with auto-generated return IDs, EditReturn form with prefilled data, ReturnDetails page showing return information/timeline/items, database schema with returns and returnItems tables, full CRUD APIs, and navigation integration
- **Smart Layout Enhancements**: Redesigned Add Order and Add Product pages with modern flex layouts featuring sticky right columns that remain fixed while scrolling through main content, improved visual hierarchy with gradient headers, comprehensive summary cards with real-time calculations, and enhanced user experience with better spacing and typography

# User Preferences
Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend
The client-side uses React and TypeScript with Vite. It features a component-based architecture utilizing:
- **UI Framework**: Shadcn/ui (Radix UI primitives)
- **Styling**: Tailwind CSS with CSS variables
- **State Management**: TanStack Query
- **Routing**: Wouter
- **Form Handling**: React Hook Form with Zod

## Backend
The server-side is built with Express.js and TypeScript (ESM modules). Key aspects include:
- **API Design**: RESTful API endpoints with consistent error handling
- **Database**: PostgreSQL with Neon serverless driver
- **ORM**: Drizzle ORM for type-safe operations and migrations
- **Session Management**: Express sessions with PostgreSQL storage

## Authentication System
The application leverages Replit's OpenID Connect (OIDC) for user authentication, using PostgreSQL-backed sessions with HTTP-only cookies for security.

## Database Design
The schema supports a comprehensive e-commerce workflow, including core entities like users, products, orders, customers, warehouses, and suppliers. It covers complete order lifecycle management, inventory tracking (product variants, stock), financial tracking (sales, expenses, purchases with multi-currency), and an audit trail for user activities.

## Multi-Currency Support
The system supports five currencies (CZK, EUR, USD, VND, CNY) with simplified exchange rate conversion and currency utility functions.

## Search Functionality
Includes real-time Vietnamese diacritics search with custom character normalization for accent-insensitive results across all entities.

## Development Setup
The project is structured as a monorepo with shared TypeScript types and Zod schemas. It uses path aliases and development tools like hot reload for efficient development.

## Core Features
- **Product Management**: Comprehensive product details page with key metrics, pricing, and location details.
- **Order Management**: Enhanced order creation with shipping and payment method selection, automatic shipping cost calculation, and full CRUD operations.
- **Responsive Design**: Mobile-first responsive design implemented across all pages, featuring clean, card-based layouts.
- **Address Autocomplete**: Integration with OpenStreetMap's Nominatim API for real address geocoding in forms.
- **Data Management**: Comprehensive mock data seeding system for testing and development.
- **Reusable Components**: Generic DataTable component with features like bulk selection, sorting, pagination, and bulk actions.
- **Image Upload**: Image upload functionality for products via Multer, storing images locally.
- **Reporting**: Comprehensive sales, inventory, customer, and financial reports with filtering capabilities.
- **CRUD Operations**: Full CRUD functionality implemented for warehouses, customers, sales/discounts, products/orders, and returns, with robust error handling and foreign key constraint validation.
- **Discount Management**: Advanced discount system with auto-generated IDs, percentage-based discounts, flexible application scopes (product/category/all products), and automatic integration with order creation to apply active discounts.

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

## Development and Build Tools
- **Vite**: Frontend build tool.
- **ESBuild**: Fast JavaScript bundler.
- **TypeScript**: Type safety across the application.

## Other APIs
- **OpenStreetMap Nominatim API**: For address geocoding.
- **Fawaz Ahmed's free currency API**: For real-time exchange rates.