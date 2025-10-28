# Budget Manager - Multi-Tenant Financial Management Application

## Overview
Budget Manager is a web-based financial management platform designed for small non-profit and for-profit organizations. It offers multi-tenant capabilities, allowing users to manage multiple organizations. The application facilitates tracking income and expenses, AI-assisted transaction categorization, grant management, budget planning, and comprehensive financial reporting. Its design prioritizes a clean, professional, and mobile-responsive user experience. The business vision is to provide an accessible and powerful financial tool that streamlines operations for small organizations, enabling better financial oversight and strategic planning.

## User Preferences
Preferred communication style: Simple, everyday language.

## Recent Changes

### October 28, 2025 - Government Contracts Bug Fixes
Fixed critical bugs across all Government Contracts features:
- **Time Entry Calculations:** Implemented automatic server-side calculation of totalHours and laborCost from clock in/out times and hourly rates
- **Data Validation:** Added Zod preprocessing for optional datetime and numeric fields to handle empty strings properly
- **Type Conversions:** Fixed string-to-number conversions for all ID fields (contractId, projectId) across create and update mutations
- **Backend Validation:** Added missing Zod validation to PUT /api/time-entries/:id route
- All features now working correctly with proper data persistence and calculations verified through end-to-end testing

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
- **Fund Accounting (Nonprofit Only):** Complete fund accounting system for nonprofits with CRUD operations for managing restricted and unrestricted funds. Features include fund balance tracking, transaction designation by fund, automatic balance calculations, and fund-specific transaction history. Enables proper tracking of donor-restricted contributions and ensures compliance with nonprofit accounting standards for fund accountability.
- **Pledge Management (Nonprofit Only):** Comprehensive pledge tracking system for managing donor commitments with CRUD operations for pledges and payment recording. Features include pledge creation with amount and expected date, payment tracking with automatic fulfillment status updates, pledge reminder generation, and complete payment history. Supports multi-payment pledges and provides visibility into outstanding donor commitments.
- **Program Management (Nonprofit Only):** Program definition and expense allocation system for nonprofits with CRUD operations for programs. Features include program creation with descriptions, budgets, and date ranges, active/inactive status tracking, expense allocation to programs via transaction form, and program-specific expense totals. Enables nonprofits to track costs and outcomes across different initiatives and services.
- **Functional Expense Reporting (Nonprofit Only):** IRS Form 990 Part IX compliant functional expense reporting system that categorizes expenses by function (program, administrative, fundraising). Features include automatic aggregation of expenses by functional category, percentage breakdowns, historical comparisons, and CSV export. Provides the detailed functional expense breakdown required for nonprofit tax filing.
- **Form 990 Reporting (Nonprofit Only):** Complete IRS Form 990 tax reporting data generation system for nonprofit organizations. Features include Part I Summary (revenue, expenses, net income), financial position reporting (assets, liabilities, net assets), Part IX functional expense breakdowns, Part VIII revenue by source, and Schedule I grants received. Generates comprehensive nonprofit tax reporting data with CSV export capability for tax preparation.
- **Payroll Management System:** Complete payroll solution for managing employee compensation with full CRUD operations for employees (salary and hourly), customizable deductions (tax, insurance, retirement, garnishment, other), and payroll run processing. Features include employee management with personal and compensation details, deduction configuration with percentage or fixed amount calculation types, payroll run creation with draft/processed status workflow, adding employees to payroll runs with automatic pay calculations (hours × rate for hourly, period salary for salaried), server-side security with all calculations validated server-side to prevent tampering, duplicate employee checks, and draft-only modifications. The system enforces strict validation using Zod schemas, calculates gross pay and deductions based on fresh database data, prevents client-side manipulation of monetary amounts, and automatically updates payroll run totals when items are added or modified. Future enhancements planned include pay stub generation/viewing and automated transaction creation from processed payroll runs.
- **Enhanced Transaction Form (Nonprofit):** Transaction form enhancements for nonprofit organizations including fund designation (select which fund receives/spends money), program allocation (assign expenses to specific programs), and functional category selection (categorize expenses as program, administrative, or fundraising). All fields are optional and conditionally displayed based on organization type and transaction type.
- **Government Contracts (For-Profit Only):** Comprehensive government contract management system for for-profit organizations with DCAA-compliant features. The system includes five integrated modules: (1) Contract Management with full CRUD operations for government contracts, tracking contract numbers, client agencies, total value, funded amounts, billed amounts, contract types, prime contractors, contract officers, and status workflows (pending, active, on hold, completed, cancelled); (2) Contract Milestones tracking deliverables with due dates, completion tracking, and milestone amounts; (3) DCAA Time Keeping for government contract compliance with clock in/out functionality, task descriptions, hourly rates, labor cost calculations, and status workflows (draft, submitted, approved, billed); (4) Job/Project Costing system linking projects to contracts with budget tracking, actual cost monitoring, and detailed project cost registers categorized by cost type (direct labor, direct materials, direct other, indirect, overhead); (5) Indirect Cost Rate management for overhead allocation with rate configuration, effective date ranges, rate types, and percentage tracking. The system provides integrated contract-to-project-to-time tracking with automatic cost calculations and comprehensive reporting. Electronic invoicing leverages the existing invoice management system.

### System Design Choices
PostgreSQL (Neon Serverless) is the primary relational database, managed with Drizzle ORM for type-safe queries and schema migrations. The schema is multi-tenant, with organization-scoped data for users, organizations, transactions, categories, grants, budgets, and more. A repository pattern with an `IStorage` interface is used for data access, supporting filtering, pagination, and aggregations.

**Nonprofit-Specific Schema Extensions:**
- `funds` table: Tracks restricted and unrestricted funds with current balances and types
- `programs` table: Defines programs with descriptions, budgets, date ranges, and active status
- `pledges` table: Manages donor commitments with amounts, expected dates, and fulfillment status
- `pledgePayments` table: Records payments against pledges with dates and amounts
- Enhanced `transactions` table: Added `fundId`, `programId`, and `functionalCategory` fields for nonprofit expense tracking
- Enhanced `grants` table: Added lifecycle fields for comprehensive grant management including application, award, reporting, and completion tracking

**For-Profit Government Contracts Schema Extensions:**
- `contracts` table: Tracks government contracts with contract numbers, client agencies, values, funding, billing, status, and contact information
- `contractMilestones` table: Manages contract deliverables with due dates, completion tracking, and milestone payments
- `projects` table: Job costing system linking projects to contracts with budgets, actual costs, and project management details
- `projectCosts` table: Detailed cost register tracking all project expenses by cost type (direct labor, materials, indirect, overhead)
- `timeEntries` table: DCAA-compliant time tracking with clock in/out, task descriptions, hourly rates, labor costs, and approval workflows
- `indirectCostRates` table: Overhead rate management with rate types, percentages, effective date ranges, and active status tracking

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