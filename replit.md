# Overview
Davie Supply is a full-stack web application for comprehensive warehouse and order management, designed to optimize supply chain operations. It covers the entire order lifecycle, inventory tracking, customer relationship management (CRM), and multi-currency financial reporting. Key capabilities include real-time Vietnamese diacritics search, customer-specific pricing, external shipping API integrations, extensive settings management, and professional PDF packing list generation. The project envisions advanced warehouse mapping, a comprehensive Pick & Pack workflow, and AI-powered optimization to enhance efficiency and accuracy in supply chain logistics.

# Recent Changes (November 22, 2025)

## Latest Updates
1. **Comprehensive Vietnamese/English Bilingual Internationalization (i18n) - ✅ 100% COMPLETE** - Achieved full bilingual localization across ENTIRE application:
   - **Infrastructure (100% Complete)**: Created 11 translation namespaces (common, orders, products, inventory, customers, settings, warehouse, shipping, financial, reports, system) with 1,500+ translation keys in both English and Vietnamese
   - **Settings Integration**: Language switcher in Settings > General immediately changes entire UI without page refresh via `i18n.changeLanguage()` with localStorage persistence
   - **useLanguageSync Hook**: Automatic synchronization between SettingsContext and i18n, reads from localStorage on first load, persists language preference across sessions
   - **Translation Pattern**: All components use `const { t } = useTranslation(['namespace', 'common'])` with `{t('namespace:key')}` for dynamic text
   - **Vietnamese Terminology**: Proper business WMS terminology, keeps technical loanwords (API, SKU, COD, VAT) in English per industry standards
   
   **✅ 100% TRANSLATION COVERAGE ACHIEVED (80+ pages, 30,000+ lines translated):**
   
   **Core Application (100%):**
   - **Layout & Navigation**: Sidebar, TopBar, MobileResponsiveLayout, breadcrumbs, all navigation menus
   - **Dashboard**: All metrics, charts, alerts, statistics
   - **Settings**: All 6 Settings pages (General, Order, Inventory, Shipping, Financial, System)
   
   **Orders & Products (100%):**
   - **Orders**: AddOrder.tsx (5,129 lines), EditOrder.tsx (5,344 lines), AllOrders, OrderDetails
   - **Products & Inventory**: ProductForm.tsx (3,702 lines), ProductDetails, AllInventory
   - **PreOrders**: AllPreOrders, AddPreOrder, EditPreOrder, PreOrderDetails (4 files)
   
   **Warehouse Operations (100% - User Priority):**
   - **Warehouses**: AllWarehouses, AddWarehouse, EditWarehouse, WarehouseDetails, WarehouseMapNew (5 files)
   - **Receiving**: ReceivingList, StartReceiving, ReviewApprove, ReceiptDetails, ItemsToStore, StoreItems (6 files)
   - **Stock**: OverAllocated, UnderAllocated, StockLookup (1,136 lines), StockAdjustmentApprovals (4 files)
   
   **Customer & Financial (100%):**
   - **Customers**: AllCustomers, CustomerDetails
   - **Expenses**: AllExpenses (900 lines), AddExpense, EditExpense, ExpenseDetails (4 files)
   - **Reports**: All 9 Reports pages (SalesReports, OrderReports, InventoryReports, FinancialReports, CustomerReports, ExpenseReports, CustomReport, index, Reports.tsx)
   
   **Operations Modules (100%):**
   - **Services**: Services, AddService (981 lines), ServiceDetails (490 lines) (3 files)
   - **Tickets**: AllTickets (970 lines), AddTicket, EditTicket, TicketDetails, TicketForm (708 lines) (5 files)
   - **Shipping**: ShipmentLabels, ShippingManagement, Landing Cost pages
   - **Suppliers**: AllSuppliers, AddSupplier, EditSupplier, SupplierDetails (4 files)
   - **Returns**: All 4 Returns pages
   
   **System Pages (100%):**
   - **POS**: Full POS system
   - **Employees**: Employee management
   - **Notifications**: Notification center
   - **UserManagement**: User administration
   - **Files**: File management
   
   **Translation Quality:**
   - Fixed 56 duplicate property errors in orders.ts locale files
   - Fixed 6 duplicate property errors in reports.ts locale files
   - Zero English strings remain in any page when Vietnamese is selected
   - All toast messages, validation errors, helper text, dialogs fully localized
   - Architect verified: PASS - 100% bilingual coverage, no blocking gaps, no runtime regressions

2. **Toast Notification Repositioning** - Moved toast notifications to top-right below notification bell icon with improved UX:
   - Positioned at top: 72px (64px header + 8px gap), right: 16px
   - Stack downward from top-right with smooth animations
   - Mobile responsive with proper width constraints
   - Z-index: 100 (above content, below modals)

3. **Dynamic User Display in Header** - Fixed hardcoded username "ronak_03" in MobileResponsiveLayout.tsx by replacing with `{user?.firstName} {user?.lastName}` from useAuth context. Role and email now also display dynamically from the authenticated user object.

4. **Landing Cost List Expandable Items** - Added collapsible items section to each shipment card in Landing Cost List showing:
   - Product name, quantity (with × symbol), SKU, and category for each item
   - Type-safe implementation with `ensureNumber()` helper to prevent string/number type mismatches
   - Array-based state management (`useState<number[]>`) with proper deduplication
   - Fully controlled Radix Collapsible component using both `open` and `onOpenChange` props
   - Independent expansion/collapse for each shipment card
   - Tested with rapid clicking scenarios (10x expansion, 3x collapse) - all passing

## Critical Bug Fixes
1. **Dashboard formatDate Function** - Fixed runtime error "d.getTime is not a function" by adding proper type validation for Date/string/null/undefined inputs in currencyUtils.ts

2. **Product Schema Validation** - Fixed type coercion issues in shared/schema.ts by extending insertProductSchema with z.union() and .transform() for flexible handling of string/number inputs from frontend forms (categoryId, warehouseId, supplierId, decimal fields)

3. **React Hook Form State Synchronization** - Fixed critical bug where forms (AddOrder, ProductForm) failed to submit due to RHF state containing undefined values even though UI showed correct data:
   - Root cause: RHF takes snapshot of defaultValues before async settings load
   - Fix: Added useEffect with useRef guard to call form.reset() once after initial settings load
   - Prevents wiping user input on re-renders while ensuring RHF state matches UI state

4. **Developer Experience** - Added dev-only validation error panels to AddOrder and ProductForm showing form.formState.errors for easier debugging, plus enhanced error logging and toast notifications

## Previous Features
1. **Landing Cost Management** - Added dedicated Landing Cost section under Imports with two new pages:
   - Landing Cost List: Displays all shipments with cost status badges (Costed, Pending, No Costs), stats overview, search/filter functionality
   - Landing Cost Details: Shows full landing cost calculation reusing CostsPanel component from Receiving workflow
   - Fixed React hooks violation by using useQueries instead of map+useQuery for dynamic landing cost summary fetching
   - Integrated with navigation breadcrumbs and routing system

## Testing Results
- ✅ **Header Dynamic User Display**: Tested successfully across all pages
- ✅ **Landing Cost Expandable Items**: Comprehensive testing including rapid clicks (10x expansion, 3x collapse), multi-shipment independence, all scenarios passing
- ✅ **Dashboard**: All metrics displaying correctly, no runtime errors
- ✅ **Product/Order Forms**: Form validation and submission logic fixed
- ✅ **Landing Cost Pages**: React hooks compliance verified, full e2e testing completed

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