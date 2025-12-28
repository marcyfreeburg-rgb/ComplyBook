import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Tag, ArrowLeft, Pencil, FolderPlus, Receipt } from "lucide-react";
import { Link } from "wouter";
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
  const [newCategoryTaxDeductible, setNewCategoryTaxDeductible] = useState(true);
  
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editCategoryName, setEditCategoryName] = useState("");
  const [editCategoryType, setEditCategoryType] = useState<"income" | "expense">("expense");
  const [editParentCategoryId, setEditParentCategoryId] = useState<number | null>(null);
  const [editCategoryTaxDeductible, setEditCategoryTaxDeductible] = useState(true);
  
  const [creatingSubcategoryFor, setCreatingSubcategoryFor] = useState<Category | null>(null);
  const [subcategoryName, setSubcategoryName] = useState("");

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
        taxDeductible: newCategoryTaxDeductible,
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
      setNewCategoryTaxDeductible(true);
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

  const updateCategoryMutation = useMutation({
    mutationFn: async () => {
      if (!editingCategory || !editCategoryName.trim()) {
        throw new Error("Category name is required");
      }
      return await apiRequest('PATCH', `/api/categories/${editingCategory.id}`, {
        name: editCategoryName.trim(),
        type: editCategoryType,
        parentCategoryId: editParentCategoryId,
        taxDeductible: editCategoryTaxDeductible,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/categories/${currentOrganization.id}`] });
      toast({
        title: "Category updated",
        description: `${editCategoryName} has been updated successfully.`,
      });
      setEditingCategory(null);
      setEditCategoryName("");
      setEditCategoryType("expense");
      setEditParentCategoryId(null);
      setEditCategoryTaxDeductible(true);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update category. Please try again.",
        variant: "destructive",
      });
    },
  });

  const createSubcategoryMutation = useMutation({
    mutationFn: async () => {
      if (!creatingSubcategoryFor || !subcategoryName.trim()) {
        throw new Error("Subcategory name is required");
      }
      return await apiRequest('POST', '/api/categories', {
        organizationId: currentOrganization.id,
        name: subcategoryName.trim(),
        type: creatingSubcategoryFor.type,
        parentCategoryId: creatingSubcategoryFor.id,
        createdBy: userId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/categories/${currentOrganization.id}`] });
      toast({
        title: "Subcategory created",
        description: `${subcategoryName} has been added successfully.`,
      });
      setCreatingSubcategoryFor(null);
      setSubcategoryName("");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create subcategory. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleEditCategory = (category: Category) => {
    setEditingCategory(category);
    setEditCategoryName(category.name);
    setEditCategoryType(category.type);
    setEditParentCategoryId(category.parentCategoryId ?? null);
    setEditCategoryTaxDeductible(category.taxDeductible);
  };

  // Separate parent and child categories, sorted alphabetically
  const parentIncomeCategories = categories
    .filter(c => c.type === 'income' && !c.parentCategoryId)
    .sort((a, b) => a.name.localeCompare(b.name));
  
  const parentExpenseCategories = categories
    .filter(c => c.type === 'expense' && !c.parentCategoryId)
    .sort((a, b) => a.name.localeCompare(b.name));
  
  const getSubcategories = (parentId: number) => {
    return categories
      .filter(c => c.parentCategoryId === parentId)
      .sort((a, b) => a.name.localeCompare(b.name));
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-page-title">Categories</h1>
          <p className="text-muted-foreground">Organize your income and expenses</p>
        </div>
        <Link href="/">
          <Button variant="outline" size="sm" data-testid="button-back-dashboard">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </Link>
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
              {newCategoryType === "expense" && (
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="category-tax-deductible"
                    checked={newCategoryTaxDeductible}
                    onCheckedChange={(checked) => setNewCategoryTaxDeductible(checked === true)}
                    data-testid="checkbox-category-tax-deductible"
                  />
                  <Label htmlFor="category-tax-deductible" className="text-sm font-normal cursor-pointer">
                    Tax deductible expense
                  </Label>
                </div>
              )}
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

      {/* Edit Category Dialog */}
      <Dialog open={editingCategory !== null} onOpenChange={(open) => !open && setEditingCategory(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Category</DialogTitle>
            <DialogDescription>
              Update the category name, type, or parent category
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="edit-category-name">Category Name</Label>
              <Input
                id="edit-category-name"
                placeholder="e.g., Office Supplies, Marketing"
                value={editCategoryName}
                onChange={(e) => setEditCategoryName(e.target.value)}
                data-testid="input-edit-category-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-category-type">Type</Label>
              <Select
                value={editCategoryType}
                onValueChange={(value: "income" | "expense") => setEditCategoryType(value)}
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
            {editCategoryType === "expense" && (
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="edit-category-tax-deductible"
                  checked={editCategoryTaxDeductible}
                  onCheckedChange={(checked) => setEditCategoryTaxDeductible(checked === true)}
                  data-testid="checkbox-edit-category-tax-deductible"
                />
                <Label htmlFor="edit-category-tax-deductible" className="text-sm font-normal cursor-pointer">
                  Tax deductible expense
                </Label>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="edit-parent-category">Parent Category (Optional)</Label>
              <Select
                value={editParentCategoryId?.toString() ?? "none"}
                onValueChange={(value) => setEditParentCategoryId(value === "none" ? null : parseInt(value))}
              >
                <SelectTrigger id="edit-parent-category" data-testid="select-edit-parent-category">
                  <SelectValue placeholder="None (Top-level category)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None (Top-level category)</SelectItem>
                  {categories
                    .filter(c => 
                      c.type === editCategoryType && 
                      !c.parentCategoryId && 
                      c.id !== editingCategory?.id
                    )
                    .map(cat => (
                      <SelectItem key={cat.id} value={cat.id.toString()}>
                        {cat.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={() => updateCategoryMutation.mutate()}
              disabled={updateCategoryMutation.isPending || !editCategoryName.trim()}
              className="w-full"
              data-testid="button-update-category"
            >
              {updateCategoryMutation.isPending ? "Updating..." : "Update Category"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Subcategory Dialog */}
      <Dialog open={creatingSubcategoryFor !== null} onOpenChange={(open) => !open && setCreatingSubcategoryFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Subcategory</DialogTitle>
            <DialogDescription>
              Add a subcategory under "{creatingSubcategoryFor?.name}"
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="subcategory-name">Subcategory Name</Label>
              <Input
                id="subcategory-name"
                placeholder="e.g., Digital Ads, Print Ads"
                value={subcategoryName}
                onChange={(e) => setSubcategoryName(e.target.value)}
                data-testid="input-subcategory-name"
              />
            </div>
            <Button
              onClick={() => createSubcategoryMutation.mutate()}
              disabled={createSubcategoryMutation.isPending || !subcategoryName.trim()}
              className="w-full"
              data-testid="button-create-subcategory"
            >
              {createSubcategoryMutation.isPending ? "Creating..." : "Create Subcategory"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Expense Categories */}
      <Card>
        <CardHeader>
          <CardTitle>Expense Categories</CardTitle>
          <CardDescription>
            Categories for tracking expenses and spending
          </CardDescription>
        </CardHeader>
        <CardContent>
          {parentExpenseCategories.length === 0 ? (
            <div className="text-center py-8">
              <Tag className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
              <p className="text-sm text-muted-foreground">No expense categories yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Create your first expense category to start organizing
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {parentExpenseCategories.map((category) => {
                const subcategories = getSubcategories(category.id);
                return (
                  <div key={category.id} className="space-y-1">
                    {/* Parent Category */}
                    <div
                      className="flex items-center justify-between p-3 rounded-md bg-muted/50 hover-elevate"
                      data-testid={`category-${category.id}`}
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <Tag className="h-4 w-4 text-chart-3 flex-shrink-0" />
                        <span className="text-sm font-medium truncate">{category.name}</span>
                        {subcategories.length > 0 && (
                          <Badge variant="secondary" className="text-xs">
                            {subcategories.length}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 flex-shrink-0"
                          onClick={() => setCreatingSubcategoryFor(category)}
                          data-testid={`button-add-subcategory-${category.id}`}
                          title="Add subcategory"
                        >
                          <FolderPlus className="h-4 w-4 text-muted-foreground" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 flex-shrink-0"
                          onClick={() => handleEditCategory(category)}
                          data-testid={`button-edit-category-${category.id}`}
                        >
                          <Pencil className="h-4 w-4 text-muted-foreground" />
                        </Button>
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
                    </div>

                    {/* Subcategories */}
                    {subcategories.map((subcategory) => (
                      <div
                        key={subcategory.id}
                        className="flex items-center justify-between p-2 pl-8 rounded-md bg-muted/30 hover-elevate ml-6"
                        data-testid={`category-${subcategory.id}`}
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <Tag className="h-3 w-3 text-chart-3 flex-shrink-0 opacity-60" />
                          <span className="text-sm truncate">{subcategory.name}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 flex-shrink-0"
                            onClick={() => handleEditCategory(subcategory)}
                            data-testid={`button-edit-category-${subcategory.id}`}
                          >
                            <Pencil className="h-3 w-3 text-muted-foreground" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 flex-shrink-0"
                            onClick={() => deleteCategoryMutation.mutate(subcategory.id)}
                            disabled={deleteCategoryMutation.isPending}
                            data-testid={`button-delete-category-${subcategory.id}`}
                          >
                            <Trash2 className="h-3 w-3 text-muted-foreground" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })}
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
          {parentIncomeCategories.length === 0 ? (
            <div className="text-center py-8">
              <Tag className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
              <p className="text-sm text-muted-foreground">No income categories yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Create your first income category to start organizing
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {parentIncomeCategories.map((category) => {
                const subcategories = getSubcategories(category.id);
                return (
                  <div key={category.id} className="space-y-1">
                    {/* Parent Category */}
                    <div
                      className="flex items-center justify-between p-3 rounded-md bg-muted/50 hover-elevate"
                      data-testid={`category-${category.id}`}
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <Tag className="h-4 w-4 text-chart-2 flex-shrink-0" />
                        <span className="text-sm font-medium truncate">{category.name}</span>
                        {subcategories.length > 0 && (
                          <Badge variant="secondary" className="text-xs">
                            {subcategories.length}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 flex-shrink-0"
                          onClick={() => setCreatingSubcategoryFor(category)}
                          data-testid={`button-add-subcategory-${category.id}`}
                          title="Add subcategory"
                        >
                          <FolderPlus className="h-4 w-4 text-muted-foreground" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 flex-shrink-0"
                          onClick={() => handleEditCategory(category)}
                          data-testid={`button-edit-category-${category.id}`}
                        >
                          <Pencil className="h-4 w-4 text-muted-foreground" />
                        </Button>
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
                    </div>

                    {/* Subcategories */}
                    {subcategories.map((subcategory) => (
                      <div
                        key={subcategory.id}
                        className="flex items-center justify-between p-2 pl-8 rounded-md bg-muted/30 hover-elevate ml-6"
                        data-testid={`category-${subcategory.id}`}
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <Tag className="h-3 w-3 text-chart-2 flex-shrink-0 opacity-60" />
                          <span className="text-sm truncate">{subcategory.name}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 flex-shrink-0"
                            onClick={() => handleEditCategory(subcategory)}
                            data-testid={`button-edit-category-${subcategory.id}`}
                          >
                            <Pencil className="h-3 w-3 text-muted-foreground" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 flex-shrink-0"
                            onClick={() => deleteCategoryMutation.mutate(subcategory.id)}
                            disabled={deleteCategoryMutation.isPending}
                            data-testid={`button-delete-category-${subcategory.id}`}
                          >
                            <Trash2 className="h-3 w-3 text-muted-foreground" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
