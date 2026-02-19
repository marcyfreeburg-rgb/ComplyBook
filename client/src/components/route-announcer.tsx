import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";

const routeTitles: Record<string, string> = {
  "/": "Dashboard",
  "/transactions": "Transactions",
  "/recurring-transactions": "Recurring Transactions",
  "/categories": "Categories",
  "/vendors": "Vendors",
  "/clients": "Clients",
  "/donors": "Donors",
  "/employees": "Employees",
  "/deductions": "Deductions",
  "/payroll": "Payroll",
  "/invoices": "Invoices",
  "/bills": "Bills",
  "/bill-payments": "Bill Payments",
  "/reports": "Reports",
  "/grants": "Grants",
  "/budgets": "Budgets",
  "/bank-accounts": "Bank Accounts",
  "/funds": "Funds",
  "/pledges": "Pledges",
  "/programs": "Programs",
  "/analytics": "Analytics",
  "/organizations": "Organizations",
  "/settings": "Settings",
  "/cash-flow": "Cash Flow",
  "/tax-reporting": "Tax Reporting",
  "/expense-approvals": "Expense Approvals",
  "/custom-reports": "Custom Reports",
  "/audit-trail": "Audit Trail",
  "/bank-reconciliation": "Bank Reconciliation",
  "/reconciliation-hub": "Reconciliation Hub",
  "/fundraising-hub": "Fundraising Hub",
  "/government-contracts-hub": "Government Contracts Hub",
  "/commercial-contracts-hub": "Commercial Contracts Hub",
  "/crm": "CRM",
  "/operations-hub": "Operations Hub",
  "/security-monitoring": "Security Monitoring",
  "/accounting-imports": "Accounting Imports",
  "/transaction-log": "Transaction Log",
  "/mfa-setup": "MFA Setup",
  "/pricing": "Pricing",
  "/brand-settings": "Brand Settings",
  "/compliance-dashboard": "Compliance Dashboard",
  "/government-grants": "Government Grants",
  "/government-contracts": "Government Contracts",
  "/program-expense-report": "Program Expense Report",
  "/functional-expense-report": "Functional Expense Report",
  "/form-990-report": "Form 990 Report",
  "/form-990-schedule-a": "Schedule A (Form 990)",
  "/form-990-schedule-b": "Schedule B (Form 990)",
  "/donation-letters": "Donation Letters",
  "/surveys": "Surveys",
  "/forms": "Forms",
  "/getting-started": "Getting Started",
};

function getPageTitle(path: string): string {
  if (routeTitles[path]) return routeTitles[path];
  const baseSegment = path.split("/").filter(Boolean)[0];
  if (baseSegment) {
    return baseSegment
      .split("-")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  }
  return "Page";
}

export function RouteAnnouncer() {
  const [location] = useLocation();
  const [announcement, setAnnouncement] = useState("");
  const previousLocation = useRef(location);

  useEffect(() => {
    if (previousLocation.current !== location) {
      const title = getPageTitle(location);
      setAnnouncement(`Navigated to ${title}`);
      document.title = `${title} - ComplyBook`;

      const mainContent = document.getElementById("main-content");
      if (mainContent) {
        mainContent.focus({ preventScroll: false });
      }

      previousLocation.current = location;
    }
  }, [location]);

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="sr-only"
      data-testid="text-route-announcer"
    >
      {announcement}
    </div>
  );
}
