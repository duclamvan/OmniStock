# Overview
Davie Supply is a comprehensive warehouse and order management system designed as a full-stack web application. Its primary purpose is to manage the complete order lifecycle from creation to fulfillment, track inventory, manage customers, and provide financial reporting with multi-currency support. Key capabilities include real-time Vietnamese diacritics search and integration with external shipping APIs for order tracking. The business vision is to provide a robust, efficient platform for streamlined supply chain operations.

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
- **CRUD Operations**: Full CRUD functionality implemented for warehouses, customers, sales/discounts, and products/orders, with robust error handling and foreign key constraint validation.

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