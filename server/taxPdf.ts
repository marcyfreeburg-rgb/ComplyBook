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
      
      if (organization.ein) {
        doc.fontSize(10).fillColor('#666666');
        doc.text('EIN:', 50, detailsStartY + 20);
        doc.fontSize(11).fillColor('#1a1a1a');
        doc.text(organization.ein, 150, detailsStartY + 20);
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

export async function generateTaxForm1099Pdf(params: TaxForm1099PdfParams): Promise<Buffer> {
  const { form, organization, branding } = params;
  
  let logoBuffer: Buffer | null = null;
  if (branding?.logoUrl) {
    logoBuffer = await fetchImageBuffer(branding.logoUrl);
  }

  return new Promise((resolve, reject) => {
    try {
      const formTypeLabel = form.formType === '1099_nec' ? '1099-NEC' : 
                           form.formType === '1099_misc' ? '1099-MISC' : '1099-INT';
      
      const doc = new PDFDocument({ 
        size: 'A4', 
        margin: 50,
        info: {
          Title: `${formTypeLabel} - ${form.recipientName} - ${form.taxYear}`,
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
      doc.text(formTypeLabel, 350, 50, { width: 195, align: 'right' });
      doc.fontSize(12).fillColor('#666666');
      doc.text(`Tax Year ${form.taxYear}`, 350, 85, { width: 195, align: 'right' });

      const sectionY = headerBottomY + 30;
      doc.fontSize(18).fillColor(primaryColor);
      doc.text('Nonemployee Compensation', 50, sectionY);
      
      doc.moveTo(50, sectionY + 25).lineTo(545, sectionY + 25).strokeColor('#e5e7eb').stroke();

      const payerY = sectionY + 45;
      doc.rect(50, payerY, 240, 100).strokeColor('#d1d5db').stroke();
      doc.fontSize(9).fillColor('#666666');
      doc.text("PAYER'S name, street address, city, state, ZIP code", 55, payerY + 5);
      doc.fontSize(10).fillColor('#1a1a1a');
      doc.text(organization.name, 55, payerY + 20);
      if (organization.address) {
        doc.text(organization.address, 55, payerY + 35, { width: 225 });
      }

      if (organization.ein) {
        doc.rect(50, payerY + 105, 240, 30).strokeColor('#d1d5db').stroke();
        doc.fontSize(9).fillColor('#666666');
        doc.text("PAYER'S TIN", 55, payerY + 110);
        doc.fontSize(10).fillColor('#1a1a1a');
        doc.text(organization.ein, 55, payerY + 120);
      }

      doc.rect(300, payerY, 245, 100).strokeColor('#d1d5db').stroke();
      doc.fontSize(9).fillColor('#666666');
      doc.text("RECIPIENT'S name", 305, payerY + 5);
      doc.fontSize(11).fillColor('#1a1a1a');
      doc.text(form.recipientName, 305, payerY + 20);
      
      if (form.recipientAddress) {
        doc.fontSize(9).fillColor('#666666');
        doc.text("Street address", 305, payerY + 40);
        doc.fontSize(10).fillColor('#1a1a1a');
        doc.text(form.recipientAddress, 305, payerY + 55, { width: 230 });
      }

      if (form.recipientTin) {
        doc.rect(300, payerY + 105, 245, 30).strokeColor('#d1d5db').stroke();
        doc.fontSize(9).fillColor('#666666');
        doc.text("RECIPIENT'S TIN", 305, payerY + 110);
        doc.fontSize(10).fillColor('#1a1a1a');
        const maskedTin = form.recipientTin.length > 4 
          ? '***-**-' + form.recipientTin.slice(-4) 
          : form.recipientTin;
        doc.text(maskedTin, 305, payerY + 120);
      }

      const amountY = payerY + 150;
      doc.rect(50, amountY, 200, 60).fillColor('#f0fdf4').fill();
      doc.rect(50, amountY, 200, 60).strokeColor('#16a34a').stroke();
      doc.fontSize(9).fillColor('#166534');
      doc.text('1 Nonemployee compensation', 55, amountY + 5);
      doc.fontSize(20).fillColor('#16a34a');
      const amount = parseFloat(form.totalAmount);
      doc.text(`$${amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, 55, amountY + 25);

      const statusY = amountY + 80;
      doc.fontSize(10).fillColor('#666666');
      doc.text('Filing Status:', 50, statusY);
      if (form.isFiled) {
        doc.fontSize(11).fillColor('#16a34a');
        doc.text('FILED', 120, statusY);
        if (form.filedDate) {
          doc.fontSize(10).fillColor('#666666');
          doc.text(` on ${new Date(form.filedDate).toLocaleDateString()}`, 155, statusY);
        }
      } else {
        doc.fontSize(11).fillColor('#dc2626');
        doc.text('NOT FILED', 120, statusY);
      }

      if (form.notes) {
        const notesY = statusY + 30;
        doc.fontSize(10).fillColor('#666666');
        doc.text('Notes:', 50, notesY);
        doc.fontSize(10).fillColor('#374151');
        doc.text(form.notes, 50, notesY + 15, { width: 495 });
      }

      const disclaimerY = 700;
      doc.rect(50, disclaimerY, 495, 50).fillColor('#fef3c7').fill();
      doc.fontSize(9).fillColor('#92400e');
      doc.text('IMPORTANT', 60, disclaimerY + 8, { bold: true } as any);
      doc.fontSize(8).fillColor('#78350f');
      doc.text('This is a copy for your records. For official IRS filing, use the official 1099 form from the IRS or approved tax software. Consult a tax professional for guidance.', 60, disclaimerY + 22, { width: 475 });

      doc.fontSize(8).fillColor('#9ca3af');
      doc.text(`Generated by ComplyBook on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`, 50, 780, { align: 'center', width: 495 });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}
