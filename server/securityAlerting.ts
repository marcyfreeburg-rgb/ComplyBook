// NIST 800-53 IR-4, IR-5: Incident Handling & Monitoring
import { IStorage } from './storage';
import { sendSecurityAlertEmail } from './email';

// Configuration for which events trigger email alerts
const ALERT_ON_EVENT_TYPES = [
  'login_failed',
  'account_locked',
  'permission_denied',
  'session_expired',
  'unauthorized_access'
];

const ALERT_ON_SEVERITIES = ['critical', 'high'];

export async function sendSecurityAlertIfNeeded(
  storage: IStorage,
  event: {
    eventType: string;
    severity: string;
    userId?: string | null;
    email?: string | null;
    ipAddress?: string | null;
    eventData?: any;
    timestamp: Date;
  },
  organizationId?: number
): Promise<void> {
  // Only send alerts for critical/high severity events
  if (!ALERT_ON_SEVERITIES.includes(event.severity)) {
    return;
  }

  try {
    const recipientEmails = new Set<string>();
    
    if (organizationId) {
      // Get organization details to find admins/owners
      const organization = await storage.getOrganization(organizationId);
      if (organization) {
        // Query all users with admin or owner roles in this organization
        // This would require a storage method to get users by organization and role
        // For now, we use a simplified approach: get the organization's creator/owner
        // In production, you'd query userOrganizationRoles table for admin/owner users
        try {
          const db = (storage as any).db || require('./db').db;
          const { userOrganizationRoles, users } = require('@shared/schema');
          const { eq, or, and, inArray } = require('drizzle-orm');
          
          const orgAdmins = await db
            .select({ email: users.email })
            .from(userOrganizationRoles)
            .innerJoin(users, eq(userOrganizationRoles.userId, users.id))
            .where(
              and(
                eq(userOrganizationRoles.organizationId, organizationId),
                or(
                  eq(userOrganizationRoles.role, 'owner'),
                  eq(userOrganizationRoles.role, 'admin')
                )
              )
            );
          
          orgAdmins.forEach((admin: { email: string | null }) => {
            if (admin.email) recipientEmails.add(admin.email);
          });
        } catch (err) {
          console.error('Failed to query organization admins:', err);
        }
      }
    }
    
    // Add system-wide security admin emails from environment
    const SECURITY_ADMIN_EMAILS = process.env.SECURITY_ADMIN_EMAILS?.split(',') || [];
    SECURITY_ADMIN_EMAILS.forEach(email => {
      if (email && email.trim()) recipientEmails.add(email.trim());
    });
    
    // If no recipients found, log warning but don't fail
    if (recipientEmails.size === 0) {
      console.warn('No security alert recipients configured. Set SECURITY_ADMIN_EMAILS environment variable.');
      return;
    }
    
    // Send alerts to all recipients
    for (const email of Array.from(recipientEmails)) {
      try {
        await sendSecurityAlertEmail({
          to: email,
          eventType: event.eventType,
          severity: event.severity,
          timestamp: event.timestamp,
          userEmail: event.email,
          ipAddress: event.ipAddress,
          details: event.eventData,
        });
      } catch (emailError) {
        console.error(`Failed to send security alert to ${email}:`, emailError);
        // Continue sending to other recipients even if one fails
      }
    }
  } catch (error) {
    // Don't fail the security logging if email fails
    console.error('Failed to send security alert email:', error);
  }
}
