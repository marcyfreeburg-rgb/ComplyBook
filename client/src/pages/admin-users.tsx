import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Users, Shield, Mail, Calendar, Building2, PlusCircle, X } from "lucide-react";

interface AdminUser {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  profileImageUrl: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  mfaEnabled: boolean;
  subscriptionTier: string | null;
  subscriptionStatus: string | null;
  organizations: Array<{ id: number; name: string; role: string; roleId: number }>;
}

export default function AdminUsers() {
  const { toast } = useToast();
  const { data: users = [], isLoading, error } = useQuery<AdminUser[]>({
    queryKey: ["/api/admin/users"],
  });

  const [provisionTarget, setProvisionTarget] = useState<AdminUser | null>(null);
  const [orgName, setOrgName] = useState("");
  const [orgType, setOrgType] = useState("nonprofit");

  const provisionMutation = useMutation({
    mutationFn: ({ userId, orgName, orgType }: { userId: string; orgName: string; orgType: string }) =>
      apiRequest("POST", `/api/admin/users/${userId}/provision-org`, { orgName, orgType }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setProvisionTarget(null);
      setOrgName("");
      setOrgType("nonprofit");
      toast({ title: "Organization created", description: "The user has been set as owner of their new organization." });
    },
    onError: () => {
      toast({ title: "Failed to create organization", variant: "destructive" });
    },
  });

  const removeRoleMutation = useMutation({
    mutationFn: (roleId: number) => apiRequest("DELETE", `/api/admin/org-roles/${roleId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "Removed from organization" });
    },
    onError: () => {
      toast({ title: "Failed to remove role", variant: "destructive" });
    },
  });

  function formatDate(dateStr: string | null) {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function getInitials(firstName: string | null, lastName: string | null) {
    const f = firstName?.charAt(0) || "";
    const l = lastName?.charAt(0) || "";
    return (f + l).toUpperCase() || "?";
  }

  function openProvisionDialog(user: AdminUser) {
    const namePart = [user.firstName, user.lastName].filter(Boolean).join(" ");
    setOrgName(namePart ? `${namePart}'s Organization` : "");
    setOrgType("nonprofit");
    setProvisionTarget(user);
  }

  if (error) {
    return (
      <div className="p-6" data-testid="admin-users-error">
        <Card>
          <CardContent className="p-6">
            <p className="text-destructive">You don't have permission to view this page. Admin or owner access is required.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const usersWithOrgs = users.filter(u => u.organizations.length > 0);
  const usersWithoutOrgs = users.filter(u => u.organizations.length === 0);

  return (
    <div className="p-6 space-y-6" data-testid="admin-users-page">
      <div className="flex items-center gap-3 flex-wrap">
        <Users className="h-6 w-6 text-muted-foreground" />
        <h1 className="text-2xl font-semibold" data-testid="text-admin-users-title">Registered Users</h1>
        {!isLoading && (
          <Badge variant="secondary" data-testid="text-user-count">{users.length} total</Badge>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">Loading users…</div>
      ) : (
        <div className="space-y-6">

          {/* Users in organizations */}
          {usersWithOrgs.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Shield className="h-4 w-4" />
                  Active Members
                  <Badge variant="secondary">{usersWithOrgs.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="divide-y">
                {usersWithOrgs.map(u => (
                  <UserRow
                    key={u.id}
                    user={u}
                    formatDate={formatDate}
                    getInitials={getInitials}
                    onRemoveRole={(roleId) => removeRoleMutation.mutate(roleId)}
                    removingRoleId={removeRoleMutation.isPending ? undefined : undefined}
                  />
                ))}
              </CardContent>
            </Card>
          )}

          {/* Users without organizations */}
          {usersWithoutOrgs.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Building2 className="h-4 w-4" />
                  No Organization Yet
                  <Badge variant="secondary">{usersWithoutOrgs.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="divide-y">
                {usersWithoutOrgs.map(u => (
                  <UserRow
                    key={u.id}
                    user={u}
                    formatDate={formatDate}
                    getInitials={getInitials}
                    onProvision={() => openProvisionDialog(u)}
                    onRemoveRole={(roleId) => removeRoleMutation.mutate(roleId)}
                  />
                ))}
              </CardContent>
            </Card>
          )}

          {users.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">No users registered yet.</CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Provision org dialog */}
      <Dialog open={!!provisionTarget} onOpenChange={(open) => { if (!open) setProvisionTarget(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Organization</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Creating an organization for <strong>{[provisionTarget?.firstName, provisionTarget?.lastName].filter(Boolean).join(" ") || provisionTarget?.email}</strong>. They will be set as the owner.
          </p>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="org-name">Organization Name</Label>
              <Input
                id="org-name"
                data-testid="input-org-name"
                value={orgName}
                onChange={e => setOrgName(e.target.value)}
                placeholder="e.g. Acme Nonprofit"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="org-type">Type</Label>
              <Select value={orgType} onValueChange={setOrgType}>
                <SelectTrigger id="org-type" data-testid="select-org-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nonprofit">Nonprofit</SelectItem>
                  <SelectItem value="forprofit">For-Profit</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setProvisionTarget(null)} data-testid="button-cancel-provision">Cancel</Button>
            <Button
              onClick={() => provisionTarget && provisionMutation.mutate({ userId: provisionTarget.id, orgName, orgType })}
              disabled={!orgName.trim() || provisionMutation.isPending}
              data-testid="button-confirm-provision"
            >
              {provisionMutation.isPending ? "Creating…" : "Create Organization"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function UserRow({
  user,
  formatDate,
  getInitials,
  onProvision,
  onRemoveRole,
}: {
  user: AdminUser;
  formatDate: (d: string | null) => string;
  getInitials: (f: string | null, l: string | null) => string;
  onProvision?: () => void;
  onRemoveRole: (roleId: number) => void;
}) {
  return (
    <div className="py-4 flex flex-wrap gap-4 items-start" data-testid={`row-user-${user.id}`}>
      {/* Avatar + name */}
      <div className="flex items-center gap-3 min-w-[160px]">
        <Avatar className="h-9 w-9 shrink-0">
          <AvatarImage src={user.profileImageUrl || undefined} />
          <AvatarFallback className="text-xs">{getInitials(user.firstName, user.lastName)}</AvatarFallback>
        </Avatar>
        <div>
          <p className="font-medium text-sm leading-tight" data-testid={`text-username-${user.id}`}>
            {[user.firstName, user.lastName].filter(Boolean).join(" ") || "Unknown"}
          </p>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Mail className="h-3 w-3" />
            <span data-testid={`text-email-${user.id}`}>{user.email || "N/A"}</span>
          </div>
        </div>
      </div>

      {/* Orgs */}
      <div className="flex-1 min-w-[180px]">
        {user.organizations.length === 0 ? (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground italic">No organization</span>
            {onProvision && (
              <Button size="sm" variant="outline" onClick={onProvision} data-testid={`button-provision-org-${user.id}`}>
                <PlusCircle className="h-3.5 w-3.5 mr-1" />
                Create Org
              </Button>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-1.5" data-testid={`orgs-${user.id}`}>
            {user.organizations.map(org => (
              <div key={org.roleId} className="flex items-center gap-1.5">
                <Building2 className="h-3 w-3 text-muted-foreground shrink-0" />
                <span className="text-sm">{org.name}</span>
                <Badge variant="outline" className="text-xs capitalize">{org.role}</Badge>
                <button
                  onClick={() => onRemoveRole(org.roleId)}
                  className="ml-1 text-muted-foreground hover:text-destructive transition-colors"
                  title={`Remove from ${org.name}`}
                  data-testid={`button-remove-role-${org.roleId}`}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Meta */}
      <div className="flex flex-wrap items-center gap-2 text-sm shrink-0">
        <Badge variant={user.mfaEnabled ? "default" : "outline"} data-testid={`badge-mfa-${user.id}`}>
          {user.mfaEnabled ? "MFA On" : "MFA Off"}
        </Badge>
        <Badge variant="secondary" data-testid={`badge-plan-${user.id}`}>
          {user.subscriptionTier || "free"}
        </Badge>
        <div className="flex items-center gap-1 text-muted-foreground">
          <Calendar className="h-3.5 w-3.5" />
          <span data-testid={`text-created-${user.id}`}>{formatDate(user.createdAt)}</span>
        </div>
      </div>
    </div>
  );
}
