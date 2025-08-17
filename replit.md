# Overview
Davie Supply is a comprehensive warehouse and order management system designed as a full-stack web application. Its primary purpose is to manage the complete order lifecycle from creation to fulfillment, track inventory, manage customers, and provide financial reporting with multi-currency support. Key capabilities include real-time Vietnamese diacritics search, customer-specific pricing system, and integration with external shipping APIs for order tracking. The business vision is to provide a robust, efficient platform for streamlined supply chain operations, including advanced warehouse mapping and a comprehensive Pick & Pack workflow.

# User Preferences
Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend
The client-side uses React and TypeScript with Vite, built on a component-based architecture. It leverages Shadcn/ui (Radix UI primitives) for UI components, Tailwind CSS for styling, TanStack Query for state management, Wouter for routing, and React Hook Form with Zod for form handling. UI/UX decisions prioritize mobile-first responsive design, card-based layouts, sticky elements for navigation, and clear visual separation to enhance user experience. A comprehensive Pick & Pack page is implemented with interactive picking dialogs, progress tracking, warehouse location display, and mobile optimization for handheld devices. Warehouse mapping features an interactive 2D floor plan with zone utilization visualization, and an advanced layout designer with CAD-like functionalities including scalable shapes, multi-element selection, alignment tools, undo/redo, and layers.

## Backend
The server-side is built with Express.js and TypeScript (ESM modules), providing RESTful API endpoints with consistent error handling.

## Authentication System
The application uses Replit's OpenID Connect (OIDC) for user authentication, with PostgreSQL-backed sessions secured by HTTP-only cookies.

## Database Design
The schema supports a comprehensive e-commerce workflow, encompassing core entities such as users, products, orders, customers, warehouses, suppliers, and returns. It facilitates complete order lifecycle management, inventory tracking (including product variants and stock), financial tracking (sales, expenses, purchases with multi-currency support), and an audit trail for user activities. PostgreSQL with Neon serverless driver and Drizzle ORM are utilized for type-safe operations and migrations.

## Core Features
- **Product Management**: Comprehensive product details, pricing, location tracking, and barcode scanning capabilities.
- **Order Management**: Enhanced order creation, shipping and payment selection, automatic shipping cost calculation, full CRUD, detailed order views with timelines, and real-time data synchronization.
- **Inventory Management**: Soft product deletion, optimized bulk variant operations, detailed inventory UI, and comprehensive categories management with CRUD operations.
- **Customer Management**: Enhanced customer tables with order statistics, comprehensive add/edit/details forms with address lookup, and "Pay Later" badge functionality.
- **Discount Management**: Advanced discount system supporting various types (percentage, fixed, Buy X Get Y) with flexible application scopes and dynamic UI.
- **Customer-Specific Pricing**: Custom pricing per customer-product combination with validity periods, bulk import, and integration into the order creation process.
- **Supplier Management**: Full CRUD for suppliers, file upload, and purchase history tracking.
- **Warehouse Management**: Comprehensive management with file management and location code tracking for precise product placement.
- **Returns Management**: Complete returns management with listing, add/edit forms, details pages, and integration from order details.
- **Expenses Management**: Redesigned expenses page with modern UI, enhanced stats, and streamlined forms.
- **Product Bundles**: Comprehensive management system with standalone creation, robust product variant support, multiple pricing modes, advanced variant selection, detailed view pages with statistics, and duplicate/activate/deactivate functionality.
- **Point of Sale (POS)**: Full-featured POS system for walk-in customers with thermal printer support, multi-currency support, real-time cart management, VAT calculation, receipt generation, and mobile optimization.
- **AI-Powered Packing System**: Advanced carton selection algorithm that analyzes item dimensions, weight, and fragility to recommend optimal box combinations with cost efficiency analysis, visual carton representations with code names (E1-E2 for envelopes, K1-K3 for standard cartons, F1 for fragile protection, B1 for bottles), comprehensive packing workflow with smart checklists, automatic weight calculation, and shipping label integration.
- **Files Management System**: Comprehensive document management for MSDS, CPNP certificates, leaflets, and other product-related files with categorization by type, product linking, tagging system, and quick access during packing operations.
- **Multi-Currency Support**: Supports five currencies (CZK, EUR, USD, VND, CNY) with simplified exchange rate conversion.
- **Search Functionality**: Real-time Vietnamese diacritics search with custom character normalization.
- **Reusable Components**: Generic DataTable component with bulk selection, sorting, pagination, and actions.
- **Reporting**: Comprehensive sales, inventory, customer, and financial reports with filtering.

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