import { Building2, Check, ChevronsUpDown, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { queryClient } from "@/lib/queryClient";
import type { Organization } from "@shared/schema";

interface OrganizationSwitcherProps {
  organizations: Organization[];
  currentOrganizationId?: number;
  onSwitch: (orgId: number) => void;
  onCreateNew: () => void;
}

export function OrganizationSwitcher({
  organizations,
  currentOrganizationId,
  onSwitch,
  onCreateNew,
}: OrganizationSwitcherProps) {
  const currentOrg = organizations.find(org => org.id === currentOrganizationId);

  const handlePrefetch = (orgId: number) => {
    if (orgId === currentOrganizationId) return;
    
    queryClient.prefetchQuery({
      queryKey: [`/api/dashboard/${orgId}`],
      staleTime: 30000,
    });
    queryClient.prefetchQuery({
      queryKey: [`/api/dashboard/${orgId}/monthly-trends`],
      staleTime: 60000,
    });
    queryClient.prefetchQuery({
      queryKey: [`/api/dashboard/${orgId}/category-breakdown`],
      staleTime: 60000,
    });
    queryClient.prefetchQuery({
      queryKey: [`/api/transactions/${orgId}`, `limit=100&offset=0`],
      queryFn: async () => {
        const res = await fetch(`/api/transactions/${orgId}?limit=100&offset=0`, { credentials: 'include' });
        if (!res.ok) throw new Error('Failed to fetch');
        return res.json();
      },
      staleTime: 60000,
    });
    queryClient.prefetchQuery({
      queryKey: [`/api/categories/${orgId}`],
      staleTime: 60000,
    });
    queryClient.prefetchQuery({
      queryKey: [`/api/vendors/${orgId}`],
      staleTime: 60000,
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          className="h-10 gap-2 px-3"
          data-testid="button-organization-switcher"
        >
          {currentOrg?.logoUrl ? (
            <Avatar className="h-6 w-6">
              <AvatarImage src={currentOrg.logoUrl} alt={currentOrg.name} className="object-contain" />
              <AvatarFallback className="text-xs">
                <Building2 className="h-4 w-4" />
              </AvatarFallback>
            </Avatar>
          ) : (
            <Building2 className="h-4 w-4" />
          )}
          <div className="flex flex-col items-start min-w-0 flex-1">
            <span className="text-sm font-medium truncate max-w-[200px]">
              {currentOrg?.name || "Select Organization"}
            </span>
            {currentOrg && (
              <span className="text-xs text-muted-foreground">
                {currentOrg.type === 'nonprofit' ? 'Non-Profit' : 'For-Profit'}
              </span>
            )}
          </div>
          <ChevronsUpDown className="h-4 w-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Your Organizations
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {organizations.map((org) => (
          <DropdownMenuItem
            key={org.id}
            onClick={() => onSwitch(org.id)}
            onMouseEnter={() => handlePrefetch(org.id)}
            onFocus={() => handlePrefetch(org.id)}
            className="flex items-center gap-2 cursor-pointer"
            data-testid={`option-organization-${org.id}`}
          >
            {org.logoUrl ? (
              <Avatar className="h-5 w-5">
                <AvatarImage src={org.logoUrl} alt={org.name} className="object-contain" />
                <AvatarFallback className="text-xs">
                  <Building2 className="h-3 w-3" />
                </AvatarFallback>
              </Avatar>
            ) : (
              <Building2 className="h-4 w-4 text-muted-foreground" />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{org.name}</p>
              <Badge variant="secondary" className="mt-1">
                {org.type === 'nonprofit' ? 'Non-Profit' : 'For-Profit'}
              </Badge>
            </div>
            {org.id === currentOrganizationId && (
              <Check className="h-4 w-4 text-primary" />
            )}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={onCreateNew}
          className="cursor-pointer"
          data-testid="button-create-organization"
        >
          <Plus className="h-4 w-4 mr-2" />
          <span>Create New Organization</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
