# Overview
Davie Supply is a full-stack web application designed for comprehensive warehouse and order management, aiming to optimize supply chain operations. It manages the entire order lifecycle, inventory, CRM, and multi-currency financial reporting. Key features include **complete bilingual internationalization (Vietnamese/English)**, real-time Vietnamese diacritics search, customer-specific pricing, external shipping API integrations, extensive settings management, and professional PDF packing list generation. The system features enterprise-grade security with comprehensive RBAC and 100% route coverage. Future ambitions include advanced warehouse mapping enhancements and AI-powered optimization for enhanced efficiency and accuracy.

# User Preferences
Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend
The frontend is a React and TypeScript application built with Vite. It uses Shadcn/ui (Radix UI primitives), Tailwind CSS for styling, TanStack Query for state management, Wouter for routing, and React Hook Form with Zod for validation. The design is mobile-first and card-based, featuring a responsive layout, interactive Pick & Pack interface, advanced 2D warehouse mapping, and unified form components. **The application features complete bilingual internationalization (Vietnamese/English) using react-i18next, with dynamic language switching across all major modules including Receiving, Orders (Pick & Pack workflow), and Settings management.** It includes PWA capabilities for offline functionality, asset caching, background sync, and uses IndexedDB for local storage with an offline queue manager. AI Carton Packing is synchronized across relevant order pages using shared hooks and components.

## Backend
The backend is an Express.js application written in TypeScript (ESM modules), providing RESTful API endpoints with consistent error handling.

## Authentication System
The system utilizes **username/password authentication with passport-local strategy** and Enterprise-Grade Role-Based Access Control (RBAC). Passwords are hashed using bcryptjs (12 rounds). Session management uses PostgreSQL-backed sessions with HTTP-only cookies. **New users have a NULL role by default, requiring administrator assignment. Both frontend and backend enforce access restrictions: frontend displays "Pending Approval" screen, backend returns 403 Forbidden from all business API endpoints.** The first registered user automatically receives administrator role via `/api/auth/register-initial-admin`.

### Dynamic Role Management System
The system now supports **dynamic role creation and management** with granular section/page-based permissions:
- **Database Tables**: `roles`, `permissions`, `role_permissions` (join table)
- **System Roles**: `administrator` (full access - 61 permissions), `warehouse_operator` (operational access - 42 permissions)
- **Custom Roles**: Administrators can create custom roles with specific permission sets
- **Permission Sections**: dashboard, orders, inventory, packing, warehouse, customers, suppliers, returns, finances, services, tickets, stock, pos, shipping, imports, reports, employees, settings, users
- **RolesSettings UI**: Tabbed interface with "Manage Roles" (CRUD for roles with section-based permission picker) and "Assign Users" (role assignment dropdown)
- **APIs**: GET/POST/PATCH/DELETE /api/roles, GET /api/permissions, PATCH /api/users/:userId/assign-role

### Production Security Features
**Comprehensive Route Protection (100% Coverage)**:
- **266 routes** secured with `isAuthenticated` middleware (blocks NULL roles + unauthenticated)
- **44 routes** secured with `requireRole(['administrator'])` middleware (admin-only operations)
- **15 public routes** (authentication endpoints only: /api/auth/*, /api/2fa/*, /api/test/seed-role)
- **0 unsecured business routes** - complete security coverage

**Rate Limiting Protection**:
- **authRateLimiter**: 5 requests per 15 minutes (login/register endpoints)
- **smsRateLimiter**: 3 requests per hour (SMS verification - prevents SMS bombing)
- **twoFactorRateLimiter**: 10 requests per 15 minutes (2FA operations)
- Prevents brute force attacks, credential stuffing, and API abuse

**Account Lockout Protection**:
- 5 failed login attempts triggers 15-minute account lockout
- Failed attempts reset after 30 minutes of inactivity
- Clear lockout on successful login
- Provides remaining attempts feedback to users

**Password Complexity Requirements**:
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character (@$!%*?&#^()_+-=[]{}|;:',.<>/\`~)

**CSRF Protection**:
- SameSite=strict cookies in production
- Origin header validation for state-changing requests
- Non-default session cookie name for security

**Security Headers (Helmet.js)**:
- **Production CSP**: Strict Content Security Policy - scriptSrc allows only 'self' (no unsafe-inline/eval), styleSrc allows 'self' and 'unsafe-inline' for React compatibility
- **HSTS**: Strict Transport Security enabled with 1-year max-age and includeSubDomains
- **Additional directives**: baseUri, formAction, objectSrc restricted to prevent injection attacks
- XSS protection, clickjacking prevention, and referrer policy enforcement

**NULL Role Enforcement (Critical)**:
- `isAuthenticated` middleware checks database user role on every request
- Returns 403 Forbidden with `{message: "Access pending administrator approval", pendingApproval: true}` for NULL roles
- Enforced during both active sessions and token refresh
- Prevents API bypass attempts by pending users

### Initial Admin Registration
- **Route**: `POST /api/auth/register-initial-admin`
- **Purpose**: Create the first administrator user
- **Availability**: Only works when no users exist in the database
- **Request**: `{ setupCode, username, password }` - setupCode must match INITIAL_ADMIN_SETUP_CODE env var
- **Response**: `{ success: true, user: {...} }` or error

# Production Deployment

## Required Environment Variables
The following environment variables **must** be set before the server will start in production:

| Variable | Required | Description |
|----------|----------|-------------|
| `SESSION_SECRET` | **Yes (always)** | Secret for session encryption. Use a strong random string (32+ chars). |
| `INITIAL_ADMIN_SETUP_CODE` | **Yes (production)** | Unique setup code for initial admin registration. Required in production, defaults to "1707" in development only. |
| `PGHOST`, `PGUSER`, `PGPASSWORD`, `PGDATABASE`, `PGPORT` | **Yes** | PostgreSQL connection using individual environment variables. The application constructs the connection string from these variables (NOT DATABASE_URL). |
| `NODE_ENV` | **Yes** | Set to `production` for production deployment |

## Optional Environment Variables
| Variable | Description |
|----------|-------------|
| `GOOGLE_CALLBACK_URL` | OAuth callback URL for Google authentication |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | For push notifications |
| `DEEPSEEK_API_KEY` | For AI-powered features |
| `TWILIO_*` | For SMS notifications |

## Security Checklist
- [ ] Set unique `SESSION_SECRET` (do not use default)
- [ ] Set unique `INITIAL_ADMIN_SETUP_CODE` for production
- [ ] All API secrets configured in Secrets panel
- [ ] Database migrations applied (`npm run db:push`)
- [ ] Test production build locally before deployment

**Authentication Flow**:
1. First user registers via `/api/auth/register-initial-admin` (gets admin role automatically)
2. Subsequent users are created by admin via user management
3. New users have NULL role until administrator assigns a role
4. RBAC enforcement: 
   - `isAuthenticated` blocks NULL roles (pending approval)
   - `requireRole(['administrator'])` blocks non-admin users from admin routes

**Automated Testing Verification**:
- ✅ NULL-role users blocked from business APIs (/api/products, /api/orders, /api/customers) - 403 Forbidden
- ✅ NULL-role users see "Waiting for Admin Approval" frontend screen
- ✅ Assigned role users (warehouse_operator, administrator) access business APIs - 200/304 success
- ✅ Administrator-only routes (/settings, /user-management) blocked for warehouse_operator
- ✅ Rate limiting prevents excessive login attempts (5 per 15 minutes)

## Database Design
The project uses PostgreSQL with Neon serverless driver and Drizzle ORM. The schema supports a full e-commerce workflow, including entities for users, products, orders, customers, warehouses, suppliers, returns, inventory tracking, multi-currency financial tracking, and an audit trail.

## Core Features
- **Product & Order Management**: Comprehensive CRUD operations for products and orders, including pricing, location tracking, barcode scanning, grouped packing instructions, tiered pricing, multi-purpose images, variant support, custom order IDs, auto shipping cost, enhanced product search with fuzzy matching and Vietnamese diacritics, and automated packing list PDF generation.
- **Inventory & Warehouse Management**: Full inventory tracking with variant operations, category management, location codes, barcode scanning, quantity tracking, professional column visibility, interactive 2D warehouse map with real inventory data, multi-zone support, zone filtering, and rapid barcode scanning. Includes inventory allocation warnings and intelligent product packaging classification.
- **Customer Management**: Enhanced tables with order statistics, address lookup, "Pay Later" functionality, Facebook integration, AI-powered Smart Paste for address parsing, and auto-generating/editable shipping labels.
- **Financial & Discount Management**: Advanced discount system, customer-specific pricing, multi-currency support (CZK/EUR/USD) with automatic exchange rate conversion, a landing cost engine with volumetric weight and automatic cost allocation, expense tracking, and **automatic weighted average landed cost calculation when completing receiving** (allocates shipping costs across received items, updates product costs using weighted average formula, and tracks cost history in `productCostHistory` table).
- **Fulfillment & Logistics**: AI-powered carton packing optimization synchronized across order pages using shared hooks and components. Utilizes DeepSeek AI for weight/dimension inference and best-fit algorithms, automatic shipping cost estimation, comprehensive country-to-ISO mapping, and real-time packing plan visualization. Includes separate fulfillment sub-status tracking, performance analytics, returns management, packing materials management with dynamic checklists, and automated carton creation based on AI recommendations. Carton & Label state persistence is handled with the database as the primary source of truth and localStorage for offline backup.
- **Point of Sale (POS)**: Full-featured system with thermal printer support, multi-currency, real-time cart, VAT calculation, and receipt generation.
- **System Utilities**: Comprehensive files management, automatic lossless image compression to WebP, robust fuzzy search with diacritics normalization, a generic DataTable component, reporting, and a comprehensive settings management system with 6 categories (General, Order, Inventory, Shipping, Financial, and System Settings). Settings persist via key-value pairs in the `app_settings` table, with robust handling of data types and validation.
- **Maintenance Mode**: System-wide safety switch for updates. When enabled via admin settings, blocks all non-administrator users with a professional "System Upgrading" screen that auto-refreshes. Administrators can still log in and access the system to disable maintenance mode. Bilingual support (Vietnamese/English).

# External Dependencies

## Database Services
- **Neon PostgreSQL**
- **Drizzle Kit**

## AI Services
- **DeepSeek AI**: Used for AI address parsing, ticket subject generation, professional shipment name generation, and carton packing optimization.
- **OpenAI API**: Used for AI-powered product weight and dimension inference in carton packing optimization.

## Shipping & Logistics APIs
- **PPL CZ CPL API**: For automated shipping label generation for PPL courier service, using OAuth2 authentication, supporting multi-carton orders and COD.
- **GLS Germany Manual Shipping**: For manual label workflow for German domestic shipping.

## Other APIs
- **OpenStreetMap Nominatim API**: For address geocoding and auto-correction.
- **Frankfurter API**: For real-time and historical currency exchange rates.
- **Twilio Verify API**: For SMS notifications (pre-order reminders, etc.).