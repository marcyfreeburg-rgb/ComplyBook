import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Users, Mail, Phone, MapPin, Edit2 } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Client, Organization } from "@shared/schema";

interface ClientsProps {
  currentOrganization: Organization;
  userId: string;
}

export default function Clients({ currentOrganization, userId }: ClientsProps) {
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  
  const [formData, setFormData] = useState({
    name: "",
    contactName: "",
    email: "",
    phone: "",
    address: "",
    notes: "",
  });

  const { data: clients = [], isLoading } = useQuery<Client[]>({
    queryKey: [`/api/clients/${currentOrganization.id}`],
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

  const createClientMutation = useMutation({
    mutationFn: async () => {
      if (!formData.name.trim()) {
        throw new Error("Client name is required");
      }
      return await apiRequest('POST', '/api/clients', {
        organizationId: currentOrganization.id,
        ...formData,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/clients/${currentOrganization.id}`] });
      toast({
        title: "Client created",
        description: `${formData.name} has been added successfully.`,
      });
      setIsCreateDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create client. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateClientMutation = useMutation({
    mutationFn: async () => {
      if (!editingClient) return;
      if (!formData.name.trim()) {
        throw new Error("Client name is required");
      }
      return await apiRequest('PATCH', `/api/clients/${editingClient.id}`, formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/clients/${currentOrganization.id}`] });
      toast({
        title: "Client updated",
        description: "Client information has been updated successfully.",
      });
      setIsEditDialogOpen(false);
      setEditingClient(null);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update client. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteClientMutation = useMutation({
    mutationFn: async (clientId: number) => {
      return await apiRequest('DELETE', `/api/clients/${clientId}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/clients/${currentOrganization.id}`] });
      toast({
        title: "Client deleted",
        description: "The client has been removed successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete client.",
        variant: "destructive",
      });
    },
  });

  const handleEdit = (client: Client) => {
    setEditingClient(client);
    setFormData({
      name: client.name,
      contactName: client.contactName || "",
      email: client.email || "",
      phone: client.phone || "",
      address: client.address || "",
      notes: client.notes || "",
    });
    setIsEditDialogOpen(true);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-page-title">Clients</h1>
          <p className="text-muted-foreground">Manage customers and clients</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-client">
              <Plus className="w-4 h-4 mr-2" />
              Add Client
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add Client</DialogTitle>
              <DialogDescription>
                Add a new customer or client to your organization
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="client-name">Client Name *</Label>
                <Input
                  id="client-name"
                  placeholder="e.g., Acme Corporation"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  data-testid="input-client-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact-name">Contact Name</Label>
                <Input
                  id="contact-name"
                  placeholder="e.g., Jane Doe"
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
                    placeholder="client@example.com"
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
                  placeholder="Additional information about this client"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  data-testid="input-notes"
                  rows={3}
                />
              </div>
              <Button
                onClick={() => createClientMutation.mutate()}
                disabled={createClientMutation.isPending || !formData.name.trim()}
                className="w-full"
                data-testid="button-create-client-submit"
              >
                {createClientMutation.isPending ? "Adding..." : "Add Client"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Client</DialogTitle>
            <DialogDescription>
              Update client information
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="edit-client-name">Client Name *</Label>
              <Input
                id="edit-client-name"
                placeholder="e.g., Acme Corporation"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                data-testid="input-edit-client-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-contact-name">Contact Name</Label>
              <Input
                id="edit-contact-name"
                placeholder="e.g., Jane Doe"
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
                  placeholder="client@example.com"
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
                placeholder="Additional information about this client"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                data-testid="input-edit-notes"
                rows={3}
              />
            </div>
            <Button
              onClick={() => updateClientMutation.mutate()}
              disabled={updateClientMutation.isPending || !formData.name.trim()}
              className="w-full"
              data-testid="button-update-client-submit"
            >
              {updateClientMutation.isPending ? "Updating..." : "Update Client"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle>All Clients</CardTitle>
          <CardDescription>
            Customers and clients for your organization
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading clients...</div>
          ) : clients.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
              <p className="text-sm text-muted-foreground">No clients yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Add your first client to start tracking customers
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {clients.map((client) => (
                <div
                  key={client.id}
                  className="p-4 rounded-md border hover-elevate"
                  data-testid={`client-${client.id}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-2">
                      <h3 className="font-semibold text-lg" data-testid={`client-name-${client.id}`}>
                        {client.name}
                      </h3>
                      {client.contactName && (
                        <div className="text-sm text-muted-foreground flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          {client.contactName}
                        </div>
                      )}
                      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                        {client.email && (
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4" />
                            {client.email}
                          </div>
                        )}
                        {client.phone && (
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4" />
                            {client.phone}
                          </div>
                        )}
                      </div>
                      {client.address && (
                        <div className="text-sm text-muted-foreground flex items-start gap-2">
                          <MapPin className="h-4 w-4 mt-0.5" />
                          <span>{client.address}</span>
                        </div>
                      )}
                      {client.notes && (
                        <div className="text-sm text-muted-foreground mt-2">
                          <p className="font-medium">Notes:</p>
                          <p className="whitespace-pre-wrap">{client.notes}</p>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2 ml-4">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(client)}
                        data-testid={`button-edit-client-${client.id}`}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteClientMutation.mutate(client.id)}
                        disabled={deleteClientMutation.isPending}
                        data-testid={`button-delete-client-${client.id}`}
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
