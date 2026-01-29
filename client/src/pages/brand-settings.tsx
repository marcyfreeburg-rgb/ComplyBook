import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Upload, Building2, Save, Palette, CreditCard, FileText, Eye } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Organization } from "@shared/schema";

interface BrandSettingsProps {
  currentOrganization: Organization;
}

export default function BrandSettings({ currentOrganization }: BrandSettingsProps) {
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
    invoicePrimaryColor: currentOrganization.invoicePrimaryColor || "#3b82f6",
    invoiceAccentColor: currentOrganization.invoiceAccentColor || "#1e40af",
    invoiceFontFamily: currentOrganization.invoiceFontFamily || "Inter",
    invoiceTemplate: currentOrganization.invoiceTemplate || "classic",
    invoicePaymentTerms: currentOrganization.invoicePaymentTerms || "",
    invoicePaymentMethods: currentOrganization.invoicePaymentMethods || "",
    invoiceFooter: currentOrganization.invoiceFooter || "",
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
  useEffect(() => {
    if (organization) {
      setFormData(prev => {
        if (prev.companyName === "" && organization.companyName) {
          return {
            companyName: organization.companyName || "",
            companyAddress: organization.companyAddress || "",
            companyPhone: organization.companyPhone || "",
            companyEmail: organization.companyEmail || "",
            companyWebsite: organization.companyWebsite || "",
            taxId: organization.taxId || "",
            invoicePrefix: organization.invoicePrefix || "INV-",
            invoiceNotes: organization.invoiceNotes || "",
            invoicePrimaryColor: organization.invoicePrimaryColor || "#3b82f6",
            invoiceAccentColor: organization.invoiceAccentColor || "#1e40af",
            invoiceFontFamily: organization.invoiceFontFamily || "Inter",
            invoiceTemplate: organization.invoiceTemplate || "classic",
            invoicePaymentTerms: organization.invoicePaymentTerms || "",
            invoicePaymentMethods: organization.invoicePaymentMethods || "",
            invoiceFooter: organization.invoiceFooter || "",
          };
        }
        return prev;
      });
    }
  }, [organization]);

  const updateSettingsMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return apiRequest('PATCH', `/api/organizations/${currentOrganization.id}/invoice-settings`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/organizations'] });
      toast({
        title: "Success",
        description: "Brand settings updated successfully",
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
      // Create form data with the file
      const formData = new FormData();
      formData.append('logo', logoFile);

      // Get CSRF token from cookie for file upload
      const csrfToken = document.cookie.split(';').find(c => c.trim().startsWith('csrf_token='))?.split('=')[1];
      
      // Upload file to server (server handles object storage upload)
      const uploadResponse = await fetch(`/api/organizations/${currentOrganization.id}/logo`, {
        method: "POST",
        body: formData,
        credentials: 'include',
        headers: csrfToken ? { 'x-csrf-token': csrfToken } : {},
      });

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to upload logo");
      }

      queryClient.invalidateQueries({ queryKey: ['/api/organizations'] });
      
      toast({
        title: "Success",
        description: "Logo uploaded successfully",
      });
      
      setLogoFile(null);
      setLogoPreview(null);
    } catch (error: any) {
      console.error("Logo upload error:", error);
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
        <Palette className="w-8 h-8" />
        <div>
          <h1 className="text-3xl font-bold">Brand Settings</h1>
          <p className="text-muted-foreground">
            Customize your organization's branding across all documents, reports, and communications
          </p>
        </div>
      </div>

      {/* Logo Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle>Company Logo</CardTitle>
          <CardDescription>
            Upload a logo that will appear on all documents, reports, and communications (max 5MB)
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
            This information will appear on all documents, invoices, bills, and reports
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

      {/* Theme & Appearance */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Palette className="w-5 h-5" />
            <CardTitle>Theme & Appearance</CardTitle>
          </div>
          <CardDescription>
            Customize colors and fonts that will appear across all documents, invoices, bills, reports, and emails
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="invoicePrimaryColor">Primary Color</Label>
                <div className="flex gap-2">
                  <Input
                    id="invoicePrimaryColor"
                    type="color"
                    value={formData.invoicePrimaryColor}
                    onChange={(e) => setFormData({ ...formData, invoicePrimaryColor: e.target.value })}
                    className="w-20 h-10"
                    data-testid="input-primary-color"
                  />
                  <Input
                    type="text"
                    value={formData.invoicePrimaryColor}
                    onChange={(e) => setFormData({ ...formData, invoicePrimaryColor: e.target.value })}
                    placeholder="#3b82f6"
                    className="flex-1"
                    data-testid="input-primary-color-text"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="invoiceAccentColor">Accent Color</Label>
                <div className="flex gap-2">
                  <Input
                    id="invoiceAccentColor"
                    type="color"
                    value={formData.invoiceAccentColor}
                    onChange={(e) => setFormData({ ...formData, invoiceAccentColor: e.target.value })}
                    className="w-20 h-10"
                    data-testid="input-accent-color"
                  />
                  <Input
                    type="text"
                    value={formData.invoiceAccentColor}
                    onChange={(e) => setFormData({ ...formData, invoiceAccentColor: e.target.value })}
                    placeholder="#1e40af"
                    className="flex-1"
                    data-testid="input-accent-color-text"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="invoiceFontFamily">Font Family</Label>
                <Select
                  value={formData.invoiceFontFamily}
                  onValueChange={(value) => setFormData({ ...formData, invoiceFontFamily: value })}
                >
                  <SelectTrigger data-testid="select-font-family">
                    <SelectValue placeholder="Select font" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Inter">Inter (Modern)</SelectItem>
                    <SelectItem value="Arial">Arial (Classic)</SelectItem>
                    <SelectItem value="Georgia">Georgia (Serif)</SelectItem>
                    <SelectItem value="Times New Roman">Times New Roman (Traditional)</SelectItem>
                    <SelectItem value="Helvetica">Helvetica (Clean)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="invoiceTemplate">Invoice Template</Label>
                <Select
                  value={formData.invoiceTemplate}
                  onValueChange={(value) => setFormData({ ...formData, invoiceTemplate: value })}
                >
                  <SelectTrigger data-testid="select-template">
                    <SelectValue placeholder="Select template" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="classic">Classic</SelectItem>
                    <SelectItem value="modern">Modern</SelectItem>
                    <SelectItem value="minimal">Minimal</SelectItem>
                    <SelectItem value="professional">Professional</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <Button
                type="submit"
                disabled={updateSettingsMutation.isPending}
                data-testid="button-save-theme"
              >
                <Save className="w-4 h-4 mr-2" />
                {updateSettingsMutation.isPending ? "Saving..." : "Save Theme Settings"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Live Preview */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Eye className="w-5 h-5" />
            <CardTitle>Live Preview</CardTitle>
          </div>
          <CardDescription>
            See how your invoice/report will look with the current settings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div 
            className="border rounded-lg p-6 bg-white dark:bg-gray-900 shadow-sm"
            style={{ fontFamily: formData.invoiceFontFamily }}
            data-testid="invoice-preview-container"
          >
            {/* Invoice Header */}
            <div className="flex justify-between items-start mb-6" data-testid="invoice-preview-header">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 border rounded flex items-center justify-center bg-muted overflow-hidden">
                  {(logoPreview || currentLogoUrl) ? (
                    <img
                      src={logoPreview || currentLogoUrl || ""}
                      alt="Company logo"
                      className="w-full h-full object-contain"
                      data-testid="preview-logo"
                    />
                  ) : (
                    <Building2 className="w-8 h-8 text-muted-foreground" />
                  )}
                </div>
                <div>
                  <h2 
                    className="text-xl font-bold"
                    style={{ color: formData.invoicePrimaryColor }}
                    data-testid="preview-company-name"
                  >
                    {formData.companyName || "Your Company Name"}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {formData.companyAddress ? formData.companyAddress.split('\n')[0] : "123 Business Street"}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <h3 
                  className="text-lg font-semibold"
                  style={{ color: formData.invoicePrimaryColor }}
                  data-testid="preview-invoice-title"
                >
                  INVOICE
                </h3>
                <p 
                  className="text-sm font-medium"
                  style={{ color: formData.invoiceAccentColor }}
                  data-testid="preview-invoice-number"
                >
                  {formData.invoicePrefix}0001
                </p>
                <p className="text-xs text-muted-foreground">Date: {new Date().toLocaleDateString()}</p>
              </div>
            </div>

            {/* Bill To Section */}
            <div className="mb-6">
              <h4 
                className="text-sm font-semibold mb-1"
                style={{ color: formData.invoiceAccentColor }}
              >
                Bill To:
              </h4>
              <p className="text-sm">Sample Client</p>
              <p className="text-sm text-muted-foreground">456 Client Avenue, City, State 12345</p>
            </div>

            {/* Line Items Table */}
            <div className="mb-6" data-testid="preview-line-items">
              <table className="w-full text-sm">
                <thead>
                  <tr 
                    className="border-b"
                    style={{ borderColor: formData.invoiceAccentColor }}
                  >
                    <th 
                      className="text-left py-2 font-semibold"
                      style={{ color: formData.invoicePrimaryColor }}
                    >
                      Description
                    </th>
                    <th 
                      className="text-center py-2 font-semibold"
                      style={{ color: formData.invoicePrimaryColor }}
                    >
                      Qty
                    </th>
                    <th 
                      className="text-right py-2 font-semibold"
                      style={{ color: formData.invoicePrimaryColor }}
                    >
                      Rate
                    </th>
                    <th 
                      className="text-right py-2 font-semibold"
                      style={{ color: formData.invoicePrimaryColor }}
                    >
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-muted">
                    <td className="py-2">Consulting Services</td>
                    <td className="text-center py-2">10</td>
                    <td className="text-right py-2">$150.00</td>
                    <td className="text-right py-2">$1,500.00</td>
                  </tr>
                  <tr className="border-b border-muted">
                    <td className="py-2">Project Management</td>
                    <td className="text-center py-2">5</td>
                    <td className="text-right py-2">$100.00</td>
                    <td className="text-right py-2">$500.00</td>
                  </tr>
                  <tr className="border-b border-muted">
                    <td className="py-2">Training Session</td>
                    <td className="text-center py-2">2</td>
                    <td className="text-right py-2">$250.00</td>
                    <td className="text-right py-2">$500.00</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div className="flex justify-end mb-6" data-testid="preview-totals">
              <div className="w-48">
                <div className="flex justify-between py-1 text-sm">
                  <span>Subtotal:</span>
                  <span>$2,500.00</span>
                </div>
                <div className="flex justify-between py-1 text-sm text-muted-foreground">
                  <span>Tax (0%):</span>
                  <span>$0.00</span>
                </div>
                <div 
                  className="flex justify-between py-2 font-bold border-t"
                  style={{ 
                    borderColor: formData.invoiceAccentColor,
                    color: formData.invoicePrimaryColor 
                  }}
                  data-testid="preview-total"
                >
                  <span>Total:</span>
                  <span>$2,500.00</span>
                </div>
              </div>
            </div>

            {/* Footer */}
            {formData.invoiceFooter && (
              <div 
                className="pt-4 border-t text-sm text-center text-muted-foreground"
                style={{ borderColor: formData.invoiceAccentColor }}
                data-testid="preview-footer"
              >
                {formData.invoiceFooter}
              </div>
            )}
            {!formData.invoiceFooter && (
              <div 
                className="pt-4 border-t text-sm text-center text-muted-foreground italic"
                style={{ borderColor: formData.invoiceAccentColor }}
                data-testid="preview-footer-placeholder"
              >
                Footer text will appear here
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Payment Information */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            <CardTitle>Payment Information</CardTitle>
          </div>
          <CardDescription>
            Configure payment terms and methods that will appear on invoices and bills
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="invoicePaymentTerms">Payment Terms</Label>
              <Textarea
                id="invoicePaymentTerms"
                value={formData.invoicePaymentTerms}
                onChange={(e) => setFormData({ ...formData, invoicePaymentTerms: e.target.value })}
                placeholder="e.g., Net 30, Due upon receipt, 2/10 Net 30"
                rows={3}
                data-testid="input-payment-terms"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="invoicePaymentMethods">Accepted Payment Methods</Label>
              <Textarea
                id="invoicePaymentMethods"
                value={formData.invoicePaymentMethods}
                onChange={(e) => setFormData({ ...formData, invoicePaymentMethods: e.target.value })}
                placeholder="e.g., Check, ACH Transfer, Credit Card&#10;Bank: ABC Bank, Account: 1234567890&#10;PayPal: payments@company.com"
                rows={4}
                data-testid="input-payment-methods"
              />
            </div>

            <div className="flex justify-end pt-4">
              <Button
                type="submit"
                disabled={updateSettingsMutation.isPending}
                data-testid="button-save-payment"
              >
                <Save className="w-4 h-4 mr-2" />
                {updateSettingsMutation.isPending ? "Saving..." : "Save Payment Settings"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Additional Customization */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            <CardTitle>Additional Customization</CardTitle>
          </div>
          <CardDescription>
            Add footer text that will appear on all documents, reports, and emails
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="invoiceFooter">Document Footer</Label>
              <Textarea
                id="invoiceFooter"
                value={formData.invoiceFooter}
                onChange={(e) => setFormData({ ...formData, invoiceFooter: e.target.value })}
                placeholder="e.g., Thank you for your business! For questions, contact us at support@company.com"
                rows={3}
                data-testid="input-invoice-footer"
              />
            </div>

            <div className="flex justify-end pt-4">
              <Button
                type="submit"
                disabled={updateSettingsMutation.isPending}
                data-testid="button-save-footer"
              >
                <Save className="w-4 h-4 mr-2" />
                {updateSettingsMutation.isPending ? "Saving..." : "Save Footer Settings"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
