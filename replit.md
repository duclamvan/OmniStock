# Overview
Davie Supply is a full-stack web application for comprehensive warehouse and order management. Its core purpose is to streamline supply chain operations, covering the entire order lifecycle, inventory tracking, customer relationship management, and multi-currency financial reporting. Key capabilities include real-time Vietnamese diacritics search, customer-specific pricing, and integration with external shipping APIs. The project aims to provide a robust and efficient platform for supply chain management, incorporating advanced features like warehouse mapping and a comprehensive Pick & Pack workflow, with ambitions for AI-powered optimization.

# User Preferences
Preferred communication style: Simple, everyday language.

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
- **Order Management**: Creation, shipping/payment selection, automatic shipping cost calculation, CRUD operations, detailed views, real-time synchronization, and a custom order ID format. Includes "Pay Later" and editable priority.
- **Inventory Management**: Soft product deletion, bulk variant operations, and comprehensive category management.
- **Customer Management**: Enhanced tables with order statistics, forms with address lookup, "Pay Later" functionality, and comprehensive Facebook integration with real-time name syncing and profile picture fetching. Includes AI-powered Smart Paste for address parsing (available in both Add Customer and Add Order pages) with DeepSeek AI and Nominatim auto-correction. Shipping address labels auto-generate from form fields (company/name + street + city) and remain editable with smart regeneration on data changes. Add Order page's "New Customer Details" form features consistent slate color scheme and separate street/streetNumber fields for better address structure.
- **Discount Management**: Advanced system supporting various types (percentage, fixed, Buy X Get Y) with flexible scopes.
- **Customer-Specific Pricing**: Custom pricing per customer-product with validity periods.
- **Supplier Management**: CRUD operations, file upload, and purchase history, with centralized supplier information.
- **Warehouse Management**: Management with file handling, location codes, barcode scanning, and quantity tracking.
- **Returns Management**: Complete system integrated from order details.
- **Expenses Management**: Streamlined UI and forms.
- **Product Bundles**: Comprehensive system with variant support and multiple pricing modes.
- **Point of Sale (POS)**: Full-featured system with thermal printer support, multi-currency, real-time cart, VAT calculation, and receipt generation, optimized for mobile.
- **AI-Powered Carton Packing Optimization**: Intelligent carton size selection using AI weight/dimension inference, best-fit decreasing packing algorithm with weight/volume constraints, automatic shipping cost estimation, and visual results.
- **Files Management System**: Comprehensive document management for product-related files.
- **Image Compression System**: Automatic lossless image compression to WebP with thumbnail generation.
- **Multi-Currency Support**: Supports five currencies (CZK, EUR, USD, VND, CNY) with exchange rate conversion.
- **Search Functionality**: Real-time Vietnamese diacritics search with custom character normalization.
- **Reusable Components**: Generic DataTable with bulk selection, sorting, pagination, and actions.
- **Reporting**: Comprehensive sales, inventory, customer, and financial reports.
- **Landing Cost Engine**: Tracks import costs with volumetric weight calculations, multi-currency, and FX rate management.
- **Smart Barcode Scanning**: Automatic shipment matching with audio/visual feedback.
- **UI Enhancements**: Modernized invoice UI, clear order detail displays, and optimized country/shipping flag selectors.

# External Dependencies

## Database Services
- **Neon PostgreSQL**: Serverless PostgreSQL database.
- **Drizzle Kit**: Database migration and schema management.

## AI Services
- **DeepSeek AI**: Used for AI Address Parsing (deepseek-chat model) via OpenAI-compatible API.
- **OpenAI API**: Used for AI-powered product weight and dimension inference in carton packing optimization.

## Other APIs
- **OpenStreetMap Nominatim API**: For address geocoding and auto-correction.
- **Fawaz Ahmed's free currency API**: For real-time exchange rates.
- **Facebook Graph API**: For fetching customer profile pictures and names.