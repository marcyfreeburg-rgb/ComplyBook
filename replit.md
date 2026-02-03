# ComplyBook - Multi-Tenant Financial Management Application

## Overview
ComplyBook is a web-based financial management platform for small non-profit and for-profit organizations. It offers multi-tenant capabilities, income/expense tracking, AI-assisted transaction categorization, grant management, budget planning, and comprehensive financial reporting. The project aims to streamline operations, enhance financial oversight, and support strategic planning, ultimately improving the financial health of its users.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions
The frontend uses React 18 with TypeScript and Vite. UI components are built with `shadcn/ui` (New York style) on Radix UI, styled with Tailwind CSS, supporting light/dark modes. Design prioritizes clarity, professional data presentation, minimal cognitive load, responsive design, and modern typography, utilizing "hub" consolidation patterns and tabbed interfaces.

### Technical Implementations
The backend uses Express.js and TypeScript, providing a RESTful API. Authentication is via Replit Auth (OpenID Connect) with Passport.js and secure session cookies. Authorization is a multi-tenant, role-based access control system (owner, admin, accountant, viewer) per organization. Data validation uses Zod. Security adheres to NIST 800-53, including session management, security headers, rate limiting, immutable audit logging, field-level encryption (AES-256-GCM), and MFA infrastructure.

### Feature Specifications
Key features include:
-   **Core Financials:** Income/expense tracking, budgeting, recurring transactions, vendor/client management, invoicing.
-   **AI & Automation:** Plaid integration for transaction import, AI categorization, automated workflows.
-   **Mileage & Per Diem Tracking:** IRS-compliant tracking with configurable rates and approval workflows.
-   **Reporting & Compliance:** Cash flow forecasting, tax reporting (1099, Form 990, SF-425), custom reports, audit trail, bank reconciliation, compliance calendar, program expense reports, and enhanced analytics.
-   **Organizational Management:** Team collaboration, branding, expense approval workflows, and bulk operations with multi-tenant security.
-   **Nonprofit Specific:** Donor tracking, fund accounting, pledge management, program management, functional expense reporting, government grants compliance, in-kind donation tracking, fundraising tools, and grant expense tracking.
-   **For-Profit Government Contracts Specific (DCAA Compliant):** Contract management, DCAA timekeeping, job/project costing, indirect cost rate management, advanced cost accounting, project creation, proposal/bid management, subcontractor management, and change order management with document sharing.
-   **Operations Hub:** Automated bank reconciliation, universal document management, and compliance calendar.
-   **Payroll Management System:** Employee compensation, customizable deductions, and payroll processing.

### System Design Choices
PostgreSQL (Neon Serverless) is the primary relational database, managed with Drizzle ORM for type-safe queries and schema migrations. A multi-tenant schema ensures data isolation. A repository pattern with an `IStorage` interface is used for data access. The schema supports nonprofit and for-profit government contracts features, with feature gating based on organization type.

## External Dependencies

### Authentication
-   **Replit Auth:** OpenID Connect provider.

### Database
-   **Neon Serverless PostgreSQL:** Cloud-hosted relational database.

### Bank Integration
-   **Plaid API:** For bank account connectivity, transaction syncing, authentication, and identity verification.

### Email Service
-   **SendGrid:** For transactional emails and security alerts.

### UI Libraries
-   **Radix UI:** Headless UI components.
-   **shadcn/ui:** Component library built on Radix UI.
-   **Lucide React:** Icon library.

### Payroll Integration
-   **Finch API:** Unified API for connecting to payroll and HRIS providers (e.g., Gusto, ADP). Handles employee data sync and payroll information.

### Other Key Dependencies
-   **React Hook Form:** For form management with Zod resolver.
-   **Drizzle ORM & Drizzle Zod:** For ORM and Zod integration.
-   **react-plaid-link:** React component for Plaid Link.
-   **html2pdf.js:** For client-side PDF generation.
-   **Recharts:** For interactive charts and data visualization.