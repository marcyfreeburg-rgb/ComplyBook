import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Receipt, 
  FileText, 
  Gift, 
  TrendingUp, 
  Landmark, 
  PieChart, 
  Shield, 
  Check,
  Play,
  ArrowRight,
  Sparkles,
  DollarSign,
  BarChart3,
  Wallet,
  CheckCircle,
  AlertCircle
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { Link } from "wouter";
import complyBookLogo from "@assets/COmplybook_1765050943685.png";
import { SUBSCRIPTION_TIERS } from "@shared/schema";

const FEATURED_TIERS = ['free', 'core', 'professional'] as const;

function InteractiveDemo() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [animatedValues, setAnimatedValues] = useState({
    totalBudget: 0,
    spent: 0,
    grants: 0,
    transactions: 0
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedValues({
        totalBudget: 125000,
        spent: 78450,
        grants: 3,
        transactions: 234
      });
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  const demoCategories = [
    { name: "Program Services", budgeted: 45000, spent: 32150, color: "bg-blue-500" },
    { name: "Administrative", budgeted: 25000, spent: 18200, color: "bg-purple-500" },
    { name: "Fundraising", budgeted: 15000, spent: 8100, color: "bg-green-500" },
    { name: "Personnel", budgeted: 40000, spent: 20000, color: "bg-orange-500" },
  ];

  const demoTransactions = [
    { date: "Jan 8", description: "Office Supplies", amount: -245.00, category: "Administrative", status: "categorized" },
    { date: "Jan 7", description: "Foundation Grant Deposit", amount: 15000.00, category: "Grant Income", status: "categorized" },
    { date: "Jan 6", description: "Program Materials", amount: -1250.00, category: "Program Services", status: "categorized" },
    { date: "Jan 5", description: "Monthly Donation", amount: 500.00, category: "Donations", status: "pending" },
    { date: "Jan 4", description: "Staff Training", amount: -750.00, category: "Personnel", status: "categorized" },
  ];

  const demoGrants = [
    { name: "Community Foundation Grant", amount: 50000, status: "active", remaining: 28500, endDate: "Dec 2026" },
    { name: "Federal Education Grant", amount: 75000, status: "active", remaining: 42000, endDate: "Sep 2026" },
    { name: "Corporate Giving Program", amount: 25000, status: "pending", remaining: 25000, endDate: "TBD" },
  ];

  return (
    <Card className="overflow-hidden border-2">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="bg-muted/50 border-b px-4 py-2">
          <TabsList className="grid w-full max-w-md grid-cols-4">
            <TabsTrigger value="dashboard" data-testid="demo-tab-dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="budget" data-testid="demo-tab-budget">Budget</TabsTrigger>
            <TabsTrigger value="transactions" data-testid="demo-tab-transactions">Transactions</TabsTrigger>
            <TabsTrigger value="grants" data-testid="demo-tab-grants">Grants</TabsTrigger>
          </TabsList>
        </div>
        
        <TabsContent value="dashboard" className="m-0">
          <CardContent className="p-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-muted/30 rounded-md p-4 text-center">
                <p className="text-sm text-muted-foreground mb-1">Total Budget</p>
                <p className="text-2xl font-bold text-primary" data-testid="demo-total-budget">${animatedValues.totalBudget.toLocaleString()}</p>
              </div>
              <div className="bg-muted/30 rounded-md p-4 text-center">
                <p className="text-sm text-muted-foreground mb-1">Spent YTD</p>
                <p className="text-2xl font-bold" data-testid="demo-spent-ytd">${animatedValues.spent.toLocaleString()}</p>
              </div>
              <div className="bg-muted/30 rounded-md p-4 text-center">
                <p className="text-sm text-muted-foreground mb-1">Active Grants</p>
                <p className="text-2xl font-bold text-green-600" data-testid="demo-active-grants">{animatedValues.grants}</p>
              </div>
              <div className="bg-muted/30 rounded-md p-4 text-center">
                <p className="text-sm text-muted-foreground mb-1">Transactions</p>
                <p className="text-2xl font-bold" data-testid="demo-transactions">{animatedValues.transactions}</p>
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-primary" />
                  Budget vs Actual
                </h4>
                <div className="space-y-3">
                  {demoCategories.map((cat) => (
                    <div key={cat.name}>
                      <div className="flex justify-between gap-2 text-sm mb-1">
                        <span>{cat.name}</span>
                        <span className="text-muted-foreground">${cat.spent.toLocaleString()} / ${cat.budgeted.toLocaleString()}</span>
                      </div>
                      <Progress value={(cat.spent / cat.budgeted) * 100} className="h-2" />
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <Receipt className="h-4 w-4 text-primary" />
                  Recent Activity
                </h4>
                <div className="space-y-2">
                  {demoTransactions.slice(0, 4).map((tx, i) => (
                    <div key={i} className="flex items-center justify-between gap-4 py-2 border-b last:border-0">
                      <div className="flex items-center gap-3">
                        <div className={`h-8 w-8 rounded-full flex items-center justify-center ${tx.amount > 0 ? 'bg-green-100 dark:bg-green-900/30' : 'bg-muted'}`}>
                          {tx.amount > 0 ? <TrendingUp className="h-4 w-4 text-green-600" /> : <Wallet className="h-4 w-4 text-muted-foreground" />}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{tx.description}</p>
                          <p className="text-xs text-muted-foreground">{tx.category}</p>
                        </div>
                      </div>
                      <span className={`font-medium ${tx.amount > 0 ? 'text-green-600' : ''}`} data-testid={`demo-tx-amount-${i}`}>
                        {tx.amount > 0 ? '+' : ''}${Math.abs(tx.amount).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </TabsContent>
        
        <TabsContent value="budget" className="m-0">
          <CardContent className="p-6">
            <div className="flex items-center justify-between gap-4 mb-4">
              <h4 className="font-medium">FY 2026 Operating Budget</h4>
              <Badge variant="secondary" data-testid="demo-budget-utilization">63% utilized</Badge>
            </div>
            <div className="space-y-4">
              {demoCategories.map((cat) => {
                const percent = Math.round((cat.spent / cat.budgeted) * 100);
                const remaining = cat.budgeted - cat.spent;
                return (
                  <div key={cat.name} className="p-4 bg-muted/30 rounded-md">
                    <div className="flex items-center justify-between gap-4 mb-2">
                      <div className="flex items-center gap-2">
                        <div className={`h-3 w-3 rounded-full ${cat.color}`} />
                        <span className="font-medium">{cat.name}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-medium">${cat.spent.toLocaleString()}</span>
                        <span className="text-muted-foreground"> / ${cat.budgeted.toLocaleString()}</span>
                      </div>
                    </div>
                    <Progress value={percent} className="h-2 mb-2" />
                    <div className="flex justify-between gap-2 text-sm text-muted-foreground">
                      <span>{percent}% used</span>
                      <span className="text-green-600">${remaining.toLocaleString()} remaining</span>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-4 p-4 bg-primary/5 rounded-md border border-primary/20">
              <div className="flex items-center gap-2 text-primary font-medium mb-1">
                <Sparkles className="h-4 w-4" />
                Income Sources
              </div>
              <div className="grid grid-cols-3 gap-4 mt-2">
                <div className="text-center">
                  <p className="text-lg font-semibold text-green-600" data-testid="demo-income-matching">+$50,000</p>
                  <p className="text-xs text-muted-foreground">Matching Funds</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-semibold text-green-600" data-testid="demo-income-corporate">+$25,000</p>
                  <p className="text-xs text-muted-foreground">Corporate Donation</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-semibold text-green-600" data-testid="demo-income-inkind">+$12,500</p>
                  <p className="text-xs text-muted-foreground">In-Kind Support</p>
                </div>
              </div>
            </div>
          </CardContent>
        </TabsContent>
        
        <TabsContent value="transactions" className="m-0">
          <CardContent className="p-6">
            <div className="flex items-center justify-between gap-4 mb-4">
              <h4 className="font-medium">Recent Transactions</h4>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-green-600 border-green-600">AI Categorized</Badge>
              </div>
            </div>
            <div className="space-y-2">
              {demoTransactions.map((tx, i) => (
                <div key={i} className="flex items-center justify-between gap-4 p-3 bg-muted/30 rounded-md">
                  <div className="flex items-center gap-3">
                    <div className="text-sm text-muted-foreground w-12">{tx.date}</div>
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center ${tx.amount > 0 ? 'bg-green-100 dark:bg-green-900/30' : 'bg-muted'}`}>
                      {tx.amount > 0 ? <DollarSign className="h-4 w-4 text-green-600" /> : <Receipt className="h-4 w-4 text-muted-foreground" />}
                    </div>
                    <div>
                      <p className="font-medium">{tx.description}</p>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">{tx.category}</Badge>
                        {tx.status === "categorized" ? (
                          <CheckCircle className="h-3 w-3 text-green-600" />
                        ) : (
                          <AlertCircle className="h-3 w-3 text-yellow-600" />
                        )}
                      </div>
                    </div>
                  </div>
                  <span className={`font-semibold ${tx.amount > 0 ? 'text-green-600' : ''}`}>
                    {tx.amount > 0 ? '+' : ''}{tx.amount < 0 ? '-' : ''}${Math.abs(tx.amount).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
            <p className="text-sm text-muted-foreground text-center mt-4">
              AI-powered categorization automatically classifies 90%+ of transactions
            </p>
          </CardContent>
        </TabsContent>
        
        <TabsContent value="grants" className="m-0">
          <CardContent className="p-6">
            <div className="flex items-center justify-between gap-4 mb-4">
              <h4 className="font-medium">Grant Portfolio</h4>
              <Badge data-testid="demo-grants-total">$150,000 total</Badge>
            </div>
            <div className="space-y-4">
              {demoGrants.map((grant, i) => (
                <div key={i} className="p-4 bg-muted/30 rounded-md" data-testid={`demo-grant-${i}`}>
                  <div className="flex items-center justify-between gap-4 mb-2">
                    <div className="flex items-center gap-2">
                      <Gift className="h-4 w-4 text-primary" />
                      <span className="font-medium">{grant.name}</span>
                    </div>
                    <Badge variant={grant.status === "active" ? "default" : "secondary"}>
                      {grant.status}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Award Amount</p>
                      <p className="font-semibold">${grant.amount.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Remaining</p>
                      <p className="font-semibold text-green-600">${grant.remaining.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">End Date</p>
                      <p className="font-semibold">{grant.endDate}</p>
                    </div>
                  </div>
                  {grant.status === "active" && (
                    <Progress value={((grant.amount - grant.remaining) / grant.amount) * 100} className="h-2 mt-3" />
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </TabsContent>
      </Tabs>
      
      <div className="bg-muted/30 border-t p-4 text-center">
        <Link href="/login">
          <Button data-testid="button-try-demo">
            Try It Free
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
        <p className="text-sm text-muted-foreground mt-2">No credit card required</p>
      </div>
    </Card>
  );
}

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img src={complyBookLogo} alt="ComplyBook" className="h-10 w-10 rounded object-cover" />
            <span className="text-xl font-semibold text-foreground">ComplyBook</span>
          </div>
          <nav className="hidden md:flex items-center gap-6">
            <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Features</a>
            <a href="#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Pricing</a>
          </nav>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link href="/login">
              <Button variant="outline" data-testid="button-login">
                Log In
              </Button>
            </Link>
            <Link href="/login">
              <Button data-testid="button-signup-header">
                Start Free Trial
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-primary/5 to-background">
        <div className="max-w-5xl mx-auto text-center">
          <Badge variant="secondary" className="mb-6">
            <Sparkles className="h-3 w-3 mr-1" />
            30-Day Free Trial - No Credit Card Required
          </Badge>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-semibold text-foreground mb-6 leading-tight" data-testid="text-hero-headline">
            Financial Management for Nonprofits, Grants & Government Compliance
          </h1>
          <p className="text-lg sm:text-xl text-muted-foreground mb-4 max-w-3xl mx-auto">
            Replace your accounting software, grant tracking spreadsheets, compliance tools, and donor management with one audit-ready platform.
          </p>
          <p className="text-base text-muted-foreground mb-8 max-w-2xl mx-auto">
            Built for nonprofits, government contractors, and grantees who need Form 990, SF-425, DCAA compliance, and fund accounting—without stitching together five tools.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link href="/login">
              <Button
                size="lg"
                data-testid="button-get-started"
                className="h-12 px-8 text-base"
              >
                Start Your Free Trial
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <a href="#demo">
              <Button
                size="lg"
                variant="outline"
                data-testid="button-watch-demo"
                className="h-12 px-8 text-base"
              >
                <Play className="mr-2 h-4 w-4" />
                Watch Demo
              </Button>
            </a>
          </div>
        </div>
      </section>

      {/* Trust Signals Section */}
      <section className="py-12 px-4 sm:px-6 lg:px-8 border-b">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div className="flex flex-col items-center gap-2">
              <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <Shield className="h-6 w-6 text-green-600" />
              </div>
              <p className="font-medium text-sm">NIST 800-53</p>
              <p className="text-xs text-muted-foreground">Security Controls</p>
            </div>
            <div className="flex flex-col items-center gap-2">
              <div className="h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <Check className="h-6 w-6 text-blue-600" />
              </div>
              <p className="font-medium text-sm">ASVS Level 2</p>
              <p className="text-xs text-muted-foreground">Verified Security</p>
            </div>
            <div className="flex flex-col items-center gap-2">
              <div className="h-12 w-12 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <FileText className="h-6 w-6 text-purple-600" />
              </div>
              <p className="font-medium text-sm">Immutable Audit Logs</p>
              <p className="text-xs text-muted-foreground">Complete Trail</p>
            </div>
            <div className="flex flex-col items-center gap-2">
              <div className="h-12 w-12 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                <Landmark className="h-6 w-6 text-orange-600" />
              </div>
              <p className="font-medium text-sm">Bank-Level Encryption</p>
              <p className="text-xs text-muted-foreground">AES-256-GCM</p>
            </div>
          </div>
        </div>
      </section>

      {/* Key Features List */}
      <section id="features" className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-semibold text-foreground mb-4">
              One Platform. Complete Financial Control.
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Stop juggling QuickBooks, spreadsheets, and compliance tools. ComplyBook handles it all—purpose-built for mission-driven organizations.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="hover-elevate">
              <CardHeader>
                <div className="h-12 w-12 rounded-md bg-primary/10 flex items-center justify-center mb-4">
                  <PieChart className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>Budget Tracking</CardTitle>
                <CardDescription>
                  Create and monitor budgets by category, fund, or program. Get real-time alerts when spending approaches limits.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="hover-elevate">
              <CardHeader>
                <div className="h-12 w-12 rounded-md bg-primary/10 flex items-center justify-center mb-4">
                  <Receipt className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>Expense Categorization</CardTitle>
                <CardDescription>
                  AI-powered automatic categorization. Organize expenses by program, grant, or custom categories with one click.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="hover-elevate">
              <CardHeader>
                <div className="h-12 w-12 rounded-md bg-primary/10 flex items-center justify-center mb-4">
                  <Gift className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>Grant & Fund Accounting</CardTitle>
                <CardDescription>
                  Track restricted and unrestricted funds separately. Monitor grant spending with built-in compliance reporting.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="hover-elevate">
              <CardHeader>
                <div className="h-12 w-12 rounded-md bg-primary/10 flex items-center justify-center mb-4">
                  <FileText className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>Financial Reports</CardTitle>
                <CardDescription>
                  Generate Form 990 exports, SF-425 reports, P&L statements, and custom reports in seconds—not hours.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="hover-elevate">
              <CardHeader>
                <div className="h-12 w-12 rounded-md bg-primary/10 flex items-center justify-center mb-4">
                  <Landmark className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>Bank Sync</CardTitle>
                <CardDescription>
                  Connect your bank accounts securely via Plaid. Automatically import transactions and reconcile with ease.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="hover-elevate">
              <CardHeader>
                <div className="h-12 w-12 rounded-md bg-primary/10 flex items-center justify-center mb-4">
                  <Shield className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>Compliance Ready</CardTitle>
                <CardDescription>
                  DCAA time tracking, audit trails, and role-based access controls. Built for government contractors and grantees.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* Interactive Demo Section */}
      <section id="demo" className="py-16 px-4 sm:px-6 lg:px-8 bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-semibold text-foreground mb-4">
              See ComplyBook in Action
            </h2>
            <p className="text-lg text-muted-foreground">
              Explore how easy it is to manage your organization's finances
            </p>
          </div>
          <InteractiveDemo />
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-16 px-4 sm:px-6 lg:px-8 bg-muted/30">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-semibold text-foreground mb-4">
              Simple, Transparent Pricing
            </h2>
            <p className="text-lg text-muted-foreground">
              Start free, upgrade as you grow. All paid plans include a 30-day free trial.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {FEATURED_TIERS.map((tier) => {
              const config = SUBSCRIPTION_TIERS[tier];
              const isProfessional = tier === 'professional';
              
              return (
                <Card 
                  key={tier} 
                  className={`relative ${isProfessional ? 'border-primary shadow-lg' : ''}`}
                  data-testid={`card-pricing-preview-${tier}`}
                >
                  {isProfessional && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge className="bg-primary text-primary-foreground">Most Popular</Badge>
                    </div>
                  )}
                  <CardHeader className="text-center pb-2">
                    <CardTitle>{config.name}</CardTitle>
                    <CardDescription className="min-h-[40px]">{config.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="text-center">
                    <div className="mb-6">
                      <span className="text-4xl font-bold">
                        {config.annualPrice === 0 ? 'Free' : `$${config.annualPrice}`}
                      </span>
                      {config.annualPrice !== null && config.annualPrice > 0 && (
                        <span className="text-muted-foreground">/mo</span>
                      )}
                      {config.annualPrice !== null && config.annualPrice > 0 && (
                        <p className="text-xs text-muted-foreground mt-1">billed annually</p>
                      )}
                    </div>
                    <ul className="text-sm text-left space-y-2 mb-6">
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-500 shrink-0" />
                        <span>{config.maxOrganizations === null ? 'Unlimited' : config.maxOrganizations} organization{config.maxOrganizations !== 1 ? 's' : ''}</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-500 shrink-0" />
                        <span>{config.maxUsers === null ? 'Unlimited' : config.maxUsers} user{config.maxUsers !== 1 ? 's' : ''}</span>
                      </li>
                      {config.features.plaidLive && (
                        <li className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-green-500 shrink-0" />
                          <span>Live bank sync</span>
                        </li>
                      )}
                      {config.features.fundAccounting && (
                        <li className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-green-500 shrink-0" />
                          <span>Fund accounting</span>
                        </li>
                      )}
                      {config.features.form990Export && (
                        <li className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-green-500 shrink-0" />
                          <span>Form 990 export</span>
                        </li>
                      )}
                    </ul>
                    <Link href="/login">
                      <Button 
                        variant={isProfessional ? 'default' : 'outline'} 
                        className="w-full"
                        data-testid={`button-pricing-${tier}`}
                      >
                        {tier === 'free' ? 'Get Started Free' : 'Start Free Trial'}
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="text-center">
            <Link href="/pricing">
              <Button variant="ghost" data-testid="button-view-all-pricing">
                View all plans and features
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-primary/5">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-semibold text-foreground mb-4">
            Ready to Simplify Your Financial Management?
          </h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Join 50+ organizations already using ComplyBook to save time, stay compliant, and focus on their mission.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/login">
              <Button
                size="lg"
                data-testid="button-cta-trial"
                className="h-12 px-8 text-base"
              >
                <Sparkles className="mr-2 h-4 w-4" />
                Start Your 30-Day Free Trial
              </Button>
            </Link>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            No credit card required. Full access to all features.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <img src={complyBookLogo} alt="ComplyBook" className="h-8 w-8 rounded object-cover" />
                <span className="font-semibold">ComplyBook</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Simple financial management for nonprofits and small organizations.
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-3">Product</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#features" className="hover:text-foreground transition-colors">Features</a></li>
                <li><a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a></li>
                <li><a href="#demo" className="hover:text-foreground transition-colors">Demo</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-3">Company</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="mailto:support@complybook.net" className="hover:text-foreground transition-colors">Contact</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-3">Legal</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Terms of Service</a></li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-border text-center text-sm text-muted-foreground">
            <p>&copy; 2025 ComplyBook. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
