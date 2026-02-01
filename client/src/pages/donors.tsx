import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Heart, Mail, Phone, MapPin, Edit2, FileText, Send, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Donor, Organization } from "@shared/schema";

interface DonorsProps {
  currentOrganization: Organization;
  userId: string;
}

export default function Donors({ currentOrganization, userId }: DonorsProps) {
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingDonor, setEditingDonor] = useState<Donor | null>(null);
  
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    taxId: "",
    notes: "",
  });

  const { data: donors = [], isLoading } = useQuery<Donor[]>({
    queryKey: [`/api/donors/${currentOrganization.id}`],
  });

  const currentYear = new Date().getFullYear();

  // Query for donor letters to check sent status
  const { data: donorLetters = [] } = useQuery<Array<{ id: number; donorId: number; year: number; letterStatus: string }>>({
    queryKey: [`/api/donor-letters`, currentOrganization.id],
    queryFn: async () => {
      const res = await fetch(`/api/donor-letters/${currentOrganization.id}`);
      if (!res.ok) return [];
      const data = await res.json();
      return data.data || [];
    },
  });

  // Check if a letter was sent for a donor for the current year
  const getLetterSentForCurrentYear = (donorId: number) => {
    return donorLetters.find(
      (l) => l.donorId === donorId && l.year === currentYear && l.letterStatus === 'sent'
    );
  };

  const resetForm = () => {
    setFormData({
      name: "",
      email: "",
      phone: "",
      address: "",
      taxId: "",
      notes: "",
    });
  };

  const createDonorMutation = useMutation({
    mutationFn: async () => {
      if (!formData.name.trim()) {
        throw new Error("Donor name is required");
      }
      return await apiRequest('POST', '/api/donors', {
        organizationId: currentOrganization.id,
        ...formData,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/donors/${currentOrganization.id}`] });
      toast({
        title: "Donor created",
        description: `${formData.name} has been added successfully.`,
      });
      setIsCreateDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create donor. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateDonorMutation = useMutation({
    mutationFn: async () => {
      if (!editingDonor) return;
      if (!formData.name.trim()) {
        throw new Error("Donor name is required");
      }
      return await apiRequest('PATCH', `/api/donors/${editingDonor.id}`, formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/donors/${currentOrganization.id}`] });
      toast({
        title: "Donor updated",
        description: "Donor information has been updated successfully.",
      });
      setIsEditDialogOpen(false);
      setEditingDonor(null);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update donor. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteDonorMutation = useMutation({
    mutationFn: async (donorId: number) => {
      return await apiRequest('DELETE', `/api/donors/${donorId}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/donors/${currentOrganization.id}`] });
      toast({
        title: "Donor deleted",
        description: "The donor has been removed successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete donor.",
        variant: "destructive",
      });
    },
  });

  const sendPortalLinkMutation = useMutation({
    mutationFn: async (donorId: number) => {
      return await apiRequest('POST', `/api/donor-portal/send-access-link/${donorId}`, {});
    },
    onSuccess: (data: any) => {
      if (data.portalUrl) {
        toast({
          title: "Portal link generated",
          description: (
            <div className="space-y-2">
              <p>Email not configured. Share this link with the donor:</p>
              <code className="text-xs bg-muted p-1 rounded block break-all">{data.portalUrl}</code>
            </div>
          ),
        });
      } else {
        toast({
          title: "Portal link sent",
          description: "An access link has been emailed to the donor.",
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send portal link.",
        variant: "destructive",
      });
    },
  });

  const handleEdit = (donor: Donor) => {
    setEditingDonor(donor);
    setFormData({
      name: donor.name,
      email: donor.email || "",
      phone: donor.phone || "",
      address: donor.address || "",
      taxId: donor.taxId || "",
      notes: donor.notes || "",
    });
    setIsEditDialogOpen(true);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-page-title">Donors</h1>
          <p className="text-muted-foreground">Manage donors and track donations</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-donor">
              <Plus className="w-4 h-4 mr-2" />
              Add Donor
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add Donor</DialogTitle>
              <DialogDescription>
                Add a new donor to track donations and generate tax letters
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="donor-name">Donor Name *</Label>
                <Input
                  id="donor-name"
                  placeholder="e.g., John Smith or Smith Family Foundation"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  data-testid="input-donor-name"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="donor@example.com"
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
                <Label htmlFor="tax-id">Tax ID / SSN (optional)</Label>
                <Input
                  id="tax-id"
                  placeholder="XXX-XX-XXXX or XX-XXXXXXX"
                  value={formData.taxId}
                  onChange={(e) => setFormData({ ...formData, taxId: e.target.value })}
                  data-testid="input-tax-id"
                />
                <p className="text-xs text-muted-foreground">
                  For tax reporting purposes
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Additional information about this donor"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  data-testid="input-notes"
                  rows={3}
                />
              </div>
              <Button
                onClick={() => createDonorMutation.mutate()}
                disabled={createDonorMutation.isPending || !formData.name.trim()}
                className="w-full"
                data-testid="button-create-donor-submit"
              >
                {createDonorMutation.isPending ? "Adding..." : "Add Donor"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Donor</DialogTitle>
            <DialogDescription>
              Update donor information
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="edit-donor-name">Donor Name *</Label>
              <Input
                id="edit-donor-name"
                placeholder="e.g., John Smith or Smith Family Foundation"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                data-testid="input-edit-donor-name"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-email">Email</Label>
                <Input
                  id="edit-email"
                  type="email"
                  placeholder="donor@example.com"
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
              <Label htmlFor="edit-tax-id">Tax ID / SSN (optional)</Label>
              <Input
                id="edit-tax-id"
                placeholder="XXX-XX-XXXX or XX-XXXXXXX"
                value={formData.taxId}
                onChange={(e) => setFormData({ ...formData, taxId: e.target.value })}
                data-testid="input-edit-tax-id"
              />
              <p className="text-xs text-muted-foreground">
                For tax reporting purposes
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-notes">Notes</Label>
              <Textarea
                id="edit-notes"
                placeholder="Additional information about this donor"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                data-testid="input-edit-notes"
                rows={3}
              />
            </div>
            <Button
              onClick={() => updateDonorMutation.mutate()}
              disabled={updateDonorMutation.isPending || !formData.name.trim()}
              className="w-full"
              data-testid="button-update-donor-submit"
            >
              {updateDonorMutation.isPending ? "Updating..." : "Update Donor"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle>All Donors</CardTitle>
          <CardDescription>
            Donors who have contributed to your organization
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading donors...</div>
          ) : donors.length === 0 ? (
            <div className="text-center py-8">
              <Heart className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
              <p className="text-sm text-muted-foreground">No donors yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Add your first donor to start tracking donations
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {donors.map((donor) => (
                <div
                  key={donor.id}
                  className="p-4 rounded-md border hover-elevate"
                  data-testid={`donor-${donor.id}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-lg" data-testid={`donor-name-${donor.id}`}>
                          {donor.name}
                        </h3>
                        {getLetterSentForCurrentYear(donor.id) && (
                          <Badge variant="secondary" className="gap-1" data-testid={`badge-letter-sent-${donor.id}`}>
                            <Check className="w-3 h-3" />
                            {currentYear} Letter Sent
                          </Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                        {donor.email && (
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4" />
                            {donor.email}
                          </div>
                        )}
                        {donor.phone && (
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4" />
                            {donor.phone}
                          </div>
                        )}
                      </div>
                      {donor.address && (
                        <div className="text-sm text-muted-foreground flex items-start gap-2">
                          <MapPin className="h-4 w-4 mt-0.5" />
                          <span>{donor.address}</span>
                        </div>
                      )}
                      {donor.taxId && (
                        <div className="text-sm text-muted-foreground flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          Tax ID: {donor.taxId}
                        </div>
                      )}
                      {donor.notes && (
                        <div className="text-sm text-muted-foreground mt-2">
                          <p className="font-medium">Notes:</p>
                          <p className="whitespace-pre-wrap">{donor.notes}</p>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2 ml-4">
                      {donor.email && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => sendPortalLinkMutation.mutate(donor.id)}
                              disabled={sendPortalLinkMutation.isPending}
                              data-testid={`button-send-portal-link-${donor.id}`}
                            >
                              <Send className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Send donor portal link</p>
                          </TooltipContent>
                        </Tooltip>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(donor)}
                        data-testid={`button-edit-donor-${donor.id}`}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteDonorMutation.mutate(donor.id)}
                        disabled={deleteDonorMutation.isPending}
                        data-testid={`button-delete-donor-${donor.id}`}
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
