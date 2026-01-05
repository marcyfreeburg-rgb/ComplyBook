import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Receipt, 
  FileText, 
  Gift, 
  TrendingUp, 
  Users, 
  Building2, 
  Landmark, 
  PieChart, 
  Shield, 
  Check,
  Star,
  Play,
  ArrowRight,
  Sparkles
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { Link } from "wouter";
import complyBookLogo from "@assets/COmplybook_1765050943685.png";
import { SUBSCRIPTION_TIERS } from "@shared/schema";

const FEATURED_TIERS = ['free', 'core', 'professional'] as const;

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
            <a href="#testimonials" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Testimonials</a>
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
            Simple Financial Management & Budgeting for Nonprofits and Small Organizations
          </h1>
          <p className="text-lg sm:text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">
            Track budgets, categorize expenses, manage grants and fund accounting, generate compliance reports, 
            and sync with your bank—all in one intuitive platform built specifically for mission-driven organizations.
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
          <p className="mt-6 text-sm text-muted-foreground">
            Trusted by 50+ organizations managing over $2M in grants
          </p>
        </div>
      </section>

      {/* Key Features List */}
      <section id="features" className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-semibold text-foreground mb-4">
              Everything You Need to Manage Your Finances
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Purpose-built for nonprofits and small organizations. Easier than QuickBooks, more powerful than spreadsheets.
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

      {/* Demo/Screenshots Section */}
      <section id="demo" className="py-16 px-4 sm:px-6 lg:px-8 bg-muted/30">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-semibold text-foreground mb-4">
              See ComplyBook in Action
            </h2>
            <p className="text-lg text-muted-foreground">
              Watch how easy it is to manage your organization's finances
            </p>
          </div>
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              <div className="aspect-video bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                <div className="text-center">
                  <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4 hover-elevate cursor-pointer">
                    <Play className="h-10 w-10 text-primary ml-1" />
                  </div>
                  <p className="text-muted-foreground">Product demo coming soon</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Schedule a personalized walkthrough with our team
                  </p>
                  <Link href="/login">
                    <Button variant="outline" className="mt-4" data-testid="button-schedule-demo">
                      Request Demo
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Testimonials / Early Stats */}
      <section id="testimonials" className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <Badge variant="secondary" className="mb-4">Beta Users</Badge>
            <h2 className="text-3xl font-semibold text-foreground mb-4">
              Trusted by Mission-Driven Organizations
            </h2>
            <p className="text-lg text-muted-foreground">
              Early adopters are already saving hours on financial management
            </p>
          </div>
          
          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-3xl font-bold text-primary" data-testid="text-stat-orgs">50+</p>
                <p className="text-sm text-muted-foreground">Organizations</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-3xl font-bold text-primary" data-testid="text-stat-transactions">15K+</p>
                <p className="text-sm text-muted-foreground">Transactions Tracked</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-3xl font-bold text-primary" data-testid="text-stat-grants">$2M+</p>
                <p className="text-sm text-muted-foreground">Grants Managed</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-3xl font-bold text-primary" data-testid="text-stat-hours">10hrs</p>
                <p className="text-sm text-muted-foreground">Saved per Month</p>
              </CardContent>
            </Card>
          </div>

          {/* Testimonials */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="hover-elevate">
              <CardContent className="pt-6">
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-primary text-primary" />
                  ))}
                </div>
                <p className="text-foreground mb-4">
                  "Finally, accounting software that understands nonprofits. Grant tracking and fund accounting work exactly how we need them to."
                </p>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">Sarah M.</p>
                    <p className="text-xs text-muted-foreground">Executive Director, Community Foundation</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hover-elevate">
              <CardContent className="pt-6">
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-primary text-primary" />
                  ))}
                </div>
                <p className="text-foreground mb-4">
                  "We cut our monthly bookkeeping time in half. The bank sync and automatic categorization are game changers."
                </p>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Building2 className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">Michael T.</p>
                    <p className="text-xs text-muted-foreground">CFO, Youth Services Nonprofit</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hover-elevate">
              <CardContent className="pt-6">
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-primary text-primary" />
                  ))}
                </div>
                <p className="text-foreground mb-4">
                  "As a government contractor, DCAA compliance was always stressful. ComplyBook makes it straightforward."
                </p>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <TrendingUp className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">Jennifer L.</p>
                    <p className="text-xs text-muted-foreground">Owner, J&L Consulting</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
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
