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

    // Clean, professional formal business letter template
    // Note: html2pdf requires inline styles for reliable image sizing
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          * { box-sizing: border-box; }
          body {
            font-family: ${fontFamily};
            font-size: 12pt;
            line-height: 1.5;
            color: #1a1a1a;
            margin: 0;
            padding: 48px 56px;
          }
          table { border-collapse: collapse; }
          
          /* Header with logo and addresses */
          .header-table {
            width: 100%;
            margin-bottom: 24px;
          }
          .logo-cell {
            width: 70px;
            vertical-align: top;
            padding-right: 12px;
          }
          .sender-cell {
            vertical-align: top;
            font-size: 11pt;
            color: #444;
            line-height: 1.6;
          }
          .recipient-cell {
            vertical-align: top;
            text-align: right;
            font-size: 11pt;
            color: #444;
            line-height: 1.6;
          }
          
          /* Company name - prominent */
          .company-name {
            font-size: 22pt;
            font-weight: 700;
            color: ${primaryColor};
            margin: 24px 0 32px 0;
          }
          
          /* Date line */
          .date-line {
            margin-bottom: 32px;
            font-size: 11pt;
            color: #444;
          }
          
          /* Salutation */
          .salutation {
            margin-bottom: 24px;
          }
          
          /* Body paragraphs */
          .paragraph {
            margin: 0 0 20px 0;
            line-height: 1.7;
          }
          
          /* Donation amount - simple, inline emphasis */
          .amount-highlight {
            font-weight: 600;
          }
          
          /* Tax info - simple paragraph, not a box */
          .tax-info {
            margin: 24px 0;
            font-size: 11pt;
            color: #555;
            font-style: italic;
          }
          
          /* Closing */
          .closing {
            margin-top: 40px;
          }
          .closing-text {
            margin-bottom: 28px;
          }
          .signature-name {
            font-weight: 600;
          }
          
          /* Footer - simple, at bottom */
          .footer-section {
            margin-top: 48px;
            padding-top: 16px;
            border-top: 1px solid #ddd;
          }
          .footer-table {
            width: 100%;
          }
          .footer-left {
            vertical-align: bottom;
            font-size: 10pt;
            color: #666;
          }
          .footer-right {
            vertical-align: bottom;
            text-align: right;
            font-size: 10pt;
            color: #666;
          }
        </style>
      </head>
      <body>
        <!-- Header: Logo + Sender on left, Recipient on right -->
        <table class="header-table">
          <tr>
            ${logoUrl ? `
            <td class="logo-cell">
              <img src="${logoUrl}" width="50" height="50" style="width:50px;height:50px;max-width:50px;max-height:50px;object-fit:contain;display:block;" alt="" />
            </td>
            ` : ''}
            <td class="sender-cell">
              <strong>${currentOrganization.companyName || currentOrganization.name}</strong><br/>
              ${currentOrganization.companyAddress ? currentOrganization.companyAddress.replace(/\n/g, '<br/>') : ''}
            </td>
            <td class="recipient-cell">
              ${selectedDonor.name}<br/>
              ${selectedDonor.address ? selectedDonor.address.replace(/\n/g, '<br/>') : ''}
              ${selectedDonor.email ? `<br/>${selectedDonor.email}` : ''}
            </td>
          </tr>
        </table>

        <!-- Company Name -->
        <div class="company-name">${currentOrganization.companyName || currentOrganization.name}</div>

        <!-- Date -->
        <div class="date-line">${currentDate}</div>

        <!-- Salutation -->
        <div class="salutation">Dear ${selectedDonor.name},</div>

        <!-- Body -->
        <p class="paragraph">
          Thank you for your generous support of ${currentOrganization.companyName || currentOrganization.name}. Your commitment to our mission makes a meaningful difference in the communities we serve.
        </p>

        <p class="paragraph">
          This letter acknowledges your charitable contribution of <span class="amount-highlight">${formatCurrency(selectedAmount)}</span> during the ${selectedYear} tax year. Please retain this document for your tax records.
        </p>

        <p class="paragraph">
          Your generosity enables us to continue our important work and expand our reach. We are truly grateful for your partnership and trust in our organization.
        </p>

        <p class="tax-info">
          ${currentOrganization.companyName || currentOrganization.name} is a 501(c)(3) tax-exempt organization${currentOrganization.taxId ? ` (EIN: ${currentOrganization.taxId})` : ''}. No goods or services were provided in exchange for this contribution. All contributions are tax-deductible to the extent allowed by law.
        </p>

        <p class="paragraph">
          On behalf of everyone at ${currentOrganization.companyName || currentOrganization.name}, thank you for your continued support.
        </p>

        <!-- Closing -->
        <div class="closing">
          <div class="closing-text">Sincerely,</div>
          <div class="signature-name">${currentOrganization.companyName || currentOrganization.name}</div>
        </div>

        <!-- Footer -->
        <div class="footer-section">
          <table class="footer-table">
            <tr>
              <td class="footer-left">
                ${currentOrganization.companyName || currentOrganization.name}
              </td>
              <td class="footer-right">
                ${currentOrganization.companyAddress ? currentOrganization.companyAddress.split('\n').slice(-1)[0] : ''}<br/>
                ${currentOrganization.companyPhone ? currentOrganization.companyPhone : ''}
              </td>
            </tr>
          </table>
        </div>
      </body>
      </html>
    `;
  };

  // Generate custom letter with same header as general letter
  const generateCustomLetterHTML = (bodyContent: string) => {
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

    // Clean, professional formal business letter template for custom letters
    // Note: html2pdf requires inline styles for reliable image sizing
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          * { box-sizing: border-box; }
          body {
            font-family: ${fontFamily};
            font-size: 12pt;
            line-height: 1.5;
            color: #1a1a1a;
            margin: 0;
            padding: 48px 56px;
          }
          table { border-collapse: collapse; }
          
          .header-table {
            width: 100%;
            margin-bottom: 24px;
          }
          .logo-cell {
            width: 70px;
            vertical-align: top;
            padding-right: 12px;
          }
          .sender-cell {
            vertical-align: top;
            font-size: 11pt;
            color: #444;
            line-height: 1.6;
          }
          .recipient-cell {
            vertical-align: top;
            text-align: right;
            font-size: 11pt;
            color: #444;
            line-height: 1.6;
          }
          
          .company-name {
            font-size: 22pt;
            font-weight: 700;
            color: ${primaryColor};
            margin: 24px 0 32px 0;
          }
          
          .date-line {
            margin-bottom: 32px;
            font-size: 11pt;
            color: #444;
          }
          
          .letter-content {
            line-height: 1.7;
          }
          .letter-content p {
            margin: 0 0 20px 0;
          }
          
          .footer-section {
            margin-top: 48px;
            padding-top: 16px;
            border-top: 1px solid #ddd;
          }
          .footer-table {
            width: 100%;
          }
          .footer-left {
            vertical-align: bottom;
            font-size: 10pt;
            color: #666;
          }
          .footer-right {
            vertical-align: bottom;
            text-align: right;
            font-size: 10pt;
            color: #666;
          }
        </style>
      </head>
      <body>
        <!-- Header: Logo + Sender on left, Recipient on right -->
        <table class="header-table">
          <tr>
            ${logoUrl ? `
            <td class="logo-cell">
              <img src="${logoUrl}" width="50" height="50" style="width:50px;height:50px;max-width:50px;max-height:50px;object-fit:contain;display:block;" alt="" />
            </td>
            ` : ''}
            <td class="sender-cell">
              <strong>${currentOrganization.companyName || currentOrganization.name}</strong><br/>
              ${currentOrganization.companyAddress ? currentOrganization.companyAddress.replace(/\n/g, '<br/>') : ''}
            </td>
            <td class="recipient-cell">
              ${selectedDonor.name}<br/>
              ${selectedDonor.address ? selectedDonor.address.replace(/\n/g, '<br/>') : ''}
              ${selectedDonor.email ? `<br/>${selectedDonor.email}` : ''}
            </td>
          </tr>
        </table>

        <!-- Company Name -->
        <div class="company-name">${currentOrganization.companyName || currentOrganization.name}</div>

        <!-- Date -->
        <div class="date-line">${currentDate}</div>

        <!-- Custom Body Content -->
        <div class="letter-content">
          ${bodyContent}
        </div>

        <!-- Footer -->
        <div class="footer-section">
          <table class="footer-table">
            <tr>
              <td class="footer-left">
                ${currentOrganization.companyName || currentOrganization.name}
              </td>
              <td class="footer-right">
                ${currentOrganization.companyAddress ? currentOrganization.companyAddress.split('\n').slice(-1)[0] : ''}<br/>
                ${currentOrganization.companyPhone ? currentOrganization.companyPhone : ''}
              </td>
            </tr>
          </table>
        </div>
      </body>
      </html>
    `;
  };

  // Generate AI writing tips for custom letters
  const getLetterWritingGuidance = () => {
    const donorName = selectedDonor?.name || "the donor";
    const orgName = currentOrganization.companyName || currentOrganization.name;
    const amount = formatCurrency(selectedAmount);
    
    return {
      tips: [
        "Start with a warm, personalized greeting using the donor's name",
        "Express sincere gratitude for their specific contribution",
        "Share the impact of their donation with a concrete example",
        "Mention your organization's mission and how they're helping",
        "Include a specific story or outcome when possible",
        "Close with appreciation and an invitation to stay connected"
      ],
      sampleOpening: `<p>Dear ${donorName},</p>\n\n<p>I hope this letter finds you well. On behalf of everyone at ${orgName}, I wanted to take a moment to personally thank you for your generous contribution of ${amount}.</p>`,
      sampleBody: `<p>Your support has made a real difference in our community. [Share a specific impact story or outcome here - for example: "Thanks to donors like you, we were able to serve 50 more families this quarter" or "Your gift helped fund our new education program."]</p>\n\n<p>We are so grateful to have you as part of our ${orgName} family. Your belief in our mission inspires us every day.</p>`,
      sampleClosing: `<p>With heartfelt thanks,</p>\n\n<p><strong>${orgName}</strong><br/>Development Team</p>`
    };
  };

  const handleDownloadPDF = async () => {
    if (!selectedDonor) return;

    const html = letterType === 'general' 
      ? generateGeneralLetterHTML()
      : generateCustomLetterHTML(customContent);

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
      : generateCustomLetterHTML(customContent);

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

            {/* Custom Content Editor with AI Guidance */}
            {letterType === 'custom' && (
              <div className="space-y-4">
                {/* AI Writing Guidance */}
                <div className="rounded-lg border bg-blue-50 dark:bg-blue-950/30 p-4 space-y-3">
                  <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400">
                    <FileText className="w-4 h-4" />
                    <span className="font-medium text-sm">Writing Tips</span>
                  </div>
                  <ul className="text-sm text-blue-600 dark:text-blue-300 space-y-1 ml-6 list-disc">
                    {getLetterWritingGuidance().tips.map((tip, i) => (
                      <li key={i}>{tip}</li>
                    ))}
                  </ul>
                  <div className="pt-2 border-t border-blue-200 dark:border-blue-800">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const guidance = getLetterWritingGuidance();
                        setCustomContent(
                          `${guidance.sampleOpening}\n\n${guidance.sampleBody}\n\n${guidance.sampleClosing}`
                        );
                      }}
                      className="text-xs"
                      data-testid="button-use-template"
                    >
                      <Edit3 className="w-3 h-3 mr-1" />
                      Use Sample Template
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="custom-content">Letter Body</Label>
                  <Textarea
                    id="custom-content"
                    value={customContent}
                    onChange={(e) => setCustomContent(e.target.value)}
                    placeholder={`<p>Dear ${selectedDonor?.name || 'Donor'},</p>\n\n<p>Thank you for your generous support...</p>\n\n<p>Sincerely,</p>\n<p><strong>${currentOrganization.companyName || currentOrganization.name}</strong></p>`}
                    rows={10}
                    className="font-mono text-sm"
                    data-testid="textarea-custom-content"
                  />
                  <p className="text-xs text-muted-foreground">
                    Write the body of your letter using HTML. Use &lt;p&gt; tags for paragraphs and &lt;strong&gt; for bold text. 
                    Your organization's header with logo will be added automatically.
                  </p>
                </div>

                {/* Custom Letter Preview */}
                {customContent.trim() && selectedDonor && (
                  <div className="space-y-2">
                    <Label>Preview</Label>
                    <div
                      className="border rounded-md p-6 bg-background max-h-72 overflow-y-auto"
                      dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(generateCustomLetterHTML(customContent)) }}
                    />
                  </div>
                )}
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
