# Budget Manager - Multi-Tenant Financial Management Application

## Overview
Budget Manager is a web-based financial management platform for small non-profits and for-profit organizations. It enables users to manage multiple organizations, track income and expenses, categorize transactions (with AI assistance), manage grants, plan budgets, and generate financial reports. The application aims to provide a clean, professional interface inspired by leading financial dashboards.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
- **Framework:** React 18 with TypeScript.
- **Build:** Vite for fast development and HMR.
- **Routing:** Wouter for lightweight client-side routing.
- **State Management:** TanStack Query for server state and caching; React hooks for local UI state.
- **UI:** shadcn/ui (New York style) based on Radix UI, styled with Tailwind CSS, custom CSS variables for theming (light/dark mode).
- **Design Principles:** Emphasizes clarity, professional financial data presentation, minimal cognitive load, responsive design, and modern typography (Inter, JetBrains Mono).

### Backend
- **Framework:** Express.js with TypeScript.
- **API:** RESTful design pattern, `/api/*` prefix.
- **Authentication:** Replit Auth (OpenID Connect) via Passport.js, session-based with secure HTTP-only cookies, stored in PostgreSQL.
- **Authorization:** Role-based access control (owner, admin, accountant, viewer) per organization, multi-tenant.
- **API Design:** Consistent error handling, request/response logging, Zod validation.

### Data Storage
- **Database:** PostgreSQL (Neon Serverless) as the primary relational database.
- **ORM:** Drizzle ORM for type-safe queries and schema management, Drizzle Kit for migrations.
- **Schema Design:** Multi-tenant with organization-scoped data; tables for users, organizations, user-organization roles, categories, transactions, grants, budgets, budget items, Plaid items, Plaid accounts, and categorization history.
- **Data Access:** Repository pattern with an IStorage interface, reusable query methods, support for filtering, pagination, and aggregations.

### Key Features Implemented
- **Plaid Bank Integration:** Automatic bank account connectivity, transaction import, balance syncing, and secure credential storage.
- **AI-Powered Transaction Categorization:** AI suggestions with confidence scores, bulk categorization UI, user feedback system, and history tracking. Integrates with OpenAI GPT-4.
- **Budget Planning & Forecasting:** Customizable budgets (monthly, quarterly, yearly), budget item definition, visual budget vs. actual comparison, and dashboard integration.
- **Team Collaboration & Invitations:** Role-based team member invitations with email notifications via SendGrid, granular permission control (view_only, make_reports, edit_transactions, view_make_reports, full_access), invitation lifecycle management (accept, decline, cancel), and automatic duplicate member detection.

## External Dependencies

### Authentication
- **Replit Auth:** Primary OpenID Connect provider.

### Database
- **Neon Serverless PostgreSQL:** Cloud-hosted PostgreSQL.

### Bank Integration
- **Plaid API:** For bank account connectivity and transaction data, using Plaid Link and Plaid Node SDK.

### Email Service
- **SendGrid:** For transactional emails including team invitations. Uses Replit's SendGrid connector for secure API key management.

### UI Libraries
- **Radix UI:** Headless components.
- **shadcn/ui:** Component library built on Radix.
- **Lucide React:** Icon library.
- **date-fns:** Date manipulation.

### Development Tools
- **Vite:** Frontend build tool.
- **PostCSS:** With Tailwind CSS and Autoprefixer.
- **TSX:** For running TypeScript server in development.
- **esbuild:** For production server bundling.

### Fonts
- **Google Fonts:** Inter and JetBrains Mono.

### Other Key Dependencies
- **React Hook Form** with Zod resolver.
- **Class Variance Authority (CVA)**, **clsx**, **tailwind-merge**.
- **Drizzle ORM** and **Drizzle Zod**.
- **react-plaid-link**.