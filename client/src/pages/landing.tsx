import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Receipt, FileText, Gift, TrendingUp, Users, Building2 } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import complyBookLogo from "@assets/COmplybook_1765050943685.png";

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={complyBookLogo} alt="ComplyBook" className="h-10 w-10 rounded object-cover" />
            <span className="text-xl font-semibold text-foreground">ComplyBook</span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button
              onClick={() => window.location.href = '/api/login'}
              data-testid="button-login"
            >
              Log In
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl font-semibold text-foreground mb-6">
            Simple Budget Management for Small Organizations
          </h1>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Track transactions, manage multiple businesses, generate financial reports, and track grants—all in one intuitive platform designed for small non-profits and for-profit companies.
          </p>
          <Button
            size="lg"
            onClick={() => window.location.href = '/api/login'}
            data-testid="button-get-started"
            className="h-12 px-8 text-base"
          >
            Get Started
          </Button>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-card">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-semibold text-center text-foreground mb-12">
            Everything You Need to Manage Your Finances
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <div className="h-12 w-12 rounded-md bg-primary/10 flex items-center justify-center mb-4">
                  <Building2 className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>Multi-Business Support</CardTitle>
                <CardDescription>
                  Manage multiple organizations from a single account. Switch seamlessly between your non-profit and for-profit businesses.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <div className="h-12 w-12 rounded-md bg-primary/10 flex items-center justify-center mb-4">
                  <Receipt className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>Transaction Management</CardTitle>
                <CardDescription>
                  Record income and expenses with ease. Categorize transactions and keep your financial data organized.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <div className="h-12 w-12 rounded-md bg-primary/10 flex items-center justify-center mb-4">
                  <FileText className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>Financial Reports</CardTitle>
                <CardDescription>
                  Generate profit & loss statements, balance sheets, and transaction histories with customizable date ranges.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <div className="h-12 w-12 rounded-md bg-primary/10 flex items-center justify-center mb-4">
                  <Gift className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>Grant Tracking</CardTitle>
                <CardDescription>
                  Track grants for non-profit organizations including amounts, restrictions, and expenditures.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <div className="h-12 w-12 rounded-md bg-primary/10 flex items-center justify-center mb-4">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>Role-Based Access</CardTitle>
                <CardDescription>
                  Invite team members with specific roles: owner, admin, accountant, or viewer permissions.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <div className="h-12 w-12 rounded-md bg-primary/10 flex items-center justify-center mb-4">
                  <TrendingUp className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>Simple & Intuitive</CardTitle>
                <CardDescription>
                  Easier than QuickBooks, more powerful than spreadsheets. Built specifically for small organizations.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-semibold text-foreground mb-6">
            Ready to Simplify Your Financial Management?
          </h2>
          <p className="text-lg text-muted-foreground mb-8">
            Join organizations already using ComplyBook to streamline their accounting.
          </p>
          <Button
            size="lg"
            onClick={() => window.location.href = '/api/login'}
            data-testid="button-cta-login"
            className="h-12 px-8 text-base"
          >
            Get Started Today
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center text-sm text-muted-foreground">
          <p>&copy; 2025 ComplyBook. Simple financial management for small organizations.</p>
        </div>
      </footer>
    </div>
  );
}
