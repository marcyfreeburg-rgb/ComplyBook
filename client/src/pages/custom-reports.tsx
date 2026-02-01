import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Organization, Category } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Plus, Play, Save, Download, Trash2, Edit, ChevronDown, X, Mail, Clock, Calendar, LayoutTemplate, Copy } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  isTemplate?: boolean;
  schedule?: ReportSchedule | null;
};

type ReportSchedule = {
  enabled: boolean;
  frequency: "daily" | "weekly" | "monthly";
  dayOfWeek?: number; // 0-6 for weekly
  dayOfMonth?: number; // 1-31 for monthly
  time: string; // HH:MM format
  recipients: string[];
  lastRun?: string;
  nextRun?: string;
};

type ReportTemplate = {
  id: string;
  name: string;
  description: string;
  dataSource: string;
  selectedFields: string[];
  filters: any;
  sortBy: string | null;
  sortOrder: string | null;
};

const PRESET_TEMPLATES: ReportTemplate[] = [
  {
    id: "monthly-expenses",
    name: "Monthly Expense Summary",
    description: "Overview of all expenses grouped by category for the month",
    dataSource: "transactions",
    selectedFields: ["date", "description", "amount", "categoryId", "notes"],
    filters: { type: "expense" },
    sortBy: "date",
    sortOrder: "desc",
  },
  {
    id: "income-report",
    name: "Income Report",
    description: "All income transactions with client and grant details",
    dataSource: "transactions",
    selectedFields: ["date", "description", "amount", "clientId", "grantId", "notes"],
    filters: { type: "income" },
    sortBy: "date",
    sortOrder: "desc",
  },
  {
    id: "outstanding-invoices",
    name: "Outstanding Invoices",
    description: "All unpaid and overdue invoices",
    dataSource: "invoices",
    selectedFields: ["invoiceNumber", "clientId", "issueDate", "dueDate", "status", "total"],
    filters: { status: "sent" },
    sortBy: "dueDate",
    sortOrder: "asc",
  },
  {
    id: "pending-bills",
    name: "Pending Bills",
    description: "All unpaid bills requiring attention",
    dataSource: "bills",
    selectedFields: ["billNumber", "vendorId", "issueDate", "dueDate", "status", "total"],
    filters: { status: "received" },
    sortBy: "dueDate",
    sortOrder: "asc",
  },
  {
    id: "grant-status",
    name: "Grant Status Report",
    description: "Overview of all grants with amounts and dates",
    dataSource: "grants",
    selectedFields: ["name", "grantNumber", "funder", "amount", "startDate", "endDate", "status"],
    filters: {},
    sortBy: "endDate",
    sortOrder: "asc",
  },
];

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
  
  // Template state
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<ReportTemplate | null>(null);
  
  // Scheduling state
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [schedulingReport, setSchedulingReport] = useState<CustomReport | null>(null);
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduleFrequency, setScheduleFrequency] = useState<"daily" | "weekly" | "monthly">("weekly");
  const [scheduleDayOfWeek, setScheduleDayOfWeek] = useState(1); // Monday
  const [scheduleDayOfMonth, setScheduleDayOfMonth] = useState(1);
  const [scheduleTime, setScheduleTime] = useState("09:00");
  const [scheduleRecipients, setScheduleRecipients] = useState("");

  // Form state
  const [reportName, setReportName] = useState("");
  const [reportDescription, setReportDescription] = useState("");
  const [dataSource, setDataSource] = useState("transactions");
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterCategoryIds, setFilterCategoryIds] = useState<number[]>([]);
  const [categoryPopoverOpen, setCategoryPopoverOpen] = useState(false);
  const [filterMinAmount, setFilterMinAmount] = useState("");
  const [filterMaxAmount, setFilterMaxAmount] = useState("");
  const [sortBy, setSortBy] = useState("none");
  const [sortOrder, setSortOrder] = useState("desc");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const { data: reports = [], isLoading } = useQuery<CustomReport[]>({
    queryKey: ["/api/custom-reports", currentOrganization.id],
  });

  // Fetch categories for the dropdown
  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["/api/categories", currentOrganization.id],
  });

  // Build hierarchical category display with "Parent - Subcategory" format
  const getCategoryDisplayName = (category: Category): string => {
    if (category.parentCategoryId) {
      const parent = categories.find(c => c.id === category.parentCategoryId);
      if (parent) {
        return `${parent.name} - ${category.name}`;
      }
    }
    return category.name;
  };

  // Build hierarchical list of categories (parents first, then children)
  const buildHierarchicalCategories = (): Category[] => {
    const childrenMap = new Map<number | null, Category[]>();
    categories.forEach(cat => {
      const key = cat.parentCategoryId;
      if (!childrenMap.has(key)) {
        childrenMap.set(key, []);
      }
      childrenMap.get(key)!.push(cat);
    });
    
    // Sort children within each parent
    childrenMap.forEach(children => {
      children.sort((a, b) => a.name.localeCompare(b.name));
    });
    
    // Recursively build hierarchical list
    const buildList = (parentId: number | null): Category[] => {
      const result: Category[] = [];
      const children = childrenMap.get(parentId) || [];
      children.forEach(child => {
        result.push(child);
        result.push(...buildList(child.id));
      });
      return result;
    };
    
    return buildList(null);
  };

  const hierarchicalCategories = buildHierarchicalCategories();

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      console.log("[CreateReport] Submitting data:", JSON.stringify(data, null, 2));
      const res = await apiRequest("POST", `/api/custom-reports/${currentOrganization.id}`, data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/custom-reports", currentOrganization.id] });
      toast({ title: "Report created successfully" });
      resetForm();
      setDialogOpen(false);
    },
    onError: (error: any) => {
      console.error("[CreateReport] Error:", error);
      const errorMessage = error?.message || "Failed to create report";
      toast({ title: errorMessage, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const res = await apiRequest("PATCH", `/api/custom-reports/${currentOrganization.id}/${id}`, data);
      return await res.json();
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
      await apiRequest("DELETE", `/api/custom-reports/${currentOrganization.id}/${id}`);
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
      const res = await apiRequest("POST", `/api/custom-reports/${currentOrganization.id}/${id}/execute`, { dateFrom, dateTo });
      return await res.json();
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
    setFilterCategoryIds([]);
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
    if (filterCategoryIds.length > 0) filters.categoryIds = filterCategoryIds;
    if (filterMinAmount) filters.minAmount = filterMinAmount;
    if (filterMaxAmount) filters.maxAmount = filterMaxAmount;

    const reportData: any = {
      name: reportName,
      dataSource,
      selectedFields,
    };

    // Only include optional fields if they have values
    if (reportDescription) reportData.description = reportDescription;
    if (Object.keys(filters).length > 0) reportData.filters = filters;
    if (sortBy && sortBy !== "none") reportData.sortBy = sortBy;
    if (sortOrder) reportData.sortOrder = sortOrder;

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
    // Handle both legacy single categoryId and new categoryIds array
    if (filters.categoryIds) {
      setFilterCategoryIds(filters.categoryIds);
    } else if (filters.categoryId) {
      setFilterCategoryIds([parseInt(filters.categoryId)]);
    } else {
      setFilterCategoryIds([]);
    }
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

  // Template functions
  const handleUseTemplate = (template: ReportTemplate) => {
    setSelectedTemplate(template);
    setReportName(template.name);
    setReportDescription(template.description);
    setDataSource(template.dataSource);
    setSelectedFields([...template.selectedFields]);
    const filters = template.filters || {};
    setFilterType(filters.type || "all");
    setFilterStatus(filters.status || "all");
    setFilterCategoryIds(filters.categoryIds || []);
    setFilterMinAmount(filters.minAmount || "");
    setFilterMaxAmount(filters.maxAmount || "");
    setSortBy(template.sortBy || "none");
    setSortOrder(template.sortOrder || "desc");
    setTemplateDialogOpen(false);
    setDialogOpen(true);
    toast({ title: `Template "${template.name}" loaded` });
  };

  const handleDuplicateReport = (report: CustomReport) => {
    setReportName(`${report.name} (Copy)`);
    setReportDescription(report.description || "");
    setDataSource(report.dataSource);
    setSelectedFields([...report.selectedFields]);
    const filters = report.filters || {};
    setFilterType(filters.type || "all");
    setFilterStatus(filters.status || "all");
    if (filters.categoryIds) {
      setFilterCategoryIds(filters.categoryIds);
    } else if (filters.categoryId) {
      setFilterCategoryIds([parseInt(filters.categoryId)]);
    } else {
      setFilterCategoryIds([]);
    }
    setFilterMinAmount(filters.minAmount || "");
    setFilterMaxAmount(filters.maxAmount || "");
    setSortBy(report.sortBy || "none");
    setSortOrder(report.sortOrder || "desc");
    setEditingReport(null);
    setDialogOpen(true);
    toast({ title: "Report duplicated - modify and save as new" });
  };

  // Scheduling functions
  const handleOpenSchedule = (report: CustomReport) => {
    setSchedulingReport(report);
    if (report.schedule) {
      setScheduleEnabled(report.schedule.enabled);
      setScheduleFrequency(report.schedule.frequency);
      setScheduleDayOfWeek(report.schedule.dayOfWeek || 1);
      setScheduleDayOfMonth(report.schedule.dayOfMonth || 1);
      setScheduleTime(report.schedule.time || "09:00");
      setScheduleRecipients((report.schedule.recipients || []).join(", "));
    } else {
      setScheduleEnabled(false);
      setScheduleFrequency("weekly");
      setScheduleDayOfWeek(1);
      setScheduleDayOfMonth(1);
      setScheduleTime("09:00");
      setScheduleRecipients("");
    }
    setScheduleDialogOpen(true);
  };

  const handleSaveSchedule = async () => {
    if (!schedulingReport) return;
    
    const recipients = scheduleRecipients
      .split(",")
      .map(email => email.trim())
      .filter(email => email.length > 0);

    if (scheduleEnabled && recipients.length === 0) {
      toast({ title: "Please add at least one recipient email", variant: "destructive" });
      return;
    }

    const schedule: ReportSchedule = {
      enabled: scheduleEnabled,
      frequency: scheduleFrequency,
      dayOfWeek: scheduleFrequency === "weekly" ? scheduleDayOfWeek : undefined,
      dayOfMonth: scheduleFrequency === "monthly" ? scheduleDayOfMonth : undefined,
      time: scheduleTime,
      recipients,
    };

    try {
      await updateMutation.mutateAsync({
        id: schedulingReport.id,
        data: { schedule },
      });
      setScheduleDialogOpen(false);
      toast({ 
        title: scheduleEnabled 
          ? `Schedule saved - Report will be emailed ${scheduleFrequency}` 
          : "Schedule disabled"
      });
    } catch {
      toast({ title: "Failed to save schedule", variant: "destructive" });
    }
  };

  const getScheduleDescription = (schedule: ReportSchedule | null | undefined): string => {
    if (!schedule?.enabled) return "Not scheduled";
    
    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    
    switch (schedule.frequency) {
      case "daily":
        return `Daily at ${schedule.time}`;
      case "weekly":
        return `Every ${dayNames[schedule.dayOfWeek || 0]} at ${schedule.time}`;
      case "monthly":
        return `Monthly on day ${schedule.dayOfMonth} at ${schedule.time}`;
      default:
        return "Scheduled";
    }
  };

  return (
    <div className="flex-1 space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Custom Reports</h1>
          <p className="text-muted-foreground">Create and run custom financial reports</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setTemplateDialogOpen(true)} data-testid="button-use-template">
            <LayoutTemplate className="mr-2 h-4 w-4" />
            Use Template
          </Button>
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
                      <div className="col-span-2">
                        <Label className="text-sm">Categories</Label>
                        <Popover open={categoryPopoverOpen} onOpenChange={setCategoryPopoverOpen}>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              role="combobox"
                              aria-expanded={categoryPopoverOpen}
                              className="w-full justify-between font-normal"
                              data-testid="button-filter-categories"
                            >
                              {filterCategoryIds.length === 0 ? (
                                <span className="text-muted-foreground">Select categories...</span>
                              ) : (
                                <span className="truncate">
                                  {filterCategoryIds.length} {filterCategoryIds.length === 1 ? "category" : "categories"} selected
                                </span>
                              )}
                              <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-[300px] p-0" align="start">
                            <ScrollArea className="h-60">
                              <div className="p-2 space-y-1">
                                {hierarchicalCategories.length === 0 ? (
                                  <p className="text-sm text-muted-foreground p-2">No categories found</p>
                                ) : (
                                  hierarchicalCategories.map((category) => {
                                    const isSubcategory = category.parentCategoryId !== null;
                                    const displayName = getCategoryDisplayName(category);
                                    return (
                                      <div
                                        key={category.id}
                                        className={`flex items-center space-x-2 p-2 rounded hover-elevate cursor-pointer ${isSubcategory ? 'ml-4' : ''}`}
                                        onClick={() => {
                                          setFilterCategoryIds(prev =>
                                            prev.includes(category.id)
                                              ? prev.filter(id => id !== category.id)
                                              : [...prev, category.id]
                                          );
                                        }}
                                      >
                                        <Checkbox
                                          id={`category-${category.id}`}
                                          checked={filterCategoryIds.includes(category.id)}
                                          onCheckedChange={() => {
                                            setFilterCategoryIds(prev =>
                                              prev.includes(category.id)
                                                ? prev.filter(id => id !== category.id)
                                                : [...prev, category.id]
                                            );
                                          }}
                                          onClick={(e) => e.stopPropagation()}
                                          data-testid={`checkbox-category-${category.id}`}
                                        />
                                        <label
                                          htmlFor={`category-${category.id}`}
                                          className="text-sm cursor-pointer flex-1"
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          {isSubcategory ? category.name : <span className="font-medium">{category.name}</span>}
                                        </label>
                                      </div>
                                    );
                                  })
                                )}
                              </div>
                            </ScrollArea>
                          </PopoverContent>
                        </Popover>
                        {filterCategoryIds.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {filterCategoryIds.map(catId => {
                              const cat = categories.find(c => c.id === catId);
                              return cat ? (
                                <Badge
                                  key={catId}
                                  variant="secondary"
                                  className="text-xs"
                                >
                                  {getCategoryDisplayName(cat)}
                                  <button
                                    className="ml-1 hover:text-destructive"
                                    onClick={() => setFilterCategoryIds(prev => prev.filter(id => id !== catId))}
                                    data-testid={`button-remove-category-${catId}`}
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                </Badge>
                              ) : null;
                            })}
                          </div>
                        )}
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
                    title="Edit report"
                    data-testid={`button-edit-${report.id}`}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDuplicateReport(report)}
                    title="Duplicate report"
                    data-testid={`button-duplicate-${report.id}`}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleOpenSchedule(report)}
                    title="Schedule email"
                    data-testid={`button-schedule-${report.id}`}
                  >
                    <Mail className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleExecute(report)}
                    title="Run report"
                    data-testid={`button-execute-${report.id}`}
                  >
                    <Play className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => deleteMutation.mutate(report.id)}
                    title="Delete report"
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
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-xs">Created {format(new Date(report.createdAt), "PPP")}</p>
                    {report.schedule?.enabled ? (
                      <Badge variant="secondary" className="text-xs">
                        <Clock className="h-3 w-3 mr-1" />
                        {getScheduleDescription(report.schedule)}
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">Not scheduled</span>
                    )}
                  </div>
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
            {reportResults && reportResults.length > 0 && (() => {
              const hasAmountField = reportResults[0] && ('amount' in reportResults[0] || 'Amount' in reportResults[0]);
              const hasTypeField = reportResults[0] && ('type' in reportResults[0] || 'Type' in reportResults[0]);
              const amountKey = reportResults[0] && 'amount' in reportResults[0] ? 'amount' : 'Amount';
              const typeKey = reportResults[0] && 'type' in reportResults[0] ? 'type' : 'Type';
              
              let totalIncome = 0;
              let totalExpenses = 0;
              let totalAmount = 0;
              
              if (hasAmountField) {
                reportResults.forEach((row: any) => {
                  const amount = parseFloat(row[amountKey]) || 0;
                  totalAmount += amount;
                  
                  if (hasTypeField) {
                    const type = String(row[typeKey]).toLowerCase();
                    if (type === 'income') {
                      totalIncome += amount;
                    } else if (type === 'expense') {
                      totalExpenses += amount;
                    }
                  }
                });
              }
              
              const grandTotal = totalIncome - totalExpenses;
              const formatAmount = (value: number) => {
                return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
              };
              
              return (
                <div className="space-y-4">
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
                            {Object.entries(row).map(([key, value]: [string, any], colIdx) => {
                              const isAmountField = key.toLowerCase() === 'amount';
                              const numValue = isAmountField ? parseFloat(value) : NaN;
                              const isNegative = isAmountField && !isNaN(numValue) && numValue < 0;
                              
                              return (
                                <TableCell key={colIdx} className={isNegative ? 'text-red-600 dark:text-red-400' : ''}>
                                  {value instanceof Date
                                    ? format(value, "PP")
                                    : typeof value === "object"
                                    ? JSON.stringify(value)
                                    : isAmountField && !isNaN(numValue)
                                    ? formatAmount(numValue)
                                    : String(value)}
                                </TableCell>
                              );
                            })}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  
                  {hasAmountField && (
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">Report Summary</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {hasTypeField ? (
                          <div className="grid grid-cols-3 gap-4 text-center">
                            <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950">
                              <p className="text-sm text-muted-foreground">Total Income</p>
                              <p className="text-xl font-bold text-green-600 dark:text-green-400" data-testid="text-total-income">
                                {formatAmount(totalIncome)}
                              </p>
                            </div>
                            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950">
                              <p className="text-sm text-muted-foreground">Total Expenses</p>
                              <p className="text-xl font-bold text-red-600 dark:text-red-400" data-testid="text-total-expenses">
                                {formatAmount(totalExpenses)}
                              </p>
                            </div>
                            <div className={`p-3 rounded-lg ${grandTotal >= 0 ? 'bg-blue-50 dark:bg-blue-950' : 'bg-red-50 dark:bg-red-950'}`}>
                              <p className="text-sm text-muted-foreground">Net Total</p>
                              <p className={`text-xl font-bold ${grandTotal >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400'}`} data-testid="text-grand-total">
                                {formatAmount(grandTotal)}
                              </p>
                            </div>
                          </div>
                        ) : (
                          <div className="text-center">
                            <div className={`p-3 rounded-lg ${totalAmount >= 0 ? 'bg-blue-50 dark:bg-blue-950' : 'bg-red-50 dark:bg-red-950'}`}>
                              <p className="text-sm text-muted-foreground">Total Amount</p>
                              <p className={`text-xl font-bold ${totalAmount >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400'}`} data-testid="text-total-amount">
                                {formatAmount(totalAmount)}
                              </p>
                            </div>
                            <p className="text-xs text-muted-foreground mt-2">
                              Tip: Include the "Type" field to see income vs expense breakdown
                            </p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}
                </div>
              );
            })()}
          </div>
        </DialogContent>
      </Dialog>

      {/* Template Selection Dialog */}
      <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <LayoutTemplate className="h-5 w-5" />
              Report Templates
            </DialogTitle>
            <DialogDescription>
              Choose a pre-built template to quickly create a new report
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 mt-4">
            {PRESET_TEMPLATES.map((template) => (
              <Card 
                key={template.id} 
                className="cursor-pointer hover-elevate transition-all"
                onClick={() => handleUseTemplate(template)}
                data-testid={`card-template-${template.id}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-medium">{template.name}</h3>
                      <p className="text-sm text-muted-foreground mt-1">{template.description}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="secondary">{template.dataSource}</Badge>
                        <span className="text-xs text-muted-foreground">
                          {template.selectedFields.length} fields
                        </span>
                      </div>
                    </div>
                    <Button 
                      size="sm" 
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleUseTemplate(template);
                      }}
                      data-testid={`button-use-template-${template.id}`}
                    >
                      Use
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Scheduling Dialog */}
      <Dialog open={scheduleDialogOpen} onOpenChange={setScheduleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Schedule Report Email
            </DialogTitle>
            <DialogDescription>
              {schedulingReport && `Configure automatic email delivery for "${schedulingReport.name}"`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="schedule-enabled" className="text-base">Enable Scheduled Emails</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically run and email this report on a schedule
                </p>
              </div>
              <Switch
                id="schedule-enabled"
                checked={scheduleEnabled}
                onCheckedChange={setScheduleEnabled}
                data-testid="switch-schedule-enabled"
              />
            </div>

            {scheduleEnabled && (
              <>
                <div>
                  <Label htmlFor="schedule-frequency">Frequency</Label>
                  <Select value={scheduleFrequency} onValueChange={(v) => setScheduleFrequency(v as any)}>
                    <SelectTrigger id="schedule-frequency" data-testid="select-schedule-frequency">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {scheduleFrequency === "weekly" && (
                  <div>
                    <Label htmlFor="schedule-day-of-week">Day of Week</Label>
                    <Select 
                      value={String(scheduleDayOfWeek)} 
                      onValueChange={(v) => setScheduleDayOfWeek(parseInt(v))}
                    >
                      <SelectTrigger id="schedule-day-of-week" data-testid="select-schedule-day-of-week">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">Sunday</SelectItem>
                        <SelectItem value="1">Monday</SelectItem>
                        <SelectItem value="2">Tuesday</SelectItem>
                        <SelectItem value="3">Wednesday</SelectItem>
                        <SelectItem value="4">Thursday</SelectItem>
                        <SelectItem value="5">Friday</SelectItem>
                        <SelectItem value="6">Saturday</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {scheduleFrequency === "monthly" && (
                  <div>
                    <Label htmlFor="schedule-day-of-month">Day of Month</Label>
                    <Select 
                      value={String(scheduleDayOfMonth)} 
                      onValueChange={(v) => setScheduleDayOfMonth(parseInt(v))}
                    >
                      <SelectTrigger id="schedule-day-of-month" data-testid="select-schedule-day-of-month">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                          <SelectItem key={day} value={String(day)}>
                            {day}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div>
                  <Label htmlFor="schedule-time">Time</Label>
                  <Input
                    id="schedule-time"
                    type="time"
                    value={scheduleTime}
                    onChange={(e) => setScheduleTime(e.target.value)}
                    data-testid="input-schedule-time"
                  />
                </div>

                <div>
                  <Label htmlFor="schedule-recipients">Recipients (comma-separated emails)</Label>
                  <Input
                    id="schedule-recipients"
                    type="text"
                    placeholder="email1@example.com, email2@example.com"
                    value={scheduleRecipients}
                    onChange={(e) => setScheduleRecipients(e.target.value)}
                    data-testid="input-schedule-recipients"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Report will be exported as CSV and sent to these email addresses
                  </p>
                </div>
              </>
            )}
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setScheduleDialogOpen(false)} data-testid="button-cancel-schedule">
              Cancel
            </Button>
            <Button onClick={handleSaveSchedule} data-testid="button-save-schedule">
              <Save className="mr-2 h-4 w-4" />
              Save Schedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
