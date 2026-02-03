import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Heart, FileDown, Calendar, FileText, Edit3, Mail, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Organization, Donor, Transaction } from "@shared/schema";
import html2pdf from "html2pdf.js";
import DOMPurify from "dompurify";

interface DonationLettersProps {
  currentOrganization: Organization;
  userId: string;
}

export default function DonationLetters({ currentOrganization, userId }: DonationLettersProps) {
  const { toast } = useToast();
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear.toString());
  const [isLetterDialogOpen, setIsLetterDialogOpen] = useState(false);
  const [selectedDonor, setSelectedDonor] = useState<Donor | null>(null);
  const [selectedAmount, setSelectedAmount] = useState("");
  const [letterType, setLetterType] = useState<'general' | 'custom'>('general');
  const [customContent, setCustomContent] = useState("");
  const letterContentRef = useRef<HTMLDivElement>(null);
  
  const availableYears = Array.from(
    { length: 5 },
    (_, i) => (currentYear - i).toString()
  );

  const { data: donationData = [], isLoading } = useQuery<Array<{ donor: Donor; totalAmount: string; donations: Transaction[] }>>({
    queryKey: [`/api/donation-letters/${currentOrganization.id}/${selectedYear}`],
    enabled: !!selectedYear,
  });

  // Query to get existing donor letters for status checking
  const { data: existingLetters = [] } = useQuery<Array<{ id: number; donorId: number; year: number; letterStatus: string; deliveryMode: string | null }>>({
    queryKey: [`/api/donor-letters`, currentOrganization.id, selectedYear],
    queryFn: async () => {
      const res = await fetch(`/api/donor-letters/${currentOrganization.id}`);
      if (!res.ok) return [];
      const data = await res.json();
      return data.data?.filter((l: any) => l.year === parseInt(selectedYear)) || [];
    },
    enabled: !!currentOrganization.id && !!selectedYear,
  });

  // Check if a letter was sent for a donor in the selected year
  const getLetterStatusForDonor = (donorId: number) => {
    const letter = existingLetters.find((l) => l.donorId === donorId && l.year === parseInt(selectedYear));
    return letter ? { status: letter.letterStatus, deliveryMode: letter.deliveryMode, letterId: letter.id } : null;
  };

  const createLetterMutation = useMutation({
    mutationFn: async ({ donorId, year, letterType, donationAmount, customContent, renderedHtml }: any) => {
      // First create the draft letter
      const createResponse = await apiRequest('POST', '/api/donor-letters', {
        organizationId: currentOrganization.id,
        donorId,
        year: parseInt(year),
        letterType,
        donationAmount,
        customContent: letterType === 'custom' ? customContent : null,
      });
      const { data: letter } = await createResponse.json();

      // Then finalize it with the rendered HTML
      const finalizeResponse = await apiRequest('POST', `/api/donor-letters/${letter.id}/finalize`, {
        renderedHtml,
      });
      return await finalizeResponse.json();
    },
    onSuccess: () => {
      // Invalidate donation letters query to update status
      queryClient.invalidateQueries({ queryKey: [`/api/donor-letters`, currentOrganization.id, selectedYear] });
      toast({
        title: "Letter created",
        description: "Donor letter has been created and saved successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create donor letter",
        variant: "destructive",
      });
    },
  });

  const emailLetterMutation = useMutation({
    mutationFn: async (letterId: number) => {
      const response = await apiRequest('POST', `/api/donor-letters/${letterId}/email`);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/donor-letters`, currentOrganization.id, selectedYear] });
      toast({
        title: "Email sent",
        description: "Donation letter has been emailed to the donor successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send donation letter email",
        variant: "destructive",
      });
    },
  });

  const handleEmailLetter = async (donorId: number) => {
    const letterInfo = getLetterStatusForDonor(donorId);
    if (letterInfo?.letterId) {
      emailLetterMutation.mutate(letterInfo.letterId);
    } else {
      toast({
        title: "No letter found",
        description: "Please generate a letter first before sending an email.",
        variant: "destructive",
      });
    }
  };

  const handleGenerateLetter = (donor: Donor, totalAmount: string) => {
    setSelectedDonor(donor);
    setSelectedAmount(totalAmount);
    setLetterType('general');
    setCustomContent("");
    setIsLetterDialogOpen(true);
  };

  const generateGeneralLetterHTML = () => {
    if (!selectedDonor) return "";

    const logoUrl = currentOrganization.logoUrl 
      ? `${window.location.origin}${currentOrganization.logoUrl}`
      : "";
    
    const primaryColor = currentOrganization.invoicePrimaryColor || '#3b82f6';
    const fontFamily = currentOrganization.invoiceFontFamily || 'Inter, sans-serif';
    
    const currentDate = new Date().toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });

    // Use table layout for html2pdf compatibility (flexbox doesn't work well)
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body {
            font-family: ${fontFamily};
            font-size: 14px;
            line-height: 1.5;
            color: #374151;
            margin: 0;
            padding: 32px 40px;
          }
          table {
            border-collapse: collapse;
          }
          .header-table {
            width: 100%;
            margin-bottom: 24px;
            padding-bottom: 24px;
            border-bottom: 1px solid #e5e7eb;
          }
          .logo-cell {
            width: 70px;
            vertical-align: top;
            padding-right: 16px;
          }
          .logo-cell img {
            width: 60px;
            height: 60px;
            object-fit: contain;
          }
          .org-cell {
            vertical-align: top;
          }
          .org-name {
            font-size: 18px;
            font-weight: 700;
            color: #111827;
            margin: 0 0 4px 0;
          }
          .org-details {
            font-size: 13px;
            color: #6b7280;
            line-height: 1.4;
          }
          .title-cell {
            vertical-align: top;
            text-align: right;
          }
          .letter-title {
            font-size: 28px;
            font-weight: 700;
            color: ${primaryColor};
            margin: 0 0 8px 0;
          }
          .letter-meta {
            font-size: 13px;
            color: #6b7280;
          }
          .letter-meta-value {
            color: #374151;
            font-weight: 500;
          }
          
          .recipient-section {
            margin-bottom: 28px;
          }
          .recipient-label {
            font-size: 12px;
            font-weight: 600;
            color: #6b7280;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 6px;
          }
          .recipient-name {
            font-weight: 600;
            color: #111827;
          }
          .recipient-info {
            font-size: 14px;
            color: #374151;
            line-height: 1.5;
          }
          
          .letter-body {
            margin-bottom: 24px;
          }
          .salutation {
            margin-bottom: 16px;
          }
          .paragraph {
            margin: 0 0 14px 0;
            line-height: 1.6;
          }
          
          .donation-table {
            width: 100%;
            margin: 20px 0;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
          }
          .donation-table td {
            padding: 16px 20px;
            border-left: 4px solid ${primaryColor};
          }
          .donation-label {
            font-size: 11px;
            font-weight: 600;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 4px;
          }
          .donation-amount {
            font-size: 26px;
            font-weight: 700;
            color: ${primaryColor};
          }
          .donation-year {
            font-size: 12px;
            color: #64748b;
            margin-top: 2px;
          }
          
          .tax-notice-table {
            width: 100%;
            margin: 20px 0;
            background: #fefce8;
            border: 1px solid #fde047;
          }
          .tax-notice-table td {
            padding: 14px 18px;
          }
          .tax-notice-title {
            font-weight: 600;
            color: #854d0e;
            margin-bottom: 6px;
            font-size: 13px;
          }
          .tax-notice-text {
            color: #713f12;
            font-size: 12px;
            line-height: 1.5;
          }
          
          .closing-section {
            margin-top: 28px;
          }
          .closing-text {
            margin-bottom: 24px;
          }
          .signature-name {
            font-weight: 600;
            color: #111827;
          }
          .signature-title {
            font-size: 13px;
            color: #6b7280;
            margin-top: 2px;
          }
          .ein-info {
            font-size: 12px;
            color: #6b7280;
            margin-top: 12px;
            padding-top: 10px;
            border-top: 1px solid #e5e7eb;
          }
          
          .footer {
            margin-top: 40px;
            padding-top: 16px;
            border-top: 1px solid #e5e7eb;
            text-align: center;
            font-size: 11px;
            color: #9ca3af;
          }
        </style>
      </head>
      <body>
        <!-- Header - Table Layout for PDF compatibility -->
        <table class="header-table">
          <tr>
            ${logoUrl ? `
            <td class="logo-cell">
              <img src="${logoUrl}" alt="Logo" />
            </td>
            ` : ''}
            <td class="org-cell">
              <div class="org-name">${currentOrganization.companyName || currentOrganization.name}</div>
              <div class="org-details">
                ${currentOrganization.companyName && currentOrganization.companyName !== currentOrganization.name ? `${currentOrganization.name}<br/>` : ''}
                ${currentOrganization.companyAddress ? `${currentOrganization.companyAddress.replace(/\n/g, '<br/>')}<br/>` : ''}
                ${currentOrganization.companyPhone ? `${currentOrganization.companyPhone}<br/>` : ''}
                ${currentOrganization.companyEmail ? `${currentOrganization.companyEmail}<br/>` : ''}
                ${currentOrganization.companyWebsite ? `${currentOrganization.companyWebsite}<br/>` : ''}
                ${currentOrganization.taxId ? `Tax ID: ${currentOrganization.taxId}` : ''}
              </div>
            </td>
            <td class="title-cell">
              <div class="letter-title">DONATION RECEIPT</div>
              <div class="letter-meta">
                Date: <span class="letter-meta-value">${currentDate}</span><br/>
                Tax Year: <span class="letter-meta-value">${selectedYear}</span>
              </div>
            </td>
          </tr>
        </table>

        <!-- Recipient Section -->
        <div class="recipient-section">
          <div class="recipient-label">Donor Information</div>
          <div class="recipient-info">
            <span class="recipient-name">${selectedDonor.name}</span><br/>
            ${selectedDonor.address ? `${selectedDonor.address}<br/>` : ''}
            ${selectedDonor.email ? `${selectedDonor.email}` : ''}
          </div>
        </div>

        <!-- Letter Body -->
        <div class="letter-body">
          <div class="salutation">Dear ${selectedDonor.name},</div>
          
          <p class="paragraph">
            Thank you for your generous support of ${currentOrganization.companyName || currentOrganization.name}. Your commitment to our mission makes a meaningful difference in the communities we serve.
          </p>

          <p class="paragraph">
            This letter serves as your official acknowledgment of the charitable contribution(s) you made during the ${selectedYear} tax year. Please retain this document for your tax records.
          </p>

          <!-- Donation Summary - Table for PDF -->
          <table class="donation-table">
            <tr>
              <td>
                <div class="donation-label">Total Charitable Contribution</div>
                <div class="donation-amount">${formatCurrency(selectedAmount)}</div>
                <div class="donation-year">Tax Year ${selectedYear}</div>
              </td>
            </tr>
          </table>

          <p class="paragraph">
            Your generosity enables us to continue our important work and expand our reach. We are truly grateful for your partnership and trust in our organization.
          </p>

          <!-- Tax Notice - Table for PDF -->
          <table class="tax-notice-table">
            <tr>
              <td>
                <div class="tax-notice-title">Important Tax Information</div>
                <div class="tax-notice-text">
                  ${currentOrganization.companyName || currentOrganization.name} is a tax-exempt organization under Section 501(c)(3) of the Internal Revenue Code. No goods or services were provided in exchange for this contribution. The full amount of your donation is tax-deductible to the extent allowed by law. Please consult with a qualified tax professional regarding the deductibility of your contribution.
                </div>
              </td>
            </tr>
          </table>

          <p class="paragraph">
            On behalf of everyone at ${currentOrganization.companyName || currentOrganization.name}, thank you for your continued support. We look forward to keeping you informed about the impact of your generosity.
          </p>
        </div>

        <!-- Closing -->
        <div class="closing-section">
          <div class="closing-text">With sincere gratitude,</div>
          <div class="signature-name">${currentOrganization.companyName || currentOrganization.name}</div>
          <div class="signature-title">Development Department</div>
          ${currentOrganization.taxId ? `<div class="ein-info">Federal Tax Identification Number (EIN): ${currentOrganization.taxId}</div>` : ''}
        </div>

        ${currentOrganization.invoiceFooter ? `
          <div class="footer">
            ${currentOrganization.invoiceFooter}
          </div>
        ` : ''}
      </body>
      </html>
    `;
  };

  const handleDownloadPDF = async () => {
    if (!selectedDonor) return;

    const html = letterType === 'general' 
      ? generateGeneralLetterHTML()
      : customContent;

    if (!html || (letterType === 'custom' && !customContent.trim())) {
      toast({
        title: "Error",
        description: "Please provide letter content",
        variant: "destructive",
      });
      return;
    }

    try {
      // Generate PDF
      const element = document.createElement('div');
      element.innerHTML = DOMPurify.sanitize(html);
      
      await html2pdf()
        .set({
          margin: 10,
          filename: `donation-letter-${selectedDonor.name.replace(/\s+/g, '-')}-${selectedYear}.pdf`,
          html2canvas: { scale: 2 },
          jsPDF: { unit: 'mm', format: 'letter', orientation: 'portrait' }
        })
        .from(element)
        .save();

      // Save to database
      await createLetterMutation.mutateAsync({
        donorId: selectedDonor.id,
        year: selectedYear,
        letterType,
        donationAmount: selectedAmount,
        customContent: letterType === 'custom' ? customContent : null,
        renderedHtml: html,
      });

      setIsLetterDialogOpen(false);
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast({
        title: "Error",
        description: "Failed to generate PDF",
        variant: "destructive",
      });
    }
  };

  const handleGenerateAndEmail = async () => {
    if (!selectedDonor) return;

    if (!selectedDonor.email) {
      toast({
        title: "No email address",
        description: "This donor does not have an email address on file.",
        variant: "destructive",
      });
      return;
    }

    const html = letterType === 'general' 
      ? generateGeneralLetterHTML()
      : customContent;

    if (!html || (letterType === 'custom' && !customContent.trim())) {
      toast({
        title: "Error",
        description: "Please provide letter content",
        variant: "destructive",
      });
      return;
    }

    try {
      // First create and finalize the letter
      const result = await createLetterMutation.mutateAsync({
        donorId: selectedDonor.id,
        year: selectedYear,
        letterType,
        donationAmount: selectedAmount,
        customContent: letterType === 'custom' ? customContent : null,
        renderedHtml: html,
      });

      // Then email it
      if (result.data?.id) {
        await emailLetterMutation.mutateAsync(result.data.id);
      }

      setIsLetterDialogOpen(false);
    } catch (error) {
      console.error("Error emailing letter:", error);
      toast({
        title: "Error",
        description: "Failed to email donation letter",
        variant: "destructive",
      });
    }
  };

  const formatCurrency = (amount: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(parseFloat(amount));
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-page-title">Donation Letters</h1>
          <p className="text-muted-foreground">Generate tax deduction letters for donors</p>
        </div>
        <div className="flex items-center gap-3">
          <Calendar className="h-5 w-5 text-muted-foreground" />
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-[140px]" data-testid="select-year">
              <SelectValue placeholder="Select year" />
            </SelectTrigger>
            <SelectContent>
              {availableYears.map((year) => (
                <SelectItem key={year} value={year} data-testid={`year-option-${year}`}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Donor Contributions - {selectedYear}</CardTitle>
          <CardDescription>
            Annual donation totals and tax letter generation
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading donations...</div>
          ) : donationData.length === 0 ? (
            <div className="text-center py-8">
              <Heart className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
              <p className="text-sm text-muted-foreground">No donations found for {selectedYear}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Add donors and link donations in the transactions page
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {donationData.map(({ donor, totalAmount, donations }) => (
                <div
                  key={donor.id}
                  className="p-4 rounded-md border hover-elevate"
                  data-testid={`donation-summary-${donor.id}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg mb-1" data-testid={`donor-name-${donor.id}`}>
                        {donor.name}
                      </h3>
                      <div className="text-sm text-muted-foreground space-y-1">
                        {donor.email && <p>Email: {donor.email}</p>}
                        {donor.address && <p>Address: {donor.address}</p>}
                        <p className="font-medium text-base mt-2">
                          Total Donations: <span className="text-foreground" data-testid={`total-amount-${donor.id}`}>
                            {formatCurrency(totalAmount)}
                          </span>
                        </p>
                        <p className="text-xs">
                          {donations.length} donation{donations.length !== 1 ? 's' : ''} in {selectedYear}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {(() => {
                        const letterInfo = getLetterStatusForDonor(donor.id);
                        const hasLetter = !!letterInfo;
                        const isSent = letterInfo?.status === 'sent';
                        const hasEmail = !!donor.email;
                        
                        return (
                          <>
                            {isSent && (
                              <Badge variant="secondary" className="gap-1" data-testid={`badge-sent-${donor.id}`}>
                                <Check className="w-3 h-3" />
                                Sent
                              </Badge>
                            )}
                            {hasLetter && hasEmail && !isSent && (
                              <Button
                                onClick={() => handleEmailLetter(donor.id)}
                                variant="outline"
                                size="sm"
                                disabled={emailLetterMutation.isPending}
                                data-testid={`button-email-letter-${donor.id}`}
                              >
                                <Mail className="w-4 h-4 mr-2" />
                                {emailLetterMutation.isPending ? "Sending..." : "Email Letter"}
                              </Button>
                            )}
                            {hasLetter && hasEmail && isSent && (
                              <Button
                                onClick={() => handleEmailLetter(donor.id)}
                                variant="ghost"
                                size="sm"
                                disabled={emailLetterMutation.isPending}
                                data-testid={`button-resend-letter-${donor.id}`}
                              >
                                <Mail className="w-4 h-4 mr-2" />
                                {emailLetterMutation.isPending ? "Sending..." : "Resend"}
                              </Button>
                            )}
                            <Button
                              onClick={() => handleGenerateLetter(donor, totalAmount)}
                              variant="outline"
                              data-testid={`button-generate-letter-${donor.id}`}
                            >
                              <FileDown className="w-4 h-4 mr-2" />
                              {hasLetter ? "Regenerate Letter" : "Generate Letter"}
                            </Button>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                  
                  <div className="mt-4 pt-4 border-t">
                    <p className="text-sm font-medium mb-2">Donation Details:</p>
                    <div className="space-y-1">
                      {donations.map((donation) => (
                        <div
                          key={donation.id}
                          className="text-sm text-muted-foreground flex justify-between"
                          data-testid={`donation-detail-${donation.id}`}
                        >
                          <span>{new Date(donation.date).toLocaleDateString()}</span>
                          <span>{donation.description}</span>
                          <span className="font-medium">{formatCurrency(donation.amount)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
              
              <div className="mt-6 p-4 bg-muted rounded-md">
                <p className="text-sm font-medium mb-2">Tax Letter Information</p>
                <p className="text-xs text-muted-foreground">
                  Generated letters will include:
                </p>
                <ul className="text-xs text-muted-foreground list-disc list-inside mt-2 space-y-1">
                  <li>Organization information and EIN</li>
                  <li>Donor name and address</li>
                  <li>Total donation amount for the tax year</li>
                  <li>Itemized list of all donations</li>
                  <li>Statement confirming no goods or services were received</li>
                  <li>IRS-compliant language for tax deduction purposes</li>
                </ul>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Donor Letter Generation Dialog */}
      <Dialog open={isLetterDialogOpen} onOpenChange={setIsLetterDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Generate Donor Letter</DialogTitle>
            <DialogDescription>
              Create a tax deduction letter for {selectedDonor?.name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Letter Type Selection */}
            <div className="space-y-3">
              <Label>Letter Type</Label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setLetterType('general')}
                  className={`p-4 rounded-md border-2 text-left transition-colors ${
                    letterType === 'general'
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover-elevate'
                  }`}
                  data-testid="button-letter-type-general"
                >
                  <div className="flex items-start gap-3">
                    <FileText className="w-5 h-5 mt-0.5" />
                    <div>
                      <div className="font-semibold mb-1">General Letter</div>
                      <div className="text-sm text-muted-foreground">
                        Standard 501(c)(3) tax deduction letter with IRS-compliant language
                      </div>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => setLetterType('custom')}
                  className={`p-4 rounded-md border-2 text-left transition-colors ${
                    letterType === 'custom'
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover-elevate'
                  }`}
                  data-testid="button-letter-type-custom"
                >
                  <div className="flex items-start gap-3">
                    <Edit3 className="w-5 h-5 mt-0.5" />
                    <div>
                      <div className="font-semibold mb-1">Custom Letter</div>
                      <div className="text-sm text-muted-foreground">
                        Write your own custom letter content
                      </div>
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {/* Custom Content Editor */}
            {letterType === 'custom' && (
              <div className="space-y-2">
                <Label htmlFor="custom-content">Letter Content (HTML)</Label>
                <Textarea
                  id="custom-content"
                  value={customContent}
                  onChange={(e) => setCustomContent(e.target.value)}
                  placeholder="Enter your custom letter content in HTML format..."
                  rows={12}
                  className="font-mono text-sm"
                  data-testid="textarea-custom-content"
                />
                <p className="text-xs text-muted-foreground">
                  You can use HTML for formatting. Include your organization branding manually.
                </p>
              </div>
            )}

            {/* Letter Preview */}
            {letterType === 'general' && selectedDonor && (
              <div className="space-y-2">
                <Label>Letter Preview</Label>
                <div
                  className="border rounded-md p-6 bg-background max-h-96 overflow-y-auto"
                  dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(generateGeneralLetterHTML()) }}
                />
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-wrap justify-end gap-3 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => setIsLetterDialogOpen(false)}
                data-testid="button-cancel-letter"
              >
                Cancel
              </Button>
              <Button
                variant="outline"
                onClick={handleDownloadPDF}
                disabled={createLetterMutation.isPending || emailLetterMutation.isPending || (letterType === 'custom' && !customContent.trim())}
                data-testid="button-download-letter-pdf"
              >
                <FileDown className="w-4 h-4 mr-2" />
                {createLetterMutation.isPending && !emailLetterMutation.isPending ? "Generating..." : "Download PDF"}
              </Button>
              <Button
                onClick={handleGenerateAndEmail}
                disabled={!selectedDonor?.email || createLetterMutation.isPending || emailLetterMutation.isPending || (letterType === 'custom' && !customContent.trim())}
                data-testid="button-email-letter"
              >
                <Mail className="w-4 h-4 mr-2" />
                {emailLetterMutation.isPending ? "Sending..." : "Email to Donor"}
              </Button>
            </div>
            {selectedDonor && !selectedDonor.email && (
              <p className="text-xs text-muted-foreground text-right mt-2">
                Add an email address to this donor to enable email delivery.
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
