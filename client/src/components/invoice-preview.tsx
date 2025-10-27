import { format } from "date-fns";
import { Building2 } from "lucide-react";
import type { Invoice, InvoiceLineItem, Organization } from "@shared/schema";

interface InvoicePreviewProps {
  invoice: Invoice & { clientName: string | null };
  lineItems: InvoiceLineItem[];
  organization: Organization;
}

export function InvoicePreview({ invoice, lineItems, organization }: InvoicePreviewProps) {
  const subtotal = lineItems.reduce((sum, item) => 
    sum + (parseFloat(item.quantity) * parseFloat(item.rate)), 0
  );
  const tax = parseFloat(invoice.taxAmount || "0");
  const total = subtotal + tax;

  const primaryColor = organization.invoicePrimaryColor || "#3b82f6";
  const accentColor = organization.invoiceAccentColor || "#1e40af";
  const fontFamily = organization.invoiceFontFamily || "Inter";
  const template = organization.invoiceTemplate || "classic";

  return (
    <div 
      className="bg-background p-8 max-w-4xl mx-auto space-y-8" 
      style={{ fontFamily }}
      data-testid="invoice-preview"
    >
      {/* Header with Logo and Company Info */}
      <div 
        className="flex items-start justify-between gap-6 pb-6 border-b" 
        style={{ borderColor: primaryColor + '30' }}
      >
        <div className="flex items-start gap-4">
          {organization.logoUrl ? (
            <img
              src={organization.logoUrl}
              alt="Company logo"
              className="w-20 h-20 object-contain"
              data-testid="img-company-logo"
            />
          ) : (
            <div className="w-20 h-20 rounded bg-muted flex items-center justify-center">
              <Building2 className="w-10 h-10 text-muted-foreground" />
            </div>
          )}
          <div className="space-y-1">
            <h2 className="text-xl font-bold" data-testid="text-company-name">
              {organization.companyName || organization.name}
            </h2>
            {organization.companyAddress && (
              <p className="text-sm text-muted-foreground whitespace-pre-line" data-testid="text-company-address">
                {organization.companyAddress}
              </p>
            )}
            {organization.companyPhone && (
              <p className="text-sm text-muted-foreground" data-testid="text-company-phone">
                {organization.companyPhone}
              </p>
            )}
            {organization.companyEmail && (
              <p className="text-sm text-muted-foreground" data-testid="text-company-email">
                {organization.companyEmail}
              </p>
            )}
            {organization.companyWebsite && (
              <p className="text-sm text-muted-foreground" data-testid="text-company-website">
                {organization.companyWebsite}
              </p>
            )}
            {organization.taxId && (
              <p className="text-sm text-muted-foreground" data-testid="text-tax-id">
                Tax ID: {organization.taxId}
              </p>
            )}
          </div>
        </div>

        <div className="text-right space-y-2">
          <h1 
            className="text-3xl font-bold" 
            style={{ color: primaryColor }}
          >
            INVOICE
          </h1>
          <div className="space-y-1 text-sm">
            <div>
              <span className="text-muted-foreground">Invoice #: </span>
              <span className="font-medium" data-testid="text-invoice-number">{invoice.invoiceNumber}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Issue Date: </span>
              <span data-testid="text-issue-date">{format(new Date(invoice.issueDate), "MMM dd, yyyy")}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Due Date: </span>
              <span data-testid="text-due-date">{format(new Date(invoice.dueDate), "MMM dd, yyyy")}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Status: </span>
              <span className="font-medium capitalize" data-testid="text-status">{invoice.status}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bill To Section */}
      {invoice.clientName && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground">BILL TO:</h3>
          <p className="font-medium" data-testid="text-client-name">{invoice.clientName}</p>
        </div>
      )}

      {/* Line Items Table */}
      <div className="space-y-4">
        <table className="w-full">
          <thead>
            <tr className="border-b-2" style={{ borderColor: primaryColor }}>
              <th className="text-left pb-3 font-medium">Description</th>
              <th className="text-right pb-3 font-medium w-24">Quantity</th>
              <th className="text-right pb-3 font-medium w-32">Rate</th>
              <th className="text-right pb-3 font-medium w-32">Amount</th>
            </tr>
          </thead>
          <tbody>
            {lineItems.map((item, index) => (
              <tr key={item.id} className="border-b" data-testid={`row-line-item-${index}`}>
                <td className="py-3">{item.description}</td>
                <td className="py-3 text-right">{parseFloat(item.quantity).toFixed(2)}</td>
                <td className="py-3 text-right">${parseFloat(item.rate).toFixed(2)}</td>
                <td className="py-3 text-right font-medium">
                  ${(parseFloat(item.quantity) * parseFloat(item.rate)).toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div className="flex justify-end">
          <div className="w-64 space-y-2">
            <div className="flex justify-between py-2">
              <span className="text-muted-foreground">Subtotal:</span>
              <span className="font-medium" data-testid="text-subtotal">${subtotal.toFixed(2)}</span>
            </div>
            {tax > 0 && (
              <div className="flex justify-between py-2">
                <span className="text-muted-foreground">Tax:</span>
                <span className="font-medium" data-testid="text-tax">${tax.toFixed(2)}</span>
              </div>
            )}
            <div 
              className="flex justify-between py-2 border-t-2 text-lg" 
              style={{ borderColor: primaryColor }}
            >
              <span className="font-bold" style={{ color: primaryColor }}>Total:</span>
              <span className="font-bold" style={{ color: primaryColor }} data-testid="text-total">${total.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Notes */}
      {(invoice.notes || organization.invoiceNotes) && (
        <div className="space-y-2 pt-4 border-t">
          <h3 className="text-sm font-medium text-muted-foreground">NOTES:</h3>
          <p className="text-sm whitespace-pre-line" data-testid="text-notes">
            {invoice.notes || organization.invoiceNotes}
          </p>
        </div>
      )}

      {/* Payment Information */}
      {(organization.invoicePaymentTerms || organization.invoicePaymentMethods) && (
        <div className="space-y-4 pt-4 border-t">
          {organization.invoicePaymentTerms && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium" style={{ color: accentColor }}>PAYMENT TERMS:</h3>
              <p className="text-sm whitespace-pre-line" data-testid="text-payment-terms">
                {organization.invoicePaymentTerms}
              </p>
            </div>
          )}
          
          {organization.invoicePaymentMethods && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium" style={{ color: accentColor }}>PAYMENT METHODS:</h3>
              <p className="text-sm whitespace-pre-line" data-testid="text-payment-methods">
                {organization.invoicePaymentMethods}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      {organization.invoiceFooter && (
        <div 
          className="text-center pt-6 border-t text-xs text-muted-foreground" 
          style={{ borderColor: primaryColor + '20' }}
        >
          <p className="whitespace-pre-line" data-testid="text-invoice-footer">
            {organization.invoiceFooter}
          </p>
        </div>
      )}
    </div>
  );
}
