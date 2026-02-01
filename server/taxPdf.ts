import PDFDocument from 'pdfkit';
import type { TaxReport, TaxForm1099, Organization } from '@shared/schema';

interface TaxReportPdfParams {
  report: TaxReport;
  organization: Organization;
  branding?: {
    primaryColor?: string;
    logoUrl?: string;
  };
}

async function fetchImageBuffer(url: string): Promise<Buffer | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch {
    return null;
  }
}

export async function generateTaxReportPdf(params: TaxReportPdfParams): Promise<Buffer> {
  const { report, organization, branding } = params;
  
  let logoBuffer: Buffer | null = null;
  if (branding?.logoUrl) {
    logoBuffer = await fetchImageBuffer(branding.logoUrl);
  }

  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ 
        size: 'A4', 
        margin: 50,
        info: {
          Title: `${report.taxYear} Tax Report - ${report.formType === '990' ? 'Form 990' : 'Schedule C'}`,
          Author: organization.name
        }
      });

      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const primaryColor = branding?.primaryColor || '#0070f3';
      
      let headerBottomY = 50;
      
      if (logoBuffer) {
        try {
          doc.image(logoBuffer, 50, 50, { width: 120, height: 40, fit: [120, 40] });
          headerBottomY = 95;
        } catch {
          doc.fontSize(14).fillColor('#1a1a1a');
          doc.text(organization.name, 50, 50, { width: 250 });
          headerBottomY = 70;
        }
      } else {
        doc.fontSize(14).fillColor('#1a1a1a');
        doc.text(organization.name, 50, 50, { width: 250 });
        headerBottomY = 70;
      }

      doc.fontSize(28).fillColor(primaryColor);
      const formTitle = report.formType === '990' ? 'FORM 990' : 'SCHEDULE C';
      doc.text(formTitle, 350, 50, { width: 195, align: 'right' });
      doc.fontSize(12).fillColor('#666666');
      doc.text(`Tax Year ${report.taxYear}`, 350, 85, { width: 195, align: 'right' });

      const sectionY = headerBottomY + 30;
      doc.fontSize(18).fillColor(primaryColor);
      doc.text('Year-End Tax Report Summary', 50, sectionY);
      
      doc.moveTo(50, sectionY + 25).lineTo(545, sectionY + 25).strokeColor('#e5e7eb').stroke();

      const detailsStartY = sectionY + 45;
      
      doc.fontSize(10).fillColor('#666666');
      doc.text('Organization:', 50, detailsStartY);
      doc.fontSize(11).fillColor('#1a1a1a');
      doc.text(organization.name, 150, detailsStartY);
      
      if (organization.taxId) {
        doc.fontSize(10).fillColor('#666666');
        doc.text('EIN:', 50, detailsStartY + 20);
        doc.fontSize(11).fillColor('#1a1a1a');
        doc.text(organization.taxId, 150, detailsStartY + 20);
      }
      
      doc.fontSize(10).fillColor('#666666');
      doc.text('Report Type:', 50, detailsStartY + 40);
      doc.fontSize(11).fillColor('#1a1a1a');
      doc.text(report.formType === '990' ? 'Nonprofit (Form 990)' : 'For-Profit (Schedule C)', 150, detailsStartY + 40);
      
      doc.fontSize(10).fillColor('#666666');
      doc.text('Generated:', 50, detailsStartY + 60);
      doc.fontSize(11).fillColor('#1a1a1a');
      doc.text(new Date(report.createdAt).toLocaleDateString(), 150, detailsStartY + 60);

      const financialsY = detailsStartY + 100;
      doc.fontSize(16).fillColor(primaryColor);
      doc.text('Financial Summary', 50, financialsY);
      
      doc.moveTo(50, financialsY + 22).lineTo(545, financialsY + 22).strokeColor('#e5e7eb').stroke();

      const tableStartY = financialsY + 40;
      const rowHeight = 35;
      
      const totalIncome = parseFloat(report.totalIncome);
      const totalExpenses = parseFloat(report.totalExpenses);
      const totalDeductions = parseFloat(report.totalDeductions);
      const netIncome = parseFloat(report.netIncome);

      doc.rect(50, tableStartY, 495, rowHeight).fillColor('#f9fafb').fill();
      doc.fontSize(11).fillColor('#374151');
      doc.text('Total Income', 60, tableStartY + 12);
      doc.fontSize(12).fillColor('#16a34a');
      doc.text(`$${totalIncome.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, 350, tableStartY + 12, { width: 185, align: 'right' });

      doc.rect(50, tableStartY + rowHeight, 495, rowHeight).fillColor('#ffffff').fill();
      doc.fontSize(11).fillColor('#374151');
      doc.text('Total Expenses', 60, tableStartY + rowHeight + 12);
      doc.fontSize(12).fillColor('#dc2626');
      doc.text(`$${totalExpenses.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, 350, tableStartY + rowHeight + 12, { width: 185, align: 'right' });

      doc.rect(50, tableStartY + rowHeight * 2, 495, rowHeight).fillColor('#f9fafb').fill();
      doc.fontSize(11).fillColor('#374151');
      doc.text('Tax Deductions', 60, tableStartY + rowHeight * 2 + 12);
      doc.fontSize(12).fillColor('#2563eb');
      doc.text(`$${totalDeductions.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, 350, tableStartY + rowHeight * 2 + 12, { width: 185, align: 'right' });

      doc.rect(50, tableStartY + rowHeight * 3, 495, rowHeight).fillColor('#ffffff').fill();
      doc.rect(50, tableStartY + rowHeight * 3, 495, rowHeight).strokeColor('#e5e7eb').stroke();
      doc.fontSize(12).fillColor('#374151').text('Net Income', 60, tableStartY + rowHeight * 3 + 12, { bold: true } as any);
      doc.fontSize(14).fillColor('#1a1a1a');
      doc.text(`$${netIncome.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, 350, tableStartY + rowHeight * 3 + 10, { width: 185, align: 'right' });

      const disclaimerY = tableStartY + rowHeight * 4 + 40;
      doc.rect(50, disclaimerY, 495, 60).fillColor('#fef3c7').fill();
      doc.fontSize(9).fillColor('#92400e');
      doc.text('IMPORTANT DISCLAIMER', 60, disclaimerY + 10, { bold: true } as any);
      doc.fontSize(8).fillColor('#78350f');
      doc.text('This report is for informational purposes only and does not constitute tax advice. Please consult a qualified tax professional for advice specific to your situation. Tax laws change frequently.', 60, disclaimerY + 25, { width: 475 });

      doc.fontSize(8).fillColor('#9ca3af');
      doc.text(`Generated by ComplyBook on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`, 50, 780, { align: 'center', width: 495 });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

interface TaxForm1099PdfParams {
  form: TaxForm1099;
  organization: Organization;
  branding?: {
    primaryColor?: string;
    logoUrl?: string;
  };
}

// Helper to format currency
function formatCurrency(amount: string | number): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num) || num === 0) return '';
  return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Helper to mask TIN for display
function maskTin(tin: string | null | undefined): string {
  if (!tin) return '';
  // Format as XXX-XX-1234 for SSN or XX-XXX1234 for EIN
  const cleaned = tin.replace(/\D/g, '');
  if (cleaned.length === 9) {
    // Check if it looks like an EIN (starts with valid EIN prefix)
    const einPrefixes = ['10', '12', '20', '21', '22', '23', '24', '25', '26', '27', '30', '31', '32', '33', '34', '35', '36', '37', '38', '39', '40', '41', '42', '43', '44', '45', '46', '47', '48', '50', '51', '52', '53', '54', '55', '56', '57', '58', '59', '60', '61', '62', '63', '64', '65', '66', '67', '68', '71', '72', '73', '74', '75', '76', '77', '80', '81', '82', '83', '84', '85', '86', '87', '88', '90', '91', '92', '93', '94', '95', '98', '99'];
    if (einPrefixes.includes(cleaned.substring(0, 2))) {
      return `**-***${cleaned.slice(-4)}`;
    }
    return `***-**-${cleaned.slice(-4)}`;
  }
  return tin.length > 4 ? `***-**-${tin.slice(-4)}` : tin;
}

// Generate 1099-NEC PDF in IRS format
function generate1099NEC(doc: PDFKit.PDFDocument, form: TaxForm1099, organization: Organization): void {
  const pageWidth = 595; // A4 width in points
  const margin = 30;
  const formWidth = pageWidth - (margin * 2);
  const leftColWidth = formWidth * 0.5;
  const rightColWidth = formWidth * 0.5;
  
  // Header
  doc.fontSize(8).fillColor('#000000');
  
  // VOID checkbox area (top left)
  doc.rect(margin, 30, 40, 12).stroke();
  doc.fontSize(6).text('VOID', margin + 2, 32);
  
  // CORRECTED checkbox (top right of void)
  doc.rect(margin + 50, 30, 55, 12).stroke();
  doc.fontSize(6).text('CORRECTED', margin + 52, 32);
  
  // Form identifier (top right)
  doc.fontSize(8).text('OMB No. 1545-0116', pageWidth - margin - 100, 30, { width: 100, align: 'right' });
  
  // Tax year (large, center-right)
  doc.fontSize(22).fillColor('#000000');
  doc.text(form.taxYear.toString(), pageWidth - margin - 80, 45, { width: 80, align: 'right' });
  
  // Form title
  doc.fontSize(14).fillColor('#000000');
  doc.text('Form 1099-NEC', pageWidth - margin - 130, 75, { width: 130, align: 'right' });
  
  // Form subtitle
  doc.fontSize(8).fillColor('#000000');
  doc.text('Nonemployee', pageWidth - margin - 130, 92, { width: 130, align: 'right' });
  doc.text('Compensation', pageWidth - margin - 130, 101, { width: 130, align: 'right' });
  
  // Copy label
  doc.fontSize(9);
  doc.text('Copy B', pageWidth - margin - 130, 115, { width: 130, align: 'right' });
  doc.fontSize(7);
  doc.text('For Recipient', pageWidth - margin - 130, 125, { width: 130, align: 'right' });
  
  // Main form boxes
  const boxStartY = 50;
  const boxHeight = 50;
  const smallBoxHeight = 35;
  
  // Left column - Payer information
  // Payer's name and address box
  doc.rect(margin, boxStartY, leftColWidth - 5, boxHeight * 2).stroke();
  doc.fontSize(6).fillColor('#000000');
  doc.text("PAYER'S name, street address, city or town, state or province, country, ZIP", margin + 3, boxStartY + 2, { width: leftColWidth - 10 });
  doc.text("or foreign postal code, and telephone no.", margin + 3, boxStartY + 9, { width: leftColWidth - 10 });
  
  doc.fontSize(9).fillColor('#000000');
  doc.text(organization.name, margin + 3, boxStartY + 22, { width: leftColWidth - 10 });
  if (organization.companyAddress) {
    doc.fontSize(8);
    doc.text(organization.companyAddress, margin + 3, boxStartY + 34, { width: leftColWidth - 10 });
  }
  if (organization.companyPhone) {
    doc.fontSize(8);
    doc.text(`Tel: ${organization.companyPhone}`, margin + 3, boxStartY + 70, { width: leftColWidth - 10 });
  }
  
  // Payer's TIN box
  const payerTinY = boxStartY + boxHeight * 2;
  doc.rect(margin, payerTinY, leftColWidth / 2 - 5, smallBoxHeight).stroke();
  doc.fontSize(6).text("PAYER'S TIN", margin + 3, payerTinY + 2);
  doc.fontSize(10).text(organization.taxId || '', margin + 3, payerTinY + 14);
  
  // Recipient's TIN box
  doc.rect(margin + leftColWidth / 2, payerTinY, leftColWidth / 2, smallBoxHeight).stroke();
  doc.fontSize(6).text("RECIPIENT'S TIN", margin + leftColWidth / 2 + 3, payerTinY + 2);
  doc.fontSize(10).text(maskTin(form.recipientTin), margin + leftColWidth / 2 + 3, payerTinY + 14);
  
  // Recipient's name box
  const recipientNameY = payerTinY + smallBoxHeight;
  doc.rect(margin, recipientNameY, leftColWidth - 5, smallBoxHeight).stroke();
  doc.fontSize(6).text("RECIPIENT'S name", margin + 3, recipientNameY + 2);
  doc.fontSize(10).text(form.recipientName, margin + 3, recipientNameY + 14);
  
  // Street address box
  const streetY = recipientNameY + smallBoxHeight;
  doc.rect(margin, streetY, leftColWidth - 5, smallBoxHeight).stroke();
  doc.fontSize(6).text("Street address (including apt. no.)", margin + 3, streetY + 2);
  doc.fontSize(9).text(form.recipientAddress || '', margin + 3, streetY + 14, { width: leftColWidth - 15 });
  
  // City, state, ZIP box
  const cityY = streetY + smallBoxHeight;
  doc.rect(margin, cityY, leftColWidth - 5, smallBoxHeight).stroke();
  doc.fontSize(6).text("City or town, state or province, country, and ZIP or foreign postal code", margin + 3, cityY + 2);
  // Parse address for city/state/zip if available
  doc.fontSize(9).text('', margin + 3, cityY + 14);
  
  // Account number box
  const accountY = cityY + smallBoxHeight;
  doc.rect(margin, accountY, leftColWidth / 2 - 5, smallBoxHeight).stroke();
  doc.fontSize(6).text("Account number (see instructions)", margin + 3, accountY + 2);
  
  // 2nd TIN not. box
  doc.rect(margin + leftColWidth / 2, accountY, leftColWidth / 2, smallBoxHeight).stroke();
  doc.fontSize(6).text("2nd TIN not.", margin + leftColWidth / 2 + 3, accountY + 2);
  
  // Right column - Amount boxes
  const rightX = margin + leftColWidth;
  const amountBoxWidth = rightColWidth - 5;
  const amountBoxHeight = 45;
  
  // Box 1 - Nonemployee compensation (main amount)
  doc.rect(rightX, boxStartY, amountBoxWidth, amountBoxHeight).stroke();
  doc.fontSize(6).text("1  Nonemployee compensation", rightX + 3, boxStartY + 2);
  doc.fontSize(14).fillColor('#000000');
  const amount = parseFloat(form.totalAmount);
  doc.text(`$ ${formatCurrency(amount)}`, rightX + 3, boxStartY + 18);
  
  // Box 2 - Payer made direct sales checkbox
  const box2Y = boxStartY + amountBoxHeight;
  doc.rect(rightX, box2Y, amountBoxWidth / 2, amountBoxHeight).stroke();
  doc.fontSize(6).fillColor('#000000');
  doc.text("2  Payer made direct sales", rightX + 3, box2Y + 2);
  doc.text("totaling $5,000 or more of", rightX + 3, box2Y + 9);
  doc.text("consumer products to", rightX + 3, box2Y + 16);
  doc.text("recipient for resale", rightX + 3, box2Y + 23);
  // Checkbox
  doc.rect(rightX + 10, box2Y + 32, 8, 8).stroke();
  
  // Box 3 - Reserved (was crop insurance, now for golden parachute)
  doc.rect(rightX + amountBoxWidth / 2, box2Y, amountBoxWidth / 2, amountBoxHeight).stroke();
  doc.fontSize(6).text("3", rightX + amountBoxWidth / 2 + 3, box2Y + 2);
  
  // Box 4 - Federal income tax withheld
  const box4Y = box2Y + amountBoxHeight;
  doc.rect(rightX, box4Y, amountBoxWidth, amountBoxHeight - 10).stroke();
  doc.fontSize(6).text("4  Federal income tax withheld", rightX + 3, box4Y + 2);
  doc.fontSize(12);
  // Federal tax withheld - not currently tracked in schema, show empty
  doc.text(`$`, rightX + 3, box4Y + 14);
  
  // State information section
  const stateY = box4Y + amountBoxHeight - 10;
  const stateBoxWidth = amountBoxWidth / 3;
  
  // Box 5 - State tax withheld
  doc.rect(rightX, stateY, stateBoxWidth, smallBoxHeight).stroke();
  doc.fontSize(6).text("5  State tax withheld", rightX + 3, stateY + 2);
  // State tax withheld - not currently tracked in schema
  doc.fontSize(9).text(`$`, rightX + 3, stateY + 14);
  
  // Box 6 - State/Payer's state no.
  doc.rect(rightX + stateBoxWidth, stateY, stateBoxWidth, smallBoxHeight).stroke();
  doc.fontSize(6).text("6  State/Payer's state no.", rightX + stateBoxWidth + 3, stateY + 2);
  doc.fontSize(9).text('', rightX + stateBoxWidth + 3, stateY + 14);
  
  // Box 7 - State income
  doc.rect(rightX + stateBoxWidth * 2, stateY, stateBoxWidth + 5, smallBoxHeight).stroke();
  doc.fontSize(6).text("7  State income", rightX + stateBoxWidth * 2 + 3, stateY + 2);
  doc.fontSize(9).text(`$`, rightX + stateBoxWidth * 2 + 3, stateY + 14);
  
  // Second row of state boxes (for second state if needed)
  const state2Y = stateY + smallBoxHeight;
  doc.rect(rightX, state2Y, stateBoxWidth, smallBoxHeight).stroke();
  doc.rect(rightX + stateBoxWidth, state2Y, stateBoxWidth, smallBoxHeight).stroke();
  doc.rect(rightX + stateBoxWidth * 2, state2Y, stateBoxWidth + 5, smallBoxHeight).stroke();
  
  // Instructions section at bottom
  const instructY = state2Y + smallBoxHeight + 20;
  
  doc.fontSize(9).fillColor('#000000');
  doc.text('This is important tax information and is being furnished to the IRS. If you are required to file a return,', margin, instructY, { width: formWidth });
  doc.text('a negligence penalty or other sanction may be imposed on you if this income is taxable and the IRS', margin, instructY + 11, { width: formWidth });
  doc.text('determines that it has not been reported.', margin, instructY + 22, { width: formWidth });
  
  // Recipient instructions
  const recInstrY = instructY + 45;
  doc.fontSize(8).fillColor('#000000');
  doc.text("RECIPIENT'S identification number. For your protection, this form", margin, recInstrY, { width: formWidth });
  doc.text("may show only the last four digits of your TIN (social security number", margin, recInstrY + 10, { width: formWidth });
  doc.text("(SSN), individual taxpayer identification number (ITIN), adoption", margin, recInstrY + 20, { width: formWidth });
  doc.text("taxpayer identification number (ATIN), or employer identification", margin, recInstrY + 30, { width: formWidth });
  doc.text("number (EIN)). However, the issuer has reported your complete TIN", margin, recInstrY + 40, { width: formWidth });
  doc.text("to the IRS.", margin, recInstrY + 50, { width: formWidth });
  
  // Disclaimer
  const disclaimerY = 700;
  doc.rect(margin, disclaimerY, formWidth, 60).fillColor('#fef3c7').fill();
  doc.rect(margin, disclaimerY, formWidth, 60).stroke();
  doc.fontSize(8).fillColor('#92400e');
  doc.text('IMPORTANT: This is Copy B for the recipient. This is NOT an official IRS form for filing.', margin + 5, disclaimerY + 8, { width: formWidth - 10 });
  doc.fontSize(7).fillColor('#78350f');
  doc.text('This form is provided for your records. For official IRS filing, the payer must file Form 1099-NEC with the IRS using', margin + 5, disclaimerY + 22, { width: formWidth - 10 });
  doc.text('the IRIS portal or approved transmitter. Consult a qualified tax professional for advice specific to your situation.', margin + 5, disclaimerY + 32, { width: formWidth - 10 });
  doc.text('For more information, see irs.gov/forms-pubs/about-form-1099-nec', margin + 5, disclaimerY + 45, { width: formWidth - 10 });
  
  // Filing status
  const statusY = disclaimerY + 65;
  doc.fontSize(9).fillColor('#666666');
  doc.text('Filing Status: ', margin, statusY);
  if (form.isFiled) {
    doc.fillColor('#16a34a').text('FILED', margin + 60, statusY);
    if (form.filedDate) {
      doc.fillColor('#666666').text(` on ${new Date(form.filedDate).toLocaleDateString()}`, margin + 90, statusY);
    }
  } else {
    doc.fillColor('#dc2626').text('NOT FILED', margin + 60, statusY);
  }
  
  // Footer
  doc.fontSize(7).fillColor('#9ca3af');
  doc.text(`Generated by ComplyBook on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`, margin, 780, { align: 'center', width: formWidth });
}

// Generate 1099-MISC PDF in IRS format
function generate1099MISC(doc: PDFKit.PDFDocument, form: TaxForm1099, organization: Organization): void {
  const pageWidth = 595;
  const margin = 30;
  const formWidth = pageWidth - (margin * 2);
  const leftColWidth = formWidth * 0.45;
  const rightColWidth = formWidth * 0.55;
  
  // Header
  doc.fontSize(8).fillColor('#000000');
  
  // VOID and CORRECTED checkboxes
  doc.rect(margin, 30, 40, 12).stroke();
  doc.fontSize(6).text('VOID', margin + 2, 32);
  doc.rect(margin + 50, 30, 55, 12).stroke();
  doc.fontSize(6).text('CORRECTED', margin + 52, 32);
  
  // Form identifier
  doc.fontSize(8).text('OMB No. 1545-0115', pageWidth - margin - 100, 30, { width: 100, align: 'right' });
  
  // Tax year
  doc.fontSize(22).fillColor('#000000');
  doc.text(form.taxYear.toString(), pageWidth - margin - 80, 45, { width: 80, align: 'right' });
  
  // Form title
  doc.fontSize(14).fillColor('#000000');
  doc.text('Form 1099-MISC', pageWidth - margin - 130, 75, { width: 130, align: 'right' });
  
  doc.fontSize(8);
  doc.text('Miscellaneous', pageWidth - margin - 130, 92, { width: 130, align: 'right' });
  doc.text('Information', pageWidth - margin - 130, 101, { width: 130, align: 'right' });
  
  doc.fontSize(9);
  doc.text('Copy B', pageWidth - margin - 130, 115, { width: 130, align: 'right' });
  doc.fontSize(7);
  doc.text('For Recipient', pageWidth - margin - 130, 125, { width: 130, align: 'right' });
  
  // Main form boxes
  const boxStartY = 50;
  const boxHeight = 45;
  const smallBoxHeight = 30;
  
  // Payer's name and address
  doc.rect(margin, boxStartY, leftColWidth, boxHeight * 2).stroke();
  doc.fontSize(6).text("PAYER'S name, street address, city or town, state or province,", margin + 3, boxStartY + 2, { width: leftColWidth - 5 });
  doc.text("country, ZIP or foreign postal code, and telephone no.", margin + 3, boxStartY + 9);
  doc.fontSize(9).text(organization.name, margin + 3, boxStartY + 22);
  if (organization.companyAddress) {
    doc.fontSize(8).text(organization.companyAddress, margin + 3, boxStartY + 34, { width: leftColWidth - 10 });
  }
  
  // TIN boxes
  const tinY = boxStartY + boxHeight * 2;
  doc.rect(margin, tinY, leftColWidth / 2, smallBoxHeight).stroke();
  doc.fontSize(6).text("PAYER'S TIN", margin + 3, tinY + 2);
  doc.fontSize(9).text(organization.taxId || '', margin + 3, tinY + 14);
  
  doc.rect(margin + leftColWidth / 2, tinY, leftColWidth / 2, smallBoxHeight).stroke();
  doc.fontSize(6).text("RECIPIENT'S TIN", margin + leftColWidth / 2 + 3, tinY + 2);
  doc.fontSize(9).text(maskTin(form.recipientTin), margin + leftColWidth / 2 + 3, tinY + 14);
  
  // Recipient's name
  const recipNameY = tinY + smallBoxHeight;
  doc.rect(margin, recipNameY, leftColWidth, smallBoxHeight).stroke();
  doc.fontSize(6).text("RECIPIENT'S name", margin + 3, recipNameY + 2);
  doc.fontSize(9).text(form.recipientName, margin + 3, recipNameY + 12);
  
  // Address boxes
  const addrY = recipNameY + smallBoxHeight;
  doc.rect(margin, addrY, leftColWidth, smallBoxHeight).stroke();
  doc.fontSize(6).text("Street address (including apt. no.)", margin + 3, addrY + 2);
  doc.fontSize(8).text(form.recipientAddress || '', margin + 3, addrY + 12, { width: leftColWidth - 10 });
  
  const cityY = addrY + smallBoxHeight;
  doc.rect(margin, cityY, leftColWidth, smallBoxHeight).stroke();
  doc.fontSize(6).text("City or town, state or province, country, and ZIP or foreign postal code", margin + 3, cityY + 2);
  
  // Account number
  const acctY = cityY + smallBoxHeight;
  doc.rect(margin, acctY, leftColWidth / 2, smallBoxHeight).stroke();
  doc.fontSize(6).text("Account number (see instructions)", margin + 3, acctY + 2);
  
  // FATCA filing requirement
  doc.rect(margin + leftColWidth / 2, acctY, leftColWidth / 2, smallBoxHeight).stroke();
  doc.fontSize(6).text("FATCA filing", margin + leftColWidth / 2 + 3, acctY + 2);
  doc.text("requirement", margin + leftColWidth / 2 + 3, acctY + 9);
  doc.rect(margin + leftColWidth / 2 + 50, acctY + 12, 8, 8).stroke();
  
  // Right column - Amount boxes (MISC has many boxes)
  const rightX = margin + leftColWidth + 5;
  const boxW = (rightColWidth - 5) / 3;
  const amtBoxH = 32;
  
  // Row 1: Boxes 1, 2, 3
  doc.rect(rightX, boxStartY, boxW, amtBoxH).stroke();
  doc.fontSize(6).text("1  Rents", rightX + 2, boxStartY + 2);
  doc.fontSize(9).text('$', rightX + 2, boxStartY + 14);
  
  doc.rect(rightX + boxW, boxStartY, boxW, amtBoxH).stroke();
  doc.fontSize(6).text("2  Royalties", rightX + boxW + 2, boxStartY + 2);
  doc.fontSize(9).text('$', rightX + boxW + 2, boxStartY + 14);
  
  doc.rect(rightX + boxW * 2, boxStartY, boxW, amtBoxH).stroke();
  doc.fontSize(6).text("3  Other income", rightX + boxW * 2 + 2, boxStartY + 2);
  // Main amount goes here for MISC
  const amount = parseFloat(form.totalAmount);
  doc.fontSize(10).text(`$ ${formatCurrency(amount)}`, rightX + boxW * 2 + 2, boxStartY + 14);
  
  // Row 2: Boxes 4, 5, 6
  const row2Y = boxStartY + amtBoxH;
  doc.rect(rightX, row2Y, boxW, amtBoxH).stroke();
  doc.fontSize(6).text("4  Federal income tax", rightX + 2, row2Y + 2);
  doc.text("withheld", rightX + 2, row2Y + 9);
  // Federal tax withheld - not currently tracked in schema
  doc.fontSize(9).text(`$`, rightX + 2, row2Y + 18);
  
  doc.rect(rightX + boxW, row2Y, boxW, amtBoxH).stroke();
  doc.fontSize(6).text("5  Fishing boat proceeds", rightX + boxW + 2, row2Y + 2);
  doc.fontSize(9).text('$', rightX + boxW + 2, row2Y + 14);
  
  doc.rect(rightX + boxW * 2, row2Y, boxW, amtBoxH).stroke();
  doc.fontSize(6).text("6  Medical and health", rightX + boxW * 2 + 2, row2Y + 2);
  doc.text("care payments", rightX + boxW * 2 + 2, row2Y + 9);
  doc.fontSize(9).text('$', rightX + boxW * 2 + 2, row2Y + 18);
  
  // Row 3: Boxes 7, 8, 9
  const row3Y = row2Y + amtBoxH;
  doc.rect(rightX, row3Y, boxW, amtBoxH).stroke();
  doc.fontSize(6).text("7  Direct sales indicator", rightX + 2, row3Y + 2);
  doc.rect(rightX + 10, row3Y + 15, 8, 8).stroke();
  
  doc.rect(rightX + boxW, row3Y, boxW, amtBoxH).stroke();
  doc.fontSize(6).text("8  Substitute payments", rightX + boxW + 2, row3Y + 2);
  doc.text("in lieu of dividends", rightX + boxW + 2, row3Y + 9);
  doc.fontSize(9).text('$', rightX + boxW + 2, row3Y + 18);
  
  doc.rect(rightX + boxW * 2, row3Y, boxW, amtBoxH).stroke();
  doc.fontSize(6).text("9  Crop insurance", rightX + boxW * 2 + 2, row3Y + 2);
  doc.text("proceeds", rightX + boxW * 2 + 2, row3Y + 9);
  doc.fontSize(9).text('$', rightX + boxW * 2 + 2, row3Y + 18);
  
  // Row 4: Boxes 10, 11, 12
  const row4Y = row3Y + amtBoxH;
  doc.rect(rightX, row4Y, boxW, amtBoxH).stroke();
  doc.fontSize(6).text("10 Gross proceeds paid", rightX + 2, row4Y + 2);
  doc.text("to an attorney", rightX + 2, row4Y + 9);
  doc.fontSize(9).text('$', rightX + 2, row4Y + 18);
  
  doc.rect(rightX + boxW, row4Y, boxW, amtBoxH).stroke();
  doc.fontSize(6).text("11 Fish purchased for", rightX + boxW + 2, row4Y + 2);
  doc.text("resale", rightX + boxW + 2, row4Y + 9);
  doc.fontSize(9).text('$', rightX + boxW + 2, row4Y + 18);
  
  doc.rect(rightX + boxW * 2, row4Y, boxW, amtBoxH).stroke();
  doc.fontSize(6).text("12 Section 409A", rightX + boxW * 2 + 2, row4Y + 2);
  doc.text("deferrals", rightX + boxW * 2 + 2, row4Y + 9);
  doc.fontSize(9).text('$', rightX + boxW * 2 + 2, row4Y + 18);
  
  // Row 5: Boxes 13, 14, 15
  const row5Y = row4Y + amtBoxH;
  doc.rect(rightX, row5Y, boxW, amtBoxH).stroke();
  doc.fontSize(6).text("13 Excess golden", rightX + 2, row5Y + 2);
  doc.text("parachute payments", rightX + 2, row5Y + 9);
  doc.fontSize(9).text('$', rightX + 2, row5Y + 18);
  
  doc.rect(rightX + boxW, row5Y, boxW, amtBoxH).stroke();
  doc.fontSize(6).text("14 Nonqualified deferred", rightX + boxW + 2, row5Y + 2);
  doc.text("compensation", rightX + boxW + 2, row5Y + 9);
  doc.fontSize(9).text('$', rightX + boxW + 2, row5Y + 18);
  
  doc.rect(rightX + boxW * 2, row5Y, boxW, amtBoxH).stroke();
  doc.fontSize(6).text("15 State tax withheld", rightX + boxW * 2 + 2, row5Y + 2);
  // State tax withheld - not currently tracked in schema
  doc.fontSize(9).text(`$`, rightX + boxW * 2 + 2, row5Y + 14);
  
  // State boxes row
  const stateRowY = row5Y + amtBoxH;
  doc.rect(rightX, stateRowY, boxW, smallBoxHeight).stroke();
  doc.fontSize(6).text("16 State/Payer's state no.", rightX + 2, stateRowY + 2);
  doc.fontSize(8).text('', rightX + 2, stateRowY + 14);
  
  doc.rect(rightX + boxW, stateRowY, boxW * 2, smallBoxHeight).stroke();
  doc.fontSize(6).text("17 State income", rightX + boxW + 2, stateRowY + 2);
  doc.fontSize(9).text(`$`, rightX + boxW + 2, stateRowY + 14);
  
  // Instructions
  const instructY = stateRowY + smallBoxHeight + 20;
  doc.fontSize(8).fillColor('#000000');
  doc.text('This is important tax information and is being furnished to the IRS. If you are required to file a return,', margin, instructY, { width: formWidth });
  doc.text('a negligence penalty or other sanction may be imposed on you if this income is taxable and the IRS', margin, instructY + 10, { width: formWidth });
  doc.text('determines that it has not been reported.', margin, instructY + 20, { width: formWidth });
  
  // Disclaimer
  const disclaimerY = 700;
  doc.rect(margin, disclaimerY, formWidth, 55).fillColor('#fef3c7').fill();
  doc.rect(margin, disclaimerY, formWidth, 55).stroke();
  doc.fontSize(8).fillColor('#92400e');
  doc.text('IMPORTANT: This is Copy B for the recipient. This is NOT an official IRS form for filing.', margin + 5, disclaimerY + 8, { width: formWidth - 10 });
  doc.fontSize(7).fillColor('#78350f');
  doc.text('This form is provided for your records. For official IRS filing, use the IRIS portal or approved transmitter.', margin + 5, disclaimerY + 20, { width: formWidth - 10 });
  doc.text('Consult a qualified tax professional for advice. See irs.gov/forms-pubs/about-form-1099-misc', margin + 5, disclaimerY + 32, { width: formWidth - 10 });
  
  // Filing status
  const statusY = disclaimerY + 60;
  doc.fontSize(9).fillColor('#666666');
  doc.text('Filing Status: ', margin, statusY);
  if (form.isFiled) {
    doc.fillColor('#16a34a').text('FILED', margin + 60, statusY);
    if (form.filedDate) {
      doc.fillColor('#666666').text(` on ${new Date(form.filedDate).toLocaleDateString()}`, margin + 90, statusY);
    }
  } else {
    doc.fillColor('#dc2626').text('NOT FILED', margin + 60, statusY);
  }
  
  // Footer
  doc.fontSize(7).fillColor('#9ca3af');
  doc.text(`Generated by ComplyBook on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`, margin, 780, { align: 'center', width: formWidth });
}

// Generate 1099-INT PDF in IRS format
function generate1099INT(doc: PDFKit.PDFDocument, form: TaxForm1099, organization: Organization): void {
  const pageWidth = 595;
  const margin = 30;
  const formWidth = pageWidth - (margin * 2);
  const leftColWidth = formWidth * 0.45;
  const rightColWidth = formWidth * 0.55;
  
  // Header
  doc.fontSize(8).fillColor('#000000');
  
  // VOID and CORRECTED checkboxes
  doc.rect(margin, 30, 40, 12).stroke();
  doc.fontSize(6).text('VOID', margin + 2, 32);
  doc.rect(margin + 50, 30, 55, 12).stroke();
  doc.fontSize(6).text('CORRECTED', margin + 52, 32);
  
  // Form identifier
  doc.fontSize(8).text('OMB No. 1545-0112', pageWidth - margin - 100, 30, { width: 100, align: 'right' });
  
  // Tax year
  doc.fontSize(22).fillColor('#000000');
  doc.text(form.taxYear.toString(), pageWidth - margin - 80, 45, { width: 80, align: 'right' });
  
  // Form title
  doc.fontSize(14).fillColor('#000000');
  doc.text('Form 1099-INT', pageWidth - margin - 130, 75, { width: 130, align: 'right' });
  
  doc.fontSize(8);
  doc.text('Interest Income', pageWidth - margin - 130, 92, { width: 130, align: 'right' });
  
  doc.fontSize(9);
  doc.text('Copy B', pageWidth - margin - 130, 108, { width: 130, align: 'right' });
  doc.fontSize(7);
  doc.text('For Recipient', pageWidth - margin - 130, 118, { width: 130, align: 'right' });
  
  // Main form boxes
  const boxStartY = 50;
  const boxHeight = 45;
  const smallBoxHeight = 30;
  
  // Payer's name and address
  doc.rect(margin, boxStartY, leftColWidth, boxHeight * 2).stroke();
  doc.fontSize(6).text("PAYER'S name, street address, city or town, state or province,", margin + 3, boxStartY + 2, { width: leftColWidth - 5 });
  doc.text("country, ZIP or foreign postal code, and telephone no.", margin + 3, boxStartY + 9);
  doc.fontSize(9).text(organization.name, margin + 3, boxStartY + 22);
  if (organization.companyAddress) {
    doc.fontSize(8).text(organization.companyAddress, margin + 3, boxStartY + 34, { width: leftColWidth - 10 });
  }
  
  // TIN boxes
  const tinY = boxStartY + boxHeight * 2;
  doc.rect(margin, tinY, leftColWidth / 2, smallBoxHeight).stroke();
  doc.fontSize(6).text("PAYER'S TIN", margin + 3, tinY + 2);
  doc.fontSize(9).text(organization.taxId || '', margin + 3, tinY + 14);
  
  doc.rect(margin + leftColWidth / 2, tinY, leftColWidth / 2, smallBoxHeight).stroke();
  doc.fontSize(6).text("RECIPIENT'S TIN", margin + leftColWidth / 2 + 3, tinY + 2);
  doc.fontSize(9).text(maskTin(form.recipientTin), margin + leftColWidth / 2 + 3, tinY + 14);
  
  // Recipient's name
  const recipNameY = tinY + smallBoxHeight;
  doc.rect(margin, recipNameY, leftColWidth, smallBoxHeight).stroke();
  doc.fontSize(6).text("RECIPIENT'S name", margin + 3, recipNameY + 2);
  doc.fontSize(9).text(form.recipientName, margin + 3, recipNameY + 12);
  
  // Address boxes
  const addrY = recipNameY + smallBoxHeight;
  doc.rect(margin, addrY, leftColWidth, smallBoxHeight).stroke();
  doc.fontSize(6).text("Street address (including apt. no.)", margin + 3, addrY + 2);
  doc.fontSize(8).text(form.recipientAddress || '', margin + 3, addrY + 12, { width: leftColWidth - 10 });
  
  const cityY = addrY + smallBoxHeight;
  doc.rect(margin, cityY, leftColWidth, smallBoxHeight).stroke();
  doc.fontSize(6).text("City or town, state or province, country, and ZIP or foreign postal code", margin + 3, cityY + 2);
  
  // Account number and FATCA
  const acctY = cityY + smallBoxHeight;
  doc.rect(margin, acctY, leftColWidth * 0.6, smallBoxHeight).stroke();
  doc.fontSize(6).text("Account number (see instructions)", margin + 3, acctY + 2);
  
  doc.rect(margin + leftColWidth * 0.6, acctY, leftColWidth * 0.2, smallBoxHeight).stroke();
  doc.fontSize(6).text("FATCA", margin + leftColWidth * 0.6 + 3, acctY + 2);
  doc.rect(margin + leftColWidth * 0.6 + 10, acctY + 14, 8, 8).stroke();
  
  doc.rect(margin + leftColWidth * 0.8, acctY, leftColWidth * 0.2, smallBoxHeight).stroke();
  doc.fontSize(6).text("2nd TIN", margin + leftColWidth * 0.8 + 3, acctY + 2);
  doc.text("not.", margin + leftColWidth * 0.8 + 3, acctY + 9);
  
  // Right column - Interest boxes
  const rightX = margin + leftColWidth + 5;
  const boxW = (rightColWidth - 5) / 2;
  const amtBoxH = 32;
  
  // Row 1: Boxes 1, 2
  doc.rect(rightX, boxStartY, boxW, amtBoxH).stroke();
  doc.fontSize(6).text("1  Interest income", rightX + 2, boxStartY + 2);
  const amount = parseFloat(form.totalAmount);
  doc.fontSize(11).text(`$ ${formatCurrency(amount)}`, rightX + 2, boxStartY + 14);
  
  doc.rect(rightX + boxW, boxStartY, boxW, amtBoxH).stroke();
  doc.fontSize(6).text("2  Early withdrawal penalty", rightX + boxW + 2, boxStartY + 2);
  doc.fontSize(9).text('$', rightX + boxW + 2, boxStartY + 14);
  
  // Row 2: Boxes 3, 4
  const row2Y = boxStartY + amtBoxH;
  doc.rect(rightX, row2Y, boxW, amtBoxH).stroke();
  doc.fontSize(6).text("3  Interest on U.S. Savings", rightX + 2, row2Y + 2);
  doc.text("Bonds and Treas. obligations", rightX + 2, row2Y + 9);
  doc.fontSize(9).text('$', rightX + 2, row2Y + 18);
  
  doc.rect(rightX + boxW, row2Y, boxW, amtBoxH).stroke();
  doc.fontSize(6).text("4  Federal income tax", rightX + boxW + 2, row2Y + 2);
  doc.text("withheld", rightX + boxW + 2, row2Y + 9);
  // Federal tax withheld - not currently tracked in schema
  doc.fontSize(9).text(`$`, rightX + boxW + 2, row2Y + 18);
  
  // Row 3: Boxes 5, 6
  const row3Y = row2Y + amtBoxH;
  doc.rect(rightX, row3Y, boxW, amtBoxH).stroke();
  doc.fontSize(6).text("5  Investment expenses", rightX + 2, row3Y + 2);
  doc.fontSize(9).text('$', rightX + 2, row3Y + 14);
  
  doc.rect(rightX + boxW, row3Y, boxW, amtBoxH).stroke();
  doc.fontSize(6).text("6  Foreign tax paid", rightX + boxW + 2, row3Y + 2);
  doc.fontSize(9).text('$', rightX + boxW + 2, row3Y + 14);
  
  // Row 4: Boxes 7, 8
  const row4Y = row3Y + amtBoxH;
  doc.rect(rightX, row4Y, boxW, amtBoxH).stroke();
  doc.fontSize(6).text("7  Foreign country or", rightX + 2, row4Y + 2);
  doc.text("U.S. possession", rightX + 2, row4Y + 9);
  
  doc.rect(rightX + boxW, row4Y, boxW, amtBoxH).stroke();
  doc.fontSize(6).text("8  Tax-exempt interest", rightX + boxW + 2, row4Y + 2);
  doc.fontSize(9).text('$', rightX + boxW + 2, row4Y + 14);
  
  // Row 5: Boxes 9, 10
  const row5Y = row4Y + amtBoxH;
  doc.rect(rightX, row5Y, boxW, amtBoxH).stroke();
  doc.fontSize(6).text("9  Specified private activity", rightX + 2, row5Y + 2);
  doc.text("bond interest", rightX + 2, row5Y + 9);
  doc.fontSize(9).text('$', rightX + 2, row5Y + 18);
  
  doc.rect(rightX + boxW, row5Y, boxW, amtBoxH).stroke();
  doc.fontSize(6).text("10 Market discount", rightX + boxW + 2, row5Y + 2);
  doc.fontSize(9).text('$', rightX + boxW + 2, row5Y + 14);
  
  // Row 6: Boxes 11, 12
  const row6Y = row5Y + amtBoxH;
  doc.rect(rightX, row6Y, boxW, amtBoxH).stroke();
  doc.fontSize(6).text("11 Bond premium", rightX + 2, row6Y + 2);
  doc.fontSize(9).text('$', rightX + 2, row6Y + 14);
  
  doc.rect(rightX + boxW, row6Y, boxW, amtBoxH).stroke();
  doc.fontSize(6).text("12 Bond premium on", rightX + boxW + 2, row6Y + 2);
  doc.text("Treasury obligations", rightX + boxW + 2, row6Y + 9);
  doc.fontSize(9).text('$', rightX + boxW + 2, row6Y + 18);
  
  // Row 7: Boxes 13, 14
  const row7Y = row6Y + amtBoxH;
  doc.rect(rightX, row7Y, boxW, amtBoxH).stroke();
  doc.fontSize(6).text("13 Bond premium on", rightX + 2, row7Y + 2);
  doc.text("tax-exempt bond", rightX + 2, row7Y + 9);
  doc.fontSize(9).text('$', rightX + 2, row7Y + 18);
  
  doc.rect(rightX + boxW, row7Y, boxW, amtBoxH).stroke();
  doc.fontSize(6).text("14 Tax-exempt and tax credit", rightX + boxW + 2, row7Y + 2);
  doc.text("bond CUSIP no.", rightX + boxW + 2, row7Y + 9);
  
  // State boxes
  const stateRowY = row7Y + amtBoxH;
  doc.rect(rightX, stateRowY, boxW / 2, smallBoxHeight).stroke();
  doc.fontSize(6).text("15 State", rightX + 2, stateRowY + 2);
  
  doc.rect(rightX + boxW / 2, stateRowY, boxW / 2, smallBoxHeight).stroke();
  doc.fontSize(6).text("16 State identification no.", rightX + boxW / 2 + 2, stateRowY + 2);
  doc.fontSize(8).text('', rightX + boxW / 2 + 2, stateRowY + 14);
  
  doc.rect(rightX + boxW, stateRowY, boxW, smallBoxHeight).stroke();
  doc.fontSize(6).text("17 State tax withheld", rightX + boxW + 2, stateRowY + 2);
  // State tax withheld - not currently tracked in schema
  doc.fontSize(9).text(`$`, rightX + boxW + 2, stateRowY + 14);
  
  // Instructions
  const instructY = stateRowY + smallBoxHeight + 15;
  doc.fontSize(8).fillColor('#000000');
  doc.text('This is important tax information and is being furnished to the IRS. If you are required to file a return,', margin, instructY, { width: formWidth });
  doc.text('a negligence penalty or other sanction may be imposed on you if this income is taxable and the IRS', margin, instructY + 10, { width: formWidth });
  doc.text('determines that it has not been reported.', margin, instructY + 20, { width: formWidth });
  
  // Disclaimer
  const disclaimerY = 700;
  doc.rect(margin, disclaimerY, formWidth, 55).fillColor('#fef3c7').fill();
  doc.rect(margin, disclaimerY, formWidth, 55).stroke();
  doc.fontSize(8).fillColor('#92400e');
  doc.text('IMPORTANT: This is Copy B for the recipient. This is NOT an official IRS form for filing.', margin + 5, disclaimerY + 8, { width: formWidth - 10 });
  doc.fontSize(7).fillColor('#78350f');
  doc.text('This form is provided for your records. For official IRS filing, use the IRIS portal or approved transmitter.', margin + 5, disclaimerY + 20, { width: formWidth - 10 });
  doc.text('Consult a qualified tax professional for advice. See irs.gov/forms-pubs/about-form-1099-int', margin + 5, disclaimerY + 32, { width: formWidth - 10 });
  
  // Filing status
  const statusY = disclaimerY + 60;
  doc.fontSize(9).fillColor('#666666');
  doc.text('Filing Status: ', margin, statusY);
  if (form.isFiled) {
    doc.fillColor('#16a34a').text('FILED', margin + 60, statusY);
    if (form.filedDate) {
      doc.fillColor('#666666').text(` on ${new Date(form.filedDate).toLocaleDateString()}`, margin + 90, statusY);
    }
  } else {
    doc.fillColor('#dc2626').text('NOT FILED', margin + 60, statusY);
  }
  
  // Footer
  doc.fontSize(7).fillColor('#9ca3af');
  doc.text(`Generated by ComplyBook on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`, margin, 780, { align: 'center', width: formWidth });
}

export async function generateTaxForm1099Pdf(params: TaxForm1099PdfParams): Promise<Buffer> {
  const { form, organization } = params;

  return new Promise((resolve, reject) => {
    try {
      const formTypeLabel = form.formType === '1099_nec' ? '1099-NEC' : 
                           form.formType === '1099_misc' ? '1099-MISC' : '1099-INT';
      
      const doc = new PDFDocument({ 
        size: 'LETTER', // IRS forms use letter size
        margin: 30,
        info: {
          Title: `${formTypeLabel} - ${form.recipientName} - ${form.taxYear}`,
          Author: organization.name,
          Subject: `Tax Year ${form.taxYear} ${formTypeLabel}`,
          Keywords: 'IRS, 1099, Tax Form'
        }
      });

      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Generate appropriate form based on type
      switch (form.formType) {
        case '1099_nec':
          generate1099NEC(doc, form, organization);
          break;
        case '1099_misc':
          generate1099MISC(doc, form, organization);
          break;
        case '1099_int':
          generate1099INT(doc, form, organization);
          break;
        default:
          // Fallback to NEC format
          generate1099NEC(doc, form, organization);
      }

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}
