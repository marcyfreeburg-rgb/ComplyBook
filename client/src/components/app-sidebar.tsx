import { 
  Building2, Home, Receipt, FileText, Gift, Settings, LogOut, Landmark, TrendingUp, 
  Tag, Clock, Truck, Users, File, FileX, FileSliders, BarChart3, Calculator, 
  ClipboardCheck, FileLineChart, History, CheckSquare, Heart, FileDown, UserCog, 
  DollarSign, PiggyBank, CalendarCheck, Folder, FileBarChart, FileCheck, Briefcase, 
  Award, ShieldCheck, Sparkles, Database, Shield, FileSpreadsheet, List,
  ChevronDown, ArrowDownCircle, ArrowUpCircle, LineChart, Cog, HandHeart,
  ClipboardList, FileEdit
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { User, Organization } from "@shared/schema";
import { useState, type ComponentType } from "react";

type OrganizationWithRole = Organization & { userRole: string };

interface AppSidebarProps {
  user: User;
  currentOrganization?: OrganizationWithRole;
}

interface MenuItem {
  title: string;
  url: string;
  icon: ComponentType<{ className?: string }>;
}

interface MenuGroup {
  title: string;
  icon: ComponentType<{ className?: string }>;
  items: MenuItem[];
  defaultOpen?: boolean;
}

export function AppSidebar({ user, currentOrganization }: AppSidebarProps) {
  const [location, setLocation] = useLocation();

  const isAdminOrOwner = currentOrganization?.userRole === 'owner' || currentOrganization?.userRole === 'admin';
  const isNonprofit = currentOrganization?.type === 'nonprofit';

  const nonprofitMenuGroups: MenuGroup[] = [
    {
      title: "Home",
      icon: Home,
      defaultOpen: true,
      items: [
        { title: "Dashboard", url: "/", icon: Home },
      ],
    },
    {
      title: "Donors & Fundraising",
      icon: HandHeart,
      items: [
        { title: "Donors", url: "/donors", icon: Heart },
        { title: "Pledges", url: "/pledges", icon: CalendarCheck },
        { title: "Recurring Donations", url: "/recurring-transactions", icon: Clock },
        { title: "Donation Letters", url: "/donation-letters", icon: FileDown },
        { title: "Fundraising Hub", url: "/fundraising-hub", icon: Sparkles },
      ],
    },
    {
      title: "Revenue & Grants",
      icon: ArrowDownCircle,
      items: [
        { title: "Invoices", url: "/invoices", icon: File },
        { title: "Clients", url: "/clients", icon: Users },
        { title: "Grants", url: "/grants", icon: Gift },
        { title: "Government Grants", url: "/government-grants", icon: Award },
        { title: "Funds", url: "/funds", icon: PiggyBank },
      ],
    },
    {
      title: "Programs & Expenses",
      icon: ArrowUpCircle,
      items: [
        { title: "Programs", url: "/programs", icon: Folder },
        { title: "Program Budget Report", url: "/program-expense-report", icon: BarChart3 },
        { title: "Expenses", url: "/transactions", icon: Receipt },
        { title: "Vendors", url: "/vendors", icon: Truck },
        { title: "Bills", url: "/bills", icon: FileX },
        { title: "Bill Payments", url: "/bill-payments", icon: DollarSign },
        { title: "Expense Approvals", url: "/expense-approvals", icon: ClipboardCheck },
        { title: "Categories", url: "/categories", icon: Tag },
      ],
    },
    {
      title: "Payroll & People",
      icon: UserCog,
      items: [
        { title: "Payroll", url: "/payroll", icon: DollarSign },
        { title: "Employees", url: "/employees", icon: UserCog },
        { title: "Deductions", url: "/deductions", icon: Calculator },
      ],
    },
    {
      title: "Budgets & Planning",
      icon: TrendingUp,
      items: [
        { title: "Budgets", url: "/budgets", icon: TrendingUp },
        { title: "Cash Flow", url: "/cash-flow", icon: BarChart3 },
      ],
    },
    {
      title: "Bank & Accounting",
      icon: Landmark,
      items: [
        { title: "Bank Accounts", url: "/bank-accounts", icon: Landmark },
        { title: "Transaction Log", url: "/transaction-log", icon: List },
        { title: "Bank Reconciliation", url: "/reconciliation-hub", icon: CheckSquare },
        { title: "Accounting Imports", url: "/accounting-imports", icon: FileSpreadsheet },
      ],
    },
    {
      title: "Engagement",
      icon: ClipboardList,
      items: [
        { title: "Surveys", url: "/surveys", icon: ClipboardList },
        { title: "Forms", url: "/forms", icon: FileEdit },
      ],
    },
    {
      title: "Reports & Compliance",
      icon: LineChart,
      items: [
        { title: "Reports", url: "/reports", icon: FileText },
        { title: "Analytics", url: "/analytics", icon: TrendingUp },
        { title: "Custom Reports", url: "/custom-reports", icon: FileLineChart },
        { title: "Functional Expense Report", url: "/functional-expense-report", icon: FileBarChart },
        { title: "Form 990 Report", url: "/form-990-report", icon: FileCheck },
        { title: "Tax Reporting", url: "/tax-reporting", icon: Calculator },
        { title: "Compliance", url: "/compliance-dashboard", icon: ShieldCheck },
        ...(isAdminOrOwner ? [
          { title: "Audit Trail", url: "/audit-trail", icon: History },
        ] : []),
      ],
    },
    {
      title: "Operations & Security",
      icon: Shield,
      items: [
        { title: "Operations Hub", url: "/operations-hub", icon: Database },
        ...(isAdminOrOwner ? [
          { title: "Security Monitoring", url: "/security-monitoring", icon: Shield },
        ] : []),
      ],
    },
    ...(isAdminOrOwner ? [{
      title: "Organization & Settings",
      icon: Cog,
      items: [
        { title: "Organizations", url: "/organization-management", icon: Building2 },
        { title: "Brand Settings", url: "/brand-settings", icon: FileSliders },
        { title: "Settings", url: "/settings", icon: Settings },
      ],
    }] : [{
      title: "Settings",
      icon: Settings,
      items: [
        { title: "Settings", url: "/settings", icon: Settings },
      ],
    }]),
  ];

  const forprofitMenuGroups: MenuGroup[] = [
    {
      title: "Home",
      icon: Home,
      defaultOpen: true,
      items: [
        { title: "Dashboard", url: "/", icon: Home },
      ],
    },
    {
      title: "Money In",
      icon: ArrowDownCircle,
      items: [
        { title: "Invoices", url: "/invoices", icon: File },
        { title: "Clients", url: "/clients", icon: Users },
        { title: "Recurring Income", url: "/recurring-transactions", icon: Clock },
        { title: "CRM", url: "/crm", icon: Heart },
      ],
    },
    {
      title: "Contracts",
      icon: Briefcase,
      items: [
        { title: "Commercial Contracts", url: "/commercial-contracts-hub", icon: Sparkles },
        { title: "Government Contracts", url: "/government-contracts", icon: Award },
        { title: "Gov Contracts Hub", url: "/government-contracts-hub", icon: ShieldCheck },
      ],
    },
    {
      title: "Money Out",
      icon: ArrowUpCircle,
      items: [
        { title: "Expenses", url: "/transactions", icon: Receipt },
        { title: "Bills", url: "/bills", icon: FileX },
        { title: "Bill Payments", url: "/bill-payments", icon: DollarSign },
        { title: "Vendors", url: "/vendors", icon: Truck },
        { title: "Expense Approvals", url: "/expense-approvals", icon: ClipboardCheck },
      ],
    },
    {
      title: "Payroll & People",
      icon: UserCog,
      items: [
        { title: "Payroll", url: "/payroll", icon: DollarSign },
        { title: "Employees", url: "/employees", icon: UserCog },
        { title: "Deductions", url: "/deductions", icon: Calculator },
      ],
    },
    {
      title: "Budgets & Planning",
      icon: TrendingUp,
      items: [
        { title: "Budgets", url: "/budgets", icon: TrendingUp },
        { title: "Categories", url: "/categories", icon: Tag },
        { title: "Cash Flow", url: "/cash-flow", icon: BarChart3 },
      ],
    },
    {
      title: "Bank & Accounting",
      icon: Landmark,
      items: [
        { title: "Bank Accounts", url: "/bank-accounts", icon: Landmark },
        { title: "Transaction Log", url: "/transaction-log", icon: List },
        { title: "Bank Reconciliation", url: "/reconciliation-hub", icon: CheckSquare },
        { title: "Accounting Imports", url: "/accounting-imports", icon: FileSpreadsheet },
      ],
    },
    {
      title: "Engagement",
      icon: ClipboardList,
      items: [
        { title: "Surveys", url: "/surveys", icon: ClipboardList },
        { title: "Forms", url: "/forms", icon: FileEdit },
      ],
    },
    {
      title: "Reports & Analytics",
      icon: LineChart,
      items: [
        { title: "Reports", url: "/reports", icon: FileText },
        { title: "Analytics", url: "/analytics", icon: TrendingUp },
        { title: "Custom Reports", url: "/custom-reports", icon: FileLineChart },
        { title: "Tax Reporting", url: "/tax-reporting", icon: Calculator },
      ],
    },
    {
      title: "Operations & Compliance",
      icon: ShieldCheck,
      items: [
        { title: "Operations Hub", url: "/operations-hub", icon: Database },
        ...(isAdminOrOwner ? [
          { title: "Audit Trail", url: "/audit-trail", icon: History },
          { title: "Security Monitoring", url: "/security-monitoring", icon: Shield },
        ] : []),
      ],
    },
    ...(isAdminOrOwner ? [{
      title: "Organization & Settings",
      icon: Cog,
      items: [
        { title: "Organizations", url: "/organization-management", icon: Building2 },
        { title: "Brand Settings", url: "/brand-settings", icon: FileSliders },
        { title: "Settings", url: "/settings", icon: Settings },
      ],
    }] : [{
      title: "Settings",
      icon: Settings,
      items: [
        { title: "Settings", url: "/settings", icon: Settings },
      ],
    }]),
  ];

  const menuGroups = isNonprofit ? nonprofitMenuGroups : forprofitMenuGroups;

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    menuGroups.forEach(group => {
      initial[group.title] = group.defaultOpen || false;
    });
    return initial;
  });

  const toggleGroup = (title: string) => {
    setOpenGroups(prev => ({ ...prev, [title]: !prev[title] }));
  };

  const isItemActive = (url: string) => {
    if (url === "/") return location === "/";
    return location.startsWith(url);
  };

  const isGroupActive = (group: MenuGroup) => {
    return group.items.some(item => isItemActive(item.url));
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarContent className="p-2">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuGroups.map((group) => (
                <Collapsible
                  key={group.title}
                  open={openGroups[group.title] || isGroupActive(group)}
                  onOpenChange={() => toggleGroup(group.title)}
                >
                  <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton
                        className="w-full justify-between font-medium"
                        data-testid={`group-${group.title.toLowerCase().replace(/\s+/g, '-')}`}
                      >
                        <div className="flex items-center gap-2">
                          <group.icon className="h-4 w-4" />
                          <span>{group.title}</span>
                        </div>
                        <ChevronDown 
                          className={`h-4 w-4 transition-transform duration-200 ${
                            openGroups[group.title] || isGroupActive(group) ? 'rotate-180' : ''
                          }`} 
                        />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenu className="ml-4 mt-1 border-l border-sidebar-border pl-2">
                        {group.items.map((item) => (
                          <SidebarMenuItem key={item.title}>
                            <SidebarMenuButton
                              onClick={() => setLocation(item.url)}
                              isActive={isItemActive(item.url)}
                              data-testid={`link-${item.title.toLowerCase().replace(/\s+/g, '-')}`}
                              className="text-sm"
                            >
                              <item.icon className="h-3.5 w-3.5" />
                              <span>{item.title}</span>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        ))}
                      </SidebarMenu>
                    </CollapsibleContent>
                  </SidebarMenuItem>
                </Collapsible>
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
