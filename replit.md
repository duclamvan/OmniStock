# Overview
Davie Supply is a full-stack web application for comprehensive warehouse and order management, aiming to optimize supply chain operations. It manages the entire order lifecycle, inventory, CRM, and multi-currency financial reporting. Key capabilities include complete bilingual internationalization (Vietnamese/English), real-time Vietnamese diacritics search, customer-specific pricing, external shipping API integrations, extensive settings management, and professional PDF packing list generation. The system features enterprise-grade security with comprehensive RBAC and 100% route coverage. Future ambitions include advanced warehouse mapping and AI-powered optimization for enhanced efficiency.

# User Preferences
Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend
The frontend is a React and TypeScript application built with Vite, utilizing Shadcn/ui, Tailwind CSS, TanStack Query, Wouter, and React Hook Form with Zod. It features a mobile-first, card-based, responsive design with an interactive Pick & Pack interface, 2D warehouse mapping, and unified form components. It supports complete bilingual internationalization (Vietnamese/English) using `react-i18next` across all modules. PWA capabilities include offline functionality, asset caching, background sync, and IndexedDB for local storage with an offline queue manager.

## Backend
The backend is an Express.js application written in TypeScript (ESM modules), providing RESTful API endpoints with consistent error handling.

## Authentication System
The system uses username/password authentication with `passport-local` and Enterprise-Grade Role-Based Access Control (RBAC). Passwords are hashed with `bcryptjs`. Session management uses PostgreSQL-backed sessions with HTTP-only cookies. New users have a `NULL` role by default, requiring administrator assignment, with enforcement on both frontend and backend. The first registered user automatically becomes an administrator.

### Dynamic Role Management System
The system supports dynamic role creation and management with granular section/page-based permissions. It includes `roles`, `permissions`, and `role_permissions` database tables. System roles like `administrator` and `warehouse_operator` are predefined, and custom roles can be created by administrators through a tabbed UI. APIs are provided for CRUD operations on roles, permissions, and user role assignment.

### Production Security Features
The system implements comprehensive security:
- **100% Route Protection**: 266 routes are secured with `isAuthenticated` middleware, 44 routes require administrator role, and only 15 authentication-related routes are public.
- **Rate Limiting**: Prevents brute force attacks and API abuse on authentication and 2FA endpoints.
- **Account Lockout**: 5 failed login attempts trigger a 15-minute lockout.
- **Password Complexity**: Enforces strong password requirements.
- **CSRF Protection**: Uses `SameSite=strict` cookies, origin header validation, and non-default session cookie names.
- **Security Headers (Helmet.js)**: Implements strict Content Security Policy, HSTS, X-Frame-Options, X-Content-Type-Options, and other directives to prevent common web vulnerabilities.
- **Private Application**: Blocks search engine indexing via `robots.txt`, meta tags, and `X-Robots-Tag` HTTP headers.
- **Protected Static File Routes**: Requires authentication for `/images` and `/uploads` directories.
- **NULL Role Enforcement**: `isAuthenticated` middleware blocks `NULL` role users from business APIs with a 403 Forbidden response and a "pending administrator approval" message.

### Initial Admin Registration
A dedicated `POST /api/auth/register-initial-admin` endpoint allows the creation of the first administrator when no users exist in the database, using a `setupCode` for security.

## Database Design
The project uses PostgreSQL with Neon serverless driver and Drizzle ORM. The schema supports a full e-commerce workflow with entities for users, products, orders, customers, warehouses, suppliers, returns, inventory, multi-currency financial tracking, and an audit trail.

## Core Features
- **Product & Order Management**: Comprehensive CRUD, pricing, location tracking, barcode scanning, grouped packing, tiered pricing, multi-purpose images, variant support, custom order IDs, auto shipping cost, enhanced product search with fuzzy matching and Vietnamese diacritics, and automated packing list PDF generation.
- **Inventory & Warehouse Management**: Full inventory tracking, variant operations, category management, location codes, barcode scanning, quantity tracking, interactive 2D warehouse map with real inventory data, multi-zone support, and inventory allocation warnings.
- **Customer Management**: Enhanced tables with order statistics, address lookup, "Pay Later," Facebook integration, AI-powered Smart Paste for address parsing, and auto-generating/editable shipping labels.
- **Financial & Discount Management**: Advanced discount system, customer-specific pricing, multi-currency support (CZK/EUR/USD) with automatic exchange rate conversion, landing cost engine, expense tracking, and automatic weighted average landed cost calculation upon receiving.
- **Fulfillment & Logistics**: AI-powered carton packing optimization (using DeepSeek AI for weight/dimension inference and best-fit algorithms), automatic shipping cost estimation, country-to-ISO mapping, real-time packing plan visualization, separate fulfillment sub-status tracking, returns management, and packing materials management.
- **Point of Sale (POS)**: Full-featured system with thermal printer support, multi-currency, real-time cart, VAT calculation, and receipt generation.
- **System Utilities**: Files management, automatic lossless image compression to WebP, robust fuzzy search with diacritics normalization, a generic DataTable component, reporting, and a comprehensive settings management system with 6 categories.
- **Maintenance Mode**: System-wide safety switch allowing administrators access during updates while blocking other users with a bilingual "System Upgrading" screen.

# External Dependencies

## Database Services
- **Neon PostgreSQL**
- **Drizzle Kit**

## AI Services
- **DeepSeek AI**: For AI address parsing, ticket subject generation, professional shipment name generation, and carton packing optimization.
- **OpenAI API**: For AI-powered product weight and dimension inference in carton packing optimization.

## Shipping & Logistics APIs
- **PPL CZ CPL API**: For automated shipping label generation for PPL courier service.
- **GLS Germany Manual Shipping**: For manual label workflow for German domestic shipping.

## Other APIs
- **OpenStreetMap Nominatim API**: For address geocoding and auto-correction.
- **Frankfurter API**: For real-time and historical currency exchange rates.
- **Twilio Verify API**: For SMS notifications.