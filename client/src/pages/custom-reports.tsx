import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Organization } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Plus, Play, Save, Download, Trash2, Edit } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";

type CustomReport = {
  id: number;
  organizationId: number;
  name: string;
  description: string | null;
  dataSource: string;
  selectedFields: string[];
  filters: any;
  groupBy: string | null;
  sortBy: string | null;
  sortOrder: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

const DATA_SOURCE_OPTIONS = [
  { value: "transactions", label: "Transactions" },
  { value: "invoices", label: "Invoices" },
  { value: "bills", label: "Bills" },
  { value: "grants", label: "Grants" },
];

const FIELD_OPTIONS: Record<string, { value: string; label: string }[]> = {
  transactions: [
    { value: "id", label: "ID" },
    { value: "date", label: "Date" },
    { value: "description", label: "Description" },
    { value: "amount", label: "Amount" },
    { value: "type", label: "Type" },
    { value: "categoryId", label: "Category ID" },
    { value: "vendorId", label: "Vendor ID" },
    { value: "clientId", label: "Client ID" },
    { value: "grantId", label: "Grant ID" },
    { value: "notes", label: "Notes" },
  ],
  invoices: [
    { value: "id", label: "ID" },
    { value: "invoiceNumber", label: "Invoice Number" },
    { value: "clientId", label: "Client ID" },
    { value: "issueDate", label: "Issue Date" },
    { value: "dueDate", label: "Due Date" },
    { value: "status", label: "Status" },
    { value: "subtotal", label: "Subtotal" },
    { value: "taxAmount", label: "Tax Amount" },
    { value: "total", label: "Total" },
    { value: "notes", label: "Notes" },
  ],
  bills: [
    { value: "id", label: "ID" },
    { value: "billNumber", label: "Bill Number" },
    { value: "vendorId", label: "Vendor ID" },
    { value: "issueDate", label: "Issue Date" },
    { value: "dueDate", label: "Due Date" },
    { value: "status", label: "Status" },
    { value: "subtotal", label: "Subtotal" },
    { value: "taxAmount", label: "Tax Amount" },
    { value: "total", label: "Total" },
    { value: "notes", label: "Notes" },
  ],
  grants: [
    { value: "id", label: "ID" },
    { value: "name", label: "Name" },
    { value: "grantNumber", label: "Grant Number" },
    { value: "funder", label: "Funder" },
    { value: "amount", label: "Amount" },
    { value: "startDate", label: "Start Date" },
    { value: "endDate", label: "End Date" },
    { value: "status", label: "Status" },
  ],
};

interface CustomReportsProps {
  currentOrganization: Organization;
}

export default function CustomReports({ currentOrganization }: CustomReportsProps) {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingReport, setEditingReport] = useState<CustomReport | null>(null);
  const [executeDialogOpen, setExecuteDialogOpen] = useState(false);
  const [executingReport, setExecutingReport] = useState<CustomReport | null>(null);
  const [reportResults, setReportResults] = useState<any[] | null>(null);

  // Form state
  const [reportName, setReportName] = useState("");
  const [reportDescription, setReportDescription] = useState("");
  const [dataSource, setDataSource] = useState("transactions");
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterCategoryId, setFilterCategoryId] = useState("");
  const [filterMinAmount, setFilterMinAmount] = useState("");
  const [filterMaxAmount, setFilterMaxAmount] = useState("");
  const [sortBy, setSortBy] = useState("none");
  const [sortOrder, setSortOrder] = useState("desc");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const { data: reports = [], isLoading } = useQuery<CustomReport[]>({
    queryKey: ["/api/custom-reports", currentOrganization.id],
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest(`/api/custom-reports/${currentOrganization.id}`, {
        method: "POST",
        body: JSON.stringify(data),
        headers: { "Content-Type": "application/json" },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/custom-reports", currentOrganization.id] });
      toast({ title: "Report created successfully" });
      resetForm();
      setDialogOpen(false);
    },
    onError: () => {
      toast({ title: "Failed to create report", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      return await apiRequest(`/api/custom-reports/${currentOrganization.id}/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
        headers: { "Content-Type": "application/json" },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/custom-reports", currentOrganization.id] });
      toast({ title: "Report updated successfully" });
      resetForm();
      setDialogOpen(false);
    },
    onError: () => {
      toast({ title: "Failed to update report", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest(`/api/custom-reports/${currentOrganization.id}/${id}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/custom-reports", currentOrganization.id] });
      toast({ title: "Report deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete report", variant: "destructive" });
    },
  });

  const executeMutation = useMutation({
    mutationFn: async ({ id, dateFrom, dateTo }: { id: number; dateFrom?: string; dateTo?: string }) => {
      return await apiRequest(`/api/custom-reports/${currentOrganization.id}/${id}/execute`, {
        method: "POST",
        body: JSON.stringify({ dateFrom, dateTo }),
        headers: { "Content-Type": "application/json" },
      });
    },
    onSuccess: (data) => {
      setReportResults(data);
      toast({ title: "Report executed successfully" });
    },
    onError: () => {
      toast({ title: "Failed to execute report", variant: "destructive" });
    },
  });

  const resetForm = () => {
    setReportName("");
    setReportDescription("");
    setDataSource("transactions");
    setSelectedFields([]);
    setFilterType("all");
    setFilterStatus("all");
    setFilterCategoryId("");
    setFilterMinAmount("");
    setFilterMaxAmount("");
    setSortBy("none");
    setSortOrder("desc");
    setEditingReport(null);
  };

  const handleFieldToggle = (field: string) => {
    setSelectedFields((prev) =>
      prev.includes(field) ? prev.filter((f) => f !== field) : [...prev, field]
    );
  };

  const handleSave = () => {
    if (!reportName || selectedFields.length === 0) {
      toast({ title: "Please provide a name and select at least one field", variant: "destructive" });
      return;
    }

    const filters: any = {};
    if (filterType && filterType !== "all") filters.type = filterType;
    if (filterStatus && filterStatus !== "all") filters.status = filterStatus;
    if (filterCategoryId) filters.categoryId = filterCategoryId;
    if (filterMinAmount) filters.minAmount = filterMinAmount;
    if (filterMaxAmount) filters.maxAmount = filterMaxAmount;

    const reportData = {
      name: reportName,
      description: reportDescription || null,
      dataSource,
      selectedFields,
      filters: Object.keys(filters).length > 0 ? filters : null,
      sortBy: sortBy && sortBy !== "none" ? sortBy : null,
      sortOrder: sortOrder || null,
    };

    if (editingReport) {
      updateMutation.mutate({ id: editingReport.id, data: reportData });
    } else {
      createMutation.mutate(reportData);
    }
  };

  const handleEdit = (report: CustomReport) => {
    setEditingReport(report);
    setReportName(report.name);
    setReportDescription(report.description || "");
    setDataSource(report.dataSource);
    setSelectedFields(report.selectedFields);
    const filters = report.filters || {};
    setFilterType(filters.type || "all");
    setFilterStatus(filters.status || "all");
    setFilterCategoryId(filters.categoryId || "");
    setFilterMinAmount(filters.minAmount || "");
    setFilterMaxAmount(filters.maxAmount || "");
    setSortBy(report.sortBy || "none");
    setSortOrder(report.sortOrder || "desc");
    setDialogOpen(true);
  };

  const handleExecute = (report: CustomReport) => {
    setExecutingReport(report);
    setReportResults(null);
    setDateFrom("");
    setDateTo("");
    setExecuteDialogOpen(true);
  };

  const handleRunReport = () => {
    if (executingReport) {
      executeMutation.mutate({
        id: executingReport.id,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      });
    }
  };

  const handleExportCSV = async () => {
    if (!executingReport) return;

    try {
      const response = await fetch(`/api/custom-reports/${currentOrganization.id}/${executingReport.id}/export`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
        }),
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to export report');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${executingReport.name}-${format(new Date(), "yyyy-MM-dd")}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      
      toast({ title: "Report exported successfully" });
    } catch (error) {
      console.error("Error exporting report:", error);
      toast({ title: "Failed to export report", variant: "destructive" });
    }
  };

  return (
    <div className="flex-1 space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Custom Reports</h1>
          <p className="text-muted-foreground">Create and run custom financial reports</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-report">
              <Plus className="mr-2 h-4 w-4" />
              Create Report
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingReport ? "Edit Report" : "Create New Report"}</DialogTitle>
              <DialogDescription>
                Define your custom report by selecting a data source, fields, and filters
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Report Name</Label>
                <Input
                  id="name"
                  data-testid="input-report-name"
                  value={reportName}
                  onChange={(e) => setReportName(e.target.value)}
                  placeholder="e.g., Monthly Expense Summary"
                />
              </div>
              <div>
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  data-testid="input-report-description"
                  value={reportDescription}
                  onChange={(e) => setReportDescription(e.target.value)}
                  placeholder="Describe what this report shows"
                />
              </div>
              <div>
                <Label htmlFor="dataSource">Data Source</Label>
                <Select value={dataSource} onValueChange={setDataSource}>
                  <SelectTrigger id="dataSource" data-testid="select-data-source">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DATA_SOURCE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Select Fields to Include</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {FIELD_OPTIONS[dataSource]?.map((field) => (
                    <div key={field.value} className="flex items-center space-x-2">
                      <Checkbox
                        id={`field-${field.value}`}
                        data-testid={`checkbox-field-${field.value}`}
                        checked={selectedFields.includes(field.value)}
                        onCheckedChange={() => handleFieldToggle(field.value)}
                      />
                      <label htmlFor={`field-${field.value}`} className="text-sm cursor-pointer">
                        {field.label}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <Label>Filters (Optional)</Label>
                <div className="grid grid-cols-2 gap-4 mt-2">
                  {dataSource === "transactions" && (
                    <>
                      <div>
                        <Label htmlFor="filterType" className="text-sm">Type</Label>
                        <Select value={filterType} onValueChange={setFilterType}>
                          <SelectTrigger id="filterType" data-testid="select-filter-type">
                            <SelectValue placeholder="All" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All</SelectItem>
                            <SelectItem value="income">Income</SelectItem>
                            <SelectItem value="expense">Expense</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="filterCategory" className="text-sm">Category ID</Label>
                        <Input
                          id="filterCategory"
                          data-testid="input-filter-category"
                          value={filterCategoryId}
                          onChange={(e) => setFilterCategoryId(e.target.value)}
                          placeholder="Category ID"
                        />
                      </div>
                      <div>
                        <Label htmlFor="filterMinAmount" className="text-sm">Min Amount</Label>
                        <Input
                          id="filterMinAmount"
                          data-testid="input-filter-min-amount"
                          type="number"
                          value={filterMinAmount}
                          onChange={(e) => setFilterMinAmount(e.target.value)}
                          placeholder="0"
                        />
                      </div>
                      <div>
                        <Label htmlFor="filterMaxAmount" className="text-sm">Max Amount</Label>
                        <Input
                          id="filterMaxAmount"
                          data-testid="input-filter-max-amount"
                          type="number"
                          value={filterMaxAmount}
                          onChange={(e) => setFilterMaxAmount(e.target.value)}
                          placeholder="Unlimited"
                        />
                      </div>
                    </>
                  )}
                  {(dataSource === "invoices" || dataSource === "bills") && (
                    <div>
                      <Label htmlFor="filterStatus" className="text-sm">Status</Label>
                      <Input
                        id="filterStatus"
                        data-testid="input-filter-status"
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        placeholder="e.g., paid, pending"
                      />
                    </div>
                  )}
                  {dataSource === "grants" && (
                    <div>
                      <Label htmlFor="filterStatus" className="text-sm">Status</Label>
                      <Select value={filterStatus} onValueChange={setFilterStatus}>
                        <SelectTrigger id="filterStatus" data-testid="select-filter-grant-status">
                          <SelectValue placeholder="All" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All</SelectItem>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                          <SelectItem value="pending">Pending</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="sortBy">Sort By</Label>
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger id="sortBy" data-testid="select-sort-by">
                      <SelectValue placeholder="Select field" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {FIELD_OPTIONS[dataSource]?.map((field) => (
                        <SelectItem key={field.value} value={field.value}>
                          {field.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="sortOrder">Sort Order</Label>
                  <Select value={sortOrder} onValueChange={setSortOrder}>
                    <SelectTrigger id="sortOrder" data-testid="select-sort-order">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="asc">Ascending</SelectItem>
                      <SelectItem value="desc">Descending</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => { setDialogOpen(false); resetForm(); }}
                  data-testid="button-cancel"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={createMutation.isPending || updateMutation.isPending}
                  data-testid="button-save-report"
                >
                  <Save className="mr-2 h-4 w-4" />
                  {editingReport ? "Update" : "Save"} Report
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="text-center py-8">Loading reports...</div>
      ) : reports.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No custom reports yet. Create your first report to get started.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {reports.map((report) => (
            <Card key={report.id}>
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <div className="flex-1">
                  <CardTitle className="text-lg" data-testid={`text-report-name-${report.id}`}>{report.name}</CardTitle>
                  {report.description && (
                    <CardDescription className="mt-1">{report.description}</CardDescription>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEdit(report)}
                    data-testid={`button-edit-${report.id}`}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleExecute(report)}
                    data-testid={`button-execute-${report.id}`}
                  >
                    <Play className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => deleteMutation.mutate(report.id)}
                    data-testid={`button-delete-${report.id}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground">
                  <p>Data Source: <span className="font-medium text-foreground">{report.dataSource}</span></p>
                  <p>Fields: <span className="font-medium text-foreground">{report.selectedFields.join(", ")}</span></p>
                  <p className="text-xs mt-2">Created {format(new Date(report.createdAt), "PPP")}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={executeDialogOpen} onOpenChange={setExecuteDialogOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Run Report: {executingReport?.name}</DialogTitle>
            <DialogDescription>
              Configure date range and execute the report
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="dateFrom">From Date (Optional)</Label>
                <Input
                  id="dateFrom"
                  data-testid="input-date-from"
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="dateTo">To Date (Optional)</Label>
                <Input
                  id="dateTo"
                  data-testid="input-date-to"
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleRunReport}
                disabled={executeMutation.isPending}
                data-testid="button-run-report"
              >
                <Play className="mr-2 h-4 w-4" />
                Run Report
              </Button>
              {reportResults && reportResults.length > 0 && (
                <Button
                  variant="outline"
                  onClick={handleExportCSV}
                  data-testid="button-export-csv"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Export CSV
                </Button>
              )}
            </div>
            {executeMutation.isPending && (
              <div className="text-center py-4">Running report...</div>
            )}
            {reportResults && reportResults.length === 0 && (
              <div className="text-center py-4 text-muted-foreground">No results found</div>
            )}
            {reportResults && reportResults.length > 0 && (
              <div className="border rounded-lg overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {Object.keys(reportResults[0]).map((key) => (
                        <TableHead key={key}>{key}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reportResults.map((row, idx) => (
                      <TableRow key={idx} data-testid={`row-result-${idx}`}>
                        {Object.values(row).map((value: any, colIdx) => (
                          <TableCell key={colIdx}>
                            {value instanceof Date
                              ? format(value, "PP")
                              : typeof value === "object"
                              ? JSON.stringify(value)
                              : String(value)}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
