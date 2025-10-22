import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Gift } from "lucide-react";
import { format } from "date-fns";
import type { Organization, Grant, InsertGrant } from "@shared/schema";

interface GrantsProps {
  currentOrganization: Organization;
}

interface GrantWithSpent extends Grant {
  totalSpent: string;
}

export default function Grants({ currentOrganization }: GrantsProps) {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<InsertGrant>>({
    organizationId: currentOrganization.id,
    name: '',
    amount: '',
    restrictions: '',
    status: 'active',
    startDate: null,
    endDate: null,
  });

  const { data: grants, isLoading, error } = useQuery<GrantWithSpent[]>({
    queryKey: [`/api/grants/${currentOrganization.id}`],
    retry: false,
  });

  useEffect(() => {
    if (error && isUnauthorizedError(error as Error)) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
    }
  }, [error, toast]);

  const createMutation = useMutation({
    mutationFn: async (data: InsertGrant) => {
      return await apiRequest('POST', '/api/grants', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/grants/${currentOrganization.id}`] });
      toast({
        title: "Grant created",
        description: "Your grant has been added successfully.",
      });
      setIsDialogOpen(false);
      setFormData({
        organizationId: currentOrganization.id,
        name: '',
        amount: '',
        restrictions: '',
        status: 'active',
        startDate: null,
        endDate: null,
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error as Error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to create grant. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.amount) {
      toast({
        title: "Missing fields",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }
    createMutation.mutate(formData as InsertGrant);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-9 w-32" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-64 w-full" />
          ))}
        </div>
      </div>
    );
  }

  const getStatusVariant = (status: string): "default" | "secondary" | "outline" => {
    switch (status) {
      case 'active':
        return 'default';
      case 'completed':
        return 'secondary';
      case 'pending':
        return 'outline';
      default:
        return 'default';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-foreground">Grants</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {currentOrganization.name}
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-grant">
              <Plus className="h-4 w-4 mr-2" />
              Add Grant
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Add Grant</DialogTitle>
              <DialogDescription>
                Record a new grant for {currentOrganization.name}.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="name">Grant Name</Label>
                <Input
                  id="name"
                  placeholder="e.g., Community Development Grant"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  data-testid="input-grant-name"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount">Total Amount</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  data-testid="input-grant-amount"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value: 'active' | 'completed' | 'pending') => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger id="status" data-testid="select-grant-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startDate">Start Date</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={formData.startDate || ''}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value || null })}
                    data-testid="input-grant-start-date"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="endDate">End Date</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={formData.endDate || ''}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value || null })}
                    data-testid="input-grant-end-date"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="restrictions">Restrictions (Optional)</Label>
                <Textarea
                  id="restrictions"
                  placeholder="Any specific requirements or restrictions for this grant..."
                  value={formData.restrictions || ''}
                  onChange={(e) => setFormData({ ...formData, restrictions: e.target.value })}
                  data-testid="input-grant-restrictions"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                  data-testid="button-cancel-grant"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending}
                  data-testid="button-submit-grant"
                >
                  {createMutation.isPending ? "Creating..." : "Create Grant"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Grants Grid */}
      {!grants || grants.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <div className="h-12 w-12 rounded-md bg-muted mx-auto mb-4 flex items-center justify-center">
                <Gift className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">No grants yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Click 'Add Grant' to start tracking grants
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {grants.map((grant) => {
            const totalAmount = parseFloat(grant.amount);
            const totalSpent = parseFloat(grant.totalSpent);
            const remaining = totalAmount - totalSpent;
            const percentSpent = (totalSpent / totalAmount) * 100;

            return (
              <Card key={grant.id} data-testid={`grant-card-${grant.id}`}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-lg">{grant.name}</CardTitle>
                    <Badge variant={getStatusVariant(grant.status)}>
                      {grant.status}
                    </Badge>
                  </div>
                  {grant.restrictions && (
                    <CardDescription className="mt-2">
                      {grant.restrictions}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-muted-foreground">Progress</span>
                      <span className="font-mono font-medium">
                        {percentSpent.toFixed(1)}%
                      </span>
                    </div>
                    <Progress value={percentSpent} className="h-2" />
                  </div>

                  <div className="grid grid-cols-3 gap-4 pt-2">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Total</p>
                      <p className="text-base font-mono font-medium text-foreground">
                        ${totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Spent</p>
                      <p className="text-base font-mono font-medium text-chart-3">
                        ${totalSpent.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Remaining</p>
                      <p className="text-base font-mono font-medium text-chart-2">
                        ${remaining.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>

                  {(grant.startDate || grant.endDate) && (
                    <div className="pt-2 border-t border-border">
                      <div className="flex gap-4 text-xs text-muted-foreground">
                        {grant.startDate && (
                          <span>
                            Start: {format(new Date(grant.startDate), 'MMM dd, yyyy')}
                          </span>
                        )}
                        {grant.endDate && (
                          <span>
                            End: {format(new Date(grant.endDate), 'MMM dd, yyyy')}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
