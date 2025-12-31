import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { 
  Building2, 
  Receipt, 
  Users, 
  Heart, 
  FileText, 
  Target, 
  Wallet, 
  TrendingUp,
  BookOpen,
  Calendar,
  CheckCircle,
  ArrowRight,
  Landmark,
  Gift,
  ClipboardList,
  BarChart3
} from "lucide-react";
import type { Organization } from "@shared/schema";

interface GettingStartedNonprofitProps {
  currentOrganization: Organization;
}

export default function GettingStartedNonprofit({ currentOrganization }: GettingStartedNonprofitProps) {
  const sections = [
    {
      title: "1. Set Up Your Organization",
      description: "Configure your nonprofit's basic settings and branding",
      icon: Building2,
      color: "text-blue-600",
      bgColor: "bg-blue-100 dark:bg-blue-900/30",
      steps: [
        { text: "Go to Settings to add your organization details", link: "/settings" },
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
      description: "Set up categories that match nonprofit accounting standards",
      icon: BookOpen,
      color: "text-purple-600",
      bgColor: "bg-purple-100 dark:bg-purple-900/30",
      steps: [
        { text: "Go to Categories to create income categories (Donations, Grants, Program Fees)", link: "/categories" },
        { text: "Add expense categories (Program, Administrative, Fundraising)", link: "/categories" },
        { text: "Mark tax-deductible categories for proper reporting", link: "/categories" },
      ],
    },
    {
      title: "4. Set Up Funds & Programs",
      description: "Track restricted and unrestricted funds, and program-specific accounting",
      icon: Target,
      color: "text-orange-600",
      bgColor: "bg-orange-100 dark:bg-orange-900/30",
      steps: [
        { text: "Create Funds to track restricted vs unrestricted money", link: "/funds" },
        { text: "Set up Programs to track program-specific income and expenses", link: "/programs" },
        { text: "Link transactions to specific funds and programs as you record them", link: "/transactions" },
      ],
    },
    {
      title: "5. Manage Donors & Pledges",
      description: "Track donor relationships, pledges, and generate acknowledgment letters",
      icon: Heart,
      color: "text-red-600",
      bgColor: "bg-red-100 dark:bg-red-900/30",
      steps: [
        { text: "Add your donors in the Donors section", link: "/donors" },
        { text: "Track multi-year pledges and payment schedules", link: "/pledges" },
        { text: "Generate donation acknowledgment letters and 1099s", link: "/donation-letters" },
      ],
    },
    {
      title: "6. Apply for & Manage Grants",
      description: "Track grant applications, awards, and compliance requirements",
      icon: Gift,
      color: "text-teal-600",
      bgColor: "bg-teal-100 dark:bg-teal-900/30",
      steps: [
        { text: "Add active and pending grants in the Grants section", link: "/grants" },
        { text: "For federal grants, use Government Grants for compliance tracking", link: "/government-grants" },
        { text: "Set up grant budgets and track spending against award amounts", link: "/grants" },
      ],
    },
    {
      title: "7. Create & Track Budgets",
      description: "Build annual budgets and monitor spending throughout the year",
      icon: TrendingUp,
      color: "text-indigo-600",
      bgColor: "bg-indigo-100 dark:bg-indigo-900/30",
      steps: [
        { text: "Create your annual operating budget", link: "/budgets" },
        { text: "Set category-level budget allocations", link: "/budgets" },
        { text: "Monitor budget vs actual spending on your Dashboard", link: "/" },
      ],
    },
    {
      title: "8. Record Transactions",
      description: "Track income and expenses manually or via bank import",
      icon: Receipt,
      color: "text-cyan-600",
      bgColor: "bg-cyan-100 dark:bg-cyan-900/30",
      steps: [
        { text: "Use Transaction Log for day-to-day entries", link: "/transaction-log" },
        { text: "Import transactions from QuickBooks or Wave", link: "/accounting-imports" },
        { text: "Use AI categorization to speed up classification", link: "/transaction-log" },
      ],
    },
    {
      title: "9. Manage Invoices & Bills",
      description: "Send invoices and track bills for programs and services",
      icon: FileText,
      color: "text-amber-600",
      bgColor: "bg-amber-100 dark:bg-amber-900/30",
      steps: [
        { text: "Create and send invoices for program fees or services", link: "/invoices" },
        { text: "Track vendor bills and schedule payments", link: "/bills" },
        { text: "Set up automated bill payments", link: "/bill-payments" },
      ],
    },
    {
      title: "10. Generate Reports",
      description: "Produce Form 990 data, functional expense reports, and more",
      icon: BarChart3,
      color: "text-rose-600",
      bgColor: "bg-rose-100 dark:bg-rose-900/30",
      steps: [
        { text: "View financial reports including Statement of Activities", link: "/reports" },
        { text: "Generate Functional Expense Report for Form 990", link: "/functional-expense-report" },
        { text: "Export Form 990 data for tax filing", link: "/form-990-report" },
      ],
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <h1 className="text-3xl font-semibold text-foreground">Getting Started</h1>
            <Badge variant="secondary">Nonprofit</Badge>
          </div>
          <p className="text-muted-foreground">
            Welcome to ComplyBook! Follow these steps to set up {currentOrganization.name} for nonprofit financial management.
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
              <h3 className="font-semibold text-lg mb-1">Quick Start Tip</h3>
              <p className="text-muted-foreground text-sm">
                Start by connecting your bank accounts and setting up categories. This will allow you to 
                automatically import transactions and use AI-powered categorization to save hours of manual work.
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
              Our support team is here to help you get the most out of ComplyBook.
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
