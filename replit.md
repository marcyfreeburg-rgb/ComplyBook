# Budget Manager - Multi-Tenant Financial Management Application

## Overview
Budget Manager is a web-based financial management platform for small non-profits and for-profit organizations. It enables users to manage multiple organizations, track income and expenses, categorize transactions (with AI assistance), manage grants, plan budgets, and generate financial reports. The application provides a clean, professional, mobile-responsive interface inspired by leading financial dashboards.

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
- **Schema Design:** Multi-tenant with organization-scoped data; tables for users, organizations, user-organization roles, categories, transactions, grants, budgets, budget items, Plaid items, Plaid accounts, vendors, clients, categorization history, cash flow projections, cash flow assumptions, tax categories, tax reports, tax 1099 forms, expense approvals, and recurring transactions.
- **Data Access:** Repository pattern with an IStorage interface, reusable query methods, support for filtering, pagination, and aggregations.

### Key Features Implemented
- **Plaid Bank Integration:** Automatic bank account connectivity, transaction import, balance syncing, and secure credential storage.
- **AI-Powered Transaction Categorization:** AI suggestions with confidence scores, bulk categorization UI, user feedback system, and history tracking. Integrates with OpenAI GPT-4.
- **Budget Planning & Forecasting:** Customizable budgets (monthly, quarterly, yearly), budget item definition, visual budget vs. actual comparison, and dashboard integration.
- **Team Collaboration & Invitations:** Role-based team member invitations with email notifications via SendGrid, granular permission control (view_only, make_reports, edit_transactions, view_make_reports, full_access), invitation lifecycle management (accept, decline, cancel), and automatic duplicate member detection.
- **Recurring Transactions:** Automatic transaction templates with multiple frequencies (daily, weekly, biweekly, monthly, quarterly, yearly), manual generation via "Generate Now" button, active/inactive status toggle, start/end date support, and optional day-of-month scheduling for monthly transactions. Integrates with permission system requiring edit_transactions access.
- **Vendor & Client Management:** Full CRUD operations for vendors (suppliers/service providers) and clients (customers), with contact information tracking (name, contact person, email, phone, address, notes). Transactions can be linked to vendors for expenses and clients for income, enabling better relationship tracking and reporting. Requires admin/owner permissions for creating, updating, or deleting vendor/client records.
- **Invoice & Bill Management:** Complete invoice and bill tracking system with line item support. Invoices track money owed to the organization by clients, while bills track money owed by the organization to vendors. Features include: status workflow (draft, sent, paid, partial, overdue, cancelled for invoices; draft, received, paid, partial, overdue, cancelled for bills), line item management with quantity/rate/amount calculations, automatic subtotal and total computation, optional tax tracking, date tracking (issue date, due date), notes field, and optional linkage to clients/vendors. Multi-tenant architecture ensures organization isolation. Server-side security automatically sets createdBy from authenticated user. Requires edit_transactions permission for all create/update/delete operations.
- **Cash Flow Forecasting:** Advanced financial projection system with multiple scenario modeling (optimistic, realistic, pessimistic, custom). Features include: monthly cash flow projections with starting balance, projected income, projected expenses, and ending balance calculations; customizable growth assumptions with percentage-based income/expense growth rates and one-time adjustments; scenario comparison with visual charts; 12-month projection timeline; and organization-specific assumption templates. Enables organizations to plan for future cash positions and identify potential shortfalls. Requires admin/owner permissions for creating and managing projections.
- **Tax Reporting & Preparation:** Comprehensive tax management system supporting both for-profit and non-profit organizations. Features include: tax category management with deductible expense tracking; 1099 form generation and tracking (1099-NEC, 1099-MISC, 1099-INT, 1099-DIV, 1099-K) with recipient information (name, TIN, address), filing status tracking, and optional vendor linkage; year-end tax report generation with total income, total deductible expenses, and tax liability estimates; year-based filtering and reporting; and automatic expense categorization by tax deductibility. Serves both Form 1099 requirements for for-profits and Form 990 preparation needs for non-profits. Requires admin/owner permissions for all tax-related operations.
- **Expense Approval Workflows:** Role-based expense approval system enabling organizations to require pre-approval for purchases. Features include: expense approval request submission with description, amount, category, vendor, and justification notes; multi-status workflow (pending, approved, rejected); approval/rejection interface for admins and owners with review notes; request history tracking with timestamps and reviewer information; dashboard integration showing pending approval counts; and permission-based access (team members can submit requests, admins/owners can approve/reject). Streamlines expense control and ensures budget compliance before purchases are made.
- **Responsive Design:** Fully responsive mobile-first design ensuring usability across all device sizes. Features include: Shadcn sidebar with automatic mobile Sheet drawer on small screens; responsive grid layouts throughout (dashboard cards stack from 3 columns to 1 column on mobile); horizontal scrolling tables with overflow-x-auto for transaction lists, invoices, and bills; flexible header with flex-wrap for organization switcher and controls; touch-friendly button sizes and spacing; category cards that adapt from 3-column to 1-column layout; and consistent breakpoint usage (sm, md, lg) across all pages. Navigation remains accessible via hamburger menu on mobile, and all forms maintain proper vertical stacking on small screens.

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