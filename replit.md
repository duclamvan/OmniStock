# Overview
Davie Supply is a full-stack web application for comprehensive warehouse and order management, designed to optimize supply chain operations. It covers the entire order lifecycle, inventory tracking, customer relationship management (CRM), and multi-currency financial reporting. Key capabilities include real-time Vietnamese diacritics search, customer-specific pricing, external shipping API integrations, extensive settings management, and professional PDF packing list generation. The project envisions advanced warehouse mapping, a comprehensive Pick & Pack workflow, and AI-powered optimization to enhance efficiency and accuracy in supply chain logistics.

# Recent Changes (November 21, 2025)

## Critical Bug Fixes
1. **Dashboard formatDate Function** - Fixed runtime error "d.getTime is not a function" by adding proper type validation for Date/string/null/undefined inputs in currencyUtils.ts

2. **Product Schema Validation** - Fixed type coercion issues in shared/schema.ts by extending insertProductSchema with z.union() and .transform() for flexible handling of string/number inputs from frontend forms (categoryId, warehouseId, supplierId, decimal fields)

3. **React Hook Form State Synchronization** - Fixed critical bug where forms (AddOrder, ProductForm) failed to submit due to RHF state containing undefined values even though UI showed correct data:
   - Root cause: RHF takes snapshot of defaultValues before async settings load
   - Fix: Added useEffect with useRef guard to call form.reset() once after initial settings load
   - Prevents wiping user input on re-renders while ensuring RHF state matches UI state

4. **Developer Experience** - Added dev-only validation error panels to AddOrder and ProductForm showing form.formState.errors for easier debugging, plus enhanced error logging and toast notifications

## New Features
1. **Landing Cost Management** - Added dedicated Landing Cost section under Imports with two new pages:
   - Landing Cost List: Displays all shipments with cost status badges (Costed, Pending, No Costs), stats overview, search/filter functionality
   - Landing Cost Details: Shows full landing cost calculation reusing CostsPanel component from Receiving workflow
   - Fixed React hooks violation by using useQueries instead of map+useQuery for dynamic landing cost summary fetching
   - Integrated with navigation breadcrumbs and routing system

## Testing Results
- Dashboard: ✅ All metrics displaying correctly, no runtime errors
- Product/Order Forms: ✅ Form validation and submission logic fixed, ready for end-to-end testing
- Landing Cost Pages: ✅ React hooks compliance verified, ready for e2e testing
- Pending: Full e2e form submission tests (interrupted by unrelated session handling issue)

# User Preferences
Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend
A React and TypeScript application built with Vite, utilizing Shadcn/ui (Radix UI primitives), Tailwind CSS for styling, TanStack Query for state management, Wouter for routing, and React Hook Form with Zod for validation. It features a mobile-first, card-based responsive design, interactive Pick & Pack interface, advanced warehouse mapping with a 2D floor plan, and unified form components for creation and editing. It also includes PWA capabilities for offline functionality, asset caching, and background sync, using IndexedDB for local storage and an offline queue manager. AI Carton Packing is synchronized across EditOrder, AddOrder, and PickPack pages using shared hooks and components.

## Backend
An Express.js application written in TypeScript (ESM modules), providing RESTful API endpoints with consistent error handling.

## Authentication System
Replit Auth with optional Twilio SMS Two-Factor Authentication (2FA) and Strict Role-Based Access Control (RBAC). Primary authentication uses Replit's OpenID Connect. Session management via HTTP-only cookies with automatic token refresh. Optional 2FA adds SMS verification. New user registrations have a NULL role by default and require administrator assignment for access. Frontend shows "Pending Approval" for users without roles, and backend blocks API access. Available roles: `administrator` and `warehouse_operator`.

## Database Design
Utilizes PostgreSQL with Neon serverless driver and Drizzle ORM. The schema supports a full e-commerce workflow, including users, products, orders, customers, warehouses, suppliers, returns, inventory tracking, multi-currency financial tracking, and an audit trail.

## Core Features
- **Product & Order Management**: Comprehensive CRUD for products and orders, including pricing, location tracking, barcode scanning, grouped packing instructions, tiered pricing, multi-purpose images, variant support, custom order IDs, auto shipping cost, and enhanced product search with smart fuzzy matching and Vietnamese diacritics. Automated packing list PDF generation.
- **Inventory & Warehouse Management**: Full inventory tracking with variant operations, category management, location codes, barcode scanning, quantity tracking, professional column visibility, interactive 2D warehouse map with real inventory data and multi-zone support, zone filtering, and rapid barcode scanning. Includes inventory allocation warnings and intelligent product packaging classification.
- **Customer Management**: Enhanced tables with order statistics, address lookup, "Pay Later," Facebook integration, AI-powered Smart Paste for address parsing, and auto-generating/editable shipping labels.
- **Financial & Discount Management**: Advanced discount system, customer-specific pricing, multi-currency support (CZK/EUR/USD) with automatic exchange rate conversion, landing cost engine with volumetric weight and automatic cost allocation, and expense tracking.
- **Fulfillment & Logistics**: Synchronized AI-powered carton packing optimization across all order pages using shared hooks and components. Uses DeepSeek AI for weight/dimension inference and best-fit algorithms, automatic shipping cost estimation, comprehensive country-to-ISO mapping, and real-time packing plan visualization. Separate fulfillment sub-status tracking, and performance analytics with precise time predictions. Returns management system. Packing materials management with dynamic, product-specific checklists. Automated carton creation and pre-population based on AI recommendations. Carton & Label state persistence with database as primary source of truth and localStorage for offline backup.
- **Point of Sale (POS)**: Full-featured system with thermal printer support, multi-currency, real-time cart, VAT calculation, and receipt generation.
- **System Utilities**: Comprehensive files management, automatic lossless image compression to WebP, robust fuzzy search with diacritics normalization, generic DataTable component, reporting, and comprehensive settings management system with 6 categories: General, Order, Inventory, Shipping, Financial, and System Settings. Settings persist via key-value pairs in `app_settings` table, with robust handling of data types and validation.

# External Dependencies

## Database Services
- **Neon PostgreSQL**
- **Drizzle Kit**

## AI Services
- **DeepSeek AI**: For AI address parsing, ticket subject generation, professional shipment name generation, and carton packing optimization.
- **OpenAI API**: Used for AI-powered product weight and dimension inference in carton packing optimization.

## Shipping & Logistics APIs
- **PPL CZ CPL API**: Automated shipping label generation for PPL courier service, using OAuth2 authentication, supporting multi-carton orders and COD.
- **GLS Germany Manual Shipping**: Manual label workflow for German domestic shipping using a GLS bookmarklet autofill technology; tracking numbers are entered manually.
- **OpenStreetMap Nominatim API**: For address geocoding and auto-correction.

## Other APIs
- **Frankfurter API**: Free, open-source currency exchange rate API for real-time and historical exchange rates.
- **Twilio Verify API**: SMS verification service for two-factor authentication.