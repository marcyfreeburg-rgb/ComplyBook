# ComplyBook Getting Started Guide

## Overview
ComplyBook is a comprehensive financial management platform designed for both nonprofit and for-profit organizations. This guide will help you get started quickly.

---

## For Nonprofit Organizations

### Step 1: Set Up Your Organization
- Go to **Settings** to add your organization details and EIN
- Upload your logo in **Brand Settings**
- Set your fiscal year and invite team members

### Step 2: Connect Bank Accounts
- Navigate to **Bank Accounts** to connect via Plaid
- Select accounts to sync for automatic transaction import
- Set starting balances for accurate tracking

### Step 3: Create Categories
- Set up income categories (Donations, Grants, Program Fees)
- Add expense categories aligned with Form 990
- Mark tax-deductible categories

### Step 4: Set Up Funds & Programs
- Create **Funds** to track restricted vs unrestricted money
- Set up **Programs** with budgets and timelines
- Link transactions to appropriate funds/programs

### Step 5: Manage Donors
- Add donor contact information
- Track lifetime giving and generate tax letters
- Create and manage pledges

### Step 6: Track Grants
- Create grant records with funding periods
- Track expenses against grant budgets
- Generate compliance reports (SF-425)

---

## For For-Profit Organizations

### Step 1: Set Up Your Organization
- Configure company details in **Settings**
- Set up branding and invite team members
- Configure tax settings and fiscal year

### Step 2: Connect Bank Accounts
- Link accounts via Plaid for automatic sync
- Set starting balances for reconciliation

### Step 3: Manage Clients & Vendors
- Add client information for invoicing
- Set up vendor details for bill management
- Configure payment terms

### Step 4: Track Projects & Contracts
- Create projects with budgets and timelines
- For government contracts, enable DCAA compliance features
- Track milestones and deliverables

### Step 5: Invoice & Bill Management
- Create and send invoices to clients
- Enter vendor bills and schedule payments
- Set up auto-pay rules for recurring expenses

### Step 6: Payroll Integration
- Connect payroll provider via Finch API
- Sync employee and compensation data
- Track labor costs by project

---

## Data Import & Migration

### Switching from Other Accounting Software

ComplyBook supports importing data from popular accounting platforms:

| Data Type | QuickBooks | Xero | Aplos |
|-----------|------------|------|-------|
| Transactions | ✓ | ✓ | ✓ |
| Vendors/Suppliers | ✓ | ✓ | ✓ |
| Customers/Clients | ✓ | ✓ | - |
| Chart of Accounts | ✓ | ✓ | ✓ |
| Bills/Invoices | ✓ | ✓ | ✓ |
| Donors | - | - | ✓ |
| Funds | - | - | ✓ |

### How to Import
1. Go to **Operations Hub → Import from Accounting Software**
2. Select what you want to import (transactions, vendors, etc.)
3. Choose your source (QuickBooks, Xero, or Aplos)
4. Export data as CSV from your source application
5. Upload the CSV file and review import results
6. Check imported records and resolve any duplicates

### Best Practices
- Import master lists first (vendors, customers, chart of accounts)
- Then import transactional data (bills, invoices, transactions)
- Validate with trial balance post-import
- Use data cleaning before import to remove duplicates

---

## Bill Payments Workflow

1. **Bills as Source**: Enter bills with vendor info, amounts, due dates
2. **Schedule Payments**: Click Pay → Schedule Payment to queue future payments
3. **Auto-Pay Rules**: Set up automatic payment scheduling in Bill Payments → Auto-Pay
4. **Payment Execution**: Process scheduled payments from Bill Payments → Scheduled tab
5. **Payment History**: View completed payments linked to original bills

---

## Need Help?

Contact your organization administrator or refer to the in-app help documentation for additional guidance.

*ComplyBook - Simplifying Financial Management*
