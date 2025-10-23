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
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import Dashboard from "@/pages/dashboard";
import Transactions from "@/pages/transactions";
import RecurringTransactions from "@/pages/recurring-transactions";
import Categories from "@/pages/categories";
import Vendors from "@/pages/vendors";
import Clients from "@/pages/clients";
import Invoices from "@/pages/invoices";
import Bills from "@/pages/bills";
import Reports from "@/pages/reports";
import Grants from "@/pages/grants";
import Budgets from "@/pages/budgets";
import BankAccounts from "@/pages/bank-accounts";
import Organizations from "@/pages/organizations";
import Settings from "@/pages/settings";
import AcceptInvitation from "@/pages/accept-invitation";
import type { Organization } from "@shared/schema";

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

  // Fetch user's organizations
  const { data: organizations } = useQuery<Organization[]>({
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
            <ThemeToggle />
          </header>
          
          <main className="flex-1 overflow-auto p-8">
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
              <Route path="/invoices">
                <Invoices currentOrganization={currentOrganization} />
              </Route>
              <Route path="/bills">
                <Bills currentOrganization={currentOrganization} />
              </Route>
              <Route path="/reports">
                <Reports currentOrganization={currentOrganization} />
              </Route>
              {currentOrganization.type === 'nonprofit' && (
                <Route path="/grants">
                  <Grants currentOrganization={currentOrganization} />
                </Route>
              )}
              <Route path="/budgets">
                <Budgets />
              </Route>
              <Route path="/bank-accounts">
                <BankAccounts currentOrganization={currentOrganization} />
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
