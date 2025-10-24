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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, FileText, DollarSign, Eye, Download } from "lucide-react";
import { format } from "date-fns";
import type { Bill, BillLineItem, Vendor, Organization } from "@shared/schema";
import { BillPreview } from "@/components/bill-preview";
import html2pdf from "html2pdf.js";

interface BillFormData {
  vendorId: string;
  billNumber: string;
  issueDate: string;
  dueDate: string;
  status: 'received' | 'scheduled' | 'paid' | 'partial' | 'overdue' | 'cancelled';
  notes: string;
  taxAmount: string;
  lineItems: Array<{
    description: string;
    quantity: string;
    rate: string;
  }>;
}

interface BillsProps {
  currentOrganization: Organization;
}

export default function Bills({ currentOrganization }: BillsProps) {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isPreviewDialogOpen, setIsPreviewDialogOpen] = useState(false);
  const [editingBill, setEditingBill] = useState<Bill | null>(null);
  const [previewingBill, setPreviewingBill] = useState<(Bill & { vendorName: string | null }) | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const [formData, setFormData] = useState<BillFormData>({
    vendorId: "none",
    billNumber: "",
    issueDate: format(new Date(), "yyyy-MM-dd"),
    dueDate: format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), "yyyy-MM-dd"),
    status: "received",
    notes: "",
    taxAmount: "0.00",
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
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete bill",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      vendorId: "none",
      billNumber: "",
      issueDate: format(new Date(), "yyyy-MM-dd"),
      dueDate: format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), "yyyy-MM-dd"),
      status: "received",
      notes: "",
      taxAmount: "0.00",
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
      lineItems: [{ description: "", quantity: "1", rate: "0.00" }],
    });
    setIsEditDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this bill?")) {
      deleteBillMutation.mutate(id);
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
      received: "secondary",
      scheduled: "outline",
      paid: "default",
      partial: "outline",
      overdue: "destructive",
      cancelled: "secondary",
    };
    return <Badge variant={variants[status] || "default"} data-testid={`badge-status-${status}`}>{status}</Badge>;
  };

  const filteredBills = statusFilter === "all" 
    ? bills 
    : bills.filter(bill => bill.status === statusFilter);

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


      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Bill List</CardTitle>
              <CardDescription>View and manage your bills</CardDescription>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40" data-testid="select-status-filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="received">Received</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="partial">Partial</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
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
                    <th className="pb-3 font-medium">Bill #</th>
                    <th className="pb-3 font-medium">Vendor</th>
                    <th className="pb-3 font-medium">Issue Date</th>
                    <th className="pb-3 font-medium">Due Date</th>
                    <th className="pb-3 font-medium">Amount</th>
                    <th className="pb-3 font-medium">Status</th>
                    <th className="pb-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBills.map((bill) => (
                    <tr key={bill.id} className="border-b" data-testid={`row-bill-${bill.id}`}>
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-muted-foreground" />
                          <span className="font-medium" data-testid={`text-bill-number-${bill.id}`}>{bill.billNumber}</span>
                        </div>
                      </td>
                      <td className="py-3" data-testid={`text-vendor-${bill.id}`}>
                        {bill.vendorName || <span className="text-muted-foreground">No vendor</span>}
                      </td>
                      <td className="py-3">{format(new Date(bill.issueDate), "MMM dd, yyyy")}</td>
                      <td className="py-3">{format(new Date(bill.dueDate), "MMM dd, yyyy")}</td>
                      <td className="py-3">
                        <div className="flex items-center gap-1">
                          <DollarSign className="w-4 h-4 text-muted-foreground" />
                          <span className="font-medium" data-testid={`text-amount-${bill.id}`}>
                            {parseFloat(bill.totalAmount).toFixed(2)}
                          </span>
                        </div>
                      </td>
                      <td className="py-3">{getStatusBadge(bill.status)}</td>
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleView(bill)}
                            data-testid={`button-view-bill-${bill.id}`}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(bill)}
                            data-testid={`button-edit-bill-${bill.id}`}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(bill.id)}
                            data-testid={`button-delete-bill-${bill.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
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
                <Label htmlFor="vendorId">Vendor</Label>
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
                <Label htmlFor="billNumber">Bill Number *</Label>
                <Input
                  id="billNumber"
                  value={formData.billNumber}
                  onChange={(e) => setFormData({ ...formData, billNumber: e.target.value })}
                  placeholder="BILL-001"
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
                {editingBill ? "Update Bill" : "Create Bill"}
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
    </div>
  );
}
