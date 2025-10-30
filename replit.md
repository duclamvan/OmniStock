# Overview
Davie Supply is a full-stack web application for comprehensive warehouse and order management, aiming to optimize supply chain operations. It covers the entire order lifecycle, inventory tracking, CRM, and multi-currency financial reporting. Key features include real-time Vietnamese diacritics search, customer-specific pricing, external shipping API integrations, and extensive settings management. Future ambitions include advanced warehouse mapping, a comprehensive Pick & Pack workflow, and AI-powered optimization.

# Recent Changes
**October 30, 2025**: Unified Pick & Pack Card Layouts Across All Tabs:
- Standardized all order cards across Pending, Picking, Packing, and Ready tabs to use consistent 2x2 grid on mobile, 4-column grid on desktop
- Unified information positioning order: Customer → Country → Items → (Shipping Method or Picked By)
- Ensures predictable scanning pattern and better user experience when switching between different workflow stages
- All cards now have the same visual structure, spacing, and information hierarchy

# User Preferences
Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend
A React and TypeScript application built with Vite, utilizing Shadcn/ui (Radix UI primitives), Tailwind CSS for styling, TanStack Query for state management, Wouter for routing, and React Hook Form with Zod for validation. It features a mobile-first, card-based responsive design, interactive Pick & Pack interface, advanced warehouse mapping with a 2D floor plan, and unified form components for creation and editing.

## Backend
An Express.js application written in TypeScript (ESM modules), providing RESTful API endpoints with consistent error handling.

## Authentication System
Supports Facebook OAuth Login and traditional email/password authentication, with session management via HTTP-only cookies.

## Database Design
Utilizes PostgreSQL with Neon serverless driver and Drizzle ORM. The schema supports a full e-commerce workflow, including users, products, orders, customers, warehouses, suppliers, returns, inventory tracking (variants, stock), multi-currency financial tracking, and an audit trail.

## Core Features
- **Product & Order Management**: Comprehensive CRUD for products and orders, including detailed info, pricing, location tracking, barcode scanning, grouped packing instructions, tiered pricing, multi-purpose images, variant support, custom order IDs, auto shipping cost, and enhanced product search with smart fuzzy matching and Vietnamese diacritics.
- **Inventory & Warehouse Management**: Full inventory tracking with variant operations, category management, location codes, barcode scanning, quantity tracking, professional column visibility, interactive 2D warehouse map with real inventory data, and rapid barcode scanning for stock additions. Includes inventory allocation warnings for over/under-allocated items.
- **Customer Management**: Enhanced tables with order statistics, address lookup, "Pay Later," Facebook integration, AI-powered Smart Paste for address parsing, and auto-generating/editable shipping labels.
- **Financial & Discount Management**: Advanced discount system, customer-specific pricing, multi-currency support (CZK/EUR/USD) with automatic exchange rate conversion, landing cost engine with volumetric weight and automatic cost allocation, and expense tracking.
- **Fulfillment & Logistics**: AI-powered carton packing optimization using weight/dimension inference, best-fit algorithms, automatic shipping cost estimation, separate fulfillment sub-status tracking (`fulfillmentStage`), and performance analytics with precise time predictions. Returns management system with auto-selection and barcode scanning. Packing materials management.
- **Point of Sale (POS)**: Full-featured system with thermal printer support, multi-currency, real-time cart, VAT calculation, and receipt generation.
- **System Utilities**: Comprehensive files management, automatic lossless image compression to WebP, robust fuzzy search with diacritics normalization, generic DataTable component, reporting, and extensive settings management (6 categories).

# External Dependencies

## Database Services
- **Neon PostgreSQL**
- **Drizzle Kit**

## AI Services
- **DeepSeek AI**: For AI Address Parsing, ticket subject generation, and professional shipment name generation.
- **OpenAI API**: For AI-powered product weight and dimension inference in carton packing optimization.

## Other APIs
- **OpenStreetMap Nominatim API**: For address geocoding and auto-correction.
- **Fawaz Ahmed's free currency API**: For real-time exchange rates.
- **Facebook Graph API**: For fetching customer profile pictures and names.