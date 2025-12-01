import { useState, useEffect } from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/useAuth";
import { AppSidebar } from "@/components/app-sidebar";
import { OrganizationSwitcher } from "@/components/organization-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { NotificationsBell } from "@/components/notifications-bell";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import Dashboard from "@/pages/dashboard";
import Transactions from "@/pages/transactions";
import RecurringTransactions from "@/pages/recurring-transactions";
import Categories from "@/pages/categories";
import Vendors from "@/pages/vendors";
import Clients from "@/pages/clients";
import Donors from "@/pages/donors";
import DonationLetters from "@/pages/donation-letters";
import Employees from "@/pages/employees";
import Deductions from "@/pages/deductions";
import Payroll from "@/pages/payroll";
import Invoices from "@/pages/invoices";
import Bills from "@/pages/bills";
import BillPayments from "@/pages/bill-payments";
import BrandSettings from "@/pages/brand-settings";
import Reports from "@/pages/reports";
import Grants from "@/pages/grants";
import Budgets from "@/pages/budgets";
import BankAccounts from "@/pages/bank-accounts";
import Funds from "@/pages/funds";
import Pledges from "@/pages/pledges";
import Programs from "@/pages/programs";
import FunctionalExpenseReport from "@/pages/functional-expense-report";
import Form990Report from "@/pages/form-990-report";
import GovernmentGrants from "@/pages/government-grants";
import GovernmentContracts from "@/pages/government-contracts";
import ComplianceDashboard from "@/pages/compliance-dashboard";
import Analytics from "@/pages/analytics";
import Organizations from "@/pages/organizations";
import Settings from "@/pages/settings";
import AcceptInvitation from "@/pages/accept-invitation";
import CashFlow from "@/pages/cash-flow";
import TaxReporting from "@/pages/tax-reporting";
import ExpenseApprovals from "@/pages/expense-approvals";
import CustomReports from "@/pages/custom-reports";
import AuditTrail from "@/pages/audit-trail";
import BankReconciliation from "@/pages/bank-reconciliation";
import ReconciliationHub from "@/pages/reconciliation-hub";
import FundraisingHub from "@/pages/fundraising-hub";
import GovernmentContractsHub from "@/pages/government-contracts-hub";
import OperationsHub from "@/pages/operations-hub";
import SecurityMonitoring from "@/pages/security-monitoring";
import AccountingImports from "@/pages/accounting-imports";
import type { Organization } from "@shared/schema";

// Organization with user role
type OrganizationWithRole = Organization & { userRole: string };

function AuthenticatedApp() {
  const { user } = useAuth();
  const [location, setLocation] = useLocation();
  const [currentOrgId, setCurrentOrgId] = useState<number | null>(null);

  // Check for pending invitation after authentication
  useEffect(() => {
    const pendingToken = localStorage.getItem('pendingInvitationToken');
    if (pendingToken && !location.startsWith('/invite/')) {
      localStorage.removeItem('pendingInvitationToken');
      setLocation(`/invite/${pendingToken}`);
    }
  }, [location, setLocation]);

  // Fetch user's organizations (with user roles)
  const { data: organizations } = useQuery<OrganizationWithRole[]>({
    queryKey: ['/api/organizations'],
    retry: false,
  });

  // Set initial organization when organizations load
  useEffect(() => {
    if (organizations && organizations.length > 0 && !currentOrgId) {
      const storedOrgId = localStorage.getItem('currentOrganizationId');
      if (storedOrgId && organizations.find(org => org.id === parseInt(storedOrgId))) {
        setCurrentOrgId(parseInt(storedOrgId));
      } else {
        setCurrentOrgId(organizations[0].id);
      }
    }
  }, [organizations, currentOrgId]);

  // Save current organization to localStorage
  useEffect(() => {
    if (currentOrgId) {
      localStorage.setItem('currentOrganizationId', currentOrgId.toString());
    }
  }, [currentOrgId]);

  const handleOrganizationSwitch = (orgId: number) => {
    setCurrentOrgId(orgId);
    setLocation('/');
  };

  const handleCreateOrganization = () => {
    setLocation('/organizations');
  };

  const currentOrganization = organizations?.find(org => org.id === currentOrgId);

  // Custom sidebar width for better content display
  const sidebarStyle = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  // Organizations page doesn't need sidebar
  if (location === '/organizations') {
    return (
      <div className="min-h-screen bg-background p-8">
        <Organizations 
          onSelectOrganization={handleOrganizationSwitch}
          userId={user?.id || ''}
        />
      </div>
    );
  }

  // Show organizations page if no organization is selected
  if (!currentOrganization) {
    return (
      <div className="min-h-screen bg-background p-8">
        <Organizations 
          onSelectOrganization={handleOrganizationSwitch}
          userId={user?.id || ''}
        />
      </div>
    );
  }

  return (
    <SidebarProvider style={sidebarStyle as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar user={user!} currentOrganization={currentOrganization} />
        
        <div className="flex flex-col flex-1 min-w-0">
          <header className="flex items-center justify-between gap-4 px-6 py-3 border-b border-border flex-wrap">
            <div className="flex items-center gap-3">
              <SidebarTrigger data-testid="button-sidebar-toggle" />
              <OrganizationSwitcher
                organizations={organizations || []}
                currentOrganizationId={currentOrgId || undefined}
                onSwitch={handleOrganizationSwitch}
                onCreateNew={handleCreateOrganization}
              />
            </div>
            <div className="flex items-center gap-2">
              <NotificationsBell organizationId={currentOrgId || 0} />
              <ThemeToggle />
            </div>
          </header>
          
          <main className="flex-1 overflow-y-auto p-8">
            <Switch>
              <Route path="/">
                <Dashboard currentOrganization={currentOrganization} />
              </Route>
              <Route path="/transactions">
                <Transactions 
                  currentOrganization={currentOrganization}
                  userId={user?.id || ''}
                />
              </Route>
              <Route path="/recurring-transactions">
                <RecurringTransactions 
                  currentOrganization={currentOrganization}
                  userId={user?.id || ''}
                />
              </Route>
              <Route path="/categories">
                <Categories 
                  currentOrganization={currentOrganization}
                  userId={user?.id || ''}
                />
              </Route>
              <Route path="/vendors">
                <Vendors 
                  currentOrganization={currentOrganization}
                  userId={user?.id || ''}
                />
              </Route>
              <Route path="/clients">
                <Clients 
                  currentOrganization={currentOrganization}
                  userId={user?.id || ''}
                />
              </Route>
              <Route path="/employees">
                <Employees 
                  currentOrganization={currentOrganization}
                  userId={user?.id || ''}
                />
              </Route>
              <Route path="/deductions">
                <Deductions 
                  currentOrganization={currentOrganization}
                  userId={user?.id || ''}
                />
              </Route>
              <Route path="/payroll">
                <Payroll 
                  currentOrganization={currentOrganization}
                  userId={user?.id || ''}
                />
              </Route>
              {currentOrganization.type === 'nonprofit' && (
                <Route path="/donors">
                  <Donors 
                    currentOrganization={currentOrganization}
                    userId={user?.id || ''}
                  />
                </Route>
              )}
              {currentOrganization.type === 'nonprofit' && (
                <Route path="/donation-letters">
                  <DonationLetters 
                    currentOrganization={currentOrganization}
                    userId={user?.id || ''}
                  />
                </Route>
              )}
              <Route path="/invoices">
                <Invoices currentOrganization={currentOrganization} />
              </Route>
              <Route path="/bills">
                <Bills currentOrganization={currentOrganization} />
              </Route>
              <Route path="/bill-payments">
                <BillPayments currentOrganization={currentOrganization} />
              </Route>
              <Route path="/brand-settings">
                <BrandSettings currentOrganization={currentOrganization} />
              </Route>
              <Route path="/reports">
                <Reports currentOrganization={currentOrganization} />
              </Route>
              <Route path="/analytics">
                <Analytics currentOrganization={currentOrganization} />
              </Route>
              <Route path="/custom-reports">
                <CustomReports currentOrganization={currentOrganization} />
              </Route>
              {currentOrganization.type === 'nonprofit' && (
                <Route path="/grants">
                  <Grants currentOrganization={currentOrganization} />
                </Route>
              )}
              {currentOrganization.type === 'nonprofit' && (
                <Route path="/funds">
                  <Funds 
                    currentOrganization={currentOrganization}
                    userId={user?.id || ''}
                  />
                </Route>
              )}
              {currentOrganization.type === 'nonprofit' && (
                <Route path="/pledges">
                  <Pledges 
                    currentOrganization={currentOrganization}
                    userId={user?.id || ''}
                  />
                </Route>
              )}
              {currentOrganization.type === 'nonprofit' && (
                <Route path="/programs">
                  <Programs 
                    currentOrganization={currentOrganization}
                    userId={user?.id || ''}
                  />
                </Route>
              )}
              {currentOrganization.type === 'nonprofit' && (
                <Route path="/functional-expense-report">
                  <FunctionalExpenseReport 
                    currentOrganization={currentOrganization}
                    userId={user?.id || ''}
                  />
                </Route>
              )}
              {currentOrganization.type === 'nonprofit' && (
                <Route path="/form-990-report">
                  <Form990Report 
                    currentOrganization={currentOrganization}
                    userId={user?.id || ''}
                  />
                </Route>
              )}
              {currentOrganization.type === 'nonprofit' && (
                <Route path="/compliance-dashboard">
                  <ComplianceDashboard 
                    currentOrganization={currentOrganization}
                  />
                </Route>
              )}
              {currentOrganization.type === 'nonprofit' && (
                <Route path="/compliance">
                  <ComplianceDashboard 
                    currentOrganization={currentOrganization}
                  />
                </Route>
              )}
              {currentOrganization.type === 'nonprofit' && (
                <Route path="/government-grants">
                  <GovernmentGrants 
                    currentOrganization={currentOrganization}
                    userId={user?.id || ''}
                  />
                </Route>
              )}
              {currentOrganization.type === 'forprofit' && (
                <Route path="/government-contracts">
                  <GovernmentContracts 
                    currentOrganization={currentOrganization}
                    userId={user?.id || ''}
                  />
                </Route>
              )}
              <Route path="/budgets">
                <Budgets />
              </Route>
              <Route path="/bank-accounts">
                <BankAccounts currentOrganization={currentOrganization} />
              </Route>
              <Route path="/bank-reconciliation">
                <BankReconciliation currentOrganization={currentOrganization} />
              </Route>
              <Route path="/reconciliation-hub">
                <ReconciliationHub currentOrganization={currentOrganization} />
              </Route>
              <Route path="/cash-flow">
                <CashFlow currentOrganization={currentOrganization} />
              </Route>
              <Route path="/tax-reporting">
                <TaxReporting currentOrganization={currentOrganization} />
              </Route>
              <Route path="/expense-approvals">
                <ExpenseApprovals 
                  currentOrganization={currentOrganization}
                  userId={user?.id || ''}
                />
              </Route>
              <Route path="/audit-trail">
                <AuditTrail currentOrganization={currentOrganization} />
              </Route>
              <Route path="/security-monitoring">
                <SecurityMonitoring organizationId={currentOrganization.id} />
              </Route>
              <Route path="/accounting-imports">
                <AccountingImports organizationId={currentOrganization.id} />
              </Route>
              {currentOrganization.type === 'nonprofit' && (
                <Route path="/fundraising-hub">
                  <FundraisingHub 
                    currentOrganization={currentOrganization}
                    userId={user?.id || ''}
                  />
                </Route>
              )}
              {currentOrganization.type === 'forprofit' && (
                <Route path="/government-contracts-hub">
                  <GovernmentContractsHub 
                    currentOrganization={currentOrganization}
                    userId={user?.id || ''}
                  />
                </Route>
              )}
              <Route path="/operations-hub">
                <OperationsHub 
                  currentOrganization={currentOrganization}
                  userId={user?.id || ''}
                />
              </Route>
              <Route path="/settings">
                <Settings 
                  currentOrganization={currentOrganization}
                  user={user!}
                />
              </Route>
              <Route component={NotFound} />
            </Switch>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function Router() {
  const { isAuthenticated, isLoading } = useAuth();
  const [location] = useLocation();

  if (isLoading) {
    return <Landing />;
  }

  // Allow invitation page for both authenticated and non-authenticated users
  if (location.startsWith('/invite/')) {
    return <AcceptInvitation />;
  }

  if (!isAuthenticated) {
    return (
      <Switch>
        <Route path="/" component={Landing} />
        <Route component={Landing} />
      </Switch>
    );
  }

  return <AuthenticatedApp />;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Router />
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
