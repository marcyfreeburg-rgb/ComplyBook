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
import { Plus, Edit, Trash2, FileText, DollarSign, Eye } from "lucide-react";
import { format } from "date-fns";
import type { Invoice, InvoiceLineItem, Client, Organization } from "@shared/schema";
import { InvoicePreview } from "@/components/invoice-preview";

interface InvoiceFormData {
  clientId: string;
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  status: 'draft' | 'sent' | 'paid' | 'partial' | 'overdue' | 'cancelled';
  notes: string;
  taxAmount: string;
  lineItems: Array<{
    description: string;
    quantity: string;
    rate: string;
  }>;
}

interface InvoicesProps {
  currentOrganization: Organization;
}

export default function Invoices({ currentOrganization }: InvoicesProps) {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isPreviewDialogOpen, setIsPreviewDialogOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [previewingInvoice, setPreviewingInvoice] = useState<(Invoice & { clientName: string | null }) | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const [formData, setFormData] = useState<InvoiceFormData>({
    clientId: "none",
    invoiceNumber: "",
    issueDate: format(new Date(), "yyyy-MM-dd"),
    dueDate: format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), "yyyy-MM-dd"), // 30 days from now
    status: "draft",
    notes: "",
    taxAmount: "0.00",
    lineItems: [{ description: "", quantity: "1", rate: "0.00" }],
  });

  // Fetch invoices
  const { data: invoices = [], isLoading: isLoadingInvoices } = useQuery<Array<Invoice & { clientName: string | null }>>({
    queryKey: ['/api/invoices', currentOrganization.id],
  });

  // Fetch clients for dropdown
  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ['/api/clients', currentOrganization.id],
  });

  // Fetch line items for preview
  const { data: previewLineItems = [] } = useQuery<InvoiceLineItem[]>({
    queryKey: ['/api/invoices', previewingInvoice?.id, 'line-items'],
    enabled: !!previewingInvoice,
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

  const createInvoiceMutation = useMutation({
    mutationFn: async (data: InvoiceFormData) => {
      const subtotal = calculateSubtotal();
      const totalAmount = calculateTotal();

      // Create the invoice first
      const res = await apiRequest('POST', '/api/invoices', {
        organizationId: currentOrganization.id,
        clientId: (data.clientId && data.clientId !== "none") ? parseInt(data.clientId) : null,
        invoiceNumber: data.invoiceNumber,
        issueDate: new Date(data.issueDate),
        dueDate: new Date(data.dueDate),
        status: data.status,
        subtotal: subtotal.toFixed(2),
        taxAmount: data.taxAmount || null,
        totalAmount: totalAmount.toFixed(2),
        notes: data.notes || null,
      });
      const invoice = await res.json() as Invoice;

      // Create line items
      for (const item of data.lineItems) {
        if (item.description.trim()) {
          const amount = calculateLineItemTotal(item.quantity, item.rate);
          await apiRequest('POST', `/api/invoices/${invoice.id}/line-items`, {
            description: item.description,
            quantity: item.quantity,
            rate: item.rate,
            amount: amount.toFixed(2),
          });
        }
      }

      return invoice;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/invoices', currentOrganization.id] });
      toast({
        title: "Success",
        description: "Invoice created successfully",
      });
      setIsCreateDialogOpen(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create invoice",
        variant: "destructive",
      });
    },
  });

  const updateInvoiceMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: Partial<InvoiceFormData> }) => {
      const subtotal = calculateSubtotal();
      const totalAmount = calculateTotal();

      return apiRequest('PATCH', `/api/invoices/${id}`, {
        clientId: (updates.clientId && updates.clientId !== "none") ? parseInt(updates.clientId) : null,
        invoiceNumber: updates.invoiceNumber,
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
      queryClient.invalidateQueries({ queryKey: ['/api/invoices', currentOrganization.id] });
      toast({
        title: "Success",
        description: "Invoice updated successfully",
      });
      setIsEditDialogOpen(false);
      setEditingInvoice(null);
      resetForm();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update invoice",
        variant: "destructive",
      });
    },
  });

  const deleteInvoiceMutation = useMutation({
    mutationFn: (id: number) => apiRequest('DELETE', `/api/invoices/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/invoices', currentOrganization.id] });
      toast({
        title: "Success",
        description: "Invoice deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete invoice",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      clientId: "none",
      invoiceNumber: "",
      issueDate: format(new Date(), "yyyy-MM-dd"),
      dueDate: format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), "yyyy-MM-dd"),
      status: "draft",
      notes: "",
      taxAmount: "0.00",
      lineItems: [{ description: "", quantity: "1", rate: "0.00" }],
    });
  };

  const handleEdit = (invoice: Invoice & { clientName: string | null }) => {
    setEditingInvoice(invoice);
    setFormData({
      clientId: invoice.clientId?.toString() || "none",
      invoiceNumber: invoice.invoiceNumber,
      issueDate: format(new Date(invoice.issueDate), "yyyy-MM-dd"),
      dueDate: format(new Date(invoice.dueDate), "yyyy-MM-dd"),
      status: invoice.status as any,
      notes: invoice.notes || "",
      taxAmount: invoice.taxAmount || "0.00",
      lineItems: [{ description: "", quantity: "1", rate: "0.00" }],
    });
    setIsEditDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this invoice?")) {
      deleteInvoiceMutation.mutate(id);
    }
  };

  const handleView = (invoice: Invoice & { clientName: string | null }) => {
    setPreviewingInvoice(invoice);
    setIsPreviewDialogOpen(true);
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

  const updateLineItem = (index: number, field: keyof InvoiceFormData['lineItems'][0], value: string) => {
    const updated = [...formData.lineItems];
    updated[index] = { ...updated[index], [field]: value };
    setFormData({ ...formData, lineItems: updated });
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      draft: "secondary",
      sent: "default",
      paid: "default",
      partial: "outline",
      overdue: "destructive",
      cancelled: "secondary",
    };
    return <Badge variant={variants[status] || "default"} data-testid={`badge-status-${status}`}>{status}</Badge>;
  };

  const filteredInvoices = statusFilter === "all" 
    ? invoices 
    : invoices.filter(inv => inv.status === statusFilter);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Invoices</h1>
          <p className="text-muted-foreground">Manage invoices sent to clients</p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)} data-testid="button-create-invoice">
          <Plus className="w-4 h-4 mr-2" />
          Create Invoice
        </Button>
      </div>


      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Invoice List</CardTitle>
              <CardDescription>View and manage your invoices</CardDescription>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40" data-testid="select-status-filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="partial">Partial</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingInvoices ? (
            <div className="text-center py-8 text-muted-foreground">Loading invoices...</div>
          ) : filteredInvoices.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No invoices found. Create your first invoice to get started.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-3 font-medium">Invoice #</th>
                    <th className="pb-3 font-medium">Client</th>
                    <th className="pb-3 font-medium">Issue Date</th>
                    <th className="pb-3 font-medium">Due Date</th>
                    <th className="pb-3 font-medium">Amount</th>
                    <th className="pb-3 font-medium">Status</th>
                    <th className="pb-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInvoices.map((invoice) => (
                    <tr key={invoice.id} className="border-b" data-testid={`row-invoice-${invoice.id}`}>
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-muted-foreground" />
                          <span className="font-medium" data-testid={`text-invoice-number-${invoice.id}`}>{invoice.invoiceNumber}</span>
                        </div>
                      </td>
                      <td className="py-3" data-testid={`text-client-${invoice.id}`}>
                        {invoice.clientName || <span className="text-muted-foreground">No client</span>}
                      </td>
                      <td className="py-3">{format(new Date(invoice.issueDate), "MMM dd, yyyy")}</td>
                      <td className="py-3">{format(new Date(invoice.dueDate), "MMM dd, yyyy")}</td>
                      <td className="py-3">
                        <div className="flex items-center gap-1">
                          <DollarSign className="w-4 h-4 text-muted-foreground" />
                          <span className="font-medium" data-testid={`text-amount-${invoice.id}`}>
                            {parseFloat(invoice.totalAmount).toFixed(2)}
                          </span>
                        </div>
                      </td>
                      <td className="py-3">{getStatusBadge(invoice.status)}</td>
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleView(invoice)}
                            data-testid={`button-view-invoice-${invoice.id}`}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(invoice)}
                            data-testid={`button-edit-invoice-${invoice.id}`}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(invoice.id)}
                            data-testid={`button-delete-invoice-${invoice.id}`}
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

      {/* Create/Edit Invoice Dialog */}
      <Dialog open={isCreateDialogOpen || isEditDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setIsCreateDialogOpen(false);
          setIsEditDialogOpen(false);
          setEditingInvoice(null);
          resetForm();
        }
      }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingInvoice ? "Edit Invoice" : "Create New Invoice"}</DialogTitle>
            <DialogDescription>
              {editingInvoice ? "Update the invoice details" : "Fill in the details to create a new invoice"}
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (editingInvoice) {
                updateInvoiceMutation.mutate({ id: editingInvoice.id, updates: formData });
              } else {
                createInvoiceMutation.mutate(formData);
              }
            }}
            className="space-y-4"
          >
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="clientId">Client</Label>
                <Select
                  value={formData.clientId}
                  onValueChange={(value) => setFormData({ ...formData, clientId: value })}
                >
                  <SelectTrigger id="clientId" data-testid="select-client">
                    <SelectValue placeholder="Select client (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No client</SelectItem>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id.toString()}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="invoiceNumber">Invoice Number *</Label>
                <Input
                  id="invoiceNumber"
                  value={formData.invoiceNumber}
                  onChange={(e) => setFormData({ ...formData, invoiceNumber: e.target.value })}
                  placeholder="INV-001"
                  required
                  data-testid="input-invoice-number"
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
                    <SelectItem value="sent">Sent</SelectItem>
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
                placeholder="Additional notes about this invoice"
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
                  setEditingInvoice(null);
                  resetForm();
                }}
                data-testid="button-cancel"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createInvoiceMutation.isPending || updateInvoiceMutation.isPending}
                data-testid="button-save-invoice"
              >
                {editingInvoice ? "Update Invoice" : "Create Invoice"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Preview Invoice Dialog */}
      <Dialog open={isPreviewDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setIsPreviewDialogOpen(false);
          setPreviewingInvoice(null);
        }
      }}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Invoice Preview</DialogTitle>
            <DialogDescription>
              View and print invoice with company branding
            </DialogDescription>
          </DialogHeader>
          {previewingInvoice && (
            <InvoicePreview
              invoice={previewingInvoice}
              lineItems={previewLineItems}
              organization={currentOrganization}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
