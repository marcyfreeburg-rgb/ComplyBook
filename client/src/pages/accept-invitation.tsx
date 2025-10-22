import { useEffect, useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Check, X, Mail, Building2, Shield, AlertCircle } from "lucide-react";

interface InvitationDetails {
  id: number;
  email: string;
  organizationId: number;
  organizationName: string;
  role: string;
  permissions: string;
  inviterName: string;
  status: string;
  expiresAt: Date;
}

export default function AcceptInvitation() {
  const [, params] = useRoute("/invite/:token");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);

  const token = params?.token;

  // Store invitation token and redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated && token) {
      // Store the invitation token for later
      localStorage.setItem('pendingInvitationToken', token);
      // Redirect to landing page for authentication
      setLocation('/');
    }
  }, [authLoading, isAuthenticated, token, setLocation]);

  // Fetch invitation details - only when authenticated
  const { data: invitation, isLoading, error } = useQuery<InvitationDetails>({
    queryKey: [`/api/invitations/accept/${token}`],
    enabled: !!token && isAuthenticated,
    retry: false,
  });

  const acceptInvitationMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('POST', `/api/invitations/accept/${token}`, {});
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/organizations'] });
      toast({
        title: "Invitation accepted",
        description: `You've joined ${invitation?.organizationName}!`,
      });
      // Redirect to organizations page
      setTimeout(() => setLocation('/organizations'), 1000);
    },
    onError: (err: any) => {
      toast({
        title: "Error",
        description: err.message || "Failed to accept invitation. Please try again.",
        variant: "destructive",
      });
    },
  });

  const declineInvitationMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('POST', `/api/invitations/decline/${token}`, {});
    },
    onSuccess: () => {
      toast({
        title: "Invitation declined",
        description: "You've declined this invitation.",
      });
      setTimeout(() => setLocation('/organizations'), 1000);
    },
    onError: (err: any) => {
      toast({
        title: "Error",
        description: err.message || "Failed to decline invitation. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleAccept = () => {
    setIsProcessing(true);
    acceptInvitationMutation.mutate();
  };

  const handleDecline = () => {
    setIsProcessing(true);
    declineInvitationMutation.mutate();
  };

  if (!token) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-destructive">Invalid Invitation</CardTitle>
            <CardDescription>
              The invitation link is invalid or incomplete.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setLocation('/organizations')} className="w-full" data-testid="button-back-organizations">
              Go to Organizations
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show loading while checking authentication or redirecting
  if (authLoading || (!isAuthenticated && token)) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground">
                {authLoading ? 'Checking authentication...' : 'Redirecting to login...'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground">Loading invitation...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !invitation) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <AlertCircle className="h-8 w-8 text-destructive" />
              <CardTitle className="text-destructive">Invitation Not Found</CardTitle>
            </div>
            <CardDescription>
              This invitation may have expired, been cancelled, or already been used.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setLocation('/organizations')} className="w-full" data-testid="button-back-organizations">
              Go to Organizations
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (invitation.status !== 'pending') {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Invitation Already Processed</CardTitle>
            <CardDescription>
              This invitation has already been {invitation.status}.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setLocation('/organizations')} className="w-full" data-testid="button-back-organizations">
              Go to Organizations
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getPermissionDescription = (permissions: string) => {
    switch (permissions) {
      case 'view_only':
        return 'You can view all data but cannot make any changes.';
      case 'make_reports':
        return 'You can view data and generate financial reports.';
      case 'edit_transactions':
        return 'You can view and edit transactions.';
      case 'view_make_reports':
        return 'You can view all data and generate reports.';
      case 'full_access':
        return 'You can view, edit transactions, and generate reports.';
      default:
        return 'Standard access permissions.';
    }
  };

  const isExpired = new Date(invitation.expiresAt) < new Date();

  if (isExpired) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <AlertCircle className="h-8 w-8 text-destructive" />
              <CardTitle className="text-destructive">Invitation Expired</CardTitle>
            </div>
            <CardDescription>
              This invitation expired on {new Date(invitation.expiresAt).toLocaleDateString()}.
              Please contact the organization owner for a new invitation.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setLocation('/organizations')} className="w-full" data-testid="button-back-organizations">
              Go to Organizations
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Mail className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl">You've Been Invited!</CardTitle>
          <CardDescription>
            {invitation.inviterName} has invited you to join their organization
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Organization Details */}
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 rounded-md bg-muted/50">
              <Building2 className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Organization</p>
                <p className="text-base font-medium text-foreground mt-0.5">{invitation.organizationName}</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 rounded-md bg-muted/50">
              <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Invited Email</p>
                <p className="text-base font-medium text-foreground mt-0.5">{invitation.email}</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 rounded-md bg-muted/50">
              <Shield className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-muted-foreground mb-1">Permissions</p>
                <Badge variant="outline" className="mb-2">
                  {invitation.permissions.replace(/_/g, ' ')}
                </Badge>
                <p className="text-sm text-muted-foreground">
                  {getPermissionDescription(invitation.permissions)}
                </p>
              </div>
            </div>
          </div>

          {/* Expiry Notice */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              This invitation expires on {new Date(invitation.expiresAt).toLocaleDateString()} at{' '}
              {new Date(invitation.expiresAt).toLocaleTimeString()}
            </AlertDescription>
          </Alert>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              variant="outline"
              onClick={handleDecline}
              disabled={isProcessing}
              className="flex-1"
              data-testid="button-decline-invitation"
            >
              <X className="h-4 w-4 mr-2" />
              Decline
            </Button>
            <Button
              onClick={handleAccept}
              disabled={isProcessing}
              className="flex-1"
              data-testid="button-accept-invitation"
            >
              <Check className="h-4 w-4 mr-2" />
              {acceptInvitationMutation.isPending ? "Accepting..." : "Accept Invitation"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
