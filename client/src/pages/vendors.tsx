import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Building2, Mail, Phone, MapPin, Edit2 } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Vendor, Organization } from "@shared/schema";

interface VendorsProps {
  currentOrganization: Organization;
  userId: string;
}

export default function Vendors({ currentOrganization, userId }: VendorsProps) {
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  
  const [formData, setFormData] = useState({
    name: "",
    contactName: "",
    email: "",
    phone: "",
    address: "",
    notes: "",
  });

  const { data: vendors = [], isLoading } = useQuery<Vendor[]>({
    queryKey: [`/api/vendors/${currentOrganization.id}`],
  });

  const resetForm = () => {
    setFormData({
      name: "",
      contactName: "",
      email: "",
      phone: "",
      address: "",
      notes: "",
    });
  };

  const createVendorMutation = useMutation({
    mutationFn: async () => {
      if (!formData.name.trim()) {
        throw new Error("Vendor name is required");
      }
      return await apiRequest('POST', '/api/vendors', {
        organizationId: currentOrganization.id,
        ...formData,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/vendors/${currentOrganization.id}`] });
      toast({
        title: "Vendor created",
        description: `${formData.name} has been added successfully.`,
      });
      setIsCreateDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create vendor. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateVendorMutation = useMutation({
    mutationFn: async () => {
      if (!editingVendor) return;
      if (!formData.name.trim()) {
        throw new Error("Vendor name is required");
      }
      return await apiRequest('PATCH', `/api/vendors/${editingVendor.id}`, formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/vendors/${currentOrganization.id}`] });
      toast({
        title: "Vendor updated",
        description: "Vendor information has been updated successfully.",
      });
      setIsEditDialogOpen(false);
      setEditingVendor(null);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update vendor. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteVendorMutation = useMutation({
    mutationFn: async (vendorId: number) => {
      return await apiRequest('DELETE', `/api/vendors/${vendorId}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/vendors/${currentOrganization.id}`] });
      toast({
        title: "Vendor deleted",
        description: "The vendor has been removed successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete vendor.",
        variant: "destructive",
      });
    },
  });

  const handleEdit = (vendor: Vendor) => {
    setEditingVendor(vendor);
    setFormData({
      name: vendor.name,
      contactName: vendor.contactName || "",
      email: vendor.email || "",
      phone: vendor.phone || "",
      address: vendor.address || "",
      notes: vendor.notes || "",
    });
    setIsEditDialogOpen(true);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-page-title">Vendors</h1>
          <p className="text-muted-foreground">Manage suppliers and service providers</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-vendor">
              <Plus className="w-4 h-4 mr-2" />
              Add Vendor
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add Vendor</DialogTitle>
              <DialogDescription>
                Add a new supplier or service provider to your organization
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="vendor-name">Vendor Name *</Label>
                <Input
                  id="vendor-name"
                  placeholder="e.g., ABC Office Supplies"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  data-testid="input-vendor-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact-name">Contact Name</Label>
                <Input
                  id="contact-name"
                  placeholder="e.g., John Smith"
                  value={formData.contactName}
                  onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                  data-testid="input-contact-name"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="vendor@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    data-testid="input-email"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    placeholder="(555) 123-4567"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    data-testid="input-phone"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Textarea
                  id="address"
                  placeholder="Street address, city, state, zip"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  data-testid="input-address"
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Additional information about this vendor"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  data-testid="input-notes"
                  rows={3}
                />
              </div>
              <Button
                onClick={() => createVendorMutation.mutate()}
                disabled={createVendorMutation.isPending || !formData.name.trim()}
                className="w-full"
                data-testid="button-create-vendor-submit"
              >
                {createVendorMutation.isPending ? "Adding..." : "Add Vendor"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Vendor</DialogTitle>
            <DialogDescription>
              Update vendor information
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="edit-vendor-name">Vendor Name *</Label>
              <Input
                id="edit-vendor-name"
                placeholder="e.g., ABC Office Supplies"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                data-testid="input-edit-vendor-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-contact-name">Contact Name</Label>
              <Input
                id="edit-contact-name"
                placeholder="e.g., John Smith"
                value={formData.contactName}
                onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                data-testid="input-edit-contact-name"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-email">Email</Label>
                <Input
                  id="edit-email"
                  type="email"
                  placeholder="vendor@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  data-testid="input-edit-email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-phone">Phone</Label>
                <Input
                  id="edit-phone"
                  placeholder="(555) 123-4567"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  data-testid="input-edit-phone"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-address">Address</Label>
              <Textarea
                id="edit-address"
                placeholder="Street address, city, state, zip"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                data-testid="input-edit-address"
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-notes">Notes</Label>
              <Textarea
                id="edit-notes"
                placeholder="Additional information about this vendor"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                data-testid="input-edit-notes"
                rows={3}
              />
            </div>
            <Button
              onClick={() => updateVendorMutation.mutate()}
              disabled={updateVendorMutation.isPending || !formData.name.trim()}
              className="w-full"
              data-testid="button-update-vendor-submit"
            >
              {updateVendorMutation.isPending ? "Updating..." : "Update Vendor"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle>All Vendors</CardTitle>
          <CardDescription>
            Suppliers and service providers for your organization
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading vendors...</div>
          ) : vendors.length === 0 ? (
            <div className="text-center py-8">
              <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
              <p className="text-sm text-muted-foreground">No vendors yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Add your first vendor to start tracking suppliers
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {vendors.map((vendor) => (
                <div
                  key={vendor.id}
                  className="p-4 rounded-md border hover-elevate"
                  data-testid={`vendor-${vendor.id}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-2">
                      <h3 className="font-semibold text-lg" data-testid={`vendor-name-${vendor.id}`}>
                        {vendor.name}
                      </h3>
                      {vendor.contactName && (
                        <div className="text-sm text-muted-foreground flex items-center gap-2">
                          <Building2 className="h-4 w-4" />
                          {vendor.contactName}
                        </div>
                      )}
                      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                        {vendor.email && (
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4" />
                            {vendor.email}
                          </div>
                        )}
                        {vendor.phone && (
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4" />
                            {vendor.phone}
                          </div>
                        )}
                      </div>
                      {vendor.address && (
                        <div className="text-sm text-muted-foreground flex items-start gap-2">
                          <MapPin className="h-4 w-4 mt-0.5" />
                          <span>{vendor.address}</span>
                        </div>
                      )}
                      {vendor.notes && (
                        <div className="text-sm text-muted-foreground mt-2">
                          <p className="font-medium">Notes:</p>
                          <p className="whitespace-pre-wrap">{vendor.notes}</p>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2 ml-4">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(vendor)}
                        data-testid={`button-edit-vendor-${vendor.id}`}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteVendorMutation.mutate(vendor.id)}
                        disabled={deleteVendorMutation.isPending}
                        data-testid={`button-delete-vendor-${vendor.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
