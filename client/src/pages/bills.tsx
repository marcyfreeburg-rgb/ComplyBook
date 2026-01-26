import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, FileText, DollarSign, Eye, Download, CreditCard, Banknote, Wallet, Repeat, Search, AlertTriangle, Clock, CheckCircle, ArrowUpDown, Calendar } from "lucide-react";
import { format } from "date-fns";
import { safeFormatDate } from "@/lib/utils";
import type { Bill, BillLineItem, Vendor, Organization, Grant } from "@shared/schema";
import { BillPreview } from "@/components/bill-preview";
import html2pdf from "html2pdf.js";

type PaymentMethod = 'ach' | 'card' | 'check' | 'manual';

interface PaymentFormData {
  amount: string;
  paymentMethod: PaymentMethod;
  paymentDate: string;
  checkNumber: string;
  referenceNumber: string;
  notes: string;
}

interface BillFormData {
  vendorId: string;
  billNumber: string;
  issueDate: string;
  dueDate: string;
  status: 'draft' | 'received' | 'scheduled' | 'paid' | 'partial' | 'overdue' | 'cancelled';
  notes: string;
  taxAmount: string;
  fundingSource: 'unrestricted' | 'grant';
  grantId: string;
  isRecurring: boolean;
  recurringFrequency: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly' | '';
  recurringEndDate: string;
  lineItems: Array<{
    description: string;
    quantity: string;
    rate: string;
  }>;
}

interface BillsProps {
  currentOrganization: Organization;
}

const defaultPaymentFormData: PaymentFormData = {
  amount: "",
  paymentMethod: "manual",
  paymentDate: format(new Date(), "yyyy-MM-dd"),
  checkNumber: "",
  referenceNumber: "",
  notes: "",
};

export default function Bills({ currentOrganization }: BillsProps) {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isPreviewDialogOpen, setIsPreviewDialogOpen] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [isNewVendorDialogOpen, setIsNewVendorDialogOpen] = useState(false);
  const [payingBill, setPayingBill] = useState<Bill | null>(null);
  const [editingBill, setEditingBill] = useState<Bill | null>(null);
  const [previewingBill, setPreviewingBill] = useState<(Bill & { vendorName: string | null }) | null>(null);
  const [deleteBillId, setDeleteBillId] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [vendorFilter, setVendorFilter] = useState<string>("all");
  const [fundingSourceFilter, setFundingSourceFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sortField, setSortField] = useState<'dueDate' | 'amount' | 'vendor' | 'issueDate'>('dueDate');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [paymentFormData, setPaymentFormData] = useState<PaymentFormData>(defaultPaymentFormData);
  const [newVendorForm, setNewVendorForm] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
  });

  const [formData, setFormData] = useState<BillFormData>({
    vendorId: "none",
    billNumber: "",
    issueDate: format(new Date(), "yyyy-MM-dd"),
    dueDate: format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), "yyyy-MM-dd"),
    status: "received",
    notes: "",
    taxAmount: "0.00",
    fundingSource: "unrestricted",
    grantId: "none",
    lineItems: [{ description: "", quantity: "1", rate: "0.00" }],
  });

  // Fetch bills
  const { data: bills = [], isLoading: isLoadingBills } = useQuery<Array<Bill & { vendorName: string | null }>>({
    queryKey: ['/api/bills', currentOrganization.id],
  });

  // Fetch vendors for dropdown
  const { data: vendors = [] } = useQuery<Vendor[]>({
    queryKey: ['/api/vendors', currentOrganization.id],
  });

  // Fetch grants for nonprofits to allocate bill funding
  const { data: grants = [] } = useQuery<Grant[]>({
    queryKey: ['/api/grants', currentOrganization.id],
    enabled: currentOrganization.type === 'nonprofit',
  });

  const isNonprofit = currentOrganization.type === 'nonprofit';

  // Fetch line items for preview
  const { data: previewLineItems = [] } = useQuery<BillLineItem[]>({
    queryKey: ['/api/bills', previewingBill?.id, 'line-items'],
    enabled: !!previewingBill,
  });

  const calculateLineItemTotal = (quantity: string, rate: string): number => {
    return parseFloat(quantity || "0") * parseFloat(rate || "0");
  };

  const calculateSubtotal = (): number => {
    return formData.lineItems.reduce((sum, item) => {
      return sum + calculateLineItemTotal(item.quantity, item.rate);
    }, 0);
  };

  const calculateTotal = (): number => {
    const subtotal = calculateSubtotal();
    const tax = parseFloat(formData.taxAmount || "0");
    return subtotal + tax;
  };

  const createBillMutation = useMutation({
    mutationFn: async (data: BillFormData) => {
      const subtotal = calculateSubtotal();
      const totalAmount = calculateTotal();

      // Create the bill first
      const res = await apiRequest('POST', '/api/bills', {
        organizationId: currentOrganization.id,
        vendorId: (data.vendorId && data.vendorId !== "none") ? parseInt(data.vendorId) : null,
        billNumber: data.billNumber,
        issueDate: new Date(data.issueDate),
        dueDate: new Date(data.dueDate),
        status: data.status,
        subtotal: subtotal.toFixed(2),
        taxAmount: data.taxAmount || null,
        totalAmount: totalAmount.toFixed(2),
        notes: data.notes || null,
        fundingSource: data.fundingSource || 'unrestricted',
        grantId: (data.fundingSource === 'grant' && data.grantId && data.grantId !== "none") ? parseInt(data.grantId) : null,
        isRecurring: data.isRecurring || false,
        recurringFrequency: data.isRecurring && data.recurringFrequency ? data.recurringFrequency : null,
        recurringEndDate: data.isRecurring && data.recurringEndDate ? new Date(data.recurringEndDate) : null,
      });
      const bill = await res.json() as Bill;

      // Create line items
      for (const item of data.lineItems) {
        if (item.description.trim()) {
          const amount = calculateLineItemTotal(item.quantity, item.rate);
          await apiRequest('POST', `/api/bills/${bill.id}/line-items`, {
            description: item.description,
            quantity: item.quantity,
            rate: item.rate,
            amount: amount.toFixed(2),
          });
        }
      }

      return bill;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/bills', currentOrganization.id] });
      toast({
        title: "Success",
        description: "Bill created successfully",
      });
      setIsCreateDialogOpen(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create bill",
        variant: "destructive",
      });
    },
  });

  const updateBillMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: Partial<BillFormData> }) => {
      const subtotal = calculateSubtotal();
      const totalAmount = calculateTotal();

      return apiRequest('PATCH', `/api/bills/${id}`, {
        vendorId: (updates.vendorId && updates.vendorId !== "none") ? parseInt(updates.vendorId) : null,
        billNumber: updates.billNumber,
        issueDate: updates.issueDate ? new Date(updates.issueDate) : undefined,
        dueDate: updates.dueDate ? new Date(updates.dueDate) : undefined,
        status: updates.status,
        subtotal: subtotal.toFixed(2),
        taxAmount: updates.taxAmount || null,
        totalAmount: totalAmount.toFixed(2),
        notes: updates.notes || null,
        fundingSource: updates.fundingSource || 'unrestricted',
        grantId: (updates.fundingSource === 'grant' && updates.grantId && updates.grantId !== "none") ? parseInt(updates.grantId) : null,
        isRecurring: updates.isRecurring || false,
        recurringFrequency: updates.isRecurring && updates.recurringFrequency ? updates.recurringFrequency : null,
        recurringEndDate: updates.isRecurring && updates.recurringEndDate ? new Date(updates.recurringEndDate) : null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/bills', currentOrganization.id] });
      toast({
        title: "Success",
        description: "Bill updated successfully",
      });
      setIsEditDialogOpen(false);
      setEditingBill(null);
      resetForm();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update bill",
        variant: "destructive",
      });
    },
  });

  const deleteBillMutation = useMutation({
    mutationFn: (id: number) => apiRequest('DELETE', `/api/bills/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/bills', currentOrganization.id] });
      toast({
        title: "Success",
        description: "Bill deleted successfully",
      });
      setDeleteBillId(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete bill",
        variant: "destructive",
      });
    },
  });

  // Create vendor mutation
  const createVendorMutation = useMutation({
    mutationFn: async (data: typeof newVendorForm) => {
      const response = await apiRequest('POST', '/api/vendors', {
        organizationId: currentOrganization.id,
        name: data.name,
        email: data.email || null,
        phone: data.phone || null,
        address: data.address || null,
      });
      const vendor = await response.json();
      return vendor as Vendor;
    },
    onSuccess: (newVendor: Vendor) => {
      // Update the cache immediately with the new vendor
      queryClient.setQueryData(
        ['/api/vendors', currentOrganization.id],
        (oldData: Vendor[] | undefined) => [...(oldData || []), newVendor]
      );
      toast({
        title: "Success",
        description: "Vendor created successfully",
      });
      // Auto-select the newly created vendor
      setFormData(prev => ({ ...prev, vendorId: newVendor.id.toString() }));
      // Reset form and close dialog
      setNewVendorForm({ name: "", email: "", phone: "", address: "" });
      setIsNewVendorDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create vendor",
        variant: "destructive",
      });
    },
  });

  // Record payment mutation
  const recordPaymentMutation = useMutation({
    mutationFn: async (data: { billId: number; formData: PaymentFormData }) => {
      // Validate amount before sending
      const amount = parseFloat(data.formData.amount);
      if (isNaN(amount) || amount <= 0) {
        throw new Error("Please enter a valid payment amount");
      }
      
      return apiRequest('POST', `/api/bills/${data.billId}/payments`, {
        amount: amount.toFixed(2),
        paymentMethod: data.formData.paymentMethod,
        paymentDate: data.formData.paymentDate, // Send as ISO string, not Date object
        checkNumber: data.formData.checkNumber || null,
        referenceNumber: data.formData.referenceNumber || null,
        notes: data.formData.notes || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/bills', currentOrganization.id] });
      queryClient.invalidateQueries({ queryKey: ['/api/bill-payments', currentOrganization.id] });
      toast({
        title: "Success",
        description: "Payment recorded successfully",
      });
      setIsPaymentDialogOpen(false);
      setPayingBill(null);
      resetPaymentForm();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to record payment",
        variant: "destructive",
      });
    },
  });

  const resetPaymentForm = () => {
    setPaymentFormData(defaultPaymentFormData);
  };

  const handleRecordPayment = (bill: Bill) => {
    setPayingBill(bill);
    setPaymentFormData({
      ...defaultPaymentFormData,
      amount: bill.totalAmount,
      paymentDate: format(new Date(), "yyyy-MM-dd"),
    });
    setIsPaymentDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      vendorId: "none",
      billNumber: "",
      issueDate: format(new Date(), "yyyy-MM-dd"),
      dueDate: format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), "yyyy-MM-dd"),
      status: "received",
      notes: "",
      taxAmount: "0.00",
      fundingSource: "unrestricted",
      grantId: "none",
      isRecurring: false,
      recurringFrequency: "",
      recurringEndDate: "",
      lineItems: [{ description: "", quantity: "1", rate: "0.00" }],
    });
  };

  const handleEdit = (bill: Bill & { vendorName: string | null }) => {
    setEditingBill(bill);
    setFormData({
      vendorId: bill.vendorId?.toString() || "none",
      billNumber: bill.billNumber,
      issueDate: format(new Date(bill.issueDate), "yyyy-MM-dd"),
      dueDate: format(new Date(bill.dueDate), "yyyy-MM-dd"),
      status: bill.status as any,
      notes: bill.notes || "",
      taxAmount: bill.taxAmount || "0.00",
      fundingSource: (bill as any).fundingSource || "unrestricted",
      grantId: (bill as any).grantId?.toString() || "none",
      isRecurring: (bill as any).isRecurring || false,
      recurringFrequency: (bill as any).recurringFrequency || "",
      recurringEndDate: (bill as any).recurringEndDate ? format(new Date((bill as any).recurringEndDate), "yyyy-MM-dd") : "",
      lineItems: [{ description: "", quantity: "1", rate: "0.00" }],
    });
    setIsEditDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    setDeleteBillId(id);
  };

  const confirmDelete = () => {
    if (deleteBillId) {
      deleteBillMutation.mutate(deleteBillId);
    }
  };

  const handleView = (bill: Bill & { vendorName: string | null }) => {
    setPreviewingBill(bill);
    setIsPreviewDialogOpen(true);
  };

  const handleDownloadPDF = () => {
    if (!previewingBill) return;
    
    const element = document.querySelector('[data-testid="bill-preview"]');
    if (!element) return;

    const opt = {
      margin: 0.5,
      filename: `bill-${previewingBill.billNumber}.pdf`,
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' as const }
    };

    html2pdf().set(opt).from(element as HTMLElement).save();
  };

  const addLineItem = () => {
    setFormData({
      ...formData,
      lineItems: [...formData.lineItems, { description: "", quantity: "1", rate: "0.00" }],
    });
  };

  const removeLineItem = (index: number) => {
    setFormData({
      ...formData,
      lineItems: formData.lineItems.filter((_, i) => i !== index),
    });
  };

  const updateLineItem = (index: number, field: keyof BillFormData['lineItems'][0], value: string) => {
    const updated = [...formData.lineItems];
    updated[index] = { ...updated[index], [field]: value };
    setFormData({ ...formData, lineItems: updated });
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      draft: "outline",
      received: "secondary",
      scheduled: "outline",
      paid: "default",
      partial: "outline",
      overdue: "destructive",
      cancelled: "secondary",
    };
    return <Badge variant={variants[status] || "default"} data-testid={`badge-status-${status}`}>{status}</Badge>;
  };

  // Calculate summary metrics using date-only comparisons
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Start of today
  const sevenDaysFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
  
  const totalOutstanding = bills
    .filter(b => ['received', 'scheduled', 'partial'].includes(b.status))
    .reduce((sum, b) => sum + parseFloat(b.totalAmount), 0);
  
  const dueSoonBills = bills.filter(b => {
    if (['paid', 'cancelled'].includes(b.status)) return false;
    const dueDate = new Date(b.dueDate);
    dueDate.setHours(0, 0, 0, 0);
    return dueDate >= today && dueDate <= sevenDaysFromNow;
  });
  const dueSoonAmount = dueSoonBills.reduce((sum, b) => sum + parseFloat(b.totalAmount), 0);
  
  const overdueBills = bills.filter(b => {
    if (['paid', 'cancelled'].includes(b.status)) return false;
    const dueDate = new Date(b.dueDate);
    dueDate.setHours(0, 0, 0, 0);
    return dueDate < today;
  });
  const overdueAmount = overdueBills.reduce((sum, b) => sum + parseFloat(b.totalAmount), 0);
  
  const totalPaidAllTime = bills
    .filter(b => b.status === 'paid')
    .reduce((sum, b) => sum + parseFloat(b.totalAmount), 0);

  // Filter and sort bills
  const filteredBills = bills
    .filter(bill => {
      // Status filter
      if (statusFilter !== "all" && bill.status !== statusFilter) return false;
      
      // Vendor filter
      if (vendorFilter !== "all" && bill.vendorId?.toString() !== vendorFilter) return false;
      
      // Funding source filter (nonprofit only)
      if (fundingSourceFilter !== "all") {
        const billFundingSource = (bill as any).fundingSource || 'unrestricted';
        if (fundingSourceFilter === 'unrestricted' && billFundingSource !== 'unrestricted') return false;
        if (fundingSourceFilter.startsWith('grant-')) {
          const grantId = fundingSourceFilter.replace('grant-', '');
          if ((bill as any).grantId?.toString() !== grantId) return false;
        }
      }
      
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesBillNumber = bill.billNumber.toLowerCase().includes(query);
        const matchesVendor = bill.vendorName?.toLowerCase().includes(query);
        const matchesAmount = bill.totalAmount.includes(query);
        if (!matchesBillNumber && !matchesVendor && !matchesAmount) return false;
      }
      
      return true;
    })
    .sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'dueDate':
          comparison = new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
          break;
        case 'issueDate':
          comparison = new Date(a.issueDate).getTime() - new Date(b.issueDate).getTime();
          break;
        case 'amount':
          comparison = parseFloat(a.totalAmount) - parseFloat(b.totalAmount);
          break;
        case 'vendor':
          comparison = (a.vendorName || '').localeCompare(b.vendorName || '');
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });

  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const isOverdue = (bill: Bill) => {
    if (['paid', 'cancelled'].includes(bill.status)) return false;
    const dueDate = new Date(bill.dueDate);
    dueDate.setHours(0, 0, 0, 0);
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    return dueDate < todayStart;
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Bills</h1>
          <p className="text-muted-foreground">Manage bills received from vendors</p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)} data-testid="button-create-bill">
          <Plus className="w-4 h-4 mr-2" />
          Create Bill
        </Button>
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <DollarSign className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Outstanding</p>
                <p className="text-2xl font-bold" data-testid="metric-outstanding">${totalOutstanding.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 dark:bg-orange-900 rounded-lg">
                <Clock className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Due in 7 Days</p>
                <p className="text-2xl font-bold" data-testid="metric-due-soon">
                  ${dueSoonAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  <span className="text-sm font-normal text-muted-foreground ml-1">({dueSoonBills.length})</span>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className={overdueBills.length > 0 ? "border-red-200 dark:border-red-800" : ""}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${overdueBills.length > 0 ? "bg-red-100 dark:bg-red-900" : "bg-gray-100 dark:bg-gray-800"}`}>
                <AlertTriangle className={`w-5 h-5 ${overdueBills.length > 0 ? "text-red-600 dark:text-red-400" : "text-gray-500"}`} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Overdue</p>
                <p className={`text-2xl font-bold ${overdueBills.length > 0 ? "text-red-600 dark:text-red-400" : ""}`} data-testid="metric-overdue">
                  ${overdueAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  <span className="text-sm font-normal text-muted-foreground ml-1">({overdueBills.length})</span>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Paid</p>
                <p className="text-2xl font-bold" data-testid="metric-paid">${totalPaidAllTime.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Bill List</CardTitle>
                <CardDescription>View and manage your bills</CardDescription>
              </div>
            </div>
            
            {/* Search and Filters */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search bills, vendors, amounts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                  data-testid="input-search"
                />
              </div>
              
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-36" data-testid="select-status-filter">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="received">Received</SelectItem>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="partial">Partial</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={vendorFilter} onValueChange={setVendorFilter}>
                <SelectTrigger className="w-40" data-testid="select-vendor-filter">
                  <SelectValue placeholder="Vendor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Vendors</SelectItem>
                  {vendors.map((vendor) => (
                    <SelectItem key={vendor.id} value={vendor.id.toString()}>
                      {vendor.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {isNonprofit && (
                <Select value={fundingSourceFilter} onValueChange={setFundingSourceFilter}>
                  <SelectTrigger className="w-48" data-testid="select-funding-filter">
                    <SelectValue placeholder="Funding Source" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Funding Sources</SelectItem>
                    <SelectItem value="unrestricted">Unrestricted Funds</SelectItem>
                    {grants.filter(g => g.status === 'active').map((grant) => (
                      <SelectItem key={grant.id} value={`grant-${grant.id}`}>
                        {grant.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingBills ? (
            <div className="text-center py-8 text-muted-foreground">Loading bills...</div>
          ) : filteredBills.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No bills found. Create your first bill to get started.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-3 font-medium">Bill/Account #</th>
                    <th className="pb-3 font-medium">
                      <button 
                        onClick={() => toggleSort('vendor')}
                        className="flex items-center gap-1 hover:text-primary"
                        data-testid="sort-vendor"
                      >
                        Vendor
                        <ArrowUpDown className={`w-3 h-3 ${sortField === 'vendor' ? 'text-primary' : 'text-muted-foreground'}`} />
                      </button>
                    </th>
                    <th className="pb-3 font-medium">
                      <button 
                        onClick={() => toggleSort('issueDate')}
                        className="flex items-center gap-1 hover:text-primary"
                        data-testid="sort-issue-date"
                      >
                        Issue Date
                        <ArrowUpDown className={`w-3 h-3 ${sortField === 'issueDate' ? 'text-primary' : 'text-muted-foreground'}`} />
                      </button>
                    </th>
                    <th className="pb-3 font-medium">
                      <button 
                        onClick={() => toggleSort('dueDate')}
                        className="flex items-center gap-1 hover:text-primary"
                        data-testid="sort-due-date"
                      >
                        Due Date
                        <ArrowUpDown className={`w-3 h-3 ${sortField === 'dueDate' ? 'text-primary' : 'text-muted-foreground'}`} />
                      </button>
                    </th>
                    <th className="pb-3 font-medium">
                      <button 
                        onClick={() => toggleSort('amount')}
                        className="flex items-center gap-1 hover:text-primary"
                        data-testid="sort-amount"
                      >
                        Amount
                        <ArrowUpDown className={`w-3 h-3 ${sortField === 'amount' ? 'text-primary' : 'text-muted-foreground'}`} />
                      </button>
                    </th>
                    <th className="pb-3 font-medium">Status</th>
                    <th className="pb-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBills.map((bill) => (
                    <tr 
                      key={bill.id} 
                      className={`border-b ${isOverdue(bill) ? 'bg-red-50 dark:bg-red-950/30' : ''}`} 
                      data-testid={`row-bill-${bill.id}`}
                    >
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-muted-foreground" />
                          <span className="font-medium" data-testid={`text-bill-number-${bill.id}`}>{bill.billNumber}</span>
                        </div>
                      </td>
                      <td className="py-3" data-testid={`text-vendor-${bill.id}`}>
                        {bill.vendorName || <span className="text-muted-foreground">No vendor</span>}
                      </td>
                      <td className="py-3">{safeFormatDate(bill.issueDate, "MMM dd, yyyy")}</td>
                      <td className="py-3">{safeFormatDate(bill.dueDate, "MMM dd, yyyy")}</td>
                      <td className="py-3">
                        <div className="flex items-center gap-1">
                          <DollarSign className="w-4 h-4 text-muted-foreground" />
                          <span className="font-medium" data-testid={`text-amount-${bill.id}`}>
                            {parseFloat(bill.totalAmount).toFixed(2)}
                          </span>
                        </div>
                      </td>
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          {getStatusBadge(bill.status)}
                          {(bill as any).isRecurring && (
                            <Badge variant="outline" className="text-xs">
                              <Repeat className="w-3 h-3 mr-1" />
                              Recurring
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="py-3">
                        <div className="flex items-center gap-1">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleView(bill)}
                                data-testid={`button-view-bill-${bill.id}`}
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>View Bill</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEdit(bill)}
                                data-testid={`button-edit-${bill.id}`}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Edit Bill</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDelete(bill.id)}
                                data-testid={`button-delete-${bill.id}`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Delete Bill</TooltipContent>
                          </Tooltip>
                          {bill.status !== 'paid' && bill.status !== 'cancelled' ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleRecordPayment(bill)}
                                  data-testid={`button-pay-${bill.id}`}
                                >
                                  <DollarSign className="w-4 h-4 mr-1" />
                                  Pay
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Record Payment</TooltipContent>
                            </Tooltip>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              disabled
                              className="opacity-50 cursor-not-allowed"
                            >
                              <CheckCircle className="w-4 h-4 mr-1" />
                              {bill.status === 'paid' ? 'Paid' : 'Cancelled'}
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Bill Dialog */}
      <Dialog open={isCreateDialogOpen || isEditDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setIsCreateDialogOpen(false);
          setIsEditDialogOpen(false);
          setEditingBill(null);
          resetForm();
        }
      }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingBill ? "Edit Bill" : "Create New Bill"}</DialogTitle>
            <DialogDescription>
              {editingBill ? "Update the bill details" : "Fill in the details to create a new bill"}
            </DialogDescription>
          </DialogHeader>
          
          {/* Warning banners */}
          {formData.dueDate && (() => {
            const dueDate = new Date(formData.dueDate);
            dueDate.setHours(0, 0, 0, 0);
            const todayStart = new Date();
            todayStart.setHours(0, 0, 0, 0);
            return dueDate < todayStart;
          })() && formData.status !== 'paid' && formData.status !== 'cancelled' && (
            <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300">
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              <div className="text-sm">
                <span className="font-medium">Past Due:</span> This bill's due date has passed. Consider updating the status to "Overdue" or recording a payment.
              </div>
            </div>
          )}
          
          {isNonprofit && formData.fundingSource === 'grant' && formData.grantId && formData.grantId !== 'none' && (() => {
            const selectedGrant = grants.find(g => g.id.toString() === formData.grantId);
            if (selectedGrant) {
              const remaining = Number(selectedGrant.amount) - Number((selectedGrant as any).spentAmount || 0);
              if (remaining < calculateTotal()) {
                return (
                  <div className="flex items-center gap-2 p-3 bg-orange-50 dark:bg-orange-950/50 border border-orange-200 dark:border-orange-800 rounded-lg text-orange-700 dark:text-orange-300">
                    <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                    <div className="text-sm">
                      <span className="font-medium">Low Grant Funds:</span> The selected grant has ${remaining.toLocaleString()} remaining, which is less than this bill's total of ${calculateTotal().toLocaleString()}.
                    </div>
                  </div>
                );
              }
            }
            return null;
          })()}
          
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (editingBill) {
                updateBillMutation.mutate({ id: editingBill.id, updates: formData });
              } else {
                createBillMutation.mutate(formData);
              }
            }}
            className="space-y-4"
          >
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="vendorId">Vendor</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsNewVendorDialogOpen(true)}
                    data-testid="button-create-vendor"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    New Vendor
                  </Button>
                </div>
                <Select
                  value={formData.vendorId}
                  onValueChange={(value) => setFormData({ ...formData, vendorId: value })}
                >
                  <SelectTrigger id="vendorId" data-testid="select-vendor">
                    <SelectValue placeholder="Select vendor (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No vendor</SelectItem>
                    {vendors.map((vendor) => (
                      <SelectItem key={vendor.id} value={vendor.id.toString()}>
                        {vendor.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="billNumber">Bill/Account Number *</Label>
                <Input
                  id="billNumber"
                  value={formData.billNumber}
                  onChange={(e) => setFormData({ ...formData, billNumber: e.target.value })}
                  placeholder="BILL-001 or Account #"
                  required
                  data-testid="input-bill-number"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="issueDate">Issue Date *</Label>
                <Input
                  id="issueDate"
                  type="date"
                  value={formData.issueDate}
                  onChange={(e) => setFormData({ ...formData, issueDate: e.target.value })}
                  required
                  data-testid="input-issue-date"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="dueDate">Due Date *</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                  required
                  data-testid="input-due-date"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status *</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value: any) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger id="status" data-testid="select-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="received">Received</SelectItem>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="partial">Partial</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="taxAmount">Tax Amount</Label>
                <Input
                  id="taxAmount"
                  type="number"
                  step="0.01"
                  value={formData.taxAmount}
                  onChange={(e) => setFormData({ ...formData, taxAmount: e.target.value })}
                  placeholder="0.00"
                  data-testid="input-tax-amount"
                />
              </div>
            </div>

            {/* Funding Source - Only for nonprofits */}
            {isNonprofit && (
              <div className="p-4 border rounded-lg bg-muted/30 space-y-4">
                <div className="flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-muted-foreground" />
                  <Label className="text-sm font-medium">Payment Funding Source</Label>
                </div>
                <p className="text-xs text-muted-foreground">
                  Choose how this bill will be funded when paid. This helps track spending against unrestricted funds or specific grants.
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="fundingSource">Funding Source</Label>
                    <Select
                      value={formData.fundingSource}
                      onValueChange={(value: 'unrestricted' | 'grant') => {
                        setFormData({ 
                          ...formData, 
                          fundingSource: value,
                          grantId: value === 'unrestricted' ? 'none' : formData.grantId
                        });
                      }}
                    >
                      <SelectTrigger id="fundingSource" data-testid="select-funding-source">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unrestricted">Unrestricted Funds</SelectItem>
                        <SelectItem value="grant">Specific Grant</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {formData.fundingSource === 'grant' && (
                    <div className="space-y-2">
                      <Label htmlFor="grantId">Select Grant</Label>
                      <Select
                        value={formData.grantId}
                        onValueChange={(value) => setFormData({ ...formData, grantId: value })}
                      >
                        <SelectTrigger id="grantId" data-testid="select-grant">
                          <SelectValue placeholder="Select a grant" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Select a grant...</SelectItem>
                          {grants.filter(g => g.status === 'active').map((grant) => {
                            const remaining = Number(grant.amount) - Number((grant as any).spentAmount || 0);
                            const isLowFunds = remaining < calculateTotal();
                            return (
                              <SelectItem key={grant.id} value={grant.id.toString()}>
                                <div className="flex flex-col">
                                  <span>{grant.name}</span>
                                  <span className={`text-xs ${isLowFunds ? 'text-orange-600' : 'text-muted-foreground'}`}>
                                    ${remaining.toLocaleString()} remaining of ${Number(grant.amount).toLocaleString()}
                                  </span>
                                </div>
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Recurring Bill Settings */}
            <div className="p-4 border rounded-lg bg-muted/30 space-y-4">
              <div className="flex items-center gap-2">
                <Repeat className="w-4 h-4 text-muted-foreground" />
                <Label className="text-sm font-medium">Recurring Bill</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isRecurring"
                  checked={formData.isRecurring}
                  onCheckedChange={(checked) => setFormData({ 
                    ...formData, 
                    isRecurring: checked as boolean,
                    recurringFrequency: checked ? 'monthly' : '',
                    recurringEndDate: ''
                  })}
                  data-testid="checkbox-recurring"
                />
                <Label htmlFor="isRecurring" className="text-sm cursor-pointer">
                  This is a recurring bill
                </Label>
              </div>
              
              {formData.isRecurring && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="recurringFrequency">Frequency</Label>
                    <Select
                      value={formData.recurringFrequency}
                      onValueChange={(value: any) => setFormData({ ...formData, recurringFrequency: value })}
                    >
                      <SelectTrigger id="recurringFrequency" data-testid="select-recurring-frequency">
                        <SelectValue placeholder="Select frequency" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="biweekly">Bi-weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="quarterly">Quarterly</SelectItem>
                        <SelectItem value="yearly">Yearly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="recurringEndDate">End Date (Optional)</Label>
                    <Input
                      id="recurringEndDate"
                      type="date"
                      value={formData.recurringEndDate}
                      onChange={(e) => setFormData({ ...formData, recurringEndDate: e.target.value })}
                      data-testid="input-recurring-end-date"
                    />
                    <p className="text-xs text-muted-foreground">Leave blank for no end date</p>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional notes about this bill"
                rows={3}
                data-testid="input-notes"
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Line Items</Label>
                <Button type="button" variant="outline" size="sm" onClick={addLineItem} data-testid="button-add-line-item">
                  <Plus className="w-4 h-4 mr-1" />
                  Add Item
                </Button>
              </div>
              {formData.lineItems.map((item, index) => (
                <div key={index} className="grid grid-cols-12 gap-2 items-end" data-testid={`line-item-${index}`}>
                  <div className="col-span-5 space-y-1">
                    <Label className="text-xs">Description</Label>
                    <Input
                      value={item.description}
                      onChange={(e) => updateLineItem(index, 'description', e.target.value)}
                      placeholder="Item description"
                      data-testid={`input-description-${index}`}
                    />
                  </div>
                  <div className="col-span-2 space-y-1">
                    <Label className="text-xs">Quantity</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={item.quantity}
                      onChange={(e) => updateLineItem(index, 'quantity', e.target.value)}
                      data-testid={`input-quantity-${index}`}
                    />
                  </div>
                  <div className="col-span-2 space-y-1">
                    <Label className="text-xs">Rate</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={item.rate}
                      onChange={(e) => updateLineItem(index, 'rate', e.target.value)}
                      data-testid={`input-rate-${index}`}
                    />
                  </div>
                  <div className="col-span-2 space-y-1">
                    <Label className="text-xs">Amount</Label>
                    <Input
                      value={calculateLineItemTotal(item.quantity, item.rate).toFixed(2)}
                      disabled
                      data-testid={`text-line-total-${index}`}
                    />
                  </div>
                  <div className="col-span-1">
                    {formData.lineItems.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeLineItem(index)}
                        data-testid={`button-remove-line-item-${index}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t pt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span>Subtotal:</span>
                <span className="font-medium" data-testid="text-subtotal">${calculateSubtotal().toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Tax:</span>
                <span className="font-medium" data-testid="text-tax">${parseFloat(formData.taxAmount || "0").toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold">
                <span>Total:</span>
                <span data-testid="text-total">${calculateTotal().toFixed(2)}</span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsCreateDialogOpen(false);
                  setIsEditDialogOpen(false);
                  setEditingBill(null);
                  resetForm();
                }}
                data-testid="button-cancel"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createBillMutation.isPending || updateBillMutation.isPending}
                data-testid="button-save-bill"
              >
                {editingBill 
                  ? (updateBillMutation.isPending ? "Updating..." : "Update Bill")
                  : (createBillMutation.isPending ? "Creating..." : "Create Bill")
                }
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Preview Bill Dialog */}
      <Dialog open={isPreviewDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setIsPreviewDialogOpen(false);
          setPreviewingBill(null);
        }
      }}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle>Bill Preview</DialogTitle>
                <DialogDescription>
                  View and print bill with company branding
                </DialogDescription>
              </div>
              <Button
                onClick={handleDownloadPDF}
                variant="default"
                size="sm"
                data-testid="button-download-bill-pdf"
              >
                <Download className="w-4 h-4 mr-2" />
                Download PDF
              </Button>
            </div>
          </DialogHeader>
          {previewingBill && (
            <BillPreview
              bill={previewingBill}
              lineItems={previewLineItems}
              organization={currentOrganization}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteBillId !== null} onOpenChange={(open) => !open && setDeleteBillId(null)}>
        <AlertDialogContent data-testid="dialog-confirm-delete">
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this bill. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Record Payment Dialog */}
      <Dialog open={isPaymentDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setIsPaymentDialogOpen(false);
          setPayingBill(null);
          resetPaymentForm();
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
            <DialogDescription>
              {payingBill && `Record a payment for Bill #${payingBill.billNumber}`}
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (payingBill) {
                recordPaymentMutation.mutate({ billId: payingBill.id, formData: paymentFormData });
              }
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="paymentAmount">Payment Amount *</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="paymentAmount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={paymentFormData.amount}
                  onChange={(e) => setPaymentFormData({ ...paymentFormData, amount: e.target.value })}
                  className="pl-9"
                  required
                  data-testid="input-payment-amount"
                />
              </div>
              {payingBill && (
                <p className="text-xs text-muted-foreground">
                  Bill total: ${parseFloat(payingBill.totalAmount).toFixed(2)}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="paymentMethod">Payment Method *</Label>
              <Select
                value={paymentFormData.paymentMethod}
                onValueChange={(value: PaymentMethod) => setPaymentFormData({ ...paymentFormData, paymentMethod: value })}
              >
                <SelectTrigger id="paymentMethod" data-testid="select-payment-method">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ach">
                    <div className="flex items-center gap-2">
                      <Banknote className="w-4 h-4" />
                      Bank Transfer (ACH)
                    </div>
                  </SelectItem>
                  <SelectItem value="card">
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-4 h-4" />
                      Credit Card
                    </div>
                  </SelectItem>
                  <SelectItem value="check">
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4" />
                      Check
                    </div>
                  </SelectItem>
                  <SelectItem value="manual">
                    <div className="flex items-center gap-2">
                      <Wallet className="w-4 h-4" />
                      Manual / Other
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="paymentDate">Payment Date *</Label>
              <Input
                id="paymentDate"
                type="date"
                value={paymentFormData.paymentDate}
                onChange={(e) => setPaymentFormData({ ...paymentFormData, paymentDate: e.target.value })}
                required
                data-testid="input-payment-date"
              />
            </div>

            {paymentFormData.paymentMethod === 'check' && (
              <div className="space-y-2">
                <Label htmlFor="checkNumber">Check Number</Label>
                <Input
                  id="checkNumber"
                  value={paymentFormData.checkNumber}
                  onChange={(e) => setPaymentFormData({ ...paymentFormData, checkNumber: e.target.value })}
                  placeholder="e.g., 1234"
                  data-testid="input-check-number"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="referenceNumber">Reference Number</Label>
              <Input
                id="referenceNumber"
                value={paymentFormData.referenceNumber}
                onChange={(e) => setPaymentFormData({ ...paymentFormData, referenceNumber: e.target.value })}
                placeholder="Optional reference or confirmation number"
                data-testid="input-reference-number"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="paymentNotes">Notes</Label>
              <Textarea
                id="paymentNotes"
                value={paymentFormData.notes}
                onChange={(e) => setPaymentFormData({ ...paymentFormData, notes: e.target.value })}
                placeholder="Optional notes about this payment"
                rows={2}
                data-testid="input-payment-notes"
              />
            </div>

            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => {
                  setIsPaymentDialogOpen(false);
                  setPayingBill(null);
                  resetPaymentForm();
                }}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={recordPaymentMutation.isPending}
                data-testid="button-record-payment"
              >
                {recordPaymentMutation.isPending ? "Recording..." : "Record Payment"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Create New Vendor Dialog */}
      <Dialog open={isNewVendorDialogOpen} onOpenChange={setIsNewVendorDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Vendor</DialogTitle>
            <DialogDescription>
              Add a new vendor to quickly select when creating bills
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              createVendorMutation.mutate(newVendorForm);
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="vendor-name">Vendor Name *</Label>
              <Input
                id="vendor-name"
                value={newVendorForm.name}
                onChange={(e) => setNewVendorForm({ ...newVendorForm, name: e.target.value })}
                placeholder="Enter vendor name"
                required
                data-testid="input-new-vendor-name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="vendor-email">Email</Label>
              <Input
                id="vendor-email"
                type="email"
                value={newVendorForm.email}
                onChange={(e) => setNewVendorForm({ ...newVendorForm, email: e.target.value })}
                placeholder="vendor@example.com"
                data-testid="input-new-vendor-email"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="vendor-phone">Phone</Label>
              <Input
                id="vendor-phone"
                value={newVendorForm.phone}
                onChange={(e) => setNewVendorForm({ ...newVendorForm, phone: e.target.value })}
                placeholder="(555) 123-4567"
                data-testid="input-new-vendor-phone"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="vendor-address">Address</Label>
              <Textarea
                id="vendor-address"
                value={newVendorForm.address}
                onChange={(e) => setNewVendorForm({ ...newVendorForm, address: e.target.value })}
                placeholder="Enter vendor address"
                data-testid="input-new-vendor-address"
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setNewVendorForm({ name: "", email: "", phone: "", address: "" });
                  setIsNewVendorDialogOpen(false);
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createVendorMutation.isPending || !newVendorForm.name.trim()}
                data-testid="button-submit-new-vendor"
              >
                {createVendorMutation.isPending ? "Creating..." : "Create Vendor"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
