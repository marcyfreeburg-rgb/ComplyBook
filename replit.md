# Budget Manager - Multi-Tenant Financial Management Application

## Overview
Budget Manager is a web-based financial management platform for small non-profit and for-profit organizations. It offers multi-tenant capabilities for managing multiple organizations, tracking income and expenses, AI-assisted transaction categorization, grant management, budget planning, and comprehensive financial reporting. The vision is to provide an accessible and powerful financial tool that streamlines operations, enabling better financial oversight and strategic planning.

## User Preferences
Preferred communication style: Simple, everyday language.

## Recent Changes

### October 29, 2025 - Enhanced Analytics & Automated Workflows (Tasks 13.1 & 13.2)
Implemented comprehensive analytics and workflow automation features:
- **Enhanced Analytics (Task 13.1):** Added 4 new backend endpoints (year-over-year comparison, financial forecasting with linear regression, financial health metrics, spending insights), created comprehensive Analytics page with tabs and visualizations using Recharts, integrated sidebar navigation, and added proper permission checks for report access
- **Automated Workflows (Task 13.2):** Added auto-approval rules schema to automatically approve expense approvals based on amount thresholds and category rules (recurring transactions already existed in the system)
- All analytics endpoints properly secured with make_reports permission checks
- Analytics page features year-over-year charts, 6-month forecasts, financial health dashboard, spending insights, and savings opportunities

### October 29, 2025 - Bulk Operations System (Complete)
Completed comprehensive bulk operations system with secure backend API and intuitive frontend UI:
- **Backend (5 secure endpoints):**
  - CSV Transaction Import: POST /api/transactions/import-csv with file upload (multer), CSV parsing (papaparse), Zod validation, and detailed error summary reporting
  - CSV Export: GET /api/transactions/export-csv to export transactions with all fields for external analysis/backup
  - Bulk Categorize: POST /api/transactions/bulk-categorize to update category/fund/program/functionalCategory for multiple transactions
  - Bulk Delete: POST /api/transactions/bulk-delete to safely delete multiple transactions with confirmation
  - Bulk Expense Approvals: POST /api/expense-approvals/bulk-action for batch approve/reject (admin/owner only)
- **Frontend UI:**
  - Transactions Page: Multi-select checkboxes, bulk action toolbar, CSV import/export dialogs, bulk categorize dialog, bulk delete confirmation dialog
  - Expense Approvals Page: Multi-select checkboxes, bulk action toolbar with optional notes, bulk approve/reject buttons
  - All operations with proper loading states, success/error toasts, and automatic cache invalidation
- **Security Pattern:** All endpoints load every record, validate organizationId for each, check user permissions, log audit trails - preventing cross-tenant data manipulation
- **Testing:** End-to-end tests passed for all bulk operations with database validation confirming proper execution

### October 29, 2025 - Compliance Dashboard & PDF Exports
Completed comprehensive nonprofit compliance and reporting features:
- **Compliance Dashboard:** Real-time grant compliance tracking with metrics (active grants, upcoming deadlines, overdue items), individual grant compliance scores, visual compliance indicators, and quick action buttons for common compliance tasks
- **SF-425 PDF Export:** Official Federal Financial Report generation matching OMB 0348-0061 form structure with all 14 sections, proper line items (10a-10o), indirect expense calculations, certification block, and intelligent placeholder handling for missing data
- **Form 990 PDF Export:** IRS tax return preparation worksheet with Part I Summary (revenue/expenses), Part IX Functional Expenses table (program/management/fundraising breakdown), pre-filled financial data from transactions, and clear guidance for completion with tax professional
- **Bug Fixes:** Fixed Grant select dropdown initialization (changed from empty string to undefined for proper Shadcn Select rendering), added `/compliance` route alias for better accessibility
- Routes properly scoped to nonprofit organizations only (`/compliance`, `/compliance-dashboard`, `/government-grants`)
- PDF generation uses html2pdf.js for client-side generation with proper formatting and official form structures

### October 28, 2025 - Government Grants Implementation
Implemented comprehensive Government Grants system for nonprofit organizations with 5 integrated compliance and reporting features:
- **Time/Effort Reporting:** Employee time allocation tracking to federal grants with percentage effort calculations and certification workflows
- **Cost Allowability Checks:** Expense verification against federal guidelines with allowability status tracking and review workflows
- **Sub-Recipient Award Monitoring:** Sub-award tracking with compliance status monitoring and monitoring schedules
- **Federal Financial Reports (SF-425):** Complete SF-425 reporting with federal/recipient share expenditure tracking and submission workflows
- **Single Audit & Form 990 Prep:** Audit preparation tools with item tracking and completion status management
- Database schema: 5 new tables created (`timeEffortReports`, `costAllowabilityChecks`, `subAwards`, `federalFinancialReports`, `auditPrepItems`)
- Full backend API implementation with GET/POST/PUT/DELETE routes for all 5 features with proper validation
- Frontend page with tabbed interface for all features, edit/delete dialogs, and PDF export functionality

### October 28, 2025 - Government Contracts Bug Fixes
Fixed critical bugs in Government Contracts features:
- Implemented automatic server-side calculation of totalHours and laborCost from clock times and hourly rates
- Added Zod preprocessing for optional datetime and numeric fields to handle empty strings
- Fixed string-to-number conversions for all ID fields across create and update operations
- All features verified working with proper data persistence

## System Architecture

### UI/UX Decisions
The application uses React 18 with TypeScript and Vite for the frontend. UI components are built with `shadcn/ui` (New York style) based on Radix UI, styled using Tailwind CSS and custom CSS variables for themable light/dark modes. Design principles emphasize clarity, professional financial data presentation, minimal cognitive load, responsive design, and modern typography (Inter, JetBrains Mono).

### Technical Implementations
The backend uses Express.js and TypeScript with a RESTful API. Authentication is handled via Replit Auth (OpenID Connect) using Passport.js and session-based, secure HTTP-only cookies stored in PostgreSQL. Authorization employs a multi-tenant, role-based access control system (owner, admin, accountant, viewer) per organization. Data validation is performed using Zod.

### Feature Specifications
Key features include:
-   **Core Financials:** Income/expense tracking, budget planning, recurring transactions, vendor/client management, invoice/bill management.
-   **AI & Automation:** Plaid bank integration for transaction import, AI-powered transaction categorization.
-   **Reporting & Compliance:** Cash flow forecasting, tax reporting (including 1099 generation), custom report builder, audit trail system, bank reconciliation.
-   **Organizational Management:** Team collaboration & invitations, universal branding system, expense approval workflows.
-   **Bulk Operations:** CSV transaction import/export, bulk categorization, bulk delete, bulk expense approvals - all with multi-tenant security validation.
-   **Nonprofit Specific:** Donor tracking, fund accounting, pledge management, program management, functional expense reporting, Form 990 reporting, enhanced transaction forms for fund/program/functional allocation, government grants compliance (time/effort reporting, cost allowability, sub-awards, federal financial reports, audit prep).
-   **For-Profit Government Contracts Specific (DCAA Compliant):** Contract management, contract milestones, DCAA time keeping, job/project costing, indirect cost rate management.
-   **Payroll Management System:** Employee compensation management (salary/hourly), customizable deductions, payroll run processing with server-side validation.

### System Design Choices
PostgreSQL (Neon Serverless) is the primary relational database, managed with Drizzle ORM for type-safe queries and schema migrations. A multi-tenant schema scopes data per organization. A repository pattern with an `IStorage` interface is used for data access.

**Nonprofit-Specific Schema Extensions:** `funds`, `programs`, `pledges`, `pledgePayments`, `timeEffortReports`, `costAllowabilityChecks`, `subAwards`, `federalFinancialReports`, `auditPrepItems` tables, and enhanced `transactions` table with `fundId`, `programId`, `functionalCategory`.
**For-Profit Government Contracts Schema Extensions:** `contracts`, `contractMilestones`, `projects`, `projectCosts`, `timeEntries`, `indirectCostRates` tables.

## External Dependencies

### Authentication
-   **Replit Auth:** OpenID Connect provider.

### Database
-   **Neon Serverless PostgreSQL:** Cloud-hosted relational database.

### Bank Integration
-   **Plaid API:** For bank account connectivity and financial data retrieval.

### Email Service
-   **SendGrid:** For transactional emails, including team invitations.

### UI Libraries
-   **Radix UI:** Headless UI components.
-   **shadcn/ui:** Component library built on Radix UI.
-   **Lucide React:** Icon library.

### Other Key Dependencies
-   **React Hook Form:** For form management with Zod resolver.
-   **Drizzle ORM & Drizzle Zod:** For ORM and Zod integration.
-   **react-plaid-link:** React component for Plaid Link.