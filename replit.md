# Budget Manager - Multi-Tenant Financial Management Application

## Overview

Budget Manager is a web-based financial management platform designed for small non-profits and for-profit organizations. The application enables users to manage multiple organizations, track income and expenses, categorize transactions, manage grants (for non-profits), and generate financial reports. Built with a modern tech stack featuring React on the frontend and Express on the backend, it provides a clean, professional interface inspired by Linear, Mercury/Ramp, and Stripe's dashboard designs.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework & Build System:**
- **React 18** with TypeScript for type-safe component development
- **Vite** as the build tool and development server for fast HMR (Hot Module Replacement)
- **Wouter** for lightweight client-side routing instead of React Router
- **TanStack Query (React Query)** for server state management, caching, and data fetching

**UI Component System:**
- **shadcn/ui** component library built on Radix UI primitives
- **Tailwind CSS** for utility-first styling with custom design tokens
- **New York** style variant from shadcn/ui
- Custom CSS variables system for theming (light/dark mode support)
- Design system emphasizing clarity, professional financial data presentation, and minimal cognitive load

**State Management Approach:**
- Server state managed by TanStack Query with query invalidation patterns
- Local UI state managed with React hooks (useState, useEffect)
- Organization context stored in localStorage for persistence across sessions
- No global state management library (Redux/Zustand) - relying on React Query cache and component state

**Design Principles:**
- Light mode as primary theme with dark mode support
- Clean typography using Inter for UI text and JetBrains Mono for financial figures
- Color palette inspired by modern financial dashboards (blues, greens for income, reds for expenses)
- Responsive design with mobile breakpoint at 768px

### Backend Architecture

**Server Framework:**
- **Express.js** as the HTTP server framework
- **TypeScript** for type safety across the entire backend
- RESTful API design pattern with `/api/*` route prefix
- Middleware for request logging, JSON parsing, and session management

**Authentication & Authorization:**
- **Replit Auth** integration using OpenID Connect (OIDC)
- **Passport.js** strategy for OIDC authentication flow
- Session-based authentication with secure HTTP-only cookies
- Session storage persisted in PostgreSQL using connect-pg-simple
- Role-based access control (owner, admin, accountant, viewer) per organization
- Multi-tenant design with user-organization role mappings

**API Design Pattern:**
- RESTful endpoints organized by resource (organizations, transactions, categories, grants, reports)
- Authentication middleware (`isAuthenticated`) protecting all API routes
- Consistent error handling with HTTP status codes
- Request/response logging for debugging
- Data validation using Zod schemas derived from Drizzle ORM models

### Data Storage Solutions

**Database:**
- **PostgreSQL** as the primary relational database
- **Neon Serverless** driver for database connectivity with WebSocket support
- **Drizzle ORM** for type-safe database queries and schema management
- Connection pooling via @neondatabase/serverless Pool

**Database Schema Design:**
- Multi-tenant architecture with organization-scoped data
- User table for authentication (required by Replit Auth)
- Organizations table supporting both nonprofit and for-profit types
- User-organization-role junction table for many-to-many relationships with role attributes
- Categories table for income/expense classification (scoped to organizations)
- Transactions table with foreign keys to organizations, categories, and optional grants
- Grants table for non-profit grant tracking with status and restriction fields
- Session table for server-side session storage

**Schema Management:**
- Drizzle Kit for migrations and schema synchronization
- `db:push` script for applying schema changes to database
- Zod schemas auto-generated from Drizzle tables using drizzle-zod
- Enums for type safety (organization_type, user_role, transaction_type, account_type, grant_status)

**Data Access Layer:**
- Storage abstraction layer (`server/storage.ts`) implementing IStorage interface
- Repository pattern separating business logic from database queries
- Reusable query methods with Drizzle's query builder
- Support for date-range filtering, pagination, and aggregations

### External Dependencies

**Authentication:**
- **Replit Auth** - Primary authentication provider using OIDC protocol
- Environment variables: `REPL_ID`, `ISSUER_URL`, `SESSION_SECRET`, `REPLIT_DOMAINS`
- Session management with 1-week cookie TTL

**Database:**
- **Neon Serverless PostgreSQL** - Cloud-hosted PostgreSQL database
- Environment variable: `DATABASE_URL`
- WebSocket connection support for serverless environments

**UI Libraries:**
- **Radix UI** - Headless component primitives for accessibility
- **shadcn/ui** - Pre-styled component system built on Radix
- **Lucide React** - Icon library for UI elements
- **date-fns** - Date manipulation and formatting
- **cmdk** - Command palette component (if needed)

**Development Tools:**
- **Vite Plugins:** Runtime error overlay, Replit cartographer, dev banner
- **PostCSS** with Tailwind and Autoprefixer
- **TSX** for running TypeScript server in development
- **esbuild** for production server bundling

**Fonts:**
- **Google Fonts** - Inter (UI text) and JetBrains Mono (financial figures)
- Preconnected for performance optimization

**Key Dependencies:**
- React Hook Form with Zod resolver for form validation
- Class Variance Authority (CVA) for component variant management
- clsx and tailwind-merge for className utilities
- Drizzle ORM and Drizzle Zod for database operations and validation

**Build & Deployment:**
- Development: `npm run dev` - Runs Vite dev server and Express with tsx
- Production build: `npm run build` - Builds client with Vite, bundles server with esbuild
- Production start: `npm start` - Runs bundled Express server serving static client assets
- Type checking: `npm run check` - TypeScript compilation check without emit