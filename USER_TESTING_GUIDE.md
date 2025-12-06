# User Testing Guide - Budget Manager Application

## 🎉 Bug Fixes Completed!

### Fixed Issues
✅ **Project Creation** - Projects now save correctly with all field types  
✅ **Plaid Bank Connection** - Added manual "Open Bank Connection" button as fallback

---

## 📋 Complete Feature Checklist

Use this guide to test with your own organization data over the next few days. Check off each feature as you test it.

### 🔐 Authentication & Organizations
- [ ] **Login** - Sign in with Replit Auth
- [ ] **Create Organization** - Set up a new organization (Nonprofit or For-Profit)
- [ ] **Switch Organizations** - Toggle between multiple organizations
- [ ] **Organization Settings** - Update name, type, branding
- [ ] **Team Management** - Invite team members via email
- [ ] **Role Assignment** - Set roles (Owner, Admin, Accountant, Viewer)

### 💰 Core Financial Features
- [ ] **Categories** - Create income/expense categories
- [ ] **Transactions** - Add income and expenses
- [ ] **Budgets** - Create and track budgets by category
- [ ] **Recurring Transactions** - Set up auto-repeat transactions
- [ ] **Vendors** - Manage vendor/supplier information
- [ ] **Clients** - Track client information
- [ ] **Invoices** - Create and manage invoices
- [ ] **Bills** - Track and pay bills
- [ ] **CSV Import** - Bulk import transactions from CSV
- [ ] **CSV Export** - Export transactions to CSV
- [ ] **Bulk Operations** - Bulk categorize, delete, approve transactions

### 📊 Reports & Analytics
- [ ] **Income Statement** - View profit & loss report
- [ ] **Balance Sheet** - Check assets, liabilities, equity
- [ ] **Cash Flow Statement** - Track cash movement
- [ ] **Budget vs Actual** - Compare spending to budgets
- [ ] **Tax Reports** - Generate 1099, Form 990, SF-425
- [ ] **Custom Reports** - Build custom financial reports
- [ ] **Dashboard** - View financial overview and charts
- [ ] **Year-over-Year Comparison** - Compare multiple years
- [ ] **Financial Forecasting** - View projected finances
- [ ] **Health Metrics** - Check financial health score

### 🏢 For-Profit Features (Government Contracts)
- [ ] **Contract Management** - Create and manage contracts
- [ ] **Contract Details** - Track contract terms, values, dates
- [ ] **Contract Milestones** - Set and track contract milestones
- [ ] **Project Creation** - Create projects (FFP, CPFF, T&M, CPIF)
- [ ] **Project Templates** - Use pre-configured project templates
- [ ] **Time Tracking** - Log time entries against projects
- [ ] **Job Costing** - Track project costs (labor, materials, overhead)
- [ ] **Indirect Cost Rates** - Manage overhead and G&A rates
- [ ] **Labor Burden Rates** - Configure fringe, overhead, G&A
- [ ] **Billing Rates** - Set and manage billing rates
- [ ] **Cost Accounting** - Track direct/indirect costs
- [ ] **Revenue Recognition** - Manage revenue by project
- [ ] **Project Budgets** - Set and track project budgets
- [ ] **DCAA Compliance** - Time & expense tracking for audits

### ❤️ Nonprofit Features
- [ ] **Donor Management** - Track individual and corporate donors
- [ ] **Donations** - Record one-time and recurring donations
- [ ] **Pledges** - Manage donation pledges
- [ ] **Fund Accounting** - Separate restricted/unrestricted funds
- [ ] **Programs** - Manage programs and their costs
- [ ] **Grants** - Track grant applications and awards
- [ ] **Grant Compliance** - Time/effort reporting, sub-awards
- [ ] **Federal Financial Reports** - SF-425, FFR submissions
- [ ] **In-Kind Donations** - Track non-cash contributions
- [ ] **Fundraising Campaigns** - Manage campaign goals and progress
- [ ] **Donor Stewardship** - Track acknowledgments and relationships
- [ ] **Functional Expense Reporting** - Program vs admin vs fundraising
- [ ] **Form 990** - Generate nonprofit tax form

### 🏦 Bank & AI Integration
- [ ] **Connect Bank (Plaid)** - Link bank account via Plaid
  - Test Bank: "First Platypus Bank"
  - Username: `user_good`
  - Password: `pass_good`
- [ ] **Sync Transactions** - Import bank transactions
- [ ] **Bank Reconciliation** - Match imported to manual transactions
- [ ] **AI Categorization** - Let AI categorize transactions (requires OpenAI)
- [ ] **Email Notifications** - Receive team invitation emails (SendGrid)

### 🛠️ Operations & Compliance
- [ ] **Document Management** - Upload and organize documents
- [ ] **Compliance Calendar** - Track deadlines and renewals
- [ ] **Security Monitoring** - View security events dashboard
- [ ] **Audit Trail** - Review all system changes
- [ ] **Vulnerability Scanning** - Run security scans
- [ ] **Expense Approvals** - Approve/reject expense submissions

### 💼 Payroll Management
- [ ] **Employee Management** - Add employees with compensation
- [ ] **Payroll Deductions** - Set up custom deductions
- [ ] **Payroll Runs** - Process payroll with validation
- [ ] **Payroll Reports** - View payroll summaries

### 🎨 UI/UX Features
- [ ] **Dark Mode** - Toggle between light/dark themes
- [ ] **Responsive Design** - Test on mobile, tablet, desktop
- [ ] **Form Validation** - Verify error messages are clear
- [ ] **Toast Notifications** - Check success/error messages
- [ ] **Loading States** - Verify spinners and skeletons appear
- [ ] **Empty States** - Check helpful messages when no data exists

---

## 🧪 Specific Test Scenarios

### Test Scenario 1: Complete Financial Workflow
1. Create a new organization
2. Set up 3-5 categories (e.g., Salary, Rent, Revenue)
3. Add 2-3 vendors
4. Create a budget for this month
5. Add 10+ transactions (mix of income/expenses)
6. Review dashboard and reports
7. Export to CSV

### Test Scenario 2: Government Contract Workflow (For-Profit)
1. Switch to or create a For-Profit organization
2. Create a new contract with your own contract details
3. Create a project using the "Fixed Price" template
4. Add time entries for the project
5. Track project costs
6. View job costing report

### Test Scenario 3: Nonprofit Grant Workflow
1. Switch to or create a Nonprofit organization
2. Add 2-3 donors
3. Record donations
4. Create a restricted fund
5. Set up a program
6. Allocate expenses to the program
7. Generate functional expense report

### Test Scenario 4: Bank Integration
1. Go to Bank Accounts page
2. Click "Connect Bank"
3. If modal doesn't open, click "Open Bank Connection" button
4. Search for "Platypus" and select "First Platypus Bank"
5. Login: username `user_good`, password `pass_good`
6. Select accounts to connect
7. Click "Sync Transactions" to import
8. Categorize imported transactions

### Test Scenario 5: Team Collaboration
1. Invite a team member (use a real email you can access)
2. Check email for invitation link
3. Accept invitation and set role
4. Test permission differences (Viewer vs Admin)
5. Review audit log to see invitation events

---

## ⚠️ Known Limitations

### Integration Notes
- **Plaid**: ✅ Production mode - real bank connections enabled
- **SendGrid**: Limited to 100 emails/day on free tier
- **OpenAI**: Billed to Replit credits - monitor usage

### Features Status
- **Multi-currency support**: Not yet implemented
- **Advanced forecasting models**: Not yet implemented
- **QuickBooks/Xero Integration**: ✅ IMPLEMENTED - CSV import at /accounting-imports
- **Mobile app**: ✅ PWA support with offline caching (install from browser)
- **Batch invoice generation**: Not yet implemented
- **Automated bill payment**: ✅ IMPLEMENTED - Scheduled payments at /bill-payments

### Security Status (All Complete)
- **MFA**: ✅ Enforcement middleware active with grace period checks
- **Security Alerts**: ✅ Fully configured with admin email notifications
- **Audit Retention**: ✅ Automated daily scheduler running

---

## 🐛 How to Report Issues

If you find bugs or issues during testing:

1. **Note the exact steps** to reproduce
2. **Check browser console** for error messages (F12 → Console tab)
3. **Screenshot the issue** if possible
4. **Document expected vs actual behavior**

### Common Issues & Solutions

**Problem**: Can't log in  
**Solution**: Clear browser cookies and try again

**Problem**: Plaid modal doesn't open  
**Solution**: Click the "Open Bank Connection" button that appears

**Problem**: Form validation errors  
**Solution**: Check that all required fields are filled; scroll up to see error messages

**Problem**: Data not loading  
**Solution**: Refresh the page; check your internet connection

**Problem**: Transaction import fails  
**Solution**: Ensure CSV has headers: date, description, amount, type

**Problem**: Email invitations not received  
**Solution**: Check spam folder; verify SendGrid is configured

---

## 📈 Success Metrics

After testing, you should have:
- ✅ At least one organization fully configured
- ✅ 20+ transactions entered or imported
- ✅ Multiple budgets and categories set up
- ✅ Reports generated and reviewed
- ✅ Team members invited (if applicable)
- ✅ Bank connected (optional but recommended)
- ✅ Comfortable navigating all major features

---

## 🚀 Next Steps

1. **Days 1-2**: Test core features with your own data
2. **Days 3-4**: Test specialized features (nonprofit OR for-profit)
3. **Day 5**: Test integrations (Plaid, email, AI)
4. **Day 6**: Review reports and export data
5. **Day 7**: Final review and feedback

---

## 💡 Tips for Effective Testing

- **Use real data** - Test with actual amounts, vendors, dates from your organization
- **Test edge cases** - Try very large amounts, old dates, special characters in names
- **Test permissions** - Create multiple users with different roles
- **Document everything** - Keep notes on what works and what doesn't
- **Take your time** - Don't rush; thorough testing now prevents issues later

---

## 📞 Need Help?

If you get stuck or have questions:
1. Check this guide for common solutions
2. Review the application's tooltips and help text
3. Check browser console for technical errors
4. Ask me for clarification or assistance!

---

**Happy Testing!** 🎉
