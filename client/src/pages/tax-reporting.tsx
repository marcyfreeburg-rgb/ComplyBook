import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { FileText, Plus, Download, CheckCircle2, XCircle, Sparkles, AlertTriangle, ArrowRight, Loader2, Info } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { Organization, TaxCategory, TaxReport, TaxForm1099, InsertTaxCategory, InsertTaxForm1099, Category } from "@shared/schema";
import { insertTaxCategorySchema, insertTaxForm1099Schema } from "@shared/schema";
import { format } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const currentYear = new Date().getFullYear();

function TaxDisclaimer({ variant = "default" }: { variant?: "default" | "ai" }) {
  return (
    <Alert className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30">
      <Info className="h-4 w-4 text-amber-600 dark:text-amber-500" />
      <AlertTitle className="text-amber-800 dark:text-amber-400 text-sm font-medium">Important Tax Disclaimer</AlertTitle>
      <AlertDescription className="text-amber-700 dark:text-amber-300 text-xs">
        {variant === "ai" ? (
          <>
            This AI analysis is for informational purposes only and does not constitute tax advice. 
            Based on IRS Publications 334, 463, 535 (last revised 2022), and 587 as of {currentYear}. 
            Tax laws change frequently. Please consult a qualified tax professional before making tax decisions.
          </>
        ) : (
          <>
            This information is for general guidance only and does not constitute tax advice. 
            Based on IRS guidelines as of {currentYear}. Please consult a qualified tax professional 
            for advice specific to your situation.
          </>
        )}
      </AlertDescription>
    </Alert>
  );
}

interface TaxDeductibilitySuggestion {
  categoryId: number;
  categoryName: string;
  currentlyDeductible: boolean;
  suggestedDeductible: boolean;
  confidence: number;
  irsCategory: string;
  reasoning: string;
  deductionPercentage?: number;
  irsReference?: string;
}

interface TaxAnalysisResult {
  suggestions: TaxDeductibilitySuggestion[];
  summary: {
    totalCategories: number;
    correctlyClassified: number;
    suggestedChanges: number;
    fullyDeductible: number;
    partiallyDeductible: number;
    nonDeductible: number;
  };
  analysisDate: string;
}

interface TaxReportingProps {
  currentOrganization: Organization;
}

export default function TaxReporting({ currentOrganization }: TaxReportingProps) {
  const { toast } = useToast();
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [is1099DialogOpen, setIs1099DialogOpen] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [aiAnalysisResult, setAiAnalysisResult] = useState<TaxAnalysisResult | null>(null);
  const [appliedSuggestions, setAppliedSuggestions] = useState<Set<number>>(new Set());

  const categoryForm = useForm<InsertTaxCategory>({
    resolver: zodResolver(insertTaxCategorySchema.omit({ organizationId: true })),
    defaultValues: {
      name: "",
      description: "",
      isDeductible: 1,
    },
  });

  const form1099Form = useForm<InsertTaxForm1099>({
    resolver: zodResolver(insertTaxForm1099Schema.omit({ organizationId: true, createdBy: true })),
    defaultValues: {
      taxYear: new Date().getFullYear(),
      formType: "1099_nec",
      totalAmount: "",
      recipientName: "",
      recipientTin: "",
      recipientAddress: "",
      isFiled: 0,
      notes: "",
    },
  });

  const { data: taxCategories } = useQuery<TaxCategory[]>({
    queryKey: ['/api/tax-categories', currentOrganization.id],
    enabled: !!currentOrganization.id,
  });

  const { data: taxReports } = useQuery<TaxReport[]>({
    queryKey: ['/api/tax-reports', currentOrganization.id, selectedYear],
    enabled: !!currentOrganization.id,
  });

  const { data: form1099s } = useQuery<Array<TaxForm1099 & { vendorName: string }>>({
    queryKey: ['/api/tax-form-1099s', currentOrganization.id, selectedYear],
    enabled: !!currentOrganization.id,
  });

  const createCategoryMutation = useMutation({
    mutationFn: async (data: InsertTaxCategory) => {
      return await apiRequest('POST', `/api/tax-categories/${currentOrganization.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tax-categories', currentOrganization.id] });
      toast({ title: "Tax category created successfully" });
      setIsCategoryDialogOpen(false);
      categoryForm.reset();
    },
    onError: () => {
      toast({ title: "Failed to create tax category", variant: "destructive" });
    },
  });

  const create1099Mutation = useMutation({
    mutationFn: async (data: InsertTaxForm1099) => {
      return await apiRequest('POST', `/api/tax-form-1099s/${currentOrganization.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tax-form-1099s', currentOrganization.id, selectedYear] });
      toast({ title: "1099 form created successfully" });
      setIs1099DialogOpen(false);
      form1099Form.reset();
    },
    onError: () => {
      toast({ title: "Failed to create 1099 form", variant: "destructive" });
    },
  });

  const generateTaxReportMutation = useMutation({
    mutationFn: async (taxYear: number) => {
      return await apiRequest('POST', `/api/tax-reports/${currentOrganization.id}/generate`, { taxYear });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tax-reports', currentOrganization.id] });
      toast({ title: "Tax report generated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to generate tax report", variant: "destructive" });
    },
  });

  const runAiAnalysisMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', `/api/ai-tax-analysis/${currentOrganization.id}`, {});
      return response.json();
    },
    onSuccess: (data: TaxAnalysisResult) => {
      setAiAnalysisResult(data);
      setAppliedSuggestions(new Set());
      toast({ 
        title: "AI Analysis Complete", 
        description: `Analyzed ${data.summary.totalCategories} categories. ${data.summary.suggestedChanges} changes recommended.` 
      });
    },
    onError: (error: any) => {
      toast({ 
        title: "AI Analysis Failed", 
        description: error.message || "Could not complete the analysis. Make sure AI integration is configured.",
        variant: "destructive" 
      });
    },
  });

  const applySuggestionMutation = useMutation({
    mutationFn: async ({ categoryId, taxDeductible }: { categoryId: number; taxDeductible: boolean }) => {
      const response = await apiRequest('PATCH', `/api/categories/${categoryId}/tax-deductible`, { taxDeductible });
      return response.json();
    },
    onSuccess: (_, { categoryId }) => {
      setAppliedSuggestions(prev => new Set([...prev, categoryId]));
      queryClient.invalidateQueries({ queryKey: ['/api/categories', currentOrganization.id] });
      toast({ title: "Category updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update category", variant: "destructive" });
    },
  });

  const applyAllSuggestionsMutation = useMutation({
    mutationFn: async (suggestions: TaxDeductibilitySuggestion[]) => {
      const changesToApply = suggestions.filter(s => 
        s.currentlyDeductible !== s.suggestedDeductible && 
        !appliedSuggestions.has(s.categoryId) &&
        typeof s.suggestedDeductible === 'boolean'
      );
      
      const results = { success: 0, failed: 0, successIds: [] as number[] };
      
      // Process in parallel batches of 5 for speed
      const batchSize = 5;
      for (let i = 0; i < changesToApply.length; i += batchSize) {
        const batch = changesToApply.slice(i, i + batchSize);
        const batchResults = await Promise.allSettled(
          batch.map(suggestion => 
            apiRequest('PATCH', `/api/categories/${suggestion.categoryId}/tax-deductible`, { 
              taxDeductible: suggestion.suggestedDeductible 
            }).then(() => suggestion.categoryId)
          )
        );
        
        for (const result of batchResults) {
          if (result.status === 'fulfilled') {
            results.success++;
            results.successIds.push(result.value);
          } else {
            results.failed++;
          }
        }
      }
      
      return results;
    },
    onSuccess: (results) => {
      // Update applied suggestions with successful ones
      setAppliedSuggestions(prev => {
        const newSet = new Set(prev);
        results.successIds.forEach(id => newSet.add(id));
        return newSet;
      });
      queryClient.invalidateQueries({ queryKey: ['/api/categories', currentOrganization.id] });
      
      if (results.failed > 0) {
        toast({ 
          title: "Suggestions partially applied", 
          description: `Updated ${results.success} categories. ${results.failed} failed.`,
          variant: "default"
        });
      } else {
        toast({ 
          title: "All suggestions applied", 
          description: `Updated ${results.success} categories based on IRS guidelines.` 
        });
      }
    },
    onError: () => {
      toast({ title: "Failed to apply suggestions", variant: "destructive" });
    },
  });

  const onCategorySubmit = (data: InsertTaxCategory) => {
    createCategoryMutation.mutate(data);
  };

  const on1099Submit = (data: InsertTaxForm1099) => {
    create1099Mutation.mutate(data);
  };

  const handleGenerateReport = () => {
    generateTaxReportMutation.mutate(selectedYear);
  };

  const isNonProfit = currentOrganization.type === 'nonprofit';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tax Reporting</h1>
          <p className="text-muted-foreground">
            Manage tax categories, generate year-end reports, and track {isNonProfit ? 'Form 990' : '1099 forms'}
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={selectedYear.toString()} onValueChange={(value) => setSelectedYear(parseInt(value))}>
            <SelectTrigger className="w-32" data-testid="select-tax-year">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[0, 1, 2, 3, 4].map((offset) => {
                const year = new Date().getFullYear() - offset;
                return (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
          <Button onClick={handleGenerateReport} disabled={generateTaxReportMutation.isPending} data-testid="button-generate-report">
            <FileText className="mr-2 h-4 w-4" />
            {generateTaxReportMutation.isPending ? "Generating..." : "Generate Year-End Report"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tax Categories</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-categories-count">
              {taxCategories?.length || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tax Reports</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-reports-count">
              {taxReports?.length || 0}
            </div>
          </CardContent>
        </Card>

        {!isNonProfit && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">1099 Forms</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-1099s-count">
                {form1099s?.length || 0}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <Tabs defaultValue="categories" className="space-y-4">
        <TabsList>
          <TabsTrigger value="categories" data-testid="tab-categories">Tax Categories</TabsTrigger>
          <TabsTrigger value="reports" data-testid="tab-reports">Year-End Reports</TabsTrigger>
          {!isNonProfit && <TabsTrigger value="1099s" data-testid="tab-1099s">1099 Forms</TabsTrigger>}
          {!isNonProfit && <TabsTrigger value="ai-analysis" data-testid="tab-ai-analysis">AI Tax Analysis</TabsTrigger>}
        </TabsList>

        <TabsContent value="categories" className="space-y-4">
          <TaxDisclaimer />
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Tax Categories</CardTitle>
                  <CardDescription>Define tax-deductible expense categories</CardDescription>
                </div>
                <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
                  <DialogTrigger asChild>
                    <Button data-testid="button-create-category">
                      <Plus className="mr-2 h-4 w-4" />
                      Add Category
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create Tax Category</DialogTitle>
                      <DialogDescription>Define a new tax category for your organization</DialogDescription>
                    </DialogHeader>
                    <Form {...categoryForm}>
                      <form onSubmit={categoryForm.handleSubmit(onCategorySubmit)} className="space-y-4">
                        <FormField
                          control={categoryForm.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Category Name</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="e.g., Office Supplies" data-testid="input-category-name" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={categoryForm.control}
                          name="description"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Description</FormLabel>
                              <FormControl>
                                <Textarea 
                                  {...field} 
                                  value={field.value || ''}
                                  placeholder="Describe this category..." 
                                  data-testid="input-category-description" 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={categoryForm.control}
                          name="isDeductible"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Is Tax Deductible?</FormLabel>
                              <Select
                                value={field.value?.toString()}
                                onValueChange={(value) => field.onChange(parseInt(value))}
                              >
                                <FormControl>
                                  <SelectTrigger data-testid="select-deductible">
                                    <SelectValue />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="1">Yes</SelectItem>
                                  <SelectItem value="0">No</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="flex justify-end gap-2">
                          <Button type="button" variant="outline" onClick={() => setIsCategoryDialogOpen(false)}>
                            Cancel
                          </Button>
                          <Button type="submit" disabled={createCategoryMutation.isPending} data-testid="button-save-category">
                            {createCategoryMutation.isPending ? "Creating..." : "Create Category"}
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {taxCategories && taxCategories.length > 0 ? (
                  taxCategories.map((category) => (
                    <div
                      key={category.id}
                      className="p-4 border rounded-md"
                      data-testid={`category-card-${category.id}`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-medium">{category.name}</h3>
                          {category.description && (
                            <p className="text-sm text-muted-foreground mt-1">{category.description}</p>
                          )}
                        </div>
                        <Badge variant={category.isDeductible ? "default" : "secondary"}>
                          {category.isDeductible ? "Deductible" : "Non-Deductible"}
                        </Badge>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-muted-foreground">No tax categories yet. Add one to get started.</div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <TaxDisclaimer />
          <Card>
            <CardHeader>
              <CardTitle>Year-End Tax Reports</CardTitle>
              <CardDescription>
                {isNonProfit 
                  ? 'Form 990 reports for your non-profit organization' 
                  : 'Schedule C reports for tax filing'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {taxReports && taxReports.length > 0 ? (
                  taxReports.map((report) => (
                    <div
                      key={report.id}
                      className="p-6 border rounded-md"
                      data-testid={`report-card-${report.id}`}
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="font-semibold text-lg">
                            {report.taxYear} Tax Year - {report.formType === '990' ? 'Form 990' : 'Schedule C'}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            Generated {format(new Date(report.createdAt), 'MMM d, yyyy')}
                          </p>
                        </div>
                        <Button variant="outline" size="sm">
                          <Download className="mr-2 h-4 w-4" />
                          Export
                        </Button>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Total Income</p>
                          <p className="text-xl font-semibold text-green-600">
                            ${parseFloat(report.totalIncome).toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Total Expenses</p>
                          <p className="text-xl font-semibold text-red-600">
                            ${parseFloat(report.totalExpenses).toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Deductions</p>
                          <p className="text-xl font-semibold text-blue-600">
                            ${parseFloat(report.totalDeductions).toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Net Income</p>
                          <p className="text-xl font-semibold">
                            ${parseFloat(report.netIncome).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-muted-foreground">
                    No tax reports yet. Click "Generate Year-End Report" to create one for {selectedYear}.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {!isNonProfit && (
          <TabsContent value="1099s" className="space-y-4">
            <TaxDisclaimer />
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>1099 Forms</CardTitle>
                    <CardDescription>Track 1099 forms for contractors and vendors</CardDescription>
                  </div>
                  <Dialog open={is1099DialogOpen} onOpenChange={setIs1099DialogOpen}>
                    <DialogTrigger asChild>
                      <Button data-testid="button-create-1099">
                        <Plus className="mr-2 h-4 w-4" />
                        Add 1099 Form
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>Create 1099 Form</DialogTitle>
                        <DialogDescription>Record a 1099 form for a vendor or contractor</DialogDescription>
                      </DialogHeader>
                      <Form {...form1099Form}>
                        <form onSubmit={form1099Form.handleSubmit(on1099Submit)} className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <FormField
                              control={form1099Form.control}
                              name="taxYear"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Tax Year</FormLabel>
                                  <FormControl>
                                    <Input 
                                      type="number" 
                                      value={field.value || ''}
                                      onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : new Date().getFullYear())} 
                                      data-testid="input-1099-year" 
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={form1099Form.control}
                              name="formType"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Form Type</FormLabel>
                                  <Select value={field.value} onValueChange={field.onChange}>
                                    <FormControl>
                                      <SelectTrigger data-testid="select-1099-type">
                                        <SelectValue />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value="1099_nec">1099-NEC (Non-Employee Compensation)</SelectItem>
                                      <SelectItem value="1099_misc">1099-MISC (Miscellaneous)</SelectItem>
                                      <SelectItem value="1099_int">1099-INT (Interest)</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>

                          <FormField
                            control={form1099Form.control}
                            name="recipientName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Recipient Name</FormLabel>
                                <FormControl>
                                  <Input {...field} placeholder="John Doe" data-testid="input-recipient-name" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <div className="grid grid-cols-2 gap-4">
                            <FormField
                              control={form1099Form.control}
                              name="recipientTin"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>TIN/SSN</FormLabel>
                                  <FormControl>
                                    <Input {...field} value={field.value || ''} placeholder="XXX-XX-XXXX" data-testid="input-recipient-tin" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={form1099Form.control}
                              name="totalAmount"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Total Amount</FormLabel>
                                  <FormControl>
                                    <Input type="number" step="0.01" {...field} placeholder="0.00" data-testid="input-total-amount" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>

                          <FormField
                            control={form1099Form.control}
                            name="recipientAddress"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Recipient Address</FormLabel>
                                <FormControl>
                                  <Textarea 
                                    {...field} 
                                    value={field.value || ''}
                                    placeholder="Full address..." 
                                    data-testid="input-recipient-address" 
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form1099Form.control}
                            name="notes"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Notes</FormLabel>
                                <FormControl>
                                  <Textarea 
                                    {...field} 
                                    value={field.value || ''}
                                    placeholder="Additional notes..." 
                                    data-testid="input-1099-notes" 
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <div className="flex justify-end gap-2">
                            <Button type="button" variant="outline" onClick={() => setIs1099DialogOpen(false)}>
                              Cancel
                            </Button>
                            <Button type="submit" disabled={create1099Mutation.isPending} data-testid="button-save-1099">
                              {create1099Mutation.isPending ? "Creating..." : "Create 1099 Form"}
                            </Button>
                          </div>
                        </form>
                      </Form>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {form1099s && form1099s.length > 0 ? (
                    form1099s.map((form) => (
                      <div
                        key={form.id}
                        className="p-4 border rounded-md"
                        data-testid={`form1099-card-${form.id}`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className="font-medium">{form.recipientName}</h3>
                              <Badge variant="outline">{form.formType}</Badge>
                              {form.isFiled ? (
                                <Badge variant="default" className="flex items-center gap-1">
                                  <CheckCircle2 className="h-3 w-3" />
                                  Filed
                                </Badge>
                              ) : (
                                <Badge variant="secondary" className="flex items-center gap-1">
                                  <XCircle className="h-3 w-3" />
                                  Not Filed
                                </Badge>
                              )}
                            </div>
                            <div className="mt-2 grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <span className="text-muted-foreground">Amount:</span>{" "}
                                <span className="font-semibold">${parseFloat(form.totalAmount).toLocaleString()}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Tax Year:</span>{" "}
                                <span className="font-semibold">{form.taxYear}</span>
                              </div>
                            </div>
                            {form.vendorName && (
                              <p className="text-sm text-muted-foreground mt-1">Vendor: {form.vendorName}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-sm text-muted-foreground">No 1099 forms yet. Add one to get started.</div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {!isNonProfit && (
          <TabsContent value="ai-analysis" className="space-y-4">
            <TaxDisclaimer variant="ai" />
            <Card>
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-primary" />
                      AI Tax Deduction Analysis
                    </CardTitle>
                    <CardDescription>
                      Use AI to analyze your expense categories against IRS Publications 334, 463, 535, and 587
                    </CardDescription>
                  </div>
                  <Button 
                    onClick={() => runAiAnalysisMutation.mutate()} 
                    disabled={runAiAnalysisMutation.isPending}
                    data-testid="button-run-ai-analysis"
                  >
                    {runAiAnalysisMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-2 h-4 w-4" />
                        Run AI Analysis
                      </>
                    )}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {!aiAnalysisResult ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium mb-2">No analysis run yet</p>
                    <p className="text-sm max-w-md mx-auto">
                      Click "Run AI Analysis" to have AI review your expense categories and suggest 
                      which should be marked as tax-deductible based on current IRS publication guidelines.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <Card>
                        <CardContent className="pt-4">
                          <div className="text-2xl font-bold">{aiAnalysisResult.summary.totalCategories}</div>
                          <p className="text-sm text-muted-foreground">Categories Analyzed</p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="pt-4">
                          <div className="text-2xl font-bold text-green-600">{aiAnalysisResult.summary.fullyDeductible}</div>
                          <p className="text-sm text-muted-foreground">Fully Deductible</p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="pt-4">
                          <div className="text-2xl font-bold text-yellow-600">{aiAnalysisResult.summary.partiallyDeductible}</div>
                          <p className="text-sm text-muted-foreground">Partially Deductible</p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="pt-4">
                          <div className="text-2xl font-bold text-orange-600">{aiAnalysisResult.summary.suggestedChanges}</div>
                          <p className="text-sm text-muted-foreground">Suggested Changes</p>
                        </CardContent>
                      </Card>
                    </div>

                    {aiAnalysisResult.summary.suggestedChanges > 0 && (
                      <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="h-5 w-5 text-orange-500" />
                          <span className="font-medium">
                            {aiAnalysisResult.summary.suggestedChanges} categories may need their tax deductibility updated
                          </span>
                        </div>
                        <Button
                          variant="default"
                          onClick={() => applyAllSuggestionsMutation.mutate(aiAnalysisResult.suggestions)}
                          disabled={applyAllSuggestionsMutation.isPending}
                          data-testid="button-apply-all-suggestions"
                        >
                          {applyAllSuggestionsMutation.isPending ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Applying...
                            </>
                          ) : (
                            "Apply All Suggestions"
                          )}
                        </Button>
                      </div>
                    )}

                    <div className="text-sm text-muted-foreground">
                      Analysis date: {format(new Date(aiAnalysisResult.analysisDate), "PPP 'at' p")}
                    </div>

                    <ScrollArea className="h-[400px]">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Category</TableHead>
                            <TableHead>Current Status</TableHead>
                            <TableHead>AI Suggestion</TableHead>
                            <TableHead>IRS Category</TableHead>
                            <TableHead>Confidence</TableHead>
                            <TableHead className="text-right">Action</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {aiAnalysisResult.suggestions.map((suggestion) => {
                            const needsChange = suggestion.currentlyDeductible !== suggestion.suggestedDeductible;
                            const isApplied = appliedSuggestions.has(suggestion.categoryId);
                            
                            return (
                              <TableRow 
                                key={suggestion.categoryId}
                                className={needsChange && !isApplied ? "bg-orange-50 dark:bg-orange-950/20" : ""}
                                data-testid={`row-category-${suggestion.categoryId}`}
                              >
                                <TableCell>
                                  <div>
                                    <div className="font-medium">{suggestion.categoryName}</div>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <p className="text-xs text-muted-foreground truncate max-w-[200px] cursor-help">
                                          {suggestion.reasoning}
                                        </p>
                                      </TooltipTrigger>
                                      <TooltipContent className="max-w-[300px]">
                                        <p>{suggestion.reasoning}</p>
                                        {suggestion.irsReference && (
                                          <p className="text-xs mt-1 text-muted-foreground">
                                            Reference: {suggestion.irsReference}
                                          </p>
                                        )}
                                      </TooltipContent>
                                    </Tooltip>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Badge variant={suggestion.currentlyDeductible ? "default" : "secondary"}>
                                    {suggestion.currentlyDeductible ? "Deductible" : "Non-Deductible"}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    {needsChange && <ArrowRight className="h-4 w-4 text-orange-500" />}
                                    <Badge 
                                      variant={suggestion.suggestedDeductible ? "default" : "secondary"}
                                      className={needsChange ? "ring-2 ring-orange-300" : ""}
                                    >
                                      {suggestion.suggestedDeductible ? "Deductible" : "Non-Deductible"}
                                      {suggestion.deductionPercentage && suggestion.deductionPercentage < 100 && (
                                        <span className="ml-1">({suggestion.deductionPercentage}%)</span>
                                      )}
                                    </Badge>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <span className="text-sm">{suggestion.irsCategory}</span>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                                      <div 
                                        className={`h-full rounded-full ${
                                          suggestion.confidence >= 80 ? 'bg-green-500' :
                                          suggestion.confidence >= 60 ? 'bg-yellow-500' : 'bg-orange-500'
                                        }`}
                                        style={{ width: `${suggestion.confidence}%` }}
                                      />
                                    </div>
                                    <span className="text-xs text-muted-foreground">{suggestion.confidence}%</span>
                                  </div>
                                </TableCell>
                                <TableCell className="text-right">
                                  {needsChange && !isApplied ? (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => applySuggestionMutation.mutate({
                                        categoryId: suggestion.categoryId,
                                        taxDeductible: suggestion.suggestedDeductible
                                      })}
                                      disabled={applySuggestionMutation.isPending}
                                      data-testid={`button-apply-${suggestion.categoryId}`}
                                    >
                                      Apply
                                    </Button>
                                  ) : isApplied ? (
                                    <Badge variant="outline" className="text-green-600">
                                      <CheckCircle2 className="h-3 w-3 mr-1" />
                                      Applied
                                    </Badge>
                                  ) : (
                                    <Badge variant="outline" className="text-muted-foreground">
                                      <CheckCircle2 className="h-3 w-3 mr-1" />
                                      Correct
                                    </Badge>
                                  )}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </ScrollArea>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
