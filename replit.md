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

## Deployment Architecture

### Three-Database Setup
-   **Production (Render):** Neon database — contains all real organization data, accessed via `DATABASE_URL`
-   **Development App (Replit):** Neon database — accessed via `NEON_PRODUCTION_DATABASE_URL` (the app connects to this)
-   **Replit Built-in PostgreSQL:** Accessed via `DATABASE_URL` on Replit — used by the SQL tool but NOT by the running app

**CRITICAL:** The app running on Replit uses the Neon database (`NEON_PRODUCTION_DATABASE_URL`), NOT the Replit built-in PostgreSQL (`DATABASE_URL`). The SQL tool connects to the built-in PostgreSQL. When data appears in the SQL tool but not in the app, it means the data is in the wrong database. Data must be in the Neon database for the app to display it.

### Environment Detection
The app auto-detects which database to use in `server/db.ts`:
-   On Replit (REPL_ID exists): Uses `NEON_PRODUCTION_DATABASE_URL` (with `-pooler` removed for reliable connections) → connects to Neon dev database
-   On Render (no REPL_ID): Uses `DATABASE_URL` → connects to Neon production database

### Authentication
-   **Replit (development):** Replit OIDC authentication (supports Google login)
-   **Render (production):** Local email/password authentication via `server/replitAuth.ts`
-   Admin accounts are configured in the production database (see user records with `is_admin = true`)

### Render Environment Variables (Required)
| Variable | Type | Description |
|----------|------|-------------|
| `DATABASE_URL` | Secret | Neon production database connection string (ep-cool-leaf, use direct non-pooler URL) |
| `SESSION_SECRET` | Secret | Express session secret (must match between environments) |
| `ENCRYPTION_KEY` | Secret | AES-256-GCM field-level encryption key (min 32 chars, must match between environments) |
| `NODE_ENV` | Env | Set to `production` |
| `PLAID_ENV` | Env | Set to `production` |
| `PLAID_CLIENT_ID` | Secret | Plaid API client ID |
| `PLAID_SECRET` | Secret | Plaid API secret |
| `SENDGRID_API_KEY` | Secret | SendGrid email service API key |
| `SENDGRID_FROM_EMAIL` | Env | From email address for SendGrid |
| `STRIPE_SECRET_KEY` | Secret | Stripe secret key |
| `STRIPE_PUBLISHABLE_KEY` | Secret | Stripe publishable key |
| `OPENAI_API_KEY` | Secret | OpenAI API key for AI features |
| `FINCH_CLIENT_ID` | Secret | Finch payroll integration client ID |
| `FINCH_CLIENT_SECRET` | Secret | Finch payroll integration secret |
| `STORAGE_PATH` | Env | Document storage path (e.g., `/opt/render/project/src/uploads/documents`) |
| `SECURITY_ADMIN_EMAILS` | Env | Comma-separated admin emails for security alerts |
| `RENDER_EXTERNAL_URL` | Env | Public URL of the Render deployment (auto-set by Render) |

### Important Notes
-   `ENCRYPTION_KEY` and `SESSION_SECRET` must be identical between Replit and Render to avoid data corruption (encrypted data and sessions are shared across environments)
-   The Neon pooler URL (`-pooler` in hostname) has search_path issues — the app auto-strips `-pooler` from URLs for reliable connections
-   Tax ID fields use AES-256-GCM encryption — clearing corrupted values requires re-entry through the UI

## Security Architecture

### Webhook Verification
-   **Plaid Webhooks:** JWT-based signature verification using ES256 via `server/plaidWebhookVerification.ts`. Decodes JWT from `Plaid-Verification` header, fetches the signing key from Plaid's `webhookVerificationKeyGet` API, verifies the ES256 signature, checks `iat` timestamp (5-minute max age), and validates `request_body_sha256` against the raw request body bytes. Raw body is captured via `express.json({ verify })` callback before JSON parsing.
-   **Stripe Webhooks:** Signature verification required via `STRIPE_WEBHOOK_SECRET`. Raw body captured in `server/index.ts` and passed to `stripe.webhooks.constructEvent()`. Webhooks are rejected with 500 if `STRIPE_WEBHOOK_SECRET` is not configured — no fallback processing of unverified events.

### Log Sanitization
-   MFA token values are never logged (server/mfa.ts)
-   Finch connection IDs and company IDs are not logged (server/finch.ts)
-   Plaid link token values are not logged (server/routes.ts)
-   API response bodies containing PII/financial data are not logged (request logger in server/index.ts)

### Encryption
-   Field-level encryption using AES-256-GCM for sensitive fields (tax IDs)
-   `ENCRYPTION_KEY` must be identical across all environments to avoid data corruption

### CSRF Protection
-   Double-submit cookie pattern via `server/index.ts`
-   CSRF token generated per session, validated on all POST/PATCH/PUT/DELETE requests
-   Exempt paths: auth endpoints, webhooks (which use their own signature verification), public forms
-   Frontend sends CSRF token in `x-csrf-token` header via `queryClient.ts`

### Security Headers (NIST 800-53 SC-7)
-   HSTS with 1-year max-age and preload
-   Content-Security-Policy with dev/prod modes (Plaid CDN, WebSocket support)
-   X-Frame-Options: DENY, X-Content-Type-Options: nosniff, X-XSS-Protection
-   Permissions-Policy restricting geolocation, microphone, camera
-   Rate limiting for API endpoints with in-memory store

### Audit Logging (NIST 800-53 AU-2, AU-3, AU-11)
-   Immutable audit log with HMAC-SHA256 chain integrity (`server/auditChain.ts`)
-   Covers RBAC-sensitive mutations: organization CRUD, team invitations/removals, role/permission changes, financial operations (transactions, invoices, bills), vendor/client/donor management, budgets, payroll
-   Audit entries capture: userId, organizationId, action, entityType, entityId, oldValues, newValues, IP address, user agent
-   90-day active retention, 7-year archival per NIST 800-53 AU-11 (`server/auditRetention.ts`)
-   Chain verification and repair capabilities for tamper detection

### Accessibility (WCAG 2.1 AA)
-   Skip navigation link (`client/src/components/skip-link.tsx`)
-   Route change announcer with aria-live regions (`client/src/components/route-announcer.tsx`)
-   Global live announcer context for dynamic content (`client/src/components/live-announcer.tsx`)
-   Focus management: main content receives focus on route change
-   Document title updates on navigation
-   Semantic landmarks: role="banner" on header, role="main" on main content area

### Important Security Notes
-   `STRIPE_WEBHOOK_SECRET` must be configured in all environments or Stripe webhook processing will fail with 500 errors
-   Plaid webhook verification requires valid Plaid API credentials (`PLAID_CLIENT_ID`, `PLAID_SECRET`) to fetch verification keys
-   Database performance indexes: `idx_transactions_org_source`, `idx_transactions_org_bank_account`, `idx_transactions_org_description`

## External Dependencies

### Authentication
-   **Replit Auth:** OpenID Connect provider (development).
-   **Local Auth:** Email/password with bcrypt (production on Render).

### Database
-   **Neon Serverless PostgreSQL:** Cloud-hosted relational database (two instances: production + development).

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