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
import { FileText, Plus, Download, CheckCircle2, XCircle } from "lucide-react";
import type { Organization, TaxCategory, TaxReport, TaxForm1099, InsertTaxCategory, InsertTaxForm1099 } from "@shared/schema";
import { insertTaxCategorySchema, insertTaxForm1099Schema } from "@shared/schema";
import { format } from "date-fns";

interface TaxReportingProps {
  currentOrganization: Organization;
}

export default function TaxReporting({ currentOrganization }: TaxReportingProps) {
  const { toast } = useToast();
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [is1099DialogOpen, setIs1099DialogOpen] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

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
        </TabsList>

        <TabsContent value="categories" className="space-y-4">
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
      </Tabs>
    </div>
  );
}
