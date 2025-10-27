import sgMail from '@sendgrid/mail';

let connectionSettings: any;

async function getCredentials() {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME
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
