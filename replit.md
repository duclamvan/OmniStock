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

## Future Integrations
- **GLS Shipping API**: Planned integration for real-time order tracking
- **Real-time Exchange Rates**: API integration for accurate currency conversion
- **AfterShip**: Third-party shipping tracking service integration