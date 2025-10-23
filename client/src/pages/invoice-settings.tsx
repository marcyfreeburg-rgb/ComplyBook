import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Upload, Building2, Save } from "lucide-react";
import type { Organization } from "@shared/schema";

interface InvoiceSettingsProps {
  currentOrganization: Organization;
}

export default function InvoiceSettings({ currentOrganization }: InvoiceSettingsProps) {
  const { toast } = useToast();
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const [formData, setFormData] = useState({
    companyName: currentOrganization.companyName || "",
    companyAddress: currentOrganization.companyAddress || "",
    companyPhone: currentOrganization.companyPhone || "",
    companyEmail: currentOrganization.companyEmail || "",
    companyWebsite: currentOrganization.companyWebsite || "",
    taxId: currentOrganization.taxId || "",
    invoicePrefix: currentOrganization.invoicePrefix || "INV-",
    invoiceNotes: currentOrganization.invoiceNotes || "",
  });

  // Fetch current organization data to stay up-to-date
  const { data: organization } = useQuery<Organization>({
    queryKey: ['/api/organizations', currentOrganization.id],
    queryFn: async () => {
      const orgs = await fetch('/api/organizations').then(r => r.json()) as Array<Organization & { userRole: string }>;
      const org = orgs.find(o => o.id === currentOrganization.id);
      if (!org) throw new Error("Organization not found");
      return org;
    },
  });

  // Update form data when organization data loads
  if (organization && formData.companyName === "" && organization.companyName) {
    setFormData({
      companyName: organization.companyName || "",
      companyAddress: organization.companyAddress || "",
      companyPhone: organization.companyPhone || "",
      companyEmail: organization.companyEmail || "",
      companyWebsite: organization.companyWebsite || "",
      taxId: organization.taxId || "",
      invoicePrefix: organization.invoicePrefix || "INV-",
      invoiceNotes: organization.invoiceNotes || "",
    });
  }

  const updateSettingsMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return apiRequest('PATCH', `/api/organizations/${currentOrganization.id}/invoice-settings`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/organizations'] });
      toast({
        title: "Success",
        description: "Invoice settings updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update settings",
        variant: "destructive",
      });
    },
  });

  const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Logo must be less than 5MB",
          variant: "destructive",
        });
        return;
      }
      
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleLogoUpload = async () => {
    if (!logoFile) return;

    setIsUploading(true);
    try {
      // Get signed upload URL
      const urlResponse = await fetch(`/api/organizations/${currentOrganization.id}/logo-upload-url`, {
        method: "POST",
      });
      
      if (!urlResponse.ok) {
        throw new Error("Failed to get upload URL");
      }
      
      const { uploadUrl } = await urlResponse.json();

      // Upload file to object storage
      const uploadResponse = await fetch(uploadUrl, {
        method: "PUT",
        body: logoFile,
        headers: {
          "Content-Type": logoFile.type,
        },
      });

      if (!uploadResponse.ok) {
        throw new Error("Failed to upload logo");
      }

      // Save logo URL to organization
      await apiRequest('PATCH', `/api/organizations/${currentOrganization.id}/invoice-settings`, {
        logoUrl: uploadUrl.split('?')[0], // Remove query params from URL
      });

      queryClient.invalidateQueries({ queryKey: ['/api/organizations'] });
      
      toast({
        title: "Success",
        description: "Logo uploaded successfully",
      });
      
      setLogoFile(null);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to upload logo",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettingsMutation.mutate(formData);
  };

  const currentLogoUrl = organization?.logoUrl || currentOrganization.logoUrl;

  return (
    <div className="container mx-auto p-6 max-w-4xl space-y-6">
      <div className="flex items-center gap-3">
        <Building2 className="w-8 h-8" />
        <div>
          <h1 className="text-3xl font-bold">Invoice Settings</h1>
          <p className="text-muted-foreground">
            Customize your invoices with company branding and information
          </p>
        </div>
      </div>

      {/* Logo Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle>Company Logo</CardTitle>
          <CardDescription>
            Upload a logo that will appear on your invoices (max 5MB)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-6">
            <div className="w-32 h-32 border rounded-lg flex items-center justify-center bg-muted overflow-hidden">
              {(logoPreview || currentLogoUrl) ? (
                <img
                  src={logoPreview || currentLogoUrl || ""}
                  alt="Company logo"
                  className="w-full h-full object-contain"
                />
              ) : (
                <Building2 className="w-12 h-12 text-muted-foreground" />
              )}
            </div>
            
            <div className="flex-1 space-y-3">
              <Input
                type="file"
                accept="image/*"
                onChange={handleLogoSelect}
                disabled={isUploading}
                data-testid="input-logo-file"
              />
              {logoFile && (
                <Button
                  onClick={handleLogoUpload}
                  disabled={isUploading}
                  data-testid="button-upload-logo"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {isUploading ? "Uploading..." : "Upload Logo"}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Company Information */}
      <Card>
        <CardHeader>
          <CardTitle>Company Information</CardTitle>
          <CardDescription>
            This information will appear on your invoices
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="companyName">Company Name</Label>
                <Input
                  id="companyName"
                  value={formData.companyName}
                  onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                  placeholder="Acme Corporation"
                  data-testid="input-company-name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="companyPhone">Phone Number</Label>
                <Input
                  id="companyPhone"
                  value={formData.companyPhone}
                  onChange={(e) => setFormData({ ...formData, companyPhone: e.target.value })}
                  placeholder="(555) 123-4567"
                  data-testid="input-company-phone"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="companyEmail">Email</Label>
                <Input
                  id="companyEmail"
                  type="email"
                  value={formData.companyEmail}
                  onChange={(e) => setFormData({ ...formData, companyEmail: e.target.value })}
                  placeholder="billing@company.com"
                  data-testid="input-company-email"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="companyWebsite">Website</Label>
                <Input
                  id="companyWebsite"
                  value={formData.companyWebsite}
                  onChange={(e) => setFormData({ ...formData, companyWebsite: e.target.value })}
                  placeholder="https://company.com"
                  data-testid="input-company-website"
                />
              </div>

              <div className="space-y-2 col-span-2">
                <Label htmlFor="companyAddress">Address</Label>
                <Textarea
                  id="companyAddress"
                  value={formData.companyAddress}
                  onChange={(e) => setFormData({ ...formData, companyAddress: e.target.value })}
                  placeholder="123 Business St&#10;Suite 100&#10;City, State 12345"
                  rows={3}
                  data-testid="input-company-address"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="taxId">Tax ID / EIN</Label>
                <Input
                  id="taxId"
                  value={formData.taxId}
                  onChange={(e) => setFormData({ ...formData, taxId: e.target.value })}
                  placeholder="12-3456789"
                  data-testid="input-tax-id"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="invoicePrefix">Invoice Number Prefix</Label>
                <Input
                  id="invoicePrefix"
                  value={formData.invoicePrefix}
                  onChange={(e) => setFormData({ ...formData, invoicePrefix: e.target.value })}
                  placeholder="INV-"
                  data-testid="input-invoice-prefix"
                />
              </div>

              <div className="space-y-2 col-span-2">
                <Label htmlFor="invoiceNotes">Default Invoice Notes</Label>
                <Textarea
                  id="invoiceNotes"
                  value={formData.invoiceNotes}
                  onChange={(e) => setFormData({ ...formData, invoiceNotes: e.target.value })}
                  placeholder="Payment terms, thank you message, or other default notes"
                  rows={3}
                  data-testid="input-invoice-notes"
                />
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <Button
                type="submit"
                disabled={updateSettingsMutation.isPending}
                data-testid="button-save-settings"
              >
                <Save className="w-4 h-4 mr-2" />
                {updateSettingsMutation.isPending ? "Saving..." : "Save Settings"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
