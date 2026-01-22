import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { 
  Building2, 
  Receipt, 
  Users, 
  FileText, 
  Target, 
  Wallet, 
  TrendingUp,
  BookOpen,
  Calendar,
  CheckCircle,
  ArrowRight,
  Landmark,
  Briefcase,
  ClipboardList,
  BarChart3,
  Clock,
  DollarSign,
  Scale,
  FolderOpen,
  FileCheck
} from "lucide-react";
import type { Organization } from "@shared/schema";

interface GettingStartedForprofitProps {
  currentOrganization: Organization;
}

export default function GettingStartedForprofit({ currentOrganization }: GettingStartedForprofitProps) {
  const sections = [
    {
      title: "1. Set Up Your Organization",
      description: "Configure your company's basic settings and branding",
      icon: Building2,
      color: "text-blue-600",
      bgColor: "bg-blue-100 dark:bg-blue-900/30",
      steps: [
        { text: "Go to Settings to add your organization details, tax ID, and DUNS number", link: "/settings" },
        { text: "Upload your logo and customize branding in Brand Settings", link: "/brand-settings" },
        { text: "Set up your fiscal year and accounting preferences", link: "/settings" },
        { text: "Invite team members and assign roles (owner, admin, accountant, viewer)", link: "/settings" },
      ],
    },
    {
      title: "2. Connect Your Bank Accounts",
      description: "Securely link bank accounts and set starting balances for accurate tracking",
      icon: Landmark,
      color: "text-green-600",
      bgColor: "bg-green-100 dark:bg-green-900/30",
      steps: [
        { text: "Navigate to Bank Accounts to connect via Plaid", link: "/bank-accounts" },
        { text: "Select your financial institution and log in securely", link: "/bank-accounts" },
        { text: "Choose which accounts to sync for automatic transaction import", link: "/bank-accounts" },
        { text: "Set a starting balance and date for each account to track running balances correctly", link: "/bank-accounts" },
        { text: "Filter transactions by account in the Transaction Log to view per-account balances", link: "/transaction-log" },
      ],
    },
    {
      title: "3. Create Income & Expense Categories",
      description: "Set up categories for proper financial tracking and DCAA compliance",
      icon: BookOpen,
      color: "text-purple-600",
      bgColor: "bg-purple-100 dark:bg-purple-900/30",
      steps: [
        { text: "Go to Categories to create income categories (Sales, Services, Contract Revenue)", link: "/categories" },
        { text: "Add expense categories (Direct Labor, Materials, Overhead, G&A, Fringe)", link: "/categories" },
        { text: "Mark tax-deductible categories for proper tax reporting", link: "/categories" },
      ],
    },
    {
      title: "4. Set Up Clients & Vendors",
      description: "Track your customers and suppliers for invoicing and bill management",
      icon: Users,
      color: "text-orange-600",
      bgColor: "bg-orange-100 dark:bg-orange-900/30",
      steps: [
        { text: "Add your clients with contact information and billing details", link: "/clients" },
        { text: "Add your vendors and suppliers for bill tracking", link: "/vendors" },
        { text: "Include tax IDs for 1099 generation at year end", link: "/clients" },
        { text: "Track payment terms and outstanding balances", link: "/vendors" },
      ],
    },
    {
      title: "5. Manage Government Contracts",
      description: "Track contracts, projects, milestones, and maintain DCAA compliance",
      icon: Briefcase,
      color: "text-indigo-600",
      bgColor: "bg-indigo-100 dark:bg-indigo-900/30",
      steps: [
        { text: "Add government contracts with contract number, value, and period of performance", link: "/government-contracts" },
        { text: "Create projects for job costing under each contract", link: "/government-contracts" },
        { text: "Set up indirect cost rates (overhead, G&A, fringe) for accurate billing", link: "/government-contracts" },
        { text: "Track contract milestones and deliverables", link: "/government-contracts" },
      ],
    },
    {
      title: "6. Track Labor & Project Costs",
      description: "Track labor costs and billing rates for government contracts",
      icon: Clock,
      color: "text-teal-600",
      bgColor: "bg-teal-100 dark:bg-teal-900/30",
      steps: [
        { text: "Set up employee labor rates and billing rates", link: "/employees" },
        { text: "Track labor costs against projects and contracts", link: "/government-contracts" },
        { text: "View project labor summaries and cost breakdowns", link: "/government-contracts" },
      ],
    },
    {
      title: "7. Job Costing & Project Management",
      description: "Track costs by project with labor, materials, overhead, and revenue recognition",
      icon: DollarSign,
      color: "text-cyan-600",
      bgColor: "bg-cyan-100 dark:bg-cyan-900/30",
      steps: [
        { text: "Record project costs (direct labor, materials, subcontracts, ODCs)", link: "/government-contracts" },
        { text: "View project profitability with budget vs actual comparisons", link: "/government-contracts" },
        { text: "Track revenue recognition and billing status", link: "/government-contracts" },
        { text: "Clone projects from templates for quick setup", link: "/government-contracts" },
      ],
    },
    {
      title: "8. Create & Track Budgets",
      description: "Build project and annual budgets with multiple funding sources",
      icon: TrendingUp,
      color: "text-rose-600",
      bgColor: "bg-rose-100 dark:bg-rose-900/30",
      steps: [
        { text: "Create budgets linked to contracts and projects", link: "/budgets" },
        { text: "Add income sources: contract funding, cost share, subcontract revenue", link: "/budgets" },
        { text: "Set category-level budget allocations with labor and materials", link: "/budgets" },
        { text: "Track budget vs actual spending in real-time", link: "/budgets" },
      ],
    },
    {
      title: "9. Record Transactions",
      description: "Track income and expenses with client/vendor linking and AI categorization",
      icon: Receipt,
      color: "text-amber-600",
      bgColor: "bg-amber-100 dark:bg-amber-900/30",
      steps: [
        { text: "Use Transaction Log or Expenses for day-to-day entries with running balances", link: "/transaction-log" },
        { text: "Sync transactions automatically from connected bank accounts", link: "/bank-accounts" },
        { text: "Import transactions from QuickBooks, Wave, or CSV files", link: "/accounting-imports" },
        { text: "When adding an EXPENSE: Select Type 'Expense', choose Category, and link to a Vendor for tracking and 1099 reporting", link: "/transactions" },
        { text: "When adding INCOME: Select Type 'Income', choose Category, and link to a Client for invoicing and revenue tracking", link: "/transactions" },
        { text: "Split transactions into multiple categories for accurate cost allocation across projects", link: "/transaction-log" },
        { text: "Use AI categorization to automatically classify transactions in bulk", link: "/transaction-log" },
        { text: "For government contracts: Link expenses to projects for job costing and DCAA compliance", link: "/government-contracts" },
      ],
    },
    {
      title: "10. Manage Invoices & Bills",
      description: "Send invoices to clients and track vendor bills",
      icon: FileText,
      color: "text-violet-600",
      bgColor: "bg-violet-100 dark:bg-violet-900/30",
      steps: [
        { text: "Create and send professional invoices to clients with your branding", link: "/invoices" },
        { text: "Track invoice payments and outstanding balances", link: "/invoices" },
        { text: "Add vendor bills with due dates and payment terms", link: "/bills" },
        { text: "Process bill payments and track payment history", link: "/bill-payments" },
      ],
    },
    {
      title: "11. Payroll & Employee Management",
      description: "Manage employee compensation, deductions, and payroll processing",
      icon: Users,
      color: "text-pink-600",
      bgColor: "bg-pink-100 dark:bg-pink-900/30",
      steps: [
        { text: "Add employees with compensation details and labor rates", link: "/employees" },
        { text: "Set up deductions (federal/state taxes, benefits, 401k)", link: "/deductions" },
        { text: "Process payroll runs with automatic calculations", link: "/payroll" },
        { text: "Generate payroll reports for tax filings", link: "/payroll" },
      ],
    },
    {
      title: "12. Bank Reconciliation",
      description: "Reconcile bank statements and manage compliance",
      icon: ClipboardList,
      color: "text-lime-600",
      bgColor: "bg-lime-100 dark:bg-lime-900/30",
      steps: [
        { text: "Go to Bank Reconciliation to match transactions with bank statements", link: "/bank-reconciliation" },
        { text: "Use Reconciliation Hub for a complete reconciliation overview", link: "/reconciliation-hub" },
      ],
    },
    {
      title: "13. Compliance & Reporting",
      description: "Generate reports for DCAA audits, tax compliance, and financial statements",
      icon: Scale,
      color: "text-emerald-600",
      bgColor: "bg-emerald-100 dark:bg-emerald-900/30",
      steps: [
        { text: "View compliance dashboard for DCAA audit readiness", link: "/compliance-dashboard" },
        { text: "Generate tax reports including 1099s for vendors and contractors", link: "/tax-reporting" },
        { text: "Export financial statements (income statement, balance sheet)", link: "/reports" },
        { text: "Build custom reports with your own criteria", link: "/custom-reports" },
        { text: "View complete audit trail of all transactions", link: "/audit-trail" },
      ],
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <h1 className="text-3xl font-semibold text-foreground">Getting Started</h1>
            <Badge variant="secondary">For-Profit</Badge>
          </div>
          <p className="text-muted-foreground">
            Welcome to ComplyBook! Follow these steps to set up {currentOrganization.name} for government contract management and DCAA compliance.
          </p>
        </div>
        <Link href="/">
          <Button variant="outline" data-testid="button-back-dashboard">
            Back to Dashboard
          </Button>
        </Link>
      </div>

      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <CheckCircle className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-lg mb-1">Quick Start Tip for Government Contractors</h3>
              <p className="text-muted-foreground text-sm">
                Start by setting up your contracts and projects in the Government Contracts section. 
                Then configure your indirect cost rates (overhead, G&A, fringe) to ensure accurate job costing and DCAA compliance.
                Connect your bank accounts and set starting balances for accurate running balance tracking.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6">
        {sections.map((section, index) => (
          <Card key={index} className="hover-elevate">
            <CardHeader>
              <div className="flex items-start gap-4">
                <div className={`h-12 w-12 rounded-lg ${section.bgColor} flex items-center justify-center shrink-0`}>
                  <section.icon className={`h-6 w-6 ${section.color}`} />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-lg">{section.title}</CardTitle>
                  <CardDescription>{section.description}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {section.steps.map((step, stepIndex) => (
                  <li key={stepIndex} className="flex items-center gap-3">
                    <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center text-xs font-medium shrink-0">
                      {stepIndex + 1}
                    </div>
                    <span className="text-sm text-muted-foreground flex-1">{step.text}</span>
                    <Link href={step.link}>
                      <Button variant="ghost" size="sm" className="shrink-0" data-testid={`button-step-${index}-${stepIndex}`}>
                        Go <ArrowRight className="h-4 w-4 ml-1" />
                      </Button>
                    </Link>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="text-center">
            <h3 className="font-semibold text-lg mb-2">Need Help?</h3>
            <p className="text-muted-foreground text-sm mb-4">
              Our support team is here to help you get the most out of ComplyBook for your government contracting needs.
            </p>
            <div className="flex justify-center gap-4 flex-wrap">
              <Link href="/settings">
                <Button variant="outline" data-testid="button-settings">
                  <Users className="h-4 w-4 mr-2" />
                  Team Settings
                </Button>
              </Link>
              <Link href="/">
                <Button data-testid="button-go-dashboard">
                  Go to Dashboard
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
