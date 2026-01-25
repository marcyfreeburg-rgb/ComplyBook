import PDFDocument from 'pdfkit';

interface InvoicePdfParams {
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  amount: number;
  customerName: string;
  customerEmail?: string;
  organizationName: string;
  organizationEmail?: string;
  organizationPhone?: string;
  organizationAddress?: string;
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
  notes?: string;
  paymentUrl?: string;
  branding?: {
    primaryColor?: string;
    accentColor?: string;
    fontFamily?: string;
    logoUrl?: string;
    footer?: string;
  };
}

export async function generateInvoicePdf(params: InvoicePdfParams): Promise<Buffer> {
  const {
    invoiceNumber,
    invoiceDate,
    dueDate,
    amount,
    customerName,
    customerEmail,
    organizationName,
    organizationEmail,
    organizationPhone,
    organizationAddress,
    items,
    notes,
    paymentUrl,
    branding
  } = params;

  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ 
        size: 'A4', 
        margin: 50,
        info: {
          Title: `Invoice ${invoiceNumber}`,
          Author: organizationName
        }
      });

      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const primaryColor = branding?.primaryColor || '#0070f3';
      
      // Header section
      doc.fontSize(10).fillColor('#666666');
      doc.text(organizationName, 50, 50, { width: 250 });
      if (organizationEmail) doc.text(organizationEmail);
      if (organizationPhone) doc.text(organizationPhone);
      if (organizationAddress) {
        organizationAddress.split('\n').forEach(line => doc.text(line));
      }

      // Invoice title - right aligned
      doc.fontSize(28).fillColor(primaryColor);
      doc.text('INVOICE', 400, 50, { width: 145, align: 'right' });
      doc.fontSize(12).fillColor('#666666');
      doc.text(`#${invoiceNumber}`, 400, 85, { width: 145, align: 'right' });

      // Bill To section
      doc.moveDown(2);
      const billToY = 140;
      doc.fontSize(10).fillColor('#666666');
      doc.text('BILL TO', 50, billToY);
      doc.fontSize(12).fillColor('#1a1a1a');
      doc.text(customerName, 50, billToY + 15);
      if (customerEmail) {
        doc.fontSize(10).fillColor('#666666');
        doc.text(customerEmail);
      }

      // Invoice details box
      const detailsY = 140;
      doc.fontSize(10).fillColor('#666666');
      doc.text('Invoice Date', 350, detailsY);
      doc.fontSize(11).fillColor('#1a1a1a');
      doc.text(invoiceDate, 350, detailsY + 12);
      
      doc.fontSize(10).fillColor('#666666');
      doc.text('Due Date', 350, detailsY + 35);
      doc.fontSize(11).fillColor('#1a1a1a');
      doc.text(dueDate, 350, detailsY + 47);
      
      doc.fontSize(10).fillColor('#666666');
      doc.text('Amount Due', 350, detailsY + 70);
      doc.fontSize(16).fillColor(primaryColor);
      doc.text(`$${amount.toFixed(2)}`, 350, detailsY + 82);

      // Items table
      const tableTop = 260;
      const tableLeft = 50;
      
      // Table header
      doc.rect(tableLeft, tableTop, 495, 25).fill('#f3f4f6');
      doc.fontSize(9).fillColor('#666666');
      doc.text('DESCRIPTION', tableLeft + 10, tableTop + 8, { width: 240 });
      doc.text('QTY', tableLeft + 260, tableTop + 8, { width: 50, align: 'center' });
      doc.text('UNIT PRICE', tableLeft + 320, tableTop + 8, { width: 80, align: 'right' });
      doc.text('AMOUNT', tableLeft + 410, tableTop + 8, { width: 75, align: 'right' });

      // Table rows
      let rowY = tableTop + 30;
      items.forEach((item) => {
        doc.fontSize(10).fillColor('#1a1a1a');
        doc.text(item.description, tableLeft + 10, rowY, { width: 240 });
        doc.text(item.quantity.toString(), tableLeft + 260, rowY, { width: 50, align: 'center' });
        doc.text(`$${item.unitPrice.toFixed(2)}`, tableLeft + 320, rowY, { width: 80, align: 'right' });
        doc.text(`$${item.total.toFixed(2)}`, tableLeft + 410, rowY, { width: 75, align: 'right' });
        
        // Row separator
        rowY += 25;
        doc.moveTo(tableLeft, rowY - 5).lineTo(tableLeft + 495, rowY - 5).stroke('#e5e7eb');
      });

      // Totals
      const subtotal = items.reduce((sum, item) => sum + item.total, 0);
      const tax = amount - subtotal;
      
      const totalsX = 380;
      doc.fontSize(10).fillColor('#666666');
      doc.text('Subtotal', totalsX, rowY + 10);
      doc.fillColor('#1a1a1a');
      doc.text(`$${subtotal.toFixed(2)}`, totalsX + 70, rowY + 10, { width: 75, align: 'right' });
      
      if (tax > 0.01) {
        doc.fillColor('#666666');
        doc.text('Tax', totalsX, rowY + 28);
        doc.fillColor('#1a1a1a');
        doc.text(`$${tax.toFixed(2)}`, totalsX + 70, rowY + 28, { width: 75, align: 'right' });
      }
      
      // Total line
      doc.moveTo(totalsX, rowY + 48).lineTo(totalsX + 145, rowY + 48).stroke('#1a1a1a');
      doc.fontSize(12).fillColor(primaryColor);
      doc.text('Total Due', totalsX, rowY + 55);
      doc.text(`$${amount.toFixed(2)}`, totalsX + 70, rowY + 55, { width: 75, align: 'right' });

      // Payment URL section
      if (paymentUrl) {
        const paymentY = rowY + 90;
        doc.rect(50, paymentY, 495, 50).fill('#f0fdf4');
        doc.fontSize(11).fillColor('#166534');
        doc.text('Pay this invoice online:', 60, paymentY + 10);
        doc.fontSize(9).fillColor('#0070f3');
        doc.text(paymentUrl, 60, paymentY + 28, { 
          link: paymentUrl,
          underline: true,
          width: 475
        });
      }

      // Notes section
      if (notes) {
        const notesY = paymentUrl ? rowY + 155 : rowY + 90;
        doc.rect(50, notesY, 495, 60).fill('#fffbeb').stroke('#fbbf24');
        doc.fontSize(9).fillColor('#92400e');
        doc.text('NOTES', 60, notesY + 10);
        doc.fontSize(10).fillColor('#78350f');
        doc.text(notes, 60, notesY + 25, { width: 475 });
      }

      // Footer
      if (branding?.footer) {
        doc.fontSize(9).fillColor('#666666');
        doc.text(branding.footer, 50, 750, { width: 495, align: 'center' });
      }

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}
