import sgMail from '@sendgrid/mail';

let connectionSettings: any;

// Check if running on Replit with connector support
// Requires both Replit environment vars AND the connector hostname to actually use connectors
const isReplitEnvironment = !!(process.env.REPLIT_DOMAINS && process.env.REPL_ID && process.env.REPLIT_CONNECTORS_HOSTNAME);

async function getCredentials() {
  // First, check if direct environment variables are set (works on any platform including Render)
  const apiKey = process.env.SENDGRID_API_KEY;
  const fromEmail = process.env.SENDGRID_FROM_EMAIL;
  
  if (apiKey && fromEmail) {
    return { apiKey, email: fromEmail };
  }
  
  // If direct env vars not set, try Replit connector (only works on Replit)
  if (!isReplitEnvironment) {
    throw new Error('SendGrid credentials not configured. Set SENDGRID_API_KEY and SENDGRID_FROM_EMAIL environment variables.');
  }

  // For Replit environment, use the connector
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=sendgrid',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  if (!connectionSettings || (!connectionSettings.settings.api_key || !connectionSettings.settings.from_email)) {
    throw new Error('SendGrid not connected');
  }
  return {apiKey: connectionSettings.settings.api_key, email: connectionSettings.settings.from_email};
}

export async function getUncachableSendGridClient() {
  const {apiKey, email} = await getCredentials();
  sgMail.setApiKey(apiKey);
  return {
    client: sgMail,
    fromEmail: email
  };
}

interface InvitationEmailParams {
  to: string;
  organizationName: string;
  inviterName: string;
  invitationLink: string;
  permissions: string;
  expiresAt: Date;
  branding?: {
    primaryColor?: string;
    accentColor?: string;
    fontFamily?: string;
    logoUrl?: string;
    footer?: string;
  };
}

export async function sendInvitationEmail({
  to,
  organizationName,
  inviterName,
  invitationLink,
  permissions,
  expiresAt,
  branding
}: InvitationEmailParams): Promise<void> {
  const { client, fromEmail } = await getUncachableSendGridClient();

  const permissionDescription = getPermissionDescription(permissions);
  
  const primaryColor = branding?.primaryColor || '#0070f3';
  const accentColor = branding?.accentColor || '#0052cc';
  const fontFamily = branding?.fontFamily || '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
  const logoHtml = branding?.logoUrl 
    ? `<div style="text-align: center; margin-bottom: 20px;"><img src="${branding.logoUrl}" alt="Organization Logo" style="max-width: 150px; height: auto;" /></div>`
    : '';
  const footerHtml = branding?.footer
    ? `<div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 20px; text-align: center; color: #666; font-size: 12px; white-space: pre-line;">${branding.footer}</div>`
    : '';
  
  const msg = {
    to,
    from: fromEmail,
    subject: `You've been invited to join ${organizationName}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Organization Invitation</title>
        </head>
        <body style="font-family: ${fontFamily}; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          ${logoHtml}
          <div style="background: linear-gradient(135deg, ${primaryColor} 0%, ${accentColor} 100%); border-radius: 8px; padding: 30px; margin-bottom: 20px; color: white;">
            <h1 style="color: white; margin: 0 0 10px 0; font-size: 24px;">You've Been Invited!</h1>
            <p style="color: rgba(255,255,255,0.95); margin: 0; font-size: 16px;">${inviterName} has invited you to join their organization</p>
          </div>
          
          <div style="background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 25px; margin-bottom: 20px;">
            <h2 style="color: #1a1a1a; margin: 0 0 15px 0; font-size: 18px;">Organization Details</h2>
            
            <div style="margin-bottom: 15px;">
              <p style="color: #666; margin: 0 0 5px 0; font-size: 14px;">Organization</p>
              <p style="color: #1a1a1a; margin: 0; font-size: 16px; font-weight: 500;">${organizationName}</p>
            </div>
            
            <div style="margin-bottom: 15px;">
              <p style="color: #666; margin: 0 0 5px 0; font-size: 14px;">Your Permissions</p>
              <p style="color: #1a1a1a; margin: 0; font-size: 16px; font-weight: 500;">${permissions.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</p>
              <p style="color: #666; margin: 5px 0 0 0; font-size: 14px;">${permissionDescription}</p>
            </div>
            
            <div style="margin-bottom: 15px;">
              <p style="color: #666; margin: 0 0 5px 0; font-size: 14px;">Expires</p>
              <p style="color: #1a1a1a; margin: 0; font-size: 16px; font-weight: 500;">${expiresAt.toLocaleDateString()} at ${expiresAt.toLocaleTimeString()}</p>
            </div>
          </div>
          
          <div style="text-align: center; margin-bottom: 20px;">
            <a href="${invitationLink}" style="display: inline-block; background-color: ${primaryColor}; color: #ffffff; text-decoration: none; padding: 12px 30px; border-radius: 6px; font-weight: 500; font-size: 16px;">Accept Invitation</a>
          </div>
          
          <div style="background-color: #fef3c7; border: 1px solid #fbbf24; border-radius: 6px; padding: 15px; margin-bottom: 20px;">
            <p style="margin: 0; font-size: 14px; color: #92400e;">
              <strong>Note:</strong> This invitation will expire on ${expiresAt.toLocaleDateString()}. Please accept it before then.
            </p>
          </div>
          
          <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px;">
            <p style="color: #666; font-size: 14px; margin: 0;">
              If you weren't expecting this invitation, you can safely ignore this email.
            </p>
            <p style="color: #666; font-size: 14px; margin: 10px 0 0 0;">
              Or copy and paste this link into your browser: <a href="${invitationLink}" style="color: ${primaryColor}; word-break: break-all;">${invitationLink}</a>
            </p>
          </div>
          ${footerHtml}
        </body>
      </html>
    `,
    text: `
You've Been Invited!

${inviterName} has invited you to join their organization.

Organization: ${organizationName}
Your Permissions: ${permissions.replace(/_/g, ' ')}
${permissionDescription}

This invitation expires on ${expiresAt.toLocaleDateString()} at ${expiresAt.toLocaleTimeString()}.

Accept this invitation by clicking the following link:
${invitationLink}

If you weren't expecting this invitation, you can safely ignore this email.
    `.trim()
  };

  await client.send(msg);
}

function getPermissionDescription(permissions: string): string {
  switch (permissions) {
    case 'view_only':
      return 'You can view all data but cannot make any changes.';
    case 'make_reports':
      return 'You can view data and generate financial reports.';
    case 'edit_transactions':
      return 'You can view and edit transactions.';
    case 'view_make_reports':
      return 'You can view all data and generate reports.';
    case 'full_access':
      return 'You can view, edit transactions, and generate reports.';
    default:
      return 'Standard access permissions.';
  }
}

// NIST 800-53 IR-4, IR-5: Security Event Alerting
interface SecurityAlertEmailParams {
  to: string;
  eventType: string;
  severity: string;
  timestamp: Date;
  userEmail?: string | null;
  ipAddress?: string | null;
  details?: Record<string, any>;
}

export async function sendSecurityAlertEmail({
  to,
  eventType,
  severity,
  timestamp,
  userEmail,
  ipAddress,
  details
}: SecurityAlertEmailParams): Promise<void> {
  const { client, fromEmail } = await getUncachableSendGridClient();

  const severityColor = severity === 'critical' ? '#dc2626' : 
                        severity === 'high' ? '#ea580c' : 
                        severity === 'medium' ? '#f59e0b' : '#3b82f6';
  
  const eventTypeDisplay = eventType.replace(/_/g, ' ').toUpperCase();
  
  const msg = {
    to,
    from: fromEmail,
    subject: `[SECURITY ALERT] ${eventTypeDisplay} - ${severity.toUpperCase()}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Security Alert</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, ${severityColor} 0%, #991b1b 100%); border-radius: 8px; padding: 30px; margin-bottom: 20px; color: white;">
            <h1 style="color: white; margin: 0 0 10px 0; font-size: 24px;">SECURITY ALERT</h1>
            <p style="color: rgba(255,255,255,0.95); margin: 0; font-size: 16px;">A ${severity} severity security event has been detected</p>
          </div>
          
          <div style="background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 25px; margin-bottom: 20px;">
            <h2 style="color: #1a1a1a; margin: 0 0 15px 0; font-size: 18px;">Event Details</h2>
            
            <div style="margin-bottom: 15px;">
              <p style="color: #666; margin: 0 0 5px 0; font-size: 14px;">Event Type</p>
              <p style="color: #1a1a1a; margin: 0; font-size: 16px; font-weight: 500;">${eventTypeDisplay}</p>
            </div>
            
            <div style="margin-bottom: 15px;">
              <p style="color: #666; margin: 0 0 5px 0; font-size: 14px;">Severity</p>
              <p style="color: ${severityColor}; margin: 0; font-size: 16px; font-weight: 600;">${severity.toUpperCase()}</p>
            </div>
            
            <div style="margin-bottom: 15px;">
              <p style="color: #666; margin: 0 0 5px 0; font-size: 14px;">Timestamp</p>
              <p style="color: #1a1a1a; margin: 0; font-size: 16px; font-weight: 500;">${timestamp.toLocaleString()}</p>
            </div>
            
            ${userEmail ? `
            <div style="margin-bottom: 15px;">
              <p style="color: #666; margin: 0 0 5px 0; font-size: 14px;">User</p>
              <p style="color: #1a1a1a; margin: 0; font-size: 16px; font-weight: 500;">${userEmail}</p>
            </div>
            ` : ''}
            
            ${ipAddress ? `
            <div style="margin-bottom: 15px;">
              <p style="color: #666; margin: 0 0 5px 0; font-size: 14px;">IP Address</p>
              <p style="color: #1a1a1a; margin: 0; font-size: 16px; font-weight: 500;">${ipAddress}</p>
            </div>
            ` : ''}
            
            ${details ? `
            <div style="margin-bottom: 15px;">
              <p style="color: #666; margin: 0 0 5px 0; font-size: 14px;">Additional Details</p>
              <pre style="background-color: #f3f4f6; padding: 10px; border-radius: 4px; font-size: 12px; overflow-x: auto;">${JSON.stringify(details, null, 2)}</pre>
            </div>
            ` : ''}
          </div>
          
          <div style="background-color: #fef3c7; border: 1px solid #fbbf24; border-radius: 6px; padding: 15px; margin-bottom: 20px;">
            <p style="margin: 0; font-size: 14px; color: #92400e;">
              <strong>Action Required:</strong> Review this security event immediately. Check your security monitoring dashboard for more details and take appropriate action.
            </p>
          </div>
          
          <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px;">
            <p style="color: #666; font-size: 14px; margin: 0;">
              This is an automated security alert from your ComplyBook application. If you believe this alert was sent in error, please contact your system administrator.
            </p>
          </div>
        </body>
      </html>
    `,
    text: `
SECURITY ALERT - ${severity.toUpperCase()}

A ${severity} severity security event has been detected.

Event Type: ${eventTypeDisplay}
Severity: ${severity.toUpperCase()}
Timestamp: ${timestamp.toLocaleString()}
${userEmail ? `User: ${userEmail}` : ''}
${ipAddress ? `IP Address: ${ipAddress}` : ''}
${details ? `\nAdditional Details:\n${JSON.stringify(details, null, 2)}` : ''}

Action Required:
Review this security event immediately. Check your security monitoring dashboard for more details and take appropriate action.

This is an automated security alert from your ComplyBook application.
    `.trim()
  };

  await client.send(msg);
}

// Invoice Email
interface InvoiceEmailParams {
  to: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  amount: number;
  customerName: string;
  organizationName: string;
  organizationEmail: string;
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
  pdfBuffer?: Buffer;
  branding?: {
    primaryColor?: string;
    accentColor?: string;
    fontFamily?: string;
    logoUrl?: string;
    footer?: string;
  };
}

export async function sendInvoiceEmail({
  to,
  invoiceNumber,
  invoiceDate,
  dueDate,
  amount,
  customerName,
  organizationName,
  organizationEmail,
  organizationPhone,
  organizationAddress,
  items,
  notes,
  paymentUrl,
  pdfBuffer,
  branding
}: InvoiceEmailParams): Promise<void> {
  const { client, fromEmail } = await getUncachableSendGridClient();

  const primaryColor = branding?.primaryColor || '#0070f3';
  const accentColor = branding?.accentColor || '#0052cc';
  const fontFamily = branding?.fontFamily || '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
  const logoHtml = branding?.logoUrl 
    ? `<div style="margin-bottom: 15px;"><img src="${branding.logoUrl}" alt="${organizationName}" style="max-width: 120px; max-height: 40px; object-fit: contain;" /></div>`
    : '';
  const footerHtml = branding?.footer
    ? `<div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 20px; text-align: center; color: #666; font-size: 12px; white-space: pre-line;">${branding.footer}</div>`
    : '';
  
  const paymentButtonHtml = paymentUrl
    ? `<div style="text-align: center; margin: 30px 0; padding: 20px; background-color: #f0fdf4; border-radius: 8px; border: 1px solid #bbf7d0;">
         <p style="color: #166534; margin: 0 0 15px 0; font-size: 16px; font-weight: 600;">Pay this invoice securely online</p>
         <a href="${paymentUrl}" style="display: inline-block; background-color: #16a34a; color: #ffffff; text-decoration: none; padding: 14px 40px; border-radius: 6px; font-weight: 600; font-size: 16px;">Pay Now - $${amount.toFixed(2)}</a>
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

  const itemsText = items.map(item => 
    `${item.description} - Qty: ${item.quantity} × $${item.unitPrice.toFixed(2)} = $${item.total.toFixed(2)}`
  ).join('\n');
  
  const msg = {
    to,
    from: fromEmail,
    subject: `Invoice ${invoiceNumber} from ${organizationName}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Invoice ${invoiceNumber}</title>
        </head>
        <body style="font-family: ${fontFamily}; line-height: 1.6; color: #333; max-width: 700px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
          ${logoHtml}
          
          <div style="background: linear-gradient(135deg, ${primaryColor} 0%, ${accentColor} 100%); border-radius: 8px; padding: 30px; margin-bottom: 20px; color: white;">
            <h1 style="color: white; margin: 0 0 10px 0; font-size: 28px;">Invoice</h1>
            <p style="color: rgba(255,255,255,0.95); margin: 0; font-size: 18px; font-weight: 500;">Invoice #${invoiceNumber}</p>
          </div>
          
          <div style="background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 30px; margin-bottom: 20px;">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px;">
              <div>
                <h2 style="color: #666; margin: 0 0 10px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">From</h2>
                <p style="color: #1a1a1a; margin: 0; font-size: 16px; font-weight: 600;">${organizationName}</p>
                ${organizationEmail ? `<p style="color: #666; margin: 5px 0 0 0; font-size: 14px;">${organizationEmail}</p>` : ''}
                ${organizationPhone ? `<p style="color: #666; margin: 5px 0 0 0; font-size: 14px;">${organizationPhone}</p>` : ''}
                ${organizationAddress ? `<p style="color: #666; margin: 5px 0 0 0; font-size: 14px; white-space: pre-line;">${organizationAddress}</p>` : ''}
              </div>
              
              <div>
                <h2 style="color: #666; margin: 0 0 10px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">Bill To</h2>
                <p style="color: #1a1a1a; margin: 0; font-size: 16px; font-weight: 600;">${customerName}</p>
                <p style="color: #666; margin: 5px 0 0 0; font-size: 14px;">${to}</p>
              </div>
            </div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px; margin-bottom: 30px; padding: 20px; background-color: #f9fafb; border-radius: 6px;">
              <div>
                <p style="color: #666; margin: 0 0 5px 0; font-size: 12px; text-transform: uppercase;">Invoice Date</p>
                <p style="color: #1a1a1a; margin: 0; font-size: 15px; font-weight: 500;">${invoiceDate}</p>
              </div>
              <div>
                <p style="color: #666; margin: 0 0 5px 0; font-size: 12px; text-transform: uppercase;">Due Date</p>
                <p style="color: #1a1a1a; margin: 0; font-size: 15px; font-weight: 500;">${dueDate}</p>
              </div>
              <div>
                <p style="color: #666; margin: 0 0 5px 0; font-size: 12px; text-transform: uppercase;">Amount Due</p>
                <p style="color: ${primaryColor}; margin: 0; font-size: 18px; font-weight: 700;">$${amount.toFixed(2)}</p>
              </div>
            </div>
            
            <h2 style="color: #1a1a1a; margin: 0 0 15px 0; font-size: 18px;">Items</h2>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
              <thead>
                <tr style="background-color: #f9fafb;">
                  <th style="padding: 12px; text-align: left; color: #666; font-size: 12px; text-transform: uppercase; font-weight: 600; border-bottom: 2px solid #e5e7eb;">Description</th>
                  <th style="padding: 12px; text-align: center; color: #666; font-size: 12px; text-transform: uppercase; font-weight: 600; border-bottom: 2px solid #e5e7eb;">Qty</th>
                  <th style="padding: 12px; text-align: right; color: #666; font-size: 12px; text-transform: uppercase; font-weight: 600; border-bottom: 2px solid #e5e7eb;">Unit Price</th>
                  <th style="padding: 12px; text-align: right; color: #666; font-size: 12px; text-transform: uppercase; font-weight: 600; border-bottom: 2px solid #e5e7eb;">Amount</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
              <tfoot>
                <tr>
                  <td colspan="3" style="padding: 15px 12px; text-align: right; color: #1a1a1a; font-weight: 600; font-size: 16px; border-top: 2px solid #e5e7eb;">Total</td>
                  <td style="padding: 15px 12px; text-align: right; color: ${primaryColor}; font-weight: 700; font-size: 20px; border-top: 2px solid #e5e7eb;">$${amount.toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>
            
            ${notes ? `
            <div style="background-color: #f0f9ff; border-left: 4px solid ${accentColor}; padding: 15px; border-radius: 4px; margin-top: 20px;">
              <h3 style="color: #1a1a1a; margin: 0 0 10px 0; font-size: 14px; font-weight: 600;">Notes</h3>
              <p style="color: #666; margin: 0; font-size: 14px; white-space: pre-line;">${notes}</p>
            </div>
            ` : ''}
          </div>
          
          ${paymentButtonHtml}
          
          <div style="text-align: center; margin-bottom: 20px;">
            <p style="color: #666; font-size: 14px; margin: 0 0 10px 0;">
              Questions about this invoice? Contact us at ${organizationEmail}
            </p>
          </div>
          
          ${footerHtml}
        </body>
      </html>
    `,
    text: `
Invoice #${invoiceNumber}
From: ${organizationName}

Bill To: ${customerName}
Email: ${to}

Invoice Date: ${invoiceDate}
Due Date: ${dueDate}
Amount Due: $${amount.toFixed(2)}

ITEMS:
${itemsText}

TOTAL: $${amount.toFixed(2)}
${paymentUrl ? `\nPAY ONLINE: ${paymentUrl}\n` : ''}
${notes ? `Notes:\n${notes}\n` : ''}

Questions? Contact us at ${organizationEmail}
    `.trim(),
    attachments: pdfBuffer ? [{
      content: pdfBuffer.toString('base64'),
      filename: `Invoice-${invoiceNumber}.pdf`,
      type: 'application/pdf',
      disposition: 'attachment'
    }] : undefined
  };

  await client.send(msg);
}

// Trial ending reminder email
interface TrialEndingEmailParams {
  to: string;
  firstName?: string;
  daysRemaining: number;
  trialEndDate: Date;
  tierName: string;
  manageSubscriptionUrl: string;
}

export async function sendTrialEndingEmail({
  to,
  firstName,
  daysRemaining,
  trialEndDate,
  tierName,
  manageSubscriptionUrl
}: TrialEndingEmailParams): Promise<void> {
  const { client, fromEmail } = await getUncachableSendGridClient();
  
  const formattedEndDate = trialEndDate.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  
  const greeting = firstName ? `Hi ${firstName}` : 'Hi there';
  const urgencyText = daysRemaining <= 1 
    ? 'Your trial ends tomorrow!' 
    : `Your trial ends in ${daysRemaining} days`;
  
  const msg = {
    to,
    from: fromEmail,
    subject: `${urgencyText} - ComplyBook ${tierName} Plan`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Trial Ending Reminder</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); border-radius: 8px; padding: 30px; margin-bottom: 20px; color: white;">
            <h1 style="color: white; margin: 0 0 10px 0; font-size: 24px;">${urgencyText}</h1>
            <p style="color: rgba(255,255,255,0.95); margin: 0; font-size: 16px;">Your ComplyBook ${tierName} trial is almost over</p>
          </div>
          
          <div style="background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 25px; margin-bottom: 20px;">
            <p style="color: #1a1a1a; margin: 0 0 15px 0; font-size: 16px;">${greeting},</p>
            
            <p style="color: #666; margin: 0 0 15px 0; font-size: 15px;">
              We hope you've been enjoying ComplyBook! Your free trial of the <strong>${tierName}</strong> plan 
              will end on <strong>${formattedEndDate}</strong>.
            </p>
            
            <p style="color: #666; margin: 0 0 20px 0; font-size: 15px;">
              After your trial ends, your payment method will be charged automatically and you'll continue 
              to have full access to all ${tierName} features.
            </p>
            
            <div style="background-color: #f0f9ff; border-left: 4px solid #6366f1; padding: 15px; border-radius: 4px; margin-bottom: 20px;">
              <p style="color: #1a1a1a; margin: 0; font-size: 14px;">
                <strong>What happens next?</strong><br>
                Your subscription will automatically continue after the trial. No action needed if you want to keep using ComplyBook!
              </p>
            </div>
            
            <p style="color: #666; margin: 0 0 20px 0; font-size: 15px;">
              If you'd like to change your plan or cancel before the trial ends, you can manage your subscription anytime:
            </p>
            
            <div style="text-align: center; margin: 25px 0;">
              <a href="${manageSubscriptionUrl}" 
                 style="display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); color: white; text-decoration: none; padding: 14px 28px; border-radius: 6px; font-weight: 600; font-size: 16px;">
                Manage Subscription
              </a>
            </div>
          </div>
          
          <div style="text-align: center; color: #666; font-size: 12px;">
            <p style="margin: 0 0 10px 0;">
              Questions? Just reply to this email - we're here to help!
            </p>
            <p style="margin: 0;">
              ComplyBook - Financial Management Made Simple
            </p>
          </div>
        </body>
      </html>
    `,
    text: `
${urgencyText}

${greeting},

We hope you've been enjoying ComplyBook! Your free trial of the ${tierName} plan will end on ${formattedEndDate}.

After your trial ends, your payment method will be charged automatically and you'll continue to have full access to all ${tierName} features.

What happens next?
Your subscription will automatically continue after the trial. No action needed if you want to keep using ComplyBook!

If you'd like to change your plan or cancel before the trial ends, you can manage your subscription anytime:
${manageSubscriptionUrl}

Questions? Just reply to this email - we're here to help!

ComplyBook - Financial Management Made Simple
    `.trim()
  };

  await client.send(msg);
  console.log(`Trial ending reminder sent to ${to}`);
}

// Invoice Payment Confirmation Email
interface InvoicePaymentConfirmationParams {
  to: string;
  clientName: string;
  invoiceNumber: string;
  amount: string;
  organizationName: string;
  paidAt: Date;
}

export async function sendInvoicePaymentConfirmationEmail({
  to,
  clientName,
  invoiceNumber,
  amount,
  organizationName,
  paidAt
}: InvoicePaymentConfirmationParams): Promise<void> {
  const { client, fromEmail } = await getUncachableSendGridClient();
  
  const formattedDate = paidAt.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  
  const msg = {
    to,
    from: fromEmail,
    subject: `Payment Received - Invoice ${invoiceNumber}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Payment Confirmation</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 8px; padding: 30px; margin-bottom: 20px; color: white; text-align: center;">
            <div style="font-size: 48px; margin-bottom: 10px;">&#10003;</div>
            <h1 style="color: white; margin: 0 0 10px 0; font-size: 24px;">Payment Received!</h1>
            <p style="color: rgba(255,255,255,0.95); margin: 0; font-size: 16px;">Thank you for your payment</p>
          </div>
          
          <div style="background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 25px; margin-bottom: 20px;">
            <p style="color: #1a1a1a; margin: 0 0 20px 0; font-size: 16px;">Hi ${clientName},</p>
            
            <p style="color: #666; margin: 0 0 20px 0; font-size: 15px;">
              We've received your payment. Here are the details:
            </p>
            
            <div style="background-color: #f9fafb; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; color: #666; font-size: 14px;">Invoice Number:</td>
                  <td style="padding: 8px 0; color: #1a1a1a; font-size: 14px; text-align: right; font-weight: 600;">${invoiceNumber}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #666; font-size: 14px;">Amount Paid:</td>
                  <td style="padding: 8px 0; color: #10b981; font-size: 18px; text-align: right; font-weight: 700;">$${amount}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #666; font-size: 14px;">Payment Date:</td>
                  <td style="padding: 8px 0; color: #1a1a1a; font-size: 14px; text-align: right;">${formattedDate}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #666; font-size: 14px;">From:</td>
                  <td style="padding: 8px 0; color: #1a1a1a; font-size: 14px; text-align: right;">${organizationName}</td>
                </tr>
              </table>
            </div>
            
            <p style="color: #666; margin: 0; font-size: 14px;">
              This email serves as your payment confirmation. Please keep it for your records.
            </p>
          </div>
          
          <div style="text-align: center; color: #666; font-size: 12px;">
            <p style="margin: 0;">
              Thank you for your business!
            </p>
          </div>
        </body>
      </html>
    `,
    text: `
Payment Received!

Hi ${clientName},

We've received your payment. Here are the details:

Invoice Number: ${invoiceNumber}
Amount Paid: $${amount}
Payment Date: ${formattedDate}
From: ${organizationName}

This email serves as your payment confirmation. Please keep it for your records.

Thank you for your business!
    `.trim()
  };

  await client.send(msg);
  console.log(`Payment confirmation email sent to ${to} for invoice ${invoiceNumber}`);
}

// Donation Letter Email (for nonprofits)
interface DonationLetterEmailParams {
  to: string;
  donorName: string;
  organizationName: string;
  year: number;
  donationAmount: string;
  letterHtml: string;
  branding?: {
    primaryColor?: string;
    accentColor?: string;
    fontFamily?: string;
    logoUrl?: string;
    footer?: string;
  };
}

export async function sendDonationLetterEmail({
  to,
  donorName,
  organizationName,
  year,
  donationAmount,
  letterHtml,
  branding
}: DonationLetterEmailParams): Promise<void> {
  const { client, fromEmail } = await getUncachableSendGridClient();

  const primaryColor = branding?.primaryColor || '#3b82f6';
  const accentColor = branding?.accentColor || '#1e40af';
  const fontFamily = branding?.fontFamily || '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
  const logoHtml = branding?.logoUrl 
    ? `<div style="text-align: center; margin-bottom: 20px;"><img src="${branding.logoUrl}" alt="${organizationName}" style="max-width: 180px; max-height: 60px; width: auto; height: auto; object-fit: contain;" /></div>`
    : '';
  
  const msg = {
    to,
    from: fromEmail,
    subject: `${year} Donation Acknowledgment Letter from ${organizationName}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${year} Donation Acknowledgment Letter</title>
        </head>
        <body style="font-family: ${fontFamily}; line-height: 1.6; color: #333; max-width: 700px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
          ${logoHtml}
          
          <div style="background: linear-gradient(135deg, ${primaryColor} 0%, ${accentColor} 100%); border-radius: 8px; padding: 30px; margin-bottom: 20px; color: white;">
            <h1 style="color: white; margin: 0 0 10px 0; font-size: 24px;">Thank You for Your Generosity!</h1>
            <p style="color: rgba(255,255,255,0.95); margin: 0; font-size: 16px;">Your ${year} Donation Acknowledgment Letter is attached below</p>
          </div>
          
          <div style="background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 30px; margin-bottom: 20px;">
            <p style="color: #1a1a1a; margin: 0 0 15px 0; font-size: 16px;">Dear ${donorName},</p>
            
            <p style="color: #666; margin: 0 0 15px 0; font-size: 15px;">
              Thank you for your generous donation of <strong>${donationAmount}</strong> to ${organizationName} during ${year}.
            </p>
            
            <p style="color: #666; margin: 0 0 20px 0; font-size: 15px;">
              Your support makes a meaningful difference in our mission. Please find your official donation acknowledgment letter below, which you can use for tax deduction purposes.
            </p>
            
            <div style="background-color: #f0f9ff; border-left: 4px solid ${primaryColor}; padding: 15px; border-radius: 4px; margin-bottom: 20px;">
              <p style="color: #1a1a1a; margin: 0; font-size: 14px;">
                <strong>Important Tax Information:</strong><br>
                This letter serves as your official acknowledgment of donation for tax purposes. Please retain it for your records.
              </p>
            </div>
          </div>
          
          <div style="background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 30px; margin-bottom: 20px;">
            <h2 style="color: ${primaryColor}; margin: 0 0 20px 0; font-size: 18px; border-bottom: 2px solid ${primaryColor}20; padding-bottom: 10px;">Official Donation Acknowledgment Letter</h2>
            ${letterHtml}
          </div>
          
          <div style="text-align: center; color: #666; font-size: 12px; padding: 20px 0;">
            <p style="margin: 0 0 10px 0;">
              Questions about your donation? Reply to this email - we're here to help!
            </p>
            <p style="margin: 0;">
              ${organizationName}
            </p>
          </div>
          
          ${branding?.footer ? `<div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 20px; text-align: center; color: #666; font-size: 12px; white-space: pre-line;">${branding.footer}</div>` : ''}
        </body>
      </html>
    `,
    text: `
${year} Donation Acknowledgment Letter from ${organizationName}

Dear ${donorName},

Thank you for your generous donation of ${donationAmount} to ${organizationName} during ${year}.

Your support makes a meaningful difference in our mission. This email serves as your official donation acknowledgment letter, which you can use for tax deduction purposes.

Please retain this letter for your tax records.

Thank you again for your generosity!

${organizationName}
    `.trim()
  };

  await client.send(msg);
  console.log(`Donation letter email sent to ${to} for donor ${donorName}`);
}

// ============================================
// BUDGET ALERT EMAILS
// ============================================

interface BudgetAlertEmailParams {
  to: string;
  budgetName: string;
  organizationName: string;
  alertType: 'threshold_50' | 'threshold_75' | 'threshold_90' | 'over_budget' | 'burn_rate';
  percentUsed: number;
  budgetedAmount: number;
  actualSpent: number;
  categoryName?: string;
  daysRemaining?: number;
  projectedOverage?: number;
  dashboardUrl: string;
  branding?: {
    primaryColor?: string;
    logoUrl?: string;
  };
}

export async function sendBudgetAlertEmail({
  to,
  budgetName,
  organizationName,
  alertType,
  percentUsed,
  budgetedAmount,
  actualSpent,
  categoryName,
  daysRemaining,
  projectedOverage,
  dashboardUrl,
  branding
}: BudgetAlertEmailParams): Promise<void> {
  const { client, fromEmail } = await getUncachableSendGridClient();

  const primaryColor = branding?.primaryColor || '#0070f3';
  const logoHtml = branding?.logoUrl 
    ? `<div style="text-align: center; margin-bottom: 20px;"><img src="${branding.logoUrl}" alt="${organizationName}" style="max-width: 150px; height: auto;" /></div>`
    : '';

  let alertTitle: string;
  let alertColor: string;
  let alertIcon: string;
  let alertDescription: string;

  switch (alertType) {
    case 'threshold_50':
      alertTitle = '50% Budget Threshold Reached';
      alertColor = '#3b82f6';
      alertIcon = '[INFO]';
      alertDescription = `Your budget "${budgetName}" has reached 50% utilization.`;
      break;
    case 'threshold_75':
      alertTitle = '75% Budget Threshold - Attention Required';
      alertColor = '#f59e0b';
      alertIcon = '[WARNING]';
      alertDescription = `Your budget "${budgetName}" has reached 75% utilization. Consider reviewing upcoming expenses.`;
      break;
    case 'threshold_90':
      alertTitle = '90% Budget Threshold - Critical';
      alertColor = '#ef4444';
      alertIcon = '[CRITICAL]';
      alertDescription = `Your budget "${budgetName}" has reached 90% utilization. Immediate attention required.`;
      break;
    case 'over_budget':
      alertTitle = 'Budget Exceeded';
      alertColor = '#dc2626';
      alertIcon = '[ALERT]';
      alertDescription = `Your budget "${budgetName}" has exceeded the allocated amount.`;
      break;
    case 'burn_rate':
      alertTitle = 'High Burn Rate Alert';
      alertColor = '#ea580c';
      alertIcon = '[BURN RATE]';
      alertDescription = `Your budget "${budgetName}" is being spent faster than expected and may exceed the allocated amount.`;
      break;
    default:
      alertTitle = 'Budget Alert';
      alertColor = '#3b82f6';
      alertIcon = '[INFO]';
      alertDescription = `An alert has been triggered for budget "${budgetName}".`;
  }

  const remaining = budgetedAmount - actualSpent;
  const categoryLine = categoryName ? `<p style="margin: 0 0 10px 0;"><strong>Category:</strong> ${categoryName}</p>` : '';
  const daysLine = daysRemaining !== undefined ? `<p style="margin: 0 0 10px 0;"><strong>Days Remaining:</strong> ${daysRemaining} days</p>` : '';
  const projectedLine = projectedOverage && projectedOverage > 0 
    ? `<p style="margin: 0 0 10px 0; color: #dc2626;"><strong>Projected Overage:</strong> $${projectedOverage.toFixed(2)}</p>` 
    : '';

  const msg = {
    to,
    from: fromEmail,
    subject: `${alertIcon} ${alertTitle} - ${budgetName}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <div style="background-color: ${alertColor}; padding: 20px; text-align: center;">
              ${logoHtml}
              <h1 style="margin: 0; color: #ffffff; font-size: 24px;">${alertTitle}</h1>
            </div>
            <div style="padding: 30px;">
              <p style="margin: 0 0 20px 0; font-size: 16px; color: #374151;">
                ${alertDescription}
              </p>
              
              <div style="background-color: #f9fafb; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
                <h3 style="margin: 0 0 15px 0; color: #1f2937;">Budget Details</h3>
                <p style="margin: 0 0 10px 0;"><strong>Budget Name:</strong> ${budgetName}</p>
                ${categoryLine}
                <p style="margin: 0 0 10px 0;"><strong>Budgeted Amount:</strong> $${budgetedAmount.toFixed(2)}</p>
                <p style="margin: 0 0 10px 0;"><strong>Amount Spent:</strong> $${actualSpent.toFixed(2)}</p>
                <p style="margin: 0 0 10px 0;"><strong>Remaining:</strong> $${remaining.toFixed(2)}</p>
                <p style="margin: 0 0 10px 0;"><strong>Utilization:</strong> ${percentUsed.toFixed(1)}%</p>
                ${daysLine}
                ${projectedLine}
              </div>

              <div style="background-color: ${alertColor}15; border-left: 4px solid ${alertColor}; padding: 15px; margin-bottom: 20px;">
                <p style="margin: 0; color: ${alertColor}; font-weight: 600;">
                  ${percentUsed >= 100 
                    ? 'This budget has exceeded its allocated amount. Please review and take appropriate action.'
                    : percentUsed >= 90 
                      ? 'This budget is critically low. Please review spending and consider adjustments.'
                      : percentUsed >= 75
                        ? 'This budget is approaching its limit. Monitor closely to avoid overspending.'
                        : 'This is a notification to help you track your budget progress.'
                  }
                </p>
              </div>

              <div style="text-align: center;">
                <a href="${dashboardUrl}" style="display: inline-block; background-color: ${primaryColor}; color: #ffffff; text-decoration: none; padding: 12px 30px; border-radius: 6px; font-weight: 600;">
                  View Budget Dashboard
                </a>
              </div>
            </div>
            <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; color: #6b7280; font-size: 14px;">
                This alert was sent by ${organizationName} via ComplyBook.
              </p>
              <p style="margin: 10px 0 0 0; color: #9ca3af; font-size: 12px;">
                To manage your alert preferences, visit the budget settings in your dashboard.
              </p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
${alertTitle}

${alertDescription}

Budget Details:
- Budget Name: ${budgetName}
${categoryName ? `- Category: ${categoryName}\n` : ''}- Budgeted Amount: $${budgetedAmount.toFixed(2)}
- Amount Spent: $${actualSpent.toFixed(2)}
- Remaining: $${remaining.toFixed(2)}
- Utilization: ${percentUsed.toFixed(1)}%
${daysRemaining !== undefined ? `- Days Remaining: ${daysRemaining} days\n` : ''}${projectedOverage && projectedOverage > 0 ? `- Projected Overage: $${projectedOverage.toFixed(2)}\n` : ''}

View your budget dashboard: ${dashboardUrl}

This alert was sent by ${organizationName} via ComplyBook.
    `.trim()
  };

  await client.send(msg);
  console.log(`Budget alert email sent to ${to} for budget "${budgetName}" (${alertType})`);
}

// Form/Survey Invitation Email
interface FormInvitationEmailParams {
  to: string;
  recipientName: string;
  organizationName: string;
  formTitle: string;
  formDescription?: string;
  formType: 'form' | 'survey';
  formUrl: string;
  personalMessage?: string;
  branding?: {
    primaryColor?: string;
    accentColor?: string;
    fontFamily?: string;
    logoUrl?: string;
    footer?: string;
  };
}

export async function sendFormInvitationEmail({
  to,
  recipientName,
  organizationName,
  formTitle,
  formDescription,
  formType,
  formUrl,
  personalMessage,
  branding
}: FormInvitationEmailParams): Promise<void> {
  const { client, fromEmail } = await getUncachableSendGridClient();

  const primaryColor = branding?.primaryColor || '#0070f3';
  const accentColor = branding?.accentColor || '#0052cc';
  const fontFamily = branding?.fontFamily || '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
  const logoHtml = branding?.logoUrl 
    ? `<div style="text-align: center; margin-bottom: 20px;"><img src="${branding.logoUrl}" alt="Organization Logo" style="max-width: 150px; height: auto;" /></div>`
    : '';
  const footerHtml = branding?.footer
    ? `<div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 20px; text-align: center; color: #666; font-size: 12px; white-space: pre-line;">${branding.footer}</div>`
    : '';

  const typeLabel = formType === 'survey' ? 'Survey' : 'Form';
  const actionText = formType === 'survey' ? 'Take Survey' : 'Fill Out Form';
  const descriptionHtml = formDescription 
    ? `<p style="color: #4a5568; font-size: 14px; margin: 15px 0; line-height: 1.6;">${formDescription}</p>`
    : '';
  const personalMessageHtml = personalMessage
    ? `<div style="background-color: #f8fafc; border-left: 4px solid ${primaryColor}; padding: 15px; margin: 20px 0; border-radius: 0 8px 8px 0;">
         <p style="color: #4a5568; font-size: 14px; margin: 0; font-style: italic;">"${personalMessage}"</p>
       </div>`
    : '';

  const msg = {
    to,
    from: fromEmail,
    subject: `${organizationName}: ${formTitle}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${typeLabel} from ${organizationName}</title>
        </head>
        <body style="font-family: ${fontFamily}; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f5f5f5;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f5f5f5; padding: 40px 20px;">
            <tr>
              <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);">
                  <!-- Header -->
                  <tr>
                    <td style="background-color: ${primaryColor}; padding: 32px 40px; text-align: center;">
                      <h2 style="color: white; margin: 0; font-size: 22px; font-weight: 600;">${organizationName}</h2>
                    </td>
                  </tr>
                  
                  <!-- Body -->
                  <tr>
                    <td style="padding: 40px;">
                      <p style="color: #374151; font-size: 16px; margin: 0 0 24px 0;">Dear ${recipientName},</p>
                      
                      <p style="color: #374151; font-size: 16px; margin: 0 0 24px 0;">
                        We invite you to complete the following ${typeLabel.toLowerCase()}:
                      </p>
                      
                      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f9fafb; border-radius: 8px; border: 1px solid #e5e7eb; margin-bottom: 24px;">
                        <tr>
                          <td style="padding: 24px;">
                            <h3 style="color: #111827; margin: 0 0 8px 0; font-size: 18px; font-weight: 600;">${formTitle}</h3>
                            ${formDescription ? `<p style="color: #6b7280; font-size: 14px; margin: 0; line-height: 1.5;">${formDescription}</p>` : ''}
                          </td>
                        </tr>
                      </table>
                      
                      ${personalMessage ? `
                      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 24px;">
                        <tr>
                          <td style="border-left: 3px solid ${primaryColor}; padding-left: 16px;">
                            <p style="color: #4b5563; font-size: 14px; margin: 0; font-style: italic;">"${personalMessage}"</p>
                          </td>
                        </tr>
                      </table>
                      ` : ''}
                      
                      <table width="100%" cellpadding="0" cellspacing="0" border="0">
                        <tr>
                          <td align="center" style="padding: 16px 0 32px 0;">
                            <a href="${formUrl}" style="display: inline-block; background-color: ${primaryColor}; color: white; text-decoration: none; padding: 14px 40px; border-radius: 6px; font-weight: 600; font-size: 16px;">
                              ${actionText}
                            </a>
                          </td>
                        </tr>
                      </table>
                      
                      <p style="color: #9ca3af; font-size: 13px; margin: 0; text-align: center;">
                        Or copy this link: <a href="${formUrl}" style="color: ${primaryColor}; word-break: break-all;">${formUrl}</a>
                      </p>
                    </td>
                  </tr>
                  
                  ${branding?.footer ? `
                  <tr>
                    <td style="border-top: 1px solid #e5e7eb; padding: 24px 40px;">
                      <p style="color: #6b7280; font-size: 13px; margin: 0; text-align: center; white-space: pre-line;">${branding.footer}</p>
                    </td>
                  </tr>
                  ` : ''}
                  
                  <!-- Footer -->
                  <tr>
                    <td style="background-color: #f9fafb; padding: 20px 40px; text-align: center; border-top: 1px solid #e5e7eb;">
                      <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                        Powered by <a href="https://complybook.net" style="color: ${primaryColor}; text-decoration: none;">ComplyBook</a>
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `,
    text: `
Hello ${recipientName},

${organizationName} has sent you a ${typeLabel.toLowerCase()}: ${formTitle}

${formDescription ? formDescription + '\n\n' : ''}${personalMessage ? `Message from ${organizationName}:\n"${personalMessage}"\n\n` : ''}Please click the link below to complete the ${typeLabel.toLowerCase()}:
${formUrl}

This invitation was sent by ${organizationName} via ComplyBook.
    `.trim()
  };

  await client.send(msg);
  console.log(`Form invitation email sent to ${to} for "${formTitle}"`);
}

// Paystub Email - Colorado-compliant pay statement
interface PaystubEmailParams {
  to: string;
  employeeName: string;
  payPeriodStart: string;
  payPeriodEnd: string;
  payDate: string;
  grossPay: string;
  netPay: string;
  employerName: string;
  employerAddress?: string | null;
  employerEin?: string | null;
  employeeAddress?: string | null;
  ssnLastFour?: string | null;
  isHourly: boolean;
  regularHours?: string | null;
  overtimeHours?: string | null;
  hourlyRate?: string | null;
  regularPay: string;
  overtimePay?: string;
  federalIncomeTax: string;
  stateIncomeTax: string;
  socialSecurityTax: string;
  medicareTax: string;
  otherDeductions: string;
  totalDeductions: string;
  deductionsDetail: Array<{name: string; type: string; amount: string}>;
  ytdGrossPay: string;
  ytdTotalDeductions: string;
  ytdNetPay: string;
  branding?: {
    primaryColor?: string;
    accentColor?: string;
    fontFamily?: string;
    logoUrl?: string;
    footer?: string;
  };
}

export async function sendPaystubEmail({
  to,
  employeeName,
  payPeriodStart,
  payPeriodEnd,
  payDate,
  grossPay,
  netPay,
  employerName,
  employerAddress,
  employerEin,
  employeeAddress,
  ssnLastFour,
  isHourly,
  regularHours,
  overtimeHours,
  hourlyRate,
  regularPay,
  overtimePay,
  federalIncomeTax,
  stateIncomeTax,
  socialSecurityTax,
  medicareTax,
  otherDeductions,
  totalDeductions,
  deductionsDetail,
  ytdGrossPay,
  ytdTotalDeductions,
  ytdNetPay,
  branding
}: PaystubEmailParams): Promise<void> {
  const { client, fromEmail } = await getUncachableSendGridClient();

  const primaryColor = branding?.primaryColor || '#1a365d';
  const fontFamily = branding?.fontFamily || '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
  const logoHtml = branding?.logoUrl 
    ? `<img src="${branding.logoUrl}" alt="${employerName}" style="max-width: 150px; max-height: 50px; object-fit: contain;" />`
    : '';
  const footerHtml = branding?.footer
    ? `<div style="text-align: center; color: #666; font-size: 11px; margin-top: 20px; padding-top: 15px; border-top: 1px solid #e5e7eb;">${branding.footer}</div>`
    : '';

  const formatMoney = (val: string) => parseFloat(val || '0').toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // Build earnings rows
  let earningsHtml = `
    <tr>
      <td style="padding: 8px 10px; border-bottom: 1px solid #e5e7eb;">Regular</td>
      <td style="padding: 8px 10px; border-bottom: 1px solid #e5e7eb; text-align: right;">${isHourly ? `$${formatMoney(hourlyRate || '0')}` : '-'}</td>
      <td style="padding: 8px 10px; border-bottom: 1px solid #e5e7eb; text-align: right;">${isHourly ? (regularHours || '0.00') : '-'}</td>
      <td style="padding: 8px 10px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: 500;">$${formatMoney(regularPay)}</td>
    </tr>`;

  if (overtimePay && parseFloat(overtimePay) > 0) {
    earningsHtml += `
    <tr>
      <td style="padding: 8px 10px; border-bottom: 1px solid #e5e7eb;">Overtime</td>
      <td style="padding: 8px 10px; border-bottom: 1px solid #e5e7eb; text-align: right;">-</td>
      <td style="padding: 8px 10px; border-bottom: 1px solid #e5e7eb; text-align: right;">${overtimeHours || '-'}</td>
      <td style="padding: 8px 10px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: 500;">$${formatMoney(overtimePay)}</td>
    </tr>`;
  }

  // Build statutory deductions
  const statutoryDeductions = [
    { name: 'FICA-Medicare', amount: medicareTax },
    { name: 'FICA-Social Security', amount: socialSecurityTax },
    { name: 'Federal tax', amount: federalIncomeTax },
    { name: 'State tax', amount: stateIncomeTax },
  ];

  // Add non-tax deductions
  const otherDeds = deductionsDetail.filter(d => d.type !== 'tax');

  let deductionsHtml = statutoryDeductions.map(d => `
    <tr>
      <td style="padding: 6px 10px; border-bottom: 1px solid #f3f4f6; font-size: 13px;">${d.name}</td>
      <td style="padding: 6px 10px; border-bottom: 1px solid #f3f4f6; text-align: right; font-size: 13px;">$${formatMoney(d.amount)}</td>
    </tr>
  `).join('');

  otherDeds.forEach(d => {
    deductionsHtml += `
    <tr>
      <td style="padding: 6px 10px; border-bottom: 1px solid #f3f4f6; font-size: 13px;">${d.name}</td>
      <td style="padding: 6px 10px; border-bottom: 1px solid #f3f4f6; text-align: right; font-size: 13px;">$${formatMoney(d.amount)}</td>
    </tr>`;
  });

  const msg = {
    to,
    from: fromEmail,
    subject: `Pay Statement - ${payPeriodStart} to ${payPeriodEnd} - ${employerName}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Pay Statement</title>
        </head>
        <body style="font-family: ${fontFamily}; line-height: 1.5; color: #1a1a1a; max-width: 700px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
          <div style="background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 30px;">
            
            <!-- Header -->
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 25px; border-bottom: 2px solid ${primaryColor}; padding-bottom: 20px;">
              <div>
                ${logoHtml || `<h2 style="margin: 0; color: ${primaryColor}; font-size: 18px;">${employerName}</h2>`}
                ${employerAddress ? `<p style="margin: 5px 0 0 0; font-size: 12px; color: #666; white-space: pre-line;">${employerAddress}</p>` : ''}
                ${employerEin ? `<p style="margin: 3px 0 0 0; font-size: 11px; color: #888;">EIN: ${employerEin}</p>` : ''}
              </div>
              <div style="text-align: right;">
                <h1 style="margin: 0; font-size: 24px; color: ${primaryColor}; font-weight: 700;">EARNINGS STATEMENT</h1>
              </div>
            </div>

            <!-- Employee and Period Info Grid -->
            <table style="width: 100%; margin-bottom: 20px; border-collapse: collapse; font-size: 12px;">
              <thead>
                <tr style="background-color: #1a365d; color: white;">
                  <th style="padding: 10px; text-align: left; font-weight: 600; border: 1px solid #1a365d;">EMPLOYEE NAME/ADDRESS</th>
                  <th style="padding: 10px; text-align: center; font-weight: 600; border: 1px solid #1a365d;">EMPLOYEE NO.</th>
                  <th style="padding: 10px; text-align: center; font-weight: 600; border: 1px solid #1a365d;">REPORTING PERIOD</th>
                  <th style="padding: 10px; text-align: center; font-weight: 600; border: 1px solid #1a365d;">PAY DATE</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style="padding: 12px 10px; border: 1px solid #e5e7eb; vertical-align: top;">
                    <strong>${employeeName}</strong>
                    ${employeeAddress ? `<br/><span style="color: #666; font-size: 11px; white-space: pre-line;">${employeeAddress}</span>` : ''}
                    ${ssnLastFour ? `<br/><span style="color: #888; font-size: 11px;">SSN: XXX-XX-${ssnLastFour}</span>` : ''}
                  </td>
                  <td style="padding: 12px 10px; border: 1px solid #e5e7eb; text-align: center; vertical-align: top;">-</td>
                  <td style="padding: 12px 10px; border: 1px solid #e5e7eb; text-align: center; vertical-align: top;">
                    ${payPeriodStart} — ${payPeriodEnd}
                  </td>
                  <td style="padding: 12px 10px; border: 1px solid #e5e7eb; text-align: center; vertical-align: top;">
                    ${payDate}
                  </td>
                </tr>
              </tbody>
            </table>

            <!-- Main Content: Earnings and Deductions side by side -->
            <table style="width: 100%; margin-bottom: 20px; border-collapse: collapse;">
              <tr>
                <!-- Earnings Column -->
                <td style="width: 55%; vertical-align: top; padding-right: 10px;">
                  <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                    <thead>
                      <tr style="background-color: #f3f4f6;">
                        <th style="padding: 10px; text-align: left; font-weight: 600; border-bottom: 2px solid #d1d5db;">INCOME</th>
                        <th style="padding: 10px; text-align: right; font-weight: 600; border-bottom: 2px solid #d1d5db;">RATE</th>
                        <th style="padding: 10px; text-align: right; font-weight: 600; border-bottom: 2px solid #d1d5db;">HOURS</th>
                        <th style="padding: 10px; text-align: right; font-weight: 600; border-bottom: 2px solid #d1d5db;">CURRENT PAY</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${earningsHtml}
                    </tbody>
                  </table>
                </td>
                
                <!-- Deductions Column -->
                <td style="width: 45%; vertical-align: top; padding-left: 10px;">
                  <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                    <thead>
                      <tr style="background-color: #f3f4f6;">
                        <th colspan="2" style="padding: 10px; text-align: left; font-weight: 600; border-bottom: 2px solid #d1d5db;">STATUTORY DEDUCTION</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${deductionsHtml}
                    </tbody>
                  </table>
                </td>
              </tr>
            </table>

            <!-- Totals Footer -->
            <table style="width: 100%; border-collapse: collapse; margin-top: 15px; background-color: #f9fafb; border: 2px solid #1a365d;">
              <tr style="font-size: 13px; font-weight: 600;">
                <td style="padding: 12px; text-align: center; border-right: 1px solid #d1d5db;">
                  <div style="color: #666; font-size: 11px; margin-bottom: 3px;">GROSS</div>
                  <div style="color: #1a1a1a; font-size: 15px;">$${formatMoney(grossPay)}</div>
                </td>
                <td style="padding: 12px; text-align: center; border-right: 1px solid #d1d5db;">
                  <div style="color: #666; font-size: 11px; margin-bottom: 3px;">YTD DEDUCTION</div>
                  <div style="color: #1a1a1a; font-size: 15px;">$${formatMoney(ytdTotalDeductions)}</div>
                </td>
                <td style="padding: 12px; text-align: center; border-right: 1px solid #d1d5db;">
                  <div style="color: #666; font-size: 11px; margin-bottom: 3px;">YTD NET PAY</div>
                  <div style="color: #1a1a1a; font-size: 15px;">$${formatMoney(ytdNetPay)}</div>
                </td>
                <td style="padding: 12px; text-align: center; border-right: 1px solid #d1d5db;">
                  <div style="color: #666; font-size: 11px; margin-bottom: 3px;">TOTAL</div>
                  <div style="color: #1a1a1a; font-size: 15px;">$${formatMoney(grossPay)}</div>
                </td>
                <td style="padding: 12px; text-align: center; border-right: 1px solid #d1d5db;">
                  <div style="color: #666; font-size: 11px; margin-bottom: 3px;">DEDUCTION</div>
                  <div style="color: #dc2626; font-size: 15px;">$${formatMoney(totalDeductions)}</div>
                </td>
                <td style="padding: 12px; text-align: center; background-color: #dcfce7;">
                  <div style="color: #166534; font-size: 11px; margin-bottom: 3px;">NET PAY</div>
                  <div style="color: #166534; font-size: 18px; font-weight: 700;">$${formatMoney(netPay)}</div>
                </td>
              </tr>
            </table>

            <p style="text-align: center; font-size: 11px; color: #888; margin-top: 20px;">
              This statement is for informational purposes. Please retain for your records.
            </p>
            
            ${footerHtml}
          </div>
        </body>
      </html>
    `,
    text: `
EARNINGS STATEMENT
${employerName}
${employerAddress || ''}

Employee: ${employeeName}
${employeeAddress || ''}
${ssnLastFour ? `SSN: XXX-XX-${ssnLastFour}` : ''}

Pay Period: ${payPeriodStart} - ${payPeriodEnd}
Pay Date: ${payDate}

EARNINGS:
Regular Pay: $${formatMoney(regularPay)}${isHourly ? ` (${regularHours} hrs @ $${formatMoney(hourlyRate || '0')}/hr)` : ''}
${overtimePay && parseFloat(overtimePay) > 0 ? `Overtime Pay: $${formatMoney(overtimePay)}` : ''}
Gross Pay: $${formatMoney(grossPay)}

DEDUCTIONS:
FICA-Medicare: $${formatMoney(medicareTax)}
FICA-Social Security: $${formatMoney(socialSecurityTax)}
Federal Tax: $${formatMoney(federalIncomeTax)}
State Tax: $${formatMoney(stateIncomeTax)}
${otherDeds.map(d => `${d.name}: $${formatMoney(d.amount)}`).join('\n')}
Total Deductions: $${formatMoney(totalDeductions)}

NET PAY: $${formatMoney(netPay)}

YTD TOTALS:
YTD Gross: $${formatMoney(ytdGrossPay)}
YTD Deductions: $${formatMoney(ytdTotalDeductions)}
YTD Net Pay: $${formatMoney(ytdNetPay)}

This statement is for informational purposes. Please retain for your records.
    `.trim()
  };

  await client.send(msg);
  console.log(`Paystub email sent to ${to} for pay period ${payPeriodStart} - ${payPeriodEnd}`);
}

export async function sendNewUserNotificationEmail({
  notifyEmail,
  userName,
  userEmail,
  signupTime,
}: {
  notifyEmail: string;
  userName: string;
  userEmail: string;
  signupTime: string;
}): Promise<void> {
  const { client, fromEmail } = await getUncachableSendGridClient();

  const msg = {
    to: notifyEmail,
    from: fromEmail,
    subject: `[ComplyBook] New User Signup: ${userName}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head><meta charset="utf-8"></head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9fa;">
          <div style="background: #ffffff; border-radius: 8px; padding: 30px; border: 1px solid #e9ecef;">
            <h2 style="color: #1a365d; margin-top: 0;">New User Signup</h2>
            <p style="color: #495057;">A new user has signed up for ComplyBook:</p>
            <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
              <tr>
                <td style="padding: 8px 12px; border-bottom: 1px solid #e9ecef; color: #6c757d; font-weight: 600;">Name</td>
                <td style="padding: 8px 12px; border-bottom: 1px solid #e9ecef; color: #212529;">${userName}</td>
              </tr>
              <tr>
                <td style="padding: 8px 12px; border-bottom: 1px solid #e9ecef; color: #6c757d; font-weight: 600;">Email</td>
                <td style="padding: 8px 12px; border-bottom: 1px solid #e9ecef; color: #212529;">${userEmail}</td>
              </tr>
              <tr>
                <td style="padding: 8px 12px; border-bottom: 1px solid #e9ecef; color: #6c757d; font-weight: 600;">Signed Up</td>
                <td style="padding: 8px 12px; border-bottom: 1px solid #e9ecef; color: #212529;">${signupTime}</td>
              </tr>
            </table>
            <p style="color: #6c757d; font-size: 12px; margin-bottom: 0;">This is an automated notification from ComplyBook.</p>
          </div>
        </body>
      </html>
    `,
    text: `New User Signup\n\nName: ${userName}\nEmail: ${userEmail}\nSigned Up: ${signupTime}\n\nThis is an automated notification from ComplyBook.`
  };

  await client.send(msg);
  console.log(`[Email] New user notification sent to ${notifyEmail} for user ${userEmail}`);
}
