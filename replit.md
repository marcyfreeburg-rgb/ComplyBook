# ComplyBook - Multi-Tenant Financial Management Application

## 📋 Recent Updates (December 6, 2025)

**Plaid Webhooks - COMPLETED ✅**
- Plaid webhook endpoint at `/api/plaid/webhook` for automatic transaction syncing
- Webhook handler (`server/plaidWebhookHandlers.ts`) processes TRANSACTIONS, ITEM, and LINK webhook types
- Supports: SYNC_UPDATES_AVAILABLE, INITIAL_UPDATE, HISTORICAL_UPDATE, DEFAULT_UPDATE
- Error handling: ITEM_ERROR, LOGIN_REPAIRED, PENDING_EXPIRATION, USER_PERMISSION_REVOKED
- PlaidItem schema extended with: `status` (active/login_required/error/pending), `errorCode`, `errorMessage`, `lastSyncedAt`, `cursor`
- Storage methods: `getPlaidItemByPlaidId()`, `updatePlaidItemStatus()` for webhook processing
- Link token creation now includes webhook URL automatically based on REPLIT_DOMAINS
- Transaction import correctly handles Plaid amount polarity (negative = income, positive = expense)

## 📋 Previous Updates (December 5, 2025)

**Subscription Tier System - COMPLETED ✅**
- 5-tier subscription system: Free, Starter ($29/mo), Professional ($79/mo), Growth ($159/mo), Enterprise ($349+/mo)
- Pricing page at `/pricing` accessible to both authenticated and unauthenticated users
- Stripe checkout integration with tier-based pricing (annual discount: 17%)
- Webhook handlers for subscription lifecycle events (checkout, updates, cancellation)
- Feature gating middleware (`server/featureGating.ts`) for enforcing tier limits
- User schema extended with subscription fields: `subscriptionTier`, `subscriptionStatus`, `subscriptionCurrentPeriodEnd`, `billingInterval`
- Storage method `getUserByStripeSubscriptionId()` for webhook processing

## 📋 Previous Updates (December 1, 2025)

**PWA & Mobile Optimization - COMPLETED ✅**
- Progressive Web App (PWA) support with `manifest.json` for home screen installation
- Service worker (`client/public/sw.js`) for offline caching of GET requests
- DeviceContext provider (`client/src/contexts/DeviceContext.tsx`) for responsive device detection
- Mobile-optimized CSS: 44px minimum touch targets, safe-area insets for notched devices
- Responsive grid adjustments and drawer-based sidebar for mobile navigation
- E2E tested on mobile (375x667) and desktop (1920x1080) viewports

**QuickBooks/Xero Import - COMPLETED ✅**
- Accounting imports page at `/accounting-imports` for CSV file uploads
- Supports QuickBooks and Xero CSV formats with automatic vendor/category matching
- Full audit logging for imported transactions

## 📋 Previous Updates (January 13, 2025)

**Bank Reconciliation System - COMPLETED ✅**
- Full reconciliation hub implemented at `/reconciliation-hub`
- Session-based reconciliation workflow with CSV import
- Side-by-side transaction matching interface
- AI-powered match suggestions with similarity scoring
- PDF report generation for reconciliation sessions
- Comprehensive database schema with audit logging
- All API endpoints implemented and tested

**Application Testing - COMPLETED ✅**
- Comprehensive end-to-end testing of all core pages
- Organization creation and navigation verified
- All main routes tested and functional
- See `APPLICATION_STATUS_SUMMARY.md` for complete testing report and recommendations

**For-Profit Features Testing - COMPLETED ✅**
- Tested for-profit organization creation and navigation
- Identified core features ready for testing (transactions, invoices, bills, budgets)
- Fixed budget date validation bug (Invalid time value error)
- Created comprehensive testing documentation
- **Start here:** See `QUICK_START_TESTING_GUIDE.md` for step-by-step testing instructions
- **Detailed results:** See `FOR_PROFIT_TESTING_RESULTS.md` for full technical findings

## Overview
ComplyBook is a web-based financial management platform for small non-profit and for-profit organizations. It provides multi-tenant capabilities for managing multiple organizations, tracking income and expenses, AI-assisted transaction categorization, grant management, budget planning, and comprehensive financial reporting. The vision is to offer an accessible and powerful financial tool that streamlines operations, enabling better financial oversight and strategic planning, and fostering better financial health for its users.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions
The application uses React 18 with TypeScript and Vite for the frontend. UI components are built with `shadcn/ui` (New York style) based on Radix UI, styled using Tailwind CSS and custom CSS variables for themable light/dark modes. Design principles emphasize clarity, professional financial data presentation, minimal cognitive load, responsive design, and modern typography (Inter, JetBrains Mono). The application uses "hub" consolidation patterns with tabbed interfaces to group related functionality, ensuring a streamlined user experience.

**CategoryCombobox Component:** A reusable searchable category selector with hierarchical display, type filtering, and advanced sentinel handling for distinguishing "no change" vs "clear" semantics in bulk operations. Uses `CATEGORY_SENTINEL_NO_CHANGE = -999999` constant for bulk operations to skip field updates, while regular forms use `null` to clear categories. Supports both "No change" and "Clear category" options in bulk dialogs. Default `noneSentinel = null` ensures pristine state always shows placeholder.

**AI Categorization:** Batch size selector (10/20/30/40/50 transactions) with localStorage persistence and backend 50-transaction hard limit for bulk AI categorization operations.

### Technical Implementations
The backend uses Express.js and TypeScript with a RESTful API. Authentication is handled via Replit Auth (OpenID Connect) using Passport.js and session-based, secure HTTP-only cookies stored in PostgreSQL. Authorization employs a multi-tenant, role-based access control system (owner, admin, accountant, viewer) per organization. Data validation is performed using Zod.

**Security Posture (NIST 800-53 Compliance):** The application implements comprehensive Phase 1-3 security controls:
- **Phase 1 (Complete):** Session management (12-hour max duration, 30-minute inactivity timeout per AAL2 requirements), comprehensive security headers (CSP, HSTS, X-Frame-Options), rate limiting (10 req/min for auth, 100 req/min for API)
- **Phase 2 (Complete):** Security event logging with immutable audit logs (database triggers), authentication event tracking, permission denial logging pattern
- **Phase 3 (Complete - Infrastructure):** Field-level encryption for sensitive data (AES-256-GCM), audit log integrity chaining, security monitoring dashboard, automated vulnerability scanning, MFA tracking infrastructure, security event alerting system (SendGrid), audit log retention policies (90-day active, 7-year archival)

**Phase 3 Production Deployment Requirements:**
- **MFA Enforcement:** Authentication middleware integration needed to enforce MFA requirements for privileged accounts after grace period expiration. Schema, storage methods, and API endpoints are complete.
- **Security Alerting:** Fully functional with organization admin/owner recipient resolution. Requires `SECURITY_ADMIN_EMAILS` environment variable for system-wide alerts.
- **Audit Retention:** Archival and deletion utilities complete (`server/auditRetention.ts`). Requires cron scheduler or worker process to run `runAuditRetentionPolicies()` on regular cadence (recommend daily/weekly).
- **Vulnerability Scanning:** Manual trigger available via security dashboard. Recommend adding scheduled scans via cron for continuous monitoring.

Current baseline compliance: ~70% (high security posture). See `NIST_800-53_Security_Assessment.md` for detailed control mapping and `ENCRYPTION.md` for encryption implementation details.

### Feature Specifications
Key features include:
-   **Core Financials:** Income/expense tracking, budget planning, recurring transactions, vendor/client management, invoice/bill management.
-   **AI & Automation:** Plaid bank integration for transaction import, AI-powered transaction categorization, automated workflow rules (e.g., auto-approval for expenses).
-   **Reporting & Compliance:** Cash flow forecasting, tax reporting (including 1099 generation, Form 990, SF-425 PDF exports), custom report builder, audit trail system, bank reconciliation, compliance calendar. Enhanced analytics include year-over-year comparisons, financial forecasting, health metrics, and spending insights.
-   **Organizational Management:** Team collaboration & invitations, universal branding system, expense approval workflows.
-   **Bulk Operations:** CSV transaction import/export, bulk categorization, bulk delete, bulk expense approvals, all with multi-tenant security validation.
-   **Nonprofit Specific:** Donor tracking, fund accounting, pledge management, program management, functional expense reporting, government grants compliance (time/effort reporting, cost allowability, sub-awards, federal financial reports, audit prep), in-kind donation tracking, fundraising campaign management, donor stewardship tools.
-   **For-Profit Government Contracts Specific (DCAA Compliant):** Contract management, contract milestones, DCAA time keeping, job/project costing, indirect cost rate management, **enhanced cost accounting** (labor burden rates with fringe/overhead/G&A tracking, billing rate management, project budget breakdowns, revenue recognition ledger, financial snapshots for reporting), **advanced project creation** (template-based project setup with FFP/CPFF/T&M/CPIF presets, auto-population from parent contract, project cloning with cost/milestone copying, real-time duplicate validation), proposal/bid management, subcontractor management, change order management.
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