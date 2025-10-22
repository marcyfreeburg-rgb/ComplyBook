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
import Reports from "@/pages/reports";
import Grants from "@/pages/grants";
import Budgets from "@/pages/budgets";
import BankAccounts from "@/pages/bank-accounts";
import Organizations from "@/pages/organizations";
import Settings from "@/pages/settings";
import type { Organization } from "@shared/schema";

function AuthenticatedApp() {
  const { user } = useAuth();
  const [location, setLocation] = useLocation();
  const [currentOrgId, setCurrentOrgId] = useState<number | null>(null);

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

  if (isLoading) {
    return <Landing />;
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
