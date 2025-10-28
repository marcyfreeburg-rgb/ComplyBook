import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Wallet, TrendingUp, TrendingDown, Edit2, DollarSign, List } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Fund, Organization, Transaction } from "@shared/schema";
import { formatCurrency } from "@/lib/utils";

interface FundsProps {
  currentOrganization: Organization;
  userId: string;
}

export default function Funds({ currentOrganization, userId }: FundsProps) {
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isTransactionsDialogOpen, setIsTransactionsDialogOpen] = useState(false);
  const [editingFund, setEditingFund] = useState<Fund | null>(null);
  const [viewingFundId, setViewingFundId] = useState<number | null>(null);
  
  const [formData, setFormData] = useState({
    name: "",
    fundType: "unrestricted" as "restricted" | "unrestricted" | "temporarily_restricted" | "permanently_restricted",
    description: "",
    currentBalance: "0.00",
    restrictions: "",
  });

  const { data: funds = [], isLoading } = useQuery<Fund[]>({
    queryKey: [`/api/funds`, currentOrganization.id],
  });

  const { data: fundTransactions = [], isLoading: isLoadingTransactions } = useQuery<Transaction[]>({
    queryKey: [`/api/funds/${viewingFundId}/transactions`],
    enabled: !!viewingFundId && isTransactionsDialogOpen,
  });

  const resetForm = () => {
    setFormData({
      name: "",
      fundType: "unrestricted",
      description: "",
      currentBalance: "0.00",
      restrictions: "",
    });
  };

  const createFundMutation = useMutation({
    mutationFn: async () => {
      if (!formData.name.trim()) {
        throw new Error("Fund name is required");
      }
      return await apiRequest('POST', '/api/funds', {
        organizationId: currentOrganization.id,
        ...formData,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/funds`, currentOrganization.id] });
      toast({
        title: "Fund created",
        description: `${formData.name} has been added successfully.`,
      });
      setIsCreateDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create fund. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateFundMutation = useMutation({
    mutationFn: async () => {
      if (!editingFund) return;
      if (!formData.name.trim()) {
        throw new Error("Fund name is required");
      }
      return await apiRequest('PUT', `/api/funds/${editingFund.id}`, formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/funds`, currentOrganization.id] });
      toast({
        title: "Fund updated",
        description: "Fund information has been updated successfully.",
      });
      setIsEditDialogOpen(false);
      setEditingFund(null);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update fund. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteFundMutation = useMutation({
    mutationFn: async (fundId: number) => {
      return await apiRequest('DELETE', `/api/funds/${fundId}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/funds`, currentOrganization.id] });
      toast({
        title: "Fund deleted",
        description: "The fund has been removed successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete fund.",
        variant: "destructive",
      });
    },
  });

  const handleEdit = (fund: Fund) => {
    setEditingFund(fund);
    setFormData({
      name: fund.name,
      fundType: fund.fundType as any,
      description: fund.description || "",
      currentBalance: fund.currentBalance,
      restrictions: fund.restrictions || "",
    });
    setIsEditDialogOpen(true);
  };

  const handleViewTransactions = (fundId: number) => {
    setViewingFundId(fundId);
    setIsTransactionsDialogOpen(true);
  };

  const getFundTypeColor = (type: string) => {
    switch (type) {
      case "restricted":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      case "unrestricted":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "temporarily_restricted":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "permanently_restricted":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  const getFundTypeLabel = (type: string) => {
    switch (type) {
      case "restricted":
        return "Restricted";
      case "unrestricted":
        return "Unrestricted";
      case "temporarily_restricted":
        return "Temp. Restricted";
      case "permanently_restricted":
        return "Perm. Restricted";
      default:
        return type;
    }
  };

  // Calculate totals by fund type
  const totalUnrestricted = funds
    .filter(f => f.fundType === "unrestricted")
    .reduce((sum, f) => sum + parseFloat(f.currentBalance), 0);

  const totalRestricted = funds
    .filter(f => f.fundType !== "unrestricted")
    .reduce((sum, f) => sum + parseFloat(f.currentBalance), 0);

  const totalAllFunds = funds.reduce((sum, f) => sum + parseFloat(f.currentBalance), 0);

  return (
    <div className="container mx-auto p-6 space-y-6" data-testid="page-funds">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold" data-testid="heading-funds">Fund Accounting</h1>
          <p className="text-muted-foreground">
            Manage restricted and unrestricted funds for nonprofit accountability
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-fund">
              <Plus className="mr-2 h-4 w-4" />
              Create Fund
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Fund</DialogTitle>
              <DialogDescription>
                Add a new fund to track restricted or unrestricted resources.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Fund Name *</Label>
                <Input
                  id="name"
                  data-testid="input-fund-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="General Operating Fund"
                />
              </div>
              <div>
                <Label htmlFor="fundType">Fund Type *</Label>
                <Select 
                  value={formData.fundType} 
                  onValueChange={(value: any) => setFormData({ ...formData, fundType: value })}
                >
                  <SelectTrigger id="fundType" data-testid="select-fund-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unrestricted">Unrestricted</SelectItem>
                    <SelectItem value="restricted">Restricted</SelectItem>
                    <SelectItem value="temporarily_restricted">Temporarily Restricted</SelectItem>
                    <SelectItem value="permanently_restricted">Permanently Restricted</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  data-testid="input-fund-description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Purpose and details of this fund"
                  rows={3}
                />
              </div>
              {formData.fundType !== "unrestricted" && (
                <div>
                  <Label htmlFor="restrictions">Restrictions</Label>
                  <Textarea
                    id="restrictions"
                    data-testid="input-fund-restrictions"
                    value={formData.restrictions}
                    onChange={(e) => setFormData({ ...formData, restrictions: e.target.value })}
                    placeholder="Describe how this fund must be used"
                    rows={3}
                  />
                </div>
              )}
              <div>
                <Label htmlFor="currentBalance">Initial Balance</Label>
                <Input
                  id="currentBalance"
                  data-testid="input-fund-balance"
                  type="number"
                  step="0.01"
                  value={formData.currentBalance}
                  onChange={(e) => setFormData({ ...formData, currentBalance: e.target.value })}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => setIsCreateDialogOpen(false)}
                  data-testid="button-cancel-create"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={() => createFundMutation.mutate()}
                  disabled={createFundMutation.isPending}
                  data-testid="button-submit-create-fund"
                >
                  {createFundMutation.isPending ? "Creating..." : "Create Fund"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Unrestricted</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-unrestricted">
              {formatCurrency(totalUnrestricted, currentOrganization.currency)}
            </div>
            <p className="text-xs text-muted-foreground">
              Available for general use
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Restricted</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-restricted">
              {formatCurrency(totalRestricted, currentOrganization.currency)}
            </div>
            <p className="text-xs text-muted-foreground">
              With donor restrictions
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Net Assets</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-all-funds">
              {formatCurrency(totalAllFunds, currentOrganization.currency)}
            </div>
            <p className="text-xs text-muted-foreground">
              All funds combined
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Funds List */}
      {isLoading ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading funds...</p>
        </div>
      ) : funds.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <Wallet className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Funds Yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first fund to start tracking restricted and unrestricted resources.
              </p>
              <Button onClick={() => setIsCreateDialogOpen(true)} data-testid="button-create-first-fund">
                <Plus className="mr-2 h-4 w-4" />
                Create Your First Fund
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {funds.map((fund) => (
            <Card key={fund.id} className="hover-elevate" data-testid={`card-fund-${fund.id}`}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="text-lg" data-testid={`text-fund-name-${fund.id}`}>
                      {fund.name}
                    </CardTitle>
                    <Badge className={`mt-2 ${getFundTypeColor(fund.fundType)}`} data-testid={`badge-fund-type-${fund.id}`}>
                      {getFundTypeLabel(fund.fundType)}
                    </Badge>
                  </div>
                </div>
                {fund.description && (
                  <CardDescription className="mt-2" data-testid={`text-fund-description-${fund.id}`}>
                    {fund.description}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Current Balance</p>
                    <p className="text-2xl font-bold" data-testid={`text-fund-balance-${fund.id}`}>
                      {formatCurrency(parseFloat(fund.currentBalance), currentOrganization.currency)}
                    </p>
                  </div>
                  {fund.restrictions && (
                    <div>
                      <p className="text-sm text-muted-foreground">Restrictions</p>
                      <p className="text-sm" data-testid={`text-fund-restrictions-${fund.id}`}>
                        {fund.restrictions}
                      </p>
                    </div>
                  )}
                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleViewTransactions(fund.id)}
                      data-testid={`button-view-transactions-${fund.id}`}
                    >
                      <List className="h-4 w-4 mr-1" />
                      Transactions
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(fund)}
                      data-testid={`button-edit-fund-${fund.id}`}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (confirm(`Are you sure you want to delete ${fund.name}?`)) {
                          deleteFundMutation.mutate(fund.id);
                        }
                      }}
                      data-testid={`button-delete-fund-${fund.id}`}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Fund</DialogTitle>
            <DialogDescription>
              Update fund information and restrictions.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-name">Fund Name *</Label>
              <Input
                id="edit-name"
                data-testid="input-edit-fund-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="edit-fundType">Fund Type *</Label>
              <Select 
                value={formData.fundType} 
                onValueChange={(value: any) => setFormData({ ...formData, fundType: value })}
              >
                <SelectTrigger id="edit-fundType" data-testid="select-edit-fund-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unrestricted">Unrestricted</SelectItem>
                  <SelectItem value="restricted">Restricted</SelectItem>
                  <SelectItem value="temporarily_restricted">Temporarily Restricted</SelectItem>
                  <SelectItem value="permanently_restricted">Permanently Restricted</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                data-testid="input-edit-fund-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>
            {formData.fundType !== "unrestricted" && (
              <div>
                <Label htmlFor="edit-restrictions">Restrictions</Label>
                <Textarea
                  id="edit-restrictions"
                  data-testid="input-edit-fund-restrictions"
                  value={formData.restrictions}
                  onChange={(e) => setFormData({ ...formData, restrictions: e.target.value })}
                  rows={3}
                />
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button 
                variant="outline" 
                onClick={() => {
                  setIsEditDialogOpen(false);
                  setEditingFund(null);
                  resetForm();
                }}
                data-testid="button-cancel-edit"
              >
                Cancel
              </Button>
              <Button 
                onClick={() => updateFundMutation.mutate()}
                disabled={updateFundMutation.isPending}
                data-testid="button-submit-edit-fund"
              >
                {updateFundMutation.isPending ? "Updating..." : "Update Fund"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Transactions Dialog */}
      <Dialog open={isTransactionsDialogOpen} onOpenChange={setIsTransactionsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Fund Transactions</DialogTitle>
            <DialogDescription>
              View all transactions associated with this fund.
            </DialogDescription>
          </DialogHeader>
          {isLoadingTransactions ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Loading transactions...</p>
            </div>
          ) : fundTransactions.length === 0 ? (
            <div className="text-center py-8">
              <DollarSign className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No transactions found for this fund.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {fundTransactions.map((transaction) => (
                <Card key={transaction.id} data-testid={`transaction-${transaction.id}`}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-medium" data-testid={`transaction-description-${transaction.id}`}>
                          {transaction.description}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(transaction.date).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className={`font-bold ${transaction.type === 'income' ? 'text-green-600' : 'text-red-600'}`} data-testid={`transaction-amount-${transaction.id}`}>
                          {transaction.type === 'income' ? '+' : '-'}
                          {formatCurrency(parseFloat(transaction.amount), currentOrganization.currency)}
                        </p>
                        <Badge variant="outline" data-testid={`transaction-type-${transaction.id}`}>
                          {transaction.type}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
