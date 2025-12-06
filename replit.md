# ComplyBook - Multi-Tenant Financial Management Application

## Recent Updates (December 6, 2025)

**Local Authentication & Password Management - COMPLETED**
- Local email/password authentication fallback for non-Replit deployments
- Password change functionality with API endpoint `POST /api/auth/change-password`
- Password change UI in Settings page (only visible in local auth mode)
- Two default admin users for local auth mode:
  - admin@complybook.net / comply2025
  - marcy.freeburg@gmail.com / CaseyLee12
- Security logging for password changes and failed attempts

**MFA Enforcement Infrastructure - COMPLETED**
- `requireMfaCompliance` middleware in `server/replitAuth.ts` enforces MFA grace period checks
- Applied to sensitive routes: organization creation, team invitations, team role changes, team member deletion, MFA settings
- Returns HTTP 403 with `mfaRequired` flag when grace period has expired for users with MFA requirement
- MFA warning banner added to main UI (App.tsx) with grace period countdown
- Warning shows remaining days until MFA required; changes to destructive alert when grace period expires
- API endpoint `GET /api/security/mfa/status` returns user's current MFA requirement status

**Production Setup - COMPLETED**
- Plaid credentials set to production (PLAID_ENV=production)
- Webhooks registered in Plaid dashboard for TRANSACTIONS, ITEM, AUTH, and IDENTITY events
- Complete offboarding flows: USER_PERMISSION_REVOKED and USER_ACCOUNT_REVOKED webhooks implemented
- Sensitive data clearing for disconnected accounts (encrypted account/routing numbers, owner info)
- SECURITY_ADMIN_EMAILS environment variable set for system-wide security alerts
- Stripe integration updated to use Replit connector instead of environment variables
- Automated audit log retention runs daily (90-day archival, 7-year deletion policy)
- API endpoints for manual audit retention: POST /api/security/audit-retention/run, GET /api/security/audit-retention/stats

## Overview
ComplyBook is a web-based financial management platform designed for small non-profit and for-profit organizations. It offers multi-tenant capabilities for managing multiple organizations, tracking income and expenses, AI-assisted transaction categorization, grant management, budget planning, and comprehensive financial reporting. The project's vision is to provide an accessible and powerful financial tool that streamlines operations, enhances financial oversight, and supports strategic planning, ultimately improving the financial health of its users.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions
The frontend utilizes React 18 with TypeScript and Vite. UI components are built using `shadcn/ui` (New York style) atop Radix UI, styled with Tailwind CSS and custom CSS variables for themable light/dark modes. Design principles prioritize clarity, professional financial data presentation, minimal cognitive load, responsive design, and modern typography. The application employs "hub" consolidation patterns with tabbed interfaces to group related functionality, ensuring a streamlined user experience. Features like the `CategoryCombobox` and AI Categorization (with batch size selection) are designed for enhanced usability and efficiency.

### Technical Implementations
The backend is built with Express.js and TypeScript, exposing a RESTful API. Authentication is managed via Replit Auth (OpenID Connect) using Passport.js and secure, session-based HTTP-only cookies stored in PostgreSQL. Authorization features a multi-tenant, role-based access control system (owner, admin, accountant, viewer) per organization. Data validation is handled by Zod. The application adheres to NIST 800-53 security controls, including robust session management, comprehensive security headers, rate limiting, immutable audit logging with integrity chaining, field-level encryption (AES-256-GCM), and MFA enforcement infrastructure. Security alerting and audit log retention policies are also implemented.

### Feature Specifications
Key features include:
-   **Core Financials:** Income/expense tracking, budget planning, recurring transactions, vendor/client management, invoice/bill management.
-   **AI & Automation:** Plaid bank integration for transaction import, AI-powered transaction categorization, automated workflow rules.
-   **Reporting & Compliance:** Cash flow forecasting, tax reporting (including 1099 generation, Form 990, SF-425 PDF exports), custom report builder, audit trail, bank reconciliation, compliance calendar, and enhanced analytics.
-   **Organizational Management:** Team collaboration, universal branding, expense approval workflows, and bulk operations (CSV import/export, categorization, deletion, approvals) with multi-tenant security.
-   **Nonprofit Specific:** Donor tracking, fund accounting, pledge management, program management, functional expense reporting, government grants compliance, in-kind donation tracking, and fundraising tools.
-   **For-Profit Government Contracts Specific (DCAA Compliant):** Contract management, milestones, DCAA timekeeping, job/project costing, indirect cost rate management, enhanced cost accounting (labor burden, overhead, G&A, billing rates, project budgeting, revenue recognition), advanced project creation (template-based setup, cloning), proposal/bid management, subcontractor management, and change order management.
-   **Operations Hub:** Automated bank reconciliation, universal document management, and compliance calendar.
-   **Payroll Management System:** Employee compensation, customizable deductions, and payroll run processing.

### System Design Choices
PostgreSQL (Neon Serverless) serves as the primary relational database, managed using Drizzle ORM for type-safe queries and schema migrations. A multi-tenant schema ensures data isolation per organization. A repository pattern with an `IStorage` interface is employed for data access. The schema is extended to support nonprofit-specific features (e.g., funds, programs) and for-profit government contracts (e.g., contracts, projects), ensuring proper feature gating based on organization type.

## External Dependencies

### Authentication
-   **Replit Auth:** OpenID Connect provider.

### Database
-   **Neon Serverless PostgreSQL:** Cloud-hosted relational database.

### Bank Integration
-   **Plaid API:** For bank account connectivity and financial data retrieval, including transaction syncing, authentication, and identity verification.

### Email Service
-   **SendGrid:** For transactional emails and security alerts.

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