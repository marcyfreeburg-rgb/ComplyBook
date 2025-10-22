import { useState, useCallback, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { usePlaidLink } from "react-plaid-link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Settings as SettingsIcon, Plus, Trash2, Tag, Pencil, Building2, DollarSign, ArrowLeft, Mail, Users, Copy, Check } from "lucide-react";
import { Link } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { User, Organization, Category, InsertCategory } from "@shared/schema";
import { Badge } from "@/components/ui/badge";

interface PlaidAccount {
  id: number;
  accountId: string;
  name: string;
  officialName: string | null;
  mask: string | null;
  type: string | null;
  subtype: string | null;
  currentBalance: string | null;
  availableBalance: string | null;
  institutionName: string | null;
}

interface TeamMember {
  userId: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  role: string;
  permissions: string | null;
  createdAt: Date;
}

interface Invitation {
  id: number;
  email: string;
  role: string;
  permissions: string;
  status: string;
  inviterName: string;
  createdAt: Date;
  expiresAt: Date;
}

interface SettingsProps {
  currentOrganization: Organization;
  user: User;
}

export default function Settings({ currentOrganization, user }: SettingsProps) {
  const { toast } = useToast();
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);
  const [isEditCategoryOpen, setIsEditCategoryOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [newCategory, setNewCategory] = useState({
    name: "",
    type: "income" as "income" | "expense",
  });
  const [linkToken, setLinkToken] = useState<string | null>(null);
  
  // Team & Invitations state
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [inviteFormData, setInviteFormData] = useState({
    email: "",
    permissions: "view_only",
  });
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  const { data: categories, isLoading: categoriesLoading } = useQuery<Category[]>({
    queryKey: [`/api/categories/${currentOrganization.id}`],
  });

  const { data: plaidAccounts, isLoading: plaidAccountsLoading } = useQuery<PlaidAccount[]>({
    queryKey: [`/api/plaid/accounts/${currentOrganization.id}`],
  });

  const { data: teamMembers, isLoading: teamMembersLoading } = useQuery<TeamMember[]>({
    queryKey: [`/api/team/${currentOrganization.id}`],
  });

  const { data: invitations, isLoading: invitationsLoading } = useQuery<Invitation[]>({
    queryKey: [`/api/invitations/${currentOrganization.id}`],
  });

  // Fetch link token when component mounts
  useEffect(() => {
    const fetchLinkToken = async () => {
      try {
        const response = await fetch(`/api/plaid/create-link-token/${currentOrganization.id}`, {
          method: 'POST',
          credentials: 'include',
        });
        if (response.ok) {
          const data = await response.json();
          setLinkToken(data.link_token);
        }
      } catch (error) {
        console.error("Error fetching link token:", error);
      }
    };
    
    fetchLinkToken();
  }, [currentOrganization.id]);

  const createCategoryMutation = useMutation({
    mutationFn: async (data: InsertCategory) => {
      return await apiRequest('POST', '/api/categories', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/categories/${currentOrganization.id}`] });
      toast({
        title: "Category created",
        description: "Your category has been added successfully.",
      });
      setIsAddCategoryOpen(false);
      setNewCategory({ name: "", type: "income" });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create category. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateCategoryMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<InsertCategory> }) => {
      return await apiRequest('PATCH', `/api/categories/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/categories/${currentOrganization.id}`] });
      toast({
        title: "Category updated",
        description: "Your category has been updated successfully.",
      });
      setIsEditCategoryOpen(false);
      setEditingCategory(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update category. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: async (categoryId: number) => {
      return await apiRequest('DELETE', `/api/categories/${categoryId}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/categories/${currentOrganization.id}`] });
      toast({
        title: "Category deleted",
        description: "The category has been removed successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete category. It may be in use by transactions.",
        variant: "destructive",
      });
    },
  });

  const disconnectBankMutation = useMutation({
    mutationFn: async (itemId: string) => {
      return await apiRequest('DELETE', `/api/plaid/item/${itemId}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/plaid/accounts/${currentOrganization.id}`] });
      toast({
        title: "Bank disconnected",
        description: "Your bank account has been disconnected successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to disconnect bank account. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Team management mutations
  const createInvitationMutation = useMutation({
    mutationFn: async (data: { email: string; permissions: string }) => {
      return await apiRequest('POST', `/api/invitations/${currentOrganization.id}`, {
        email: data.email,
        role: 'viewer',
        permissions: data.permissions,
      });
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: [`/api/invitations/${currentOrganization.id}`] });
      toast({
        title: "Invitation sent",
        description: "The invitation has been created successfully.",
      });
      setIsInviteDialogOpen(false);
      setInviteFormData({ email: "", permissions: "view_only" });
      
      // Copy link to clipboard
      if (data.inviteLink) {
        navigator.clipboard.writeText(data.inviteLink);
        setCopiedLink(data.inviteLink);
        setTimeout(() => setCopiedLink(null), 3000);
      }
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to send invitation. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteInvitationMutation = useMutation({
    mutationFn: async (invitationId: number) => {
      return await apiRequest('DELETE', `/api/invitations/${invitationId}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/invitations/${currentOrganization.id}`] });
      toast({
        title: "Invitation cancelled",
        description: "The invitation has been cancelled.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to cancel invitation. Please try again.",
        variant: "destructive",
      });
    },
  });

  const removeTeamMemberMutation = useMutation({
    mutationFn: async (userId: string) => {
      return await apiRequest('DELETE', `/api/team/${currentOrganization.id}/${userId}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/team/${currentOrganization.id}`] });
      toast({
        title: "Member removed",
        description: "The team member has been removed from this organization.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to remove team member. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Handle successful Plaid Link
  const onPlaidSuccess = useCallback(async (public_token: string, metadata: any) => {
    try {
      await apiRequest('POST', `/api/plaid/exchange-token/${currentOrganization.id}`, {
        public_token,
      });
      
      queryClient.invalidateQueries({ queryKey: [`/api/plaid/accounts/${currentOrganization.id}`] });
      
      toast({
        title: "Bank connected",
        description: `Successfully connected ${metadata.institution?.name || 'your bank account'}.`,
      });
    } catch (error) {
      console.error("Error exchanging token:", error);
      toast({
        title: "Error",
        description: "Failed to connect bank account. Please try again.",
        variant: "destructive",
      });
    }
  }, [currentOrganization.id, toast]);

  const onPlaidExit = useCallback((err: any, metadata: any) => {
    if (err) {
      console.error("Plaid Link exited with error:", err, metadata);
    }
  }, []);

  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess: onPlaidSuccess,
    onExit: onPlaidExit,
  });

  const handleCreateCategory = () => {
    if (!newCategory.name.trim()) {
      toast({
        title: "Error",
        description: "Please enter a category name.",
        variant: "destructive",
      });
      return;
    }

    createCategoryMutation.mutate({
      organizationId: currentOrganization.id,
      name: newCategory.name.trim(),
      type: newCategory.type,
    });
  };

  const handleEditCategory = () => {
    if (!editingCategory || !editingCategory.name.trim()) {
      toast({
        title: "Error",
        description: "Please enter a category name.",
        variant: "destructive",
      });
      return;
    }

    updateCategoryMutation.mutate({
      id: editingCategory.id,
      data: {
        name: editingCategory.name.trim(),
        type: editingCategory.type,
      },
    });
  };

  const openEditDialog = (category: Category) => {
    setEditingCategory({ ...category });
    setIsEditCategoryOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-foreground">Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your account and organization settings
          </p>
        </div>
        <Link href="/">
          <Button variant="outline" size="sm" data-testid="button-back-dashboard">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </Link>
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

      {/* Team Members */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <CardTitle>Team Members</CardTitle>
              <CardDescription>
                Manage people who have access to this organization
              </CardDescription>
            </div>
            <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-invite-member">
                  <Mail className="h-4 w-4 mr-2" />
                  Invite Member
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Invite Team Member</DialogTitle>
                  <DialogDescription>
                    Send an invitation link to add a new member to this organization
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="invite-email">Email Address</Label>
                    <Input
                      id="invite-email"
                      type="email"
                      placeholder="colleague@example.com"
                      value={inviteFormData.email}
                      onChange={(e) => setInviteFormData({ ...inviteFormData, email: e.target.value })}
                      data-testid="input-invite-email"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="invite-permissions">Permissions</Label>
                    <Select
                      value={inviteFormData.permissions}
                      onValueChange={(value) => setInviteFormData({ ...inviteFormData, permissions: value })}
                    >
                      <SelectTrigger id="invite-permissions" data-testid="select-invite-permissions">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="view_only">View Only</SelectItem>
                        <SelectItem value="make_reports">Make Reports</SelectItem>
                        <SelectItem value="edit_transactions">Edit Transactions Only</SelectItem>
                        <SelectItem value="view_make_reports">View & Make Reports</SelectItem>
                        <SelectItem value="full_access">Full Access</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      {inviteFormData.permissions === 'view_only' && 'Can only view data'}
                      {inviteFormData.permissions === 'make_reports' && 'Can view and generate reports'}
                      {inviteFormData.permissions === 'edit_transactions' && 'Can view and edit transactions'}
                      {inviteFormData.permissions === 'view_make_reports' && 'Can view and make reports'}
                      {inviteFormData.permissions === 'full_access' && 'Can view, edit transactions, and make reports'}
                    </p>
                  </div>
                  {copiedLink && (
                    <div className="flex items-center gap-2 p-3 rounded-md bg-primary/10 text-sm text-primary">
                      <Check className="h-4 w-4" />
                      <span>Invitation link copied to clipboard!</span>
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setIsInviteDialogOpen(false)}
                    data-testid="button-cancel-invite"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => createInvitationMutation.mutate(inviteFormData)}
                    disabled={createInvitationMutation.isPending || !inviteFormData.email}
                    data-testid="button-submit-invite"
                  >
                    {createInvitationMutation.isPending ? "Sending..." : "Send Invitation"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {teamMembersLoading ? (
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground">Loading team members...</p>
            </div>
          ) : !teamMembers || teamMembers.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
              <p className="text-sm font-medium text-foreground mb-1">No team members yet</p>
              <p className="text-sm text-muted-foreground">
                Invite people to collaborate on this organization
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {teamMembers.map((member) => (
                <div
                  key={member.userId}
                  className="flex items-center justify-between p-4 rounded-md bg-muted/50"
                  data-testid={`team-member-${member.userId}`}
                >
                  <div className="flex items-center gap-3 flex-1">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="text-sm font-medium">
                        {member.firstName?.[0]}{member.lastName?.[0] || member.email?.[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">
                        {member.firstName} {member.lastName}
                        {member.userId === user.id && (
                          <span className="text-xs text-muted-foreground ml-2">(You)</span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">{member.email}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{member.role}</Badge>
                      {member.permissions && (
                        <Badge variant="outline" className="text-xs">
                          {member.permissions.replace(/_/g, ' ')}
                        </Badge>
                      )}
                    </div>
                  </div>
                  {member.userId !== user.id && member.role !== 'owner' && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeTeamMemberMutation.mutate(member.userId)}
                      disabled={removeTeamMemberMutation.isPending}
                      className="ml-2"
                      data-testid={`button-remove-member-${member.userId}`}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pending Invitations */}
      <Card>
        <CardHeader>
          <CardTitle>Pending Invitations</CardTitle>
          <CardDescription>
            Invitations that haven't been accepted yet
          </CardDescription>
        </CardHeader>
        <CardContent>
          {invitationsLoading ? (
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground">Loading invitations...</p>
            </div>
          ) : !invitations || invitations.length === 0 ? (
            <div className="text-center py-8">
              <Mail className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
              <p className="text-sm text-muted-foreground">No pending invitations</p>
            </div>
          ) : (
            <div className="space-y-3">
              {invitations.map((invitation) => (
                <div
                  key={invitation.id}
                  className="flex items-center justify-between p-4 rounded-md bg-muted/50"
                  data-testid={`invitation-${invitation.id}`}
                >
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">{invitation.email}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-xs text-muted-foreground">
                        Invited by {invitation.inviterName}
                      </p>
                      <span className="text-muted-foreground">•</span>
                      <Badge variant="outline" className="text-xs">
                        {invitation.permissions.replace(/_/g, ' ')}
                      </Badge>
                      <span className="text-muted-foreground">•</span>
                      <Badge variant={invitation.status === 'pending' ? 'default' : 'secondary'} className="text-xs">
                        {invitation.status}
                      </Badge>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteInvitationMutation.mutate(invitation.id)}
                    disabled={deleteInvitationMutation.isPending}
                    data-testid={`button-cancel-invitation-${invitation.id}`}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bank Connections */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <CardTitle>Bank Connections</CardTitle>
              <CardDescription>
                Connect your bank accounts to automatically import transactions
              </CardDescription>
            </div>
            <Button 
              onClick={() => open()} 
              disabled={!ready}
              data-testid="button-connect-bank"
            >
              <Building2 className="h-4 w-4 mr-2" />
              Connect Bank
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {plaidAccountsLoading ? (
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground">Loading bank accounts...</p>
            </div>
          ) : !plaidAccounts || plaidAccounts.length === 0 ? (
            <div className="text-center py-8">
              <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
              <p className="text-sm font-medium text-foreground mb-1">No bank accounts connected</p>
              <p className="text-sm text-muted-foreground">
                Connect your bank to automatically import transactions
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {plaidAccounts.map((account) => (
                <div
                  key={account.id}
                  className="flex items-center justify-between p-4 rounded-md bg-muted/50"
                  data-testid={`bank-account-${account.id}`}
                >
                  <div className="flex items-center gap-3 flex-1">
                    <div className="h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center">
                      <DollarSign className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">
                        {account.name}
                        {account.mask && (
                          <span className="text-muted-foreground ml-2">••••{account.mask}</span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {account.institutionName || 'Bank Account'}
                        {account.type && ` • ${account.type}`}
                        {account.subtype && ` • ${account.subtype}`}
                      </p>
                    </div>
                    {account.currentBalance && (
                      <div className="text-right">
                        <p className="text-sm font-mono font-medium text-foreground">
                          ${parseFloat(account.currentBalance).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                        <p className="text-xs text-muted-foreground">Current Balance</p>
                      </div>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => disconnectBankMutation.mutate(account.accountId)}
                    disabled={disconnectBankMutation.isPending}
                    className="ml-2"
                    data-testid={`button-disconnect-${account.id}`}
                  >
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Category Management */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <div>
              <CardTitle>Categories</CardTitle>
              <CardDescription>
                Manage income and expense categories for transaction classification
              </CardDescription>
            </div>
            <Dialog open={isAddCategoryOpen} onOpenChange={setIsAddCategoryOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-add-category">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Category
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Category</DialogTitle>
                  <DialogDescription>
                    Add a new category for classifying transactions
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="category-name">Category Name</Label>
                    <Input
                      id="category-name"
                      data-testid="input-category-name"
                      placeholder="e.g., Office Supplies, Donations"
                      value={newCategory.name}
                      onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category-type">Type</Label>
                    <Select
                      value={newCategory.type}
                      onValueChange={(value) => setNewCategory({ ...newCategory, type: value as "income" | "expense" })}
                    >
                      <SelectTrigger id="category-type" data-testid="select-category-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="income">Income</SelectItem>
                        <SelectItem value="expense">Expense</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setIsAddCategoryOpen(false)}
                    data-testid="button-cancel-category"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleCreateCategory}
                    disabled={createCategoryMutation.isPending}
                    data-testid="button-submit-category"
                  >
                    {createCategoryMutation.isPending ? "Creating..." : "Create Category"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {categoriesLoading ? (
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground">Loading categories...</p>
            </div>
          ) : !categories || categories.length === 0 ? (
            <div className="text-center py-8">
              <Tag className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
              <p className="text-sm text-muted-foreground">No categories yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Create your first category to start organizing transactions
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {categories.map((category) => (
                <div
                  key={category.id}
                  className="flex items-center justify-between p-3 rounded-md bg-muted/50"
                  data-testid={`category-${category.id}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`h-8 w-8 rounded-md flex items-center justify-center ${
                      category.type === 'income' ? 'bg-chart-2/10' : 'bg-chart-3/10'
                    }`}>
                      <Tag className={`h-4 w-4 ${
                        category.type === 'income' ? 'text-chart-2' : 'text-chart-3'
                      }`} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{category.name}</p>
                      <p className="text-xs text-muted-foreground capitalize">{category.type}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEditDialog(category)}
                      data-testid={`button-edit-category-${category.id}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteCategoryMutation.mutate(category.id)}
                      disabled={deleteCategoryMutation.isPending}
                      data-testid={`button-delete-category-${category.id}`}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Category Dialog */}
      <Dialog open={isEditCategoryOpen} onOpenChange={setIsEditCategoryOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Category</DialogTitle>
            <DialogDescription>
              Update the category name and type
            </DialogDescription>
          </DialogHeader>
          {editingCategory && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-category-name">Category Name</Label>
                <Input
                  id="edit-category-name"
                  data-testid="input-edit-category-name"
                  placeholder="e.g., Office Supplies, Donations"
                  value={editingCategory.name}
                  onChange={(e) => setEditingCategory({ ...editingCategory, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-category-type">Type</Label>
                <Select
                  value={editingCategory.type}
                  onValueChange={(value) => setEditingCategory({ ...editingCategory, type: value as "income" | "expense" })}
                >
                  <SelectTrigger id="edit-category-type" data-testid="select-edit-category-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="income">Income</SelectItem>
                    <SelectItem value="expense">Expense</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditCategoryOpen(false)}
              data-testid="button-cancel-edit-category"
            >
              Cancel
            </Button>
            <Button
              onClick={handleEditCategory}
              disabled={updateCategoryMutation.isPending}
              data-testid="button-submit-edit-category"
            >
              {updateCategoryMutation.isPending ? "Updating..." : "Update Category"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
