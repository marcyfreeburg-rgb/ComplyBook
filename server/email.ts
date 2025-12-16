import sgMail from '@sendgrid/mail';

let connectionSettings: any;

// Check if running on Replit
const isReplitEnvironment = !!(process.env.REPLIT_DOMAINS && process.env.REPL_ID);

async function getCredentials() {
  // For non-Replit environments (e.g., Render), use direct environment variables
  if (!isReplitEnvironment) {
    const apiKey = process.env.SENDGRID_API_KEY;
    const fromEmail = process.env.SENDGRID_FROM_EMAIL;
    
    if (!apiKey || !fromEmail) {
      throw new Error('SendGrid credentials not configured. Set SENDGRID_API_KEY and SENDGRID_FROM_EMAIL environment variables.');
    }
    
    return { apiKey, email: fromEmail };
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
  branding
}: InvoiceEmailParams): Promise<void> {
  const { client, fromEmail } = await getUncachableSendGridClient();

  const primaryColor = branding?.primaryColor || '#0070f3';
  const accentColor = branding?.accentColor || '#0052cc';
  const fontFamily = branding?.fontFamily || '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
  const logoHtml = branding?.logoUrl 
    ? `<div style="text-align: center; margin-bottom: 20px;"><img src="${branding.logoUrl}" alt="${organizationName}" style="max-width: 200px; height: auto;" /></div>`
    : '';
  const footerHtml = branding?.footer
    ? `<div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 20px; text-align: center; color: #666; font-size: 12px; white-space: pre-line;">${branding.footer}</div>`
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

${notes ? `Notes:\n${notes}\n` : ''}

Questions? Contact us at ${organizationEmail}
    `.trim()
  };

  await client.send(msg);
}
