# Budget Manager - Multi-Tenant Financial Management Application

## Overview
Budget Manager is a web-based financial management platform for small non-profit and for-profit organizations. It provides multi-tenant capabilities for managing multiple organizations, tracking income and expenses, AI-assisted transaction categorization, grant management, budget planning, and comprehensive financial reporting. The vision is to offer an accessible and powerful financial tool that streamlines operations, enabling better financial oversight and strategic planning, and fostering better financial health for its users.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions
The application uses React 18 with TypeScript and Vite for the frontend. UI components are built with `shadcn/ui` (New York style) based on Radix UI, styled using Tailwind CSS and custom CSS variables for themable light/dark modes. Design principles emphasize clarity, professional financial data presentation, minimal cognitive load, responsive design, and modern typography (Inter, JetBrains Mono). The application uses "hub" consolidation patterns with tabbed interfaces to group related functionality, ensuring a streamlined user experience.

### Technical Implementations
The backend uses Express.js and TypeScript with a RESTful API. Authentication is handled via Replit Auth (OpenID Connect) using Passport.js and session-based, secure HTTP-only cookies stored in PostgreSQL. Authorization employs a multi-tenant, role-based access control system (owner, admin, accountant, viewer) per organization. Data validation is performed using Zod.

**Security Posture (NIST 800-53 Compliance):** The application implements Phase 1 critical security controls including session management (12-hour max duration, 30-minute inactivity timeout per AAL2 requirements), comprehensive security headers (CSP, HSTS, X-Frame-Options), and rate limiting (10 req/min for auth, 100 req/min for API). Current baseline compliance: ~45% (moderate security posture). See `NIST_800-53_Security_Assessment.md` for detailed control mapping and remediation roadmap.

### Feature Specifications
Key features include:
-   **Core Financials:** Income/expense tracking, budget planning, recurring transactions, vendor/client management, invoice/bill management.
-   **AI & Automation:** Plaid bank integration for transaction import, AI-powered transaction categorization, automated workflow rules (e.g., auto-approval for expenses).
-   **Reporting & Compliance:** Cash flow forecasting, tax reporting (including 1099 generation, Form 990, SF-425 PDF exports), custom report builder, audit trail system, bank reconciliation, compliance calendar. Enhanced analytics include year-over-year comparisons, financial forecasting, health metrics, and spending insights.
-   **Organizational Management:** Team collaboration & invitations, universal branding system, expense approval workflows.
-   **Bulk Operations:** CSV transaction import/export, bulk categorization, bulk delete, bulk expense approvals, all with multi-tenant security validation.
-   **Nonprofit Specific:** Donor tracking, fund accounting, pledge management, program management, functional expense reporting, government grants compliance (time/effort reporting, cost allowability, sub-awards, federal financial reports, audit prep), in-kind donation tracking, fundraising campaign management, donor stewardship tools.
-   **For-Profit Government Contracts Specific (DCAA Compliant):** Contract management, contract milestones, DCAA time keeping, job/project costing, indirect cost rate management, proposal/bid management, subcontractor management, change order management.
-   **Operations Hub (Universal):** Automated bank reconciliation, universal document management system, compliance calendar for deadlines and renewals.
-   **Payroll Management System:** Employee compensation management (salary/hourly), customizable deductions, payroll run processing with server-side validation.

### System Design Choices
PostgreSQL (Neon Serverless) is the primary relational database, managed with Drizzle ORM for type-safe queries and schema migrations. A multi-tenant schema scopes data per organization. A repository pattern with an `IStorage` interface is used for data access. The schema is extended with specific tables for nonprofit features (e.g., `funds`, `programs`, `pledges`, `timeEffortReports`) and for-profit government contracts (e.g., `contracts`, `contractMilestones`, `projects`, `timeEntries`), ensuring proper multi-tenant isolation and organization-type gating for features.

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
-   **html2pdf.js:** For client-side PDF generation.
-   **Recharts:** For interactive charts and data visualization.