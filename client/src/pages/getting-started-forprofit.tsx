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
  Scale
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
        { text: "Go to Settings to add your organization details and tax ID", link: "/settings" },
        { text: "Upload your logo and customize branding in Brand Settings", link: "/brand-settings" },
        { text: "Set up your fiscal year and accounting preferences", link: "/settings" },
      ],
    },
    {
      title: "2. Connect Your Bank Accounts",
      description: "Securely link bank accounts to automatically import transactions",
      icon: Landmark,
      color: "text-green-600",
      bgColor: "bg-green-100 dark:bg-green-900/30",
      steps: [
        { text: "Navigate to Bank Accounts to connect via Plaid", link: "/bank-accounts" },
        { text: "Select your financial institution and log in securely", link: "/bank-accounts" },
        { text: "Choose which accounts to sync for automatic transaction import", link: "/bank-accounts" },
      ],
    },
    {
      title: "3. Create Income & Expense Categories",
      description: "Set up categories for proper financial tracking and tax compliance",
      icon: BookOpen,
      color: "text-purple-600",
      bgColor: "bg-purple-100 dark:bg-purple-900/30",
      steps: [
        { text: "Go to Categories to create income categories (Sales, Services, Consulting)", link: "/categories" },
        { text: "Add expense categories (Labor, Materials, Overhead, G&A)", link: "/categories" },
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
        { text: "Add your clients in the Clients section", link: "/clients" },
        { text: "Add your vendors and suppliers", link: "/vendors" },
        { text: "Include contact information for invoicing and 1099 generation", link: "/clients" },
      ],
    },
    {
      title: "5. Manage Government Contracts",
      description: "Track contracts, projects, and maintain DCAA compliance",
      icon: Briefcase,
      color: "text-indigo-600",
      bgColor: "bg-indigo-100 dark:bg-indigo-900/30",
      steps: [
        { text: "Add your government contracts with details and funding", link: "/government-contracts" },
        { text: "Create projects for job costing under each contract", link: "/government-contracts" },
        { text: "Set up indirect cost rates for overhead and G&A", link: "/government-contracts" },
      ],
    },
    {
      title: "6. Track Time & Labor Costs",
      description: "DCAA-compliant timekeeping for government contract billing",
      icon: Clock,
      color: "text-teal-600",
      bgColor: "bg-teal-100 dark:bg-teal-900/30",
      steps: [
        { text: "Record time entries against specific projects and contracts", link: "/government-contracts" },
        { text: "Use clock in/out for real-time time tracking", link: "/government-contracts" },
        { text: "Submit and approve timesheets for billing", link: "/government-contracts" },
      ],
    },
    {
      title: "7. Job Costing & Project Management",
      description: "Track costs by project with labor, materials, and overhead",
      icon: DollarSign,
      color: "text-cyan-600",
      bgColor: "bg-cyan-100 dark:bg-cyan-900/30",
      steps: [
        { text: "Record project costs (direct labor, materials, subcontracts)", link: "/government-contracts" },
        { text: "View project profitability and budget vs actual", link: "/government-contracts" },
        { text: "Track milestones and deliverables", link: "/government-contracts" },
      ],
    },
    {
      title: "8. Create & Track Budgets",
      description: "Build project and annual budgets with multiple funding sources",
      icon: TrendingUp,
      color: "text-rose-600",
      bgColor: "bg-rose-100 dark:bg-rose-900/30",
      steps: [
        { text: "Create your annual operating budget and link to contracts", link: "/budgets" },
        { text: "Add income sources like cost share, subcontract revenue, and other funding", link: "/budgets" },
        { text: "Set category-level budget allocations and track vs actual", link: "/budgets" },
        { text: "Export budgets to CSV or PDF for proposals and reporting", link: "/budgets" },
      ],
    },
    {
      title: "9. Record Transactions",
      description: "Track income and expenses manually or via bank import",
      icon: Receipt,
      color: "text-amber-600",
      bgColor: "bg-amber-100 dark:bg-amber-900/30",
      steps: [
        { text: "Use Transaction Log for day-to-day entries", link: "/transaction-log" },
        { text: "Import transactions from QuickBooks or Wave", link: "/accounting-imports" },
        { text: "Use AI categorization to speed up classification", link: "/transaction-log" },
      ],
    },
    {
      title: "10. Manage Invoices & Bills",
      description: "Send invoices to clients and track vendor bills",
      icon: FileText,
      color: "text-violet-600",
      bgColor: "bg-violet-100 dark:bg-violet-900/30",
      steps: [
        { text: "Create and send professional invoices to clients", link: "/invoices" },
        { text: "Track vendor bills and schedule payments", link: "/bills" },
        { text: "Set up automated bill payments", link: "/bill-payments" },
      ],
    },
    {
      title: "11. Payroll & Employee Management",
      description: "Manage employee compensation and payroll processing",
      icon: Users,
      color: "text-pink-600",
      bgColor: "bg-pink-100 dark:bg-pink-900/30",
      steps: [
        { text: "Add employees and their compensation details", link: "/employees" },
        { text: "Set up deductions (taxes, benefits, retirement)", link: "/deductions" },
        { text: "Process payroll runs and generate reports", link: "/payroll" },
      ],
    },
    {
      title: "12. Compliance & Reporting",
      description: "Generate reports for DCAA audits and tax compliance",
      icon: Scale,
      color: "text-emerald-600",
      bgColor: "bg-emerald-100 dark:bg-emerald-900/30",
      steps: [
        { text: "View compliance dashboard for audit readiness", link: "/compliance-dashboard" },
        { text: "Generate tax reports including 1099s", link: "/tax-reporting" },
        { text: "Export financial statements and custom reports", link: "/reports" },
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
                Then configure your indirect cost rates (overhead, G&A) to ensure accurate job costing and DCAA compliance.
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
