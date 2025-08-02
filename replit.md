# Overview

Davie Supply is a comprehensive warehouse and order management system built as a full-stack web application. The system handles complete order lifecycle management from creation to fulfillment, inventory tracking, customer management, and financial reporting with multi-currency support. It features real-time Vietnamese diacritics search functionality and integrates with external shipping APIs for order tracking.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
The client-side is built with React and TypeScript using Vite as the build tool. The application follows a component-based architecture with:
- **UI Framework**: Shadcn/ui components built on Radix UI primitives for consistent design
- **Styling**: Tailwind CSS with CSS variables for theming support
- **State Management**: TanStack Query for server state management and caching
- **Routing**: Wouter for lightweight client-side routing
- **Form Handling**: React Hook Form with Zod validation schemas

## Backend Architecture
The server-side uses Express.js with TypeScript in an ESM module setup:
- **API Design**: RESTful API endpoints with consistent error handling
- **Database**: PostgreSQL with Neon serverless driver for connection pooling
- **ORM**: Drizzle ORM for type-safe database operations and migrations
- **Session Management**: Express sessions with PostgreSQL storage for persistence

## Authentication System
The application uses Replit's OpenID Connect (OIDC) authentication system:
- **Provider**: Replit OIDC for user authentication
- **Session Storage**: PostgreSQL-backed sessions with connect-pg-simple
- **Security**: HTTP-only cookies with secure flags for production

## Database Design
The database schema supports a comprehensive e-commerce workflow:
- **Core Entities**: Users, products, orders, customers, warehouses, suppliers
- **Order Management**: Complete order lifecycle with status tracking, payment processing
- **Inventory System**: Product variants, stock tracking, warehouse management
- **Financial Tracking**: Sales, expenses, purchases with multi-currency support
- **Audit Trail**: User activities and system events logging

## Multi-Currency Support
The system supports five currencies (CZK, EUR, USD, VND, CNY) with:
- **Exchange Rates**: Simplified rate conversion system (production would use real-time APIs)
- **Currency Utilities**: Conversion functions with formatting for display
- **Database Schema**: Currency enums enforced at database level

## Search Functionality
Vietnamese diacritics search implementation:
- **Normalization**: Custom Vietnamese character mapping for accent-insensitive search
- **Real-time Search**: Debounced search across all entities
- **Search Utility**: Reusable search matcher functions for consistent behavior

## Development Setup
The project uses a monorepo structure with shared schema:
- **Shared Types**: Common TypeScript types and Zod schemas in `/shared`
- **Path Aliases**: Configured aliases for clean imports (@, @shared, @assets)
- **Development Tools**: Hot reload, error overlays, and Replit integration plugins

# External Dependencies

## Database Services
- **Neon PostgreSQL**: Serverless PostgreSQL database with connection pooling
- **Drizzle Kit**: Database migration and schema management tools

## Authentication Services  
- **Replit OIDC**: OAuth 2.0/OpenID Connect authentication provider
- **OpenID Client**: OIDC client library for Passport.js integration

## UI and Styling
- **Radix UI**: Headless UI component primitives for accessibility
- **Tailwind CSS**: Utility-first CSS framework with design system
- **Lucide React**: SVG icon library for consistent iconography

## Development and Build Tools
- **Vite**: Frontend build tool with React plugin and development server
- **ESBuild**: Fast JavaScript bundler for production builds
- **TypeScript**: Type safety across the entire application stack

## Recent Changes

## DataTable Component Implementation (August 2, 2025)
- Created reusable DataTable component with advanced features:
  - Bulk selection with checkbox column
  - Sortable columns with click-to-sort functionality
  - Configurable pagination with items per page options (10/20/50/100)
  - Bulk actions support with customizable buttons
  - TypeScript generic support for type safety
- Implemented DataTable across all main pages:
  - AllOrders page with bulk actions (mark as shipped, cancel, export)
  - AllInventory page with bulk operations (update stock, delete, export)
  - AllWarehouses page with bulk actions (delete, export)
  - AllSales page with bulk actions (activate, deactivate, delete, export)
  - AllCustomers page with bulk actions (send email, update type, delete, export)
- All tables now have consistent UI/UX with sortable columns and pagination controls

## Image Upload Functionality (August 2, 2025)
- Implemented image upload feature using multer for product management
- Added `/api/upload` endpoint for handling file uploads
- Images are stored in `/public/images/` directory
- Updated AddProduct and EditProduct components to support image uploads
- Fixed image display in inventory list with proper fallback handling

## Order Status Filtering (August 2, 2025)
- Created ToFulfill and Shipped pages as filtered views of AllOrders
- Updated AllOrders component to accept filter prop for status-based filtering
- Removed redundant status filter dropdown from filtered pages
- Maintained consistent UI/UX across all order views

## Dashboard Currency Conversion (August 2, 2025)
- Integrated Fawaz Ahmed's free currency API for real-time exchange rates
- Updated dashboard metrics endpoint to convert all amounts to EUR
- Modified all dashboard cards to display values in EUR with currency conversion
- Updated Revenue, Expenses, and Yearly charts to use real data with EUR conversion
- Added real-time currency conversion for orders from CZK, USD, VND, CNY to EUR

## Delete Functionality for Edit Pages (August 2, 2025)
- Added DELETE endpoints for orders and products in backend routes
- Implemented delete buttons on EditOrder and EditProduct pages
- Positioned delete buttons at bottom left on same line as cancel/save buttons
- Added confirmation dialogs with entity names to prevent accidental deletions
- Enhanced error handling for foreign key constraints (products used in orders)

## Mock Data Currency Update (August 2, 2025)
- Updated all mock orders to use only CZK or EUR currencies (removed VND, USD, CNY)
- Linked order items to actual products from inventory database
- Recalculated order totals based on actual product prices in respective currencies
- Orders now alternate between CZK and EUR for realistic multi-currency testing

## Inventory Delete Functionality (August 2, 2025)
- Implemented delete functionality for trash icons in inventory list page
- Added confirmation dialogs with product names for all delete actions
- Improved error handling with user-friendly messages for constraint violations
- Products used in orders show clear error message explaining they cannot be deleted
- Backend returns 409 status code for foreign key constraint violations

## Complete Backend Implementation for Warehouses and Customers (August 2, 2025)
- Implemented full CRUD operations for warehouses:
  - GET /api/warehouses - List all warehouses
  - POST /api/warehouses - Create new warehouse  
  - GET /api/warehouses/:id - Get warehouse by ID
  - PATCH /api/warehouses/:id - Update warehouse
  - DELETE /api/warehouses/:id - Delete warehouse with constraint validation
- Implemented full CRUD operations for customers:
  - GET /api/customers - List all customers with search support
  - POST /api/customers - Create new customer
  - GET /api/customers/:id - Get customer by ID  
  - PATCH /api/customers/:id - Update customer
  - DELETE /api/customers/:id - Delete customer with constraint validation
- All endpoints follow REST standards with appropriate HTTP status codes
- Delete operations return 409 for foreign key constraint violations
- User activity tracking for all create, update, and delete operations

## Complete Backend Implementation for Sales and Reports (August 2, 2025)
- Implemented full CRUD operations for sales/discounts:
  - GET /api/sales - List all sales
  - GET /api/sales/:id - Get sale by ID
  - POST /api/sales - Create new sale
  - PATCH /api/sales/:id - Update sale
  - DELETE /api/sales/:id - Delete sale with constraint validation
- Implemented comprehensive reports endpoints:
  - GET /api/reports/sales-summary - Sales summary with date range filtering
  - GET /api/reports/inventory-summary - Inventory analytics by warehouse and category
  - GET /api/reports/customer-analytics - Customer metrics and segmentation
  - GET /api/reports/financial-summary - Financial overview with monthly trends
- Reports support query parameters for filtering by date, year, and month
- Financial reports calculate revenue, expenses, purchases, and profit margins
- Customer analytics includes VIP segmentation based on spending thresholds

# Future Integrations
- **GLS Shipping API**: Planned integration for real-time order tracking
- **Real-time Exchange Rates**: API integration for accurate currency conversion
- **AfterShip**: Third-party shipping tracking service integration