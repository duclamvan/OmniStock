# Overview
Davie Supply is a full-stack web application for comprehensive warehouse and order management. It streamlines the entire order lifecycle, tracks inventory, manages customers, and provides multi-currency financial reporting. Key features include real-time Vietnamese diacritics search, customer-specific pricing, and integration with external shipping APIs. The project aims to deliver a robust and efficient platform for supply chain operations, incorporating advanced warehouse mapping and a comprehensive Pick & Pack workflow.

# User Preferences
Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend
The client uses React and TypeScript with Vite, built on a component-based architecture using Shadcn/ui (Radix UI primitives) and Tailwind CSS. It leverages TanStack Query for state management, Wouter for routing, and React Hook Form with Zod for form handling. UI/UX prioritizes mobile-first responsive design, card-based layouts, and clear visual separation. The system includes an interactive Pick & Pack page optimized for mobile, and advanced warehouse mapping with an interactive 2D floor plan, zone utilization visualization, and a CAD-like layout designer.

## Backend
The server is built with Express.js and TypeScript (ESM modules), providing RESTful API endpoints with consistent error handling.

## Authentication System
Authentication is handled via Replit's OpenID Connect (OIDC), with PostgreSQL-backed sessions secured by HTTP-only cookies.

## Database Design
The PostgreSQL database, utilizing Neon serverless driver and Drizzle ORM, supports a comprehensive e-commerce workflow. It includes entities for users, products (with variants and stock), orders, customers, warehouses, suppliers, returns, and financial tracking (sales, expenses, purchases with multi-currency). An audit trail for user activities is also maintained.

## Core Features
- **Product Management**: Comprehensive details, pricing, location tracking, and barcode scanning.
- **Order Management**: Enhanced creation, shipping/payment selection, automatic shipping cost calculation, full CRUD, detailed views with timelines, and real-time data sync.
- **Inventory Management**: Soft product deletion, bulk variant operations, detailed UI, and comprehensive categories management.
- **Customer Management**: Enhanced tables with order statistics, forms with address lookup, and "Pay Later" badge.
- **Discount Management**: Advanced system supporting various types (percentage, fixed, Buy X Get Y) and flexible application scopes.
- **Customer-Specific Pricing**: Custom pricing per customer-product combination with validity periods and bulk import.
- **Supplier Management**: Full CRUD, file upload, and purchase history.
- **Warehouse Management**: Comprehensive management with file management and location code tracking.
- **Returns Management**: Complete management with listing, add/edit forms, and integration from order details.
- **Expenses Management**: Modern UI, enhanced stats, and streamlined forms.
- **Product Bundles**: Comprehensive system with variant support, multiple pricing modes, and detailed views.
- **Point of Sale (POS)**: Full-featured system for walk-in customers with thermal printer support, multi-currency, real-time cart, VAT calculation, and receipt generation.
- **AI-Powered Packing System**: Advanced carton selection algorithm based on item dimensions, weight, and fragility, with cost efficiency analysis, visual carton representations, packing workflow with checklists, automatic weight calculation, and shipping label integration.
- **Files Management System**: Comprehensive document management for product-related files (MSDS, CPNP, etc.) with categorization, product linking, tagging, and quick access during packing.
- **Image Compression System**: Automatic lossless image compression to WebP format using Sharp library, with thumbnail generation and batch processing.
- **Multi-Currency Support**: Supports five currencies (CZK, EUR, USD, VND, CNY) with simplified exchange rate conversion.
- **Search Functionality**: Real-time Vietnamese diacritics search.
- **Reporting**: Comprehensive sales, inventory, customer, and financial reports with filtering.

# External Dependencies

## Database Services
- **Neon PostgreSQL**
- **Drizzle Kit**

## Authentication Services
- **Replit OIDC**
- **OpenID Client**

## UI and Styling
- **Radix UI**
- **Tailwind CSS**
- **Lucide React**

## Other APIs
- **OpenStreetMap Nominatim API**: For address geocoding.
- **Fawaz Ahmed's free currency API**: For real-time exchange rates.