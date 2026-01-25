import puppeteer from 'puppeteer';

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

  const primaryColor = branding?.primaryColor || '#0070f3';
  const accentColor = branding?.accentColor || '#0052cc';
  const fontFamily = branding?.fontFamily || '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
  
  const logoHtml = branding?.logoUrl 
    ? `<img src="${branding.logoUrl}" alt="${organizationName}" style="max-width: 120px; max-height: 40px; object-fit: contain;" />`
    : '';
  
  const footerHtml = branding?.footer
    ? `<div style="border-top: 1px solid #e5e7eb; padding-top: 15px; margin-top: 30px; text-align: center; color: #666; font-size: 10px; white-space: pre-line;">${branding.footer}</div>`
    : '';

  const paymentButtonHtml = paymentUrl
    ? `<div style="text-align: center; margin: 30px 0;">
         <a href="${paymentUrl}" style="display: inline-block; background-color: ${primaryColor}; color: #ffffff; text-decoration: none; padding: 14px 40px; border-radius: 6px; font-weight: 600; font-size: 16px;">Pay Now - $${amount.toFixed(2)}</a>
         <p style="color: #666; font-size: 12px; margin-top: 10px;">Click the button above or visit: ${paymentUrl}</p>
       </div>`
    : '';

  const itemsHtml = items.map(item => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; color: #1a1a1a;">${item.description}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center; color: #1a1a1a;">${item.quantity}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right; color: #1a1a1a;">$${item.unitPrice.toFixed(2)}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right; color: #1a1a1a; font-weight: 500;">$${item.total.toFixed(2)}</td>
    </tr>
  `).join('');

  const subtotal = items.reduce((sum, item) => sum + item.total, 0);
  const tax = amount - subtotal;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Invoice ${invoiceNumber}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: ${fontFamily}; line-height: 1.5; color: #333; padding: 40px; background: white; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px; }
          .logo { max-width: 120px; max-height: 40px; }
          .invoice-title { text-align: right; }
          .invoice-title h1 { font-size: 32px; color: ${primaryColor}; margin-bottom: 5px; }
          .invoice-title p { color: #666; font-size: 14px; }
          .parties { display: flex; gap: 60px; margin-bottom: 30px; }
          .party h3 { color: #666; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; }
          .party p { color: #1a1a1a; font-size: 14px; margin: 2px 0; }
          .party .name { font-weight: 600; font-size: 16px; }
          .meta-box { background: #f9fafb; border-radius: 8px; padding: 20px; margin-bottom: 30px; display: flex; gap: 40px; }
          .meta-item label { display: block; color: #666; font-size: 11px; text-transform: uppercase; margin-bottom: 4px; }
          .meta-item span { font-size: 14px; font-weight: 500; color: #1a1a1a; }
          .meta-item.amount span { color: ${primaryColor}; font-size: 20px; font-weight: 700; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          th { background: #f9fafb; padding: 12px; text-align: left; color: #666; font-size: 11px; text-transform: uppercase; font-weight: 600; border-bottom: 2px solid #e5e7eb; }
          th:nth-child(2), th:nth-child(3), th:nth-child(4) { text-align: center; }
          th:nth-child(3), th:nth-child(4) { text-align: right; }
          .totals { margin-left: auto; width: 250px; }
          .totals-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
          .totals-row.total { border-bottom: none; border-top: 2px solid #1a1a1a; font-weight: 700; font-size: 18px; color: ${primaryColor}; }
          .notes { background: #fffbeb; border: 1px solid #fbbf24; border-radius: 6px; padding: 15px; margin-top: 20px; }
          .notes h4 { color: #92400e; font-size: 12px; text-transform: uppercase; margin-bottom: 5px; }
          .notes p { color: #78350f; font-size: 13px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">${logoHtml}</div>
          <div class="invoice-title">
            <h1>INVOICE</h1>
            <p>#${invoiceNumber}</p>
          </div>
        </div>

        <div class="parties">
          <div class="party">
            <h3>From</h3>
            <p class="name">${organizationName}</p>
            ${organizationEmail ? `<p>${organizationEmail}</p>` : ''}
            ${organizationPhone ? `<p>${organizationPhone}</p>` : ''}
            ${organizationAddress ? `<p style="white-space: pre-line;">${organizationAddress}</p>` : ''}
          </div>
          <div class="party">
            <h3>Bill To</h3>
            <p class="name">${customerName}</p>
            ${customerEmail ? `<p>${customerEmail}</p>` : ''}
          </div>
        </div>

        <div class="meta-box">
          <div class="meta-item">
            <label>Invoice Date</label>
            <span>${invoiceDate}</span>
          </div>
          <div class="meta-item">
            <label>Due Date</label>
            <span>${dueDate}</span>
          </div>
          <div class="meta-item amount">
            <label>Amount Due</label>
            <span>$${amount.toFixed(2)}</span>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Description</th>
              <th>Qty</th>
              <th>Unit Price</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>

        <div class="totals">
          <div class="totals-row">
            <span>Subtotal</span>
            <span>$${subtotal.toFixed(2)}</span>
          </div>
          ${tax > 0 ? `
          <div class="totals-row">
            <span>Tax</span>
            <span>$${tax.toFixed(2)}</span>
          </div>
          ` : ''}
          <div class="totals-row total">
            <span>Total Due</span>
            <span>$${amount.toFixed(2)}</span>
          </div>
        </div>

        ${paymentButtonHtml}

        ${notes ? `
        <div class="notes">
          <h4>Notes</h4>
          <p>${notes}</p>
        </div>
        ` : ''}

        ${footerHtml}
      </body>
    </html>
  `;

  // Use bundled Chromium from puppeteer, or environment variable override
  const launchOptions: any = {
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
  };
  
  // Allow override via environment variable if needed
  if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    launchOptions.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
  }
  
  const browser = await puppeteer.launch(launchOptions);

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '20px', right: '20px', bottom: '20px', left: '20px' }
    });

    return Buffer.from(pdfBuffer);
  } finally {
    await browser.close();
  }
}
