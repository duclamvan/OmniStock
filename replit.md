# Overview
Davie Supply is a full-stack web application for comprehensive warehouse and order management, aiming to optimize supply chain operations. It covers the entire order lifecycle, inventory tracking, CRM, and multi-currency financial reporting. Key features include real-time Vietnamese diacritics search, customer-specific pricing, external shipping API integrations, and extensive settings management. Future ambitions include advanced warehouse mapping, a comprehensive Pick & Pack workflow, and AI-powered optimization.

# Recent Changes
**October 31, 2025 (Update 5)**: Complete AI Carton Automation with DeepSeek:
- **DeepSeek AI Integration**: Replaced OpenAI with DeepSeek API for all AI carton optimization
- **100% Automated Workflow**: 
  - AI automatically creates exact number of carton cards based on optimization
  - All fields auto-filled: carton type, weight, dimensions, utilization metrics
  - No manual intervention needed - cartons appear with all data pre-populated
- **Enhanced Optimization**:
  - Algorithm always attempts single-carton solution first
  - Maximizes use of largest cartons to minimize total count
  - Real-time display of volume utilization and filling weight
- **Comprehensive Feedback**: Toast notifications show optimization details including total weight, average utilization, and AI reasoning

**October 31, 2025 (Update 4)**: Robust AI Carton Packing Algorithm:
- **Optimized Bin Packing**: Algorithm now prioritizes using the fewest, largest cartons possible
- **Smart Consolidation**: 
  - First attempts to fit all items in ONE large carton when possible
  - Sorts cartons by volume descending (largest first) to prefer bigger boxes
  - Sorts partial cartons by remaining capacity to maximize fill efficiency
- **Better Utilization**: Items packed into cartons with largest remaining capacity first
- **Visual Quantity Badges**: Product images show actual item quantity (not sequential count) with black background and white numbers, visible on both mobile and desktop
- **Carton Name Display Fix**: Autocomplete selector now correctly displays carton names instead of IDs

**October 31, 2025 (Update 3)**: Comprehensive Carton Functionality Overhaul:
- **AI-Powered Auto-Selection**: Cartons automatically created with correct types and weights when entering packing mode
- **Intelligent Carton Selector**: 
  - Replaced dropdown with autocomplete text input using Command UI
  - Shows most-used cartons first based on usage tracking
  - Supports fuzzy search and free-text input for non-company cartons
  - Tracks carton usage frequency for intelligent suggestions
- **Optimistic UI**: "Add Another Carton" instantly appends cards without waiting for backend
- **Enhanced Database Schema**:
  - Added usage tracking (usageCount, lastUsedAt) to packing_cartons
  - Added dimension fields (innerLengthCm, innerWidthCm, innerHeightCm, payloadWeightKg) to order_cartons
  - Added AI metadata (aiPlanId, source, itemAllocations) for better tracking
- **Auto-Fill Everything**: All carton fields (type, weight, dimensions) pre-populated from AI calculations
- **Robust Error Handling**: Graceful fallbacks when AI data is missing or incomplete

**October 31, 2025 (Update 2)**: AI Carton Auto-Application & Mobile UI Improvements:
- Automated AI carton suggestions in packing mode
- Carton types and weights prefilled based on AI recommendations
- Removed manual "Apply AI Suggestions" button since it's automatic
- Fixed mobile layout with improved text sizes and compact design
- Product names increased to 14px for better readability on mobile
- Removed number badge overlay from product images on mobile

**October 31, 2025**: Item Overview Modal & Product Image Integration:
- Added comprehensive Item Overview Modal in picking mode:
  - Shows all items with checked status (complete, in progress, not started)
  - Displays picked quantity vs total quantity for each item
  - Visual progress bars and status indicators (green checkmark, yellow clock, gray number)
  - Click any item to jump directly to it during picking
  - Shows warehouse location for each item
  - "View All Items" button accessible during picking
- Fixed product image display in Pick & Pack:
  - Backend now fetches real product images from inventory database for all order items
  - Images display correctly throughout the picking workflow

**October 30, 2025**: AI-Powered Carton Suggestions & Intelligent Packaging Classification:
- Implemented intelligent product packaging classification system with three types:
  - `carton`: Items needing carton packaging
  - `outer_carton`: Items with their own packaging (only need nylon wrapping)
  - `nylon_wrap`: Items requiring only nylon wrapping
- AI-powered carton recommendation engine that:
  - Analyzes order items and excludes outer_carton/nylon_wrap items from carton calculations
  - Suggests optimal carton types with count, weight, and volume utilization
  - Provides reasoning for recommendations
- Dynamic recalculation when user changes carton selections
- AI Suggestions panel in packing mode showing:
  - "Items Needing Cartons" section with suggested carton types
  - "Nylon Wrap Only" section for items with outer packaging
  - "Apply AI Suggestions" button to auto-create all suggested cartons
- Visual badges on items indicating nylon-wrap-only packaging requirement
- Smart order selection algorithm for "Pick Next Order" and "Start Next Priority Order"
- Enhanced Pick & Pack UI with breadcrumb navigation and live statistics
- Responsive layouts: 2 columns on mobile, 4 columns on desktop

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