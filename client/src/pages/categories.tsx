import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Tag } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Category, Organization } from "@shared/schema";

interface CategoriesProps {
  currentOrganization: Organization;
  userId: string;
}

export default function Categories({ currentOrganization, userId }: CategoriesProps) {
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryType, setNewCategoryType] = useState<"income" | "expense">("expense");

  const { data: categories = [], isLoading } = useQuery<Category[]>({
    queryKey: [`/api/categories/${currentOrganization.id}`],
  });

  const createCategoryMutation = useMutation({
    mutationFn: async () => {
      if (!newCategoryName.trim()) {
        throw new Error("Category name is required");
      }
      return await apiRequest('POST', '/api/categories', {
        organizationId: currentOrganization.id,
        name: newCategoryName.trim(),
        type: newCategoryType,
        createdBy: userId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/categories/${currentOrganization.id}`] });
      toast({
        title: "Category created",
        description: `${newCategoryName} has been added successfully.`,
      });
      setIsCreateDialogOpen(false);
      setNewCategoryName("");
      setNewCategoryType("expense");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create category. Please try again.",
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
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete category. It may be in use by transactions.",
        variant: "destructive",
      });
    },
  });

  const incomeCategories = categories.filter(c => c.type === 'income');
  const expenseCategories = categories.filter(c => c.type === 'expense');

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-page-title">Categories</h1>
          <p className="text-muted-foreground">Organize your income and expenses</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-category">
              <Plus className="w-4 h-4 mr-2" />
              Create Category
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Category</DialogTitle>
              <DialogDescription>
                Add a new income or expense category for your organization
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="category-name">Category Name</Label>
                <Input
                  id="category-name"
                  placeholder="e.g., Office Supplies, Marketing"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  data-testid="input-category-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category-type">Type</Label>
                <Select
                  value={newCategoryType}
                  onValueChange={(value: "income" | "expense") => setNewCategoryType(value)}
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
              <Button
                onClick={() => createCategoryMutation.mutate()}
                disabled={createCategoryMutation.isPending || !newCategoryName.trim()}
                className="w-full"
                data-testid="button-create-category-submit"
              >
                {createCategoryMutation.isPending ? "Creating..." : "Create Category"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Expense Categories */}
      <Card>
        <CardHeader>
          <CardTitle>Expense Categories</CardTitle>
          <CardDescription>
            Categories for tracking expenses and spending
          </CardDescription>
        </CardHeader>
        <CardContent>
          {expenseCategories.length === 0 ? (
            <div className="text-center py-8">
              <Tag className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
              <p className="text-sm text-muted-foreground">No expense categories yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Create your first expense category to start organizing
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {expenseCategories.map((category) => (
                <div
                  key={category.id}
                  className="flex items-center justify-between p-3 rounded-md bg-muted/50 hover-elevate"
                  data-testid={`category-${category.id}`}
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <Tag className="h-4 w-4 text-chart-3 flex-shrink-0" />
                    <span className="text-sm font-medium truncate">{category.name}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 flex-shrink-0"
                    onClick={() => deleteCategoryMutation.mutate(category.id)}
                    disabled={deleteCategoryMutation.isPending}
                    data-testid={`button-delete-category-${category.id}`}
                  >
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Income Categories */}
      <Card>
        <CardHeader>
          <CardTitle>Income Categories</CardTitle>
          <CardDescription>
            Categories for tracking income and revenue
          </CardDescription>
        </CardHeader>
        <CardContent>
          {incomeCategories.length === 0 ? (
            <div className="text-center py-8">
              <Tag className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
              <p className="text-sm text-muted-foreground">No income categories yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Create your first income category to start organizing
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {incomeCategories.map((category) => (
                <div
                  key={category.id}
                  className="flex items-center justify-between p-3 rounded-md bg-muted/50 hover-elevate"
                  data-testid={`category-${category.id}`}
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <Tag className="h-4 w-4 text-chart-2 flex-shrink-0" />
                    <span className="text-sm font-medium truncate">{category.name}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 flex-shrink-0"
                    onClick={() => deleteCategoryMutation.mutate(category.id)}
                    disabled={deleteCategoryMutation.isPending}
                    data-testid={`button-delete-category-${category.id}`}
                  >
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
