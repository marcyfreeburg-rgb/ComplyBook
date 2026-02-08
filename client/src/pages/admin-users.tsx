import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Users, Shield, Mail, Calendar } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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
}

export default function AdminUsers() {
  const { data: users = [], isLoading, error } = useQuery<AdminUser[]>({
    queryKey: ["/api/admin/users"],
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

  return (
    <div className="p-6 space-y-6" data-testid="admin-users-page">
      <div className="flex items-center gap-3 flex-wrap">
        <Users className="h-6 w-6 text-muted-foreground" />
        <h1 className="text-2xl font-semibold" data-testid="text-admin-users-title">Registered Users</h1>
        {!isLoading && (
          <Badge variant="secondary" data-testid="text-user-count">{users.length} total</Badge>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            All Users
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              Loading users...
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>MFA</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Signed Up</TableHead>
                    <TableHead>Last Active</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u) => (
                    <TableRow key={u.id} data-testid={`row-user-${u.id}`}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={u.profileImageUrl || undefined} />
                            <AvatarFallback className="text-xs">
                              {getInitials(u.firstName, u.lastName)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium" data-testid={`text-username-${u.id}`}>
                            {[u.firstName, u.lastName].filter(Boolean).join(" ") || "Unknown"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-sm" data-testid={`text-email-${u.id}`}>{u.email || "N/A"}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={u.mfaEnabled ? "default" : "outline"} data-testid={`badge-mfa-${u.id}`}>
                          {u.mfaEnabled ? "Enabled" : "Off"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" data-testid={`badge-plan-${u.id}`}>
                          {u.subscriptionTier || "free"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <Calendar className="h-3.5 w-3.5" />
                          <span data-testid={`text-created-${u.id}`}>{formatDate(u.createdAt)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground" data-testid={`text-updated-${u.id}`}>
                          {formatDate(u.updatedAt)}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                  {users.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No users registered yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
