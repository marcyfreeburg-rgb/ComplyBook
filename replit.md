# ComplyBook - Multi-Tenant Financial Management Application

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
-   **Mileage & Per Diem Tracking:** IRS-compliant mileage reimbursement with configurable rates, per diem rules with location-based limits, expense submission and approval workflows.
-   **Reporting & Compliance:** Cash flow forecasting, tax reporting (including 1099 generation, Form 990, SF-425 PDF exports), custom report builder, audit trail, bank reconciliation, compliance calendar, program expense reports with budget vs actual analysis and variance alerts, and enhanced analytics.
-   **Organizational Management:** Team collaboration, universal branding, expense approval workflows, and bulk operations (CSV import/export, categorization, deletion, approvals) with multi-tenant security.
-   **Nonprofit Specific:** Donor tracking, fund accounting, pledge management, program management, functional expense reporting, government grants compliance, in-kind donation tracking, fundraising tools, and grant expense tracking with automatic rollup to grant spending totals.
-   **For-Profit Government Contracts Specific (DCAA Compliant):** Contract management, milestones, DCAA timekeeping, job/project costing, indirect cost rate management, enhanced cost accounting (labor burden, overhead, G&A, billing rates, project budgeting, revenue recognition), advanced project creation (template-based setup, cloning), proposal/bid management, subcontractor management, and change order management. Document sharing flows across related entities (proposals→contracts→change orders) with source tagging and secure multi-tenant scoping.
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

### Payroll Integration
-   **Finch API:** Unified API for connecting to 200+ payroll and HRIS providers (Gusto, ADP, Paychex, BambooHR, Paylocity, Rippling, etc.). Handles employee data sync and payroll information. Use `FINCH_SANDBOX=finch` environment variable for sandbox/testing mode.

### Other Key Dependencies
-   **React Hook Form:** For form management with Zod resolver.
-   **Drizzle ORM & Drizzle Zod:** For ORM and Zod integration.
-   **react-plaid-link:** React component for Plaid Link.
-   **html2pdf.js:** For client-side PDF generation.
-   **Recharts:** For interactive charts and data visualization.

## Getting Started Guide

### For Nonprofit Organizations

1. **Set Up Your Organization**
   - Go to Settings to add organization details and EIN
   - Upload your logo in Brand Settings
   - Set your fiscal year and invite team members

2. **Connect Bank Accounts**
   - Navigate to Bank Accounts to connect via Plaid
   - Select accounts to sync for automatic transaction import
   - Set starting balances for accurate tracking

3. **Create Categories**
   - Set up income categories (Donations, Grants, Program Fees)
   - Add expense categories aligned with Form 990
   - Mark tax-deductible categories

4. **Set Up Funds & Programs**
   - Create Funds to track restricted vs unrestricted money
   - Set up Programs with budgets and timelines
   - Link transactions to appropriate funds/programs

5. **Manage Donors**
   - Add donor contact information
   - Track lifetime giving and generate tax letters
   - Create and manage pledges

6. **Track Grants**
   - Create grant records with funding periods
   - Track expenses against grant budgets
   - Generate compliance reports (SF-425)

### For For-Profit Organizations

1. **Set Up Your Organization**
   - Configure company details in Settings
   - Set up branding and invite team members
   - Configure tax settings and fiscal year

2. **Connect Bank Accounts**
   - Link accounts via Plaid for automatic sync
   - Set starting balances for reconciliation

3. **Manage Clients & Vendors**
   - Add client information for invoicing
   - Set up vendor details for bill management
   - Configure payment terms

4. **Track Projects & Contracts**
   - Create projects with budgets and timelines
   - For government contracts, enable DCAA compliance features
   - Track milestones and deliverables

5. **Invoice & Bill Management**
   - Create and send invoices to clients
   - Enter vendor bills and schedule payments
   - Set up auto-pay rules for recurring expenses

6. **Payroll Integration**
   - Connect payroll provider via Finch API
   - Sync employee and compensation data
   - Track labor costs by project

## Data Import & Migration

### Switching from Other Accounting Software

ComplyBook supports importing data from popular accounting platforms to make switching seamless:

#### Supported Import Sources
- **QuickBooks Online/Desktop** - Full support for transactions, vendors, customers, chart of accounts
- **Xero** - Transaction imports, contact lists, account structures
- **Aplos** (Nonprofit) - Donors, funds, donations, and transactions with fund/tag mapping

#### Supported Data Types
| Data Type | QuickBooks | Xero | Aplos |
|-----------|------------|------|-------|
| Transactions | ✓ | ✓ | ✓ |
| Vendors/Suppliers | ✓ | ✓ | ✓ |
| Customers/Clients | ✓ | ✓ | - |
| Chart of Accounts | ✓ | ✓ | ✓ |
| Bills/Invoices | ✓ | ✓ | ✓ |
| Donors | - | - | ✓ |
| Funds | - | - | ✓ |

#### How to Import

1. **Navigate to Import Page**: Go to Operations Hub → Import from Accounting Software
2. **Select Data Type**: Choose what you want to import (transactions, vendors, etc.)
3. **Choose Source**: Select QuickBooks, Xero, or Aplos
4. **Export from Source App**:
   - Follow the on-screen instructions for your source application
   - Export data as CSV file
5. **Upload & Import**: Upload the CSV file and review import results
6. **Validate**: Check imported records and resolve any duplicates

#### Best Practices for Migration
- Import master lists first (vendors, customers, chart of accounts)
- Then import transactional data (bills, invoices, transactions)
- Validate with trial balance post-import
- Use data cleaning before import to remove duplicates

## Bill Payments Workflow

The recommended workflow for managing bill payments follows industry best practices:

1. **Bills as Source**: Enter or upload bills in the Bills page with vendor info, amounts, due dates
2. **Schedule Payments**: From any bill, click Pay → Schedule Payment to queue future payments
3. **Auto-Pay Rules**: Set up rules in Bill Payments → Auto-Pay to automatically schedule payments based on vendor, amount, or due date
4. **Payment Execution**: Process scheduled payments from Bill Payments → Scheduled tab
5. **Payment History**: View completed payments linked to original bills for full audit trail

This flow ensures:
- No duplicate data entry
- Full audit trail and compliance
- Optimized cash flow management
- Reduced manual errors

## Recent Changes

- **AI Tax Deduction Analysis**: For-profit organizations can now use AI to analyze expense categories against IRS Publication 535 business tax deduction guidelines. The feature suggests which categories should be marked as tax-deductible, showing confidence scores and IRS category matches, with ability to apply suggestions individually or in bulk.
- **Automated Invoice Payment Surveys**: Surveys marked as "Invoice Payment Survey" are automatically sent to clients when an invoice is marked as paid. Supports both nonprofit (donors) and for-profit (clients) organizations in email invitations.
- **Bill Payment Scheduling**: Added ability to schedule future payments directly from Bills page
- **Aplos Import Support**: Added nonprofit-specific import for donors, funds, and transactions from Aplos
- **Enhanced Data Import**: Extended import to support vendors, customers, chart of accounts, bills, and invoices
- **Organization Payment Methods**: Added management of ACH, check, wire, and card payment methods per organization