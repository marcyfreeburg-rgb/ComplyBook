import { Building2, Home, Receipt, FileText, Gift, Settings, LogOut, Landmark, TrendingUp, Tag, Clock, Truck, Users, File, FileX, FileSliders, BarChart3, Calculator, ClipboardCheck, FileLineChart, History, CheckSquare, Heart, FileDown, UserCog, DollarSign, PiggyBank, CalendarCheck, Folder, FileBarChart, FileCheck, Briefcase, Award, ShieldCheck, Sparkles, Database, Shield, FileSpreadsheet } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { User, Organization } from "@shared/schema";

// Organization with user role
type OrganizationWithRole = Organization & { userRole: string };

interface AppSidebarProps {
  user: User;
  currentOrganization?: OrganizationWithRole;
}

export function AppSidebar({ user, currentOrganization }: AppSidebarProps) {
  const [location, setLocation] = useLocation();

  // Check if user has admin or owner role
  const isAdminOrOwner = currentOrganization?.userRole === 'owner' || currentOrganization?.userRole === 'admin';

  const menuItems = [
    {
      title: "Dashboard",
      url: "/",
      icon: Home,
    },
    {
      title: "Transactions",
      url: "/transactions",
      icon: Receipt,
    },
    {
      title: "Recurring",
      url: "/recurring-transactions",
      icon: Clock,
    },
    {
      title: "Categories",
      url: "/categories",
      icon: Tag,
    },
    {
      title: "Vendors",
      url: "/vendors",
      icon: Truck,
    },
    {
      title: "Clients",
      url: "/clients",
      icon: Users,
    },
    {
      title: "Employees",
      url: "/employees",
      icon: UserCog,
    },
    {
      title: "Deductions",
      url: "/deductions",
      icon: Calculator,
    },
    {
      title: "Payroll",
      url: "/payroll",
      icon: DollarSign,
    },
    ...(currentOrganization?.type === 'nonprofit' ? [{
      title: "Donors",
      url: "/donors",
      icon: Heart,
    }] : []),
    ...(currentOrganization?.type === 'nonprofit' ? [{
      title: "Donation Letters",
      url: "/donation-letters",
      icon: FileDown,
    }] : []),
    ...(currentOrganization?.type === 'nonprofit' ? [{
      title: "Fundraising Hub",
      url: "/fundraising-hub",
      icon: Sparkles,
    }] : []),
    {
      title: "Invoices",
      url: "/invoices",
      icon: File,
    },
    {
      title: "Bills",
      url: "/bills",
      icon: FileX,
    },
    {
      title: "Brand Settings",
      url: "/brand-settings",
      icon: FileSliders,
    },
    {
      title: "Reports",
      url: "/reports",
      icon: FileText,
    },
    {
      title: "Analytics",
      url: "/analytics",
      icon: TrendingUp,
    },
    {
      title: "Custom Reports",
      url: "/custom-reports",
      icon: FileLineChart,
    },
    ...(currentOrganization?.type === 'nonprofit' ? [{
      title: "Grants",
      url: "/grants",
      icon: Gift,
    }] : []),
    ...(currentOrganization?.type === 'nonprofit' ? [{
      title: "Funds",
      url: "/funds",
      icon: PiggyBank,
    }] : []),
    ...(currentOrganization?.type === 'nonprofit' ? [{
      title: "Pledges",
      url: "/pledges",
      icon: CalendarCheck,
    }] : []),
    ...(currentOrganization?.type === 'nonprofit' ? [{
      title: "Programs",
      url: "/programs",
      icon: Folder,
    }] : []),
    ...(currentOrganization?.type === 'nonprofit' ? [{
      title: "Functional Expense Report",
      url: "/functional-expense-report",
      icon: FileBarChart,
    }] : []),
    ...(currentOrganization?.type === 'nonprofit' ? [{
      title: "Form 990 Report",
      url: "/form-990-report",
      icon: FileCheck,
    }] : []),
    ...(currentOrganization?.type === 'nonprofit' ? [{
      title: "Government Grants",
      url: "/government-grants",
      icon: Award,
    }] : []),
    ...(currentOrganization?.type === 'nonprofit' ? [{
      title: "Compliance",
      url: "/compliance-dashboard",
      icon: ShieldCheck,
    }] : []),
    ...(currentOrganization?.type === 'forprofit' ? [{
      title: "Government Contracts",
      url: "/government-contracts",
      icon: Briefcase,
    }] : []),
    ...(currentOrganization?.type === 'forprofit' ? [{
      title: "Contracts Hub",
      url: "/government-contracts-hub",
      icon: Sparkles,
    }] : []),
    {
      title: "Budgets",
      url: "/budgets",
      icon: TrendingUp,
    },
    {
      title: "Bank Accounts",
      url: "/bank-accounts",
      icon: Landmark,
    },
    {
      title: "Operations Hub",
      url: "/operations-hub",
      icon: Database,
    },
    {
      title: "Accounting Imports",
      url: "/accounting-imports",
      icon: FileSpreadsheet,
    },
    {
      title: "Bank Reconciliation",
      url: "/bank-reconciliation",
      icon: CheckSquare,
    },
    {
      title: "Cash Flow",
      url: "/cash-flow",
      icon: BarChart3,
    },
    {
      title: "Tax Reporting",
      url: "/tax-reporting",
      icon: Calculator,
    },
    {
      title: "Expense Approvals",
      url: "/expense-approvals",
      icon: ClipboardCheck,
    },
    ...(isAdminOrOwner ? [{
      title: "Audit Trail",
      url: "/audit-trail",
      icon: History,
    }] : []),
    ...(isAdminOrOwner ? [{
      title: "Security Monitoring",
      url: "/security-monitoring",
      icon: Shield,
    }] : []),
    {
      title: "Organizations",
      url: "/organizations",
      icon: Building2,
    },
    {
      title: "Settings",
      url: "/settings",
      icon: Settings,
    },
  ];

  return (
    <Sidebar>
      <SidebarContent className="p-4">
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    onClick={() => setLocation(item.url)}
                    isActive={location === item.url}
                    data-testid={`link-${item.title.toLowerCase()}`}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      
      <SidebarFooter className="p-4 border-t border-sidebar-border">
        <div className="flex items-center gap-3 mb-3">
          <Avatar className="h-8 w-8">
            <AvatarImage src={user.profileImageUrl || undefined} alt={user.firstName || user.email || "User"} className="object-cover" />
            <AvatarFallback className="text-xs font-medium">
              {user.firstName?.[0]}{user.lastName?.[0] || user.email?.[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-sidebar-foreground truncate">
              {user.firstName} {user.lastName}
            </p>
            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => window.location.href = '/api/logout'}
          data-testid="button-logout"
        >
          <LogOut className="h-4 w-4 mr-2" />
          Log Out
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
