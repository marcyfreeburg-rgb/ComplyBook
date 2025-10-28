# Budget Manager - Multi-Tenant Financial Management Application

## Overview
Budget Manager is a web-based financial management platform designed for small non-profit and for-profit organizations. It offers multi-tenant capabilities, allowing users to manage multiple organizations. The application facilitates tracking income and expenses, AI-assisted transaction categorization, grant management, budget planning, and comprehensive financial reporting. Its design prioritizes a clean, professional, and mobile-responsive user experience. The business vision is to provide an accessible and powerful financial tool that streamlines operations for small organizations, enabling better financial oversight and strategic planning.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions
The application utilizes React 18 with TypeScript and Vite for a fast and responsive frontend. UI components are built with `shadcn/ui` (New York style) based on Radix UI, styled using Tailwind CSS and custom CSS variables for themable light/dark modes. Design principles emphasize clarity, professional financial data presentation, minimal cognitive load, responsive design, and modern typography (Inter, JetBrains Mono).

### Technical Implementations
The backend is built with Express.js and TypeScript, exposing a RESTful API. Authentication is handled via Replit Auth (OpenID Connect) using Passport.js, with session-based, secure HTTP-only cookies stored in PostgreSQL. Authorization employs a multi-tenant, role-based access control system (owner, admin, accountant, viewer) per organization. Data validation is performed using Zod.

### Feature Specifications
Key features include:
- **Plaid Bank Integration:** Automatic bank account connectivity, transaction import, and balance syncing.
- **AI-Powered Transaction Categorization:** AI suggestions with confidence scores and bulk categorization.
- **Budget Planning & Forecasting:** Customizable budgets, visual comparison of budget vs. actuals.
- **Team Collaboration & Invitations:** Role-based invitations with granular permissions via SendGrid.
- **Recurring Transactions:** Automated transaction templates with various frequencies.
- **Vendor & Client Management:** CRUD operations for vendors and clients, linking transactions for relationship tracking.
- **Invoice & Bill Management:** Comprehensive tracking system with line items, status workflows, and optional tax tracking.
- **Universal Branding System:** Customizable visual identity (logo, colors, fonts, payment info, footer) applied across documents, reports, and emails.
- **Cash Flow Forecasting:** Advanced projection system with scenario modeling and customizable growth assumptions.
- **Tax Reporting & Preparation:** Management of tax categories, 1099 form generation, and year-end tax reports for both for-profit and non-profit organizations.
- **Expense Approval Workflows:** Role-based pre-approval system for purchases with multi-status tracking.
- **Custom Report Builder:** Flexible system for creating tailored financial reports with dynamic field selection, filtering, grouping, and CSV export.
- **Responsive Design:** Mobile-first design ensures usability across all device sizes, adapting layouts and navigation.
- **Audit Trail System:** Comprehensive logging of critical create/update/delete operations with user attribution, timestamps, and detailed change history for compliance and accountability.
- **Bank Reconciliation:** System for matching transactions with bank statements, supporting manual, bulk, and automatic reconciliation with status tracking and audit trails.
- **Donor Tracking (Nonprofit Only):** Comprehensive donor management system for nonprofit organizations, including CRUD operations for donor records (name, contact, email, phone, address, tax ID), linking donations to specific donors via transaction forms, and automated annual tax deduction letter generation aggregating all donations by donor and year.
- **Payroll Management System:** Complete payroll solution for managing employee compensation with full CRUD operations for employees (salary and hourly), customizable deductions (tax, insurance, retirement, garnishment, other), and payroll run processing. Features include employee management with personal and compensation details, deduction configuration with percentage or fixed amount calculation types, payroll run creation with draft/processed status workflow, adding employees to payroll runs with automatic pay calculations (hours × rate for hourly, period salary for salaried), server-side security with all calculations validated server-side to prevent tampering, duplicate employee checks, and draft-only modifications. The system enforces strict validation using Zod schemas, calculates gross pay and deductions based on fresh database data, prevents client-side manipulation of monetary amounts, and automatically updates payroll run totals when items are added or modified. Future enhancements planned include pay stub generation/viewing and automated transaction creation from processed payroll runs.

### System Design Choices
PostgreSQL (Neon Serverless) is the primary relational database, managed with Drizzle ORM for type-safe queries and schema migrations. The schema is multi-tenant, with organization-scoped data for users, organizations, transactions, categories, grants, budgets, and more. A repository pattern with an `IStorage` interface is used for data access, supporting filtering, pagination, and aggregations.

## External Dependencies

### Authentication
- **Replit Auth:** OpenID Connect provider.

### Database
- **Neon Serverless PostgreSQL:** Cloud-hosted relational database.

### Bank Integration
- **Plaid API:** For connecting to bank accounts and retrieving financial data.

### Email Service
- **SendGrid:** For sending transactional emails, including team invitations.

### UI Libraries
- **Radix UI:** Headless UI components.
- **shadcn/ui:** Component library built on Radix UI.
- **Lucide React:** Icon library.

### Development Tools
- **Vite:** Frontend build tool.
- **PostCSS:** With Tailwind CSS and Autoprefixer.
- **TSX:** For TypeScript execution in development.
- **esbuild:** For production server bundling.

### Fonts
- **Google Fonts:** Inter and JetBrains Mono.

### Other Key Dependencies
- **React Hook Form:** For form management with Zod resolver.
- **Class Variance Authority (CVA), clsx, tailwind-merge:** For managing CSS classes.
- **Drizzle ORM & Drizzle Zod:** For ORM and Zod integration.
- **react-plaid-link:** React component for Plaid Link.