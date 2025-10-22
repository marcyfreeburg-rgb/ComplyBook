import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Settings as SettingsIcon } from "lucide-react";
import type { User, Organization } from "@shared/schema";

interface SettingsProps {
  currentOrganization: Organization;
  user: User;
}

export default function Settings({ currentOrganization, user }: SettingsProps) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-semibold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your account and organization settings
        </p>
      </div>

      {/* User Profile */}
      <Card>
        <CardHeader>
          <CardTitle>User Profile</CardTitle>
          <CardDescription>
            Your personal information
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={user.profileImageUrl || undefined} alt={user.firstName || user.email || "User"} className="object-cover" />
              <AvatarFallback className="text-lg font-medium">
                {user.firstName?.[0]}{user.lastName?.[0] || user.email?.[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-base font-medium text-foreground">
                {user.firstName} {user.lastName}
              </p>
              <p className="text-sm text-muted-foreground">{user.email}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Current Organization */}
      <Card>
        <CardHeader>
          <CardTitle>Current Organization</CardTitle>
          <CardDescription>
            Information about the organization you're currently viewing
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Name</p>
              <p className="text-sm font-medium text-foreground">{currentOrganization.name}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Type</p>
              <p className="text-sm font-medium text-foreground">
                {currentOrganization.type === 'nonprofit' ? 'Non-Profit' : 'For-Profit'}
              </p>
            </div>
          </div>
          {currentOrganization.description && (
            <>
              <Separator />
              <div>
                <p className="text-xs text-muted-foreground mb-1">Description</p>
                <p className="text-sm text-foreground">{currentOrganization.description}</p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Coming Soon */}
      <Card>
        <CardContent className="py-12">
          <div className="text-center">
            <SettingsIcon className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
            <p className="text-sm font-medium text-foreground mb-1">More Settings Coming Soon</p>
            <p className="text-sm text-muted-foreground">
              Additional configuration options will be available in future updates
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
